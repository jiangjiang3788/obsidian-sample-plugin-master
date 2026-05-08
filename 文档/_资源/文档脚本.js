(function () {
  'use strict';

  if (window.__THINK_DOC_PJAX_READY__) return;
  window.__THINK_DOC_PJAX_READY__ = true;

  let sidebar = document.querySelector('.sidebar');
  let main = document.querySelector('.main');
  let navLinks = [];
  let collapsibles = [];

  const NAV_KEY_PREFIX = 'think-doc-nav-node:';
  const SIDEBAR_SCROLL_KEY = 'think-doc-sidebar-scroll:v2';
  const rootPrefix = (document.body && document.body.dataset.docRoot) || '';
  const siteRoot = new URL(rootPrefix || './', location.href);
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let isNavigating = false;
  let lastLoadedUrl = location.href;
  let pageCachePromise = null;

  // 临时调试开关：当前版本默认打开中文日志。稳定后可以把 true 改为 false。
  const PJAX_DEBUG = true;

  function debugLog(message, detail) {
    if (!PJAX_DEBUG || !window.console) return;
    if (detail === undefined) {
      console.log(`[文档切页调试] ${message}`);
    } else {
      console.log(`[文档切页调试] ${message}`, detail);
    }
  }

  function debugWarn(message, detail) {
    if (!PJAX_DEBUG || !window.console) return;
    console.warn(`[文档切页调试] ${message}`, detail || '');
  }

  function normalizePath(value) {
    let path = '';
    try {
      path = decodeURIComponent(value || '').split('#')[0].replace(/\/+/g, '/');
    } catch (error) {
      path = (value || '').split('#')[0].replace(/\/+/g, '/');
    }
    if (path.endsWith('/')) path += 'index.html';
    return path;
  }

  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch (error) { return null; }
  }

  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (error) {}
  }

  function sessionGet(key) {
    try { return window.sessionStorage.getItem(key); } catch (error) { return null; }
  }

  function sessionSet(key, value) {
    try { window.sessionStorage.setItem(key, value); } catch (error) {}
  }

  function saveSidebarScroll() {
    if (!sidebar) return;
    sessionSet(SIDEBAR_SCROLL_KEY, String(sidebar.scrollTop));
  }

  function getDirectTitle(container) {
    return Array.from(container.children).find(child => child.classList && (child.classList.contains('nav-title') || child.classList.contains('nav-subtitle'))) || null;
  }

  function makeNodeId(title, index) {
    const base = (title && title.textContent ? title.textContent.trim() : '') || `node-${index + 1}`;
    return base.toLowerCase().replace(/\s+/g, '-').replace(/[/:?#\[\]@!$&'()*+,;=]/g, '-');
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getElementTopInside(container, element) {
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    return container.scrollTop + elementRect.top - containerRect.top;
  }

  function isVisibleInside(container, element) {
    if (!container || !element) return true;
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const margin = 28;
    return elementRect.top >= containerRect.top + margin && elementRect.bottom <= containerRect.bottom - margin;
  }

  function revealInsideWithoutAnimation(container, element) {
    if (!container || !element || isVisibleInside(container, element)) return;
    const margin = 36;
    const elementTop = getElementTopInside(container, element);
    const elementBottom = elementTop + element.offsetHeight;
    const visibleTop = container.scrollTop + margin;
    const visibleBottom = container.scrollTop + container.clientHeight - margin;
    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
    let nextScrollTop = container.scrollTop;

    if (elementTop < visibleTop) {
      nextScrollTop = elementTop - margin;
    } else if (elementBottom > visibleBottom) {
      nextScrollTop = elementBottom - container.clientHeight + margin;
    }
    container.scrollTop = clamp(nextScrollTop, 0, maxScrollTop);
  }

  function setCollapsed(node, title, collapsed) {
    node.classList.toggle('collapsed', collapsed);
    title.setAttribute('aria-expanded', String(!collapsed));
    title.setAttribute('title', collapsed ? '展开这个目录' : '折叠这个目录');
  }

  function resolveUrl(href, baseUrl) {
    try { return new URL(href, baseUrl || location.href).href; } catch (error) { return ''; }
  }

  function sameDocumentPath(urlA, urlB) {
    try {
      const a = new URL(urlA, location.href);
      const b = new URL(urlB, location.href);
      return normalizePath(a.pathname) === normalizePath(b.pathname);
    } catch (error) {
      return false;
    }
  }


  function decodePathname(pathname) {
    try {
      return decodeURIComponent(pathname || '').replace(/\/+/g, '/');
    } catch (error) {
      return (pathname || '').replace(/\/+/g, '/');
    }
  }

  function getSiteRootDirectoryPath() {
    let rootPath = decodePathname(siteRoot.pathname);
    if (!rootPath.endsWith('/')) {
      rootPath = rootPath.replace(/\/[^/]*$/, '/');
    }
    return rootPath;
  }

  function getPageCacheKey(url) {
    try {
      const target = new URL(url, location.href);
      const rootPath = getSiteRootDirectoryPath();
      let targetPath = decodePathname(target.pathname);
      if (targetPath.endsWith('/')) targetPath += 'index.html';
      if (!targetPath.startsWith(rootPath)) return '';
      const rel = targetPath.slice(rootPath.length).replace(/^\/+/, '');
      return rel || 'index.html';
    } catch (error) {
      return '';
    }
  }

  function ensurePageCache() {
    if (window.THINK_DOC_PAGE_CACHE && window.THINK_DOC_PAGE_CACHE.pages) {
      return Promise.resolve(window.THINK_DOC_PAGE_CACHE);
    }

    if (pageCachePromise) return pageCachePromise;

    pageCachePromise = new Promise((resolve, reject) => {
      const scriptUrl = new URL('_资源/页面内容索引.js', siteRoot.href).href;
      debugLog('file:// 环境准备加载页面内容索引，用它替代 fetch 读取 HTML', scriptUrl);

      const existing = document.querySelector('script[data-doc-page-cache="true"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.THINK_DOC_PAGE_CACHE), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.dataset.docPageCache = 'true';
      script.onload = () => {
        if (window.THINK_DOC_PAGE_CACHE && window.THINK_DOC_PAGE_CACHE.pages) {
          debugLog('页面内容索引加载完成', { pageCount: Object.keys(window.THINK_DOC_PAGE_CACHE.pages).length });
          resolve(window.THINK_DOC_PAGE_CACHE);
        } else {
          reject(new Error('页面内容索引已加载，但没有找到 THINK_DOC_PAGE_CACHE.pages'));
        }
      };
      script.onerror = () => reject(new Error('页面内容索引加载失败：' + scriptUrl));
      document.head.appendChild(script);
    });

    return pageCachePromise;
  }

  async function getCachedPage(url) {
    const key = getPageCacheKey(url);
    if (!key) return null;

    // file:// 下 fetch HTML 通常会失败；先走预生成索引。http:// 下如果索引已经存在，也可以复用它。
    if (location.protocol !== 'file:' && !(window.THINK_DOC_PAGE_CACHE && window.THINK_DOC_PAGE_CACHE.pages)) {
      return null;
    }

    const cache = await ensurePageCache();
    const page = cache && cache.pages ? cache.pages[key] : null;
    if (!page) {
      debugWarn('页面内容索引里没有找到目标页面，将尝试 fetch 或普通跳转', { key, url });
      return null;
    }

    debugLog('命中页面内容索引，不使用 fetch，因此不会触发 file:// 安全限制', { key, title: page.title });
    return page;
  }

  function isInternalDocUrl(url) {
    if (!url) return false;
    try {
      const target = new URL(url, location.href);
      if (!target.href.startsWith(siteRoot.href)) return false;
      const pathname = normalizePath(target.pathname).toLowerCase();
      if (pathname.includes('/_归档/')) return false;
      return pathname.endsWith('.html') || pathname.endsWith('/index.html');
    } catch (error) {
      return false;
    }
  }

  function isModifiedClick(event) {
    return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
  }

  function prepareLinks(scope, baseUrl) {
    if (!scope) return;
    Array.from(scope.querySelectorAll('a[href]')).forEach(link => {
      const rawHref = link.getAttribute('href') || '';
      if (!rawHref || rawHref.startsWith('javascript:') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) return;
      if (link.target && link.target !== '_self') return;
      if (link.hasAttribute('download')) return;

      const absoluteUrl = resolveUrl(rawHref, baseUrl || location.href);
      if (!isInternalDocUrl(absoluteUrl)) return;

      link.dataset.pjaxUrl = absoluteUrl;
      link.setAttribute('href', absoluteUrl);
    });
  }

  function syncNavLinks() {
    sidebar = document.querySelector('.sidebar');
    navLinks = Array.from(document.querySelectorAll('.nav-link'));
    collapsibles = Array.from(document.querySelectorAll('.nav-section, .nav-subsection'));
  }

  function updateActiveLink(url, options) {
    const opts = Object.assign({ reveal: false, expandActive: true }, options || {});
    syncNavLinks();
    const currentPath = normalizePath(new URL(url, location.href).pathname);
    let activeLink = null;

    navLinks.forEach(link => {
      const linkUrl = link.dataset.pjaxUrl || resolveUrl(link.getAttribute('href'), location.href);
      const linkPath = normalizePath(new URL(linkUrl, location.href).pathname);
      const isActive = linkPath === currentPath;
      link.classList.toggle('active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'page');
        activeLink = link;
      } else {
        link.removeAttribute('aria-current');
      }
    });

    collapsibles.forEach(node => {
      const hasActiveLink = Boolean(node.querySelector('.nav-link.active'));
      node.classList.toggle('has-active', hasActiveLink);
      if (opts.expandActive && hasActiveLink && node.classList.contains('collapsed')) {
        const title = getDirectTitle(node);
        if (title) setCollapsed(node, title, false);
      }
    });

    if (opts.reveal && sidebar && activeLink) {
      revealInsideWithoutAnimation(sidebar, activeLink);
    }
  }

  function initCollapsibleNav() {
    syncNavLinks();

    collapsibles.forEach((node, index) => {
      if (node.dataset.navReady === 'true') return;

      const title = getDirectTitle(node);
      if (!title) return;
      const nodeId = node.dataset.navKey || makeNodeId(title, index);
      const key = NAV_KEY_PREFIX + nodeId;
      const hasActiveLink = Boolean(node.querySelector('.nav-link.active'));
      const savedState = storageGet(key);
      const shouldCollapse = savedState ? savedState === 'collapsed' && !hasActiveLink : false;

      node.dataset.navReady = 'true';
      node.classList.toggle('has-active', hasActiveLink);
      title.classList.add('nav-title-toggle');
      title.setAttribute('role', 'button');
      title.setAttribute('tabindex', '0');
      title.setAttribute('aria-controls', nodeId);
      setCollapsed(node, title, shouldCollapse);

      const toggle = () => {
        const previousScrollTop = sidebar ? sidebar.scrollTop : 0;
        const nextCollapsed = !node.classList.contains('collapsed');
        setCollapsed(node, title, nextCollapsed);
        storageSet(key, nextCollapsed ? 'collapsed' : 'expanded');
        if (sidebar) {
          sidebar.scrollTop = Math.min(previousScrollTop, Math.max(0, sidebar.scrollHeight - sidebar.clientHeight));
          saveSidebarScroll();
        }
      };

      title.addEventListener('click', toggle);
      title.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
      });
    });
  }

  function initSidebarScroll() {
    if (!sidebar) return;

    const savedScrollRaw = sessionGet(SIDEBAR_SCROLL_KEY);
    const savedScroll = Number(savedScrollRaw);
    const hasSavedScroll = savedScrollRaw !== null && Number.isFinite(savedScroll) && savedScroll >= 0;

    if (hasSavedScroll) {
      sidebar.scrollTop = Math.min(savedScroll, Math.max(0, sidebar.scrollHeight - sidebar.clientHeight));
    }

    updateActiveLink(location.href, { reveal: !hasSavedScroll, expandActive: true });

    let scrollTimer = 0;
    sidebar.addEventListener('scroll', () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(saveSidebarScroll, 80);
    }, { passive: true });

    window.addEventListener('pagehide', saveSidebarScroll);
  }

  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initSearch() {
    const input = document.querySelector('[data-doc-search]');
    const results = document.querySelector('[data-search-results]');
    if (!input || !results || !window.DOC_SEARCH_INDEX) return;

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        results.classList.remove('active');
        results.innerHTML = '';
        return;
      }

      const matched = window.DOC_SEARCH_INDEX.filter(item => {
        const text = [item.title, item.summary, ...(item.tags || [])].join(' ').toLowerCase();
        return text.includes(q);
      }).slice(0, 10);

      results.innerHTML = matched.length
        ? matched.map(item => {
            const itemUrl = new URL(item.url, siteRoot.href).href;
            return `<a class="search-result" href="${escapeHTML(itemUrl)}" data-pjax-url="${escapeHTML(itemUrl)}"><strong>${escapeHTML(item.title)}</strong><br><span>${escapeHTML(item.summary)}</span></a>`;
          }).join('')
        : '<div class="search-result">没有找到。可以换一个关键词，比如：需求、命令、设置、文件地图、评审。</div>';
      results.classList.add('active');
    });
  }

  function setMainBusy(leaving) {
    main = document.querySelector('.main');
    if (!main) return;
    main.classList.toggle('is-pjax-leaving', Boolean(leaving));
  }

  function waitForExitAnimation() {
    // 无闪版不再等待淡出动画，避免点击后正文先变透明造成“闪一下”。
    return Promise.resolve();
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_\-]/g, match => `\\${match}`);
  }

  function jumpToTopOrHash(hash) {
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';

    if (hash) {
      let decodedHash = hash.slice(1);
      try { decodedHash = decodeURIComponent(decodedHash); } catch (error) {}
      const target = document.getElementById(decodedHash) || document.querySelector(`[name="${cssEscape(decodedHash)}"]`);
      if (target) {
        target.scrollIntoView({ block: 'start' });
      } else {
        window.scrollTo(0, 0);
      }
    } else {
      window.scrollTo(0, 0);
    }

    window.setTimeout(() => {
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
    }, 0);
  }

  function runEnterAnimation() {
    // 无闪版：不做 opacity/transform 入场动画。需要动画时只建议做极轻微骨架/进度提示。
    debugLog('正文已替换：无入场动画，避免视觉闪烁');
  }

  function updateHistoryState(replace, targetUrl) {
    try {
      if (replace) {
        history.replaceState({ pjax: true, url: targetUrl }, '', targetUrl);
      } else {
        history.pushState({ pjax: true, url: targetUrl }, '', targetUrl);
      }
      return true;
    } catch (error) {
      // 某些浏览器 / file:// 环境会拒绝跨本地文件 path 的 History API。
      // 这类错误不能让外层 catch 回退成整页刷新，否则就会出现“偶尔不跳、大部分跳”。
      debugWarn('History API 更新失败：已保留局部切页结果，不再回退整页刷新。file:// 下地址栏可能不会同步变化。', error);
      return false;
    }
  }

  function closeSearchResults() {
    const input = document.querySelector('[data-doc-search]');
    const results = document.querySelector('[data-search-results]');
    if (input) input.value = '';
    if (results) {
      results.classList.remove('active');
      results.innerHTML = '';
    }
  }

  async function loadPage(url, options) {
    const opts = Object.assign({ replace: false, source: 'content' }, options || {});
    if (isNavigating) {
      debugWarn('已有一次切页正在进行，本次点击被忽略', { url });
      return;
    }

    const target = new URL(url, location.href);
    const targetUrl = target.href;
    debugLog('开始局部切页', { source: opts.source, targetUrl });

    const currentContentUrl = lastLoadedUrl || location.href;

    if (sameDocumentPath(targetUrl, currentContentUrl) && target.hash) {
      debugLog('同一页面锚点跳转，不请求新页面', { hash: target.hash });
      if (!opts.replace) updateHistoryState(false, targetUrl);
      jumpToTopOrHash(target.hash);
      return;
    }

    if (sameDocumentPath(targetUrl, currentContentUrl) && !target.hash) {
      debugLog('点击的是当前页面，直接滚到顶部');
      jumpToTopOrHash('');
      return;
    }

    saveSidebarScroll();
    isNavigating = true;
    setMainBusy(true);

    try {
      await waitForExitAnimation();

      let nextTitle = '';
      let nextMainClass = 'main';
      let nextMainHtml = '';
      let nextBaseUrl = targetUrl;

      const cachedPage = await getCachedPage(targetUrl);

      if (cachedPage) {
        nextTitle = cachedPage.title || document.title;
        nextMainClass = cachedPage.mainClass || 'main';
        nextMainHtml = cachedPage.mainHtml || '';
        debugLog('从页面内容索引读取目标正文成功', { bytes: nextMainHtml.length });
      } else {
        debugLog('开始请求目标 HTML', targetUrl);
        const response = await fetch(targetUrl, { credentials: 'same-origin' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const html = await response.text();
        debugLog('目标 HTML 请求成功，开始解析', { bytes: html.length, finalUrl: response.url || targetUrl });
        const parser = new DOMParser();
        const nextDocument = parser.parseFromString(html, 'text/html');
        const nextMain = nextDocument.querySelector('.main');
        if (!nextMain) throw new Error('目标页面没有找到 .main 区域');

        nextTitle = nextDocument.title || document.title;
        nextMainClass = nextMain.className || 'main';
        nextMainHtml = nextMain.innerHTML;
        nextBaseUrl = response.url || targetUrl;
      }

      main = document.querySelector('.main');
      if (!main) throw new Error('当前页面没有找到 .main 区域');

      document.title = nextTitle || document.title;

      // 关键顺序：先在同一个 JS 任务里把窗口滚到顶部，再替换正文，避免先显示新页面中部再跳到顶部。
      const previousScrollBehaviorBeforeSwap = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, 0);

      debugLog('开始替换右侧正文 .main，左侧目录不会重建');
      main.className = nextMainClass || 'main';
      main.innerHTML = nextMainHtml;
      prepareLinks(main, nextBaseUrl);

      updateHistoryState(opts.replace, targetUrl);

      lastLoadedUrl = targetUrl;
      updateActiveLink(targetUrl, { reveal: false, expandActive: true });
      closeSearchResults();
      jumpToTopOrHash(target.hash);
      window.setTimeout(() => {
        document.documentElement.style.scrollBehavior = previousScrollBehaviorBeforeSwap;
      }, 0);
      runEnterAnimation();
      debugLog('局部切页完成', { currentUrl: location.href, sidebarScrollTop: sidebar ? sidebar.scrollTop : null });
    } catch (error) {
      debugWarn('局部切页失败。若当前是 file://，优先检查 _资源/页面内容索引.js 是否存在且可加载。', error);
      if (location.protocol === 'file:') {
        // file:// 下普通跳转会重建整页，直接造成左侧目录刷新/跳动。
        // 因此调试版不再自动 window.location.href；让控制台错误暴露出来，避免“失败后看起来像随机跳页”。
        debugWarn('file:// 调试保护：已阻止整页回退跳转，当前页面保持不变。', { targetUrl });
      } else {
        window.location.href = targetUrl;
      }
    } finally {
      isNavigating = false;
      setMainBusy(false);
    }
  }

  function initPjaxClickHandling() {
    document.addEventListener('click', event => {
      const link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
      if (!link) return;
      if (event.defaultPrevented) return;
      if (isModifiedClick(event)) return;
      if (link.target && link.target !== '_self') return;
      if (link.hasAttribute('download')) return;

      const targetUrl = link.dataset.pjaxUrl || resolveUrl(link.getAttribute('href'), location.href);
      if (!isInternalDocUrl(targetUrl)) {
        debugLog('跳过非站内 HTML 链接，浏览器按默认方式处理', targetUrl);
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const source = link.closest('.sidebar') ? 'sidebar' : (link.closest('[data-search-results]') ? 'search' : 'content');
      debugLog('已拦截点击，准备局部切页', { source, targetUrl });
      loadPage(targetUrl, { source });
    }, true);
  }

  function initPopStateHandling() {
    if (!history.state || !history.state.pjax) {
      updateHistoryState(true, location.href);
    }

    window.addEventListener('popstate', () => {
      if (location.href === lastLoadedUrl) return;
      loadPage(location.href, { replace: true, source: 'history' });
    });
  }

  window.addEventListener('pageshow', () => {
    const navEntry = performance && performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
    debugLog('页面生命周期 pageshow。正常 PJAX 点击不会反复触发这条；如果每次点击都触发，说明发生了整页刷新。', {
      url: location.href,
      navigationType: navEntry ? navEntry.type : 'unknown'
    });
  });

  debugLog('文档脚本初始化完成', { url: location.href, siteRoot: siteRoot.href });
  if (location.protocol === 'file:') {
    ensurePageCache().catch(error => {
      debugWarn('页面内容索引预加载失败：后续点击将不会自动整页跳转，请优先修复索引路径。', error);
    });
  }
  prepareLinks(document, location.href);
  syncNavLinks();
  initCollapsibleNav();
  initSidebarScroll();
  initSearch();
  initPjaxClickHandling();
  initPopStateHandling();
})();
