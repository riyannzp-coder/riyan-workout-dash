/* Workout Dashboard UI — renders the tabs, talks to WorkoutEngine (engine.js) and SheetStore (store.js). */
(() => {
/* ---------- constants ---------- */
const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const HARI3 = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const METRICS = [
  {k:'weight', l:'Berat badan', u:'kg', dir:0},
  {k:'bf', l:'Lemak tubuh', u:'%', dir:-1},
  {k:'waist', l:'Pinggang', u:'cm', dir:-1},
  {k:'chest', l:'Dada', u:'cm', dir:1},
  {k:'arm', l:'Lengan', u:'cm', dir:1},
  {k:'thigh', l:'Paha', u:'cm', dir:0},
  {k:'hip', l:'Pinggul', u:'cm', dir:0},
  {k:'pushup', l:'Tes push-up maks', u:'reps', dir:1},
  {k:'plank', l:'Tes plank maks', u:'detik', dir:1},
  // body composition from a smart scale / BIA device
  {k:'fatMass', l:'Massa lemak', u:'kg', dir:-1, g:'komp'},
  {k:'ffm', l:'Berat bebas lemak', u:'kg', dir:1, g:'komp'},
  {k:'slm', l:'Soft lean mass', u:'kg', dir:1, g:'komp'},
  {k:'smm', l:'Otot rangka (SMM)', u:'kg', dir:1, g:'komp'},
  {k:'protein', l:'Protein', u:'kg', dir:1, g:'komp'},
  {k:'mineral', l:'Mineral', u:'kg', dir:0, g:'komp'},
  {k:'tbw', l:'Air tubuh total', u:'kg', dir:0, g:'komp'},
  {k:'vfi', l:'Indeks lemak visceral', u:'', dir:-1, g:'komp'},
  {k:'ffmi', l:'FFMI', u:'kg/m²', dir:1, g:'komp'},
  {k:'bmr', l:'BMR', u:'kkal', dir:0, g:'komp'},
  {k:'tee', l:'Total energi harian', u:'kkal', dir:0, g:'komp'},
  {k:'bodyAge', l:'Usia fisik', u:'thn', dir:-1, g:'komp'},
];
const UNITS = ['reps','detik','menit'];
const GOALS = {recomp:'Rekomposisi (turun lemak, naik otot)', cut:'Turun berat / lemak', bulk:'Naik massa otot'};

const ex = (n,s,t,u='reps',alt) => alt ? {n,s,t,u,alt} : {n,s,t,u};
const DEFAULT_PLAN = () => ({
  templates: {
    h_upper:{name:'Kalistenik A · Push & Core', kind:'home', ex:[
      ex('Push-up',3,'12-15'), ex('Shoulder Tap',3,'24/sisi'), ex('Hollow Body Hold',3,'40-45','detik'), ex('Bird Dog',3,'18/sisi')]},
    h_lower:{name:'Kalistenik B · Kaki', kind:'home', ex:[
      ex('Pause Squat (tahan 2 dtk di bawah)',3,'16-18'), ex('Walking Lunge',3,'20/kaki'), ex('Single-Leg Glute Bridge',2,'20/kaki'), ex('Calf Raise',3,'30')]},
    h_core:{name:'Kalistenik C · Core + Mobilitas', kind:'home', ex:[
      ex('Plank Shoulder Tap',3,'20/sisi'), ex('Straight-Leg Dead Bug',3,'12/sisi'), ex('Side Plank',2,'35-40/sisi','detik'), ex('Hip Circle + Cat-Cow',1,'3','menit')]},
    h_eval:{name:'Mobilitas singkat (hari gym, opsional)', kind:'home', ex:[
      ex('Hip Circle',1,'20/arah'), ex('Cat-Cow',1,'16'), ex('Chest Stretch',1,'30/sisi','detik'), ex('Hamstring Stretch',1,'45/kaki','detik')]},
    h_recov:{name:'Active Recovery', kind:'home', ex:[
      ex('Jalan santai',1,'20-30','menit'), ex('Cat-Cow',1,'16'), ex('Hip Circle',1,'20/arah'), ex("Child's Pose",1,'45','detik'), ex('Quad Stretch',1,'45/kaki','detik')]},
    h_full:{name:'Kalistenik · Full Body (cadangan)', kind:'home', ex:[
      ex('Pause Squat (tahan 2 dtk di bawah)',3,'16'), ex('Push-up',3,'12-15'), ex('Walking Lunge',2,'16/kaki'), ex('Single-Leg Glute Bridge',2,'20/kaki'), ex('Forearm Plank',2,'60','detik')]},
    g_upper:{name:'Gym · Upper Body', kind:'gym', ex:[
      ex('Incline Machine Chest Press',3,'10-12','reps',['Flat Machine Chest Press']), ex('Pectoral Fly',3,'10-12'),
      ex('Lat Pulldown',3,'10-12','reps',['Hammer Strength MTS Front Pulldown']), ex('Seated Row Machine',3,'10-12','reps',['Hammer Strength MTS Row']),
      ex('Seated Dumbbell Shoulder Press',3,'10-12','reps',['Shoulder Press Machine']), ex('Assisted Dip/Chin (mesin)',2,'8-12'),
      ex('Incline Dumbbell Curl (bergantian)',2,'10-12','reps',['Biceps Curl Machine']), ex('Cable Triceps Pushdown',2,'10-12'),
      ex('Leg Raise (Bosu)',3,'12-15','reps',['Standing Cable Pallof Press'])]},
    g_lower:{name:'Gym · Lower Body', kind:'gym', ex:[
      ex('Dumbbell Squat (DB di kedua tangan)',3,'10-12'), ex('Dumbbell Romanian Deadlift',3,'10-12'), ex('Leg Extension Machine',3,'10-12'),
      ex('Seated Leg Curl',3,'10-12'), ex('Standing Calf Raise',3,'12-15'), ex('Single-Leg Glute Bridge',2,'20/kaki'),
      ex('Abdominal Crunch Machine',3,'12-15'), ex('Side Plank',2,'30-40/sisi','detik'), ex('Dead Hang',3,'30-40','detik'), ex('Treadmill (cool-down)',1,'5-10','menit')]},
    g_full:{name:'Gym · Full Body', kind:'gym', ex:[
      ex('Leg Press Machine (45°)',3,'10-12'), ex('Flat Machine Chest Press',3,'10-12','reps',['Pectoral Fly','Incline Machine Chest Press']),
      ex('Lat Pulldown',3,'10-12','reps',['Hammer Strength MTS Front Pulldown','Assisted Dip/Chin (mesin)']), ex('Seated Row Machine',3,'10-12','reps',['Hammer Strength MTS Row']),
      ex('Seated Leg Curl',3,'10-12'), ex('Shoulder Press Machine',3,'10-12','reps',['Seated Dumbbell Shoulder Press']),
      ex('Torso Rotation Machine',3,'12','reps',['Standing Cable Pallof Press']), ex('Weighted Dead Bug (DB 2-4 kg)',2,'10-12/sisi'), ex('Forearm Plank',2,'45-60','detik')]},
    g_core:{name:'Gym · Core & Kardio (cadangan)', kind:'gym', ex:[
      ex('Treadmill',1,'15-20','menit'), ex('Dead Hang',3,'30-40','detik'), ex('Standing Cable Pallof Press',2,'10-12/sisi'), ex('Leg Raise (Bosu)',3,'12-15'), ex('Bird Dog',2,'12/sisi')]},
  },
  // 0 = Minggu … 6 = Sabtu. Gym Sel/Kam/Sab, kalistenik penuh di hari tanpa gym, Minggu pemulihan.
  week: {
    0:{home:'h_recov', gym:null}, 1:{home:'h_lower', gym:null}, 2:{home:'h_eval', gym:'g_upper'},
    3:{home:'h_core', gym:null}, 4:{home:'h_eval', gym:'g_lower'}, 5:{home:'h_upper', gym:null},
    6:{home:'h_eval', gym:'g_full'},
  },
});

// Gym 3x full body, back- and shoulder-friendly:
// supported machines, no heavy spinal loading, no loaded spinal flexion/rotation, nothing overhead,
// anti-movement core, upper-back and rotator-cuff work for posture, low-impact cardio for stamina.
const GYM3_PLAN = () => ({
  templates: {
    g_a: { name: 'Gym · Full Body A', kind: 'gym', ex: [
      ex('Treadmill incline walk (pemanasan)', 1, '8', 'menit'), ex('Leg Press Machine (45°)', 3, '12-15'),
      ex('Seated Cable Row (neutral grip)', 3, '12-15', 'reps', ['Chest-Supported Row Machine']), ex('Hip Thrust Machine', 3, '12', 'reps', ['Glute Bridge (tahan 2 dtk di atas)']),
      ex('Flat Machine Chest Press (neutral grip)', 2, '12-15'), ex('Face Pull (cable)', 2, '15'),
      ex('Dead Bug', 2, '8/sisi'), ex('Bent-Knee Side Plank', 2, '20-30/sisi', 'detik'), ex('Stationary Bike', 1, '10-15', 'menit', ['Elliptical'])] },
    g_b: { name: 'Gym · Full Body B', kind: 'gym', ex: [
      ex('Stationary Bike (pemanasan)', 1, '8', 'menit'), { ...ex('Goblet Box Squat (duduk ke bangku)', 3, '10-12'), w: true },
      ex('Lat Pulldown (neutral grip, ke dada)', 3, '12', 'reps', ['Assisted Dip/Chin (mesin)']), ex('Seated Leg Curl', 3, '12-15'),
      ex('Cable External Rotation', 2, '12-15/sisi'), ex('Hip Abduction Machine', 2, '15'),
      ex('Bird Dog', 2, '8/sisi'), ex('Standing Cable Pallof Press', 2, '10/sisi'), ex('Treadmill incline walk', 1, '15', 'menit', ['Elliptical'])] },
    g_c: { name: 'Gym · Full Body C', kind: 'gym', ex: [
      ex('Elliptical (pemanasan)', 1, '8', 'menit'), ex('Leg Extension Machine', 3, '12-15'),
      ex('Chest-Supported Row Machine', 3, '12', 'reps', ['Seated Cable Row (neutral grip)']), ex('Step-up (bangku rendah)', 2, '10/kaki'),
      ex('Glute Bridge (tahan 2 dtk di atas)', 2, '15'), ex('Cable Triceps Pushdown', 2, '12'), ex('Standing Dumbbell Biceps Curl', 2, '12'),
      ex('Forearm Plank', 2, '20-30', 'detik'), ex('Stationary Bike (interval ringan)', 1, '12', 'menit', ['Treadmill incline walk'])] },
    h_mob: { name: 'Mobilitas punggung & bahu (opsional)', kind: 'home', ex: [
      ex('Cat-Cow', 1, '10'), ex("Child's Pose", 1, '45', 'detik'), ex('Bird Dog', 2, '8/sisi'),
      ex('Hip Flexor Stretch', 1, '30/sisi', 'detik'), ex('Jalan santai', 1, '20-30', 'menit')] },
  },
  week: {
    0: { home: null, gym: null }, 1: { home: null, gym: 'g_a' }, 2: { home: null, gym: null }, 3: { home: null, gym: 'g_b' },
    4: { home: null, gym: null }, 5: { home: null, gym: 'g_c' }, 6: { home: null, gym: null },
  },
});
const PRESETS = {
  riyan: { label: 'Rumah + gym (kalistenik harian, gym 3×)', plan: DEFAULT_PLAN },
  gym3: { label: 'Gym 3× full body · ramah punggung & bahu', plan: GYM3_PLAN,
    notes: 'Catatan keamanan: jaga punggung bawah tetap netral (tidak membungkuk saat mengangkat), tanpa beban di atas kepala, naikkan beban pelan-pelan. Hentikan gerakan kalau muncul nyeri tajam, kesemutan, atau nyeri menjalar ke kaki atau lengan.' },
};
const THEMES = { navy: 'Navy & oranye', plum: 'Plum & coral' };
const THEME_COLOR = { navy: '#13284A', plum: '#4A2545' };
function applyTheme() {
  const th = (S.profile && S.profile.theme) || 'navy';
  document.documentElement.dataset.color = th;
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = THEME_COLOR[th] || THEME_COLOR.navy;
}
const presetOf = () => PRESETS[(S.profile && S.profile.program) || 'riyan'] || PRESETS.riyan;

/* ---------- helpers ---------- */
const $ = (s, r=document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone = o => JSON.parse(JSON.stringify(o ?? null));
const iso = d => { const z = new Date(d.getTime() - d.getTimezoneOffset()*60000); return z.toISOString().slice(0,10); };
const parseD = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const addDays = (d,n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const todayIso = () => iso(new Date());
const fmtD = s => { const d = parseD(s); return `${d.getDate()} ${BULAN[d.getMonth()]}`; };
const fmtDL = s => { const d = parseD(s); return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; };
const daysBetween = (a,b) => Math.round((parseD(b) - parseD(a)) / 86400000);
const weekStart = d => { const x = new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate() - (x.getDay()+6)%7); return x; };
const numOrNull = v => { if (v === '' || v == null) return null; const n = Number(String(v).replace(',','.')); return isFinite(n) ? n : null; };
const fmtN = (n, dp=2) => n == null ? '–' : (Math.round(n*10**dp)/10**dp).toLocaleString('id-ID', {maximumFractionDigits:dp});
const metric = k => METRICS.find(m => m.k === k);
// recommendation engine lives in engine.js; these wrappers hand it the loaded history
const E = window.WorkoutEngine;
const { canon, sameEx, isWeighted, kgOf, perfText, hasKg, LADDERS, ladderStep, parseTarget, rangeTxt, guessUnit, UNIT_DEF_T } = E;
const lastPerformance = (name, before) => E.lastPerformance(S.days, name, before);
const lastPerformances = (name, before, n) => E.lastPerformances(S.days, name, before, n);
const suggest = (e, d, kind) => E.suggest(S.days, e, d, kind);
const uL = x => x.u ? ` (${x.u})` : '';
const shortL = x => x.l.replace('Tes ', '').replace(' maks', '');
// scroll-picker ranges [min, max, step]
const PK = { weight: [40, 150, 0.05], bf: [3, 60, 0.1], pushup: [0, 100, 1], plank: [0, 600, 5], fatMass: [0, 80, 0.1], ffm: [20, 120, 0.1],
  slm: [20, 100, 0.1], smm: [10, 70, 0.1], protein: [3, 25, 0.1], mineral: [1, 8, 0.1], tbw: [15, 70, 0.1], vfi: [1, 30, 1], ffmi: [10, 35, 0.1],
  bmr: [800, 3500, 1], tee: [1000, 5000, 1], bodyAge: [15, 90, 1] };
const pkFor = k => PK[k] || (metric(k) && metric(k).u === 'cm' ? [20, 160, 0.5] : [0, 200, 0.1]);
const UNIT_PK = { reps: [0, 60, 1], detik: [0, 300, 5], menit: [0, 120, 1] };
const KG_PK = [0, 250, 0.5];
const pkAttr = (r, label, unit, def) => ` data-pick="${r.join(',')}" data-pick-label="${esc(label)}" data-pick-unit="${esc(unit || '')}"${def != null && def !== '' && !Number.isNaN(+def) ? ` data-def="${def}"` : ''} readonly`;
const latestOf = k => { const sr = series(k); return sr.length ? sr.at(-1).y : null; };

/* ---------- exercise pictograms: side-view stick figure + equipment, viewBox 120×90, ground at y=84 ---------- */
const G = 84;
const pl = (pts, w = 5, faded) => `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="var(--fig)" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${faded ? ' opacity=".35"' : ''}/>`;
function figure(f) {
  const sh = [f.n[0], f.n[1] + 2];
  const torso = f.c ? `<path d="M${f.n} Q${f.c} ${f.hp}" fill="none" stroke="var(--fig)" stroke-width="6" stroke-linecap="round"/>` : pl([f.n, f.hp], 6);
  return (f.a2 ? pl([sh, ...f.a2], 5, 1) : '') + (f.l2 ? pl([f.hp, ...f.l2], 5, 1) : '') + torso
    + pl([f.hp, ...f.l1]) + pl([sh, ...f.a1]) + `<circle cx="${f.h[0]}" cy="${f.h[1]}" r="6.5" fill="var(--fig)"/>`;
}
const ln = (x1, y1, x2, y2, w = 3) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--eq)" stroke-width="${w}" stroke-linecap="round"/>`;
const rc = (x, y, w, h, fill = 'var(--eq)') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${fill}"/>`;
const dot = (x, y, r = 4) => `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--eq)"/>`;
const dbell = (x, y, up) => up ? rc(x - 1.5, y - 6, 3, 12) + rc(x - 4, y - 8, 8, 3) + rc(x - 4, y + 5, 8, 3)
                            : rc(x - 6, y - 1.5, 12, 3) + rc(x - 8, y - 4, 3, 8) + rc(x + 5, y - 4, 3, 8);
const floor = () => ln(6, G, 114, G, 2);
const mat = () => rc(8, G - 1, 104, 4, 'var(--mat)');
const chair = (x, back = true) => rc(x, 60, 26, 5) + ln(x + 13, 65, x + 13, G, 4) + ln(x - 2, G, x + 28, G, 4) + (back ? rc(x - 3, 26, 5, 38) : '');
const arrow = (x1, y1, x2, y2) => {
  const a = Math.atan2(y2 - y1, x2 - x1), k = 6.5;
  const p = s => `${(x2 - k * Math.cos(a + s)).toFixed(1)},${(y2 - k * Math.sin(a + s)).toFixed(1)}`;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--c, var(--primary))" stroke-width="2.5" stroke-linecap="round"/><polygon points="${x2},${y2} ${p(.5)} ${p(-.5)}" fill="var(--c, var(--primary))"/>`;
};
const STAND = { h: [60, 14], n: [60, 22], hp: [60, 50], l1: [[61, 67], [62, G]], l2: [[58, 67], [56, G]] };
const PICTO = {
  squat:    () => floor() + figure({ h: [66, 30], n: [61, 38], hp: [48, 60], a1: [[72, 46], [85, 46]], l1: [[68, 62], [66, G]], l2: [[64, 64], [61, G]] }) + arrow(34, 44, 34, 66),
  squatdb:  () => floor() + figure({ h: [66, 30], n: [61, 38], hp: [48, 60], a1: [[60, 50], [62, 62]], l1: [[68, 62], [66, G]], l2: [[64, 64], [61, G]] }) + dbell(62, 64) + arrow(34, 44, 34, 66),
  goblet:   () => floor() + figure({ h: [66, 30], n: [61, 38], hp: [48, 60], a1: [[70, 50], [70, 42]], l1: [[68, 62], [66, G]], l2: [[64, 64], [61, G]] }) + dbell(73, 42, 1) + arrow(34, 44, 34, 66),
  lunge:    () => floor() + figure({ h: [58, 14], n: [58, 22], hp: [57, 48], a1: [[56, 36], [60, 46]], l1: [[74, 60], [77, G]], l2: [[48, 70], [32, 82]] }) + arrow(94, 40, 94, 62),
  bridge:   () => mat() + figure({ h: [21, 76], n: [30, 76], hp: [52, 60], a1: [[40, 82], [52, 82]], l1: [[72, 58], [78, 83]], l2: [[69, 60], [74, 83]] }) + arrow(52, 78, 52, 64),
  plank:    () => mat() + figure({ h: [93, 56], n: [84, 62], hp: [52, 67], a1: [[84, 82], [97, 82]], l1: [[34, 72], [16, 79]] }) + `<line x1="14" y1="70" x2="98" y2="54" stroke="var(--c, var(--primary))" stroke-width="2" stroke-dasharray="3 4"/>`,
  sideplank:() => mat() + figure({ h: [88, 48], n: [80, 55], hp: [52, 66], a1: [[80, 82], [92, 82]], a2: [[68, 52], [58, 62]], l1: [[34, 80], [22, 70]] }) + arrow(52, 82, 52, 70),
  pushup:   () => mat() + figure({ h: [90, 50], n: [81, 56], hp: [52, 66], a1: [[81, 69], [81, 82]], l1: [[36, 80], [22, 70]] }) + arrow(102, 56, 102, 74),
  shtap:    () => mat() + figure({ h: [92, 46], n: [83, 52], hp: [50, 60], a1: [[83, 67], [83, 82]], a2: [[92, 60], [86, 53]], l1: [[33, 70], [16, 80]] }) + arrow(100, 70, 92, 58),
  hollow:   () => mat() + figure({ h: [24, 64], n: [32, 69], hp: [60, 79], a1: [[20, 62], [8, 57]], l1: [[80, 75], [100, 70]] }) + arrow(60, 66, 60, 54),
  deadbug:  () => mat() + figure({ h: [18, 74], n: [27, 75], hp: [56, 76], a1: [[18, 70], [6, 66]], a2: [[30, 62], [31, 48]], l1: [[74, 72], [96, 70]], l2: [[60, 58], [76, 58]] }),
  birddog:  () => mat() + figure({ h: [86, 46], n: [77, 52], hp: [46, 54], a1: [[90, 50], [104, 48]], a2: [[78, 67], [78, 82]], l1: [[30, 52], [12, 50]], l2: [[46, 82], [30, 82]] }),
  catcow:   () => mat() + figure({ h: [86, 62], n: [78, 56], hp: [44, 56], c: [61, 36], a1: [[78, 69], [78, 82]], l1: [[44, 82], [28, 82]] }) + arrow(61, 30, 61, 18),
  child:    () => mat() + figure({ h: [80, 76], n: [70, 72], hp: [42, 66], a1: [[86, 79], [102, 81]], l1: [[58, 82], [36, 82]] }),
  hipcircle:() => floor() + figure({ ...STAND, a1: [[70, 36], [66, 48]], a2: [[50, 36], [54, 48]] }) + `<ellipse cx="60" cy="50" rx="20" ry="5" fill="none" stroke="var(--c, var(--primary))" stroke-width="2.5" stroke-dasharray="4 3"/>`,
  legswing: () => floor() + ln(30, 8, 30, G, 4) + figure({ h: [56, 14], n: [56, 22], hp: [56, 50], a1: [[44, 32], [32, 34]], l1: [[70, 62], [84, 70]], l2: [[56, 67], [56, G]] }) + arrow(70, 80, 92, 64),
  hamstring:() => mat() + figure({ h: [64, 48], n: [57, 55], hp: [38, 80], a1: [[72, 64], [86, 74]], l1: [[62, 81], [88, 80]] }) + arrow(66, 40, 80, 52),
  quad:     () => floor() + figure({ ...STAND, a1: [[70, 32], [80, 26]], a2: [[54, 40], [46, 58]], l1: [[60, 67], [60, G]], l2: [[62, 68], [46, 60]] }),
  chest:    () => floor() + ln(88, 6, 88, G, 4) + figure({ ...STAND, h: [57, 14], a1: [[73, 24], [86, 24]], a2: [[57, 36], [55, 48]] }) + arrow(48, 30, 34, 30),
  walk:     () => floor() + figure({ h: [62, 14], n: [60, 22], hp: [58, 50], a1: [[66, 34], [73, 44]], a2: [[52, 35], [46, 44]], l1: [[66, 66], [72, G]], l2: [[52, 66], [44, 82]] }) + arrow(86, 40, 104, 40),
  treadmill:() => rc(16, 84, 86, 5) + ln(98, 84, 104, 44, 4) + ln(100, 44, 112, 44, 4) + figure({ h: [56, 14], n: [54, 22], hp: [52, 50], a1: [[60, 34], [67, 44]], a2: [[46, 35], [40, 44]], l1: [[60, 66], [66, G]], l2: [[46, 66], [38, 82]] }),
  calf:     () => floor() + rc(46, 79, 30, 5) + figure({ h: [60, 12], n: [60, 20], hp: [60, 46], a1: [[58, 34], [58, 50]], l1: [[61, 62], [62, 75], [68, 79]] }) + dbell(58, 52) + arrow(86, 70, 86, 50),
  rdl:      () => floor() + figure({ h: [82, 40], n: [73, 42], hp: [48, 46], a1: [[72, 56], [70, 68]], l1: [[54, 64], [52, G]], l2: [[50, 65], [47, G]] }) + dbell(70, 70) + arrow(96, 58, 96, 38),
  legpress: () => floor() + ln(60, G, 108, 34, 3) + ln(22, 40, 44, 74, 7) + ln(44, 74, 58, 76, 7) + ln(76, 34, 92, 54, 6)
              + figure({ h: [28, 40], n: [34, 48], hp: [52, 72], a1: [[46, 62], [54, 72]], l1: [[66, 52], [84, 44]] }) + arrow(92, 34, 104, 22),
  legext:   () => chair(36) + figure({ h: [44, 26], n: [44, 34], hp: [46, 60], a1: [[50, 48], [58, 60]], l1: [[66, 60], [86, 54]] }) + dot(86, 59, 4.5) + arrow(80, 80, 92, 64),
  legcurl:  () => chair(36) + figure({ h: [44, 26], n: [44, 34], hp: [46, 60], a1: [[50, 48], [58, 60]], l1: [[66, 60], [62, 80]] }) + rc(48, 50, 22, 6) + dot(57, 80, 4.5) + arrow(88, 62, 74, 80),
  chestpress:() => chair(30) + rc(98, 8, 6, 76) + ln(100, 22, 80, 36, 4) + ln(76, 32, 76, 44, 4)
              + figure({ h: [40, 26], n: [40, 34], hp: [42, 60], a1: [[58, 42], [74, 38]], l1: [[62, 62], [64, G]] }) + arrow(80, 52, 96, 52),
  incpress: () => chair(30) + rc(98, 8, 6, 76) + ln(100, 10, 72, 18, 4) + ln(66, 14, 74, 24, 4)
              + figure({ h: [40, 26], n: [40, 34], hp: [42, 60], a1: [[54, 30], [68, 20]], l1: [[62, 62], [64, G]] }) + arrow(76, 34, 88, 22),
  dbpress:  () => chair(38) + dbell(58, 10) + dbell(42, 10) + figure({ h: [50, 22], n: [50, 30], hp: [50, 58], a1: [[60, 26], [58, 12]], a2: [[40, 26], [42, 12]], l1: [[68, 60], [68, G]] }) + arrow(80, 30, 80, 10),
  shpress:  () => chair(38) + ln(48, 8, 66, 8, 4) +figure({ h: [50, 22], n: [50, 30], hp: [50, 58], a1: [[60, 26], [58, 10]], a2: [[40, 26], [42, 10]], l1: [[68, 60], [68, G]] }) + arrow(80, 28, 80, 8),
  pulldown: () => chair(30, false) + rc(52, 52, 16, 5) + rc(100, 4, 6, 80) + ln(60, 5, 103, 5, 4) + dot(60, 6, 3.5) + ln(60, 6, 56, 20, 2) + ln(38, 20, 76, 20, 4)
              + figure({ h: [42, 28], n: [42, 36], hp: [42, 62], a1: [[54, 34], [56, 20]], a2: [[32, 34], [30, 20]], l1: [[60, 60], [62, G]] }) + arrow(86, 24, 86, 44),
  cablerow: () => rc(20, 66, 40, 5) + ln(40, 71, 40, G, 4) + floor() + ln(80, 56, 82, 82, 5) + rc(104, 10, 6, 74) + dot(104, 58, 3.5) + ln(104, 58, 46, 58, 2)
              + figure({ h: [38, 34], n: [38, 42], hp: [38, 66], a1: [[30, 56], [46, 58]], l1: [[58, 56], [78, 64]] }) + arrow(72, 48, 54, 48),
  pushdown: () => floor() + rc(98, 4, 6, 80) + ln(84, 6, 101, 6, 4) + dot(84, 8, 3.5) + ln(84, 8, 74, 50, 2) + ln(68, 52, 80, 52, 4)
              + figure({ ...STAND, h: [56, 14], n: [56, 22], hp: [54, 50], a1: [[60, 38], [72, 52]] }) + arrow(90, 34, 90, 56),
  pallof:   () => floor() + rc(6, 6, 6, 78) + dot(12, 36, 3.5) + `<line x1="12" y1="36" x2="82" y2="36" stroke="var(--eq)" stroke-width="2" opacity=".6"/>`
              + figure({ ...STAND, h: [56, 14], n: [56, 22], hp: [55, 50], a1: [[68, 34], [82, 36]] }) + dot(83, 36, 3) + arrow(86, 46, 104, 46),
  curl:     () => ln(26, 74, 46, 32, 6) + rc(40, 70, 26, 5) + ln(52, 75, 52, G, 4) + floor()
              + figure({ h: [40, 24], n: [44, 32], hp: [54, 68], a1: [[50, 50], [62, 40]], l1: [[72, 70], [74, G]] }) + dbell(64, 40, 1) + arrow(76, 58, 72, 40),
  hang:     () => ln(26, 8, 94, 8, 4) + ln(30, 4, 30, 12, 3) + ln(90, 4, 90, 12, 3) + figure({ h: [60, 24], n: [60, 32], hp: [60, 58], a1: [[63, 20], [65, 9]], a2: [[57, 20], [55, 9]], l1: [[61, 72], [62, 84]], l2: [[59, 72], [57, 84]] }),
  pushfull: () => mat() + figure({ h: [94, 50], n: [85, 55], hp: [52, 67], a1: [[85, 68], [85, 82]], l1: [[34, 73], [14, 79]] }) + arrow(104, 54, 104, 72),
  incpush:  () => floor() + rc(80, 56, 28, 5) + ln(84, 61, 84, G, 3) + ln(104, 61, 104, G, 3) + figure({ h: [94, 36], n: [86, 42], hp: [54, 62], a1: [[87, 50], [88, 56]], l1: [[34, 74], [16, G]] }) + arrow(70, 30, 70, 46),
  decline:  () => mat() + rc(4, 54, 26, 5) + ln(8, 59, 8, G, 3) + ln(26, 59, 26, G, 3) + figure({ h: [98, 64], n: [90, 69], hp: [56, 64], a1: [[90, 76], [90, 82]], l1: [[36, 60], [18, 54]] }) + arrow(108, 58, 108, 76),
  sidefull: () => mat() + figure({ h: [88, 48], n: [80, 55], hp: [52, 66], a1: [[80, 82], [92, 82]], a2: [[68, 52], [58, 62]], l1: [[33, 73], [14, 80]] }) + arrow(52, 82, 52, 70),
  calfbw:   () => floor() + rc(46, 79, 30, 5) + figure({ h: [60, 12], n: [60, 20], hp: [60, 46], a1: [[66, 32], [68, 44]], a2: [[54, 32], [52, 44]], l1: [[61, 62], [62, 75], [68, 79]] }) + arrow(86, 70, 86, 50),
  assist:   () => floor() + ln(28, 8, 92, 8, 4) + ln(32, 4, 32, 12, 3) + ln(88, 4, 88, 12, 3) + rc(50, 62, 22, 5) + ln(61, 67, 61, G, 4)
              + figure({ h: [60, 24], n: [60, 32], hp: [60, 52], a1: [[67, 22], [66, 9]], a2: [[53, 22], [54, 9]], l1: [[62, 62], [50, 64]] }) + arrow(86, 36, 86, 18),
  pecfly:   () => chair(30) + rc(98, 8, 6, 76) + figure({ h: [40, 26], n: [40, 34], hp: [42, 60], a1: [[56, 30], [70, 36]], a2: [[30, 28], [20, 22]], l1: [[62, 62], [64, G]] })
              + `<path d="M20,14 Q44,0 70,24" fill="none" stroke="var(--c, var(--primary))" stroke-width="2.5" stroke-linecap="round"/>` + arrow(64, 17, 70, 24),
  mtsrow:   () => chair(26, false) + rc(58, 30, 6, 28) + ln(61, 58, 61, G, 4) + ln(56, 48, 88, 32, 4) + dot(88, 32, 3.5)
              + figure({ h: [58, 26], n: [54, 34], hp: [40, 60], a1: [[42, 44], [56, 48]], l1: [[58, 62], [62, G]] }) + arrow(86, 58, 66, 58),
  rotation: () => chair(38) + figure({ h: [50, 22], n: [50, 30], hp: [50, 58], a1: [[62, 36], [72, 40]], a2: [[38, 36], [30, 40]], l1: [[68, 60], [68, G]] })
              + `<ellipse cx="50" cy="38" rx="28" ry="7" fill="none" stroke="var(--c, var(--primary))" stroke-width="2.5" stroke-dasharray="4 3"/>` + arrow(70, 45, 79, 40),
  crunchm:  () => chair(32) + rc(56, 24, 16, 6) + figure({ h: [62, 30], n: [56, 36], hp: [44, 60], a1: [[62, 42], [60, 32]], l1: [[64, 60], [66, G]] }) + arrow(82, 28, 74, 46),
  legraise: () => mat() + `<path d="M40,84 A16,9 0 0 1 72,84 Z" fill="var(--eq)"/>` + figure({ h: [18, 76], n: [26, 77], hp: [54, 74], a1: [[36, 82], [48, 82]], l1: [[60, 56], [64, 36]], l2: [[66, 58], [74, 42]] }) + arrow(94, 76, 80, 46),
  curlm:    () => chair(34, false) + ln(60, 40, 74, 52, 6) + ln(70, 52, 70, G, 4) + figure({ h: [46, 24], n: [48, 32], hp: [46, 60], a1: [[66, 46], [64, 30]], l1: [[64, 60], [66, G]] }) + arrow(82, 46, 76, 30),
  abduct:   () => chair(36) + figure({ h: [44, 26], n: [44, 34], hp: [46, 60], a1: [[50, 48], [58, 60]], l1: [[66, 60], [66, G]] }) + rc(60, 54, 10, 12) + arrow(74, 58, 90, 50),
  bike:     () => floor() + `<circle cx="34" cy="70" r="13" fill="none" stroke="var(--eq)" stroke-width="3"/>` + ln(34, 70, 70, 74, 4) + ln(56, 54, 64, 74, 4) + rc(50, 50, 16, 5) + ln(84, 40, 76, 74, 4) + ln(80, 40, 92, 40, 4)
              + figure({ h: [72, 20], n: [68, 28], hp: [56, 50], a1: [[78, 34], [86, 40]], l1: [[66, 62], [60, 76]], l2: [[54, 66], [58, 78]] }),
  stand:    () => floor() + figure({ ...STAND, a1: [[64, 36], [66, 50]] }),
};
const PICTO_RULES = [
  ['legpress', /leg press|hack squat/], ['legext', /leg extension/], ['legcurl', /leg curl/],
  ['curlm', /curl machine|machine curl|preacher/], ['assist', /assisted|chin-up|chin up|pull-up|pullup|\bdip\b/],
  ['incpress', /incline.*press/], ['chestpress', /chest press|bench press/], ['pecfly', /\bfly\b|pec deck|pectoral/],
  ['dbpress', /(dumbbell|db) shoulder press|arnold press/], ['shpress', /shoulder press/],
  ['mtsrow', /mts row|chest[- ]supported row|t-bar/], ['pulldown', /pulldown|pull-down/], ['pushdown', /pushdown|push down/],
  ['pallof', /pallof|face pull|external rotation/], ['rotation', /torso rotation|rotary|russian twist/], ['crunchm', /crunch|abdominal/], ['cablerow', /\brow\b/],
  ['abduct', /abduction|adduction/], ['legraise', /leg raise|knee raise/], ['hang', /dead hang|\bhang\b/], ['curl', /curl/], ['rdl', /romanian|rdl|deadlift/],
  ['calf', /standing calf|calf.*(db|dumbbell)/], ['calfbw', /calf/],
  ['sideplank', /bent-knee side plank|bent knee side plank/], ['sidefull', /side plank/],
  ['shtap', /shoulder tap/], ['plank', /plank/],
  ['decline', /decline push/], ['incpush', /incline push/], ['pushup', /knee push/], ['pushfull', /push-up|push up|pushup/],
  ['deadbug', /dead bug/], ['hollow', /hollow/], ['birddog', /bird dog/],
  ['bridge', /glute bridge|hip thrust/], ['lunge', /lunge|split squat|step-up|step up/], ['goblet', /goblet/], ['squatdb', /dumbbell squat|db squat/],
  ['squat', /squat|wall sit/], ['catcow', /cat-cow|cat cow/], ['child', /child/], ['hipcircle', /hip circle|mobility|mobilitas/],
  ['legswing', /leg swing/], ['hamstring', /hamstring/], ['quad', /quad/], ['chest', /chest stretch|stretch/],
  ['treadmill', /treadmill|tredmill|\brun\b|lari|elliptical/], ['bike', /bike|sepeda/], ['walk', /jalan|walk/],
];
const pictoCache = {};
function picto(name) {
  const s = canon(name);
  const key = (PICTO_RULES.find(([, re]) => re.test(s)) || ['stand'])[0];
  return pictoCache[key] || (pictoCache[key] = `<svg viewBox="0 0 120 90" aria-hidden="true">${PICTO[key]()}</svg>`);
}

/* ---------- storage: Google Sheets via store.js (cached in this browser) ---------- */
let mode = 'local';
const store = {
  async init() { const r = await SheetStore.load(); mode = r.source; },
  get: path => SheetStore.get(path),
  set: (path, data) => SheetStore.set(path, data),
  days: () => SheetStore.days(),
};
const timers = {}, chains = {};
let pending = 0;
function setStatus(s, msg) {
  const el = $('#status'); el.dataset.s = s;
  $('#status-t').textContent = msg || (s === 'saving' ? 'Menyimpan…' : s === 'error' ? 'Gagal menyimpan' : mode === 'local' ? 'Tersimpan di perangkat' : 'Tersimpan');
}
function queueSave(path, getter, delay = 600) {
  clearTimeout(timers[path]); setStatus('saving');
  timers[path] = setTimeout(() => {
    pending++;
    chains[path] = (chains[path] || Promise.resolve())
      .then(() => store.set(path, clone(getter())))
      .then(() => { pending--; if (!pending) setStatus('saved'); })
      .catch(() => { pending--; setStatus('error', 'Belum terkirim'); });
  }, delay);
}

/* ---------- state ---------- */
const S = { profile:null, plan:null, days:{}, loaded:false, tab:'ringkasan', date: todayIso(), chartMetric:'weight' };
const saveProfile = () => queueSave('fit/profile', () => S.profile);
const savePlan = () => queueSave('fit/plan', () => S.plan);
const saveDay = d => { S.days[d].updated = Date.now(); queueSave('days/' + d, () => S.days[d]); };

const tplList = kind => Object.entries(S.plan.templates).filter(([,t]) => t.kind === kind);
const sessionActive = s => !!(s && (s.done || (s.ex || []).some(e => (e.sets || []).some(v => v > 0))));
const dayKinds = d => { const x = S.days[d]; return { h: sessionActive(x && x.home), g: sessionActive(x && x.gym) }; };
const gymTarget = () => (S.profile && S.profile.gymTarget) || Object.values(S.plan.week).filter(w => w.gym).length || 4;

function buildSession(tplKey, prev) {
  const t = tplKey && S.plan.templates[tplKey];
  if (!t) return null;
  const keep = {}; (prev && prev.ex || []).forEach(e => keep[e.n] = e);
  return { tpl: tplKey, done: false, min: prev ? prev.min ?? null : null,
    ex: t.ex.map(e => { const k = keep[e.n]; const n = Math.max(e.s, k && k.sets ? k.sets.length : 0);
      const sets = Array.from({length: n}, (_, i) => k && k.sets ? k.sets[i] ?? null : null);
      const kgs = Array.from({length: n}, (_, i) => k ? kgOf(k, i) : null);
      return { n: e.n, s: e.s, t: e.t, u: e.u, w: e.w, alt: e.alt, sets, kgs }; }) };
}
function dayView(d) {
  // existing log, or a fresh one built from the weekly plan (not saved until edited)
  if (S.days[d]) return S.days[d];
  const w = S.plan.week[parseD(d).getDay()] || {};
  return { date: d, m: {}, home: buildSession(w.home), gym: buildSession(w.gym), energy: null, sleep: null, note: '' };
}
function ensureDay(d) { if (!S.days[d]) S.days[d] = dayView(d); return S.days[d]; }

/* ---------- coach UI ---------- */
function coachHtml(sg, kind, i) {
  if (!sg) return '';
  const btn = sg.swap ? `<button class="btn sm" data-swap="${kind}" data-i="${i}">Ganti ke ${esc(sg.swap.n)}</button>`
    : sg.t ? `<button class="btn sm" data-retarget="${kind}" data-i="${i}" data-val="${esc(sg.t)}">Pakai target ${esc(sg.t)}</button>`
    : sg.kg ? `<button class="btn ghost sm" data-prefill="${kind}" data-i="${i}" data-kg="${sg.kg}">Isi ${fmtN(sg.kg)} kg</button>` : '';
  return `<div class="coach ${sg.kind}"><span class="coach-tag">${sg.tag}</span><span class="coach-t">${esc(sg.text)}</span>${btn}</div>`;
}
// apply a change to the exercise in the menu template too, so future days follow it
function patchTemplate(tplKey, oldName, patch) {
  const t = tplKey && S.plan.templates[tplKey]; if (!t) return false;
  const it = t.ex.find(x => sameEx(x.n, oldName)); if (!it) return false;
  Object.assign(it, patch); savePlan(); return true;
}
/* series for a metric: baseline + daily entries */
function series(k) {
  const pts = [];
  const b = S.profile && S.profile.base;
  if (b && b[k] != null && S.profile.startDate) pts.push({ d: S.profile.startDate, y: b[k], base: true });
  Object.keys(S.days).sort().forEach(d => { const v = S.days[d].m && S.days[d].m[k]; if (v != null) pts.push({ d, y: v }); });
  return pts.sort((a,b) => a.d < b.d ? -1 : 1);
}
function metricDir(k) { if (k !== 'weight') return metric(k).dir; const g = S.profile && S.profile.goal; return g === 'cut' ? -1 : g === 'bulk' ? 1 : 0; }
function deltaHtml(k, delta, unit) {
  if (delta == null) return '';
  const dir = metricDir(k); const cls = delta === 0 || dir === 0 ? '' : (Math.sign(delta) === dir ? 'good' : 'bad');
  return `<span class="${cls}">${delta > 0 ? '+' : ''}${fmtN(delta)}${unit ? ' ' + unit : ''}</span>`;
}

function streak() {
  let d = new Date(), n = 0;
  const any = s => { const k = dayKinds(s); return k.h || k.g; };
  if (!any(iso(d))) d = addDays(d, -1);
  while (any(iso(d))) { n++; d = addDays(d, -1); }
  return n;
}
function weekCounts(start) {
  let h = 0, g = 0;
  for (let i = 0; i < 7; i++) { const k = dayKinds(iso(addDays(start, i))); if (k.h) h++; if (k.g) g++; }
  return { h, g };
}

/* ---------- charts (hand-drawn SVG, one scale per axis) ---------- */
function niceScale(lo, hi, n = 4) {
  if (lo === hi) { lo -= 1; hi += 1; }
  const raw = (hi - lo) / n, mag = 10 ** Math.floor(Math.log10(raw)), r = raw / mag;
  const step = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, ticks = [];
  for (let v = a; v <= b + step / 1e6; v += step) ticks.push(+v.toFixed(6));
  return { a, b, ticks };
}
function lineChart(host, pts, { color, unit, target }) {
  if (pts.length < 1) { host.innerHTML = `<div class="chart-empty">Belum ada data. Isi ukuran awal di tab <b>&nbsp;Ukuran tubuh&nbsp;</b> lalu catat harian di <b>&nbsp;Hari ini</b>.</div>`; return; }
  const W = Math.max(300, host.clientWidth || 600), H = 230, m = { l: 44, r: 18, t: 14, b: 28 };
  const xs = pts.map(p => parseD(p.d).getTime());
  let x0 = Math.min(...xs), x1 = Math.max(...xs); if (x0 === x1) { x0 -= 3 * 864e5; x1 += 3 * 864e5; }
  const ys = pts.map(p => p.y).concat(target != null ? [target] : []);
  const sc = niceScale(Math.min(...ys), Math.max(...ys));
  const X = t => m.l + (t - x0) / (x1 - x0) * (W - m.l - m.r);
  const Y = v => m.t + (1 - (v - sc.a) / (sc.b - sc.a)) * (H - m.t - m.b);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
  const area = `${line}L${X(xs.at(-1)).toFixed(1)},${Y(sc.a)}L${X(xs[0]).toFixed(1)},${Y(sc.a)}Z`;
  const grid = sc.ticks.map(v => `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${m.l - 8}" y="${Y(v) + 4}" text-anchor="end">${fmtN(v)}</text>`).join('');
  const xl = [pts[0].d]; if (pts.length > 2) xl.push(pts[Math.floor(pts.length / 2)].d); if (pts.length > 1) xl.push(pts.at(-1).d);
  const xlab = [...new Set(xl)].map((d, i, arr) => `<text x="${X(parseD(d).getTime())}" y="${H - 8}" text-anchor="${i === 0 && arr.length > 1 ? 'start' : i === arr.length - 1 && arr.length > 1 ? 'end' : 'middle'}">${fmtD(d)}</text>`).join('');
  const tgt = target != null ? `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(target)}" y2="${Y(target)}" stroke="var(--ink)" stroke-dasharray="4 4" stroke-width="1"/><text x="${W - m.r}" y="${Y(target) - 6}" text-anchor="end" style="fill:var(--ink)">target ${fmtN(target)}</text>` : '';
  const dots = pts.map((p, i) => `<circle cx="${X(xs[i])}" cy="${Y(p.y)}" r="${i === pts.length - 1 ? 5 : p.base ? 4 : 2.5}" fill="${p.base ? 'var(--surface)' : color}" stroke="${color}" stroke-width="${p.base ? 2 : 0}"><title>${fmtD(p.d)}${p.base ? ' (awal)' : ''}: ${fmtN(p.y)} ${unit}</title></circle>`).join('');
  const last = pts.at(-1);
  const lx = X(xs.at(-1)), anchor = lx > W - 80 ? 'end' : 'start';
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik ${unit}">
    ${grid}${tgt}
    <path d="${area}" fill="${color}" fill-opacity=".10"/>
    <path d="${line}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    <text x="${anchor === 'end' ? lx - 9 : lx + 9}" y="${Y(last.y) - 9}" text-anchor="${anchor}" style="fill:var(--ink);font-weight:500">${fmtN(last.y)} ${unit}</text>
    ${xlab}</svg>`;
}
function weeklyBars(host, weeks) {
  const W = Math.max(300, host.clientWidth || 600), H = 230, m = { l: 30, r: 10, t: 14, b: 28 };
  const max = Math.max(7, ...weeks.map(w => w.h + w.g));
  const sc = niceScale(0, max, 4);
  const Y = v => m.t + (1 - v / sc.b) * (H - m.t - m.b);
  const bw = (W - m.l - m.r) / weeks.length;
  const grid = sc.ticks.map(v => `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`).join('');
  const bars = weeks.map((w, i) => {
    const x = m.l + i * bw + bw * 0.18, wd = bw * 0.64;
    const yh = Y(w.h), yg = Y(w.h + w.g);
    return `<rect x="${x}" y="${yh}" width="${wd}" height="${Y(0) - yh}" fill="var(--home)"><title>Kalistenik: ${w.h}</title></rect>
      <rect x="${x}" y="${yg}" width="${wd}" height="${yh - yg}" fill="var(--gym)"><title>Gym: ${w.g}</title></rect>
      ${w.h + w.g ? `<text x="${x + wd / 2}" y="${yg - 5}" text-anchor="middle" style="fill:var(--ink)">${w.h + w.g}</text>` : ''}
      <text x="${x + wd / 2}" y="${H - 8}" text-anchor="middle">${w.label}</text>`;
  }).join('');
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Sesi per minggu">${grid}${bars}</svg>`;
}

/* ---------- RINGKASAN ---------- */
function exerciseHistory() {
  const map = new Map();
  Object.keys(S.days).sort().forEach(d => ['home', 'gym'].forEach(k => {
    const s = S.days[d][k]; if (!s) return;
    (s.ex || []).forEach(e => {
      const sets = (e.sets || []).map((r, j) => ({ r, w: kgOf(e, j) || 0 })).filter(x => x.r > 0); if (!sets.length) return;
      const wTop = Math.max(...sets.map(x => x.w));
      const best = sets.filter(x => x.w === wTop).sort((a, b) => b.r - a.r)[0];
      const key = canon(e.n);
      if (!map.has(key)) map.set(key, { n: e.n, recs: [] });
      const g = map.get(key); g.n = e.n; g.recs.push({ d, k, w: wTop || null, r: best.r, u: e.u });
    });
  }));
  return map;
}
function historyHtml() {
  const hx = exerciseHistory();
  const recTxt = r => r.w ? `${r.r} × ${fmtN(r.w)} kg` : `${r.r} ${r.u}`;
  const tplName = key => { for (const t of Object.values(S.plan.templates)) { const x = t.ex.find(x => canon(x.n) === key); if (x) return x.n; } return null; };
  const rows = [...hx].map(([key, g]) => ({ n: tplName(key) || g.n, recs: g.recs, first: g.recs[0], last: g.recs.at(-1) }))
    .sort((a, b) => a.last.d < b.last.d ? 1 : a.last.d > b.last.d ? -1 : a.n.localeCompare(b.n));
  const delta = x => {
    if (x.recs.length < 2) return '<span class="muted">baru 1 sesi</span>';
    const byKg = x.last.w && x.first.w, dv = byKg ? x.last.w - x.first.w : x.last.r - x.first.r, unit = byKg ? 'kg' : x.last.u;
    const better = /assisted/.test(canon(x.n)) && byKg ? -dv : dv; // less assistance = stronger
    const cls = better > 0 ? 'good' : better < 0 ? 'bad' : '';
    return `<span class="${cls}">${dv > 0 ? '+' : ''}${fmtN(dv)} ${unit}</span>`;
  };
  const tbl = rows.length ? `<div class="table-wrap"><table><thead><tr><th>Gerakan</th><th>Sesi</th><th>Pertama</th><th>Terakhir</th><th>Perubahan</th></tr></thead><tbody>
    ${rows.map(x => `<tr><td class="nmcell"><span class="mini">${picto(x.n)}</span><span>${esc(x.n)}</span></td><td>${x.recs.length}</td>
      <td>${recTxt(x.first)} <small class="muted">${fmtD(x.first.d)}</small></td><td>${recTxt(x.last)} <small class="muted">${fmtD(x.last.d)}</small></td><td>${delta(x)}</td></tr>`).join('')}
    </tbody></table></div>` : `<div class="chart-empty">Belum ada latihan tercatat.</div>`;
  const days = Object.keys(S.days).filter(d => { const k = dayKinds(d); return k.h || k.g; }).sort().reverse().slice(0, 12);
  const sum = s => {
    const ex = (s.ex || []).filter(e => (e.sets || []).some(v => v > 0));
    const sets = ex.reduce((a, e) => a + e.sets.filter(v => v > 0).length, 0);
    const vol = ex.reduce((a, e) => a + e.sets.reduce((b, r, j) => b + (r > 0 ? r * (kgOf(e, j) || 0) : 0), 0), 0);
    return `${ex.length} gerakan · ${sets} set${vol ? ` · ${Math.round(vol).toLocaleString('id-ID')} kg volume` : ''}`;
  };
  const tname = s => esc(((S.plan.templates[s.tpl] || {}).name || 'Sesi').replace(/^(Kalistenik|Gym) · /, ''));
  const log = days.length ? `<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Sesi</th><th>Isi</th></tr></thead><tbody>
    ${days.map(d => { const x = S.days[d], parts = [];
      if (sessionActive(x.home)) parts.push([`<span class="pill home">Rumah</span> ${tname(x.home)}`, sum(x.home)]);
      if (sessionActive(x.gym)) parts.push([`<span class="pill gym">Gym</span> ${tname(x.gym)}`, sum(x.gym)]);
      return `<tr><td>${HARI3[parseD(d).getDay()]}, ${fmtD(d)}</td><td style="text-align:left">${parts.map(q => q[0]).join('<br>')}</td><td style="text-align:left">${parts.map(q => q[1]).join('<br>')}</td></tr>`; }).join('')}
    </tbody></table></div>` : `<div class="chart-empty">Belum ada sesi tercatat.</div>`;
  return `<div class="grid" style="margin-top:16px">
    <div class="panel"><div class="panel-head"><div><div class="eyebrow">Riwayat</div><h2>Progres per gerakan</h2></div><span class="muted" style="font-size:13px">Set terbaik tiap sesi: beban tertinggi untuk gym, reps atau detik tertinggi untuk kalistenik</span></div>${tbl}</div>
    <div class="panel"><div class="panel-head"><div><div class="eyebrow">Riwayat</div><h2>Sesi terakhir</h2></div><button class="btn ghost sm" data-go="hariini">Buka catatan harian</button></div>${log}</div>
  </div>`;
}
/* ---------- overview building blocks (presentation only; data comes from S and the engine) ---------- */
const SKIP_KEY = 'wd-skip';   // recommendations dismissed for one day, kept only on this device
function skippedMoves(d) { try { return (JSON.parse(localStorage.getItem(SKIP_KEY)) || {})[d] || []; } catch { return []; } }
function skipMove(d, key) {
  try { const all = JSON.parse(localStorage.getItem(SKIP_KEY)) || {}; localStorage.setItem(SKIP_KEY, JSON.stringify({ [d]: [...new Set([...(all[d] || []), key])] })); } catch {}
}
const filledSets = s => (s && s.ex || []).reduce((a, e) => a + (e.sets || []).filter(v => v > 0).length, 0);
const totalSets = s => (s && s.ex || []).reduce((a, e) => a + (e.sets || []).length, 0);
function sessionState(s) {
  if (!s) return 'none';
  const f = filledSets(s);
  if (s.done || (f && f >= totalSets(s))) return 'done';
  return f ? 'progress' : 'todo';
}
// rough planning number: work + rest per set, timed items by their target
function estMinutes(s, kind) {
  let sec = 0;
  (s.ex || []).forEach(e => {
    const n = (e.sets || []).length || e.s || 1, tg = parseTarget(e.t) || { hi: 10 };
    if (e.u === 'menit') sec += n * tg.hi * 60;
    else if (e.u === 'detik') sec += n * (tg.hi * (/\/(sisi|kaki)/.test(e.t) ? 2 : 1) + 45);
    else sec += n * (kind === 'gym' ? 135 : 75);
  });
  return Math.max(5, Math.round(sec / 300) * 5);
}
const shortTpl = s => ((S.plan.templates[s.tpl] || {}).name || 'Sesi').replace(/^(Kalistenik|Gym) · /, '');
const STATE_TXT = { todo: 'Belum mulai', progress: 'Sedang berjalan', done: 'Selesai' };

function todayHtml(t) {
  const dv = dayView(t);
  const list = [['gym', dv.gym], ['home', dv.home]].filter(([, s]) => s);
  if (!list.length) return `<section class="hero rest-day"><div class="hero-top"><span class="eyebrow">Latihan hari ini</span></div>
    <h2>Hari pemulihan</h2><p class="muted">Tidak ada sesi terjadwal. Jalan santai dan stretching ringan sudah cukup.</p>
    <button class="btn ghost" data-go="menu">Lihat menu minggu ini</button></section>`;
  const [kind, s] = list[0], st = sessionState(s), f = filledSets(s), tot = totalSets(s);
  const cta = st === 'done' ? 'LIHAT RINGKASAN' : st === 'progress' ? 'LANJUTKAN LATIHAN' : 'MULAI LATIHAN';
  const sub = list[1] ? (() => { const [k2, s2] = list[1], st2 = sessionState(s2);
    return `<button class="hero-sub" data-go="hariini" data-focus="${k2}"><span class="pill ${k2}">${k2 === 'gym' ? 'Gym' : 'Rumah'}</span>
      <span class="hs-name">${esc(shortTpl(s2))}</span><span class="state ${st2}">${STATE_TXT[st2]}</span><span aria-hidden="true">›</span></button>`; })() : '';
  return `<section class="hero ${kind}" aria-labelledby="hero-title">
    <div class="hero-top"><span class="eyebrow">Latihan hari ini</span><span class="state ${st}">${STATE_TXT[st]}${st === 'progress' ? ` · ${f}/${tot} set` : st === 'done' ? ' ✓' : ''}</span></div>
    <h2 id="hero-title">${esc(shortTpl(s))}</h2>
    <div class="hero-meta"><span class="pill ${kind}">${kind === 'gym' ? 'Gym' : 'Kalistenik'}</span><span>${s.ex.length} gerakan</span><span>${tot} set</span><span>±${estMinutes(s, kind)} menit</span></div>
    <div class="bar ${kind}" role="progressbar" aria-valuemin="0" aria-valuemax="${tot}" aria-valuenow="${f}" aria-label="Set selesai"><i style="width:${tot ? Math.round(f / tot * 100) : 0}%"></i></div>
    <button class="btn cta" data-go="hariini" data-focus="${kind}">${cta}</button>
    ${sub}
  </section>`;
}

// YOUR NEXT MOVE: only what WorkoutEngine.suggest() returns for today's planned exercises
function nextMoves(t) {
  const dv = dayView(t), out = [];
  [['gym', dv.gym], ['home', dv.home]].forEach(([kind, s]) => (s && s.ex || []).forEach((e, i) => {
    const sg = suggest(e, t, kind); if (!sg) return;
    out.push({ kind, i, e, sg, last: lastPerformance(e.n, t), key: kind + ':' + canon(e.n) });
  }));
  const rank = { level: 0, up: 1, hold: 2, same: 3 };
  return out.sort((a, b) => rank[a.sg.kind] - rank[b.sg.kind]);
}
function moveApplied(m) {
  const { e, sg } = m;
  if (sg.swap) return false;
  if (sg.t) return e.t === sg.t;
  if (sg.kg != null) return e.sets.length > 0 && e.sets.every((_, j) => kgOf(e, j) === sg.kg);
  return false;
}
function nextMoveHtml(t) {
  const all = nextMoves(t); if (!all.length) return '';
  const skip = skippedMoves(t), moves = all.filter(m => !skip.includes(m.key));
  const TAG = { level: 'NEXT LEVEL', up: 'READY TO PROGRESS', hold: 'HOLD CURRENT', same: 'HOLD CURRENT' };
  const card = m => {
    const { e, sg, last } = m, tg = parseTarget(e.t);
    const tag = sg.tag === 'Pemulihan' ? 'RECOVERY FIRST' : sg.tag === 'Kurangi bantuan' ? 'LESS ASSISTANCE' : TAG[sg.kind];
    const prev = last ? `${perfText(last.e)} ${hasKg(last.e) ? 'reps × kg' : e.u} · ${fmtD(last.d)}` : '–';
    const next = sg.swap ? `${sg.swap.n} · ${e.s} × ${sg.swap.t || e.t}`
      : sg.t ? `${e.s} × ${sg.t} ${e.u}`
      : sg.kg != null ? `${fmtN(sg.kg)} kg × ${tg ? rangeTxt(tg) : e.t} × ${e.s} set` : `${e.s} × ${e.t} ${e.u}`;
    const can = !!(sg.swap || sg.t || sg.kg != null), done = moveApplied(m);
    const label = sg.swap ? 'Ganti gerakan' : sg.t ? 'Pakai target' : 'Isi beban';
    return `<article class="move ${sg.kind} ${m.kind}">
      <div class="move-tag">${tag}<span class="pill ${m.kind}">${m.kind === 'gym' ? 'Gym' : 'Rumah'}</span></div>
      <h3>${esc(e.n)}</h3>
      <dl><div><dt>Sebelumnya</dt><dd>${esc(prev)}</dd></div><div><dt>Berikutnya</dt><dd><b>${esc(next)}</b></dd></div></dl>
      <p class="move-why">${esc(sg.text)}</p>
      <div class="move-act">${can ? (done ? '<span class="pill ok">Diterapkan ✓</span>' : `<button class="btn sm" data-apply="${m.kind}" data-i="${m.i}">${label}</button>`) : ''}
        <button class="btn ghost sm" data-skipmove="${esc(m.key)}">Lewati</button></div>
    </article>`;
  };
  const up = moves.filter(m => m.sg.kind === 'up' || m.sg.kind === 'level').length;
  return `<section class="panel nextmove" aria-labelledby="nm-title">
    <div class="panel-head"><div><div class="eyebrow">Dari mesin rekomendasi</div><h2 id="nm-title">Your next move</h2></div>
      <span class="muted nm-count">${up} siap naik · ${moves.length - up} tahan${skip.length ? ` · ${skip.length} dilewati` : ''}</span></div>
    ${moves.length ? `<div class="moves">${moves.map(card).join('')}</div>` : '<p class="muted">Semua saran hari ini sudah kamu lewati.</p>'}
  </section>`;
}

function weekHtml() {
  const ws = weekStart(new Date()), t = todayIso(), wc = weekCounts(ws), tg = gymTarget();
  const homeTarget = Object.values(S.plan.week).filter(w => w.home && !w.gym).length || 3;
  const cells = Array.from({ length: 7 }, (_, i) => {
    const dt = addDays(ws, i), d = iso(dt), k = dayKinds(d), w = S.plan.week[dt.getDay()] || {};
    const done = k.g && k.h ? 'db' : k.g ? 'dg' : k.h ? 'dh' : '';
    const plan = w.gym ? 'pg' : w.home ? 'ph' : 'pr';
    const title = `${HARI[dt.getDay()]}: ${done ? (done === 'db' ? 'gym + rumah' : done === 'dg' ? 'gym' : 'rumah') + ' selesai' : w.gym ? 'jadwal gym' : w.home ? 'jadwal rumah' : 'pemulihan'}`;
    return `<li class="${d === t ? 'today' : ''}${d > t ? ' future' : ''}" title="${title}"><span class="dn">${HARI3[dt.getDay()]}</span><i class="wd ${done || plan}">${done ? '✓' : ''}</i></li>`;
  }).join('');
  const bar = (label, v, target, kind) => `<div class="prog"><div class="prog-h"><span>${label}</span><b class="num">${v}<small> / ${target}</small></b></div>
    <div class="bar ${kind}"><i style="width:${Math.min(100, target ? v / target * 100 : 0)}%"></i></div></div>`;
  return `<section class="panel" aria-labelledby="wk-title">
    <div class="panel-head"><div><div class="eyebrow">Minggu ini</div><h2 id="wk-title">Target latihan</h2></div>${wc.g >= tg ? '<span class="pill ok">Target gym ✓</span>' : ''}</div>
    <ol class="wk">${cells}</ol>
    ${bar('Gym', wc.g, tg, 'gym')}${bar('Kalistenik (hari tanpa gym)', Math.min(wc.h, 7), homeTarget, 'home')}
    <div class="legend wk-legend"><span><i class="wd dg"></i>Gym</span><span><i class="wd dh"></i>Rumah</span><span><i class="wd pg"></i>Jadwal gym</span><span><i class="wd ph"></i>Jadwal rumah</span></div>
  </section>`;
}

function sparkline(pts) {
  if (pts.length < 2) return '';
  const ys = pts.map(p => p.y), lo = Math.min(...ys), hi = Math.max(...ys), W = 140, H = 40;
  const X = i => 2 + i * (W - 4) / (pts.length - 1), Y = v => hi === lo ? H / 2 : 4 + (1 - (v - lo) / (hi - lo)) * (H - 8);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${d}" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${X(pts.length - 1)}" cy="${Y(pts.at(-1).y)}" r="3.5" fill="var(--primary)"/></svg>`;
}
function bodyHtml() {
  const w = series('weight'), cur = w.at(-1), prev = w.at(-2), first = w[0];
  const wa = series('waist'), wl = wa.at(-1), wp = wa.at(-2), bf = series('bf').at(-1);
  const dl = (a, b, k, u) => a && b && a !== b ? deltaHtml(k, Math.round((a.y - b.y) * 100) / 100, u) : '–';
  return `<section class="panel" aria-labelledby="body-title">
    <div class="panel-head"><div><div class="eyebrow">Tubuh</div><h2 id="body-title">Metrik tubuh</h2></div><button class="btn ghost sm" data-go="ukuran">Riwayat</button></div>
    <div class="body-main">
      <div><div class="big num">${cur ? fmtN(cur.y) : '–'}<small>kg</small></div><div class="muted small">${cur ? 'Berat · ' + fmtD(cur.d) : 'Belum ada catatan berat'}</div></div>
      ${sparkline(w.slice(-14))}
    </div>
    <dl class="body-dl">
      <div><dt>vs sebelumnya</dt><dd>${dl(cur, prev, 'weight', 'kg')}${prev ? ` <small class="muted">(${fmtN(prev.y)} · ${fmtD(prev.d)})</small>` : ''}</dd></div>
      <div><dt>Sejak awal</dt><dd>${dl(cur, first, 'weight', 'kg')}</dd></div>
      <div><dt>Pinggang</dt><dd>${wl ? `<b>${fmtN(wl.y)} cm</b> ${wp ? dl(wl, wp, 'waist', 'cm') : ''}` : '<span class="muted">Belum diukur · ukur tiap Senin pagi</span>'}</dd></div>
      ${bf ? `<div><dt>Lemak tubuh</dt><dd><b>${fmtN(bf.y)}%</b> <small class="muted">${fmtD(bf.d)}</small></dd></div>` : ''}
    </dl>
  </section>`;
}

function bestStreak() {
  const ds = Object.keys(S.days).filter(d => { const k = dayKinds(d); return k.h || k.g; }).sort();
  let best = 0, run = 0, prev = null;
  ds.forEach(d => { run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; });
  return best;
}
const displayName = (key, fallback) => { for (const tp of Object.values(S.plan.templates)) { const x = tp.ex.find(x => canon(x.n) === key); if (x) return x.n; } return fallback; };
function achievementsHtml() {
  const since = iso(addDays(new Date(), -14)), cards = [];
  for (const [key, g] of exerciseHistory()) {
    const r = g.recs; if (r.length < 2 || r.at(-1).d < since) continue;
    if (r.at(-1).u === 'menit' || /stretch|mobil|cat-cow|hip circle|leg swing|child|jalan|treadmill|pose/.test(key)) continue;   // warm-ups are not records
    const assisted = /assisted/.test(key);
    const better = (a, b) => a.w && b.w ? ((assisted ? a.w < b.w : a.w > b.w) || (a.w === b.w && a.r > b.r)) : (!a.w && !b.w ? a.r > b.r : false);
    const last = r.at(-1), prev = r.slice(0, -1);
    if (!prev.every(p => better(last, p))) continue;
    const best = prev.reduce((m, p) => better(p, m) ? p : m, prev[0]);
    const txt = x => x.w ? `${fmtN(x.w)} kg × ${x.r}` : `${x.r} ${x.u}`;
    cards.push({ d: last.d, html: `<article class="ach pr"><span class="ach-tag">PR baru · ${fmtD(last.d)}</span><h3>${esc(displayName(key, g.n))}</h3><p><b>${txt(last)}</b> <span class="muted">dari ${txt(best)}</span></p></article>` });
  }
  cards.sort((a, b) => a.d < b.d ? 1 : -1);
  const out = cards.slice(0, 4).map(c => c.html);
  const cur = streak(), best = bestStreak(), wc = weekCounts(weekStart(new Date())), tg = gymTarget();
  const sessions = Object.keys(S.days).reduce((a, d) => { const k = dayKinds(d); return a + (k.h ? 1 : 0) + (k.g ? 1 : 0); }, 0);
  if (cur) out.push(`<article class="ach"><span class="ach-tag">Streak</span><h3>${cur} hari berturut-turut</h3><p class="muted">Rekor: ${best} hari</p></article>`);
  if (wc.g >= tg) out.push(`<article class="ach"><span class="ach-tag">Minggu ini</span><h3>Target gym ${wc.g}/${tg} tercapai</h3><p class="muted">Sisanya cukup jaga pemulihan.</p></article>`);
  out.push(`<article class="ach"><span class="ach-tag">Total</span><h3>${sessions} sesi tercatat</h3><p class="muted">Sejak ${S.profile && S.profile.startDate ? fmtD(S.profile.startDate) : 'awal'}</p></article>`);
  return `<section class="panel" aria-labelledby="ach-title"><div class="panel-head"><div><div class="eyebrow">Progres</div><h2 id="ach-title">Pencapaian</h2></div>
    <span class="muted small">PR = set terbaik baru dalam 14 hari terakhir</span></div><div class="achs">${out.join('')}</div></section>`;
}

function consistencyHtml() {
  const t = todayIso(), start = addDays(weekStart(new Date()), -11 * 7);
  let s0 = iso(start); if (S.profile && S.profile.startDate && S.profile.startDate > s0) s0 = S.profile.startDate;
  let days = 0, active = 0;
  for (let d = parseD(s0); iso(d) <= t; d = addDays(d, 1)) { days++; const k = dayKinds(iso(d)); if (k.h || k.g) active++; }
  let s4 = 0; for (let i = 0; i < 4; i++) { const c = weekCounts(addDays(weekStart(new Date()), -7 * i)); s4 += c.h + c.g; }
  const stat = (v, l) => `<div class="cstat"><b class="num">${v}</b><span>${l}</span></div>`;
  return `<section class="panel" aria-labelledby="cons-title">
    <div class="panel-head"><div><div class="eyebrow">Konsistensi</div><h2 id="cons-title">12 minggu terakhir</h2></div>
      <div class="legend"><span><i class="sw" style="background:var(--home)"></i>Rumah</span><span><i class="sw" style="background:var(--gym)"></i>Gym</span><span><i class="sw" style="background:linear-gradient(135deg,var(--home) 50%,var(--gym) 50%)"></i>Keduanya</span><span><i class="sw" style="background:var(--cell)"></i>Kosong</span></div></div>
    <div class="cstats">${stat(Math.round(active / Math.max(1, days) * 100) + '%', 'hari aktif')}${stat(streak(), 'streak sekarang')}${stat(bestStreak(), 'streak terbaik')}${stat(fmtN(s4 / 4, 1), 'sesi / minggu (4 mg)')}</div>
    <div class="heat-wrap"><div class="heat-days">${['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map(x => `<span>${x}</span>`).join('')}</div><div class="heat" id="heat"></div></div>
  </section>`;
}

function renderOverview() {
  const el = $('#tab-ringkasan');
  if (!S.loaded) { el.innerHTML = `<div class="panel muted">Memuat data latihan…</div>`; return; }
  const p = S.profile, t = todayIso();
  const ws = weekStart(new Date());
  const w = series('weight').at(-1), bmi = w && p && p.height ? w.y / ((p.height / 100) ** 2) : null;

  let html = '';
  if (!p || !p.base || p.base.weight == null) {
    html += `<div class="empty-hero"><span class="eyebrow">Langkah pertama</span><h2>Isi ukuran awal kamu</h2>
      <p>Berat, lingkar pinggang, dada, lengan, dan hasil tes push-up/plank menjadi titik nol. Semua progres di halaman ini dibandingkan dengan angka itu.</p>
      <div class="row"><button class="btn" data-go="ukuran">Isi data awal</button><button class="btn ghost" data-go="menu">Lihat menu mingguan</button></div></div>`;
  }
  if (!S.planFromSheet) {
    html = `<section class="panel onboard" aria-labelledby="ob-title"><div class="eyebrow">Dashboard baru</div><h2 id="ob-title">Atur dashboard ini</h2>
      <p class="muted">Sheet ini belum punya menu. Pilih program dasar dan warna, nanti semuanya bisa diubah di tab Menu mingguan dan Ukuran tubuh.</p>
      <label class="field"><span>Nama panggilan</span><input id="ob-name" value="${esc((p && p.name) || '')}" placeholder="Nama yang tampil di judul"></label>
      <div class="field"><span>Program dasar</span><div class="ob-opts">${Object.entries(PRESETS).map(([k, v], i) => `<label class="ob-opt"><input type="radio" name="ob-prog" value="${k}" ${i === 0 ? 'checked' : ''}><span>${esc(v.label)}</span></label>`).join('')}</div></div>
      <div class="field"><span>Warna</span><div class="ob-opts">${Object.entries(THEMES).map(([k, l], i) => `<label class="ob-opt"><input type="radio" name="ob-theme" value="${k}" ${i === 0 ? 'checked' : ''}><span><i class="sw ob-sw-${k}"></i>${l}</span></label>`).join('')}</div></div>
      <button class="btn cta" id="ob-save">Simpan & mulai</button></section>` + html;
    el.innerHTML = html; return;
  }
  html += `<div class="ov-top">${todayHtml(t)}${nextMoveHtml(t)}</div>
    <div class="grid g2 ov-gap">${weekHtml()}${bodyHtml()}</div>
    <div class="ov-gap">${achievementsHtml()}</div>
    <div class="ov-gap">${consistencyHtml()}</div>
    <div class="grid g2 ov-gap">
      <div class="panel"><div class="panel-head"><div><div class="eyebrow">Tren</div><h2>Berat badan</h2></div><span class="muted num">${bmi ? 'BMI ' + fmtN(bmi) : ''}</span></div><div class="chart" id="ch-weight"></div></div>
      <div class="panel"><div class="panel-head"><div><div class="eyebrow">Volume</div><h2>Sesi per minggu</h2></div><div class="legend"><span><i class="sw" style="background:var(--home)"></i>Rumah</span><span><i class="sw" style="background:var(--gym)"></i>Gym</span></div></div><div class="chart" id="ch-weeks"></div></div>
    </div>`;
  html += historyHtml();
  el.innerHTML = html;

  // heatmap
  const start = addDays(ws, -11 * 7); let cells = '';
  for (let i = 0; i < 84; i++) {
    const d = iso(addDays(start, i)), k = dayKinds(d);
    const c = k.h && k.g ? 'b' : k.g ? 'g' : k.h ? 'h' : '';
    cells += `<i class="${c}${d > t ? ' f' : ''}${d === t ? ' t' : ''}" title="${fmtDL(d)}${c ? ' · ' + (c === 'b' ? 'rumah + gym' : c === 'g' ? 'gym' : 'rumah') : ' · tidak ada sesi'}"></i>`;
  }
  $('#heat').innerHTML = cells;
  lineChart($('#ch-weight'), series('weight'), { color: 'var(--primary)', unit: 'kg', target: p && p.targetWeight });
  const weeks = [];
  for (let i = 7; i >= 0; i--) { const s = addDays(ws, -7 * i); const c = weekCounts(s); weeks.push({ ...c, label: `${s.getDate()} ${BULAN[s.getMonth()]}` }); }
  weeklyBars($('#ch-weeks'), weeks);
}
function onOverviewClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'ob-save') {
    const prog = (document.querySelector('input[name="ob-prog"]:checked') || {}).value || 'riyan';
    const theme = (document.querySelector('input[name="ob-theme"]:checked') || {}).value || 'navy';
    S.profile = Object.assign({}, S.profile, { program: prog, theme, name: $('#ob-name').value.trim() || (S.profile && S.profile.name) || '' });
    S.plan = PRESETS[prog].plan(); S.planFromSheet = true;
    saveProfile(); savePlan(); applyTheme(); updateHeader(); renderOverview(); return;
  }
  const t = todayIso();
  if (b.dataset.skipmove) { skipMove(t, b.dataset.skipmove); renderOverview(); return; }
  if (b.dataset.apply) {
    const kind = b.dataset.apply, i = +b.dataset.i, s = ensureDay(t)[kind]; if (!s || !s.ex[i]) return;
    const sg = suggest(s.ex[i], t, kind); if (!sg) return;
    if (sg.swap) applySwap(t, kind, i); else if (sg.t) applyRetarget(t, kind, i, sg.t); else if (sg.kg != null) applyPrefill(t, kind, i, sg.kg);
    renderOverview();
  }
}

/* ---------- HARI INI ---------- */
function applyPrefill(d, kind, i, w) { const e = ensureDay(d)[kind].ex[i]; e.kgs = e.sets.map((_, j) => kgOf(e, j) ?? w); delete e.kg; saveDay(d); }
function applyRetarget(d, kind, i, val) { const s = ensureDay(d)[kind], e = s.ex[i]; patchTemplate(s.tpl, e.n, { t: val }); e.t = val; saveDay(d); }
function applySwap(d, kind, i) {
  const s = ensureDay(d)[kind], e = s.ex[i], nx = (ladderStep(e.n, kind) || {}).next; if (!nx) return;
  const u = nx.u || e.u; patchTemplate(s.tpl, e.n, { n: nx.n, t: nx.t, u });
  s.ex[i] = { n: nx.n, s: e.s, t: nx.t, u, sets: e.sets.map(() => null), kgs: e.sets.map(() => null) };
  saveDay(d);
}
function sessionCard(kind, s, d) {
  const opts = tplList(kind).map(([k, t]) => `<option value="${k}" ${s && s.tpl === k ? 'selected' : ''}>${esc(t.name)}</option>`).join('');
  const label = kind === 'gym' ? 'Gym' : 'Kalistenik di rumah';
  let body;
  if (!s) body = `<div class="rest">${kind === 'gym' ? 'Hari ini bukan jadwal gym. Pilih menu di atas kalau tetap ke gym.' : 'Hari istirahat. Pilih menu di atas kalau mau tetap latihan.'}</div>`;
  else body = s.ex.map((e, i) => {
    const last = lastPerformance(e.n, d);
    const withKg = isWeighted(e, kind);
    const sg = suggest(e, d, kind), tg = parseTarget(e.t);
    const sets = e.sets.map((v, j) => { const w = kgOf(e, j);
      const defR = last && last.e.sets[j] > 0 ? last.e.sets[j] : tg ? tg.hi : null;
      const defW = sg && sg.kg ? sg.kg : last ? kgOf(last.e, j) || kgOf(last.e, 0) : null;
      return `<div class="set ${v > 0 ? 'filled' : ''}"><span class="sn">S${j + 1}</span><input id="t-${kind}-${i}-${j}" type="number" inputmode="decimal" min="0" step="1" data-k="${kind}" data-i="${i}" data-j="${j}" value="${v ?? ''}" aria-label="${esc(e.n)} set ${j + 1} (${e.u})"${pkAttr(UNIT_PK[e.u] || UNIT_PK.reps, `${e.n} · set ${j + 1}`, e.u, defR)}>${withKg ? `<span>×</span><input class="w" id="t-${kind}-${i}-${j}-kg" type="number" inputmode="decimal" min="0" step="0.1" data-k="${kind}" data-i="${i}" data-kgj="${j}" value="${w ?? ''}" placeholder="kg" aria-label="${esc(e.n)} set ${j + 1} beban kg"${pkAttr(KG_PK, `${e.n} · beban set ${j + 1}`, 'kg', defW)}><span>kg</span>` : `<span class="u">${e.u}</span>`}<button class="set-ok" data-quick="${kind}" data-i="${i}" data-j="${j}" aria-pressed="${v > 0}" aria-label="Set ${j + 1} ${v > 0 ? 'selesai, ketuk untuk batal' : 'tandai selesai'}">✓</button></div>`; }).join('');
    const add = `<button class="icon-btn" data-addset="${kind}" data-i="${i}" aria-label="Tambah set ${esc(e.n)}" title="Tambah set">+</button>`;
    const uopts = (kind === 'gym' ? [['reps|1', 'reps × kg'], ['reps|0', 'reps saja']] : [['reps|0', 'reps']]).concat([['detik|0', 'detik'], ['menit|0', 'menit']]);
    const ucur = `${e.u}|${withKg ? 1 : 0}`;
    const pool = [e.n, ...(e.alt || [])];
    const tools = `<div class="ex-tools">
        ${pool.length > 1 ? `<select id="t-${kind}-${i}-var" data-variant="${kind}" data-i="${i}" aria-label="Variasi ${esc(e.n)}">${pool.map(n => `<option ${n === e.n ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>` : ''}
        <select id="t-${kind}-${i}-unit" data-unit="${kind}" data-i="${i}" aria-label="Satuan ${esc(e.n)}">${uopts.map(([v, l]) => `<option value="${v}" ${v === ucur ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <button class="icon-btn" data-rmex="${kind}" data-i="${i}" aria-label="Lewati ${esc(e.n)} hari ini" title="Lewati hari ini">×</button></div>`;
    const nDone = e.sets.filter(v => v > 0).length, allDone = nDone > 0 && nDone === e.sets.length;
    return `<div class="ex${allDone ? ' ex-done' : ''}"><span class="pic">${picto(e.n)}</span><div class="ex-body"><div class="ex-head"><span class="ex-name">${allDone ? '<span class="ok-dot" aria-hidden="true">✓</span>' : ''}${esc(e.n)}</span><span class="ex-target">${e.s} × ${esc(e.t)} ${withKg ? 'reps · kg' : e.u}</span></div>
      <div class="ex-prog"><span class="num">${nDone}/${e.sets.length} set</span></div>
      ${tools}
      <div class="ex-sets">${sets}${add}</div>
      <div class="ex-last">${last ? `Terakhir ${fmtD(last.d)}: <b>${perfText(last.e)}</b> ${hasKg(last.e) ? 'reps × kg' : e.u}` : 'Belum ada catatan sebelumnya'}</div>
      ${coachHtml(sg, kind, i)}</div></div>`;
  }).join('') + `<div class="add-ex"><input id="t-${kind}-newex" list="ex-names" placeholder="Tambah gerakan, mis. Incline Push-up" aria-label="Nama gerakan baru">
      <button class="btn ghost sm" data-addex="${kind}">+ Tambah</button>
      <label class="chk"><input type="checkbox" id="t-${kind}-newex-save" checked> simpan juga ke menu</label></div>`;
  const foot = s ? `<div class="session-foot"><label class="field"><span>Durasi (menit)</span><input id="t-${kind}-min" type="number" inputmode="numeric" min="0" data-k="${kind}" data-min="1" value="${s.min ?? ''}"${pkAttr([0, 180, 1], 'Durasi sesi', 'menit', 45)}></label>
      <button class="btn ghost toggle-done" data-done="${kind}" aria-pressed="${!!s.done}">${s.done ? 'Selesai ✓' : 'Tandai selesai'}</button></div>` : '';
  const sp = s ? `<div class="sess-prog"><div class="bar ${kind}"><i style="width:${totalSets(s) ? Math.round(filledSets(s) / totalSets(s) * 100) : 0}%"></i></div>
      <span class="num">${filledSets(s)}/${totalSets(s)} set · ±${estMinutes(s, kind)} menit</span></div>` : '';
  return `<div class="panel session ${kind}"><div class="panel-head"><div><div class="kind">${label}</div><h2>${s && S.plan.templates[s.tpl] ? esc(S.plan.templates[s.tpl].name) : 'Tidak ada sesi'}</h2></div>${s ? `<span class="state ${sessionState(s)}">${STATE_TXT[sessionState(s)]}</span>` : ''}</div>
    ${sp}
    <div class="session-tools"><select id="t-${kind}-tpl" data-tpl="${kind}" aria-label="Ganti menu ${label}"><option value="">${kind === 'gym' ? 'Tidak ke gym' : 'Istirahat'}</option>${opts}</select></div>
    ${body}${foot}</div>`;
}
function renderToday() {
  const el = $('#tab-hariini');
  if (!S.loaded) { el.innerHTML = `<div class="panel muted">Memuat…</div>`; return; }
  const d = S.date, v = dayView(d), t = todayIso();
  const m = v.m || {};
  const mfield = x => `<label class="field"><span>${x.l}${uL(x)}</span><input id="m-${x.k}" type="number" inputmode="decimal" step="0.1" data-m="${x.k}" value="${m[x.k] ?? ''}"${pkAttr(pkFor(x.k), x.l, x.u, latestOf(x.k))}></label>`;
  const komp = METRICS.filter(x => x.g === 'komp');
  const mf = METRICS.filter(x => !x.g).map(mfield).join('');
  const kompHtml = `<details class="komp" ${komp.some(x => m[x.k] != null) ? 'open' : ''}><summary>Komposisi tubuh (timbangan pintar / InBody)</summary><div class="fields">${komp.map(mfield).join('')}</div></details>`;
  el.innerHTML = `<div class="daybar">
      <button class="icon-btn" data-shift="-1" aria-label="Hari sebelumnya">‹</button>
      <span class="date">${fmtDL(d)}</span>
      <button class="icon-btn" data-shift="1" aria-label="Hari berikutnya">›</button>
      <input id="t-date" type="date" value="${d}" aria-label="Pilih tanggal">
      ${d !== t ? `<button class="btn ghost sm" data-shift="0">Ke hari ini</button>` : '<span class="pill">hari ini</span>'}
    </div>
    <datalist id="ex-names">${[...new Set(Object.values(S.plan.templates).flatMap(t => t.ex.map(x => x.n)).concat(LADDERS.flat().map(x => x.n)))].sort().map(n => `<option value="${esc(n)}"></option>`).join('')}</datalist>
    <div class="grid g2" style="margin-bottom:16px">${!v.home && !Object.values(S.plan.week).some(w => w.home)
      ? `${sessionCard('gym', v.gym, d)}<details class="opt-home"><summary>+ Sesi di rumah (opsional)</summary>${sessionCard('home', v.home, d)}</details>`
      : sessionCard('home', v.home, d) + sessionCard('gym', v.gym, d)}</div>
    <div class="grid g2">
      <div class="panel"><div class="panel-head"><div><div class="eyebrow">Opsional · isi kapan saja</div><h2>Ukuran hari ini</h2></div></div>
        <div class="fields">${mf}</div>${kompHtml}
        <p class="muted" style="font-size:13px;margin-bottom:0">Timbang pagi setelah ke toilet dan sebelum makan. Ukur lingkar tubuh seminggu sekali sudah cukup; berat harian naik-turun 0,5–1 kg itu wajar.</p></div>
      <div class="panel"><div class="panel-head"><div><div class="eyebrow">Pemulihan</div><h2>Kondisi badan</h2></div></div>
        <div class="grid">
          <div class="field"><span>Energi (1 = lemas, 5 = prima)</span><div class="seg" role="group" aria-label="Energi">${[1,2,3,4,5].map(n => `<button data-energy="${n}" aria-pressed="${v.energy === n}">${n}</button>`).join('')}</div></div>
          <label class="field" style="max-width:160px"><span>Tidur (jam)</span><input id="t-sleep" type="number" inputmode="decimal" step="0.5" min="0" max="24" data-sleep="1" value="${v.sleep ?? ''}"${pkAttr([0, 14, 0.5], 'Tidur', 'jam', 7)}></label>
          <label class="field"><span>Catatan</span><textarea id="t-note" data-note="1" placeholder="Contoh: bahu kanan agak pegal, pull-up masih pakai band hijau">${esc(v.note || '')}</textarea></label>
          ${presetOf().notes ? `<div class="tip safety">${esc(presetOf().notes)}</div>` : ''}
          <div class="tip"><b>Aturan progresi.</b> Mudah dan teknik bagus: tambah 1–2 reps atau pakai variasi lebih sulit (knee → incline → negative → full push-up; squat → pause → split → Bulgarian split squat). Sedang: pertahankan. Berat atau teknik turun: kurangi reps atau set. Nyeri tajam atau nyeri sendi: hentikan gerakannya. Target RPE sekitar 7/10. Untuk gym, naikkan beban 2,5–5% setelah semua set mencapai batas atas target.</div>
        </div></div>
    </div>`;
}
function onTodayInput(e) {
  const x = e.target, d = S.date;
  if (x.id === 't-date') { if (x.value) { S.date = x.value; renderToday(); } return; }
  if (x.dataset.tpl !== undefined && e.type === 'change') {
    const day = ensureDay(d), k = x.dataset.tpl;
    day[k] = x.value ? buildSession(x.value, day[k]) : null; saveDay(d); renderToday(); return;
  }
  if (x.dataset.unit !== undefined) { if (e.type !== 'change') return;
    const s = ensureDay(d)[x.dataset.unit], it = s.ex[+x.dataset.i], [u, w] = x.value.split('|');
    if (u !== it.u) it.t = UNIT_DEF_T[u];
    it.u = u; it.w = w === '1'; it.kgs = it.kgs || it.sets.map((_, j) => kgOf(it, j));
    patchTemplate(s.tpl, it.n, { u: it.u, w: it.w, t: it.t }); saveDay(d); renderToday(); return; }
  if (x.dataset.variant !== undefined) { if (e.type !== 'change') return;
    const s = ensureDay(d)[x.dataset.variant], i = +x.dataset.i, it = s.ex[i], pick = x.value;
    const pool = [it.n, ...(it.alt || [])];
    const known = Object.values(S.plan.templates).flatMap(t => t.ex).find(y => sameEx(y.n, pick));
    s.ex[i] = { n: pick, s: it.s, t: known ? known.t : it.t, u: known ? known.u : it.u, w: known ? known.w : undefined,
      alt: pool.filter(n => n !== pick), sets: it.sets.map(() => null), kgs: it.sets.map(() => null) };
    saveDay(d); renderToday(); return; }
  if (x.dataset.k) {
    const day = ensureDay(d), s = day[x.dataset.k], i = +x.dataset.i;
    if (x.dataset.min) s.min = numOrNull(x.value);
    else if (x.dataset.kgj !== undefined) { const e = s.ex[i]; e.kgs = e.kgs || e.sets.map((_, j) => kgOf(e, j)); delete e.kg; e.kgs[+x.dataset.kgj] = numOrNull(x.value); }
    else s.ex[i].sets[+x.dataset.j] = numOrNull(x.value);
    const lab = x.closest('.set'); if (lab && x.dataset.j !== undefined) lab.classList.toggle('filled', numOrNull(x.value) > 0);
    saveDay(d); return;
  }
  if (x.dataset.m) { const day = ensureDay(d); day.m = day.m || {}; const n = numOrNull(x.value); if (n == null) delete day.m[x.dataset.m]; else day.m[x.dataset.m] = n; saveDay(d); return; }
  if (x.dataset.sleep) { ensureDay(d).sleep = numOrNull(x.value); saveDay(d); return; }
  if (x.dataset.note) { ensureDay(d).note = x.value; saveDay(d, 900); return; }
}
function onTodayClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.shift !== undefined) { const n = +b.dataset.shift; S.date = n === 0 ? todayIso() : iso(addDays(parseD(S.date), n)); renderToday(); return; }
  if (b.dataset.rmex) { ensureDay(S.date)[b.dataset.rmex].ex.splice(+b.dataset.i, 1); saveDay(S.date); renderToday(); return; }
  if (b.dataset.addset) { const e = ensureDay(S.date)[b.dataset.addset].ex[+b.dataset.i];
    e.kgs = e.kgs || e.sets.map((_, j) => kgOf(e, j)); delete e.kg;
    e.sets.push(null); e.kgs.push(e.kgs.length ? e.kgs[e.kgs.length - 1] : null); saveDay(S.date); renderToday(); return; }
  if (b.dataset.prefill) { applyPrefill(S.date, b.dataset.prefill, +b.dataset.i, +b.dataset.kg); renderToday(); return; }
  if (b.dataset.retarget) { applyRetarget(S.date, b.dataset.retarget, +b.dataset.i, b.dataset.val); renderToday(); return; }
  if (b.dataset.swap) { applySwap(S.date, b.dataset.swap, +b.dataset.i); renderToday(); return; }
  if (b.dataset.quick) {
    // one tap marks a set done with the most likely numbers; a second tap clears the reps
    const kind = b.dataset.quick, i = +b.dataset.i, j = +b.dataset.j, e = ensureDay(S.date)[kind].ex[i];
    e.kgs = e.kgs || e.sets.map((_, k) => kgOf(e, k)); delete e.kg;
    if (e.sets[j] > 0) e.sets[j] = null;
    else {
      const last = lastPerformance(e.n, S.date), tg = parseTarget(e.t), sg = suggest(e, S.date, kind);
      e.sets[j] = (j > 0 && e.sets[j - 1] > 0 ? e.sets[j - 1] : null) ?? (last && last.e.sets[j] > 0 ? last.e.sets[j] : null) ?? (tg ? tg.hi : 10);
      if (isWeighted(e, kind) && e.kgs[j] == null)
        e.kgs[j] = (j > 0 ? e.kgs[j - 1] : null) ?? (sg && sg.kg != null ? sg.kg : null) ?? (last ? kgOf(last.e, j) ?? kgOf(last.e, 0) : null);
    }
    saveDay(S.date); renderToday(); return; }
  if (b.dataset.addex) { const kind = b.dataset.addex, inp = $('#t-' + kind + '-newex'), n = inp.value.trim(); if (!n) { inp.focus(); return; }
    const s = ensureDay(S.date)[kind]; if (!s) return;
    const known = Object.values(S.plan.templates).flatMap(t => t.ex).find(x => sameEx(x.n, n)) || LADDERS.flat().find(x => sameEx(x.n, n));
    const u0 = (known && known.u) || guessUnit(n);
    const base = { n: known ? known.n : n, s: (known && known.s) || (u0 === 'menit' ? 1 : 3), t: (known && known.t) || UNIT_DEF_T[u0], u: u0 };
    if (known && known.w != null) base.w = known.w;
    s.ex.push({ ...base, sets: Array(base.s).fill(null), kgs: Array(base.s).fill(null) });
    if ($('#t-' + kind + '-newex-save').checked && S.plan.templates[s.tpl]) { S.plan.templates[s.tpl].ex.push({ ...base }); savePlan(); }
    saveDay(S.date); renderToday(); return; }
  if (b.dataset.done) { const day = ensureDay(S.date), s = day[b.dataset.done]; s.done = !s.done; saveDay(S.date);
    b.setAttribute('aria-pressed', s.done); b.textContent = s.done ? 'Selesai ✓' : 'Tandai selesai'; return; }
  if (b.dataset.energy) { const day = ensureDay(S.date), n = +b.dataset.energy; day.energy = day.energy === n ? null : n; saveDay(S.date);
    b.parentElement.querySelectorAll('button').forEach(o => o.setAttribute('aria-pressed', +o.dataset.energy === day.energy)); }
}

/* ---------- MENU MINGGUAN ---------- */
let armed = null;
function renderPlan() {
  const el = $('#tab-menu');
  if (!S.loaded) { el.innerHTML = `<div class="panel muted">Memuat…</div>`; return; }
  const today = new Date().getDay(), order = [1,2,3,4,5,6,0];
  const sel = (kind, cur, day) => `<select id="w-${day}-${kind}" data-week="${day}" data-kind="${kind}"><option value="">${kind === 'gym' ? '—' : 'Istirahat'}</option>${tplList(kind).map(([k, t]) => `<option value="${k}" ${cur === k ? 'selected' : ''}>${esc(t.name.replace(/^(Kalistenik|Gym) · /, ''))}</option>`).join('')}</select>`;
  const gymDays = Object.values(S.plan.week).filter(w => w.gym).length;
  const tg = gymTarget();
  const tplBlock = ([k, t]) => `<div class="tpl ${t.kind}" data-t="${k}">
      <div class="tpl-head"><span class="pill ${t.kind}">${t.kind === 'gym' ? 'Gym' : 'Rumah'}</span><input id="tp-${k}-name" data-tname="${k}" value="${esc(t.name)}" aria-label="Nama menu"><button class="btn danger sm" data-tdel="${k}">${armed === k ? 'Yakin? Klik lagi' : 'Hapus'}</button></div>
      <div class="tpl-rows">
        <div class="tpl-row labels"><span>Gerakan</span><span>Set</span><span>Target</span><span class="u">Satuan</span><span>${t.kind === 'gym' ? 'Beban' : ''}</span><span></span></div>
        ${t.ex.map((x, i) => `<div class="tpl-item"><div class="tpl-row">
          <input id="tp-${k}-${i}-n" data-tk="${k}" data-ti="${i}" data-tf="n" value="${esc(x.n)}" aria-label="Nama gerakan">
          <input id="tp-${k}-${i}-s" data-tk="${k}" data-ti="${i}" data-tf="s" type="number" min="1" max="10" value="${x.s}" aria-label="Jumlah set">
          <input id="tp-${k}-${i}-t" data-tk="${k}" data-ti="${i}" data-tf="t" value="${esc(x.t)}" aria-label="Target">
          <select class="u" id="tp-${k}-${i}-u" data-tk="${k}" data-ti="${i}" data-tf="u" aria-label="Satuan">${UNITS.map(u => `<option ${x.u === u ? 'selected' : ''}>${u}</option>`).join('')}</select>
          <span class="wchk">${t.kind === 'gym' ? `<input type="checkbox" id="tp-${k}-${i}-w" data-tk="${k}" data-ti="${i}" data-tf="w" ${isWeighted(x, 'gym') ? 'checked' : ''} aria-label="Pakai beban (kg)">` : ''}</span>
          <button class="icon-btn" data-exdel="${k}" data-i="${i}" aria-label="Hapus gerakan">×</button></div>
          ${t.kind === 'gym' ? `<input class="tpl-alt" id="tp-${k}-${i}-alt" data-tk="${k}" data-ti="${i}" data-tf="alt" value="${esc((x.alt || []).join(', '))}" placeholder="Variasi / alat pengganti, pisahkan dengan koma" aria-label="Variasi ${esc(x.n)}">` : ''}</div>`).join('')}
        <div><button class="btn ghost sm" data-exadd="${k}">+ Tambah gerakan</button></div>
      </div></div>`;
  el.innerHTML = `<div class="panel" style="margin-bottom:16px">
      <div class="panel-head"><div><div class="eyebrow">Jadwal</div><h2>Susunan minggu</h2></div>
        <div class="row"><span class="muted" style="font-size:13px">Target gym per minggu</span><div class="seg" role="group" aria-label="Target gym">${[3,4].map(n => `<button data-gt="${n}" aria-pressed="${tg === n}">${n}×</button>`).join('')}</div></div></div>
      <div class="week">${order.map(d => { const w = S.plan.week[d] || {}; return `<div class="wday ${d === today ? 'today' : ''}">
        <h3>${HARI[d]} ${w.gym ? '<span class="pill gym">gym</span>' : ''}</h3>
        <label class="h">Rumah ${sel('home', w.home, d)}</label>
        <label class="g">Gym ${sel('gym', w.gym, d)}</label></div>`; }).join('')}</div>
      <p class="muted" style="font-size:13px;margin-bottom:0">${gymDays} hari gym terjadwal${gymDays !== tg ? ` · target kamu ${tg}×, sesuaikan jadwalnya` : ''}. Program dasar: ${esc(presetOf().label)}. Kolom <b>Variasi</b> di menu gym berisi alat pengganti yang bisa dipilih langsung di tab Hari ini.</p>
    </div>
    <div class="panel-head"><div><div class="eyebrow">Perpustakaan</div><h2>Isi menu</h2></div>
      <div class="row"><button class="btn sm" data-tadd="home">+ Menu rumah</button><button class="btn sm" data-tadd="gym">+ Menu gym</button><button class="btn danger sm" data-reset="1">${armed === '__reset' ? 'Yakin? Klik lagi' : 'Kembalikan program awal'}</button></div></div>
    <p class="muted" style="font-size:13px;margin-top:0">Perubahan menu berlaku untuk hari yang belum dicatat. Catatan yang sudah tersimpan tidak berubah.</p>
    <div class="grid g2">${Object.entries(S.plan.templates).sort((a, b) => a[1].kind === b[1].kind ? 0 : a[1].kind === 'home' ? -1 : 1).map(tplBlock).join('')}</div>`;
}
function onPlanInput(e) {
  const x = e.target;
  if (x.dataset.week !== undefined) { S.plan.week[x.dataset.week][x.dataset.kind] = x.value || null; savePlan(); if (e.type === 'change') renderPlan(); return; }
  if (x.dataset.tname) { S.plan.templates[x.dataset.tname].name = x.value; savePlan(); return; }
  if (x.dataset.tk) {
    const it = S.plan.templates[x.dataset.tk].ex[+x.dataset.ti], f = x.dataset.tf;
    if (f === 'w') it.w = x.checked;
    else if (f === 'alt') { const a = x.value.split(',').map(v => v.trim()).filter(Boolean); if (a.length) it.alt = a; else delete it.alt; }
    else it[f] = f === 's' ? Math.max(1, Math.min(10, parseInt(x.value) || 1)) : x.value;
    savePlan();
  }
}
function onPlanClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  const D = b.dataset;
  if (D.gt) { S.profile = S.profile || {}; S.profile.gymTarget = +D.gt; saveProfile(); renderPlan(); return; }
  if (D.exadd) { S.plan.templates[D.exadd].ex.push(ex('Gerakan baru', 3, '10')); savePlan(); armed = null; renderPlan(); return; }
  if (D.exdel) { S.plan.templates[D.exdel].ex.splice(+D.i, 1); savePlan(); armed = null; renderPlan(); return; }
  if (D.tadd) { const k = 't' + Date.now().toString(36); S.plan.templates[k] = { name: D.tadd === 'gym' ? 'Gym · Menu baru' : 'Kalistenik · Menu baru', kind: D.tadd, ex: [ex('Gerakan baru', 3, '10')] }; savePlan(); armed = null; renderPlan(); return; }
  if (D.tdel) {
    if (armed !== D.tdel) { armed = D.tdel; renderPlan(); return; }
    delete S.plan.templates[D.tdel]; Object.values(S.plan.week).forEach(w => { if (w.home === D.tdel) w.home = null; if (w.gym === D.tdel) w.gym = null; });
    armed = null; savePlan(); renderPlan(); return;
  }
  if (D.reset) { if (armed !== '__reset') { armed = '__reset'; renderPlan(); return; } S.plan = presetOf().plan(); armed = null; savePlan(); renderPlan(); }
}

/* ---------- UKURAN ---------- */
function renderMeasure() {
  const el = $('#tab-ukuran');
  if (!S.loaded) { el.innerHTML = `<div class="panel muted">Memuat…</div>`; return; }
  const p = S.profile || {}, b = p.base || {};
  const defStart = iso(addDays(new Date(), -30));
  const baseFields = METRICS.map(x => `<label class="field"><span>${x.l}${uL(x)}</span><input id="b-${x.k}" type="number" inputmode="decimal" step="0.1" data-base="${x.k}" value="${b[x.k] ?? ''}"${pkAttr(pkFor(x.k), x.l + ' (awal)', x.u, latestOf(x.k))}></label>`).join('');
  const used = METRICS.filter(x => b[x.k] != null || Object.values(S.days).some(d => d.m && d.m[x.k] != null));
  const cols = used.length ? used : METRICS.filter(x => !x.g);
  if (!cols.some(x => x.k === S.chartMetric)) S.chartMetric = cols[0].k;
  const mk = S.chartMetric, mm = metric(mk), s = series(mk);
  const first = s[0], last = s.at(-1);
  // history rows: dates with any measurement
  const rows = Object.keys(S.days).filter(d => S.days[d].m && Object.keys(S.days[d].m).length).sort().reverse();
  const cell = (k, v) => v == null ? '<td class="muted">–</td>' : `<td>${fmtN(v)}${b[k] != null ? `<small>${deltaHtml(k, Math.round((v - b[k]) * 10) / 10, '')}</small>` : ''}</td>`;
  el.innerHTML = `<div class="grid g2" style="margin-bottom:16px">
    <div class="panel"><div class="panel-head"><div><div class="eyebrow">Profil</div><h2>Data diri & tujuan</h2></div></div>
      <div class="fields">
        <label class="field"><span>Nama panggilan</span><input id="p-name" data-p="name" value="${esc(p.name || '')}"></label>
        <label class="field"><span>Tanggal mulai latihan</span><input id="p-start" type="date" data-p="startDate" value="${p.startDate || ''}" placeholder="${defStart}"></label>
        <label class="field"><span>Tinggi badan (cm)</span><input id="p-height" type="number" inputmode="decimal" data-p="height" data-num="1" value="${p.height ?? ''}"${pkAttr([120, 220, 0.5], 'Tinggi badan', 'cm', 165)}></label>
        <label class="field"><span>Target berat (kg)</span><input id="p-target" type="number" inputmode="decimal" step="0.1" data-p="targetWeight" data-num="1" value="${p.targetWeight ?? ''}"${pkAttr([40, 150, 0.5], 'Target berat', 'kg', latestOf('weight'))}></label>
        <label class="field"><span>Warna tampilan</span><select id="p-theme" data-p="theme">${Object.entries(THEMES).map(([k, l]) => `<option value="${k}" ${(p.theme || 'navy') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field"><span>Program dasar</span><select id="p-program" data-p="program">${Object.entries(PRESETS).map(([k, v]) => `<option value="${k}" ${(p.program || 'riyan') === k ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></label>
        <label class="field" style="grid-column:1/-1"><span>Tujuan utama</span><select id="p-goal" data-p="goal">${Object.entries(GOALS).map(([k, l]) => `<option value="${k}" ${(p.goal || 'recomp') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>
      <p class="muted" style="font-size:13px;margin-bottom:0">Tujuan menentukan warna perubahan berat: hijau kalau bergerak ke arah yang kamu mau. Untuk rekomposisi, berat dibiarkan netral dan yang dipantau pinggang serta lengan.</p></div>
    <div class="panel"><div class="panel-head"><div><div class="eyebrow">Titik nol · ${p.startDate ? fmtD(p.startDate) : 'tanggal mulai'}</div><h2>Ukuran awal</h2></div></div>
      <div class="fields">${baseFields}</div>
      <p class="muted" style="font-size:13px;margin-bottom:0">Ukur lingkar dengan pita kain, posisi berdiri rileks: pinggang setinggi pusar, lengan di bagian terbesar (tidak ditekuk), paha 15 cm di atas lutut.</p></div>
  </div>
  <div class="panel" style="margin-bottom:16px">
    <div class="panel-head"><div><div class="eyebrow">Grafik</div><h2>${mm.l}</h2></div>
      <span class="num muted">${first && last && s.length > 1 ? `${fmtN(first.y)} → <b style="color:var(--ink)">${fmtN(last.y)} ${mm.u}</b> (${deltaHtml(mk, last.y - first.y, mm.u)})` : ''}</span></div>
    <div class="row" style="margin-bottom:12px"><div class="seg" role="group" aria-label="Pilih ukuran" style="flex-wrap:wrap">${cols.map(x => `<button data-cm="${x.k}" aria-pressed="${x.k === mk}">${shortL(x)}</button>`).join('')}</div></div>
    <div class="chart" id="ch-metric"></div>
  </div>
  <div class="panel"><div class="panel-head"><div><div class="eyebrow">Riwayat</div><h2>Semua catatan ukuran</h2></div><span class="muted" style="font-size:13px">Angka kecil = selisih dari ukuran awal</span></div>
    <div class="table-wrap"><table><thead><tr><th>Tanggal</th>${cols.map(x => `<th>${shortL(x)}${uL(x)}</th>`).join('')}</tr></thead><tbody>
      ${rows.map(d => `<tr><td>${fmtD(d)} ${parseD(d).getFullYear()}</td>${cols.map(x => cell(x.k, S.days[d].m[x.k])).join('')}</tr>`).join('')}
      ${Object.keys(b).length ? `<tr class="base"><td>Awal${p.startDate ? ' · ' + fmtD(p.startDate) : ''}</td>${cols.map(x => `<td>${fmtN(b[x.k])}</td>`).join('')}</tr>` : ''}
      ${!rows.length && !Object.keys(b).length ? `<tr><td colspan="${cols.length + 1}" class="muted" style="text-align:left">Belum ada catatan. Isi ukuran awal di atas, lalu catat ukuran harian di tab Hari ini.</td></tr>` : ''}
    </tbody></table></div></div>`;
  lineChart($('#ch-metric'), s, { color: 'var(--primary)', unit: mm.u, target: mk === 'weight' ? p.targetWeight : null });
}
function onMeasureInput(e) {
  const x = e.target;
  if (x.dataset.p) { S.profile = S.profile || {}; S.profile[x.dataset.p] = x.dataset.num ? numOrNull(x.value) : x.value; saveProfile(); updateHeader(); if (x.dataset.p === 'theme') applyTheme(); return; }
  if (x.dataset.base) { S.profile = S.profile || {}; S.profile.base = S.profile.base || {}; const n = numOrNull(x.value);
    if (n == null) delete S.profile.base[x.dataset.base]; else S.profile.base[x.dataset.base] = n;
    if (!S.profile.startDate) S.profile.startDate = iso(addDays(new Date(), -30));
    saveProfile(); }
}

/* ---------- shell ---------- */
function updateHeader() {
  const p = S.profile;
  const h = new Date().getHours(), part = h < 11 ? 'pagi' : h < 15 ? 'siang' : h < 18 ? 'sore' : 'malam';
  $('#hdr-eyebrow').textContent = `Selamat ${part}${p && p.name ? ', ' + p.name : ''}`;
  $('#hdr-title').textContent = p && p.name ? `${p.name} Workout Dash` : 'Workout Dash';
  document.title = $('#hdr-title').textContent;
  const t = todayIso(), dt = parseD(t);
  $('#hdr-sub').textContent = !S.loaded ? 'Memuat data…' : `${HARI3[dt.getDay()]}, ${fmtD(t)}${p && p.startDate ? ` · Hari ke-${daysBetween(p.startDate, t) + 1}` : ''}`;
}
const RENDER = { ringkasan: renderOverview, hariini: renderToday, menu: renderPlan, ukuran: renderMeasure };
function show(tab) {
  if (!RENDER[tab]) tab = 'ringkasan';
  S.tab = tab; armed = null;
  document.querySelectorAll('nav.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === tab));
  document.querySelectorAll('[data-panel]').forEach(s => s.hidden = s.dataset.panel !== tab);
  RENDER[tab]();
  try { history.replaceState(null, '', '#' + tab); } catch {}
}
document.querySelector('nav.tabs').addEventListener('click', e => { const b = e.target.closest('button[data-tab]'); if (b) show(b.dataset.tab); });
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (!g) return;
  show(g.dataset.go); window.scrollTo({ top: 0 });
  const f = g.dataset.focus && document.querySelector('#tab-hariini .session.' + g.dataset.focus);
  if (f && S.date === todayIso()) f.scrollIntoView({ block: 'start' });
});
$('#tab-ringkasan').addEventListener('click', onOverviewClick);
$('#tab-ringkasan').addEventListener('change', e => { if (e.target.name === 'ob-theme') document.documentElement.dataset.color = e.target.value; });
const tToday = $('#tab-hariini'); tToday.addEventListener('input', onTodayInput); tToday.addEventListener('change', onTodayInput); tToday.addEventListener('click', onTodayClick);
const tPlan = $('#tab-menu'); tPlan.addEventListener('input', onPlanInput); tPlan.addEventListener('change', e => { if (e.target.dataset.week !== undefined) onPlanInput(e); }); tPlan.addEventListener('click', onPlanClick);
const tMeas = $('#tab-ukuran'); tMeas.addEventListener('input', onMeasureInput); tMeas.addEventListener('change', e => { if (e.target.dataset.p === 'goal' || e.target.dataset.p === 'startDate') { onMeasureInput(e); } });
tMeas.addEventListener('click', e => { const b = e.target.closest('button[data-cm]'); if (b) { S.chartMetric = b.dataset.cm; renderMeasure(); } });
// re-render the metric panel when leaving a baseline field so the table and chart catch up
tMeas.addEventListener('focusout', e => { if (e.target.dataset.base || e.target.dataset.num) setTimeout(() => { if (!tMeas.contains(document.activeElement) || document.activeElement === document.body) renderMeasure(); }, 0); });
let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (S.tab === 'ringkasan' || S.tab === 'ukuran') RENDER[S.tab](); }, 200); });


/* ---------- scroll picker: tap a number field, slide the wheel, no keyboard ---------- */
const picker = (() => {
  const el = document.createElement('div');
  el.className = 'picker'; el.hidden = true;
  el.innerHTML = `<div class="pk-backdrop" data-pk="cancel"></div>
    <div class="pk-sheet" role="dialog" aria-modal="true" aria-label="Pilih angka">
      <div class="pk-grab"></div>
      <div class="pk-head"><span class="pk-title"></span><span class="pk-val"></span></div>
      <div class="pk-wrap"><div class="pk-band"></div><div class="pk-wheel" tabindex="0" aria-label="Geser untuk memilih angka"></div></div>
      <div class="pk-steps"><button data-pk="-10">−10</button><button data-pk="-1">−</button><button data-pk="1">+</button><button data-pk="10">+10</button></div>
      <div class="pk-actions"><button class="btn ghost sm" data-pk="manual">Ketik manual</button><button class="btn ghost sm" data-pk="clear">Kosongkan</button><span class="spacer"></span>
        <button class="btn ghost" data-pk="ok">Simpan</button><button class="btn" data-pk="next">Lanjut ›</button></div>
    </div>`;
  document.body.appendChild(el);
  const wheel = el.querySelector('.pk-wheel'), valEl = el.querySelector('.pk-val'), titleEl = el.querySelector('.pk-title'), nextBtn = el.querySelector('[data-pk="next"]');
  const H = 44, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let vals = [], idx = 0, target = null, dp = 0, unit = '', raf = 0;
  const fmt = v => v.toLocaleString('id-ID', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const live = inp => inp && (inp.isConnected ? inp : document.getElementById(inp.id));
  function mark() {
    const i = Math.max(0, Math.min(vals.length - 1, Math.round(wheel.scrollTop / H)));
    if (wheel.children[idx]) wheel.children[idx].classList.remove('on');
    idx = i; if (wheel.children[i]) wheel.children[i].classList.add('on');
    valEl.textContent = fmt(vals[idx]) + (unit ? ' ' + unit : '');
  }
  function go(i, smooth) {
    i = Math.max(0, Math.min(vals.length - 1, i));
    wheel.scrollTo({ top: i * H, behavior: smooth && !reduce ? 'smooth' : 'auto' });
    if (!smooth) mark();
  }
  // inputs of the same kind earlier in the row (S1 → S2 …) seed the starting value
  function prevValue(inp) {
    const row = inp.closest('.ex-sets'); if (!row) return null;
    const same = [...row.querySelectorAll(inp.dataset.kgj !== undefined ? 'input[data-kgj]' : 'input[data-j]')];
    for (let k = same.indexOf(inp) - 1; k >= 0; k--) { const v = numOrNull(same[k].value); if (v != null) return v; }
    return null;
  }
  function nextInput(inp) {
    const scope = inp.closest('.ex, .fields, .session-foot'); if (!scope) return null;
    const all = [...scope.querySelectorAll('input[data-pick]')]; return all[all.indexOf(inp) + 1] || null;
  }
  function open(inp) {
    target = inp;
    const [mn, mx, st] = inp.dataset.pick.split(',').map(Number);
    unit = inp.dataset.pickUnit || ''; dp = (String(st).split('.')[1] || '').length;
    vals = Array.from({ length: Math.round((mx - mn) / st) + 1 }, (_, i) => +(mn + i * st).toFixed(dp));
    wheel.innerHTML = vals.map((v, i) => `<div class="pk-i" data-i="${i}">${fmt(v)}</div>`).join('');
    titleEl.textContent = inp.dataset.pickLabel || '';
    let cur = numOrNull(inp.value); if (cur == null) cur = prevValue(inp); if (cur == null) cur = numOrNull(inp.dataset.def); if (cur == null) cur = mn;
    nextBtn.hidden = !nextInput(inp);
    el.querySelector('[data-pk="ok"]').className = nextBtn.hidden ? 'btn' : 'btn ghost';
    el.hidden = false; document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => { go(Math.round((cur - mn) / st), false); wheel.focus({ preventScroll: true }); });
  }
  function close() { el.hidden = true; document.documentElement.style.overflow = ''; target = null; }
  function write(v) {
    const t = live(target); if (!t) return null;
    t.value = v == null ? '' : String(v);
    t.dispatchEvent(new Event('input', { bubbles: true }));
    return t;
  }
  function done(t) { if (S.tab === 'ukuran' && t && t.closest('#tab-ukuran')) renderMeasure(); }
  wheel.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(mark); }, { passive: true });
  wheel.addEventListener('click', e => { const it = e.target.closest('.pk-i'); if (it) go(+it.dataset.i, true); });
  wheel.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); go(idx + (e.key === 'ArrowDown' ? 1 : -1), true); }
    else if (e.key === 'Enter') { e.preventDefault(); el.querySelector('[data-pk="ok"]').click(); }
    else if (e.key === 'Escape') close();
  });
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-pk]'); if (!b) return;
    const a = b.dataset.pk;
    if (a === 'cancel') return close();
    if (/^-?\d+$/.test(a)) return go(idx + +a, true);
    mark();
    if (a === 'clear') { const t = write(null); close(); return done(t); }
    if (a === 'manual') { const t = live(target); close(); if (!t) return; t.readOnly = false; t.focus(); t.select && t.select();
      t.addEventListener('blur', () => { t.readOnly = true; }, { once: true }); return; }
    const t = write(vals[idx]), nx = a === 'next' && t && nextInput(t);
    close(); done(t);
    if (nx) open(live(nx));
  });
  document.addEventListener('click', e => { const inp = e.target.closest('input[data-pick]'); if (inp && inp.readOnly) { e.preventDefault(); open(inp); } });
  document.addEventListener('keydown', e => { const inp = e.target.closest && e.target.closest('input[data-pick]'); if (inp && inp.readOnly && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(inp); } });
  return { open, close };
})();

