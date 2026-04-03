# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server with API proxies (localhost:5173)
npm run build        # Type-check + Vite production build (also runs prebuild for icons/version)
npm run lint         # ESLint
npm run preview      # Preview production build locally
```

## Architecture

Single-page PWA (React 19 + TypeScript + Vite) with three tabs: Shopping List (RecipeKeeper), Quick List (AI-powered volatile list), Settings.

### State & Data Flow

```
Components → AppContext (single React Context, all state) → Services → External APIs
```

- **AppContext** (`src/context/AppContext.tsx`): Centralized state via `useState` + `useCallback`. Owns RecipeKeeper token, shopping data, quick list items, config. Handles auth-retry logic (catches `AUTH_EXPIRED`, re-authenticates, retries).
- **Storage** (`src/services/storage.ts`): IndexedDB stores only `AppConfig` (credentials). Shopping data is never persisted — always fresh from API or session-only.

### Service Layer

- **recipekeeper.ts**: OAuth2 password grant to `recipekeeper.azurewebsites.net/token`. Sync via `POST /api/sync` with cursor-based pagination using `MaxLastModified` timestamps. Initial cursor is `'1601-01-01T00:00:00Z'` (not Unix epoch). Pushes item check state back to server for two-way sync.
- **knuspr.ts**: MCP (Model Context Protocol) client over JSON-RPC 2.0 + SSE. Stateful session via `Mcp-Session-Id` header (global singleton). Dual parallel searches: one for product data, one for images (merged by `productId`). Image paths resolved via `cdn.knuspr.de`.
- **openai.ts**: Calls `/v1/responses` with `gpt-4.1-mini`. URL extraction uses `web_search` tool. Image extraction sends base64 data URL. Both return JSON arrays of ingredient strings with fallback line-by-line parsing.

### Key Design Patterns

- **Optimistic updates with rollback**: `toggleRkItem` updates UI immediately, reverts on API failure.
- **Auth-retry**: Both `syncRecipeKeeper` and `toggleRkItem` catch `AUTH_EXPIRED` and re-authenticate transparently.
- **Per-item cart state**: Cart search/add state is `Record<itemId, CartState>` — each item independently tracks idle/searching/results/adding/added/error.
- **Auto-tick on order**: Adding a product to Knuspr cart automatically checks the item in RecipeKeeper (ShoppingList) or toggles it (QuickList).

### Proxy Configuration

Dev mode proxies in `vite.config.ts`:
- `/knuspr-mcp` → `https://mcp.knuspr.de/mcp`
- `/rk-api` → `https://recipekeeper.azurewebsites.net`

Production calls APIs directly. Services switch via `import.meta.env.DEV`.

## TypeScript

- Strict mode with `verbatimModuleSyntax` — use `import type` for type-only imports.
- `noUnusedLocals` and `noUnusedParameters` enforced.
- RecipeKeeper types use PascalCase fields (`Id`, `IsChecked`, `IsDeleted`). QuickList types use camelCase (`id`, `checked`).

## Deployment

GitHub Pages at `/OrderFresh/` (base path in vite.config.ts, manifest.json, index.html).
- `pages.yml`: Push to main → build → deploy to GitHub Pages.
- `release.yml`: Push to main → bump version → tag → create GitHub Release with tarball.

PWA: Service worker (network-first, no cache), auto-update polls `version.json` every 30s.
