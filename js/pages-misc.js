// ============ Misc pages: Alerts, Exceptions, Dashboards, Onboarding, Database, Settings ============

// -------- Alerts (N9e-integrated) --------
APM.alertsTab = APM.alertsTab || 'firing';

APM.silenceAlert = function(alertId) {
  const a = APM.alerts.find(x=>x.id===alertId);
  if (!a) return;
  const m = APM.openModal({
    title: `静音告警 · ${a.title}`,
    width: 460,
    body: `
      ${APM.field('静音时长', APM.select('dur', [
        {value:'5m', label:'5 分钟'},
        {value:'30m', label:'30 分钟'},
        {value:'1h', label:'1 小时'},
        {value:'4h', label:'4 小时'},
        {value:'until_resolved', label:'直到我手动解除'}
      ], '30m'))}
      ${APM.field('原因（写入审计日志）', APM.textarea('reason', '', 2))}
    `,
    footer: `<button class="pill" data-act="cancel">取消</button><button class="pill primary" data-act="ok">应用静音</button>`
  });
  m.el.querySelector('[data-act="cancel"]').onclick = () => m.close();
  m.el.querySelector('[data-act="ok"]').onclick = () => {
    const v = APM.modalForm(m.id);
    a.silencedUntil = v.dur;
    a.silenceReason = v.reason || '';
    APM.logAudit('alert.silence', a.title + ' · ' + v.dur);
    m.close();
    APM.renderPage();
    APM.toast(`已静音 · ${v.dur === 'until_resolved' ? '直到手动解除' : v.dur}`, 'success');
  };
};

APM.unsilenceAlert = function(alertId) {
  const a = APM.alerts.find(x=>x.id===alertId);
  if (!a) return;
  delete a.silencedUntil; delete a.silenceReason;
  APM.logAudit('alert.unsilence', a.title);
  APM.renderPage();
  APM.toast('已解除静音', 'info');
};

APM.claimAlert = function(alertId) {
  const a = APM.alerts.find(x=>x.id===alertId);
  if (!a) return;
  a.assignee = APM.currentUser.initials;
  APM.logAudit('alert.claim', a.title);
  APM.renderPage();
  APM.toast(`已认领 · 处理人 ${APM.currentUser.initials}`, 'success');
};

APM.openCreateAlertRule = function() {
  const svcOptions = ['*'].concat(APM.services.map(s => s.id));
  const m = APM.openModal({
    title: '新建告警规则',
    width: 540,
    body: `
      ${APM.field('规则名称', APM.input('name', ''))}
      <div class="form-grid-2">
        ${APM.field('指标 (PromQL)', APM.input('metric', 'svc:err_rate'))}
        ${APM.field('操作符', APM.select('op', ['>','<','>=','<=','=','!='], '>'))}
      </div>
      <div class="form-grid-2">
        ${APM.field('阈值', APM.input('threshold', '1%'))}
        ${APM.field('持续时长 (for)', APM.input('forDur', '5m'))}
      </div>
      <div class="form-grid-2">
        ${APM.field('作用服务', APM.select('svc', svcOptions, '*'))}
        ${APM.field('级别', APM.select('sev', [{value:'critical',label:'P1 critical'},{value:'warning',label:'P2 warning'}], 'warning'))}
      </div>
      <div class="form-help">规则将通过夜莺同步到 collector，2 分钟内生效。</div>
    `,
    footer: `<button class="pill" data-act="cancel">取消</button><button class="pill primary" data-act="ok">创建规则</button>`
  });
  m.el.querySelector('[data-act="cancel"]').onclick = () => m.close();
  m.el.querySelector('[data-act="ok"]').onclick = () => {
    const v = APM.modalForm(m.id);
    if (!v.name) { APM.toast('请填写规则名称', 'warn'); return; }
    APM.alertRules.unshift({
      id: 'r-' + Date.now(),
      name: v.name,
      metric: v.metric,
      op: v.op,
      threshold: v.threshold,
      forDur: v.forDur,
      svc: v.svc,
      sev: v.sev,
      enabled: true
    });
    APM.logAudit('alert.rule.create', v.name);
    m.close();
    APM.alertsTab = 'rules';
    APM.renderPage();
    APM.toast('规则已创建', 'success');
  };
};

APM.toggleAlertRule = function(id) {
  const r = APM.alertRules.find(x=>x.id===id);
  if (!r) return;
  r.enabled = !r.enabled;
  APM.logAudit('alert.rule.' + (r.enabled?'enable':'disable'), r.name);
  APM.renderPage();
  APM.toast(`规则已${r.enabled?'启用':'禁用'}`, r.enabled?'success':'warn');
};

