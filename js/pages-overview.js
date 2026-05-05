// ============ Service Overview (homepage) ============
APM.svcFilter = APM.svcFilter || '';
APM.svcSort = APM.svcSort || 'health'; // health | rpm | p99 | apdex
APM._svcSortLabels = { health:'健康度', rpm:'RPM', p99:'P99', apdex:'Apdex' };
APM.cycleSvcSort = function() {
  const order = ['health','rpm','p99','apdex'];
  const i = order.indexOf(APM.svcSort);
  APM.svcSort = order[(i+1) % order.length];
  APM.renderPage();
};
APM.setSvcFilter = function(v) { APM.svcFilter = v; APM.renderPage(); };
APM._sortServices = function(list) {
  const arr = list.slice();
  if (APM.svcSort === 'rpm') arr.sort((a,b)=>b.rpm-a.rpm);
  else if (APM.svcSort === 'p99') arr.sort((a,b)=>b.p99-a.p99);
  else if (APM.svcSort === 'apdex') arr.sort((a,b)=>a.apdex-b.apdex);
  else { // health: err > warn > ok, then by errPct
    const w = { err:0, warn:1, ok:2 };
    arr.sort((a,b) => (w[APM.health(a)] - w[APM.health(b)]) || (b.errPct - a.errPct));
  }
  return arr;
};
APM.renderOverview = function() {
  const dom = APM.domains.find(d => d.id === APM.currentDomain);
  const proj = dom.projects.find(p => p.id === APM.currentProject) || dom.projects[0];
  const filterText = (APM.svcFilter || '').toLowerCase();
  const svcs = APM._sortServices(APM.services.filter(s =>
    !filterText ||
    s.name.toLowerCase().includes(filterText) ||
    s.lang.toLowerCase().includes(filterText) ||
    (s.env || '').toLowerCase().includes(filterText)
  ));
  const totalSvcs = APM.services.length;

  // aggregates (project-wide, NOT affected by search filter)
  const allSvcs = APM.services;
  const totalRpm = allSvcs.reduce((a,b)=>a+b.rpm,0);
  const errCount = allSvcs.reduce((a,b)=>a + b.rpm*b.errPct/100,0);
  const errRate = (errCount / totalRpm * 100).toFixed(2);
  const apdex = (allSvcs.reduce((a,b)=>a+b.apdex,0)/allSvcs.length).toFixed(2);
  const okN = allSvcs.filter(s => APM.health(s)==='ok').length;
  const warnN = allSvcs.filter(s => APM.health(s)==='warn').length;
  const errN = allSvcs.filter(s => APM.health(s)==='err').length;

  // time-series for project header chart (rpm by minute)
  const ts = [];
  for (let i = 0; i < 60; i++) {
    let v = 80 + Math.sin(i/6)*15 + Math.cos(i/3)*5;
    if (i > 38 && i < 46) v += 18 + (i-38)*1.2; // small spike
    ts.push(v);
  }
  const errTs = [];
  for (let i = 0; i < 60; i++) {
    let v = 0.3 + Math.sin(i/8)*0.1;
    if (i > 38 && i < 56) v += (i-38)*0.18;
    errTs.push(v);
  }

  const sparkBig = (values, color, h) => {
    const w = 720; h = h || 90;
    const max = Math.max(...values), min = Math.min(...values);
    const range = max - min || 1;
    const step = w / (values.length - 1);
    const pts = values.map((v, i) => `${(i*step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`).join(' ');
    const id = 'g'+color.replace(/[^a-z0-9]/gi,'');
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none">
      <defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".3"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
      <polygon points="0,${h} ${pts} ${w},${h}" fill="url(#${id})"/>
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6"/>
    </svg>`;
  };

  return `
    <div class="between">
      <div>
        <div class="page-title">服务概览</div>
        <div class="page-sub">${dom.name} / <strong>${proj.name}</strong> · ${filterText ? svcs.length + ' / ' + totalSvcs : totalSvcs} 个服务 · 实时运行中</div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="pill" onclick="APM.go('topology')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><path d="M9 6h6M7.5 8.5L10 15.5M16.5 8.5L14 15.5"/></svg>
          查看拓扑
        </button>
        <button class="pill primary" onclick="APM.go('onboarding')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          接入新服务
        </button>
      </div>
    </div>

    <div class="grid-4">
      <div class="card kpi">
        <div class="name">总吞吐</div>
        <div class="value">${(totalRpm/1000).toFixed(2)}<span class="unit"> kRPM</span></div>
        <div class="delta up">▲ 4.2% vs 1h ago</div>
        <div class="spark">${APM.sparkline(ts.slice(20), 'var(--accent)', 200, 30)}</div>
      </div>
      <div class="card kpi">
        <div class="name">总错误率</div>
        <div class="value" style="color: var(--warning);">${errRate}<span class="unit">%</span></div>
        <div class="delta up">▲ 0.18% vs 1h ago</div>
        <div class="spark">${APM.sparkline(errTs.slice(20), 'var(--warning)', 200, 30)}</div>
      </div>
      <div class="card kpi">
        <div class="name">平均 Apdex</div>
        <div class="value">${apdex}</div>
        <div class="delta down">▼ 0.02 vs 1h ago</div>
        <div class="spark" style="display:flex; align-items:center; gap:4px; margin-top:8px;">
          <div class="apdex-bar" style="flex:1; height:8px;"><span style="width:${apdex*100}%; background: ${apdex>0.94?'var(--success)':apdex>0.85?'var(--warning)':'var(--danger)'};"></span></div>
          <span style="font-size:11px; color:var(--text-3); font-family:var(--mono);">T=300ms</span>
        </div>
      </div>
      <div class="card kpi">
        <div class="name">服务健康</div>
        <div class="value" style="display:flex; gap:8px; align-items:baseline; font-size: 18px;">
          <span style="color: var(--success);">${okN}<span style="font-size:11px; color:var(--text-3); margin-left:2px;">健康</span></span>
          <span style="color: var(--warning);">${warnN}<span style="font-size:11px; color:var(--text-3); margin-left:2px;">警示</span></span>
          <span style="color: var(--danger);">${errN}<span style="font-size:11px; color:var(--text-3); margin-left:2px;">异常</span></span>
        </div>
        <div class="delta flat" style="margin-top: 8px;">${APM.activeAlertCount} 个 firing 告警 (夜莺)</div>
        <div class="health-strip" style="margin-top:6px;">
          ${allSvcs.map(s => `<div class="seg ${APM.health(s)}" title="${s.name}"></div>`).join('')}
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title"><span>项目吞吐 <span class="hint">· 按分钟聚合</span></span><div class="tabs">${APM._timeRanges.map(r => `<span class="tab ${APM.timeRange.id===r.id?'active':''}" onclick="APM.pickTimeRange('${r.id}')" style="cursor:pointer;">${r.id}</span>`).join('')}</div></div>
        ${sparkBig(ts, 'var(--accent)', 130)}
        <div style="display:flex; gap:14px; font-size:11.5px; color:var(--text-2); margin-top: 4px;">
          <span>峰值 <strong style="color:var(--text-1)">5.4k RPM</strong></span>
          <span>谷值 <strong style="color:var(--text-1)">3.2k RPM</strong></span>
          <span style="margin-left:auto;">P50 ${Math.floor(totalRpm/60)} req/s</span>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span>错误率趋势</span><span class="hint">5xx + 4xx + exception</span></div>
        ${sparkBig(errTs, 'var(--warning)', 130)}
        <div style="display:flex; gap:14px; font-size:11.5px; color:var(--text-2); margin-top:4px;">
          <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--danger);margin-right:4px;vertical-align:middle;"></span>checkout-service · 0.42%</span>
          <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--danger);margin-right:4px;vertical-align:middle;"></span>ledger-service · 5.20%</span>
        </div>
      </div>
    </div>

    <div class="section-h"><h3>服务列表</h3>
      <div style="display:flex; gap:8px;">
        <div class="searchbox" style="padding: 6px 10px; min-width: 240px;">
          ${APM.svgI.search}<input placeholder="按服务名 / 语言 / tag 筛选…" value="${(APM.svcFilter||'').replace(/"/g,'&quot;')}" data-focus-key="svc-filter" oninput="APM.bindRetainedInput(event,'svc-filter',APM.setSvcFilter)">
        </div>
        <button class="pill" onclick="APM.cycleSvcSort()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M6 12h12M10 18h4"/></svg>排序: ${APM._svcSortLabels[APM.svcSort]}</button>
      </div>
    </div>

    ${svcs.length === 0 ? `<div class="placeholder" style="margin-top:14px;"><div class="icon">🔍</div>未匹配到任何服务 · <a class="link" onclick="APM.setSvcFilter('')">清除筛选</a></div>` : ''}
    <div class="grid-3">
      ${svcs.map(s => {
        const h = APM.health(s);
        const cls = h === 'err' ? 'has-alert' : '';
        const valCls = h === 'err' ? 'err' : (h === 'warn' ? 'warn' : '');
        const sparkColor = h === 'err' ? 'var(--danger)' : (h === 'warn' ? 'var(--warning)' : 'var(--accent)');
        return `<div class="svc-card ${cls}" onclick="APM.go('service', {id:'${s.id}'})">
          <div class="svc-head">
            <span class="lang-ico" style="background: ${s.langColor};">${s.langText}</span>
            <div style="min-width:0; flex:1;">
              <div class="svc-name">${s.name}</div>
              <div class="svc-sub">${s.lang} · ${s.instances} 实例 · ${s.env}</div>
            </div>
            <span class="health-dot" style="background: ${APM.healthColor(h)}; box-shadow: 0 0 0 3px color-mix(in srgb, ${APM.healthColor(h)} 25%, transparent);"></span>
            ${s.alerts > 0 ? `<span class="badge err" style="margin-left:6px;">${s.alerts} 告警</span>` : ''}
          </div>
          <div class="stats">
            <div class="stat"><div class="lbl">RPM</div><div class="val">${s.rpm >= 1000 ? (s.rpm/1000).toFixed(1)+'k' : s.rpm}</div></div>
            <div class="stat"><div class="lbl">错误率</div><div class="val ${s.errPct>1?'err':s.errPct>0.3?'warn':''}">${s.errPct.toFixed(2)}%</div></div>
            <div class="stat"><div class="lbl">P99</div><div class="val ${s.p99>800?'err':s.p99>300?'warn':''}">${s.p99}<span style="font-size:11px;color:var(--text-3);font-weight:500;">ms</span></div></div>
          </div>
          <div class="spark">${APM.sparkline(s.spark, sparkColor, 240, 28)}</div>
          <div style="display:flex; align-items:center; gap:6px; margin-top: 8px; font-size: 11px; color: var(--text-3);">
            <div class="apdex-bar"><span style="width:${s.apdex*100}%; background: ${s.apdex>0.94?'var(--success)':s.apdex>0.85?'var(--warning)':'var(--danger)'};"></span></div>
            <span class="mono">Apdex ${s.apdex.toFixed(2)}</span>
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
};
