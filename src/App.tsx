import type { ReactNode } from 'react';
import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import TeacherQuickRecord from './pages/TeacherQuickRecord';
import TeacherRoster from './pages/TeacherRoster';
import SelfPeerEvaluation from './pages/SelfPeerEvaluation';
import Settings from './pages/Settings';
import StudentTrend from './pages/StudentTrend';
import { NAV_LABEL_STYLE } from './uiOptions';
import { TeacherAuthProvider } from './teacherAuth';
import TeacherGate from './components/TeacherGate';

// 前半2つが教員向け、後半3つが生徒も使う画面。ボトムナビでは区切り線で分ける
const NAV_ITEMS = [
  { to: '/teacher', icon: '🧑‍🏫', fullLabel: '教員記録', shortLabel: '記録' },
  { to: '/roster', icon: '📋', fullLabel: '部全体一覧', shortLabel: '一覧' },
  { to: '/me', icon: '🙋', fullLabel: '自己・ピア評価', shortLabel: '評価' },
  { to: '/trend', icon: '🌱', fullLabel: '成長を見る', shortLabel: '成長' },
  { to: '/settings', icon: '⚙️', fullLabel: '設定', shortLabel: '設定' },
] as const;
const TEACHER_GROUP_SIZE = 2;

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Arkheron 試合振り返り</h1>
      </header>
      <main className="app-main">{children}</main>
      <nav className="bottom-nav">
        {NAV_ITEMS.map((item, index) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [isActive ? 'active' : '', index === TEACHER_GROUP_SIZE - 1 ? 'group-end' : '']
                .filter(Boolean)
                .join(' ')
            }
          >
            <span className="icon">{item.icon}</span>
            {NAV_LABEL_STYLE !== 'iconOnly' && (
              <span className="label">
                {NAV_LABEL_STYLE === 'short' ? item.shortLabel : item.fullLabel}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <TeacherAuthProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/me" replace />} />
            <Route path="/teacher" element={<TeacherQuickRecord />} />
            <Route
              path="/roster"
              element={
                <TeacherGate>
                  <TeacherRoster />
                </TeacherGate>
              }
            />
            <Route path="/me" element={<SelfPeerEvaluation />} />
            <Route path="/trend" element={<StudentTrend />} />
            <Route
              path="/settings"
              element={
                <TeacherGate>
                  <Settings />
                </TeacherGate>
              }
            />
          </Routes>
        </Layout>
      </HashRouter>
    </TeacherAuthProvider>
  );
}
