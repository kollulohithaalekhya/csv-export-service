const express = require("express");
const fs = require("fs");
const pool = require("../db/client");

const router = express.Router();

/**
 * ✅ POST /exports/csv
 * Supports filters + columns
 */
router.post("/csv", async (req, res) => {
  const { columns, country_code, subscription_tier, min_ltv } = req.query;

  const result = await pool.query(
    `INSERT INTO exports(status, progress, filters, columns)
     VALUES('pending', 0, $1, $2)
     RETURNING id, status`,
    [
      JSON.stringify({ country_code, subscription_tier, min_ltv }),
      columns || null,
    ]
  );

  return res.status(202).json({
    exportId: result.rows[0].id,
    status: result.rows[0].status,
  });
});

/**
 * ✅ GET /exports/:id/status
 */
router.get("/:id/status", async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM exports WHERE id=$1`,
    [req.params.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Not found" });
  }

  const job = result.rows[0];

  res.json({
    id: job.id,
    status: job.status,
    progress: {
      current: job.progress,
      total: 100,
    },
    error: job.error || null,
    created_at: job.created_at,
    updated_at: job.updated_at,
  });
});

/**
 * ✅ DELETE /exports/:id
 */
router.delete("/:id", async (req, res) => {
  const result = await pool.query(
    `UPDATE exports
     SET status='cancelled'
     WHERE id=$1
     AND status IN ('pending','processing')
     RETURNING *`,
    [req.params.id]
  );

  if (result.rows.length === 0) {
    return res.status(400).json({
      error: "Cannot cancel job",
    });
  }

  const job = result.rows[0];

  // 🔥 delete partial file immediately
  if (job.file_path && fs.existsSync(job.file_path)) {
    fs.unlinkSync(job.file_path);
  }

  res.json({ id: job.id, status: job.status });
});

/**
 * ✅ GET /exports/:id/download
 */
router.get("/:id/download", async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM exports WHERE id=$1`,
    [req.params.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Not found" });
  }

  const job = result.rows[0];

  if (job.status !== "completed") {
    return res.status(400).json({ error: "Not completed" });
  }

  if (!fs.existsSync(job.file_path)) {
    return res.status(404).json({ error: "File missing" });
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="export_${job.id}.csv"`
  );
  res.setHeader("Accept-Ranges", "bytes");

  res.sendFile(job.file_path);
});

module.exports = router;