/* ---------- connection to Google Sheets ---------- */
const dlg = $('#connect');
function openConnect() {
  const c = SheetStore.config() || {};
  $('#c-url').value = c.url || ''; $('#c-key').value = c.key || '';
  $('#c-msg').textContent = SheetStore.configured() ? 'Tersambung. Ubah hanya kalau URL atau kunci berganti.' : '';
  $('#c-disconnect').hidden = !SheetStore.configured();
  dlg.showModal();
}
document.addEventListener('click', e => { if (e.target.closest('[data-connect]')) openConnect(); });
$('#c-close').addEventListener('click', () => dlg.close());
$('#c-save').addEventListener('click', async () => {
  const msg = $('#c-msg'); msg.textContent = 'Mengetes sambungan…';
  try { const r = await SheetStore.connect($('#c-url').value, $('#c-key').value); msg.textContent = `Tersambung ke "${r.sheet}". Memuat ulang…`; setTimeout(() => location.reload(), 600); }
  catch (err) { msg.textContent = err.message === 'unauthorized' ? 'Kunci API salah. Salin lagi dari log Apps Script.' : 'Tidak bisa menghubungi Apps Script. Cek URL /exec dan akses "Anyone".'; }
});
$('#c-disconnect').addEventListener('click', () => { SheetStore.disconnect(); location.reload(); });
$('#c-file').addEventListener('change', async e => {
  const f = e.target.files[0], msg = $('#c-msg'); if (!f) return;
  if (!SheetStore.configured()) { msg.textContent = 'Sambungkan dulu ke Sheets, baru impor.'; return; }
  try {
    const docs = (JSON.parse(await f.text()).docs || []).filter(d => d && d.path && d.data);
    const r = await SheetStore.importDocs(docs, (n, all) => { msg.textContent = `Mengimpor ${n}/${all}…`; });
    if (r.failed.length) {
      const dates = r.failed.flatMap(f => f.paths).map(p => p.split('/')[1]).join(', ');
      msg.textContent = `Sheet berisi ${r.days ?? '?'} hari. Belum masuk: ${dates}. Alasan: ${r.failed[0].error}. Impor lagi untuk mencoba sisanya.`;
      return;
    }
    const kept = r.skipped.length ? ` ${r.skipped.length} hari dilewati karena versi di Sheet lebih baru.` : '';
    msg.textContent = `Selesai. Sheet sekarang berisi ${r.days ?? 'semua'} hari catatan.${kept} Memuat ulang…`; setTimeout(() => location.reload(), 2500);
  } catch (err) { msg.textContent = 'Impor gagal: ' + err.message + '. Coba impor lagi; data yang sudah masuk tidak akan dobel.'; }
});
SheetStore.on((state, d) => {
  if (state === 'synced') setStatus('saved', 'Tersinkron');
  if (state === 'pending') setStatus('error', `${d.count} belum terkirim`);
});

const initial = (location.hash || '').slice(1);
show(RENDER[initial] ? initial : 'ringkasan');

(async function boot() {
  await store.init();
  try {
    const [profile, plan, days] = await Promise.all([store.get('fit/profile'), store.get('fit/plan'), store.days()]);
    S.profile = profile; S.planFromSheet = !!(plan && plan.templates);
    S.plan = S.planFromSheet ? plan : presetOf().plan();
    days.forEach(d => { if (d && d.date) S.days[d.date] = d; });
  } catch (e) {
    S.plan = S.plan || presetOf().plan(); S.planFromSheet = true;
    setStatus('error', 'Data belum bisa dimuat. Muat ulang halaman.');
  }
  S.loaded = true;
  $('#local-warn').hidden = mode !== 'local';
  $('#offline-warn').hidden = mode !== 'cache';
  if ($('#status').dataset.s !== 'error') setStatus('saved', mode === 'sheets' ? 'Tersinkron' : mode === 'cache' ? 'Offline' : 'Hanya di perangkat');
  applyTheme(); updateHeader(); RENDER[S.tab]();
})();
updateHeader();
})();
