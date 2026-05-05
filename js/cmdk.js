// ============ ⌘K command palette ============
// Spotlight-style fuzzy search over: services / clusters / pages / envs /
// projects / actions. Keyboard-only navigation.

APM.cmdkOpen = false;
APM.cmdkQuery = '';
APM.cmdkIndex = 0;
APM._cmdkLastList = [];

APM._cmdkPages = [
  ['overview',   '服务概览'],
  ['traces',     '调用链 Traces'],
  ['logs',       '日志 Logs'],
  ['exceptions', '异常 Exceptions'],
  ['topology',   '拓扑 Topology'],
  ['database',   '数据库 DB Calls'],
  ['redis',      'Redis 缓存'],
  ['kafka',      'Kafka 消息'],
  ['llm',        'LLM / GenAI'],
  ['dashboards', '仪表盘 Dashboards'],
  ['alerts',     '告警 Alerts'],
  ['onboarding', '接入指导'],
  ['settings',   '设置']
];

APM._cmdkBuildItems = function() {
  const items = [];
  // Services (current project)
  APM.services.forEach(s => items.push({
    type: 'service', label: s.name, hint: s.lang + ' · ' + s.instances + ' 实例',
    keywords: [s.id, s.name, s.lang].join(' '),
    action: () => APM.go('service', { id: s.id })
  }));
  // DB clusters
  APM.dbClusters.forEach(c => items.push({
    type: 'db', label: c.name,
    hint: (APM.dbTypeMeta[c.type] || {label:c.type}).label + ' · ' + c.host,
    keywords: [c.id, c.name, c.type, 'database', 'db'].join(' '),
    action: () => APM.go('database', { clusterId: c.id })
  }));
  // Redis clusters
  APM.redisClusters.forEach(c => items.push({
    type: 'redis', label: c.name,
    hint: 'Redis · ' + c.mode + ' · ' + c.nodes + ' 节点',
    keywords: [c.id, c.name, 'redis', c.mode].join(' '),
    action: () => APM.go('redis', { clusterId: c.id })
  }));
  // Kafka clusters
  APM.kafkaClusters.forEach(c => items.push({
    type: 'kafka', label: c.name,
    hint: 'Kafka · ' + c.brokers + ' brokers',
    keywords: [c.id, c.name, 'kafka', 'mq'].join(' '),
    action: () => APM.go('kafka', { clusterId: c.id })
  }));
  // Pages
  APM._cmdkPages.forEach(([id, label]) => items.push({
    type: 'page', label, hint: '跳转',
    keywords: [id, label].join(' '),
    action: () => APM.go(id)
  }));
  // Envs
  (APM._envs || []).forEach(e => items.push({
    type: 'env', label: '切到环境 · ' + e.label,
    hint: e.tag,
    keywords: ['env', 'environment', e.id, e.label, e.tag].join(' '),
    action: () => APM.pickEnv(e.id)
  }));
  // Projects across all domains
  APM.domains.forEach(d => d.projects.forEach(p => items.push({
    type: 'project', label: '切到项目 · ' + p.label,
    hint: d.label + ' / ' + p.id,
    keywords: ['project', p.id, p.label, d.id, d.label].join(' '),
    action: () => {
      // Cross-domain pick: switch domain too if needed.
      if (APM.currentDomain !== d.id) {
        APM.currentDomain = d.id;
      }
      APM.pickProject(p.id);
    }
  })));
  // Actions
  items.push({ type:'action', label:'切换主题（Light / Dark）', hint:'theme',
    keywords:'theme dark light 主题',
    action: () => APM.toggleTheme() });
  items.push({ type:'action', label:'折叠 / 展开 侧边栏', hint:'sidebar',
    keywords:'sidebar collapse 侧栏',
    action: () => APM.toggleSidebar() });
  items.push({ type:'action', label:'手动刷新当前页', hint:'refresh',
    keywords:'refresh reload 刷新',
    action: () => APM.manualRefresh() });
  items.push({ type:'action', label:'自定义时间范围', hint:'time',
    keywords:'time custom range 时间',
    action: () => APM.openCustomTimeRange() });
  items.push({ type:'action', label:'注销登录', hint:'logout',
    keywords:'logout sign out 注销',
    action: () => APM.signOut() });
  return items;
};

APM._cmdkFilter = function(items, query) {
  if (!query) return items.slice(0, 50);
  const q = query.toLowerCase().trim();
  const tokens = q.split(/\s+/).filter(Boolean);
  const out = [];
  items.forEach(it => {
    const hay = ((it.label || '') + ' ' + (it.keywords || '')).toLowerCase();
    if (!tokens.every(t => hay.includes(t))) return;
    let score = 0;
    if (hay.includes(q)) score += 50;
    if ((it.label || '').toLowerCase().startsWith(q)) score += 40;
    if ((it.label || '').toLowerCase().includes(q)) score += 20;
    out.push({ it, score });
  });
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 50).map(x => x.it);
};

