import { useFirebaseQuery } from './useFirebaseQuery';
import { toArr } from '../context/AppContext';

export const useMembers = () => useFirebaseQuery<any[]>(['members'], '2x18_members', toArr);
export const useTasks = () => useFirebaseQuery<any[]>(['tasks'], '2x18_tasks', toArr);
export const useRoadmap = () => useFirebaseQuery<any[]>(['roadmap'], '2x18_roadmap', (v) => 
  toArr(v).map((y: any) => ({ ...y, events: toArr(y.events) }))
);
export const useSmeMap = () => useFirebaseQuery<any>(['smeMap'], '2x18_sme', v => v || {});
export const useCalEvents = () => useFirebaseQuery<any[]>(['events'], '2x18_events', toArr);
export const useVotes = () => useFirebaseQuery<any[]>(['votes'], '2x18_votes', v => 
  toArr(v).map((vt: any) => ({ ...vt, options: toArr(vt.options).map((o: any) => ({ ...o, votes: toArr(o.votes) })) }))
);
export const useNotifications = () => useFirebaseQuery<any[]>(['notifications'], '2x18_notifs', toArr);
export const useAttendance = () => useFirebaseQuery<any[]>(['attendance'], '2x18_attendance', v => 
  toArr(v).map((sess: any) => ({ ...sess, present: Array.isArray(sess.present) ? sess.present.filter(Boolean) : toArr(sess.present), total: sess.total || 0 }))
);
export const useContributions = () => useFirebaseQuery<any>(['contributions'], '2x18_contributions', v => v || {});
export const useDocs = () => useFirebaseQuery<any>(['docs'], '2x18_docs', v => {
  if (!v) return {};
  const obj: any = {};
  Object.keys(v).forEach(sid => { obj[sid] = toArr(v[sid]); });
  return obj;
});
export const useAuditLogs = () => useFirebaseQuery<any[]>(['auditLogs'], '2x18_audit', toArr);
export const useSubjectTasks = () => useFirebaseQuery<any>(['subjectTasks'], '2x18_subject_tasks', v => {
  if (!v) return {};
  const obj: any = {};
  Object.keys(v).forEach(sid => { obj[sid] = toArr(v[sid]); });
  return obj;
});
export const useSubjectComments = () => useFirebaseQuery<any>(['subjectComments'], '2x18_subject_comments', v => {
  if (!v) return {};
  const obj: any = {};
  Object.keys(v).forEach(sid => { obj[sid] = toArr(v[sid]); });
  return obj;
});
export const useSemesterLabels = () => useFirebaseQuery<any>(['semesterLabels'], '2x18_semester_labels', v => v || {});
export const useVocab = () => useFirebaseQuery<any>(['vocab'], '2x18_vocab', v => v || {});
export const useUserVocab = () => useFirebaseQuery<any>(['userVocab'], '2x18_user_vocab', v => v || {});
export const useQuizHistory = () => useFirebaseQuery<any>(['quizHistory'], '2x18_quiz_history', v => {
  if (!v) return {};
  const obj: any = {};
  Object.keys(v).forEach(uid => { obj[uid] = toArr(v[uid]); });
  return obj;
});
export const useReports = () => useFirebaseQuery<any[]>(['reports'], '2x18_reports', toArr);
export const useGamifTitles = () => useFirebaseQuery<any>(['gamif_titles'], 'gamif_titles', toArr);
export const useGamifAwards = () => useFirebaseQuery<any>(['gamif_awards'], 'gamif_awards', v => {
  if (!v) return {};
  const norm: any = {};
  Object.entries(v).forEach(([id, val]) => { norm[id] = toArr(val); });
  return norm;
});
export const useGamifSeasons = () => useFirebaseQuery<any[]>(['gamif_seasons'], 'gamif_seasons', v => 
  toArr(v).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
);
export const useTrash = () => useFirebaseQuery<any[]>(['trash'], '2x18_trash', toArr);

// Mảng Grades của TẤT CẢ các member
export const useAllGrades = (memberIds: string[]) => {
  // To avoid complexity right now, we can create a generic hook that merges all `userId_grades`.
  // Wait, React Query useQueries is needed to fetch multiple dynamic keys.
  // Actually, we can just let AppContext handle Grades for now or we rewrite grades storage.
  // Since we are migrating incrementally, we will use AppContext for grades, or we can use useQuery directly in the component.
};
