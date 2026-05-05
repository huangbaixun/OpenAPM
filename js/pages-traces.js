// ============ Traces page (with TraceQL Builder) ============
APM.traceQuery = APM.traceQuery || {
  conds: [
    { key: 'duration', op: '>', val: '100ms' },
    { key: 'status',   op: '=', val: 'error' }
  ],
  sort: 'dur'
};
APM.savedTraceQueries = APM.savedTraceQueries || [];
APM.traceDetailTab = APM.traceDetailTab || 'waterfall';
APM._traceSortLabels = { dur:'延迟', time:'时间', spans:'Spans' };

APM.cycleTraceSort = function() {
  const order = ['dur','time','spans'];
  const i = order.indexOf(APM.traceQuery.sort);
  APM.traceQuery.sort = order[(i+1) % order.length];
  APM.renderPage();
};
APM.addTraceCond = function() {
  APM.traceQuery.conds.push({ key:'service.name', op:'=', val:'' });
  APM.renderPage();
};
APM.removeTraceCond = function(idx) {
  APM.traceQuery.conds.splice(idx, 1);
  APM.renderPage();
};
APM.editTraceCond = function(idx) {
  const c = APM.traceQuery.conds[idx];
  if (!c) return;
  const m = APM.openModal({
    title: '编辑条件',
    width: 460,
    body: `
      <div class="form-grid-2">
        ${APM.field('属性 / Tag', APM.input('key', c.key))}
        ${APM.field('操作符', APM.select('op', ['=','!=','>','<','>=','<=','=~'], c.op))}
      </div>
      ${APM.field('值', APM.input('val', c.val))}
    `,
    footer: `<button class="pill" data-act="cancel">取消</button><button class="pill primary" data-act="ok">应用</button>`
  });
  m.el.querySelector('[data-act="cancel"]').onclick = () => m.close();
  m.el.querySelector('[data-act="ok"]').onclick = () => {
    const v = APM.modalForm(m.id);
    APM.traceQuery.conds[idx] = { key: v.key, op: v.op, val: v.val };
    m.close();
    APM.renderPage();
  };
};
APM.runTraceQuery = function() {
  APM.renderPage();
  APM.toast(`已运行查询 · 命中 ${APM._lastTraceMatchCount || 0} traces`, 'success');
};
APM.exportTraces = function() {
  const list = APM._currentTraceList || APM.traces;
  APM.download('traces-' + Date.now() + '.json', JSON.stringify(list, null, 2), 'application/json');
};
APM.saveCurrentTraceQuery = function() {
  const m = APM.openModal({
    title: '保存查询',
    width: 420,
    body: `
      ${APM.field('名称', APM.input('name', '我的慢查询'))}
      ${APM.field('描述（可选）', APM.textarea('desc', '错误且耗时 > 100ms', 2))}
    `,
    footer: `<button class="pill" data-act="cancel">取消</button><button class="pill primary" data-act="ok">保存</button>`
  });
  m.el.querySelector('[data-act="cancel"]').onclick = () => m.close();
  m.el.querySelector('[data-act="ok"]').onclick = () => {
    const v = APM.modalForm(m.id);
    if (!v.name) { APM.toast('请填写名称', 'warn'); return; }
    APM.savedTraceQueries.unshift({
      id: 'sq-' + Date.now(),
      name: v.name,
      desc: v.desc,
      conds: JSON.parse(JSON.stringify(APM.traceQuery.conds))
    });
    APM.logAudit('trace.query.save', v.name);
    m.close();
    APM.toast('已保存查询 · ' + v.name, 'success');
  };
};

