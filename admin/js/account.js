// account.js — "الإعدادات العامة": account, connection test, password, JSON backup, limits
import { h, clear, toast, busy, msg, fmtSize } from './ui.js';
import { db, config, changePassword, currentSession, reportError, explain, sb } from './api.js';

export async function render(root) {
  const session = await currentSession();

  const connOut = h('div');
  const test = h('button', { type: 'button', class: 'btn', text: 'اختبار الاتصال' });
  test.addEventListener('click', () => busy(test, async () => {
    clear(connOut); const t0 = performance.now();
    try { await db.count('site_settings'); connOut.append(msg('ok', 'الاتصال سليم (' + Math.round(performance.now() - t0) + ' ms).')); }
    catch (e) { connOut.append(msg('err', 'فشل الاتصال: ' + explain(e))); }
  }));

  const pw1 = h('input', { type: 'password', autocomplete: 'new-password', class: 'ltr', dir: 'ltr' });
  const pw2 = h('input', { type: 'password', autocomplete: 'new-password', class: 'ltr', dir: 'ltr' });
  const pwOut = h('div');
  const pwBtn = h('button', { type: 'button', class: 'btn primary', text: 'تغيير كلمة المرور' });
  pwBtn.addEventListener('click', () => busy(pwBtn, async () => {
    clear(pwOut);
    if (pw1.value.length < 12) { pwOut.append(msg('err', 'كلمة المرور يجب ألا تقل عن 12 حرفًا.')); return; }
    if (pw1.value !== pw2.value) { pwOut.append(msg('err', 'كلمتا المرور غير متطابقتين.')); return; }
    try { await changePassword(pw1.value); pw1.value = pw2.value = ''; toast('تم تغيير كلمة المرور.'); }
    catch (e) { pwOut.append(msg('err', explain(e))); }
  }));

  const bkOut = h('div');
  const bk = h('button', { type: 'button', class: 'btn', text: 'تنزيل نسخة احتياطية (JSON)' });
  bk.addEventListener('click', () => busy(bk, async () => {
    clear(bkOut);
    try {
      const [site_settings, projects, articles, services, media] = await Promise.all(['site_settings', 'projects', 'articles', 'services', 'media'].map((t) => db.list(t, [['created_at', true]].filter(() => t !== 'site_settings'))));
      const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), site_settings, projects, articles, services, media }, null, 1)], { type: 'application/json' });
      const a = h('a', { href: URL.createObjectURL(blob), download: 'site-content-' + new Date().toISOString().slice(0, 10) + '.json' });
      document.body.append(a); a.click(); a.remove();
      bkOut.append(msg('ok', 'تم تنزيل النسخة. تشمل النصوص والمشاريع والمقالات والخدمات وسجل الملفات (وليس الملفات نفسها).'));
    } catch (e) { bkOut.append(msg('err', 'فشل التصدير: ' + explain(e))); reportError(e); }
  }));

  root.append(
    h('div', { class: 'panel' }, h('h2', { text: 'الحساب' }), h('p', null, 'مسجّل الدخول باسم: ', h('b', { class: 'ltr', text: session ? session.user.email : '—' })),
      h('p', { class: 'note', text: 'مشروع Supabase: ' + config.supabaseUrl })),
    h('div', { class: 'panel' }, h('h2', { text: 'الاتصال' }), h('div', { class: 'row-actions' }, test), connOut),
    h('div', { class: 'panel' }, h('h2', { text: 'تغيير كلمة المرور' }),
      h('div', { class: 'form-grid' }, h('div', { class: 'field' }, h('label', { text: 'كلمة المرور الجديدة (12 حرفًا فأكثر)' }), pw1), h('div', { class: 'field' }, h('label', { text: 'تأكيد كلمة المرور' }), pw2)), pwBtn, pwOut),
    h('div', { class: 'panel' }, h('h2', { text: 'نسخة احتياطية للمحتوى' }), h('div', { class: 'row-actions' }, bk), bkOut),
    h('div', { class: 'panel' }, h('h2', { text: 'حدود الرفع' }),
      h('p', { class: 'note', text: 'الصور: حتى ' + (config.maxImageMB || 5) + ' MB — الفيديو: حتى ' + (config.maxVideoMB || 25) + ' MB. هذه حدود الواجهة، والحدود الفعلية تُفرض أيضًا في إعداد الـ bucket (ملف 03_storage.sql) وخطة Supabase. لتغييرها عدّل القيمتين في js/supabase-config.js وفي 03_storage.sql معًا.' })));
}
