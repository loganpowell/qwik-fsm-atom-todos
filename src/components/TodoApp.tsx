import { component$, useSignal, $, useVisibleTask$ } from "@builder.io/qwik";
import { todoStore } from "../store/todoStore";

export const TodoApp = component$(() => {
  const newTodoText = useSignal("");

  // Reactive signals synced with store - safe defaults for SSG
  const fsmState = useSignal("viewing");
  const todos = useSignal<any[]>([]);
  const isEditing = useSignal(false);
  const canEdit = useSignal(false);
  const isDevMode = useSignal(false);

  // Helper to sync all signals from store state
  const syncSignalsFromStore = $(() => {
    try {
      const state = todoStore.deref();
      console.log("[syncSignalsFromStore] Syncing from state:", {
        fsmState: state.fsmState,
        todosCount: state.data.todos?.length || 0,
        isDevMode: state.isDevMode,
      });

      fsmState.value = state.fsmState;
      todos.value = state.data.todos || [];
      isEditing.value = todoStore.isEditing();
      canEdit.value = todoStore.canEdit();
      isDevMode.value = todoStore.isDevMode();

      console.log("[syncSignalsFromStore] After sync - signals:", {
        fsmState: fsmState.value,
        canEdit: canEdit.value,
        isEditing: isEditing.value,
        isDevMode: isDevMode.value,
      });
    } catch (e) {
      console.warn("[syncSignalsFromStore] Failed to sync:", e);
    }
  });

  // Subscribe to store changes
  // Only run on client (not during SSR/SSG)
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(
    async () => {
      console.log("[useVisibleTask$] Starting initialization");

      // Load initial todos from /todos.json if no localStorage data
      await todoStore.initialize();

      // Initial sync: Update signals with current store state on mount
      console.log("[useVisibleTask$] Performing initial sync");
      await syncSignalsFromStore();

      // Subscribe to future changes
      console.log("[useVisibleTask$] Setting up store subscription");
      const unsubscribe = todoStore.subscribe(async () => {
        console.log("[Store Subscription] Store changed, syncing signals");
        await syncSignalsFromStore();
      });

      // Note: Storage event listener is now handled in the store itself
      // for cross-tab sync via atom's watch mechanism

      console.log("[useVisibleTask$] Initialization complete");

      return () => {
        console.log("[useVisibleTask$] Cleaning up subscription");
        unsubscribe();
      };
    },
    { strategy: "document-ready" }
  );

  // Wrapped actions for Qwik serialization
  const handleEnterEditMode = $(() => {
    console.log(
      "[handleEnterEditMode] Before transition - fsmState:",
      fsmState.value
    );
    todoStore.enterEditMode();
    console.log(
      "[handleEnterEditMode] After transition - store fsmState:",
      todoStore.deref().fsmState
    );

    // Force sync signals after transition
    syncSignalsFromStore();
  });

  const handleExitEditMode = $(() => {
    console.log("[handleExitEditMode] Saving and exiting edit mode");
    todoStore.save();
    syncSignalsFromStore();
  });

  const handleCancel = $(() => {
    console.log("[handleCancel] Canceling edit mode");
    todoStore.exitEditMode();
    syncSignalsFromStore();
  });

  const handleCommit = $(async () => {
    console.log("[handleCommit] Committing changes");
    await todoStore.commit();
    syncSignalsFromStore();
  });

  const handleAddTodo = $(() => {
    if (newTodoText.value.trim() && canEdit.value) {
      todoStore.addTodo(newTodoText.value.trim());
      newTodoText.value = "";
    }
  });

  const handleToggleTodo = $((id: string) => {
    todoStore.toggleTodo(id);
  });

  const handleDeleteTodo = $((id: string) => {
    todoStore.deleteTodo(id);
  });

  const handleResetLocalStorage = $(() => {
    if (typeof window !== "undefined") {
      localStorage.clear();
      window.location.reload();
    }
  });

  const handleRefreshFromStorage = $(() => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  });

  return (
    <div class="max-w-2xl mx-auto p-8">
      <h1 class="text-3xl font-bold mb-6">FSM + @thi.ng/atom Todo App</h1>

      {/* Status Bar */}
      <div class="mb-6 p-4 bg-gray-100 rounded-lg min-h-[72px]">
        <div class="flex items-center justify-between">
          <div>
            <span class="font-semibold">State: </span>
            <span class="px-2 py-1 bg-blue-200 rounded">{fsmState.value}</span>
          </div>
          <div class="min-w-[120px] text-right">
            {/* Placeholder for future features */}
          </div>
        </div>
      </div>

      {/* Mode Controls */}
      <div class="mb-6 flex flex-col gap-2">
        <div class="text-sm text-gray-600">
          Debug: fsmState.value = "{fsmState.value}", canEdit ={" "}
          {canEdit.value ? "true" : "false"}, isEditing ={" "}
          {isEditing.value ? "true" : "false"}, isDevMode ={" "}
          {isDevMode.value ? "true" : "false"}
        </div>

        <div class="flex gap-2 items-center min-h-[42px]">
          <div class="flex gap-2 flex-1">
            {fsmState.value === "viewing" ? (
              <>
                <button
                  onClick$={handleEnterEditMode}
                  class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 h-[42px] cursor-pointer"
                  type="button"
                >
                  Edit
                </button>
                {!isDevMode.value && (
                  <div class="px-4 py-2 bg-yellow-100 text-yellow-800 rounded h-[42px] flex items-center text-sm">
                    ℹ️ SSG mode: Changes auto-save to browser only
                  </div>
                )}
              </>
            ) : null}

            {fsmState.value === "editing" ? (
              <>
                {isDevMode.value ? (
                  <>
                    <button
                      onClick$={handleCommit}
                      class="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 h-[42px] text-sm whitespace-nowrap cursor-pointer"
                      type="button"
                    >
                      💾 Commit to Server
                    </button>
                    <button
                      onClick$={handleCancel}
                      class="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 h-[42px] text-sm whitespace-nowrap cursor-pointer"
                      type="button"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick$={handleExitEditMode}
                      class="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 h-[42px] text-sm whitespace-nowrap cursor-pointer"
                      type="button"
                    >
                      💾 Save
                    </button>
                    <button
                      onClick$={handleCancel}
                      class="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 h-[42px] text-sm whitespace-nowrap cursor-pointer"
                      type="button"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </>
            ) : null}
          </div>

          {/* Reset/Refresh buttons for debugging */}
          <div class="flex gap-2">
            <button
              onClick$={handleRefreshFromStorage}
              class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm h-[42px] cursor-pointer"
              title="Reload from localStorage"
              type="button"
            >
              🔄 Refresh
            </button>
            <button
              onClick$={handleResetLocalStorage}
              class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm h-[42px] cursor-pointer"
              title="Clear localStorage and reload"
              type="button"
            >
              🗑️ Reset
            </button>
          </div>
        </div>
      </div>

      {/* Add Todo - Reserve space to prevent layout shift */}
      <div class="mb-6 min-h-[50px]">
        {canEdit.value && (
          <div class="flex gap-2">
            <input
              type="text"
              value={newTodoText.value}
              onInput$={(e) => {
                newTodoText.value = (e.target as HTMLInputElement).value;
              }}
              onKeyPress$={(e) => {
                if (e.key === "Enter") {
                  handleAddTodo();
                }
              }}
              placeholder="Add a new todo..."
              class="flex-1 px-4 py-2 border rounded h-[50px]"
            />
            <button
              onClick$={handleAddTodo}
              class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 h-[50px] cursor-pointer"
              type="button"
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* Todo List */}
      <div class="space-y-2">
        {todos.value.length === 0 ? (
          <p class="text-gray-500 text-center py-8">No todos yet!</p>
        ) : (
          todos.value.map((todo: any) => (
            <div
              key={todo.id}
              class="flex items-center gap-3 p-3 bg-white border rounded hover:shadow-md transition-shadow"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange$={() => handleToggleTodo(todo.id)}
                disabled={!canEdit.value}
                class="w-5 h-5 cursor-pointer"
              />
              <span
                class={`flex-1 ${
                  todo.completed ? "line-through text-gray-400" : ""
                }`}
              >
                {todo.text}
              </span>
              {canEdit.value && (
                <button
                  onClick$={() => handleDeleteTodo(todo.id)}
                  class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer"
                  type="button"
                >
                  Delete
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Debug Info */}
      <details class="mt-8 p-4 bg-gray-50 rounded">
        <summary class="cursor-pointer font-semibold">
          Debug: Store State
        </summary>
        <pre class="mt-2 text-xs overflow-auto">
          {JSON.stringify(todoStore.deref().data, null, 2)}
        </pre>
      </details>
    </div>
  );
});
