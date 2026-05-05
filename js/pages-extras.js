// ============ Extras: Dashboard drill-in, DB subtabs, Onboarding multi-lang, Settings, ⌘K, Topology replay, Sampling ============

// ---------- Dashboards: drill into a panel grid ----------
APM.dashTab = 'all';
APM.openDashboard = function(name) {
  APM.dashView = name;
  APM.renderPage();
};
APM.closeDashboard = function() {
  APM.dashView = null;
  APM.renderPage();
};

// Wrap original renderDashboards
APM._renderDashboardsList = APM.renderDashboards;
APM.renderDashboards = function() {
  if (APM.dashView) return APM.renderDashboardDetail(APM.dashView);
  return APM._renderDashboardsList();
};

APM.renderDashboardDetail = function(name) {
  const series = (n, base, vary, seed) => {
    const arr = []; seed = seed || 1;
    for (let i = 0; i < n; i++) arr.push(base + Math.sin(i/4 + seed)*vary + Math.cos(i/2 + seed)*vary*0.5);
    return arr;
  };
  const line = (vals, color, h) => {
    const w = 600; h = h || 110;
    const max = Math.max(...vals), min = Math.min(...vals);
    const range = max - min || 1;
    const step = w / (vals.length-1);
    const pts = vals.map((v,i)=>`${(i*step).toFixed(1)},${(h - ((v-min)/range)*h*0.8 - 8).toFixed(1)}`).join(' ');
    const id='gd'+color.replace(/[^a-z0-9]/gi,'')+Math.random().toString(36).slice(2,6);
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none">
      <defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".3"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
      <g stroke="var(--grid)"><line x1="0" y1="${h*0.3}" x2="${w}" y2="${h*0.3}"/><line x1="0" y1="${h*0.6}" x2="${w}" y2="${h*0.6}"/></g>
      <polygon points="0,${h} ${pts} ${w},${h}" fill="url(#${id})"/>
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6"/>
    </svg>`;
  };

  return `
    <div style="display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text-3); margin-bottom: 4px;">
      <a onclick="APM.closeDashboard()" style="cursor:pointer; color: var(--accent);">仪表盘</a>
      <span>›</span><span>${name}</span>
    </div>
    <div class="between">
      <div>
        <div class="page-title">${name}</div>
        <div class="page-sub">@jx · 16 panels · 最近编辑 2h ago</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="pill" onclick="APM.shareDashboard('${name.replace(/'/g,"\\'")}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>分享</button>
        <button class="pill" onclick="APM.toast('编辑器原型未实装 · 已记录意图','info')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4z"/></svg>编辑</button>
        <button class="pill ${APM.dashStarred[name]?'primary':''}" onclick="APM.toggleDashStar('${name.replace(/'/g,"\\'")}')">${APM.dashStarred[name]?'★ 已收藏':'☆ 收藏'}</button>
      </div>
    </div>

    ${APM.dashboardVarBar(name)}

    <div class="grid-3" style="margin-top:14px;">
      ${[
        {t:'下单成功率', v:'99.42%', d:'+0.04%', c:'var(--success)', vals: series(40, 99, 0.5, 1)},
        {t:'GMV (近 1h)', v:'¥2.84M', d:'+12.3%', c:'var(--accent)', vals: series(40, 60, 14, 2)},
        {t:'订单数', v:'18,421', d:'+8%', c:'var(--purple)', vals: series(40, 50, 12, 3)},
        {t:'客单价', v:'¥154.2', d:'-1.2%', c:'var(--teal)', vals: series(40, 45, 6, 4)},
        {t:'支付通道延迟 P95', v:'312ms', d:'+8%', c:'var(--warning)', vals: series(40, 40, 16, 5)},
        {t:'风控通过率', v:'97.8%', d:'-0.3%', c:'var(--success)', vals: series(40, 70, 4, 6)}
      ].map((p,idx) => `<div class="card">
        <div class="card-title"><span>${p.t}</span><span class="hint" style="cursor:pointer;" onclick="APM.openPanelMenu(event,'${p.t.replace(/'/g,"\\'")}')">⋯</span></div>
        <div style="display:flex; align-items:baseline; gap:8px;">
          <div style="font-size:24px; font-weight:600; letter-spacing:-0.02em;">${p.v}</div>
          <div style="font-size:12px; color:${p.d.startsWith('+')?'var(--success)':'var(--danger)'};">${p.d}</div>
        </div>
        ${line(p.vals, p.c, 80)}
      </div>`).join('')}
    </div>

    <div class="grid-2" style="margin-top:0;">
      <div class="card">
        <div class="card-title"><span>每分钟订单数 · 按状态</span><span class="hint">stacked</span></div>
        <svg viewBox="0 0 600 200" width="100%" height="200">
          <g stroke="var(--grid)"><line x1="0" y1="50" x2="600" y2="50"/><line x1="0" y1="100" x2="600" y2="100"/><line x1="0" y1="150" x2="600" y2="150"/></g>
          <polygon points="0,200 ${series(60,80,18,7).map((v,i)=>`${i*10},${200-v*1.2}`).join(' ')} 600,200" fill="var(--accent)" opacity=".55"/>
          <polygon points="0,200 ${series(60,30,8,8).map((v,i)=>`${i*10},${180-v*0.8}`).join(' ')} 600,200" fill="var(--success)" opacity=".4"/>
          <polygon points="0,200 ${series(60,8,3,9).map((v,i)=>`${i*10},${170-v*0.5}`).join(' ')} 600,200" fill="var(--danger)" opacity=".5"/>
        </svg>
        <div style="display:flex;gap:14px;font-size:11.5px;color:var(--text-2);">
          <span><span style="display:inline-block;width:10px;height:10px;background:var(--accent);opacity:.6;margin-right:4px;vertical-align:middle;"></span>已支付</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:var(--success);opacity:.5;margin-right:4px;vertical-align:middle;"></span>已发货</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:var(--danger);opacity:.5;margin-right:4px;vertical-align:middle;"></span>失败</span>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span>支付通道占比</span><span class="hint">pie</span></div>
        <div style="display:flex;align-items:center;gap:18px;padding:8px 0;">
          <svg width="140" height="140" viewBox="0 0 42 42">
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--accent)" stroke-width="6" stroke-dasharray="48 100" stroke-dashoffset="0"/>
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--purple)" stroke-width="6" stroke-dasharray="28 100" stroke-dashoffset="-48"/>
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--teal)" stroke-width="6" stroke-dasharray="14 100" stroke-dashoffset="-76"/>
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--warning)" stroke-width="6" stroke-dasharray="10 100" stroke-dashoffset="-90"/>
          </svg>
          <div style="flex:1;display:flex;flex-direction:column;gap:8px;font-size:13px;">
            <div class="between"><span><span style="display:inline-block;width:10px;height:10px;background:var(--accent);margin-right:6px;vertical-align:middle;"></span>支付宝</span><span class="mono">48%</span></div>
            <div class="between"><span><span style="display:inline-block;width:10px;height:10px;background:var(--purple);margin-right:6px;vertical-align:middle;"></span>微信支付</span><span class="mono">28%</span></div>
            <div class="between"><span><span style="display:inline-block;width:10px;height:10px;background:var(--teal);margin-right:6px;vertical-align:middle;"></span>银行卡</span><span class="mono">14%</span></div>
            <div class="between"><span><span style="display:inline-block;width:10px;height:10px;background:var(--warning);margin-right:6px;vertical-align:middle;"></span>其它</span><span class="mono">10%</span></div>
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:14px;">
      <div class="card-title"><span>近 1h 异常订单 Top SKU</span><span class="hint">table panel</span></div>
      <table class="tbl">
        <thead><tr><th>SKU</th><th>商品</th><th>失败次数</th><th>失败率</th><th>主要原因</th></tr></thead>
        <tbody>
          <tr><td class="mono">SKU-A0182</td><td>iPhone 15 Pro · 256GB</td><td class="mono">42</td><td class="mono" style="color:var(--danger);">2.1%</td><td>库存不足</td></tr>
          <tr><td class="mono">SKU-B7820</td><td>戴森 V12 吸尘器</td><td class="mono">28</td><td class="mono" style="color:var(--warning);">0.8%</td><td>支付超时</td></tr>
          <tr><td class="mono">SKU-C3124</td><td>iPad Air 11"</td><td class="mono">14</td><td class="mono" style="color:var(--warning);">0.5%</td><td>风控拦截</td></tr>
        </tbody>
      </table>
    </div>
  `;
};

// ---------- Dashboard helpers (variable bar, share, panel menu) ----------
APM.dashVars = APM.dashVars || { service:'checkout-service', endpoint:'All', env:'production', instance:'All (3)' };

APM.dashboardVarBar = function() {
  const v = APM.dashVars;
  return `
    <div class="card" style="padding: 10px 14px; margin-top: 12px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
      <span style="font-size:11px; color:var(--text-3); text-transform:uppercase; letter-spacing:.05em;">变量</span>
      <div class="dd" id="dvDD-service"><button class="pill" onclick="APM.toggleDD('dvDD-service',event)"><span class="k">$service</span><span class="v">${v.service}</span>${APM.svgI.caret}</button>
        <div class="dd-menu">
          ${APM.services.map(s => `<div class="dd-item ${v.service===s.id?'selected':''}" onclick="APM.setDashVar('service','${s.id}')"><span>${s.name}</span><span class="kbd">${s.lang}</span></div>`).join('')}
        </div>
      </div>
      <div class="dd" id="dvDD-endpoint"><button class="pill" onclick="APM.toggleDD('dvDD-endpoint',event)"><span class="k">$endpoint</span><span class="v">${v.endpoint}</span>${APM.svgI.caret}</button>
        <div class="dd-menu">
          <div class="dd-item ${v.endpoint==='All'?'selected':''}" onclick="APM.setDashVar('endpoint','All')"><span>All</span></div>
          ${APM.endpoints.map(e => `<div class="dd-item ${v.endpoint===e.path?'selected':''}" onclick="APM.setDashVar('endpoint','${e.path}')"><span>${e.method} ${e.path}</span></div>`).join('')}
        </div>
      </div>
      <div class="dd" id="dvDD-env"><button class="pill" onclick="APM.toggleDD('dvDD-env',event)"><span class="k">$env</span><span class="v">${v.env}</span>${APM.svgI.caret}</button>
        <div class="dd-menu">
          ${['production','staging','development','all'].map(en => `<div class="dd-item ${v.env===en?'selected':''}" onclick="APM.setDashVar('env','${en}')"><span>${en}</span></div>`).join('')}
        </div>
      </div>
      <div class="dd" id="dvDD-instance"><button class="pill" onclick="APM.toggleDD('dvDD-instance',event)"><span class="k">$instance</span><span class="v">${v.instance}</span>${APM.svgI.caret}</button>
        <div class="dd-menu">
          ${['All (3)','-1','-2','-3'].map(ins => `<div class="dd-item ${v.instance===ins?'selected':''}" onclick="APM.setDashVar('instance','${ins}')"><span>${ins === 'All (3)' ? '全部实例' : 'instance' + ins}</span></div>`).join('')}
        </div>
      </div>
      <span style="margin-left:auto; font-size:11px; color:var(--text-3);">↻ 自动刷新 ${APM.autoRefreshSec ? (APM.autoRefreshSec >= 60 ? APM.autoRefreshSec/60 + 'm' : APM.autoRefreshSec + 's') : '已关闭'}</span>
    </div>
  `;
};
APM.setDashVar = function(key, val) {
  APM.dashVars[key] = val;
  APM.toggleDD('dvDD-' + key);
  APM.renderPage();
  APM.toast(`$${key} → ${val}`, 'info');
};

APM.shareDashboard = function(name) {
  const url = `https://apm.eshop.com/d/${encodeURIComponent(name)}`;
  const m = APM.openModal({
    title: '分享仪表盘',
    width: 480,
    body: `
      <div style="font-size:12.5px;color:var(--text-2);margin-bottom:10px;">将以下链接分享给同事 · 仅项目成员可访问。</div>
      ${APM.field('链接', `<input class="form-input mono" data-field="url" readonly value="${url}">`)}
      <div class="form-help">嵌入只读快照、PDF 导出在原型中暂不实装。</div>
    `,
    footer: `<button class="pill" data-act="close">关闭</button><button class="pill primary" data-act="copy">复制链接</button>`
  });
  m.el.querySelector('[data-act="close"]').onclick = () => m.close();
  m.el.querySelector('[data-act="copy"]').onclick = () => { APM.copy(url, '链接已复制'); m.close(); };
};

