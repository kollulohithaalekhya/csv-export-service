const fs = require("fs");
const path = require("path");
const { stringify } = require("csv-stringify");
const pool = require("../db/client");

const EXPORT_DIR = "/app/exports";
const BATCH_SIZE = 5000;
const MAX_CONCURRENT = 2;

let running = 0;

async function processJob(job) {
  const client = await pool.connect();
  running++;

  try {
    const filePath = path.join(EXPORT_DIR, `${job.id}.csv`);

    const totalRes = await client.query(`SELECT COUNT(*) FROM users`);
    const total = parseInt(totalRes.rows[0].count, 10);

    const writeStream = fs.createWriteStream(filePath);
    const csvStream = stringify({
      header: true,
      columns: ["id", "name", "email"],
    });

    csvStream.pipe(writeStream);

    let offset = 0;

    while (offset < total) {
      const cancelCheck = await client.query(
        `SELECT status FROM exports WHERE id=$1`,
        [job.id]
      );

      if (cancelCheck.rows[0].status === "cancelled") {
        console.log(`Export cancelled: ${job.id}`);
        csvStream.end();
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return;
      }

      await new Promise(r => setTimeout(r, 150));

      const res = await client.query(
        `SELECT id, name, email
         FROM users
         ORDER BY id
         LIMIT $1 OFFSET $2`,
        [BATCH_SIZE, offset]
      );

      for (const row of res.rows) {
        csvStream.write(row);
      }

      offset += res.rows.length;

      const progress = Math.floor((offset / total) * 100);

      await client.query(
        `UPDATE exports SET progress=$1 WHERE id=$2`,
        [progress, job.id]
      );
    }

    csvStream.end();
    await new Promise(resolve => writeStream.on("finish", resolve));

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
       SET status='completed', progress=100, file_path=$1
       WHERE id=$2`,
      [filePath, job.id]
    );

    console.log(`Export completed: ${job.id}`);
  } catch (err) {
    console.error("Export failed:", err);

    await client.query(
      `UPDATE exports SET status='failed', error=$1 WHERE id=$2`,
      [err.message, job.id]
    );
  } finally {
    running--;
    client.release();
  }
}

async function startWorker() {
  console.log("Export worker started...");

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
        `UPDATE exports SET status='processing' WHERE id=$1`,
        [job.id]
      );

      await client.query("COMMIT");

      processJob(job);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Worker loop error:", err);
    } finally {
      client.release();
    }
  }, 3000);
}

module.exports = startWorker;
