import { h, msg } from './ui.js';
import { db, reportError } from './api.js';
import { bilingualEditor, UI_GROUPS } from './settings-editor.js';

export async function render(root) {
  root.append(h('div', { class: 'msg ok', text: 'تبديل اللغة والاتجاه (LTR للإنجليزية، RTL للعربية) يعمل من ملف js/script.js الأصلي ولا يتغير من هنا. هذه الصفحة تدير النصوص بكل لغة وتكشف النقص في الترجمة.' }));
  const report = h('div', { class: 'panel' }, h('h2', { text: 'اكتمال الترجمة' }), h('div', { class: 'empty', text: 'جارٍ الفحص…' }));
  root.append(report);
  try {
    const [p, a, s, st] = await Promise.all([db.list('projects'), db.list('articles'), db.list('services'), db.list('site_settings', [['key', true]])]);
    const issues = [];
    const blank = (v) => v == null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === '');
    p.forEach((x) => { const m = ['summary', 'tags', 'visual_tag'].filter((f) => !blank(x[f + '_en']) && blank(x[f + '_ar'])); if (m.length) issues.push(['مشروع: ' + x.name_en, m.join('، '), '#/projects/' + x.id]); });
    a.forEach((x) => { const m = ['title', 'excerpt', 'content'].filter((f) => !blank(x[f + '_en']) && blank(x[f + '_ar'])); if (m.length) issues.push(['مقال: ' + x.title_en, m.join('، '), '#/articles/' + x.id]); });
    s.forEach((x) => { const m = ['title', 'body'].filter((f) => !blank(x[f + '_en']) && blank(x[f + '_ar'])); if (m.length) issues.push(['خدمة: ' + x.title_en, m.join('، '), '#/services/' + x.id]); });
    const miss = st.filter((x) => !x.key.startsWith('contact.') && !blank(x.value_en) && blank(x.value_ar)).map((x) => x.key);
    if (miss.length) issues.push(['نصوص الصفحة الرئيسية', miss.join('، '), '#/home']);
    report.lastChild.remove();
    if (!issues.length) report.append(msg('ok', 'كل المحتوى له نسخة عربية. لا يوجد نقص.'));
    else {
      report.append(h('p', { class: 'note', text: 'العناصر التالية لها نص إنجليزي بلا مقابل عربي (سيظهر الإنجليزي في وضع العربية). لا تُترجم أي نصوص آليًا.' }),
        h('table', null, h('tbody', null, issues.map((i) => h('tr', null, h('td', { text: i[0] }), h('td', { class: 'sub', text: i[1] }), h('td', null, h('a', { href: i[2], text: 'فتح' })))))));
    }
  } catch (e) { report.append(msg('err', 'تعذّر الفحص. ' + e.message)); reportError(e); }
  await bilingualEditor(root, UI_GROUPS);
}
