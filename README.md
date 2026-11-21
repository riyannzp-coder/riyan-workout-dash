# Riyan Workout Dash

Dashboard latihan harian: kalistenik di rumah + gym 3× seminggu, dengan saran progresi otomatis.

## Arsitektur

```
              CLAUDE
       Development / Coding
                 │
                 ▼
              GITHUB
        Source Code / Logic
                 │
                 ▼
           GITHUB PAGES
         Workout Dashboard          index.html · app.js · styles.css
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
 WORKOUT ENGINE        DATA STORE
 Recommendation       Google Sheets
   engine.js     store.js ⇄ apps-script/Code.gs
       │                   │
       └─────────┬─────────┘
                 ▼
           USER PROGRESS
                 │
                 ▼
          RECOMMENDATION
  "Naikkan beban / tambah reps / gerakan baru"
```

| File | Peran |
|---|---|
| `index.html`, `styles.css`, `app.js` | Tampilan dashboard (tab Ringkasan, Hari ini, Menu mingguan, Ukuran tubuh) |
| `engine.js` | Mesin rekomendasi: progresi beban, reps, durasi, dan tangga variasi gerakan. Tanpa DOM, tanpa penyimpanan |
| `store.js` | Klien data: baca/tulis ke Google Sheets, cache lokal, antrean offline |
| `apps-script/Code.gs` | API di Google Sheets (Apps Script Web App) |

Data latihan **tidak** disimpan di repo ini. URL Apps Script dan kunci API hanya disimpan di browser masing-masing perangkat.

## Setup

### 1. Google Sheets + Apps Script
1. Buat Google Sheet baru, misalnya **Workout Dash Data**.
2. **Extensions → Apps Script**, hapus isi `Code.gs`, tempel isi `apps-script/Code.gs` dari repo ini, lalu simpan.
3. Pilih fungsi `setup` → **Run** → izinkan akses. Buka **Execution log** dan salin **API key**.
4. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Salin URL yang berakhiran `/exec`.

> Setiap kali `Code.gs` diubah: **Deploy → Manage deployments → Edit → Version: New version**. URL tetap sama.

### 2. GitHub Pages
**Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**.
Dashboard tersedia di `https://<username>.github.io/riyan-workout-dash/`.

### 3. Sambungkan di setiap perangkat
Buka dashboard → **Sambungan data** → tempel URL `/exec` dan API key → **Simpan & tes**.
Impor data lama sekali saja lewat tombol impor di dialog yang sama.

## Keamanan
- Siapa pun yang tahu URL **dan** kunci API bisa membaca/menulis data. Jangan bagikan keduanya.
- Kalau kunci bocor: jalankan `rotateKey()` di Apps Script, lalu sambungkan ulang perangkatmu.
