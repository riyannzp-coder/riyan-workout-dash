/* Workout Engine — the recommendation logic, kept apart from the UI and from storage.
 *
 * Every function that needs history takes the `days` map ({ 'YYYY-MM-DD': dayLog }) as its
 * first argument, so the engine can be exercised with fixture data and no DOM.
 * The output of suggest() is what the dashboard shows as "Naikkan beban / tambah reps / gerakan baru".
 */
(function (root) {
  'use strict';

  /* ---------- small helpers ---------- */
  const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const daysBetween = (a, b) => Math.round((parseD(b) - parseD(a)) / 86400000);
  const fmtN = (n, dp = 2) => n == null ? '–' : (Math.round(n * 10 ** dp) / 10 ** dp).toLocaleString('id-ID', { maximumFractionDigits: dp });

  /* ---------- exercise identity ---------- */
  // one key per movement, so typos and old names keep their history together
  const ALIAS = {
    'hammer strenght mts row': 'hammer strength mts row', 'assisted dip/ chin': 'assisted dip/chin (mesin)', 'assisted dip/chin': 'assisted dip/chin (mesin)',
    'tredmill': 'treadmill', 'tredmill run': 'treadmill', 'treadmill walking': 'treadmill (cool-down)', 'shoulder press': 'shoulder press machine',
    'biceps curl': 'biceps curl machine', 'chest press': 'flat machine chest press', 'abdominal': 'abdominal crunch machine',
    'torso rotation': 'torso rotation machine', 'leg raise bosu ball': 'leg raise (bosu)', 'leg raise bosu': 'leg raise (bosu)',
  };
  const canon = n => { const k = String(n || '').toLowerCase().replace(/\s+/g, ' ').trim(); return ALIAS[k] || k; };
  const sameEx = (a, b) => canon(a) === canon(b);

  // does this exercise take a load (kg) column? explicit flag wins, then the name decides
  function isWeighted(e, kind) {
    if (e.w === true || e.w === false) return e.w;
    if (e.u !== 'reps' || kind !== 'gym') return false;
    const n = canon(e.n);
    if (/weighted|dumbbell|\bdb\b|machine|cable|barbell|press|pulldown|\brow\b|curl|extension|fly|rotation|crunch|assisted|kettlebell|smith|standing calf/.test(n)) return true;
    if (/dead bug|bird dog|glute bridge|push-up|pushup|shoulder tap|leg raise|knee raise|lunge|squat|hollow|sit-up|superman|cat-cow|hip circle|leg swing|calf raise|plank/.test(n)) return false;
    return true;
  }

  const guessUnit = n => /jalan|walk|treadmill|tredmill|\brun\b|lari|bike|sepeda|elliptical|kardio|cardio|mobility|mobilitas/i.test(n) ? 'menit'
    : /plank|hold|hang|stretch|pose|wall sit|tahan|l-sit/i.test(n) && !/tap|dead bug|squat|bridge|push/i.test(n) ? 'detik' : 'reps';
  const UNIT_DEF_T = { reps: '10-12', detik: '30', menit: '10' };

  /* ---------- sets ---------- */
  // per-set load; older entries kept one `kg` for the whole exercise
  const kgOf = (e, j) => e.kgs && e.kgs[j] != null ? e.kgs[j] : e.kg ?? null;
  const perfText = e => e.sets.map((r, j) => r == null ? null : kgOf(e, j) ? `${r}×${fmtN(kgOf(e, j))}` : `${r}`).filter(Boolean).join(' · ');
  const hasKg = e => e.sets.some((_, j) => kgOf(e, j));

  /* ---------- history ---------- */
  function lastPerformances(days, name, before, n) {
    const out = [], ds = Object.keys(days).filter(d => d < before).sort().reverse();
    for (const d of ds) {
      for (const k of ['gym', 'home']) {
        const s = days[d][k], e = s && (s.ex || []).find(e => sameEx(e.n, name) && (e.sets || []).some(v => v > 0));
        if (e) { out.push({ d, e }); break; }
      }
      if (out.length >= n) break;
    }
    return out;
  }
  const lastPerformance = (days, name, before) => lastPerformances(days, name, before, 1)[0] || null;

  function recoveryHold(days, d) {
    return Object.keys(days).some(x => {
      if (x > d || daysBetween(x, d) > 2) return false;
      const v = days[x];
      return (v.energy != null && v.energy <= 2) || /nyeri|sakit|cedera|pegal (sedang|berat)/i.test(v.note || '');
    });
  }

  /* ---------- variation ladders ---------- */
  const baseName = n => String(n).toLowerCase().replace(/\s*\(.*?\)\s*/g, ' ').trim();
  // two sessions in a row at the cap on every set unlocks the next movement
  const LADDERS = [
    [{ n: 'Knee Push-up', cap: 15 }, { n: 'Incline Push-up', t: '8-12', cap: 15 }, { n: 'Negative Push-up (turun 3 dtk)', t: '5-8', cap: 10 }, { n: 'Push-up', t: '6-10', cap: 15 },
     { n: 'Decline Push-up (kaki di kursi)', t: '6-10', cap: 15 }, { n: 'Archer Push-up', t: '4-6/sisi', cap: 10 }],
    [{ n: 'Squat', cap: 20 }, { n: 'Pause Squat (tahan 2 dtk di bawah)', t: '10-12', cap: 15 }, { n: 'Split Squat', t: '8-10/kaki', cap: 12 }, { n: 'Bulgarian Split Squat', t: '6-10/kaki', cap: 12 }],
    [{ n: 'Forearm Plank', cap: 40 }, { n: 'Plank Shoulder Tap', t: '10/sisi', u: 'reps', cap: 16 }],
    [{ n: 'Bent-Knee Side Plank', cap: 30 }, { n: 'Side Plank', t: '20-30/sisi', u: 'detik', cap: 40 }],
    [{ n: 'Glute Bridge', cap: 20 }, { n: 'Single-Leg Glute Bridge', t: '8-12/kaki', cap: 15 }],
    [{ n: 'Dead Bug', cap: 12 }, { n: 'Dead Bug (tahan 3 dtk)', t: '8/sisi', cap: 12 }, { n: 'Straight-Leg Dead Bug', t: '8/sisi', cap: 12 },
     { n: 'Weighted Dead Bug (DB 2-4 kg)', t: '8-10/sisi', cap: 12, gym: true }, { n: 'Hollow Body Hold', t: '20-30', u: 'detik', cap: 45 }, { n: 'Hollow Body Rock', t: '10-15', u: 'reps', cap: 20 }],
    [{ n: 'Reverse Lunge', cap: 15 }, { n: 'Walking Lunge', t: '10/kaki', cap: 15 }],
  ];
  // steps marked gym need equipment; home sessions skip them (no dumbbells at home)
  const nextStep = (L, i, kind) => L.slice(i + 1).find(x => !(kind === 'home' && x.gym)) || null;
  function ladderStep(name, kind) {
    // exact name first, so variants like "Dead Bug (tahan 3 dtk)" don't resolve to the plain movement
    const lc = String(name).toLowerCase();
    for (const L of LADDERS) { const i = L.findIndex(x => x.n.toLowerCase() === lc); if (i >= 0) return { cap: L[i].cap, next: nextStep(L, i, kind) }; }
    const b = baseName(name);
    for (const L of LADDERS) { const i = L.findIndex(x => baseName(x.n) === b); if (i >= 0) return { cap: L[i].cap, next: nextStep(L, i, kind) }; }
    return null;
  }

  /* ---------- targets ---------- */
  function parseTarget(t) {
    const str = String(t || ''), m = str.match(/(\d+(?:[.,]\d+)?)(?:\s*-\s*(\d+(?:[.,]\d+)?))?/);
    if (!m) return null;
    const lo = +m[1].replace(',', '.'), hi = m[2] ? +m[2].replace(',', '.') : lo;
    return { lo, hi, suffix: (str.match(/\/\S+/) || [''])[0] };
  }
  const rangeTxt = tg => tg.lo === tg.hi ? `${tg.lo}` : `${tg.lo}-${tg.hi}`;

  /* ---------- recommendation ----------
   * Returns null (no history yet) or { kind, tag, text } plus one action:
   *   kg   → load to use (naik / pertahankan beban, or less assistance on assisted machines)
   *   t    → new target (tambah reps / durasi)
   *   swap → next movement on the ladder (gerakan baru)
   */
  function suggest(days, e, d, kind) {
    const tg = parseTarget(e.t); if (!tg || e.u === 'menit') return null;
    const hist = lastPerformances(days, e.n, d, 2); if (!hist.length) return null;
    const last = hist[0].e, reps = last.sets.filter(v => v > 0);
    if (recoveryHold(days, d)) return { kind: 'hold', tag: 'Pemulihan', text: 'Energi rendah atau ada keluhan di catatan 2 hari terakhir. Ulangi beban dan reps terakhir, jangan naik dulu.' };
    const allHi = reps.length >= Math.min(e.s, last.sets.length) && reps.every(v => v >= tg.hi), anyLow = reps.some(v => v < tg.lo);
    const kgs = last.sets.map((_, j) => kgOf(last, j)).filter(v => v > 0);
    if (kgs.length) {
      if (/assisted/.test(canon(e.n))) {
        // assistance goes down as strength goes up
        const cur = Math.min(...kgs), stepA = cur > 20 ? 5 : 2.5;
        if (allHi) { const next = Math.max(0, cur - stepA);
          return { kind: 'up', tag: 'Kurangi bantuan', text: `Semua set sudah ${tg.hi}+ reps dengan bantuan ${fmtN(cur)} kg. Turunkan bantuan ke ${fmtN(next)} kg (makin kecil makin berat).`, kg: next }; }
        return { kind: anyLow ? 'hold' : 'same', tag: 'Pertahankan', text: `Tetap bantuan ${fmtN(cur)} kg, kejar ${anyLow ? tg.lo : tg.hi} reps di semua set.`, kg: cur };
      }
      const top = Math.max(...kgs), step = top >= 20 ? 2.5 : 1;
      if (allHi) {
        let next = Math.ceil(top * 1.05 / step) * step; if (next <= top) next = top + step;
        return { kind: 'up', tag: 'Naik beban', text: `Semua set sudah ${tg.hi}+ reps di ${fmtN(top)} kg. Coba ${fmtN(next)} kg, target ${rangeTxt(tg)} reps.`, kg: next };
      }
      if (anyLow) return { kind: 'hold', tag: 'Pertahankan', text: `Tetap ${fmtN(top)} kg sampai semua set minimal ${tg.lo} reps.`, kg: top };
      return { kind: 'same', tag: 'Pertahankan', text: `Tetap ${fmtN(top)} kg, kejar ${tg.hi} reps di semua set.`, kg: top };
    }
    const lad = ladderStep(e.n, kind);
    if (lad && lad.next && hist.length >= 2 && hist.every(h => { const r = h.e.sets.filter(v => v > 0); return r.length && r.every(v => v >= lad.cap); }))
      return { kind: 'level', tag: 'Naik level', text: `Dua sesi terakhir semua set ${lad.cap}+ ${e.u}. Saatnya variasi berikutnya: ${lad.next.n}.`, swap: lad.next };
    if (allHi) {
      const inc = e.u === 'detik' ? 5 : 2, nt = `${tg.hi + inc}${tg.suffix}`;
      return { kind: 'up', tag: e.u === 'detik' ? 'Tambah durasi' : 'Tambah reps', text: `Semua set sudah ${tg.hi}+ ${e.u}. Naikkan target ke ${nt} ${e.u}.`, t: nt };
    }
    if (anyLow) return { kind: 'hold', tag: 'Pertahankan', text: `Kejar ${tg.lo} ${e.u} di semua set dulu dengan teknik rapi.` };
    return { kind: 'same', tag: 'Pertahankan', text: `Target sudah pas. Kejar ${tg.hi} ${e.u} di semua set.` };
  }

  const api = {
    ALIAS, canon, sameEx, isWeighted, guessUnit, UNIT_DEF_T,
    kgOf, perfText, hasKg,
    lastPerformance, lastPerformances, recoveryHold,
    LADDERS, ladderStep, parseTarget, rangeTxt, suggest,
  };
  root.WorkoutEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
