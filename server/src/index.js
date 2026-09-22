import express from "express";
import cors from "cors";
import "dotenv/config";

import aboutRouter from "./routes/about.js";
import authRouter from "./routes/auth.js";
import servicesRouter from "./routes/services.js";
import widgetsRouter from "./routes/widgets.js";

const app = express();
const PORT = process.env.PORT || 8080;

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

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
