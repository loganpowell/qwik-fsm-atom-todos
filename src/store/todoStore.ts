import { defAtom } from "@thi.ng/atom";
import { initTodoFSM, canEdit, isEditing } from "../machines/todoFSM";

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
  editModeSnapshot: TodoData | null; // Snapshot when entering edit mode (for cancel)
  fsmState: string;
  isDevMode: boolean; // Detected once on init
}

let fsm: any = null;

// Detect if we're in dev mode (Vite dev server) vs production/SSG
const detectDevMode = (): boolean => {
  if (typeof window === "undefined") return false;
  // Vite sets import.meta.env.DEV to true in dev mode
  return import.meta.env.DEV;
};

// Load from localStorage (browser storage only)
const loadFromLocalStorage = (): TodoData | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("todo-data");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    console.log(`[localStorage] Loaded ${parsed.todos?.length || 0} todos`);
    return parsed;
  } catch (e) {
    console.warn("[localStorage] Failed to load:", e);
    return null;
  }
};

// Save to localStorage
const saveToLocalStorage = (data: TodoData) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("todo-data", JSON.stringify(data));
    console.log(`[localStorage] Saved ${data.todos.length} todos`);
  } catch (e) {
    console.warn("[localStorage] Failed to save:", e);
  }
};

// Load from /todos.json (initial data source)
const loadFromServerJson = async (): Promise<TodoData> => {
  try {
    const response = await fetch("/todos.json");
    if (!response.ok) throw new Error("Failed to fetch");
    const data = await response.json();
    console.log(`[/todos.json] Loaded ${data.todos.length} todos`);
    return data;
  } catch (e) {
    console.warn("[/todos.json] Failed to load:", e);
    return { todos: [] };
  }
};

// Initial state - will be populated on client
const initialState: TodoStoreState = {
  data: { todos: [] },
  editModeSnapshot: null,
  fsmState: "viewing",
  isDevMode: false,
};

export const db = defAtom<TodoStoreState>(initialState);

// Auto-save to localStorage on any data change
db.addWatch("autosave", (_, __, curr) => {
  if (curr.fsmState === "editing") {
    // Auto-save changes to localStorage while editing
    saveToLocalStorage(curr.data);
  }
});

// Initialize FSM (will be called after first data load)
const initializeFSM = () => {
  fsm = initTodoFSM({
    getState: () => db.deref(),
    setState: (updates: Partial<TodoStoreState>) => {
      db.swap((state) => ({ ...state, ...updates }));
    },
  });
};

// Utility: Ensure FSM is initialized
const ensureFSM = () => {
  if (!fsm)
    throw new Error("FSM not initialized. Call todoStore.initialize() first.");
};

// Utility: Find todo by ID
const findTodoIndex = (todos: Todo[], id: string): number => {
  return todos.findIndex((t: Todo) => t.id === id);
};

// Deep clone utility
const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

