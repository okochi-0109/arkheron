import { useState, type ReactNode } from 'react';
import { useTeacherAuth } from '../teacherAuth';

export default function TeacherGate({ children }: { children: ReactNode }) {
  const { hasPin, unlocked, tryUnlock, setPin } = useTeacherAuth();
  const [input, setInput] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const [error, setError] = useState('');

  if (unlocked) return <>{children}</>;

  function handleDigitsChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value.replace(/\D/g, '').slice(0, 4));
      setError('');
    };
  }

  if (!hasPin) {
    function handleSetup() {
      if (!/^\d{4}$/.test(input)) {
        setError('4桁の数字を入力してください');
        return;
      }
      if (input !== confirmInput) {
        setError('確認用のPINが一致しません');
        return;
      }
      setPin(input);
    }

    return (
      <div className="card">
        <p className="section-title">🔒 教員用PINを設定</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 0 }}>
          これ以降、教員向け画面（設定・部全体一覧）を開くたびにPINの入力を求めます。生徒には教えないでください。
        </p>
        <label>
          PIN（4桁の数字）
          <input
            type="tel"
            inputMode="numeric"
            maxLength={4}
            value={input}
            onChange={handleDigitsChange(setInput)}
          />
        </label>
        <label>
          確認のためもう一度入力
          <input
            type="tel"
            inputMode="numeric"
            maxLength={4}
            value={confirmInput}
            onChange={handleDigitsChange(setConfirmInput)}
          />
        </label>
        {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
        <button type="button" className="btn" disabled={input.length !== 4} onClick={handleSetup}>
          設定する
        </button>
      </div>
    );
  }

  function handleUnlock() {
    if (!tryUnlock(input)) {
      setError('PINが違います');
      setInput('');
    }
  }

  return (
    <div className="card">
      <p className="section-title">🔒 教員用PIN</p>
      <label>
        PINを入力してください
        <input
          type="tel"
          inputMode="numeric"
          maxLength={4}
          value={input}
          autoFocus
          onChange={handleDigitsChange(setInput)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleUnlock();
          }}
        />
      </label>
      {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
      <button type="button" className="btn" disabled={input.length !== 4} onClick={handleUnlock}>
        解除する
      </button>
    </div>
  );
}
