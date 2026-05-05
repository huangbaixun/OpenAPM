// ============ Shell: topbar, sidebar, page routing ============
APM.currentPage = 'overview';
APM.currentEnv = APM.currentEnv || 'all';
APM.sidebarCollapsed = APM.sidebarCollapsed || false;
APM.timeRange = APM.timeRange || { id: '1h', label: 'Last 1h' };
APM.autoRefreshSec = APM.autoRefreshSec || 30;
APM._envs = [
  { id:'all',        label:'全部环境',    tag:'all',  color:'var(--text-3)' },
  { id:'production', label:'Production', tag:'prod', color:'var(--success)' },
  { id:'staging',    label:'Staging',    tag:'stg',  color:'var(--warning)' },
  { id:'development',label:'Development',tag:'dev',  color:'var(--purple)' }
];
APM._timeRanges = [
  { id:'15m', label:'最近 15 分钟', short:'Last 15m', kbd:'15m' },
  { id:'1h',  label:'最近 1 小时',   short:'Last 1h',  kbd:'1h'  },
  { id:'6h',  label:'最近 6 小时',   short:'Last 6h',  kbd:'6h'  },
  { id:'24h', label:'最近 24 小时',  short:'Last 24h', kbd:'24h' }
];

APM.svgI = {
  // small icons
  caret: '<svg class="caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>',
  search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  clock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>',
  refresh: '<svg id="refreshIcon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>',
  moon: '<svg class="theme-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>',
  sun: '<svg class="theme-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
  bell: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>',
  // logo
  logo: '<svg width="22" height="22" viewBox="0 0 32 32" fill="none"><g fill="#ffffff"><path d="M11.2 3.2 L10 7.4 L13.2 5.8 Z"/><path d="M13.6 2.4 L13.2 7.2 L16.4 5.2 Z"/><path d="M16.2 3.4 L16 7.8 L18.6 6.6 Z"/><circle cx="14.6" cy="11.2" r="4.8"/><path d="M18.4 10.6 L29 11.8 L18.4 13.6 Z"/><path d="M11.6 14 C 8.6 16, 8 20, 10 24 C 12 27, 16 27, 18 24.5 C 20 22, 19 18, 16.8 15.6 Z"/><path d="M9.2 22 L5.4 26 L10.4 25 Z"/></g><circle cx="15.8" cy="10.6" r="1.1" fill="#1d1d1f"/></svg>'
};

