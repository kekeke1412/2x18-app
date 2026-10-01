import { useEffect, useRef, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { useApp } from '../context/AppContext';

export function useFirebaseQuery<T>(_queryKey: string[], dbPath: string, transform: (value: any) => T = v => v) {
  const { currentUser } = useApp();
  const transformRef = useRef(transform);
  transformRef.current = transform;
  const [state, setState] = useState<{ data?: T; isLoading: boolean; error: Error | null }>({ isLoading: true, error: null });
  useEffect(() => {
    setState({ isLoading: Boolean(currentUser), error: null });
    if (!currentUser) return;
    return onValue(ref(db, dbPath), snapshot => {
      setState({ data: transformRef.current(snapshot.val()), isLoading: false, error: null });
    }, error => setState({ isLoading: false, error }));
  }, [dbPath, currentUser?.uid]);
  return state;
}
