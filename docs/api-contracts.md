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