APM.navItems = [
  { group: '监控 OBSERVE', items: [
    { id: 'overview', label: '服务概览', icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>' },
    { id: 'traces', label: '调用链 Traces', icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="4" cy="6" r="2"/><circle cx="20" cy="18" r="2"/><path d="M6 6h6a4 4 0 014 4v4a4 4 0 004 4"/></svg>' },
    { id: 'logs', label: '日志 Logs', icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></svg>' },
    { id: 'exceptions', label: '异常 Exceptions', icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' }
  ]},
  { group: '分析 ANALYZE', items: [
    { id: 'topology', label: '拓扑 Topology', icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><path d="M9 6h6M7.5 8.5L10 15.5M16.5 8.5L14 15.5"/></svg>' },
    { id: 'database', label: '数据库 DB Calls', icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>' },
    { id: 'redis', label: 'Redis 缓存', icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 6c0-1.5 4-3 9-3s9 1.5 9 3-4 3-9 3-9-1.5-9-3z"/><path d="M3 12c0 1.5 4 3 9 3s9-1.5 9-3"/><path d="M3 6v12c0 1.5 4 3 9 3s9-1.5 9-3V6"/><polyline points="8 9 12 11 16 9"/></svg>' },
    { id: 'kafka', label: 'Kafka 消息', icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M8.2 7l3.4 9M15.8 7l-3.4 9"/></svg>', badge: 'NEW' },
    { id: 'llm', label: 'LLM / GenAI', icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 014 4v0a4 4 0 014 4v2a4 4 0 01-4 4h0v0a4 4 0 01-4 4 4 4 0 01-4-4v0h0a4 4 0 01-4-4v-2a4 4 0 014-4v0a4 4 0 014-4z"/><path d="M9 11h.01M15 11h.01M9 15c.83.67 1.83 1 3 1s2.17-.33 3-1"/></svg>', badge: 'NEW' }
  ]},
  { group: '平台 PLATFORM', items: [
    { id: 'dashboards', label: '仪表盘 Dashboards', icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>' },
    { id: 'alerts', label: '告警 Alerts', icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>', badge: APM.activeAlertCount },
    { id: 'onboarding', label: '接入指导', icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 7h7l-6 4 2 8-6-4-6 4 2-8-6-4h7z"/></svg>' },
    { id: 'settings', label: '设置', icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>' }
  ]}
];

APM.renderTopbar = function() {
  const dom = APM.domains.find(d => d.id === APM.currentDomain);
  const proj = dom.projects.find(p => p.id === APM.currentProject) || dom.projects[0];
  const tb = document.getElementById('topbar');
  tb.innerHTML = `
    <div class="brand">
      <div class="logo" title="啄木鸟 APM 2.0">${APM.svgI.logo}</div>
      <div><div class="name">啄木鸟 <span class="sub">APM 2.0</span></div></div>
    </div>
    <div class="filters">
      <div class="scope-pill">
        <div class="dd" id="domDD" style="display:inline-block;">
          <div class="sp-seg" onclick="APM.toggleDD('domDD', event)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
            <span class="k">Domain</span><span>${dom.name}</span>
            ${APM.svgI.caret}
          </div>
          <div class="dd-menu" style="min-width: 240px;">
            <div class="dd-section">租户域</div>
            ${APM.domains.map(d => `<div class="dd-item ${d.id===APM.currentDomain?'selected':''}" onclick="APM.pickDomain('${d.id}')"><span><span class="env-dot" style="background:${d.color}"></span>${d.name}</span><span class="kbd">${d.label}</span></div>`).join('')}
          </div>
        </div>
        <span class="sp-sep">/</span>
        <div class="dd" id="projDD" style="display:inline-block;">
          <div class="sp-seg" onclick="APM.toggleDD('projDD', event)">
            <span class="k">Project</span><span style="color:${proj.color}">●</span><span>${proj.name}</span>
            ${APM.svgI.caret}
          </div>
          <div class="dd-menu" style="min-width: 220px;">
            <div class="dd-section">${dom.label} · 项目</div>
            ${dom.projects.map(p => `<div class="dd-item ${p.id===APM.currentProject?'selected':''}" onclick="APM.pickProject('${p.id}')"><span><span class="env-dot" style="background:${p.color}"></span>${p.name}</span><span class="kbd">${p.label}</span></div>`).join('')}
          </div>
        </div>
      </div>

      <div class="dd" id="envDD">
        <button class="pill" onclick="APM.toggleDD('envDD', event)">
          <span class="dot" style="background:${(APM._envs.find(e=>e.id===APM.currentEnv)||APM._envs[0]).color};"></span><span class="k">环境</span><span class="v">${(APM._envs.find(e=>e.id===APM.currentEnv)||APM._envs[0]).label}</span>${APM.svgI.caret}
        </button>
        <div class="dd-menu" style="min-width: 200px;">
          <div class="dd-section">部署环境</div>
          ${APM._envs.map(e => `<div class="dd-item ${e.id===APM.currentEnv?'selected':''}" onclick="APM.pickEnv('${e.id}')"><span><span class="env-dot" style="background:${e.color};"></span>${e.label}</span><span class="kbd">${e.tag}</span></div>`).join('')}
        </div>
      </div>
    </div>

    <div class="spacer"></div>

    <div class="right">
      <div class="dd" id="timeDD">
        <button class="pill" onclick="APM.toggleDD('timeDD', event)">${APM.svgI.clock}<span class="k">时间</span><span class="v">${APM.timeRange.short || APM.timeRange.label}</span>${APM.svgI.caret}</button>
        <div class="dd-menu">
          ${APM._timeRanges.map(r => `<div class="dd-item ${APM.timeRange.id===r.id?'selected':''}" onclick="APM.pickTimeRange('${r.id}')"><span>${r.label}</span><span class="kbd">${r.kbd}</span></div>`).join('')}
          <div class="dd-sep"></div>
          <div class="dd-item" onclick="APM.openCustomTimeRange()"><span>自定义…</span></div>
        </div>
      </div>

      <div class="refresh-group" title="自动刷新">
        <button class="icon-btn" onclick="APM.manualRefresh()">${APM.svgI.refresh}</button>
        <select id="autoRefresh" onchange="APM.setAutoRefresh(this.value)">
          <option value="0" ${APM.autoRefreshSec===0?'selected':''}>关闭</option>
          <option value="30" ${APM.autoRefreshSec===30?'selected':''}>30s</option>
          <option value="60" ${APM.autoRefreshSec===60?'selected':''}>1m</option>
          <option value="300" ${APM.autoRefreshSec===300?'selected':''}>5m</option>
        </select>
      </div>

      <button class="icon-btn" title="告警 (${APM.activeAlertCount} firing)" onclick="APM.go('alerts')" style="position:relative;">
        ${APM.svgI.bell}
        ${APM.activeAlertCount > 0 ? `<span style="position:absolute; top:3px; right:3px; min-width:14px; height:14px; padding: 0 3px; border-radius:7px; background:var(--danger); color:white; font-size:9px; font-weight:700; display:flex; align-items:center; justify-content:center;">${APM.activeAlertCount}</span>` : ''}
      </button>

      <button class="icon-btn theme-btn" onclick="APM.toggleTheme()">${APM.svgI.moon}${APM.svgI.sun}</button>

      <div class="dd" id="userDD" style="display:inline-block;">
        <div class="avatar" onclick="APM.toggleDD('userDD', event)" style="cursor:pointer;">${APM.currentUser.initials}</div>
        <div class="dd-menu" style="min-width: 200px;">
          <div class="dd-section">${APM.currentUser.email}</div>
          <div class="dd-item" onclick="APM.go('settings');APM.toggleDD('userDD')"><span>个人设置</span></div>
          <div class="dd-item" onclick="APM.toast('快捷键面板：⌘K','info');APM.toggleDD('userDD')"><span>快捷键</span></div>
          <div class="dd-sep"></div>
          <div class="dd-item" onclick="APM.signOut()"><span style="color:var(--danger);">注销</span></div>
        </div>
      </div>
    </div>
  `;
};

APM.renderSidebar = function() {
  const sb = document.getElementById('sidebar');
  const collapsed = !!APM.sidebarCollapsed;
  let html = `<div class="sidebar-toggle" onclick="APM.toggleSidebar()" title="${collapsed?'展开侧边栏':'收起侧边栏'}">
    <svg class="ic-collapse" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    <span class="lbl">收起</span>
  </div>`;
  APM.navItems.forEach(group => {
    html += `<div class="nav-group"><div class="label">${group.group}</div>`;
    group.items.forEach(it => {
      const active = it.id === APM.currentPage ? 'active' : '';
      const badge = it.badge ? `<span class="badge-mini" style="background:var(--danger); color:white;">${it.badge}</span>` : '';
      html += `<div class="nav-item ${active}" data-page="${it.id}" onclick="APM.go('${it.id}')" title="${it.label}"><span class="ico">${it.icon}</span><span class="lbl">${it.label}</span>${badge}</div>`;
    });
    html += '</div>';
  });
  sb.innerHTML = html;
};

APM.toggleSidebar = function() {
  APM.sidebarCollapsed = !APM.sidebarCollapsed;
  document.querySelector('.app').classList.toggle('sidebar-collapsed', APM.sidebarCollapsed);
  APM.renderSidebar();
};

APM.go = function(page, params) {
  APM.currentPage = page;
  APM.pageParams = params || {};
  APM.renderSidebar();
  APM.renderPage();
  document.querySelector('.main').scrollTop = 0;
};

APM.renderPage = function() {
  const m = document.getElementById('main');
  const renderers = {
    overview: APM.renderOverview,
    service: APM.renderServiceDetail,
    traces: APM.renderTraces,
    logs: APM.renderLogs,
    topology: APM.renderTopology,
    alerts: APM.renderAlerts,
    exceptions: APM.renderExceptions,
    dashboards: APM.renderDashboards,
    onboarding: APM.renderOnboarding,
    database: APM.renderDatabase,
    redis: APM.renderRedis,
    kafka: APM.renderKafka,
    llm: APM.renderLLM,
    settings: APM.renderSettings
  };
  const fn = renderers[APM.currentPage];
  m.innerHTML = `<section class="page active">${fn ? fn() : APM.placeholderPage(APM.currentPage)}</section>`;
  if (APM.afterRender) APM.afterRender();
  APM.afterRender = null;
  if (APM._restoreFocus) APM._restoreFocus();
};

APM.placeholderPage = function(name) {
  return `<div class="page-title">${name}</div><div class="placeholder" style="margin-top:20px;"><div class="icon">🔧</div>该模块为预留位 · 即将上线</div>`;
};

// ============ DD / theme / refresh ============
APM.toggleDD = function(id, ev) {
  if (ev) ev.stopPropagation();
  document.querySelectorAll('.dd.open').forEach(d => { if (d.id !== id) d.classList.remove('open'); });
  const el = document.getElementById(id);
  if (el) el.classList.toggle('open');
};
APM._applyProject = function(id) {
  APM.currentProject = id;
  // Swap active service set; fall back to eshop if no per-project preset.
  APM._projectServicesAll = APM.projectServices[id] || APM.projectServices['eshop'];
  APM._reapplyEnv();
  // Clear caches that snapshot APM.services (e.g. topology time replay).
  APM._svcOrig = null;
  // Reset selected service so service detail page can default to first of new set.
  if (APM.pageParams && APM.pageParams.id) APM.pageParams = {};
  APM.topoSelected = APM.services[0] && APM.services[0].id;
};
APM._reapplyEnv = function() {
  const all = APM._projectServicesAll || APM.projectServices[APM.currentProject] || APM.projectServices['eshop'];
  if (!APM.currentEnv || APM.currentEnv === 'all') {
    APM.services = all.slice();
  } else {
    APM.services = all.filter(s => (s.env || 'production') === APM.currentEnv);
  }
};
APM.pickDomain = function(id) {
  APM.currentDomain = id;
  const dom = APM.domains.find(d => d.id === id);
  APM._applyProject(dom.projects[0].id);
  APM.toggleDD('domDD');
  APM.renderTopbar();
  APM.renderPage();
  APM.toast('已切换到域 · ' + dom.name, 'info');
};
APM.pickProject = function(id) {
  APM._applyProject(id);
  APM.toggleDD('projDD');
  APM.renderTopbar();
  APM.renderPage();
  APM.toast('已切换到项目 · ' + id, 'info');
};
APM.toggleTheme = function() {
  const root = document.documentElement;
  const cur = root.getAttribute('data-theme') || 'light';
  root.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
};
APM.manualRefresh = function() {
  const ic = document.getElementById('refreshIcon');
  if (ic) { ic.classList.add('spin'); setTimeout(() => ic.classList.remove('spin'), 1000); }
  APM.renderPage();
};
APM.pickEnv = function(envId) {
  APM.currentEnv = envId;
  APM._reapplyEnv();
  const e = APM._envs.find(x=>x.id===envId);
  APM.toggleDD('envDD');
  APM.renderTopbar();
  APM.renderPage();
  APM.toast(`环境切换 → ${e.label} · 命中 ${APM.services.length} 个服务`, 'info');
};
APM.pickTimeRange = function(rid) {
  const r = APM._timeRanges.find(x=>x.id===rid);
  if (!r) return;
  APM.timeRange = { id: r.id, label: r.label, short: r.short };
  APM.toggleDD('timeDD');
  APM.renderTopbar();
  APM.renderPage();
};
APM.openCustomTimeRange = function() {
  APM.toggleDD('timeDD');
  const m = APM.openModal({
    title: '自定义时间范围',
    width: 460,
    body: `
      <div class="form-grid-2">
        ${APM.field('开始时间', APM.input('start','', 'type="datetime-local"'))}
        ${APM.field('结束时间', APM.input('end','', 'type="datetime-local"'))}
      </div>
      <div class="form-help" style="margin-top:6px;">仅作展示 · 实际查询窗口由 collector 决定</div>
    `,
    footer: `<button class="pill" data-act="cancel">取消</button><button class="pill primary" data-act="ok">应用</button>`
  });
  m.el.querySelector('[data-act="cancel"]').onclick = () => m.close();
  m.el.querySelector('[data-act="ok"]').onclick = () => {
    const v = APM.modalForm(m.id);
    if (!v.start || !v.end) { APM.toast('请填写起止时间', 'warn'); return; }
    const fmt = (s) => s.replace('T',' ').replace(/:00$/,'');
    APM.timeRange = { id:'custom', label:`自定义 ${fmt(v.start)} ~ ${fmt(v.end)}`, short:`${fmt(v.start).slice(5)} ~ ${fmt(v.end).slice(5)}` };
    m.close();
    APM.renderTopbar();
    APM.renderPage();
    APM.toast('已应用自定义时间', 'success');
  };
};
APM.setAutoRefresh = function(secStr) {
  const sec = parseInt(secStr || '0', 10) || 0;
  APM.autoRefreshSec = sec;
  if (APM._refreshTimer) { clearInterval(APM._refreshTimer); APM._refreshTimer = null; }
  if (sec > 0) {
    APM._refreshTimer = setInterval(() => APM.manualRefresh(), sec * 1000);
    APM.toast(`自动刷新已启用 · ${sec >= 60 ? sec/60 + 'm' : sec + 's'}`, 'info');
  } else {
    APM.toast('自动刷新已关闭', 'info');
  }
};
APM.signOut = function() {
  APM.toggleDD('userDD');
  APM.confirm({
    title: '注销登录',
    msg: '确认从 啄木鸟 APM 2.0 注销当前账户 ' + APM.currentUser.email + ' 吗？',
    danger: true,
    okLabel: '注销',
    onOk: () => APM.toast('已注销 · 原型未挂载真实 SSO', 'info')
  });
};

document.addEventListener('click', (e) => {
  document.querySelectorAll('.dd.open').forEach(d => {
    if (!d.contains(e.target)) d.classList.remove('open');
  });
});

// ============ Sparkline helper ============
APM.sparkline = function(values, color, w, h) {
  w = w || 100; h = h || 28;
  const max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${(i*step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`).join(' ');
  const lastY = (h - ((values[values.length-1] - min) / range) * h).toFixed(1);
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none">
    <defs><linearGradient id="sp${color.replace(/[^a-z0-9]/gi,'')}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".22"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <polygon points="0,${h} ${pts} ${w},${h}" fill="url(#sp${color.replace(/[^a-z0-9]/gi,'')})"/>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5"/>
    <circle cx="${w}" cy="${lastY}" r="2" fill="${color}"/>
  </svg>`;
};
