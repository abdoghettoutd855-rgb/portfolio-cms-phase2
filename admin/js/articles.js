import { h } from './ui.js';
import { resourceView } from './resource.js';

export default resourceView({
  route: 'articles', table: 'articles', singular: 'المقال', addLabel: 'مقال جديد',
  order: [['sort_order', true], ['created_at', true]],
  listNote: 'المقالات الجديدة تُفتح على article.html?slug=… . اربطها من مشروع (روابط أخرى) لتصل إليها الزوار.',
  label: (r) => r.title_ar && r.title_ar !== r.title_en ? r.title_ar + ' — ' + r.title_en : r.title_en,
  sub: (r) => (r.static_page || 'article.html?slug=' + r.slug),
  badges: (r) => (r.static_page ? h('span', { class: 'badge info', text: 'صفحة ثابتة' }) : null),
  defaults: () => ({ is_published: false, links: [] }),
  banner: (row) => (row.static_page ? h('div', { class: 'msg warn', text: 'هذا مقال أصلي يعمل على الصفحة الثابتة ' + row.static_page + '. تعديلك هنا يظهر في تلك الصفحة. إلغاء النشر أو الحذف لا يزيل الصفحة، بل يعيدها إلى نصها الأصلي المضمَّن في الملف.' }) : null),
  sections: (row, isNew) => [
    { title: 'الأساسيات', fields: [
      { type: 'bi', name: 'title', label: 'عنوان المقال', kind: 'text', requiredEn: true },
      { type: 'text', name: 'slug', label: 'الرابط الثابت (slug)', kind: 'slug', required: true, dir: 'ltr', from: 'title_en', readonly: !isNew, hint: row.static_page ? 'ثابت للمقالات الأصلية.' : 'يصبح رابط المقال: article.html?slug=…' },
      { type: 'text', name: 'category', label: 'التصنيف (اختياري)' },
      { type: 'bool', name: 'is_published', label: 'منشور', hint: 'غير المنشور يبقى مسودة لا يراها الزوار.' }] },
    { title: 'رأس المقال', fields: [
      { type: 'bi', name: 'kicker', label: 'السطر الصغير فوق العنوان', kind: 'text' },
      { type: 'bi', name: 'excerpt', label: 'وصف مختصر', kind: 'area', rows: 3 },
      { type: 'bi', name: 'status_text', label: 'سطر الحالة', kind: 'text' },
      { type: 'bi', name: 'aside_note', label: 'ملاحظة جانبية', kind: 'area', rows: 3 }] },
    { title: 'المحتوى', note: 'استخدم ## لعنوان قسم، و### لعنوان فرعي، و- للقوائم، وأزرار الشريط لإدراج الروابط والصور والفيديو. لا يُسمح بكود HTML.', fields: [
      { type: 'bi', name: 'content', label: 'نص المقال', kind: 'md' }] },
    { title: 'الوسائط والروابط', fields: [
      { type: 'image', name: 'cover_url', label: 'الصورة الرئيسية (تظهر أعلى المقال)' },
      { type: 'text', name: 'video_url', label: 'رابط فيديو (يظهر أسفل المقال)', kind: 'video', dir: 'ltr' },
      { type: 'links', name: 'links', label: 'روابط خارجية (تظهر أسفل المقال)' }] }
  ]
});
