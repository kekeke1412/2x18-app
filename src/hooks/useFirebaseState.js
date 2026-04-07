// src/hooks/useFirebaseState.js
import { useState, useEffect } from 'react';
import { db, ref, onValue, set } from '../firebase';

/**
 * Giống useState nhưng đồng bộ với Firebase Realtime Database.
 * @param {string} path  - Đường dẫn trong DB, VD: 'attendance', 'votes'
 * @param {*} initial    - Giá trị mặc định nếu DB chưa có
 */
export function useFirebaseState(path, initial) {
  const [state, setState] = useState(initial);
  const [loading, setLoading] = useState(true);

  // Subscribe realtime
  useEffect(() => {
    const dbRef = ref(db, path);
    const unsub = onValue(dbRef, (snapshot) => {
      const val = snapshot.val();
      setState(val !== null && val !== undefined ? val : initial);
      setLoading(false);
    });
    return () => unsub(); // cleanup
  }, [path]); // eslint-disable-line

  // Write to Firebase
  const setFirebase = (newVal) => {
    set(ref(db, path), newVal);
    // setState ngay để UI không lag (optimistic update)
    setState(newVal);
  };

  return [state, setFirebase, loading];
}