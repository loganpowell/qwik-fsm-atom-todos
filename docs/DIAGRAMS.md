# Architecture Diagrams

## FSM State Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     FSM States                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────┐                             ┌──────────┐    │
│   │          │   enterEditMode()           │          │    │
│   │ viewing  │ ─────────────────────────> │ editing  │    │
│   │          │                             │          │    │
│   │          │ <───────────────────────── │          │    │
│   └──────────┘   commit() / exitEditMode() └──────────┘    │
│                                                             │
│   Lifecycle Hooks:                                          │
│   • onEnterEditing: snapshot originalData                   │
│   • onEnterViewing: clear originalData                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Application Layer                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    TodoApp.tsx                          │    │
│  │  • Subscribes to store via signals                      │    │
│  │  • Calls store API methods                              │    │
│  │  • Renders UI based on FSM state                        │    │
│  └──────────────────────┬──────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  todoStore.ts                           │    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │  Public API:                                     │   │    │
│  │  │  • enterEditMode()                               │   │    │
│  │  │  • exitEditMode()                                │   │    │
│  │  │  • commit()                                      │   │    │
│  │  │  • addTodo() / toggleTodo() / deleteTodo()      │   │    │
│  │  │  • subscribe()                                   │   │    │
│  │  └──────────────────────────────────────────────────┘   │    │
│  │                                                          │    │
│  │  ┌──────────────┐          ┌──────────────┐            │    │
│  │  │  todoFSM.ts  │          │  @thi.ng/    │            │    │
│  │  │  (FSM)       │◄────────►│  atom (db)   │            │    │
│  │  │              │          │              │            │    │
│  │  │ • viewing    │          │ • resetIn()  │            │    │
│  │  │ • editing    │          │ • swapIn()   │            │    │
│  │  │ • lifecycle  │          │ • addWatch() │            │    │
│  │  └──────────────┘          └──────┬───────┘            │    │
│  │                                   │                     │    │
│  │                                   ▼                     │    │
│  │                         ┌──────────────────┐            │    │
│  │                         │  localStorage    │            │    │
│  │                         │  persistence     │            │    │
│  │                         └──────────────────┘            │    │
│  └────────────────────────────┬──────────────────────────┘     │
│                               │                                │
│                               ▼                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              API Routes (Qwik City)                     │   │
│  │  • /api/load-todos (GET)                                │   │
│  │  • /api/save-todos (POST)                               │   │
│  └────────────────────────┬────────────────────────────────┘   │
│                           │                                    │
└───────────────────────────┼────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Persistence Layer                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐              ┌────────────────┐             │
│  │  server.ts     │              │ data/todos.json│             │
│  │  (Express)     │◄────────────►│ (File System) │             │
│  │                │              │                │             │
│  │  Port 3001     │              │  Source of     │             │
│  │                │              │  Truth         │             │
│  └────────────────┘              └────────────────┘             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## State Structure

```typescript
┌────────────────────────────────────────────────────────────┐
│                    TodoStoreState                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  fsmState: "viewing" | "editing"                           │
│  ┌────────────────────────────────────────────────────┐   │
│  │  data: {                    ← Current working data│   │
│  │    todos: [                                        │   │
│  │      { id, text, completed }                       │   │
│  │    ]                                               │   │
│  │  }                                                 │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │  originalData: {            ← Snapshot for diff   │   │
│  │    todos: [...]                                    │   │
│  │  }                                                 │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  changeCount: number            ← # of changed todos      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Workflow: Edit and Commit

```
User Action                 FSM State       Store State
─────────────────────────────────────────────────────────────
                            viewing         data = server data
                                           originalData = {}
                                           changeCount = 0

[Enter Edit Mode] ─────────►editing         data = server data
                                           originalData = {...data}
                                           changeCount = 0

[Add Todo] ────────────────►editing         data.todos.push(newTodo)
                                           originalData = (unchanged)
                                           changeCount = 1

[Toggle Todo] ─────────────►editing         data.todos[0].completed = true
                                           originalData = (unchanged)
                                           changeCount = 2