APM.openPanelMenu = function(ev, panelName) {
  if (ev) ev.stopPropagation();
  const items = ['查看 PromQL', '克隆面板', '导出 PNG', '移除面板'];
  const m = APM.openModal({
    title: panelName,
    width: 320,
    body: `<div style="display:flex;flex-direction:column;gap:4px;">
      ${items.map((it,i) => `<div class="menu-item ${i===items.length-1?'danger':''}" data-it="${it}">${it}</div>`).join('')}
    </div>`,
    footer: ''
  });
  m.el.querySelectorAll('.menu-item').forEach(it => {
    it.onclick = () => {
      const v = it.dataset.it;
      m.close();
      if (v === '查看 PromQL') APM.openModal({ title:'PromQL · ' + panelName, width:560, body:`<pre class="code-block">sum by (service)(rate(http_requests_total{service="${APM.dashVars.service}", status_code!~"5.."}[5m]))</pre>`, footer:`<button class="pill" data-act="close" onclick="APM.closeModal(this.closest('.modal-mask').id)">关闭</button>` });
      else if (v === '克隆面板') APM.toast('已克隆面板 · ' + panelName, 'success');
      else if (v === '导出 PNG') APM.toast('PNG 导出原型未实装', 'info');
      else if (v === '移除面板') APM.toast('面板已隐藏（刷新后恢复）', 'warn');
    };
  });
};

// ---------- Database: replace with multi-subtab ----------
APM.dbTab = APM.dbTab || 'slow';
APM.dbDataSource = APM.dbDataSource || 'all';
APM.dbType = APM.dbType || 'sql';
APM._dbDataSources = ['all','mysql-main','mysql-ledger','pg-risk','redis-cache'];
APM._dbDataSourceLabels = {'all':'全部','mysql-main':'mysql · order_db','mysql-ledger':'mysql · ledger_db','pg-risk':'pg · risk_db','redis-cache':'redis · cache'};
APM._dbTypes = ['sql','redis','all'];
APM._dbTypeLabels = { sql:'SQL', redis:'Redis', all:'全部' };
APM.cycleDbDataSource = function() {
  APM.dbDataSource = APM._dbDataSources[(APM._dbDataSources.indexOf(APM.dbDataSource)+1) % APM._dbDataSources.length];
  APM.renderPage();
  APM.toast('数据源 → ' + APM._dbDataSourceLabels[APM.dbDataSource], 'info');
};
APM.cycleDbType = function() {
  APM.dbType = APM._dbTypes[(APM._dbTypes.indexOf(APM.dbType)+1) % APM._dbTypes.length];
  if (APM.dbType === 'redis') APM.dbTab = 'redis';
  else if (APM.dbType === 'sql' && APM.dbTab === 'redis') APM.dbTab = 'slow';
  APM.renderPage();
  APM.toast('类型 → ' + APM._dbTypeLabels[APM.dbType], 'info');
};
APM._renderDatabaseOrig = APM.renderDatabase;
APM.renderDatabase = function() {
  const tab = APM.dbTab || 'slow';
  const ds = APM.dbDataSource;
  return `
    <div class="between">
      <div>
        <div class="page-title">数据库调用 DB Calls</div>
        <div class="page-sub">SQL 模板聚合 · 最近 1 小时 · ${ds === 'all' ? 'MySQL / PostgreSQL / Redis' : APM._dbDataSourceLabels[ds]}</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="pill" onclick="APM.cycleDbDataSource()">数据源: ${APM._dbDataSourceLabels[ds]}</button>
        <button class="pill" onclick="APM.cycleDbType()">类型: ${APM._dbTypeLabels[APM.dbType]}</button>
      </div>
    </div>
    <div class="grid-4" style="margin-top:14px;">
      <div class="card kpi"><div class="name">SQL 模板</div><div class="value">${APM.slowQueries.length}<span class="unit"> 个</span></div><div class="delta flat">N+1 嫌疑 1 个</div></div>
      <div class="card kpi"><div class="name">总执行</div><div class="value">${APM.slowQueries.reduce((a,b)=>a+b.count,0).toLocaleString()}</div><div class="delta up">▲ 8%</div></div>
      <div class="card kpi"><div class="name">慢查询 (>500ms)</div><div class="value" style="color:var(--warning);">2</div><div class="delta flat">order, risk</div></div>
      <div class="card kpi"><div class="name">连接池等待</div><div class="value" style="color:var(--danger);">4<span class="unit"> req</span></div><div class="delta up">checkout HikariCP</div></div>
    </div>
    <div class="subtabs">
      ${[['slow','慢查询', APM.slowQueries.length],['n1','N+1 嫌疑', 1],['pool','连接池', null],['tx','事务', null],['redis','Redis', null]].map(([id,label,c]) =>
        `<div class="subtab ${tab===id?'active':''}" onclick="APM.dbSetTab('${id}')">${label}${c?`<span class="pill-mini">${c}</span>`:''}</div>`
      ).join('')}
    </div>
    ${APM.dbTabBody(tab)}
  `;
};
APM.dbSetTab = function(t) { APM.dbTab = t; APM.renderPage(); };
APM.dbTabBody = function(tab) {
  if (tab === 'slow') return APM.dbSlow();
  if (tab === 'n1') return APM.dbN1();
  if (tab === 'pool') return APM.dbPool();
  if (tab === 'tx') return APM.dbTx();
  if (tab === 'redis') return APM.dbRedis();
};

APM.dbSlow = function() {
  // Filter to current project's services so switching project actually changes the table.
  const list = APM.slowQueries.filter(q => APM.inProject(q.svc));
  return `<div class="card" style="padding:0;overflow:hidden;">
    ${list.length === 0 ? `<div class="placeholder" style="margin:24px;"><div class="icon">🔍</div>当前项目暂无慢查询样本</div>` : `<table class="tbl">
      <thead><tr>
        <th style="width:42%;">SQL 模板</th><th style="width:140px;">服务</th><th style="width:80px;">次数</th><th style="width:80px;">avg</th><th style="width:80px;">P99</th><th style="width:80px;">行数</th><th style="width:140px;text-align:right;">操作</th>
      </tr></thead>
      <tbody>
        ${list.map((q) => {
          const i = APM.slowQueries.indexOf(q);
          return `<tr class="clickable" onclick="APM.openExplain(${i})">
          <td><pre class="mono" style="margin:0;font-size:12px;color:var(--text-1);white-space:pre-wrap;line-height:1.5;">${q.sql}</pre></td>
          <td><a class="link" onclick="event.stopPropagation();APM.go('service',{id:'${q.svc}'})">${q.svc}</a></td>
          <td class="mono">${q.count.toLocaleString()}</td>
          <td class="mono">${q.avg}<span style="color:var(--text-3);">ms</span></td>
          <td class="mono ${q.p99>500?'err':q.p99>200?'warn':''}" style="font-weight:600;">${q.p99}<span style="color:var(--text-3);font-weight:400;">ms</span></td>
          <td class="mono" style="color:var(--text-3);">${q.rows}</td>
          <td style="text-align:right;">
            <button class="pill" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();APM.openExplain(${i})">EXPLAIN</button>
            <button class="pill" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();APM.go('traces',{sql:'${q.sql.replace(/'/g,"\\'").slice(0,40)}'})">Traces</button>
          </td>
        </tr>`;
        }).join('')}
      </tbody>
    </table>`}
  </div>
  ${APM.explainDrawer()}
  `;
};

