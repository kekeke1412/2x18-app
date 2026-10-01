import { useApp } from '../context/AppContext';
import { useFirebaseQuery } from './useFirebaseQuery';
import { toArray } from '../services/dataStore.js';

// Reuse the provider's authenticated realtime subscriptions; no parallel get/onValue.
function useDomain(key: string) {
  const app = useApp();
  return { data: app[key], isLoading: app.isLoading, error: app.dataErrors[key] || null };
}
export const useMembers = () => useDomain('members');
export const useTasks = () => useDomain('tasks');
export const useRoadmap = () => useDomain('roadmap');
export const useSmeMap = () => useDomain('smeMap');
export const useCalEvents = () => useDomain('calEvents');
export const useVotes = () => useDomain('votes');
export const useNotifications = () => useDomain('notifications');
export const useAttendance = () => useDomain('attendance');
export const useContributions = () => useDomain('contributions');
export const useDocs = () => useDomain('docs');
export const useAuditLogs = () => useDomain('auditLogs');
export const useSubjectTasks = () => useDomain('subjectTasks');
export const useSubjectComments = () => useDomain('subjectComments');
export const useSemesterLabels = () => useDomain('semesterLabels');
export const useVocab = () => useDomain('vocab');
export const useUserVocab = () => useDomain('userVocab');
export const useQuizHistory = () => useDomain('quizHistory');
export const useReports = () => useDomain('reports');
export const useTrash = () => useDomain('trash');
export const useAllGrades = () => useDomain('grades');
export const useGamifTitles = () => useFirebaseQuery<any[]>(['gamif_titles'], 'gamif_titles', toArray);
export const useGamifAwards = () => useFirebaseQuery<any>(['gamif_awards'], 'gamif_awards', v => Object.fromEntries(Object.entries(v || {}).map(([id, items]) => [id, toArray(items)])));
export const useGamifSeasons = () => useFirebaseQuery<any[]>(['gamif_seasons'], 'gamif_seasons', v => toArray(v).sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt))));
