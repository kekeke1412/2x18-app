import { get, ref, update, runTransaction } from 'firebase/database';
import { db } from '../firebase';
import { createDataStore } from './dataStore.js';

export const store = createDataStore({
  read: async (path: string) => (await get(ref(db, path))).val(),
  update: (updates: Record<string, unknown>) => update(ref(db), updates),
  transaction: async (path: string, transform: (value: any) => any) =>
    (await runTransaction(ref(db, path), transform, { applyLocally: false })).committed,
  id: () => crypto.randomUUID(),
});
