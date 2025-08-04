// src/ui/modals/QuickTaskModal.tsx
/** @jsxImportSource preact */
import { App, Modal, Notice } from 'obsidian';
import { h, render } from 'preact';
import { useState } from 'preact/hooks';
import type ThinkPlugin from '../../main';
import { InputService, TaskThemeConfig } from '../../services/inputService';
import { makeTaskLine } from '../../utils/templates';

/* ---------------- 工具函数 ---------------- */
const todayISO = () => (window as any).moment().format('YYYY-MM-DD');
const nowHHMM  = () => (window as any).moment().format('HH:mm');
const lastSeg  = (p: string) => p.split('/').pop() ?? p;

/* ===================================================================== */
/*  Modal 外壳                                                           */
/* ===================================================================== */
export class QuickTaskModal extends Modal {
  constructor(private plugin: ThinkPlugin) { super(plugin.app); }
  onOpen()  { render(<TaskForm app={this.app} plugin={this.plugin} close={() => this.close()}/>, this.contentEl); }
  onClose() { this.contentEl.empty(); }
}

/* ===================================================================== */
/*  Main 表单                                                            */
/* ===================================================================== */
function TaskForm({ app, plugin, close }: { app: App; plugin: ThinkPlugin; close: () => void }) {
  const svc = new InputService(app, plugin);

  /* ---------- 分类 & 主题 ---------- */
  const [top,    setTop   ] = useState(svc.getTaskTopCategories()[0] || '');
  const [themes, setThemes] = useState<TaskThemeConfig[]>(svc.listTaskThemesByTop(top));
  const [theme,  setTheme ] = useState<TaskThemeConfig | null>(themes[0] || null);

  /* ---------- 动态字段 ---------- */
  const options = theme?.fieldOptions ?? {};
  const init: Record<string,string> = {};
  (theme?.fields || []).forEach(f=>{
    init[f] = f==='日期' ? todayISO() :
              f==='时间' ? nowHHMM()  :
              options[f]?.[0] ?? '';
  });
  const [form, setForm] = useState(init);
  const update = (k:string,v:string)=>setForm(o=>({...o,[k]:v}));

  /* ---------- 保存 ---------- */
  async function save() {
    const title = form['内容']?.trim() || form['任务内容']?.trim();
    if (!title) { new Notice('请填写任务内容'); return; }

    /* === 根据任务状态映射任务前缀 === */
    let taskPrefix = '';
    switch (form['任务状态']) {
      case '✅': taskPrefix = '- [x] '; break;   // 已完成
      case '📅':
      case '🛫': taskPrefix = '- [ ] '; break;   // 待办 / 进行中
      default :  taskPrefix = '';
    }

    /* === 调用模板生成最终行 ========= */
    const line = makeTaskLine({
      themePath : theme!.path,
      template  : theme?.template,
      fields    : {
        ...form,
        任务前缀: taskPrefix,   // 对应 {{@任务前缀}}
        前缀   : taskPrefix    // 兜底 {{前缀}}
      }
    });

    /* === 写入并提示 ================ */
    let targetPath = '';
    try {
      targetPath = await svc.writeTask(theme!.path, null, line);
      console.log(`%c[Think] 任务写入成功 → ${targetPath}`, 'color:green;font-weight:bold');
      new Notice(`✅ 已保存任务 → ${targetPath}`);
      plugin.dataStore?.notifyChange?.();
      close();
    } catch(e:any){
      console.error('[Think] 任务写入失败', { targetPath, error: e });
      new Notice(`❌ 保存失败：${e.message ?? e}（路径：${targetPath || '未知'}）`);
    }
  }

  /* ---------- 渲染 ---------- */
  return (
    <div class="think-modal">
      <h3 style="margin-bottom:1rem;">快速录入 · 任务</h3>

      {/* ---- 顶级分类 ---- */}
      <Field label="大类">
        {svc.getTaskTopCategories().map(c => (
          <Radio
            key={c}
            value={c}
            label={c}
            checked={top === c}
            onChange={()=>{
              setTop(c);
              const ts = svc.listTaskThemesByTop(c);
              setThemes(ts); setTheme(ts[0] || null);
            }}
          />
        ))}
      </Field>

      {/* ---- 主题 ---- */}
      {theme && (
        <Field label="主题">
          {themes.map(t => (
            <Radio
              key={t.path}
              name="theme"
              value={t.path}
              label={lastSeg(t.path)}
              checked={theme.path === t.path}
              onChange={()=>setTheme(t)}
            />
          ))}
        </Field>
      )}

      {/* ---- 动态字段 ---- */}
      {theme?.fields.map(f => {
        const choices = options[f];
        return (
          <Field key={f} label={f}>
            {choices?.length ? (
              choices.map(v=>(
                <Radio
                  key={v}
                  name={f}
                  value={v}
                  label={v}
                  checked={form[f]===v}
                  onChange={()=>update(f,v)}
                />
              ))
            ) : (
              <input
                style="width:100%;"
                type={f==='日期'?'date':f==='时间'?'time':'text'}
                value={form[f]}
                onInput={e=>update(f,(e.target as HTMLInputElement).value)}
              />
            )}
          </Field>
        );
      })}

      <div style="display:flex;justify-content:flex-end;margin-top:1rem;gap:.5rem;">
        <button class="mod-cta" onClick={save}>提交 ↩︎</button>
        <button onClick={close}>取消</button>
      </div>
    </div>
  );
}

/* ===================================================================== */
/*  小组件                                                               */
/* ===================================================================== */
function Field({label, children}: {label:string; children:any}) {
  return (
    <div style="margin-bottom:12px;width:100%;">
      <div style="margin-bottom:4px;font-weight:600;">{label}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;width:100%;">{children}</div>
    </div>
  );
}

function Radio(
  {value, checked, onChange, label, name}: 
  {value:string; checked:boolean; onChange:()=>void; label?:string; name?:string}
) {
  return (
    <label style="display:flex;align-items:center;gap:4px;cursor:pointer;">
      <input
        type="radio"
        name={name || 'top'}
        value={value}
        checked={checked}
        onChange={onChange}
        style="appearance:radio;-webkit-appearance:radio;"
      />
      <span>{label ?? value}</span>
    </label>
  );
}