APM.deleteAlertRule = function(id) {
  const r = APM.alertRules.find(x=>x.id===id);
  if (!r) return;
  APM.confirm({
    title:'删除规则',
    msg:`确认删除告警规则 <strong>${r.name}</strong>？删除后将停止评估。`,
    danger:true,
    okLabel:'删除',
    onOk: () => {
      const idx = APM.alertRules.indexOf(r);
      APM.alertRules.splice(idx,1);
      APM.logAudit('alert.rule.delete', r.name);
      APM.renderPage();
      APM.toast('规则已删除', 'info');
    }
  });
};

APM.openSilenceCreate = function() {
  const m = APM.openModal({
    title: '新建抑制策略',
    width: 460,
    body: `
      ${APM.field('Matcher（标签表达式）', APM.input('matcher', 'svc=order-service'))}
      <div class="form-grid-2">
        ${APM.field('过期时间', APM.input('expiresAt', '2026-05-06 00:00'))}
        ${APM.field('原因', APM.input('reason', ''))}
      </div>
    `,
    footer: `<button class="pill" data-act="cancel">取消</button><button class="pill primary" data-act="ok">创建</button>`
  });
  m.el.querySelector('[data-act="cancel"]').onclick = () => m.close();
  m.el.querySelector('[data-act="ok"]').onclick = () => {
    const v = APM.modalForm(m.id);
    if (!v.matcher) { APM.toast('请填写 matcher', 'warn'); return; }
    APM.silences.unshift({ id:'sil-'+Date.now(), matcher:v.matcher, creator:APM.currentUser.email, expiresAt:v.expiresAt, reason:v.reason });
    APM.logAudit('silence.create', v.matcher);
    m.close();
    APM.renderPage();
    APM.toast('抑制策略已创建', 'success');
  };
};

APM.deleteSilence = function(id) {
  const s = APM.silences.find(x=>x.id===id);
  if (!s) return;
  APM.confirm({
    title:'解除抑制', msg:`确认解除抑制 <code>${s.matcher}</code> ？`, danger:true, okLabel:'解除',
    onOk: () => { APM.silences.splice(APM.silences.indexOf(s),1); APM.logAudit('silence.delete', s.matcher); APM.renderPage(); APM.toast('已解除抑制','info'); }
  });
};

APM.setAlertsTab = function(tab) { APM.alertsTab = tab; APM.renderPage(); };

