import { useState } from 'react';
import { db, DEFAULT_RUBRIC_ITEMS, todayString, type TargetType } from '../db';
import { useMatches, useRubricItems, useStudents } from '../hooks';
import { deleteButtonClass } from '../uiOptions';
import { useTeacherAuth } from '../teacherAuth';

const TARGET_TYPE_LABEL: Record<TargetType, string> = {
  self: '自己評価のみ',
  peer: 'ピア評価のみ',
  teacher: '教員評価のみ',
  common: '共通（自己・ピア・教員）',
};

export default function Settings() {
  return (
    <div>
      <PinSection />
      <StudentSection />
      <RubricItemSection />
      <MatchSection />
    </div>
  );
}

function PinSection() {
  const { hasPin, setPin, clearPin, tryUnlock } = useTeacherAuth();
  const [changing, setChanging] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmNext, setConfirmNext] = useState('');
  const [error, setError] = useState('');

  function digits(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value.replace(/\D/g, '').slice(0, 4));
      setError('');
    };
  }

  function handleChange() {
    if (!tryUnlock(current)) {
      setError('現在のPINが違います');
      return;
    }
    if (!/^\d{4}$/.test(next)) {
      setError('新しいPINは4桁の数字で入力してください');
      return;
    }
    if (next !== confirmNext) {
      setError('確認用のPINが一致しません');
      return;
    }
    setPin(next);
    setChanging(false);
    setCurrent('');
    setNext('');
    setConfirmNext('');
  }

  return (
    <div className="card">
      <p className="section-title">教員用PINロック</p>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 0 }}>
        設定済み。この設定画面と部全体一覧画面を開く際にPINの入力が必要です。
      </p>
      {!changing ? (
        <div className="row">
          <button type="button" className="btn secondary" onClick={() => setChanging(true)}>
            PINを変更する
          </button>
          <button type="button" className="btn danger" onClick={clearPin}>
            PINロックを解除する
          </button>
        </div>
      ) : (
        <>
          <label>
            現在のPIN
            <input type="tel" inputMode="numeric" maxLength={4} value={current} onChange={digits(setCurrent)} />
          </label>
          <label>
            新しいPIN（4桁）
            <input type="tel" inputMode="numeric" maxLength={4} value={next} onChange={digits(setNext)} />
          </label>
          <label>
            新しいPIN（確認）
            <input
              type="tel"
              inputMode="numeric"
              maxLength={4}
              value={confirmNext}
              onChange={digits(setConfirmNext)}
            />
          </label>
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
          <div className="row">
            <button type="button" className="btn secondary" onClick={() => setChanging(false)}>
              キャンセル
            </button>
            <button type="button" className="btn" onClick={handleChange}>
              変更する
            </button>
          </div>
        </>
      )}
      {!hasPin && <p className="empty-hint">PIN未設定です（通常はここに来ないはずです）</p>}
    </div>
  );
}

function StudentSection() {
  const students = useStudents();
  const [name, setName] = useState('');
  const [attendanceNumber, setAttendanceNumber] = useState('');
  const [className, setClassName] = useState('');

  async function handleAdd() {
    if (!name.trim()) return;
    await db.students.add({
      name: name.trim(),
      attendanceNumber: Number(attendanceNumber) || 0,
      className: className.trim(),
    });
    setName('');
    setAttendanceNumber('');
    setClassName('');
  }

  return (
    <div className="card">
      <p className="section-title">生徒</p>
      <div className="list-single-col" style={{ marginBottom: 12 }}>
        {students?.length === 0 && <p className="empty-hint">まだ生徒がいません</p>}
        {students?.map((s) => (
          <div className="record-item" key={s.id}>
            <div>
              <strong>{s.name}</strong>
              <div className="meta">
                {s.className} ・ 出席番号 {s.attendanceNumber}
              </div>
            </div>
            <button
              type="button"
              className={deleteButtonClass()}
              onClick={() => db.students.delete(s.id!)}
              aria-label="削除"
            >
              🗑
            </button>
          </div>
        ))}
      </div>
      <label>
        氏名
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="row">
        <label>
          出席番号
          <input
            type="number"
            value={attendanceNumber}
            onChange={(e) => setAttendanceNumber(e.target.value)}
          />
        </label>
        <label>
          クラス
          <input type="text" value={className} onChange={(e) => setClassName(e.target.value)} />
        </label>
      </div>
      <button type="button" className="btn" disabled={!name.trim()} onClick={handleAdd}>
        ＋ 生徒を追加
      </button>
    </div>
  );
}

