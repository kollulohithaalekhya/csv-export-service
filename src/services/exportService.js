const pool = require("../db");

async function createExport(id) {
  await pool.query(
    `INSERT INTO exports (id, status, progress)
     VALUES ($1, 'pending', 0)`,
    [id]
  );
}

async function updateExport(id, fields) {
  const keys = Object.keys(fields);
  const values = Object.values(fields);

  const setClause = keys
    .map((k, i) => `${k} = $${i + 2}`)
    .join(", ");

  await pool.query(
    `UPDATE exports
     SET ${setClause}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [id, ...values]
  );
}

async function getExport(id) {
  const { rows } = await pool.query(
    `SELECT * FROM exports WHERE id = $1`,
    [id]
  );
  return rows[0];
}

module.exports = {
  createExport,
  updateExport,
  getExport,
};
