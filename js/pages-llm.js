// ============================================================
// LLM / GenAI Observability Module
// ============================================================

APM.llmTab = APM.llmTab || 'overview'; // overview | calls | models | cost | rag
APM.llmModelFilter = APM.llmModelFilter || 'all';
APM.llmStatusFilter = APM.llmStatusFilter || 'all';

APM.openLLMBudget = function() {
  const cur = APM.llmBudget || { monthly: 2500, threshold: 80, channels: ['email'] };
  const m = APM.openModal({
    title: '配置 LLM 预算告警',
    width: 480,
    body: `
      <div class="form-grid-2">
        ${APM.field('月度预算 ($)', APM.input('monthly', cur.monthly, 'type="number" min="0"'))}
        ${APM.field('告警阈值 (%)', APM.input('threshold', cur.threshold, 'type="number" min="1" max="200"'))}
      </div>
      ${APM.field('通知渠道', `
        <div style="display:flex;gap:14px;font-size:12.5px;">
          <label><input type="checkbox" data-field="ch_email" ${cur.channels.includes('email')?'checked':''}> 邮件</label>
          <label><input type="checkbox" data-field="ch_slack" ${cur.channels.includes('slack')?'checked':''}> Slack</label>
          <label><input type="checkbox" data-field="ch_lark" ${cur.channels.includes('lark')?'checked':''}> 飞书</label>
        </div>
      `)}
      <div class="form-help">达到阈值后会立即通知 · 超出预算后会同时触发 P1 告警。</div>
    `,
    footer: `<button class="pill" data-act="cancel">取消</button><button class="pill primary" data-act="ok">保存</button>`
  });
  m.el.querySelector('[data-act="cancel"]').onclick = () => m.close();
  m.el.querySelector('[data-act="ok"]').onclick = () => {
    const v = APM.modalForm(m.id);
    const channels = ['email','slack','lark'].filter(k => v['ch_'+k]);
    APM.llmBudget = { monthly: parseFloat(v.monthly) || cur.monthly, threshold: parseInt(v.threshold,10) || cur.threshold, channels };
    APM.logAudit('llm.budget.update', `$${APM.llmBudget.monthly} @ ${APM.llmBudget.threshold}%`);
    m.close();
    APM.toast(`预算告警已保存 · $${APM.llmBudget.monthly} / 月 · 阈值 ${APM.llmBudget.threshold}%`, 'success');
  };
};

APM.openLLMCostBreakdown = function(kind, key, calls, cost, role) {
  const split = [
    ['gpt-4o', 0.42, '#10a37f'],
    ['claude-3.5-sonnet', 0.34, '#cc785c'],
    ['claude-3.5-haiku', 0.16, '#cc785c'],
    ['gpt-4o-mini', 0.08, '#10a37f']
  ];
  APM.openModal({
    title: kind === 'service' ? `${key} · 成本明细` : `用户 ${key} · 成本明细 (${role || ''})`,
    width: 540,
    body: `
      <div class="grid-4" style="margin-bottom:14px;">
        <div class="card kpi"><div class="name">调用</div><div class="value">${calls.toLocaleString()}</div></div>
        <div class="card kpi"><div class="name">$ / h</div><div class="value" style="color:var(--warning);">${APM.llmFmt$(cost)}</div></div>
        <div class="card kpi"><div class="name">$ / 调用</div><div class="value">${APM.llmFmt$(cost / calls)}</div></div>
        <div class="card kpi"><div class="name">推算 $ / 月</div><div class="value">${APM.llmFmt$(cost * 24 * 30)}</div></div>
      </div>
      <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">按模型分布</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${split.map(([m, p, c]) => `<div style="display:flex;align-items:center;gap:8px;font-size:12.5px;">
          <span style="width:140px;">${m}</span>
          <div style="flex:1;height:6px;background:var(--bg-elev-1);border-radius:3px;"><div style="width:${p*100}%;height:100%;background:${c};border-radius:3px;"></div></div>
          <span class="mono" style="width:60px;text-align:right;">${APM.llmFmt$(cost*p)}</span>
        </div>`).join('')}
      </div>
    `,
    footer: `<button class="pill" data-act="close" onclick="APM.closeModal(this.closest('.modal-mask').id)">关闭</button>${kind==='service'?`<button class="pill primary" data-act="traces" onclick="APM.closeModal(this.closest('.modal-mask').id);APM.go('traces',{svcFilter:'${key}'})">查看 traces</button>`:''}`
  });
};

// ---------------- Mock data ----------------
APM.llmModels = [
  { id: 'gpt-4o', provider: 'openai', name: 'gpt-4o', inPrice: 2.5, outPrice: 10.0, calls: 18420, errPct: 0.42, p95: 1820, ttft: 410, $h: 11.84 },
  { id: 'gpt-4o-mini', provider: 'openai', name: 'gpt-4o-mini', inPrice: 0.15, outPrice: 0.6, calls: 86310, errPct: 0.18, p95: 920, ttft: 180, $h: 3.21 },
  { id: 'claude-3-5-sonnet', provider: 'anthropic', name: 'claude-3-5-sonnet', inPrice: 3.0, outPrice: 15.0, calls: 24180, errPct: 0.31, p95: 2140, ttft: 520, $h: 18.42 },
  { id: 'claude-3-5-haiku', provider: 'anthropic', name: 'claude-3-5-haiku', inPrice: 0.8, outPrice: 4.0, calls: 41200, errPct: 0.22, p95: 1240, ttft: 290, $h: 6.18 },
  { id: 'qwen2.5-72b', provider: 'aliyun', name: 'qwen2.5-72b', inPrice: 0.4, outPrice: 1.2, calls: 8920, errPct: 1.84, p95: 3210, ttft: 680, $h: 1.92 },
  { id: 'text-embedding-3-small', provider: 'openai', name: 'text-embedding-3-small', inPrice: 0.02, outPrice: 0, calls: 142800, errPct: 0.04, p95: 110, ttft: 0, $h: 0.84, kind: 'embedding' }
];

APM.llmCalls = (() => {
  const arr = [];
  const models = ['gpt-4o-mini','gpt-4o','claude-3-5-sonnet','claude-3-5-haiku','qwen2.5-72b'];
  const ops = ['chat.completion','chat.completion','chat.completion','embedding','tool_call'];
  const services = ['eshop-rag','customer-support-bot','content-mod','search-rerank','copilot-api'];
  const users = ['u_8842','u_3201','u_9920','u_1014','u_7701','u_4488'];
  const prompts = [
    '帮我总结这份订单的退款风险',
    '用户问：我的快递为什么还没到？',
    '检索 RAG 文档：跨境支付合规要求',
    '将以下英文邮件翻译为中文并标注情绪',
    '生成 SQL：查询本月 GMV TOP10 商家',
    '判断这条评论是否违规并给出理由',
    '基于 user_id=8842 的历史订单推荐商品'
  ];
  for (let i=0;i<48;i++) {
    const m = models[i%models.length];
    const isErr = i % 17 === 3;
    const isSlow = i % 11 === 2;
    const inT = 200 + Math.floor(Math.random()*1800);
    const outT = m.includes('embedding') ? 0 : 80 + Math.floor(Math.random()*900);
    const model = APM.llmModels.find(x => x.id === m) || APM.llmModels[0];
    const cost = (inT/1e6 * model.inPrice) + (outT/1e6 * model.outPrice);
    arr.push({
      id: 'llm-' + (1000 + i),
      ts: Date.now() - i*73000 - Math.floor(Math.random()*30000),
      model: m,
      provider: model.provider,
      op: ops[i%ops.length],
      service: services[i%services.length],
      user: users[i%users.length],
      prompt: prompts[i%prompts.length],
      completion: isErr ? null : '（响应已截断…）这是一段示例的模型输出，包含答案和必要的格式化结构。',
      inTokens: inT,
      outTokens: outT,
      totalTokens: inT + outT,
      cost: +cost.toFixed(5),
      latency: isSlow ? 3200 + Math.floor(Math.random()*1500) : 280 + Math.floor(Math.random()*1200),
      ttft: m.includes('embedding') ? 0 : 120 + Math.floor(Math.random()*420),
      status: isErr ? 'error' : (isSlow ? 'slow' : 'ok'),
      errCode: isErr ? (i%2 ? 'rate_limit' : 'context_length_exceeded') : null,
      traceId: '7a' + Math.random().toString(16).slice(2, 14),
      temperature: 0.7,
      finish: isErr ? 'error' : (Math.random() < 0.1 ? 'length' : 'stop')
    });
  }
  return arr;
})();

