import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const servicesPath = path.join(__dirname, "..", "config", "services.json");

const router = Router();

router.get("/", (req, res) => {
  const rawServices = JSON.parse(fs.readFileSync(servicesPath, "utf-8"));

  // On ne garde QUE les champs exiges par la spec (name, widgets[].name, params[].name/type)
  // pour eviter toute ambiguite avec le validateur automatique.
  const services = rawServices.map((service) => ({
    name: service.name,
    widgets: service.widgets.map((widget) => ({
      name: widget.name,
      params: widget.params.map((param) => ({
        name: param.name,
        type: param.type,
      })),
    })),
  }));

  const clientHost =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.socket.remoteAddress ||
    req.ip;

  res.json({
    client: {
      host: clientHost,
    },
    server: {
      current_time: Math.floor(Date.now() / 1000),
      services,
    },
  });
});

export default router;
