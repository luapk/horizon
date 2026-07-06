import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { router } from "./routes.js";

/** The Express app, shared by the local server (server.ts) and the Vercel
 * serverless entry (api/index.ts). On Vercel the frontend is same-origin so
 * CORS is moot; locally the Vite dev server proxies /api here. */
export const app = express();

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use("/api", router);
