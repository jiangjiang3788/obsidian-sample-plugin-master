// src/shared/components/form/RuleList.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Stack, TextField, MenuItem, Select, IconButton, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const menu = { disablePortal: true, keepMounted: true } as const;

export function RuleList({
  title, mode, rows, fieldOptions,
  onChange, onAdd,
}: {
  title: string;
  mode: 'filter' | 'sort';
  rows: any[];
  fieldOptions: string[];
  onChange: (rows: any[]) => void;
  onAdd: () => void;
}) {
  const remove = (i:number)=>onChange(rows.filter((_,j)=>j!==i));

  return (
    <div>
      <div style="display:flex;align-items:center;gap:8px;margin:0 0 3px;">
        <Typography color="error" fontWeight={800}>{title}</Typography>
        <span style="color:#d00;font-weight:800;cursor:pointer;" onClick={onAdd}>＋</span>
      </div>

      <Stack spacing={0.4}>
        {rows.map((r:any,i:number)=>(
          <Stack key={i} direction="row" spacing={0.6}>
            <TextField select value={r.field}
              SelectProps={{ MenuProps: menu }} sx={{flex:1}}
              onChange={e=>{
                const next=[...rows]; next[i]={...next[i], field:e.target.value}; onChange(next);
              }}>
              {fieldOptions.map(o=><MenuItem key={o} value={o}>{o}</MenuItem>)}
            </TextField>

            {mode==='filter' ? (
              <Select value={r.op} MenuProps={menu} sx={{width:90}}
                onChange={e=>{ const next=[...rows]; next[i]={...next[i], op:e.target.value}; onChange(next); }}>
                {['=','!=','includes','regex','>','<'].map(op=><MenuItem key={op} value={op}>{op}</MenuItem>)}
              </Select>
            ) : (
              <Select value={r.dir} MenuProps={menu} sx={{width:100}}
                onChange={e=>{ const next=[...rows]; next[i]={...next[i], dir:e.target.value}; onChange(next); }}>
                <MenuItem value="asc">升序</MenuItem>
                <MenuItem value="desc">降序</MenuItem>
              </Select>
            )}

            {mode==='filter' ? (
              <TextField value={r.value} sx={{flex:1}}
                onInput={e=>{ const next=[...rows]; next[i]={...next[i], value:(e.target as HTMLInputElement).value}; onChange(next); }}/>
            ) : null}

            <IconButton size="small" color="error" onClick={()=>remove(i)} title="删除">
              <DeleteIcon fontSize="small"/>
            </IconButton>
          </Stack>
        ))}
      </Stack>
    </div>
  );
}