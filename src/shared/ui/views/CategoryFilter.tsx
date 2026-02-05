// @ts-nocheck
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { Checkbox, FormControlLabel, FormGroup } from '@mui/material';

import type { ViewInstance } from '@core/public';
import { collectCategoriesFromViews } from '@core/public';
import { FilterPopover } from '@shared/ui/components/FilterPopover';

interface CategoryFilterProps {
  selectedCategories: string[];
  onSelectionChange: (categories: string[]) => void;
  viewInstances: ViewInstance[];
  predefinedCategories?: string[];
}

export function CategoryFilter({
  selectedCategories,
  onSelectionChange,
  viewInstances,
  predefinedCategories = [],
}: CategoryFilterProps) {
  const allCategories = useMemo(() => {
    return collectCategoriesFromViews(viewInstances, predefinedCategories);
  }, [viewInstances, predefinedCategories]);

  const handleToggleCategory = (categoryName: string) => {
    const newSelection = selectedCategories.includes(categoryName)
      ? selectedCategories.filter((c) => c !== categoryName)
      : [...selectedCategories, categoryName];
    onSelectionChange(newSelection);
  };

  return (
    <FilterPopover
      label="分类筛选"
      popoverTitle="选择要显示的分类"
      selectedKeys={selectedCategories}
      totalCount={allCategories.length}
      getChipLabel={(k) => k}
      onDeleteKey={handleToggleCategory}
      onSelectAll={() => onSelectionChange(allCategories)}
      onClearAll={() => onSelectionChange([])}
      isEmpty={allCategories.length === 0}
      emptyText="暂无分类"
    >
      <FormGroup>
        {allCategories.map((cat) => (
          <FormControlLabel
            key={cat}
            control={<Checkbox size="small" checked={selectedCategories.includes(cat)} onChange={() => handleToggleCategory(cat)} />}
            label={<span class="text-md">{cat}</span>}
          />
        ))}
      </FormGroup>
    </FilterPopover>
  );
}
