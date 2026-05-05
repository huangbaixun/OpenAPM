// ============ Topology page ============
APM.topoView = 'service';
APM.topoMode = 'graph'; // 'graph' | 'matrix'
APM.topoSelected = 'checkout-service';
APM.topoZoom = APM.topoZoom || 1.0;
APM.zoomTopo = function(delta) {
  const next = Math.max(0.4, Math.min(2.5, +(APM.topoZoom * (delta > 0 ? 1.25 : 0.8)).toFixed(2)));
  APM.topoZoom = next;
  APM.renderPage();
};
APM.fitTopo = function() {
  APM.topoZoom = 1.0;
  APM.renderPage();
  APM.toast('已重置缩放', 'info');
};

APM.renderTopology = function() {
  const isMatrix = APM.topoMode === 'matrix';
  return `
    <div class="between">
      <div>
        <div class="page-title">服务拓扑</div>
        <div class="page-sub">基于 OTel span 边实时计算 · Flink 1m 聚合 · ${isMatrix?'矩阵视图：caller × callee 健康度':'选中节点查看 RED 详情'}</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <div class="seg" style="display:inline-flex; background: var(--bg-elev-1); border:1px solid var(--border); border-radius:7px; padding:2px;">
          <button class="tbtn ${!isMatrix?'active':''}" style="border-radius:5px;" onclick="APM.setTopoMode('graph')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px;"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M8 7L16 7M7 8L11 16M17 8L13 16"/></svg>图
          </button>
          <button class="tbtn ${isMatrix?'active':''}" style="border-radius:5px;" onclick="APM.setTopoMode('matrix')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px;"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>矩阵
          </button>
        </div>
        <button class="pill" onclick="APM.toggleDD('timeDD')" title="切换时间窗口"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${APM.timeRange.id === 'custom' ? '自定义' : APM.timeRange.id || '1h'}</button>
      </div>
    </div>

    ${isMatrix ? APM.topoMatrixCard() : `
    <div class="topo-wrap" style="margin-top: 14px;">
      <div class="dots"></div>
      <div class="topo-toolbar">
        <button class="tbtn ${APM.topoView==='service'?'active':''}" onclick="APM.setTopoView('service')">服务级</button>
        <button class="tbtn ${APM.topoView==='endpoint'?'active':''}" onclick="APM.setTopoView('endpoint')">端点级</button>
        <button class="tbtn ${APM.topoView==='instance'?'active':''}" onclick="APM.setTopoView('instance')">实例级</button>
        <div class="sep"></div>
        <button class="tbtn" onclick="APM.zoomTopo(1)" title="放大">⊕ 放大</button>
        <button class="tbtn" onclick="APM.zoomTopo(-1)" title="缩小">⊖ 缩小</button>
        <button class="tbtn" onclick="APM.fitTopo()" title="自适应">⊡ ${(APM.topoZoom*100).toFixed(0)}%</button>
      </div>
      <div class="topo-legend">
        <span class="chip"><span style="display:inline-block;width:8px;height:8px;background:var(--success);border-radius:50%;margin-right:6px;"></span>健康</span>
        <span class="chip"><span style="display:inline-block;width:8px;height:8px;background:var(--warning);border-radius:50%;margin-right:6px;"></span>警示</span>
        <span class="chip"><span style="display:inline-block;width:8px;height:8px;background:var(--danger);border-radius:50%;margin-right:6px;"></span>异常</span>
      </div>
      ${APM.topoSvg()}
      ${APM.topoSidePanel()}
    </div>`}
  `;
};

APM.setTopoMode = function(m) {
  APM.topoMode = m;
  APM.renderPage();
};

APM.topoMatrixCard = function() {
  return `<div class="card" style="margin-top: 14px;">
    <div class="card-title">
      <span>依赖矩阵</span>
      <span class="hint">行=调用方 · 列=被调方 · 数值=调用次数 / 分钟 · 颜色越深调用量越大</span>
    </div>
    ${APM.dependencyMatrix()}
    <div style="margin-top:10px;font-size:11.5px;color:var(--text-3);line-height:1.6;">
      <strong style="color:var(--text-2);">用法：</strong>横向看一行 = 该服务对所有下游的调用情况；纵向看一列 = 所有上游对该服务的调用情况。空格表示无直接依赖。
    </div>
  </div>`;
};

