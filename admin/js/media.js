// media.js — media library view, uploader and the picker dialog used by image fields
import { h, clear, toast, confirmDialog, openDialog, closeDialog, fmtSize, fmtDate, msg } from './ui.js';
import { uploadMedia, listMedia, deleteMedia, reportError, config } from './api.js';

/** Upload widget: drag & drop or choose. onDone(row) called per successful file. */
export function uploader({ kind = 'image', onDone } = {}) {
  const list = h('div');
  const input = h('input', { type: 'file', multiple: true, hidden: true,
    accept: kind === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp,image/gif,image/avif' });
  const limit = kind === 'video' ? config.maxVideoMB || 25 : config.maxImageMB || 5;
  const pick = h('button', { type: 'button', class: 'btn', text: kind === 'video' ? 'اختر فيديو' : 'اختر صورًا' });
  const box = h('div', { class: 'drop' },
    h('p', { text: (kind === 'video' ? 'اسحب ملف فيديو (mp4 / webm) إلى هنا' : 'اسحب الصور إلى هنا') + ' أو ' }),
    pick, input,
    h('p', { class: 'hint', text: 'الحد الأقصى ' + limit + ' MB للملف.' + (kind === 'image' ? ' تُصغَّر الصور الكبيرة تلقائيًا قبل الرفع. SVG غير مسموح.' : '') }), list);
  pick.addEventListener('click', () => input.click());
  input.addEventListener('change', () => handle([...input.files]).then(() => { input.value = ''; }));
  ['dragenter', 'dragover'].forEach((ev) => box.addEventListener(ev, (e) => { e.preventDefault(); box.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => box.addEventListener(ev, (e) => { e.preventDefault(); box.classList.remove('over'); }));
  box.addEventListener('drop', (e) => handle([...e.dataTransfer.files]));

  async function handle(files) {
    for (const file of files) {
      const bar = h('i'); const status = h('span', { text: 'جارٍ الرفع…' });
      const row = h('div', { class: 'upl' }, h('b', { text: file.name }), ' — ', status, h('div', { class: 'progress' }, bar));
      list.appendChild(row);
      try {
        const res = await uploadMedia(file, kind, (p) => { bar.style.width = Math.round(p * 100) + '%'; });
        bar.style.width = '100%'; status.textContent = 'تم الرفع (' + fmtSize(res.size_bytes) + ')';
        toast('تم رفع ' + file.name);
        if (onDone) onDone(res);
      } catch (e) {
        status.textContent = 'فشل: ' + (e.friendly ? e.message : e.message);
        row.appendChild(msg('err', e.friendly ? e.message : 'فشل رفع الملف. ' + e.message));
        reportError(e);
      }
    }
  }
  return box;
}

function card(m, { onPick, onDelete }) {
  const isVideo = m.mime_type.startsWith('video/');
  const thumb = h('button', { type: 'button', class: 'thumb', 'aria-label': m.name, onclick: () => onPick && onPick(m) },
    isVideo ? h('video', { src: m.url, preload: 'metadata', muted: true }) : h('img', { src: m.url, alt: m.name, loading: 'lazy' }));
  const acts = h('div', { class: 'acts' });
  if (onPick) acts.append(h('button', { type: 'button', class: 'btn small primary', text: 'اختيار', onclick: () => onPick(m) }));
  acts.append(h('button', { type: 'button', class: 'btn small', text: 'نسخ الرابط', onclick: async () => {
    try { await navigator.clipboard.writeText(m.url); toast('تم نسخ الرابط'); } catch (_) { toast(m.url, 'ok', 9000); }
  } }));
  if (onDelete) acts.append(h('button', { type: 'button', class: 'btn small danger', text: 'حذف', onclick: () => onDelete(m) }));
  return h('div', { class: 'media-card' }, thumb,
    h('div', { class: 'meta' }, h('b', { text: m.name }), m.mime_type + ' · ' + fmtSize(m.size_bytes) + (m.width ? ' · ' + m.width + '×' + m.height : '')),
    acts);
}

/** Full view. */
export async function render(root) {
  let kind = 'image';
  const grid = h('div', { class: 'media-grid' });
  const holder = h('div');
  const tabs = h('div', { class: 'tabs', role: 'tablist' });
  let all = [];

  function paint() {
    clear(grid);
    const items = all.filter((m) => (kind === 'video') === m.mime_type.startsWith('video/'));
    if (!items.length) grid.append(h('div', { class: 'empty', text: kind === 'video' ? 'لا توجد فيديوهات مرفوعة. يمكنك أيضًا استخدام روابط YouTube أو Vimeo دون رفع.' : 'لا توجد صور بعد. ارفع أول صورة من الأعلى.' }));
    items.forEach((m) => grid.append(card(m, { onDelete: remove })));
    clear(tabs);
    [['image', 'الصور'], ['video', 'الفيديوهات']].forEach(([k, t]) => tabs.append(h('button', {
      type: 'button', class: 'tab', role: 'tab', 'aria-selected': String(k === kind), text: t,
      onclick: () => { kind = k; mountUploader(); paint(); } })));
  }
  function mountUploader() { clear(holder); holder.append(uploader({ kind, onDone: (r) => { all.unshift(r); paint(); } })); }
  async function remove(m) {
    const ok = await confirmDialog({ title: 'حذف الملف', message: 'سيُحذف الملف «' + m.name + '» نهائيًا من التخزين. إن كان مستخدمًا في مشروع أو مقال فسيُمنع الحذف حتى لا تنكسر الصور.', confirmText: 'حذف الملف', danger: true });
    if (!ok) return;
    try { await deleteMedia(m); all = all.filter((x) => x.id !== m.id); paint(); toast('تم حذف الملف'); }
    catch (e) { reportError(e); }
  }
  root.append(h('div', { class: 'panel' }, h('h2', { text: 'رفع ملفات' }), holder),
    h('div', { class: 'panel' }, h('div', { class: 'head-row' }, h('h2', { text: 'المكتبة' }), tabs), grid));
  try { all = await listMedia(); } catch (e) { root.prepend(msg('err', 'تعذّر تحميل المكتبة: ' + e.message)); reportError(e); }
  mountUploader(); paint();
}

/** Picker dialog: resolves with a public URL or null. */
export async function pickMedia(kind = 'image') {
  let all = [];
  const grid = h('div', { class: 'media-grid' });
  const holder = h('div');
  function paint() {
    clear(grid);
    const items = all.filter((m) => (kind === 'video') === m.mime_type.startsWith('video/'));
    if (!items.length) grid.append(h('div', { class: 'empty', text: 'لا توجد ملفات بعد. ارفع ملفًا من الأعلى.' }));
    items.forEach((m) => grid.append(card(m, { onPick: (x) => closeDialog(x.url) })));
  }
  const content = h('div', null, h('h3', { text: kind === 'video' ? 'اختيار فيديو' : 'اختيار صورة' }),
    holder, grid, h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn', text: 'إغلاق', onclick: () => closeDialog(null) })));
  holder.append(uploader({ kind, onDone: (r) => { all.unshift(r); paint(); } }));
  const p = openDialog(content, { wide: true });
  listMedia().then((r) => { all = r; paint(); }).catch((e) => { grid.append(msg('err', 'تعذّر تحميل المكتبة. ' + e.message)); });
  return p;
}