APM.renderTraces = function() {
  // Consume route params: pre-populate conditions when navigated from another page
  if (APM.pageParams) {
    const p = APM.pageParams;
    const ensure = (key, op, val) => {
      if (!val) return;
      const ex = APM.traceQuery.conds.findIndex(c => c.key === key);
      if (ex >= 0) APM.traceQuery.conds[ex] = { key, op, val };
      else APM.traceQuery.conds.unshift({ key, op, val });
    };
    if (p.svcFilter) ensure('service.name', '=', p.svcFilter);
    if (p.svc)       ensure('service.name', '=', p.svc);
    if (p.endpoint)  ensure('http.target', '=', p.endpoint);
    if (p.error)     ensure('exception.type', '=', p.error);
    if (p.sql)       ensure('db.statement', '=~', p.sql.slice(0, 40) + '…');
    if (p.external)  ensure('peer.host', '=', p.external);
    if (p.trace)     ensure('trace.id', '=', p.trace);
    if (p.topic)     ensure('messaging.destination', '=', p.topic);
    if (p.clusterId) {
      // Resolve cluster → set of services that touch it. Compose an OR-ish svc filter
      // by storing on the query via a synthetic "cluster" key consumed in `matches`.
      APM.traceQuery._clusterId = p.clusterId;
    } else {
      delete APM.traceQuery._clusterId;
    }
    APM.pageParams = {}; // consume once
  }
  const cid = APM.traceQuery._clusterId;
  const cluster = cid ? APM.clusterById(cid) : null;
  return `
    <div class="between">
      <div>
        <div class="page-title">调用链 Traces${cluster ? ` <span style="font-size:13px;color:var(--text-3);font-weight:500;">· 集群 ${cluster.name}</span>` : ''}</div>
        <div class="page-sub">分布式追踪 · OpenTelemetry · 共采集 ${(APM.traces.length*8421).toLocaleString()} traces / 1h</div>
      </div>
      <div style="display:flex; gap:8px;">
        ${cluster ? `<button class="pill" onclick="delete APM.traceQuery._clusterId; APM.renderPage();">清除集群过滤</button>` : ''}
        <button class="pill" onclick="APM.exportTraces()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>导出</button>
        <button class="pill primary" onclick="APM.saveCurrentTraceQuery()">保存查询</button>
      </div>
    </div>
    ${APM.tracesBody(null, false)}
  `;
};

