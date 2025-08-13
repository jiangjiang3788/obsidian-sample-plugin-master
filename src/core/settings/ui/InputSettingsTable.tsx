// src/core/settings/ui/InputSettingsTable.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import {
  Box, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Tooltip, TextField, Button, Stack, Typography, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import { Notice } from 'obsidian';
import type { ThinkSettings } from '../../../main';
import { ActionDialog } from '@shared/components';

const ROW_PADDING_Y = 0.3;
const CELL_PADDING_X = 1;

interface Props {
  settings: ThinkSettings['inputSettings'];
  onSave: (newSettings: ThinkSettings['inputSettings']) => void;
}

type DialogType = 'editJson' | 'addTheme' | 'deleteTheme' | 'editIcon';
interface DialogState {
  type: DialogType | null;
  data: any;
}

export function InputSettingsTable({ settings, onSave }: Props) {
  const data = useMemo(() => {
    const raw = structuredClone(settings) || { base: {}, themes: [] };
    raw.base ??= {};
    raw.themes ??= [];
    return raw;
  }, [settings]);

  const blockKeys = useMemo(() => {
    const s = new Set<string>();
    (data.themes as any[]).forEach((t: any) => Object.keys(t.blocks ?? {}).forEach(k => s.add(k)));
    Object.keys(data.base.blocks ?? {}).forEach(k => s.add(k));
    return Array.from(s).sort();
  }, [data]);

  const [dialog, setDialog] = useState<DialogState>({ type: null, data: {} });
  const [editText, setEditText] = useState('');

  const closeDialog = () => setDialog({ type: null, data: {} });

  const openEditDialog = (themeIdx: number, type: string) => {
    const obj = themeIdx < 0
      ? (type === 'task' ? data.base.task ?? {} : data.base.blocks?.[type] ?? {})
      : (type === 'task' ? (data.themes[themeIdx] as any).task ?? {} : (data.themes[themeIdx] as any).blocks?.[type] ?? {});
    setEditText(JSON.stringify(obj, null, 2));
    setDialog({ type: 'editJson', data: { themeIdx, type } });
  };

  const saveEdit = () => {
    const { themeIdx, type } = dialog.data;
    let obj;
    try { obj = JSON.parse(editText || '{}'); }
    catch { new Notice('JSON 解析失败'); return; }

    const newData = structuredClone(data);
    if (themeIdx < 0) {
      if (type === 'task') (newData.base as any).task = obj;
      else {
        (newData.base as any).blocks ??= {};
        (newData.base as any).blocks[type] = obj;
      }
    } else {
      const th = (newData.themes as any[])[themeIdx];
      if (type === 'task') th.task = obj;
      else {
        th.blocks ??= {};
        th.blocks[type] = obj;
      }
    }
    onSave(newData);
    new Notice('已保存设置');
    closeDialog();
  };

  const confirmAdd = () => {
    const path = (dialog.data.newPath || '').trim();
    if (!path) return;
    if ((data.themes as any[]).some((t: any) => t.path === path)) { new Notice('该主题已存在'); return; }

    const newData = structuredClone(data);
    (newData.themes as any[]).push({ path });
    onSave(newData);
    new Notice('已新增主题');
    closeDialog();
  };

  const confirmDelete = () => {
    const { themeIdx } = dialog.data;
    if (themeIdx === null) return;
    const newData = structuredClone(data);
    const removed = (newData.themes as any[]).splice(themeIdx, 1)[0];
    onSave(newData);
    new Notice(`已删除主题「${removed.path}」`);
    closeDialog();
  };
  
  const saveIcon = () => {
    const { themeIdx, value } = dialog.data;
    if (themeIdx === null) return;
    const newData = structuredClone(data);
    const v = (value || '').trim();
    (newData.themes as any[])[themeIdx].icon = v || undefined;
    onSave(newData);
    new Notice('已保存图标');
    closeDialog();
  };

  const renderCell = (cfg: any, inherited: boolean, themeIdx: number, type: string) => {
    const enabled = cfg?.enabled ?? true;
    const symbol = enabled ? (inherited ? '🔽' : '📄') : '❌';
    const tip = !enabled ? '禁用' : (inherited ? '继承' : '覆写');

    return (
      <TableCell
        sx={{ cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'center', py: ROW_PADDING_Y, px: CELL_PADDING_X }}
        onClick={() => openEditDialog(themeIdx, type)}
        title={`单击编辑 / 粘贴 JSON（当前：${tip}）`}
      >
        {symbol}
      </TableCell>
    );
  };
  
    const getCfg = (themeIdx: number, type: string) => {
        if (themeIdx < 0) return [(data.base as any).task ?? {}, false] as [any, boolean];
        const th = (data.themes as any[])[themeIdx];
        const child = type === 'task' ? th.task : th.blocks?.[type];
        const parent = type === 'task' ? (data.base as any).task : (data.base as any).blocks?.[type];
        const inh = !child || Object.keys(child).length === 0;
        const cfg = child ?? parent ?? {};
        return [cfg, inh] as [any, boolean];
    };


  return (
    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }} class="think-setting-root">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography fontWeight={600}>通用输入设置</Typography>
        <Tooltip title="新增主题">
          <IconButton size="small" onClick={() => setDialog({ type: 'addTheme', data: { newPath: '' } })}><AddIcon /></IconButton>
        </Tooltip>
      </Stack>
      <Divider sx={{ mb: 1.5 }} />

      <Table size="small" sx={{ '& th, & td': { whiteSpace: 'nowrap', py: ROW_PADDING_Y, px: CELL_PADDING_X } }} className="think-setting-table">
          <TableHead>
             <TableRow>
               <TableCell>主题路径</TableCell>
               <TableCell align="center">图标</TableCell>
               <TableCell align="center">Task</TableCell>
               {blockKeys.map(k => (
                 <TableCell key={k} align="center">{k}</TableCell>
               ))}
               <TableCell />
             </TableRow>
           </TableHead>
           <TableBody>
             <TableRow sx={{ bgcolor: '#f7f7f7', '& > *': { py: ROW_PADDING_Y, px: CELL_PADDING_X } }}>
               <TableCell><strong>Base（共性默认）</strong></TableCell>
               <TableCell align="center" />
               {renderCell((data.base as any).task ?? {}, false, -1, 'task')}
               {blockKeys.map(k => renderCell((data.base as any).blocks?.[k] ?? {}, false, -1, k))}
               <TableCell />
             </TableRow>

             {(data.themes as any[]).map((th: any, idx: number) => (
               <TableRow key={th.path} sx={{ '& > *': { py: ROW_PADDING_Y, px: CELL_PADDING_X } }}>
                 <TableCell>{th.path}</TableCell>

                 <TableCell
                   align="center"
                   sx={{ cursor: 'pointer' }}
                   title="单击编辑图标（可输入文字或表情；留空=不显示）"
                   onClick={() => setDialog({ type: 'editIcon', data: { themeIdx: idx, value: th.icon ?? '' } })}
                 >
                   {th.icon ?? ''}
                 </TableCell>

                 {(() => {
                   const [cfg, inh] = getCfg(idx, 'task');
                   return renderCell(cfg, inh, idx, 'task');
                 })()}

                 {blockKeys.map(k => {
                   const child = th.blocks?.[k];
                   const inh = !child || Object.keys(child).length === 0;
                   const cfg = child ?? (data.base as any).blocks?.[k] ?? {};
                   return renderCell(cfg, inh, idx, k);
                 })}

                 <TableCell align="center">
                   <Tooltip title="删除主题">
                     <DeleteIcon
                       sx={{ cursor: 'pointer', color: 'error.main' }}
                       onClick={() => setDialog({ type: 'deleteTheme', data: { themeIdx: idx, path: th.path } })}
                     />
                   </Tooltip>
                 </TableCell>
               </TableRow>
             ))}
           </TableBody>
      </Table>

      {/* JSON 编辑弹窗 */}
      <ActionDialog
        isOpen={dialog.type === 'editJson'}
        onClose={closeDialog}
        title={`编辑配置 (${(data.themes as any[])[dialog.data.themeIdx]?.path || 'Base'} → ${dialog.data.type})`}
        actions={[
          <Button onClick={closeDialog}>取消</Button>,
          <Button startIcon={<SaveIcon />} onClick={saveEdit}>保存</Button>
        ]}
      >
        <TextField
          multiline minRows={12} fullWidth
          value={editText}
          onChange={e => setEditText((e.target as HTMLInputElement).value)}
          onKeyDown={e => e.stopPropagation()}
          sx={{ fontFamily: 'monospace' }}
        />
      </ActionDialog>

      {/* 图标编辑弹窗 */}
      <ActionDialog
        isOpen={dialog.type === 'editIcon'}
        onClose={closeDialog}
        maxWidth="xs"
        title={`编辑图标 (${(data.themes as any[])[dialog.data.themeIdx]?.path})`}
        actions={[
          <Button onClick={closeDialog}>取消</Button>,
          <Button startIcon={<SaveIcon />} onClick={saveIcon}>保存</Button>
        ]}
      >
        <TextField
          autoFocus fullWidth
          placeholder="可输入文字或表情，如 ✨ / 😴 / 💪"
          value={dialog.data.value}
          onChange={e => setDialog(d => ({ ...d, data: { ...d.data, value: (e.target as HTMLInputElement).value } }))}
          onKeyDown={e => e.stopPropagation()}
        />
      </ActionDialog>

      {/* 新增主题弹窗 */}
      <ActionDialog
        isOpen={dialog.type === 'addTheme'}
        onClose={closeDialog}
        maxWidth="xs"
        title="新增主题路径"
        actions={[
          <Button onClick={closeDialog}>取消</Button>,
          <Button onClick={confirmAdd}>添加</Button>
        ]}
      >
        <TextField
          fullWidth autoFocus
          placeholder="如 健康/饮食"
          value={dialog.data.newPath}
          onChange={e => setDialog(d => ({ ...d, data: { ...d.data, newPath: (e.target as HTMLInputElement).value } }))}
          onKeyDown={e => {
            e.stopPropagation();
            if ((e as any).key === 'Enter') { e.preventDefault(); confirmAdd(); }
          }}
        />
      </ActionDialog>

      {/* 删除确认弹窗 */}
      <ActionDialog
        isOpen={dialog.type === 'deleteTheme'}
        onClose={closeDialog}
        maxWidth="xs"
        title="确认删除"
        actions={[
          <Button onClick={closeDialog}>取消</Button>,
          <Button color="error" onClick={confirmDelete}>删除</Button>
        ]}
      >
        确认删除主题「{dialog.data.path}」？
      </ActionDialog>
    </Box>
  );
}