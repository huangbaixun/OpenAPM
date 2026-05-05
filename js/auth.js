// ============ Auth gate (admin / admin) ============
// Static-prototype login: localStorage flag, no real backend.
APM.AUTH_KEY = 'apm:auth';
APM.isAuthed = function() {
  try { return localStorage.getItem(APM.AUTH_KEY) === 'admin'; } catch (e) { return false; }
};

APM.renderLogin = function() {
  const app = document.querySelector('.app');
  if (app) app.style.display = 'none';
  let root = document.getElementById('login-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'login-root';
    document.body.appendChild(root);
  }
  root.innerHTML = `
    <div class="login-bg"></div>
    <div class="login-card">
      <div class="login-logo" title="啄木鸟 APM 2.0">${APM.svgI.logo}</div>
      <div class="login-title">啄木鸟 <span class="sub">APM 2.0</span></div>
      <div class="login-sub">应用性能监控控制台</div>
      <form id="login-form" autocomplete="on">
        <div class="login-field">
          <label for="login-user">账户</label>
          <input id="login-user" type="text" autocomplete="username" placeholder="admin" required>
        </div>
        <div class="login-field">
          <label for="login-pass">密码</label>
          <input id="login-pass" type="password" autocomplete="current-password" placeholder="••••••" required>
        </div>
        <div id="login-err" class="login-err" style="display:none;"></div>
        <button type="submit" class="login-btn">登录</button>
      </form>
      <div class="login-hint">提示 · 演示账号 <code>admin</code> / <code>admin</code></div>
    </div>
  `;
  const userInput = document.getElementById('login-user');
  const passInput = document.getElementById('login-pass');
  const err = document.getElementById('login-err');
  setTimeout(() => userInput && userInput.focus(), 0);
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const u = (userInput.value || '').trim();
    const p = passInput.value || '';
    if (u === 'admin' && p === 'admin') {
      try { localStorage.setItem(APM.AUTH_KEY, 'admin'); } catch (ex) {}
      root.remove();
      if (app) app.style.display = '';
      APM._bootApp();
      APM.toast && APM.toast('欢迎回来 · admin', 'success');
    } else {
      err.textContent = '账户或密码错误';
      err.style.display = 'block';
      passInput.value = '';
      passInput.focus();
    }
  });
};

// Override signOut from shell.js so it actually clears the session and returns to login.
APM.signOut = function() {
  APM.toggleDD && APM.toggleDD('userDD');
  APM.confirm({
    title: '注销登录',
    msg: '确认从 啄木鸟 APM 2.0 注销当前账户 ' + APM.currentUser.email + ' 吗？',
    danger: true,
    okLabel: '注销',
    onOk: () => {
      try { localStorage.removeItem(APM.AUTH_KEY); } catch (e) {}
      location.reload();
    }
  });
};

// Boot main app — same logic as the original DOMContentLoaded handler in app.js.
APM._bootApp = function() {
  // Restore persisted preferences before first render.
  try {
    const savedTheme = localStorage.getItem('apm:theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
    const savedSidebar = localStorage.getItem('apm:sidebar');
    if (savedSidebar === '1') APM.sidebarCollapsed = true;
    if (savedSidebar === '0') APM.sidebarCollapsed = false;
  } catch (e) {}
  APM._projectServicesAll = APM.projectServices[APM.currentProject] || APM.projectServices['eshop'];
  APM._reapplyEnv && APM._reapplyEnv();
  const app = document.querySelector('.app');
  if (app && APM.sidebarCollapsed) app.classList.add('sidebar-collapsed');
  // Honor URL hash on first paint so deep links + browser refresh land on the right page.
  const initial = APM._decodeHash && APM._decodeHash();
  if (initial && initial.page) {
    APM.currentPage = initial.page;
    APM.pageParams = initial.params || {};
  }
  APM.renderTopbar();
  APM.renderSidebar();
  APM.renderPage();
};
