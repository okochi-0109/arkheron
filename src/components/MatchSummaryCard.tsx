import type { Match } from '../db';
import MatchPicker from './MatchPicker';

interface MatchSummaryCardProps {
  matchId: number | null;
  changingMatch: boolean;
  currentMatch: Match | undefined;
  onRequestChange: () => void;
  onSelect: (matchId: number) => void;
  showOpponent?: boolean;
}

export default function MatchSummaryCard({
  matchId,
  changingMatch,
  currentMatch,
  onRequestChange,
  onSelect,
  showOpponent = false,
}: MatchSummaryCardProps) {
  return (
    <div className="card">
      <p className="section-title">試合・活動</p>
      {!changingMatch && currentMatch ? (
        <div className="row" style={{ alignItems: 'center' }}>
          <div style={{ minWidth: 0 }}>
            <strong>{currentMatch.title}</strong>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
              {currentMatch.date}
              {showOpponent && currentMatch.opponent ? ` ・ vs ${currentMatch.opponent}` : ''}
            </div>
          </div>
          <button
            type="button"
            className="btn secondary"
            style={{ flex: '0 0 auto', width: 'auto' }}
            onClick={onRequestChange}
          >
            変更
          </button>
        </div>
      ) : (
        <MatchPicker selectedMatchId={matchId} onSelect={onSelect} />
      )}
    </div>
  );
}