function RubricItemSection() {
  const rubricItems = useRubricItems();
  const [name, setName] = useState('');
  const [targetType, setTargetType] = useState<TargetType>('common');
  const [scaleMax, setScaleMax] = useState(4);
  const [description, setDescription] = useState('');

  async function handleAdd() {
    if (!name.trim()) return;
    await db.rubricItems.add({
      name: name.trim(),
      targetType,
      scaleMax,
      description: description.trim() || undefined,
    });
    setName('');
    setDescription('');
  }

  async function handleSeedDefaults() {
    await db.rubricItems.bulkAdd(DEFAULT_RUBRIC_ITEMS);
  }

  return (
    <div className="card">
      <p className="section-title">評価観点</p>
      <div className="list-single-col" style={{ marginBottom: 12 }}>
        {rubricItems?.length === 0 && <p className="empty-hint">まだ評価観点がありません</p>}
        {rubricItems?.map((r) => (
          <div className="record-item" key={r.id}>
            <div>
              <strong>{r.name}</strong>
              <div className="meta">
                {TARGET_TYPE_LABEL[r.targetType]} ・ 1〜{r.scaleMax}
                {r.description ? ` ・ ${r.description}` : ''}
              </div>
            </div>
            <button
              type="button"
              className={deleteButtonClass()}
              onClick={() => db.rubricItems.delete(r.id!)}
              aria-label="削除"
            >
              🗑
            </button>
          </div>
        ))}
      </div>
      {rubricItems?.length === 0 && (
        <button type="button" className="btn ghost" onClick={handleSeedDefaults} style={{ marginBottom: 12 }}>
          初期の評価観点（6項目）を追加
        </button>
      )}
      <label>
        観点名
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        対象
        <select value={targetType} onChange={(e) => setTargetType(e.target.value as TargetType)}>
          {Object.entries(TARGET_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        スケール（最大値）
        <input
          type="number"
          min={2}
          max={6}
          value={scaleMax}
          onChange={(e) => setScaleMax(Number(e.target.value) || 4)}
        />
      </label>
      <label>
        説明文（任意）
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <button type="button" className="btn" disabled={!name.trim()} onClick={handleAdd}>
        ＋ 評価観点を追加
      </button>
    </div>
  );
}

function MatchSection() {
  const matches = useMatches();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayString);
  const [opponent, setOpponent] = useState('');
  const [memo, setMemo] = useState('');

  async function handleAdd() {
    if (!title.trim()) return;
    await db.matches.add({
      title: title.trim(),
      date,
      opponent: opponent.trim() || undefined,
      memo: memo.trim() || undefined,
    });
    setTitle('');
    setOpponent('');
    setMemo('');
  }

  return (
    <div className="card">
      <p className="section-title">試合・活動</p>
      <div className="list-single-col" style={{ marginBottom: 12 }}>
        {matches?.length === 0 && <p className="empty-hint">まだ試合・活動がありません</p>}
        {matches?.map((m) => (
          <div className="record-item" key={m.id}>
            <div>
              <strong>{m.title}</strong>
              <div className="meta">
                {m.date}
                {m.opponent ? ` ・ vs ${m.opponent}` : ''}
                {m.memo ? ` ・ ${m.memo}` : ''}
              </div>
            </div>
            <button
              type="button"
              className={deleteButtonClass()}
              onClick={() => db.matches.delete(m.id!)}
              aria-label="削除"
            >
              🗑
            </button>
          </div>
        ))}
      </div>
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
        対戦相手（任意）
        <input type="text" value={opponent} onChange={(e) => setOpponent(e.target.value)} />
      </label>
      <label>
        メモ（任意）
        <textarea rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} />
      </label>
      <button type="button" className="btn" disabled={!title.trim()} onClick={handleAdd}>
        ＋ 試合・活動を追加
      </button>
    </div>
  );
}
