// FSM for managing Todo app state
import StateMachine from "javascript-state-machine";

let storeInstance: any = null;

// Detect if we're in SSG/production mode
const isSSG = () => {
  if (typeof window === "undefined") return true;
  return (
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  );
};

export const initTodoFSM = (store: any, initialState?: string) => {
  storeInstance = store;

  // Allow editing in both dev and SSG mode
  const startState = initialState || "viewing";

  return new StateMachine({
    init: startState,
    transitions: [
      // Both dev and SSG: viewing <-> editing
      { name: "enterEditMode", from: "viewing", to: "editing" },
      { name: "exitEditMode", from: "editing", to: "viewing" }, // Cancel
      { name: "commit", from: "editing", to: "viewing" }, // Save & Exit
    ],

    methods: {
      onEnterEditing(lifecycle: any) {
        // Skip lifecycle hook during initialization - state is already set correctly
        if (lifecycle?.transition === "init") return;

        const currentData = storeInstance.getState().data;
        // CRITICAL: Deep clone to prevent mutations affecting the snapshot
        storeInstance.setState({
          fsmState: this.state,
          originalData: JSON.parse(JSON.stringify(currentData)),
          changeCount: 0,
        });
      },

      // Exiting to viewing - clear snapshot
      onEnterViewing(lifecycle: any) {
        // Skip lifecycle hook during initialization
        if (lifecycle?.transition === "init") return;

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
};

export const canEdit = (state: string): boolean => {
  // Can edit in editing state (both dev and SSG)
  return state === "editing";
};

export const isEditing = (state: string): boolean => state === "editing";

// Helper to know if we can persist to server (dev only)
export const canPersistToServer = (): boolean => !isSSG();