APM.setTopoView = function(v) {
  APM.topoView = v;
  APM.renderPage();
};

APM.topoSvg = function() {
  if (APM.topoView === 'endpoint') return APM.topoSvgEndpoint();
  if (APM.topoView === 'instance') return APM.topoSvgInstance();
  // Derive live stats from APM.services so the time-replay slider's
  // perturbations to APM.services flow into node colors/labels and edge styling.
  const live = id => APM.services.find(s => s.id === id);
  const liveStats = id => {
    const s = live(id); if (!s) return {};
    const h = APM.health(s);
    return { rpm: s.rpm, p99: s.p99, err: s.errPct, color: APM.healthColor(h), health: h };
  };
  // node positions
  const nodes = [
    { id: 'client', x: 80, y: 290, label: '客户端', kind: 'client', color: 'var(--text-3)' },
    { id: 'gateway', x: 230, y: 290, label: 'gateway', kind: 'service', ...liveStats('gateway') },
    { id: 'checkout-service', x: 430, y: 200, label: 'checkout-service', kind: 'service', ...liveStats('checkout-service') },
    { id: 'order-service', x: 430, y: 380, label: 'order-service', kind: 'service', ...liveStats('order-service') },
    { id: 'risk-service', x: 640, y: 120, label: 'risk-service', kind: 'service', ...liveStats('risk-service') },
    { id: 'payment-service', x: 640, y: 250, label: 'payment-service', kind: 'service', ...liveStats('payment-service') },
    { id: 'ledger-service', x: 640, y: 400, label: 'ledger-service', kind: 'service', ...liveStats('ledger-service') },
    { id: 'mysql', x: 880, y: 200, label: 'mysql · order_db', kind: 'database', color: '#ffcc00' },
    { id: 'redis', x: 880, y: 320, label: 'redis · cache', kind: 'cache', color: '#dc382d' },
    { id: 'stripe', x: 880, y: 80, label: 'api.stripe.com', kind: 'external', color: 'var(--purple)' },
    { id: 'kafka', x: 880, y: 440, label: 'kafka · events', kind: 'mq', color: '#231f20' }
  ];
  // Edges with auto-inferred err from current upstream/downstream health.
  const isErrSvc = id => { const s = live(id); return s ? APM.health(s) === 'err' : false; };
  const edges = [
    { from:'client', to:'gateway', w: 4 },
    { from:'gateway', to:'checkout-service', w: 3 },
    { from:'gateway', to:'order-service', w: 2 },
    { from:'checkout-service', to:'risk-service', w: 2 },
    { from:'checkout-service', to:'payment-service', w: 2 },
    { from:'checkout-service', to:'ledger-service', w: 2 },
    { from:'order-service', to:'mysql', w: 2 },
    { from:'risk-service', to:'redis', w: 1 },
    { from:'risk-service', to:'mysql', w: 1 },
    { from:'payment-service', to:'stripe', w: 2 },
    { from:'payment-service', to:'ledger-service', w: 1 },
    { from:'ledger-service', to:'mysql', w: 2 },
    { from:'order-service', to:'kafka', w: 1 }
  ].map(e => ({ ...e, err: isErrSvc(e.from) || isErrSvc(e.to) }));
  const findNode = id => nodes.find(n => n.id === id);
  const z = APM.topoZoom || 1.0;
  const vw = 1000 / z, vh = 580 / z;
  const vx = (1000 - vw) / 2, vy = (580 - vh) / 2;
  return `<svg class="topo-svg" viewBox="${vx.toFixed(0)} ${vy.toFixed(0)} ${vw.toFixed(0)} ${vh.toFixed(0)}" preserveAspectRatio="xMidYMid meet">
    <defs>
      <marker id="topoArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--text-3)"/></marker>
      <marker id="topoArrowErr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--danger)"/></marker>
    </defs>
    ${edges.map((e, idx) => {
      const a = findNode(e.from), b = findNode(e.to);
      const stroke = e.err ? 'var(--danger)' : 'var(--text-3)';
      const opa = e.err ? '0.55' : '0.32';
      const flowColor = e.err ? 'var(--danger)' : 'var(--accent)';
      const d = `M${a.x+50} ${a.y} Q ${(a.x+b.x)/2} ${(a.y+b.y)/2 - 10} ${b.x-50} ${b.y}`;
      // Static base path + animated overlay path with marching dashes for direction cue
      // Use a larger w for higher-volume edges to scale dash-speed visually
      const dur = (e.err ? 1.0 : (3.2 - Math.min(2.4, e.w * 0.5))).toFixed(1);
      return `<g>
        <path d="${d}" fill="none" stroke="${stroke}" stroke-width="${e.w*0.8}" opacity="${opa}" marker-end="url(#topoArrow${e.err?'Err':''})"/>
        <path class="topo-flow ${e.err?'is-err':''}" d="${d}" fill="none" stroke="${flowColor}" stroke-width="${e.w*0.9}" stroke-linecap="round" stroke-dasharray="6 14" opacity="${e.err?0.85:0.7}" style="animation-duration:${dur}s;"/>
      </g>`;
    }).join('')}
    ${nodes.map(n => {
      if (n.kind === 'client') {
        return `<g><circle cx="${n.x}" cy="${n.y}" r="22" fill="var(--bg-elev-2)" stroke="${n.color}" stroke-width="1.5"/><text x="${n.x}" y="${n.y+5}" text-anchor="middle" font-size="11" fill="var(--text-2)">${n.label}</text></g>`;
      }
      if (n.kind !== 'service') {
        // kafka node → drill into Kafka page; mysql/redis/external → toast (out of scope)
        const click = n.kind === 'mq'
          ? `APM.go('kafka')`
          : n.kind === 'database'
            ? `APM.go('database')`
            : n.kind === 'cache'
              ? `APM.go('database');APM.dbTab='redis'`
              : `APM.toast('外部依赖 ${n.label}','info')`;
        return `<g style="cursor:pointer;" onclick="${click}"><rect x="${n.x-46}" y="${n.y-20}" width="92" height="40" rx="8" fill="var(--bg-elev-2)" stroke="${n.color}" stroke-width="1.5"/><text x="${n.x}" y="${n.y+4}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text-1)">${n.label}</text></g>`;
      }
      const isSel = n.id === APM.topoSelected;
      return `<g style="cursor:pointer;" onclick="APM.selectTopoNode('${n.id}')">
        ${isSel?`<circle cx="${n.x}" cy="${n.y}" r="44" fill="none" stroke="${n.color}" stroke-width="1.5" opacity=".4"/>`:''}
        <circle cx="${n.x}" cy="${n.y}" r="34" fill="var(--bg-elev-2)" stroke="${n.color}" stroke-width="${isSel?2.5:1.8}"/>
        <text x="${n.x}" y="${n.y-3}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text-1)">${n.label}</text>
        <text x="${n.x}" y="${n.y+11}" text-anchor="middle" font-size="9.5" fill="var(--text-3)" font-family="SF Mono">${n.rpm} rpm · ${n.p99}ms</text>
        <circle cx="${n.x+25}" cy="${n.y-25}" r="4.5" fill="${n.color}"/>
      </g>`;
    }).join('')}
  </svg>`;
};