APM.explainOpen = false;
APM.explainIdx = 0;
APM.openExplain = function(i) {
  APM.explainOpen = true; APM.explainIdx = i;
  APM.renderPage();
};
APM.closeExplain = function() { APM.explainOpen = false; APM.renderPage(); };
APM.explainDrawer = function() {
  if (!APM.explainOpen) return '';
  const q = APM.slowQueries[APM.explainIdx];
  return `<div class="drawer-bg open" onclick="APM.closeExplain()"></div>
  <div class="drawer open">
    <div class="drawer-head">
      <div>
        <div style="font-size:11px; color:var(--text-3); text-transform:uppercase; letter-spacing:.05em;">EXPLAIN · MySQL 8.0</div>
        <div style="font-size:14px; font-weight:600; margin-top:4px;">${q.svc} · 慢查询分析</div>
      </div>
      <button class="pill" onclick="APM.closeExplain()" style="padding: 6px 10px;">关闭 ✕</button>
    </div>
    <div class="drawer-body">
      <div style="font-size:11px; color:var(--text-3); text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">SQL</div>
      <pre class="code-block" style="margin-bottom:14px;">${q.sql}</pre>

      <div style="font-size:11px; color:var(--text-3); text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">EXPLAIN ANALYZE</div>
      <div class="card" style="padding:0;overflow:hidden;margin-bottom:14px;">
        <table class="tbl">
          <thead><tr><th>id</th><th>select_type</th><th>table</th><th>type</th><th>key</th><th>rows</th><th>filtered</th><th>Extra</th></tr></thead>
          <tbody>
            <tr><td>1</td><td>SIMPLE</td><td class="mono">orders</td><td><span class="badge warn">range</span></td><td class="mono">idx_user_id</td><td class="mono">2,418</td><td class="mono">12.5%</td><td class="mono" style="color:var(--warning);">Using filesort</td></tr>
          </tbody>
        </table>
      </div>

      <div class="banner warn" style="margin-bottom:14px;">
        <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div class="grow"><strong>潜在问题：</strong>filesort 排序未走索引；建议追加复合索引 <code style="background:var(--bg-elev-1);padding:1px 5px;border-radius:3px;font-family:var(--mono);font-size:11.5px;">(user_id, status, created_at DESC)</code></div>
      </div>

      <div style="font-size:11px; color:var(--text-3); text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">建议索引</div>
      <pre class="code-block">CREATE INDEX idx_orders_user_status_created
  ON orders (user_id, status, created_at DESC);</pre>

      <div style="font-size:11px; color:var(--text-3); text-transform:uppercase;letter-spacing:.05em;margin:14px 0 6px;">最近调用 (5 个 trace)</div>
      <div class="card" style="padding:0;">
        <table class="tbl">
          <thead><tr><th>时间</th><th>Trace</th><th>耗时</th><th>行数</th></tr></thead>
          <tbody>
            ${['18:36:04','18:35:52','18:35:41','18:35:30','18:35:18'].map((t,i)=>`<tr class="clickable">
              <td class="mono">${t}</td><td class="mono"><a class="link">${(0xabcdef+i*17).toString(16)}…</a></td>
              <td class="mono ${i<2?'err':'warn'}">${q.p99 - i*40}ms</td><td class="mono">${q.rows}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
};

APM.dbN1 = function() {
  return `<div class="banner warn"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  <div class="grow"><strong>检测到 1 个 N+1 查询模式</strong> · 建议使用 IN 批量查询或 JOIN 优化</div></div>
  <div class="card" style="padding:0;overflow:hidden;margin-top:14px;">
    <div style="padding:14px 16px;border-bottom:1px solid var(--border);">
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="badge err">N+1</span>
        <strong style="font-size:14px;">order-service · GET /orders/:id 详情接口</strong>
        <span style="margin-left:auto;font-size:11.5px;color:var(--text-3);font-family:var(--mono);">最近 1h · 1,420 次发生</span>
      </div>
      <div style="margin-top:6px;font-size:12px;color:var(--text-2);">每个订单详情查询会触发 <strong>1 + N 次</strong> SQL — 1 次查订单，N 次按 item_id 单条查 product。平均 N=8。</div>
    </div>
    <div style="padding:14px 16px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div>
          <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">当前模式 (8.4 次/请求)</div>
          <pre class="code-block" style="font-size:11.5px;">-- 1 次
SELECT * FROM orders WHERE id = ?

-- N 次 (×8)
SELECT * FROM products WHERE id = ?
SELECT * FROM products WHERE id = ?
SELECT * FROM products WHERE id = ?
…</pre>
        </div>
        <div>
          <div style="font-size:11px;color:var(--success);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">建议: 批量 IN 查询</div>
          <pre class="code-block" style="font-size:11.5px;border:1px dashed var(--success);">SELECT * FROM orders WHERE id = ?

SELECT * FROM products
WHERE id IN (?, ?, ?, ?, ?, ?, ?, ?)</pre>
        </div>
      </div>
      <div style="display:flex;gap:14px;margin-top:14px;font-size:12px;">
        <div><span style="color:var(--text-3);">SQL 调用</span> <strong style="color:var(--danger);">9 → 2</strong></div>
        <div><span style="color:var(--text-3);">P99</span> <strong style="color:var(--danger);">320ms → 48ms</strong></div>
        <div><span style="color:var(--text-3);">DB 负载</span> <strong style="color:var(--success);">-78%</strong></div>
        <button class="pill primary" style="margin-left:auto;padding:5px 10px;font-size:12px;" onclick="APM.go('traces',{trace:'4f2c9a...b801'})">查看示例 Trace</button>
      </div>
    </div>
  </div>`;
};

APM.dbPool = function() {
  return `<div class="grid-4">
    ${[
      {name:'checkout · order_db', a:18, i:6, p:2, m:30, color:'var(--warning)'},
      {name:'order · order_db', a:14, i:8, p:0, m:20, color:'var(--success)'},
      {name:'risk · risk_db', a:9, i:3, p:0, m:15, color:'var(--success)'},
      {name:'ledger · ledger_db', a:14, i:1, p:4, m:15, color:'var(--danger)'}
    ].map(p => `<div class="card">
      <div style="font-weight:600;font-size:13px;">${p.name}</div>
      <div style="font-size:11px;color:var(--text-3);font-family:var(--mono);margin-top:2px;">HikariCP · max=${p.m}</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px;">
        <div><div style="font-size:10px;color:var(--text-3);">Active</div><div style="font-size:18px;font-weight:700;">${p.a}</div></div>
        <div><div style="font-size:10px;color:var(--text-3);">Idle</div><div style="font-size:18px;font-weight:700;">${p.i}</div></div>
        <div><div style="font-size:10px;color:var(--text-3);">Pending</div><div style="font-size:18px;font-weight:700;color:${p.p>0?'var(--danger)':'var(--text-3)'};">${p.p}</div></div>
        <div><div style="font-size:10px;color:var(--text-3);">Max</div><div style="font-size:18px;font-weight:700;color:var(--text-3);">${p.m}</div></div>
      </div>
      <div class="bar" style="margin-top:10px;height:6px;"><span style="width:${(p.a/p.m)*100}%;background:${p.color};"></span></div>
    </div>`).join('')}
  </div>
  <div class="card" style="margin-top:14px;">
    <div class="card-title"><span>checkout HikariCP · 等待时长 (P95)</span><span class="hint">阈值 50ms</span></div>
    <svg viewBox="0 0 600 150" width="100%" height="150">
      <g stroke="var(--grid)"><line x1="0" y1="40" x2="600" y2="40"/><line x1="0" y1="80" x2="600" y2="80"/><line x1="0" y1="120" x2="600" y2="120"/></g>
      <line x1="0" y1="50" x2="600" y2="50" stroke="var(--danger)" stroke-width="1" stroke-dasharray="3 3"/>
      <text x="540" y="46" fill="var(--danger)" font-size="10">50ms 阈值</text>
      <polyline points="${Array.from({length:60},(_,i)=>`${i*10},${110 - (i<40?10:i>50?40+Math.random()*10:i*1.2)}`).join(' ')}" fill="none" stroke="var(--warning)" stroke-width="1.6"/>
    </svg>
  </div>`;
};

APM.dbTx = function() {
  return `<div class="card" style="padding:0;">
    <table class="tbl">
      <thead><tr><th style="padding-left:14px;">事务</th><th>服务</th><th>提交</th><th>回滚</th><th>P99 时长</th><th>提交率</th></tr></thead>
      <tbody>
        ${[
          ['placeOrder','checkout-service',1820,42,820,99.7],
          ['refundOrder','payment-service',180,8,420,99.6],
          ['updateInventory','checkout-service',1240,2,140,99.9],
          ['writeLedger','ledger-service',780,38,608,98.4]
        ].map(t => `<tr class="clickable" onclick="APM.openTxDetail('${t[0]}','${t[1]}',${t[2]},${t[3]},${t[4]},${t[5]})">
          <td class="mono" style="padding-left:14px;font-weight:600;">${t[0]}</td>
          <td><a class="link" onclick="event.stopPropagation();APM.go('service',{id:'${t[1]}'})">${t[1]}</a></td>
          <td class="mono">${t[2]}</td>
          <td class="mono" style="color:${t[3]>20?'var(--danger)':t[3]>0?'var(--warning)':'inherit'};">${t[3]}</td>
          <td class="mono">${t[4]}ms</td>
          <td><div class="apdex-bar"><span style="width:${t[5]}%;background:${t[5]>99?'var(--success)':'var(--warning)'};"></span></div><span class="mono" style="margin-left:4px;font-size:11px;">${t[5]}%</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
};

