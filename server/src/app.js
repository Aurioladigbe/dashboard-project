import express from "express";
import cors from "cors";
import "dotenv/config";

import aboutRouter from "./routes/about.js";
import authRouter from "./routes/auth.js";
import servicesRouter from "./routes/services.js";
import widgetsRouter from "./routes/widgets.js";

export const app = express();

app.use(cors());
app.use(express.json());

// Route exigee par le sujet : GET /about.json
app.use("/about.json", aboutRouter);

app.use("/api/auth", authRouter);
app.use("/api/services", servicesRouter);
app.use("/api/widgets", widgetsRouter);

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Dashboard API" });
});
