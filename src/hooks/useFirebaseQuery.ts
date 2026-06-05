import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ref, onValue, get } from 'firebase/database';
import { db } from '../firebase';
import { toArr } from '../context/AppContext';

/**
 * Hook kết hợp get() của React Query (cho phép cache, stale time)
 * và onValue() của Firebase để realtime update vào cache.
 * 
 * @param queryKey - Mảng key định danh cho React Query
 * @param dbPath - Đường dẫn đến node trên Firebase Realtime DB
 * @param transform - Hàm xử lý dữ liệu (VD: toArr)
 */
export function useFirebaseQuery<T>(
  queryKey: string[], 
  dbPath: string, 
  transform: (val: any) => T = (v) => v
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const dbRef = ref(db, dbPath);
    
    // Lắng nghe realtime từ Firebase
    const unsubscribe = onValue(dbRef, (snap) => {
      const data = transform(snap.val());
      // Cập nhật thẳng vào cache của React Query
      queryClient.setQueryData(queryKey, data);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbPath, queryClient, JSON.stringify(queryKey)]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      // Fetch dữ liệu lần đầu nếu chưa có trong cache
      const snap = await get(ref(db, dbPath));
      return transform(snap.val());
    },
    // Giữ cache mãi mãi vì Firebase Realtime đã đảm nhận việc update
    staleTime: Infinity,
  });
}
