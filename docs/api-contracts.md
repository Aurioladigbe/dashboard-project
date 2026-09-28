# Contrats d'API — à figer ensemble le jour 1

Toute modification de ce fichier doit être discutée à deux avant d'être codée.

## Auth

### POST /api/auth/register
Body: `{ email, username, password }`
201: `{ token, user: { id, email, username, role, confirmed, createdAt } }`

### POST /api/auth/login
Body: `{ email, password }`
200: `{ token, user }`

### GET /api/auth/me
Header: `Authorization: Bearer <token>`
200: `{ user }`

### GET /api/auth/github  →  GET /api/auth/github/callback
Flow OAuth GitHub. Lie le compte GitHub à l'utilisateur connecté (ou en crée un).

## Services

### GET /api/services
Public. Catalogue complet (source: `server/src/config/services.json`).
200: `{ services: [ { name, requiresAuth, widgets: [ { name, description, params: [{name, type}] } ] } ] }`

### GET /api/services/mine
Auth requise. 200: `{ subscriptions: [ { service, createdAt } ] }`

### POST /api/services/:service/subscribe
Auth requise. Body: `{ credentials?: {...} }`
201: `{ subscription }`

### DELETE /api/services/:service/subscribe
Auth requise. 204.

## Widgets

### GET /api/widgets
Auth requise. 200: `{ widgets: [ { id, service, type, config, refreshRate, x, y, w, h } ] }`

### POST /api/widgets
Auth requise. Body: `{ service, type, config, refreshRate, x, y, w, h }`
201: `{ widget }`

### PATCH /api/widgets/:id
Auth requise. Body: champs partiels à mettre à jour.
200: `{ widget }`

### DELETE /api/widgets/:id
Auth requise. 204.

## about.json (spec imposée par le sujet — ne pas modifier la forme)

### GET /about.json
```json
{
  "client": { "host": "..." },
  "server": {
    "current_time": 1531680780,
    "services": [
      { "name": "weather", "widgets": [ { "name": "city_temperature", "params": [ { "name": "city", "type": "string" } ] } ] }
    ]
  }
}
```

## Convention d'erreurs

Toute erreur renvoie `{ error: "message lisible" }` avec le code HTTP approprié
(400 validation, 401 non authentifié, 403 interdit, 404 introuvable, 409 conflit).

---

## Données des widgets (ajouté par le frontend)

### GET /api/widgets/:id/data
Auth requise. Renvoie les données en direct d'UN widget du dashboard de l'utilisateur.
- 200 : `{ data: <forme ci-dessous selon "service:type"> }`
- erreurs : `{ error: "message lisible, affiché tel quel dans le widget" }` avec 400 (config invalide), 403 (quota GitHub), 404 (ville / dépôt / flux introuvable), 501 (type sans source de données), 502 (service externe en panne).

Le frontend affiche le champ `error` directement à l'utilisateur : il doit donc être en français et compréhensible.

### Formes de `data`

| Clé `service:type` | `data` | État |
|---|---|---|
| `weather:city_temperature` | `{ city, temperature, unit }` | ✅ serveur |
| `weather:forecast` | `{ city, days: [{ date: "YYYY-MM-DD", tempMax, tempMin }] }` | ✅ serveur |
| `github:recent_commits` | `[{ sha, message, author, date }]` | ✅ serveur |
| `github:repo_list` | `[{ name, description, stars, url, updatedAt }]` | ✅ serveur |
| `rss:article_list` | `[{ title, link, publishedAt, summary }]` | ✅ serveur |
| `rss:feed_preview` | `{ feedTitle, title, link, publishedAt, summary }` | ✅ serveur |
| `crypto:price` | `{ coin, currency, price, change24h }` | 🟡 **à implémenter côté serveur** |
| `crypto:price_history` | `{ coin, currency, points: [{ date, price }] }` | 🟡 **à implémenter côté serveur** |

### Contrat proposé pour le service crypto (déjà géré par le frontend)
- `currency` : code en minuscules (`"usd"`, `"eur"`, `"gbp"`), le même que celui reçu dans `config.currency`.
- `coin` : l'identifiant reçu dans `config.coin` (ex. `"bitcoin"`), renvoyé tel quel.
- `price`, `points[].price` : des **nombres** (pas des chaînes).
- `change24h` : variation sur 24 h **en pourcentage** (ex. `-2.5`), optionnel.
- `points` : du plus ancien au plus récent ; `date` au format ISO.
- Source suggérée : CoinGecko (`/simple/price` avec `include_24hr_change=true`, et `/coins/{id}/market_chart`), sans clé API.
- Ajouter les deux entrées dans `WIDGET_DATA_HANDLERS` de `server/src/routes/widgets.js`.

Tant que ces handlers n'existent pas, l'API répond 501 et le widget affiche le message d'erreur, sans casser le dashboard.
