// resource.js — generic list + edit screens used by projects, articles and services
import { h, clear, toast, busy, confirmDialog, msg } from './ui.js';
import { db, reportError, explain } from './api.js';
import { buildForm } from './fields.js';

export function resourceView(cfg) {
  const base = '#/' + cfg.route;

  async function renderList(root) {
    const wrap = h('div');
    root.append(h('div', { class: 'head-row' }, h('p', { class: 'note', text: cfg.listNote || '' }),
      h('a', { class: 'btn primary', href: base + '/new', text: '+ ' + cfg.addLabel })), wrap);
    let rows = [];
    async function load() {
      clear(wrap);
      wrap.append(h('div', { class: 'empty', text: 'جارٍ التحميل…' }));
      try { rows = await db.list(cfg.table, cfg.order); } catch (e) { clear(wrap); wrap.append(msg('err', 'تعذّر تحميل القائمة. ' + e.message)); reportError(e); return; }
      paint();
    }
    async function move(i, dir) {
      const j = i + dir; if (j < 0 || j >= rows.length) return;
      const next = rows.slice(); [next[i], next[j]] = [next[j], next[i]];
      const jobs = [];
      next.forEach((r, idx) => { const so = (idx + 1) * 10; if (r.sort_order !== so) jobs.push(db.update(cfg.table, r.id, { sort_order: so }).then((u) => { r.sort_order = u.sort_order; })); });
      try { await Promise.all(jobs); rows = next; paint(); toast('تم حفظ الترتيب'); } catch (e) { reportError(e); await load(); }
    }
    async function togglePublish(r, btn) {
      await busy(btn, async () => {
        try { const u = await db.update(cfg.table, r.id, { is_published: !r.is_published }); r.is_published = u.is_published; paint(); toast(u.is_published ? 'تم النشر' : 'أُعيد إلى المسودات'); }
        catch (e) { reportError(e); }
      });
    }
    async function remove(r) {
      const note = cfg.deleteNote ? cfg.deleteNote(r) : '';
      const ok = await confirmDialog({
        title: 'حذف ' + cfg.singular, danger: true, confirmText: 'حذف نهائيًا',
        message: 'هل تريد حذف «' + cfg.label(r) + '» نهائيًا؟ لا يمكن التراجع. الصور والملفات المرتبطة لا تُحذف وتبقى في مكتبة الوسائط.' + (note ? '\n' + note : '')
      });
      if (!ok) return;
      try { await db.remove(cfg.table, r.id); toast('تم الحذف'); await load(); } catch (e) { reportError(e); }
    }
    function paint() {
      clear(wrap);
      if (!rows.length) { wrap.append(h('div', { class: 'panel empty', text: 'لا توجد عناصر بعد. اضغط «' + cfg.addLabel + '» للبدء.' })); return; }
      const tbody = h('tbody');
      rows.forEach((r, i) => {
        const pub = h('button', { type: 'button', class: 'btn small', text: r.is_published ? 'إلغاء النشر' : 'نشر', onclick: (e) => togglePublish(r, e.currentTarget) });
        tbody.append(h('tr', null,
          h('td', null, h('div', { class: 'row-actions' },
            h('button', { type: 'button', class: 'icon-btn', text: '▲', title: 'للأعلى', 'aria-label': 'نقل للأعلى', disabled: i === 0, onclick: () => move(i, -1) }),
            h('button', { type: 'button', class: 'icon-btn', text: '▼', title: 'للأسفل', 'aria-label': 'نقل للأسفل', disabled: i === rows.length - 1, onclick: () => move(i, 1) }))),
          h('td', null, h('div', { class: 'title', text: cfg.label(r) }), h('div', { class: 'sub', text: cfg.sub ? cfg.sub(r) : '' })),
          h('td', null, h('span', { class: 'badge ' + (r.is_published ? 'ok' : 'warn'), text: r.is_published ? 'منشور' : 'مسودة' }), ' ', cfg.badges ? cfg.badges(r) : null),
          h('td', null, h('div', { class: 'row-actions' }, pub, h('a', { class: 'btn small', href: base + '/' + r.id, text: 'تعديل' }),
            h('button', { type: 'button', class: 'btn small danger', text: 'حذف', onclick: () => remove(r) })))));
      });
      wrap.append(h('div', { class: 'panel table-wrap' }, h('table', null,
        h('thead', null, h('tr', null, h('th', { text: 'الترتيب' }), h('th', { text: cfg.singular }), h('th', { text: 'الحالة' }), h('th', { text: 'إجراءات' }))), tbody)));
    }
    await load();
  }

  async function renderForm(root, param) {
    const isNew = param === 'new';
    let row = { ...(cfg.defaults ? cfg.defaults() : {}) };
    if (!isNew) {
      try { row = await db.get(cfg.table, param); } catch (e) { root.append(msg('err', 'تعذّر تحميل العنصر. ' + e.message)); reportError(e); return; }
      if (!row) { root.append(msg('err', 'العنصر غير موجود (ربما حُذف).'), h('a', { class: 'btn', href: base, text: 'العودة إلى القائمة' })); return; }
    }
    const sections = cfg.sections(row, isNew);
    const form = buildForm(sections, row);
    const banner = cfg.banner ? cfg.banner(row, isNew) : null;
    const saveBtn = h('button', { type: 'button', class: 'btn primary', text: 'حفظ التغييرات' });
    const status = h('div');
    saveBtn.addEventListener('click', () => busy(saveBtn, async () => {
      clear(status);
      if (!form.validate()) { status.append(msg('err', 'تحقق من الحقول المعلّمة بالأحمر ثم أعد الحفظ.')); return; }
      let values = form.collect();
      const problem = cfg.validate ? cfg.validate(values, row) : null;
      if (problem) { status.append(msg('err', problem)); return; }
      if (cfg.beforeSave) values = cfg.beforeSave(values, row, isNew);
      saveBtn.textContent = 'جارٍ الحفظ…';
      try {
        let saved;
        if (isNew) {
          const existing = await db.list(cfg.table, cfg.order);
          values.sort_order = existing.reduce((m, r) => Math.max(m, r.sort_order || 0), 0) + 10;
          saved = await db.insert(cfg.table, values);
        } else {
          saved = await db.update(cfg.table, row.id, values);
        }
        if (!saved || !saved.id) throw new Error('لم يؤكد الخادم الحفظ.');
        toast('تم الحفظ بنجاح' + (saved.is_published ? ' — التغيير ظاهر الآن على الموقع.' : ' (مسودة، غير ظاهرة للزوار).'));
        window.location.hash = base;
      } catch (e) { status.append(msg('err', e.friendly ? e.message : 'لم يتم الحفظ. ' + explain(e))); reportError(e); }
    }));
    root.append(h('div', { class: 'head-row' }, h('a', { class: 'btn', href: base, text: '← القائمة' })), banner, form.el, status,
      h('div', { class: 'formbar' }, saveBtn, h('a', { class: 'btn', href: base, text: 'إلغاء' })));
  }

  return { async render(root, param) { if (param) await renderForm(root, param); else await renderList(root); } };
}
