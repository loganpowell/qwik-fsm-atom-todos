# Quick Start Guide

## First Time Setup

```bash
cd toy-fsm-demo
npm install
```

## Run the Demo

```bash
npm run dev
```

Open your browser to http://localhost:5173

## What You'll See

1. **Status Bar**: Shows current FSM state (viewing/editing) and change count
2. **Mode Controls**: Buttons to enter edit mode, commit, or cancel
3. **Debug Info**: Current state flags and localStorage controls
4. **Todo List**: Add, toggle, and delete todos (when in edit mode)
5. **Debug Panel**: Expandable JSON view of full store state

## Try These Workflows

### Basic Edit Workflow
1. Click **"Enter Edit Mode"** → State changes to `editing`
2. Add a new todo → Change count increments
3. Toggle a todo's completion → Change count updates
4. Click **"💾 Commit (2)"** → Saves to server, returns to `viewing`

### Cancel Workflow
1. Enter edit mode
2. Make some changes (add, edit, delete todos)
3. Click **"Cancel"** → All changes discarded, returns to `viewing`

### Cross-Tab Sync
1. Open http://localhost:5173 in **two browser tabs**
2. In **Tab 1**: Enter edit mode and add a todo
3. In **Tab 2**: Watch state automatically sync to editing with the new todo
4. In **Tab 1**: Click commit
5. In **Tab 2**: Watch state sync back to viewing

### localStorage Persistence
1. Enter edit mode, make changes (don't commit)
2. Refresh the page (Cmd+R / Ctrl+R)
3. See your uncommitted changes still present
4. FSM state still in `editing` mode

### Reset for Testing
- **🔄 Refresh**: Reload UI from localStorage
- **🗑️ Reset**: Clear all localStorage and reload from server

## File Structure

```
toy-fsm-demo/
├── data/todos.json         ← Server data (source of truth)
├── src/
│   ├── machines/todoFSM.ts     ← 2-state FSM
│   ├── store/todoStore.ts      ← Atom + persistence
│   └── components/TodoApp.tsx  ← UI component
└── server.ts               ← Express API server
```

## Understanding the Code

### FSM States
- **viewing**: Read-only, data from server
- **editing**: Dev mode, changes tracked against snapshot

### Store Operations
```typescript
todoStore.enterEditMode()      // viewing → editing
todoStore.addTodo(text)        // Add new todo (edit mode only)
todoStore.toggleTodo(id)       // Toggle completion (edit mode only)
todoStore.deleteTodo(id)       // Remove todo (edit mode only)
todoStore.commit()             // Save to server, editing → viewing
todoStore.exitEditMode()       // Cancel changes, editing → viewing
```

### State Shape
```typescript
{
  fsmState: "viewing" | "editing",
  data: {
    todos: [
      { id: "1", text: "...", completed: false }
    ]
  },
  originalData: { /* snapshot when entering edit mode */ },
  changeCount: 2  // Number of changed todos
}
```

## Console Logs

Watch the browser console for:
- `[todoStore] 🔄 Initializing from server...` - App startup
- `[todoStore] ✅ Initialized with N todos` - Server data loaded
- `💾 Committing to file:` - Saving changes
- `✅ Commit successful` - Save completed
- `[Storage Sync] FSM reinitialized...` - Cross-tab sync

## API Endpoints

Running on http://localhost:3001:
- `GET /api/load-todos` - Load todos from `data/todos.json`
- `POST /api/save-todos` - Save todos to `data/todos.json`

## Troubleshooting

### Changes not persisting
- Check that you clicked "💾 Commit" (not Cancel)
- Look for errors in browser console
- Verify `data/todos.json` was updated

### Cross-tab sync not working
- Ensure both tabs are on same origin (localhost:5173)
- Check browser console for storage event logs
- Try different browser (some restrict localhost storage events)

### Build errors
- Run `npm install` to ensure all deps installed
- Check Node version (requires 18.17.0+)
- Delete `node_modules` and `npm install` again

## Next Steps

1. **Read the Code**: Start with `src/machines/todoFSM.ts` (simple!)
2. **Modify UI**: Edit `src/components/TodoApp.tsx`
3. **Add Features**: Try implementing undo/redo
4. **Study Pattern**: Review `PATTERN.md` for deep dive

## Learn More

- Comprehensive docs: See `README.md`
- Pattern details: See `PATTERN.md`
- API reference: See `src/store/todoStore.ts` comments
