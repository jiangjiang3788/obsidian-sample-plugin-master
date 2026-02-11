/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, Chip, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Switch, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { ThemeTreeSelect } from '@shared/public';
import type { ThemeDefinition } from '@core/public';

export interface BlockDefinition {
    id: string;
    name: string;
}

export interface FiltersBarProps {
    enableRetrieval: boolean;
    setEnableRetrieval: (enabled: boolean) => void;
    themes: ThemeDefinition[];
    selectedThemes: string[];
    setSelectedThemes: (themes: string[]) => void;
    selectedType: string;
    setSelectedType: (t: string) => void;
    blocks: BlockDefinition[];
    selectedBlockId: string;
    setSelectedBlockId: (id: string) => void;
    indexItemCount: number;
}

export function FiltersBar({
    enableRetrieval,
    setEnableRetrieval,
    themes,
    selectedThemes,
    setSelectedThemes,
    selectedType,
    setSelectedType,
    blocks,
    selectedBlockId,
    setSelectedBlockId,
    indexItemCount,
}: FiltersBarProps) {
    return (
        <Box
            sx={{
                p: 1.5,
                borderBottom: '1px solid var(--background-modifier-border)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                flexWrap: 'wrap',
            }}
        >
            {/* 上下文检索开关 */}
            <FormControlLabel
                control={
                    <Switch
                        checked={enableRetrieval}
                        onChange={(e: any) => setEnableRetrieval(e.target.checked)}
                        size="small"
                    />
                }
                label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <SearchIcon fontSize="small" />
                        <Typography variant="body2">引用上下文</Typography>
                    </Box>
                }
            />

            {/* 主题过滤 - 使用统一的 ThemeTreeSelect 组件 */}
            {enableRetrieval && themes.length > 0 && (
                <ThemeTreeSelect
                    themes={themes}
                    selectedPaths={selectedThemes}
                    onSelectMultiple={setSelectedThemes}
                    multiSelect={true}
                    searchable={true}
                    placeholder="选择主题"
                    size="small"
                    sx={{ minWidth: 150 }}
                />
            )}

            {/* 类型过滤 */}
            {enableRetrieval && (
                <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel>类型</InputLabel>
                    <Select value={selectedType} label="类型" onChange={(e: any) => setSelectedType(e.target.value)}>
                        <MenuItem value="">全部</MenuItem>
                        <MenuItem value="task">任务</MenuItem>
                        <MenuItem value="block">记录</MenuItem>
                    </Select>
                </FormControl>
            )}

            {/* Block 模板过滤 (当选择"记录"类型时显示) */}
            {enableRetrieval && selectedType === 'block' && blocks.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>记录类型</InputLabel>
                    <Select
                        value={selectedBlockId}
                        label="记录类型"
                        onChange={(e: any) => setSelectedBlockId(e.target.value)}
                    >
                        <MenuItem value="">全部记录</MenuItem>
                        {blocks.map(b => (
                            <MenuItem key={b.id} value={b.id}>
                                {b.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            )}

            {/* 索引状态 */}
            {enableRetrieval && <Chip size="small" label={`索引: ${indexItemCount} 条`} variant="outlined" />}
        </Box>
    );
}
