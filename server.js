const rateLimit = require("express-rate-limit");
const express = require("express");
const cors = require("cors");
const db = require("./src/database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("src/public"));
const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    error: "Too many submissions. Please try again later."
  }
});

app.post(
  "/api/public/widgets/:id/submit",
  submitLimiter,
  (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: "Email is required"
    });
  }

 const result = db.prepare(`
  INSERT INTO submissions (widget_id, data)
  VALUES (?, ?)
`).run(
  req.params.id,
  JSON.stringify({ email })
);

  res.status(201).json({
    message: "Submission received successfully"
  });
});
app.get("/", (req, res) => {
  res.json({
    message: "FlyRank Widget Platform API is running!"
  });
});
app.use(express.json());

app.post("/api/public/widgets/:id/submit", (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({
      error: "Valid email is required"
    });
  }

  const cleanEmail = email.trim();

  if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
    return res.status(400).json({
      error: "Please enter a valid email"
    });
  }

  const widget = db
    .prepare("SELECT id FROM widgets WHERE id = ?")
    .get(req.params.id);

  if (!widget) {
    return res.status(404).json({
      error: "Widget not found"
    });
  }

  db.prepare(`
    INSERT INTO submissions (widget_id, data)
    VALUES (?, ?)
  `).run(
    req.params.id,
    JSON.stringify({ email: cleanEmail })
  );

  res.status(201).json({
    message: "Submission received successfully"
  });
});
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    database: "connected"
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});