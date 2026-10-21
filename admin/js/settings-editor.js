// settings-editor.js — edits rows of site_settings (home texts, contact info, UI labels)
import { h, clear, toast, busy, msg } from './ui.js';
import { db, reportError, explain } from './api.js';

const R = () => window.CMSRender;

export const HOME_GROUPS = [
  { title: 'شريط التنقل', fields: [
    ['nav.work', 'رابط: أعمال مختارة'], ['nav.services', 'رابط: الخدمات'], ['nav.about', 'رابط: من أنا'], ['nav.cta', 'زر الدعوة في الشريط']] },
  { title: 'الواجهة الرئيسية (Hero)', fields: [
    ['hero.eyebrow', 'الشارة الصغيرة'], ['hero.title', 'العنوان الرئيسي', 'rich'], ['hero.description', 'الوصف', 'area'],
    ['hero.cta_primary', 'زر الدعوة الأول'], ['hero.cta_secondary', 'زر الدعوة الثاني'], ['hero.proof', 'سطر التأكيد']] },
  { title: 'قسم الأعمال', fields: [
    ['work.index', 'ترقيم القسم'], ['work.title', 'عنوان القسم', 'rich'], ['work.note', 'نص جانبي', 'area'], ['work.portfolio_note', 'ملاحظة أسفل المشاريع', 'area']] },
  { title: 'قسم الخدمات', note: 'بطاقات الخدمات نفسها تُدار من «إدارة الخدمات».', fields: [
    ['services.index', 'ترقيم القسم'], ['services.title', 'عنوان القسم', 'rich'], ['services.note', 'نص جانبي', 'area']] },
  { title: 'قسم «من أنا»', fields: [
    ['about.index', 'ترقيم القسم'], ['about.title', 'عنوان القسم', 'rich'], ['about.p1', 'الفقرة الأولى', 'area'], ['about.p2', 'الفقرة الثانية', 'area'],
    ['about.principle1', 'ميزة 1'], ['about.principle2', 'ميزة 2'], ['about.principle3', 'ميزة 3']] },
  { title: 'قسم التواصل', note: 'عنوان البريد ورقم واتساب يُعدَّلان من «معلومات التواصل».', fields: [
    ['contact.index', 'ترقيم القسم'], ['contact.title', 'عنوان القسم', 'rich'], ['contact.copy', 'النص', 'area'],
    ['contact.email_label', 'نص زر البريد'], ['contact.whatsapp_label', 'نص زر واتساب'], ['contact.reply_note', 'سطر وقت الرد']] },
  { title: 'التذييل', fields: [['footer.tagline', 'العبارة في التذييل']] }
];

export const UI_GROUPS = [{ title: 'نصوص أزرار المشاريع', note: 'تظهر على بطاقات المشاريع بكل لغة.', fields: [
  ['ui.live_label', 'زر الموقع المباشر'], ['ui.repo_label', 'زر الكود المصدري'], ['ui.request_label', 'زر «اطلب موقعًا مشابهًا»']] }];

export const CONTACT_FIELDS = [
  ['contact.email', 'البريد الإلكتروني', 'email'],
  ['contact.email_subject', 'عنوان رسالة البريد الجاهزة', 'text'],
  ['contact.whatsapp_number', 'رقم واتساب (أرقام فقط مع رمز الدولة، بدون + )', 'wa'],
  ['contact.whatsapp_text', 'نص رسالة واتساب الجاهزة', 'area']
];

