// ============ Service Detail (multi-tab container) ============
APM.serviceTab = 'overview';
APM.endpointFilter = APM.endpointFilter || '';
APM.setEndpointFilter = function(v) { APM.endpointFilter = v; APM.renderPage(); };

APM.openSLOModal = function(svcId) {
  const s = APM.services.find(x=>x.id===svcId) || APM.services[0];
  const target = 99.9;
  const actual = (100 - s.errPct).toFixed(2);
  const budgetUsed = ((s.errPct / (100 - target)) * 100).toFixed(0);
  const burnColor = budgetUsed > 100 ? 'var(--danger)' : budgetUsed > 50 ? 'var(--warning)' : 'var(--success)';
  APM.openModal({
    title: `SLO · ${s.name}`,
    width: 540,
    body: `
      <div style="display:flex;align-items:baseline;gap:14px;margin-bottom:14px;">
        <div><div style="font-size:11px;color:var(--text-3);">目标可用性</div><div style="font-size:22px;font-weight:600;">${target}%</div></div>
        <div><div style="font-size:11px;color:var(--text-3);">实际</div><div style="font-size:22px;font-weight:600;color:${actual >= target ? 'var(--success)' : 'var(--danger)'};">${actual}%</div></div>
        <div style="margin-left:auto;"><div style="font-size:11px;color:var(--text-3);">错误预算消耗</div><div style="font-size:22px;font-weight:600;color:${burnColor};">${budgetUsed}%</div></div>
      </div>
      <div class="bar" style="height:8px;"><span style="width:${Math.min(100, budgetUsed)}%;background:${burnColor};"></span></div>
      <div class="form-help" style="margin-top:10px;">窗口 30d · 燃烧速率 ${budgetUsed > 100 ? '> 1' : '< 1'}（${budgetUsed > 100 ? '将提前耗尽' : '健康'}）</div>
      <div style="margin-top:14px;font-size:12.5px;color:var(--text-2);">
        <div><strong>SLI 定义：</strong> good = http.status &lt; 500 AND duration &lt; ${s.p99 < 500 ? '500ms' : '1s'}</div>
        <div style="margin-top:4px;"><strong>关联告警：</strong> 当 30m 燃烧 &gt; 14× 时触发 critical</div>
      </div>
    `,
    footer: `<button class="pill" data-act="close">关闭</button><button class="pill primary" data-act="alerts">查看相关告警</button>`
  }).el.addEventListener('click', (e) => {
    if (e.target.dataset.act === 'close') APM.closeModal(e.currentTarget.id);
    if (e.target.dataset.act === 'alerts') { APM.closeModal(e.currentTarget.id); APM.go('alerts', {svcFilter: s.id}); }
  });
};

APM.openEndpointDetail = function(path) {
  const e = APM.endpoints.find(x=>x.path===path);
  if (!e) return;
  // mock waterfall (5 spans)
  const spans = [
    { svc:'gateway',  op:`HTTP ${e.method} ${e.path}`, ms: 4,  pct: 1,  color:'var(--accent)' },
    { svc:'checkout-service', op:'authn.verify',         ms: 12, pct: 4,  color:'var(--purple)' },
    { svc:'risk-service',     op:'POST /risk/score',     ms: e.p99 * 0.4, pct: 30, color:'var(--warning)' },
    { svc:'mysql',            op:'SELECT … FROM cart',   ms: e.p95 * 0.3, pct: 18, color:'#ffcc00' },
    { svc:'checkout-service', op:'persist + commit',     ms: e.p99 * 0.25, pct: 22, color:'var(--success)' }
  ];
  APM.openModal({
    title: `端点 · ${e.method} ${e.path}`,
    width: 720,
    body: `
      <div class="grid-4" style="margin-bottom:14px;">
        <div class="card kpi"><div class="name">RPM</div><div class="value">${e.rpm}</div></div>
        <div class="card kpi"><div class="name">错误率</div><div class="value" style="color:${e.errPct>1?'var(--danger)':e.errPct>0.3?'var(--warning)':'var(--text-1)'};">${e.errPct.toFixed(2)}%</div></div>
        <div class="card kpi"><div class="name">P95</div><div class="value">${e.p95}<span class="unit">ms</span></div></div>
        <div class="card kpi"><div class="name">P99</div><div class="value">${e.p99}<span class="unit">ms</span></div></div>
      </div>
      <div style="font-weight:600;margin-bottom:6px;font-size:12px;color:var(--text-2);">代表性 trace · 等同 P99 路径</div>
      <div class="waterfall">
        ${spans.map(sp => `<div class="wf-row"><div class="svc"><span class="tag" style="background:${sp.color};"></span><span>${sp.svc}</span><span style="color:var(--text-3);font-size:11px;">${sp.op}</span></div><div class="wf-bar"><span style="left:${sp.pct < 30 ? sp.pct : 0}%;width:${Math.max(4, sp.pct)}%;background:${sp.color};"></span></div><div class="dur">${Math.round(sp.ms)} ms</div></div>`).join('')}
      </div>
    `,
    footer: `<button class="pill" data-act="close">关闭</button><button class="pill" data-act="logs">关联日志</button><button class="pill primary" data-act="traces">在 Traces 中打开</button>`
  }).el.addEventListener('click', (ev) => {
    const act = ev.target.dataset.act;
    if (!act) return;
    APM.closeModal(ev.currentTarget.id);
    if (act === 'logs') APM.go('logs', { endpoint: e.path });
    if (act === 'traces') APM.go('traces', { endpoint: e.path });
  });
};

APM.openDependencyDetail = function(host, op, rpm, p99, err) {
  APM.openModal({
    title: `外部依赖 · ${host}`,
    width: 540,
    body: `
      <div class="grid-4" style="margin-bottom:12px;">
        <div class="card kpi"><div class="name">RPM</div><div class="value">${rpm}</div></div>
        <div class="card kpi"><div class="name">错误率</div><div class="value" style="color:${err>0.5?'var(--danger)':err>0.1?'var(--warning)':'var(--text-1)'};">${err.toFixed(2)}%</div></div>
        <div class="card kpi"><div class="name">P99</div><div class="value">${p99}<span class="unit">ms</span></div></div>
        <div class="card kpi"><div class="name">超时</div><div class="value">3<span class="unit">s</span></div></div>
      </div>
      <div style="font-size:12.5px;color:var(--text-2);line-height:1.7;">
        <div><strong>Operation：</strong> ${op}</div>
        <div><strong>重试策略：</strong> 指数退避 max 3 次（base=200ms, factor=2）</div>
        <div><strong>熔断：</strong> resilience4j · 50% 失败率 / 10s 窗口 · half-open 5s</div>
        <div><strong>典型错误：</strong> ${err > 0.5 ? 'TimeoutException · 3s' : '无近期错误'}</div>
      </div>
    `,
    footer: `<button class="pill" data-act="close">关闭</button><button class="pill primary" data-act="traces">查看调用 trace</button>`
  }).el.addEventListener('click', (ev) => {
    const act = ev.target.dataset.act;
    if (!act) return;
    APM.closeModal(ev.currentTarget.id);
    if (act === 'traces') APM.go('traces', { external: host });
  });
};


