/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import { 
    Popover, 
    FormGroup, 
    FormControlLabel, 
    Checkbox, 
    Button,
    Box,
    Typography,
    Chip,
    IconButton
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useStore } from '@core/stores/AppStore';
import type { ViewInstance } from '@core/types/domain/schema';

// Type compatibility
const AnyButton = Button as any;
const AnyPopover = Popover as any;
const AnyBox = Box as any;
const AnyTypography = Typography as any;
const AnyChip = Chip as any;
const AnyFormGroup = FormGroup as any;
const AnyFormControlLabel = FormControlLabel as any;
const AnyCheckbox = Checkbox as any;

interface CategoryFilterProps {
    selectedCategories: string[];
    onSelectionChange: (categories: string[]) => void;
    viewInstances: ViewInstance[];
}

export function CategoryFilter({ selectedCategories, onSelectionChange, viewInstances }: CategoryFilterProps) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const allCategories = useMemo(() => {
        const categorySet = new Set<string>();
        viewInstances.forEach(view => {
            if (view.viewType === 'StatisticsView' && view.viewConfig?.categories) {
                view.viewConfig.categories.forEach((cat: any) => {
                    if (cat.name) {
                        categorySet.add(cat.name);
                    }
                });
            }
        });
        return Array.from(categorySet);
    }, [viewInstances]);

    const handleClick = (event: any) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleToggleCategory = (categoryName: string) => {
        const newSelection = selectedCategories.includes(categoryName)
            ? selectedCategories.filter(c => c !== categoryName)
            : [...selectedCategories, categoryName];
        onSelectionChange(newSelection);
    };

    const handleSelectAll = () => {
        onSelectionChange(allCategories);
    };

    const handleClearAll = () => {
        onSelectionChange([]);
    };

    const open = Boolean(anchorEl);
    const selectedCount = selectedCategories.length;
    const totalCount = allCategories.length;

    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '8px' }}>
            <AnyButton
                size="small"
                variant={selectedCount > 0 && selectedCount < totalCount ? 'contained' : 'outlined'}
                startIcon={<FilterListIcon />}
                onClick={handleClick}
                sx={{ textTransform: 'none' }}
            >
                分类筛选 {selectedCount > 0 && selectedCount < totalCount && `(${selectedCount}/${totalCount})`}
            </AnyButton>

            {selectedCount > 0 && selectedCount < totalCount && (
                <div style={{ marginLeft: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {selectedCategories.slice(0, 3).map(cat => (
                        <AnyChip
                            key={cat}
                            label={cat}
                            size="small"
                            onDelete={() => handleToggleCategory(cat)}
                            sx={{ height: '20px', fontSize: '0.75rem' }}
                        />
                    ))}
                    {selectedCategories.length > 3 && (
                        <AnyChip
                            label={`+${selectedCategories.length - 3}`}
                            size="small"
                            sx={{ height: '20px', fontSize: '0.75rem' }}
                        />
                    )}
                </div>
            )}

            <AnyPopover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
            >
                <AnyBox sx={{ p: 2, minWidth: '250px', maxWidth: '400px', maxHeight: '500px', overflowY: 'auto' }}>
                    <AnyTypography variant="subtitle2" gutterBottom>
                        选择要显示的分类
                    </AnyTypography>
                    
                    <AnyBox sx={{ mb: 1, display: 'flex', gap: 1 }}>
                        <AnyButton size="small" onClick={handleSelectAll}>
                            全选
                        </AnyButton>
                        <AnyButton size="small" onClick={handleClearAll}>
                            清空
                        </AnyButton>
                    </AnyBox>

                    {allCategories.length === 0 ? (
                        <AnyTypography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            暂无分类
                        </AnyTypography>
                    ) : (
                        <AnyFormGroup>
                            {allCategories.map(cat => (
                                <AnyFormControlLabel
                                    key={cat}
                                    control={
                                        <AnyCheckbox
                                            size="small"
                                            checked={selectedCategories.includes(cat)}
                                            onChange={() => handleToggleCategory(cat)}
                                        />
                                    }
                                    label={<span style={{ fontSize: '0.875rem' }}>{cat}</span>}
                                />
                            ))}
                        </AnyFormGroup>
                    )}
                </AnyBox>
            </AnyPopover>
        </div>
    );
}
