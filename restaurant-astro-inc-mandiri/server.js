
const path = require("path");
const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
let initializationError = null;

const dbReady = db.initialize().catch((error) => {
  initializationError = error;
  console.error("Gagal menyiapkan database:", error);
});

app.use(async (req, res, next) => {
  await dbReady;

  if (initializationError) {
    return res.status(500).json({
      error: "Database gagal diinisialisasi",
      detail: initializationError.message
    });
  }

  next();
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    app: "Restaurant Astro Inc",
    waktu: new Date().toISOString()
  });
});

app.use("/api/profil", require("./routes/profil"));
app.use("/api/menu", require("./routes/menu"));
app.use("/api/pesanan", require("./routes/pesanan"));

app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Terjadi kesalahan pada server" });
});

module.exports = app;
