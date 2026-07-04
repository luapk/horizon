import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { router } from "./routes.js";

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
