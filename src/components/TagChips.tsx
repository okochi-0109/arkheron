interface TagChipsProps {
  tags: string[];
  selected: string[];
  onToggle: (tag: string) => void;
}

export default function TagChips({ tags, selected, onToggle }: TagChipsProps) {
  return (
    <div className="tag-chip-row">
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          className={`tag-chip${selected.includes(tag) ? ' selected' : ''}`}
          onClick={() => onToggle(tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
