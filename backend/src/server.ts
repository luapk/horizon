import { app } from "./app.js";
import { listScans, saveScan } from "./db.js";

const PORT = Number(process.env.PORT ?? 8787);

async function main() {
  // Scans run in-process; anything still pending/running at boot was orphaned
  // by a restart and would otherwise show "running" forever.
  for (const scan of await listScans()) {
    if (scan.status === "pending" || scan.status === "running") {
      await saveScan({ ...scan, status: "failed", error: "interrupted by server restart" });
    }
  }

  app.listen(PORT, () => {
    console.log(`Horizon backend listening on :${PORT}`);
  });
}

void main();
