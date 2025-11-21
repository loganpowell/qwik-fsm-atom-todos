// FSM for managing Todo app state
import StateMachine from "javascript-state-machine";

let storeInstance: any = null;
let committedSnapshot: any = null; // FSM-owned snapshot of last committed state

const COMMITTED_SNAPSHOT_KEY = "fsm-committed-snapshot";

// Persist committedSnapshot to localStorage
const persistCommittedSnapshot = () => {
  if (typeof window === "undefined") return;

  try {
    if (committedSnapshot) {
      localStorage.setItem(
        COMMITTED_SNAPSHOT_KEY,
        JSON.stringify(committedSnapshot)
      );
      console.log("[FSM.persistCommittedSnapshot] Saved to localStorage");
    } else {
      localStorage.removeItem(COMMITTED_SNAPSHOT_KEY);
      console.log("[FSM.persistCommittedSnapshot] Cleared from localStorage");
    }
  } catch (e) {
    console.warn("[FSM.persistCommittedSnapshot] Failed:", e);
  }
};

// Load committedSnapshot from localStorage
const loadCommittedSnapshot = () => {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(COMMITTED_SNAPSHOT_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log(
        "[FSM.loadCommittedSnapshot] Loaded from localStorage:",
        parsed
      );
      return parsed;
    }
  } catch (e) {
    console.warn("[FSM.loadCommittedSnapshot] Failed:", e);
  }
  return null;
};

// Detect if we're in dev mode (with API server) vs SSG/production mode
const isDevMode = () => {
  if (typeof window === "undefined") return false;
  // In dev mode, Vite sets import.meta.env.DEV to true
  // In production/SSG build, it's false
  return import.meta.env.DEV;
};

export const initTodoFSM = (store: any, initialState?: string) => {
  storeInstance = store;

  // Load persisted committedSnapshot from localStorage
  committedSnapshot = loadCommittedSnapshot();

  // Detect environment and store in FSM data
  const isDev = isDevMode();
  const startState = initialState || "viewing";

  const fsm = new StateMachine({
    init: startState,
    transitions: [
      // Both dev and SSG: viewing <-> editing
      { name: "enterEditMode", from: "viewing", to: "editing" },
      { name: "exitEditMode", from: "editing", to: "viewing" }, // Cancel (discards changes)
      { name: "save", from: "editing", to: "viewing" }, // Exit and keep changes (already in localStorage)
      {
        name: "commit",
        from: "editing",
        to: "viewing", // Save to server + exit (dev only)
      },
    ],

    methods: {
      onEnterEditing(lifecycle: any) {
        // Skip lifecycle hook during initialization - state is already set correctly
        if (lifecycle?.transition === "init") return;

        const currentData = storeInstance.getState().data;

        console.log(
          "[FSM.onEnterEditing] Current committedSnapshot exists:",
          !!committedSnapshot
        );

        // CRITICAL: Deep clone to prevent mutations affecting the snapshot
        storeInstance.setState({
          fsmState: this.state,
          originalData: JSON.parse(JSON.stringify(currentData)),
          changeCount: 0,
        });

        // FSM owns the committed snapshot - create it on first edit session
        // After that, it persists across edit sessions until manually cleared
        if (!committedSnapshot) {
          committedSnapshot = JSON.parse(JSON.stringify(currentData));
          persistCommittedSnapshot(); // Save to localStorage
          console.log("[FSM.onEnterEditing] Created initial committedSnapshot");
        }
      },

      // After save: exit to viewing (changes already persisted to localStorage via watch)
      onSave(lifecycle: any) {
        const currentData = storeInstance.getState().data;
        // Just update the FSM state - changes are already in localStorage
        storeInstance.setState({
          fsmState: this.state,
          originalData: {},
          changeCount: 0,
        });
        // Note: committedSnapshot is NOT updated, so uncommitted count continues tracking
      },

      // After commit: update committed snapshot and exit to viewing
      onCommit(lifecycle: any) {
        const currentData = storeInstance.getState().data;
        // Update committed snapshot (FSM-owned) before transitioning
        committedSnapshot = JSON.parse(JSON.stringify(currentData));
        persistCommittedSnapshot(); // Save to localStorage

        console.log(
          "[FSM.onCommit] Updated committedSnapshot:",
          committedSnapshot
        );

        // Update state
        storeInstance.setState({
          fsmState: this.state,
          originalData: JSON.parse(JSON.stringify(currentData)),
          changeCount: 0,
        });
      },

      // Exiting to viewing - clear snapshots
      onEnterViewing(lifecycle: any) {
        // Skip lifecycle hook during initialization
        if (lifecycle?.transition === "init") return;

        console.log("[FSM.onEnterViewing] Transition:", lifecycle?.transition);

        // Only clear committedSnapshot if we're canceling (exitEditMode), not committing
        if (lifecycle?.transition === "exitEditMode") {
          console.log(
            "[FSM.onEnterViewing] Clearing committedSnapshot (cancel)"
          );
          committedSnapshot = null;
          persistCommittedSnapshot(); // Clear from localStorage
        } else if (lifecycle?.transition === "commit") {
          console.log(
            "[FSM.onEnterViewing] Keeping committedSnapshot (after commit)"
          );
          // Keep committedSnapshot after commit so we can track new changes
          // Already persisted in onCommit
        }

        storeInstance.setState({
          fsmState: this.state,
          originalData: {},
          changeCount: 0,
        });
      },

      // Generic transition handler
      onAfterTransition() {
        storeInstance.setState({ fsmState: this.state });
      },
    },
  });

  // Attach isDev flag to FSM instance
  (fsm as any).isDev = isDev;

  return fsm;
};

