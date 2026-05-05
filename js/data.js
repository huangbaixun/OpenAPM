// ============ Mock data for the prototype ============
window.APM = window.APM || {};

// Domain → Project hierarchy (tenant model)
APM.domains = [
  { id: 'cloud-prod', name: 'cloud-prod', label: '云端生产', color: 'var(--success)',
    projects: [
      { id: 'eshop', name: 'eshop', label: '电商', color: 'var(--accent)' },
      { id: 'crm', name: 'crm', label: '客户关系', color: 'var(--warning)' },
      { id: 'finance', name: 'finance', label: '财务', color: 'var(--purple)' }
    ]
  },
  { id: 'idc-bj', name: 'idc-bj', label: '北京自建机房', color: 'var(--accent)',
    projects: [
      { id: 'oa', name: 'oa', label: '办公', color: 'var(--teal)' },
      { id: 'hr', name: 'hr', label: '人力', color: 'var(--success)' },
      { id: 'erp', name: 'erp', label: 'ERP', color: 'var(--accent)' }
    ]
  },
  { id: 'k8s-staging', name: 'k8s-staging', label: 'K8s 预发', color: 'var(--warning)',
    projects: [
      { id: 'eshop-stg', name: 'eshop', label: '电商-预发', color: 'var(--accent)' }
    ]
  }
];

APM.currentDomain = 'cloud-prod';
APM.currentProject = 'eshop';

// Service preset library (used by per-project mock fan-out)
const _javaIco = 'linear-gradient(135deg,#f89820,#e76f00)';
const _goIco = 'linear-gradient(135deg,#00add8,#007d9c)';
const _pyIco = 'linear-gradient(135deg,#3776ab,#ffd43b)';
const _nodeIco = 'linear-gradient(135deg,#3c873a,#026e00)';

