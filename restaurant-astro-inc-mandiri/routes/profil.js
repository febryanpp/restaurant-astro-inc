const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/profil  -> profil usaha + daftar metode pembayaran (aktif & nonaktif)
router.get("/", (req, res) => {
  const profil = db.prepare("SELECT * FROM profil WHERE id = 1").get();
  const metode = db.prepare("SELECT nama, aktif FROM metode_bayar ORDER BY id").all();
  res.json({ ...profil, metode });
});

// PUT /api/profil  -> ubah nama usaha, kategori, wilayah, dll
router.put("/", (req, res) => {
  const { nama, pemilik, telp, kategori, provinsi, kota, alamat, jam } = req.body;
  if (!nama || !nama.trim()) {
    return res.status(400).json({ error: "Nama usaha wajib diisi" });
  }
  db.prepare(`
    UPDATE profil SET
      nama = ?, pemilik = ?, telp = ?, kategori = ?,
      provinsi = ?, kota = ?, alamat = ?, jam = ?
    WHERE id = 1
  `).run(
    nama.trim(), pemilik?.trim() || "", telp?.trim() || "",
    kategori?.trim() || "Warung Makan", provinsi?.trim() || "",
    kota?.trim() || "", alamat?.trim() || "", jam?.trim() || ""
  );
  res.json({ ok: true });
});

// GET /api/profil/metode -> daftar metode pembayaran
router.get("/metode", (req, res) => {
  res.json(db.prepare("SELECT * FROM metode_bayar ORDER BY id").all());
});

// POST /api/profil/metode  { nama }  -> tambah metode pembayaran baru
router.post("/metode", (req, res) => {
  const nama = (req.body.nama || "").trim();
  if (!nama) return res.status(400).json({ error: "Nama metode wajib diisi" });
  try {
    db.prepare("INSERT INTO metode_bayar (nama, aktif) VALUES (?, 1)").run(nama);
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(409).json({ error: "Metode itu sudah ada" });
  }
});

// PUT /api/profil/metode/:nama  { aktif: 0|1 } -> aktif/nonaktifkan metode
router.put("/metode/:nama", (req, res) => {
  const aktifCount = db.prepare("SELECT COUNT(*) n FROM metode_bayar WHERE aktif = 1").get().n;
  const target = db.prepare("SELECT * FROM metode_bayar WHERE nama = ?").get(req.params.nama);
  if (!target) return res.status(404).json({ error: "Metode tidak ditemukan" });
  if (target.aktif === 1 && req.body.aktif === 0 && aktifCount <= 1) {
    return res.status(400).json({ error: "Sisakan minimal satu metode aktif" });
  }
  db.prepare("UPDATE metode_bayar SET aktif = ? WHERE nama = ?").run(req.body.aktif ? 1 : 0, req.params.nama);
  res.json({ ok: true });
});

module.exports = router;
