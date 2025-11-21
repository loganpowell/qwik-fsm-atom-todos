// Simplified FSM for managing Todo app state
import StateMachine from "javascript-state-machine";

let storeInstance: any = null;

// Deep clone utility
const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const initTodoFSM = (store: any) => {
  storeInstance = store;

  const fsm = new StateMachine({
    init: "viewing",
    transitions: [
      { name: "enterEditMode", from: "viewing", to: "editing" },
      // Cancel (restore snapshot)
      { name: "exitEditMode", from: "editing", to: "viewing" },
      // Save and exit
      { name: "save", from: "editing", to: "viewing" },
      // Commit to server and exit (dev mode only)
      { name: "commit", from: "editing", to: "viewing" },
    ],

    methods: {
      onAfterTransition() {
        // Update store's FSM state after any transition
        storeInstance.setState({ fsmState: this.state });
      },
    },
  });

  return fsm;
};

export const canEdit = (state: string): boolean => state === "editing";
export const isEditing = (state: string): boolean => state === "editing";
