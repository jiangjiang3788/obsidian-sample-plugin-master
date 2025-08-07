/** @jsxImportSource preact */
import { App, Modal, Notice } from 'obsidian';
import { h, render } from 'preact';
import { useState } from 'preact/hooks';
import type ThinkPlugin from '../../main';
import { InputService } from '@core/services/inputService';
import { makeBlock } from '@core/utils/templates';
import { todayISO } from '@core/utils/date';                   // (#5)
import { Field, Radio } from '../common/FormControls';        // (#1)

const lastSeg = (p:string)=>p.split('/').pop()??p;

/* ---------------- Modal ---------------- */
export class QuickBlockModal extends Modal{
  constructor(private plugin:ThinkPlugin){ super(plugin.app); }
  onOpen(){ render(<Form app={this.app} plugin={this.plugin} close={()=>this.close()}/>,this.contentEl); }
  onClose(){ this.contentEl.empty(); }
}

function Form({app,plugin,close}:{app:App;plugin:ThinkPlugin;close:()=>void}){
  const svc = new InputService(app,plugin);

  const [cat,setCat] = useState<'计划'|'总结'|'思考'>('思考');
  const [topCats,setTopCats] = useState(svc.getBlockTopCategories(cat));
  const [top,setTop] = useState(topCats[0]??'');

  const buildThemes = ()=>svc.listBlockThemesByTop(top,cat);
  const [themes,setThemes] = useState(buildThemes());
  const [theme,setTheme]   = useState(themes[0]?.path||top);
  const themeIcon          = themes.find(t=>t.path===theme)?.icon??'';

  /* 其他字段 */
  const baseBlk = plugin.inputSettings?.base?.blocks?.[cat] ?? {};
  const opts    = baseBlk.fieldOptions ?? {};
  const periods = Array.isArray(opts['周期']) ? opts['周期'] : [];
  const types   = Array.isArray(opts['分类']) ? opts['分类'] : [];

  const [date,setDate] = useState(todayISO());
  const [txt,setTxt]   = useState('');
  const [period,setPeriod] = useState(cat!=='思考'&&periods.includes('周')?'周':'');
  const [type,setType]     = useState(cat==='思考'&&types.includes('思考')?'思考':'');

  const refresh=(newCat=cat,newTop:string|null=null)=>{
    const tops = svc.getBlockTopCategories(newCat);
    setTopCats(tops);
    const resolved=newTop??tops[0]??'';
    setTop(resolved);
    const ts = svc.listBlockThemesByTop(resolved,newCat);
    setThemes(ts); setTheme(ts[0]?.path||resolved);
    setPeriod(newCat!=='思考'&&periods.includes('周')?'周':'');
    setType  (newCat==='思考'&&types.includes('思考')?'思考':'');
  };

  async function save(){
    if(!txt.trim()){ new Notice('请填写内容'); return; }
    const extra:Record<string,string> = {};
    if(cat!=='思考'&&period) extra['周期']=period;
    if(cat==='思考'&&type)   extra['分类']=type;

    const block = makeBlock({
      category:cat,
      dateISO :date,
      themeLabel:top,
      icon:themeIcon,
      content:txt,
      extra
    });

    try{
      await svc.writeBlock(theme,cat,null,block);
      new Notice('✅ 已保存');
      plugin.dataStore?.notifyChange?.();
      close();
    }catch(e:any){
      new Notice('❌ 保存失败：'+(e.message??e));
    }
  }

  /* -------- 渲染 -------- */
  return(
    <div class="think-modal">
      <h3 style="margin-bottom:1rem;">快速录入 · {cat}</h3>

      <Field label="类别">
        {(['计划','总结','思考'] as const).map(c=>(
          <Radio key={c} checked={cat===c} label={c} onChange={()=>{setCat(c);refresh(c,null);}}/>
        ))}
      </Field>

      <Field label="大类">
        {topCats.map(t=>(
          <Radio key={t} checked={top===t} label={t} onChange={()=>{setTop(t);refresh(cat,t);}}/>
        ))}
      </Field>

      <Field label="主题">
        {themes.map(t=>(
          <Radio key={t.path} name="theme" checked={theme===t.path}
                 label={lastSeg(t.path)} onChange={()=>setTheme(t.path)}/>
        ))}
      </Field>

      {cat!=='思考'&&periods.length>0&&(
        <Field label="周期">
          {periods.map(p=>(
            <Radio key={p} name="period" checked={period===p} label={p}
                   onChange={()=>setPeriod(p)}/>
          ))}
        </Field>
      )}

      {cat==='思考'&&types.length>0&&(
        <Field label="思考分类">
          {types.map(tp=>(
            <Radio key={tp} name="type" checked={type===tp} label={tp}
                   onChange={()=>setType(tp)}/>
          ))}
        </Field>
      )}

      <Field label="日期">
        <input type="date" value={date}
               onChange={e=>setDate((e.target as HTMLInputElement).value)}
               style="min-width:140px;"/>
      </Field>

      <Field label="内容">
        <textarea rows={6} style="width:100%;" placeholder="输入内容…"
                  value={txt} onInput={e=>setTxt((e.target as HTMLTextAreaElement).value)}/>
      </Field>

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
        <button class="mod-cta" onClick={save}>提交 ↩︎</button>
        <button onClick={close}>取消</button>
      </div>
    </div>
  );
}
