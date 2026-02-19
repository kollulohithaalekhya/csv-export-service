const express = require("express");
const exportsRoute = require("./api/exports");
const startWorker = require("./jobs/exportWorker");

const app = express();
app.use(express.json());

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.use("/exports", exportsRoute);

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
startWorker();