APM.renderAlerts = function() {
  const svcFilter = APM.pageParams && APM.pageParams.svcFilter;
  const projectSvcIds = new Set(APM.services.map(s => s.id));
  const inProject = (a) => projectSvcIds.has(a.svc);
  let allAlerts = APM.alerts.filter(inProject);
  if (svcFilter) allAlerts = allAlerts.filter(a => a.svc === svcFilter);
  const firing = allAlerts.filter(a => a.state === 'firing');
  const pending = allAlerts.filter(a => a.state === 'pending');
  const resolved = allAlerts.filter(a => a.state === 'resolved');
  const crit = firing.filter(a => a.sev === 'critical').length;
  const warn = firing.filter(a => a.sev === 'warning').length;
  const tab = APM.alertsTab;

  const sevPill = (sev) => sev === 'critical'
    ? `<span class="badge err">P1 critical</span>`
    : `<span class="badge warn">P2 warning</span>`;
  const stateIcon = (s, silenced) => silenced
    ? `<span style="display:inline-flex;align-items:center;gap:5px;color:var(--text-3);font-weight:600;">🔕 已静音</span>`
    : s === 'firing'
    ? `<span style="display:inline-flex;align-items:center;gap:5px;color:var(--danger);font-weight:600;"><span class="pulse-dot"></span>firing</span>`
    : s === 'pending'
    ? `<span style="display:inline-flex;align-items:center;gap:5px;color:var(--warning);font-weight:600;">●pending</span>`
    : `<span style="display:inline-flex;align-items:center;gap:5px;color:var(--success);font-weight:600;">✓ resolved</span>`;

  const row = (a) => {
    const silenced = !!a.silencedUntil;
    const claimed = !!a.assignee;
    return `<tr class="clickable" ${silenced?'style="opacity:.55;"':''}>
      <td>${stateIcon(a.state, silenced)}</td>
      <td>${sevPill(a.sev)}</td>
      <td><div style="font-weight:600;color:var(--text-1);">${a.title}</div>
          <div style="font-family:var(--mono);font-size:11px;color:var(--text-3);margin-top:2px;">${a.rule}${claimed?` · 处理人 <strong style="color:var(--accent);">${a.assignee}</strong>`:''}${silenced?` · 静音至 ${a.silencedUntil}`:''}</div></td>
      <td><a class="link" onclick="APM.go('service',{id:'${a.svc}'})">${a.svc}</a></td>
      <td class="mono" style="color:var(--text-2);">${a.startedAt}</td>
      <td class="mono" style="color:var(--text-2);">${a.duration}</td>
      <td><span class="chip" title="来自夜莺 Nightingale">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
        n9e
      </span></td>
      <td style="text-align:right;">
        ${silenced
          ? `<button class="pill" style="padding:4px 8px;font-size:11px;" onclick="APM.unsilenceAlert('${a.id}')">解除静音</button>`
          : `<button class="pill" style="padding:4px 8px;font-size:11px;" onclick="APM.silenceAlert('${a.id}')">静音</button>`}
        ${claimed
          ? `<button class="pill" style="padding:4px 8px;font-size:11px;" disabled>已认领（${a.assignee}）</button>`
          : `<button class="pill" style="padding:4px 8px;font-size:11px;" onclick="APM.claimAlert('${a.id}')">认领</button>`}
      </td>
    </tr>`;
  };

  let bodyContent = '';
  if (tab === 'firing') bodyContent = firing.map(row).join('');
  else if (tab === 'pending') bodyContent = pending.map(row).join('');
  else if (tab === 'resolved') bodyContent = resolved.map(row).join('');

  const ruleRow = (r) => `<tr>
    <td style="padding-left:14px;font-weight:600;">${r.name}</td>
    <td><span class="badge ${r.sev==='critical'?'err':'warn'}">${r.sev}</span></td>
    <td><code style="background:var(--bg-elev-1);padding:2px 6px;border-radius:3px;font-family:var(--mono);font-size:11.5px;">${r.metric} ${r.op} ${r.threshold} for ${r.forDur}</code></td>
    <td><span class="chip">${r.svc}</span></td>
    <td>${r.enabled ? '<span class="badge ok">● enabled</span>' : '<span class="badge">disabled</span>'}</td>
    <td style="text-align:right;padding-right:14px;">
      <button class="pill" style="padding:4px 8px;font-size:11px;" onclick="APM.toggleAlertRule('${r.id}')">${r.enabled?'禁用':'启用'}</button>
      <button class="pill danger" style="padding:4px 8px;font-size:11px;" onclick="APM.deleteAlertRule('${r.id}')">删除</button>
    </td>
  </tr>`;

  const schedulesView = () => `<div class="grid-2" style="padding:14px;">
    ${APM.schedules.map(s => `<div class="card">
      <div style="font-weight:600;font-size:13.5px;">${s.team}</div>
      <div style="display:flex;gap:14px;margin-top:8px;">
        <div><div style="font-size:11px;color:var(--text-3);">当前值班</div><div style="font-size:18px;font-weight:600;color:var(--accent);">${s.current}</div></div>
        <div><div style="font-size:11px;color:var(--text-3);">下班接替</div><div style="font-size:18px;font-weight:600;color:var(--text-2);">${s.next}</div></div>
        <div style="margin-left:auto;text-align:right;"><div style="font-size:11px;color:var(--text-3);">${s.tz}</div><div class="mono" style="font-size:12px;color:var(--text-2);">${s.shiftStart} – ${s.shiftEnd}</div></div>
      </div>
    </div>`).join('')}
  </div>`;

  const silencesView = () => `<div style="padding:14px;">
    <div class="between" style="margin-bottom:10px;">
      <div style="font-size:12px;color:var(--text-3);">${APM.silences.length} 条抑制策略</div>
      <button class="pill primary" style="padding:5px 10px;font-size:12px;" onclick="APM.openSilenceCreate()">+ 新建抑制</button>
    </div>
    ${APM.silences.length === 0 ? '<div class="placeholder"><div class="icon">🔕</div>暂无抑制策略</div>' : `<table class="tbl">
      <thead><tr><th style="padding-left:14px;">Matcher</th><th>创建人</th><th>过期</th><th>原因</th><th></th></tr></thead>
      <tbody>${APM.silences.map(s => `<tr>
        <td style="padding-left:14px;font-family:var(--mono);font-size:12px;">${s.matcher}</td>
        <td class="mono" style="color:var(--text-3);">${s.creator}</td>
        <td class="mono" style="color:var(--text-2);">${s.expiresAt}</td>
        <td style="font-size:12px;">${s.reason || '—'}</td>
        <td style="text-align:right;padding-right:14px;"><button class="pill danger" style="padding:4px 8px;font-size:11px;" onclick="APM.deleteSilence('${s.id}')">解除</button></td>
      </tr>`).join('')}</tbody>
    </table>`}
  </div>`;

  return `
    <div class="between">
      <div>
        <div class="page-title">告警 Alerts${svcFilter ? ` <span style="font-size:13px;color:var(--text-3);font-weight:500;">· 过滤: ${svcFilter}</span>` : ''}</div>
        <div class="page-sub">通过 <strong>夜莺 Nightingale</strong> 同步 · 当前 ${firing.length} 个 firing · ${pending.length} 个 pending</div>
      </div>
      <div style="display:flex;gap:8px;">
        ${svcFilter ? `<button class="pill" onclick="APM.pageParams={};APM.renderPage();">清除过滤</button>` : ''}
        <button class="pill primary" onclick="APM.openCreateAlertRule()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新建告警规则
        </button>
      </div>
    </div>

    <div class="banner info" style="margin-top:14px;">
      <svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      <span class="grow">告警引擎由 <strong>夜莺 (Nightingale)</strong> 提供 · 规则与值班、订阅、抑制策略在 <a onclick="window.open('https://n9e.eshop.com','_blank');APM.toast('已在新窗口打开 n9e.eshop.com','info')" style="cursor:pointer;">n9e.eshop.com</a> 统一管理 · 此处展示触发实例并可下钻至 trace / log。</span>
      <button class="pill" style="padding:5px 10px;font-size:12px;" onclick="window.open('https://n9e.eshop.com','_blank');APM.toast('已在新窗口打开 n9e.eshop.com','info')">在 n9e 中打开</button>
    </div>

    <div class="grid-4" style="margin-top:14px;">
      <div class="card kpi"><div class="name">Firing · Critical</div><div class="value" style="color:var(--danger);">${crit}</div><div class="delta flat">需立即处理</div></div>
      <div class="card kpi"><div class="name">Firing · Warning</div><div class="value" style="color:var(--warning);">${warn}</div><div class="delta flat">观察中</div></div>
      <div class="card kpi"><div class="name">Pending</div><div class="value" style="color:var(--text-2);">${pending.length}</div><div class="delta flat">未达持续时长</div></div>
      <div class="card kpi"><div class="name">本时段已恢复</div><div class="value" style="color:var(--success);">${resolved.length}</div><div class="delta flat">MTTR 平均 6m</div></div>
    </div>

    <div class="card" style="margin-top:14px;padding:0;overflow:hidden;">
      <div class="subtabs" style="padding: 0 14px;margin:0;">
        <div class="subtab ${tab==='firing'?'active':''}" onclick="APM.setAlertsTab('firing')">Firing <span class="pill-mini">${firing.length}</span></div>
        <div class="subtab ${tab==='pending'?'active':''}" onclick="APM.setAlertsTab('pending')">Pending <span class="pill-mini">${pending.length}</span></div>
        <div class="subtab ${tab==='resolved'?'active':''}" onclick="APM.setAlertsTab('resolved')">Resolved <span class="pill-mini">${resolved.length}</span></div>
        <div class="subtab ${tab==='rules'?'active':''}" onclick="APM.setAlertsTab('rules')">规则配置 <span class="pill-mini">${APM.alertRules.length}</span></div>
        <div class="subtab ${tab==='schedule'?'active':''}" onclick="APM.setAlertsTab('schedule')">值班 / Schedule <span class="pill-mini">${APM.schedules.length}</span></div>
        <div class="subtab ${tab==='silences'?'active':''}" onclick="APM.setAlertsTab('silences')">抑制 / Silences <span class="pill-mini">${APM.silences.length}</span></div>
      </div>
      ${tab === 'firing' || tab === 'pending' || tab === 'resolved' ? `
        ${bodyContent ? `<table class="tbl">
          <thead><tr><th style="width:90px;">状态</th><th style="width:100px;">级别</th><th>告警</th><th style="width:140px;">服务</th><th style="width:90px;">触发时刻</th><th style="width:80px;">持续</th><th style="width:80px;">来源</th><th style="width:160px;text-align:right;">操作</th></tr></thead>
          <tbody>${bodyContent}</tbody>
        </table>` : `<div class="placeholder" style="margin:24px;"><div class="icon">${tab==='firing'?'✓':tab==='resolved'?'✓':'…'}</div>暂无 ${tab} 告警</div>`}
      ` : tab === 'rules' ? `
        <table class="tbl">
          <thead><tr><th style="padding-left:14px;">规则名</th><th>级别</th><th>条件</th><th>服务</th><th>状态</th><th></th></tr></thead>
          <tbody>${APM.alertRules.map(ruleRow).join('')}</tbody>
        </table>
      ` : tab === 'schedule' ? schedulesView() : silencesView()}
    </div>
  `;
};