// Services per project — `pickProject` swaps APM.services to the matching set.
APM.projectServices = {
  // ---- cloud-prod / eshop ----
  'eshop': [
    { id: 'gateway', name: 'gateway', lang: 'Java', langColor: _javaIco, langText: '☕', rpm: 4820, errPct: 0.18, p99: 142, apdex: 0.96, alerts: 0, instances: 3, env: 'production', spark: [40,38,42,45,41,39,43,40,46,42,44,40,38,42] },
    { id: 'checkout-service', name: 'checkout-service', lang: 'Java', langColor: _javaIco, langText: '☕', rpm: 1230, errPct: 0.42, p99: 318, apdex: 0.91, alerts: 1, instances: 4, env: 'production', spark: [60,58,55,62,57,54,68,72,65,80,78,82,90,88] },
    { id: 'payment-service', name: 'payment-service', lang: 'Java', langColor: _javaIco, langText: '☕', rpm: 820, errPct: 0.06, p99: 320, apdex: 0.94, alerts: 0, instances: 3, env: 'production', spark: [55,52,58,54,50,56,58,52,54,50,52,48,46,50] },
    { id: 'risk-service', name: 'risk-service', lang: 'Go', langColor: _goIco, langText: 'Go', rpm: 640, errPct: 0.32, p99: 820, apdex: 0.86, alerts: 1, instances: 2, env: 'production', spark: [70,75,80,78,85,90,82,88,95,92,98,90,94,92] },
    { id: 'order-service', name: 'order-service', lang: 'Java', langColor: _javaIco, langText: '☕', rpm: 520, errPct: 0.12, p99: 196, apdex: 0.95, alerts: 0, instances: 2, env: 'production', spark: [40,42,38,44,41,40,46,42,44,40,42,38,40,42] },
    { id: 'notify-service', name: 'notify-service', lang: 'Node.js', langColor: _nodeIco, langText: 'JS', rpm: 410, errPct: 0.04, p99: 88, apdex: 0.98, alerts: 0, instances: 4, env: 'production', spark: [30,28,32,30,28,32,28,30,28,30,28,30,28,30] },
    { id: 'user-service', name: 'user-service', lang: 'Python', langColor: _pyIco, langText: 'Py', rpm: 380, errPct: 0.02, p99: 92, apdex: 0.97, alerts: 0, instances: 2, env: 'production', spark: [22,24,20,26,22,20,24,22,24,20,22,20,18,20] },
    { id: 'auth-service', name: 'auth-service', lang: 'Python', langColor: _pyIco, langText: 'Py', rpm: 240, errPct: 0.08, p99: 68, apdex: 0.97, alerts: 0, instances: 2, env: 'production', spark: [18,20,18,16,18,20,16,18,20,18,16,18,20,18] },
    { id: 'ledger-service', name: 'ledger-service', lang: 'Java', langColor: _javaIco, langText: '☕', rpm: 180, errPct: 5.20, p99: 1020, apdex: 0.62, alerts: 2, instances: 2, env: 'production', spark: [40,45,50,55,62,68,75,82,90,95,98,90,92,95] }
  ],
  'crm': [
    { id: 'crm-api', name: 'crm-api', lang: 'Java', langColor: _javaIco, langText: '☕', rpm: 320, errPct: 0.12, p99: 218, apdex: 0.95, alerts: 0, instances: 2, env: 'production', spark: [22,24,20,26,22,20,24,22,24,20,22,20,18,20] },
    { id: 'lead-svc', name: 'lead-svc', lang: 'Java', langColor: _javaIco, langText: '☕', rpm: 140, errPct: 0.21, p99: 412, apdex: 0.92, alerts: 0, instances: 2, env: 'production', spark: [30,32,28,34,30,28,32,30,32,28,30,28,26,28] },
    { id: 'segment-pipeline', name: 'segment-pipeline', lang: 'Python', langColor: _pyIco, langText: 'Py', rpm: 80, errPct: 0.04, p99: 920, apdex: 0.88, alerts: 1, instances: 1, env: 'production', spark: [12,14,16,12,14,18,16,14,16,18,16,14,12,14] },
    { id: 'sms-gateway', name: 'sms-gateway', lang: 'Go', langColor: _goIco, langText: 'Go', rpm: 60, errPct: 0.32, p99: 86, apdex: 0.98, alerts: 0, instances: 2, env: 'production', spark: [8,10,8,12,10,8,10,12,10,8,10,12,8,10] }
  ],
  'finance': [
    { id: 'invoice-api', name: 'invoice-api', lang: 'Java', langColor: _javaIco, langText: '☕', rpm: 240, errPct: 0.06, p99: 280, apdex: 0.96, alerts: 0, instances: 2, env: 'production', spark: [18,20,18,22,20,18,20,22,20,18,20,18,16,18] },
    { id: 'reconcile-svc', name: 'reconcile-svc', lang: 'Java', langColor: _javaIco, langText: '☕', rpm: 60, errPct: 0.0, p99: 4200, apdex: 0.78, alerts: 1, instances: 1, env: 'production', spark: [80,90,75,82,88,92,85,90,95,88,92,90,86,88] },
    { id: 'tax-calc', name: 'tax-calc', lang: 'Go', langColor: _goIco, langText: 'Go', rpm: 180, errPct: 0.02, p99: 64, apdex: 0.99, alerts: 0, instances: 2, env: 'production', spark: [16,14,18,16,14,18,16,14,18,16,14,16,18,14] },
    { id: 'fx-rate', name: 'fx-rate', lang: 'Python', langColor: _pyIco, langText: 'Py', rpm: 90, errPct: 0.18, p99: 142, apdex: 0.97, alerts: 0, instances: 1, env: 'production', spark: [10,12,10,14,12,10,14,12,10,14,12,10,12,14] }
  ],
  // ---- idc-bj ----
  'oa': [
    { id: 'oa-portal', name: 'oa-portal', lang: 'Java', langColor: _javaIco, langText: '☕', rpm: 240, errPct: 0.04, p99: 312, apdex: 0.95, alerts: 0, instances: 2, env: 'production', spark: [20,22,18,24,22,20,22,20,18,22,20,18,16,20] },
    { id: 'workflow-engine', name: 'workflow-engine', lang: 'Java', langColor: _javaIco, langText: '☕', rpm: 120, errPct: 0.42, p99: 980, apdex: 0.84, alerts: 1, instances: 2, env: 'production', spark: [30,32,38,42,40,46,52,48,55,62,58,64,60,66] },
    { id: 'doc-svc', name: 'doc-svc', lang: 'Node.js', langColor: _nodeIco, langText: 'JS', rpm: 60, errPct: 0.02, p99: 84, apdex: 0.98, alerts: 0, instances: 2, env: 'production', spark: [8,10,12,10,8,10,12,8,10,12,10,8,10,12] }
  ],
  'hr': [
    { id: 'hr-api', name: 'hr-api', lang: 'Java', langColor: _javaIco, langText: '☕', rpm: 80, errPct: 0.06, p99: 218, apdex: 0.96, alerts: 0, instances: 2, env: 'production', spark: [10,8,12,10,8,12,10,8,10,12,8,10,12,8] },
    { id: 'payroll-job', name: 'payroll-job', lang: 'Python', langColor: _pyIco, langText: 'Py', rpm: 12, errPct: 0.0, p99: 5400, apdex: 0.72, alerts: 0, instances: 1, env: 'production', spark: [60,75,82,90,95,98,90,85,88,92,85,90,95,88] },
    { id: 'benefits-portal', name: 'benefits-portal', lang: 'Node.js', langColor: _nodeIco, langText: 'JS', rpm: 45, errPct: 0.04, p99: 92, apdex: 0.98, alerts: 0, instances: 1, env: 'production', spark: [6,8,6,10,8,6,8,10,6,8,10,6,8,10] }
  ],
  'erp': [
    { id: 'erp-api', name: 'erp-api', lang: 'Java', langColor: _javaIco, langText: '☕', rpm: 320, errPct: 0.18, p99: 412, apdex: 0.93, alerts: 0, instances: 4, env: 'production', spark: [22,24,28,32,28,30,34,32,30,28,30,28,26,30] },
    { id: 'inventory-svc', name: 'inventory-svc', lang: 'Java', langColor: _javaIco, langText: '☕', rpm: 240, errPct: 0.32, p99: 620, apdex: 0.88, alerts: 1, instances: 3, env: 'production', spark: [40,42,46,52,48,52,56,58,52,56,58,52,54,56] },
    { id: 'mrp-runner', name: 'mrp-runner', lang: 'Java', langColor: _javaIco, langText: '☕', rpm: 30, errPct: 0.0, p99: 8200, apdex: 0.65, alerts: 0, instances: 1, env: 'production', spark: [70,82,88,92,95,98,92,88,90,92,88,92,90,88] },
    { id: 'bi-export', name: 'bi-export', lang: 'Python', langColor: _pyIco, langText: 'Py', rpm: 18, errPct: 0.06, p99: 320, apdex: 0.95, alerts: 0, instances: 1, env: 'production', spark: [12,14,12,16,14,12,16,14,12,14,12,14,12,14] }
  ],
  // ---- k8s-staging ----
  'eshop-stg': [
    { id: 'gateway', name: 'gateway', lang: 'Java', langColor: _javaIco, langText: '☕', rpm: 280, errPct: 0.22, p99: 168, apdex: 0.95, alerts: 0, instances: 1, env: 'staging', spark: [10,12,10,14,12,10,14,12,10,14,12,10,12,14] },
    { id: 'checkout-service', name: 'checkout-service', lang: 'Java', langColor: _javaIco, langText: '☕', rpm: 90, errPct: 0.86, p99: 412, apdex: 0.88, alerts: 1, instances: 1, env: 'staging', spark: [12,14,16,12,14,16,18,16,18,20,18,20,22,20] },
    { id: 'order-service', name: 'order-service', lang: 'Java', langColor: _javaIco, langText: '☕', rpm: 60, errPct: 0.18, p99: 246, apdex: 0.94, alerts: 0, instances: 1, env: 'staging', spark: [8,10,8,12,10,8,10,12,8,10,12,8,10,12] }
  ]
};

