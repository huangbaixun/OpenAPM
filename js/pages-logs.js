// ============ Logs page ============
APM.logFilter = APM.logFilter || { level: 'ALL', svc: null };
APM.logSearch = APM.logSearch || '';
APM.logsPaused = APM.logsPaused || false;
APM.logConds = APM.logConds || [
  { key:'level', op:'in', val:'[ERROR, WARN]' }
];

APM.setLogLevel = function(lv) { APM.logFilter.level = lv; APM.renderPage(); };
APM.setLogSearch = function(v) { APM.logSearch = v; APM.renderPage(); };
APM.toggleLogsPaused = function() {
  APM.logsPaused = !APM.logsPaused;
  APM.renderPage();
  APM.toast(APM.logsPaused ? '日志流已暂停' : '已恢复 Live Tail', APM.logsPaused ? 'warn' : 'success');
};
APM.addLogCond = function() {
  APM.logConds.push({ key:'svc', op:'=', val:'' });
  APM.renderPage();
};
APM.removeLogCond = function(idx) {
  APM.logConds.splice(idx, 1);
  APM.renderPage();
};
APM.editLogCond = function(idx) {
  const c = APM.logConds[idx];
  if (!c) return;
  const m = APM.openModal({
    title: '编辑日志条件',
    width: 460,
    body: `
      <div class="form-grid-2">
        ${APM.field('字段', APM.input('key', c.key))}
        ${APM.field('操作符', APM.select('op', ['=','!=','in','=~','>','<'], c.op))}
      </div>
      ${APM.field('值', APM.input('val', c.val))}
    `,
    footer: `<button class="pill" data-act="cancel">取消</button><button class="pill primary" data-act="ok">应用</button>`
  });
  m.el.querySelector('[data-act="cancel"]').onclick = () => m.close();
  m.el.querySelector('[data-act="ok"]').onclick = () => {
    const v = APM.modalForm(m.id);
    APM.logConds[idx] = { key:v.key, op:v.op, val:v.val };
    m.close();
    APM.renderPage();
  };
};

APM.renderLogs = function() {
  const svcFilter = (APM.pageParams && (APM.pageParams.svc || APM.pageParams.svcFilter)) || null;
  // Consume endpoint param once on entry, then clear so user edits to search box stick.
  if (APM.pageParams && APM.pageParams.endpoint) {
    APM.logSearch = APM.pageParams.endpoint;
    delete APM.pageParams.endpoint;
  }
  return `
    <div class="between">
      <div>
        <div class="page-title">日志 Logs</div>
        <div class="page-sub">基于 OTel Logs · ClickHouse 列存 · 全字段全文检索</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <span class="live-pulse" style="${APM.logsPaused?'opacity:.5;':''}"><span class="ld"></span>${APM.logsPaused ? '已暂停' : 'Live Tail · 1.2k logs/s'}</span>
        <button class="pill ${APM.logsPaused ? 'primary' : ''}" onclick="APM.toggleLogsPaused()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${APM.logsPaused ? '<polygon points="5 3 19 12 5 21 5 3"/>' : '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>'}</svg>
          ${APM.logsPaused ? '继续' : '暂停'}
        </button>
      </div>
    </div>
    ${APM.logsBody(svcFilter, false)}
  `;
};

