// src/ui/InputSettingsTable.tsx
/** @jsxImportSource preact */
// InputSettingsTable.tsx —— 极简表格 UI（单击单元格可编辑 JSON/图标）

import { useState, useMemo } from 'preact/hooks';
import {
  Box, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  TextField, DialogActions, Button
} from '@mui/material';
import AddIcon    from '@mui/icons-material/Add';
import SaveIcon   from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import ThinkPlugin from '../main';
import { Notice } from 'obsidian';

/* ---------- 单元格标记（仅显示一个图标） ---------- */
const ENABLE_TEXT   = '✅';
const DISABLE_TEXT  = '❌';
const INHERIT_TEXT  = '🔽';
const OVERRIDE_TEXT = '📄';

/* ---------- 主组件 ---------- */
interface Props { plugin: ThinkPlugin }
export function InputSettingsTable({ plugin }: Props) {
  const [refresh, setRefresh] = useState(0);

  /* ---------- 原始数据 ---------- */
  const data = useMemo(() => {
    const raw = plugin.inputSettings || { base: {}, themes: [] };
    raw.base   ??= {};
    raw.themes ??= [];
    return raw;
  }, [plugin.inputSettings, refresh]);

  /* ---------- 动态列 ---------- */
  const blockKeys = useMemo(() => {
    const s = new Set<string>();
    data.themes.forEach((t: any) => Object.keys(t.blocks ?? {}).forEach(k => s.add(k)));
    Object.keys(data.base.blocks ?? {}).forEach(k => s.add(k));
    return Array.from(s).sort();
  }, [data]);

  /* ---------- 对话框状态 ---------- */
  const [editing, setEditing] = useState<{
    themeIdx: number; type: string; json: string;
  } | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newPath, setNewPath] = useState('');

  const [delIdx,  setDelIdx]  = useState<number | null>(null);

  // 图标编辑对话框
  const [iconEdit, setIconEdit] = useState<{ themeIdx: number; value: string } | null>(null);

  /* ---------- JSON 编辑 ---------- */
  const openEdit = (themeIdx: number, type: string) => {
    const obj = themeIdx < 0
      ? (type === 'task' ? data.base.task ?? {} : data.base.blocks?.[type] ?? {})
      : (type === 'task' ? data.themes[themeIdx].task ?? {} : data.themes[themeIdx].blocks?.[type] ?? {});
    setEditing({ themeIdx, type, json: JSON.stringify(obj, null, 2) });
  };

  const saveEdit = () => {
    if (!editing) return;
    let obj;
    try { obj = JSON.parse(editing.json || '{}'); }
    catch { new Notice('JSON 解析失败'); return; }

    if (editing.themeIdx < 0) {
      if (editing.type === 'task') data.base.task = obj;
      else {
        data.base.blocks ??= {};
        data.base.blocks[editing.type] = obj;
      }
    } else {
      const th = data.themes[editing.themeIdx];
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

  /* ---------- 新增 / 删除主题 ---------- */
  const confirmAdd = () => {
    const path = newPath.trim();
    if (!path) return;
    if (data.themes.some((t: any) => t.path === path)) { new Notice('该主题已存在'); return; }
    data.themes.push({ path });
    plugin.inputSettings = data;
    plugin.persistAll().then(() => {
      new Notice('已新增主题');
      setAddOpen(false); setNewPath(''); setRefresh(r => r + 1);
    });
  };

  const confirmDelete = () => {
    if (delIdx === null) return;
    const removed = data.themes.splice(delIdx, 1)[0];
    plugin.inputSettings = data;
    plugin.persistAll().then(() => {
      new Notice(`已删除主题「${removed.path}」`);
      setDelIdx(null); setRefresh(r => r + 1);
    });
  };

  /* ---------- 渲染工具：单图标逻辑 ----------
     规则：
     - enabled === false  => ❌（禁用）
     - enabled !== false 且 inherited === true  => 🔽（继承）
     - enabled !== false 且 inherited === false => 📄（覆写）
     备注：启用但继承/覆写判定后，不再额外显示“启用”图标，避免冗余。
  ------------------------------------------------ */
  const renderCell = (cfg: any, inherited: boolean, themeIdx: number, type: string) => {
    const enabled = cfg?.enabled ?? true;
    const symbol  = enabled ? (inherited ? INHERIT_TEXT : OVERRIDE_TEXT) : DISABLE_TEXT;
    const tip     = !enabled ? '禁用' : (inherited ? '继承' : '覆写');

    return (
      <TableCell
        sx={{ cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'center' }}
        onClick={() => openEdit(themeIdx, type)}
        title={`单击编辑 / 粘贴 JSON（当前：${tip}）`}
      >
        {symbol}
      </TableCell>
    );
  };

  const getCfg = (themeIdx: number, type: string) => {
    if (themeIdx < 0) return [data.base.task ?? {}, false] as [any, boolean];
    const th     = data.themes[themeIdx];
    const child  = type === 'task' ? th.task : th.blocks?.[type];
    const parent = type === 'task' ? data.base.task : data.base.blocks?.[type];
    const inh    = !child || Object.keys(child).length === 0;
    const cfg    = child ?? parent ?? {};
    return [cfg, inh] as [any, boolean];
  };

  /* ---------- 组件渲染 ---------- */
  return (
    <Box sx={{ mt: 2 }}>
      {/* 顶栏 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <strong style={{ fontSize: '1.1rem' }}>通用输入设置（单击单元格编辑）</strong>
        <Tooltip title="新增主题">
          <IconButton size="small" sx={{ ml: 1 }} onClick={() => setAddOpen(true)}>
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 主表格（表头不换行） */}
      <Table size="small" sx={{ '& th': { whiteSpace: 'nowrap' } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>主题路径</TableCell>
            <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>图标</TableCell>
            <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>Task</TableCell>
            {blockKeys.map(k => (
              <TableCell key={k} align="center" sx={{ whiteSpace: 'nowrap' }}>
                {k}
              </TableCell>
            ))}
            <TableCell /> {/* 操作列 */}
          </TableRow>
        </TableHead>
        <TableBody>
          {/* Base 行 */}
          <TableRow sx={{ bgcolor: '#f7f7f7' }}>
            <TableCell sx={{ whiteSpace: 'nowrap', wordBreak: 'keep-all' }}>
              <strong>Base（共性默认）</strong>
            </TableCell>
            <TableCell align="center" />
            {renderCell(data.base.task ?? {}, false, -1, 'task')}
            {blockKeys.map(k => renderCell(data.base.blocks?.[k] ?? {}, false, -1, k))}
            <TableCell />
          </TableRow>

          {/* Theme 行 */}
          {data.themes.map((th: any, idx: number) => (
            <TableRow key={th.path}>
              <TableCell sx={{ whiteSpace: 'nowrap', wordBreak: 'keep-all' }}>{th.path}</TableCell>
              <TableCell
                align="center"
                sx={{ whiteSpace: 'nowrap', cursor: 'pointer' }}
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
                const cfg   = child ?? data.base.blocks?.[k] ?? {};
                return renderCell(cfg, inh, idx, k);
              })}
              <TableCell>
                <Tooltip title="删除主题">
                  <IconButton size="small" color="error" onClick={() => setDelIdx(idx)}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* JSON 编辑对话框 */}
      <Dialog open={!!editing} fullWidth maxWidth="sm" disablePortal onClose={() => setEditing(null)}>
        {editing && [
          <DialogTitle key="t">编辑配置（{editing.themeIdx < 0 ? 'Base' : data.themes[editing.themeIdx].path} → {editing.type}）</DialogTitle>,
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

      {/* 图标编辑对话框 */}
      <Dialog open={!!iconEdit} maxWidth="xs" fullWidth disablePortal onClose={() => setIconEdit(null)}>
        {iconEdit && [
          <DialogTitle key="t">编辑图标（{data.themes[iconEdit.themeIdx].path}）</DialogTitle>,
          <DialogContent key="c">
            <TextField
              autoFocus
              fullWidth
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
                data.themes[iconEdit.themeIdx].icon = v || undefined;
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

      {/* 新增主题对话框 */}
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

      {/* 删除确认对话框 */}
      <Dialog open={delIdx !== null} maxWidth="xs" disablePortal onClose={() => setDelIdx(null)}>
        {delIdx !== null && [
          <DialogTitle key="t">确认删除</DialogTitle>,
          <DialogContent key="c">
            确认删除主题「{data.themes[delIdx].path}」？
          </DialogContent>,
          <DialogActions key="a">
            <Button onClick={() => setDelIdx(null)}>取消</Button>
            <Button color="error" onClick={confirmDelete}>删除</Button>
          </DialogActions>,
        ]}
      </Dialog>
    </Box>
  );
}