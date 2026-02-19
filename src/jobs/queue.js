const { Queue } = require("bullmq");
const { redis } = require("../utils/env");

const exportQueue = new Queue("export-csv", {
  connection: {
    host: redis.host,
    port: redis.port,
  },
});

module.exports = exportQueue;
