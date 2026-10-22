const express = require("express");
const router = express.Router();
const db = require("../db");
const { randomUUID } = require("crypto");

const ambilItems = db.prepare("SELECT nama, harga, qty, menu_id FROM pesanan_item WHERE pesanan_id = ?");

function pesananLengkap(row) {
  return { ...row, items: ambilItems.all(row.id) };
}

// GET /api/pesanan  (opsional ?status=baru|diproses|selesai|batal)
router.get("/", (req, res) => {
  let rows;
  if (req.query.status) {
    rows = db.prepare("SELECT * FROM pesanan WHERE status = ? ORDER BY dibuat_pada DESC").all(req.query.status);
  } else {
    rows = db.prepare("SELECT * FROM pesanan ORDER BY dibuat_pada DESC").all();
  }
  res.json(rows.map(pesananLengkap));
});

// GET /api/pesanan/:id
router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM pesanan WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Pesanan tidak ditemukan" });
  res.json(pesananLengkap(row));
});

// POST /api/pesanan  { pelanggan, metode_bayar, items:[{menu_id, qty}] }
router.post("/", (req, res) => {
  const { pelanggan, metode_bayar, items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Pilih minimal satu menu" });
  }
  if (!metode_bayar) return res.status(400).json({ error: "Metode pembayaran wajib dipilih" });

  const getMenu = db.prepare("SELECT id, nama, harga FROM menu WHERE id = ?");
  const rincian = items.map(it => {
    const m = getMenu.get(it.menu_id);
    if (!m) throw new Error(`Menu ${it.menu_id} tidak ditemukan`);
    return { menu_id: m.id, nama: m.nama, harga: m.harga, qty: Number(it.qty) };
  });
  const total = rincian.reduce((a, i) => a + i.harga * i.qty, 0);

  const id = randomUUID();
  const nomor = db.prepare("SELECT COALESCE(MAX(CAST(SUBSTR(kode,5) AS INTEGER)),2399)+1 n FROM pesanan").get().n;
  const kode = "PSN-" + nomor;

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO pesanan (id, kode, pelanggan, metode_bayar, status, total)
      VALUES (?, ?, ?, ?, 'baru', ?)
    `).run(id, kode, pelanggan?.trim() || "Tanpa nama", metode_bayar, total);

    const insertItem = db.prepare(`
      INSERT INTO pesanan_item (pesanan_id, menu_id, nama, harga, qty) VALUES (?, ?, ?, ?, ?)
    `);
    rincian.forEach(i => insertItem.run(id, i.menu_id, i.nama, i.harga, i.qty));
  });

  try {
    tx();
    res.status(201).json({ id, kode, total });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/pesanan/:id/status  { status: 'diproses' | 'selesai' }
router.put("/:id/status", (req, res) => {
  const allowed = ["baru", "diproses", "selesai"];
  if (!allowed.includes(req.body.status)) {
    return res.status(400).json({ error: "Status tidak valid" });
  }
  const info = db.prepare("UPDATE pesanan SET status = ? WHERE id = ? AND status != 'batal'")
    .run(req.body.status, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "Pesanan tidak ditemukan atau sudah dibatalkan" });
  res.json({ ok: true });
});

// PUT /api/pesanan/:id/batal  { alasan, keterangan, refund: true|false }
// -> membatalkan pesanan; jika refund true, dana dianggap dikembalikan ke pelanggan
router.put("/:id/batal", (req, res) => {
  const row = db.prepare("SELECT * FROM pesanan WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Pesanan tidak ditemukan" });
  if (row.status === "batal") return res.status(400).json({ error: "Pesanan sudah dibatalkan" });

  const alasan = (req.body.alasan || "Dibatalkan oleh pengguna").trim();
  const keterangan = (req.body.keterangan || "").trim();
  const catatan = keterangan ? `${alasan}: ${keterangan}` : alasan;
  const refund = req.body.refund ? 1 : 0;

  db.prepare(`
    UPDATE pesanan SET
      status_sebelum = status,
      status = 'batal',
      catatan_batal = ?,
      refund = ?,
      refund_pada = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END
    WHERE id = ?
  `).run(catatan, refund, refund, req.params.id);

  res.json({ ok: true, refund: !!refund, total: row.total });
});

// PUT /api/pesanan/:id/pulihkan  -> kembalikan nota yang dibatalkan ke status sebelumnya
router.put("/:id/pulihkan", (req, res) => {
  const row = db.prepare("SELECT * FROM pesanan WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Pesanan tidak ditemukan" });
  if (row.status !== "batal") return res.status(400).json({ error: "Pesanan ini tidak dalam status batal" });

  db.prepare(`
    UPDATE pesanan SET
      status = COALESCE(status_sebelum, 'baru'),
      status_sebelum = NULL,
      catatan_batal = NULL,
      refund = 0,
      refund_pada = NULL
    WHERE id = ?
  `).run(req.params.id);

  res.json({ ok: true });
});

// DELETE /api/pesanan/:id  -> hapus permanen (biasanya untuk nota yang sudah batal)
router.delete("/:id", (req, res) => {
  const info = db.prepare("DELETE FROM pesanan WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "Pesanan tidak ditemukan" });
  res.json({ ok: true });
});

module.exports = router;
