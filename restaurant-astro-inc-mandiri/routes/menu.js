const express = require("express");
const router = express.Router();
const db = require("../db");
const { randomUUID } = require("crypto");

/* ---------------- Kategori menu ---------------- */

// GET /api/menu/kategori
router.get("/kategori", (req, res) => {
  res.json(db.prepare("SELECT * FROM kategori_menu ORDER BY urutan, id").all());
});

// POST /api/menu/kategori  { nama }
router.post("/kategori", (req, res) => {
  const nama = (req.body.nama || "").trim();
  if (!nama) return res.status(400).json({ error: "Nama kategori wajib diisi" });
  try {
    const max = db.prepare("SELECT COALESCE(MAX(urutan),0) m FROM kategori_menu").get().m;
    const info = db.prepare("INSERT INTO kategori_menu (nama, urutan) VALUES (?, ?)").run(nama, max + 1);
    res.status(201).json({ id: info.lastInsertRowid, nama });
  } catch (e) {
    res.status(409).json({ error: "Kategori itu sudah ada" });
  }
});

// DELETE /api/menu/kategori/:id  -> menu di kategori ini dipindah ke kategori pertama yang tersisa
router.delete("/kategori/:id", (req, res) => {
  const id = Number(req.params.id);
  const total = db.prepare("SELECT COUNT(*) n FROM kategori_menu").get().n;
  if (total <= 1) return res.status(400).json({ error: "Sisakan minimal satu kategori" });

  const pengganti = db.prepare("SELECT id FROM kategori_menu WHERE id != ? ORDER BY urutan LIMIT 1").get(id);
  const tx = db.transaction(() => {
    db.prepare("UPDATE menu SET kategori_id = ? WHERE kategori_id = ?").run(pengganti.id, id);
    db.prepare("DELETE FROM kategori_menu WHERE id = ?").run(id);
  });
  tx();
  res.json({ ok: true, dipindahKe: pengganti.id });
});

/* ---------------- Menu ---------------- */

const menuLengkap = () => db.prepare(`
  SELECT m.id, m.nama, m.harga, m.deskripsi, m.ikon, m.tersedia,
         k.id AS kategori_id, k.nama AS kategori
  FROM menu m
  LEFT JOIN kategori_menu k ON k.id = m.kategori_id
  ORDER BY m.dibuat_pada
`).all();

// GET /api/menu  (opsional ?kategori=Minuman / ?tersedia=1)
router.get("/", (req, res) => {
  let rows = menuLengkap();
  if (req.query.kategori && req.query.kategori !== "Semua") {
    rows = rows.filter(m => m.kategori === req.query.kategori);
  }
  if (req.query.tersedia !== undefined) {
    rows = rows.filter(m => m.tersedia === Number(req.query.tersedia));
  }
  res.json(rows);
});

// POST /api/menu  -> tambah menu baru (nama, harga, kategori bebas diisi/diganti)
router.post("/", (req, res) => {
  const { nama, harga, kategori_id, deskripsi, ikon, tersedia } = req.body;
  if (!nama || !nama.trim()) return res.status(400).json({ error: "Nama menu wajib diisi" });
  if (harga === undefined || Number(harga) < 0) return res.status(400).json({ error: "Harga tidak valid" });

  const id = randomUUID();
  db.prepare(`
    INSERT INTO menu (id, nama, harga, kategori_id, deskripsi, ikon, tersedia)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, nama.trim(), Number(harga), kategori_id || null, deskripsi?.trim() || "", ikon || "🍽️", tersedia ? 1 : 0);

  res.status(201).json({ id });
});

// PUT /api/menu/:id  -> ubah nama, harga, kategori, ikon, ketersediaan — semuanya bisa diganti
router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM menu WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Menu tidak ditemukan" });

  const data = {
    nama: req.body.nama?.trim() || existing.nama,
    harga: req.body.harga !== undefined ? Number(req.body.harga) : existing.harga,
    kategori_id: req.body.kategori_id !== undefined ? req.body.kategori_id : existing.kategori_id,
    deskripsi: req.body.deskripsi !== undefined ? req.body.deskripsi.trim() : existing.deskripsi,
    ikon: req.body.ikon || existing.ikon,
    tersedia: req.body.tersedia !== undefined ? (req.body.tersedia ? 1 : 0) : existing.tersedia,
  };

  db.prepare(`
    UPDATE menu SET nama=?, harga=?, kategori_id=?, deskripsi=?, ikon=?, tersedia=? WHERE id=?
  `).run(data.nama, data.harga, data.kategori_id, data.deskripsi, data.ikon, data.tersedia, req.params.id);

  res.json({ ok: true });
});

// PATCH /api/menu/:id/tersedia  -> toggle cepat tersedia/habis
router.patch("/:id/tersedia", (req, res) => {
  const existing = db.prepare("SELECT tersedia FROM menu WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Menu tidak ditemukan" });
  const next = existing.tersedia ? 0 : 1;
  db.prepare("UPDATE menu SET tersedia = ? WHERE id = ?").run(next, req.params.id);
  res.json({ tersedia: next });
});

// DELETE /api/menu/:id
router.delete("/:id", (req, res) => {
  const info = db.prepare("DELETE FROM menu WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "Menu tidak ditemukan" });
  res.json({ ok: true });
});

module.exports = router;
