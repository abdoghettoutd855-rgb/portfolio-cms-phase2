/*
 * cms-render.js
 * Safe renderer for the limited Markdown used by the CMS (articles and project details).
 *
 * Security model: this file NEVER parses HTML and NEVER uses innerHTML.
 * Every node is created with createElement / createTextNode / setAttribute,
 * so text typed by the owner can never become markup or script.
 * URLs are checked against an allow-list before they reach an href/src attribute.
 *
 * Supported syntax
 *   ## Heading          starts a new <section class="article-section"> with an <h2>
 *   ### Sub heading     <h3>
 *   - item / * item     bullet list        1. item   numbered list
 *   > quote             blockquote
 *   ![alt](url)         image on its own line
 *   @video(url)         YouTube / Vimeo / direct .mp4 .webm link on its own line
 *   **bold**  *italic*  `code`  [text](url)  and \* to escape a character
 */
(function (global) {
  'use strict';

  var VIDEO_FILE = /\.(mp4|webm|ogg)(\?[^\s]*)?$/i;

  function isRelative(u) {
    // no scheme, not protocol-relative, no whitespace or control characters
    return /^(?![a-z][a-z0-9+.\-]*:)(?!\/\/)[^\s\u0000-\u001f]+$/i.test(u);
  }

  /** Returns a safe URL string or null. opts.mailto allows mailto: links. opts.httpsOnly refuses http: and relative-only checks stay. */
  function safeUrl(url, opts) {
    opts = opts || {};
    if (typeof url !== 'string') return null;
    var u = url.trim();
    if (!u || /[\u0000-\u001f\u007f]/.test(u)) return null;
    if (/^https:\/\/[^\s]+$/i.test(u)) return u;
    if (!opts.httpsOnly && /^http:\/\/[^\s]+$/i.test(u)) return u;
    if (opts.mailto && /^mailto:[^\s]+$/i.test(u)) return u;
    if (isRelative(u)) return u;
    return null;
  }

  /** Parses a video URL into {kind, src} where src is rebuilt from the extracted id (never the raw URL). */
  function parseVideo(url) {
    var u = safeUrl(url, { httpsOnly: true });
    if (!u) return null;
    var m;
    if ((m = u.match(/^https:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#\s]*&)?v=([A-Za-z0-9_-]{11})(?:[&#][^\s]*)?$/i)) ||
        (m = u.match(/^https:\/\/youtu\.be\/([A-Za-z0-9_-]{11})(?:[?#][^\s]*)?$/i)) ||
        (m = u.match(/^https:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})(?:[?#][^\s]*)?$/i))) {
      return { kind: 'iframe', src: 'https://www.youtube-nocookie.com/embed/' + m[1] };
    }
    if ((m = u.match(/^https:\/\/(?:www\.)?vimeo\.com\/(\d{5,12})(?:[/?#][^\s]*)?$/i)) ||
        (m = u.match(/^https:\/\/player\.vimeo\.com\/video\/(\d{5,12})(?:[?#][^\s]*)?$/i))) {
      return { kind: 'iframe', src: 'https://player.vimeo.com/video/' + m[1] };
    }
    if (VIDEO_FILE.test(u)) return { kind: 'video', src: u };
    return null;
  }

  function el(doc, tag, cls) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  /* ---------- inline ---------- */
  function renderInline(doc, parent, text) {
    var i = 0, buf = '';
    function flush() { if (buf) { parent.appendChild(doc.createTextNode(buf)); buf = ''; } }
    while (i < text.length) {
      var ch = text[i];
      if (ch === '\\' && i + 1 < text.length && /[\\`*_{}\[\]()#+\-.!>|]/.test(text[i + 1])) {
        buf += text[i + 1]; i += 2; continue;
      }
      if (ch === '`') {
        var end = text.indexOf('`', i + 1);
        if (end > i + 1) { flush(); var c = el(doc, 'code'); c.appendChild(doc.createTextNode(text.slice(i + 1, end))); parent.appendChild(c); i = end + 1; continue; }
      }
      if (ch === '*' && text[i + 1] === '*') {
        var e2 = text.indexOf('**', i + 2);
        if (e2 > i + 2) { flush(); var b = el(doc, 'strong'); renderInline(doc, b, text.slice(i + 2, e2)); parent.appendChild(b); i = e2 + 2; continue; }
      }
      if (ch === '*' && text[i + 1] !== '*' && text[i + 1] !== ' ') {
        var e1 = i + 1;
        while ((e1 = text.indexOf('*', e1)) !== -1 && text[e1 - 1] === '\\') e1++;
        if (e1 > i + 1) { flush(); var em = el(doc, 'em'); renderInline(doc, em, text.slice(i + 1, e1)); parent.appendChild(em); i = e1 + 1; continue; }
      }
      if (ch === '[') {
        var m = /^\[([^\]]+)\]\(([^()\s]+)\)/.exec(text.slice(i));
        if (m) {
          var href = safeUrl(m[2], { mailto: true });
          flush();
          if (href) {
            var a = el(doc, 'a');
            a.setAttribute('href', href);
            if (/^https?:/i.test(href)) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer'); }
            renderInline(doc, a, m[1]);
            parent.appendChild(a);
          } else {
            parent.appendChild(doc.createTextNode(m[1])); // unsafe URL: keep the text, drop the link
          }
          i += m[0].length; continue;
        }
      }
      buf += ch; i++;
    }
    flush();
  }

  /* ---------- blocks ---------- */
  function mediaBlock(doc, line) {
    var im = /^!\[([^\]]*)\]\(([^()\s]+)\)$/.exec(line);
    if (im) {
      var src = safeUrl(im[2], { httpsOnly: true });
      if (!src) return null;
      var fig = el(doc, 'figure', 'cms-figure');
      var img = el(doc, 'img');
      img.setAttribute('src', src);
      img.setAttribute('alt', im[1]);
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
      fig.appendChild(img);
      return fig;
    }
    var vm = /^@video\(([^()\s]+)\)$/.exec(line);
    if (vm) {
      var v = parseVideo(vm[1]);
      if (!v) return null;
      var wrap = el(doc, 'div', 'cms-video');
      if (v.kind === 'iframe') {
        var f = el(doc, 'iframe');
        f.setAttribute('src', v.src);
        f.setAttribute('loading', 'lazy');
        f.setAttribute('title', 'Video');
        f.setAttribute('allowfullscreen', '');
        f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
        wrap.appendChild(f);
      } else {
        var vd = el(doc, 'video');
        vd.setAttribute('src', v.src);
        vd.setAttribute('controls', '');
        vd.setAttribute('preload', 'metadata');
        wrap.appendChild(vd);
      }
      return wrap;
    }
    return null;
  }

  /** Returns an array of <section class="article-section"> elements. */
  function renderMarkdown(md, doc) {
    doc = doc || global.document;
    var lines = String(md == null ? '' : md).replace(/\r\n?/g, '\n').split('\n');
    var sections = [];
    var section = null, para = [], list = null, quote = [];

    function ensureSection() {
      if (!section) { section = el(doc, 'section', 'article-section'); sections.push(section); }
      return section;
    }
    function flushPara() {
      if (!para.length) return;
      var p = el(doc, 'p');
      renderInline(doc, p, para.join(' '));
      ensureSection().appendChild(p);
      para = [];
    }
    function flushList() { list = null; }
    function flushQuote() {
      if (!quote.length) return;
      var bq = el(doc, 'blockquote');
      renderInline(doc, bq, quote.join(' '));
      ensureSection().appendChild(bq);
      quote = [];
    }
    function flushAll() { flushPara(); flushList(); flushQuote(); }

    for (var n = 0; n < lines.length; n++) {
      var raw = lines[n];
      var line = raw.trim();
      if (!line) { flushAll(); continue; }
      var m;
      if ((m = /^##\s+(.+)$/.exec(line)) && !/^###/.test(line)) {
        flushAll();
        section = el(doc, 'section', 'article-section');
        sections.push(section);
        var h2 = el(doc, 'h2'); renderInline(doc, h2, m[1]); section.appendChild(h2);
        continue;
      }
      if ((m = /^###\s+(.+)$/.exec(line))) {
        flushAll();
        var h3 = el(doc, 'h3'); renderInline(doc, h3, m[1]); ensureSection().appendChild(h3);
        continue;
      }
      var media = mediaBlock(doc, line);
      if (media) { flushAll(); ensureSection().appendChild(media); continue; }
      if (/^(!\[|@video\()/.test(line)) { flushAll(); continue; } // unsafe or malformed media line is dropped
      if ((m = /^[-*]\s+(.+)$/.exec(line))) {
        flushPara(); flushQuote();
        if (!list || list.tagName !== 'UL') { list = el(doc, 'ul'); ensureSection().appendChild(list); }
        var li = el(doc, 'li'); renderInline(doc, li, m[1]); list.appendChild(li);
        continue;
      }
      if ((m = /^\d+[.)]\s+(.+)$/.exec(line))) {
        flushPara(); flushQuote();
        if (!list || list.tagName !== 'OL') { list = el(doc, 'ol'); ensureSection().appendChild(list); }
        var li2 = el(doc, 'li'); renderInline(doc, li2, m[1]); list.appendChild(li2);
        continue;
      }
      if ((m = /^>\s?(.*)$/.exec(line))) { flushPara(); flushList(); quote.push(m[1]); continue; }
      flushList(); flushQuote();
      para.push(line);
    }
    flushAll();
    return sections;
  }

  /* ---------- heading markup used by home page titles: "line\n*accent*" ---------- */
  function renderRichInto(target, text, accentClass) {
    var doc = target.ownerDocument;
    while (target.firstChild) target.removeChild(target.firstChild);
    var lines = String(text == null ? '' : text).split('\n');
    lines.forEach(function (line, idx) {
      if (idx > 0) target.appendChild(doc.createElement('br'));
      var parts = line.split(/(\*[^*]+\*)/);
      parts.forEach(function (part) {
        if (!part) return;
        var m = /^\*([^*]+)\*$/.exec(part);
        if (m) {
          var s = doc.createElement('span');
          s.className = accentClass || 'gradient-text';
          s.appendChild(doc.createTextNode(m[1]));
          target.appendChild(s);
        } else {
          target.appendChild(doc.createTextNode(part));
        }
      });
    });
  }

  /* ---------- signatures (compare expected vs existing DOM without touching it) ---------- */
  function norm(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function sectionSignature(sections) {
    return Array.prototype.map.call(sections, function (s) {
      return Array.prototype.map.call(s.children, function (c) {
        return c.tagName + ':' + norm(c.textContent);
      }).join('|');
    }).join('||');
  }
  function richSignature(node) {
    // tag + text for elements, text for text nodes; whitespace collapsed and trimmed per line
    var out = [];
    (function walk(n) {
      Array.prototype.forEach.call(n.childNodes, function (c) {
        if (c.nodeType === 3) { var t = norm(c.nodeValue); if (t) out.push('t:' + t); }
        else if (c.nodeType === 1) { out.push('<' + c.tagName + (c.className ? '.' + c.className : '') + '>'); walk(c); out.push('</>'); }
      });
    })(node);
    return out.join('');
  }

  global.CMSRender = {
    safeUrl: safeUrl,
    parseVideo: parseVideo,
    renderMarkdown: renderMarkdown,
    renderInline: renderInline,
    renderRichInto: renderRichInto,
    sectionSignature: sectionSignature,
    richSignature: richSignature,
    norm: norm
  };
})(typeof window !== 'undefined' ? window : globalThis);