[Commit] ──────────────────►viewing         POST to /api/save-todos
                                           data = (committed changes)
                                           originalData = {}
                                           changeCount = 0
```

## Workflow: Edit and Cancel

```
User Action                 FSM State       Store State
─────────────────────────────────────────────────────────────
                            viewing         data = server data
                                           originalData = {}

[Enter Edit Mode] ─────────►editing         originalData = {...data}

[Add Todo] ────────────────►editing         data.todos.push(newTodo)
                                           changeCount = 1

[Cancel] ──────────────────►viewing         data = originalData
                                           originalData = {}
                                           changeCount = 0
```

## Cross-Tab Synchronization

```
┌──────────────┐                          ┌──────────────┐
│   Tab 1      │                          │   Tab 2      │
├──────────────┤                          ├──────────────┤
│              │                          │              │
│ [Edit Mode]  │                          │ [Viewing]    │
│ Add todo     │                          │              │
│   ↓          │                          │              │
│ Store update │                          │              │
│   ↓          │                          │              │
│ localStorage │──────────────────────────┤              │
│  write       │  storage event           │              │
│              │  ───────────────────────►│              │
│              │                          │   ↓          │
│              │                          │ FSM reinit   │
│              │                          │   ↓          │
│              │                          │ Atom update  │
│              │                          │   ↓          │
│              │                          │ UI re-render │
│              │                          │              │
│ [Editing]    │                          │ [Editing]    │
│ 1 change     │◄────────synced──────────►│ 1 change     │
│              │                          │              │
└──────────────┘                          └──────────────┘
```

## Change Detection Algorithm

```
calculateChanges():

  Current Todos          Original Todos         Result
  ─────────────          ──────────────         ──────
  [                      [                      changedIds = new Set()
    {id:1, text:"A"},      {id:1, text:"A"},    
    {id:2, text:"B"},      {id:2, text:"X"},    ← Modified → add(2)
    {id:3, text:"C"}       {id:4, text:"D"}     ← New → add(3)
  ]                      ]                      ← Deleted → add(4)

  return changedIds.size  // 3 changes
```

## Performance Characteristics

```
Operation               Time Complexity    Space Complexity
──────────────────────────────────────────────────────────
enterEditMode()         O(n)              O(n) - deep clone
addTodo()               O(1)              O(1)
toggleTodo()            O(n)              O(1) - find by id
deleteTodo()            O(n)              O(n) - filter
calculateChanges()      O(n²)             O(n) - Set of ids
commit()                O(n)              O(n) - JSON payload
subscribe()             O(1)              O(1) - add watch

Where n = number of todos
```

## Bundle Size Breakdown

```
┌──────────────────────────────────────────────────────┐
│              Bundle Size Comparison                  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  OLD APPROACH (XState + Zustand)                    │
│  ┌────────────────────────────────────────────┐     │
│  │ XState          ███████████████  15KB      │     │
│  │ Zustand         ███  3KB                   │     │
│  │ TOTAL           18KB                       │     │
│  └────────────────────────────────────────────┘     │
│                                                      │
│  NEW APPROACH (FSM + Atom)                          │
│  ┌────────────────────────────────────────────┐     │
│  │ js-state-machine  ██  2KB                  │     │
│  │ @thi.ng/atom      ██  2KB                  │     │
│  │ TOTAL             4KB                      │     │
│  └────────────────────────────────────────────┘     │
│                                                      │
│  SAVINGS: -14KB (78% reduction)                     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## File Dependencies

```
TodoApp.tsx
    ├─> todoStore.ts
    │       ├─> todoFSM.ts
    │       │       └─> javascript-state-machine
    │       └─> @thi.ng/atom
    │
    └─> API Routes
            ├─> /api/load-todos
            └─> /api/save-todos
                    └─> data/todos.json
```

---

These diagrams provide visual understanding of:
1. FSM state transitions
2. Complete data flow architecture
3. State structure in memory
4. User workflows (commit vs cancel)
5. Cross-tab synchronization
6. Change detection logic
7. Performance characteristics
8. Bundle size comparison
9. File dependencies
