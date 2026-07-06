import { app } from "../backend/src/app.js";

/** Vercel serverless entry: every /api/* request is rewritten here
 * (vercel.json) and handled by the same Express app the local server runs.
 * Scan pipelines started by POST /api/scans keep running after the response
 * via waitUntil, up to the function's maxDuration. */
export default app;
