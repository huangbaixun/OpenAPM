// ============ Kafka / 消息 page ============
// Sub-tabs: topics · groups · producers · consumers · cluster
// Drawers: topic details (partition lag heatmap, sample messages), group details (member assignment, reset offset)

APM.kafkaTab = APM.kafkaTab || 'clusters';
APM.kafkaTopicFilter = APM.kafkaTopicFilter || '';
APM.kafkaClusterFilter = APM.kafkaClusterFilter || 'all';
APM.setKafkaTab = function(t) { APM.kafkaTab = t; APM.renderPage(); };
APM.setKafkaTopicFilter = function(v) { APM.kafkaTopicFilter = v; APM.renderPage(); };
APM.setKafkaClusterFilter = function(id) { APM.kafkaClusterFilter = id; APM.renderPage(); };

APM._kafkaApplyClusterFilter = function(rows) {
  if (APM.kafkaClusterFilter === 'all') return rows;
  return rows.filter(r => r.clusterId === APM.kafkaClusterFilter);
};

APM._kafkaClusterFilterBar = function() {
  return `<div class="cluster-filter-bar">
    <span class="lbl">集群</span>
    <div class="cf-chip ${APM.kafkaClusterFilter==='all'?'active':''}" onclick="APM.setKafkaClusterFilter('all')">全部</div>
    ${APM.kafkaClusters.map(c => `<div class="cf-chip ${APM.kafkaClusterFilter===c.id?'active':''}" onclick="APM.setKafkaClusterFilter('${c.id}')"><span class="dot" style="background:${c.status==='warn'?'var(--warning)':'#1f2937'};"></span>${c.name}</div>`).join('')}
  </div>`;
};

// ---- Aggregates (cluster-aware: respects kafkaClusterFilter) ----
APM._kafkaAggregates = function() {
  const topics = APM._kafkaApplyClusterFilter(APM.kafkaTopics);
  const groups = APM._kafkaApplyClusterFilter(APM.kafkaGroups);
  const producers = APM._kafkaApplyClusterFilter(APM.kafkaProducers);
  const totalPartitions = topics.reduce((a,b)=>a+b.partitions, 0);
  const totalRate = topics.reduce((a,b)=>a+b.msgRate, 0);
  const totalMB = topics.reduce((a,b)=>a+b.mbRate, 0);
  const totalLag = groups.reduce((a,b)=>a+b.lag, 0);
  const rebalances = groups.reduce((a,b)=>a+b.rebalances1h, 0);
  const lagColor = totalLag > 10000 ? 'var(--danger)' : totalLag > 1000 ? 'var(--warning)' : 'var(--success)';
  const errProducers = producers.filter(p => p.errPct > 0).length;
  return { totalPartitions, totalRate, totalMB, totalLag, lagColor, rebalances, errProducers, topicCount: topics.length, groupCount: groups.length };
};

APM.openKafkaClusterDetail = function(id) {
  const c = APM.kafkaClusters.find(x => x.id === id);
  if (!c) return;
  const topics = APM.kafkaTopics.filter(t => t.clusterId === id);
  const groups = APM.kafkaGroups.filter(g => g.clusterId === id);
  const brokers = APM.kafkaBrokers.filter(b => b.clusterId === id);
  APM.openModal({
    title: `${c.name} · Kafka 集群详情`,
    width: 860,
    body: `
      <div class="grid-4" style="margin-bottom:14px;">
        <div class="card kpi"><div class="name">Brokers</div><div class="value">${brokers.length}</div></div>
        <div class="card kpi"><div class="name">Topics / Groups</div><div class="value">${topics.length}<span class="unit"> / ${groups.length}</span></div></div>
        <div class="card kpi"><div class="name">In / Out</div><div class="value">${c.throughputInMB}<span class="unit"> / ${c.throughputOutMB} MB/s</span></div></div>
        <div class="card kpi"><div class="name">Total Lag</div><div class="value" style="color:${c.lagTotal>10000?'var(--danger)':c.lagTotal>1000?'var(--warning)':'var(--success)'};">${c.lagTotal.toLocaleString()}</div></div>
      </div>
      <div style="font-size:12px;color:var(--text-2);line-height:1.7;">
        <div><strong>版本</strong> Kafka v${c.version} · ${c.region}</div>
        <div><strong>状态</strong> ${c.status === 'warn' ? '<span style="color:var(--warning);">⚠ warn</span>' : '<span style="color:var(--success);">✓ ok</span>'}</div>
      </div>
      <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin:14px 0 6px;">Brokers</div>
      <div class="card" style="padding:0;"><table class="tbl">
        <thead><tr><th>ID</th><th>Host</th><th>ISR</th><th>磁盘</th><th>net in/out</th></tr></thead>
        <tbody>${brokers.map(b=>`<tr><td class="mono">${b.id}${b.controller?' <span class="badge purple" style="font-size:10px;">controller</span>':''}</td><td class="mono">${b.host}</td><td class="mono">${b.isr}</td><td class="mono ${b.diskPct>80?'err':b.diskPct>70?'warn':''}">${b.diskPct}%</td><td class="mono">${b.netInMB.toFixed(1)} / ${b.netOutMB.toFixed(1)}</td></tr>`).join('')}</tbody>
      </table></div>
      <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin:14px 0 6px;">Top Topics (按速率)</div>
      <div class="card" style="padding:0;"><table class="tbl">
        <thead><tr><th>Topic</th><th>Partition</th><th>速率</th><th>Lag</th></tr></thead>
        <tbody>${topics.slice().sort((a,b)=>b.msgRate-a.msgRate).slice(0,5).map(t=>`<tr><td class="mono">${t.name}</td><td class="mono">${t.partitions}</td><td class="mono">${t.msgRate} msg/s</td><td class="mono">${t.lag.toLocaleString()}</td></tr>`).join('')}</tbody>
      </table></div>
    `,
    footer: `<button class="pill" data-act="close">关闭</button><button class="pill primary" data-act="filter">过滤到此集群</button>`
  }).el.addEventListener('click', (ev) => {
    const act = ev.target.dataset.act; if (!act) return;
    APM.closeModal(ev.currentTarget.id);
    if (act === 'filter') { APM.setKafkaClusterFilter(id); APM.kafkaTab='topics'; APM.renderPage(); }
  });
};