APM.selectTopoNode = function(id) {
  APM.topoSelected = id;
  APM.renderPage();
};

APM.topoSidePanel = function() {
  const id = APM.topoSelected;
  const s = APM.services.find(x => x.id === id);
  if (!s) return '';
  const h = APM.health(s);
  return `<div class="topo-side">
    <div class="ts-title"><span class="lang-ico" style="background:${s.langColor}; width:20px; height:20px; border-radius:5px; display:inline-flex; align-items:center; justify-content:center; color:white; font-size:9px; font-weight:700;">${s.langText}</span>${s.name}<span class="health-dot" style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${APM.healthColor(h)}; margin-left:auto;"></span></div>
    <div class="ts-sub">${s.lang} · ${s.instances} 实例</div>
    <div class="ts-grid">
      <div><div class="ts-k">RPM</div><div class="ts-v">${s.rpm}</div></div>
      <div><div class="ts-k">P99</div><div class="ts-v ${s.p99>800?'err':s.p99>300?'warn':''}">${s.p99}ms</div></div>
      <div><div class="ts-k">Err %</div><div class="ts-v ${s.errPct>1?'err':s.errPct>0.3?'warn':''}">${s.errPct.toFixed(2)}%</div></div>
      <div><div class="ts-k">Apdex</div><div class="ts-v">${s.apdex}</div></div>
    </div>
    <div style="margin-top: 10px; display:flex; gap:6px;">
      <button class="pill" style="flex:1; justify-content:center;" onclick="APM.go('service',{id:'${s.id}'})">详情</button>
      <button class="pill" style="flex:1; justify-content:center;" onclick="APM.go('traces',{svc:'${s.id}'})">Traces</button>
    </div>
  </div>`;
};

