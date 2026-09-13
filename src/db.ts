import Dexie, { type EntityTable } from 'dexie';

export type TargetType = 'self' | 'peer' | 'teacher' | 'common';
export type AuthorType = 'self' | 'peer' | 'teacher';

export interface Student {
  id?: number;
  name: string;
  attendanceNumber: number;
  className: string;
}

export interface RubricItem {
  id?: number;
  name: string;
  targetType: TargetType;
  scaleMax: number; // 1〜4固定運用だが将来の拡張に備えフィールド化
  description?: string;
}

export interface Match {
  id?: number;
  date: string; // YYYY-MM-DD
  title: string;
  opponent?: string;
  memo?: string;
}

// 自己/ピア/教師の3種類の評価をすべてここに格納する
export interface EvalRecord {
  id?: number;
  targetStudentId: number;
  authorType: AuthorType;
  authorStudentId?: number; // peerの場合のみ設定
  rubricItemId: number;
  score: number;
  comment?: string;
  timestamp: number;
  matchId: number;
}

// 試合ごとの「総合ふりかえりスコア」(0〜100)。観点別評価(EvalRecord)とは別に、
// 生徒本人がその試合全体をどう感じたかを1つの数値で記録する。
export interface OverallScore {
  id?: number;
  matchId: number;
  studentId: number;
  score: number; // 0〜100
  timestamp: number;
}

class ArkheronDB extends Dexie {
  students!: EntityTable<Student, 'id'>;
  rubricItems!: EntityTable<RubricItem, 'id'>;
  matches!: EntityTable<Match, 'id'>;
  records!: EntityTable<EvalRecord, 'id'>;
  overallScores!: EntityTable<OverallScore, 'id'>;

  constructor() {
    super('arkheron-db');
    this.version(1).stores({
      students: '++id, name, className, attendanceNumber',
      rubricItems: '++id, name, targetType',
      matches: '++id, date, title',
      records:
        '++id, targetStudentId, authorType, authorStudentId, rubricItemId, matchId, timestamp',
    });
    this.version(2).stores({
      overallScores: '++id, matchId, studentId, timestamp',
    });
  }
}

export const db = new ArkheronDB();

/** 総合ふりかえりスコアを保存する。同じ試合・生徒の記録が既にあれば上書きする。 */
export async function upsertOverallScore(matchId: number, studentId: number, score: number) {
  const existing = await db.overallScores.where({ matchId, studentId }).first();
  if (existing?.id) {
    await db.overallScores.update(existing.id, { score, timestamp: Date.now() });
  } else {
    await db.overallScores.add({ matchId, studentId, score, timestamp: Date.now() });
  }
}

/** 今日の日付をYYYY-MM-DD形式で返す（試合作成フォームの初期値に使用）。 */
export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export const DEFAULT_RUBRIC_ITEMS: Omit<RubricItem, 'id'>[] = [
  {
    name: '主体性',
    targetType: 'common',
    scaleMax: 4,
    description: '自分から考えて行動できたか',
  },
  {
    name: '協働',
    targetType: 'common',
    scaleMax: 4,
    description: 'チームのために協力できたか',
  },
  {
    name: '思考力',
    targetType: 'common',
    scaleMax: 4,
    description: '状況を考えて判断できたか',
  },
  {
    name: '声かけ/コミュニケーション',
    targetType: 'peer',
    scaleMax: 4,
    description: '仲間への声かけ・伝え合いができたか',
  },
  {
    name: '状況判断',
    targetType: 'common',
    scaleMax: 4,
    description: '試合の流れを読んで動けたか',
  },
  {
    name: '役割遂行',
    targetType: 'teacher',
    scaleMax: 4,
    description: '自分の役割を最後まで果たせたか',
  },
];
