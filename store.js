/* Data Store client — Google Sheets through the Apps Script web app in apps-script/Code.gs.
 *
 * - The script URL and API key live only in this browser's localStorage (never in the repo).
 * - Every document is also cached locally, so the dashboard opens instantly and works offline.
 * - Writes go into a local queue first and are sent in order; anything unsent is retried
 *   when the connection comes back or the page is opened again.
 * All requests are POST with a text/plain body, which keeps them "simple" (no CORS preflight)
 * and keeps the key out of the URL.
 */
(function (root) {
  'use strict';
  const CFG = 'wd-sheets-config', CACHE = 'wd-cache', QUEUE = 'wd-queue';
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  let cache = read(CACHE, {});
  let ready = null, flushing = null;
  const listeners = new Set();
  const emit = (state, detail) => listeners.forEach(fn => { try { fn(state, detail); } catch {} });

  const config = () => read(CFG, null);
  const configured = () => { const c = config(); return !!(c && c.url && c.key); };

  async function call(action, extra, cfg = config()) {
    if (!cfg || !cfg.url || !cfg.key) throw new Error('not_configured');
    const res = await fetch(cfg.url, { method: 'POST', body: JSON.stringify({ key: cfg.key, action, ...extra }) });
    if (!res.ok) throw new Error('http_' + res.status);
    const out = await res.json();
    if (!out.ok) throw new Error(out.error || 'failed');
    return out;
  }

  // full snapshot from the sheet → cache
  async function pull() {
    const out = await call('all');
    const next = {};
    if (out.profile) next['fit/profile'] = out.profile;
    if (out.plan) next['fit/plan'] = out.plan;
    (out.days || []).forEach(d => { if (d && d.date) next['days/' + d.date] = d; });
    // unsent local edits win over the server copy until they are flushed
    read(QUEUE, []).forEach(q => { next[q.path] = q.data; });
    cache = next; write(CACHE, cache);
  }

  function load() {
    if (!ready) ready = (async () => {
      if (!configured()) return { source: 'local' };
      try { await pull(); flush(); return { source: 'sheets' }; }
      catch (e) { emit('offline', e); return { source: 'cache', error: e }; }
    })();
    return ready;
  }

  function flush() {
    if (flushing || !configured()) return flushing || Promise.resolve();
    flushing = (async () => {
      let q = read(QUEUE, []);
      while (q.length) {
        const item = q[0];
        try { await call('set', { path: item.path, data: item.data }); }
        catch (e) { emit('pending', { count: q.length, error: e }); throw e; }
        q = read(QUEUE, []).filter(x => !(x.path === item.path && x.at === item.at));
        write(QUEUE, q);
      }
      emit('synced');
    })().finally(() => { flushing = null; });
    return flushing;
  }

  async function set(path, data) {
    cache[path] = data; write(CACHE, cache);
    if (!configured()) return;
    const q = read(QUEUE, []).filter(x => x.path !== path);   // keep only the newest copy per document
    q.push({ path, data, at: Date.now() });
    write(QUEUE, q);
    return flush();
  }

  async function get(path) { await load(); return cache[path] ?? null; }
  async function days() { await load(); return Object.keys(cache).filter(k => k.startsWith('days/')).map(k => cache[k]); }

  // one-time move of an exported JSON ({ docs: [{ path, data }] }) into the sheet
  async function importDocs(docs, onProgress) {
    const CHUNK = 15;
    for (let i = 0; i < docs.length; i += CHUNK) {
      await call('import', { docs: docs.slice(i, i + CHUNK) });
      onProgress && onProgress(Math.min(docs.length, i + CHUNK), docs.length);
    }
    ready = null; await load();
  }

  async function connect(url, key) {
    const cfg = { url: String(url).trim(), key: String(key).trim() };
    const out = await call('ping', {}, cfg);          // throws with a reason when URL or key is wrong
    write(CFG, cfg); ready = null;
    return out;
  }
  function disconnect() { try { localStorage.removeItem(CFG); } catch {} ready = null; }

  root.addEventListener && root.addEventListener('online', () => flush().catch(() => {}));
  setInterval(() => { if (read(QUEUE, []).length) flush().catch(() => {}); }, 30000);

  root.SheetStore = {
    configured, config, connect, disconnect, load, get, set, days, flush, importDocs,
    pending: () => read(QUEUE, []).length,
    on: fn => listeners.add(fn),
  };
})(typeof window !== 'undefined' ? window : globalThis);