// -------- Exceptions --------
APM.exceptionGroup = APM.exceptionGroup || 'type';
APM.exceptionFilter = APM.exceptionFilter || '';
APM._exceptionGroupLabels = { type:'类型', svc:'服务', hour:'小时' };
APM.cycleExceptionGroup = function() {
  const order = ['type','svc','hour'];
  APM.exceptionGroup = order[(order.indexOf(APM.exceptionGroup)+1) % order.length];
  APM.renderPage();
};
APM.setExceptionFilter = function(v) { APM.exceptionFilter = v; APM.renderPage(); };
APM.exportExceptions = function() {
  const headers = ['type','message','svc','count','delta','first','last'];
  const rows = APM.exceptions.map(e => [e.type, e.msg, e.svc, e.count, e.delta, e.first, e.last]);
  APM.download('exceptions-' + Date.now() + '.csv', APM.toCSV(rows, headers), 'text/csv;charset=utf-8');
};

APM.renderExceptions = function() {
  const svcFilter = APM.pageParams && APM.pageParams.svcFilter;
  const projectSvcIds = new Set(APM.services.map(s => s.id));
  let list = APM.exceptions.filter(e => projectSvcIds.has(e.svc));
  if (svcFilter) list = list.filter(e => e.svc === svcFilter);
  const f = (APM.exceptionFilter || '').toLowerCase();
  if (f) list = list.filter(e => e.type.toLowerCase().includes(f) || e.svc.toLowerCase().includes(f) || e.msg.toLowerCase().includes(f));

  const total = list.reduce((a,b)=>a+b.count,0);

  const renderTable = (arr) => `<div class="card" style="padding:0;overflow:hidden;">
    <table class="tbl">
      <thead><tr>
        <th style="width:38%;">异常 / 消息</th>
        <th style="width:140px;">服务</th>
        <th style="width:80px;">次数</th>
        <th style="width:100px;">变化</th>
        <th style="width:90px;">首次</th>
        <th style="width:90px;">最近</th>
        <th style="width:160px;text-align:right;">操作</th>
      </tr></thead>
      <tbody>
        ${arr.map(e => {
          const deltaPos = e.delta.startsWith('+');
          const deltaNeg = e.delta.startsWith('-');
          const dColor = deltaPos ? 'var(--danger)' : deltaNeg ? 'var(--success)' : 'var(--text-3)';
          return `<tr class="clickable" onclick="APM.openExceptionStack('${e.type}','${e.svc}')">
            <td>
              <div style="font-family:var(--mono);font-weight:700;color:var(--danger);font-size:12.5px;">${e.type}</div>
              <div style="font-size:12px;color:var(--text-2);margin-top:3px;font-family:var(--mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:520px;">${e.msg}</div>
            </td>
            <td><a class="link" onclick="event.stopPropagation();APM.go('service',{id:'${e.svc}'})">${e.svc}</a></td>
            <td class="mono" style="font-weight:600;">${e.count}</td>
            <td style="color:${dColor};font-weight:600;font-family:var(--mono);">${e.delta}</td>
            <td class="mono" style="color:var(--text-3);">${e.first}</td>
            <td class="mono" style="color:var(--text-3);">${e.last}</td>
            <td style="text-align:right;">
              <button class="pill" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();APM.openExceptionStack('${e.type}','${e.svc}')">堆栈</button>
              <button class="pill" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();APM.go('traces',{error:'${e.type}'})">Traces</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;

  // Build groups when grouped
  let body;
  if (APM.exceptionGroup === 'type' || list.length === 0) {
    body = list.length === 0 ? '<div class="placeholder" style="margin-top:14px;"><div class="icon">🔍</div>没有匹配的异常</div>' : renderTable(list);
  } else if (APM.exceptionGroup === 'svc') {
    const groups = {};
    list.forEach(e => { (groups[e.svc] = groups[e.svc] || []).push(e); });
    body = Object.keys(groups).map(svc => `
      <div style="margin-top:14px;">
        <div style="font-size:13px;font-weight:600;margin-bottom:6px;display:flex;align-items:center;gap:8px;"><span class="chip">${svc}</span><span style="color:var(--text-3);font-weight:500;font-size:11.5px;">${groups[svc].length} 种 · ${groups[svc].reduce((a,b)=>a+b.count,0)} 次</span></div>
        ${renderTable(groups[svc])}
      </div>
    `).join('');
  } else { // hour bucket
    const buckets = { '00–06':[], '06–12':[], '12–18':[], '18–24':[] };
    list.forEach(e => {
      const h = parseInt((e.last && e.last.match(/(\d{1,2})/)||['','18'])[1], 10);
      const key = h<6?'00–06':h<12?'06–12':h<18?'12–18':'18–24';
      buckets[key].push(e);
    });
    body = Object.keys(buckets).filter(k => buckets[k].length).map(k => `
      <div style="margin-top:14px;">
        <div style="font-size:13px;font-weight:600;margin-bottom:6px;display:flex;align-items:center;gap:8px;"><span class="chip">${k}</span><span style="color:var(--text-3);font-weight:500;font-size:11.5px;">${buckets[k].length} 种</span></div>
        ${renderTable(buckets[k])}
      </div>
    `).join('');
  }

  return `
    <div class="between">
      <div>
        <div class="page-title">异常 Exceptions${svcFilter ? ` <span style="font-size:13px;color:var(--text-3);font-weight:500;">· 过滤: ${svcFilter}</span>` : ''}</div>
        <div class="page-sub">最近 1 小时 · ${list.length} 种异常类型 · 共 ${total} 次</div>
      </div>
      <div style="display:flex;gap:8px;">
        ${svcFilter ? `<button class="pill" onclick="APM.pageParams={};APM.renderPage();">清除过滤</button>` : ''}
        <button class="pill" onclick="APM.cycleExceptionGroup()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M6 12h12M10 18h4"/></svg>分组: ${APM._exceptionGroupLabels[APM.exceptionGroup]}</button>
        <button class="pill" onclick="APM.exportExceptions()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14H7L5 6"/></svg>导出</button>
      </div>
    </div>

    <div class="grid-4" style="margin-top:14px;">
      <div class="card kpi"><div class="name">异常总数</div><div class="value">${total}</div><div class="delta up">▲ 32% vs 1h ago</div></div>
      <div class="card kpi"><div class="name">异常类型</div><div class="value">${list.length}</div><div class="delta flat">中 1 种为新增</div></div>
      <div class="card kpi"><div class="name">影响服务</div><div class="value">${new Set(list.map(e=>e.svc)).size}</div><div class="delta flat">/ ${APM.services.length}</div></div>
      <div class="card kpi"><div class="name">关联 Trace</div><div class="value">${list.reduce((a,b)=>a+b.traces,0)}</div><div class="delta flat">100% 有上下文</div></div>
    </div>

    <div class="section-h" style="margin-top:14px;"><h3>异常聚合</h3>
      <div class="searchbox" style="padding:6px 10px;min-width:280px;">
        ${APM.svgI.search}<input placeholder="按异常类型 / 服务 / message 过滤" value="${(APM.exceptionFilter||'').replace(/"/g,'&quot;')}" data-focus-key="exc-filter" oninput="APM.bindRetainedInput(event,'exc-filter',APM.setExceptionFilter)">
      </div>
    </div>

    ${body}
  `;
};

