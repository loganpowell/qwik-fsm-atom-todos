# FSM + Atom Pattern Summary

## Core Concepts

This demo implements a minimal state management pattern combining:
1. **Finite State Machine** (FSM) - Controls workflow transitions
2. **Reactive Atom** - Manages application state
3. **Full State Approach** - Load entire dataset, track changes via diff

## Pattern Benefits

### Simplicity
- 2-state FSM vs complex state hierarchies
- Direct data manipulation (no mutation maps)
- Single source of truth

### Performance
- 4KB total vs 18KB (XState + Zustand)
- Built-in operations (no manual path traversal)
- Efficient change detection

### Developer Experience
- Type-safe path operations up to 8 levels
- Watch-based reactivity
- Easy debugging (full state visible)

## Implementation Details

### FSM Lifecycle Hooks

```typescript
onEnterEditing(lifecycle) {
  // Snapshot current state for diff calculation
  const currentData = store.getState().data;
  store.setState({
    originalData: JSON.parse(JSON.stringify(currentData)),
    changeCount: 0
  });
}

onEnterViewing(lifecycle) {
  // Clear snapshot when exiting edit mode
  store.setState({
    originalData: {},
    changeCount: 0
  });
}
```

### Atom Watch-Based Persistence

```typescript
// Auto-persist to localStorage on any state change
db.addWatch("persist", (id, prev, curr) => {
  if (isSyncingFromStorage) return; // Guard against loops
  localStorage.setItem("todo-store", JSON.stringify(curr));
});
```

### Cross-Tab Synchronization

```typescript
window.addEventListener("storage", (e) => {
  if (e.key === "todo-store" && e.newValue) {
    const newState = JSON.parse(e.newValue);
    
    // CRITICAL: Reinit FSM to match new state
    fsm = initTodoFSM(storeInterface, newState.fsmState);
    
    // Update atom
    isSyncingFromStorage = true;
    db.reset(newState);
    isSyncingFromStorage = false;
  }
});
```

### Change Detection Algorithm

```typescript
const calculateChanges = (): number => {
  const current = state.data.todos;
  const original = state.originalData.todos || [];
  const changedIds = new Set<string>();

  // Detect new and modified todos
  current.forEach(todo => {
    const orig = original.find(o => o.id === todo.id);
    if (!orig || todo.text !== orig.text || todo.completed !== orig.completed) {
      changedIds.add(todo.id);
    }
  });

  // Detect deleted todos
  original.forEach(orig => {
    if (!current.find(t => t.id === orig.id)) {
      changedIds.add(orig.id);
    }
  });

  return changedIds.size;
};
```

## Critical Patterns

### 1. Deep Clone Snapshots
Always use `JSON.parse(JSON.stringify(data))` to prevent mutations affecting the baseline.

### 2. Guard Sync Operations
Use flag (`isSyncingFromStorage`) to prevent infinite loops when storage events trigger persistence.

### 3. FSM Reinitialization
When syncing state across tabs, reinitialize FSM **before** updating atom to keep states aligned.

### 4. Server as Source of Truth
On app initialization, load from server and only preserve local edits if in editing mode.

## State Flow

```
[Server File] ──load──> [Store] ──watch──> [localStorage]
                           │
                           ├──subscribe──> [UI Signals]
                           │
                        [FSM Controls]
                        viewing ⟷ editing
```

## Testing Checklist

- [ ] Enter/exit edit mode
- [ ] Add/toggle/delete todos
- [ ] Change count accuracy
- [ ] Commit saves to file
- [ ] Cancel restores snapshot
- [ ] Refresh preserves state
- [ ] Cross-tab sync works
- [ ] localStorage persistence
- [ ] No infinite loops
- [ ] Server data loads on init

## Migration from XState/Zustand

### Before (XState)
```typescript
machine.send({ type: 'ENABLE_EDIT_MODE' });
machine.send({ type: 'UPDATE_ITEM', item });
machine.send({ type: 'SAVE' });
```

### After (FSM)
```typescript
fsm.enterEditMode();
store.updateItem(item);
await store.commit();
```

### Before (Zustand)
```typescript
import { useStore } from 'zustand';
import { setIn } from '@thi.ng/paths';

const store = useStore();
store.setState({
  data: setIn(store.data, ['todos', idx, 'completed'], true)
});
```

### After (Atom)
```typescript
import { defAtom } from '@thi.ng/atom';

const db = defAtom(initialState);
db.resetIn(['data', 'todos', idx, 'completed'], true);
```

## Future Enhancements

### Undo/Redo
```typescript
import { defHistory } from '@thi.ng/atom';

const history = defHistory(db);
history.undo(); // Revert last change
history.redo(); // Reapply undone change
```

### Computed Values
```typescript
import { defView } from '@thi.ng/atom';

const completedCount = defView(
  db,
  ['data', 'todos'],
  (todos) => todos.filter(t => t.completed).length
);
```

### Optimistic Updates
```typescript
async commit() {
  const snapshot = db.deref().data;
  
  try {
    await fetch('/api/save-todos', { 
      method: 'POST',
      body: JSON.stringify(snapshot) 
    });
    fsm.commit(); // Success: transition to viewing
  } catch (error) {
    db.resetIn(['data'], snapshot); // Rollback on error
    alert('Save failed');
  }
}
```

## Resources

- [javascript-state-machine](https://github.com/jakesgordon/javascript-state-machine)
- [@thi.ng/atom](https://github.com/thi-ng/umbrella/tree/develop/packages/atom)
- [Qwik Framework](https://qwik.builder.io/)