APM.logsBody = function(svcFilter, embedded) {
  // Hide logs whose service isn't in the current project — keeps logs page consistent with sidebar/topbar scope.
  let logs = APM.logs.filter(l => APM.inProject(l.svc));
  if (svcFilter) logs = logs.filter(l => l.svc === svcFilter);
  // Apply level filter
  if (APM.logFilter.level && APM.logFilter.level !== 'ALL') {
    logs = logs.filter(l => l.sev === APM.logFilter.level);
  }
  // Apply user-added conditions (best-effort)
  APM.logConds.forEach(c => {
    if (!c.val) return;
    const mk = (l) => {
      const v = (c.key === 'level' || c.key === 'sev') ? l.sev : (c.key === 'svc' || c.key === 'service') ? l.svc : l[c.key] || l.msg;
      if (c.op === '=') return v === c.val;
      if (c.op === '!=') return v !== c.val;
      if (c.op === 'in') {
        const items = c.val.replace(/[\[\]\s]/g,'').split(',').filter(Boolean);
        return items.length === 0 || items.includes(v);
      }
      if (c.op === '=~') return String(v).includes(c.val);
      return true;
    };
    logs = logs.filter(mk);
  });
  // Apply free-text search
  const q = (APM.logSearch || '').toLowerCase().trim();
  if (q) logs = logs.filter(l => (l.msg + ' ' + l.svc + ' ' + l.sev).toLowerCase().includes(q));

  // build per-minute volume (project-wide, regardless of filter, so chart stays stable)
  const vol = Array.from({length: 60}).map((_,i) => 30 + Math.sin(i/3)*8 + (i>40?(i-40)*1.5:0));
  const errVol = Array.from({length: 60}).map((_,i) => 1 + Math.sin(i/4)*0.5 + (i>40?(i-40)*0.3:0));

  const tabs = [
    ['ALL','全部', APM.logs.filter(l => !svcFilter || l.svc===svcFilter).length],
    ['ERROR','ERROR', APM.logs.filter(l => l.sev==='ERROR' && (!svcFilter || l.svc===svcFilter)).length],
    ['WARN','WARN', APM.logs.filter(l => l.sev==='WARN' && (!svcFilter || l.svc===svcFilter)).length],
    ['INFO','INFO', APM.logs.filter(l => l.sev==='INFO' && (!svcFilter || l.svc===svcFilter)).length],
    ['DEBUG','DEBUG', APM.logs.filter(l => l.sev==='DEBUG' && (!svcFilter || l.svc===svcFilter)).length]
  ];

  return `
    <div class="card" style="margin-top:${embedded?12:14}px; padding: 14px;">
      <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
        ${svcFilter ? `<span class="qb-chip" style="opacity:.7;cursor:default;" title="由当前服务上下文锁定"><span class="qb-key">service</span><span class="qb-op">=</span><span class="qb-val">${svcFilter}</span><span class="qb-x" style="visibility:hidden;">×</span></span>` : ''}
        ${APM.logConds.map((c, idx) => `<span class="qb-chip" style="cursor:pointer;" onclick="APM.editLogCond(${idx})"><span class="qb-key">${c.key}</span><span class="qb-op">${c.op}</span><span class="qb-val">${c.val || '(空)'}</span><span class="qb-x" onclick="event.stopPropagation();APM.removeLogCond(${idx})">×</span></span>`).join('')}
        <button class="qb-add" onclick="APM.addLogCond()">+ 添加条件</button>
        <div style="flex:1;"></div>
        <div class="searchbox" style="padding: 6px 10px; min-width: 280px;">
          ${APM.svgI.search}<input placeholder="全文搜索 / 输入 trace_id 跳转…" value="${(APM.logSearch || '').replace(/"/g,'&quot;')}" data-focus-key="log-search" oninput="APM.bindRetainedInput(event,'log-search',APM.setLogSearch)">
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:12px;">
      <div class="card-title">
        <span>日志量 / 分钟</span>
        <span class="hint" style="display:inline-flex;align-items:center;gap:12px;">
          <span style="display:inline-flex;align-items:center;gap:5px;"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--accent);opacity:.8;"></span>INFO/正常</span>
          <span style="display:inline-flex;align-items:center;gap:5px;"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--danger);opacity:.9;"></span>ERROR</span>
        </span>
      </div>
      <svg viewBox="0 0 600 100" width="100%" height="100" preserveAspectRatio="none">
        <g fill="var(--accent)" opacity=".8">
          ${vol.map((v,i)=>`<rect x="${i*10}" y="${100-v*1.5}" width="9" height="${v*1.5}"/>`).join('')}
        </g>
        <g fill="var(--danger)" opacity=".9">
          ${errVol.map((v,i)=>`<rect x="${i*10}" y="${100-v*8}" width="9" height="${v*8}"/>`).join('')}
        </g>
      </svg>
    </div>

    <div class="card" style="margin-top:12px; padding: 0;">
      <div style="padding: 8px 14px; border-bottom: 1px solid var(--border); display:flex; gap: 4px; align-items:center; font-size:12px;">
        ${tabs.map(([id,label,cnt]) => `<button class="tab ${APM.logFilter.level===id?'active':''}" onclick="APM.setLogLevel('${id}')">${label} (${cnt})</button>`).join('')}
        <div style="flex:1;"></div>
        <span style="font-size:11px; color:var(--text-3); font-family:var(--mono);">${APM.logsPaused ? '⏸ 已暂停' : '↓ 最新在顶部 · 自动滚动'} · 命中 ${logs.length}</span>
      </div>
      ${logs.length === 0 ? `<div class="placeholder" style="margin: 24px;"><div class="icon">🔍</div>没有匹配的日志</div>` : `<div style="max-height: 540px; overflow-y: auto;">
        ${logs.map(l => {
          const tr = (l.msg.match(/trace=([a-z0-9.]+)/i) || [])[1];
          const traceId = tr || l.trace;
          return `<div class="log-row sev-${l.sev.toLowerCase()}">
            <div class="log-time">${l.ts}</div>
            <div class="log-svc"><a class="link" onclick="APM.go('service',{id:'${l.svc}'})" title="跳转到 ${l.svc} 详情">${l.svc}</a></div>
            <div class="log-sev ${l.sev.toLowerCase()}">${l.sev}</div>
            <div class="log-msg">${l.msg.replace(/trace=([a-z0-9.]+)/, `trace=<a class="lt" onclick="APM.go('traces',{trace:'$1'})" title="查看完整 trace">$1</a>`)}</div>
            ${traceId ? `<button class="pill" style="padding:2px 7px;font-size:10.5px;align-self:center;flex-shrink:0;" onclick="event.stopPropagation();APM.go('traces',{trace:'${traceId}'})">trace ↗</button>` : ''}
          </div>`;
        }).join('')}
      </div>`}
    </div>
  `;
};