// -------- Database (DB Calls) --------
APM.renderDatabase = function() {
  return `
    <div class="between">
      <div>
        <div class="page-title">数据库调用 DB Calls</div>
        <div class="page-sub">SQL 模板聚合 · 最近 1 小时 · MySQL / PostgreSQL / Redis</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="pill">数据源: 全部</button>
        <button class="pill">类型: SQL</button>
      </div>
    </div>

    <div class="grid-4" style="margin-top:14px;">
      <div class="card kpi"><div class="name">SQL 模板</div><div class="value">${APM.slowQueries.length}<span class="unit"> 个</span></div><div class="delta flat">N+1 嫌疑 1 个</div></div>
      <div class="card kpi"><div class="name">总执行</div><div class="value">${APM.slowQueries.reduce((a,b)=>a+b.count,0).toLocaleString()}</div><div class="delta up">▲ 8%</div></div>
      <div class="card kpi"><div class="name">慢查询 (>500ms)</div><div class="value" style="color:var(--warning);">2</div><div class="delta flat">order, risk</div></div>
      <div class="card kpi"><div class="name">连接池等待</div><div class="value" style="color:var(--danger);">4<span class="unit"> req</span></div><div class="delta up">checkout HikariCP</div></div>
    </div>

    <div class="subtabs">
      <div class="subtab active">慢查询 <span class="pill-mini">${APM.slowQueries.length}</span></div>
      <div class="subtab">N+1 嫌疑 <span class="pill-mini">1</span></div>
      <div class="subtab">连接池</div>
      <div class="subtab">事务 Transactions</div>
      <div class="subtab">Redis</div>
    </div>

    <div class="card" style="padding:0;overflow:hidden;">
      <table class="tbl">
        <thead><tr>
          <th style="width:42%;">SQL 模板</th>
          <th style="width:140px;">服务</th>
          <th style="width:80px;">次数</th>
          <th style="width:80px;">avg</th>
          <th style="width:80px;">P99</th>
          <th style="width:80px;">行数</th>
          <th style="width:120px;text-align:right;">操作</th>
        </tr></thead>
        <tbody>
          ${APM.slowQueries.map(q => `<tr class="clickable">
            <td><pre class="mono" style="margin:0;font-size:12px;color:var(--text-1);white-space:pre-wrap;line-height:1.5;">${q.sql}</pre></td>
            <td><a class="link" onclick="APM.go('service',{id:'${q.svc}'})">${q.svc}</a></td>
            <td class="mono">${q.count.toLocaleString()}</td>
            <td class="mono">${q.avg}<span style="color:var(--text-3);">ms</span></td>
            <td class="mono ${q.p99>500?'err':q.p99>200?'warn':''}" style="font-weight:600;">${q.p99}<span style="color:var(--text-3);font-weight:400;">ms</span></td>
            <td class="mono" style="color:var(--text-3);">${q.rows}</td>
            <td style="text-align:right;">
              <button class="pill" style="padding:4px 8px;font-size:11px;">EXPLAIN</button>
              <button class="pill" style="padding:4px 8px;font-size:11px;">Traces</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
};

