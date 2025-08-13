// src/features/quick-input/ui/QuickTaskModal.tsx
/** @jsxImportSource preact */
import { App, Modal, Notice } from 'obsidian';
import { h, render } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import type ThinkPlugin from '../../../main';
import { InputService, TaskThemeConfig } from '@core/services/inputService';
import { makeTaskLine } from '@core/utils/templates';
import { todayISO, nowHHMM } from '@core/utils/date';
import { Field, Radio } from '@shared/components/FieldRadio';
import { DataStore } from '@core/services/dataStore';
import { RadioGroup } from '@shared/components'; // <-- 引入新组件

/* ===================================================================== */
export class QuickTaskModal extends Modal {
  constructor(private plugin: ThinkPlugin) { super(plugin.app); }
  onOpen()  { render(<TaskForm app={this.app} close={() => this.close()}/>, this.contentEl); }
  onClose() { this.contentEl.empty(); }
}

/* -------------------- 主表单 -------------------- */
function TaskForm({ app, close }:{app:App;close:()=>void}) {
  const svc = useMemo(() => new InputService(app), [app]);

  /* ---------- 分类 & 主题 ---------- */
  const topCategories = useMemo(() => svc.getTaskTopCategories(), [svc]);
  const [top,setTop] = useState(topCategories[0] || '');
  
  const themes = useMemo(() => svc.listTaskThemesByTop(top), [svc, top]);
  const [theme,setTheme] = useState<TaskThemeConfig|null>(themes[0] || null);

  /* ---------- 动态字段 ---------- */
  const formState = useMemo(() => {
    const init:Record<string,string> = {};
    if (!theme) return init;
    const options = theme.fieldOptions ?? {};
    (theme.fields||[]).forEach(f=>{
      init[f] = f==='日期' ? todayISO() :
                f==='时间' ? nowHHMM() :
                options[f]?.[0] ?? '';
    });
    return init;
  }, [theme]);

  const [form,setForm] = useState(formState);
  
  // 当 theme 改变时，重置表单
  useState(() => {
    setForm(formState);
  }, [formState]);
  
  const update = (k:string,v:string)=>setForm(o=>({...o,[k]:v}));

  /* ---------- 保存 ---------- */
  async function save(){
    if (!theme) {
        new Notice('请先选择一个主题');
        return;
    }
    const title = form['内容']?.trim() || form['任务内容']?.trim();
    if(!title){ new Notice('请填写任务内容'); return; }

    let taskPrefix = '';
    switch(form['任务状态']){
      case '✅': taskPrefix='- [x] '; break;
      case '📅':
      case '🛫': taskPrefix='- [ ] '; break;
      default  : taskPrefix='';
    }

    const line = makeTaskLine({
      themePath: theme.path,
      template : theme?.template,
      fields   : {
        ...form,
        任务前缀 : taskPrefix,
        前缀     : taskPrefix,
        icon     : theme?.icon ?? ''
      }
    });

    try{
      const targetPath = await svc.writeTask(theme.path,null,line);
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
      
      <RadioGroup
        label="大类"
        options={topCategories.map(c => ({ value: c, label: c }))}
        selectedValue={top}
        onChange={setTop}
      />

      {theme && (
        <RadioGroup
          label="主题"
          name="theme"
          options={themes.map(t => ({ value: t.path, label: t.path.split('/').pop() ?? t.path, icon: t.icon }))}
          selectedValue={theme.path}
          onChange={(path) => setTheme(themes.find(t => t.path === path) || null)}
        />
      )}
      
      {theme?.fields.map(f=>{
        const choices = theme.fieldOptions?.[f];
        return (
          <Field key={f} label={f}>
            {choices?.length ? (
              <RadioGroup
                label=""
                name={f}
                options={choices.map(c => ({ value: c, label: c }))}
                selectedValue={form[f]}
                onChange={(v) => update(f, v)}
              />
            ) : (
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