APM.llmTimeseries = (key, n=60) => {
  const out = []; let v = 100;
  for (let i=0;i<n;i++) {
    v += (Math.random()-0.5) * 8;
    if (key === 'cost') v = Math.max(20, v + Math.sin(i/8)*4);
    if (key === 'tokens') v = Math.max(50, v + (i===30? 80:0));
    if (key === 'latency') v = Math.max(60, v + (i>40 && i<48 ? 25 : 0));
    if (key === 'err') v = Math.max(0, 0.2 + Math.sin(i/4)*0.15 + (i>38&&i<46? 1.8 : 0));
    out.push(Math.max(0, v));
  }
  return out;
};

// ---------------- Helpers ----------------
APM.llmFmt$ = v => '$' + (v < 0.01 ? v.toFixed(5) : v < 1 ? v.toFixed(3) : v.toFixed(2));
APM.llmFmtTokens = v => v >= 1000 ? (v/1000).toFixed(1)+'k' : v;
APM.llmStatusBadge = s => {
  const map = { ok:['var(--success)','正常'], slow:['var(--warning)','慢'], error:['var(--danger)','错误'] };
  const [c,l] = map[s];
  return `<span class="badge" style="color:${c};border-color:${c};background:transparent;">${l}</span>`;
};
APM.llmProviderColor = p => ({ openai:'#10a37f', anthropic:'#cc785c', aliyun:'#ff6a00' }[p] || 'var(--text-3)');

// ---------------- Page entry ----------------
APM.renderLLM = function() {
  const tabs = [
    { id: 'overview', label: '概览', count: null },
    { id: 'calls', label: '调用记录', count: APM.llmCalls.length },
    { id: 'models', label: '模型对比', count: APM.llmModels.length },
    { id: 'cost', label: '成本归因', count: null },
    { id: 'rag', label: 'RAG 检索', count: null }
  ];
  return `
    <div class="page-head">
      <div>
        <div class="crumbs"><span>分析</span><span class="crumbs-sep">/</span><span>LLM / GenAI</span></div>
        <h1>LLM 可观测</h1>
        <div class="page-sub">基于 OpenTelemetry GenAI 语义约定 · 已接入 <strong>5</strong> 个模型，<strong>${APM.llmCalls.length}</strong> 次调用 (近 1h)</div>
      </div>
      <div class="page-actions">
        <button class="pill" onclick="APM.openOtelGenAIDocs()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>OTel GenAI 文档</button>
        <button class="pill" onclick="APM.llmTab='calls';APM.renderPage()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h4l3-9 4 18 3-9h4"/></svg>查看 LLM Traces</button>
        <button class="pill primary" onclick="APM.openLLMOnboard()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>接入新模型</button>
      </div>
    </div>
    <div class="subtabs">
      ${tabs.map(t => `<div class="subtab ${APM.llmTab===t.id?'active':''}" onclick="APM.llmTab='${t.id}';APM.renderPage()">${t.label}${t.count!==null?` <span class="pill-mini">${t.count}</span>`:''}</div>`).join('')}
    </div>
    <div class="tab-body">${
      APM.llmTab==='overview' ? APM.llmOverview() :
      APM.llmTab==='calls' ? APM.llmCallsList() :
      APM.llmTab==='models' ? APM.llmModelCompare() :
      APM.llmTab==='cost' ? APM.llmCostAttribution() :
      APM.llmRagPage()
    }</div>
  `;
};