APM.kafkaClustersTab = function() {
  return `<div class="card" style="padding:0;overflow:hidden;">
    <div style="padding:14px;">
      <div class="cluster-grid">
        ${APM.kafkaClusters.map(c => {
          const brokers = APM.kafkaBrokers.filter(b=>b.clusterId===c.id);
          const warnBroker = brokers.find(b=>b.status==='warn');
          const statusCls = c.status === 'warn' ? 'warn' : c.status === 'err' ? 'err' : 'ok';
          return `<div class="cluster-card" onclick="APM.openKafkaClusterDetail('${c.id}')">
            <div class="cc-head">
              <div style="min-width:0;">
                <div class="cc-name">${c.name}</div>
                <div class="cc-meta">${c.brokers} brokers · v${c.version}</div>
              </div>
              <span class="cc-type-badge type-badge-kafka">⊞ Kafka</span>
              <div class="cc-status ${statusCls}"></div>
            </div>
            <div class="cc-kpis">
              <div class="cc-kpi"><span class="lbl">Topics</span><span class="val">${c.topicCount}</span></div>
              <div class="cc-kpi"><span class="lbl">Groups</span><span class="val">${c.groupCount}</span></div>
              <div class="cc-kpi"><span class="lbl">In MB/s</span><span class="val">${c.throughputInMB}</span></div>
              <div class="cc-kpi"><span class="lbl">Lag</span><span class="val ${c.lagTotal>10000?'err':c.lagTotal>1000?'warn':''}">${c.lagTotal>=1000?(c.lagTotal/1000).toFixed(1)+'K':c.lagTotal}</span></div>
            </div>
            <div class="cc-spark">${APM.sparkline(c.spark, '#374151', 240, 28)}</div>
            <div class="cc-foot">
              <span>${c.region}</span><span>·</span>
              <span>out ${c.throughputOutMB} MB/s</span>
              ${warnBroker?`<span style="margin-left:auto;color:var(--warning);">⚠ ${warnBroker.host.split(':')[0]}</span>`:`<span style="margin-left:auto;">${brokers.length} broker · ok</span>`}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
};

APM.lagBadgeColor = function(lag) {
  if (lag > 10000) return 'var(--danger)';
  if (lag > 1000) return 'var(--warning)';
  if (lag > 0) return 'var(--text-2)';
  return 'var(--success)';
};