// Active service set — mutated by APM.pickProject in shell.js
APM.services = APM.projectServices['eshop'];

// Helper: is this service id present in the current project's service set?
APM.inProject = function(svcId) {
  return APM.services.some(s => s.id === svcId);
};

// Helpers
APM.health = function(s) {
  if (s.errPct >= 1 || s.alerts > 0) return 'err';
  if (s.errPct >= 0.3 || s.p99 > 600) return 'warn';
  return 'ok';
};
APM.healthColor = function(h) { return h === 'ok' ? 'var(--success)' : (h === 'warn' ? 'var(--warning)' : 'var(--danger)'); };

// Active alerts (pretend pulled from N9e)
APM.alerts = [
  { id: 'al-001', state: 'firing', sev: 'critical', title: 'ledger-service 错误率超阈值', rule: 'ledger:err_rate > 1%', svc: 'ledger-service', startedAt: '18:22:14', duration: '14m', source: 'n9e' },
  { id: 'al-002', state: 'firing', sev: 'critical', title: 'ledger-service P99 延迟劣化', rule: 'svc:p99 > 1s', svc: 'ledger-service', startedAt: '18:24:08', duration: '12m', source: 'n9e' },
  { id: 'al-003', state: 'firing', sev: 'warning', title: 'risk-service P99 接近阈值', rule: 'svc:p99 > 800ms', svc: 'risk-service', startedAt: '18:30:42', duration: '5m', source: 'n9e' },
  { id: 'al-004', state: 'firing', sev: 'warning', title: 'checkout HikariCP 连接池等待数 > 0', rule: 'jdbc:pending > 0 for 2m', svc: 'checkout-service', startedAt: '18:33:11', duration: '2m', source: 'n9e' },
  { id: 'al-005', state: 'pending', sev: 'warning', title: 'order-service Young GC 频率上升', rule: 'jvm:young_gc_rate > 60/min', svc: 'order-service', startedAt: '18:35:00', duration: '20s', source: 'n9e' },
  { id: 'al-006', state: 'resolved', sev: 'critical', title: 'gateway 5xx 突增 (已恢复)', rule: 'http:5xx_rate > 2%', svc: 'gateway', startedAt: '17:46:00', duration: '8m', source: 'n9e' },
  { id: 'al-007', state: 'resolved', sev: 'warning', title: 'redis 连接超时 (已恢复)', rule: 'redis:timeout > 0', svc: 'risk-service', startedAt: '17:12:00', duration: '3m', source: 'n9e' },
  { id: 'al-008', state: 'firing',   sev: 'critical', title: 'ledger-cdc consumer lag > 10k', rule: 'kafka:consumer_lag > 10000', svc: 'ledger-service', startedAt: '18:24:30', duration: '11m', source: 'n9e' },
  { id: 'al-009', state: 'firing',   sev: 'warning',  title: 'kafka-03 ISR under-replicated', rule: 'kafka:isr_under_min > 0',     svc: 'ledger-service', startedAt: '18:31:08', duration: '4m',  source: 'n9e' }
];

