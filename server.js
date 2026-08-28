require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const db = require("./src/database");
const supabase = require("./src/supabase");

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------------
// Middleware
// -------------------------

app.use(cors());
app.use(express.json());
app.use(express.static("src/public"));

// -------------------------
// Rate limiter
// -------------------------

const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    error: "Too many submissions. Please try again later."
  }
});

// -------------------------
// Health check
// -------------------------

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    database: "connected"
  });
});

// =====================================================
// A4 AUTHENTICATION
// =====================================================

// -------------------------
// SIGNUP
// -------------------------

app.post("/auth/signup", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Email and password are required"
    });
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    return res.status(201).json({
      user: data.user
    });
  } catch (error) {
    console.error("Signup error:", error.message);

    return res.status(500).json({
      error: "Signup failed"
    });
  }
});

// -------------------------
// LOGIN
// -------------------------

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Email and password are required"
    });
  }

  try {
    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      return res.status(401).json({
        error: "Invalid login credentials"
      });
    }

    return res.status(200).json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      error: "Login failed"
    });
  }
});

// =====================================================
// AUTH MIDDLEWARE
// =====================================================

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Access token required"
    });
  }

  const token = authHeader.substring(7).trim();

  if (!token) {
    return res.status(401).json({
      error: "Access token required"
    });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        error: "Invalid or expired token"
      });
    }

    req.user = data.user;

    next();
  } catch (error) {
    console.error("Token verification error:", error.message);

    return res.status(401).json({
      error: "Invalid or expired token"
    });
  }
}

// -------------------------
// PUBLIC INFO
// -------------------------

app.get("/public/info", (req, res) => {
  res.status(200).json({
    message: "Welcome stranger! This info is public."
  });
});

// -------------------------
// PROTECTED PROFILE
// -------------------------

app.get("/protected/profile", requireAuth, (req, res) => {
  res.status(200).json({
    id: req.user.id,
    email: req.user.email,
    account_created: req.user.created_at
  });
});

// -------------------------
// SECOND PROTECTED ROUTE
// -------------------------

app.get("/protected/dashboard", requireAuth, (req, res) => {
  res.status(200).json({
    message: "Welcome to your protected dashboard",
    user_id: req.user.id
  });
});

// -------------------------
// LOGOUT
// -------------------------

app.post("/auth/logout", requireAuth, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Logout error:", error.message);

    return res.status(500).json({
      error: "Logout failed"
    });
  }
});

// =====================================================
// EXISTING FLYRANK WIDGET API
// =====================================================

// -------------------------
// GET WIDGET
// -------------------------

app.get("/api/public/widgets/:id", (req, res) => {
  try {
    const widget = db
      .prepare(
        `
        SELECT id, type, title, description, button_text
        FROM widgets
        WHERE id = ?
        `
      )
      .get(req.params.id);

    if (!widget) {
      return res.status(404).json({
        error: "Widget not found"
      });
    }

    return res.status(200).json(widget);
  } catch (error) {
    console.error("Get widget error:", error.message);

    return res.status(500).json({
      error: "Failed to load widget"
    });
  }
});

// -------------------------
// CREATE WIDGET
// -------------------------

app.post("/api/widgets", (req, res) => {
  const {
    owner_id,
    type,
    title,
    description,
    button_text
  } = req.body;

  if (!owner_id || !type || !title || !button_text) {
    return res.status(400).json({
      error: "owner_id, type, title and button_text are required"
    });
  }

  try {
    const result = db
      .prepare(
        `
        INSERT INTO widgets
        (owner_id, type, title, description, button_text)
        VALUES (?, ?, ?, ?, ?)
        `
      )
      .run(
        owner_id,
        type,
        title,
        description || "",
        button_text
      );

    return res.status(201).json({
      id: result.lastInsertRowid,
      message: "Widget created successfully"
    });
  } catch (error) {
    console.error("Create widget error:", error.message);

    return res.status(500).json({
      error: "Failed to create widget"
    });
  }
});

// -------------------------
// SUBMIT WIDGET
// -------------------------

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

    const cleanEmail = email.trim();

    if (
      !cleanEmail.includes("@") ||
      !cleanEmail.includes(".")
    ) {
      return res.status(400).json({
        error: "Please enter a valid email"
      });
    }

    try {
      const widget = db
        .prepare(
          `
          SELECT id
          FROM widgets
          WHERE id = ?
          `
        )
        .get(req.params.id);

      if (!widget) {
        return res.status(404).json({
          error: "Widget not found"
        });
      }

      db.prepare(
        `
        INSERT INTO submissions (widget_id, data)
        VALUES (?, ?)
        `
      ).run(
        req.params.id,
        JSON.stringify({
          email: cleanEmail
        })
      );

      console.log("Widget submission:", {
        widget_id: req.params.id
      });

      return res.status(201).json({
        message: "Submission received successfully"
      });
    } catch (error) {
      console.error("Submission error:", error.message);

      return res.status(500).json({
        error: "Submission failed"
      });
    }
  }
);

// -------------------------
// HOME
// -------------------------

app.get("/", (req, res) => {
  res.json({
    message: "FlyRank Widget Platform API is running!"
  });
});

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});