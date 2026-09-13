import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

/** 一時的な「保存しました」トースト表示を扱う共通フック。 */
export function useToast(duration = 1500) {
  const [toast, setToast] = useState<string | null>(null);
  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), duration);
  }
  return { toast, showToast };
}

export function useStudents() {
  return useLiveQuery(() => db.students.orderBy('attendanceNumber').toArray(), []);
}

export function useRubricItems() {
  return useLiveQuery(() => db.rubricItems.toArray(), []);
}

export function useMatches() {
  return useLiveQuery(() => db.matches.orderBy('date').reverse().toArray(), []);
}

export interface RecentRecordView {
  id?: number;
  targetStudentId: number;
  authorType: 'self' | 'peer' | 'teacher';
  authorStudentId?: number;
  rubricItemId: number;
  score: number;
  comment?: string;
  timestamp: number;
  matchId: number;
  studentName: string;
  authorName?: string;
  itemName: string;
  matchTitle: string;
}

export function useRecentRecords(limit = 15, matchId?: number): RecentRecordView[] | undefined {
  return useLiveQuery(async () => {
    const all = matchId
      ? await db.records.where('matchId').equals(matchId).toArray()
      : await db.records.toArray();
    all.sort((a, b) => b.timestamp - a.timestamp);
    const sliced = all.slice(0, limit);

    const [students, rubricItems, matches] = await Promise.all([
      db.students.toArray(),
      db.rubricItems.toArray(),
      db.matches.toArray(),
    ]);
    const studentMap = new Map(students.map((s) => [s.id, s]));
    const itemMap = new Map(rubricItems.map((r) => [r.id, r]));
    const matchMap = new Map(matches.map((m) => [m.id, m]));

    return sliced.map((r) => ({
      ...r,
      studentName: studentMap.get(r.targetStudentId)?.name ?? '不明',
      authorName:
        r.authorType === 'peer'
          ? studentMap.get(r.authorStudentId ?? -1)?.name ?? '不明'
          : undefined,
      itemName: itemMap.get(r.rubricItemId)?.name ?? '不明',
      matchTitle: matchMap.get(r.matchId)?.title ?? '不明',
    }));
  }, [limit, matchId]);
}
