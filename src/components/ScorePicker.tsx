interface ScorePickerProps {
  max: number;
  value: number | null;
  onChange: (score: number) => void;
}

export default function ScorePicker({ max, value, onChange }: ScorePickerProps) {
  const scores = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <div className="score-row">
      {scores.map((s) => (
        <button
          key={s}
          type="button"
          className={`score-btn${value === s ? ' selected' : ''}`}
          onClick={() => onChange(s)}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
