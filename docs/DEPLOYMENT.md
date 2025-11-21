# GitHub Pages Deployment Setup

## Overview

This project is now configured for static site generation (SSG) deployment to GitHub Pages.

## How It Works

### Development Mode (localhost)

- Run: `npm run dev`
- Initial todos loaded from Vite JSON import of `public/todos.json`
- Changes are saved to:
  - **localStorage** (for persistence across sessions)
  - **Server file** (`public/todos.json` via API)

### Production/SSG Mode (GitHub Pages)

- Initial todos loaded from Vite JSON import (bundled at build time)
- **Editing is fully enabled** - users can add, edit, delete todos
- Changes are saved to **localStorage only** (browser storage)
- The server file (`public/todos.json`) is read-only (cannot be updated)
- Each user's edits are private to their browser

## File Structure

```
public/
  └── todos.json          # Initial todos (served as static file in SSG)
src/
  ├── data/
  │   └── initialTodos.ts # Fallback data if todos.json fails to load
  ├── routes/
  │   └── api/
  │       ├── load-todos/ # Dev-only: Reads from public/todos.json
  │       └── save-todos/ # Dev-only: Writes to public/todos.json
  └── store/
      └── todoStore.ts    # Smart loading: static file + localStorage
```

## Deployment Commands

### Build for GitHub Pages

```bash
npm run build.static
```

### Preview Production Build Locally

```bash
npm run preview.static
```

### Deploy to GitHub Pages

The deployment is automated via GitHub Actions (`.github/workflows/deploy.yml`).
Simply push to the `main` branch and GitHub Actions will:

1. Build the static site
2. Deploy to GitHub Pages

## URLs

- **Development**: http://localhost:5173
- **Production**: https://loganpowell.github.io/qwik-fsm-atom-todos

## Key Configuration Files

1. **`adapters/static/vite.config.ts`**
   - Sets base path: `/qwik-fsm-atom-todos/`
   - Sets origin: `https://loganpowell.github.io/qwik-fsm-atom-todos`

2. **`package.json`**
   - `build.static`: Builds static site
   - `preview.static`: Previews built site locally

3. **`.github/workflows/deploy.yml`**
   - Automated CI/CD for GitHub Pages
   - Triggers on push to main branch

4. **`public/todos.json`**
   - Initial todos data
   - Served as static file in production
   - Editable via API in development

## GitHub Pages Setup

To enable GitHub Pages for your repository:

1. Go to repository Settings → Pages
2. Source: "GitHub Actions"
3. The workflow will automatically deploy on push to main

## Notes

- The old `data/` folder is now ignored by git
- `public/todos.json` is the source of truth for initial todos
- localStorage provides persistence in both dev and production
- API endpoints only work in development mode
