import { useId } from "react";
import Icon from "../ui/Icon";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { formatMoney, formatPercent, formatRelative, formatWeekday, safeUrl } from "../../lib/format";

// Chaque vue reçoit { data, config } : `data` est exactement ce que renvoie
// GET /api/widgets/:id/data. Tout texte passe par React (échappé), les liens par safeUrl.

const EMBER = "#FFA657";

function ExternalLink({ href, className = "", children }) {
  const url = safeUrl(href);
  if (!url) return <span className={className}>{children}</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`decoration-white/30 underline-offset-4 hover:underline ${className}`}
    >
      {children}
      <span className="sr-only"> (s'ouvre dans un nouvel onglet)</span>
    </a>
  );
}

function Empty({ children = "Aucun résultat." }) {
  return <p className="text-sm text-haze">{children}</p>;
}

function toNumber(value) {
  const n = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(n) ? null : n;
}

/* ───────── Météo ───────── */

// data = { city, temperature, unit }
function WeatherTemperature({ data }) {
  const value = useAnimatedNumber(toNumber(data.temperature));
  return (
    <div className="flex h-full flex-col justify-between gap-2">
      <p className="flex items-center gap-1.5 text-sm text-haze">
        <Icon name="pin" size={14} />
        {data.city}
      </p>
      <p className="type-numeral num-xl text-frost">
        {value === null ? "–" : Math.round(value)}
        <span className="ml-1 align-top text-[0.32em] font-normal tracking-normal text-haze">{data.unit ?? "°C"}</span>
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
      <p className="mb-2 flex items-center gap-1.5 text-sm text-haze">
        <Icon name="pin" size={14} />
        {data.city}
      </p>
      <ul>
        {days.map((day) => {
          const left = ((day.tempMin - low) / span) * 100;
          const width = Math.max(((day.tempMax - day.tempMin) / span) * 100, 6);
          return (
            <li key={day.date} className="grid grid-cols-[4.25rem_1fr_5.5rem] items-center gap-3 py-1.5 text-sm">
              <span className="capitalize text-haze">{formatWeekday(day.date)}</span>
              <span className="relative h-1 rounded-full bg-white/[0.07]" aria-hidden="true">
                <span
                  className="absolute top-0 h-full rounded-full bg-gradient-to-r from-light-sky to-light-ember"
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
   Le backend n'a pas encore de service crypto : ces vues suivent le contrat
   de docs/api-contracts.md ("Formes de données des widgets"). */

function Change({ value, suffix, digits = 2 }) {
  const up = value >= 0;
  const amount = formatPercent(Math.abs(value), digits);
  return (
    <p
      className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        up ? "bg-light-aurora/[0.12] text-light-aurora" : "bg-alert/[0.12] text-alert"
      }`}
    >
      <Icon name={up ? "arrow-up" : "arrow-down"} size={12} />
      <span aria-hidden="true">{`${amount} % ${suffix}`}</span>
      <span className="sr-only">{`${up ? "En hausse de" : "En baisse de"} ${amount} % ${suffix}`}</span>
    </p>
  );
}

// data = { coin, currency, price, change24h? }   (change24h en %)
function CryptoPrice({ data }) {
  const price = useAnimatedNumber(toNumber(data.price));
  const change = toNumber(data.change24h);
  return (
    <div className="flex h-full flex-col justify-between gap-3">
      <p className="text-sm capitalize text-haze">{data.coin}</p>
      <p className="type-numeral num-lg text-frost">{formatMoney(price, data.currency)}</p>
      {change !== null && <Change value={change} suffix="sur 24 h" />}
    </div>
  );
}

// data = { coin, currency, points: [{ date, price }] }
function CryptoHistory({ data }) {
  const gradientId = `area-${useId().replace(/:/g, "")}`;
  const values = (data.points ?? []).map((p) => toNumber(p.price)).filter((v) => v !== null);
  const last = useAnimatedNumber(values.length ? values[values.length - 1] : null);
  if (values.length === 0) return <Empty>Aucun historique disponible.</Empty>;

  const first = values[0];
  const end = values[values.length - 1];
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  const coords = values.map((v, i) => {
    const x = values.length === 1 ? 50 : (i / (values.length - 1)) * 100;
    const y = 38 - ((v - low) / span) * 34;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = coords.join(" ");
  const evolution = first ? ((end - first) / first) * 100 : 0;
  const label = `Évolution du prix de ${data.coin} : de ${formatMoney(first, data.currency)} à ${formatMoney(end, data.currency)}`;

  return (
    <div className="flex h-full flex-col gap-2">
      <div>
        <p className="text-sm capitalize text-haze">{data.coin}</p>
        <p className="type-numeral mb-2 text-3xl text-frost">{formatMoney(last, data.currency)}</p>
        <Change value={evolution} suffix="sur la période" digits={1} />
      </div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label={label} className="min-h-20 w-full flex-1">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={EMBER} stopOpacity="0.35" />
            <stop offset="100%" stopColor={EMBER} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,40 ${line} 100,40`} fill={`url(#${gradientId})`} />
        <polyline points={line} fill="none" stroke={EMBER} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between text-xs text-haze">
        <span>Min {formatMoney(low, data.currency)}</span>
        <span>Max {formatMoney(high, data.currency)}</span>
      </div>
    </div>
  );
}

/* ───────── GitHub ───────── */

// data = [{ sha, message, author, date }]
function GithubCommits({ data }) {
  if (!Array.isArray(data) || data.length === 0) return <Empty>Aucun commit.</Empty>;
  return (
    <ul className="divide-y divide-white/[0.06]">
      {data.map((commit) => (
        <li key={commit.sha} className="flex gap-3 py-2.5 first:pt-0">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-light-orchid/15 text-xs font-semibold uppercase text-light-orchid"
          >
            {String(commit.author ?? "?").charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm">{commit.message || "(sans message)"}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-haze">
              <span>{commit.author}</span>
              <span>{formatRelative(commit.date)}</span>
              <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-frost">
                {String(commit.sha).slice(0, 7)}
              </code>
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

// data = [{ name, description, stars, url, updatedAt }]
function GithubRepos({ data }) {
  if (!Array.isArray(data) || data.length === 0) return <Empty>Aucun dépôt public.</Empty>;
  return (
    <ul className="divide-y divide-white/[0.06]">
      {data.map((repo) => (
        <li key={repo.url ?? repo.name} className="py-2.5 first:pt-0">
          <div className="flex items-start justify-between gap-3">
            <ExternalLink href={repo.url} className="text-sm font-medium text-light-orchid">
              {repo.name}
            </ExternalLink>
            <span className="flex shrink-0 items-center gap-1 text-xs text-haze">
              <Icon name="star" size={13} />
              <span className="tabular-nums">{repo.stars}</span>
              <span className="sr-only"> étoiles</span>
            </span>
          </div>
          {repo.description && <p className="mt-0.5 line-clamp-2 text-sm text-haze">{repo.description}</p>}
          <p className="mt-1 text-xs text-haze">Mis à jour {formatRelative(repo.updatedAt)}</p>
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
    <ul className="divide-y divide-white/[0.06]">
      {data.map((article, index) => (
        <li key={article.link || index} className="py-2.5 first:pt-0">
          <ExternalLink href={article.link} className="text-sm font-medium leading-snug">
            {article.title}
          </ExternalLink>
          {article.publishedAt && <p className="mt-0.5 text-xs text-haze">{formatRelative(article.publishedAt)}</p>}
          {article.summary && <p className="mt-1 line-clamp-2 text-sm text-haze">{article.summary}</p>}
        </li>
      ))}
    </ul>
  );
}

// data = { feedTitle, title, link, publishedAt, summary }
function RssPreview({ data }) {
  return (
    <div>
      {data.feedTitle && <p className="text-sm text-light-aurora">{data.feedTitle}</p>}
      <p className="type-display mt-1.5 text-xl leading-tight">
        <ExternalLink href={data.link}>{data.title}</ExternalLink>
      </p>
      {data.publishedAt && <p className="mt-2 text-xs text-haze">{formatRelative(data.publishedAt)}</p>}
      {data.summary && <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-haze">{data.summary}</p>}
    </div>
  );
}

// Registre "service:type" -> vue. Même clé que WIDGET_DATA_HANDLERS côté serveur.
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
