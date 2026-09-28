/** Minimal async key-value store. Progress is small, so one JSON value per key is enough. */
export interface KeyValueStore {
  readonly kind: 'indexeddb' | 'localstorage' | 'memory';
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export function createMemoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    kind: 'memory',
    get: async (key) => data.get(key) ?? null,
    set: async (key, value) => void data.set(key, value),
  };
}

export function createLocalStorageStore(storage: Storage, prefix = 'logos:'): KeyValueStore {
  return {
    kind: 'localstorage',
    get: async (key) => storage.getItem(prefix + key),
    set: async (key, value) => storage.setItem(prefix + key, value),
  };
}

const DB_NAME = 'logos';
const STORE_NAME = 'kv';

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function createIndexedDbStore(factory: IDBFactory): Promise<KeyValueStore> {
  const open = factory.open(DB_NAME, 1);
  open.onupgradeneeded = () => open.result.createObjectStore(STORE_NAME);
  const db = await request(open);
  const tx = (mode: IDBTransactionMode) => db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  return {
    kind: 'indexeddb',
    get: async (key) => {
      const value: unknown = await request(tx('readonly').get(key));
      return typeof value === 'string' ? value : null;
    },
    set: async (key, value) => void (await request(tx('readwrite').put(value, key))),
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/**
 * IndexedDB first, then localStorage, then memory (e.g. private mode or sandboxed frames).
 * Opening IndexedDB can hang in some sandboxes, so it has a time limit.
 */
export async function openBestStore(timeoutMs = 1500): Promise<KeyValueStore> {
  try {
    if (typeof indexedDB !== 'undefined') return await withTimeout(createIndexedDbStore(indexedDB), timeoutMs);
  } catch {
    // fall through
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('logos:probe', '1');
      localStorage.removeItem('logos:probe');
      return createLocalStorageStore(localStorage);
    }
  } catch {
    // fall through
  }
  return createMemoryStore();
}
