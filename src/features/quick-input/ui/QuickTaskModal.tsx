// src/features/quick-input/ui/QuickTaskModal.tsx
/** @jsxImportSource preact */
import { App, Modal, Notice } from 'obsidian';
import { h, render } from 'preact';
import { useState } from 'preact/hooks';
import type ThinkPlugin from '../../main';
import { InputService, TaskThemeConfig } from '@core/services/inputService';
import { makeTaskLine } from '@core/utils/templates';
import { todayISO, nowHHMM } from '@core/utils/date';
import { Field, Radio } from '@shared/components/FieldRadio';
import { DataStore } from '@core/services/dataStore';

/* ===================================================================== */
export class QuickTaskModal extends Modal {
  constructor(private plugin: ThinkPlugin) { super(plugin.app); }
  onOpen()  { render(<TaskForm app={this.app} close={() => this.close()}/>, this.contentEl); }
  onClose() { this.contentEl.empty(); }
}

/* -------------------- 主表单 -------------------- */
function TaskForm({ app, close }:{app:App;close:()=>void}) {
  // [MOD] InputService 现在只依赖 app，不再需要 plugin 实例，代码更清晰
  const svc = new InputService(app);

  /* ---------- 分类 & 主题 ---------- */
  const [top,setTop] = useState(svc.getTaskTopCategories()[0] || '');
  const [themes,setThemes] = useState<TaskThemeConfig[]>(svc.listTaskThemesByTop(top));
  const [theme,setTheme]   = useState<TaskThemeConfig|null>(themes[0] || null);

  /* ---------- 动态字段 ---------- */
  const options = theme?.fieldOptions ?? {};
  const init:Record<string,string> = {};
  (theme?.fields||[]).forEach(f=>{
    init[f] = f==='日期' ? todayISO() :
              f==='时间' ? nowHHMM() :
              options[f]?.[0] ?? '';
  });
  const [form,setForm] = useState(init);
  const update = (k:string,v:string)=>setForm(o=>({...o,[k]:v}));

  /* ---------- 保存 ---------- */
  async function save(){
    const title = form['内容']?.trim() || form['任务内容']?.trim();
    if(!title){ new Notice('请填写任务内容'); return; }

    let taskPrefix = '';
    switch(form['任务状态']){
      case '✅': taskPrefix='- [x] '; break;
      case '📅':
      case '🛫': taskPrefix='- [ ] '; break;
      default  : taskPrefix='';
    }

    const line = makeTaskLine({
      themePath: theme!.path,
      template : theme?.template,
      fields   : {
        ...form,
        任务前缀 : taskPrefix,
        前缀     : taskPrefix,
        icon     : theme?.icon ?? ''
      }
    });

    try{
      const targetPath = await svc.writeTask(theme!.path,null,line);
      new Notice(`✅ 已保存任务 → ${targetPath}`);
      DataStore.instance?.notifyChange?.();
      close();
    }catch(e:any){
      new Notice(`❌ 保存失败：${e.message??e}`);
    }
  }

  /* ---------- 渲染 ---------- */
  return (
    <div class="think-modal">
      <h3 style="margin-bottom:1rem;">快速录入 · 任务</h3>
      <Field label="大类">
        {svc.getTaskTopCategories().map(c=>(
          <Radio key={c} value={c} label={c} checked={top===c}
                 onChange={()=>{
                   setTop(c);
                   const ts = svc.listTaskThemesByTop(c);
                   setThemes(ts); setTheme(ts[0]||null);
                 }}/>
        ))}
      </Field>
      {theme && (
        <Field label="主题">
          {themes.map(t=>(
            <Radio key={t.path} name="theme" value={t.path} label={t.path.split('/').pop()??t.path}
                   checked={theme.path===t.path} onChange={()=>setTheme(t)}/>
          ))}
        </Field>
      )}
      {theme?.fields.map(f=>{
        const choices = options[f];
        return (
          <Field key={f} label={f}>
            {choices?.length?choices.map(v=>(
              <Radio key={v} name={f} value={v} label={v} checked={form[f]===v}
                     onChange={()=>update(f,v)}/>
            )):(
              <input style="width:100%;" type={f==='日期'?'date':f==='时间'?'time':'text'}
                     value={form[f]} onInput={e=>update(f,(e.target as HTMLInputElement).value)}/>
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