// Store API - functional interface around the atom
export const todoStore = {
  // Core atom access
  deref: () => db.deref(),
  subscribe: (listener: (state: TodoStoreState) => void) => {
    const watchId = `watch-${Date.now()}-${Math.random()}`;
    db.addWatch(watchId, (_, __, curr) => listener(curr));
    return () => db.removeWatch(watchId);
  },

  // Initialize - MUST be called first on client
  initialize: async () => {
    console.log("[todoStore.initialize] Starting...");

    // Detect dev mode
    const isDevMode = detectDevMode();
    console.log(`[todoStore.initialize] Mode: ${isDevMode ? "DEV" : "SSG"}`);

    // Try to load from localStorage first
    let data = loadFromLocalStorage();

    // If no localStorage data, load from /todos.json
    if (!data || data.todos.length === 0) {
      console.log(
        "[todoStore.initialize] No localStorage data, loading from /todos.json"
      );
      data = await loadFromServerJson();
      // Save to localStorage immediately
      saveToLocalStorage(data);
    } else {
      console.log("[todoStore.initialize] Using data from localStorage");
    }

    // Update store
    db.swap((state) => ({
      ...state,
      data,
      isDevMode,
      fsmState: "viewing",
    }));

    // Initialize FSM
    initializeFSM();

    console.log("[todoStore.initialize] Complete", {
      todosCount: data.todos.length,
      isDevMode,
    });
  },

  // FSM transitions
  enterEditMode: () => {
    ensureFSM();
    console.log("[todoStore.enterEditMode] Entering edit mode");

    // Take snapshot for cancel
    const currentData = db.deref().data;
    db.resetIn(["editModeSnapshot"], deepClone(currentData));

    fsm.enterEditMode();
  },

  exitEditMode: () => {
    ensureFSM();
    console.log("[todoStore.exitEditMode] Canceling - restoring snapshot");

    // Restore from snapshot
    const snapshot = db.deref().editModeSnapshot;
    if (snapshot) {
      db.resetIn(["data"], snapshot);
      saveToLocalStorage(snapshot);
    }

    db.resetIn(["editModeSnapshot"], null);
    fsm.exitEditMode();
  },

  save: () => {
    ensureFSM();
    console.log(
      "[todoStore.save] Saving to localStorage and exiting edit mode"
    );

    // Data is already in localStorage via autosave watch
    db.resetIn(["editModeSnapshot"], null);
    fsm.save();
  },

  commit: async () => {
    ensureFSM();
    const { data, isDevMode } = db.deref();

    if (!isDevMode) {
      console.log(
        "[todoStore.commit] SSG mode - commit not available, using save instead"
      );
      todoStore.save();
      return;
    }

    console.log("[todoStore.commit] Dev mode - committing to server");

    try {
      const response = await fetch("/api/save-todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        console.log("[todoStore.commit] ✅ Committed to server");
      } else {
        console.warn("[todoStore.commit] ⚠️ Server save failed");
      }
    } catch (error) {
      console.error("[todoStore.commit] ❌ Commit failed:", error);
    }

    // Always save to localStorage and exit edit mode
    db.resetIn(["editModeSnapshot"], null);
    fsm.commit();
  },

  // Todo operations
  addTodo: (text: string) => {
    ensureFSM();
    if (!canEdit(fsm.state)) {
      console.warn("[todoStore.addTodo] Cannot add todo outside edit mode");
      return;
    }

    const todos = db.deref().data.todos || [];
    const newTodo: Todo = {
      id: Date.now().toString(),
      text,
      completed: false,
    };

    db.resetIn(["data", "todos"], [...todos, newTodo]);
  },

  toggleTodo: (id: string) => {
    ensureFSM();
    if (!canEdit(fsm.state)) {
      console.warn(
        "[todoStore.toggleTodo] Cannot toggle todo outside edit mode"
      );
      return;
    }

    const todos = db.deref().data.todos || [];
    const todoIdx = findTodoIndex(todos, id);

    if (todoIdx !== -1) {
      const todo = todos[todoIdx];
      db.resetIn(["data", "todos", todoIdx, "completed"], !todo.completed);
    }
  },

  deleteTodo: (id: string) => {
    ensureFSM();
    if (!canEdit(fsm.state)) {
      console.warn(
        "[todoStore.deleteTodo] Cannot delete todo outside edit mode"
      );
      return;
    }

    const todos = db.deref().data.todos || [];
    const filtered = todos.filter((t: Todo) => t.id !== id);
    db.resetIn(["data", "todos"], filtered);
  },

  updateTodoText: (id: string, text: string) => {
    ensureFSM();
    if (!canEdit(fsm.state)) {
      console.warn(
        "[todoStore.updateTodoText] Cannot update todo outside edit mode"
      );
      return;
    }

    const todos = db.deref().data.todos || [];
    const todoIdx = findTodoIndex(todos, id);

    if (todoIdx !== -1) {
      db.resetIn(["data", "todos", todoIdx, "text"], text);
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

  isDevMode: () => {
    return db.deref().isDevMode;
  },
};
