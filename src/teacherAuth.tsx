import { createContext, useContext, useState, type ReactNode } from 'react';

const PIN_KEY = 'arkheron-teacher-pin';

function getStoredPin(): string | null {
  try {
    return localStorage.getItem(PIN_KEY);
  } catch {
    return null;
  }
}

interface TeacherAuthContextValue {
  hasPin: boolean;
  unlocked: boolean;
  tryUnlock: (pin: string) => boolean;
  setPin: (pin: string) => void;
  clearPin: () => void;
}

const TeacherAuthContext = createContext<TeacherAuthContextValue | null>(null);

/**
 * 教員向け画面（設定・部全体一覧）の簡易PINロック。
 * PIN自体はlocalStorageに平文で保存する程度の「簡易」ロック
 * （生徒がうっかり教員画面を開かないようにする目的で、強固な認証は想定しない）。
 * 解錠状態(unlocked)はメモリ上のみで保持し、アプリを再読み込みすると再度PIN入力が必要になる。
 */
export function TeacherAuthProvider({ children }: { children: ReactNode }) {
  const [pin, setPinState] = useState<string | null>(getStoredPin);
  const [unlocked, setUnlocked] = useState(false);

  function tryUnlock(input: string): boolean {
    if (pin !== null && input === pin) {
      setUnlocked(true);
      return true;
    }
    return false;
  }

  function setPin(newPin: string) {
    try {
      localStorage.setItem(PIN_KEY, newPin);
    } catch {
      // localStorageが使えない環境でもアプリ自体は動作を継続する
    }
    setPinState(newPin);
    setUnlocked(true);
  }

  function clearPin() {
    try {
      localStorage.removeItem(PIN_KEY);
    } catch {
      // 無視
    }
    setPinState(null);
    setUnlocked(false);
  }

  return (
    <TeacherAuthContext.Provider value={{ hasPin: pin !== null, unlocked, tryUnlock, setPin, clearPin }}>
      {children}
    </TeacherAuthContext.Provider>
  );
}

export function useTeacherAuth(): TeacherAuthContextValue {
  const ctx = useContext(TeacherAuthContext);
  if (!ctx) throw new Error('useTeacherAuth must be used within TeacherAuthProvider');
  return ctx;
}