APM._cmdkTypeIcon = {
  service: '⊙', db: '🗄', redis: '⚡', kafka: '⊞',
  page: '→', env: '●', project: '◆', action: '⚙'
};
APM._cmdkGroupLabel = {
  service: '服务', db: '数据库集群', redis: 'Redis 集群', kafka: 'Kafka 集群',
  page: '页面', env: '环境', project: '项目', action: '动作'
};
APM._cmdkGroupOrder = ['service','db','redis','kafka','page','env','project','action'];

APM.openCmdk = function() {
  if (APM.cmdkOpen) return;
  APM.cmdkOpen = true;
  APM.cmdkQuery = '';
  APM.cmdkIndex = 0;
  let root = document.getElementById('cmdk-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'cmdk-root';
    document.body.appendChild(root);
  }
  root.innerHTML = `
    <div class="cmdk-bg"></div>
    <div class="cmdk" role="dialog" aria-modal="true" aria-label="Command palette">
      <div class="cmdk-input-row">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="cmdk-q" placeholder="搜索服务、集群、页面、动作…" autocomplete="off" spellcheck="false">
        <span class="kbd">ESC</span>
      </div>
      <div id="cmdk-list" class="cmdk-list"></div>
      <div class="cmdk-foot">
        <span><span class="kbd">↑↓</span>移动</span>
        <span><span class="kbd">↵</span>选择</span>
        <span><span class="kbd">⌘K</span>开关</span>
        <span style="margin-left:auto;color:var(--text-3);">${APM.services.length} 服务 · ${APM.dbClusters.length + APM.redisClusters.length + APM.kafkaClusters.length} 集群 · ${APM._cmdkPages.length} 页面</span>
      </div>
    </div>
  `;
  const inp = document.getElementById('cmdk-q');
  inp.addEventListener('input', () => {
    APM.cmdkQuery = inp.value;
    APM.cmdkIndex = 0;
    APM._cmdkRender();
  });
  inp.addEventListener('keydown', (e) => {
    const list = APM._cmdkLastList || [];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      APM.cmdkIndex = Math.min(list.length - 1, APM.cmdkIndex + 1);
      APM._cmdkRender(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      APM.cmdkIndex = Math.max(0, APM.cmdkIndex - 1);
      APM._cmdkRender(true);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const it = list[APM.cmdkIndex];
      if (it) { APM.closeCmdk(); it.action(); }
    } else if (e.key === 'Escape') {
      APM.closeCmdk();
    }
  });
  root.querySelector('.cmdk-bg').addEventListener('click', () => APM.closeCmdk());
  setTimeout(() => inp && inp.focus(), 0);
  APM._cmdkRender();
};

APM.closeCmdk = function() {
  APM.cmdkOpen = false;
  const r = document.getElementById('cmdk-root');
  if (r) r.remove();
};

APM._cmdkRender = function(scrollIntoView) {
  const list = APM._cmdkFilter(APM._cmdkBuildItems(), APM.cmdkQuery);
  APM._cmdkLastList = list;
  const el = document.getElementById('cmdk-list');
  if (!el) return;
  if (list.length === 0) {
    el.innerHTML = '<div class="cmdk-empty">无匹配项 · 试试 <code>checkout</code> / <code>kafka</code> / <code>dark</code></div>';
    return;
  }
  // Group by type
  const groups = {};
  list.forEach((it, i) => {
    (groups[it.type] = groups[it.type] || []).push({ ...it, _idx: i });
  });
  let html = '';
  APM._cmdkGroupOrder.forEach(k => {
    if (!groups[k]) return;
    html += `<div class="cmdk-group">${APM._cmdkGroupLabel[k]} (${groups[k].length})</div>`;
    groups[k].forEach(it => {
      html += `<div class="cmdk-item ${it._idx === APM.cmdkIndex ? 'active' : ''}" data-idx="${it._idx}">
        <span class="cmdk-ic cmdk-ic-${it.type}">${APM._cmdkTypeIcon[it.type] || '·'}</span>
        <span class="cmdk-label">${it.label}</span>
        <span class="cmdk-hint">${it.hint || ''}</span>
      </div>`;
    });
  });
  el.innerHTML = html;
  el.querySelectorAll('.cmdk-item').forEach(node => {
    node.addEventListener('click', () => {
      const idx = parseInt(node.dataset.idx, 10);
      const it = list[idx];
      if (it) { APM.closeCmdk(); it.action(); }
    });
    node.addEventListener('mousemove', () => {
      const idx = parseInt(node.dataset.idx, 10);
      if (idx !== APM.cmdkIndex) {
        APM.cmdkIndex = idx;
        // Skip full re-render to avoid jitter — just retag active classes
        el.querySelectorAll('.cmdk-item').forEach(n => n.classList.toggle('active', parseInt(n.dataset.idx,10) === APM.cmdkIndex));
      }
    });
  });
  if (scrollIntoView) {
    const active = el.querySelector('.cmdk-item.active');
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
  }
};

// Global keyboard listener — ⌘K / Ctrl+K
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    if (APM.cmdkOpen) APM.closeCmdk();
    else APM.openCmdk();
  }
});
