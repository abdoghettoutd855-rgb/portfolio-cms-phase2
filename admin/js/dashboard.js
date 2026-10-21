import { h, fmtDate, fmtSize, msg } from './ui.js';
import { db, reportError } from './api.js';

export async function render(root) {
  const stats = h('div', { class: 'stats' });
  const recent = h('div', { class: 'panel' }, h('h2', { text: 'آخر التعديلات' }));
  root.append(stats, recent,
    h('div', { class: 'panel' }, h('h2', { text: 'اختصارات' }), h('div', { class: 'row-actions' },
      h('a', { class: 'btn primary', href: '#/projects/new', text: '+ مشروع جديد' }), h('a', { class: 'btn primary', href: '#/articles/new', text: '+ مقال جديد' }),
      h('a', { class: 'btn', href: '#/media', text: 'رفع صور' }), h('a', { class: 'btn', href: '#/home', text: 'تعديل نصوص الصفحة الرئيسية' }))));
  const stat = (n, label) => h('div', { class: 'stat' }, h('b', { text: String(n) }), h('span', { text: label }));
  try {
    const [projects, articles, services, media] = await Promise.all([db.list('projects'), db.list('articles'), db.list('services'), db.list('media', [['created_at', false]])]);
    const pub = (a) => a.filter((x) => x.is_published).length;
    const bytes = media.reduce((s, m) => s + (m.size_bytes || 0), 0);
    stats.append(stat(pub(projects) + ' / ' + projects.length, 'مشاريع منشورة / الكل'), stat(pub(articles) + ' / ' + articles.length, 'مقالات منشورة / الكل'),
      stat(pub(services) + ' / ' + services.length, 'خدمات ظاهرة / الكل'), stat(media.length, 'ملفات في المكتبة'), stat(fmtSize(bytes), 'حجم الملفات المرفوعة'));
    const all = [].concat(
      projects.map((p) => ({ t: 'مشروع', n: p.name_ar || p.name_en, at: p.updated_at, href: '#/projects/' + p.id })),
      articles.map((a) => ({ t: 'مقال', n: a.title_ar || a.title_en, at: a.updated_at, href: '#/articles/' + a.id })),
      services.map((s) => ({ t: 'خدمة', n: s.title_ar || s.title_en, at: s.updated_at, href: '#/services/' + s.id })))
      .sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 6);
    if (!all.length) recent.append(h('div', { class: 'empty', text: 'لا يوجد محتوى بعد. شغّل ملف الترحيل 04_seed_content.sql لاستيراد محتوى الموقع الحالي.' }));
    else recent.append(h('table', null, h('tbody', null, all.map((x) => h('tr', null, h('td', null, h('span', { class: 'badge', text: x.t })), h('td', null, h('a', { href: x.href, text: x.n })), h('td', { class: 'sub', text: fmtDate(x.at) }))))));
    if (!projects.length) root.prepend(msg('warn', 'جدول المشاريع فارغ، لذلك يعرض الموقع المحتوى الأصلي المضمَّن في HTML. شغّل 04_seed_content.sql لربط المشاريع بقاعدة البيانات.'));
  } catch (e) { root.prepend(msg('err', 'تعذّر تحميل الإحصاءات. ' + e.message)); reportError(e); }
}
