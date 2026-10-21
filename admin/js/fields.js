// fields.js — declarative form builder (text, bilingual, markdown, image, gallery, links, ...)
import { h, clear, slugify, askText } from './ui.js';
import { pickMedia } from './media.js';

const R = () => window.CMSRender;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function wrap(label, control, { hint, required, cls } = {}) {
  const err = h('div', { class: 'err', hidden: true });
  const f = h('div', { class: 'field ' + (cls || '') },
    label ? h('label', null, label, required ? h('span', { class: 'req', text: ' *' }) : null) : null, control,
    hint ? h('div', { class: 'hint', text: hint }) : null, err);
  f.setError = (m) => { err.textContent = m || ''; err.hidden = !m; f.classList.toggle('invalid', !!m); };
  return f;
}
const dirCls = (d) => (d === 'ltr' ? 'ltr' : d === 'rtl' ? 'rtl' : '');

/* ---------- markdown editor ---------- */
function mdEditor(initial, dir) {
  const ta = h('textarea', { rows: 14, dir, class: dirCls(dir), value: initial || '' });
  const prev = h('div', { class: 'md-preview', hidden: true, dir });
  function insert(before, after = '', placeholder = '') {
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = ta.value.slice(s, e) || placeholder;
    ta.setRangeText(before + sel + after, s, e, 'select');
    ta.focus();
  }
  function lineStart(prefix) {
    const s = ta.selectionStart;
    const ls = ta.value.lastIndexOf('\n', s - 1) + 1;
    ta.setRangeText(prefix, ls, ls, 'end'); ta.focus();
  }
  const btn = (t, fn, title) => h('button', { type: 'button', class: 'btn', text: t, title, onclick: fn });
  const bar = h('div', { class: 'md-bar' },
    btn('عنوان', () => lineStart('## '), 'عنوان قسم'), btn('عنوان فرعي', () => lineStart('### ')),
    btn('عريض', () => insert('**', '**', 'نص')), btn('مائل', () => insert('*', '*', 'نص')),
    btn('قائمة', () => lineStart('- ')), btn('اقتباس', () => lineStart('> ')),
    btn('رابط', async () => { const u = await askText({ title: 'إدراج رابط', label: 'الرابط (https://…)', placeholder: 'https://' }); if (u) insert('[', '](' + u + ')', 'نص الرابط'); }),
    btn('صورة', async () => { const u = await pickMedia('image'); if (u) { ta.setRangeText('\n\n![](' + u + ')\n\n', ta.selectionStart, ta.selectionEnd, 'end'); ta.focus(); } }),
    btn('فيديو', async () => { const u = await askText({ title: 'إدراج فيديو', label: 'رابط YouTube أو Vimeo أو ملف mp4/webm', placeholder: 'https://youtu.be/…' });
      if (u) { if (!R().parseVideo(u)) { alert('رابط الفيديو غير مدعوم. استخدم رابط YouTube أو Vimeo أو ملف mp4/webm عبر https.'); return; } ta.setRangeText('\n\n@video(' + u + ')\n\n', ta.selectionStart, ta.selectionEnd, 'end'); ta.focus(); } }),
    h('span', { class: 'sp' }));
  const toggle = btn('معاينة', () => {
    const show = prev.hidden;
    if (show) { clear(prev); R().renderMarkdown(ta.value, document).forEach((s) => prev.append(s)); if (!prev.firstChild) prev.append(h('p', { text: '(لا يوجد محتوى)' })); }
    prev.hidden = !show; toggle.textContent = show ? 'إخفاء المعاينة' : 'معاينة';
  });
  bar.append(toggle);
  return { el: h('div', { class: 'md' }, bar, ta, prev), ta };
}

