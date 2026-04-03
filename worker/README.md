# RecipeKeeper CORS Proxy Worker

Cloudflare Worker that proxies RecipeKeeper API requests with CORS headers.

## Deploy

```bash
cd worker
npx wrangler login    # One-time: authenticate with Cloudflare
npx wrangler deploy   # Deploy the worker
```

After deploying, copy the worker URL (e.g., `https://orderfresh-rk-proxy.your-subdomain.workers.dev`) and paste it into OrderFresh Settings > CORS Proxy URL.

## Why

RecipeKeeper's API (`recipekeeper.azurewebsites.net`) doesn't include CORS headers, so browsers block direct requests from web apps. This worker forwards requests and adds the necessary headers.

Cloudflare Workers free tier allows 100,000 requests/day.
