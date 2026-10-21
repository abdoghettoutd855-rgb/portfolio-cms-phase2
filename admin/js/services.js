import { h } from './ui.js';
import { resourceView } from './resource.js';

export default resourceView({
  route: 'services', table: 'services', singular: 'الخدمة', addLabel: 'خدمة جديدة',
  order: [['sort_order', true], ['created_at', true]],
  listNote: 'بطاقات قسم «خدماتي» في الصفحة الرئيسية، بالترتيب نفسه (تُرقَّم تلقائيًا).',
  label: (r) => r.title_ar && r.title_ar !== r.title_en ? r.title_ar + ' — ' + r.title_en : r.title_en,
  sub: (r) => r.icon,
  defaults: () => ({ icon: 'fa-star', is_published: true }),
  sections: () => [{ fields: [
    { type: 'bi', name: 'title', label: 'عنوان الخدمة', kind: 'text', requiredEn: true },
    { type: 'bi', name: 'body', label: 'وصف الخدمة', kind: 'area', rows: 3 },
    { type: 'text', name: 'icon', label: 'الأيقونة (Font Awesome)', kind: 'icon', required: true, dir: 'ltr', hint: 'مثل fa-laptop-code أو fa-layer-group أو fa-screwdriver-wrench. تُعرض بأسلوب fa-solid.' },
    { type: 'bool', name: 'is_published', label: 'ظاهرة على الموقع' }] }]
});
