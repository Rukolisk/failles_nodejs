const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const db = new sqlite3.Database(":memory:");

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

db.serialize(() => {
  db.run(
    `CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT
    )`,
  );

  const stmt = db.prepare(
    "INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)",
  );

  stmt.run(1, "admin", "password123", "admin");
  stmt.run(2, "user1", "azerty", "user");
  stmt.finalize();
});

app.get("/api/user", (req, res) => {
  const username = req.query.username;

  if (!username) {
    return res.status(400).json({ error: "username requis" });
  }

  db.get(
    "SELECT id, username, role FROM users WHERE username = ?",
    [username],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row || null);
    },
  );
});

app.post("/api/delete-user", (req, res) => {
  const token = req.headers["authorization"];

  if (token !== ADMIN_TOKEN) {
    return res.status(403).send("Accès refusé");
  }

  const id = req.body.id;

  if (!Number.isInteger(id)) {
    return res.status(400).send("ID invalide");
  }

  db.run("DELETE FROM users WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).send(err.message);

    if (this.changes === 0) {
      return res.status(404).send("Utilisateur introuvable");
    }

    res.send("Utilisateur supprimé");
  });
});

app.get("/api/welcome", (req, res) => {
  const name = req.query.name || "Visiteur";

  if (!/^[a-zA-Z0-9_-]{3,20}$/.test(name)) {
    return res.status(400).send("Invalid username");
  }

  const safeName = name.replace(/[<>&"'`]/g, "");

  res.send(`<h1>Bienvenue sur l'API, ${safeName} !</h1>`);
});

app.get("/api/debug", (req, res, next) => {
  next(new Error("Base de données inaccessible sur 192.168.1.50:5432"));
});

app.use((err, req, res, next) => {
  console.error("Erreur:", err.message);
  res.status(500).json({ error: err.message });
});

app.listen(3000, () =>
  console.log("🚀 API sécurisée sur http://localhost:3000"),
);