APM.tracesBody = function(forceSvcFilter, embedded) {
  // Build effective filter set: explicit forceSvcFilter (when embedded inside service detail) OR APM.traceQuery
  const conds = APM.traceQuery.conds.slice();
  if (forceSvcFilter) {
    const ex = conds.findIndex(c => c.key === 'service.name');
    if (ex >= 0) conds.splice(ex, 1);
    conds.unshift({ key:'service.name', op:'=', val: forceSvcFilter });
  }
  // Apply filter to APM.traces (best-effort; missing keys don't filter out)
  const matches = (t, c) => {
    let v;
    switch (c.key) {
      case 'service.name': v = t.svc; break;
      case 'duration': {
        const num = parseFloat(c.val);
        if (c.op === '>') return t.dur > num;
        if (c.op === '<') return t.dur < num;
        if (c.op === '>=') return t.dur >= num;
        if (c.op === '<=') return t.dur <= num;
        return t.dur === num;
      }
      case 'status': return c.op === '=' ? t.statusKind === c.val : t.statusKind !== c.val;
      case 'http.target': v = t.root; break;
      case 'trace.id': v = t.id; break;
      default: return true; // unknown key — don't filter out
    }
    if (c.op === '=') return v === c.val;
    if (c.op === '!=') return v !== c.val;
    if (c.op === '=~') return String(v || '').includes(c.val.replace('…',''));
    return true;
  };
  // Cluster scoping: if a clusterId was passed via route, derive the set of svcs
  // that connect to that cluster (from connectionPools/redisOps/kafkaProducers/Consumers).
  const clusterId = APM.traceQuery._clusterId;
  let clusterSvcs = null;
  if (clusterId) {
    const set = new Set();
    APM.connectionPools.filter(p => p.clusterId === clusterId).forEach(p => set.add(p.svc));
    APM.redisOps.filter(o => o.clusterId === clusterId).forEach(o => set.add(o.svc));
    APM.kafkaProducers.filter(p => p.clusterId === clusterId).forEach(p => set.add(p.svc));
    APM.kafkaConsumers.filter(c => c.clusterId === clusterId).forEach(c => set.add(c.svc));
    APM.slowQueries.filter(q => q.clusterId === clusterId).forEach(q => set.add(q.svc));
    clusterSvcs = set;
  }
  // Restrict to current project's services first.
  let filtered = APM.traces.filter(t => APM.inProject(t.svc));
  if (clusterSvcs) filtered = filtered.filter(t => clusterSvcs.has(t.svc));
  filtered = filtered.filter(t => conds.every(c => matches(t, c)));
  // Sort
  if (APM.traceQuery.sort === 'dur') filtered = filtered.slice().sort((a,b)=>b.dur-a.dur);
  else if (APM.traceQuery.sort === 'spans') filtered = filtered.slice().sort((a,b)=>b.spans-a.spans);
  else filtered = filtered.slice().sort((a,b)=>a.ts < b.ts ? 1 : -1);
  APM._currentTraceList = filtered;
  APM._lastTraceMatchCount = filtered.length;

  // build histogram (latency dist)
  const buckets = [38, 62, 84, 46, 18, 8, 3];
  const labels = ['0-50','50-100','100-200','200-500','500-1s','1-2s','2s+'];
  const max = Math.max(...buckets);
  return `
    <div class="card" style="margin-top:${embedded?12:14}px; padding: 14px;">
      <div class="card-title"><span>TraceQL 查询构建器</span><span class="hint">支持属性 / 标签 / 时间过滤 · 点击 chip 编辑</span></div>
      <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
        ${conds.map((c, idx) => {
          const locked = forceSvcFilter && idx === 0;
          const dataIdx = idx - (forceSvcFilter ? 1 : 0);
          return `<span class="qb-chip" ${locked ? 'style="opacity:.7;cursor:default;" title="由当前服务上下文锁定"' : `style="cursor:pointer;" onclick="APM.editTraceCond(${dataIdx})"`}><span class="qb-key">${c.key}</span><span class="qb-op">${c.op}</span><span class="qb-val">${c.val}</span>${locked ? '<span class="qb-x" style="visibility:hidden;">×</span>' : `<span class="qb-x" onclick="event.stopPropagation();APM.removeTraceCond(${dataIdx})">×</span>`}</span>`;
        }).join('')}
        <button class="qb-add" onclick="APM.addTraceCond()">+ 添加条件</button>
        <div style="flex:1;"></div>
        <button class="pill primary" onclick="APM.runTraceQuery()">运行查询</button>
      </div>
      <div style="margin-top: 10px;">
        <pre class="code" style="padding: 10px 14px; font-size: 11.5px;"><span class="kw">{</span> ${conds.map(c => `<span class="fn">${c.key}</span> ${c.op} <span class="${typeof c.val === 'number' ? 'num' : 'st'}">${typeof c.val === 'string' ? `"${c.val}"` : c.val}</span>`).join(' &amp;&amp; ')} <span class="kw">}</span> | <span class="fn">count</span>() <span class="cm"># 由 Builder 自动生成</span></pre>
      </div>
      ${APM.savedTraceQueries.length ? `<div style="margin-top:8px;font-size:11.5px;color:var(--text-3);">已保存查询：${APM.savedTraceQueries.slice(0,4).map(q => `<span class="chip" style="cursor:pointer;margin-right:4px;" onclick="APM.loadTraceQuery('${q.id}')">${q.name}</span>`).join('')}</div>` : ''}
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title"><span>延迟分布</span><span class="hint">trace duration histogram</span></div>
        <div style="display:flex; gap: 4px; height: 130px; align-items: flex-end; padding: 8px 0;">
          ${buckets.map((v,i) => `<div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:4px;">
            <div style="font-size:10px; font-family:var(--mono); color: var(--text-3);">${v}</div>
            <div style="width:75%; height:${v/max*88}px; background: linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 50%, transparent)); border-radius: 3px 3px 0 0;"></div>
            <div style="font-size:10px; color: var(--text-3);">${labels[i]}</div>
          </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span>错误率 / 时间</span></div>
        <svg viewBox="0 0 600 130" width="100%" height="130" preserveAspectRatio="none">
          <g stroke="var(--grid)"><line x1="0" y1="40" x2="600" y2="40"/><line x1="0" y1="80" x2="600" y2="80"/></g>
          <polyline points="${Array.from({length:60}).map((_,i)=>`${i*10},${100-Math.sin(i/4)*15-Math.cos(i/2)*5-(i>40?10:0)}`).join(' ')}" fill="none" stroke="var(--warning)" stroke-width="1.6"/>
        </svg>
      </div>
    </div>

    <div class="card" style="padding: 0; margin-top: 12px;">
      <div style="padding: 12px 16px; border-bottom: 1px solid var(--border);" class="between">
        <div style="font-weight: 600;">${filtered.length} traces 匹配</div>
        <div style="display:flex; gap: 8px;">
          <button class="pill" onclick="APM.cycleTraceSort()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M6 12h12M10 18h4"/></svg>排序: ${APM._traceSortLabels[APM.traceQuery.sort]}</button>
        </div>
      </div>
      ${filtered.length === 0 ? `<div class="placeholder" style="margin: 24px;"><div class="icon">🔍</div>未匹配到 trace · 调整条件后重试</div>` : `<table class="tbl">
        <thead><tr><th style="padding-left:14px;">Trace ID</th><th>Root</th><th>Service</th><th>Status</th><th>Duration</th><th>Spans</th><th>Time</th></tr></thead>
        <tbody>
          ${filtered.map((t,i) => `<tr class="clickable" onclick="APM.showTraceDetail('${t.id}')">
            <td style="padding-left:14px;" class="mono">${t.id}</td>
            <td>${t.root}</td>
            <td><span class="chip">${t.svc}</span></td>
            <td><span class="badge ${t.statusKind}">${t.status}</span></td>
            <td class="mono">${t.dur}ms</td>
            <td class="mono">${t.spans}</td>
            <td class="mono" style="color:var(--text-3);">${t.ts}</td>
          </tr>`).join('')}
        </tbody>
      </table>`}
    </div>

    <div id="traceDrawerBg" class="drawer-bg" onclick="APM.closeTraceDetail()"></div>
    <div id="traceDrawer" class="drawer">
      <div class="drawer-head">
        <div>
          <div style="font-size: 16px; font-weight: 600;" id="td-title">POST /checkout</div>
          <div style="color: var(--text-3); font-size: 12px; margin-top: 2px;" class="mono" id="td-id">4f2c9a...b801</div>
        </div>
        <button class="icon-btn" onclick="APM.closeTraceDetail()">✕</button>
      </div>
      <div class="drawer-body" id="td-body"></div>
    </div>
  `;
};

APM.loadTraceQuery = function(id) {
  const q = APM.savedTraceQueries.find(x => x.id === id);
  if (!q) return;
  APM.traceQuery.conds = JSON.parse(JSON.stringify(q.conds));
  APM.renderPage();
  APM.toast('已加载查询 · ' + q.name, 'info');
};

APM.showTraceDetail = function(id) {
  const t = APM.traces.find(x => x.id === id);
  if (!t) return;
  APM._currentDetailTrace = t;
  APM.traceDetailTab = APM.traceDetailTab || 'waterfall';
  document.getElementById('traceDrawer').classList.add('open');
  document.getElementById('traceDrawerBg').classList.add('open');
  document.getElementById('td-title').textContent = t.root;
  document.getElementById('td-id').textContent = t.id;
  APM._renderTraceDetailBody();
};

APM.setTraceDetailTab = function(tab) {
  APM.traceDetailTab = tab;
  APM._renderTraceDetailBody();
};

APM._renderTraceDetailBody = function() {
  const t = APM._currentDetailTrace;
  if (!t) return;
  const tab = APM.traceDetailTab;
  // Build waterfall span list (used by waterfall tab + service map tab)
  const spans = [
    { svc: 'gateway', op: 'POST /api/v2/checkout', start: 0, dur: t.dur, depth: 0, color: 'var(--accent)', kind: 'server' },
    { svc: 'gateway', op: 'auth.verify', start: 12, dur: 18, depth: 1, color: 'var(--accent)', kind: 'internal' },
    { svc: 'checkout-service', op: 'POST /checkout', start: 38, dur: t.dur - 60, depth: 1, color: 'var(--purple)', kind: 'server' },
    { svc: 'checkout-service', op: 'cart.load', start: 42, dur: 22, depth: 2, color: 'var(--purple)' },
    { svc: 'checkout-service', op: 'mysql · SELECT cart', start: 46, dur: 14, depth: 3, color: '#ffcc00', kind: 'db' },
    { svc: 'checkout-service', op: 'price.calc', start: 68, dur: 18, depth: 2, color: 'var(--purple)' },
    { svc: 'risk-service', op: 'POST /risk/score', start: 92, dur: 820, depth: 2, color: 'var(--teal)', kind: 'client' },
    { svc: 'risk-service', op: 'redis · GET user_risk', start: 110, dur: 6, depth: 3, color: '#dc382d', kind: 'cache' },
    { svc: 'risk-service', op: 'mysql · SELECT user_risk', start: 130, dur: 692, depth: 3, color: '#ffcc00', kind: 'db' },
    { svc: 'payment-service', op: 'POST /pay/card', start: 940, dur: 480, depth: 2, color: 'var(--success)' },
    { svc: 'payment-service', op: 'stripe.charges.create', start: 960, dur: 420, depth: 3, color: 'var(--purple)', kind: 'external' },
    { svc: 'ledger-service', op: 'POST /ledger/write', start: 1432, dur: 360, depth: 2, color: 'var(--warning)' },
    { svc: 'ledger-service', op: 'mysql · INSERT ledger', start: 1450, dur: 332, depth: 3, color: '#ffcc00', kind: 'db', error: t.err }
  ];
  const total = t.dur;

  const head = `
    <div class="grid-4" style="margin-top:0;">
      <div class="card kpi"><div class="name">总耗时</div><div class="value">${t.dur}<span class="unit">ms</span></div></div>
      <div class="card kpi"><div class="name">Spans</div><div class="value">${t.spans}</div></div>
      <div class="card kpi"><div class="name">Services</div><div class="value">5</div></div>
      <div class="card kpi"><div class="name">状态</div><div class="value" style="color:${t.statusKind==='err'?'var(--danger)':'var(--success)'};">${t.status}</div></div>
    </div>

    <div class="subtabs" style="margin-top: 16px;">
      <div class="subtab ${tab==='waterfall'?'active':''}" onclick="APM.setTraceDetailTab('waterfall')">Waterfall</div>
      <div class="subtab ${tab==='logs'?'active':''}" onclick="APM.setTraceDetailTab('logs')">Logs<span class="pill-mini">${(APM.logs || []).length}</span></div>
      <div class="subtab ${tab==='svcmap'?'active':''}" onclick="APM.setTraceDetailTab('svcmap')">Service Map</div>
      <div class="subtab ${tab==='json'?'active':''}" onclick="APM.setTraceDetailTab('json')">JSON</div>
    </div>
  `;

  let body = '';
  if (tab === 'waterfall') {
    body = `
      <div class="card" style="padding: 12px 14px;">
        <div class="waterfall">
          ${spans.map(sp => {
            const left = (sp.start / total * 100).toFixed(2);
            const width = Math.max(0.4, sp.dur / total * 100).toFixed(2);
            const indent = '·'.repeat(sp.depth*2);
            return `<div class="wf-row" ${sp.error?'style="background: color-mix(in srgb, var(--danger) 6%, transparent);"':''}>
              <div class="svc">
                <span class="indent">${indent}</span>
                <span class="tag" style="background:${sp.color};"></span>
                <span style="color: var(--text-3); font-size: 11px;">${sp.svc}</span>
                <span style="font-weight:500;">${sp.op}</span>
                ${sp.error?'<span class="badge err">ERR</span>':''}
              </div>
              <div class="wf-bar"><span style="left:${left}%; width:${width}%; background:${sp.color}; ${sp.error?'background: var(--danger);':''}"></span></div>
              <div class="dur">${sp.dur}ms</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      ${t.err ? `<div class="banner err" style="margin-top: 12px;">
        <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>
        <div class="grow"><strong>SQLIntegrityConstraintViolationException</strong> · Duplicate entry 'ord_82910' for key 'ledger.PRIMARY'</div>
        <a onclick="APM.openExceptionStack('SQLIntegrityConstraintViolationException', 'ledger-service')" style="cursor:pointer;">查看堆栈</a>
      </div>` : ''}

      <div class="card" style="margin-top:12px;">
        <div class="card-title"><span>关键属性</span></div>
        <div style="display:grid; grid-template-columns: 140px 1fr; gap: 6px 12px; font-size: 12.5px;">
          <div style="color:var(--text-3);">trace.id</div><div class="mono">${t.id}</div>
          <div style="color:var(--text-3);">http.method</div><div class="mono">POST</div>
          <div style="color:var(--text-3);">http.target</div><div class="mono">/api/v2/checkout</div>
          <div style="color:var(--text-3);">http.status_code</div><div class="mono">${t.status}</div>
          <div style="color:var(--text-3);">user.id</div><div class="mono">u_2813</div>
          <div style="color:var(--text-3);">deployment.env</div><div class="mono">production</div>
        </div>
      </div>
    `;
  } else if (tab === 'logs') {
    // Pull logs that mention this trace (or fallback: most recent)
    const traceShort = t.id.split('...')[0];
    const matched = (APM.logs || []).filter(l => (l.msg || '').includes(traceShort) || l.trace).slice(0, 12);
    const display = matched.length ? matched : (APM.logs || []).slice(0, 12);
    const sevColor = (s) => s==='ERROR'?'var(--danger)':s==='WARN'?'var(--warning)':s==='INFO'?'var(--accent)':'var(--text-3)';
    body = `
      <div class="card" style="padding:0;overflow:hidden;">
        <div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:12px;color:var(--text-2);">${matched.length ? '通过 trace.id 关联' : '该 trace 无直接关联的结构化日志 · 显示同时段日志'} · ${display.length} 条</div>
        <table class="tbl">
          <thead><tr><th style="padding-left:14px;width:120px;">时间</th><th style="width:80px;">级别</th><th style="width:140px;">服务</th><th>消息</th></tr></thead>
          <tbody>
            ${display.map(l => `<tr>
              <td style="padding-left:14px;" class="mono">${l.ts}</td>
              <td><span class="badge" style="background:color-mix(in srgb, ${sevColor(l.sev)} 18%, transparent);color:${sevColor(l.sev)};">${l.sev}</span></td>
              <td><span class="chip">${l.svc}</span></td>
              <td class="mono" style="font-size:11.5px;">${l.msg}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (tab === 'svcmap') {
    // Inline SVG mini service map for this trace
    const services = ['gateway','checkout-service','risk-service','payment-service','ledger-service'];
    const positions = [
      { x: 60,  y: 110 }, { x: 220, y: 110 }, { x: 380, y: 60 },
      { x: 380, y: 160 }, { x: 540, y: 110 }
    ];
    const edges = [
      [0,1, 8],
      [1,2, 92],
      [1,3, 480],
      [3,4, 360]
    ];
    body = `
      <div class="card" style="padding:14px;">
        <div class="card-title"><span>该 trace 路径</span><span class="hint">node = service · edge = call · label = ms</span></div>
        <svg viewBox="0 0 640 230" width="100%" height="230">
          <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="strokeWidth" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--text-3)"/></marker></defs>
          ${edges.map(([a,b,ms]) => {
            const ax = positions[a].x, ay = positions[a].y, bx = positions[b].x, by = positions[b].y;
            const mx = (ax+bx)/2, my = (ay+by)/2;
            return `<g><line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="var(--text-3)" stroke-width="1.5" marker-end="url(#arr)" opacity="0.6"/><text x="${mx}" y="${my-6}" text-anchor="middle" fill="var(--text-3)" font-size="11" font-family="var(--mono)">${ms} ms</text></g>`;
          }).join('')}
          ${services.map((sv, i) => {
            const p = positions[i];
            const isErr = sv === 'ledger-service' && t.err;
            const bg = isErr ? 'var(--danger)' : 'var(--accent)';
            return `<g><circle cx="${p.x}" cy="${p.y}" r="22" fill="color-mix(in srgb, ${bg} 18%, transparent)" stroke="${bg}" stroke-width="1.5"/><text x="${p.x}" y="${p.y+38}" text-anchor="middle" fill="var(--text-1)" font-size="11" font-weight="600">${sv}</text></g>`;
          }).join('')}
        </svg>
      </div>
    `;
  } else if (tab === 'json') {
    const obj = { trace: t, spans: spans.map(s => ({ service: s.svc, op: s.op, startMs: s.start, durMs: s.dur, depth: s.depth, error: !!s.error })), attributes: { 'http.method':'POST','http.target':'/api/v2/checkout','user.id':'u_2813','deployment.env':'production' } };
    body = `
      <div class="card" style="padding:12px;">
        <div class="card-title"><span>原始 JSON</span><button class="pill" style="padding:4px 10px;font-size:11px;" onclick='APM.copy(${JSON.stringify(JSON.stringify(obj, null, 2)).replace(/"/g,'&quot;')}, "已复制 trace JSON")'>复制</button></div>
        <pre class="code" style="max-height:60vh;overflow:auto;">${JSON.stringify(obj, null, 2).replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</pre>
      </div>
    `;
  }

  document.getElementById('td-body').innerHTML = head + body;
};

APM.closeTraceDetail = function() {
  document.getElementById('traceDrawer').classList.remove('open');
  document.getElementById('traceDrawerBg').classList.remove('open');
  APM._currentDetailTrace = null;
};

// Helper used by error banner inside trace drawer + by Exceptions page
APM.openExceptionStack = function(type, svc) {
  const stacks = {
    'SQLIntegrityConstraintViolationException': `java.sql.SQLIntegrityConstraintViolationException: Duplicate entry 'ord_82910' for key 'ledger.PRIMARY'
  at com.mysql.cj.jdbc.exceptions.SQLError.createSQLException(SQLError.java:114) ~[mysql-connector-j-8.2.0.jar:8.2.0]
  at com.mysql.cj.jdbc.exceptions.SQLExceptionsMapping.translateException(SQLExceptionsMapping.java:122) ~[mysql-connector-j-8.2.0.jar:8.2.0]
  at com.mysql.cj.jdbc.ClientPreparedStatement.executeUpdateInternal(ClientPreparedStatement.java:1063)
  at com.eshop.ledger.dao.LedgerDAO.insert(LedgerDAO.java:87) ~[ledger-service-2.4.1.jar:?]
  at com.eshop.ledger.svc.LedgerService.write(LedgerService.java:142)
  at com.eshop.ledger.web.LedgerController.write(LedgerController.java:48)
  ... 38 frames trimmed`,
    'TimeoutException': `java.util.concurrent.TimeoutException: Read timed out: stripe.com after 3000ms
  at okhttp3.internal.io.RealConnection.connectSocket(RealConnection.java:248)
  at com.eshop.payment.client.StripeClient.charge(StripeClient.java:96)
  at com.eshop.payment.svc.PaymentService.capture(PaymentService.java:188)
  ... 24 frames trimmed`,
    'IllegalArgumentException': `java.lang.IllegalArgumentException: order.amount must be positive, got -1.5
  at com.eshop.order.dto.OrderRequest.validate(OrderRequest.java:54)
  at com.eshop.order.svc.OrderService.create(OrderService.java:122)
  ... 18 frames trimmed`,
    'JedisConnectionException': `redis.clients.jedis.exceptions.JedisConnectionException: Could not get a resource from the pool
  at redis.clients.jedis.util.Pool.getResource(Pool.java:59)
  at com.eshop.risk.cache.RiskCache.get(RiskCache.java:33)
  ... 16 frames trimmed`,
    'ValidationError': `pydantic.ValidationError: 1 validation error for User
phone
  field must be a valid E.164 number (type=value_error)
  File "/app/users/svc.py", line 88, in update_user
    user = User(**body)`
  };
  const stack = stacks[type] || `${type}: 详细堆栈未捕获`;
  APM.openModal({
    title: `堆栈 · ${type}`,
    width: 720,
    body: `
      <div style="font-size:12px;color:var(--text-3);margin-bottom:6px;">服务：<strong style="color:var(--text-1);">${svc || '未知'}</strong></div>
      <pre class="code" style="max-height:60vh;overflow:auto;font-size:11.5px;">${stack.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</pre>
    `,
    footer: `<button class="pill" data-act="close">关闭</button><button class="pill" data-act="copy">复制堆栈</button><button class="pill primary" data-act="traces">查看相关 trace</button>`
  }).el.addEventListener('click', (ev) => {
    const act = ev.target.dataset.act;
    if (!act) return;
    if (act === 'copy') { APM.copy(stack, '已复制堆栈'); return; }
    APM.closeModal(ev.currentTarget.id);
    if (act === 'traces') APM.go('traces', { error: type });
  });
};