// ---------------- Overview ----------------
APM.llmOverview = function() {
  const totalCalls = APM.llmModels.reduce((a,b)=>a+b.calls,0);
  const totalCost = APM.llmModels.reduce((a,b)=>a+b.$h,0);
  const errAvg = (APM.llmModels.reduce((a,b)=>a+b.errPct*b.calls,0)/totalCalls).toFixed(2);
  const totalTokens = APM.llmCalls.reduce((a,b)=>a+b.totalTokens,0);
  const kpis = [
    { label: '调用 / h', value: totalCalls.toLocaleString(), delta: '+12%', color:'var(--accent)' },
    { label: 'Token / h', value: '8.42M', delta: '+18%', color:'var(--accent)' },
    { label: '$ / h', value: APM.llmFmt$(totalCost), delta: '+22%', color:'var(--warning)', deltaColor:'var(--warning)' },
    { label: '平均 P95', value: '1.42s', delta: '+8%', color:'var(--text-1)' },
    { label: '错误率', value: errAvg+'%', delta: '+0.04', color:'var(--danger)' },
    { label: 'TTFT 中位', value: '290ms', delta: '−12ms', color:'var(--success)' }
  ];
  const series = {
    cost: APM.llmTimeseries('cost'),
    tokens: APM.llmTimeseries('tokens'),
    latency: APM.llmTimeseries('latency'),
    err: APM.llmTimeseries('err')
  };
  return `
    <div class="kpi-row" style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:14px;">
      ${kpis.map(k=>`<div class="card" style="padding:14px;">
        <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;">${k.label}</div>
        <div style="font-size:24px;font-weight:700;color:${k.color};margin-top:6px;">${k.value}</div>
        <div style="font-size:11px;color:${k.deltaColor||'var(--text-3)'};margin-top:2px;">${k.delta} vs 1h ago</div>
      </div>`).join('')}
    </div>
    <div class="grid-2" style="gap:14px;">
      <div class="card"><div class="card-title">Token 用量</div>
        ${APM.sparkline(series.tokens, 'var(--accent)', 580, 140)}
        <div style="font-size:11px;color:var(--text-3);margin-top:8px;">输入 5.8M · 输出 2.6M · 嵌入 14.3M</div>
      </div>
      <div class="card"><div class="card-title">$ / 时序（按模型堆叠）</div>
        ${APM.sparkline(series.cost, 'var(--warning)', 580, 140)}
        <div style="font-size:11px;color:var(--text-3);margin-top:8px;">claude-3.5-sonnet 占 44% · gpt-4o 占 28%</div>
      </div>
      <div class="card"><div class="card-title">P95 延迟</div>
        ${APM.sparkline(series.latency, 'var(--purple)', 580, 140)}
        <div style="font-size:11px;color:var(--text-3);margin-top:8px;">18:35 起 claude-3.5-sonnet TTFT 上升至 1.2s</div>
      </div>
      <div class="card"><div class="card-title">错误率（含 rate_limit / ctx_overflow）</div>
        ${APM.sparkline(series.err, 'var(--danger)', 580, 140)}
        <div style="font-size:11px;color:var(--text-3);margin-top:8px;">qwen2.5-72b 在 18:42 触发 5 次 rate_limit</div>
      </div>
    </div>
    <div class="card" style="margin-top:14px;">
      <div class="card-title">Top 模型 · 近 1h</div>
      <table class="data-table" style="margin-top:8px;">
        <thead><tr><th>模型</th><th class="num">调用</th><th class="num">P95</th><th class="num">TTFT</th><th class="num">错误率</th><th class="num">$/h</th><th>趋势</th></tr></thead>
        <tbody>
          ${APM.llmModels.map(m=>`<tr style="cursor:pointer;" onclick="APM.llmTab='models';APM.renderPage()">
            <td><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${APM.llmProviderColor(m.provider)};margin-right:6px;vertical-align:middle;"></span><strong>${m.name}</strong> <span style="color:var(--text-3);font-size:11px;">${m.provider}</span></td>
            <td class="num mono">${m.calls.toLocaleString()}</td>
            <td class="num mono">${m.p95}ms</td>
            <td class="num mono">${m.ttft||'-'}${m.ttft?'ms':''}</td>
            <td class="num mono" style="color:${m.errPct>1?'var(--danger)':m.errPct>0.4?'var(--warning)':'var(--text-2)'}">${m.errPct.toFixed(2)}%</td>
            <td class="num mono" style="color:var(--warning)">${APM.llmFmt$(m.$h)}</td>
            <td>${APM.sparkline(APM.llmTimeseries(m.id, 30), APM.llmProviderColor(m.provider), 120, 28)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
};

// ---------------- Calls list ----------------
APM.llmCallsList = function() {
  const calls = APM.llmCalls.filter(c =>
    (APM.llmModelFilter==='all' || c.model===APM.llmModelFilter) &&
    (APM.llmStatusFilter==='all' || c.status===APM.llmStatusFilter)
  );
  const fmtAgo = ts => { const s = Math.floor((Date.now()-ts)/1000); return s<60?s+'s前':Math.floor(s/60)+'m前'; };
  return `
    <div class="banner info" style="margin-bottom:14px;">
      <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h4l3-9 4 18 3-9h4"/></svg>
      <span class="grow"><strong>LLM 调用 = LLM Trace。</strong>每条记录都是 OTel trace 中标记 <code class="mono">gen_ai.system</code> 的 span。点击行查看完整链路（含上下游 HTTP / DB / 向量库 span），或在 Traces 页用 TraceQL <code class="mono">{ span.gen_ai.system != "" }</code> 全局检索。</span>
      <button class="pill" onclick="APM.go('traces')">前往 Traces 页 →</button>
    </div>
    <div class="filters" style="display:flex;gap:8px;margin-bottom:12px;align-items:center;flex-wrap:wrap;">
      <span style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;">筛选</span>
      <select class="pill" onchange="APM.llmModelFilter=this.value;APM.renderPage()">
        <option value="all" ${APM.llmModelFilter==='all'?'selected':''}>全部模型</option>
        ${APM.llmModels.map(m=>`<option value="${m.id}" ${APM.llmModelFilter===m.id?'selected':''}>${m.name}</option>`).join('')}
      </select>
      ${['all','ok','slow','error'].map(s=>`<button class="pill ${APM.llmStatusFilter===s?'primary':''}" onclick="APM.llmStatusFilter='${s}';APM.renderPage()">${s==='all'?'全部':s==='ok'?'正常':s==='slow'?'慢':'错误'}</button>`).join('')}
      <span style="margin-left:auto;font-size:11px;color:var(--text-3);">${calls.length} / ${APM.llmCalls.length} 条</span>
    </div>
    <div class="card" style="padding:0;overflow:hidden;">
      <table class="data-table">
        <thead><tr><th>时间</th><th>模型 / 操作</th><th>服务</th><th>用户</th><th>Prompt 摘要</th><th class="num">Token in/out</th><th class="num">延迟 / TTFT</th><th class="num">$ Cost</th><th>状态</th><th></th></tr></thead>
        <tbody>
          ${calls.slice(0,30).map(c=>`<tr style="cursor:pointer;" onclick="APM.openLLMCall('${c.id}')">
            <td class="mono" style="font-size:11px;color:var(--text-3);">${fmtAgo(c.ts)}</td>
            <td><strong style="font-size:12px;">${c.model}</strong><div style="font-size:10.5px;color:var(--text-3);">${c.op}</div></td>
            <td><span class="badge" style="font-size:10px;">${c.service}</span></td>
            <td class="mono" style="font-size:11px;color:var(--text-2);">${c.user}</td>
            <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-2);font-size:12px;">${c.prompt}</td>
            <td class="num mono" style="font-size:11px;">${APM.llmFmtTokens(c.inTokens)}<span style="color:var(--text-3);"> / </span>${APM.llmFmtTokens(c.outTokens)}</td>
            <td class="num mono" style="font-size:11px;color:${c.latency>2000?'var(--danger)':c.latency>1200?'var(--warning)':'var(--text-2)'}">${c.latency}ms<div style="font-size:10px;color:var(--text-3);">TTFT ${c.ttft}ms</div></td>
            <td class="num mono" style="font-size:11px;color:var(--warning)">${APM.llmFmt$(c.cost)}</td>
            <td>${APM.llmStatusBadge(c.status)}${c.errCode?`<div style="font-size:10px;color:var(--danger);margin-top:2px;">${c.errCode}</div>`:''}</td>
            <td><span style="color:var(--text-3);">→</span></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
};