// -------- Dashboards --------
APM.dashFilter = APM.dashFilter || 'all';
APM.dashStarred = APM.dashStarred || { 'eshop · 业务概览': true, 'JVM · 全量服务': true, 'Stripe · 支付通道': true };
APM.toggleDashStar = function(name, ev) { if (ev) ev.stopPropagation(); APM.dashStarred[name] = !APM.dashStarred[name]; APM.renderPage(); };
APM.setDashFilter = function(f) { APM.dashFilter = f; APM.renderPage(); };
APM.renderDashboards = function() {
  const dashboards = [
    { name: 'eshop · 业务概览', author: 'jx', updated: '2h ago', tag: 'business', stars: 12, panels: 16 },
    { name: 'JVM · 全量服务', author: 'sre', updated: '昨天', tag: 'jvm', stars: 8, panels: 24 },
    { name: 'MySQL · 主库健康', author: 'dba', updated: '3d ago', tag: 'db', stars: 5, panels: 12 },
    { name: 'Kubernetes · 集群', author: 'sre', updated: '1w ago', tag: 'infra', stars: 4, panels: 18 },
    { name: 'Stripe · 支付通道', author: 'pay-team', updated: '4h ago', tag: 'business', stars: 6, panels: 8 },
    { name: '夜莺告警 · 全景', author: 'oncall', updated: '5h ago', tag: 'alert', stars: 9, panels: 14 }
  ];
  const f = APM.dashFilter || 'all';
  const filtered = dashboards.filter(d => f==='all' ? true : f==='star' ? APM.dashStarred[d.name] : d.tag === f);
  const starCount = dashboards.filter(d => APM.dashStarred[d.name]).length;
  return `
    <div class="between">
      <div>
        <div class="page-title">仪表盘 Dashboards</div>
        <div class="page-sub">PromQL 兼容 · 可视化业务、JVM、基础设施指标</div>
      </div>
      <div style="display:flex;gap:8px;">
        <div class="searchbox" style="padding:6px 10px;min-width:240px;">${APM.svgI.search}<input placeholder="搜索仪表盘…"></div>
        <button class="pill primary"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>新建</button>
      </div>
    </div>
    <div class="subtabs">
      ${[['all','全部',dashboards.length],['star','★ 收藏',starCount],['business','业务',null],['jvm','JVM',null],['db','数据库',null],['infra','基础设施',null],['alert','告警',null]].map(([id,l,c]) =>
        `<div class="subtab ${f===id?'active':''}" onclick="APM.setDashFilter('${id}')">${l}${c!==null?` <span class="pill-mini">${c}</span>`:''}</div>`
      ).join('')}
    </div>
    ${filtered.length === 0 ? `<div class="placeholder" style="margin-top:20px;"><div class="icon">📊</div>该分类下暂无仪表盘</div>` : ''}
    <div class="grid-3">
      ${filtered.map((d,i) => {
        // tiny mock charts
        const vals = Array.from({length:24}, (_,k) => 30 + Math.sin(k/2 + i)*10 + Math.cos(k/3)*8);
        const color = ['var(--accent)','var(--purple)','var(--teal)','var(--success)','var(--warning)','var(--danger)'][i%6];
        const starred = APM.dashStarred[d.name];
        return `<div class="card svc-card" style="cursor:pointer;" onclick="APM.openDashboard('${d.name.replace(/'/g,"\\'")}')">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
            <div style="min-width:0;flex:1;">
              <div style="font-weight:600;color:var(--text-1);font-size:14px;">${d.name}</div>
              <div style="font-size:11.5px;color:var(--text-3);margin-top:3px;">@${d.author} · ${d.panels} panels · ${d.updated}</div>
            </div>
            <span class="badge" style="background:${color};color:white;font-size:10px;">${d.tag}</span>
          </div>
          <div style="margin-top:10px;background:var(--bg-elev-1);border-radius:6px;padding:10px;">
            ${APM.sparkline(vals, color, 280, 56)}
          </div>
          <div style="display:flex;gap:10px;margin-top:8px;font-size:11px;color:var(--text-3);align-items:center;">
            <span onclick="APM.toggleDashStar('${d.name.replace(/'/g,"\\'")}', event)" style="cursor:pointer;color:${starred?'var(--warning)':'var(--text-3)'};font-size:13px;">${starred?'★':'☆'} ${d.stars}</span>
            <span>${starred?'· 已收藏':''}</span>
            <span style="margin-left:auto;">查看 →</span>
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
};

