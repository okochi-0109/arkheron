import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from 'chart.js';
import { Bar, Line, Radar } from 'react-chartjs-2';
import { db, type EvalRecord, type OverallScore } from '../db';
import { useRubricItems, useStudents } from '../hooks';
import {
  buildStudentTrend,
  type ItemSeriesPoint,
  type OverallScorePoint,
  type StudentTrendData,
  generateInsight,
} from '../analytics';
import { RADAR_SPARSE_MODE, RADAR_SPARSE_THRESHOLD } from '../uiOptions';
import StudentChoiceGrid from '../components/StudentChoiceGrid';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend,
);

const COLOR_SELF = '#6d8dff';
const COLOR_PEER = '#4cd7a0';

const AXIS_COLOR = '#a6acd9';
const GRID_COLOR = '#363c6b';
const TEXT_COLOR = '#f1f2fb';

export default function StudentTrend() {
  const students = useStudents();
  const rubricItems = useRubricItems();
  const location = useLocation();
  // 部全体一覧から生徒を指定して遷移してきた場合はその生徒を最初から表示する
  const linkedStudentId = (location.state as { studentId?: number } | null)?.studentId ?? null;
  const [meId, setMeId] = useState<number | null>(linkedStudentId);
  const [showDetail, setShowDetail] = useState(false);

  const records = useLiveQuery<EvalRecord[]>(
    () => (meId ? db.records.where('targetStudentId').equals(meId).toArray() : Promise.resolve([])),
    [meId],
  );
  const matches = useLiveQuery(() => db.matches.toArray(), []);
  const overallScores = useLiveQuery<OverallScore[]>(
    () => (meId ? db.overallScores.where('studentId').equals(meId).toArray() : Promise.resolve([])),
    [meId],
  );

  const trend = useMemo(() => {
    if (!records || !matches || !rubricItems || !overallScores) return null;
    return buildStudentTrend(records, matches, rubricItems, overallScores);
  }, [records, matches, rubricItems, overallScores]);

  const insight = trend ? generateInsight(trend) : null;

  if (!meId) {
    return (
      <div className="card">
        <p className="section-title">あなたは誰？</p>
        {students === undefined && <p className="empty-hint">読み込み中...</p>}
        {students?.length === 0 && (
          <p className="empty-hint">設定画面で生徒を登録してください</p>
        )}
        <StudentChoiceGrid
          students={students}
          onSelect={(id) => {
            setMeId(id);
            setShowDetail(false);
          }}
        />
      </div>
    );
  }

  const me = students?.find((s) => s.id === meId);

  return (
    <div>
      <div className="breadcrumb">
        <span className="step active">👤 {me?.name}</span>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setMeId(null)}
          style={{ marginLeft: 'auto' }}
        >
          最初から
        </button>
      </div>

      {!trend || trend.matches.length === 0 ? (
        <div className="card">
          <p className="empty-hint">
            まだ記録がありません。試合の振り返りをすると、ここに成長が表示されます。
          </p>
        </div>
      ) : (
        <>
          <div className={`card insight-card insight-${insight?.tone}`}>
            <div className="insight-icon">
              {insight?.tone === 'up' && '📈'}
              {insight?.tone === 'narrowing' && '🤝'}
              {insight?.tone === 'neutral' && '✨'}
            </div>
            <p className="insight-text">{insight?.text}</p>
          </div>

          <button type="button" className="btn secondary" onClick={() => setShowDetail((v) => !v)}>
            {showDetail ? '閉じる' : 'もっと見る'}
          </button>

          {showDetail && <DetailView trend={trend} />}
        </>
      )}
    </div>
  );
}

