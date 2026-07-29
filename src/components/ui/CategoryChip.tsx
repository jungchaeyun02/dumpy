'use client';

import type { Category } from '@/types';
import { categoryLabel } from '@/lib/utils/messages';

interface CategoryChipProps {
  category: Category;
  selected: boolean;
  onClick: () => void;
}

export function CategoryChip({ category, selected, onClick }: CategoryChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`chip ${selected ? 'chip-selected' : 'chip-unselected'}`}
    >
      {categoryLabel[category]}
    </button>
  );
}

interface CategoryChipsProps {
  selectedCategory: Category | null;
  onSelect: (category: Category | null) => void;
}

export function CategoryChips({ selectedCategory, onSelect }: CategoryChipsProps) {
  const categories: Category[] = ['할일', '일기', '모아둔것', '그외'];

  return (
    <div className="flex gap-2 flex-wrap">
      {categories.map((category) => (
        <CategoryChip
          key={category}
          category={category}
          selected={selectedCategory === category}
          onClick={() => {
            // 이미 선택된 칩을 다시 누르면 선택 해제
            onSelect(selectedCategory === category ? null : category);
          }}
        />
      ))}
    </div>
  );
}
