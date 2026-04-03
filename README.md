# OrderFresh

Order groceries from your shopping lists. Connects [RecipeKeeper](https://www.recipekeeperonline.com/) shopping lists with [Knuspr](https://www.knuspr.de/) grocery delivery, plus AI-powered quick lists from recipe URLs or photos.

**Live:** https://naturalgeek.github.io/OrderFresh/

## Features

### Shopping List (RecipeKeeper)
- Fetch your shopping lists from RecipeKeeper
- Browse and check off items
- Search each item on Knuspr and add to your cart with one tap
- Items are automatically ticked when added to cart (synced back to RecipeKeeper)

### Quick List
- **Recipe URL** — Paste a recipe URL, AI extracts the ingredients as a shopping list
- **Photo** — Upload a photo of a recipe, handwritten list, or food — AI identifies the items
- **Manual** — Type items directly
- Order any item via Knuspr (ticked on success)
- Session-only — list is not persisted

### Mobile App
- Install as a home screen app on iOS and Android
- Desktop toast notifies users about mobile availability

## Setup

### Prerequisites
- [Node.js](https://nodejs.org/) 20+

### Development

```bash
npm install
npm run dev
```

Open http://localhost:5173/OrderFresh/ and configure credentials in the Settings tab.

### Production Build

```bash
npm run build
npm run preview
```

## Configuration (Settings Tab)

| Service | What you need | Used for |
|---------|--------------|----------|
| **RecipeKeeper** | Email + password | Fetching and syncing shopping lists |
| **Knuspr** | Email + password | Searching products and adding to cart |
| **OpenAI** | API key | Extracting items from URLs and images (Quick List only) |

All credentials are stored locally in your browser (IndexedDB). They are only sent to their respective services.

## Deployment

Deployed automatically to GitHub Pages on push to `main`.

### GitHub Repository Settings Required

1. **Settings > Pages** — Set source to **GitHub Actions**
2. **Settings > Actions > General** — Set workflow permissions to **Read and write permissions**
