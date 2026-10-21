// api.js — the only module that talks to Supabase (official supabase-js client, local vendor copy)
import { toast } from './ui.js';

export const config = window.CMS_CONFIG || {};
export const events = new EventTarget();

export function isConfigured() {
  return !!(config.supabaseUrl && config.supabaseKey && !/YOUR-PROJECT/i.test(config.supabaseUrl) && !/YOUR-PUBLIC/i.test(config.supabaseKey));
}
export function libLoaded() { return !!(window.supabase && typeof window.supabase.createClient === 'function'); }

let client = null;
export function sb() {
  if (!client) {
    client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'cms-admin-auth' }
    });
    client.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') events.dispatchEvent(new Event('signed-out')); });
  }
  return client;
}

/** Turns any error into a clear Arabic sentence for the owner. */
export function explain(err) {
  const m = String((err && err.message) || err || '');
  const code = err && err.code;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'لا يوجد اتصال بالإنترنت. تحقق من الشبكة ثم أعد المحاولة.';
  if (code === '23505') return 'هذه القيمة مستخدمة مسبقًا (مثل الرابط الثابت slug). اختر قيمة مختلفة.';
  if (code === '23514') return 'إحدى القيم لا تطابق الصيغة المسموحة (تحقق من الروابط والرابط الثابت).';
  if (code === '23502') return 'يوجد حقل مطلوب فارغ.';
  if (code === 'NOT_SAVED' || code === 'PGRST116') return 'لم يتم الحفظ: السجل غير موجود أو لا تملك صلاحية تعديله.';
  if (code === '42501' || /row-level security|permission denied/i.test(m)) return 'ليست لديك صلاحية لتنفيذ هذه العملية. تأكد من تسجيل الدخول بحساب المالك.';
  if (/jwt expired|invalid jwt|not authenticated|refresh_token/i.test(m)) return 'انتهت الجلسة. سجّل الدخول من جديد.';
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(m)) return 'تعذّر الاتصال بالخادم. أعد المحاولة بعد قليل.';
  return 'حدث خطأ: ' + m;
}

function fail(error) {
  const e = new Error(error.message || 'error');
  e.code = error.code;
  if (/jwt expired|invalid jwt/i.test(e.message)) events.dispatchEvent(new Event('session-expired'));
  throw e;
}
async function run(q) { const { data, error } = await q; if (error) fail(error); return data; }

/* ---------------- auth ---------------- */
export async function signIn(email, password) {
  const { data, error } = await sb().auth.signInWithPassword({ email, password });
  if (error) {
    const bad = /invalid login|invalid credentials/i.test(error.message);
    const e = new Error(bad ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : explain(error));
    e.friendly = true; throw e;
  }
  return data.session;
}
export async function signOut() { await sb().auth.signOut(); }
export async function currentSession() { const { data } = await sb().auth.getSession(); return data.session || null; }
export async function checkAdmin(userId) {
  const { data, error } = await sb().from('admin_profiles').select('user_id').eq('user_id', userId).maybeSingle();
  if (error) fail(error);
  return !!data;
}
export async function changePassword(newPassword) {
  const { error } = await sb().auth.updateUser({ password: newPassword });
  if (error) fail(error);
}

/* ---------------- data ---------------- */
export const db = {
  async list(table, order = [['sort_order', true]]) {
    let q = sb().from(table).select('*');
    for (const [col, asc] of order) q = q.order(col, { ascending: asc });
    return (await run(q)) || [];
  },
  async get(table, id) { return run(sb().from(table).select('*').eq('id', id).maybeSingle()); },
  async insert(table, row) { return run(sb().from(table).insert(row).select().single()); },
  async update(table, id, patch) {
    const row = await run(sb().from(table).update(patch).eq('id', id).select().maybeSingle());
    if (!row) { const e = new Error('not saved'); e.code = 'NOT_SAVED'; throw e; }   // RLS silently matches 0 rows
    return row;
  },
  async remove(table, id) {
    const rows = await run(sb().from(table).delete().eq('id', id).select());
    if (!rows || !rows.length) { const e = new Error('not deleted'); e.code = 'NOT_SAVED'; throw e; }
  },
  async count(table, filter) {
    let q = sb().from(table).select('id', { count: 'exact', head: true });
    if (filter) q = q.eq(filter[0], filter[1]);
    const { count, error } = await q;
    if (error) fail(error);
    return count || 0;
  },
  async settings() {
    const rows = await run(sb().from('site_settings').select('*'));
    const map = {}; (rows || []).forEach((r) => { map[r.key] = r; });
    return map;
  },
  async saveSettings(rows) { return run(sb().from('site_settings').upsert(rows, { onConflict: 'key' }).select()); }
};

/* ---------------- storage / media ---------------- */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
export const VIDEO_TYPES = ['video/mp4', 'video/webm'];
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif', 'video/mp4': 'mp4', 'video/webm': 'webm' };

export function publicUrl(bucket, path) { return sb().storage.from(bucket).getPublicUrl(path).data.publicUrl; }

export function validateFile(file, kind) {
  const types = kind === 'video' ? VIDEO_TYPES : IMAGE_TYPES;
  const maxMB = kind === 'video' ? (config.maxVideoMB || 25) : (config.maxImageMB || 5);
  if (!types.includes(file.type)) return 'نوع الملف غير مسموح (' + (file.type || 'غير معروف') + '). المسموح: ' + types.map((t) => EXT[t]).join('، ');
  return null;
}

