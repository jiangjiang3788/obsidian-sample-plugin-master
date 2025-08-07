/** @jsxImportSource preact */
import { App, Modal, Notice } from 'obsidian';
import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type ThinkPlugin from '../../main';
import { InputService } from '@core/services/inputService';
import { makeBlock } from '@core/utils/templates';
import { todayISO } from '@core/utils/date';                  // (#5)
import { Field, Radio } from '../common/FormControls';       // (#1)

const lastSeg = (p:string)=>p.split('/').pop()??p;

/* ---------------- Modal ---------------- */
export class QuickHabitModal extends Modal{
  constructor(private plugin:ThinkPlugin){ super(plugin.app); }
  onOpen(){ render(<HabitForm app={this.app} plugin={this.plugin} close={()=>this.close()}/>,this.contentEl); }
  onClose(){ this.contentEl.empty(); }
}

function HabitForm({app,plugin,close}:{app:App;plugin:ThinkPlugin;close:()=>void}){
  const svc = new InputService(app,plugin);

  const tops = svc.getBlockTopCategories('打卡');
  const [top,setTop] = useState(tops[0]??'');

  const buildThemes=()=>svc.listBlockThemesByTop(top,'打卡');
  const [themes,setThemes] = useState(buildThemes());
  const [themePath,setThemePath] = useState(themes[0]?.path||top);

  function getStarMax(path:string):number{
    const th = (plugin.inputSettings?.themes||[]).find((t:any)=>t.path===path);
    const blk = th?.blocks?.['打卡']||{};
    if(typeof blk.starCount==='number') return blk.starCount;
    if(Array.isArray(blk.emojiMapping))  return blk.emojiMapping.length;
    if(Array.isArray(blk.imageMapping))  return blk.imageMapping.length;
    return 5;
  }
  const [starMax,setStarMax] = useState(getStarMax(themePath));

  const [dateISO,setDateISO] = useState(todayISO());
  const [content,setContent] = useState('');
  const [score,setScore]     = useState(1);

  /* 同步 starMax */
  useEffect(()=>{
    const mx = getStarMax(themePath);
    setStarMax(mx);
    if(score>mx) setScore(mx);
  },[themePath]);

  function chooseTop(t:string){
    setTop(t);
    const ts = svc.listBlockThemesByTop(t,'打卡');
    setThemes(ts);
    setThemePath(ts[0]?.path||t);
  }

  async function onSubmit(){
    if(!content.trim()){ new Notice('请填写内容'); return; }

    const block = makeBlock({
      category:'打卡',
      dateISO,
      themeLabel:top,
      content,
      extra:{'评分':String(score)}
    });

    try{
      await svc.writeBlock(themePath,'打卡',null,block);
      new Notice('✅ 已保存打卡');
      plugin.dataStore?.notifyChange?.();
      close();
    }catch(e:any){
      new Notice('❌ 保存失败：'+(e.message??e));
    }
  }

  /* -------- 渲染 -------- */
  return(
    <div class="think-modal">
      <h3 style="margin-bottom:1rem;">快速录入 · 打卡</h3>

      <Field label="大类">
        {tops.map(t=>(
          <Radio key={t} value={t} checked={top===t} onChange={()=>chooseTop(t)} label={t}/>
        ))}
      </Field>

      <Field label="主题">
        {themes.map(t=>(
          <Radio key={t.path} name="theme" value={t.path} label={lastSeg(t.path)}
                 checked={themePath===t.path} onChange={()=>setThemePath(t.path)}/>
        ))}
      </Field>

      <Field label="日期">
        <input type="date" value={dateISO} onChange={e=>setDateISO((e.target as HTMLInputElement).value)}
               style={{width:'100%'}}/>
      </Field>

      <Field label={`评分 (1~${starMax})`}>
        <input type="number" min={1} max={starMax} value={score}
               onInput={e=>setScore(Number((e.target as HTMLInputElement).value))}
               style={{width:'100%'}}/>
      </Field>

      <Field label="内容">
        <textarea rows={5} placeholder="备注…" style={{width:'100%'}}
                  value={content} onInput={e=>setContent((e.target as HTMLTextAreaElement).value)}/>
      </Field>

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
        <button class="mod-cta" onClick={onSubmit}>提交 ↩︎</button>
        <button onClick={close}>取消</button>
      </div>
    </div>
  );
}
