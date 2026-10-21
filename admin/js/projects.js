import { h } from './ui.js';
import { resourceView } from './resource.js';

const STATUS = [['in_development', 'قيد التطوير'], ['completed', 'مكتمل'], ['published', 'منشور (مباشر)']];
const BUILTIN = { food: 'رسم Family Food (أصلي)', hotbox: 'رسم Hot Box (أصلي)', restaurant: 'رسم Staifi Grill (أصلي)', ai: 'رسم الذكاء الاصطناعي (أصلي)' };

export default resourceView({
  route: 'projects', table: 'projects', singular: 'المشروع', addLabel: 'مشروع جديد',
  order: [['sort_order', true], ['created_at', true]],
  listNote: 'ترتيب القائمة هو ترتيب ظهور البطاقات في الموقع. المشاريع المنشورة فقط تظهر للزوار.',
  label: (r) => r.name_ar && r.name_ar !== r.name_en ? r.name_ar + ' — ' + r.name_en : r.name_en,
  sub: (r) => r.slug,
  badges: (r) => [h('span', { class: 'badge info', text: { in_development: 'قيد التطوير', completed: 'مكتمل', published: 'مباشر' }[r.status] }), r.is_featured ? ' ' : null, r.is_featured ? h('span', { class: 'badge', text: 'مميز' }) : null],
  defaults: () => ({ status: 'in_development', is_published: false, is_featured: false, show_request_button: true, visual_variant: 'cover', gallery: [], links: [], tags_en: [], tags_ar: [] }),
  banner: (row) => (BUILTIN[row.visual_variant] ? h('div', { class: 'msg warn', text: 'هذا مشروع أصلي بتصميم بطاقة خاص (CSS). يبقى رسمه كما هو. إن اخترت له «صورة غلاف» أدناه فسيُستبدل الرسم بالصورة.' }) : null),
  sections: (row, isNew) => [
    { title: 'الأساسيات', fields: [
      { type: 'bi', name: 'name', label: 'اسم المشروع', kind: 'text', requiredEn: true },
      { type: 'text', name: 'slug', label: 'الرابط الثابت (slug)', kind: 'slug', required: true, dir: 'ltr', from: 'name_en', hint: 'يُستخدم في الروابط الداخلية ولا يُنصح بتغييره بعد النشر.', readonly: !isNew },
      { type: 'select', name: 'status', label: 'حالة المشروع', options: STATUS },
      { type: 'bool', name: 'is_published', label: 'منشور على الموقع', hint: 'إذا أُلغي يصبح مسودة ويختفي من الموقع.' },
      { type: 'bool', name: 'is_featured', label: 'مشروع مميز (بطاقة بعرض كامل)' },
      { type: 'bool', name: 'show_request_button', label: 'إظهار زر «اطلب موقعًا مشابهًا»' }] },
    { title: 'الوصف', fields: [
      { type: 'bi', name: 'summary', label: 'وصف مختصر (يظهر في البطاقة)', kind: 'area', rows: 3 },
      { type: 'bi', name: 'description', label: 'وصف تفصيلي (اختياري)', kind: 'md', hint: 'إذا كتبته تظهر في البطاقة روابط «اكتشف المشروع» إلى صفحة تفاصيل المشروع.' },
      { type: 'bi', name: 'tags', label: 'الوسوم (مفصولة بفاصلة)', kind: 'list' },
      { type: 'bi', name: 'visual_tag', label: 'نص على صورة البطاقة', kind: 'text', hint: 'بدون رقم — يُرقَّم تلقائيًا حسب الترتيب (01 — …).' },
      { type: 'bi', name: 'status_label', label: 'سطر الحالة فوق العنوان (اختياري)', kind: 'text' }] },
    { title: 'الصور والفيديو', fields: [
      { type: 'select', name: 'visual_variant', label: 'نمط صورة البطاقة', options: [['cover', 'صورة غلاف']].concat(Object.entries(BUILTIN).filter(([k]) => k === row.visual_variant)) },
      { type: 'image', name: 'cover_url', label: 'صورة الغلاف' },
      { type: 'gallery', name: 'gallery', label: 'صور إضافية (تظهر في صفحة التفاصيل)' },
      { type: 'text', name: 'video_url', label: 'رابط فيديو (YouTube / Vimeo / mp4)', kind: 'video', dir: 'ltr', wide: true }] },
    { title: 'الروابط', fields: [
      { type: 'text', name: 'live_url', label: 'رابط الموقع المباشر', kind: 'url', dir: 'ltr' },
      { type: 'text', name: 'repo_url', label: 'رابط GitHub / المستودع', kind: 'url', dir: 'ltr' },
      { type: 'links', name: 'links', label: 'روابط أخرى (تظهر كأزرار في البطاقة)' }] }
  ],
  validate: (v) => (v.visual_variant === 'cover' && !v.cover_url && v.is_published ? 'لا يمكن نشر مشروع بنمط «صورة غلاف» دون اختيار صورة. اختر صورة أو احفظه كمسودة.' : null),
  deleteNote: (r) => (['food', 'hotbox', 'restaurant', 'ai'].includes(r.visual_variant) ? 'تنبيه: هذا أحد مشاريعك الأصلية. حذفه يزيله من الموقع.' : '')
});