// ---------------- Call detail drawer ----------------
APM.openLLMCall = function(id) {
  const c = APM.llmCalls.find(x => x.id === id); if (!c) return;
  const drawer = document.createElement('div');
  drawer.className = 'drawer-overlay';
  drawer.innerHTML = `
    <div class="drawer" style="width:760px;">
      <div class="drawer-head">
        <div>
          <div style="font-size:11px;color:var(--text-3);">LLM 调用 · ${c.id}</div>
          <h2 style="margin:4px 0 0;display:flex;align-items:center;gap:10px;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${APM.llmProviderColor(c.provider)};"></span>
            ${c.model}
            ${APM.llmStatusBadge(c.status)}
            <span class="badge" style="font-size:10px;">${c.op}</span>
          </h2>
          <div style="font-size:11.5px;color:var(--text-3);margin-top:6px;">
            <span class="mono">trace ${c.traceId}</span> ·
            service <strong>${c.service}</strong> ·
            user <strong>${c.user}</strong> ·
            ${new Date(c.ts).toLocaleTimeString()}
          </div>
        </div>
        <button class="icon-btn" onclick="this.closest('.drawer-overlay').remove()">✕</button>
      </div>
      <div class="drawer-body">
        <div class="kpi-row" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;">
          <div class="card" style="padding:10px;"><div style="font-size:10px;color:var(--text-3);">输入 Token</div><div style="font-size:18px;font-weight:700;">${c.inTokens}</div></div>
          <div class="card" style="padding:10px;"><div style="font-size:10px;color:var(--text-3);">输出 Token</div><div style="font-size:18px;font-weight:700;">${c.outTokens}</div></div>
          <div class="card" style="padding:10px;"><div style="font-size:10px;color:var(--text-3);">延迟 / TTFT</div><div style="font-size:18px;font-weight:700;">${c.latency}ms</div><div style="font-size:10px;color:var(--text-3);">TTFT ${c.ttft}ms · TPOT ${c.outTokens?Math.round((c.latency-c.ttft)/c.outTokens):0}ms</div></div>
          <div class="card" style="padding:10px;"><div style="font-size:10px;color:var(--text-3);">成本</div><div style="font-size:18px;font-weight:700;color:var(--warning);">${APM.llmFmt$(c.cost)}</div><div style="font-size:10px;color:var(--text-3);">finish: ${c.finish}</div></div>
        </div>

        <div class="card" style="margin-bottom:12px;">
          <div class="card-title">Prompt</div>
          <pre style="background:var(--bg-elev-1);padding:12px;border-radius:6px;font-size:12px;color:var(--text-1);white-space:pre-wrap;margin:8px 0 0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${c.prompt}\n\n[完整对话 ${c.inTokens} tokens, 含 system prompt + 3 轮历史，已脱敏]</pre>
        </div>

        <div class="card" style="margin-bottom:12px;">
          <div class="card-title">Completion</div>
          ${c.completion ? `<pre style="background:var(--bg-elev-1);padding:12px;border-radius:6px;font-size:12px;color:var(--text-1);white-space:pre-wrap;margin:8px 0 0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${c.completion}</pre>` :
            `<div class="banner danger" style="margin-top:8px;"><strong>调用失败：${c.errCode}</strong>&nbsp;&nbsp;无 completion 输出。建议检查 rate-limit 配额或上下文长度。</div>`}
        </div>

        <div class="card" style="margin-bottom:12px;">
          <div class="card-title">Trace 链路（上下游 span）</div>
          <div style="margin-top:10px;">
            ${[
              ['HTTP POST /api/chat', 1820, 0, 'var(--accent)'],
              [' └─ retrieve_context (qdrant.search)', 142, 30, 'var(--purple)'],
              [' └─ rerank (text-embedding-3-small)', 88, 200, 'var(--purple)'],
              ` └─ ${c.model} (${c.op})`+'§§'+c.latency+'§§'+320+'§§var(--accent)',
              [' └─ tool_call: lookup_order_db', 76, 1180, 'var(--success)']
            ].map(row => {
              const [lbl,ms,off,col] = typeof row === 'string' ? row.split('§§').map((v,i)=>i===1||i===2?+v:v) : row;
              const w = Math.max(2, ms/22);
              return `<div style="display:flex;align-items:center;gap:10px;font-size:11.5px;font-family:ui-monospace,monospace;color:var(--text-2);padding:3px 0;">
                <span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${lbl}</span>
                <span style="width:380px;height:14px;background:var(--bg-elev-1);position:relative;border-radius:2px;">
                  <span style="position:absolute;left:${off/4}px;top:0;height:100%;width:${w}px;background:${col};border-radius:2px;"></span>
                </span>
                <span class="mono" style="width:60px;text-align:right;">${ms}ms</span>
              </div>`;
            }).join('')}
          </div>
        </div>

        <div class="grid-2">
          <div class="card"><div class="card-title">GenAI 属性</div>
            <table class="kv" style="margin-top:8px;font-size:11.5px;">
              ${[
                ['gen_ai.system', c.provider],
                ['gen_ai.request.model', c.model],
                ['gen_ai.request.temperature', c.temperature],
                ['gen_ai.request.max_tokens', 2048],
                ['gen_ai.usage.input_tokens', c.inTokens],
                ['gen_ai.usage.output_tokens', c.outTokens],
                ['gen_ai.response.finish_reasons', `["${c.finish}"]`],
                ['gen_ai.operation.name', c.op]
              ].map(([k,v])=>`<tr><td class="mono" style="color:var(--text-3);padding:3px 12px 3px 0;">${k}</td><td class="mono">${v}</td></tr>`).join('')}
            </table>
          </div>
          <div class="card"><div class="card-title">Token 拆解</div>
            <div style="margin-top:10px;display:flex;height:24px;border-radius:4px;overflow:hidden;">
              <div style="flex:${Math.floor(c.inTokens*0.3)};background:#3b82f6;" title="system"></div>
              <div style="flex:${Math.floor(c.inTokens*0.5)};background:#8b5cf6;" title="history"></div>
              <div style="flex:${Math.floor(c.inTokens*0.2)};background:#06b6d4;" title="user"></div>
              <div style="flex:${c.outTokens||1};background:#10b981;" title="completion"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--text-3);margin-top:6px;">
              <span><span style="color:#3b82f6;">●</span> system</span>
              <span><span style="color:#8b5cf6;">●</span> history</span>
              <span><span style="color:#06b6d4;">●</span> user</span>
              <span><span style="color:#10b981;">●</span> completion</span>
            </div>
            <div style="margin-top:14px;font-size:11.5px;color:var(--text-2);">
              <div>累计 token / 用户：<strong>184k</strong> · 累计花费：<strong style="color:var(--warning);">$2.18</strong> (今日)</div>
              <div style="color:var(--text-3);margin-top:4px;">超过 P95 阈值 (160k) — 建议启用 prompt 压缩</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  drawer.onclick = e => { if (e.target === drawer) drawer.remove(); };
  document.body.appendChild(drawer);
};