APM.activeAlertCount = APM.alerts.filter(a => a.state === 'firing').length;

// Logged-in user (used for "认领" / audit attribution)
APM.currentUser = { initials:'JX', email:'jx@eshop.com', role:'admin' };

// Audit-log helper: prepend an entry. Any CRUD button can call this.
APM.logAudit = function(action, resource, result) {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  const ss = String(now.getSeconds()).padStart(2,'0');
  APM.audit = APM.audit || [];
  APM.audit.unshift({
    ts: `${hh}:${mm}:${ss}`,
    user: APM.currentUser.email,
    action,
    resource: resource || '—',
    ip: '10.42.1.18',
    result: result || 'ok'
  });
};

// Exceptions
APM.exceptions = [
  { type: 'SQLIntegrityConstraintViolationException', msg: 'Duplicate entry \'ord_82910\' for key \'ledger.PRIMARY\'', svc: 'ledger-service', count: 142, traces: 142, first: '18:22', last: '刚刚', delta: '+38%' },
  { type: 'TimeoutException', msg: 'Read timed out: stripe.com after 3000ms', svc: 'payment-service', count: 28, traces: 28, first: '18:01', last: '2m前', delta: '+12%' },
  { type: 'IllegalArgumentException', msg: 'order.amount must be positive, got -1.5', svc: 'order-service', count: 14, traces: 14, first: '17:48', last: '6m前', delta: '-20%' },
  { type: 'JedisConnectionException', msg: 'Could not get a resource from the pool', svc: 'risk-service', count: 8, traces: 8, first: '18:30', last: '1m前', delta: '+8%' },
  { type: 'ValidationError', msg: 'phone must be a valid E.164 number', svc: 'user-service', count: 6, traces: 6, first: '17:20', last: '12m前', delta: '0%' }
];

// SQL templates (top slow queries)
APM.slowQueries = [
  { sql: 'SELECT * FROM orders WHERE user_id = ? AND status IN (?, ?, ?) ORDER BY created_at DESC LIMIT ?', svc: 'order-service', count: 1842, p99: 820, avg: 142, rows: '~250' },
  { sql: 'SELECT risk_profile, score FROM user_risk WHERE user_id = ? FOR UPDATE', svc: 'risk-service', count: 1240, p99: 692, avg: 110, rows: '1' },
  { sql: 'INSERT INTO ledger (order_id, amount, ts) VALUES (?, ?, ?)', svc: 'ledger-service', count: 980, p99: 408, avg: 88, rows: '1' },
  { sql: 'UPDATE inventory SET qty = qty - ? WHERE sku = ? AND qty >= ?', svc: 'checkout-service', count: 720, p99: 312, avg: 64, rows: '1' },
  { sql: 'SELECT COUNT(*) FROM events WHERE tenant = ? AND ts > ? AND type = ?', svc: 'notify-service', count: 540, p99: 286, avg: 52, rows: '1' }
];

// Endpoints (api-level) for service detail
APM.endpoints = [
  { method: 'POST', path: '/checkout', rpm: 480, errPct: 0.62, p50: 96, p95: 312, p99: 820, apdex: 0.86 },
  { method: 'POST', path: '/checkout/preview', rpm: 240, errPct: 0.04, p50: 48, p95: 142, p99: 240, apdex: 0.96 },
  { method: 'GET',  path: '/checkout/cart/:id', rpm: 320, errPct: 0.02, p50: 22, p95: 64, p99: 128, apdex: 0.99 },
  { method: 'POST', path: '/checkout/coupon/apply', rpm: 110, errPct: 1.20, p50: 88, p95: 240, p99: 540, apdex: 0.81 },
  { method: 'DELETE', path: '/checkout/cart/item/:sku', rpm: 80, errPct: 0.0, p50: 18, p95: 52, p99: 108, apdex: 0.99 }
];

