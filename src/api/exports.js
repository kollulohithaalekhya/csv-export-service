const express = require("express");
const fs = require("fs");
const pool = require("../db/client");

const router = express.Router();

router.post("/", async (req, res) => {
  const result = await pool.query(
    `INSERT INTO exports(status, progress)
     VALUES('pending', 0)
     RETURNING id, status`
  );

  res.json({
    jobId: result.rows[0].id,
    status: result.rows[0].status,
  });
});

router.get("/:id", async (req, res) => {
  const result = await pool.query(
    `SELECT id, status, progress FROM exports WHERE id=$1`,
    [req.params.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Job not found" });
  }

  res.json(result.rows[0]);
});

router.post("/:id/cancel", async (req, res) => {
  const result = await pool.query(
    `UPDATE exports
     SET status='cancelled'
     WHERE id=$1
     AND status IN ('pending','processing')
     RETURNING id, status`,
    [req.params.id]
  );

  if (result.rows.length === 0) {
    return res.status(400).json({
      error: "Cannot cancel completed or unknown job",
    });
  }

  res.json(result.rows[0]);
});

router.get("/:id/download", async (req, res) => {
  const result = await pool.query(
    `SELECT file_path, status FROM exports WHERE id=$1`,
    [req.params.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Job not found" });
  }

  const job = result.rows[0];

  if (job.status !== "completed") {
    return res.status(400).json({
      error: "Export not completed yet",
    });
  }

  if (!fs.existsSync(job.file_path)) {
    return res.status(404).json({
      error: "File missing",
    });
  }

  res.download(job.file_path);
});

module.exports = router;
