# Documentation Index

Welcome to the FSM + Atom pattern demonstration!

## 📚 Documentation Files

### Getting Started

- **[QUICKSTART.md](./QUICKSTART.md)** - Step-by-step guide to run the demo
  - Installation
  - Running the app
  - Testing workflows
  - Troubleshooting

### Main Documentation

- **[README.md](../README.md)** - Complete project overview
  - Architecture explanation
  - Project structure
  - Features and workflows
  - Bundle size comparison
  - Development commands

### Pattern Deep Dive

- **[PATTERN.md](../PATTERN.md)** - Technical pattern documentation
  - Core concepts
  - Implementation details
  - Critical patterns
  - Migration guide (from XState/Zustand)
  - Future enhancements

## 🗂️ Code Organization

### Core State Management

```
src/
├── machines/
│   └── todoFSM.ts          # 2-state FSM (viewing ⟷ editing)
├── store/
│   └── todoStore.ts        # Atom + persistence + API
└── types/
    └── javascript-state-machine.d.ts
```

### UI Layer

```
src/
├── components/
│   └── TodoApp.tsx         # Main UI component
├── routes/
│   └── index.tsx           # Root route
└── root.tsx                # App shell
```

### API Layer

```
src/routes/api/
├── load-todos/index.ts     # GET /api/load-todos
└── save-todos/index.ts     # POST /api/save-todos
server.ts                   # Express server (dev mode)
```

### Data

```
data/
└── todos.json             # Server-side persistence file
```

## 🎯 Recommended Reading Order

### For Quick Demo

1. **QUICKSTART.md** - Get it running in 2 minutes
2. **README.md** - Understand what you're looking at
3. Explore the UI and try workflows

### For Learning the Pattern

1. **README.md** - Architecture overview
2. **src/machines/todoFSM.ts** - Simple 50-line FSM
3. **src/store/todoStore.ts** - Atom + persistence
4. **PATTERN.md** - Deep dive into patterns
5. **src/components/TodoApp.tsx** - See it all in action

### For Migration Planning

1. **README.md** - Bundle size comparison
2. **PATTERN.md** - Migration guide section
3. **src/store/todoStore.ts** - Reference implementation
4. Compare with your current XState/Zustand code

## 💡 Key Takeaways

### Simple FSM

- Just 2 states (viewing, editing)
- Lifecycle hooks for snapshots
- No complex hierarchies

### Reactive Atom

- Built-in path operations
- Watch-based persistence
- Cross-tab sync ready

### Full State Pattern

- Load entire dataset
- Apply edits directly
- Calculate changes via diff

## 🔗 External Resources

- [javascript-state-machine](https://github.com/jakesgordon/javascript-state-machine) - FSM library
- [@thi.ng/atom](https://github.com/thi-ng/umbrella/tree/develop/packages/atom) - Reactive atom library
- [Qwik](https://qwik.builder.io/) - Framework used for demo

## 📊 Bundle Size

| Before (XState + Zustand) | After (FSM + Atom) | Savings     |
| ------------------------- | ------------------ | ----------- |
| 18KB                      | 4KB                | -14KB (78%) |

## 🚀 Next Steps

1. **Run the demo**: `npm install && npm run dev`
2. **Read the code**: Start with `todoFSM.ts` and `todoStore.ts`
3. **Try modifications**: Add undo/redo or filtering
4. **Adapt to your project**: Use pattern in production app

---

Questions? Check the troubleshooting section in QUICKSTART.md or review the inline comments in the source code.