// -------- Onboarding (simplified) --------
APM.renderOnboarding = function() {
  const langs = [
    { id:'java', name:'Java', icon:'☕', color:'#f89820', desc:'Spring Boot · OpenTelemetry agent' },
    { id:'go', name:'Go', icon:'Go', color:'#00add8', desc:'otel-go SDK · 自动埋点 net/http, gRPC' },
    { id:'py', name:'Python', icon:'Py', color:'#3776ab', desc:'opentelemetry-instrument Django/Flask' },
    { id:'node', name:'Node.js', icon:'JS', color:'#3c873a', desc:'@opentelemetry/auto-instrumentations-node' }
  ];
  return `
    <div class="page-title">接入指导</div>
    <div class="page-sub">三步将服务接入 啄木鸟 APM 2.0 · 基于 OpenTelemetry · 无侵入</div>

    <div class="banner info" style="margin-top:14px;">
      <svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <span class="grow">预计 5 分钟可完成接入。所有 SDK 均使用 OTLP/gRPC 上报至 collector，无需修改业务代码。</span>
    </div>

    <div style="display:grid;grid-template-columns: 280px 1fr;gap:24px;margin-top:18px;">
      <div class="card" style="padding:0;">
        <div style="padding:14px 16px;border-bottom:1px solid var(--border);font-weight:600;">三步接入</div>
        <div style="padding: 8px 0;">
          ${[
            ['1','创建项目','已完成 · eshop'],
            ['2','安装 SDK / Agent','选择语言并复制命令'],
            ['3','发送数据 / 验证','观察 collector 流量']
          ].map(([n,t,s],i) => `
            <div style="display:flex;gap:12px;padding:10px 16px;align-items:center;border-left:3px solid ${i===1?'var(--accent)':'transparent'};">
              <div style="width:24px;height:24px;border-radius:50%;background:${i===0?'var(--success)':i===1?'var(--accent)':'var(--bg-hover)'};color:${i<2?'white':'var(--text-3)'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">${i===0?'✓':n}</div>
              <div style="min-width:0;">
                <div style="font-size:13px;font-weight:${i===1?'600':'500'};color:${i===1?'var(--text-1)':'var(--text-2)'};">${t}</div>
                <div style="font-size:11px;color:var(--text-3);margin-top:2px;">${s}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div>
        <div style="font-size:13px;font-weight:600;color:var(--text-1);margin-bottom:10px;">选择语言 / 框架</div>
        <div class="grid-4">
          ${langs.map((l,i) => `<div class="svc-card ${i===0?'active':''}" style="cursor:pointer;${i===0?'border-color:var(--accent);background:var(--accent-weak);':''}">
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="lang-ico" style="background:${l.color};">${l.icon}</span>
              <div><div style="font-weight:600;">${l.name}</div><div style="font-size:11px;color:var(--text-3);margin-top:2px;">${l.desc}</div></div>
            </div>
          </div>`).join('')}
        </div>

        <div class="card" style="margin-top:14px;">
          <div class="card-title"><span>① 下载并启动 OTel Java Agent</span><button class="pill" style="padding:4px 8px;font-size:11px;">复制</button></div>
<pre class="code-block">curl -O https://apm.eshop.com/agent/opentelemetry-javaagent.jar

java -javaagent:./opentelemetry-javaagent.jar \\
  -Dotel.service.name=my-service \\
  -Dotel.exporter.otlp.endpoint=https://otlp.apm.eshop.com:4317 \\
  -Dotel.exporter.otlp.headers="Authorization=Bearer ${'<TOKEN>'}" \\
  -Dotel.resource.attributes=deployment.environment=production,project=eshop \\
  -jar my-service.jar</pre>
        </div>

        <div class="card" style="margin-top:14px;">
          <div class="card-title"><span>② 验证数据上报</span><span style="font-size:11px;color:var(--text-3);">通常 30 秒内可见</span></div>
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;font-family:var(--mono);font-size:12.5px;">
            <span class="pulse-dot" style="background:var(--success);"></span>
            <span>collector 已接收 <strong>my-service</strong> 的 traces · spans 18 / 30s · metrics 12 / 30s</span>
          </div>
          <button class="pill primary" style="margin-top:6px;">前往 服务概览 →</button>
        </div>
      </div>
    </div>
  `;
};

// -------- Settings (placeholder) --------
APM.renderSettings = function() {
  return `
    <div class="page-title">设置</div>
    <div class="page-sub">租户域 / 项目 / 用户 / 集成</div>
    <div class="grid-3" style="margin-top:14px;">
      ${[
        ['租户域 Domain','3 个域 · cloud-prod / idc-bj / k8s-staging','管理隔离边界与配额'],
        ['项目 Project','5 个项目','按业务线划分 · 可独立配置采样率'],
        ['用户与角色','24 用户 · 4 角色','RBAC · 集成 SSO (LDAP/OIDC)'],
        ['采样策略','尾部采样 + 错误全采','每 svc 可单独覆盖'],
        ['告警集成','夜莺 Nightingale','规则同步 · 通知通道复用'],
        ['数据保留','traces 7d · metrics 30d · logs 14d','热/冷分层']
      ].map(([t,v,s])=>`<div class="card svc-card" style="cursor:pointer;">
        <div style="font-weight:600;color:var(--text-1);">${t}</div>
        <div style="font-size:18px;font-weight:600;margin-top:6px;">${v}</div>
        <div style="font-size:11.5px;color:var(--text-3);margin-top:4px;">${s}</div>
      </div>`).join('')}
    </div>
  `;
};
