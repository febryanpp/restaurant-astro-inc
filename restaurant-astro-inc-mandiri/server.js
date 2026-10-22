const path = require("path");
const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

let initialized = false;

async function initialize() {
  if (initialized) return;

  await db.initialize();

  const profilRoutes = require("./routes/profil");
  const menuRoutes = require("./routes/menu");
  const pesananRoutes = require("./routes/pesanan");

  app.get("/api/health", (req, res) => {
    res.json({
      ok: true,
      app: "Restaurant Astro Inc",
      waktu: new Date().toISOString()
    });
  });

  app.use("/api/profil", profilRoutes);
  app.use("/api/menu", menuRoutes);
  app.use("/api/pesanan", pesananRoutes);

  app.use(express.static(path.join(__dirname, "public")));

  app.get("*", (req, res) => {
    res.sendFile(
      path.join(__dirname, "public", "index.html")
    );
  });

  initialized = true;
}

module.exports = async (req, res) => {
  try {
    await initialize();
    return app(req, res);
  } catch (error) {
    console.error("Gagal menyiapkan aplikasi:", error);

    return res.status(500).json({
      error: "Terjadi kesalahan pada server",
      detail: error.message
    });
  }
};
