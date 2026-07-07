import { app } from "./app.js";

const PORT = Number(process.env.PORT ?? 8787);

// No boot sweep: with the resumable step pipeline, a scan interrupted by a
// restart picks up from its checkpoint the next time a client steps it; scans
// nobody resumes are failed by the staleness guard on read.
app.listen(PORT, () => {
  console.log(`Horizon backend listening on :${PORT}`);
});