// Logs (sample)
APM.logs = (function() {
  const arr = [];
  const samples = [
    { sev: 'INFO', svc: 'gateway', msg: 'GET /api/v2/orders 200 28ms user=u_2812' },
    { sev: 'INFO', svc: 'checkout-service', msg: 'POST /checkout cart=c_8812 amount=159.00 user=u_2813 trace=4f2c9a..b801' },
    { sev: 'WARN', svc: 'risk-service', msg: 'risk score elevated 0.78 user=u_2813 reason=device_change' },
    { sev: 'INFO', svc: 'payment-service', msg: 'stripe.charges.create id=ch_abc currency=CNY amount=15900' },
    { sev: 'ERROR', svc: 'ledger-service', msg: 'SQLIntegrityConstraintViolationException at LedgerDAO.insert(LedgerDAO.java:87)', trace: '4f2c9a..b801' },
    { sev: 'WARN', svc: 'checkout-service', msg: 'transaction rolled back due to downstream failure trace=4f2c9a..b801' },
    { sev: 'ERROR', svc: 'checkout-service', msg: 'POST /checkout returned 500 in 1820ms trace=4f2c9a..b801', trace: '4f2c9a..b801' },
    { sev: 'INFO', svc: 'notify-service', msg: 'sms.send phone=+86138... template=order_failed' },
    { sev: 'DEBUG', svc: 'auth-service', msg: 'jwt.verify aud=eshop iss=auth.eshop.com user=u_2813' },
    { sev: 'INFO', svc: 'gateway', msg: 'GET /api/v2/health 200 4ms' },
    { sev: 'WARN', svc: 'risk-service', msg: 'redis pool exhausted pending=4 max=20' },
    { sev: 'INFO', svc: 'user-service', msg: 'cache.hit key=user:profile:u_2813 ttl=58s' }
  ];
  let t = new Date();
  for (let i = 0; i < 80; i++) {
    const s = samples[i % samples.length];
    const ts = new Date(t.getTime() - i * 2400);
    const hh = String(ts.getHours()).padStart(2, '0');
    const mm = String(ts.getMinutes()).padStart(2, '0');
    const ss = String(ts.getSeconds()).padStart(2, '0');
    const ms = String(ts.getMilliseconds()).padStart(3, '0');
    arr.push({ ...s, ts: `${hh}:${mm}:${ss}.${ms}` });
  }
  return arr;
})();

// Alert rule definitions (Settings · Alerts → 规则配置 sub-tab)
APM.alertRules = [
  { id:'r-001', name:'ledger:err_rate > 1%', metric:'svc:err_rate', op:'>', threshold:'1%', forDur:'5m', svc:'ledger-service', sev:'critical', enabled:true },
  { id:'r-002', name:'svc:p99 > 1s', metric:'svc:p99', op:'>', threshold:'1s', forDur:'10m', svc:'*', sev:'critical', enabled:true },
  { id:'r-003', name:'svc:p99 > 800ms', metric:'svc:p99', op:'>', threshold:'800ms', forDur:'10m', svc:'risk-service', sev:'warning', enabled:true },
  { id:'r-004', name:'jdbc:pending > 0 for 2m', metric:'jdbc:pending', op:'>', threshold:'0', forDur:'2m', svc:'checkout-service', sev:'warning', enabled:true },
  { id:'r-005', name:'jvm:young_gc_rate > 60/min', metric:'jvm:young_gc_rate', op:'>', threshold:'60/min', forDur:'3m', svc:'*', sev:'warning', enabled:true },
  { id:'r-006', name:'http:5xx_rate > 2%', metric:'http:5xx_rate', op:'>', threshold:'2%', forDur:'2m', svc:'gateway', sev:'critical', enabled:true },
  { id:'r-007', name:'redis:timeout > 0', metric:'redis:timeout', op:'>', threshold:'0', forDur:'1m', svc:'*', sev:'warning', enabled:false },
  { id:'r-008', name:'apdex < 0.85', metric:'svc:apdex', op:'<', threshold:'0.85', forDur:'15m', svc:'*', sev:'warning', enabled:true },
  { id:'r-009', name:'kafka:lag > 10k',         metric:'kafka:consumer_lag',    op:'>', threshold:'10000',  forDur:'5m', svc:'ledger-service', sev:'critical', enabled:true },
  { id:'r-010', name:'kafka:isr < replicas',    metric:'kafka:isr_under_min',   op:'>', threshold:'0',      forDur:'2m', svc:'*',              sev:'critical', enabled:true },
  { id:'r-011', name:'kafka:rebalance > 5/min', metric:'kafka:group_rebalance', op:'>', threshold:'5/min',  forDur:'2m', svc:'*',              sev:'warning',  enabled:true }
];

// On-call schedules (Alerts → 值班 sub-tab)
APM.schedules = [
  { id:'sch-1', team:'SRE 主班', current:'JX', next:'LM', shiftStart:'08:00', shiftEnd:'20:00', tz:'Asia/Shanghai' },
  { id:'sch-2', team:'SRE 夜班', current:'WT', next:'YH', shiftStart:'20:00', shiftEnd:'08:00', tz:'Asia/Shanghai' },
  { id:'sch-3', team:'支付组 oncall', current:'ZP', next:'CL', shiftStart:'09:30', shiftEnd:'21:30', tz:'Asia/Shanghai' },
  { id:'sch-4', team:'数据库 DBA', current:'HD', next:'XF', shiftStart:'09:00', shiftEnd:'18:00', tz:'Asia/Shanghai' }
];

// Silences (Alerts → 抑制 sub-tab)
APM.silences = [
  { id:'sil-1', matcher:'svc=order-service AND env=staging', creator:'lm@eshop.com', expiresAt:'2026-05-05 22:00', reason:'灰度发布窗口' },
  { id:'sil-2', matcher:'rule=jvm:young_gc_rate', creator:'jx@eshop.com', expiresAt:'2026-05-06 02:00', reason:'GC 调参观察' },
  { id:'sil-3', matcher:'svc=notify-service AND severity=warning', creator:'sre-bot', expiresAt:'2026-05-05 20:30', reason:'第三方供应商升级' }
];