export const canEdit = (state: string): boolean => {
  // Can edit in editing state (both dev and SSG)
  return state === "editing";
};

export const isEditing = (state: string): boolean => state === "editing";

// Helper to know if we can commit changes to the server's todos.json file (dev only)
// Note: All users can edit and save to localStorage, but only dev can commit to the file
export const canCommitToServerFile = (): boolean => isDevMode();

// Helper to check if FSM instance is in dev mode
export const isFSMInDevMode = (fsm: any): boolean => {
  return fsm?.isDev ?? false;
};

// FSM-owned function to calculate uncommitted changes
export const getUncommittedCount = (): number => {
  // console.log(
  //   "[FSM.getUncommittedCount] Called. storeInstance exists:",
  //   !!storeInstance,
  //   "committedSnapshot exists:",
  //   !!committedSnapshot
  // );

  if (!storeInstance || !committedSnapshot) {
    // console.log("[FSM.getUncommittedCount] Returning 0 - missing dependencies");
    return 0;
  }

  const currentData = storeInstance.getState().data;
  const currentTodos = currentData.todos || [];
  const committedTodos = committedSnapshot.todos || [];

  // console.log(
  //   "[FSM.getUncommittedCount] current todos:",
  //   currentTodos.length,
  //   "committed todos:",
  //   committedTodos.length
  // );
  // console.log(
  //   "[FSM.getUncommittedCount] current IDs:",
  //   currentTodos.map((t: any) => t.id)
  // );
  // console.log(
  //   "[FSM.getUncommittedCount] committed IDs:",
  //   committedTodos.map((t: any) => t.id)
  // );

  const changedIds = new Set<string>();
  const currentMap = new Map(currentTodos.map((t: any) => [t.id, t]));
  const committedMap = new Map(committedTodos.map((t: any) => [t.id, t]));

  // Check for changes, additions
  currentTodos.forEach((currentTodo: any) => {
    const committedTodo = committedMap.get(currentTodo.id) as any;
    if (
      !committedTodo ||
      currentTodo.text !== committedTodo.text ||
      currentTodo.completed !== committedTodo.completed
    ) {
      // console.log(
      //   "[FSM.getUncommittedCount] Change detected:",
      //   currentTodo.id,
      //   "reason:",
      //   !committedTodo ? "new" : "modified"
      // );
      changedIds.add(currentTodo.id);
    }
  });

  // Check for deletions
  committedTodos.forEach((committedTodo: any) => {
    if (!currentMap.has(committedTodo.id)) {
      // console.log(
      //   "[FSM.getUncommittedCount] Deletion detected:",
      //   committedTodo.id
      // );
      changedIds.add(committedTodo.id);
    }
  });

  // console.log("[FSM.getUncommittedCount] Final result:", changedIds.size);
  return changedIds.size;
};
