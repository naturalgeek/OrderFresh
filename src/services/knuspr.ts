// In dev, requests are proxied via Vite to avoid CORS.
// In production, call the MCP server directly (requires CORS support on the server).
const MCP_ENDPOINT = import.meta.env.DEV
  ? '/knuspr-mcp/'
  : 'https://mcp.knuspr.de/mcp';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id?: number;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

interface McpToolResult {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
}

let sessionId: string | null = null;
let initialized = false;
let requestId = 0;

function nextId() {
  return ++requestId;
}

async function mcpRequest(
  message: JsonRpcRequest,
  email: string,
  password: string,
): Promise<JsonRpcResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'rhl-email': email,
    'rhl-pass': password,
  };
  if (sessionId) {
    headers['Mcp-Session-Id'] = sessionId;
  }

  const res = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(message),
  });

  if (!res.ok) {
    throw new Error(`MCP request failed: ${res.status} ${res.statusText}`);
  }

  const newSessionId = res.headers.get('Mcp-Session-Id');
  if (newSessionId) {
    sessionId = newSessionId;
  }

  const contentType = res.headers.get('Content-Type') || '';

  if (contentType.includes('text/event-stream')) {
    return parseSSEResponse(res);
  }

  return (await res.json()) as JsonRpcResponse;
}

async function parseSSEResponse(res: Response): Promise<JsonRpcResponse> {
  const text = await res.text();
  const lines = text.split('\n');
  let lastData = '';

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      lastData = line.slice(6);
    }
  }

  if (!lastData) {
    throw new Error('No data in SSE response');
  }

  return JSON.parse(lastData) as JsonRpcResponse;
}

async function sendNotification(
  method: string,
  params: Record<string, unknown> | undefined,
  email: string,
  password: string,
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'rhl-email': email,
    'rhl-pass': password,
  };
  if (sessionId) {
    headers['Mcp-Session-Id'] = sessionId;
  }

  await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', method, params }),
  });
}

async function initialize(email: string, password: string): Promise<void> {
  const response = await mcpRequest(
    {
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'orderfresh', version: '1.0.0' },
      },
      id: nextId(),
    },
    email,
    password,
  );

  if (response.error) {
    throw new Error(`MCP init failed: ${response.error.message}`);
  }

  await sendNotification('notifications/initialized', undefined, email, password);
  initialized = true;
}

export async function listTools(
  email: string,
  password: string,
): Promise<McpTool[]> {
  await initialize(email, password);

  const allTools: McpTool[] = [];
  let cursor: string | undefined;

  do {
    const params: Record<string, unknown> = {};
    if (cursor) params.cursor = cursor;

    const response = await mcpRequest(
      { jsonrpc: '2.0', method: 'tools/list', params, id: nextId() },
      email,
      password,
    );

    if (response.error) {
      throw new Error(`tools/list failed: ${response.error.message}`);
    }

    const result = response.result as { tools: McpTool[]; nextCursor?: string };
    allTools.push(...result.tools);
    cursor = result.nextCursor;
  } while (cursor);

  return allTools;
}

export async function callTool(
  toolName: string,
  args: Record<string, unknown>,
  email: string,
  password: string,
): Promise<McpToolResult> {
  if (!sessionId && !initialized) {
    await initialize(email, password);
  }

  const response = await mcpRequest(
    {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: toolName, arguments: args },
      id: nextId(),
    },
    email,
    password,
  );

  if (response.error) {
    throw new Error(`Tool call "${toolName}" failed: ${response.error.message}`);
  }

  return response.result as McpToolResult;
}

function getToolText(result: McpToolResult): string {
  return result.content
    .filter((c) => c.type === 'text' && c.text)
    .map((c) => c.text!)
    .join('\n');
}

const KNUSPR_CDN = 'https://cdn.knuspr.de';

function resolveImageUrl(path: unknown): string | undefined {
  if (!path || typeof path !== 'string') return undefined;
  if (path.startsWith('http')) return path;
  return `${KNUSPR_CDN}${path.startsWith('/') ? '' : '/'}${path}`;
}

// --- Product search ---

export interface KnusprProduct {
  id: number;
  name: string;
  price?: string;
  unit?: string;
  image?: string;
}

export async function searchProducts(
  query: string,
  email: string,
  password: string,
  prompt?: string,
): Promise<KnusprProduct[]> {
  const searchQuery = prompt ? `${prompt}: ${query}` : query;

  const [dataResult, imgResult] = await Promise.all([
    callTool('batch_search_products', { queries: [{ keyword: searchQuery }] }, email, password),
    callTool('batch_search_products', { queries: [{ keyword: searchQuery, include_fields: ['imgPath'] }] }, email, password)
      .catch(() => null),
  ]);

  const text = getToolText(dataResult);
  console.log('[knuspr] raw search response:', text);

  try {
    const parsed = JSON.parse(text);
    const products: KnusprProduct[] = [];

    // Build image map from parallel request
    const imageMap: Record<number, string> = {};
    if (imgResult) {
      try {
        const imgText = getToolText(imgResult);
        const imgParsed = JSON.parse(imgText);
        const imgItems = Array.isArray(imgParsed) ? imgParsed : imgParsed.results || [imgParsed];
        for (const item of imgItems) {
          for (const p of item.products || []) {
            if (p.productId && p.imgPath) imageMap[p.productId] = p.imgPath;
          }
        }
      } catch { /* ignore */ }
    }

    // Recursively find all objects with a productId field
    function extractProducts(obj: unknown): void {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        for (const el of obj) extractProducts(el);
        return;
      }
      const rec = obj as Record<string, unknown>;
      const pid = rec.productId || rec.id || rec.product_id;
      if (pid && (rec.productName || rec.name || rec.title)) {
        const price = rec.price && typeof rec.price === 'object'
          ? `${(rec.price as Record<string, unknown>).full} ${(rec.price as Record<string, unknown>).currency || '\u20AC'}`
          : (rec.price != null ? String(rec.price) : undefined);
        products.push({
          id: Number(pid),
          name: String(rec.productName || rec.name || rec.title || ''),
          price,
          unit: rec.textualAmount ? String(rec.textualAmount) : (rec.unit ? String(rec.unit) : undefined),
          image: resolveImageUrl(imageMap[Number(pid)] || rec.imgPath || rec.image || rec.image_url),
        });
        return; // don't recurse into product children
      }
      // Recurse into nested arrays/objects
      for (const val of Object.values(rec)) {
        if (val && typeof val === 'object') extractProducts(val);
      }
    }

    extractProducts(parsed);

    console.log('[knuspr] parsed products:', products.length);
    return products;
  } catch (e) {
    console.error('[knuspr] parse error:', e, 'raw:', text);
    return [{ id: 0, name: text }];
  }
}

// --- Cart management ---

export async function addToCart(
  items: Array<{ productId: number; quantity: number }>,
  email: string,
  password: string,
): Promise<string> {
  const result = await callTool(
    'add_items_to_cart',
    {
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        source: 'mcp',
      })),
    },
    email,
    password,
  );

  return getToolText(result);
}

export function resetSession(): void {
  sessionId = null;
  initialized = false;
  requestId = 0;
}
