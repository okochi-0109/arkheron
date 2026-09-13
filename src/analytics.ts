import type { AuthorType, EvalRecord, Match, OverallScore, RubricItem } from './db';

export interface MatchPoint {
  matchId: number;
  title: string;
  date: string;
}

export interface OverallScorePoint {
  matchId: number;
  matchLabel: string;
  score: number;
}

export interface ItemSeriesPoint {
  matchId: number;
  matchLabel: string;
  self?: number;
  peer?: number;
  teacher?: number;
  overall: number;
}

export interface GapPoint {
  matchId: number;
  matchLabel: string;
  self: number;
  other: number;
  gap: number;
}

export interface RecordView {
  itemName: string;
  authorType: AuthorType;
  score: number;
  comment?: string;
}

export interface StudentTrendData {
  matches: MatchPoint[];
  itemSeries: Record<number, ItemSeriesPoint[]>;
  itemNames: Record<number, string>;
  latestPerItem: Record<number, number>;
  selfOtherGapSeries: GapPoint[];
  recordsByMatch: { match: MatchPoint; records: RecordView[] }[];
  overallScoreSeries: OverallScorePoint[];
}

function avg(nums: number[]): number | undefined {
  if (nums.length === 0) return undefined;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function buildStudentTrend(
  records: EvalRecord[],
  matches: Match[],
  rubricItems: RubricItem[],
  overallScores: OverallScore[] = [],
): StudentTrendData {
  const itemMap = new Map(rubricItems.map((r) => [r.id!, r]));
  const matchMap = new Map(matches.map((m) => [m.id!, m]));

  const matchIdsWithData = Array.from(
    new Set([...records.map((r) => r.matchId), ...overallScores.map((o) => o.matchId)]),
  );
  const orderedMatches = matchIdsWithData
    .map((id) => matchMap.get(id))
    .filter((m): m is Match => !!m)
    .sort((a, b) => (a.date === b.date ? a.id! - b.id! : a.date.localeCompare(b.date)));

  const matchPoints: MatchPoint[] = orderedMatches.map((m) => ({
    matchId: m.id!,
    title: m.title,
    date: m.date,
  }));

  const itemSeries: Record<number, ItemSeriesPoint[]> = {};
  const selfOtherGapSeries: GapPoint[] = [];

  for (const mp of matchPoints) {
    const matchRecords = records.filter((r) => r.matchId === mp.matchId);

    const byItem = new Map<number, EvalRecord[]>();
    for (const r of matchRecords) {
      if (!byItem.has(r.rubricItemId)) byItem.set(r.rubricItemId, []);
      byItem.get(r.rubricItemId)!.push(r);
    }
    for (const [itemId, recs] of byItem) {
      const selfScores = recs.filter((r) => r.authorType === 'self').map((r) => r.score);
      const peerScores = recs.filter((r) => r.authorType === 'peer').map((r) => r.score);
      const teacherScores = recs.filter((r) => r.authorType === 'teacher').map((r) => r.score);
      const allScores = recs.map((r) => r.score);
      const point: ItemSeriesPoint = {
        matchId: mp.matchId,
        matchLabel: mp.title,
        self: avg(selfScores),
        peer: avg(peerScores),
        teacher: avg(teacherScores),
        overall: avg(allScores) ?? 0,
      };
      if (!itemSeries[itemId]) itemSeries[itemId] = [];
      itemSeries[itemId].push(point);
    }

    const selfAll = matchRecords.filter((r) => r.authorType === 'self').map((r) => r.score);
    const otherAll = matchRecords.filter((r) => r.authorType !== 'self').map((r) => r.score);
    const selfAvg = avg(selfAll);
    const otherAvg = avg(otherAll);
    if (selfAvg !== undefined && otherAvg !== undefined) {
      selfOtherGapSeries.push({
        matchId: mp.matchId,
        matchLabel: mp.title,
        self: selfAvg,
        other: otherAvg,
        gap: Math.abs(selfAvg - otherAvg),
      });
    }
  }

  const latestPerItem: Record<number, number> = {};
  for (const [itemId, points] of Object.entries(itemSeries)) {
    latestPerItem[Number(itemId)] = points[points.length - 1].overall;
  }

  const recordsByMatch = [...matchPoints].reverse().map((mp) => ({
    match: mp,
    records: records
      .filter((r) => r.matchId === mp.matchId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((r) => ({
        itemName: itemMap.get(r.rubricItemId)?.name ?? '不明',
        authorType: r.authorType,
        score: r.score,
        comment: r.comment,
      })),
  }));

  const itemNames: Record<number, string> = {};
  for (const r of rubricItems) itemNames[r.id!] = r.name;

  const overallScoreSeries: OverallScorePoint[] = matchPoints
    .map((mp) => {
      const os = overallScores.find((o) => o.matchId === mp.matchId);
      return os ? { matchId: mp.matchId, matchLabel: mp.title, score: os.score } : null;
    })
    .filter((p): p is OverallScorePoint => p !== null);

  return {
    matches: matchPoints,
    itemSeries,
    itemNames,
    latestPerItem,
    selfOtherGapSeries,
    recordsByMatch,
    overallScoreSeries,
  };
}

export interface Insight {
  text: string;
  tone: 'up' | 'narrowing' | 'neutral';
}

export function generateInsight(data: StudentTrendData): Insight {
  let bestStreak: { itemName: string; streak: number } | null = null;
  for (const [itemId, points] of Object.entries(data.itemSeries)) {
    const values = points.map((p) => p.overall);
    let streak = 0;
    for (let i = values.length - 1; i > 0; i--) {
      if (values[i] > values[i - 1]) streak++;
      else break;
    }
    if (streak >= 1 && (!bestStreak || streak > bestStreak.streak)) {
      bestStreak = { itemName: data.itemNames[Number(itemId)] ?? '不明', streak };
    }
  }

  if (bestStreak && bestStreak.streak >= 2) {
    return {
      text: `「${bestStreak.itemName}」のスコアが${bestStreak.streak}試合連続で上がっています！`,
      tone: 'up',
    };
  }

  const gaps = data.selfOtherGapSeries;
  if (gaps.length >= 2) {
    const last = gaps[gaps.length - 1];
    const prev = gaps[gaps.length - 2];
    if (last.gap < prev.gap) {
      return {
        text: '自己評価とまわりからの評価の差が縮まってきました。自分の成長がまわりにも伝わっています。',
        tone: 'narrowing',
      };
    }
  }

  if (bestStreak && bestStreak.streak >= 1) {
    return {
      text: `「${bestStreak.itemName}」のスコアが前回より上がりました！`,
      tone: 'up',
    };
  }

  if (data.matches.length === 0) {
    return { text: 'まだ記録がありません。試合の振り返りを記録してみましょう。', tone: 'neutral' };
  }

  return {
    text: '記録が積み上がってきています。次の試合でどんな変化が見られるか楽しみですね。',
    tone: 'neutral',
  };
}
