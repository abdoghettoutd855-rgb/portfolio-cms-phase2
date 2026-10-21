/*
 * cms-loader.js — public pages
 *
 * Contract:
 *  - The HTML that ships with the page is the fallback. Nothing is removed or hidden up front.
 *  - If the config is empty, the request fails, or it takes longer than requestTimeoutMs, NOTHING changes
 *    and NOTHING is shown to the visitor (diagnostics go to console.debug only).
 *  - Content is touched only where it really differs from what the page already shows,
 *    so seeded (identical) content causes no flicker and no layout shift.
 *  - It only READS public data over the REST API using the public anon key. It has no write ability:
 *    writes are refused by Row Level Security.
 *  - It does not modify js/script.js: language changes are detected by watching <html lang>.
 */
(function () {
  'use strict';

  var cfg = window.CMS_CONFIG;
  var R = window.CMSRender;
  if (!cfg || !R || !cfg.supabaseUrl || !cfg.supabaseKey || /YOUR-PROJECT/i.test(cfg.supabaseUrl)) {
    // Not configured: public pages stay exactly as shipped. Only article.html has no content of its own.
    var st = document.getElementById('cms-state');
    if (st && document.body.getAttribute('data-cms-page') === 'article-dynamic') {
      st.textContent = 'This page is not available yet.';
    }
    return;
  }

  var BASE = String(cfg.supabaseUrl).replace(/\/+$/, '') + '/rest/v1/';
  var TIMEOUT = Number(cfg.requestTimeoutMs) > 0 ? Number(cfg.requestTimeoutMs) : 4000;
  var DEFAULT_EMAIL = 'abdoughet@gmail.com';
  var norm = R.norm;
  var doc = document;

  var data = { settings: {}, projects: null, services: null, article: null };
  var pageKind = doc.body.getAttribute('data-cms-page') === 'article-dynamic' ? 'dynamic'
    : (doc.querySelector('[data-cms-article]') ? 'static' : (doc.getElementById('home') ? 'home' : null));
  if (!pageKind) return;

  function debug() { try { console.debug.apply(console, ['[cms]'].concat([].slice.call(arguments))); } catch (e) { /* ignore */ } }
  function lang() { return doc.documentElement.lang === 'ar' ? 'ar' : 'en'; }

  /* ---------------- data access ---------------- */
  var controller = typeof AbortController === 'function' ? new AbortController() : null;
  var timer = setTimeout(function () { if (controller) controller.abort(); }, TIMEOUT);

  function get(table, query) {
    return fetch(BASE + table + '?' + query, {
      method: 'GET',
      headers: { apikey: cfg.supabaseKey, Authorization: 'Bearer ' + cfg.supabaseKey, Accept: 'application/json' },
      signal: controller ? controller.signal : undefined
    }).then(function (r) {
      if (!r.ok) throw new Error(table + ' ' + r.status);
      return r.json();
    });
  }

  /* ---------------- helpers ---------------- */
  function pick(row, field, L) {
    var en = row[field + '_en'], ar = row[field + '_ar'];
    if (L === 'ar') return (ar != null && String(ar).trim() !== '') ? ar : (en == null ? '' : en);
    return en == null ? '' : en;
  }
  function pickList(row, field, L) {
    var en = row[field + '_en'] || [], ar = row[field + '_ar'] || [];
    return (L === 'ar' && ar.length) ? ar : en;
  }
  function setting(key, L) {
    var row = data.settings[key];
    if (!row) return null;
    var v = L === 'ar' ? row.value_ar : row.value_en;
    if (v == null || String(v).trim() === '') return null; // empty = leave the page as it is
    return String(v);
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function mk(tag, cls, text) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.appendChild(doc.createTextNode(text));
    return e;
  }
  function directTextNodes(el) {
    var out = [];
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.nodeValue.trim() !== '') out.push(n);
    return out;
  }
  function setNodeText(el, idx, value) {
    var nodes = directTextNodes(el), node = nodes[idx || 0];
    if (!node) { el.appendChild(doc.createTextNode(value)); return; }
    if (norm(node.nodeValue) === norm(value)) return;
    var lead = node.nodeValue.match(/^\s*/)[0], trail = node.nodeValue.match(/\s*$/)[0];
    node.nodeValue = lead + value + trail;
  }
  function label(key, L) {
    var defaults = {
      live: ['View live project', 'عرض الموقع المباشر'],
      repo: ['View source code', 'عرض الكود المصدري'],
      request: ['Request something similar', 'اطلب موقعًا مشابهًا']
    };
    return setting('ui.' + key + '_label', L) || defaults[key][L === 'ar' ? 1 : 0];
  }
  function isExternal(u) { return /^https?:\/\//i.test(u); }

  /* ---------------- home: text slots ---------------- */
  function applySlots(L) {
    var nodes = doc.querySelectorAll('[data-cms]');
    Array.prototype.forEach.call(nodes, function (el) {
      var key = el.getAttribute('data-cms');
      var value = setting(key, L);
      if (value == null) return;
      if (el.hasAttribute('data-cms-rich')) {
        var tmp = doc.createElement(el.tagName);
        R.renderRichInto(tmp, value, 'gradient-text');
        if (R.richSignature(tmp) !== R.richSignature(el)) {
          while (el.firstChild) el.removeChild(el.firstChild);
          while (tmp.firstChild) el.appendChild(tmp.firstChild);
        }
      } else {
        setNodeText(el, parseInt(el.getAttribute('data-cms-text') || '0', 10), value);
      }
    });
    // contact links
    var email = (data.settings['contact.email'] || {}).value_en;
    var subject = (data.settings['contact.email_subject'] || {}).value_en;
    var wa = (data.settings['contact.whatsapp_number'] || {}).value_en;
    var waText = (data.settings['contact.whatsapp_text'] || {}).value_en;
    var mail = doc.querySelector('[data-cms-link="email"]');
    if (mail && email && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
      var m = 'mailto:' + email + (subject ? '?subject=' + encodeURIComponent(subject) : '');
      if (mail.getAttribute('href') !== m) mail.setAttribute('href', m);
    }
    var wl = doc.querySelector('[data-cms-link="whatsapp"]');
    if (wl && wa && /^\d{8,15}$/.test(wa)) {
      var w = 'https://wa.me/' + wa + (waText ? '?text=' + encodeURIComponent(waText) : '');
      if (wl.getAttribute('href') !== w) wl.setAttribute('href', w);
    }
  }

  // "Request something similar" buttons: js/script.js hardcodes the address. If the owner changed it, honour the new one.
  function installRequestOverride() {
    var email = (data.settings['contact.email'] || {}).value_en;
    if (!email || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || email === DEFAULT_EMAIL) return;
    doc.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-project]');
      if (!btn) return;
      e.preventDefault(); e.stopImmediatePropagation();
      var project = btn.getAttribute('data-project');
      var s = encodeURIComponent('Project inquiry: a website similar to ' + project);
      var b = encodeURIComponent('Hello Abdullah,\n\nI\'m interested in a website similar to: ' + project + '.\n\nMy business and requirements:\n');
      window.location.href = 'mailto:' + email + '?subject=' + s + '&body=' + b;
    }, true);
  }
  function bindRequestButton(btn) {
    if (btn.__cmsBound) return;
    btn.__cmsBound = true;
    btn.addEventListener('click', function () {
      var email = (data.settings['contact.email'] || {}).value_en || DEFAULT_EMAIL;
      var project = btn.getAttribute('data-project');
      var s = encodeURIComponent('Project inquiry: a website similar to ' + project);
      var b = encodeURIComponent('Hello Abdullah,\n\nI\'m interested in a website similar to: ' + project + '.\n\nMy business and requirements:\n');
      window.location.href = 'mailto:' + email + '?subject=' + s + '&body=' + b;
    });
  }

  /* ---------------- home: projects ---------------- */
  function expectedActions(p, L) {
    var list = [];
    var live = R.safeUrl(p.live_url || '');
    var repo = R.safeUrl(p.repo_url || '');
    if (live) list.push({ t: 'a', href: live, text: label('live', L) });
    if (repo) list.push({ t: 'a', href: repo, text: label('repo', L) });
    (Array.isArray(p.links) ? p.links : []).forEach(function (l) {
      var u = R.safeUrl(l && l.url || '');
      var text = l && ((L === 'ar' && l.label_ar) ? l.label_ar : l.label_en);
      if (u && text) list.push({ t: 'a', href: u, text: String(text) });
    });
    if ((p.description_en || '').trim() || (p.description_ar || '').trim()) {
      list.push({ t: 'a', href: 'article.html?project=' + encodeURIComponent(p.slug), text: L === 'ar' ? 'اكتشف المشروع' : 'Explore the project' });
    }
    if (p.show_request_button) list.push({ t: 'b', text: label('request', L), project: p.name_en });
    return list;
  }
  function actionSig(items) {
    return items.map(function (i) { return i.t === 'a' ? 'a|' + i.href + '|' + norm(i.text) : 'b|' + norm(i.text); }).join('\n');
  }
  function domActions(card) {
    var info = card.querySelector('.project-info');
    var wrap = card.querySelector('.project-actions');
    var els = wrap ? Array.prototype.slice.call(wrap.children)
      : Array.prototype.filter.call(info ? info.children : [], function (c) { return c.classList.contains('project-request'); });
    return { wrap: wrap, els: els, sig: els.map(function (e) {
      return e.tagName === 'A' ? 'a|' + e.getAttribute('href') + '|' + norm(e.textContent) : 'b|' + norm(e.textContent);
    }).join('\n') };
  }
  function buildActionEl(it) {
    var node;
    if (it.t === 'a') {
      node = mk('a', 'project-request');
      node.setAttribute('href', it.href);
      if (isExternal(it.href)) { node.setAttribute('target', '_blank'); node.setAttribute('rel', 'noopener noreferrer'); }
    } else {
      node = mk('button', 'project-request');
      node.setAttribute('type', 'button');
      node.setAttribute('data-project', it.project);
      bindRequestButton(node);
    }
    node.appendChild(doc.createTextNode(it.text + ' '));
    var i = mk('i', 'fa-solid fa-arrow-up-right-from-square');
    node.appendChild(i);
    return node;
  }
  function reconcileActions(card, p, L) {
    var want = expectedActions(p, L);
    var cur = domActions(card);
    // keep the data-project attribute of an existing request button in sync with the project name
    cur.els.forEach(function (e) { if (e.tagName === 'BUTTON' && e.getAttribute('data-project') !== p.name_en) e.setAttribute('data-project', p.name_en); });
    if (cur.sig === actionSig(want)) return;
    var wrap = cur.wrap;
    if (!wrap) {
      wrap = mk('div', 'project-actions');
      cur.els.forEach(function (e) { e.parentNode.removeChild(e); });
      card.querySelector('.project-info').appendChild(wrap);
    }
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
    want.forEach(function (it) { wrap.appendChild(buildActionEl(it)); });
  }

  function ensureVisual(card, p, L, index) {
    var vis = card.querySelector('.project-visual');
    if (!vis) return;
    var tagEl = vis.querySelector('.visual-tag');
    var tag = pick(p, 'visual_tag', L);
    var wantTag = tag ? pad2(index + 1) + ' \u2014 ' + tag : '';
    if (tagEl && wantTag && norm(tagEl.textContent) !== norm(wantTag)) tagEl.textContent = wantTag;
    if (!tagEl && wantTag) { tagEl = mk('span', 'visual-tag', wantTag); vis.appendChild(tagEl); }
    if (p.visual_variant === 'cover') {
      var url = R.safeUrl(p.cover_url || '', { httpsOnly: true });
      var img = vis.querySelector('img.cms-cover');
      if (!vis.classList.contains('visual-cover')) {
        if (!url) return; // keep the original graphic when there is no image to show
        Array.prototype.slice.call(vis.children).forEach(function (c) { if (c !== tagEl) vis.removeChild(c); });
        ['visual-food', 'visual-hotbox', 'visual-restaurant', 'visual-ai'].forEach(function (c) { vis.classList.remove(c); });
        vis.classList.add('visual-cover');
        img = null;
      }
      if (url) {
        if (!img) { img = mk('img', 'cms-cover'); img.setAttribute('loading', 'lazy'); img.setAttribute('decoding', 'async'); vis.insertBefore(img, vis.firstChild); }
        if (img.getAttribute('src') !== url) img.setAttribute('src', url);
        img.setAttribute('alt', pick(p, 'name', L));
      }
    }
  }

  function buildProjectCard(p) {
    var card = mk('article', 'project-card');
    card.setAttribute('data-cms-project', p.slug);
    var vis = mk('div', 'project-visual visual-cover');
    card.appendChild(vis);
    var info = mk('div', 'project-info');
    var body = mk('div');
    body.appendChild(mk('h3'));
    body.appendChild(mk('p'));
    body.appendChild(mk('div', 'tag-list'));
    info.appendChild(body);
    card.appendChild(info);
    return card;
  }

  function reconcileProjectText(card, p, L) {
    var h3 = card.querySelector('.project-info h3');
    var name = pick(p, 'name', L);
    if (h3 && name && norm(h3.textContent) !== norm(name)) h3.textContent = name;
    var para = card.querySelector('.project-info p');
    var summary = pick(p, 'summary', L);
    if (para && norm(para.textContent) !== norm(summary)) para.textContent = summary;
    var tl = card.querySelector('.tag-list');
    var tags = pickList(p, 'tags', L);
    if (tl) {
      var cur = Array.prototype.map.call(tl.children, function (s) { return norm(s.textContent); }).join('|');
      if (cur !== tags.map(norm).join('|')) {
        while (tl.firstChild) tl.removeChild(tl.firstChild);
        tags.forEach(function (t) { tl.appendChild(mk('span', null, t)); });
      }
    }
    var st = card.querySelector('.project-status');
    var status = pick(p, 'status_label', L);
    if (status) {
      if (!st) { st = mk('div', 'project-status'); var host = h3 ? h3.parentNode : null; if (host) host.insertBefore(st, h3); }
      if (st && norm(st.textContent) !== norm(status)) st.textContent = status;
    } else if (st) { st.parentNode.removeChild(st); }
    card.classList.toggle('project-featured', !!p.is_featured);
  }

  function applyProjects(L) {
    var grid = doc.querySelector('.projects-grid');
    var list = data.projects;
    if (!grid || !list || !list.length) return; // empty or failed => keep the original cards
    var bySlug = {};
    Array.prototype.forEach.call(grid.querySelectorAll('[data-cms-project]'), function (c) { bySlug[c.getAttribute('data-cms-project')] = c; });
    var keep = {};
    var ordered = [];
    list.forEach(function (p, idx) {
      var card = bySlug[p.slug];
      if (!card) { card = buildProjectCard(p); bySlug[p.slug] = card; }
      keep[p.slug] = true;
      reconcileProjectText(card, p, L);
      ensureVisual(card, p, L, idx);
      reconcileActions(card, p, L);
      ordered.push(card);
    });
    Object.keys(bySlug).forEach(function (slug) { if (!keep[slug] && bySlug[slug].parentNode) bySlug[slug].parentNode.removeChild(bySlug[slug]); });
    var current = Array.prototype.slice.call(grid.querySelectorAll(':scope > [data-cms-project]'));
    var same = current.length === ordered.length && current.every(function (c, i) { return c === ordered[i]; });
    if (!same) ordered.forEach(function (c) { grid.appendChild(c); });
  }

  /* ---------------- home: services ---------------- */
  function iconOf(card) {
    var i = card.querySelector('i');
    return i ? (Array.prototype.filter.call(i.classList, function (c) { return c !== 'fa-solid'; })[0] || '') : '';
  }
  function applyServices(L) {
    var grid = doc.querySelector('.services-grid');
    var list = data.services;
    if (!grid || !list || !list.length) return;
    var want = list.map(function (s) { return [s.icon, norm(pick(s, 'title', L)), norm(pick(s, 'body', L))].join('|'); }).join('\n');
    var have = Array.prototype.map.call(grid.querySelectorAll('.service-card'), function (c) {
      var h = c.querySelector('h3'), p = c.querySelector('p');
      return [iconOf(c), norm(h && h.textContent), norm(p && p.textContent)].join('|');
    }).join('\n');
    if (want === have) return;
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    list.forEach(function (s, idx) {
      var card = mk('article', 'service-card');
      card.appendChild(mk('span', 'service-number', pad2(idx + 1)));
      var icon = /^fa-[a-z0-9-]{2,40}$/.test(s.icon || '') ? s.icon : 'fa-star';
      card.appendChild(mk('i', 'fa-solid ' + icon));
      card.appendChild(mk('h3', null, pick(s, 'title', L)));
      card.appendChild(mk('p', null, pick(s, 'body', L)));
      grid.appendChild(card);
    });
  }

  /* ---------------- articles (static pages and article.html) ---------------- */
  function projectAsArticle(p) {
    function md(L) {
      var parts = [];
      var d = pick(p, 'description', L); if (d) parts.push(d);
      (Array.isArray(p.gallery) ? p.gallery : []).forEach(function (u) { if (R.safeUrl(u, { httpsOnly: true })) parts.push('![](' + u + ')'); });
      if (p.video_url && R.parseVideo(p.video_url)) parts.push('@video(' + p.video_url + ')');
      var links = [];
      if (p.live_url) links.push('- [' + label('live', L) + '](' + p.live_url + ')');
      if (p.repo_url) links.push('- [' + label('repo', L) + '](' + p.repo_url + ')');
      if (links.length) parts.push(links.join('\n'));
      return parts.join('\n\n');
    }
    return {
      kicker_en: p.visual_tag_en || '', kicker_ar: p.visual_tag_ar || '',
      title_en: p.name_en, title_ar: p.name_ar,
      excerpt_en: p.summary_en, excerpt_ar: p.summary_ar,
      status_text_en: p.status_label_en, status_text_ar: p.status_label_ar,
      aside_note_en: (p.tags_en || []).join(' \u00b7 '), aside_note_ar: (p.tags_ar && p.tags_ar.length ? p.tags_ar : p.tags_en || []).join(' \u00b7 '),
      content_en: md('en'), content_ar: md('ar')
    };
  }

  // cover image + body + video + external links, all as the same safe markdown subset
  function articleMarkdown(a, L) {
    var parts = [];
    if (a.cover_url && R.safeUrl(a.cover_url, { httpsOnly: true })) parts.push('![](' + a.cover_url + ')');
    var body = pick(a, 'content', L);
    if (body) parts.push(body);
    if (a.video_url && R.parseVideo(a.video_url)) parts.push('@video(' + a.video_url + ')');
    var links = [];
    (Array.isArray(a.links) ? a.links : []).forEach(function (l) {
      var text = l && ((L === 'ar' && l.label_ar) ? l.label_ar : l.label_en);
      if (l && text && R.safeUrl(l.url || '', { mailto: true })) links.push('- [' + String(text).replace(/[\[\]]/g, '') + '](' + l.url + ')');
    });
    if (links.length) parts.push(links.join('\n'));
    return parts.join('\n\n');
  }

  function applyArticle(a, L) {
    var root = doc.querySelector('.article-main');
    if (!root || !a) return;
    var slots = [
      ['.article-hero .section-index', 'kicker'],
      ['.article-hero h1', 'title'],
      ['.article-lead', 'excerpt'],
      ['.article-status > span:not(.status-dot)', 'status_text'],
      ['.article-aside > p', 'aside_note']
    ];
    slots.forEach(function (s) {
      var el = root.querySelector(s[0]);
      if (!el) return;
      var en = a[s[1] + '_en'], ar = a[s[1] + '_ar'];
      if (en != null && String(en).trim() !== '') el.setAttribute('data-en', en);
      if (ar != null && String(ar).trim() !== '') el.setAttribute('data-ar', ar);
      var v = pick(a, s[1], L);
      if (v && norm(el.textContent) !== norm(v)) el.textContent = v;
    });
    var content = root.querySelector('.article-content');
    if (content) {
      var sections = R.renderMarkdown(articleMarkdown(a, L), doc);
      var have = Array.prototype.filter.call(content.children, function (c) { return c.tagName === 'SECTION'; });
      if (R.sectionSignature(sections) !== R.sectionSignature(have)) {
        while (content.firstChild) content.removeChild(content.firstChild);
        sections.forEach(function (s) { content.appendChild(s); });
      }
    }
    var title = pick(a, 'title', L);
    if (title) doc.title = title + ' | Abdullah Ghettout';
  }

  /* ---------------- article.html (dynamic page) ---------------- */
  function dynamicToggle() {
    var btn = doc.getElementById('article-language');
    function setLang(l) {
      var ar = l === 'ar';
      doc.documentElement.lang = ar ? 'ar' : 'en';       // also triggers applyAll through the observer
      doc.documentElement.dir = ar ? 'rtl' : 'ltr';
      doc.body.classList.toggle('lang-ar', ar);
      Array.prototype.forEach.call(doc.querySelectorAll('.nav [data-en][data-ar], .article-back [data-en][data-ar], .article-footer [data-en][data-ar], .article-aside a [data-en][data-ar]'), function (e) {
        e.textContent = ar ? e.getAttribute('data-ar') : e.getAttribute('data-en');
      });
      if (btn) {
        btn.textContent = ar ? 'English' : 'العربية';
        btn.setAttribute('aria-label', ar ? 'Switch language to English' : 'Switch language to Arabic');
      }
    }
    if (btn) btn.addEventListener('click', function () { setLang(lang() === 'en' ? 'ar' : 'en'); });
    var y = doc.getElementById('article-year'); if (y) y.textContent = new Date().getFullYear();
  }
  function showState(msgEn, msgAr) {
    var s = doc.getElementById('cms-state');
    if (!s) return;
    s.hidden = false;
    s.textContent = lang() === 'ar' ? msgAr : msgEn;
    var back = mk('a', null, lang() === 'ar' ? ' العودة إلى معرض الأعمال' : ' Back to portfolio');
    back.setAttribute('href', 'index.html#work');
    s.appendChild(back);
  }

  /* ---------------- orchestration ---------------- */
  function applyAll() {
    var L = lang();
    try {
      if (pageKind === 'home') {
        applySlots(L);
        applyProjects(L);
        applyServices(L);
      } else if (data.article) {
        applyArticle(data.article, L);
      }
    } catch (e) { debug('apply failed', e); }
  }

  function start() {
    var done = function () {
      clearTimeout(timer);
      applyAll();
      new MutationObserver(applyAll).observe(doc.documentElement, { attributes: true, attributeFilter: ['lang'] });
    };

    if (pageKind === 'home') {
      var pending = 3;
      var fin = function () { if (--pending === 0) { installRequestOverride(); done(); } };
      get('site_settings', 'select=*').then(function (rows) {
        rows.forEach(function (r) { data.settings[r.key] = r; });
      }).catch(function (e) { debug('settings', e.message); }).then(fin);
      get('projects', 'select=*&order=sort_order.asc,created_at.asc').then(function (rows) { data.projects = rows; })
        .catch(function (e) { debug('projects', e.message); }).then(fin);
      get('services', 'select=*&order=sort_order.asc,created_at.asc').then(function (rows) { data.services = rows; })
        .catch(function (e) { debug('services', e.message); }).then(fin);
      return;
    }

    if (pageKind === 'static') {
      var slug = doc.querySelector('[data-cms-article]').getAttribute('data-cms-article');
      get('articles', 'select=*&limit=1&slug=eq.' + encodeURIComponent(slug)).then(function (rows) {
        data.article = rows && rows[0] ? rows[0] : null;
      }).catch(function (e) { debug('article', e.message); }).then(done);
      return;
    }

    // dynamic article.html
    dynamicToggle();
    var params = new URLSearchParams(window.location.search);
    var aSlug = params.get('slug'), pSlug = params.get('project');
    var valid = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    var shown = false;
    function reveal() {
      if (shown) return; shown = true;
      var s = doc.getElementById('cms-state'); if (s) s.hidden = true;
      Array.prototype.forEach.call(doc.querySelectorAll('[data-cms-reveal]'), function (e) { e.hidden = false; });
    }
    var req = null;
    if (aSlug && valid.test(aSlug)) {
      req = get('articles', 'select=*&limit=1&slug=eq.' + encodeURIComponent(aSlug)).then(function (r) { return r[0] || null; });
    } else if (pSlug && valid.test(pSlug)) {
      req = get('projects', 'select=*&limit=1&slug=eq.' + encodeURIComponent(pSlug)).then(function (r) { return r[0] ? projectAsArticle(r[0]) : null; });
    }
    if (!req) { clearTimeout(timer); showState('This page was not found.', 'لم يتم العثور على هذه الصفحة.'); return; }
    req.then(function (a) {
      if (!a) { clearTimeout(timer); showState('This page was not found.', 'لم يتم العثور على هذه الصفحة.'); return; }
      data.article = a; reveal(); done();
    }).catch(function (e) {
      debug('dynamic article', e.message); clearTimeout(timer);
      showState('This page could not be loaded right now. Please try again later.', 'تعذّر تحميل هذه الصفحة الآن. يُرجى المحاولة لاحقًا.');
    });
  }

  start();
})();
