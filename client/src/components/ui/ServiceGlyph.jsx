import Icon from "./Icon";
import { serviceMeta } from "../../lib/catalog";

// Le glyphe d'un service : son icône, dans une tuile teintée de sa lumière.
export default function ServiceGlyph({ service, size = "md" }) {
  const meta = serviceMeta(service);
  const box = size === "lg" ? "h-11 w-11 rounded-xl" : size === "sm" ? "h-6 w-6 rounded-md" : "h-8 w-8 rounded-[9px]";
  const icon = size === "lg" ? 22 : size === "sm" ? 14 : 17;
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center border ${box}`}
      style={{ color: meta.light, backgroundColor: `${meta.light}1f`, borderColor: `${meta.light}40` }}
    >
      <Icon name={meta.icon} size={icon} />
    </span>
  );
}
