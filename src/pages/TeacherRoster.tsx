import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type EvalRecord, type Match, type OverallScore, type RubricItem } from '../db';
import { useStudents } from '../hooks';
import { buildStudentTrend, generateInsight, type Insight, type StudentTrendData } from '../analytics';

type Status = 'no-data' | 'up' | 'narrowing' | 'flat';

const STATUS_META: Record<Status, { icon: string; badge: string; cardClass: string }> = {
  'no-data': { icon: '💤', badge: 'しばらく記録がない', cardClass: 'insight-nodata' },
  up: { icon: '📈', badge: '伸びている', cardClass: 'insight-up' },
  narrowing: { icon: '🤝', badge: '伸びている', cardClass: 'insight-narrowing' },
  flat: { icon: '➖', badge: '変化なし', cardClass: 'insight-neutral' },
};

function statusOf(trend: StudentTrendData, insight: Insight): Status {
  if (trend.matches.length === 0) return 'no-data';
  if (insight.tone === 'up') return 'up';
  if (insight.tone === 'narrowing') return 'narrowing';
  return 'flat';
}

export default function TeacherRoster() {
  const students = useStudents();
  const records = useLiveQuery<EvalRecord[]>(() => db.records.toArray(), []);
  const matches = useLiveQuery<Match[]>(() => db.matches.toArray(), []);
  const rubricItems = useLiveQuery<RubricItem[]>(() => db.rubricItems.toArray(), []);
  const overallScores = useLiveQuery<OverallScore[]>(() => db.overallScores.toArray(), []);
  const navigate = useNavigate();

  // 各生徒の推移・インサイトは analytics.ts の既存ロジック（成長を見る画面と同じ）を再利用する
  const rows = useMemo(() => {
    if (!students || !records || !matches || !rubricItems || !overallScores) return null;
    return students.map((student) => {
      const myRecords = records.filter((r) => r.targetStudentId === student.id);
      const myOverallScores = overallScores.filter((o) => o.studentId === student.id);
      const trend = buildStudentTrend(myRecords, matches, rubricItems, myOverallScores);
      const insight = generateInsight(trend);
      return { student, insight, status: statusOf(trend, insight) };
    });
  }, [students, records, matches, rubricItems, overallScores]);

  return (
    <div>
      <div className="card">
        <p className="section-title">部全体一覧</p>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-dim)' }}>
          タップすると、その生徒の「成長を見る」詳細画面に移動します。
        </p>
      </div>

      {rows === null && <p className="empty-hint">読み込み中...</p>}
      {rows?.length === 0 && (
        <div className="card">
          <p className="empty-hint">設定画面で生徒を登録してください</p>
        </div>
      )}

      <div className="list-single-col">
        {rows?.map(({ student, insight, status }) => {
          const meta = STATUS_META[status];
          return (
            <button
              key={student.id}
              type="button"
              className={`card roster-row ${meta.cardClass}`}
              onClick={() => navigate('/trend', { state: { studentId: student.id } })}
            >
              <div className="roster-row-icon">{meta.icon}</div>
              <div className="roster-row-body">
                <div className="roster-row-name">
                  {student.name}
                  <span className="tag" style={{ marginLeft: 6 }}>
                    {meta.badge}
                  </span>
                </div>
                <div className="roster-row-insight">{insight.text}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
