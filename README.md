# FSM + @thi.ng/atom Todo Demo

A minimal demonstration of the **FSM + Atom** state management pattern using Qwik.

## 🎯 Purpose

This demo showcases a lightweight alternative to XState + Zustand:
- **javascript-state-machine** (2KB) - Simple FSM for state transitions
- **@thi.ng/atom** (2KB) - Reactive state container with built-in path operations
- **Total**: 4KB vs 18KB (78% reduction)

## 🏗️ Architecture

### Two-State FSM
```
viewing ⟷ editing
```

**viewing**: Read-only mode, data loaded from server
**editing**: Dev mode with change tracking and commit/cancel

### State Management Pattern

1. **FSM** manages transitions with lifecycle hooks:
   - `onEnterEditing`: Snapshot `originalData` for diff calculation
   - `onEnterViewing`: Clear snapshot, reset change count

2. **Atom** manages reactive state:
   - Built-in path operations (`resetIn`, `swapIn`)
   - Watch-based persistence to localStorage
   - Cross-tab synchronization via storage events

3. **Full State Approach**:
   - Entire dataset loaded in memory
   - Edits applied directly to `data.todos`
   - Changes calculated by diffing against `originalData` snapshot

## 🚀 Getting Started

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

This starts:
- Vite dev server (port 5173) - UI
- Express API server (port 3001) - Data persistence

Open http://localhost:5173

## 📂 Project Structure

```
toy-fsm-demo/
├── data/
│   └── todos.json              # Server data file
├── src/
│   ├── components/
│   │   └── TodoApp.tsx         # Main UI component
│   ├── machines/
│   │   └── todoFSM.ts          # 2-state FSM (viewing/editing)
│   ├── routes/
│   │   ├── index.tsx           # Root route
│   │   └── api/
│   │       ├── load-todos/     # GET /api/load-todos
│   │       └── save-todos/     # POST /api/save-todos
│   ├── store/
│   │   └── todoStore.ts        # Atom-based store
│   ├── types/
│   │   └── javascript-state-machine.d.ts
│   ├── root.tsx                # App shell
│   └── entry.ssr.tsx           # SSR entry point
├── server.ts                   # Express API server
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 🔄 Workflow Demo

1. **Enter Edit Mode**: Click "Enter Edit Mode" button
   - FSM transitions: `viewing` → `editing`
   - Store snapshots current data as `originalData`
   - UI enables add/edit/delete operations

2. **Make Changes**: Add, toggle, or delete todos
   - Changes reflected immediately in UI
   - Change count updates automatically (diff vs `originalData`)
   - State persists to localStorage

3. **Commit**: Click "💾 Commit" button
   - POST to `/api/save-todos` with full data
   - Server writes to `data/todos.json`
   - FSM transitions: `editing` → `viewing`
   - Change count resets to 0

4. **Cancel**: Click "Cancel" button
   - Restore `data` from `originalData` snapshot
   - FSM transitions: `editing` → `viewing`
   - All uncommitted changes discarded

## 🔍 Key Features

### Cross-Tab Synchronization
- localStorage changes trigger storage events
- FSM reinitializes to match new state
- Atom updates reactively
- Guards prevent infinite loops

### Smart Persistence
- Only persist in non-sync operations
- Preserve FSM state across reloads
- Server is source of truth on initialization

### Change Tracking
```typescript
const calculateChanges = (): number => {
  const currentTodos = state.data.todos;
  const originalTodos = state.originalData.todos;
  
  // Diff: new, modified, deleted todos
  return changedIds.size;
};
```

### Type-Safe Path Operations
```typescript
// @thi.ng/atom built-in methods
db.resetIn(["data", "todos", todoIdx, "completed"], !todo.completed);
db.resetIn(["data", "todos"], [...todos, newTodo]);
```

## 🎓 Learning Points

### Why FSM Over XState?
- Simpler API (just transitions and lifecycle hooks)
- No complex hierarchies or parallel states
- 2 states vs 5 (viewing, editing vs viewing, devMode_idle, devMode_editing, devMode_committing, devMode_clearing)

### Why Atom Over Zustand?
- Built-in path operations (no manual getter/setter)
- Watch-based persistence (more control than middleware)
- Future-ready: `defHistory()` for undo/redo, `defView()` for computed values
- Smaller bundle when combined with FSM

### Critical Patterns

**1. Deep Clone for Snapshots**
```typescript
onEnterEditing() {
  const currentData = store.getState().data;
  // CRITICAL: Prevent mutations affecting snapshot
  store.setState({
    originalData: JSON.parse(JSON.stringify(currentData))
  });
}
```

**2. Cross-Tab Sync Guard**
```typescript
let isSyncingFromStorage = false;

db.addWatch("persist", (id, prev, curr) => {
  if (isSyncingFromStorage) return; // Prevent infinite loop
  persistState(curr);
});
```

**3. FSM Reinitialization on Sync**
```typescript
window.addEventListener("storage", (e) => {
  const newState = JSON.parse(e.newValue);
  
  // CRITICAL: Reinitialize FSM before updating atom
  fsm = initTodoFSM(storeInterface, newState.fsmState);
  db.reset(newState);
});
```

## 🧪 Testing Cross-Tab Sync

1. Open http://localhost:5173 in two browser tabs
2. In **Tab 1**: Enter edit mode, add a todo
3. In **Tab 2**: Observe state automatically syncs to "editing" with new todo
4. In **Tab 1**: Commit changes
5. In **Tab 2**: Observe state syncs back to "viewing"

## 📊 Bundle Size Comparison

| Library                  | Size  |
|-------------------------|-------|
| XState                  | 15KB  |
| Zustand                 | 3KB   |
| **Total (old)**         | **18KB** |
| javascript-state-machine| 2KB   |
| @thi.ng/atom           | 2KB   |
| **Total (new)**         | **4KB** |
| **Savings**            | **-14KB (78%)** |

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start dev server + API server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run fmt` - Format code with Prettier
- `npm run lint` - Lint TypeScript files

### Debug Features

- **State Debug**: Shows current FSM state and flags
- **🔄 Refresh**: Reload from localStorage
- **🗑️ Reset**: Clear localStorage and reload
- **Debug Panel**: Expand to see full store state JSON

## 📝 License

MIT