// ---------------- Model compare ----------------
APM.llmModelCompare = function() {
  // scatter: x=cost($/1k tok output), y=p95 latency, r=calls
  // Pad inner padding so largest bubbles + labels never clip the chart edges.
  const w = 760, h = 380, padL = 64, padB = 56, padT = 36, padR = 130; // padR reserves room for legend
  const maxCostRaw = Math.max(...APM.llmModels.map(m => m.outPrice));
  const maxLatRaw  = Math.max(...APM.llmModels.map(m => m.p95));
  const maxCalls   = Math.max(...APM.llmModels.map(m => m.calls));
  // 12% headroom on both axes so nothing sits on the edge.
  const maxCost = maxCostRaw * 1.12;
  const maxLat  = maxLatRaw * 1.12;
  // Smaller max bubble radius (was 28, now 18) — keeps labels from overlapping.
  const rOf = (calls) => 5 + Math.sqrt(calls / maxCalls) * 13;
  // Pre-compute positions, then collision-resolve labels (place above by default,
  // flip below when within 22px of top, and shift right when bubble is at left edge).
  const placed = APM.llmModels.map(m => {
    const cx = padL + (m.outPrice / maxCost) * (w - padL - padR);
    const cy = h - padB - (m.p95 / maxLat) * (h - padT - padB);
    const r = rOf(m.calls);
    return { m, cx, cy, r };
  });
  // sort by cy ascending so we anchor labels relative to neighbors
  const labelEls = placed.map(({m, cx, cy, r}) => {
    const above = cy - r - 6 > padT + 12;
    const ly = above ? cy - r - 6 : cy + r + 14;
    const anchor = cx < padL + 60 ? 'start' : (cx > w - padR - 60 ? 'end' : 'middle');
    const lx = anchor === 'start' ? cx - r - 4 : anchor === 'end' ? cx + r + 4 : cx;
    return `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" font-size="11" fill="var(--text-1)" font-weight="600" paint-order="stroke" stroke="var(--bg-elev-0)" stroke-width="3">${m.name}</text>`;
  }).join('');
  // Provider legend chips
  const providers = [...new Set(APM.llmModels.map(m => m.provider))];
  // Identify "ideal" (left-bottom quadrant) for highlighting
  const sweetSpot = placed.find(p => p.m.outPrice < maxCostRaw * 0.5 && p.m.p95 < maxLatRaw * 0.5 && p.m.errPct < 0.5);
  return `
    <div class="banner info" style="margin-bottom:14px;">
      <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
      <span class="grow">在<strong>成本 × 延迟</strong>二维上对比模型，气泡大小 = 调用量。理想模型靠近左下角（便宜+快）${sweetSpot ? ` · 当前甜点：<strong style="color:var(--success);">${sweetSpot.m.name}</strong>` : ''}。</span>
    </div>
    <div class="card">
      <div class="card-title"><span>模型散点：成本 ($/M tok 输出) × P95 延迟</span><span class="hint">气泡 = 调用量</span></div>
      <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block;margin-top:10px;">
        <!-- ideal-quadrant background: bottom-left = low cost + low latency -->
        <rect x="${padL}" y="${(h-padB - (h-padT-padB)*0.5).toFixed(0)}" width="${((w-padL-padR)*0.5).toFixed(0)}" height="${((h-padT-padB)*0.5).toFixed(0)}" fill="color-mix(in srgb, var(--success) 8%, transparent)"/>
        <text x="${padL+8}" y="${(h-padB - 6).toFixed(0)}" font-size="10" fill="var(--success)" font-weight="600">理想区</text>

        <!-- axes -->
        <line x1="${padL}" y1="${h-padB}" x2="${w-padR}" y2="${h-padB}" stroke="var(--border-strong)"/>
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${h-padB}" stroke="var(--border-strong)"/>

        <!-- gridlines + tick labels -->
        ${[0,0.25,0.5,0.75,1].map(t => {
          const x = padL + t*(w-padL-padR);
          const y = h-padB - t*(h-padT-padB);
          return `<g>
            <line x1="${padL}" y1="${y}" x2="${w-padR}" y2="${y}" stroke="var(--border)" stroke-dasharray="2 3" opacity=".4"/>
            <text x="${padL-8}" y="${(y+3).toFixed(0)}" text-anchor="end" font-size="10" fill="var(--text-3)" font-family="SF Mono">${Math.round(maxLat*t)}ms</text>
            <line x1="${x}" y1="${padT}" x2="${x}" y2="${h-padB}" stroke="var(--border)" stroke-dasharray="2 3" opacity=".4"/>
            <text x="${x}" y="${h-padB+14}" text-anchor="middle" font-size="10" fill="var(--text-3)" font-family="SF Mono">$${(maxCost*t).toFixed(1)}</text>
          </g>`;
        }).join('')}

        <!-- bubbles -->
        ${placed.map(({m, cx, cy, r}) => `<g>
            <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${APM.llmProviderColor(m.provider)}" opacity="0.45"/>
            <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${APM.llmProviderColor(m.provider)}" stroke-width="1.6"/>
          </g>`).join('')}
        ${labelEls}

        <!-- axis labels -->
        <text x="${(padL + (w-padL-padR)/2).toFixed(0)}" y="${h-12}" text-anchor="middle" font-size="11" fill="var(--text-2)">输出价格 ($/M tokens) →</text>
        <text x="16" y="${(padT + (h-padT-padB)/2).toFixed(0)}" text-anchor="middle" font-size="11" fill="var(--text-2)" transform="rotate(-90 16 ${(padT + (h-padT-padB)/2).toFixed(0)})">P95 延迟 →</text>

        <!-- provider legend -->
        ${providers.map((p, i) => `<g>
          <circle cx="${w - padR + 16}" cy="${padT + 8 + i*22}" r="5" fill="${APM.llmProviderColor(p)}" opacity="0.55"/>
          <circle cx="${w - padR + 16}" cy="${padT + 8 + i*22}" r="5" fill="none" stroke="${APM.llmProviderColor(p)}" stroke-width="1.4"/>
          <text x="${w - padR + 28}" y="${padT + 12 + i*22}" font-size="11" fill="var(--text-1)">${p}</text>
        </g>`).join('')}
        <!-- bubble-size legend -->
        <text x="${w - padR + 16}" y="${padT + 8 + providers.length*22 + 10}" font-size="10" fill="var(--text-3)" letter-spacing=".05em">气泡 = 调用量</text>
        <g>
          <circle cx="${w - padR + 22}" cy="${padT + 8 + providers.length*22 + 30}" r="5" fill="none" stroke="var(--text-3)" stroke-width="1"/>
          <text x="${w - padR + 34}" y="${padT + 12 + providers.length*22 + 30}" font-size="10" fill="var(--text-3)">少</text>
          <circle cx="${w - padR + 22}" cy="${padT + 8 + providers.length*22 + 56}" r="14" fill="none" stroke="var(--text-3)" stroke-width="1"/>
          <text x="${w - padR + 42}" y="${padT + 12 + providers.length*22 + 56}" font-size="10" fill="var(--text-3)">多</text>
        </g>
      </svg>
    </div>
    <div class="card" style="margin-top:14px;">
      <div class="card-title">详细对比</div>
      <table class="data-table" style="margin-top:8px;">
        <thead><tr><th>模型</th><th class="num">输入 $/M</th><th class="num">输出 $/M</th><th class="num">调用</th><th class="num">P95</th><th class="num">TTFT</th><th class="num">错误率</th><th class="num">$/h</th><th>建议</th></tr></thead>
        <tbody>${APM.llmModels.map(m => {
          const cheap = m.outPrice < 5;
          const fast = m.p95 < 1500;
          const reliable = m.errPct < 0.5;
          const verdict = (cheap&&fast&&reliable) ? ['var(--success)','日常首选'] :
                          (!cheap&&!fast) ? ['var(--danger)','仅复杂任务'] :
                          (cheap&&!fast) ? ['var(--warning)','离线批处理'] :
                          (!cheap&&fast) ? ['var(--accent)','高质量场景'] : ['var(--text-2)','一般'];
          return `<tr>
            <td><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${APM.llmProviderColor(m.provider)};margin-right:6px;vertical-align:middle;"></span><strong>${m.name}</strong></td>
            <td class="num mono">$${m.inPrice}</td>
            <td class="num mono">$${m.outPrice}</td>
            <td class="num mono">${m.calls.toLocaleString()}</td>
            <td class="num mono">${m.p95}ms</td>
            <td class="num mono">${m.ttft||'-'}${m.ttft?'ms':''}</td>
            <td class="num mono" style="color:${m.errPct>1?'var(--danger)':'var(--text-2)'}">${m.errPct.toFixed(2)}%</td>
            <td class="num mono" style="color:var(--warning)">${APM.llmFmt$(m.$h)}</td>
            <td><span class="badge" style="color:${verdict[0]};border-color:${verdict[0]};background:transparent;">${verdict[1]}</span></td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>
  `;
};

// ---------------- Cost attribution ----------------
APM.llmCostAttribution = function() {
  const byService = [
    { name:'eshop-rag', cost: 18.42, calls: 24180, pct: 44 },
    { name:'customer-support-bot', cost: 11.84, calls: 18420, pct: 28 },
    { name:'copilot-api', cost: 6.18, calls: 8920, pct: 15 },
    { name:'content-mod', cost: 3.21, calls: 41200, pct: 8 },
    { name:'search-rerank', cost: 1.92, calls: 142800, pct: 5 }
  ];
  const byUser = [
    { user:'u_8842', cost: 4.82, calls: 1240, role:'enterprise' },
    { user:'u_3201', cost: 3.18, calls: 920, role:'enterprise' },
    { user:'u_9920', cost: 1.84, calls: 480, role:'free' },
    { user:'u_1014', cost: 0.92, calls: 240, role:'free' }
  ];
  return `
    <div class="banner warning" style="margin-bottom:14px;">
      <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M5 9l7-7 7 7"/></svg>
      <span class="grow"><strong>预算告警：</strong>本月已花费 <strong>$1,842 / $2,500</strong> (74%)。按当前速率，预计 <strong>3 天后</strong>超出预算。</span>
      <button class="pill primary" onclick="APM.openLLMBudget()">配置预算告警</button>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-title">按服务归因 · 近 1h</div>
        <table class="data-table" style="margin-top:10px;">
          <thead><tr><th>服务</th><th class="num">调用</th><th class="num">$/h</th><th>占比</th></tr></thead>
          <tbody>${byService.map(s => `<tr class="clickable" onclick="APM.openLLMCostBreakdown('service','${s.name}',${s.calls},${s.cost})">
            <td><strong>${s.name}</strong></td>
            <td class="num mono">${s.calls.toLocaleString()}</td>
            <td class="num mono" style="color:var(--warning)">${APM.llmFmt$(s.cost)}</td>
            <td><div style="display:flex;align-items:center;gap:8px;"><div style="flex:1;height:6px;background:var(--bg-elev-1);border-radius:3px;"><div style="width:${s.pct}%;height:100%;background:var(--warning);border-radius:3px;"></div></div><span class="mono" style="font-size:11px;width:32px;">${s.pct}%</span></div></td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="card">
        <div class="card-title">高消耗用户 Top</div>
        <table class="data-table" style="margin-top:10px;">
          <thead><tr><th>用户</th><th>角色</th><th class="num">调用</th><th class="num">$/h</th></tr></thead>
          <tbody>${byUser.map(u => `<tr class="clickable" onclick="APM.openLLMCostBreakdown('user','${u.user}',${u.calls},${u.cost},'${u.role}')">
            <td class="mono">${u.user}</td>
            <td><span class="badge" style="font-size:10px;">${u.role}</span></td>
            <td class="num mono">${u.calls}</td>
            <td class="num mono" style="color:var(--warning)">${APM.llmFmt$(u.cost)}</td>
          </tr>`).join('')}</tbody>
        </table>
        <div style="margin-top:12px;padding:10px;background:var(--bg-elev-1);border-radius:6px;font-size:11.5px;color:var(--text-2);">
          💡 <strong>u_8842</strong> 单用户 1h 消耗 $4.82，是 P95 (
          $0.42) 的 11×。建议在网关层加 per-user rate-limit 或切换到更便宜的模型。
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:14px;">
      <div class="card-title">月度趋势 · 按模型</div>
      ${APM.sparkline(APM.llmTimeseries('cost', 30), 'var(--warning)', 1180, 160)}
      <div style="display:flex;gap:18px;margin-top:8px;font-size:11.5px;color:var(--text-3);">
        <span><span style="color:#cc785c;">●</span> claude-3.5-sonnet $812</span>
        <span><span style="color:#10a37f;">●</span> gpt-4o $518</span>
        <span><span style="color:#cc785c;">●</span> claude-3.5-haiku $284</span>
        <span><span style="color:#10a37f;">●</span> gpt-4o-mini $148</span>
        <span><span style="color:#ff6a00;">●</span> qwen2.5 $80</span>
      </div>
    </div>
  `;
};

// ---------------- RAG ----------------
// ---------------- OTel GenAI Docs drawer ----------------
APM.openOtelGenAIDocs = function() {
  const drawer = document.createElement('div');
  drawer.className = 'drawer-overlay';
  drawer.innerHTML = `
    <div class="drawer" style="width:780px;">
      <div class="drawer-head">
        <div>
          <div style="font-size:11px;color:var(--text-3);">规范 · OpenTelemetry</div>
          <h2 style="margin:4px 0 0;">GenAI Semantic Conventions</h2>
          <div style="font-size:11.5px;color:var(--text-3);margin-top:6px;">v1.28 · 啄木鸟 APM 完整支持，无需厂商锁定</div>
        </div>
        <button class="icon-btn" onclick="this.closest('.drawer-overlay').remove()">✕</button>
      </div>
      <div class="drawer-body">
        <div class="card" style="margin-bottom:14px;">
          <div class="card-title">为什么用 OTel GenAI 约定？</div>
          <p style="font-size:13px;color:var(--text-2);line-height:1.7;margin:8px 0 0;">将 LLM 调用作为标准 trace span 上报，<strong>属性命名统一</strong>（<code class="mono">gen_ai.system</code>、<code class="mono">gen_ai.usage.input_tokens</code> 等），可在 OpenAI / Anthropic / 本地模型 / 各类 RAG 框架间无缝切换，避免每接一家就重写一套埋点。啄木鸟、SigNoz、Datadog、Honeycomb 等都支持该约定。</p>
        </div>

        <div class="card" style="margin-bottom:14px;">
          <div class="card-title">核心 Span 属性</div>
          <table class="data-table compact" style="margin-top:8px;">
            <thead><tr><th>属性</th><th>示例值</th><th>说明</th></tr></thead>
            <tbody>
              ${[
                ['gen_ai.system','openai','Provider: openai / anthropic / cohere / aliyun / local'],
                ['gen_ai.operation.name','chat','chat / text_completion / embedding / tool_call'],
                ['gen_ai.request.model','gpt-4o-mini','请求模型 ID'],
                ['gen_ai.response.model','gpt-4o-mini-2024-07-18','服务端真实路由的模型版本'],
                ['gen_ai.request.temperature','0.7','采样温度'],
                ['gen_ai.request.max_tokens','2048','输出 token 上限'],
                ['gen_ai.usage.input_tokens','1843','计费 / 监控核心指标'],
                ['gen_ai.usage.output_tokens','412','同上'],
                ['gen_ai.response.finish_reasons','["stop"]','stop / length / content_filter / tool_calls'],
                ['gen_ai.prompt','[{"role":"user",...}]','可选 (建议脱敏后采样)'],
                ['gen_ai.completion','[{"role":"assistant",...}]','可选'],
                ['gen_ai.token.type','input / output','Span Event 用于流式 TTFT / TPOT 计算']
              ].map(([k,v,d]) => `<tr><td class="mono" style="color:var(--accent);font-size:11.5px;">${k}</td><td class="mono" style="color:var(--text-2);font-size:11.5px;">${v}</td><td style="color:var(--text-3);font-size:11.5px;">${d}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div class="card" style="margin-bottom:14px;">
          <div class="card-title">Python 一行接入（OpenLLMetry）</div>
          <pre style="background:var(--bg-elev-2);border:1px solid var(--border);padding:14px;border-radius:8px;font-size:12px;color:var(--text-1);margin:10px 0 0;overflow:auto;font-family:var(--mono);line-height:1.65;">pip install traceloop-sdk

from traceloop.sdk import Traceloop
Traceloop.init(
  app_name="eshop-rag",
  api_endpoint="https://apm.your-corp.com/v1/traces",
  headers={"Authorization": "Bearer wpk_•••"},
)

# 之后所有 OpenAI / Anthropic / LangChain / LlamaIndex / Qdrant 调用
# 自动产生 gen_ai.* span，无需改业务代码
client.chat.completions.create(model="gpt-4o-mini", messages=[...])</pre>
        </div>

        <div class="card" style="margin-bottom:14px;">
          <div class="card-title">Node.js 接入</div>
          <pre style="background:var(--bg-elev-2);border:1px solid var(--border);padding:14px;border-radius:8px;font-size:12px;color:var(--text-1);margin:10px 0 0;overflow:auto;font-family:var(--mono);line-height:1.65;">npm i @traceloop/node-server-sdk

import * as traceloop from "@traceloop/node-server-sdk";
traceloop.initialize({
  appName: "copilot-api",
  apiEndpoint: "https://apm.your-corp.com/v1/traces",
});</pre>
        </div>

        <div class="card">
          <div class="card-title">支持的库</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;">
            ${['OpenAI','Anthropic','Cohere','Bedrock','Vertex AI','HuggingFace','LangChain','LlamaIndex','Haystack','LiteLLM','vLLM','Ollama','Qdrant','Pinecone','Weaviate','Chroma','Milvus'].map(n => `<span class="badge">${n}</span>`).join('')}
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-top:18px;">
          <button class="pill primary" onclick="APM.openLLMOnboard();this.closest('.drawer-overlay').remove();">→ 立即接入</button>
          <button class="pill" onclick="window.open('https://opentelemetry.io/docs/specs/semconv/gen-ai/','_blank')">查看 OTel 官方规范</button>
        </div>
      </div>
    </div>
  `;
  drawer.onclick = e => { if (e.target === drawer) drawer.remove(); };
  document.body.appendChild(drawer);
};

// ---------------- 接入新模型 modal ----------------
APM._onboardStep = APM._onboardStep || 1;
APM._onboardSel = APM._onboardSel || { provider: 'openai', lang: 'python', model: 'gpt-4o-mini' };
APM.openLLMOnboard = function() {
  APM._onboardStep = 1;
  APM._renderLLMOnboard();
};
APM._renderLLMOnboard = function() {
  let drawer = document.querySelector('.drawer-overlay.llm-onboard');
  if (!drawer) {
    drawer = document.createElement('div');
    drawer.className = 'drawer-overlay llm-onboard';
    drawer.onclick = e => { if (e.target === drawer) drawer.remove(); };
    document.body.appendChild(drawer);
  }
  const s = APM._onboardSel;
  const step = APM._onboardStep;
  const providers = [
    { id:'openai', name:'OpenAI', models:['gpt-4o','gpt-4o-mini','o1-mini','text-embedding-3-small'], color:'#10a37f' },
    { id:'anthropic', name:'Anthropic', models:['claude-3-5-sonnet','claude-3-5-haiku','claude-3-opus'], color:'#cc785c' },
    { id:'aliyun', name:'阿里云通义', models:['qwen2.5-72b','qwen2.5-7b','qwen-vl-max'], color:'#ff6a00' },
    { id:'bedrock', name:'AWS Bedrock', models:['claude-3-5-sonnet','llama3.1-70b','titan-text'], color:'#ff9900' },
    { id:'local', name:'自托管 (vLLM/Ollama)', models:['llama3.1-70b','qwen2.5-32b','deepseek-v2'], color:'#6b7280' }
  ];
  const langs = [
    { id:'python', name:'Python', icon:'🐍' },
    { id:'node', name:'Node.js', icon:'📦' },
    { id:'go', name:'Go', icon:'🐹' },
    { id:'java', name:'Java', icon:'☕' }
  ];
  const codeFor = (lang, prov) => {
    if (lang === 'python') return `pip install traceloop-sdk openai

import os
from traceloop.sdk import Traceloop
from openai import OpenAI

Traceloop.init(
    app_name="my-llm-app",
    api_endpoint="https://apm.your-corp.com/v1/traces",
    headers={"Authorization": "Bearer wpk_•••"},
)

client = OpenAI()
resp = client.chat.completions.create(
    model="${s.model}",
    messages=[{"role":"user","content":"Hello"}],
)
# ✓ 自动上报 gen_ai.* span，含 token 用量与延迟`;
    if (lang === 'node') return `npm i @traceloop/node-server-sdk openai

import * as traceloop from "@traceloop/node-server-sdk";
import OpenAI from "openai";

traceloop.initialize({
  appName: "my-llm-app",
  apiEndpoint: "https://apm.your-corp.com/v1/traces",
});

const client = new OpenAI();
await client.chat.completions.create({
  model: "${s.model}",
  messages: [{ role: "user", content: "Hello" }],
});`;
    if (lang === 'go') return `go get go.opentelemetry.io/contrib/instrumentation/github.com/openai/openai-go/otelopenai

import (
  "context"
  "github.com/openai/openai-go"
  "go.opentelemetry.io/contrib/instrumentation/.../otelopenai"
)

client := openai.NewClient(otelopenai.WithTracing())
client.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
  Model: openai.F("${s.model}"),
  Messages: openai.F([]openai.ChatCompletionMessageParamUnion{
    openai.UserMessage("Hello"),
  }),
})`;
    return `// Java 示例：使用 LangChain4j + OTel
implementation 'dev.langchain4j:langchain4j-open-ai:0.35.0'
implementation 'io.opentelemetry:opentelemetry-api:1.42.0'

OpenAiChatModel model = OpenAiChatModel.builder()
    .apiKey(System.getenv("OPENAI_API_KEY"))
    .modelName("${s.model}")
    .build();
// ChatModel 自动产生 gen_ai.* span`;
  };

  drawer.innerHTML = `
    <div class="drawer" style="width:820px;">
      <div class="drawer-head">
        <div>
          <div style="font-size:11px;color:var(--text-3);">接入向导 · LLM / GenAI</div>
          <h2 style="margin:4px 0 0;">接入新模型</h2>
          <div style="display:flex;gap:6px;margin-top:10px;font-size:11px;">
            ${[1,2,3,4].map(i => `<span style="display:inline-flex;align-items:center;gap:4px;color:${i===step?'var(--accent)':i<step?'var(--success)':'var(--text-3)'};font-weight:${i===step?'600':'normal'};">
              <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;border:1.5px solid currentColor;font-size:10px;font-weight:600;">${i<step?'✓':i}</span>
              ${['','Provider','语言','代码','验证'][i]}
              ${i<4?'<span style="color:var(--text-3);margin:0 4px;">›</span>':''}
            </span>`).join('')}
          </div>
        </div>
        <button class="icon-btn" onclick="this.closest('.drawer-overlay').remove()">✕</button>
      </div>
      <div class="drawer-body">
        ${step === 1 ? `
          <div style="font-size:13px;color:var(--text-2);margin-bottom:14px;">选择模型供应商</div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
            ${providers.map(p => `<div onclick="APM._onboardSel.provider='${p.id}';APM._onboardSel.model='${p.models[0]}';APM._renderLLMOnboard()" style="cursor:pointer;padding:14px;border:1.5px solid ${s.provider===p.id?p.color:'var(--border)'};background:${s.provider===p.id?'var(--bg-elev-1)':'var(--bg-elev-0)'};border-radius:8px;transition:all .15s;">
              <div style="display:flex;align-items:center;gap:8px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};"></span><strong>${p.name}</strong></div>
              <div style="font-size:11px;color:var(--text-3);margin-top:6px;">${p.models.length} 个可用模型</div>
            </div>`).join('')}
          </div>
        ` : step === 2 ? `
          <div style="font-size:13px;color:var(--text-2);margin-bottom:14px;">选择业务语言 · 选择具体模型</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px;">
            ${langs.map(l => `<div onclick="APM._onboardSel.lang='${l.id}';APM._renderLLMOnboard()" style="cursor:pointer;padding:14px;border:1.5px solid ${s.lang===l.id?'var(--accent)':'var(--border)'};background:${s.lang===l.id?'var(--accent-weak)':'var(--bg-elev-0)'};border-radius:8px;text-align:center;">
              <div style="font-size:24px;">${l.icon}</div>
              <div style="font-size:12px;font-weight:600;margin-top:4px;">${l.name}</div>
            </div>`).join('')}
          </div>
          <div style="font-size:11.5px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">模型</div>
          <select class="pill" style="width:100%;padding:10px 12px;font-size:13px;" onchange="APM._onboardSel.model=this.value;APM._renderLLMOnboard()">
            ${(providers.find(p=>p.id===s.provider).models).map(m => `<option value="${m}" ${s.model===m?'selected':''}>${m}</option>`).join('')}
          </select>
        ` : step === 3 ? `
          <div style="font-size:13px;color:var(--text-2);margin-bottom:14px;">复制代码到你的项目</div>
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;">
            <span class="badge" style="background:${providers.find(p=>p.id===s.provider).color};color:white;border:none;">${providers.find(p=>p.id===s.provider).name}</span>
            <span class="badge">${langs.find(l=>l.id===s.lang).name}</span>
            <span class="badge mono">${s.model}</span>
            <button class="pill" style="margin-left:auto;" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.textContent);this.textContent='✓ 已复制'">复制</button>
          </div>
          <pre style="background:var(--bg-elev-2);border:1px solid var(--border);padding:14px;border-radius:8px;font-size:12px;color:var(--text-1);margin:0;overflow:auto;font-family:var(--mono);line-height:1.65;">${codeFor(s.lang, s.provider)}</pre>
          <div class="banner info" style="margin-top:14px;">
            <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>
            <span class="grow"><strong>无需改业务代码</strong>。SDK 通过 monkey-patch 拦截 LLM 客户端调用，自动产生符合 OTel GenAI 约定的 span。</span>
          </div>
        ` : `
          <div style="text-align:center;padding:30px 0;">
            <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;background:var(--accent-weak);margin-bottom:14px;">
              <div class="pulse-dot" style="width:14px;height:14px;border-radius:50%;background:var(--accent);"></div>
            </div>
            <div style="font-size:16px;font-weight:600;color:var(--text-1);">等待首条数据上报…</div>
            <div style="font-size:12px;color:var(--text-3);margin-top:6px;">请在你的应用中触发一次 LLM 调用</div>
          </div>
          <div class="card">
            <div class="card-title">检查清单</div>
            <ul style="list-style:none;padding:0;margin:10px 0 0;font-size:12.5px;color:var(--text-2);line-height:2;">
              <li><span style="color:var(--success);margin-right:6px;">✓</span> SDK 已加载</li>
              <li><span style="color:var(--success);margin-right:6px;">✓</span> Token 已配置</li>
              <li><span style="color:var(--success);margin-right:6px;">✓</span> 网络可达 apm.your-corp.com:443</li>
              <li><span style="color:var(--text-3);margin-right:6px;">○</span> 等待首个 gen_ai.* span…</li>
            </ul>
          </div>
        `}
        <div style="display:flex;gap:8px;margin-top:20px;justify-content:flex-end;">
          ${step > 1 ? `<button class="pill" onclick="APM._onboardStep--;APM._renderLLMOnboard()">← 上一步</button>` : ''}
          ${step < 4 ? `<button class="pill primary" onclick="APM._onboardStep++;APM._renderLLMOnboard()">下一步 →</button>` : `<button class="pill primary" onclick="this.closest('.drawer-overlay').remove();APM.go('llm');APM.llmTab='calls';APM.renderPage()">完成 · 查看调用</button>`}
        </div>
      </div>
    </div>
  `;
};

