// Robust client-side storage utility using IndexedDB with LocalStorage fallback

const DB_NAME = 'QU_Newspaper_DB';
const DB_VERSION = 1;
const STORE_NAME = 'qu_data_store';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  // Always keep auth user keys synchronously mirrored in sessionStorage and localStorage
  // so getAuthHeaders() is never out of sync with IndexedDB
  if (typeof window !== 'undefined' && (key === 'qu_auth_user' || key === 'qu_current_user')) {
    try {
      if (value === null || value === undefined) {
        window.sessionStorage?.removeItem(key);
        window.localStorage?.removeItem(key);
      } else {
        const serialized = JSON.stringify(value);
        window.sessionStorage?.setItem(key, serialized);
        window.localStorage?.setItem(key, serialized);
      }
    } catch {}
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = value === null || value === undefined ? store.delete(key) : store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    // Fallback to localStorage if IndexedDB fails
    try {
      if (value === null || value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (e) {
      console.warn('Storage quota reached or fallback failed', e);
    }
  }
}

export async function getItem<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result !== undefined && request.result !== null) {
          resolve(request.result as T);
        } else {
          // Check localStorage fallback
          const local = localStorage.getItem(key);
          if (local) {
            try {
              resolve(JSON.parse(local));
              return;
            } catch {
              // ignore
            }
          }
          resolve(defaultValue);
        }
      };
      request.onerror = () => resolve(defaultValue);
    });
  } catch {
    const local = localStorage.getItem(key);
    if (local) {
      try {
        return JSON.parse(local);
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  }
}

// Fail-safe permanent store keys for approved journalists and published news
const PERM_JOURNALISTS_KEY = 'qu_permanent_approved_journalists_v2';
const PERM_ARTICLES_KEY = 'qu_permanent_published_articles_v3';

export async function savePermanentApprovedJournalists<T>(journalists: T[]): Promise<void> {
  try {
    await setItem(PERM_JOURNALISTS_KEY, journalists);
    try {
      localStorage.setItem(PERM_JOURNALISTS_KEY, JSON.stringify(journalists));
    } catch {}
  } catch (e) {
    console.warn('Could not save permanent approved journalists cache', e);
  }
}

export async function getPermanentApprovedJournalists<T>(fallback: T[]): Promise<T[]> {
  try {
    const fromIdb = await getItem<T[]>(PERM_JOURNALISTS_KEY, []);
    if (Array.isArray(fromIdb) && fromIdb.length > 0) return fromIdb;
    const local = localStorage.getItem(PERM_JOURNALISTS_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Could not load permanent approved journalists cache', e);
  }
  return fallback;
}

export async function savePermanentPublishedArticles<T>(articles: T[]): Promise<void> {
  try {
    const cleanArticles = (articles || []).filter(
      (a: any) => !a?.id?.startsWith('art-demo-') && !a?.id?.startsWith('art-qu-10') && a?.authorId !== 'jour-demo-1'
    );
    await setItem(PERM_ARTICLES_KEY, cleanArticles);
    try {
      localStorage.setItem(PERM_ARTICLES_KEY, JSON.stringify(cleanArticles));
    } catch {}
  } catch (e) {
    console.warn('Could not save permanent published articles cache', e);
  }
}

export async function getPermanentPublishedArticles<T>(fallback: T[]): Promise<T[]> {
  const isExcluded = (a: any) =>
    !a ||
    !a.id ||
    a.id.startsWith('art-demo-') ||
    a.id.startsWith('art-qu-10') ||
    a.id.startsWith('art-e2e-') ||
    a.id === 'vid-a518ia2' ||
    a.id.includes('a518ia2') ||
    a.id.includes('1791219023276') ||
    a.title?.includes('1791219023276') ||
    a.title?.includes('تقرير مرئي اختباري') ||
    a.title?.includes('تجربه لمسار') ||
    a.title?.includes('تجربة لمسار') ||
    a.title?.includes('المسار الجديد') ||
    a.authorId === 'jour-demo-1';

  try {
    const fromIdb = await getItem<T[]>(PERM_ARTICLES_KEY, []);
    if (Array.isArray(fromIdb)) {
      const clean = fromIdb.filter((a: any) => !isExcluded(a));
      if (clean.length > 0) return clean as unknown as T[];
    }
    const local = localStorage.getItem(PERM_ARTICLES_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) {
        const clean = parsed.filter((a: any) => !isExcluded(a));
        if (clean.length > 0) return clean as unknown as T[];
      }
    }
  } catch (e) {
    console.warn('Could not load permanent published articles cache', e);
  }
  return fallback;
}

/**
 * Converts a file selected from the user's device into a base64 Data URL with validation
 */
export function fileToDataUrl(file: File, maxSizeMB = 10): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('الملف غير موجود'));
    }
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return reject(new Error(`حجم الملف يتجاوز الحد المسموح (${maxSizeMB} ميجابايت)`));
    }
    // Accept valid image and video MIME types
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'video/mp4', 'video/webm'];
    if (file.type && !validMimes.includes(file.type) && !file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      return reject(new Error('نوع الملف غير مدعوم، يرجى اختيار صورة أو فيديو صالح'));
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to data URL'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