// N+1 suspects (Database → N+1 sub-tab)
APM.nplusOne = [
  { parent:'SELECT * FROM orders WHERE user_id = ?', child:'SELECT * FROM order_items WHERE order_id = ?', mult:'~250×', svc:'order-service', traces:142, exampleTrace:'4f2c9a...b801' },
  { parent:'SELECT id FROM users LIMIT ?', child:'SELECT score FROM user_risk WHERE user_id = ?', mult:'~50×', svc:'risk-service', traces:58, exampleTrace:'e28f41...9a20' },
  { parent:'SELECT id FROM carts WHERE user_id = ?', child:'SELECT qty FROM inventory WHERE sku = ?', mult:'~12×', svc:'checkout-service', traces:32, exampleTrace:'a91d2e...7cf2' },
  { parent:'SELECT campaign_id FROM events WHERE tenant=?', child:'SELECT title FROM campaigns WHERE id=?', mult:'~30×', svc:'notify-service', traces:18, exampleTrace:'f6b222...e1a8' }
];

// Connection pools (Database → 连接池 sub-tab)
APM.connectionPools = [
  { svc:'checkout-service', pool:'HikariCP/mysql-main', active:18, idle:2, pending:4, max:20, waitMs:312, state:'warn' },
  { svc:'order-service', pool:'HikariCP/mysql-main', active:12, idle:8, pending:0, max:20, waitMs:0, state:'ok' },
  { svc:'ledger-service', pool:'HikariCP/mysql-ledger', active:9, idle:3, pending:2, max:12, waitMs:188, state:'warn' },
  { svc:'risk-service', pool:'pgbouncer/pg-risk', active:8, idle:4, pending:0, max:16, waitMs:12, state:'ok' },
  { svc:'user-service', pool:'asyncpg/pg-users', active:6, idle:10, pending:0, max:16, waitMs:0, state:'ok' }
];

// Transactions (Database → 事务 sub-tab)
APM.transactions = [
  { svc:'checkout-service', name:'placeOrder', avgMs:312, count:480, commitPct:'98.4%', rollbackPct:'1.6%' },
  { svc:'ledger-service', name:'writeLedger', avgMs:88, count:980, commitPct:'94.8%', rollbackPct:'5.2%' },
  { svc:'order-service', name:'cancelOrder', avgMs:142, count:62, commitPct:'100%', rollbackPct:'0%' },
  { svc:'payment-service', name:'capturePayment', avgMs:198, count:240, commitPct:'99.6%', rollbackPct:'0.4%' },
  { svc:'checkout-service', name:'applyCoupon', avgMs:64, count:110, commitPct:'97.2%', rollbackPct:'2.8%' },
  { svc:'risk-service', name:'updateRiskProfile', avgMs:108, count:540, commitPct:'100%', rollbackPct:'0%' }
];

// Redis ops (Database → Redis sub-tab)
APM.redisOps = [
  { cmd:'GET user:profile:*', svc:'user-service', count:4820, p99Ms:8, hitPct:'94%' },
  { cmd:'SETEX session:*', svc:'auth-service', count:980, p99Ms:6, hitPct:'—' },
  { cmd:'INCR rate-limit:*', svc:'gateway', count:6210, p99Ms:4, hitPct:'—' },
  { cmd:'HGETALL cart:*', svc:'checkout-service', count:520, p99Ms:14, hitPct:'82%' },
  { cmd:'ZADD risk-queue', svc:'risk-service', count:240, p99Ms:18, hitPct:'—' },
  { cmd:'LPUSH notify:fanout', svc:'notify-service', count:410, p99Ms:6, hitPct:'—' }
];

// Settings · Members (mutable list — supports CRUD)
APM.members = [
  { initials:'JX', email:'jx@eshop.com', role:'admin', desc:'所有权限', activeAt:'2 分钟前', online:true },
  { initials:'LM', email:'lm@eshop.com', role:'sre', desc:'SRE · 全部读 / 告警写', activeAt:'1h 前', online:true },
  { initials:'ZW', email:'zw@eshop.com', role:'dev', desc:'开发 · 仅 eshop', activeAt:'4h 前', online:false },
  { initials:'HD', email:'hd@eshop.com', role:'dba', desc:'DBA · DB Calls 写', activeAt:'昨天', online:false },
  { initials:'QY', email:'qy@eshop.com', role:'viewer', desc:'只读', activeAt:'3d 前', online:false }
];

