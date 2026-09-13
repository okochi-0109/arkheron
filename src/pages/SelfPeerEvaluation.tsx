import { useEffect, useMemo, useState } from 'react';
import { db, upsertOverallScore, type AuthorType } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMatches, useRubricItems, useStudents, useToast } from '../hooks';
import MatchSummaryCard from '../components/MatchSummaryCard';
import ScorePicker from '../components/ScorePicker';
import StudentChoiceGrid from '../components/StudentChoiceGrid';
import TagChips from '../components/TagChips';
import { composeComment, tagsForItem } from '../commentTags';

interface TagRowState {
  tags: string[];
  note: string;
}

export default function SelfPeerEvaluation() {
  const students = useStudents();
  const rubricItems = useRubricItems();
  const matches = useMatches();

  // 端末を回して使う想定のため、画面を開くたびにリセットされる（永続化しない）
  const [meId, setMeId] = useState<number | null>(null);
  const [matchId, setMatchId] = useState<number | null>(null);
  const [changingMatch, setChangingMatch] = useState(true);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [tagState, setTagState] = useState<Record<number, TagRowState>>({});
  const [lastSaved, setLastSaved] = useState<Record<number, number>>({});
  const [showItemDetail, setShowItemDetail] = useState(false);
  const { toast, showToast } = useToast(1200);
  const [myRecordsRefresh, setMyRecordsRefresh] = useState(0);

  const currentMatch = matches?.find((m) => m.id === matchId);
  const authorType: AuthorType | null = useMemo(() => {
    if (meId === null || targetId === null) return null;
    return targetId === meId ? 'self' : 'peer';
  }, [meId, targetId]);

  const filteredItems = rubricItems?.filter(
    (r) => r.targetType === 'common' || r.targetType === authorType,
  );

  const myRecords = useMyRecords(matchId, meId, myRecordsRefresh);

  function resetAll() {
    setMeId(null);
    setMatchId(null);
    setChangingMatch(true);
    setTargetId(null);
    setTagState({});
    setLastSaved({});
    setShowItemDetail(false);
  }

  function selectMe(id: number) {
    setMeId(id);
    setMatchId(null);
    setChangingMatch(true);
    setTargetId(null);
    setTagState({});
    setLastSaved({});
    setShowItemDetail(false);
  }

  function selectMatch(id: number) {
    setMatchId(id);
    setChangingMatch(false);
    setTargetId(null);
    setTagState({});
    setLastSaved({});
    setShowItemDetail(false);
  }

  function selectTarget(id: number) {
    setTargetId(id);
    setTagState({});
    setLastSaved({});
    setShowItemDetail(false);
  }

  function getRowState(rubricItemId: number): TagRowState {
    return tagState[rubricItemId] ?? { tags: [], note: '' };
  }

  function toggleRowTag(rubricItemId: number, tag: string) {
    setTagState((prev) => {
      const row = prev[rubricItemId] ?? { tags: [], note: '' };
      const tags = row.tags.includes(tag) ? row.tags.filter((t) => t !== tag) : [...row.tags, tag];
      return { ...prev, [rubricItemId]: { ...row, tags } };
    });
  }

  function setRowNote(rubricItemId: number, note: string) {
    setTagState((prev) => ({ ...prev, [rubricItemId]: { ...(prev[rubricItemId] ?? { tags: [] }), note } }));
  }

  async function handleScoreTap(rubricItemId: number, score: number) {
    if (!meId || !matchId || !targetId || !authorType) return;
    const row = getRowState(rubricItemId);
    await db.records.add({
      targetStudentId: targetId,
      authorType,
      authorStudentId: authorType === 'peer' ? meId : undefined,
      rubricItemId,
      score,
      comment: composeComment(row.tags, row.note),
      timestamp: Date.now(),
      matchId,
    });
    setLastSaved((prev) => ({ ...prev, [rubricItemId]: score }));
    setTagState((prev) => ({ ...prev, [rubricItemId]: { tags: [], note: '' } }));
    setMyRecordsRefresh((n) => n + 1);
    showToast('保存しました');
  }

  // Step 1
  if (!meId) {
    return (
      <div>
        <div className="card">
          <p className="section-title">あなたは誰？</p>
          {students === undefined && <p className="empty-hint">読み込み中...</p>}
          {students?.length === 0 && (
            <p className="empty-hint">設定画面で生徒を登録してください</p>
          )}
          <StudentChoiceGrid students={students} onSelect={selectMe} />
        </div>
      </div>
    );
  }

  const me = students?.find((s) => s.id === meId);

  return (
    <div>
      <div className="breadcrumb">
        <span className="step active">👤 {me?.name}</span>
        {currentMatch && !changingMatch && <span className="step">🎮 {currentMatch.title}</span>}
        <button type="button" className="icon-btn" onClick={resetAll} style={{ marginLeft: 'auto' }}>
          最初から
        </button>
      </div>

      <MatchSummaryCard
        matchId={matchId}
        changingMatch={changingMatch}
        currentMatch={currentMatch}
        onRequestChange={() => setChangingMatch(true)}
        onSelect={selectMatch}
      />

      {matchId && !changingMatch && (
        <div className="card">
          <p className="section-title">評価する相手</p>
          <StudentChoiceGrid
            students={students}
            selectedId={targetId}
            onSelect={selectTarget}
            renderTag={(s) => s.id === meId && <div className="me-tag">(自分)</div>}
          />
        </div>
      )}

      {targetId && authorType === 'self' && matchId && (
        <OverallScoreCard
          key={`${matchId}-${targetId}`}
          matchId={matchId}
          studentId={targetId}
          onSaved={() => showToast('保存しました')}
        />
      )}

      {targetId && authorType === 'self' && (
        <button
          type="button"
          className="btn ghost"
          onClick={() => setShowItemDetail((v) => !v)}
        >
          {showItemDetail ? '観点別記録を閉じる' : '＋ もっと詳しく記録する（観点別・任意）'}
        </button>
      )}

      {targetId && authorType && (authorType === 'peer' || showItemDetail) && (
        <div className="card">
          <p className="section-title">
            観点（{authorType === 'self' ? '自己評価' : `ピア評価: ${
              students?.find((s) => s.id === targetId)?.name
            }さん`}
            ）
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 0 }}>
            全部埋めなくて大丈夫です。気になった観点が1つだけでもOK。
          </p>
          {filteredItems?.length === 0 && (
            <p className="empty-hint">対象の観点がありません（設定画面を確認）</p>
          )}
          <div className="list-single-col">
            {filteredItems?.map((item) => {
              const row = getRowState(item.id!);
              return (
                <div key={item.id} style={{ paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ marginBottom: 4, fontSize: '0.9rem', fontWeight: 600 }}>{item.name}</div>
                  <TagChips
                    tags={tagsForItem(item.name)}
                    selected={row.tags}
                    onToggle={(tag) => toggleRowTag(item.id!, tag)}
                  />
                  <input
                    type="text"
                    value={row.note}
                    onChange={(e) => setRowNote(item.id!, e.target.value)}
                    placeholder="追加の一言メモ（任意）"
                    style={{ marginBottom: 8 }}
                  />
                  <ScorePicker
                    max={item.scaleMax}
                    value={lastSaved[item.id!] ?? null}
                    onChange={(score) => handleScoreTap(item.id!, score)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {targetId && (
        <div className="card">
          <p className="section-title">自分が入力した記録（この試合）</p>
          {myRecords === undefined && <p className="empty-hint">読み込み中...</p>}
          {myRecords?.length === 0 && <p className="empty-hint">まだ記録がありません</p>}
          {myRecords?.map((r) => (
            <div className="record-item" key={r.id}>
              <div>
                <div>
                  {r.itemName}
                  <span className="tag" style={{ marginLeft: 6 }}>
                    {r.authorType === 'self' ? '自己評価' : `→ ${r.targetName}`}
                  </span>
                </div>
                <div className="meta">
                  {new Date(r.timestamp).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {r.comment ? ` ・ 「${r.comment}」` : ''}
                </div>
              </div>
              <span className="score-badge">{r.score}</span>
            </div>
          ))}
        </div>
      )}

      <button type="button" className="btn secondary" onClick={resetAll}>
        評価を終える（次の人に渡す）
      </button>

      {toast && <div className="saved-toast">{toast}</div>}
    </div>
  );
}

function OverallScoreCard({
  matchId,
  studentId,
  onSaved,
}: {
  matchId: number;
  studentId: number;
  onSaved: () => void;
}) {
  const existing = useLiveQuery(
    () => db.overallScores.where({ matchId, studentId }).first(),
    [matchId, studentId],
  );
  const [value, setValue] = useState<number | null>(null);

  const displayValue = value ?? existing?.score ?? 50;
  const saved = value !== null || existing !== undefined;

  async function handleChange(v: number) {
    setValue(v);
    await upsertOverallScore(matchId, studentId, v);
    onSaved();
  }

  return (
    <div className="card overall-hero">
      <p className="section-title">今日のふりかえり</p>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 0 }}>
        この試合全体を振り返って、直感でスコアをつけてください。これだけで振り返り完了です。
      </p>
      <div className="overall-slider-value overall-slider-value-lg">{displayValue}</div>
      <input
        type="range"
        className="overall-slider overall-slider-lg"
        min={0}
        max={100}
        value={displayValue}
        onChange={(e) => handleChange(Number(e.target.value))}
      />
      <div className="overall-slider-scale">
        <span>0（うまくいかなかった）</span>
        <span>100（最高だった）</span>
      </div>
      {saved && <p className="overall-saved-hint">✓ 保存済み</p>}
    </div>
  );
}

function useMyRecords(matchId: number | null, meId: number | null, refreshKey: number) {
  const rubricItems = useRubricItems();
  const students = useStudents();
  const [records, setRecords] = useState<
    { id?: number; itemName: string; targetName: string; authorType: AuthorType; score: number; comment?: string; timestamp: number }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!matchId || !meId) {
        setRecords([]);
        return;
      }
      const all = await db.records.where('matchId').equals(matchId).toArray();
      const mine = all.filter(
        (r) =>
          (r.authorType === 'self' && r.targetStudentId === meId) ||
          (r.authorType === 'peer' && r.authorStudentId === meId),
      );
      mine.sort((a, b) => b.timestamp - a.timestamp);
      const itemMap = new Map((rubricItems ?? []).map((i) => [i.id, i.name]));
      const studentMap = new Map((students ?? []).map((s) => [s.id, s.name]));
      const mapped = mine.map((r) => ({
        id: r.id,
        itemName: itemMap.get(r.rubricItemId) ?? '不明',
        targetName: studentMap.get(r.targetStudentId) ?? '不明',
        authorType: r.authorType,
        score: r.score,
        comment: r.comment,
        timestamp: r.timestamp,
      }));
      if (!cancelled) setRecords(mapped);
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, meId, refreshKey, rubricItems, students]);

  return records;
}
