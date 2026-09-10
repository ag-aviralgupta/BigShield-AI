const express = require("express");
const cors = require("cors");
const tenderRoutes = require("./routes/tenderRoutes");
const requirementRoutes = require("./routes/requirementRoutes");
const bidderRoutes = require("./routes/bidderRoutes");
const documentRoutes = require("./routes/documentRoutes");
const complianceRoutes = require("./routes/complianceRoutes");
const pool = require("./db");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "BigShield AI Backend Running" });
});

app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "Database Connected",
      time: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      message: "Database Connection Failed",
      error: error.message,
    });
  }
});

app.use("/api/tenders", tenderRoutes);
app.use("/api/requirements", requirementRoutes);
app.use("/api/bidders", bidderRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/compliance", complianceRoutes);
app.use((err, req, res, next) => { if (err) return res.status(400).json({ message: err.message || "Invalid request" }); next(); });
const start = async () => {
  try {
    // Backwards-compatible local MVP migration: existing installations keep
    // working while newly verified evidence can retain extracted fields.
    await pool.query("ALTER TABLE verification_results ADD COLUMN IF NOT EXISTS extracted_fields JSONB DEFAULT '{}'::jsonb");
  } catch (error) {
    console.warn("Database migration check skipped:", error.message);
  }
  app.listen(process.env.PORT || 5000, () => {
    console.log(`BigShield AI running on port ${process.env.PORT || 5000}`);
  });
};
start();

