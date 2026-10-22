-- ================================================================
-- Skema database: Restaurant Astro Inc
-- Basis data: SQLite
-- ================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------
-- Profil usaha (satu baris saja, id selalu 1)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profil (
  id        INTEGER PRIMARY KEY CHECK (id = 1),
  nama      TEXT NOT NULL,
  pemilik   TEXT,
  telp      TEXT,
  kategori  TEXT NOT NULL DEFAULT 'Warung Makan',
  provinsi  TEXT,
  kota      TEXT,
  alamat    TEXT,
  jam       TEXT DEFAULT '08.00 – 21.00'
);

-- ---------------------------------------------------------------
-- Metode pembayaran yang diaktifkan oleh usaha
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metode_bayar (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  nama   TEXT NOT NULL UNIQUE,
  aktif  INTEGER NOT NULL DEFAULT 1 CHECK (aktif IN (0,1))
);

-- ---------------------------------------------------------------
-- Kategori menu (bisa ditambah/hapus sesuka hati)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kategori_menu (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  nama   TEXT NOT NULL UNIQUE,
  urutan INTEGER DEFAULT 0
);

-- ---------------------------------------------------------------
-- Menu / produk yang dijual
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS menu (
  id           TEXT PRIMARY KEY,           -- contoh: m1, m2 (atau uuid)
  nama         TEXT NOT NULL,
  harga        INTEGER NOT NULL CHECK (harga >= 0),
  kategori_id  INTEGER REFERENCES kategori_menu(id) ON DELETE SET NULL,
  deskripsi    TEXT,
  ikon         TEXT DEFAULT '🍽️',
  tersedia     INTEGER NOT NULL DEFAULT 1 CHECK (tersedia IN (0,1)),
  dibuat_pada  TEXT DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------
-- Pesanan / nota
-- status:
--   baru      -> pesanan baru masuk
--   diproses  -> sedang disiapkan
--   selesai   -> sudah diserahkan/dibayar
--   batal     -> dibatalkan (lihat catatan_batal & refund)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pesanan (
  id             TEXT PRIMARY KEY,         -- uuid
  kode           TEXT NOT NULL UNIQUE,     -- contoh: PSN-2401
  pelanggan      TEXT DEFAULT 'Tanpa nama',
  metode_bayar   TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'baru'
                 CHECK (status IN ('baru','diproses','selesai','batal')),
  status_sebelum TEXT,                     -- status sebelum dibatalkan (untuk fitur "pulihkan")
  total          INTEGER NOT NULL DEFAULT 0,
  catatan_batal  TEXT,                     -- alasan + keterangan pembatalan
  refund         INTEGER NOT NULL DEFAULT 0 CHECK (refund IN (0,1)),
  refund_pada    TEXT,                     -- waktu dana dikembalikan
  dibuat_pada    TEXT DEFAULT (datetime('now')),
  diubah_pada    TEXT DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------
-- Item di dalam setiap pesanan (snapshot nama & harga saat transaksi)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pesanan_item (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  pesanan_id   TEXT NOT NULL REFERENCES pesanan(id) ON DELETE CASCADE,
  menu_id      TEXT REFERENCES menu(id) ON DELETE SET NULL,
  nama         TEXT NOT NULL,   -- disalin saat transaksi, tidak ikut berubah jika menu diedit
  harga        INTEGER NOT NULL,
  qty          INTEGER NOT NULL CHECK (qty > 0)
);

CREATE INDEX IF NOT EXISTS idx_pesanan_status ON pesanan(status);
CREATE INDEX IF NOT EXISTS idx_pesanan_item_pesanan ON pesanan_item(pesanan_id);
CREATE INDEX IF NOT EXISTS idx_menu_kategori ON menu(kategori_id);

-- ---------------------------------------------------------------
-- Trigger: perbarui diubah_pada otomatis setiap kali pesanan diupdate
-- ---------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_pesanan_updated
AFTER UPDATE ON pesanan
BEGIN
  UPDATE pesanan SET diubah_pada = datetime('now') WHERE id = NEW.id;
END;

-- ================================================================
-- DATA CONTOH (seed) — boleh dihapus/diubah bebas
-- ================================================================

INSERT OR IGNORE INTO profil (id, nama, pemilik, telp, kategori, provinsi, kota, alamat, jam)
VALUES (1, 'Restaurant Astro Inc', '', '',
        'Restoran', '', '', '', '10.00 – 22.00');

INSERT OR IGNORE INTO metode_bayar (nama, aktif) VALUES
  ('Tunai', 1), ('QRIS', 1), ('Transfer Bank', 1),
  ('GoPay', 0), ('OVO', 0), ('DANA', 0), ('ShopeePay', 0);

INSERT OR IGNORE INTO kategori_menu (nama, urutan) VALUES
  ('Makanan Berat', 1), ('Camilan', 2), ('Minuman', 3), ('Paket Hemat', 4);

INSERT OR IGNORE INTO menu (id, nama, harga, kategori_id, deskripsi, ikon, tersedia) VALUES
  ('m1', 'Nasi Goreng Kampung', 18000, 1, 'Nasi goreng terasi, telur mata sapi', '🍛', 1),
  ('m2', 'Ayam Bakar Madu',     25000, 1, 'Setengah ekor, sambal dadak',        '🍗', 1),
  ('m3', 'Es Teh Manis Jumbo',   6000, 3, 'Gelas 500 ml',                        '🧋', 1),
  ('m4', 'Pisang Goreng Keju',  12000, 2, 'Isi 5 potong',                        '🍌', 0),
  ('m5', 'Paket Hemat Berdua',  45000, 4, '2 nasi + 2 ayam + 2 es teh',          '🥡', 1);

INSERT OR IGNORE INTO pesanan (id, kode, pelanggan, metode_bayar, status, total)
VALUES
  ('p1', 'PSN-2401', 'Dimas',   'QRIS',  'diproses', 48000),
  ('p2', 'PSN-2400', 'Ibu Lina','Tunai', 'selesai',  25000);

INSERT OR IGNORE INTO pesanan_item (pesanan_id, menu_id, nama, harga, qty) VALUES
  ('p1', 'm1', 'Nasi Goreng Kampung', 18000, 2),
  ('p1', 'm3', 'Es Teh Manis Jumbo',   6000, 2),
  ('p2', 'm2', 'Ayam Bakar Madu',     25000, 1);
