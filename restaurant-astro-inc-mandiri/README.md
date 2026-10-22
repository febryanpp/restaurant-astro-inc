# Restaurant Astro Inc

Aplikasi web mandiri untuk mengelola profil restoran, kategori dan menu, serta pesanan. Frontend, backend API, dan database berada dalam satu project Node.js.

## Teknologi
- Frontend: HTML, CSS, JavaScript (`public/index.html`)
- Backend: Node.js dan Express
- Database: SQLite melalui `sql.js` (WebAssembly; tidak membutuhkan Visual Studio C++ Build Tools)

## Persyaratan
- Node.js versi 20 atau lebih baru
- npm

## Menjalankan secara lokal
1. Ekstrak ZIP dan buka folder `restaurant-astro-inc-mandiri` di VS Code.
2. Buka **Terminal → New Terminal**.
3. Jalankan:
   ```bash
   npm install
   npm start
   ```
4. Buka `http://localhost:3000`.
5. Periksa status API di `http://localhost:3000/api/health`.

Untuk menghentikan server, tekan `Ctrl+C` pada terminal.

## Struktur project
```text
restaurant-astro-inc-mandiri/
├── public/
│   └── index.html
├── routes/
│   ├── menu.js
│   ├── pesanan.js
│   └── profil.js
├── data/                 # database dibuat otomatis saat aplikasi berjalan
├── db.js                 # penghubung dan penyimpanan database SQLite
├── schema.sql            # struktur tabel dan data awal
├── server.js             # server Express dan API
├── package.json
└── .gitignore
```

## Endpoint API
- `GET /api/health` — status server
- `/api/profil` — profil restoran
- `/api/menu` — daftar menu dan kategori
- `/api/pesanan` — pengelolaan pesanan

## Catatan database
Database default disimpan di `data/restaurant-astro.db`. Karena `sql.js` memuat database ke memori dan menyimpannya ke file, jalankan hanya satu instance aplikasi yang menulis ke file database yang sama. Pada hosting, gunakan persistent disk/volume dan arahkan `DB_PATH` ke lokasi yang dapat ditulis.

## Sebelum hosting publik
API saat ini belum memiliki login/otorisasi. Tambahkan autentikasi, validasi input, dan pengamanan yang sesuai sebelum dipakai untuk data pelanggan nyata. Jangan mengunggah database, rahasia, token, atau data pribadi ke GitHub.
