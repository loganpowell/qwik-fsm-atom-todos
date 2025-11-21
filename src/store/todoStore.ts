import { defAtom } from "@thi.ng/atom";
import {
  initTodoFSM,
  canEdit,
  isEditing,
  canPersistToServer,
} from "../machines/todoFSM";
// Vite will handle this import at build time for SSG
import initialTodosData from "../../public/todos.json";

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export interface TodoData {
  todos: Todo[];
}

export interface TodoStoreState {
  data: TodoData;
  originalData: Partial<TodoData>;
  fsmState: string;
  changeCount: number;
}

let fsm: any = null;

// Detect if we're in SSG/production mode
const isSSG = () => {
  if (typeof window === "undefined") return true;
  return (
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  );
};

// Load initial data from localStorage if available
const loadPersistedState = (): Partial<TodoStoreState> | null => {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem("todo-store");
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.warn("[loadPersistedState] ❌ Failed to load persisted state", e);
    return null;
  }
};

// Save state to localStorage
const persistState = (state: TodoStoreState) => {
  if (typeof window === "undefined") return;

  try {
    const toSave = {
      data: state.data,
      fsmState: state.fsmState,
      originalData: state.originalData,
      changeCount: state.changeCount,
    };
    localStorage.setItem("todo-store", JSON.stringify(toSave));
  } catch (e) {
    console.warn("[persistState] ❌ Failed to persist state", e);
  }
};

// Initialize with data from Vite JSON import (SSG) or localStorage (dev)
const persistedState = loadPersistedState();
const initialFsmState = persistedState?.fsmState || "viewing";

// Use persisted data if available, otherwise use the imported JSON data
const initialState: TodoStoreState = {
  data: persistedState?.data || initialTodosData,
  originalData:
    initialFsmState === "editing" && persistedState?.originalData
      ? persistedState.originalData
      : {},
  fsmState: initialFsmState,
  changeCount:
    initialFsmState === "editing" && persistedState?.changeCount !== undefined
      ? persistedState.changeCount
      : 0,
};

export const db = defAtom<TodoStoreState>(initialState);

// Flag to prevent infinite loop during cross-tab sync
let isSyncingFromStorage = false;

// Add persistence watch
db.addWatch("persist", (id, prev, curr) => {
  // Skip persistence if we're currently syncing from a storage event
  // This prevents infinite loops where storage events trigger writes
  // which trigger more storage events
  if (isSyncingFromStorage) return;
  persistState(curr);
});

// Add storage event listener for cross-tab sync
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "todo-store" && e.newValue) {
      try {
        const newState = JSON.parse(e.newValue);

        // Set flag to prevent persist watch from firing during sync
        isSyncingFromStorage = true;

        // CRITICAL: Reinitialize FSM to match the new state BEFORE updating atom
        // This ensures the FSM state stays in sync across tabs
        fsm = initTodoFSM(
          {
            getState: () => db.deref(),
            setState: (updates: Partial<TodoStoreState>) => {
              db.swap((state) => ({ ...state, ...updates }));
            },
          },
          newState.fsmState
        );

        console.log(
          `[Storage Sync] FSM reinitialized to state: ${newState.fsmState}, fsm.state: ${fsm.state}`
        );

        // Update the atom state - this will trigger all watches/subscriptions
        // but the persist watch will be skipped due to isSyncingFromStorage flag
        db.reset(newState);

        // Reset flag after sync completes
        isSyncingFromStorage = false;
      } catch (err) {
        console.warn("Failed to sync from storage event", err);
        isSyncingFromStorage = false; // Ensure flag is reset even on error
      }
    }
  });
}

// Initialize FSM after atom is created
fsm = initTodoFSM(
  {
    getState: () => db.deref(),
    setState: (updates: Partial<TodoStoreState>) => {
      db.swap((state) => ({ ...state, ...updates }));
    },
  },
  initialFsmState
);

// Utility: Ensure FSM is initialized
const ensureFSM = () => {
  if (!fsm) throw new Error("FSM not initialized");
};

// Utility: Guard edit mode operations
const guardEditMode = (operation: string): boolean => {
  ensureFSM();
  if (!canEdit(fsm.state)) {
    console.warn(`Cannot ${operation} outside edit mode`);
    return false;
  }
  return true;
};

// Utility: Find todo by ID
const findTodoIndex = (todos: Todo[], id: string): number => {
  return todos.findIndex((t: Todo) => t.id === id);
};

