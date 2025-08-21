// src/core/settings/ui/DataSourceSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@state/AppStore';
import { DEFAULT_NAMES } from '@core/domain/constants';
import { Typography, IconButton, Stack, Box, TextField, Tooltip } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { usePersistentState } from '@shared/hooks/usePersistentState';
import { LOCAL_STORAGE_KEYS } from '@core/domain/constants';
import { getAllFields } from '@core/domain/schema';
import { DataStore } from '@core/services/dataStore';
import { useMemo, useState, useEffect } from 'preact/hooks';
import type { DataSource } from '@core/domain/schema';
import { EditableAccordionList } from './components/EditableAccordionList';
import { RuleBuilder } from './components/RuleBuilder'; // [修改] 从新文件中导入 RuleBuilder

// [移除] useUniqueFieldValues, defaultFilterRule, defaultSortRule 和 RuleBuilder 组件的定义，它们已移至 RuleBuilder.tsx

function DataSourceEditor({ ds }: { ds: DataSource }) {
    const fieldOptions = useMemo(() => {
        const allItems = DataStore.instance.queryItems();
        return getAllFields(allItems);
    }, []);
    const [name, setName] = useState(ds.name);

    useEffect(() => {
        setName(ds.name);
    }, [ds]);

    const handleUpdate = (updates: Partial<DataSource>) => {
        AppStore.instance.updateDataSource(ds.id, updates);
    };

    const handleNameBlur = () => {
        if (name !== ds.name) {
            handleUpdate({ name: name });
        }
    };

    return (
        <Stack spacing={2} sx={{p: '8px 16px'}}>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Typography sx={{ width: '80px', flexShrink: 0, fontWeight: 500 }}>名称</Typography>
                <TextField variant="outlined" size="small" value={name} onChange={e => setName((e.target as HTMLInputElement).value)} onBlur={handleNameBlur} sx={{maxWidth: '400px'}} />
            </Stack>
            {/* [修改] 此处现在使用的是导入的 RuleBuilder 组件 */}
            <RuleBuilder title="过滤规则" mode="filter" rows={ds.filters} fieldOptions={fieldOptions} onChange={(rows: any) => handleUpdate({ filters: rows })} />
            <RuleBuilder title="排序规则" mode="sort" rows={ds.sort} fieldOptions={fieldOptions} onChange={(rows: any) => handleUpdate({ sort: rows })} />
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

    return (
        <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Typography variant="h6">管理数据源</Typography>
                <Tooltip title="新增数据源">
                    <IconButton onClick={handleAdd} color="success">
                        <AddCircleOutlineIcon />
                    </IconButton>
                </Tooltip>
            </Stack>

            <EditableAccordionList
                items={dataSources}
                getItemTitle={(ds) => ds.name}
                renderItem={(ds) => <DataSourceEditor ds={ds} />}
                openId={openId}
                setOpenId={setOpenId}
                onDeleteItem={(id) => AppStore.instance.deleteDataSource(id)}
                onMoveItem={(id, direction) => AppStore.instance.moveDataSource(id, direction)}
                onDuplicateItem={(id) => AppStore.instance.duplicateDataSource(id)}
                deleteConfirmationText={(name) => `确认删除数据源 "${name}" 吗？\n引用此数据源的视图将失效。`}
            />
        </Box>
    );
}