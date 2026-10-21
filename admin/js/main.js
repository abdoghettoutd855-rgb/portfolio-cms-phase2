// main.js — boot, login, session guard, router
import { h, clear, $, toast, busy, msg } from './ui.js';
import * as api from './api.js';

const ROUTES = [
  ['dashboard', 'لوحة المعلومات', () => import('./dashboard.js')],
  ['projects', 'إدارة المشاريع', () => import('./projects.js')],
  ['articles', 'إدارة المقالات', () => import('./articles.js')],
  ['home', 'محتوى الصفحة الرئيسية', null],
  ['services', 'إدارة الخدمات', () => import('./services.js')],
  ['contact', 'معلومات التواصل', null],
  ['media', 'الصور والملفات', () => import('./media.js')],
  ['languages', 'إعدادات اللغات', () => import('./languages.js')],
  ['settings', 'الإعدادات العامة', () => import('./account.js')]
];

const el = { boot: $('#boot'), login: $('#login-screen'), app: $('#app'), view: $('#view'), side: $('#side'), title: $('#page-title') };
let navToken = 0;

function show(which) { el.boot.hidden = which !== 'boot'; el.login.hidden = which !== 'login'; el.app.hidden = which !== 'app'; }

function mark() { return h('span', { class: 'mark' }, 'A', h('span', { text: 'G' })); }

function showSetup(problem) {
  clear(el.login);
  el.login.append(h('div', { class: 'login-card' }, mark(), h('h2', { text: 'الإعداد غير مكتمل' }), h('p', { class: 'sub', text: problem.title }),
    h('div', { class: 'setup-box' }, problem.steps.map((s) => h('div', null, s)))));
  show('login');
}

function showLogin(notice) {
  clear(el.login);
  const email = h('input', { type: 'email', autocomplete: 'username', required: true, class: 'ltr', dir: 'ltr' });
  const pass = h('input', { type: 'password', autocomplete: 'current-password', required: true, class: 'ltr', dir: 'ltr' });
  const out = h('div', { 'aria-live': 'polite' });
  if (notice) out.append(msg('warn', notice));
  const btn = h('button', { type: 'submit', class: 'btn primary', text: 'تسجيل الدخول' });
  const form = h('form', { novalidate: true }, h('div', { class: 'field' }, h('label', { for: 'em', text: 'البريد الإلكتروني' }), email),
    h('div', { class: 'field' }, h('label', { for: 'pw', text: 'كلمة المرور' }), pass), out, btn);
  email.id = 'em'; pass.id = 'pw';
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    busy(btn, async () => {
      clear(out);
      if (!email.value.trim() || !pass.value) { out.append(msg('err', 'أدخل البريد الإلكتروني وكلمة المرور.')); return; }
      btn.textContent = 'جارٍ التحقق…';
      try {
        const session = await api.signIn(email.value.trim(), pass.value);
        if (!(await api.checkAdmin(session.user.id))) {
          await api.signOut();                    // fires 'signed-out', which re-renders the login screen...
          showLogin('هذا الحساب لا يملك صلاحية الإدارة.');   // ...so show the explanation on the fresh screen
          return;
        }
        pass.value = '';
        await enter();
      } catch (err) { out.append(msg('err', err.friendly ? err.message : api.explain(err))); }
    });
  });
  el.login.append(h('div', { class: 'login-card' }, mark(), h('h2', { text: 'لوحة الإدارة' }), h('p', { class: 'sub', text: 'دخول المالك فقط.' }), form));
  show('login');
  email.focus();
}

function buildSide() {
  clear(el.side);
  el.side.append(h('div', { class: 'brandline' }, mark(), h('b', { text: 'ADMIN' })));
  ROUTES.forEach(([key, label]) => el.side.append(h('a', { class: 'nav-item', href: '#/' + key, dataset: { key }, text: label })));
  el.side.append(h('div', { class: 'nav-sep' }), h('button', { type: 'button', class: 'nav-item', text: 'تسجيل الخروج', onclick: async () => { await api.signOut(); } }));
}

async function route() {
  const token = ++navToken;
  const parts = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('/');
  const key = parts[0], param = parts[1] || null;
  const def = ROUTES.find((r) => r[0] === key) || ROUTES[0];
  el.side.classList.remove('open'); $('#menu-btn').setAttribute('aria-expanded', 'false');
  el.side.querySelectorAll('.nav-item[data-key]').forEach((a) => a.classList.toggle('active', a.dataset.key === def[0]));
  el.title.textContent = def[1];
  document.title = def[1] + ' — لوحة الإدارة';
  clear(el.view);
  el.view.append(h('div', { class: 'empty', text: 'جارٍ التحميل…' }));
  try {
    const wrap = h('div');
    if (def[0] === 'home') { const m = await import('./settings-editor.js'); await m.bilingualEditor(wrap, m.HOME_GROUPS); }
    else if (def[0] === 'contact') { const m = await import('./settings-editor.js'); await m.contactEditor(wrap); }
    else { const m = await def[2](); if (m.default) await m.default.render(wrap, param); else await m.render(wrap); }
    if (token !== navToken) return;      // user navigated away meanwhile
    clear(el.view); el.view.append(wrap); el.view.focus();
  } catch (e) {
    if (token !== navToken) return;
    clear(el.view); el.view.append(msg('err', 'تعذّر فتح هذه الصفحة. ' + api.explain(e)));
  }
}

async function enter() {
  buildSide();
  show('app');
  if (!location.hash) location.hash = '#/dashboard';
  await route();
}

$('#menu-btn').addEventListener('click', () => { const o = el.side.classList.toggle('open'); $('#menu-btn').setAttribute('aria-expanded', String(o)); });
window.addEventListener('hashchange', () => { if (!el.app.hidden) route(); });
api.events.addEventListener('signed-out', () => showLogin());
api.events.addEventListener('session-expired', () => { toast('انتهت الجلسة. سجّل الدخول من جديد.', 'err'); showLogin('انتهت الجلسة. سجّل الدخول من جديد.'); });

(async function boot() {
  if (!api.libLoaded()) {
    return showSetup({ title: 'مكتبة Supabase المحلية غير موجودة.', steps: ['شغّل مرة واحدة من جذر المشروع:', 'bash tools/vendor-libs.sh', 'ثم أعد تحميل هذه الصفحة. (التفاصيل في README، الخطوة 4)'] });
  }
  if (!api.isConfigured()) {
    return showSetup({ title: 'لم تُضبط بيانات Supabase بعد.', steps: ['انسخ js/supabase-config.example.js إلى js/supabase-config.js', 'وضع Project URL ومفتاح anon العام فيه.', '(التفاصيل في README، الخطوة 5)'] });
  }
  try {
    const session = await api.currentSession();
    if (session && (await api.checkAdmin(session.user.id))) return enter();
    if (session) { await api.signOut(); return showLogin('هذا الحساب لا يملك صلاحية الإدارة.'); }
  } catch (e) { return showLogin('تعذّر التحقق من الجلسة: ' + api.explain(e)); }
  showLogin();
})();