/** Shrinks large photos before upload (max 2000px, WebP). Falls back to the original file if anything fails. */
export async function optimizeImage(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return { blob: file, width: null, height: null, type: file.type };
  try {
    const bmp = await createImageBitmap(file);
    const max = 2000;
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1.5 * 1048576) return { blob: file, width: bmp.width, height: bmp.height, type: file.type };
    const w = Math.round(bmp.width * scale), hgt = Math.round(bmp.height * scale);
    const c = document.createElement('canvas'); c.width = w; c.height = hgt;
    c.getContext('2d').drawImage(bmp, 0, 0, w, hgt);
    const blob = await new Promise((res) => c.toBlob(res, 'image/webp', 0.85));
    if (blob && blob.type === 'image/webp' && blob.size < file.size) return { blob, width: w, height: hgt, type: 'image/webp' };
    return { blob: file, width: bmp.width, height: bmp.height, type: file.type };
  } catch (_) { return { blob: file, width: null, height: null, type: file.type }; }
}

function xhrUpload(url, token, blob, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', url);
    x.setRequestHeader('apikey', config.supabaseKey);
    x.setRequestHeader('Authorization', 'Bearer ' + token);
    x.setRequestHeader('x-upsert', 'false');
    x.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    x.onload = () => {
      if (x.status >= 200 && x.status < 300) return resolve();
      let m = ''; try { m = JSON.parse(x.responseText).message; } catch (_) { m = x.responseText; }
      const e = new Error(m || ('HTTP ' + x.status)); e.status = x.status; reject(e);
    };
    x.onerror = () => { const e = new Error('Failed to fetch'); e.network = true; reject(e); };
    const fd = new FormData(); fd.append('cacheControl', '31536000'); fd.append('', blob);   // same body shape supabase-js sends
    x.send(fd);
  });
}

/** Uploads one file, registers it in the media table, returns the media row (with .url). */
export async function uploadMedia(file, kind, onProgress) {
  const bad = validateFile(file, kind);
  if (bad) throw Object.assign(new Error(bad), { friendly: true });
  const maxMB = kind === 'video' ? (config.maxVideoMB || 25) : (config.maxImageMB || 5);
  let payload = { blob: file, width: null, height: null, type: file.type };
  if (kind === 'image') payload = await optimizeImage(file);
  if (payload.blob.size > maxMB * 1048576) throw Object.assign(new Error('حجم الملف ' + (payload.blob.size / 1048576).toFixed(1) + ' MB يتجاوز الحد المسموح (' + maxMB + ' MB).'), { friendly: true });
  const bucket = kind === 'video' ? config.videosBucket || 'site-videos' : config.imagesBucket || 'site-media';
  const d = new Date();
  const base = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'file';
  const rnd = Math.random().toString(36).slice(2, 10);
  const path = d.getUTCFullYear() + '/' + String(d.getUTCMonth() + 1).padStart(2, '0') + '/' + rnd + '-' + base + '.' + EXT[payload.type];
  const session = await currentSession();
  if (!session) { events.dispatchEvent(new Event('session-expired')); throw new Error('انتهت الجلسة. سجّل الدخول من جديد.'); }
  const url = config.supabaseUrl.replace(/\/+$/, '') + '/storage/v1/object/' + bucket + '/' + path.split('/').map(encodeURIComponent).join('/');
  try {
    await xhrUpload(url, session.access_token, payload.blob, onProgress);
  } catch (e) {
    if (!e.network) throw e;
    // progress-less fallback through the official client
    const { error } = await sb().storage.from(bucket).upload(path, payload.blob, { contentType: payload.type, upsert: false });
    if (error) throw error;
    if (onProgress) onProgress(1);
  }
  try {
    const row = await db.insert('media', {
      bucket, path, name: file.name, mime_type: payload.type, size_bytes: payload.blob.size,
      width: payload.width, height: payload.height, uploaded_by: session.user.id
    });
    return { ...row, url: publicUrl(bucket, path) };
  } catch (e) {
    await sb().storage.from(bucket).remove([path]).catch(() => {});   // do not leave an unregistered file behind
    throw e;
  }
}

export async function listMedia() {
  const rows = await db.list('media', [['created_at', false]]);
  return rows.map((r) => ({ ...r, url: publicUrl(r.bucket, r.path) }));
}

/** Finds where a file is used (so deleting it never leaves a broken image on the site). */
export async function findReferences(mediaRow) {
  const needle = mediaRow.path;
  const hits = [];
  const [projects, articles, settings] = await Promise.all([db.list('projects'), db.list('articles'), db.list('site_settings', [['key', true]])]);
  projects.forEach((p) => { if (JSON.stringify(p).includes(needle)) hits.push('مشروع: ' + (p.name_ar || p.name_en)); });
  articles.forEach((a) => { if (JSON.stringify(a).includes(needle)) hits.push('مقال: ' + (a.title_ar || a.title_en)); });
  settings.forEach((s) => { if (JSON.stringify(s).includes(needle)) hits.push('إعداد: ' + s.key); });
  return hits;
}

export async function deleteMedia(mediaRow) {
  const hits = await findReferences(mediaRow);
  if (hits.length) { const e = new Error('لا يمكن حذف هذا الملف لأنه مستخدم في:\n' + hits.join('\n')); e.friendly = true; throw e; }
  const { error } = await sb().storage.from(mediaRow.bucket).remove([mediaRow.path]);
  if (error) fail(error);
  await db.remove('media', mediaRow.id);
}

export function reportError(err) { toast(err.friendly ? err.message : explain(err), 'err'); }
