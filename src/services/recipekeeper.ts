import type { ShoppingData, ShoppingListItem } from '../types/index.ts';

const RK_ORIGIN = 'https://recipekeeper.azurewebsites.net';

const EPOCH = '1601-01-01T00:00:00Z';

const RK_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'X-RK-APIVersion': '10',
  'X-RK-AppOS': 'macOS',
  'X-RK-AppOSVersion': '15.0',
  'X-RK-DeviceId': 'orderfresh-web',
  'X-RK-AppVersion': '3.45.0',
};

function rkBase(proxyUrl: string): string {
  if (import.meta.env.DEV) return '/rk-api';
  if (proxyUrl) return proxyUrl.replace(/\/$/, '');
  return RK_ORIGIN;
}

export async function signIn(email: string, password: string, proxyUrl: string): Promise<string> {
  const base = rkBase(proxyUrl);
  const res = await fetch(`${base}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username: email,
      password,
      grant_type: 'password',
    }),
  });

  if (!res.ok) {
    throw new Error(`RecipeKeeper login failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.access_token;
}

interface SyncResponse {
  ShoppingListSyncEntityResponse?: {
    UpdatedServerItems: Array<Record<string, unknown>>;
    HasMoreUpdatedServerItems: boolean;
    MaxLastModified: string;
  };
  ShoppingListItemSyncEntityResponse?: {
    UpdatedServerItems: Array<Record<string, unknown>>;
    HasMoreUpdatedServerItems: boolean;
    MaxLastModified: string;
  };
  ShoppingListCategorySyncEntityResponse?: {
    UpdatedServerItems: Array<Record<string, unknown>>;
    HasMoreUpdatedServerItems: boolean;
    MaxLastModified: string;
  };
  ShoppingListCategoryItemSyncEntityResponse?: {
    UpdatedServerItems: Array<Record<string, unknown>>;
    HasMoreUpdatedServerItems: boolean;
    MaxLastModified: string;
  };
}

async function syncPull(token: string, payload: Record<string, unknown>, proxyUrl: string): Promise<SyncResponse> {
  const base = rkBase(proxyUrl);
  const res = await fetch(`${base}/api/sync`, {
    method: 'POST',
    headers: {
      ...RK_HEADERS,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    throw new Error('AUTH_EXPIRED');
  }

  if (!res.ok) {
    throw new Error(`Sync failed: ${res.status} ${res.statusText}`);
  }

  return await res.json();
}

function maxLastModified(items: Array<Record<string, unknown>>): string {
  let max = EPOCH;
  for (const item of items) {
    const lm = item.LastModified as string;
    if (lm && lm > max) max = lm;
  }
  return max;
}

export async function pullShoppingData(token: string, proxyUrl: string): Promise<ShoppingData> {
  const allLists: Array<Record<string, unknown>> = [];
  const allItems: Array<Record<string, unknown>> = [];
  const allCategories: Array<Record<string, unknown>> = [];
  const allCategoryItems: Array<Record<string, unknown>> = [];

  const cursors = {
    list: EPOCH,
    item: EPOCH,
    category: EPOCH,
    categoryItem: EPOCH,
  };

  let hasMore = true;

  while (hasMore) {
    const payload = {
      ShoppingListSyncEntityRequest: {
        MaxLastModified: cursors.list,
        SyncEntities: [],
        LocalChangesIds: [],
      },
      ShoppingListItemSyncEntityRequest: {
        MaxLastModified: cursors.item,
        SyncEntities: [],
        LocalChangesIds: [],
      },
      ShoppingListCategorySyncEntityRequest: {
        MaxLastModified: cursors.category,
        SyncEntities: [],
        LocalChangesIds: [],
      },
      ShoppingListCategoryItemSyncEntityRequest: {
        MaxLastModified: cursors.categoryItem,
        SyncEntities: [],
        LocalChangesIds: [],
      },
    };

    const response = await syncPull(token, payload, proxyUrl);
    hasMore = false;

    const listResp = response.ShoppingListSyncEntityResponse;
    if (listResp) {
      allLists.push(...listResp.UpdatedServerItems);
      if (listResp.HasMoreUpdatedServerItems) {
        cursors.list = maxLastModified(listResp.UpdatedServerItems);
        hasMore = true;
      }
    }

    const itemResp = response.ShoppingListItemSyncEntityResponse;
    if (itemResp) {
      allItems.push(...itemResp.UpdatedServerItems);
      if (itemResp.HasMoreUpdatedServerItems) {
        cursors.item = maxLastModified(itemResp.UpdatedServerItems);
        hasMore = true;
      }
    }

    const catResp = response.ShoppingListCategorySyncEntityResponse;
    if (catResp) {
      allCategories.push(...catResp.UpdatedServerItems);
      if (catResp.HasMoreUpdatedServerItems) {
        cursors.category = maxLastModified(catResp.UpdatedServerItems);
        hasMore = true;
      }
    }

    const catItemResp = response.ShoppingListCategoryItemSyncEntityResponse;
    if (catItemResp) {
      allCategoryItems.push(...catItemResp.UpdatedServerItems);
      if (catItemResp.HasMoreUpdatedServerItems) {
        cursors.categoryItem = maxLastModified(catItemResp.UpdatedServerItems);
        hasMore = true;
      }
    }
  }

  return {
    lists: allLists.filter(l => !l.IsDeleted) as unknown as ShoppingData['lists'],
    items: allItems.filter(i => !i.IsDeleted) as unknown as ShoppingData['items'],
    categories: allCategories.filter(c => !c.IsDeleted) as unknown as ShoppingData['categories'],
    categoryItems: allCategoryItems.filter(ci => !ci.IsDeleted) as unknown as ShoppingData['categoryItems'],
  };
}

export async function pushShoppingItemCheck(
  token: string,
  item: ShoppingListItem,
  checked: boolean,
  proxyUrl: string,
): Promise<void> {
  const now = new Date().toISOString();
  const syncItem = {
    Id: item.Id,
    LastModified: item.LastModified,
    IsDeleted: false,
    Name: item.Name,
    ShoppingListId: item.ShoppingListId,
    IsChecked: checked,
    Position: item.Position,
    RecipeId: item.RecipeId,
    CheckedDate: checked ? now : null,
    IsSyncedToExternalList: item.IsSyncedToExternalList,
  };

  const payload = {
    ShoppingListItemSyncEntityRequest: {
      MaxLastModified: item.LastModified,
      SyncEntities: [syncItem],
      LocalChangesIds: [item.Id],
    },
  };

  await syncPull(token, payload, proxyUrl);
}
