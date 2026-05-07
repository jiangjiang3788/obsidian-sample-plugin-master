(function () {
  const sidebar = document.querySelector('.sidebar');
  const navLinks = Array.from(document.querySelectorAll('.nav-link'));
  const collapsibles = Array.from(document.querySelectorAll('.nav-section, .nav-subsection'));
  const rootPrefix = (document.body && document.body.dataset.docRoot) || '';
  const NAV_KEY_PREFIX = 'think-doc-nav-node:';
  const SIDEBAR_SCROLL_KEY = 'think-doc-sidebar-scroll:' + location.pathname.replace(/\/[^/]*$/, '/');

  function normalizePath(value) {
    try {
      return decodeURIComponent(value || '').split('#')[0].replace(/\/+/g, '/');
    } catch (error) {
      return (value || '').split('#')[0].replace(/\/+/g, '/');
    }
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

  const currentPath = normalizePath(location.pathname);
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    const linkPath = normalizePath(new URL(href, location.href).pathname);
    if (linkPath === currentPath) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  collapsibles.forEach((node, index) => {
    const title = getDirectTitle(node);
    if (!title) return;
    const nodeId = node.dataset.navKey || makeNodeId(title, index);
    const key = NAV_KEY_PREFIX + nodeId;
    const hasActiveLink = Boolean(node.querySelector('.nav-link.active'));
    const savedState = storageGet(key);
    const defaultCollapsed = false;
    const shouldCollapse = savedState ? savedState === 'collapsed' && !hasActiveLink : defaultCollapsed;

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

  if (sidebar) {
    const saveSidebarScroll = () => sessionSet(SIDEBAR_SCROLL_KEY, String(sidebar.scrollTop));
    let scrollTimer = 0;
    const savedScroll = Number(sessionGet(SIDEBAR_SCROLL_KEY));
    if (Number.isFinite(savedScroll) && savedScroll >= 0) {
      sidebar.scrollTop = Math.min(savedScroll, Math.max(0, sidebar.scrollHeight - sidebar.clientHeight));
    }
    const activeLink = sidebar.querySelector('.nav-link.active');
    revealInsideWithoutAnimation(sidebar, activeLink);
    sidebar.addEventListener('scroll', () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(saveSidebarScroll, 80);
    }, { passive: true });
    navLinks.forEach(link => link.addEventListener('click', saveSidebarScroll));
    window.addEventListener('pagehide', saveSidebarScroll);
  }

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
      ? matched.map(item => `<a class="search-result" href="${rootPrefix}${item.url}"><strong>${item.title}</strong><br><span>${item.summary}</span></a>`).join('')
      : '<div class="search-result">没有找到。可以换一个关键词，比如：需求、命令、设置、文件地图、评审。</div>';
    results.classList.add('active');
  });
})();
