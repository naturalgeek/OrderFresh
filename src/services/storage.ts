import type { AppConfig } from '../types/index.ts';

const DB_NAME = 'orderfresh';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      if (!database.objectStoreNames.contains('config')) {
        database.createObjectStore('config', { keyPath: 'key' });
      }
    };
  });
}

export async function saveConfig(config: AppConfig): Promise<void> {
  const database = await initDB();
  const transaction = database.transaction('config', 'readwrite');
  const store = transaction.objectStore('config');
  store.put({ key: 'appConfig', ...config });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getConfig(): Promise<AppConfig> {
  const database = await initDB();
  const transaction = database.transaction('config', 'readonly');
  const store = transaction.objectStore('config');
  const request = store.get('appConfig');

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const result = request.result;
      resolve({
        rkEmail: result?.rkEmail || '',
        rkPassword: result?.rkPassword || '',
        rkProxyUrl: result?.rkProxyUrl || '',
        knusprEmail: result?.knusprEmail || '',
        knusprPassword: result?.knusprPassword || '',
        knusprPrompt: result?.knusprPrompt || '',
        openaiApiKey: result?.openaiApiKey || '',
      });
    };
    request.onerror = () => reject(request.error);
  });
}