APM.dependencyMatrix = function() {
  const svcs = ['gateway','checkout','order','risk','payment','ledger','notify','user','auth'];
  // matrix value generator (deterministic mock)
  const val = (i,j) => {
    const seed = (i+1)*7 + (j+1)*13;
    if (i === j) return null;
    const r = (seed * 9301 + 49297) % 100;
    if (r < 50) return null;
    return r * 12;
  };
  // err overlay: a few hot edges (only valid where there's actual call volume)
  const errEdges = {};
  // checkout(1) → payment(4): if exists
  if (val(1,4) != null) errEdges['1,4'] = 2.4;
  // payment(4) → ledger(5): if exists
  if (val(4,5) != null) errEdges['4,5'] = 1.1;
  // order(2) → user(7): if exists
  if (val(2,7) != null) errEdges['2,7'] = 0.6;
  // Fallback: ensure at least 2 err edges land on populated cells
  if (Object.keys(errEdges).length < 2) {
    const candidates = [];
    for (let i=0;i<svcs.length;i++) for (let j=0;j<svcs.length;j++) {
      if (i!==j && val(i,j) != null) candidates.push([i,j]);
    }
    // deterministic pick: take indices 1 and 4 from candidate list if available
    if (candidates[1]) errEdges[candidates[1].join(',')] = 1.8;
    if (candidates[4]) errEdges[candidates[4].join(',')] = 1.2;
  }
  const cellBg = (v, errPct) => {
    if (v == null) return 'transparent';
    if (errPct && errPct > 1) return `color-mix(in srgb, var(--danger) ${Math.min(50, errPct*15+10)}%, transparent)`;
    const t = Math.min(1, v / 1200);
    return `color-mix(in srgb, var(--accent) ${(t*55+8).toFixed(0)}%, transparent)`;
  };
  // Build cells
  const rows = svcs.map((row,i) => {
    const tds = svcs.map((col,j) => {
      const v = val(i,j);
      const err = errEdges[`${i},${j}`];
      const isDiag = i === j;
      const bg = cellBg(v, err);
      const txt = v == null ? (isDiag ? '·' : '') : v;
      return `<td class="dm-cell ${v==null?'empty':''} ${err?'has-err':''}"
        data-row="${i}" data-col="${j}"
        onmouseover="APM.dmHover(${i},${j})" onmouseout="APM.dmHover(-1,-1)"
        style="background:${bg};">
        <span class="dm-val">${txt}</span>
        ${err?`<span class="dm-err-dot" title="错误率 ${err}%"></span>`:''}
      </td>`;
    }).join('');
    return `<tr><td class="dm-rowhead" data-row="${i}">${row}</td>${tds}</tr>`;
  }).join('');

  return `
  <div class="dm-wrap">
    <div class="dm-scroll">
      <table class="dm-table">
        <thead>
          <tr>
            <th class="dm-corner"><span class="dm-corner-from">调用方</span><span class="dm-corner-to">被调方</span></th>
            ${svcs.map((s,j) => `<th class="dm-colhead" data-col="${j}"><span>${s}</span></th>`).join('')}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="dm-legend">
      <span class="dm-leg-label">调用量</span>
      <span class="dm-leg-scale"></span>
      <span class="dm-leg-tick">少</span>
      <span class="dm-leg-tick" style="margin-left:auto;">多</span>
      <span class="dm-leg-sep"></span>
      <span class="dm-leg-err"><span class="dm-err-dot"></span>错误率 &gt; 1%</span>
    </div>
  </div>`;
};