APM.llmRagPage = function() {
  return `
    <div class="banner info" style="margin-bottom:14px;">
      <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <span class="grow">RAG (Retrieval-Augmented Generation) 检索链路：embedding 调用 → 向量库查询 → 重排 → LLM 生成。每一跳都被纳入 trace。</span>
    </div>
    <div class="kpi-row" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;">
      ${[
        ['检索 / h', '142,800', 'var(--accent)'],
        ['平均 recall@5', '0.84', 'var(--success)'],
        ['向量库 P95', '88ms', 'var(--text-1)'],
        ['命中率（cache）', '62%', 'var(--success)']
      ].map(([l,v,c]) => `<div class="card" style="padding:14px;"><div style="font-size:11px;color:var(--text-3);">${l}</div><div style="font-size:24px;font-weight:700;color:${c};margin-top:4px;">${v}</div></div>`).join('')}
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-title">向量库性能</div>
        <table class="data-table" style="margin-top:10px;">
          <thead><tr><th>向量库</th><th class="num">QPS</th><th class="num">P95</th><th class="num">命中率</th></tr></thead>
          <tbody>
            <tr><td><strong>qdrant · prod</strong></td><td class="num mono">820</td><td class="num mono">88ms</td><td class="num mono">62%</td></tr>
            <tr><td><strong>pinecone · backup</strong></td><td class="num mono">120</td><td class="num mono">142ms</td><td class="num mono">58%</td></tr>
            <tr><td><strong>weaviate · staging</strong></td><td class="num mono">42</td><td class="num mono">68ms</td><td class="num mono">71%</td></tr>
          </tbody>
        </table>
      </div>
      <div class="card"><div class="card-title">检索质量分布</div>
        <div style="margin-top:14px;">
          ${[['recall@1','0.42',42],['recall@5','0.84',84],['recall@10','0.92',92],['recall@20','0.96',96]].map(([l,v,p]) => `
            <div style="display:flex;align-items:center;gap:10px;font-size:12px;margin:8px 0;">
              <span style="width:80px;color:var(--text-2);">${l}</span>
              <div style="flex:1;height:8px;background:var(--bg-elev-1);border-radius:4px;"><div style="width:${p}%;height:100%;background:var(--success);border-radius:4px;"></div></div>
              <span class="mono" style="width:40px;text-align:right;">${v}</span>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:14px;padding:10px;background:var(--bg-elev-1);border-radius:6px;font-size:11.5px;color:var(--text-2);">
          基于人工标注的 1240 条评估集 · 每周自动重跑
        </div>
      </div>
    </div>
  `;
};
