import { useState } from 'react';
import { db, todayString } from '../db';
import { useMatches } from '../hooks';

interface MatchPickerProps {
  selectedMatchId: number | null;
  onSelect: (matchId: number) => void;
}

export default function MatchPicker({ selectedMatchId, onSelect }: MatchPickerProps) {
  const matches = useMatches();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayString);
  const [opponent, setOpponent] = useState('');

  async function handleCreate() {
    if (!title.trim()) return;
    const id = await db.matches.add({
      title: title.trim(),
      date,
      opponent: opponent.trim() || undefined,
    });
    setTitle('');
    setOpponent('');
    setCreating(false);
    onSelect(id as number);
  }

  if (creating) {
    return (
      <div>
        <label>
          日付
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          タイトル
          <input
            type="text"
            placeholder="例: 紅白戦"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          対戦相手（任意・部内戦なら空でOK）
          <input
            type="text"
            placeholder=""
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
          />
        </label>
        <div className="row">
          <button className="btn secondary" onClick={() => setCreating(false)}>
            キャンセル
          </button>
          <button className="btn" onClick={handleCreate} disabled={!title.trim()}>
            作成して選択
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="list-single-col">
      {matches === undefined && <p className="empty-hint">読み込み中...</p>}
      {matches?.length === 0 && <p className="empty-hint">まだ試合・活動がありません</p>}
      {matches?.map((m) => (
        <button
          key={m.id}
          type="button"
          className={`choice-btn${selectedMatchId === m.id ? ' selected' : ''}`}
          style={{ justifyContent: 'flex-start', textAlign: 'left' }}
          onClick={() => onSelect(m.id!)}
        >
          <div>
            <div>{m.title}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
              {m.date}
              {m.opponent ? ` ・ vs ${m.opponent}` : ''}
            </div>
          </div>
        </button>
      ))}
      <button type="button" className="btn ghost" onClick={() => setCreating(true)}>
        ＋ 新しい試合・活動を作成
      </button>
    </div>
  );
}
