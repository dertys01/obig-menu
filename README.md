# O'big Food — Menu Digital

Menu digital pour **O'big Food** (African Food & Drinks · Abidjan) :
page unique, panier → commande WhatsApp, déployé sur Cloudflare Workers.

🔗 https://obig-menu.dertys01.workers.dev/

**Design & réalisation : [Edertys](https://edertys.com)**

## Stack

| Élément | Choix |
|---|---|
| Front | HTML + CSS + JavaScript vanilla, **sans build ni framework** |
| Données | `menu.json` (fallback) / Cloudflare KV (source de vérité en prod) |
| Back | Cloudflare Worker (`worker.js`) : `GET /api/menu`, `POST /api/admin/save` |
| Admin | `admin.html` (clé d'admin, voir `wrangler.toml`) |
| Images | WebP servies en local (`img/`) — voir `CREDITS.md` |
| Typo | Anton (titres) + Plus Jakarta Sans (texte) — Google Fonts |

## Structure

```
index.html      → page complète (design, rendu, recherche, panier, WhatsApp)
menu.json       → données du menu (prix en entiers FCFA)
worker.js       → API KV + assets statiques
admin.html      → interface d'édition du menu
img/            → images WebP optimisées
CREDITS.md      → provenance et licence de chaque image
TODO-PRIX.md    → ⚠️ prix à valider avec le restaurant
tests/qa.mjs    → contrôles automatisés (43 vérifications)
```

## Données (`menu.json`)

```jsonc
{
  "version": 3,
  "updatedAt": "2026-09-28",
  "restaurant": { "whatsapp": "2250708903332", "openHour": 11, "closeHour": 23, "zones": [...] },
  "categories": [{
    "id": "salades", "type": "items", "emoji": "🥗", "name": "Salades",
    "image": "img/salades.webp", "imagePosition": "center 45%",
    "items": [
      { "id": "big-classic", "name": "Big Classic", "desc": "…", "price": 3500 },
      { "id": "chawarma-poulet", "name": "…", "price": 2500, "priceAlt": 3000 },   // 2 tarifs
      { "id": "sauce-graine", "name": "…", "price": 2000, "prices": [2000,2500,3000] } // 3 tailles
    ]
  }]
}
```

- **Prix = nombre entier** (`3500`), jamais `"3.500F"` : le formatage est centralisé
  (`formatPrice()`), et l'admin peut encore écrire une chaîne sans casser l'affichage.
- `type` : `items` (cartes) · `tags` (accompagnements cliquables) · `drinks` (boissons).
- Les champs `tags` / `drinks` sont conservés pour rester compatibles avec `admin.html`.

## Développement

```bash
# serveur statique (le fallback /menu.json prend le relais sans KV)
python3 -m http.server 8787

# ou, avec l'API KV locale
npx wrangler dev
```

## Déploiement

```bash
# 1. publier le site
npx wrangler deploy

# 2. ⚠️ MAJ de la KV (SINON LES ANCIENS PRIX RESTENT AFFICHÉS)
npx wrangler kv key put menu --path menu.json --binding MENU_KV
```

Vérification : `curl -s https://obig-menu.dertys01.workers.dev/api/menu | head -c 200`

## Tests

```bash
# nécessite Playwright + un serveur local lancé sur le port 8787
node tests/qa.mjs
```

43 contrôles : rendu des 11 sections / 102 plats, exactitude des prix, panier,
message WhatsApp, recherche, scroll-spy, contrastes, cibles tactiles, responsive
390 px & 1440 px, absence d'erreurs JS.