APM.dmHover = function(i, j) {
  const tbl = document.querySelector('.dm-table');
  if (!tbl) return;
  tbl.querySelectorAll('.dm-cell.hl-row, .dm-cell.hl-col, .dm-rowhead.hl, .dm-colhead.hl').forEach(el => {
    el.classList.remove('hl-row','hl-col','hl');
  });
  if (i < 0) return;
  tbl.querySelectorAll(`.dm-cell[data-row="${i}"]`).forEach(el => el.classList.add('hl-row'));
  tbl.querySelectorAll(`.dm-cell[data-col="${j}"]`).forEach(el => el.classList.add('hl-col'));
  const rh = tbl.querySelector(`.dm-rowhead[data-row="${i}"]`);
  const ch = tbl.querySelector(`.dm-colhead[data-col="${j}"]`);
  if (rh) rh.classList.add('hl');
  if (ch) ch.classList.add('hl');
};

// ============ Endpoint-level view ============
// Show endpoints (per HTTP route) of the focused service, with their downstream
// service nodes connected by edges sized to per-route RPM.
APM.topoSvgEndpoint = function() {
  const sel = APM.topoSelected || 'checkout-service';
  const svc = APM.services.find(s => s.id === sel) || APM.services[0];
  // Pick endpoints — when checkout-service we have real APM.endpoints; for
  // other services we synthesize a couple from the service name.
  const endpoints = svc.id === 'checkout-service'
    ? APM.endpoints.slice(0, 5)
    : [
        { method:'GET',  path:`/${svc.id.replace('-service','')}`,        rpm: Math.floor(svc.rpm*0.5), errPct:svc.errPct, p99:svc.p99, p95:Math.floor(svc.p99*0.6), p50:Math.floor(svc.p99*0.2), apdex:svc.apdex },
        { method:'POST', path:`/${svc.id.replace('-service','')}`,        rpm: Math.floor(svc.rpm*0.3), errPct:svc.errPct*1.4, p99:Math.floor(svc.p99*1.2), p95:Math.floor(svc.p99*0.7), p50:Math.floor(svc.p99*0.25), apdex:svc.apdex-0.02 },
        { method:'GET',  path:`/${svc.id.replace('-service','')}/health`, rpm: Math.floor(svc.rpm*0.2), errPct:0, p99:Math.floor(svc.p99*0.05+8), p95:Math.floor(svc.p99*0.04+5), p50:4, apdex:0.99 }
      ];
  const downstreams = (() => {
    // pick 2-3 services other than self for downstream visual
    const others = APM.services.filter(s => s.id !== svc.id).slice(0, 4);
    return others;
  })();

  const lh = APM.healthColor(APM.health(svc));
  const z = APM.topoZoom || 1.0;
  const vw = 1000 / z, vh = 580 / z;
  const vx = (1000 - vw) / 2, vy = (580 - vh) / 2;
  const epColors = ['var(--accent)','var(--purple)','var(--teal)','var(--success)','var(--warning)'];
  const startX = 200, epX = 480, dsX = 800;

  return `<svg class="topo-svg" viewBox="${vx.toFixed(0)} ${vy.toFixed(0)} ${vw.toFixed(0)} ${vh.toFixed(0)}" preserveAspectRatio="xMidYMid meet">
    <defs>
      <marker id="topoArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--text-3)"/></marker>
    </defs>
    <!-- left: focused service -->
    <g><circle cx="${startX}" cy="290" r="44" fill="var(--bg-elev-2)" stroke="${lh}" stroke-width="2"/>
      <text x="${startX}" y="287" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text-1)">${svc.name}</text>
      <text x="${startX}" y="304" text-anchor="middle" font-size="10" fill="var(--text-3)" font-family="SF Mono">${svc.rpm} rpm · ${svc.p99}ms</text>
    </g>
    <!-- middle column: endpoints -->
    ${endpoints.map((e, i) => {
      const y = 100 + i * (380 / Math.max(1, endpoints.length - 1));
      const c = epColors[i % epColors.length];
      const isErr = e.errPct > 1;
      const w = 220;
      return `<g style="cursor:pointer;" onclick="APM.openEndpointDetail('${e.path}')">
        <line x1="${startX + 44}" y1="290" x2="${epX - w/2}" y2="${y}" stroke="${isErr ? 'var(--danger)' : 'var(--text-3)'}" stroke-width="${1 + Math.log10(Math.max(10,e.rpm))*0.6}" opacity="${isErr ? 0.7 : 0.35}"/>
        <rect x="${epX - w/2}" y="${y - 22}" width="${w}" height="44" rx="9" fill="var(--bg-elev-2)" stroke="${c}" stroke-width="1.5"/>
        <text x="${epX - w/2 + 12}" y="${y - 6}" font-size="11" font-weight="600" fill="${c}">${e.method}</text>
        <text x="${epX - w/2 + 50}" y="${y - 6}" font-size="11" font-weight="600" fill="var(--text-1)">${e.path}</text>
        <text x="${epX - w/2 + 12}" y="${y + 12}" font-size="10" fill="var(--text-3)" font-family="SF Mono">${e.rpm} rpm · P99 ${e.p99}ms · err ${e.errPct.toFixed(2)}%</text>
        ${isErr ? `<circle cx="${epX + w/2 - 10}" cy="${y - 12}" r="4" fill="var(--danger)"/>` : ''}
      </g>`;
    }).join('')}
    <!-- right: downstream services -->
    ${downstreams.map((d, i) => {
      const y = 130 + i * (340 / Math.max(1, downstreams.length - 1));
      const dh = APM.healthColor(APM.health(d));
      // edges from each endpoint to this downstream (only first 2 endpoints per downstream for readability)
      const edges = endpoints.slice(0, 3).map((e, ei) => {
        const ey = 100 + ei * (380 / Math.max(1, endpoints.length - 1));
        const isErr = (e.errPct > 1) || (APM.health(d) === 'err');
        return `<line x1="${epX + 110}" y1="${ey}" x2="${dsX - 38}" y2="${y}" stroke="${isErr ? 'var(--danger)' : 'var(--text-3)'}" stroke-width="${1 + Math.log10(Math.max(10,e.rpm))*0.4}" opacity="${isErr ? 0.6 : 0.22}" marker-end="url(#topoArrow)"/>`;
      }).join('');
      return `<g>${edges}<g style="cursor:pointer;" onclick="APM.selectTopoNode('${d.id}')">
        <circle cx="${dsX}" cy="${y}" r="32" fill="var(--bg-elev-2)" stroke="${dh}" stroke-width="1.6"/>
        <text x="${dsX}" y="${y - 2}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text-1)">${d.name}</text>
        <text x="${dsX}" y="${y + 12}" text-anchor="middle" font-size="9.5" fill="var(--text-3)" font-family="SF Mono">${d.rpm} rpm</text>
      </g></g>`;
    }).join('')}
    <text x="${startX}" y="60" text-anchor="middle" font-size="11" fill="var(--text-3)" font-weight="600" letter-spacing=".05em">焦点服务</text>
    <text x="${epX}" y="60" text-anchor="middle" font-size="11" fill="var(--text-3)" font-weight="600" letter-spacing=".05em">端点（${endpoints.length}）</text>
    <text x="${dsX}" y="60" text-anchor="middle" font-size="11" fill="var(--text-3)" font-weight="600" letter-spacing=".05em">下游（${downstreams.length}）</text>
  </svg>`;
};

