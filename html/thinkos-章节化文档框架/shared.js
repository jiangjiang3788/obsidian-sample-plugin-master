(function(){
  mermaid.initialize({
    startOnLoad:false,
    securityLevel:'loose',
    theme:'base',
    themeVariables:{
      primaryColor:'#eef5ff', primaryTextColor:'#1f2937', primaryBorderColor:'#8ab4ff',
      lineColor:'#6b86c4', secondaryColor:'#f8fbff', tertiaryColor:'#ffffff',
      clusterBkg:'#f8fbff', clusterBorder:'#c9d8f4',
      fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,Microsoft YaHei,sans-serif'
    },
    flowchart:{useMaxWidth:false,htmlLabels:true,curve:'basis'}
  });

  const chaptersRoot = document.getElementById('chapters');
  const toc = document.getElementById('toc');
  const renderedDiagrams = new Set();

  function renderChapters(){
    const list = window.THINKOS_DOC_CHAPTERS || [];
    chaptersRoot.innerHTML = '';
    toc.innerHTML = '';
    list.forEach(chapter => {
      const section = document.createElement('section');
      section.className = 'chapter';
      section.id = chapter.id;
      section.innerHTML = `
        <div class="chapter-head">
          <h2>${chapter.title}</h2>
          <div class="tip">${chapter.tip || ''}</div>
        </div>
        <div class="chapter-body">${chapter.content || ''}</div>
      `;
      chaptersRoot.appendChild(section);

      const link = document.createElement('a');
      link.href = '#' + chapter.id;
      link.textContent = chapter.title;
      toc.appendChild(link);
    });
  }

  async function renderDiagramsInSection(section){
    const sources = section.querySelectorAll('.mermaid-source');
    for(const src of sources){
      const name = src.dataset.name;
      if(renderedDiagrams.has(name)) continue;
      const target = section.querySelector(`.diagram-render[data-diagram="${name}"]`);
      if(!target) continue;
      try{
        const id = 'm_' + name.replace(/[^\w]/g,'_') + '_' + Math.random().toString(36).slice(2,8);
        const res = await mermaid.render(id, src.textContent);
        target.innerHTML = res.svg;
        renderedDiagrams.add(name);
      }catch(err){
        target.innerHTML = '<div style="color:#b91c1c;padding:12px">该图渲染失败，请刷新后重试。</div>';
      }
    }
  }

  async function showChapter(hash){
    const chapters = Array.from(document.querySelectorAll('.chapter'));
    const links = Array.from(toc.querySelectorAll('a'));
    for(const chapter of chapters){
      const active = '#' + chapter.id === hash;
      chapter.classList.toggle('active', active);
      if(active) await renderDiagramsInSection(chapter);
    }
    links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === hash));
    window.scrollTo({top:0, behavior:'auto'});
  }

  function bindTOC(){
    toc.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', async (e) => {
        e.preventDefault();
        const hash = a.getAttribute('href');
        history.replaceState(null,'',hash);
        await showChapter(hash);
      });
    });
  }

  function bindReqTable(){
    function bindDeleteButtons(){
      document.querySelectorAll('.del-row').forEach(btn => {
        btn.onclick = () => btn.closest('tr')?.remove();
      });
    }
    bindDeleteButtons();

    document.getElementById('addRowBtn')?.addEventListener('click', () => {
      const body = document.getElementById('reqBody');
      if(!body) return;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td contenteditable="true">新的需求</td>
        <td contenteditable="true">记录 / 数据处理 / 展示 / 生命周期</td>
        <td contenteditable="true">模块名</td>
        <td contenteditable="true">中</td>
        <td contenteditable="true">未开始</td>
        <td contenteditable="true">这里写场景</td>
        <td contenteditable="true">这里写入口</td>
        <td contenteditable="true">这里写希望结果</td>
        <td contenteditable="true">这里写影响链路</td>
        <td><button class="ctl-btn light del-row">删除</button></td>`;
      body.appendChild(tr);
      bindDeleteButtons();
    });

    function readReqTable(){
      return Array.from(document.querySelectorAll('#reqBody tr')).map(tr => {
        const tds = tr.querySelectorAll('td');
        return Array.from(tds).slice(0,9).map(td => td.innerText.trim());
      });
    }
    function esc(v){
      return String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    function writeReqTable(rows){
      const body = document.getElementById('reqBody');
      if(!body) return;
      body.innerHTML = '';
      rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td contenteditable="true">${esc(r[0])}</td>
          <td contenteditable="true">${esc(r[1])}</td>
          <td contenteditable="true">${esc(r[2])}</td>
          <td contenteditable="true">${esc(r[3])}</td>
          <td contenteditable="true">${esc(r[4])}</td>
          <td contenteditable="true">${esc(r[5])}</td>
          <td contenteditable="true">${esc(r[6])}</td>
          <td contenteditable="true">${esc(r[7])}</td>
          <td contenteditable="true">${esc(r[8])}</td>
          <td><button class="ctl-btn light del-row">删除</button></td>`;
        body.appendChild(tr);
      });
      bindDeleteButtons();
    }

    document.getElementById('saveBtn')?.addEventListener('click', () => {
      localStorage.setItem('thinkos_req_table_modular_v1', JSON.stringify(readReqTable()));
      alert('已保存到当前浏览器。');
    });

    const raw = localStorage.getItem('thinkos_req_table_modular_v1');
    if(raw){
      try{
        const rows = JSON.parse(raw);
        if(Array.isArray(rows) && rows.length) writeReqTable(rows);
      }catch(e){}
    }

    document.getElementById('exportBtn')?.addEventListener('click', () => {
      const clone = document.documentElement.cloneNode(true);
      const html = '<!DOCTYPE html>\n' + clone.outerHTML;
      const blob = new Blob([html], {type:'text/html;charset=utf-8'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ThinkOS-开发文档-当前导出版.html';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  }

  function bindDiagramInteractions(){
    document.querySelectorAll('.diagram-wrap').forEach(wrap => {
      if(wrap.dataset.bound === '1') return;
      wrap.dataset.bound = '1';
      wrap.dataset.scale = wrap.dataset.scale || '1';

      wrap.addEventListener('wheel', (e) => {
        const render = wrap.querySelector('.diagram-render');
        if(!render) return;
        if(e.ctrlKey){
          e.preventDefault();
          let scale = parseFloat(wrap.dataset.scale || '1');
          scale += e.deltaY < 0 ? 0.1 : -0.1;
          scale = Math.max(0.4, Math.min(2.5, scale));
          wrap.dataset.scale = String(scale);
          render.style.transform = `scale(${scale})`;
          return;
        }
        if(e.shiftKey){
          e.preventDefault();
          wrap.scrollLeft += e.deltaY;
        }
      }, { passive:false });

      let isDown = false;
      let startX = 0;
      let scrollLeft = 0;
      wrap.addEventListener('mousedown', (e) => {
        isDown = true;
        startX = e.pageX - wrap.offsetLeft;
        scrollLeft = wrap.scrollLeft;
      });
      window.addEventListener('mouseup', () => { isDown = false; });
      wrap.addEventListener('mouseleave', () => { isDown = false; });
      wrap.addEventListener('mousemove', (e) => {
        if(!isDown) return;
        e.preventDefault();
        const x = e.pageX - wrap.offsetLeft;
        const walk = x - startX;
        wrap.scrollLeft = scrollLeft - walk;
      });
    });
  }

  async function init(){
    renderChapters();
    bindTOC();
    await showChapter(location.hash || '#chapter-01');
    bindReqTable();
    bindDiagramInteractions();
  }

  window.addEventListener('load', init);
})();
