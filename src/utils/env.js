require("dotenv").config();

module.exports = {
  apiPort: process.env.API_PORT || 8080,
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://exporter:secret@db:5432/exports_db",
  redisUrl: process.env.REDIS_URL || "redis://redis:6379",
  exportPath: process.env.EXPORT_STORAGE_PATH || "/app/exports",
};
