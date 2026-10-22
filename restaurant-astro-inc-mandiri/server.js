// Restaurant Astro Inc — frontend + API server
const path = require("path");
const express = require("express");
const cors = require("cors");
const db = require("./db");

async function startServer() {
  await db.initialize();

  // Muat route setelah database selesai diinisialisasi.
  const profilRoutes = require("./routes/profil");
  const menuRoutes = require("./routes/menu");
  const pesananRoutes = require("./routes/pesanan");

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.get("/api/health", (req, res) => res.json({ ok: true, app: "Restaurant Astro Inc", waktu: new Date().toISOString() }));
  app.use("/api/profil", profilRoutes);
  app.use("/api/menu", menuRoutes);
  app.use("/api/pesanan", pesananRoutes);
  app.use(express.static(path.join(__dirname, "public")));
  app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, "0.0.0.0", () => console.log(`Restaurant Astro Inc berjalan pada port ${PORT}`));
}

startServer().catch(error => {
  console.error("Gagal menyiapkan database:", error);
  process.exit(1);
});
