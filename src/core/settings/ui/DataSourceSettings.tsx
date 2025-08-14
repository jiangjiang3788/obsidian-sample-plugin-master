// src/core/settings/ui/DataSourceSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@state/AppStore';
import { DEFAULT_NAMES } from '@core/domain/constants';
import { Accordion, AccordionSummary, AccordionDetails, Typography, IconButton, Stack, Box, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { usePersistentState } from '@shared/hooks/usePersistentState';
import { LOCAL_STORAGE_KEYS } from '@core/domain/constants';
import { RuleList } from '@shared/components/form/RuleList';
import { getAllFields } from '@core/domain/schema';
import { DataStore } from '@core/services/dataStore';
import { useMemo } from 'preact/hooks';
import type { DataSource } from '@core/domain/schema';

function DataSourceEditor({ ds }: { ds: DataSource }) {
    const fieldOptions = useMemo(() => {
        const allItems = DataStore.instance.queryItems();
        return getAllFields(allItems);
    }, []);

    const handleUpdate = (updates: Partial<DataSource>) => {
        AppStore.instance.updateDataSource(ds.id, updates);
    };

    return (
        <Stack spacing={2}>
            <TextField
                label="数据源名称"
                defaultValue={ds.name} // 使用 defaultValue 避免光标跳动问题
                onBlur={(e) => handleUpdate({ name: (e.target as HTMLInputElement).value })}
                variant="filled"
            />
            <RuleList
                title="过滤规则"
                mode="filter"
                rows={ds.filters}
                fieldOptions={fieldOptions}
                onAdd={() => handleUpdate({ filters: [...ds.filters, { field: '', op: '=', value: '' }] })}
                onChange={(rows) => handleUpdate({ filters: rows })}
            />
            <RuleList
                title="排序规则"
                mode="sort"
                rows={ds.sort}
                fieldOptions={fieldOptions}
                onAdd={() => handleUpdate({ sort: [...ds.sort, { field: '', dir: 'asc' }] })}
                onChange={(rows) => handleUpdate({ sort: rows })}
            />
        </Stack>
    );
}

export function DataSourceSettings() {
    const dataSources = useStore(state => state.settings.dataSources);
    const [openId, setOpenId] = usePersistentState<string | null>(LOCAL_STORAGE_KEYS.SETTINGS_DATASOURCE_OPEN, null);

    const handleAdd = () => {
        const newName = DEFAULT_NAMES.NEW_DATASOURCE;
        AppStore.instance.addDataSource(newName).then(() => {
            const latestDs = AppStore.instance.getSettings().dataSources.at(-1);
            if (latestDs) setOpenId(latestDs.id);
        });
    };

    const handleDelete = (id: string) => {
        if (confirm('确认删除此数据源吗？引用此数据源的视图将失效。')) {
            AppStore.instance.deleteDataSource(id);
        }
    };

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">管理数据源</Typography>
                <IconButton onClick={handleAdd} title="新增数据源"><AddIcon /></IconButton>
            </Stack>
            <Stack spacing={1}>
                {dataSources.map(ds => (
                    <Accordion
                        key={ds.id}
                        expanded={openId === ds.id}
                        onChange={() => setOpenId(openId === ds.id ? null : ds.id)}
                        disableGutters
                        elevation={2}
                        sx={{ '&:before': { display: 'none' } }}
                    >
                        <AccordionSummary
                            sx={{
                                minHeight: 40,
                                '& .MuiAccordionSummary-content': { my: '10px' },
                                cursor: 'pointer',
                            }}
                        >
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                                <Typography fontWeight={500}>{ds.name}</Typography>
                                <IconButton size="small" color="error" onClick={e => { e.stopPropagation(); handleDelete(ds.id); }} title="删除" sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                        </AccordionSummary>
                        <AccordionDetails sx={{ bgcolor: 'action.hover', borderTop: '1px solid var(--background-modifier-border)' }}>
                            <DataSourceEditor ds={ds} />
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Stack>
        </Box>
    );
}