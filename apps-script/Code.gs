/**
 * Workout Dash — Data Store API on Google Sheets.
 *
 * Paste this file into Extensions → Apps Script of your Google Sheet, run setup() once,
 * then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 * The dashboard talks to the /exec URL with the API key that setup() prints to the log.
 *
 * Tabs
 *   fit     id | json | updated              (profile, plan)
 *   days    date | json | updated            (one row per day, the dashboard's source of truth)
 *   log     date | sesi | menu | gerakan | set | nilai | satuan | kg   (readable copy, rebuilt per day)
 *   ukuran  date | weight | bf | waist | ...  (readable body measurements)
 */

const METRIC_KEYS = ['weight', 'bf', 'waist', 'chest', 'arm', 'thigh', 'hip', 'pushup', 'plank',
  'fatMass', 'ffm', 'slm', 'smm', 'protein', 'mineral', 'tbw', 'vfi', 'ffmi', 'bmr', 'tee', 'bodyAge'];

const TABS = {
  fit: ['id', 'json', 'updated'],
  days: ['date', 'json', 'updated'],
  log: ['date', 'sesi', 'menu', 'gerakan', 'set', 'nilai', 'satuan', 'kg'],
  ukuran: ['date'].concat(METRIC_KEYS),
};

/** Run once from the editor: creates the tabs and an API key (see View → Logs). */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABS).forEach(name => {
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    sh.getRange(1, 1, 1, TABS[name].length).setValues([TABS[name]]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('@');           // keep dates and ids as plain text
  });
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('API_KEY');
  if (!key) { key = Utilities.getUuid().replace(/-/g, ''); props.setProperty('API_KEY', key); }
  Logger.log('API key: ' + key);
}

/** Run this if the key ever leaks: the old one stops working immediately. */
function rotateKey() {
  const key = Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('API_KEY', key);
  Logger.log('New API key: ' + key);
}

function doGet() {
  return json_({ ok: true, service: 'workout-dash', hint: 'Use POST with your API key.' });
}

function doPost(e) {
  let body;
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return json_({ ok: false, error: 'bad_json' }); }
  const expected = PropertiesService.getScriptProperties().getProperty('API_KEY');
  if (!expected || body.key !== expected) return json_({ ok: false, error: 'unauthorized' });

  try {
    switch (body.action) {
      case 'ping': return json_({ ok: true, sheet: SpreadsheetApp.getActiveSpreadsheet().getName() });
      case 'all': return json_(Object.assign({ ok: true }, readAll_()));
      case 'set': return withLock_(() => { writeDoc_(body.path, body.data); return json_({ ok: true }); });
      case 'import': return withLock_(() => {
        (body.docs || []).forEach(d => writeDoc_(d.path, d.data));
        return json_({ ok: true, n: (body.docs || []).length });
      });
      default: return json_({ ok: false, error: 'unknown_action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/* ---------- read ---------- */
function readAll_() {
  const fit = rows_('fit'), out = { profile: null, plan: null, days: [] };
  fit.forEach(r => { if (r[0] === 'profile') out.profile = parse_(r[1]); if (r[0] === 'plan') out.plan = parse_(r[1]); });
  rows_('days').forEach(r => { const d = parse_(r[1]); if (d) out.days.push(d); });
  return out;
}

/* ---------- write ---------- */
function writeDoc_(path, data) {
  const parts = String(path || '').split('/');
  if (parts.length !== 2 || !data || typeof data !== 'object') throw new Error('bad_path');
  const [coll, id] = parts;
  if (coll === 'fit') return upsert_('fit', id, [id, JSON.stringify(data), new Date()]);
  if (coll === 'days') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(id)) throw new Error('bad_date');
    upsert_('days', id, [id, JSON.stringify(data), new Date()]);
    rebuildLog_(id, data);
    upsertMeasure_(id, data.m || {});
    return;
  }
  throw new Error('bad_collection');
}

function upsert_(tab, id, row) {
  const sh = sheet_(tab), last = sh.getLastRow();
  const ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0])) : [];
  const i = ids.indexOf(String(id));
  const target = i >= 0 ? i + 2 : last + 1;
  sh.getRange(target, 1, 1, row.length).setValues([row]);
}

// readable training log: one row per set, replaced wholesale for that date
function rebuildLog_(date, day) {
  const sh = sheet_('log'), last = sh.getLastRow();
  const keep = last > 1 ? sh.getRange(2, 1, last - 1, TABS.log.length).getValues().filter(r => String(r[0]) !== date) : [];
  const add = [];
  ['home', 'gym'].forEach(kind => {
    const s = day[kind]; if (!s || !s.ex) return;
    s.ex.forEach(e => (e.sets || []).forEach((v, j) => {
      if (v == null || v === '') return;
      const kg = e.kgs && e.kgs[j] != null ? e.kgs[j] : (e.kg != null ? e.kg : '');
      add.push([date, kind === 'gym' ? 'Gym' : 'Rumah', s.tpl || '', e.n, j + 1, v, e.u || 'reps', kg]);
    }));
  });
  const all = keep.concat(add).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  if (last > 1) sh.getRange(2, 1, last - 1, TABS.log.length).clearContent();
  if (all.length) sh.getRange(2, 1, all.length, TABS.log.length).setValues(all);
}

function upsertMeasure_(date, m) {
  const vals = METRIC_KEYS.map(k => (m[k] == null ? '' : m[k]));
  const sh = sheet_('ukuran'), last = sh.getLastRow();
  const ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0])) : [];
  const i = ids.indexOf(date);
  if (vals.every(v => v === '')) { if (i >= 0) sh.deleteRow(i + 2); return; }
  sh.getRange(i >= 0 ? i + 2 : last + 1, 1, 1, vals.length + 1).setValues([[date].concat(vals)]);
}

/* ---------- utils ---------- */
function sheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error('missing_tab_' + name + ' (run setup)');
  return sh;
}
function rows_(tab) {
  const sh = sheet_(tab), last = sh.getLastRow();
  return last > 1 ? sh.getRange(2, 1, last - 1, 2).getValues().map(r => [String(r[0]), r[1]]) : [];
}
function parse_(s) { try { return JSON.parse(s); } catch (e) { return null; } }
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