function DetailView({ trend }: { trend: StudentTrendData }) {
  const itemEntries = Object.entries(trend.itemSeries);
  const isSparse = itemEntries.length < RADAR_SPARSE_THRESHOLD;

  return (
    <div style={{ marginTop: 14 }}>
      <div className="card">
        <p className="section-title">現在の観点別バランス</p>
        {isSparse && RADAR_SPARSE_MODE === 'bar' ? (
          <Bar data={buildBarData(trend)} options={barOptions} />
        ) : isSparse && RADAR_SPARSE_MODE === 'hide' ? (
          <div className="list-single-col">
            {itemEntries.map(([itemId]) => (
              <div className="record-item" key={itemId}>
                <div>{trend.itemNames[Number(itemId)] ?? '不明'}</div>
                <span className="score-badge">{trend.latestPerItem[Number(itemId)]}</span>
              </div>
            ))}
          </div>
        ) : (
          <Radar data={buildRadarData(trend)} options={radarOptions} />
        )}
      </div>

      {trend.overallScoreSeries.length > 0 && (
        <div className="card">
          <p className="section-title">総合ふりかえりスコアの推移</p>
          <Line data={buildOverallLineData(trend.overallScoreSeries)} options={overallLineOptions} />
        </div>
      )}

      {itemEntries.map(([itemId, points]) => (
        <div className="card" key={itemId}>
          <p className="section-title">{trend.itemNames[Number(itemId)] ?? '不明'}の推移</p>
          <Line data={buildLineData(points)} options={lineOptions} />
        </div>
      ))}

      <div className="card">
        <p className="section-title">試合ごとの記録</p>
        {trend.recordsByMatch.map(({ match, records: recs }) => (
          <div key={match.matchId} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {match.title} <span className="meta">（{match.date}）</span>
            </div>
            {recs.map((r, idx) => (
              <div className="record-item" key={idx}>
                <div>
                  <div>
                    {r.itemName}
                    <span className="tag" style={{ marginLeft: 6 }}>
                      {r.authorType === 'self'
                        ? '自己評価'
                        : r.authorType === 'peer'
                          ? 'ピア評価'
                          : '教員評価'}
                    </span>
                  </div>
                  {r.comment && <div className="meta">「{r.comment}」</div>}
                </div>
                <span className="score-badge">{r.score}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function buildRadarData(trend: StudentTrendData) {
  const itemIds = Object.keys(trend.itemSeries).map(Number);
  return {
    labels: itemIds.map((id) => trend.itemNames[id] ?? '不明'),
    datasets: [
      {
        label: '現在のスコア',
        data: itemIds.map((id) => trend.latestPerItem[id] ?? 0),
        backgroundColor: 'rgba(109, 141, 255, 0.25)',
        borderColor: COLOR_SELF,
        pointBackgroundColor: COLOR_SELF,
      },
    ],
  };
}

const radarOptions = {
  scales: {
    r: {
      min: 1,
      max: 4,
      ticks: { stepSize: 1, backdropColor: 'transparent', color: AXIS_COLOR },
      grid: { color: GRID_COLOR },
      angleLines: { color: GRID_COLOR },
      pointLabels: { color: TEXT_COLOR, font: { size: 11 } },
    },
  },
  plugins: { legend: { display: false } },
};

// RADAR_SPARSE_MODE: 'bar' 案で使用（観点数が少ないときの代替表示）
function buildBarData(trend: StudentTrendData) {
  const itemIds = Object.keys(trend.itemSeries).map(Number);
  return {
    labels: itemIds.map((id) => trend.itemNames[id] ?? '不明'),
    datasets: [
      {
        label: '現在のスコア',
        data: itemIds.map((id) => trend.latestPerItem[id] ?? 0),
        backgroundColor: COLOR_SELF,
        borderRadius: 6,
      },
    ],
  };
}

const barOptions = {
  scales: {
    y: { min: 0, max: 4, ticks: { stepSize: 1, color: AXIS_COLOR }, grid: { color: GRID_COLOR } },
    x: { ticks: { color: AXIS_COLOR }, grid: { display: false } },
  },
  plugins: { legend: { display: false } },
};

function buildLineData(points: ItemSeriesPoint[]) {
  return {
    labels: points.map((p) => p.matchLabel),
    datasets: [
      {
        label: '自己評価',
        data: points.map((p) => p.self ?? null),
        borderColor: COLOR_SELF,
        backgroundColor: COLOR_SELF,
        spanGaps: true,
      },
      {
        label: 'ピア評価',
        data: points.map((p) => p.peer ?? null),
        borderColor: COLOR_PEER,
        backgroundColor: COLOR_PEER,
        spanGaps: true,
      },
    ],
  };
}

const lineOptions = {
  scales: {
    y: { min: 1, max: 4, ticks: { stepSize: 1, color: AXIS_COLOR }, grid: { color: GRID_COLOR } },
    x: { ticks: { color: AXIS_COLOR }, grid: { display: false } },
  },
  plugins: { legend: { labels: { color: TEXT_COLOR } } },
};

const COLOR_OVERALL = '#ffb454';

function buildOverallLineData(points: OverallScorePoint[]) {
  return {
    labels: points.map((p) => p.matchLabel),
    datasets: [
      {
        label: '総合ふりかえりスコア',
        data: points.map((p) => p.score),
        borderColor: COLOR_OVERALL,
        backgroundColor: COLOR_OVERALL,
      },
    ],
  };
}

const overallLineOptions = {
  scales: {
    y: { min: 0, max: 100, ticks: { stepSize: 20, color: AXIS_COLOR }, grid: { color: GRID_COLOR } },
    x: { ticks: { color: AXIS_COLOR }, grid: { display: false } },
  },
  plugins: { legend: { display: false } },
};
