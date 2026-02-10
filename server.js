require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const path = require("path");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// Middleware Setup
// ==========================================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

// Passport Setup
app.use(passport.initialize());
app.use(passport.session());

// ==========================================
// Passport Config (Placeholder)
// ==========================================
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    function (accessToken, refreshToken, profile, done) {
      // Here we will check domain and authorized users
      const email = profile.emails[0].value;
      const domain = email.split("@")[1];

      // Domain and Email Check
      const allowedDomains = (process.env.ALLOWED_DOMAINS || "")
        .split(",")
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);
      const allowedEmails = (process.env.ALLOWED_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      const adminEmails = (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      if (adminEmails.includes(email.toLowerCase())) {
        return done(null, {
          id: profile.id,
          displayName: profile.displayName,
          email: email,
          photo: profile.photos[0]?.value,
          isAdmin: true,
        });
      }

      if (allowedEmails.includes(email.toLowerCase())) {
        return done(null, {
          id: profile.id,
          displayName: profile.displayName,
          email: email,
          photo: profile.photos[0]?.value,
          isAdmin: false,
        });
      }

      if (allowedDomains.length > 0 && !allowedDomains.includes(domain)) {
        return done(null, false, { message: "허가되지 않은 계정입니다." });
      }

      return done(null, {
        id: profile.id,
        displayName: profile.displayName,
        email: email,
        photo: profile.photos[0]?.value,
      });
    },
  ),
);

const sheets = require("./lib/sheets");

// ==========================================
// Helpers
// ==========================================

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

function ensureAdmin(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  const userEmail = req.user.email.toLowerCase();

  if (adminEmails.includes(userEmail)) {
    return next();
  }

  res.status(403).json({ message: "Forbidden: Admin access required" });
}

// User object injection for views
app.use((req, res, next) => {
  if (req.user) {
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase());
    req.user.isAdmin = adminEmails.includes(req.user.email.toLowerCase());
  }
  next();
});

// ==========================================
// Routes
// ==========================================

// Landing Page
app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/calendar");
  }
  res.render("login", {
    error: req.query.error,
    schoolNameKo: process.env.SCHOOL_NAME_KO || "스쿨",
    schoolNameEn: process.env.SCHOOL_NAME_EN || "School",
  });
});

// Auth Routes
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

app.get("/auth/google/callback", (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
    if (err) {
      console.error("Google Auth Error:", err);
      return res.redirect("/?error=" + encodeURIComponent(err.message));
    }
    if (!user) {
      console.error("Google Auth Failed:", info);
      const message = info ? info.message : "Login Failed";
      return res.redirect("/?error=" + encodeURIComponent(message));
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error("Login Error:", err);
        return next(err);
      }
      return res.redirect("/calendar");
    });
  })(req, res, next);
});

app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

// Calendar Page (Protected)
app.get(
  "/calendar",
  (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect("/");
  },
  (req, res) => {
    res.render("index", {
      user: req.user,
      schoolNameKo: process.env.SCHOOL_NAME_KO || "스쿨",
      schoolNameEn: process.env.SCHOOL_NAME_EN || "School",
    });
  },
);

// API Routes
app.get("/api/events", ensureAuthenticated, async (req, res) => {
  try {
    const events = await sheets.getEvents();
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/events", ensureAuthenticated, async (req, res) => {
  try {
    const result = await sheets.addEvent(req.body, req.user);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/events/:id", ensureAuthenticated, async (req, res) => {
  try {
    // Check ownership or admin
    // Note: Ideally we should fetch the event first to check ownership.
    // ... (comments kept for context) ...
    // For this migration, I will just forward the request.

    const result = await sheets.updateEvent(req.params.id, req.body, req.user);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/events/:id", ensureAuthenticated, async (req, res) => {
  try {
    const result = await sheets.deleteEvent(req.params.id);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// Server Start
// ==========================================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