/* ---------- field factories: each returns {el, read(), check()} ---------- */
const factories = {
  text(f, row) {
    const input = h('input', { type: f.kind === 'number' ? 'number' : 'text', value: row[f.name] == null ? '' : String(row[f.name]), dir: f.dir, class: dirCls(f.dir), placeholder: f.placeholder || '', maxLength: f.max || null, readOnly: f.readonly || null });
    const el = wrap(f.label, input, f);
    return {
      el, input,
      read: () => ({ [f.name]: f.kind === 'number' ? (input.value === '' ? 0 : parseInt(input.value, 10)) : (input.value.trim() === '' ? (f.nullable === false ? '' : null) : input.value.trim()) }),
      check() {
        const v = input.value.trim(); let e = '';
        if (f.required && !v) e = 'هذا الحقل مطلوب.';
        else if (v && f.kind === 'slug' && !SLUG.test(v)) e = 'استخدم أحرفًا إنجليزية صغيرة وأرقامًا وشرطات فقط (مثال: my-project).';
        else if (v && f.kind === 'url' && !R().safeUrl(v, { httpsOnly: !!f.httpsOnly })) e = 'رابط غير صالح. استخدم رابط https:// أو مسارًا نسبيًا.';
        else if (v && f.kind === 'video' && !R().parseVideo(v)) e = 'رابط فيديو غير مدعوم (YouTube أو Vimeo أو ملف mp4/webm عبر https).';
        else if (v && f.kind === 'number' && !/^-?\d+$/.test(v)) e = 'أدخل رقمًا صحيحًا.';
        else if (v && f.kind === 'icon' && !/^fa-[a-z0-9-]{2,40}$/.test(v)) e = 'صيغة الأيقونة: fa-اسم (مثال: fa-laptop-code).';
        el.setError(e); return e;
      }
    };
  },
  bool(f, row) {
    const input = h('input', { type: 'checkbox', checked: !!row[f.name] });
    const el = h('label', { class: 'check' }, input, h('span', null, h('b', { text: f.label }), f.hint ? h('div', { class: 'hint', text: f.hint }) : null));
    return { el, read: () => ({ [f.name]: input.checked }), check: () => '' };
  },
  select(f, row) {
    const sel = h('select', null, f.options.map(([v, l]) => h('option', { value: v, text: l, selected: row[f.name] === v })));
    if (f.disabled) sel.disabled = true;
    return { el: wrap(f.label, sel, f), read: () => ({ [f.name]: sel.value }), check: () => '' };
  },
  bi(f, row) {
    const en = row[f.name + '_en'], ar = row[f.name + '_ar'];
    const asStr = (v) => (f.kind === 'list' ? (v || []).join(', ') : v == null ? '' : v);
    let readEn, readAr, inEn, inAr, el;
    if (f.kind === 'md') {
      const e = mdEditor(asStr(en), 'ltr'), a = mdEditor(asStr(ar), 'rtl');
      let cur = 'en';
      const tabs = h('div', { class: 'tabs', role: 'tablist' });
      const show = (l) => { cur = l; e.el.hidden = l !== 'en'; a.el.hidden = l !== 'ar';
        [...tabs.children].forEach((t) => t.setAttribute('aria-selected', String(t.dataset.l === l))); };
      tabs.append(h('button', { type: 'button', class: 'tab', role: 'tab', dataset: { l: 'en' }, text: 'English', onclick: () => show('en') }),
        h('button', { type: 'button', class: 'tab', role: 'tab', dataset: { l: 'ar' }, text: 'العربية', onclick: () => show('ar') }));
      el = wrap(f.label, h('div', null, tabs, e.el, a.el), f); show('en');
      inEn = e.ta; inAr = a.ta;
    } else {
      const mk = (v, d) => (f.kind === 'area'
        ? h('textarea', { rows: f.rows || 3, dir: d, class: dirCls(d), value: asStr(v) })
        : h('input', { type: 'text', dir: d, class: dirCls(d), value: asStr(v), placeholder: f.kind === 'list' ? 'وسم1, وسم2' : '' }));
      inEn = mk(en, 'ltr'); inAr = mk(ar, 'rtl');
      el = wrap(f.label, h('div', { class: 'form-grid' }, h('div', null, h('span', { class: 'langtag', text: 'EN' }), inEn), h('div', null, h('span', { class: 'langtag', text: 'AR' }), inAr)), f);
    }
    const out = (v) => (f.kind === 'list' ? v.split(/[,،]/).map((s) => s.trim()).filter(Boolean) : (v.trim() === '' ? null : v));
    return {
      el, enInput: inEn, read: () => ({ [f.name + '_en']: f.kind === 'md' ? inEn.value : out(inEn.value), [f.name + '_ar']: f.kind === 'md' ? inAr.value : out(inAr.value) }),
      check() { const e = f.requiredEn && !inEn.value.trim() ? 'النسخة الإنجليزية مطلوبة.' : ''; el.setError(e); return e; }
    };
  },
  image(f, row) {
    let url = row[f.name] || '';
    const img = h('img', { alt: '', hidden: !url, src: url || null });
    const info = h('div', { class: 'hint', text: url ? '' : 'لم تُختر صورة.' });
    const choose = h('button', { type: 'button', class: 'btn', text: 'اختيار / رفع صورة', onclick: async () => { const u = await pickMedia('image'); if (u) set(u); } });
    const remove = h('button', { type: 'button', class: 'btn danger', text: 'إزالة', hidden: !url, onclick: () => set('') });
    function set(u) { url = u; img.hidden = !u; if (u) img.src = u; else img.removeAttribute('src'); remove.hidden = !u; info.textContent = u ? '' : 'لم تُختر صورة.'; }
    const el = wrap(f.label, h('div', { class: 'imgbox' }, img, h('div', null, h('div', { class: 'row-actions' }, choose, remove), info)), f);
    return { el, read: () => ({ [f.name]: url || null }), check: () => '' };
  },
  gallery(f, row) {
    let urls = Array.isArray(row[f.name]) ? [...row[f.name]] : [];
    const box = h('div', { class: 'gal' });
    function paint() {
      clear(box);
      urls.forEach((u, i) => box.append(h('figure', null, h('img', { src: u, alt: '' }), h('figcaption', null,
        h('button', { type: 'button', class: 'icon-btn', text: '→', title: 'تقديم', disabled: i === 0, onclick: () => { [urls[i - 1], urls[i]] = [urls[i], urls[i - 1]]; paint(); } }),
        h('button', { type: 'button', class: 'icon-btn', text: '×', title: 'إزالة', onclick: () => { urls.splice(i, 1); paint(); } }),
        h('button', { type: 'button', class: 'icon-btn', text: '←', title: 'تأخير', disabled: i === urls.length - 1, onclick: () => { [urls[i + 1], urls[i]] = [urls[i], urls[i + 1]]; paint(); } })))));
    }
    paint();
    const add = h('button', { type: 'button', class: 'btn', text: 'إضافة صورة', onclick: async () => { const u = await pickMedia('image'); if (u && !urls.includes(u)) { urls.push(u); paint(); } } });
    return { el: wrap(f.label, h('div', null, box, add), f), read: () => ({ [f.name]: urls }), check: () => '' };
  },
  links(f, row) {
    let items = Array.isArray(row[f.name]) ? row[f.name].map((x) => ({ ...x })) : [];
    const box = h('div');
    const el = wrap(f.label, h('div', null, box, h('button', { type: 'button', class: 'btn', text: 'إضافة رابط', onclick: () => { items.push({ label_en: '', label_ar: '', url: '' }); paint(); } })), f);
    function paint() {
      clear(box);
      items.forEach((it, i) => {
        const mk = (k, ph, d) => h('input', { type: 'text', value: it[k] || '', placeholder: ph, dir: d, class: dirCls(d), oninput: (e) => { it[k] = e.target.value; } });
        box.append(h('div', { class: 'linkrow' }, mk('label_en', 'Label (EN)', 'ltr'), mk('label_ar', 'النص (AR)', 'rtl'), mk('url', 'https://… أو page.html', 'ltr'),
          h('button', { type: 'button', class: 'icon-btn', text: '×', title: 'حذف الرابط', onclick: () => { items.splice(i, 1); paint(); } })));
      });
    }
    paint();
    return {
      el, read: () => ({ [f.name]: items.filter((x) => (x.url || '').trim()).map((x) => ({ label_en: (x.label_en || '').trim(), label_ar: (x.label_ar || '').trim() || null, url: x.url.trim() })) }),
      check() {
        const bad = items.find((x) => (x.url || '').trim() && (!R().safeUrl(x.url) || !(x.label_en || '').trim()));
        const e = bad ? 'كل رابط يحتاج نصًا إنجليزيًا ورابطًا صالحًا (https:// أو مسارًا نسبيًا).' : '';
        el.setError(e); return e;
      }
    };
  }
};