// Utility: Calculate number of changed todos by comparing with original
const calculateChanges = (): number => {
  const state = db.deref();
  const currentTodos = state.data.todos || [];
  const originalTodos = (state.originalData.todos as Todo[]) || [];

  // Track unique changed todo IDs
  const changedIds = new Set<string>();

  // Check for new todos (in current but not in original)
  currentTodos.forEach((todo) => {
    const original = originalTodos.find((o) => o.id === todo.id);
    if (!original) {
      changedIds.add(todo.id); // New todo
    } else if (
      todo.text !== original.text ||
      todo.completed !== original.completed
    ) {
      changedIds.add(todo.id); // Modified todo
    }
  });

  // Check for deleted todos (in original but not in current)
  originalTodos.forEach((original) => {
    const current = currentTodos.find((t) => t.id === original.id);
    if (!current) {
      changedIds.add(original.id); // Deleted todo
    }
  });

  return changedIds.size;
};

// Utility: Update change count based on actual differences
const updateChangeCount = () => {
  const count = calculateChanges();
  db.resetIn(["changeCount"], count);
};

// Store API - functional interface around the atom
export const todoStore = {
  // Core atom access
  deref: () => db.deref(),
  subscribe: (listener: (state: TodoStoreState) => void) => {
    const watchId = `watch-${Date.now()}`;
    db.addWatch(watchId, (_, __, curr) => listener(curr));
    return () => db.removeWatch(watchId);
  },

  // FSM transitions
  enterEditMode: () => {
    ensureFSM();
    fsm.enterEditMode();
  },
  exitEditMode: () => {
    ensureFSM();
    // Cancel: restore original data before exiting
    const state = db.deref();
    if (state.originalData.todos) {
      db.resetIn(["data", "todos"], state.originalData.todos as Todo[]);
    }
    fsm.exitEditMode();
  },
  commit: async () => {
    ensureFSM();
    const data = db.deref().data;

    try {
      // Only save to server file in dev mode (localhost)
      if (canPersistToServer()) {
        console.log("💾 Committing to server file and localStorage...");
        try {
          const response = await fetch("/api/save-todos", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          });

          if (response.ok) {
            const result = await response.json();
            console.log("✅ Saved to server file:", result.message);
          } else {
            console.warn("⚠️ Server save failed, saved to localStorage only");
          }
        } catch (apiError) {
          console.warn(
            "⚠️ API not available, saved to localStorage only",
            apiError
          );
        }
      } else {
        console.log(
          "💾 SSG mode: Saving to localStorage only (server file is read-only)"
        );
      }

      // Always transition back to viewing after commit (localStorage is already updated via watch)
      fsm.commit();
    } catch (error) {
      console.error("❌ Commit failed:", error);
      throw error;
    }
  },

  // Todo operations using atom's built-in path methods
  addTodo: (text: string) => {
    if (!guardEditMode("add todo")) return;

    const todos = db.deref().data.todos || [];
    const newTodo: Todo = {
      id: Date.now().toString(),
      text,
      completed: false,
    };

    db.resetIn(["data", "todos"], [...todos, newTodo]);
    updateChangeCount();
  },

  toggleTodo: (id: string) => {
    if (!guardEditMode("toggle todo")) return;

    const todos = db.deref().data.todos || [];
    const todoIdx = findTodoIndex(todos, id);

    if (todoIdx !== -1) {
      const todo = todos[todoIdx];
      db.resetIn(["data", "todos", todoIdx, "completed"], !todo.completed);
      updateChangeCount();
    }
  },

  deleteTodo: (id: string) => {
    if (!guardEditMode("delete todo")) return;

    const todos = db.deref().data.todos || [];
    const filtered = todos.filter((t: Todo) => t.id !== id);
    db.resetIn(["data", "todos"], filtered);
    updateChangeCount();
  },

  updateTodoText: (id: string, text: string) => {
    if (!guardEditMode("update todo")) return;

    const todos = db.deref().data.todos || [];
    const todoIdx = findTodoIndex(todos, id);

    if (todoIdx !== -1) {
      db.resetIn(["data", "todos", todoIdx, "text"], text);
      updateChangeCount();
    }
  },

  // State queries
  canEdit: () => {
    ensureFSM();
    return canEdit(fsm.state);
  },
  isEditing: () => {
    ensureFSM();
    return isEditing(fsm.state);
  },
  canPersistToServer: () => canPersistToServer(),
  getChangeCount: () => db.deref().changeCount,
};
