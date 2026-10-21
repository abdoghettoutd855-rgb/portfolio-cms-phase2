// ui.js — tiny DOM helpers, toasts and dialogs (no innerHTML anywhere)
export function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'for') e.htmlFor = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else if (k in e && k !== 'list' && k !== 'form') { try { e[k] = v; } catch (_) { e.setAttribute(k, v); } }
    else e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat(Infinity).forEach((c) => {
    if (c == null || c === false) return;
    e.append(c.nodeType ? c : document.createTextNode(String(c)));
  });
  return e;
}
export const $ = (sel, root = document) => root.querySelector(sel);
export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

export function toast(message, kind = 'ok', ms = 4200) {
  const box = document.getElementById('toasts');
  const t = h('div', { class: 'toast ' + kind, text: message });
  box.appendChild(t);
  setTimeout(() => t.remove(), kind === 'err' ? Math.max(ms, 7000) : ms);
}

/** Runs fn while the button is disabled (prevents double submit). */
export async function busy(button, fn) {
  if (button.disabled) return;
  const label = button.textContent;
  button.disabled = true;
  try { return await fn(); } finally { button.disabled = false; button.textContent = label; }
}

/* ---------------- dialogs ---------------- */
function dlg() { return document.getElementById('dialog'); }

/** Opens content in the shared <dialog>. Returns a promise that resolves with whatever close(value) is called with (null on Esc). */
export function openDialog(content, { wide = false } = {}) {
  const d = dlg();
  clear(d);
  d.className = 'dialog' + (wide ? ' wide' : '');
  d.append(content);
  return new Promise((resolve) => {
    let result = null;
    d.__close = (v) => { result = v; if (d.open) d.close(); };
    d.addEventListener('close', () => resolve(result), { once: true });
    d.showModal();
  });
}
export function closeDialog(v) { const d = dlg(); if (d.__close) d.__close(v); }

export function confirmDialog({ title, message, confirmText = 'تأكيد', danger = false, extra = null }) {
  const yes = h('button', { type: 'button', class: 'btn ' + (danger ? 'danger' : 'primary'), text: confirmText, onclick: () => closeDialog(true) });
  const no = h('button', { type: 'button', class: 'btn', text: 'إلغاء', onclick: () => closeDialog(false) });
  const body = h('div', null, h('h3', { text: title }), h('p', { class: 'note', text: message }), extra, h('div', { class: 'acts' }, yes, no));
  const p = openDialog(body).then((v) => v === true);
  no.focus();
  return p;
}

export function askText({ title, label, placeholder = '', dir = 'ltr' }) {
  const input = h('input', { type: 'text', placeholder, dir, class: dir === 'ltr' ? 'ltr' : 'rtl' });
  const ok = h('button', { type: 'button', class: 'btn primary', text: 'إدراج', onclick: () => closeDialog(input.value.trim() || null) });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ok.click(); } });
  const p = openDialog(h('div', null, h('h3', { text: title }), h('div', { class: 'field' }, h('label', { text: label }), input),
    h('div', { class: 'acts' }, ok, h('button', { type: 'button', class: 'btn', text: 'إلغاء', onclick: () => closeDialog(null) }))));
  input.focus();
  return p;
}

/* ---------------- misc ---------------- */
export function fmtSize(n) {
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(2) + ' MB';
}
export function fmtDate(s) {
  if (!s) return '—';
  try { return new Date(s).toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' }); } catch (_) { return s; }
}
export function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}
export function msg(kind, text) { return h('div', { class: 'msg ' + kind, text, role: kind === 'err' ? 'alert' : null }); }