// ============ Instance-level view ============
// Show all instances of the focused service in a row, plus a load-balancer
// origin node and the same downstreams. Edge thickness = RPM share per instance.
APM.topoSvgInstance = function() {
  const sel = APM.topoSelected || 'checkout-service';
  const svc = APM.services.find(s => s.id === sel) || APM.services[0];
  const inst = svc.instances || 2;
  // Synthesize per-instance stats — slight variance around service averages.
  const instances = Array.from({length: inst}).map((_, i) => {
    const rpm = Math.floor(svc.rpm / inst + (i - inst/2) * (svc.rpm * 0.04));
    const cpu = 38 + i * 7 + (i === inst-1 ? 6 : 0);
    const mem = 56 + i * 4;
    const p99 = svc.p99 + i * 8 + (i === inst-1 ? 18 : 0);
    const status = (cpu > 75 || p99 > svc.p99 * 1.5) ? 'warn' : 'ok';
    return { id: `${svc.id}-${i+1}`, rpm, cpu, mem, p99, status, host: `pod-${(i+1).toString().padStart(2,'0')}.${svc.id}.svc.cluster.local` };
  });
  const downstreams = APM.services.filter(s => s.id !== svc.id).slice(0, 3);

  const z = APM.topoZoom || 1.0;
  const vw = 1000 / z, vh = 580 / z;
  const vx = (1000 - vw) / 2, vy = (580 - vh) / 2;

  const lbX = 140, instX = 460, dsX = 820;

  return `<svg class="topo-svg" viewBox="${vx.toFixed(0)} ${vy.toFixed(0)} ${vw.toFixed(0)} ${vh.toFixed(0)}" preserveAspectRatio="xMidYMid meet">
    <defs>
      <marker id="topoArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--text-3)"/></marker>
    </defs>
    <!-- LB node -->
    <g><rect x="${lbX-50}" y="270" width="100" height="40" rx="8" fill="var(--bg-elev-2)" stroke="var(--accent)" stroke-width="1.5"/>
      <text x="${lbX}" y="287" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text-1)">k8s svc</text>
      <text x="${lbX}" y="302" text-anchor="middle" font-size="9.5" fill="var(--text-3)" font-family="SF Mono">${svc.id}.cluster.local</text>
    </g>
    <text x="${lbX}" y="60" text-anchor="middle" font-size="11" fill="var(--text-3)" font-weight="600" letter-spacing=".05em">入口</text>

    <!-- middle: instance pods -->
    ${instances.map((p, i) => {
      const y = 80 + i * (440 / Math.max(1, instances.length));
      const isWarn = p.status === 'warn';
      const stroke = isWarn ? 'var(--warning)' : 'var(--success)';
      const w = 220;
      return `<g style="cursor:pointer;" onclick="APM.toast('Pod · ${p.host}','info')">
        <line x1="${lbX + 50}" y1="290" x2="${instX - w/2}" y2="${y + 22}" stroke="var(--text-3)" stroke-width="${1 + Math.log10(Math.max(10,p.rpm))*0.6}" opacity="0.4"/>
        <rect x="${instX - w/2}" y="${y}" width="${w}" height="64" rx="10" fill="var(--bg-elev-2)" stroke="${stroke}" stroke-width="1.5"/>
        <text x="${instX - w/2 + 12}" y="${y + 18}" font-size="11.5" font-weight="700" fill="var(--text-1)" font-family="SF Mono">${p.id}</text>
        <text x="${instX - w/2 + 12}" y="${y + 36}" font-size="10" fill="var(--text-3)" font-family="SF Mono">${p.rpm} rpm · P99 ${p.p99}ms</text>
        <text x="${instX - w/2 + 12}" y="${y + 52}" font-size="10" fill="var(--text-3)" font-family="SF Mono">CPU ${p.cpu}% · MEM ${p.mem}%</text>
        <circle cx="${instX + w/2 - 14}" cy="${y + 14}" r="5" fill="${stroke}"/>
        <text x="${instX + w/2 - 14}" y="${y + 36}" text-anchor="end" font-size="9.5" fill="${stroke}" font-weight="600">${isWarn ? 'warn' : 'running'}</text>
      </g>`;
    }).join('')}
    <text x="${instX}" y="60" text-anchor="middle" font-size="11" fill="var(--text-3)" font-weight="600" letter-spacing=".05em">实例 (${instances.length})</text>

    <!-- right: downstreams (aggregated) -->
    ${downstreams.map((d, i) => {
      const y = 140 + i * (300 / Math.max(1, downstreams.length));
      const dh = APM.healthColor(APM.health(d));
      const edges = instances.map((p, pi) => {
        const py = 80 + pi * (440 / Math.max(1, instances.length)) + 32;
        return `<line x1="${instX + 110}" y1="${py}" x2="${dsX - 32}" y2="${y}" stroke="var(--text-3)" stroke-width="0.6" opacity="0.18" marker-end="url(#topoArrow)"/>`;
      }).join('');
      return `<g>${edges}<g style="cursor:pointer;" onclick="APM.selectTopoNode('${d.id}')">
        <circle cx="${dsX}" cy="${y}" r="32" fill="var(--bg-elev-2)" stroke="${dh}" stroke-width="1.6"/>
        <text x="${dsX}" y="${y - 2}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text-1)">${d.name}</text>
        <text x="${dsX}" y="${y + 12}" text-anchor="middle" font-size="9.5" fill="var(--text-3)" font-family="SF Mono">${d.rpm} rpm</text>
      </g></g>`;
    }).join('')}
    <text x="${dsX}" y="60" text-anchor="middle" font-size="11" fill="var(--text-3)" font-weight="600" letter-spacing=".05em">下游 (${downstreams.length})</text>
  </svg>`;
};
