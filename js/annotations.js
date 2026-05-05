// Annotation overlay — press `?` on any page to see design notes & open questions.
// Designed for dev-team review of the prototype. Companion to DESIGN-DISCUSSION.md.

APM.annotations = {
  _global: {
    title: '全局 · 跨页设计模式',
    intent: '原型整体遵循的、不绑定单一页面的设计原则。',
    decisions: [
      { what: '路由参数单次消费', why: 'A→B 跳转携带的过滤会在 B 渲染时 read+delete，避免回到 B 残留旧 state。' },
      { what: '集群（cluster）是一等公民', why: 'DB / Redis / Kafka 顶层先选集群再看资源；故障定位 90% 是集群级问题。' },
      { what: '健康度色环主导', why: '扫视看颜色（绿/黄/红），定位看数字。色环 + 数字双轨。' },
      { what: '双向贯通', why: '告警/异常/日志行都有「查看 trace」入口；trace 也能反向到日志。无单向死路。' },
      { what: '设计语言：Apple HIG + Linear', why: '玻璃质感 + 紧凑间距，不直接借用 antd/shadcn（留白规则不同）。' }
    ],
    open: [
      '是否需要顶层「全局集群过滤器」一选影响所有 infra 页？',
      'Domain → Project → Service 三级是否够用？要不要 Team/Squad 级？',
      '哪些过滤值得写入 URL（可分享）？哪些单次消费？'
    ]
  },

  overview: {
    title: 'Overview · 服务总览',
    intent: '运维入口。所有服务卡片化排列 + 健康度排序，一眼看到「谁红了」。',
    decisions: [
      { what: '默认按健康度排序，不是告警数', why: '告警可能误报，健康度综合 error/p99/apdex 更稳。' },
      { what: '卡片只放 4 个数字（health / RPM / P99 / err%）', why: '更多反而扫不动。深度看进 Service 详情。' },
      { what: '搜索框 + 排序循环按钮', why: '没做高级筛选，原型阶段够用；真实环境要加 tag 过滤。' }
    ],
    open: [
      '是否需要「我的服务」过滤（基于 ownership）？',
      '卡片密度（4 列）合不合适？大屏可以 6 列吗？',
      '健康度算法是否要让用户可配置（每个项目不同权重）？'
    ]
  },

  service: {
    title: 'Service Detail · 服务详情',
    intent: '单服务深度视图。从 10 tab 折叠到 6 tab + 嵌套 subtab，降低横向密度。',
    decisions: [
      { what: '6 个一级 tab：Overview / Endpoints / Signals / Dependencies / Runtime / Exceptions', why: '原本 10 tab 横向溢出且 Traces+Logs 几乎一起看。' },
      { what: 'Signals 嵌 Traces+Logs；Dependencies 嵌 DB+Kafka+External', why: '语义聚合，nested subtab 切换轻。' },
      { what: '顶部三按钮（SLO / 告警规则 / 看 Trace）', why: '高频跳出动作，不应埋在 tab 里。' },
      { what: '时间过滤（15m/1h/6h/24h）数字按系数重放', why: '原型够用；真环境对接时间序列数据库。' }
    ],
    open: [
      'Signals 把 Traces/Logs 合并是否合理？',
      'Runtime 切分（process/instances/jvm）粒度合不合适？',
      'Exceptions 是否应并入 Signals 不要独立 tab？',
      '关键端点 vs 全端点要不要合一张表（用筛选切换）？'
    ]
  },

  traces: {
    title: 'Traces · 调用链查询',
    intent: '分布式追踪的核心入口。条件构造器 + 四视图详情。',
    decisions: [
      { what: '条件构造器（key/op/value 三段）', why: '比纯文本搜索精准，比 query DSL 易学。' },
      { what: 'Trace 详情四 tab：Waterfall / Logs / Service Map / JSON', why: '不同人定位习惯不同，保留所有视角。' },
      { what: 'Logs tab 自动按 trace_id 过滤匹配的日志', why: '减少跨页跳转。' },
      { what: '集群参数透传（来自 DB/Redis/Kafka 集群跳转）', why: '维持上下文，不需要再过滤一次。' }
    ],
    open: [
      '保存查询是否需要团队共享？现在只本会话保留。',
      '是否需要「按服务分组的 trace 漏斗」视图（funnel）？',
      'Service Map 是要静态依赖图还是按 trace 动态聚合？'
    ]
  },

  logs: {
    title: 'Logs · 日志查询',
    intent: '应用日志聚合。强调「日志 → trace」反向跳转。',
    decisions: [
      { what: '日志行 svc 列点击跳服务详情；trace=xxx 文字点击跳调用链', why: '日志是排查起点，必须无缝转 trace。' },
      { what: '级别 tab（ALL/INFO/WARN/ERROR）', why: '定位错误时大多数时间只看 ERROR；一键收敛。' },
      { what: '暂停按钮（停止 tail）', why: '故障复盘时需要冻结画面看一行行。' }
    ],
    open: [
      '是否需要「正则搜索」模式（与全文搜索切换）？',
      '日志和 OpenSearch / Loki 哪个对接？schema 不一样。',
      '上下文（前后 N 行）展开按钮要不要做？'
    ]
  },

  topology: {
    title: 'Topology · 服务依赖图',
    intent: '宏观看服务之间的调用关系 + RPM/错误率热度。',
    decisions: [
      { what: '时间窗口切换 → 数字按系数重放', why: '拓扑不是静态，是「故障当时的样子」。' },
      { what: '点服务节点高亮上下游', why: '突出依赖路径，淡化无关节点。' },
      { what: '缩放按钮（+/-/适配）', why: '节点多时手动 SVG 缩放比拖拽自然。' }
    ],
    open: [
      'P2 待办：时间 scrubber 拖动回放（逐秒还是 5 分钟桶）。',
      '是否叠加「事故标记点」（红色竖线代表告警时刻）？',
      '布局算法：现在是手工 layout，要不要换 force-directed？'
    ]
  },

  alerts: {
    title: 'Alerts · 告警',
    intent: '展示活跃告警 + 跳转处理。原型不做完整告警引擎，只做视图层。',
    decisions: [
      { what: '每行有「查看 trace」+「在 n9e 处理」', why: '原型不取代 n9e，做承接和跳转。' },
      { what: '静音 / 认领 modal', why: '常规动作不进独立页面。' },
      { what: '子 tab：告警 / 规则 / 值班 / 抑制', why: '运维全套，但只规则配置是写场景。' }
    ],
    open: [
      '告警通知通道（Slack/邮件/Webhook）入口放哪？现在没做。',
      '值班排班是要原型自管，还是接外部系统（PagerDuty/飞书）？',
      '抑制规则的 matcher 语法借鉴 Alertmanager 还是自定义？'
    ]
  },

  exceptions: {
    title: 'Exceptions · 异常聚合',
    intent: '按错误类型聚合的异常视图。比逐条 trace 更高维。',
    decisions: [
      { what: '按 类型/服务/小时 三种分组切换', why: '不同分析视角；Sentry 同款。' },
      { what: '堆栈 modal + Traces 跳转', why: '看堆栈定位代码，看 trace 定位上游。' }
    ],
    open: [
      '堆栈是否要源码映射到 GitLab？需要源码服务。',
      '异常去重逻辑：现在按 type+message。要不要按 stack 顶帧？',
      '是否需要「忽略某类异常」（与告警抑制不同）？'
    ]
  },

  dashboards: {
    title: 'Dashboards · 仪表盘',
    intent: 'Grafana-like 自定义视图，但聚焦业务指标（不是裸监控）。',
    decisions: [
      { what: '变量过滤（service/endpoint/env/region）', why: '一份模板适配多场景。' },
      { what: '面板拖拽编辑暂未实装', why: 'P2 工作量大，原型阶段先 toast。' },
      { what: '收藏 + 分享链接', why: '团队协作必备。' }
    ],
    open: [
      '是否要直接复用 Grafana 的 panel 协议？还是自定义？',
      '面板告警阈值标记（红线）要不要内置？',
      '看板 vs Service 详情功能重叠，怎么划分？'
    ]
  },

  database: {
    title: 'Database · 数据库观测',
    intent: '从「集群级」入手定位 DB 问题，不是裸 SQL 列表。',
    decisions: [
      { what: '顶层先选集群再下钻 5 个 tab', why: '故障 90% 是集群级（连接池满、主从延迟），不是单条 SQL。' },
      { what: '5 tab：慢查询 / N+1 / 连接池 / 事务 / 集群', why: 'DBA 关心的五大维度。' },
      { what: 'EXPLAIN 按钮 modal 展示执行计划', why: '不跳出原型也能看 plan。' },
      { what: 'Trace 跳转携带 sql 过滤', why: '从 SQL 反查触发的请求。' }
    ],
    open: [
      'N+1 检测算法：现在是 mock。真实环境要不要静态扫还是动态聚合 trace？',
      '集群 tab 要不要再分主/从节点视图？',
      'Redis 和 DB 共用「集群」概念合不合适？'
    ]
  },

  redis: {
    title: 'Redis · 缓存观测',
    intent: '与 Database 对称，但聚焦命令统计 + 命中率。',
    decisions: [
      { what: '顶层选集群 + 命令分布', why: '看哪类命令拖慢整体。' },
      { what: '命中率突出展示', why: '业务最关心的单一指标。' }
    ],
    open: [
      '是否需要「热 key 检测」？现在没做，需要 sampling。',
      'Cluster 模式 vs Sentinel 模式视图差异要不要分？'
    ]
  },

  kafka: {
    title: 'Kafka · 消息队列观测',
    intent: '生产者 / 消费者 / Topic / Lag 四视角。',
    decisions: [
      { what: '集群下钻：Topics / Producers / Consumers', why: 'Kafka 三角色清晰，分别看。' },
      { what: 'Consumer lag 突出展示', why: '99% 故障表现为消费滞后。' }
    ],
    open: [
      '是否需要 partition 级别下钻？数据量大。',
      'Schema Registry 是否融入这里还是独立模块？'
    ]
  },

  llm: {
    title: 'LLM · 大模型成本与可观测',
    intent: '把 LLM 调用当作一种「外部依赖」纳入 APM 视野。',
    decisions: [
      { what: '成本归因到 团队/项目/Endpoint', why: '财务和工程双视角。' },
      { what: '预算告警入口', why: 'LLM 成本失控比性能问题更紧急。' }
    ],
    open: [
      '是否要做「Prompt 调优建议」（基于 token 浪费检测）？',
      '多模型对比视图（同一 prompt 不同 model 的成本/质量）要不要？',
      '与传统 APM 模块视觉风格是否一致？现在偏轻。'
    ]
  },

  settings: {
    title: 'Settings · 平台管理',
    intent: '低频管理操作集中地。所有 CRUD 走 modal，不进独立路由。',
    decisions: [
      { what: 'Modal CRUD 而非 sub-page', why: '一次性写入操作不需要 URL 化。' },
      { what: 'Token 生成走两步 modal（生成 → 复制）', why: '只显示一次的安全 pattern。' },
      { what: '审计日志放在 Settings 里', why: '低频查看；但是否独立成顶层页可讨论。' }
    ],
    open: [
      'Token 是否需要「下载为文件」选项？',
      '审计日志独立成顶层页面（不放 Settings）会不会更对？',
      '权限粒度：现在角色级。要不要 Project / Service 级 ACL？'
    ]
  },

  onboarding: {
    title: 'Onboarding · 接入引导',
    intent: '让新服务接入 APM 的 5 分钟向导。',
    decisions: [
      { what: '按语言分支（Java/Go/Python/Node）展示 snippet', why: 'copy-paste 友好。' },
      { what: '复制按钮 + toast', why: '降低 onboarding 摩擦。' }
    ],
    open: [
      '是否需要「自动验证接入成功」（轮询第一条 trace）？',
      'K8s sidecar 模式 vs SDK 模式要不要在这里二选一？'
    ]
  }
};

