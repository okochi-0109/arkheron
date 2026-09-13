import type { ReactNode } from 'react';
import type { Student } from '../db';

interface StudentChoiceGridProps {
  students: Student[] | undefined;
  selectedId?: number | null;
  onSelect: (id: number) => void;
  renderTag?: (student: Student) => ReactNode;
}

export default function StudentChoiceGrid({
  students,
  selectedId,
  onSelect,
  renderTag,
}: StudentChoiceGridProps) {
  return (
    <div className="choice-grid">
      {students?.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`choice-btn${selectedId === s.id ? ' selected' : ''}`}
          onClick={() => onSelect(s.id!)}
        >
          {renderTag ? (
            <span>
              {s.name}
              {renderTag(s)}
            </span>
          ) : (
            s.name
          )}
        </button>
      ))}
    </div>
  );
}
