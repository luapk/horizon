import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { router } from "./routes.js";
import { listScans, saveScan } from "./db.js";

// Scans run in-process; anything still pending/running at boot was orphaned
// by a restart and would otherwise show "running" forever.
for (const scan of listScans()) {
  if (scan.status === "pending" || scan.status === "running") {
    saveScan({ ...scan, status: "failed", error: "interrupted by server restart" });
  }
}

const app = express();
const PORT = Number(process.env.PORT ?? 8787);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use("/api", router);

app.listen(PORT, () => {
  console.log(`Horizon backend listening on :${PORT}`);
});
