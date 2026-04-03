// Cloudflare Worker: CORS proxy for RecipeKeeper API
// Deploy: npx wrangler deploy
//
// This proxies requests to recipekeeper.azurewebsites.net and adds CORS headers,
// since the RecipeKeeper API does not natively support browser CORS.

const RK_ORIGIN = 'https://recipekeeper.azurewebsites.net';
const ALLOWED_ORIGINS = [
  'https://naturalgeek.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
];

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    // Build the proxied URL
    const url = new URL(request.url);
    const targetUrl = `${RK_ORIGIN}${url.pathname}${url.search}`;

    // Forward the request
    const headers = new Headers(request.headers);
    headers.delete('Origin');
    headers.delete('Host');

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.body,
    });

    // Return response with CORS headers
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    const cors = corsHeaders(origin);
    for (const [key, value] of Object.entries(cors)) {
      newResponse.headers.set(key, value);
    }

    return newResponse;
  },
};

function corsHeaders(origin) {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-RK-APIVersion, X-RK-AppOS, X-RK-AppOSVersion, X-RK-DeviceId, X-RK-AppVersion',
    'Access-Control-Max-Age': '86400',
  };
}
