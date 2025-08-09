// src/features/settings/ui/InputSettingsTable.tsx
/** @jsxImportSource preact */
// InputSettingsTable.tsx —— 紧凑表格 UI（支持 bare 模式：不包外框）

import { h } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import {
  Box, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  TextField, DialogActions, Button, Stack, Typography, Divider
} from '@mui/material';
import AddIcon       from '@mui/icons-material/Add';
import SaveIcon      from '@mui/icons-material/Save';
import DeleteIcon    from '@mui/icons-material/Delete';
import type ThinkPlugin from '../../../main';
import { Notice } from 'obsidian';

const ROW_PADDING_Y = 0.3;
const CELL_PADDING_X = 1;

interface Props {
  plugin: ThinkPlugin;
  /** bare=true 时不自带圆角白底边框 */
  bare?: boolean;
}

export function InputSettingsTable({ plugin, bare = false }: Props) {
  const [refresh, setRefresh] = useState(0);

  const data = useMemo(() => {
    const raw = plugin.inputSettings || { base: {}, themes: [] };
    raw.base   ??= {};
    raw.themes ??= [];
    return raw;
  }, [plugin.inputSettings, refresh]);

  const blockKeys = useMemo(() => {
    const s = new Set<string>();
    (data.themes as any[]).forEach((t: any) => Object.keys(t.blocks ?? {}).forEach(k => s.add(k)));
    Object.keys(data.base.blocks ?? {}).forEach(k => s.add(k));
    return Array.from(s).sort();
  }, [data]);

  const [editing, setEditing] = useState<{ themeIdx: number; type: string; json: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newPath, setNewPath] = useState('');
  const [delIdx,  setDelIdx]  = useState<number | null>(null);
  const [iconEdit, setIconEdit] = useState<{ themeIdx: number; value: string } | null>(null);

  const openEdit = (themeIdx: number, type: string) => {
    const obj = themeIdx < 0
      ? (type === 'task' ? data.base.task ?? {} : data.base.blocks?.[type] ?? {})
      : (type === 'task' ? (data.themes[themeIdx] as any).task ?? {} : (data.themes[themeIdx] as any).blocks?.[type] ?? {});
    setEditing({ themeIdx, type, json: JSON.stringify(obj, null, 2) });
  };
  const saveEdit = () => {
    if (!editing) return;
    let obj;
    try { obj = JSON.parse(editing.json || '{}'); }
    catch { new Notice('JSON 解析失败'); return; }

    if (editing.themeIdx < 0) {
      if (editing.type === 'task') (data.base as any).task = obj;
      else {
        (data.base as any).blocks ??= {};
        (data.base as any).blocks[editing.type] = obj;
      }
    } else {
      const th = (data.themes as any[])[editing.themeIdx];
      if (editing.type === 'task') th.task = obj;
      else {
        th.blocks ??= {};
        th.blocks[editing.type] = obj;
      }
    }
    plugin.inputSettings = data;
    plugin.persistAll().then(() => {
      new Notice('已保存设置');
      setEditing(null);
      setRefresh(r => r + 1);
    });
  };

  const confirmAdd = () => {
    const path = newPath.trim();
    if (!path) return;
    if ((data.themes as any[]).some((t: any) => t.path === path)) { new Notice('该主题已存在'); return; }
    (data.themes as any[]).push({ path });
    plugin.inputSettings = data;
    plugin.persistAll().then(() => {
      new Notice('已新增主题');
      setAddOpen(false); setNewPath(''); setRefresh(r => r + 1);
    });
  };
  const confirmDelete = () => {
    if (delIdx === null) return;
    const removed = (data.themes as any[]).splice(delIdx, 1)[0];
    plugin.inputSettings = data;
    plugin.persistAll().then(() => {
      new Notice(`已删除主题「${removed.path}」`);
      setDelIdx(null); setRefresh(r => r + 1);
    });
  };

  const renderCell = (cfg: any, inherited: boolean, themeIdx: number, type: string) => {
    const enabled = cfg?.enabled ?? true;
    const symbol  = enabled ? (inherited ? '🔽' : '📄') : '❌';
    const tip     = !enabled ? '禁用' : (inherited ? '继承' : '覆写');
    return (
      <TableCell
        sx={{ cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'center', py: ROW_PADDING_Y, px: CELL_PADDING_X }}
        onClick={() => openEdit(themeIdx, type)}
        title={`单击编辑 / 粘贴 JSON（当前：${tip}）`}
      >
        {symbol}
      </TableCell>
    );
  };
  const getCfg = (themeIdx: number, type: string) => {
    if (themeIdx < 0) return [(data.base as any).task ?? {}, false] as [any, boolean];
    const th     = (data.themes as any[])[themeIdx];
    const child  = type === 'task' ? th.task : th.blocks?.[type];
    const parent = type === 'task' ? (data.base as any).task : (data.base as any).blocks?.[type];
    const inh    = !child || Object.keys(child).length === 0;
    const cfg    = child ?? parent ?? {};
    return [cfg, inh] as [any, boolean];
  };

  const containerSx = bare
    ? { p: 0, border: 0, bgcolor: 'transparent' }
    : { p: 2, border: 1, borderColor: 'divider', borderRadius: 0, bgcolor: 'background.paper' };

  return (
    <Box sx={containerSx}>
      {!bare && (
        <div>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography fontWeight={600}>通用输入设置</Typography>
            <Tooltip title="新增主题">
              <IconButton size="small" onClick={() => setAddOpen(true)}><AddIcon/></IconButton>
            </Tooltip>
          </Stack>
          <Divider sx={{ mb: 1.5 }} />
        </div>
      )}

      <Table size="small" class="think-setting-table"
        sx={{ '& th, & td': { whiteSpace: 'nowrap', py: ROW_PADDING_Y, px: CELL_PADDING_X } }}>
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
                class="icon-cell"
                sx={{ cursor: 'pointer' }}
                title="单击编辑图标（可输入文字或表情；留空=不显示）"
                onClick={() => setIconEdit({ themeIdx: idx, value: th.icon ?? '' })}
              >
                {th.icon ?? ''}
              </TableCell>

              {(() => {
                const [cfg, inh] = getCfg(idx, 'task');
                return renderCell(cfg, inh, idx, 'task');
              })()}

              {blockKeys.map(k => {
                const child = th.blocks?.[k];
                const inh   = !child || Object.keys(child).length === 0;
                const cfg   = child ?? (data.base as any).blocks?.[k] ?? {};
                return renderCell(cfg, inh, idx, k);
              })}

              <TableCell align="center">
                <Tooltip title="删除主题">
                  <DeleteIcon
                    sx={{ cursor: 'pointer', color: 'error.main' }}
                    onClick={() => setDelIdx(idx)}
                  />
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* JSON 编辑 */}
      <Dialog open={!!editing} fullWidth maxWidth="sm" disablePortal onClose={() => setEditing(null)}>
        {editing && [
          <DialogTitle key="t">编辑配置（{editing.themeIdx < 0 ? 'Base' : (data.themes as any[])[editing.themeIdx].path} → {editing.type}）</DialogTitle>,
          <DialogContent key="c">
            <TextField
              multiline minRows={12} fullWidth
              value={editing.json}
              onChange={e => setEditing(p => p ? { ...p, json: (e.target as HTMLInputElement).value } : p)}
              onKeyDown={e => e.stopPropagation()}
              sx={{ fontFamily: 'monospace' }}
            />
          </DialogContent>,
          <DialogActions key="a">
            <Button onClick={() => setEditing(null)}>取消</Button>
            <Button startIcon={<SaveIcon />} onClick={saveEdit}>保存</Button>
          </DialogActions>,
        ]}
      </Dialog>

      {/* 图标编辑 */}
      <Dialog open={!!iconEdit} maxWidth="xs" fullWidth disablePortal onClose={() => setIconEdit(null)}>
        {iconEdit && [
          <DialogTitle key="t">编辑图标（{(data.themes as any[])[iconEdit.themeIdx].path}）</DialogTitle>,
          <DialogContent key="c">
            <TextField
              autoFocus fullWidth
              placeholder="可输入文字或表情，如 ✨ / 😴 / 💪"
              value={iconEdit.value}
              onChange={e => setIconEdit(p => p ? ({ ...p, value: (e.target as HTMLInputElement).value }) : p)}
              onKeyDown={e => e.stopPropagation()}
            />
          </DialogContent>,
          <DialogActions key="a">
            <Button onClick={() => setIconEdit(null)}>取消</Button>
            <Button
              startIcon={<SaveIcon />}
              onClick={() => {
                const v = (iconEdit.value || '').trim();
                (data.themes as any[])[iconEdit.themeIdx].icon = v || undefined;
                plugin.inputSettings = data;
                plugin.persistAll().then(() => {
                  new Notice('已保存图标');
                  setIconEdit(null);
                  setRefresh(r => r + 1);
                });
              }}
            >
              保存
            </Button>
          </DialogActions>,
        ]}
      </Dialog>

      {/* 新增主题 */}
      <Dialog open={addOpen} maxWidth="xs" fullWidth disablePortal onClose={() => setAddOpen(false)}>
        {[
          <DialogTitle key="t">新增主题路径</DialogTitle>,
          <DialogContent key="c">
            <TextField
              fullWidth autoFocus
              placeholder="如 健康/饮食"
              value={newPath}
              onChange={e => setNewPath((e.target as HTMLInputElement).value)}
              onKeyDown={e => {
                e.stopPropagation();
                if ((e as any).key === 'Enter') {
                  e.preventDefault();
                  confirmAdd();
                }
              }}
            />
          </DialogContent>,
          <DialogActions key="a">
            <Button onClick={() => setAddOpen(false)}>取消</Button>
            <Button onClick={confirmAdd}>添加</Button>
          </DialogActions>,
        ]}
      </Dialog>

      {/* 删除确认 */}
      <Dialog open={delIdx !== null} maxWidth="xs" disablePortal onClose={() => setDelIdx(null)}>
        {delIdx !== null && [
          <DialogTitle key="t">确认删除</DialogTitle>,
          <DialogContent key="c">确认删除主题「{(data.themes as any[])[delIdx].path}」？</DialogContent>,
          <DialogActions key="a">
            <Button onClick={() => setDelIdx(null)}>取消</Button>
            <Button color="error" onClick={confirmDelete}>删除</Button>
          </DialogActions>,
        ]}
      </Dialog>
    </Box>
  );
}