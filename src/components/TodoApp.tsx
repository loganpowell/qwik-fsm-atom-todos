import { component$, useSignal, $, useVisibleTask$ } from "@builder.io/qwik";
import { todoStore } from "../store/todoStore";

export const TodoApp = component$(() => {
  const newTodoText = useSignal("");

  // Reactive signals synced with store
  // Use safe defaults for SSR
  let state;
  try {
    state = todoStore.deref();
  } catch (e) {
    console.error("[TodoApp] ❌ Failed to get store state:", e);
  }

  if (!state) {
    state = {
      fsmState: "viewing",
      data: { todos: [] },
      changeCount: 0,
      originalData: {},
    };
  }

  const fsmState = useSignal(state.fsmState);
  const todos = useSignal(state.data.todos || []);
  const changeCount = useSignal(state.changeCount);
  const canEdit = useSignal(todoStore.canEdit());
  const isEditing = useSignal(todoStore.isEditing());
  const canPersistToServer = useSignal(todoStore.canPersistToServer());

  // Subscribe to store changes
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    // Initial sync: Update signals with current store state on mount
    const initialState = todoStore.deref();

    fsmState.value = initialState.fsmState;
    todos.value = initialState.data.todos || [];
    changeCount.value = initialState.changeCount;
    canEdit.value = todoStore.canEdit();
    isEditing.value = todoStore.isEditing();
    canPersistToServer.value = todoStore.canPersistToServer();

    // Subscribe to future changes
    const unsubscribe = todoStore.subscribe((state) => {
      fsmState.value = state.fsmState;
      todos.value = state.data.todos || [];
      changeCount.value = state.changeCount;
      canEdit.value = todoStore.canEdit();
      isEditing.value = todoStore.isEditing();
      canPersistToServer.value = todoStore.canPersistToServer();
    });

    // Note: Storage event listener is now handled in the store itself
    // for cross-tab sync via atom's watch mechanism

    return () => {
      unsubscribe();
    };
  });

  // Wrapped actions for Qwik serialization
  const handleEnterEditMode = $(() => {
    todoStore.enterEditMode();
  });

  const handleCancel = $(() => {
    todoStore.exitEditMode();
  });

  const handleCommit = $(async () => {
    await todoStore.commit();
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
            {isEditing.value && (
              <div>
                <span class="font-semibold">Changes: </span>
                <span class="px-2 py-1 bg-yellow-200 rounded">
                  {changeCount.value}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mode Controls */}
      <div class="mb-6 flex flex-col gap-2">
        <div class="text-sm text-gray-600">
          Debug: fsmState.value = "{fsmState.value}", canEdit ={" "}
          {canEdit.value ? "true" : "false"}, isEditing ={" "}
          {isEditing.value ? "true" : "false"}, canPersistToServer ={" "}
          {canPersistToServer.value ? "true" : "false"}
        </div>

        <div class="flex gap-2 items-center min-h-[42px]">
          <div class="flex gap-2 flex-1">
            {fsmState.value === "viewing" && (
              <>
                <button
                  onClick$={handleEnterEditMode}
                  class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 h-[42px]"
                >
                  Enter Edit Mode
                </button>
                {!canPersistToServer.value && (
                  <div class="px-4 py-2 bg-yellow-100 text-yellow-800 rounded h-[42px] flex items-center text-sm">
                    ℹ️ SSG mode: Changes save to browser only
                  </div>
                )}
              </>
            )}

            {fsmState.value === "editing" && (
              <>
                <button
                  onClick$={handleCommit}
                  disabled={changeCount.value === 0}
                  class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 h-[42px]"
                >
                  💾 Commit ({changeCount.value})
                </button>
                <button
                  onClick$={handleCancel}
                  class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 h-[42px]"
                >
                  Cancel
                </button>
              </>
            )}
          </div>

          {/* Reset/Refresh buttons for debugging */}
          <div class="flex gap-2">
            <button
              onClick$={handleRefreshFromStorage}
              class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm h-[42px]"
              title="Reload from localStorage"
            >
              🔄 Refresh
            </button>
            <button
              onClick$={handleResetLocalStorage}
              class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm h-[42px]"
              title="Clear localStorage and reload"
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
              class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 h-[50px]"
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
                class="w-5 h-5"
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
                  class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
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
