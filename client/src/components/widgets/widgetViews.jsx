import Icon from "../ui/Icon";
import { formatMoney, formatRelative, formatWeekday, safeUrl } from "../../lib/format";

// Chaque vue reçoit { data, config } : `data` est exactement ce que renvoie
// GET /api/widgets/:id/data (champ "data"). Tout texte est affiché via React
// (échappé) ; les liens passent par safeUrl.

function ExternalLink({ href, className = "", children }) {
  const url = safeUrl(href);
  if (!url) return <span className={className}>{children}</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`underline-offset-2 hover:underline ${className}`}
    >
      {children}
      <span className="sr-only"> (s'ouvre dans un nouvel onglet)</span>
    </a>
  );
}

function Empty({ children = "Aucun résultat." }) {
  return <p className="text-sm text-mist">{children}</p>;
}

/* ───────── Météo ───────── */

// data = { city, temperature, unit }
function WeatherTemperature({ data }) {
  const value = Number(data.temperature);
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="text-sm text-mist">{data.city}</p>
      <p className="font-display text-7xl leading-none">
        {Number.isFinite(value) ? Math.round(value) : "–"}
        <span className="ml-1 align-top text-3xl">{data.unit ?? "°C"}</span>
      </p>
    </div>
  );
}

// data = { city, days: [{ date, tempMax, tempMin }] }
function WeatherForecast({ data }) {
  const days = data.days ?? [];
  if (days.length === 0) return <Empty>Aucune prévision disponible.</Empty>;

  const low = Math.min(...days.map((d) => d.tempMin));
  const high = Math.max(...days.map((d) => d.tempMax));
  const span = high - low || 1;

  return (
    <div>
      <p className="mb-1 text-sm text-mist">{data.city}</p>
      <ul>
        {days.map((day) => {
          const left = ((day.tempMin - low) / span) * 100;
          const width = Math.max(((day.tempMax - day.tempMin) / span) * 100, 6);
          return (
            <li key={day.date} className="grid grid-cols-[4.5rem_1fr_5.5rem] items-center gap-3 py-1.5 text-sm">
              <span className="capitalize">{formatWeekday(day.date)}</span>
              <span className="relative h-1.5 rounded-full bg-ink-700" aria-hidden="true">
                <span
                  className="absolute top-0 h-full rounded-full bg-tile-weather"
                  style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }}
                />
              </span>
              <span className="text-right tabular-nums">
                {Math.round(day.tempMin)}° / {Math.round(day.tempMax)}°
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ───────── Crypto ─────────
   Le backend n'a pas encore de service crypto : ces deux vues suivent le contrat
   proposé dans docs/api-contracts.md ("Formes de données des widgets"). */

// data = { coin, currency, price, change24h? }   (change24h en %)
function CryptoPrice({ data }) {
  const change = Number(data.change24h);
  const hasChange = data.change24h !== undefined && data.change24h !== null && Number.isFinite(change);
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="text-sm capitalize text-mist">{data.coin}</p>
      <p className="font-display text-5xl leading-none tabular-nums">{formatMoney(data.price, data.currency)}</p>
      {hasChange && (
        <p className={`mt-2 text-sm font-medium ${change >= 0 ? "text-tile-rss" : "text-danger"}`}>
          {change >= 0 ? "En hausse de " : "En baisse de "}
          {Math.abs(change).toFixed(2)} % sur 24 h
        </p>
      )}
    </div>
  );
}

function Sparkline({ values, label }) {
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  const points = values
    .map((v, i) => {
      const x = values.length === 1 ? 50 : (i / (values.length - 1)) * 100;
      const y = 36 - ((v - low) / span) * 32;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label={label} className="h-24 w-full text-tile-crypto">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// data = { coin, currency, points: [{ date, price }] }
function CryptoHistory({ data }) {
  const points = (data.points ?? []).filter((p) => Number.isFinite(Number(p.price)));
  if (points.length === 0) return <Empty>Aucun historique disponible.</Empty>;

  const values = points.map((p) => Number(p.price));
  const first = values[0];
  const last = values[values.length - 1];
  const evolution = first ? ((last - first) / first) * 100 : 0;
  const label = `Évolution du prix de ${data.coin} : de ${formatMoney(first, data.currency)} à ${formatMoney(last, data.currency)}`;

  return (
    <div>
      <p className="text-sm capitalize text-mist">{data.coin}</p>
      <p className="font-display text-3xl tabular-nums">{formatMoney(last, data.currency)}</p>
      <Sparkline values={values} label={label} />
      <div className="mt-1 flex justify-between text-xs text-mist">
        <span>Min {formatMoney(Math.min(...values), data.currency)}</span>
        <span className={evolution >= 0 ? "text-tile-rss" : "text-danger"}>
          {evolution >= 0 ? "+" : "−"}
          {Math.abs(evolution).toFixed(1)} % sur la période
        </span>
        <span>Max {formatMoney(Math.max(...values), data.currency)}</span>
      </div>
    </div>
  );
}

/* ───────── GitHub ───────── */

// data = [{ sha, message, author, date }]
function GithubCommits({ data }) {
  if (!Array.isArray(data) || data.length === 0) return <Empty>Aucun commit.</Empty>;
  return (
    <ul className="divide-y divide-ink-700">
      {data.map((commit) => (
        <li key={commit.sha} className="py-2 first:pt-0">
          <p className="line-clamp-2 text-sm font-medium">{commit.message || "(sans message)"}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-mist">
            <span>{commit.author}</span>
            <span>{formatRelative(commit.date)}</span>
            <code className="font-mono">{String(commit.sha).slice(0, 7)}</code>
          </p>
        </li>
      ))}
    </ul>
  );
}

// data = [{ name, description, stars, url, updatedAt }]
function GithubRepos({ data }) {
  if (!Array.isArray(data) || data.length === 0) return <Empty>Aucun dépôt public.</Empty>;
  return (
    <ul className="divide-y divide-ink-700">
      {data.map((repo) => (
        <li key={repo.url ?? repo.name} className="py-2 first:pt-0">
          <div className="flex items-start justify-between gap-3">
            <ExternalLink href={repo.url} className="text-sm font-semibold text-tile-github">
              {repo.name}
            </ExternalLink>
            <span className="flex shrink-0 items-center gap-1 text-xs text-mist">
              <Icon name="star" size={14} />
              <span className="tabular-nums">{repo.stars}</span>
              <span className="sr-only"> étoiles</span>
            </span>
          </div>
          {repo.description && <p className="line-clamp-2 text-sm text-mist">{repo.description}</p>}
          <p className="mt-0.5 text-xs text-mist">Mis à jour {formatRelative(repo.updatedAt)}</p>
        </li>
      ))}
    </ul>
  );
}

/* ───────── RSS ───────── */

// data = [{ title, link, publishedAt, summary }]
function RssArticles({ data }) {
  if (!Array.isArray(data) || data.length === 0) return <Empty>Ce flux ne contient aucun article.</Empty>;
  return (
    <ul className="divide-y divide-ink-700">
      {data.map((article, index) => (
        <li key={article.link || index} className="py-2 first:pt-0">
          <ExternalLink href={article.link} className="text-sm font-semibold">
            {article.title}
          </ExternalLink>
          {article.publishedAt && <p className="text-xs text-mist">{formatRelative(article.publishedAt)}</p>}
          {article.summary && <p className="mt-1 line-clamp-2 text-sm text-mist">{article.summary}</p>}
        </li>
      ))}
    </ul>
  );
}

// data = { feedTitle, title, link, publishedAt, summary }
function RssPreview({ data }) {
  return (
    <div>
      {data.feedTitle && <p className="text-sm text-mist">{data.feedTitle}</p>}
      <p className="mt-1 text-lg font-semibold leading-snug">
        <ExternalLink href={data.link}>{data.title}</ExternalLink>
      </p>
      {data.publishedAt && <p className="mt-1 text-xs text-mist">{formatRelative(data.publishedAt)}</p>}
      {data.summary && <p className="mt-2 line-clamp-4 text-sm text-mist">{data.summary}</p>}
    </div>
  );
}

// Registre "service:type" -> vue. Même clé que WIDGET_DATA_HANDLERS côté serveur :
// ajouter un widget = une ligne ici + une ligne dans widgets.js côté API.
export const WIDGET_VIEWS = {
  "weather:city_temperature": WeatherTemperature,
  "weather:forecast": WeatherForecast,
  "crypto:price": CryptoPrice,
  "crypto:price_history": CryptoHistory,
  "github:recent_commits": GithubCommits,
  "github:repo_list": GithubRepos,
  "rss:article_list": RssArticles,
  "rss:feed_preview": RssPreview,
};