// Settings · Sampling rules (mutable)
APM.samplingRules = [
  { priority:1, name:'保留所有错误', cond:'status = error OR http.status >= 500', rate:'100%', enabled:true },
  { priority:2, name:'慢请求全采', cond:'duration > 1s', rate:'100%', enabled:true },
  { priority:3, name:'支付链路全采', cond:'service IN (payment-service, ledger-service)', rate:'100%', enabled:true },
  { priority:4, name:'/health 不采', cond:'http.target = /health OR /metrics', rate:'0%', enabled:true },
  { priority:5, name:'默认 (probabilistic)', cond:'其余请求', rate:'5%', enabled:true }
];

// Settings · Tokens (mutable)
APM.tokens = [
  { name:'eshop-prod-ingest', scope:'traces:write metrics:write', prefix:'tk_prod_8a2c…', createdAt:'2024-08-12', usedAt:'2 分钟前', active:true },
  { name:'eshop-stg-ingest', scope:'traces:write', prefix:'tk_stg_44f1…', createdAt:'2024-09-01', usedAt:'14h 前', active:true },
  { name:'n9e-readonly', scope:'metrics:read alerts:write', prefix:'tk_n9e_22cd…', createdAt:'2024-07-04', usedAt:'5 分钟前', active:true },
  { name:'debug-jx', scope:'*', prefix:'tk_dev_71ab…', createdAt:'2024-10-22', usedAt:'3d 前', active:true },
  { name:'old-finance-ingest', scope:'traces:write', prefix:'tk_fin_19e2…', createdAt:'2023-11-08', usedAt:'120d 前', active:false },
  { name:'ci-bot', scope:'traces:write', prefix:'tk_ci_550a…', createdAt:'2024-06-30', usedAt:'1d 前', active:true }
];

// Kafka · Topics (Kafka 消息 page)
APM.kafkaTopics = [
  { name:'order-events',       partitions:12, replication:3, isr:3, retention:'7d',  msgRate:1820, mbRate:6.4,  p99PubMs:18, p99ConMs:42, lag:240,    alerts:0, owner:'order-service', cleanup:'delete' },
  { name:'payment-events',     partitions:8,  replication:3, isr:3, retention:'30d', msgRate:820,  mbRate:3.2,  p99PubMs:14, p99ConMs:38, lag:18,     alerts:0, owner:'payment-service', cleanup:'delete' },
  { name:'ledger-cdc',         partitions:6,  replication:3, isr:2, retention:'7d',  msgRate:1240, mbRate:4.8,  p99PubMs:22, p99ConMs:56, lag:18420,  alerts:1, owner:'ledger-service', cleanup:'compact' },
  { name:'risk-decisions',     partitions:6,  replication:3, isr:3, retention:'14d', msgRate:640,  mbRate:1.8,  p99PubMs:12, p99ConMs:34, lag:120,    alerts:0, owner:'risk-service', cleanup:'delete' },
  { name:'notify-fanout',      partitions:16, replication:3, isr:3, retention:'3d',  msgRate:2410, mbRate:5.1,  p99PubMs:10, p99ConMs:28, lag:560,    alerts:0, owner:'notify-service', cleanup:'delete' },
  { name:'user-activity',      partitions:24, replication:3, isr:3, retention:'30d', msgRate:6820, mbRate:14.2, p99PubMs:8,  p99ConMs:22, lag:140,    alerts:0, owner:'user-service', cleanup:'delete' },
  { name:'audit-log',          partitions:4,  replication:3, isr:3, retention:'180d',msgRate:120,  mbRate:0.4,  p99PubMs:8,  p99ConMs:12, lag:0,      alerts:0, owner:'gateway',     cleanup:'delete' },
  { name:'inventory-snapshot', partitions:8,  replication:3, isr:3, retention:'compact', msgRate:60, mbRate:0.6, p99PubMs:14, p99ConMs:28, lag:8,    alerts:0, owner:'checkout-service', cleanup:'compact' }
];

// Kafka · Consumer groups
APM.kafkaGroups = [
  { name:'risk-consumer',     members:3, topics:['order-events','payment-events'], lag:240,   lagDelta:'+12',   status:'stable',    rebalances1h:0, lastRebalance:'2h 前' },
  { name:'ledger-writer',     members:2, topics:['ledger-cdc'],                     lag:18420, lagDelta:'+1820', status:'lag-rising', rebalances1h:0, lastRebalance:'18m 前' },
  { name:'notify-dispatcher', members:6, topics:['notify-fanout'],                  lag:560,   lagDelta:'-40',   status:'stable',    rebalances1h:1, lastRebalance:'12m 前' },
  { name:'user-activity-bi',  members:4, topics:['user-activity'],                  lag:140,   lagDelta:'-20',   status:'stable',    rebalances1h:0, lastRebalance:'昨天' },
  { name:'audit-archiver',    members:1, topics:['audit-log'],                      lag:0,     lagDelta:'0',     status:'idle',      rebalances1h:0, lastRebalance:'3d 前' }
];