APM.renderServiceDetail = function() {
  const id = (APM.pageParams && APM.pageParams.id) || 'checkout-service';
  const s = APM.services.find(x => x.id === id) || APM.services[1];
  const tab = APM.serviceTab || 'overview';
  const h = APM.health(s);
  const kafkaCount = (APM.kafkaProducers || []).filter(p => p.svc === id).length + (APM.kafkaConsumers || []).filter(c => c.svc === id).length;
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'traces', label: 'Traces' },
    { id: 'logs', label: 'Logs' },
    { id: 'endpoints', label: 'Endpoints', count: APM.endpoints.length },
    { id: 'db', label: 'DB Calls' },
    { id: 'kafka', label: 'Kafka', count: kafkaCount || null },
    { id: 'external', label: 'External' },
    { id: 'exceptions', label: 'Exceptions', count: 4 },
    { id: 'runtime', label: 'Runtime' },
    { id: 'infra', label: 'Infra' }
  ];

  const headerActiveAlerts = APM.alerts.filter(a => a.svc === s.id && a.state === 'firing');

  return `
    <div style="display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text-3); margin-bottom: 4px;">
      <a onclick="APM.go('overview')" style="cursor:pointer; color: var(--accent);">服务概览</a>
      <span>›</span>
      <span>${s.name}</span>
    </div>
    <div class="svc-detail-head">
      <span class="lang-ico" style="background: ${s.langColor};">${s.langText}</span>
      <div class="svc-meta">
        <div class="svc-name">${s.name} <span class="health-dot" style="display:inline-block; width:10px; height:10px; border-radius:50%; background: ${APM.healthColor(h)}; box-shadow: 0 0 0 3px color-mix(in srgb, ${APM.healthColor(h)} 25%, transparent); margin-left: 6px; vertical-align: middle;"></span></div>
        <div class="svc-sub">
          <span class="chip">${s.lang}</span>
          <span class="chip">${s.instances} 实例</span>
          <span class="chip">production</span>
          <span class="chip">otel-java-agent v1.32</span>
          <span class="chip">git: a82c1f</span>
        </div>
      </div>
      <div style="display:flex; gap:6px;">
        <button class="pill" onclick="APM.openSLOModal('${s.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>SLO</button>
        <button class="pill" onclick="APM.go('alerts',{svcFilter:'${s.id}'})"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>定位告警规则</button>
        <button class="pill primary" onclick="APM.go('traces',{svcFilter:'${s.id}'})"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path d="M3.6 9h16.8M3.6 15h16.8M11 3.05c-3 3.3-3 14.6 0 17.9M13 3.05c3 3.3 3 14.6 0 17.9"/></svg>查看 Trace</button>
      </div>
    </div>

    ${headerActiveAlerts.length > 0 ? `
      <div class="banner err" style="margin-top:14px;">
        <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div class="grow"><strong>${headerActiveAlerts.length} 条 firing 告警</strong> · ${headerActiveAlerts.map(a=>a.title).join('; ')}</div>
        <a onclick="APM.go('alerts')" style="cursor:pointer;">查看告警 →</a>
      </div>` : ''}

    <div class="subtabs">
      ${tabs.map(t => `<div class="subtab ${t.id===tab?'active':''}" onclick="APM.svcTab('${t.id}')">${t.label}${t.count?`<span class="pill-mini">${t.count}</span>`:''}</div>`).join('')}
    </div>

    <div id="svc-tab-body">
      ${APM.svcTabBody(s, tab)}
    </div>
  `;
};

APM.svcTab = function(tab) {
  APM.serviceTab = tab;
  APM.renderPage();
};

APM.svcTabBody = function(s, tab) {
  switch (tab) {
    case 'overview': return APM.svcOverview(s);
    case 'traces': return APM.svcTraces(s);
    case 'logs': return APM.svcLogs(s);
    case 'endpoints': return APM.svcEndpoints(s);
    case 'db': return APM.svcDB(s);
    case 'kafka': return APM.svcKafka(s);
    case 'external': return APM.svcExternal(s);
    case 'exceptions': return APM.svcExceptions(s);
    case 'runtime': return APM.svcRuntime(s);
    case 'infra': return APM.svcInfra(s);
    default: return APM.svcOverview(s);
  }
};

