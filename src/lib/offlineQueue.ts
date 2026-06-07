import { openDB } from 'idb';

const DB_NAME = 'checklog-offline-db';
const STORE_NAME = 'offline-requests';
const SUBMISSIONS_STORE = 'offline-submissions';

const initDB = async () => {
  return openDB(DB_NAME, 2, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(SUBMISSIONS_STORE)) {
        db.createObjectStore(SUBMISSIONS_STORE, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
};

export const queueRequest = async (action: string, payload: any) => {
  const db = await initDB();
  await db.add(STORE_NAME, {
    action,
    payload,
    timestamp: Date.now(),
  });
};

export const queueSubmission = async (submissionData: any) => {
  const db = await initDB();
  await db.add(SUBMISSIONS_STORE, {
    data: submissionData,
    timestamp: Date.now()
  });
};

export const getQueuedSubmissions = async () => {
  const db = await initDB();
  return db.getAll(SUBMISSIONS_STORE);
};

export const removeSubmission = async (id: number) => {
  const db = await initDB();
  await db.delete(SUBMISSIONS_STORE, id);
};

export const getQueuedRequests = async () => {
  const db = await initDB();
  return db.getAll(STORE_NAME);
};

export const removeRequest = async (id: number) => {
  const db = await initDB();
  await db.delete(STORE_NAME, id);
};

export const cacheData = async (key: string, data: any) => {
  const db = await initDB();
  await db.put('cache', { key, data, timestamp: Date.now() });
};

export const getCachedData = async (key: string) => {
  const db = await initDB();
  const res = await db.get('cache', key);
  return res ? res.data : null;
};
