// ============ Shared UI primitives: toast / modal / confirm / copy / download ============
// Used by every page that needs feedback for buttons, CRUD forms, copy/export actions.
window.APM = window.APM || {};

// ---------- Toast ----------
APM._toastSeq = 0;
APM.toast = function(msg, kind) {
  kind = kind || 'info';
  let stack = document.getElementById('apm-toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'apm-toast-stack';
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const id = 'tst-' + (++APM._toastSeq);
  const ic = kind === 'success' ? '✓' : kind === 'err' ? '✕' : kind === 'warn' ? '!' : 'i';
  const el = document.createElement('div');
  el.id = id;
  el.className = 'toast ' + kind;
  el.innerHTML = `<span class="toast-ic">${ic}</span><span class="toast-msg"></span>`;
  el.querySelector('.toast-msg').textContent = msg;
  stack.appendChild(el);
  // animate-in next frame
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    el.classList.add('hide');
    setTimeout(() => el.remove(), 220);
  }, 2500);
};

// ---------- Modal ----------
APM._modalSeq = 0;
APM.openModal = function(opts) {
  opts = opts || {};
  const id = 'modal-' + (++APM._modalSeq);
  const mask = document.createElement('div');
  mask.className = 'modal-mask';
  mask.id = id;
  const width = opts.width || 480;
  mask.innerHTML = `
    <div class="modal" style="width:${width}px;max-width:92vw;" role="dialog" aria-modal="true">
      <div class="modal-head">
        <div class="modal-title">${opts.title || ''}</div>
        <button class="modal-x" aria-label="关闭">✕</button>
      </div>
      <div class="modal-body">${opts.body || ''}</div>
      ${opts.footer ? `<div class="modal-foot">${opts.footer}</div>` : ''}
    </div>
  `;
  document.body.appendChild(mask);
  const close = () => {
    mask.classList.remove('show');
    setTimeout(() => { mask.remove(); document.removeEventListener('keydown', onKey); }, 180);
    if (opts.onClose) opts.onClose();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  mask.querySelector('.modal-x').onclick = close;
  mask.addEventListener('click', (e) => { if (e.target === mask) close(); });
  // expose close on element so callers can wire footer buttons via id
  mask._close = close;
  requestAnimationFrame(() => mask.classList.add('show'));
  // resolve form helper: callers may use APM.modalForm(id) to read input values
  return { id, close, el: mask };
};

// Read all named inputs/selects/textareas inside a modal as an object.
APM.modalForm = function(modalId) {
  const root = document.getElementById(modalId);
  if (!root) return {};
  const out = {};
  root.querySelectorAll('[data-field]').forEach(el => {
    const k = el.getAttribute('data-field');
    if (el.type === 'checkbox') out[k] = el.checked;
    else out[k] = el.value;
  });
  return out;
};

APM.closeModal = function(modalId) {
  const el = document.getElementById(modalId);
  if (el && el._close) el._close();
};

// ---------- Confirm (semantic wrapper) ----------
APM.confirm = function(opts) {
  opts = opts || {};
  const danger = !!opts.danger;
  const okLabel = opts.okLabel || (danger ? '确认' : '确定');
  const m = APM.openModal({
    title: opts.title || '确认',
    width: 420,
    body: `<div style="font-size:13px;color:var(--text-2);line-height:1.6;">${opts.msg || ''}</div>`,
    footer: `
      <button class="pill" data-act="cancel">取消</button>
      <button class="pill ${danger ? 'danger' : 'primary'}" data-act="ok">${okLabel}</button>
    `
  });
  m.el.querySelector('[data-act="cancel"]').onclick = () => m.close();
  m.el.querySelector('[data-act="ok"]').onclick = () => {
    if (opts.onOk) opts.onOk();
    m.close();
  };
  return m;
};

// ---------- Clipboard ----------
APM.copy = function(text, label) {
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      () => APM.toast((label || '已复制') + ' · ' + (text.length > 40 ? text.slice(0, 40) + '…' : text), 'success'),
      () => { fallback(); APM.toast(label || '已复制', 'success'); }
    );
  } else {
    fallback();
    APM.toast(label || '已复制', 'success');
  }
};

// ---------- Download ----------
APM.download = function(filename, content, mime) {
  const blob = new Blob([content], { type: mime || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 0);
  APM.toast('已导出 ' + filename, 'success');
};

// ---------- CSV helper ----------
APM.toCSV = function(rows, headers) {
  const esc = (v) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [];
  if (headers) lines.push(headers.map(esc).join(','));
  rows.forEach(r => lines.push(r.map(esc).join(',')));
  return lines.join('\n');
};

// ---------- Focus retention for re-render-driven filter inputs ----------
// The whole <main> is replaced on each renderPage(); inputs lose focus on every
// keystroke. Mark such inputs with data-focus-key="some-id" to restore focus
// + caret position after re-render.
APM._restoreFocus = function() {
  const key = APM._pendingFocusKey;
  if (!key) return;
  const el = document.querySelector(`[data-focus-key="${key}"]`);
  if (!el) return;
  el.focus();
  if (el.setSelectionRange && typeof el.value === 'string') {
    const pos = APM._pendingFocusPos != null ? APM._pendingFocusPos : el.value.length;
    try { el.setSelectionRange(pos, pos); } catch (e) {}
  }
  APM._pendingFocusKey = null;
  APM._pendingFocusPos = null;
};
APM.bindRetainedInput = function(ev, key, setter) {
  const el = ev.target;
  APM._pendingFocusKey = key;
  APM._pendingFocusPos = el.selectionStart;
  setter(el.value);
};

// ---------- Form-row helpers (for building modal body strings) ----------
APM.field = function(label, inputHtml, help) {
  return `<div class="form-row">
    <label class="form-label">${label}</label>
    ${inputHtml}
    ${help ? `<div class="form-help">${help}</div>` : ''}
  </div>`;
};
APM.input = function(name, value, attrs) {
  attrs = attrs || '';
  return `<input class="form-input" data-field="${name}" value="${value == null ? '' : String(value).replace(/"/g, '&quot;')}" ${attrs}>`;
};
APM.select = function(name, options, value) {
  return `<select class="form-input" data-field="${name}">
    ${options.map(o => {
      const v = typeof o === 'string' ? o : o.value;
      const l = typeof o === 'string' ? o : o.label;
      return `<option value="${v}" ${v === value ? 'selected' : ''}>${l}</option>`;
    }).join('')}
  </select>`;
};
APM.textarea = function(name, value, rows) {
  return `<textarea class="form-input" data-field="${name}" rows="${rows || 3}">${value || ''}</textarea>`;
};