/** Renders bilingual rows and a Save button. groups: [{title,note,fields:[[key,label,kind]]}] */
export async function bilingualEditor(root, groups) {
  let settings;
  try { settings = await db.settings(); } catch (e) { root.append(msg('err', 'تعذّر تحميل الإعدادات. ' + e.message)); reportError(e); return; }
  const inputs = {};
  const missing = [];
  groups.forEach((g) => {
    const panel = h('div', { class: 'panel' }, h('h2', { text: g.title }), g.note ? h('p', { class: 'note', text: g.note }) : null);
    g.fields.forEach(([key, label, kind]) => {
      const row = settings[key];
      if (!row) missing.push(key);
      const mk = (v, dir) => (kind === 'area' || kind === 'rich'
        ? h('textarea', { rows: kind === 'rich' ? 3 : 3, dir, class: dir, value: v || '' }) : h('input', { type: 'text', dir, class: dir, value: v || '' }));
      const en = mk(row && row.value_en, 'ltr'), ar = mk(row && row.value_ar, 'rtl');
      inputs[key] = { en, ar, row, kind };
      panel.append(h('div', { class: 'field' }, h('label', { text: label }),
        h('div', { class: 'form-grid' }, h('div', null, h('span', { class: 'langtag', text: 'EN' }), en), h('div', null, h('span', { class: 'langtag', text: 'AR' }), ar)),
        kind === 'rich' ? h('div', { class: 'hint', text: 'سطر جديد = كسر سطر. ضع الكلمات الملونة بين نجمتين: *هكذا*.' }) : null));
    });
    root.append(panel);
  });
  if (missing.length) root.prepend(msg('warn', 'بعض الإعدادات غير موجودة في قاعدة البيانات (' + missing.length + '). شغّل ملف 04_seed_content.sql أولًا، وإلا فسيُنشئها الحفظ كصفوف جديدة.'));
  const status = h('div');
  const save = h('button', { type: 'button', class: 'btn primary', text: 'حفظ التغييرات' });
  save.addEventListener('click', () => busy(save, async () => {
    clear(status);
    const rows = [];
    for (const [key, c] of Object.entries(inputs)) {
      const en = c.en.value.trim(), ar = c.ar.value.trim();
      if (c.kind === 'rich') {
        for (const v of [en, ar]) if (/<|>/.test(v)) { status.append(msg('err', 'لا يُسمح بوسوم HTML في ' + key)); return; }
      }
      const prevEn = (c.row && c.row.value_en) || '', prevAr = (c.row && c.row.value_ar) || '';
      if (en !== prevEn || ar !== prevAr) rows.push({ key, value_en: en || null, value_ar: ar || null });
    }
    if (!rows.length) { status.append(msg('ok', 'لا توجد تغييرات للحفظ.')); return; }
    save.textContent = 'جارٍ الحفظ…';
    try {
      const saved = await db.saveSettings(rows);
      if (!saved || saved.length !== rows.length) throw new Error('لم يؤكد الخادم حفظ كل الحقول.');
      saved.forEach((r) => { if (inputs[r.key]) inputs[r.key].row = r; });
      toast('تم حفظ ' + rows.length + ' حقل — التغيير ظاهر على الموقع الآن.');
    } catch (e) { status.append(msg('err', 'لم يتم الحفظ. ' + explain(e))); reportError(e); }
  }));
  root.append(status, h('div', { class: 'formbar' }, save));
}

export async function contactEditor(root) {
  let settings;
  try { settings = await db.settings(); } catch (e) { root.append(msg('err', 'تعذّر تحميل الإعدادات. ' + e.message)); reportError(e); return; }
  const panel = h('div', { class: 'panel' }, h('h2', { text: 'معلومات التواصل' }),
    h('p', { class: 'note', text: 'تُستخدم في زر «راسلني» وزر واتساب وأزرار «اطلب موقعًا مشابهًا».' }));
  const ctrl = {};
  CONTACT_FIELDS.forEach(([key, label, kind]) => {
    const v = (settings[key] && settings[key].value_en) || '';
    const input = kind === 'area' ? h('textarea', { rows: 3, dir: 'ltr', class: 'ltr', value: v }) : h('input', { type: 'text', dir: 'ltr', class: 'ltr', value: v });
    const err = h('div', { class: 'err', hidden: true });
    ctrl[key] = { input, err, kind };
    panel.append(h('div', { class: 'field' }, h('label', { text: label }), input, err));
  });
  const status = h('div');
  const save = h('button', { type: 'button', class: 'btn primary', text: 'حفظ التغييرات' });
  save.addEventListener('click', () => busy(save, async () => {
    clear(status);
    let ok = true;
    Object.values(ctrl).forEach((c) => { c.err.hidden = true; });
    const fail = (k, m) => { ctrl[k].err.textContent = m; ctrl[k].err.hidden = false; ok = false; };
    const val = (k) => ctrl[k].input.value.trim();
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(val('contact.email'))) fail('contact.email', 'بريد إلكتروني غير صالح.');
    if (!/^\d{8,15}$/.test(val('contact.whatsapp_number'))) fail('contact.whatsapp_number', 'أرقام فقط (8–15 رقمًا) مع رمز الدولة، بدون + أو مسافات.');
    if (!ok) return;
    const rows = Object.keys(ctrl).filter((k) => val(k) !== ((settings[k] && settings[k].value_en) || ''))
      .map((k) => ({ key: k, value_en: val(k) || null, value_ar: null }));
    if (!rows.length) { status.append(msg('ok', 'لا توجد تغييرات للحفظ.')); return; }
    save.textContent = 'جارٍ الحفظ…';
    try {
      const saved = await db.saveSettings(rows);
      if (!saved || saved.length !== rows.length) throw new Error('لم يؤكد الخادم حفظ كل الحقول.');
      saved.forEach((r) => { settings[r.key] = r; });
      toast('تم حفظ معلومات التواصل.');
    } catch (e) { status.append(msg('err', 'لم يتم الحفظ. ' + explain(e))); reportError(e); }
  }));
  root.append(panel, status, h('div', { class: 'formbar' }, save));
}
