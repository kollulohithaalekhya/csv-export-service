const fs = require("fs");
const path = require("path");
const { stringify } = require("csv-stringify");
const pool = require("../db/client");

const EXPORT_DIR = "/app/exports";
const BATCH_SIZE = 5000;
const MAX_CONCURRENT = 2;

let running = 0;

/**
 * Safe column whitelist
 */
const ALLOWED_COLUMNS = ["id", "name", "email", "country_code", "subscription_tier", "lifetime_value"];

/**
 * Process job
 */
async function processJob(job) {
  const client = await pool.connect();
  running++;

  const filePath = path.join(EXPORT_DIR, `${job.id}.csv`);

  try {
    // ✅ parse filters safely
    let filters = {};
    try {
      filters = job.filters ? JSON.parse(job.filters) : {};
    } catch (e) {
      console.error("Invalid filters JSON");
    }

    // ✅ sanitize columns
    let selectedColumns = job.columns
      ? job.columns.split(",").filter(c => ALLOWED_COLUMNS.includes(c))
      : ["id", "name", "email"];

    if (selectedColumns.length === 0) {
      selectedColumns = ["id", "name", "email"];
    }

    // total count for progress
    const countRes = await client.query(`SELECT COUNT(*) FROM users`);
    const total = parseInt(countRes.rows[0].count, 10);

    const csvStream = stringify({
      header: true,
      columns: selectedColumns,
    });

    const writeStream = fs.createWriteStream(filePath);
    csvStream.pipe(writeStream);

    let lastId = 0;
    let processed = 0;

    while (true) {
      // 🔴 cancel check
      const cancelCheck = await client.query(
        `SELECT status FROM exports WHERE id=$1`,
        [job.id]
      );

      if (cancelCheck.rows[0].status === "cancelled") {
        csvStream.end();
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return;
      }

      // ✅ SAFE dynamic query
      let query = `
        SELECT ${selectedColumns.join(",")}
        FROM users
        WHERE id > $1
      `;

      let values = [lastId];
      let idx = 2;

      if (filters.country_code) {
        query += ` AND country_code = $${idx++}`;
        values.push(filters.country_code);
      }

      if (filters.subscription_tier) {
        query += ` AND subscription_tier = $${idx++}`;
        values.push(filters.subscription_tier);
      }

      if (filters.min_ltv) {
        query += ` AND lifetime_value >= $${idx++}`;
        values.push(filters.min_ltv);
      }

      query += ` ORDER BY id LIMIT $${idx++}`;
      values.push(BATCH_SIZE);

      const res = await client.query(query, values);

      if (res.rows.length === 0) break;

      for (const row of res.rows) {
        csvStream.write(row);
      }

      lastId = res.rows[res.rows.length - 1].id;
      processed += res.rows.length;

      // ✅ correct progress
      const progress = Math.floor((processed / total) * 100);

      await client.query(
        `UPDATE exports SET progress=$1, updated_at=NOW() WHERE id=$2`,
        [progress, job.id]
      );
    }

    csvStream.end();
    await new Promise((r) => writeStream.on("finish", r));

    // final cancel check
    const finalCheck = await client.query(
      `SELECT status FROM exports WHERE id=$1`,
      [job.id]
    );

    if (finalCheck.rows[0].status === "cancelled") {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return;
    }

    await client.query(
      `UPDATE exports
       SET status='completed', progress=100, file_path=$1, updated_at=NOW()
       WHERE id=$2`,
      [filePath, job.id]
    );

    console.log("Export completed:", job.id);
  } catch (err) {
    console.error("Export failed:", err);

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await client.query(
      `UPDATE exports
       SET status='failed', error=$1, updated_at=NOW()
       WHERE id=$2`,
      [err.message, job.id]
    );
  } finally {
    running--;
    client.release();
  }
}

/**
 * Worker loop (atomic claim)
 */
async function startWorker() {
  console.log("Worker started...");

  setInterval(async () => {
    if (running >= MAX_CONCURRENT) return;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const res = await client.query(`
        SELECT * FROM exports
        WHERE status='pending'
        ORDER BY created_at
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      `);

      if (res.rows.length === 0) {
        await client.query("COMMIT");
        return;
      }

      const job = res.rows[0];

      await client.query(
        `UPDATE exports
         SET status='processing', updated_at=NOW()
         WHERE id=$1`,
        [job.id]
      );

      await client.query("COMMIT");

      processJob(job); // async
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Worker error:", err);
    } finally {
      client.release();
    }
  }, 2000);
}

module.exports = startWorker;