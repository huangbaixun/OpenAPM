// ============ App bootstrap ============
document.addEventListener('DOMContentLoaded', () => {
  if (APM.isAuthed && APM.isAuthed()) {
    APM._bootApp();
  } else if (APM.renderLogin) {
    APM.renderLogin();
  } else {
    // Fallback if auth.js failed to load: boot anyway.
    APM._bootApp ? APM._bootApp() : (APM.renderTopbar(), APM.renderSidebar(), APM.renderPage());
  }
});
