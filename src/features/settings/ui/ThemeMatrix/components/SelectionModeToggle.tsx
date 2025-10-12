/** @jsxImportSource preact */
import { h } from 'preact';
import {
    ToggleButtonGroup,
    ToggleButton,
    Tooltip,
    Badge,
    Box
} from '@mui/material';
import TableRowsIcon from '@mui/icons-material/TableRows';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import GridOnIcon from '@mui/icons-material/GridOn';
import type { SelectionMode, SelectionStats } from '../types/selection.types';

interface SelectionModeToggleProps {
    /** 当前选择模式 */
    mode: SelectionMode;
    /** 选择模式改变回调 */
    onChange: (mode: SelectionMode) => void;
    /** 选择统计信息 */
    selectionStats: SelectionStats;
    /** 是否禁用 */
    disabled?: boolean;
}

/**
 * 选择模式切换组件
 */
export function SelectionModeToggle({
    mode,
    onChange,
    selectionStats,
    disabled = false
}: SelectionModeToggleProps) {
    const handleChange = (_: any, newMode: SelectionMode | null) => {
        if (newMode !== null) {
            onChange(newMode);
        }
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ToggleButtonGroup
                value={mode}
                exclusive
                onChange={handleChange}
                size="small"
                disabled={disabled}
                sx={{
                    '& .MuiToggleButton-root': {
                        px: 1.5,
                        py: 0.5,
                        '&.Mui-selected': {
                            backgroundColor: 'primary.main',
                            color: 'primary.contrastText',
                            '&:hover': {
                                backgroundColor: 'primary.dark',
                            }
                        }
                    }
                }}
            >
                <ToggleButton value="theme">
                    <Tooltip title={`主题模式 - 选择整个主题行`}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <TableRowsIcon fontSize="small" />
                            {selectionStats.themes > 0 && (
                                <Badge 
                                    badgeContent={selectionStats.themes} 
                                    color="secondary"
                                    max={99}
                                    sx={{ 
                                        '& .MuiBadge-badge': { 
                                            fontSize: '0.7rem',
                                            height: '16px',
                                            minWidth: '16px',
                                            padding: '0 4px'
                                        } 
                                    }}
                                />
                            )}
                        </Box>
                    </Tooltip>
                </ToggleButton>
                
                <ToggleButton value="block">
                    <Tooltip title={`Block模式 - 选择整个Block列`}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <ViewColumnIcon fontSize="small" />
                            {selectionStats.blocks > 0 && (
                                <Badge 
                                    badgeContent={selectionStats.blocks} 
                                    color="secondary"
                                    max={99}
                                    sx={{ 
                                        '& .MuiBadge-badge': { 
                                            fontSize: '0.7rem',
                                            height: '16px',
                                            minWidth: '16px',
                                            padding: '0 4px'
                                        } 
                                    }}
                                />
                            )}
                        </Box>
                    </Tooltip>
                </ToggleButton>
                
                <ToggleButton value="cell">
                    <Tooltip title={`单元格模式 - 选择特定的主题-Block组合`}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <GridOnIcon fontSize="small" />
                            {selectionStats.cells > 0 && (
                                <Badge 
                                    badgeContent={selectionStats.cells} 
                                    color="secondary"
                                    max={99}
                                    sx={{ 
                                        '& .MuiBadge-badge': { 
                                            fontSize: '0.7rem',
                                            height: '16px',
                                            minWidth: '16px',
                                            padding: '0 4px'
                                        } 
                                    }}
                                />
                            )}
                        </Box>
                    </Tooltip>
                </ToggleButton>
            </ToggleButtonGroup>
            
            {/* 显示总选择数 */}
            {selectionStats.total > 0 && (
                <Box sx={{ 
                    ml: 1, 
                    px: 1, 
                    py: 0.5, 
                    borderRadius: 1,
                    backgroundColor: 'action.selected',
                    fontSize: '0.875rem'
                }}>
                    已选择 {selectionStats.total} 项
                </Box>
            )}
        </Box>
    );
}