APM._annLabels = {
  overview: '服务总览', service: '服务详情', traces: '调用链', logs: '日志',
  topology: '拓扑', alerts: '告警', exceptions: '异常', dashboards: '仪表盘',
  database: '数据库', redis: 'Redis', kafka: 'Kafka', llm: 'LLM',
  settings: '设置', onboarding: '接入'
};

APM.openAnnotations = function() {
  if (document.querySelector('.ann-overlay')) return;
  const page = APM.currentPage || 'overview';
  const a = APM.annotations[page];
  const g = APM.annotations._global;
  const label = APM._annLabels[page] || page;

  const renderSection = (title, items, openClass) => {
    if (!items || !items.length) return '';
    const list = items.map(it => {
      if (typeof it === 'string') return `<li>${it}</li>`;
      return `<li><div class="ann-what">${it.what}</div><div class="ann-why">${it.why}</div></li>`;
    }).join('');
    return `<section class="ann-section"><h4>${title}</h4><ul class="${openClass || ''}">${list}</ul></section>`;
  };

  const pageBlock = a ? `
    <section class="ann-section ann-intent">
      <h4>设计意图</h4><p>${a.intent}</p>
    </section>
    ${renderSection('关键决策', a.decisions)}
    ${renderSection('开放问题 · 想听你的意见', a.open, 'ann-open')}
  ` : `<section class="ann-section ann-empty">本页暂无设计注释。<br/>欢迎在 DESIGN-DISCUSSION.md 中追加。</section>`;

  const globalBlock = `
    <details class="ann-global">
      <summary>📐 全局设计模式（跨页通用）</summary>
      <div class="ann-global-body">
        <p class="ann-intent-mini">${g.intent}</p>
        ${renderSection('原则', g.decisions)}
        ${renderSection('全局开放问题', g.open, 'ann-open')}
      </div>
    </details>
  `;

  const html = `
    <div class="ann-overlay" onclick="if(event.target===this)APM.closeAnnotations()">
      <aside class="ann-panel" role="dialog" aria-label="设计注释">
        <header class="ann-head">
          <div>
            <div class="ann-eyebrow">设计注释 · ${label}</div>
            <div class="ann-title">${a ? a.title : page}</div>
          </div>
          <button class="ann-close" onclick="APM.closeAnnotations()" aria-label="关闭">×</button>
        </header>
        <div class="ann-body">
          ${pageBlock}
          ${globalBlock}
          <footer class="ann-foot">
            <a href="DESIGN-DISCUSSION.md" target="_blank" rel="noopener">完整设计讨论稿 →</a>
            <span class="ann-kbd">按 <kbd>?</kbd> 切换 · <kbd>Esc</kbd> 关闭</span>
          </footer>
        </div>
      </aside>
    </div>
  `;
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  document.body.appendChild(wrap.firstElementChild);
};

APM.closeAnnotations = function() {
  const ov = document.querySelector('.ann-overlay');
  if (ov) ov.remove();
};

APM.toggleAnnotations = function() {
  if (document.querySelector('.ann-overlay')) APM.closeAnnotations();
  else APM.openAnnotations();
};

document.addEventListener('keydown', (e) => {
  // ignore if typing in input/textarea/contenteditable, or cmdk is open
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (APM.cmdkOpen) return;
  if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    APM.toggleAnnotations();
  } else if (e.key === 'Escape' && document.querySelector('.ann-overlay')) {
    APM.closeAnnotations();
  }
});