// ----- Overview tab: RED + golden signals -----
APM.svcOverview = function(s) {
  const series = (n, base, vary) => {
    const arr = [];
    for (let i = 0; i < n; i++) arr.push(base + Math.sin(i/4)*vary + Math.cos(i/2)*vary*0.4);
    return arr;
  };
  const lineChart = (vals, color, h, lblFmt) => {
    const w = 600; h = h || 130;
    const max = Math.max(...vals), min = Math.min(...vals);
    const range = max - min || 1;
    const step = w / (vals.length-1);
    const pts = vals.map((v,i)=>`${(i*step).toFixed(1)},${(h-((v-min)/range)*h*0.85-10).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none">
      <g stroke="var(--grid)"><line x1="0" y1="${h*0.25}" x2="${w}" y2="${h*0.25}"/><line x1="0" y1="${h*0.55}" x2="${w}" y2="${h*0.55}"/><line x1="0" y1="${h*0.85}" x2="${w}" y2="${h*0.85}"/></g>
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8"/>
    </svg>`;
  };
  const histogram = () => {
    const buckets = [{l:'0-50ms', v:38}, {l:'50-100',v:62}, {l:'100-200',v:84}, {l:'200-500',v:46}, {l:'500-1s',v:18}, {l:'1-2s',v:8}, {l:'2s+',v:3}];
    const max = Math.max(...buckets.map(b=>b.v));
    return `<div style="display:flex; gap: 4px; height: 110px; align-items: flex-end; padding: 8px 0;">
      ${buckets.map(b => `<div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:4px;">
        <div style="font-size:10px; font-family:var(--mono); color: var(--text-3);">${b.v}</div>
        <div style="width:80%; height:${b.v/max*78}px; background: linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 50%, transparent)); border-radius: 3px 3px 0 0;"></div>
        <div style="font-size:10px; color: var(--text-3);">${b.l}</div>
      </div>`).join('')}
    </div>`;
  };

  return `
    <div class="grid-6">
      <div class="card kpi"><div class="name">RPM</div><div class="value">${s.rpm}</div><div class="delta up">▲ 4%</div></div>
      <div class="card kpi"><div class="name">错误率</div><div class="value" style="color:${s.errPct>1?'var(--danger)':s.errPct>0.3?'var(--warning)':'var(--text-1)'}">${s.errPct}<span class="unit">%</span></div><div class="delta up">▲ 0.12%</div></div>
      <div class="card kpi"><div class="name">P50</div><div class="value">${Math.floor(s.p99*0.18)}<span class="unit">ms</span></div><div class="delta flat">— 稳定</div></div>
      <div class="card kpi"><div class="name">P95</div><div class="value">${Math.floor(s.p99*0.55)}<span class="unit">ms</span></div><div class="delta up">▲ 8%</div></div>
      <div class="card kpi"><div class="name">P99</div><div class="value" style="color:${s.p99>800?'var(--danger)':s.p99>300?'var(--warning)':'var(--text-1)'}">${s.p99}<span class="unit">ms</span></div><div class="delta up">▲ 12%</div></div>
      <div class="card kpi"><div class="name">Apdex</div><div class="value">${s.apdex}</div><div class="delta down">▼ 0.02</div></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title"><span>请求速率 <span class="hint">RPM</span></span><span class="hint">RED · Rate</span></div>
        ${lineChart(series(60, 80, 12), 'var(--accent)', 150)}
      </div>
      <div class="card">
        <div class="card-title"><span>错误率 (5xx + 4xx)</span><span class="hint">RED · Errors</span></div>
        ${lineChart(series(60, 0.4, 0.2).map(v=>Math.max(0,v)), 'var(--warning)', 150)}
      </div>
    </div>

    <div class="grid-2-eq">
      <div class="card">
        <div class="card-title"><span>延迟分布 (P50 / P95 / P99)</span><span class="hint">RED · Duration</span></div>
        <svg viewBox="0 0 600 150" width="100%" height="150" preserveAspectRatio="none">
          <g stroke="var(--grid)"><line x1="0" y1="38" x2="600" y2="38"/><line x1="0" y1="80" x2="600" y2="80"/><line x1="0" y1="120" x2="600" y2="120"/></g>
          <polyline points="${series(60, 30, 6).map((v,i)=>`${i*10},${130-v}`).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="1.5"/>
          <polyline points="${series(60, 60, 14).map((v,i)=>`${i*10},${130-v}`).join(' ')}" fill="none" stroke="var(--warning)" stroke-width="1.5"/>
          <polyline points="${series(60, 90, 26).map((v,i)=>`${i*10},${130-v*0.9}`).join(' ')}" fill="none" stroke="var(--danger)" stroke-width="1.8"/>
        </svg>
        <div style="display:flex; gap:14px; font-size:11.5px; color:var(--text-2);">
          <span><span style="display:inline-block;width:10px;height:3px;background:var(--accent);margin-right:4px;vertical-align:middle;"></span>P50 ${Math.floor(s.p99*0.18)} ms</span>
          <span><span style="display:inline-block;width:10px;height:3px;background:var(--warning);margin-right:4px;vertical-align:middle;"></span>P95 ${Math.floor(s.p99*0.55)} ms</span>
          <span><span style="display:inline-block;width:10px;height:3px;background:var(--danger);margin-right:4px;vertical-align:middle;"></span>P99 ${s.p99} ms</span>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span>延迟直方图</span><span class="hint">heatmap distribution</span></div>
        ${histogram()}
      </div>
    </div>

    <div class="section-h"><h3>关键端点</h3><a onclick="APM.svcTab('endpoints')" style="cursor:pointer; color:var(--accent); font-size:12.5px;">查看全部 →</a></div>
    <div class="card" style="padding: 0;">
      <table class="tbl">
        <thead><tr><th style="padding-left:14px;">Endpoint</th><th>RPM</th><th>Err %</th><th>P95</th><th>P99</th><th>Apdex</th></tr></thead>
        <tbody>
          ${APM.endpoints.slice(0,4).map(e => `<tr class="clickable" onclick="APM.openEndpointDetail('${e.path}')">
            <td style="padding-left:14px;"><span class="api-method ${e.method.toLowerCase().replace('delete','del')}">${e.method}</span><span class="mono">${e.path}</span></td>
            <td class="mono">${e.rpm}</td>
            <td class="mono ${e.errPct>1?'':''}" style="color:${e.errPct>1?'var(--danger)':e.errPct>0.3?'var(--warning)':'inherit'};">${e.errPct.toFixed(2)}%</td>
            <td class="mono">${e.p95}ms</td>
            <td class="mono">${e.p99}ms</td>
            <td><div class="apdex-bar"><span style="width:${e.apdex*100}%; background:${e.apdex>0.94?'var(--success)':e.apdex>0.85?'var(--warning)':'var(--danger)'};"></span></div><span class="mono" style="margin-left:4px; font-size:11px;">${e.apdex}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <div class="grid-2-eq">
      <div class="card">
        <div class="card-title"><span>实例分布</span><span class="hint">${s.instances} 实例</span></div>
        <table class="tbl">
          <thead><tr><th>Instance</th><th>CPU</th><th>Mem</th><th>RPM</th><th>P99</th><th>Status</th></tr></thead>
          <tbody>
            ${Array.from({length: s.instances}).map((_,i) => `<tr>
              <td class="mono">${s.id}-${i+1}</td>
              <td class="mono">${(40+i*8)}%</td>
              <td class="mono">${(56+i*4)}%</td>
              <td class="mono">${Math.floor(s.rpm/s.instances)}</td>
              <td class="mono">${s.p99 + i*8}ms</td>
              <td><span class="badge ok">● running</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="card">
        <div class="card-title"><span>下游依赖</span><span class="hint">最近 1h 调用</span></div>
        <div style="display:flex; flex-direction:column; gap: 10px; margin-top: 4px;">
          ${[
            {name:'mysql · order_db', kind:'database', rpm:842, p99:120, err:0.2, color:'#ffcc00'},
            {name:'redis · cache', kind:'cache', rpm:1820, p99:8, err:0, color:'#dc382d'},
            {name:'kafka · order-events', kind:'mq', rpm:480, p99:24, err:0, color:'#231f20'},
            {name:'risk-service', kind:'service', rpm:380, p99:820, err:0.3, color:'var(--accent)'},
            {name:'stripe.api', kind:'external', rpm:120, p99:760, err:0.8, color:'var(--purple)'}
          ].map(d => `
            <div style="display:flex; align-items:center; gap: 10px;">
              <div style="width:6px; height: 28px; border-radius:3px; background:${d.color};"></div>
              <div style="flex:1; min-width:0;">
                <div style="font-size: 13px; font-weight: 600;">${d.name}</div>
                <div style="font-size: 11px; color:var(--text-3); font-family:var(--mono);">${d.kind} · ${d.rpm} rpm · P99 ${d.p99}ms</div>
              </div>
              <span class="badge ${d.err>0.5?'err':d.err>0.1?'warn':'ok'}">${d.err.toFixed(2)}%</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
};

// ---- Other svc tabs: thin shells delegating to existing pages or quick views ----
APM.svcTraces = function(s) {
  return `<div class="banner info">
    <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    <div class="grow">Traces 已自动按 <strong>service.name = ${s.id}</strong> 过滤</div>
    <a onclick="APM.go('traces',{svc:'${s.id}'})">在 Traces 页打开 →</a>
  </div>${APM.tracesBody(s.id, true)}`;
};

APM.svcLogs = function(s) {
  return `<div class="banner info">
    <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    <div class="grow">Logs 已自动按 <strong>service = ${s.id}</strong> 过滤</div>
    <a onclick="APM.go('logs',{svc:'${s.id}'})">在 Logs 页打开 →</a>
  </div>${APM.logsBody(s.id, true)}`;
};

APM.svcEndpoints = function(s) {
  const f = (APM.endpointFilter || '').toLowerCase();
  const list = APM.endpoints.filter(e => !f || e.path.toLowerCase().includes(f) || e.method.toLowerCase().includes(f));
  return `<div class="card" style="padding:0;">
    <div style="padding: 14px 16px; border-bottom: 1px solid var(--border);" class="between">
      <div>
        <div style="font-weight:600; font-size: 14px;">${f ? list.length + ' / ' + APM.endpoints.length : APM.endpoints.length} 个端点</div>
        <div style="color:var(--text-3); font-size: 12px; margin-top: 2px;">按 RPM 排序</div>
      </div>
      <div class="searchbox" style="padding: 6px 10px; min-width: 220px;">${APM.svgI.search}<input placeholder="按路径筛选…" value="${f.replace(/"/g,'&quot;')}" data-focus-key="ep-filter" oninput="APM.bindRetainedInput(event,'ep-filter',APM.setEndpointFilter)"></div>
    </div>
    ${list.length === 0 ? `<div class="placeholder" style="margin: 24px;"><div class="icon">🔍</div>未匹配到端点 · <a class="link" onclick="APM.setEndpointFilter('')">清除筛选</a></div>` : `<table class="tbl">
      <thead><tr><th style="padding-left:14px;">Endpoint</th><th>RPM</th><th>Err %</th><th>P50</th><th>P95</th><th>P99</th><th>Apdex</th><th></th></tr></thead>
      <tbody>
        ${list.map(e => `<tr class="clickable" onclick="APM.openEndpointDetail('${e.path}')">
          <td style="padding-left:14px;"><span class="api-method ${e.method.toLowerCase().replace('delete','del')}">${e.method}</span><span class="mono">${e.path}</span></td>
          <td class="mono">${e.rpm}</td>
          <td class="mono" style="color:${e.errPct>1?'var(--danger)':e.errPct>0.3?'var(--warning)':'inherit'};">${e.errPct.toFixed(2)}%</td>
          <td class="mono">${e.p50}ms</td>
          <td class="mono">${e.p95}ms</td>
          <td class="mono">${e.p99}ms</td>
          <td><div class="apdex-bar"><span style="width:${e.apdex*100}%; background:${e.apdex>0.94?'var(--success)':e.apdex>0.85?'var(--warning)':'var(--danger)'};"></span></div><span class="mono" style="margin-left:4px; font-size:11px;">${e.apdex}</span></td>
          <td><a style="color:var(--accent); cursor:pointer; font-size:11.5px;" onclick="event.stopPropagation();APM.go('traces',{endpoint:'${e.path}'})">Trace →</a></td>
        </tr>`).join('')}
      </tbody>
    </table>`}
  </div>`;
};

APM.svcDB = function(s) {
  // Slow queries that originate from this service (mock SQL templates are tagged by svc).
  const queries = APM.slowQueries.filter(q => q.svc === s.id);
  // Connection pool entry for this service (if any).
  const pool = (APM.connectionPools || []).find(p => p.svc === s.id);
  // Transactions for this service.
  const txs = (APM.transactions || []).filter(t => t.svc === s.id);
  // Redis ops by this service.
  const redis = (APM.redisOps || []).filter(r => r.svc === s.id);
  return `
    <div class="banner info">
      <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <div class="grow">展示 <strong>${s.name}</strong> 出口的 SQL / Redis 调用 · 已自动按 service.name 过滤</div>
      <a onclick="APM.go('database')" style="cursor:pointer;">在 DB Calls 页打开 →</a>
    </div>

    <div class="grid-4" style="margin-top:14px;">
      <div class="card kpi"><div class="name">SQL 模板</div><div class="value">${queries.length}<span class="unit"> 个</span></div><div class="delta flat">${s.id} 出口</div></div>
      <div class="card kpi"><div class="name">总执行</div><div class="value">${queries.reduce((a,b)=>a+b.count,0).toLocaleString()}</div><div class="delta flat">最近 1h</div></div>
      <div class="card kpi"><div class="name">慢查询 (>500ms)</div><div class="value" style="color:var(--warning);">${queries.filter(q => q.p99 > 500).length}</div><div class="delta flat">P99 阈值</div></div>
      <div class="card kpi"><div class="name">连接池等待</div><div class="value" style="color:${pool && pool.pending>0?'var(--danger)':'var(--text-2)'};">${pool ? pool.pending : 0}<span class="unit"> req</span></div><div class="delta flat">${pool ? pool.pool : '无连接池数据'}</div></div>
    </div>

    <div class="section-h" style="margin-top:14px;"><h3>慢 SQL 模板</h3><a onclick="APM.go('database')" style="cursor:pointer;color:var(--accent);font-size:12.5px;">查看全部 →</a></div>
    ${queries.length === 0 ? `<div class="placeholder"><div class="icon">✓</div>该服务暂无显著慢 SQL</div>` : `<div class="card" style="padding:0;overflow:hidden;">
      <table class="tbl">
        <thead><tr><th style="padding-left:14px;width:50%;">SQL 模板</th><th>次数</th><th>avg</th><th>P99</th><th>行数</th><th></th></tr></thead>
        <tbody>${queries.map(q => {
          const i = APM.slowQueries.indexOf(q);
          return `<tr class="clickable" onclick="APM.openExplain(${i})">
          <td style="padding-left:14px;"><pre class="mono" style="margin:0;font-size:12px;white-space:pre-wrap;line-height:1.5;">${q.sql}</pre></td>
          <td class="mono">${q.count.toLocaleString()}</td>
          <td class="mono">${q.avg}<span style="color:var(--text-3);">ms</span></td>
          <td class="mono ${q.p99>500?'err':q.p99>200?'warn':''}" style="font-weight:600;">${q.p99}<span style="color:var(--text-3);font-weight:400;">ms</span></td>
          <td class="mono" style="color:var(--text-3);">${q.rows}</td>
          <td style="text-align:right;padding-right:14px;"><button class="pill" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();APM.openExplain(${i})">EXPLAIN</button></td>
        </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`}

    ${pool ? `<div class="card" style="margin-top:14px;">
      <div class="card-title"><span>连接池 · ${pool.pool}</span><span class="hint">最近 1h</span></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;font-size:12.5px;">
        <div><div style="color:var(--text-3);font-size:11px;">Active</div><div style="font-size:20px;font-weight:600;">${pool.active}</div></div>
        <div><div style="color:var(--text-3);font-size:11px;">Idle</div><div style="font-size:20px;font-weight:600;">${pool.idle}</div></div>
        <div><div style="color:var(--text-3);font-size:11px;">Pending</div><div style="font-size:20px;font-weight:600;color:${pool.pending>0?'var(--danger)':'var(--text-2)'};">${pool.pending}</div></div>
        <div><div style="color:var(--text-3);font-size:11px;">Max / Wait P95</div><div style="font-size:20px;font-weight:600;">${pool.max}<span style="font-size:12px;color:var(--text-3);font-weight:400;"> · ${pool.waitMs}ms</span></div></div>
      </div>
      <div class="bar" style="margin-top:10px;height:6px;"><span style="width:${(pool.active/pool.max)*100}%;background:${pool.state==='warn'?'var(--warning)':'var(--accent)'};"></span></div>
    </div>` : ''}

    ${txs.length ? `<div class="card" style="margin-top:14px;padding:0;">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-weight:600;">事务 · ${txs.length} 个</div>
      <table class="tbl">
        <thead><tr><th style="padding-left:14px;">事务</th><th>调用</th><th>P99</th><th>提交率</th><th>回滚率</th></tr></thead>
        <tbody>${txs.map(t => `<tr class="clickable" onclick="APM.openTxDetail('${t.name}','${s.id}',${t.count},${Math.round(t.count*(parseFloat(t.rollbackPct)/100))},${t.avgMs*3},${parseFloat(t.commitPct)})">
          <td class="mono" style="padding-left:14px;font-weight:600;">${t.name}</td>
          <td class="mono">${t.count}</td>
          <td class="mono">${t.avgMs*3}ms</td>
          <td class="mono">${t.commitPct}</td>
          <td class="mono" style="color:${parseFloat(t.rollbackPct)>1?'var(--warning)':'inherit'};">${t.rollbackPct}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>` : ''}

    ${redis.length ? `<div class="card" style="margin-top:14px;padding:0;">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-weight:600;">Redis 操作 · ${redis.length} 个</div>
      <table class="tbl">
        <thead><tr><th style="padding-left:14px;">命令</th><th>QPS</th><th>P99</th><th>命中率</th></tr></thead>
        <tbody>${redis.map(r => `<tr>
          <td class="mono" style="padding-left:14px;">${r.cmd}</td>
          <td class="mono">${r.count.toLocaleString()}</td>
          <td class="mono">${r.p99Ms}ms</td>
          <td class="mono" style="color:var(--text-3);">${r.hitPct}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>` : ''}
  `;
};

APM.svcKafka = function(s) {
  const producers = (APM.kafkaProducers || []).filter(p => p.svc === s.id);
  const consumers = (APM.kafkaConsumers || []).filter(c => c.svc === s.id);
  if (producers.length === 0 && consumers.length === 0) {
    return `<div class="placeholder" style="margin-top:14px;"><div class="icon">📭</div>该服务最近 1 小时无 Kafka producer / consumer 调用</div>`;
  }
  const producedRate = producers.reduce((a,b)=>a+b.rate, 0);
  const consumedRate = consumers.reduce((a,b)=>a+b.rate, 0);
  const totalLag = consumers.reduce((a,b)=>a+b.lag, 0);
  return `
    <div class="banner info">
      <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <div class="grow">展示 <strong>${s.name}</strong> 的 Kafka 调用 · ${producers.length} 个 publish 关系 · ${consumers.length} 个 subscribe 关系</div>
      <a onclick="APM.go('kafka')" style="cursor:pointer;">在 Kafka 页打开 →</a>
    </div>

    <div class="grid-4" style="margin-top:14px;">
      <div class="card kpi"><div class="name">Publish 速率</div><div class="value">${producedRate.toLocaleString()}<span class="unit"> msg/s</span></div><div class="delta flat">${producers.length} topic</div></div>
      <div class="card kpi"><div class="name">Consume 速率</div><div class="value">${consumedRate.toLocaleString()}<span class="unit"> msg/s</span></div><div class="delta flat">${consumers.length} topic</div></div>
      <div class="card kpi"><div class="name">Consumer Lag</div><div class="value" style="color:${APM.lagBadgeColor(totalLag)};">${totalLag.toLocaleString()}</div><div class="delta flat">${totalLag > 10000 ? '严重' : totalLag > 1000 ? '上升中' : '健康'}</div></div>
      <div class="card kpi"><div class="name">Publish 失败率</div><div class="value">${producers.length === 0 ? '—' : (producers.reduce((a,b)=>a+b.errPct, 0)/producers.length).toFixed(2) + '%'}</div><div class="delta flat">avg across topics</div></div>
    </div>

    ${producers.length ? `<div class="section-h" style="margin-top:14px;"><h3>Publish · ${producers.length} topic</h3></div>
    <div class="card" style="padding:0;overflow:hidden;">
      <table class="tbl">
        <thead><tr><th style="padding-left:14px;">Topic</th><th>速率</th><th>错误率</th><th>P99 publish</th><th></th></tr></thead>
        <tbody>${producers.map(p => `<tr class="clickable" onclick="APM.openKafkaTopicDetail('${p.topic}')">
          <td style="padding-left:14px;"><strong>${p.topic}</strong></td>
          <td class="mono">${p.rate} msg/s</td>
          <td class="mono" style="color:${p.errPct>0.1?'var(--warning)':'var(--text-2)'};">${p.errPct.toFixed(2)}%</td>
          <td class="mono ${p.p99PubMs>20?'warn':''}">${p.p99PubMs}ms</td>
          <td style="text-align:right;padding-right:14px;"><button class="pill" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();APM.go('traces',{svcFilter:'${s.id}',topic:'${p.topic}'})">Traces</button></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>` : ''}

    ${consumers.length ? `<div class="section-h" style="margin-top:14px;"><h3>Consume · ${consumers.length} topic</h3></div>
    <div class="card" style="padding:0;overflow:hidden;">
      <table class="tbl">
        <thead><tr><th style="padding-left:14px;">Topic</th><th>Group</th><th>速率</th><th>P99 consume</th><th>Lag</th><th></th></tr></thead>
        <tbody>${consumers.map(c => `<tr class="clickable" onclick="APM.openKafkaTopicDetail('${c.topic}')">
          <td style="padding-left:14px;"><strong>${c.topic}</strong></td>
          <td><span class="chip" style="cursor:pointer;" onclick="event.stopPropagation();APM.openKafkaGroupDetail('${c.group}')">${c.group}</span></td>
          <td class="mono">${c.rate} msg/s</td>
          <td class="mono ${c.p99ConMs>50?'warn':''}">${c.p99ConMs}ms</td>
          <td><span class="badge" style="background:color-mix(in srgb, ${APM.lagBadgeColor(c.lag)} 18%, transparent);color:${APM.lagBadgeColor(c.lag)};font-family:var(--mono);">${c.lag.toLocaleString()}</span></td>
          <td style="text-align:right;padding-right:14px;"><button class="pill" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();APM.openKafkaGroupDetail('${c.group}')">Group 详情</button></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>` : ''}
  `;
};

APM.svcExternal = function(s) {
  const ext = [
    { host: 'api.stripe.com', op: 'POST /v1/charges', rpm: 120, p99: 760, err: 0.8 },
    { host: 'api.stripe.com', op: 'POST /v1/refunds', rpm: 18, p99: 540, err: 0 },
    { host: 'risk.eshop.com', op: 'POST /risk/score', rpm: 380, p99: 820, err: 0.3 },
    { host: 'idempotency.eshop.com', op: 'GET /key/:k', rpm: 240, p99: 18, err: 0 },
    { host: 'sms.tencentcloud.com', op: 'POST /sendsms', rpm: 32, p99: 420, err: 0.2 }
  ];
  return `<div class="card" style="padding:0;">
    <div style="padding: 14px 16px; border-bottom: 1px solid var(--border); font-weight: 600;">外部依赖调用 · ${ext.length} 个 host</div>
    <table class="tbl">
      <thead><tr><th style="padding-left:14px;">Host</th><th>Operation</th><th>RPM</th><th>Err %</th><th>P99</th></tr></thead>
      <tbody>
        ${ext.map(e => `<tr class="clickable" onclick="APM.openDependencyDetail('${e.host}','${e.op.replace(/'/g,"\\'")}',${e.rpm},${e.p99},${e.err})">
          <td style="padding-left:14px;"><span class="mono">${e.host}</span></td>
          <td class="mono">${e.op}</td>
          <td class="mono">${e.rpm}</td>
          <td class="mono" style="color:${e.err>0.5?'var(--danger)':e.err>0.1?'var(--warning)':'inherit'};">${e.err.toFixed(2)}%</td>
          <td class="mono">${e.p99}ms</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
};

APM.svcExceptions = function(s) {
  const list = APM.exceptions.filter(e => e.svc === s.id);
  const total = list.reduce((a,b)=>a+b.count, 0);
  return `
    <div class="banner info">
      <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <div class="grow">展示 <strong>${s.name}</strong> 抛出的异常 · 已自动按 service.name 过滤</div>
      <a onclick="APM.go('exceptions',{svcFilter:'${s.id}'})" style="cursor:pointer;">在 Exceptions 页打开 →</a>
    </div>

    <div class="grid-4" style="margin-top:14px;">
      <div class="card kpi"><div class="name">异常总数</div><div class="value">${total}</div><div class="delta flat">最近 1h</div></div>
      <div class="card kpi"><div class="name">异常类型</div><div class="value">${list.length}</div><div class="delta flat">${list.length === 0 ? '无异常 · 健康' : '聚合'}</div></div>
      <div class="card kpi"><div class="name">关联 Trace</div><div class="value">${list.reduce((a,b)=>a+b.traces,0)}</div><div class="delta flat">100% 有上下文</div></div>
      <div class="card kpi"><div class="name">最近异常</div><div class="value" style="font-size:14px;">${list[0] ? list[0].last : '—'}</div><div class="delta flat">${list[0] ? list[0].type.split(/(?=[A-Z])/).slice(0,2).join('') : ''}</div></div>
    </div>

    ${list.length === 0 ? `<div class="placeholder" style="margin-top:14px;"><div class="icon">✓</div>该服务最近 1 小时未抛出异常</div>` : `<div class="card" style="padding:0;overflow:hidden;margin-top:14px;">
      <table class="tbl">
        <thead><tr>
          <th style="padding-left:14px;width:48%;">异常 / 消息</th>
          <th style="width:80px;">次数</th>
          <th style="width:90px;">变化</th>
          <th style="width:90px;">首次</th>
          <th style="width:90px;">最近</th>
          <th style="width:160px;text-align:right;">操作</th>
        </tr></thead>
        <tbody>${list.map(e => {
          const dColor = e.delta.startsWith('+') ? 'var(--danger)' : e.delta.startsWith('-') ? 'var(--success)' : 'var(--text-3)';
          return `<tr class="clickable" onclick="APM.openExceptionStack('${e.type}','${e.svc}')">
            <td style="padding-left:14px;">
              <div style="font-family:var(--mono);font-weight:700;color:var(--danger);font-size:12.5px;">${e.type}</div>
              <div style="font-size:12px;color:var(--text-2);margin-top:3px;font-family:var(--mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:520px;">${e.msg}</div>
            </td>
            <td class="mono" style="font-weight:600;">${e.count}</td>
            <td style="color:${dColor};font-weight:600;font-family:var(--mono);">${e.delta}</td>
            <td class="mono" style="color:var(--text-3);">${e.first}</td>
            <td class="mono" style="color:var(--text-3);">${e.last}</td>
            <td style="text-align:right;padding-right:14px;">
              <button class="pill" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();APM.openExceptionStack('${e.type}','${e.svc}')">堆栈</button>
              <button class="pill" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();APM.go('traces',{svcFilter:'${e.svc}',error:'${e.type}'})">Traces</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`}
  `;
};

APM.svcRuntime = function(s) {
  // condensed JVM/Go runtime panel based on language
  if (s.lang === 'Java') return APM.runtimeJVM(s);
  if (s.lang === 'Go') return APM.runtimeGo(s);
  if (s.lang === 'Node.js') return APM.runtimeNode(s);
  if (s.lang === 'Python') return APM.runtimePython(s);
  return `<div class="placeholder"><div class="icon">💡</div>该语言运行时面板正在开发中</div>`;
};

APM.runtimeJVM = function(s) {
  return `
    <div class="grid-6">
      <div class="card kpi"><div class="name">Heap 使用</div><div class="value">1,268<span class="unit"> MB</span></div><div class="delta up">▲ 62%</div></div>
      <div class="card kpi"><div class="name">Old Gen</div><div class="value">812<span class="unit"> MB</span></div><div class="delta up">▲ 58%</div></div>
      <div class="card kpi"><div class="name">Young GC</div><div class="value">42<span class="unit"> /min</span></div><div class="delta down">▼ 8%</div></div>
      <div class="card kpi"><div class="name">Full GC</div><div class="value">0<span class="unit"> /h</span></div><div class="delta flat">— 稳定</div></div>
      <div class="card kpi"><div class="name">线程数</div><div class="value">186</div><div class="delta up">▲ 4%</div></div>
      <div class="card kpi"><div class="name">CPU</div><div class="value">68<span class="unit">%</span></div><div class="delta up">▲ 5%</div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-title"><span>堆内存分代 <span class="hint">Eden / Survivor / Old</span></span><span class="hint">G1GC</span></div>
        <svg viewBox="0 0 620 200" width="100%" height="200">
          <g stroke="var(--grid)"><line x1="30" y1="40" x2="620" y2="40"/><line x1="30" y1="100" x2="620" y2="100"/><line x1="30" y1="160" x2="620" y2="160"/></g>
          <defs><linearGradient id="gOldS" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--purple)" stop-opacity=".5"/><stop offset="1" stop-color="var(--purple)" stop-opacity=".05"/></linearGradient></defs>
          <path d="M30 130 L70 128 L110 124 L150 122 L190 118 L230 116 L270 112 L310 110 L350 108 L390 104 L430 102 L470 98 L520 96 L560 94 L620 90 L620 200 L30 200 Z" fill="url(#gOldS)" stroke="var(--purple)" stroke-width="1.4"/>
          <path d="M30 60 L50 40 L70 110 L90 50 L110 116 L130 48 L150 108 L170 46 L190 110 L210 44 L230 102 L250 42 L270 96 L290 40 L310 92 L330 38 L350 88 L370 36 L390 84 L410 34 L430 80 L450 32 L470 76 L490 30 L510 72 L540 28 L560 68 L590 26 L620 64" fill="none" stroke="var(--accent)" stroke-width="1.4"/>
          <line x1="30" y1="20" x2="620" y2="20" stroke="var(--danger)" stroke-width="1" stroke-dasharray="3 3"/>
          <text x="560" y="16" fill="var(--danger)" font-size="10" font-family="SF Mono">-Xmx 2GB</text>
        </svg>
      </div>
      <div class="card">
        <div class="card-title"><span>GC 活动 <span class="hint">次数 & 暂停</span></span></div>
        <svg viewBox="0 0 520 200" width="100%" height="200">
          <g stroke="var(--grid)"><line x1="30" y1="40" x2="520" y2="40"/><line x1="30" y1="100" x2="520" y2="100"/><line x1="30" y1="160" x2="520" y2="160"/></g>
          <g fill="var(--accent)" opacity=".75">
            ${Array.from({length:22}).map((_,i)=>`<rect x="${36+i*22}" y="${100-Math.random()*30-30}" width="10" height="${60+Math.random()*30}"/>`).join('')}
          </g>
          <path d="M30 170 L52 168 L74 166 L96 168 L118 164 L140 166 L162 162 L184 164 L206 160 L228 162 L250 158 L272 160 L294 158 L316 156 L338 154 L360 156 L382 152 L404 154 L426 150 L448 152 L470 148 L492 150 L514 146" fill="none" stroke="var(--warning)" stroke-width="1.6"/>
        </svg>
      </div>
    </div>
    <div class="grid-3">
      <div class="card">
        <div class="card-title"><span>线程状态</span><span class="hint">186 total</span></div>
        <div style="display:flex; flex-direction:column; gap:6px; margin-top:8px; font-size:12.5px;">
          <div class="between"><span><span style="display:inline-block;width:8px;height:8px;background:var(--success);border-radius:2px;margin-right:6px;vertical-align:middle;"></span>Runnable</span><span class="mono">82</span></div>
          <div class="between"><span><span style="display:inline-block;width:8px;height:8px;background:var(--accent);border-radius:2px;margin-right:6px;vertical-align:middle;"></span>Waiting</span><span class="mono">56</span></div>
          <div class="between"><span><span style="display:inline-block;width:8px;height:8px;background:var(--warning);border-radius:2px;margin-right:6px;vertical-align:middle;"></span>Timed-Wait</span><span class="mono">42</span></div>
          <div class="between"><span><span style="display:inline-block;width:8px;height:8px;background:var(--danger);border-radius:2px;margin-right:6px;vertical-align:middle;"></span>Blocked</span><span class="mono">6</span></div>
          <div class="between" style="color:var(--text-3);"><span>Deadlock</span><span class="mono" style="color:var(--success);">0</span></div>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span>HikariCP 连接池</span><span class="hint">jdbc</span></div>
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-top:6px;">
          <div><div style="font-size:11px; color:var(--text-3);">Active</div><div style="font-size:18px; font-weight:700;">18</div></div>
          <div><div style="font-size:11px; color:var(--text-3);">Idle</div><div style="font-size:18px; font-weight:700;">6</div></div>
          <div><div style="font-size:11px; color:var(--text-3);">Pending</div><div style="font-size:18px; font-weight:700; color:var(--warning);">2</div></div>
          <div><div style="font-size:11px; color:var(--text-3);">Max</div><div style="font-size:18px; font-weight:700; color:var(--text-3);">30</div></div>
        </div>
        <div class="bar" style="margin-top:10px; height:8px;"><span style="width:60%; background: var(--warning);"></span></div>
        <div style="color:var(--text-3); font-size:11.5px; margin-top:6px;">使用率 60% · 获取连接 P95 12ms</div>
      </div>
      <div class="card">
        <div class="card-title"><span>Tomcat http-nio 线程池</span></div>
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-top:6px;">
          <div><div style="font-size:11px; color:var(--text-3);">Active</div><div style="font-size:18px; font-weight:700;">126</div></div>
          <div><div style="font-size:11px; color:var(--text-3);">Idle</div><div style="font-size:18px; font-weight:700;">74</div></div>
          <div><div style="font-size:11px; color:var(--text-3);">Queue</div><div style="font-size:18px; font-weight:700;">0</div></div>
          <div><div style="font-size:11px; color:var(--text-3);">Max</div><div style="font-size:18px; font-weight:700; color:var(--text-3);">200</div></div>
        </div>
        <div class="bar" style="margin-top:10px; height:8px;"><span style="width:63%; background: var(--accent);"></span></div>
        <div style="color:var(--text-3); font-size:11.5px; margin-top:6px;">使用率 63% · 拒绝任务 0</div>
      </div>
    </div>
  `;
};

APM.runtimeGo = function(s) {
  return `
    <div class="grid-6">
      <div class="card kpi"><div class="name">Goroutines</div><div class="value">1,842</div><div class="delta up">▲ 12%</div></div>
      <div class="card kpi"><div class="name">Heap Alloc</div><div class="value">286<span class="unit"> MB</span></div><div class="delta up">▲ 4%</div></div>
      <div class="card kpi"><div class="name">Heap Sys</div><div class="value">420<span class="unit"> MB</span></div><div class="delta flat">— 稳定</div></div>
      <div class="card kpi"><div class="name">GC 暂停</div><div class="value">0.82<span class="unit"> ms</span></div><div class="delta down">▼ 6%</div></div>
      <div class="card kpi"><div class="name">GC 频率</div><div class="value">2.4<span class="unit"> /s</span></div><div class="delta up">▲ 3%</div></div>
      <div class="card kpi"><div class="name">CPU</div><div class="value">54<span class="unit">%</span></div><div class="delta up">▲ 2%</div></div>
    </div>
    <div class="card" style="margin-top:12px;">
      <div class="card-title"><span>pprof 采样 Top Functions</span><span class="hint">近 30s · CPU</span></div>
      <table class="tbl">
        <thead><tr><th style="padding-left:4px;">Function</th><th>Package</th><th>Flat</th><th>Cum</th></tr></thead>
        <tbody>
          <tr><td class="mono" style="padding-left:4px;">(*Encoder).encodeValue</td><td>encoding/json</td><td class="mono">180ms · 18.2%</td><td class="mono">220ms · 22.1%</td></tr>
          <tr><td class="mono" style="padding-left:4px;">runtime.mallocgc</td><td>runtime</td><td class="mono">142ms · 14.3%</td><td class="mono">210ms · 21.2%</td></tr>
          <tr><td class="mono" style="padding-left:4px;">(*Conn).readRequest</td><td>net/http</td><td class="mono">96ms · 9.6%</td><td class="mono">184ms · 18.5%</td></tr>
          <tr><td class="mono" style="padding-left:4px;">risk.scoreModel</td><td>risk/service</td><td class="mono">72ms · 7.2%</td><td class="mono">148ms · 14.9%</td></tr>
          <tr><td class="mono" style="padding-left:4px;">runtime.scanobject</td><td>runtime</td><td class="mono">58ms · 5.8%</td><td class="mono">58ms · 5.8%</td></tr>
        </tbody>
      </table>
    </div>
  `;
};

APM.runtimeNode = function(s) {
  return `<div class="grid-6">
    <div class="card kpi"><div class="name">Event Loop Lag</div><div class="value">8.2<span class="unit"> ms</span></div><div class="delta up">▲ 12%</div></div>
    <div class="card kpi"><div class="name">Heap Used</div><div class="value">186<span class="unit"> MB</span></div><div class="delta up">▲ 4%</div></div>
    <div class="card kpi"><div class="name">RSS</div><div class="value">312<span class="unit"> MB</span></div><div class="delta flat">— 稳定</div></div>
    <div class="card kpi"><div class="name">Handles</div><div class="value">284</div><div class="delta up">▲ 6%</div></div>
    <div class="card kpi"><div class="name">Active Req</div><div class="value">12</div><div class="delta flat">— 空闲</div></div>
    <div class="card kpi"><div class="name">CPU</div><div class="value">42<span class="unit">%</span></div><div class="delta down">▼ 3%</div></div>
  </div>`;
};

APM.runtimePython = function(s) {
  return `<div class="grid-6">
    <div class="card kpi"><div class="name">Process RSS</div><div class="value">420<span class="unit"> MB</span></div><div class="delta up">▲ 6%</div></div>
    <div class="card kpi"><div class="name">GC Gen 0</div><div class="value">1.2k<span class="unit"> /min</span></div><div class="delta up">▲ 4%</div></div>
    <div class="card kpi"><div class="name">GC Gen 2</div><div class="value">4<span class="unit"> /min</span></div><div class="delta flat">— 稳定</div></div>
    <div class="card kpi"><div class="name">Objects</div><div class="value">82k</div><div class="delta up">▲ 2%</div></div>
    <div class="card kpi"><div class="name">GIL Wait</div><div class="value">18<span class="unit">%</span></div><div class="delta up">▲ 3%</div></div>
    <div class="card kpi"><div class="name">CPU</div><div class="value">36<span class="unit">%</span></div><div class="delta down">▼ 2%</div></div>
  </div>`;
};

APM.svcInfra = function(s) {
  return `<div class="grid-3">
    <div class="card">
      <div class="card-title"><span>K8s Pods</span><span class="hint">ns: eshop</span></div>
      <table class="tbl">
        <thead><tr><th style="padding-left:4px;">Pod</th><th>Node</th><th>Status</th></tr></thead>
        <tbody>
          ${Array.from({length:s.instances}).map((_,i)=>`<tr><td class="mono" style="padding-left:4px;">${s.id}-${'abc1de'.substr(0,5)}-${(7821+i*3).toString(16)}</td><td class="mono">node-${(i%3)+1}</td><td><span class="badge ok">● Running</span></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="card">
      <div class="card-title"><span>容器资源</span></div>
      <div style="display:flex; flex-direction:column; gap:10px; margin-top:6px;">
        <div><div class="between" style="font-size:12px; color:var(--text-2);"><span>CPU</span><span class="mono">2.1 / 4.0 cores</span></div><div class="bar" style="height:6px; margin-top:4px;"><span style="width:52%; background:var(--accent);"></span></div></div>
        <div><div class="between" style="font-size:12px; color:var(--text-2);"><span>Memory</span><span class="mono">2.6 / 4.0 GiB</span></div><div class="bar" style="height:6px; margin-top:4px;"><span style="width:65%; background:var(--warning);"></span></div></div>
        <div><div class="between" style="font-size:12px; color:var(--text-2);"><span>Network IO</span><span class="mono">42 / 200 Mbps</span></div><div class="bar" style="height:6px; margin-top:4px;"><span style="width:21%; background:var(--success);"></span></div></div>
        <div><div class="between" style="font-size:12px; color:var(--text-2);"><span>Disk IO</span><span class="mono">8 / 50 MB/s</span></div><div class="bar" style="height:6px; margin-top:4px;"><span style="width:16%; background:var(--success);"></span></div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title"><span>部署事件</span><span class="hint">最近</span></div>
      <div style="display:flex; flex-direction:column; gap:8px; margin-top:6px; font-size:12px;">
        <div class="between"><span class="chip">deploy</span><span class="mono">v2.18.4 → v2.18.5</span><span style="color:var(--text-3);">2h前</span></div>
        <div class="between"><span class="chip">scale</span><span class="mono">3 → 4 replicas</span><span style="color:var(--text-3);">14h前</span></div>
        <div class="between"><span class="chip">restart</span><span class="mono">${s.id}-1</span><span style="color:var(--text-3);">1d前</span></div>
      </div>
    </div>
  </div>`;
};