/** sections: [{title, note, fields:[{type,...}]}] ; returns {el, collect(), validate()} */
export function buildForm(sections, row) {
  const ctrls = [];
  const root = h('div');
  sections.forEach((s) => {
    const grid = h('div', { class: s.grid === false ? '' : 'form-grid' });
    s.fields.forEach((f) => {
      const c = factories[f.type](f, row);
      c.def = f; ctrls.push(c);
      grid.append(f.wide || ['bi', 'gallery', 'links', 'image'].includes(f.type) ? h('div', { class: 'span2' }, c.el) : c.el);
    });
    root.append(h('div', { class: 'panel' }, s.title ? h('h2', { text: s.title }) : null, s.note ? h('p', { class: 'note', text: s.note }) : null, grid));
  });
  // wide fields span both columns
  root.querySelectorAll('.span2').forEach((n) => { n.style.gridColumn = '1 / -1'; });
  // auto slug from another field while the owner has not typed one
  ctrls.forEach((c) => {
    if (c.def.from) {
      const src = ctrls.find((x) => x.def.name === c.def.from) || ctrls.find((x) => x.def.type === 'bi' && x.def.name + '_en' === c.def.from);
      const srcInput = src && (src.input || src.enInput);
      if (srcInput && c.input && !c.input.value && !c.input.readOnly) {
        let touched = false; c.input.addEventListener('input', () => { touched = true; });
        srcInput.addEventListener('input', () => { if (!touched) c.input.value = slugify(srcInput.value); });
      }
    }
  });
  return {
    el: root,
    collect() { return Object.assign({}, ...ctrls.map((c) => c.read())); },
    validate() { const errs = ctrls.map((c) => c.check()).filter(Boolean); if (errs.length) { const first = root.querySelector('.invalid'); if (first) first.scrollIntoView({ block: 'center' }); } return errs.length === 0; }
  };
}
