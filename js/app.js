// ============ App bootstrap ============
document.addEventListener('DOMContentLoaded', () => {
  APM._projectServicesAll = APM.projectServices[APM.currentProject] || APM.projectServices['eshop'];
  APM._reapplyEnv();
  if (APM.sidebarCollapsed) document.querySelector('.app').classList.add('sidebar-collapsed');
  APM.renderTopbar();
  APM.renderSidebar();
  APM.renderPage();
});