APM.renderKafka = function() {
  // Consume route param topic / group preselect
  const preselectTopic = APM.pageParams && APM.pageParams.topic;
  const preselectGroup = APM.pageParams && APM.pageParams.group;
  if (preselectTopic) { APM.kafkaTab = 'topics'; }
  if (preselectGroup) { APM.kafkaTab = 'groups'; }

  const agg = APM._kafkaAggregates();
  const tab = APM.kafkaTab;

  // Series for trend cards
  const w = 600, h = 130;
  const rateSeries = (base, vary, seed) => Array.from({length:60}, (_,i) =>
    base + Math.sin(i/4 + seed)*vary + Math.cos(i/3 + seed)*vary*0.4 + (i>50 ? (i-50)*vary*0.06 : 0));
  const stackArea = (sets, w, h) => {
    // sets: [{label,color,values}]
    const n = sets[0].values.length;
    const stacked = sets[0].values.map((_,i) => sets.reduce((s,set)=>s+set.values[i],0));
    const maxStack = Math.max(...stacked);
    let acc = new Array(n).fill(0);
    return sets.map((set,si) => {
      const next = acc.map((v,i)=> v + set.values[i]);
      const top = next.map((v,i)=>`${(i*w/(n-1)).toFixed(1)},${(h - v/maxStack*h*0.85 - 8).toFixed(1)}`).join(' ');
      const bot = acc.map((v,i)=>`${((n-1-i)*w/(n-1)).toFixed(1)},${(h - v/maxStack*h*0.85 - 8).toFixed(1)}`).reverse().join(' ');
      const out = `<polygon points="${top} ${bot}" fill="${set.color}" opacity=".55"/><polyline points="${top}" fill="none" stroke="${set.color}" stroke-width="1.4"/>`;
      acc = next;
      return out;
    }).join('');
  };

  return `
    <div class="between">
      <div>
        <div class="page-title">Kafka 消息 <span class="badge info" style="font-size:10px;vertical-align:middle;margin-left:6px;">NEW</span></div>
        <div class="page-sub">基于 OTel messaging instrumentation + JMX · ${APM.kafkaBrokers.length} brokers · ${APM.kafkaTopics.length} topics · ${APM.kafkaGroups.length} consumer groups</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="pill" onclick="APM.toast('Kafka admin 控制台原型未实装','info')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1118 0 9 9 0 01-18 0z"/><path d="M9 9h6v6H9z"/></svg>打开 admin 控制台</button>
      </div>
    </div>

    <div class="grid-4" style="margin-top:14px;">
      <div class="card kpi"><div class="name">集群</div><div class="value">${APM.kafkaClusters.length}<span class="unit"> · ${APM.kafkaBrokers.length} brokers</span></div><div class="delta flat">${APM.kafkaClusterFilter==='all'?'全部集群':APM.kafkaClusters.find(c=>c.id===APM.kafkaClusterFilter)?.name}</div></div>
      <div class="card kpi"><div class="name">Topic / Partition</div><div class="value">${agg.topicCount}<span class="unit"> · ${agg.totalPartitions} part</span></div><div class="delta flat">replication = 3 (avg)</div></div>
      <div class="card kpi"><div class="name">消息速率</div><div class="value">${(agg.totalRate/1000).toFixed(1)}<span class="unit"> k msg/s</span></div><div class="delta flat">${agg.totalMB.toFixed(1)} MB/s</div></div>
      <div class="card kpi"><div class="name">Consumer Lag</div><div class="value" style="color:${agg.lagColor};">${agg.totalLag.toLocaleString()}</div><div class="delta flat">${agg.totalLag > 10000 ? '严重 · 需介入' : agg.totalLag > 1000 ? '上升中' : '健康'}</div></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title"><span>消息速率 / 分钟</span><span class="hint">producer + consumer</span></div>
        <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none">
          <g stroke="var(--grid)"><line x1="0" y1="${h*0.3}" x2="${w}" y2="${h*0.3}"/><line x1="0" y1="${h*0.6}" x2="${w}" y2="${h*0.6}"/></g>
          ${(() => {
            const prod = rateSeries(60, 12, 1);
            const cons = rateSeries(58, 11, 2);
            const max = Math.max(...prod, ...cons);
            const path = (vals, color) => {
              const pts = vals.map((v,i)=>`${(i*w/(vals.length-1)).toFixed(1)},${(h - v/max*h*0.85 - 8).toFixed(1)}`).join(' ');
              return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6"/>`;
            };
            return path(prod, 'var(--accent)') + path(cons, 'var(--success)');
          })()}
        </svg>
        <div style="display:flex;gap:14px;font-size:11.5px;color:var(--text-2);margin-top:4px;">
          <span><span style="display:inline-block;width:10px;height:3px;background:var(--accent);margin-right:4px;vertical-align:middle;"></span>Producer</span>
          <span><span style="display:inline-block;width:10px;height:3px;background:var(--success);margin-right:4px;vertical-align:middle;"></span>Consumer</span>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span>Lag 趋势 / 分钟</span><span class="hint">按 group 堆叠</span></div>
        <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none">
          <g stroke="var(--grid)"><line x1="0" y1="${h*0.3}" x2="${w}" y2="${h*0.3}"/><line x1="0" y1="${h*0.6}" x2="${w}" y2="${h*0.6}"/></g>
          ${stackArea([
            { color:'var(--danger)',  values: rateSeries(60, 14, 3).map((v,i)=> v*8 + (i>40?(i-40)*40:0)) }, // ledger
            { color:'var(--warning)', values: rateSeries(40, 8, 4) },
            { color:'var(--accent)',  values: rateSeries(30, 6, 5) },
            { color:'var(--success)', values: rateSeries(20, 4, 6) }
          ], w, h)}
        </svg>
        <div style="display:flex;gap:14px;font-size:11.5px;color:var(--text-2);margin-top:4px;flex-wrap:wrap;">
          <span><span style="display:inline-block;width:10px;height:10px;background:var(--danger);opacity:.55;margin-right:4px;vertical-align:middle;"></span>ledger-writer</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:var(--warning);opacity:.55;margin-right:4px;vertical-align:middle;"></span>notify-dispatcher</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:var(--accent);opacity:.55;margin-right:4px;vertical-align:middle;"></span>risk-consumer</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:var(--success);opacity:.55;margin-right:4px;vertical-align:middle;"></span>其它</span>
        </div>
      </div>
    </div>

    <div class="subtabs">
      ${[
        ['clusters','集群', APM.kafkaClusters.length],
        ['topics','Topic 列表', agg.topicCount],
        ['groups','Consumer Group', agg.groupCount],
        ['producers','Producer', APM._kafkaApplyClusterFilter(APM.kafkaProducers).length],
        ['consumers','Consumer', APM._kafkaApplyClusterFilter(APM.kafkaConsumers).length],
        ['brokers','Broker 健康', APM._kafkaApplyClusterFilter(APM.kafkaBrokers).length]
      ].map(([id,l,c]) => `<div class="subtab ${tab===id?'active':''}" onclick="APM.setKafkaTab('${id}')">${l}<span class="pill-mini">${c}</span></div>`).join('')}
    </div>

    ${APM.kafkaTabBody(tab, preselectTopic, preselectGroup)}
  `;
};

APM.kafkaTabBody = function(tab, preselectTopic, preselectGroup) {
  if (tab === 'clusters')  return APM.kafkaClustersTab();
  if (tab === 'topics')    return APM.kafkaTopicsTable(preselectTopic);
  if (tab === 'groups')    return APM.kafkaGroupsTable(preselectGroup);
  if (tab === 'producers') return APM.kafkaProducersTable();
  if (tab === 'consumers') return APM.kafkaConsumersTable();
  if (tab === 'brokers')   return APM.kafkaClusterPanel();
};

// ---- Topic table + drawer ----
APM.kafkaTopicsTable = function(preselect) {
  const f = (APM.kafkaTopicFilter || '').toLowerCase();
  let list = APM._kafkaApplyClusterFilter(APM.kafkaTopics);
  list = list.filter(t => !f || t.name.toLowerCase().includes(f) || t.owner.toLowerCase().includes(f));
  return `<div class="card" style="padding:0;overflow:hidden;">
    ${APM._kafkaClusterFilterBar()}
    <div class="between" style="margin: 10px 14px;">
      <div class="searchbox" style="padding:6px 10px;min-width:280px;">${APM.svgI.search}<input placeholder="按 topic 名 / owner 服务过滤" value="${f.replace(/"/g,'&quot;')}" data-focus-key="kafka-topic-filter" oninput="APM.bindRetainedInput(event,'kafka-topic-filter',APM.setKafkaTopicFilter)"></div>
      <div style="font-size:12px;color:var(--text-3);">${list.length} topics</div>
    </div>
    ${list.length === 0 ? '<div class="placeholder" style="margin:24px;"><div class="icon">🔍</div>当前过滤下未匹配 topic</div>' : `<table class="tbl">
      <thead><tr>
        <th style="padding-left:14px;">Topic</th>
        <th style="width:120px;">集群</th>
        <th style="width:90px;">Partition</th>
        <th style="width:80px;">ISR</th>
        <th style="width:120px;">速率</th>
        <th style="width:100px;">Lag</th>
        <th style="width:100px;">P99 pub/con</th>
        <th style="width:90px;">Owner</th>
        <th style="width:80px;">告警</th>
        <th style="width:130px;text-align:right;">操作</th>
      </tr></thead>
      <tbody>${list.map(t => {
        const isrOk = t.isr === t.replication;
        const cluster = APM.kafkaClusters.find(c=>c.id===t.clusterId);
        return `<tr class="clickable" onclick="APM.openKafkaTopicDetail('${t.name}')">
          <td style="padding-left:14px;"><strong>${t.name}</strong>${t.cleanup === 'compact' ? `<span class="badge purple" style="margin-left:6px;font-size:10px;">compact</span>` : ''}<div style="font-size:11px;color:var(--text-3);font-family:var(--mono);margin-top:2px;">retention ${t.retention}</div></td>
          <td>${cluster?`<a class="link" onclick="event.stopPropagation();APM.openKafkaClusterDetail('${cluster.id}')">${cluster.name}</a>`:'—'}</td>
          <td class="mono">${t.partitions}</td>
          <td class="mono ${isrOk?'':'err'}" style="${isrOk?'':'color:var(--danger);font-weight:600;'}">${t.isr}/${t.replication}</td>
          <td class="mono">${t.msgRate} msg/s<div style="font-size:11px;color:var(--text-3);">${t.mbRate.toFixed(1)} MB/s</div></td>
          <td><span class="badge" style="background:color-mix(in srgb, ${APM.lagBadgeColor(t.lag)} 18%, transparent);color:${APM.lagBadgeColor(t.lag)};font-family:var(--mono);">${t.lag.toLocaleString()}</span></td>
          <td class="mono"><span style="color:${t.p99PubMs>20?'var(--warning)':'inherit'};">${t.p99PubMs}</span> / <span style="color:${t.p99ConMs>50?'var(--warning)':'inherit'};">${t.p99ConMs}</span><span style="color:var(--text-3);">ms</span></td>
          <td><a class="link" onclick="event.stopPropagation();APM.go('service',{id:'${t.owner}'})">${t.owner}</a></td>
          <td>${t.alerts > 0 ? `<span class="badge err">${t.alerts}</span>` : '<span class="badge muted">—</span>'}</td>
          <td style="text-align:right;padding-right:14px;">
            <button class="pill" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();APM.openKafkaTopicDetail('${t.name}')">详情</button>
            <button class="pill" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();APM.go('traces',{topic:'${t.name}'})">Traces</button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table>`}
    ${preselect ? `<script>setTimeout(() => APM.openKafkaTopicDetail(${JSON.stringify(preselect)}), 50)</script>` : ''}
  </div>`;
};

APM.openKafkaTopicDetail = function(name) {
  const t = APM.kafkaTopics.find(x => x.name === name);
  if (!t) return;
  // partition lag heatmap mock — distribute lag unevenly
  const partitionLags = Array.from({length: t.partitions}, (_, i) => {
    const base = t.lag / t.partitions;
    const skew = (i === t.partitions - 1) ? 2.4 : (i === 0 ? 1.6 : 1);
    return Math.max(0, Math.floor(base * skew + Math.sin(i)*base*0.3));
  });
  const maxLag = Math.max(1, ...partitionLags);
  const heatColor = (v) => {
    const t = v / maxLag;
    if (t > 0.7) return 'var(--danger)';
    if (t > 0.4) return 'var(--warning)';
    if (t > 0.05) return 'var(--accent)';
    return 'var(--bg-elev-1)';
  };

  const producers = APM.kafkaProducers.filter(p => p.topic === name);
  const consumers = APM.kafkaConsumers.filter(c => c.topic === name);

  // Sample messages (mock)
  const sampleKey = (i) => 'u_' + (2800 + i).toString();
  const sampleMsgs = Array.from({length: 6}, (_, i) => ({
    offset: 1842910 + i,
    partition: i % t.partitions,
    key: sampleKey(i),
    value: name === 'order-events'
      ? `{"orderId":"ord_${82910+i}","userId":"${sampleKey(i)}","amount":${(120 + i*8).toFixed(2)},"status":"PAID"}`
      : name === 'ledger-cdc'
        ? `{"op":"INSERT","table":"ledger","id":${82910+i},"amount":${(120+i*8).toFixed(2)}}`
        : `{"event":"${name}","ts":"2026-05-05T18:35:0${i}Z","payload":"…"}`,
    ts: `18:35:${(45+i).toString().padStart(2,'0')}.${(120 + i*9).toString().padStart(3,'0')}`
  }));

  APM.openModal({
    title: `Topic · ${name}`,
    width: 820,
    body: `
      <div class="grid-4" style="margin-bottom:14px;">
        <div class="card kpi"><div class="name">Partitions</div><div class="value">${t.partitions}</div></div>
        <div class="card kpi"><div class="name">ISR</div><div class="value" style="color:${t.isr<t.replication?'var(--danger)':'var(--success)'};">${t.isr}/${t.replication}</div></div>
        <div class="card kpi"><div class="name">速率</div><div class="value">${t.msgRate}<span class="unit"> msg/s</span></div></div>
        <div class="card kpi"><div class="name">Lag</div><div class="value" style="color:${APM.lagBadgeColor(t.lag)};">${t.lag.toLocaleString()}</div></div>
      </div>

      <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Partition Lag 热图</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:14px;">
        ${partitionLags.map((v, i) => `<div title="P${i} · lag ${v.toLocaleString()}" style="display:flex;flex-direction:column;align-items:center;gap:2px;">
          <div style="width:36px;height:28px;background:${heatColor(v)};border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:10px;font-family:var(--mono);color:${v/maxLag>0.4?'white':'var(--text-1)'};font-weight:600;">${v > 999 ? (v/1000).toFixed(1)+'k' : v}</div>
          <div style="font-size:9px;color:var(--text-3);font-family:var(--mono);">P${i}</div>
        </div>`).join('')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
        <div>
          <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Producer (${producers.length})</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${producers.length === 0 ? '<span style="font-size:12px;color:var(--text-3);">无</span>' : producers.map(p => `<div class="chip" style="font-size:11.5px;justify-content:space-between;width:100%;"><span>${p.svc}</span><span class="mono">${p.rate} msg/s · err ${p.errPct.toFixed(2)}%</span></div>`).join('')}
          </div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Consumer (${consumers.length})</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${consumers.length === 0 ? '<span style="font-size:12px;color:var(--text-3);">无</span>' : consumers.map(c => `<div class="chip" style="font-size:11.5px;justify-content:space-between;width:100%;"><span>${c.svc} <span style="color:var(--text-3);">· ${c.group}</span></span><span class="mono" style="color:${APM.lagBadgeColor(c.lag)};">lag ${c.lag.toLocaleString()}</span></div>`).join('')}
          </div>
        </div>
      </div>

      <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">最新消息样本</div>
      <div class="card" style="padding:0;overflow:hidden;margin-bottom:14px;">
        <table class="tbl">
          <thead><tr><th style="padding-left:14px;">offset</th><th>P</th><th>key</th><th>value</th><th>ts</th></tr></thead>
          <tbody>${sampleMsgs.map(m => `<tr>
            <td style="padding-left:14px;" class="mono">${m.offset}</td>
            <td class="mono">${m.partition}</td>
            <td class="mono">${m.key}</td>
            <td class="mono" style="font-size:11px;color:var(--text-2);max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.value}</td>
            <td class="mono" style="color:var(--text-3);">${m.ts}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>

      <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">配置</div>
      <div style="display:grid;grid-template-columns: 160px 1fr; gap: 6px 12px; font-size:12.5px;">
        <div style="color:var(--text-3);">cleanup.policy</div><div class="mono">${t.cleanup}</div>
        <div style="color:var(--text-3);">retention.ms</div><div class="mono">${t.retention === 'compact' ? 'compact (∞)' : t.retention}</div>
        <div style="color:var(--text-3);">replication.factor</div><div class="mono">${t.replication}</div>
        <div style="color:var(--text-3);">min.insync.replicas</div><div class="mono">${t.replication - 1}</div>
        <div style="color:var(--text-3);">owner</div><div class="mono"><a class="link" onclick="APM.closeModal(this.closest('.modal-mask').id);APM.go('service',{id:'${t.owner}'})">${t.owner}</a></div>
      </div>
    `,
    footer: `<button class="pill" data-act="close">关闭</button><button class="pill" data-act="traces">查看 traces</button><button class="pill primary" data-act="alerts">配置告警</button>`
  }).el.addEventListener('click', (ev) => {
    const act = ev.target.dataset.act; if (!act) return;
    APM.closeModal(ev.currentTarget.id);
    if (act === 'traces') APM.go('traces', { topic: name });
    if (act === 'alerts') APM.go('alerts', { svcFilter: t.owner });
  });
};

// ---- Consumer Groups ----
APM.kafkaGroupsTable = function(preselect) {
  const list = APM._kafkaApplyClusterFilter(APM.kafkaGroups);
  return `<div class="card" style="padding:0;overflow:hidden;">
    ${APM._kafkaClusterFilterBar()}
    ${list.length === 0 ? '<div class="placeholder" style="margin:24px;"><div class="icon">🔍</div>当前过滤下无 group</div>' : `<table class="tbl">
      <thead><tr>
        <th style="padding-left:14px;">Group</th>
        <th style="width:120px;">集群</th>
        <th style="width:80px;">Members</th>
        <th>订阅 Topics</th>
        <th style="width:100px;">Lag</th>
        <th style="width:80px;">Δ Lag</th>
        <th style="width:100px;">Status</th>
        <th style="width:120px;">Rebalance · 1h</th>
        <th style="width:160px;text-align:right;">操作</th>
      </tr></thead>
      <tbody>${list.map(g => {
        const stColor = g.status === 'lag-rising' ? 'var(--danger)' : g.status === 'idle' ? 'var(--text-3)' : 'var(--success)';
        const dColor = g.lagDelta.startsWith('+') && parseInt(g.lagDelta,10) > 100 ? 'var(--danger)' : g.lagDelta.startsWith('-') ? 'var(--success)' : 'var(--text-3)';
        const cluster = APM.kafkaClusters.find(c=>c.id===g.clusterId);
        return `<tr class="clickable" onclick="APM.openKafkaGroupDetail('${g.name}')">
          <td style="padding-left:14px;font-weight:600;">${g.name}</td>
          <td>${cluster?`<a class="link" onclick="event.stopPropagation();APM.openKafkaClusterDetail('${cluster.id}')">${cluster.name}</a>`:'—'}</td>
          <td class="mono">${g.members}</td>
          <td>${g.topics.map(t => `<span class="chip" style="margin-right:4px;cursor:pointer;" onclick="event.stopPropagation();APM.openKafkaTopicDetail('${t}')">${t}</span>`).join('')}</td>
          <td><span class="badge" style="background:color-mix(in srgb, ${APM.lagBadgeColor(g.lag)} 18%, transparent);color:${APM.lagBadgeColor(g.lag)};font-family:var(--mono);">${g.lag.toLocaleString()}</span></td>
          <td class="mono" style="color:${dColor};font-weight:600;">${g.lagDelta}</td>
          <td><span style="color:${stColor};font-weight:600;font-size:12px;">${g.status === 'lag-rising' ? '● 落后' : g.status === 'idle' ? '○ 空闲' : '● 稳定'}</span></td>
          <td class="mono" style="color:${g.rebalances1h > 3 ? 'var(--warning)' : 'var(--text-3)'};">${g.rebalances1h} 次<div style="font-size:10.5px;color:var(--text-3);">最近 ${g.lastRebalance}</div></td>
          <td style="text-align:right;padding-right:14px;">
            <button class="pill" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();APM.openKafkaGroupDetail('${g.name}')">详情</button>
            <button class="pill" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();APM.openKafkaResetOffset('${g.name}')">重置 offset</button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table>`}
    ${preselect ? `<script>setTimeout(() => APM.openKafkaGroupDetail(${JSON.stringify(preselect)}), 50)</script>` : ''}
  </div>`;
};

APM.openKafkaGroupDetail = function(name) {
  const g = APM.kafkaGroups.find(x => x.name === name);
  if (!g) return;
  // Member assignment mock — distribute partitions of subscribed topics among members
  const allPartitions = g.topics.flatMap(tp => {
    const t = APM.kafkaTopics.find(x => x.name === tp);
    return t ? Array.from({length: t.partitions}, (_, i) => ({ topic: tp, partition: i })) : [];
  });
  const perMember = Math.ceil(allPartitions.length / Math.max(1, g.members));
  const members = Array.from({length: g.members}, (_, i) => ({
    id: `${g.name}-${i+1}`,
    host: `pod-${(i+1).toString().padStart(2,'0')}.${g.name.split('-')[0]}-svc.cluster.local`,
    parts: allPartitions.slice(i * perMember, (i+1) * perMember),
    rate: Math.floor((g.lag + 1000) / g.members + i * 20),
    p99: 28 + i * 6
  }));
  // Rebalance history
  const history = [
    { ts:'18:35:08', reason:'member added', dur:'2.1s' },
    { ts:'18:18:42', reason:'session timeout', dur:'4.8s' },
    { ts:'17:42:11', reason:'topic re-partition', dur:'1.6s' },
    { ts:'16:12:30', reason:'leader change', dur:'0.9s' }
  ].slice(0, g.rebalances1h + 2);

  APM.openModal({
    title: `Consumer Group · ${name}`,
    width: 760,
    body: `
      <div class="grid-4" style="margin-bottom:14px;">
        <div class="card kpi"><div class="name">Members</div><div class="value">${g.members}</div></div>
        <div class="card kpi"><div class="name">订阅 Topics</div><div class="value">${g.topics.length}</div></div>
        <div class="card kpi"><div class="name">Lag</div><div class="value" style="color:${APM.lagBadgeColor(g.lag)};">${g.lag.toLocaleString()}</div></div>
        <div class="card kpi"><div class="name">Rebalance · 1h</div><div class="value">${g.rebalances1h}</div></div>
      </div>

      <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Member 分配</div>
      <div class="card" style="padding:0;overflow:hidden;margin-bottom:14px;">
        <table class="tbl">
          <thead><tr><th style="padding-left:14px;">Member</th><th>Pod</th><th>分配 partitions</th><th>速率</th><th>P99</th></tr></thead>
          <tbody>${members.map(mem => `<tr>
            <td style="padding-left:14px;font-family:var(--mono);font-weight:600;">${mem.id}</td>
            <td class="mono" style="color:var(--text-3);font-size:11px;">${mem.host}</td>
            <td style="font-size:11px;">${mem.parts.slice(0, 6).map(p => `<span class="chip mono" style="font-size:10.5px;margin-right:3px;">${p.topic}#${p.partition}</span>`).join('')}${mem.parts.length > 6 ? `<span style="color:var(--text-3);">… +${mem.parts.length - 6}</span>` : ''}</td>
            <td class="mono">${mem.rate} msg/s</td>
            <td class="mono">${mem.p99}ms</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>

      <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Rebalance 历史</div>
      <div class="card" style="padding:0;overflow:hidden;">
        <table class="tbl">
          <thead><tr><th style="padding-left:14px;">时间</th><th>触发原因</th><th>耗时</th></tr></thead>
          <tbody>${history.map(h => `<tr>
            <td style="padding-left:14px;" class="mono">${h.ts}</td>
            <td>${h.reason}</td>
            <td class="mono">${h.dur}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    `,
    footer: `<button class="pill danger" data-act="reset">重置 offset</button><div style="flex:1;"></div><button class="pill" data-act="close">关闭</button><button class="pill primary" data-act="alerts">配置告警</button>`
  }).el.addEventListener('click', (ev) => {
    const act = ev.target.dataset.act; if (!act) return;
    if (act === 'reset') { APM.closeModal(ev.currentTarget.id); APM.openKafkaResetOffset(g.name); return; }
    APM.closeModal(ev.currentTarget.id);
    if (act === 'alerts') APM.go('alerts');
  });
};

APM.openKafkaResetOffset = function(groupName) {
  const m = APM.openModal({
    title: `重置 Offset · ${groupName}`,
    width: 460,
    body: `
      <div class="banner warn" style="margin-bottom:12px;"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg><div class="grow">此操作会立即生效 · 消费者会重新读取从新位点开始的消息，可能导致<strong>重复消费或漏消费</strong>。</div></div>
      ${APM.field('重置策略', APM.select('strategy', [
        {value:'latest', label:'latest（跳过堆积，从最新开始）'},
        {value:'earliest', label:'earliest（从最早开始）'},
        {value:'timestamp', label:'按时间点'},
        {value:'shift', label:'按相对偏移量（+/- N）'}
      ], 'latest'))}
      ${APM.field('参数（仅当策略为时间点 / 偏移量）', APM.input('arg', '', 'placeholder="2026-05-05T18:00:00Z 或 -1000"'))}
      ${APM.field('原因（写入审计日志）', APM.textarea('reason', '', 2))}
    `,
    footer: `<button class="pill" data-act="cancel">取消</button><button class="pill danger" data-act="ok">确认重置</button>`
  });
  m.el.querySelector('[data-act="cancel"]').onclick = () => m.close();
  m.el.querySelector('[data-act="ok"]').onclick = () => {
    const v = APM.modalForm(m.id);
    const g = APM.kafkaGroups.find(x => x.name === groupName);
    if (g) {
      if (v.strategy === 'latest') g.lag = 0;
      else if (v.strategy === 'earliest') g.lag = 99999;
      g.lagDelta = v.strategy === 'latest' ? '-' + g.lag : '+0';
      g.status = v.strategy === 'latest' ? 'idle' : 'stable';
    }
    APM.logAudit('kafka.group.reset', `${groupName} → ${v.strategy}${v.arg ? ' ' + v.arg : ''}`);
    m.close();
    APM.renderPage();
    APM.toast(`已重置 ${groupName} → ${v.strategy}`, 'success');
  };
};

// ---- Producer & Consumer tables ----
APM.kafkaProducersTable = function() {
  const list = APM._kafkaApplyClusterFilter(APM.kafkaProducers);
  return `<div class="card" style="padding:0;overflow:hidden;">
    ${APM._kafkaClusterFilterBar()}
    ${list.length===0?'<div class="placeholder" style="margin:24px;"><div class="icon">🔍</div>无 producer</div>':`<table class="tbl">
      <thead><tr><th style="padding-left:14px;">服务</th><th>集群</th><th>Topic</th><th>速率</th><th>错误率</th><th>P99 publish</th><th></th></tr></thead>
      <tbody>${list.map(p => {
        const cluster = APM.kafkaClusters.find(c=>c.id===p.clusterId);
        return `<tr class="clickable" onclick="APM.go('service',{id:'${p.svc}'})">
          <td style="padding-left:14px;"><a class="link">${p.svc}</a></td>
          <td>${cluster?`<a class="link" onclick="event.stopPropagation();APM.openKafkaClusterDetail('${cluster.id}')">${cluster.name}</a>`:'—'}</td>
          <td><span class="chip" style="cursor:pointer;" onclick="event.stopPropagation();APM.openKafkaTopicDetail('${p.topic}')">${p.topic}</span></td>
          <td class="mono">${p.rate} msg/s</td>
          <td class="mono" style="color:${p.errPct>0.1?'var(--warning)':p.errPct>0?'var(--text-2)':'var(--text-3)'};">${p.errPct.toFixed(2)}%</td>
          <td class="mono ${p.p99PubMs>20?'warn':''}">${p.p99PubMs}ms</td>
          <td style="text-align:right;padding-right:14px;"><button class="pill" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();APM.go('traces',{svcFilter:'${p.svc}',topic:'${p.topic}'})">Traces</button></td>
        </tr>`;
      }).join('')}</tbody>
    </table>`}
  </div>`;
};

APM.kafkaConsumersTable = function() {
  const list = APM._kafkaApplyClusterFilter(APM.kafkaConsumers);
  return `<div class="card" style="padding:0;overflow:hidden;">
    ${APM._kafkaClusterFilterBar()}
    ${list.length===0?'<div class="placeholder" style="margin:24px;"><div class="icon">🔍</div>无 consumer</div>':`<table class="tbl">
      <thead><tr><th style="padding-left:14px;">服务</th><th>集群</th><th>Group</th><th>Topic</th><th>速率</th><th>P99 consume</th><th>Lag</th><th></th></tr></thead>
      <tbody>${list.map(c => {
        const cluster = APM.kafkaClusters.find(x=>x.id===c.clusterId);
        return `<tr class="clickable" onclick="APM.go('service',{id:'${c.svc}'})">
          <td style="padding-left:14px;"><a class="link">${c.svc}</a></td>
          <td>${cluster?`<a class="link" onclick="event.stopPropagation();APM.openKafkaClusterDetail('${cluster.id}')">${cluster.name}</a>`:'—'}</td>
          <td><span class="chip" style="cursor:pointer;" onclick="event.stopPropagation();APM.openKafkaGroupDetail('${c.group}')">${c.group}</span></td>
          <td><span class="chip" style="cursor:pointer;" onclick="event.stopPropagation();APM.openKafkaTopicDetail('${c.topic}')">${c.topic}</span></td>
          <td class="mono">${c.rate} msg/s</td>
          <td class="mono ${c.p99ConMs>50?'warn':''}">${c.p99ConMs}ms</td>
          <td><span class="badge" style="background:color-mix(in srgb, ${APM.lagBadgeColor(c.lag)} 18%, transparent);color:${APM.lagBadgeColor(c.lag)};font-family:var(--mono);">${c.lag.toLocaleString()}</span></td>
          <td style="text-align:right;padding-right:14px;"><button class="pill" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();APM.go('traces',{svcFilter:'${c.svc}',topic:'${c.topic}'})">Traces</button></td>
        </tr>`;
      }).join('')}</tbody>
    </table>`}
  </div>`;
};

// ---- Broker panel (per-cluster) ----
APM.kafkaClusterPanel = function() {
  const brokers = APM._kafkaApplyClusterFilter(APM.kafkaBrokers);
  // Group brokers by cluster
  const byCluster = {};
  brokers.forEach(b => { (byCluster[b.clusterId] = byCluster[b.clusterId] || []).push(b); });
  return `<div class="card" style="padding:0;overflow:hidden;">
    ${APM._kafkaClusterFilterBar()}
    <div style="padding:14px;">
      ${Object.keys(byCluster).map(cid => {
        const cluster = APM.kafkaClusters.find(c=>c.id===cid);
        return `<div style="margin-bottom:18px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
            <span class="cc-type-badge type-badge-kafka">Kafka</span>
            <strong style="font-size:13px;">${cluster?cluster.name:cid}</strong>
            <span style="font-size:11px;color:var(--text-3);">v${cluster?cluster.version:'?'}</span>
            <a class="link" style="margin-left:auto;font-size:11.5px;cursor:pointer;" onclick="APM.openKafkaClusterDetail('${cid}')">集群详情 →</a>
          </div>
          <div class="grid-3">
            ${byCluster[cid].map(b => `<div class="card">
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="width:6px;height:24px;border-radius:3px;background:${b.status==='warn'?'var(--warning)':'var(--success)'};"></div>
                <strong>broker-${b.id}</strong>
                ${b.controller ? '<span class="badge purple" style="font-size:10px;">controller</span>' : ''}
                <span style="margin-left:auto;font-size:11px;color:var(--text-3);">${b.status === 'warn' ? '● 警示' : '● 正常'}</span>
              </div>
              <div class="mono" style="font-size:11.5px;color:var(--text-3);margin-top:4px;">${b.host}</div>
              <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px;">
                <div><div style="font-size:11px;color:var(--text-3);">ISR / leader</div><div style="font-size:18px;font-weight:600;">${b.isr} / ${b.leader}</div></div>
                <div><div style="font-size:11px;color:var(--text-3);">磁盘</div><div style="font-size:18px;font-weight:600;color:${b.diskPct>80?'var(--danger)':b.diskPct>70?'var(--warning)':'var(--text-1)'};">${b.diskPct}%</div></div>
              </div>
              <div class="bar" style="margin-top:8px;height:5px;"><span style="width:${b.diskPct}%;background:${b.diskPct>80?'var(--danger)':b.diskPct>70?'var(--warning)':'var(--accent)'};"></span></div>
              <div style="display:flex;gap:14px;margin-top:10px;font-size:11.5px;color:var(--text-2);">
                <span><span style="color:var(--text-3);">net in</span> <strong>${b.netInMB.toFixed(1)} MB/s</strong></span>
                <span><span style="color:var(--text-3);">net out</span> <strong>${b.netOutMB.toFixed(1)} MB/s</strong></span>
              </div>
            </div>`).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
};