APM.openTxDetail = function(name, svc, commits, rollbacks, p99, commitPct) {
  APM.openModal({
    title: `事务 · ${name}`,
    width: 540,
    body: `
      <div class="grid-4" style="margin-bottom:14px;">
        <div class="card kpi"><div class="name">提交</div><div class="value">${commits.toLocaleString()}</div></div>
        <div class="card kpi"><div class="name">回滚</div><div class="value" style="color:${rollbacks>20?'var(--danger)':rollbacks>0?'var(--warning)':'var(--text-1)'};">${rollbacks}</div></div>
        <div class="card kpi"><div class="name">P99 时长</div><div class="value">${p99}<span class="unit">ms</span></div></div>
        <div class="card kpi"><div class="name">提交率</div><div class="value">${commitPct}<span class="unit">%</span></div></div>
      </div>
      <div style="font-size:12.5px;color:var(--text-2);line-height:1.7;">
        <div><strong>服务：</strong> <a class="link" onclick="APM.closeModal(this.closest('.modal-mask').id);APM.go('service',{id:'${svc}'})">${svc}</a></div>
        <div><strong>隔离级别：</strong> READ COMMITTED（默认）</div>
        <div><strong>典型 SQL：</strong> SELECT … FOR UPDATE → UPDATE → INSERT (3 ops)</div>
        <div><strong>近期回滚原因 Top 3：</strong> deadlock(${Math.floor(rollbacks*0.5)}) · timeout(${Math.floor(rollbacks*0.3)}) · constraint(${Math.floor(rollbacks*0.2)})</div>
      </div>
    `,
    footer: `<button class="pill" data-act="close">关闭</button><button class="pill primary" data-act="traces">查看 trace</button>`
  }).el.addEventListener('click', (ev) => {
    const act = ev.target.dataset.act; if (!act) return;
    APM.closeModal(ev.currentTarget.id);
    if (act === 'traces') APM.go('traces', { svcFilter: svc });
  });
};

APM.dbRedis = function() {
  return `<div class="grid-4">
    <div class="card kpi"><div class="name">Ops/sec</div><div class="value">12.4<span class="unit">k</span></div><div class="delta up">▲ 4%</div></div>
    <div class="card kpi"><div class="name">命中率</div><div class="value" style="color:var(--success);">96.8<span class="unit">%</span></div><div class="delta flat">— 稳定</div></div>
    <div class="card kpi"><div class="name">P99</div><div class="value">3<span class="unit">ms</span></div><div class="delta flat">— 稳定</div></div>
    <div class="card kpi"><div class="name">连接池等待</div><div class="value" style="color:var(--warning);">4</div><div class="delta up">risk-service</div></div>
  </div>
  <div class="grid-2-eq">
    <div class="card">
      <div class="card-title"><span>命令分布 (Top)</span><span class="hint">近 1h</span></div>
      <table class="tbl">
        <thead><tr><th>命令</th><th>QPS</th><th>P99</th><th>占比</th></tr></thead>
        <tbody>
          <tr><td class="mono">GET</td><td class="mono">7,820</td><td class="mono">2ms</td><td><div class="apdex-bar"><span style="width:62%;background:var(--accent);"></span></div></td></tr>
          <tr><td class="mono">SETEX</td><td class="mono">2,180</td><td class="mono">3ms</td><td><div class="apdex-bar"><span style="width:18%;background:var(--accent);"></span></div></td></tr>
          <tr><td class="mono">HGETALL</td><td class="mono">1,420</td><td class="mono">4ms</td><td><div class="apdex-bar"><span style="width:11%;background:var(--accent);"></span></div></td></tr>
          <tr><td class="mono">EXPIRE</td><td class="mono">820</td><td class="mono">1ms</td><td><div class="apdex-bar"><span style="width:7%;background:var(--accent);"></span></div></td></tr>
          <tr><td class="mono">DEL</td><td class="mono">240</td><td class="mono">2ms</td><td><div class="apdex-bar"><span style="width:2%;background:var(--accent);"></span></div></td></tr>
        </tbody>
      </table>
    </div>
    <div class="card">
      <div class="card-title"><span>Hot Keys</span><span class="hint">最近 5 分钟</span></div>
      <table class="tbl">
        <thead><tr><th>Key 模式</th><th>QPS</th><th>类型</th></tr></thead>
        <tbody>
          <tr><td class="mono">user:profile:*</td><td class="mono">3,420</td><td>HASH</td></tr>
          <tr><td class="mono">cart:*</td><td class="mono">2,180</td><td>HASH</td></tr>
          <tr><td class="mono">product:detail:*</td><td class="mono">1,840</td><td>STRING</td></tr>
          <tr><td class="mono">session:*</td><td class="mono">1,240</td><td>STRING</td></tr>
          <tr><td class="mono">flash:stock:*</td><td class="mono">820</td><td>STRING</td></tr>
        </tbody>
      </table>
    </div>
  </div>`;
};