// Kafka · Brokers
APM.kafkaBrokers = [
  { id:1, host:'kafka-01.eshop.cluster:9092', isr:48, leader:24, diskPct:62, netInMB:38.4, netOutMB:42.8, controller:true,  status:'ok' },
  { id:2, host:'kafka-02.eshop.cluster:9092', isr:48, leader:22, diskPct:58, netInMB:34.2, netOutMB:39.1, controller:false, status:'ok' },
  { id:3, host:'kafka-03.eshop.cluster:9092', isr:46, leader:22, diskPct:71, netInMB:31.8, netOutMB:36.4, controller:false, status:'warn' }
];

// Kafka · Producer / Consumer maps (svc → topic) — generated for tables and Service-detail Kafka tab
APM.kafkaProducers = [
  { svc:'order-service',     topic:'order-events',   rate:1820, errPct:0.04, p99PubMs:18 },
  { svc:'payment-service',   topic:'payment-events', rate:820,  errPct:0.02, p99PubMs:14 },
  { svc:'ledger-service',    topic:'ledger-cdc',     rate:1240, errPct:0.42, p99PubMs:22 },
  { svc:'risk-service',      topic:'risk-decisions', rate:640,  errPct:0.06, p99PubMs:12 },
  { svc:'checkout-service',  topic:'order-events',   rate:240,  errPct:0.08, p99PubMs:16 },
  { svc:'checkout-service',  topic:'inventory-snapshot', rate:60, errPct:0,  p99PubMs:14 },
  { svc:'gateway',           topic:'audit-log',      rate:120,  errPct:0,    p99PubMs:8  },
  { svc:'user-service',      topic:'user-activity',  rate:6820, errPct:0.02, p99PubMs:8  },
  { svc:'notify-service',    topic:'notify-fanout',  rate:2410, errPct:0.04, p99PubMs:10 }
];
APM.kafkaConsumers = [
  { svc:'risk-service',     group:'risk-consumer',     topic:'order-events',   rate:1820, p99ConMs:34, lag:140 },
  { svc:'risk-service',     group:'risk-consumer',     topic:'payment-events', rate:820,  p99ConMs:38, lag:100 },
  { svc:'ledger-service',   group:'ledger-writer',     topic:'ledger-cdc',     rate:1180, p99ConMs:56, lag:18420 },
  { svc:'notify-service',   group:'notify-dispatcher', topic:'notify-fanout',  rate:2380, p99ConMs:28, lag:560 },
  { svc:'user-service',     group:'user-activity-bi',  topic:'user-activity',  rate:6800, p99ConMs:22, lag:140 },
  { svc:'gateway',          group:'audit-archiver',    topic:'audit-log',      rate:120,  p99ConMs:12, lag:0   }
];

// Settings · Audit (mutable; new actions are prepended)
APM.audit = [
  { ts:'18:34:18', user:'jx@eshop.com', action:'sampling.rule.update', resource:'规则 #4 (/health)', ip:'10.42.1.18', result:'ok' },
  { ts:'18:30:02', user:'sre-bot', action:'token.rotate', resource:'tk_n9e_22cd', ip:'10.0.4.7', result:'ok' },
  { ts:'17:48:46', user:'lm@eshop.com', action:'alert.rule.create', resource:'ledger:err_rate > 1%', ip:'10.42.1.22', result:'ok' },
  { ts:'17:40:11', user:'zw@eshop.com', action:'member.invite', resource:'dev2@eshop.com', ip:'113.66.x.x', result:'ok' },
  { ts:'17:12:22', user:'jx@eshop.com', action:'dashboard.delete', resource:'旧版 GMV 概览', ip:'10.42.1.18', result:'ok' },
  { ts:'16:08:00', user:'viewer@eshop.com', action:'token.create', resource:'—', ip:'113.66.x.x', result:'forbidden' }
];

// Trace list
APM.traces = [
  { id: '4f2c9a...b801', root: 'POST /checkout', svc: 'checkout-service', status: 500, statusKind: 'err', dur: 1820, spans: 47, ts: '18:36:04', err: true },
  { id: 'a91d2e...7cf2', root: 'POST /pay/card', svc: 'payment-service', status: 200, statusKind: 'ok', dur: 760, spans: 32, ts: '18:36:02' },
  { id: 'c7810b...44d1', root: 'GET /orders/o_8172', svc: 'order-service', status: 200, statusKind: 'ok', dur: 318, spans: 18, ts: '18:36:01' },
  { id: 'e28f41...9a20', root: 'POST /risk/score', svc: 'risk-service', status: 200, statusKind: 'warn', dur: 1120, spans: 24, ts: '18:35:58' },
  { id: '88d730...0156', root: 'GET /user/profile', svc: 'user-service', status: 200, statusKind: 'ok', dur: 88, spans: 9, ts: '18:35:57' },
  { id: 'f6b222...e1a8', root: 'POST /notify/sms', svc: 'notify-service', status: 200, statusKind: 'ok', dur: 212, spans: 14, ts: '18:35:55' },
  { id: '1d0c55...77b3', root: 'POST /ledger/write', svc: 'ledger-service', status: 500, statusKind: 'err', dur: 604, spans: 21, ts: '18:35:52', err: true }
];
