import { useState } from 'react';
import { db } from '../db';
import { useMatches, useRecentRecords, useRubricItems, useStudents, useToast } from '../hooks';
import MatchSummaryCard from '../components/MatchSummaryCard';
import ScorePicker from '../components/ScorePicker';
import StudentChoiceGrid from '../components/StudentChoiceGrid';
import TagChips from '../components/TagChips';
import { deleteButtonClass } from '../uiOptions';
import { composeComment, tagsForItem } from '../commentTags';

export default function TeacherQuickRecord() {
  const students = useStudents();
  const rubricItems = useRubricItems();
  const matches = useMatches();
  const recentRecords = useRecentRecords(15);

  const [matchId, setMatchId] = useState<number | null>(null);
  const [changingMatch, setChangingMatch] = useState(true);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [rubricItemId, setRubricItemId] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const { toast, showToast } = useToast(1500);

  const teacherItems = rubricItems?.filter(
    (r) => r.targetType === 'teacher' || r.targetType === 'common',
  );
  const selectedItem = teacherItems?.find((r) => r.id === rubricItemId);
  const currentMatch = matches?.find((m) => m.id === matchId);

  function selectMatch(id: number) {
    setMatchId(id);
    setChangingMatch(false);
    setStudentId(null);
    setRubricItemId(null);
    setScore(null);
    setSelectedTags([]);
    setNote('');
  }

  function selectStudent(id: number) {
    setStudentId(id);
    setRubricItemId(null);
    setScore(null);
    setSelectedTags([]);
    setNote('');
  }

  function selectRubricItem(id: number) {
    setRubricItemId(id);
    setScore(null);
    setSelectedTags([]);
    setNote('');
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function handleSave() {
    if (!matchId || !studentId || !rubricItemId || !score) return;
    await db.records.add({
      targetStudentId: studentId,
      authorType: 'teacher',
      rubricItemId,
      score,
      comment: composeComment(selectedTags, note),
      timestamp: Date.now(),
      matchId,
    });
    setRubricItemId(null);
    setScore(null);
    setSelectedTags([]);
    setNote('');
    showToast('保存しました');
  }

  async function handleDelete(id?: number) {
    if (!id) return;
    await db.records.delete(id);
  }

  return (
    <div>
      <MatchSummaryCard
        matchId={matchId}
        changingMatch={changingMatch}
        currentMatch={currentMatch}
        onRequestChange={() => setChangingMatch(true)}
        onSelect={selectMatch}
        showOpponent
      />

      {matchId && !changingMatch && (
        <div className="card">
          <p className="section-title">① 生徒を選ぶ</p>
          {students === undefined && <p className="empty-hint">読み込み中...</p>}
          {students?.length === 0 && (
            <p className="empty-hint">設定画面で生徒を登録してください</p>
          )}
          <StudentChoiceGrid students={students} selectedId={studentId} onSelect={selectStudent} />
        </div>
      )}

      {studentId && (
        <div className="card">
          <p className="section-title">② 観点を選ぶ</p>
          {teacherItems?.length === 0 && (
            <p className="empty-hint">設定画面で評価観点を登録してください</p>
          )}
          <div className="choice-grid">
            {teacherItems?.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`choice-btn${rubricItemId === r.id ? ' selected' : ''}`}
                onClick={() => selectRubricItem(r.id!)}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {rubricItemId && selectedItem && (
        <div className="card">
          <p className="section-title">③ スコア（{selectedItem.name}）</p>
          <ScorePicker max={selectedItem.scaleMax} value={score} onChange={setScore} />
          <p className="section-title" style={{ marginTop: 14 }}>
            コメント（任意・複数選択可）
          </p>
          <TagChips tags={tagsForItem(selectedItem.name)} selected={selectedTags} onToggle={toggleTag} />
          <label>
            追加の一言メモ（任意）
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="伝えたいことがあれば"
            />
          </label>
          <button
            type="button"
            className="btn"
            disabled={!score}
            onClick={handleSave}
            style={{ marginTop: 8 }}
          >
            保存する
          </button>
        </div>
      )}

      <div className="card">
        <p className="section-title">直近の記録</p>
        {recentRecords === undefined && <p className="empty-hint">読み込み中...</p>}
        {recentRecords?.length === 0 && <p className="empty-hint">まだ記録がありません</p>}
        {recentRecords?.map((r) => (
          <div className="record-item" key={r.id}>
            <div>
              <div>
                {r.studentName} ・ {r.itemName}
                {r.authorType !== 'teacher' && (
                  <span className="tag" style={{ marginLeft: 6 }}>
                    {r.authorType === 'self' ? '自己評価' : `ピア（${r.authorName}）`}
                  </span>
                )}
              </div>
              <div className="meta">
                {r.matchTitle} ・{' '}
                {new Date(r.timestamp).toLocaleString('ja-JP', {
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {r.comment ? ` ・ 「${r.comment}」` : ''}
              </div>
            </div>
            <div className="row" style={{ flex: '0 0 auto', gap: 4 }}>
              <span className="score-badge">{r.score}</span>
              <button
                type="button"
                className={deleteButtonClass()}
                onClick={() => handleDelete(r.id)}
                aria-label="削除"
              >
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>

      {toast && <div className="saved-toast">{toast}</div>}
    </div>
  );
}