// ---------- Onboarding: replace with multi-language ----------
APM.onboardLang = 'java';
APM._renderOnboardingOrig = APM.renderOnboarding;
APM.renderOnboarding = function() {
  const lang = APM.onboardLang || 'java';
  const langs = [
    { id:'java', name:'Java', icon:'☕', color:'#f89820', desc:'Spring Boot · OpenTelemetry agent' },
    { id:'go', name:'Go', icon:'Go', color:'#00add8', desc:'otel-go SDK · 自动埋点 net/http, gRPC' },
    { id:'py', name:'Python', icon:'Py', color:'#3776ab', desc:'opentelemetry-instrument Django/Flask' },
    { id:'node', name:'Node.js', icon:'JS', color:'#3c873a', desc:'@opentelemetry/auto-instrumentations-node' },
    { id:'cpp', name:'C++', icon:'C++', color:'#00599c', desc:'opentelemetry-cpp · gRPC exporter' }
  ];
  return `
    <div class="page-title">接入指导</div>
    <div class="page-sub">三步将服务接入 啄木鸟 APM 2.0 · 基于 OpenTelemetry · 无侵入</div>
    <div class="banner info" style="margin-top:14px;">
      <svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <span class="grow">预计 5 分钟可完成接入。所有 SDK 均使用 OTLP/gRPC 上报至 collector，无需修改业务代码。</span>
    </div>
    <div style="display:grid;grid-template-columns: 280px 1fr;gap:24px;margin-top:18px;">
      <div class="card" style="padding:0;height:fit-content;">
        <div style="padding:14px 16px;border-bottom:1px solid var(--border);font-weight:600;">三步接入</div>
        <div style="padding: 8px 0;">
          ${[['1','创建项目','已完成 · eshop'],['2','安装 SDK / Agent','选择语言并复制命令'],['3','发送数据 / 验证','观察 collector 流量']].map(([n,t,s],i) => `
            <div style="display:flex;gap:12px;padding:10px 16px;align-items:center;border-left:3px solid ${i===1?'var(--accent)':'transparent'};">
              <div style="width:24px;height:24px;border-radius:50%;background:${i===0?'var(--success)':i===1?'var(--accent)':'var(--bg-hover)'};color:${i<2?'white':'var(--text-3)'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">${i===0?'✓':n}</div>
              <div style="min-width:0;"><div style="font-size:13px;font-weight:${i===1?'600':'500'};color:${i===1?'var(--text-1)':'var(--text-2)'};">${t}</div><div style="font-size:11px;color:var(--text-3);margin-top:2px;">${s}</div></div>
            </div>`).join('')}
        </div>
      </div>
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--text-1);margin-bottom:10px;">选择语言 / 框架</div>
        <div class="grid-4">
          ${langs.map(l => `<div class="svc-card" onclick="APM.onboardLang='${l.id}';APM.renderPage();" style="cursor:pointer;${lang===l.id?'border-color:var(--accent);background:var(--accent-weak);':''}">
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="lang-ico" style="background:${l.color};">${l.icon}</span>
              <div><div style="font-weight:600;">${l.name}</div><div style="font-size:11px;color:var(--text-3);margin-top:2px;">${l.desc}</div></div>
            </div>
          </div>`).join('')}
        </div>
        ${APM.onboardSnippet(lang)}
        <div class="card" style="margin-top:14px;">
          <div class="card-title"><span>② 验证数据上报</span><span style="font-size:11px;color:var(--text-3);">通常 30 秒内可见</span></div>
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;font-family:var(--mono);font-size:12.5px;">
            <span class="pulse-dot" style="background:var(--success);"></span>
            <span>collector 已接收 <strong>my-service</strong> 的 traces · spans 18 / 30s · metrics 12 / 30s</span>
          </div>
          <button class="pill primary" style="margin-top:6px;" onclick="APM.go('overview')">前往 服务概览 →</button>
        </div>
      </div>
    </div>
  `;
};
APM.onboardSnippet = function(lang) {
  const snippets = {
    java: {
      title: '① 下载并启动 OTel Java Agent',
      code: `curl -O https://apm.eshop.com/agent/opentelemetry-javaagent.jar

java -javaagent:./opentelemetry-javaagent.jar \\
  -Dotel.service.name=my-service \\
  -Dotel.exporter.otlp.endpoint=https://otlp.apm.eshop.com:4317 \\
  -Dotel.exporter.otlp.headers="Authorization=Bearer <TOKEN>" \\
  -Dotel.resource.attributes=deployment.environment=production,project=eshop \\
  -jar my-service.jar`
    },
    go: {
      title: '① 引入 otel-go SDK',
      code: `go get go.opentelemetry.io/otel \\
       go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc \\
       go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp

# main.go
import (
  "go.opentelemetry.io/otel"
  "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
  sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

exp, _ := otlptracegrpc.New(ctx,
  otlptracegrpc.WithEndpoint("otlp.apm.eshop.com:4317"),
  otlptracegrpc.WithHeaders(map[string]string{
    "Authorization": "Bearer <TOKEN>",
  }))
tp := sdktrace.NewTracerProvider(sdktrace.WithBatcher(exp))
otel.SetTracerProvider(tp)

# wrap http
http.Handle("/", otelhttp.NewHandler(myHandler, "my-service"))`
    },
    py: {
      title: '① 安装并启动 (Django / Flask 自动埋点)',
      code: `pip install opentelemetry-distro \\
            opentelemetry-exporter-otlp-proto-grpc

opentelemetry-bootstrap --action=install

OTEL_SERVICE_NAME=my-service \\
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.apm.eshop.com:4317 \\
OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer <TOKEN>" \\
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production,project=eshop \\
opentelemetry-instrument python manage.py runserver`
    },
    node: {
      title: '① 安装自动埋点',
      code: `npm install --save \\
  @opentelemetry/api \\
  @opentelemetry/auto-instrumentations-node \\
  @opentelemetry/exporter-trace-otlp-grpc

# 启动时通过 -r 注入
OTEL_SERVICE_NAME=my-service \\
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.apm.eshop.com:4317 \\
OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer <TOKEN>" \\
node -r @opentelemetry/auto-instrumentations-node/register dist/index.js`
    },
    cpp: {
      title: '① 集成 opentelemetry-cpp (CMake)',
      code: `# 通过 vcpkg / Conan 安装
vcpkg install opentelemetry-cpp[otlp-grpc]

# CMakeLists.txt
find_package(opentelemetry-cpp CONFIG REQUIRED)
target_link_libraries(my-service PRIVATE
  opentelemetry-cpp::api
  opentelemetry-cpp::sdk
  opentelemetry-cpp::otlp_grpc_exporter)

// main.cc — 初始化 TracerProvider
#include "opentelemetry/exporters/otlp/otlp_grpc_exporter_factory.h"
#include "opentelemetry/sdk/trace/tracer_provider_factory.h"
#include "opentelemetry/sdk/resource/resource.h"
namespace otlp  = opentelemetry::exporter::otlp;
namespace trace = opentelemetry::sdk::trace;

otlp::OtlpGrpcExporterOptions opts;
opts.endpoint = "otlp.apm.eshop.com:4317";
opts.metadata = {{"authorization", "Bearer <TOKEN>"}};

auto resource = opentelemetry::sdk::resource::Resource::Create({
  {"service.name", "my-service"},
  {"deployment.environment", "production"},
  {"project", "eshop"}});

auto provider = trace::TracerProviderFactory::Create(
  trace::SimpleSpanProcessorFactory::Create(
    otlp::OtlpGrpcExporterFactory::Create(opts)),
  resource);
opentelemetry::trace::Provider::SetTracerProvider(std::move(provider));`
    }
  };
  const s = snippets[lang] || snippets.java;
  const codeAttr = s.code.replace(/`/g, '\\`').replace(/\$/g, '\\$');
  return `<div class="card" style="margin-top:14px;">
    <div class="card-title"><span>${s.title}</span><button class="pill" style="padding:4px 8px;font-size:11px;" onclick='APM.copy(${JSON.stringify(s.code)}, "已复制 ${lang} 接入命令")'>复制</button></div>
    <pre class="code-block">${s.code.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
  </div>`;
};

// ---------- Settings: replace placeholder with sub-pages ----------
APM.settingsTab = APM.settingsTab || 'members';
APM.memberFilter = APM.memberFilter || '';
APM.auditFilter = APM.auditFilter || '';
APM.setMemberFilter = function(v) { APM.memberFilter = v; APM.renderPage(); };
APM.setAuditFilter = function(v) { APM.auditFilter = v; APM.renderPage(); };

APM._renderSettingsOrig = APM.renderSettings;
APM.renderSettings = function() {
  const tab = APM.settingsTab || 'members';
  const tabs = [
    ['members','成员', APM.members.length],
    ['roles','角色', 4],
    ['sampling','采样策略', null],
    ['retention','数据保留', null],
    ['tokens','API Token', APM.tokens.length],
    ['audit','审计日志', null]
  ];
  return `
    <div class="page-title">设置</div>
    <div class="page-sub">租户域 cloud-prod · 项目 eshop · 你以 ${APM.currentUser.role} 身份登录</div>
    <div class="subtabs">
      ${tabs.map(([id,l,c]) => `<div class="subtab ${tab===id?'active':''}" onclick="APM.settingsTab='${id}';APM.renderPage();">${l}${c?`<span class="pill-mini">${c}</span>`:''}</div>`).join('')}
    </div>
    ${APM.settingsBody(tab)}
  `;
};
APM.settingsBody = function(tab) {
  if (tab==='members') return APM.setMembers();
  if (tab==='roles') return APM.setRoles();
  if (tab==='sampling') return APM.setSampling();
  if (tab==='retention') return APM.setRetention();
  if (tab==='tokens') return APM.setTokens();
  if (tab==='audit') return APM.setAudit();
};

// ===== Members =====
APM.openInviteMember = function() {
  const m = APM.openModal({
    title: '邀请新成员',
    width: 480,
    body: `
      ${APM.field('邮箱', APM.input('email','', 'type="email"'))}
      <div class="form-grid-2">
        ${APM.field('角色', APM.select('role', ['admin','sre','dev','dba','viewer'], 'dev'))}
        ${APM.field('显示名缩写', APM.input('initials', '', 'maxlength="3"'))}
      </div>
      ${APM.field('备注 / 权限说明', APM.textarea('desc', '', 2))}
      <div class="form-help">系统将向该邮箱发送邀请链接 · 24 小时内有效。</div>
    `,
    footer: `<button class="pill" data-act="cancel">取消</button><button class="pill primary" data-act="ok">发送邀请</button>`
  });
  m.el.querySelector('[data-act="cancel"]').onclick = () => m.close();
  m.el.querySelector('[data-act="ok"]').onclick = () => {
    const v = APM.modalForm(m.id);
    if (!v.email || !/^[^@\s]+@[^@\s]+/.test(v.email)) { APM.toast('请输入有效邮箱', 'warn'); return; }
    APM.members.unshift({
      initials: (v.initials || v.email.slice(0,2)).toUpperCase(),
      email: v.email,
      role: v.role,
      desc: v.desc || (v.role + ' 角色'),
      activeAt: '刚刚加入',
      online: false
    });
    APM.logAudit('member.invite', v.email);
    m.close();
    APM.renderPage();
    APM.toast('邀请已发送 · ' + v.email, 'success');
  };
};
APM.editMember = function(email) {
  const u = APM.members.find(m=>m.email===email);
  if (!u) return;
  const m = APM.openModal({
    title: '编辑成员 · ' + u.email,
    width: 460,
    body: `
      <div class="form-grid-2">
        ${APM.field('角色', APM.select('role', ['admin','sre','dev','dba','viewer'], u.role))}
        ${APM.field('状态', APM.select('online', [{value:'on',label:'活跃'},{value:'off',label:'离线'}], u.online?'on':'off'))}
      </div>
      ${APM.field('备注', APM.textarea('desc', u.desc, 2))}
    `,
    footer: `<button class="pill danger" data-act="del">移除成员</button><div style="flex:1;"></div><button class="pill" data-act="cancel">取消</button><button class="pill primary" data-act="ok">保存</button>`
  });
  m.el.querySelector('[data-act="cancel"]').onclick = () => m.close();
  m.el.querySelector('[data-act="del"]').onclick = () => {
    m.close();
    APM.confirm({ title:'移除成员', msg:`确认从工作区移除 <strong>${u.email}</strong>？`, danger:true, okLabel:'移除', onOk: () => {
      APM.members.splice(APM.members.indexOf(u),1);
      APM.logAudit('member.remove', u.email);
      APM.renderPage();
      APM.toast('已移除成员', 'info');
    }});
  };
  m.el.querySelector('[data-act="ok"]').onclick = () => {
    const v = APM.modalForm(m.id);
    u.role = v.role;
    u.online = v.online === 'on';
    u.desc = v.desc;
    APM.logAudit('member.update', u.email);
    m.close();
    APM.renderPage();
    APM.toast('已保存', 'success');
  };
};
APM.setMembers = function() {
  const f = (APM.memberFilter || '').toLowerCase();
  const list = APM.members.filter(m => !f || m.email.toLowerCase().includes(f) || m.initials.toLowerCase().includes(f) || m.role.toLowerCase().includes(f));
  return `<div class="between" style="margin-bottom:10px;">
    <div class="searchbox" style="padding:6px 10px;min-width:280px;">${APM.svgI.search}<input placeholder="按邮箱 / 名字搜索" value="${f.replace(/"/g,'&quot;')}" data-focus-key="member-filter" oninput="APM.bindRetainedInput(event,'member-filter',APM.setMemberFilter)"></div>
    <button class="pill primary" onclick="APM.openInviteMember()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>邀请成员</button>
  </div>
  ${list.length === 0 ? `<div class="placeholder"><div class="icon">🔍</div>未匹配成员</div>` : `<div class="card" style="padding:0;"><table class="tbl">
    <thead><tr><th style="padding-left:14px;">成员</th><th>角色</th><th>说明</th><th>最近活跃</th><th>状态</th><th></th></tr></thead>
    <tbody>${list.map(m=>`<tr>
      <td style="padding-left:14px;"><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:24px;height:24px;font-size:10px;">${m.initials}</div><span class="mono">${m.email}</span></div></td>
      <td><span class="badge ${m.role==='admin'?'err':m.role==='viewer'?'':'ok'}">${m.role}</span></td>
      <td style="color:var(--text-3);font-size:12px;">${m.desc}</td>
      <td class="mono" style="color:var(--text-3);">${m.activeAt}</td>
      <td>${m.online?'<span class="badge ok">● 活跃</span>':'<span class="badge">离线</span>'}</td>
      <td style="text-align:right;padding-right:14px;"><button class="pill" style="padding:4px 8px;font-size:11px;" onclick="APM.editMember('${m.email}')">编辑</button></td>
    </tr>`).join('')}</tbody></table></div>`}`;
};

// ===== Roles =====
APM._roles = APM._roles || [
  { id:'admin', label:'超级管理员', desc:'所有读写 + 成员管理', count:3, color:'var(--danger)' },
  { id:'sre', label:'SRE', desc:'告警/采样/集成的读写 · 全数据读', count:5, color:'var(--accent)' },
  { id:'dev', label:'开发', desc:'按项目分配的服务读 · 自身告警写', count:12, color:'var(--success)' },
  { id:'viewer', label:'只读', desc:'所有数据只读', count:4, color:'var(--text-3)' }
];
APM.openPermMatrix = function(roleId) {
  const matrix = [
    ['服务概览', '✓','✓','✓','✓'],
    ['服务详情读', '✓','✓','✓','✓'],
    ['Traces 读', '✓','✓','✓','✓'],
    ['Logs 读', '✓','✓','✓','✓'],
    ['告警 写', '✓','✓','—','—'],
    ['告警 静音 / 认领', '✓','✓','✓','—'],
    ['采样规则', '✓','✓','—','—'],
    ['Token 创建', '✓','✓','—','—'],
    ['成员邀请', '✓','—','—','—'],
    ['Domain / Project', '✓','—','—','—']
  ];
  APM.openModal({
    title: '权限矩阵 · ' + (roleId ? roleId : '全部角色'),
    width: 720,
    body: `
      <table class="tbl">
        <thead><tr><th style="padding-left:14px;">能力</th><th>admin</th><th>sre</th><th>dev</th><th>viewer</th></tr></thead>
        <tbody>${matrix.map(r => `<tr>
          <td style="padding-left:14px;">${r[0]}</td>
          ${[1,2,3,4].map(i => `<td class="mono" style="color:${r[i]==='✓'?'var(--success)':'var(--text-3)'};">${r[i]}</td>`).join('')}
        </tr>`).join('')}</tbody>
      </table>
    `,
    footer: `<button class="pill" data-act="close" onclick="APM.closeModal(this.closest('.modal-mask').id)">关闭</button>`
  });
};
APM.editRole = function(roleId) {
  const r = APM._roles.find(x=>x.id===roleId);
  if (!r) return;
  const m = APM.openModal({
    title: '编辑角色 · ' + r.label,
    width: 460,
    body: `
      ${APM.field('角色名称', APM.input('label', r.label))}
      ${APM.field('描述', APM.textarea('desc', r.desc, 2))}
      <div class="form-help">权限矩阵编辑在原型中受限 · 此处仅修改元信息。</div>
    `,
    footer: `<button class="pill" data-act="cancel">取消</button><button class="pill primary" data-act="ok">保存</button>`
  });
  m.el.querySelector('[data-act="cancel"]').onclick = () => m.close();
  m.el.querySelector('[data-act="ok"]').onclick = () => {
    const v = APM.modalForm(m.id);
    r.label = v.label; r.desc = v.desc;
    APM.logAudit('role.update', r.id);
    m.close();
    APM.renderPage();
    APM.toast('角色已更新', 'success');
  };
};
APM.setRoles = function() {
  return `<div class="grid-2">${APM._roles.map(r=>`<div class="card">
    <div style="display:flex;align-items:center;gap:8px;"><span class="badge" style="background:${r.color};color:white;">${r.id}</span><strong>${r.label}</strong><span style="margin-left:auto;font-size:12px;color:var(--text-3);">${r.count} 名成员</span></div>
    <div style="font-size:12.5px;color:var(--text-2);margin-top:8px;">${r.desc}</div>
    <div style="display:flex;gap:6px;margin-top:10px;"><button class="pill" style="padding:4px 8px;font-size:11px;" onclick="APM.openPermMatrix('${r.id}')">查看权限矩阵</button><button class="pill" style="padding:4px 8px;font-size:11px;" onclick="APM.editRole('${r.id}')">编辑</button></div>
  </div>`).join('')}</div>`;
};

// ===== Sampling =====
APM.openSamplingRule = function(priority) {
  const r = priority != null ? APM.samplingRules.find(x=>x.priority===priority) : null;
  const isEdit = !!r;
  const m = APM.openModal({
    title: isEdit ? '编辑采样规则' : '新建采样规则',
    width: 540,
    body: `
      <div class="form-grid-2">
        ${APM.field('规则名称', APM.input('name', isEdit ? r.name : ''))}
        ${APM.field('优先级', APM.input('priority', isEdit ? r.priority : (Math.max(...APM.samplingRules.map(x=>x.priority))+1), 'type="number" min="1"'))}
      </div>
      ${APM.field('条件 (TraceQL-like)', APM.textarea('cond', isEdit ? r.cond : '', 2))}
      <div class="form-grid-2">
        ${APM.field('采样率', APM.input('rate', isEdit ? r.rate : '5%'))}
        ${APM.field('启用', APM.select('enabled', [{value:'on',label:'是'},{value:'off',label:'否'}], (isEdit?r.enabled:true) ? 'on' : 'off'))}
      </div>
    `,
    footer: `${isEdit?'<button class="pill danger" data-act="del">删除</button><div style="flex:1;"></div>':''}<button class="pill" data-act="cancel">取消</button><button class="pill primary" data-act="ok">${isEdit?'保存':'创建'}</button>`
  });
  m.el.querySelector('[data-act="cancel"]').onclick = () => m.close();
  if (isEdit) m.el.querySelector('[data-act="del"]').onclick = () => {
    m.close();
    APM.confirm({ title:'删除采样规则', msg:`确认删除规则 <strong>${r.name}</strong>？`, danger:true, okLabel:'删除', onOk: () => {
      APM.samplingRules.splice(APM.samplingRules.indexOf(r), 1);
      APM.logAudit('sampling.rule.delete', r.name);
      APM.renderPage();
      APM.toast('规则已删除', 'info');
    }});
  };
  m.el.querySelector('[data-act="ok"]').onclick = () => {
    const v = APM.modalForm(m.id);
    if (!v.name) { APM.toast('请填写名称', 'warn'); return; }
    const newPriority = parseInt(v.priority, 10) || 99;
    const enabled = v.enabled === 'on';
    if (isEdit) {
      r.name = v.name; r.priority = newPriority; r.cond = v.cond; r.rate = v.rate; r.enabled = enabled;
      APM.logAudit('sampling.rule.update', r.name);
    } else {
      APM.samplingRules.push({ priority: newPriority, name: v.name, cond: v.cond, rate: v.rate, enabled });
      APM.logAudit('sampling.rule.create', v.name);
    }
    APM.samplingRules.sort((a,b) => a.priority - b.priority);
    m.close();
    APM.renderPage();
    APM.toast(isEdit ? '规则已保存' : '规则已创建', 'success');
  };
};
APM.toggleSamplingRule = function(priority) {
  const r = APM.samplingRules.find(x=>x.priority===priority);
  if (!r) return;
  r.enabled = !r.enabled;
  APM.logAudit('sampling.rule.' + (r.enabled?'enable':'disable'), r.name);
  APM.renderPage();
  APM.toast(`规则已${r.enabled?'启用':'禁用'}`, r.enabled?'success':'warn');
};
APM.setSampling = function() {
  return `<div class="banner info"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  <span class="grow">尾部采样 (tail-based) 在 collector 处决策。规则按上到下匹配，命中即停止。</span>
  <button class="pill primary" style="padding:5px 10px;font-size:12px;" onclick="APM.openSamplingRule()">+ 新建规则</button></div>
  <div class="card" style="padding:0;margin-top:14px;">
    <table class="tbl">
      <thead><tr><th style="padding-left:14px;">优先级</th><th>规则</th><th>条件</th><th>采样率</th><th>状态</th><th></th></tr></thead>
      <tbody>
        ${APM.samplingRules.map(r=>`<tr class="clickable" onclick="APM.openSamplingRule(${r.priority})">
          <td style="padding-left:14px;" class="mono">${r.priority}</td>
          <td><strong>${r.name}</strong></td>
          <td><code style="background:var(--bg-elev-1);padding:2px 6px;border-radius:3px;font-family:var(--mono);font-size:11.5px;">${r.cond.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></td>
          <td class="mono" style="font-weight:600;">${r.rate}</td>
          <td>${r.enabled?'<span class="badge ok">● enabled</span>':'<span class="badge">disabled</span>'}</td>
          <td style="text-align:right;padding-right:14px;">
            <button class="pill" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();APM.toggleSamplingRule(${r.priority})">${r.enabled?'禁用':'启用'}</button>
            <button class="pill" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();APM.openSamplingRule(${r.priority})">编辑</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div class="grid-3" style="margin-top:14px;">
    <div class="card kpi"><div class="name">总 span 速率</div><div class="value">42.8<span class="unit">k /s</span></div><div class="delta flat">collector 上行</div></div>
    <div class="card kpi"><div class="name">实际入库</div><div class="value">5.6<span class="unit">k /s</span></div><div class="delta flat">尾采后 13%</div></div>
    <div class="card kpi"><div class="name">错误覆盖</div><div class="value" style="color:var(--success);">100<span class="unit">%</span></div><div class="delta flat">规则 #1 保证</div></div>
  </div>`;
};

// ===== Retention =====
APM._retention = APM._retention || [
  { id:'traces', label:'Traces', value:'7 天', desc:'热存 ClickHouse · 错误 trace 30 天', color:'var(--accent)', days:7 },
  { id:'metrics', label:'Metrics', value:'30 天 (1m) · 1 年 (1h)', desc:'VictoriaMetrics 多副本', color:'var(--purple)', days:30 },
  { id:'logs', label:'Logs', value:'14 天', desc:'热 7d / 冷 7d (S3)', color:'var(--teal)', days:14 },
  { id:'events', label:'Events', value:'90 天', desc:'审计与部署事件', color:'var(--success)', days:90 },
  { id:'profiling', label:'Profiling', value:'3 天', desc:'已禁用', color:'var(--text-3)', days:3 },
  { id:'alert-history', label:'告警历史', value:'180 天', desc:'与夜莺同步', color:'var(--warning)', days:180 }
];
APM.openRetentionEdit = function(id) {
  const r = APM._retention.find(x=>x.id===id);
  if (!r) return;
  const m = APM.openModal({
    title: '调整保留期 · ' + r.label,
    width: 460,
    body: `
      ${APM.field('保留天数', APM.input('days', r.days, 'type="number" min="1"'))}
      ${APM.field('描述', APM.textarea('desc', r.desc, 2))}
      <div class="form-help">变更将在 24 小时内生效；旧数据按新策略归档。</div>
    `,
    footer: `<button class="pill" data-act="cancel">取消</button><button class="pill primary" data-act="ok">应用</button>`
  });
  m.el.querySelector('[data-act="cancel"]').onclick = () => m.close();
  m.el.querySelector('[data-act="ok"]').onclick = () => {
    const v = APM.modalForm(m.id);
    const days = parseInt(v.days, 10) || r.days;
    r.days = days;
    r.value = days >= 30 ? `${days} 天 (历史聚合)` : `${days} 天`;
    r.desc = v.desc;
    APM.logAudit('retention.update', r.id + '=' + days + 'd');
    m.close();
    APM.renderPage();
    APM.toast('保留期已更新', 'success');
  };
};
APM.setRetention = function() {
  return `<div class="grid-3">
    ${APM._retention.map(r=>`<div class="card">
      <div style="display:flex;align-items:center;gap:8px;"><div style="width:6px;height:24px;border-radius:3px;background:${r.color};"></div><strong>${r.label}</strong></div>
      <div style="font-size:22px;font-weight:600;margin-top:6px;letter-spacing:-0.02em;">${r.value}</div>
      <div style="font-size:12px;color:var(--text-3);margin-top:4px;">${r.desc}</div>
      <button class="pill" style="margin-top:8px;padding:4px 8px;font-size:11px;" onclick="APM.openRetentionEdit('${r.id}')">调整</button>
    </div>`).join('')}
  </div>`;
};

// ===== Tokens =====
APM.openTokenCreate = function() {
  const m = APM.openModal({
    title: '生成新 Token',
    width: 480,
    body: `
      ${APM.field('名称（用途说明）', APM.input('name', ''))}
      ${APM.field('Scope', APM.select('scope', [
        {value:'traces:write', label:'traces:write'},
        {value:'traces:write metrics:write', label:'traces:write metrics:write'},
        {value:'metrics:read alerts:write', label:'metrics:read alerts:write'},
        {value:'*', label:'* (全部权限)'}
      ], 'traces:write metrics:write'))}
      <div class="form-help">Token 仅在生成时显示一次，请妥善保存。</div>
    `,
    footer: `<button class="pill" data-act="cancel">取消</button><button class="pill primary" data-act="ok">生成</button>`
  });
  m.el.querySelector('[data-act="cancel"]').onclick = () => m.close();
  m.el.querySelector('[data-act="ok"]').onclick = () => {
    const v = APM.modalForm(m.id);
    if (!v.name) { APM.toast('请填写名称', 'warn'); return; }
    const rand = Math.random().toString(36).slice(2, 10);
    const token = 'tk_' + (v.name.replace(/[^a-z0-9]/gi,'').slice(0,4) || 'new') + '_' + rand;
    const fullToken = token + 'x' + Math.random().toString(36).slice(2, 26);
    APM.tokens.unshift({
      name: v.name, scope: v.scope, prefix: token + '…',
      createdAt: new Date().toISOString().slice(0,10),
      usedAt: '未使用', active: true
    });
    APM.logAudit('token.create', v.name);
    m.close();
    // Show "newly generated" follow-up modal
    APM.openModal({
      title: '✓ Token 已生成',
      width: 540,
      body: `
        <div class="banner warn" style="margin-bottom:12px;"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg><div class="grow">此 Token 仅展示一次 · 关闭后无法再次查看。</div></div>
        ${APM.field('完整 Token', `<input class="form-input mono" data-field="t" readonly value="${fullToken}">`)}
        <div class="form-help">在 SDK / agent 中作为 Authorization: Bearer &lt;TOKEN&gt; 携带。</div>
      `,
      footer: `<button class="pill" data-act="close" onclick="APM.closeModal(this.closest('.modal-mask').id)">完成</button><button class="pill primary" data-act="copy" onclick="APM.copy('${fullToken}', '已复制 token')">复制 Token</button>`
    });
    APM.renderPage();
    APM.toast('Token 已生成', 'success');
  };
};
APM.rotateToken = function(name) {
  const t = APM.tokens.find(x=>x.name===name);
  if (!t) return;
  APM.confirm({
    title:'轮换 Token · ' + name,
    msg:'轮换后旧前缀立即失效，需要在所有 SDK / Agent 替换。继续？',
    danger:false, okLabel:'轮换',
    onOk: () => {
      const rand = Math.random().toString(36).slice(2, 8);
      t.prefix = 'tk_' + name.replace(/[^a-z0-9]/gi,'').slice(0,4) + '_' + rand + '…';
      t.usedAt = '刚刚轮换';
      APM.logAudit('token.rotate', name);
      APM.renderPage();
      APM.toast('Token 已轮换 · 新前缀 ' + t.prefix, 'success');
    }
  });
};
APM.revokeToken = function(name) {
  const t = APM.tokens.find(x=>x.name===name);
  if (!t) return;
  APM.confirm({
    title:'吊销 Token · ' + name,
    msg:'吊销不可恢复 · 所有正在使用此 token 的 SDK 将立即被拒绝。',
    danger:true, okLabel:'吊销',
    onOk: () => {
      t.active = false;
      APM.logAudit('token.revoke', name);
      APM.renderPage();
      APM.toast('Token 已吊销', 'warn');
    }
  });
};
APM.setTokens = function() {
  return `<div class="between" style="margin-bottom:10px;">
    <div style="font-size:12.5px;color:var(--text-2);">用于 SDK / Agent 上报 OTLP 数据 · 建议按服务粒度发放</div>
    <button class="pill primary" onclick="APM.openTokenCreate()">+ 生成 Token</button>
  </div>
  <div class="card" style="padding:0;"><table class="tbl">
    <thead><tr><th style="padding-left:14px;">名称</th><th>Scope</th><th>前缀</th><th>创建</th><th>最近使用</th><th>状态</th><th></th></tr></thead>
    <tbody>${APM.tokens.map(t=>`<tr ${t.active?'':'style="opacity:.5;"'}>
      <td style="padding-left:14px;font-weight:600;">${t.name}</td>
      <td><span class="chip mono" style="font-size:11px;">${t.scope}</span></td>
      <td class="mono" style="color:var(--text-3);">${t.prefix}</td>
      <td class="mono" style="color:var(--text-3);">${t.createdAt}</td>
      <td class="mono" style="color:var(--text-3);">${t.usedAt}</td>
      <td>${t.active?'<span class="badge ok">● 活跃</span>':'<span class="badge err">已吊销</span>'}</td>
      <td style="text-align:right;padding-right:14px;">
        ${t.active ? `<button class="pill" style="padding:4px 8px;font-size:11px;" onclick="APM.rotateToken('${t.name}')">轮换</button> <button class="pill danger" style="padding:4px 8px;font-size:11px;" onclick="APM.revokeToken('${t.name}')">吊销</button>` : ''}
      </td>
    </tr>`).join('')}</tbody></table></div>`;
};

// ===== Audit =====
APM.setAudit = function() {
  const f = (APM.auditFilter || '').toLowerCase();
  const list = APM.audit.filter(a => !f || (a.user + a.action + a.resource).toLowerCase().includes(f));
  return `<div class="searchbox" style="padding:6px 10px;min-width:380px;margin-bottom:10px;">${APM.svgI.search}<input placeholder="按用户 / 资源 / 操作搜索" value="${f.replace(/"/g,'&quot;')}" data-focus-key="audit-filter" oninput="APM.bindRetainedInput(event,'audit-filter',APM.setAuditFilter)"></div>
  ${list.length === 0 ? '<div class="placeholder"><div class="icon">🔍</div>未匹配审计记录</div>' : `<div class="card" style="padding:0;"><table class="tbl">
    <thead><tr><th style="padding-left:14px;">时间</th><th>用户</th><th>操作</th><th>资源</th><th>来源 IP</th><th>结果</th></tr></thead>
    <tbody>${list.map(a=>`<tr>
      <td style="padding-left:14px;" class="mono">${a.ts}</td>
      <td class="mono">${a.user}</td>
      <td class="mono"><strong>${a.action}</strong></td>
      <td class="mono" style="color:var(--text-2);">${a.resource}</td>
      <td class="mono" style="color:var(--text-3);">${a.ip}</td>
      <td>${a.result === 'ok'?'<span style="color:var(--success);">✓ ok</span>':'<span style="color:var(--danger);">✗ '+a.result+'</span>'}</td>
    </tr>`).join('')}</tbody></table></div>`}`;
};

// ---------- Topology: time replay (overlay) ----------
APM.topoTime = 60; // 0..60 — 60 = now, 0 = 60min ago
APM._renderTopologyOrig = APM.renderTopology;
APM.renderTopology = function() {
  // Apply replay-time perturbation to service stats so the SVG re-renders
  // when slider moves. t=60 → "now" baseline; smaller t → older (with a
  // dramatic spike around t=45 / 18:35 incident).
  const t = (typeof APM.topoTime === 'number') ? APM.topoTime : 60;
  const incidentDist = Math.abs(t - 45); // 0 at peak incident
  const incidentBoost = Math.max(0, 1 - incidentDist / 8); // 0..1
  const drift = (60 - t) / 60; // 0 now → 1 oldest

  // Save originals once, then mutate in place
  if (!APM._svcOrig) APM._svcOrig = APM.services.map(s => ({ ...s }));
  APM.services.forEach((s, i) => {
    const o = APM._svcOrig[i];
    // ledger and risk get hammered during incident
    const isHotSvc = (o.id === 'ledger-service' || o.id === 'checkout-service' || o.id === 'risk-service');
    const errMul = 1 + (isHotSvc ? incidentBoost * 4 : incidentBoost * 0.6);
    const p99Mul = 1 + (isHotSvc ? incidentBoost * 1.6 : incidentBoost * 0.3);
    const rpmDip = isHotSvc ? (1 - incidentBoost * 0.18) : 1;
    s.errPct = +(o.errPct * errMul).toFixed(2);
    s.p99 = Math.round(o.p99 * p99Mul);
    s.rpm = Math.round(o.rpm * rpmDip * (0.92 + 0.08*Math.cos(drift*6 + i)));
    s.alerts = (isHotSvc && incidentBoost > 0.5) ? Math.max(o.alerts, 2) : (incidentBoost > 0.2 && isHotSvc ? Math.max(o.alerts, 1) : o.alerts);
  });
  const html = APM._renderTopologyOrig();
  return html + APM.topoReplayBar();
};
APM.topoReplayBar = function() {
  const t = (typeof APM.topoTime === 'number') ? APM.topoTime : 60;
  const lbl = t === 60 ? 'T 0 (now)' : `T -${60-t}m`;
  const incidentBoost = Math.max(0, 1 - Math.abs(t - 45) / 8);
  const stateLabel = incidentBoost > 0.6 ? '⚠ 事故高峰' : incidentBoost > 0.2 ? '⚠ 错误率上升' : '● 健康';
  const stateColor = incidentBoost > 0.6 ? 'var(--danger)' : incidentBoost > 0.2 ? 'var(--warning)' : 'var(--success)';
  // hh:mm label — assume "now" is 18:42, so each step ~ 1 min back
  const totalMinAgo = 60 - t;
  const nowMin = 18 * 60 + 42;
  const atMin = nowMin - totalMinAgo;
  const hh = String(Math.floor(atMin/60)).padStart(2,'0');
  const mm = String(atMin%60).padStart(2,'0');
  return `<div style="position:sticky;bottom:0;left:0;right:0;background:var(--bg-elev-0);border-top:1px solid var(--border);padding:10px 14px;margin: 14px -24px -24px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
    <button class="pill" id="topoPlay" onclick="APM.toggleTopoPlay()"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>播放</button>
    <span style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;">时间回放</span>
    <span class="mono" id="topoTimeLabel" style="font-size:12px;color:var(--text-1);min-width:74px;">${lbl}</span>
    <span class="mono" id="topoClock" style="font-size:11px;color:var(--text-3);">${hh}:${mm}</span>
    <span class="badge" id="topoStateBadge" style="color:${stateColor};border-color:${stateColor};background:transparent;">${stateLabel}</span>
    <input type="range" min="0" max="60" value="${t}" id="topoSlider" oninput="APM.setTopoTime(this.value, true)" style="flex:1;min-width:200px;accent-color:var(--accent);">
    <span class="mono" style="font-size:12px;color:var(--text-3);">T 0 (now)</span>
    <button class="pill" onclick="APM.setTopoTime(45, true)" title="跳到 18:35 ledger 异常">⚠ 18:35 异常</button>
  </div>`;
};
APM.setTopoTime = function(v, rerender) {
  APM.topoTime = +v;
  if (rerender) {
    // Throttle via rAF — and update only the topology bits in place to avoid flicker
    if (APM._topoRaf) cancelAnimationFrame(APM._topoRaf);
    APM._topoRaf = requestAnimationFrame(() => APM.applyTopoReplayUpdate());
  } else {
    const lbl = document.getElementById('topoTimeLabel');
    if (lbl) lbl.textContent = v == 60 ? 'T 0 (now)' : `T -${60-v}m`;
  }
};

// Local update: recompute service perturbations, swap SVG inner + side panel + bar texts
APM.applyTopoReplayUpdate = function() {
  const t = (typeof APM.topoTime === 'number') ? APM.topoTime : 60;
  const incidentDist = Math.abs(t - 45);
  const incidentBoost = Math.max(0, 1 - incidentDist / 8);
  const drift = (60 - t) / 60;
  if (!APM._svcOrig) APM._svcOrig = APM.services.map(s => ({ ...s }));
  APM.services.forEach((s, i) => {
    const o = APM._svcOrig[i];
    const isHotSvc = (o.id === 'ledger-service' || o.id === 'checkout-service' || o.id === 'risk-service');
    const errMul = 1 + (isHotSvc ? incidentBoost * 4 : incidentBoost * 0.6);
    const p99Mul = 1 + (isHotSvc ? incidentBoost * 1.6 : incidentBoost * 0.3);
    const rpmDip = isHotSvc ? (1 - incidentBoost * 0.18) : 1;
    s.errPct = +(o.errPct * errMul).toFixed(2);
    s.p99 = Math.round(o.p99 * p99Mul);
    s.rpm = Math.round(o.rpm * rpmDip * (0.92 + 0.08*Math.cos(drift*6 + i)));
    s.alerts = (isHotSvc && incidentBoost > 0.5) ? Math.max(o.alerts, 2) : (incidentBoost > 0.2 && isHotSvc ? Math.max(o.alerts, 1) : o.alerts);
  });

  // Swap the SVG by replacing its outerHTML (not the wrap container) — keeps the
  // toolbar, legend, slider DOM nodes intact so no flicker / focus loss.
  const oldSvg = document.querySelector('.topo-wrap .topo-svg');
  if (oldSvg) {
    const wrap = document.createElement('div');
    wrap.innerHTML = APM.topoSvg();
    const newSvg = wrap.firstElementChild;
    if (newSvg) oldSvg.replaceWith(newSvg);
  }
  // Side panel: only the metrics inside change
  const oldSide = document.querySelector('.topo-wrap .topo-side');
  if (oldSide) {
    const wrap2 = document.createElement('div');
    wrap2.innerHTML = APM.topoSidePanel();
    const newSide = wrap2.firstElementChild;
    if (newSide) oldSide.replaceWith(newSide);
  }
  // Replay bar: update label / state / time text in place (don't recreate slider)
  const lbl = document.getElementById('topoTimeLabel');
  if (lbl) lbl.textContent = t == 60 ? 'T 0 (now)' : `T -${60-t}m`;
  const stateEl = document.getElementById('topoStateBadge');
  const clockEl = document.getElementById('topoClock');
  if (stateEl) {
    const stateLabel = incidentBoost > 0.6 ? '⚠ 事故高峰' : incidentBoost > 0.2 ? '⚠ 错误率上升' : '● 健康';
    const stateColor = incidentBoost > 0.6 ? 'var(--danger)' : incidentBoost > 0.2 ? 'var(--warning)' : 'var(--success)';
    stateEl.textContent = stateLabel;
    stateEl.style.color = stateColor;
    stateEl.style.borderColor = stateColor;
  }
  if (clockEl) {
    const totalMinAgo = 60 - t;
    const nowMin = 18 * 60 + 42;
    const atMin = nowMin - totalMinAgo;
    const hh = String(Math.floor(atMin/60)).padStart(2,'0');
    const mm = String(atMin%60).padStart(2,'0');
    clockEl.textContent = `${hh}:${mm}`;
  }
};
APM.toggleTopoPlay = function() {
  if (APM._topoTimer) {
    clearInterval(APM._topoTimer); APM._topoTimer = null;
    const b = document.getElementById('topoPlay');
    if (b) b.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>播放';
    return;
  }
  APM._topoTimer = setInterval(() => {
    let v = (typeof APM.topoTime === 'number' ? APM.topoTime : 60) + 1;
    if (v > 60) v = 0;
    APM.setTopoTime(v, true);
  }, 600);
  const b = document.getElementById('topoPlay');
  if (b) b.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>暂停';
};

// ---------- Global ⌘K command palette ----------
APM.cmdkOpen = false;
APM.cmdkQuery = '';
APM.toggleCmdK = function(open) {
  APM.cmdkOpen = open === undefined ? !APM.cmdkOpen : open;
  APM.renderCmdK();
  if (APM.cmdkOpen) setTimeout(() => { const i = document.getElementById('cmdkInput'); if (i) i.focus(); }, 50);
};
APM.renderCmdK = function() {
  let host = document.getElementById('cmdkHost');
  if (!host) { host = document.createElement('div'); host.id = 'cmdkHost'; document.body.appendChild(host); }
  if (!APM.cmdkOpen) { host.innerHTML = ''; return; }
  const q = (APM.cmdkQuery || '').toLowerCase();
  const allItems = [
    ...APM.services.map(s => ({type:'服务', label:s.name, hint:`${s.lang} · ${s.rpm} rpm`, action:`APM.go('service',{id:'${s.id}'})`})),
    ...APM.endpoints.map(e => ({type:'端点', label:`${e.method} ${e.path}`, hint:`${e.rpm} rpm · P99 ${e.p99}ms`, action:`APM.go('service',{id:'checkout-service'})`})),
    ...APM.traces.map(t => ({type:'Trace', label:t.id, hint:`${t.svc} · ${t.dur}ms`, action:`APM.go('traces')`})),
    {type:'页面', label:'服务概览', hint:'overview', action:`APM.go('overview')`},
    {type:'页面', label:'调用链 Traces', hint:'traces', action:`APM.go('traces')`},
    {type:'页面', label:'日志 Logs', hint:'logs', action:`APM.go('logs')`},
    {type:'页面', label:'拓扑 Topology', hint:'topology', action:`APM.go('topology')`},
    {type:'页面', label:'告警 Alerts', hint:'alerts', action:`APM.go('alerts')`},
    {type:'页面', label:'数据库 DB Calls', hint:'database', action:`APM.go('database')`},
    {type:'页面', label:'仪表盘 Dashboards', hint:'dashboards', action:`APM.go('dashboards')`},
    {type:'页面', label:'设置', hint:'settings', action:`APM.go('settings')`},
    {type:'操作', label:'切换主题', hint:'明 / 暗', action:'APM.toggleTheme()'},
    {type:'操作', label:'手动刷新', hint:'⌘R', action:'APM.manualRefresh()'}
  ];
  const items = q ? allItems.filter(it => (it.label+' '+it.hint+' '+it.type).toLowerCase().includes(q)).slice(0,12) : allItems.slice(0,10);
  host.innerHTML = `<div class="cmdk-bg" onclick="APM.toggleCmdK(false)"></div>
    <div class="cmdk">
      <div class="cmdk-input-row">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="cmdkInput" placeholder="搜索服务、端点、trace id、页面…  例: checkout / 4f2c9a / settings" oninput="APM.cmdkQuery=this.value;APM.renderCmdK();setTimeout(()=>document.getElementById('cmdkInput').focus(),0);">
        <span class="kbd">esc</span>
      </div>
      <div class="cmdk-list">
        ${items.length === 0 ? `<div style="padding:24px;text-align:center;color:var(--text-3);font-size:13px;">无匹配结果</div>` :
          items.map((it,i) => `<div class="cmdk-item ${i===0?'active':''}" onclick="${it.action};APM.toggleCmdK(false);">
            <span class="cmdk-type">${it.type}</span>
            <span class="cmdk-label">${it.label}</span>
            <span class="cmdk-hint">${it.hint}</span>
            ${i===0?'<span class="kbd">↵</span>':''}
          </div>`).join('')}
      </div>
      <div class="cmdk-foot">
        <span><span class="kbd">↑↓</span> 选择</span><span><span class="kbd">↵</span> 打开</span><span><span class="kbd">esc</span> 关闭</span>
        <span style="margin-left:auto;">啄木鸟 ⌘K</span>
      </div>
    </div>`;
};

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); APM.toggleCmdK(true); }
  if (e.key === 'Escape' && APM.cmdkOpen) APM.toggleCmdK(false);
  if (e.key === 'Enter' && APM.cmdkOpen) {
    const it = document.querySelector('.cmdk-item.active'); if (it) it.click();
  }
});
