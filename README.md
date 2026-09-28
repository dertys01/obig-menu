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
| Admin | `admin.html` (clé d'admin = **secret** Cloudflare `ADMIN_KEY`, jamais en clair) |
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
tests/qa.mjs    → contrôles automatisés du site (43 vérifications)
tests/admin.mjs → contrôles automatisés de l'administration (21 vérifications)
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
# 1. publier le site (worker + assets)
npx wrangler deploy

# 2. ⚠️ MAJ de la KV (SINON LES ANCIENS PRIX RESTENT AFFICHÉS)
#    --remote est INDISPENSABLE : sans lui, wrangler écrit dans la KV locale
npx wrangler kv key put menu --path menu.json --binding MENU_KV --remote
```

Vérification : `curl -s https://obig-menu.dertys01.workers.dev/api/menu | head -c 200`

### Clé d'administration

`ADMIN_KEY` est un **secret Cloudflare** (jamais dans `wrangler.toml`, jamais dans le dépôt) :

```bash
# créer / changer la clé (32 caractères aléatoires conseillés)
openssl rand -hex 16
npx wrangler secret put ADMIN_KEY      # collez la valeur puis Entrée
```

L'interface se trouve sur `/admin` et se connecte via `GET /api/admin/ping`
(vérifie la clé **sans** écrire). Toute écriture passe par `POST /api/admin/save`
qui **refuse** les payloads sans `categories[]`.

## Tests

```bash
# site (nécessite Playwright + serveur local sur 8787, ou BASE=https://…)
node tests/qa.mjs

# administration (nécessite Playwright + la clé admin)
KEY=<clé> node tests/admin.mjs
```

43 contrôles (`tests/qa.mjs`) : rendu des 11 sections / 102 plats, exactitude des
prix, panier, message WhatsApp, recherche, scroll-spy, contrastes, cibles tactiles,
responsive 390 px & 1440 px, absence d'erreurs JS.

21 contrôles (`tests/admin.mjs`) : accès `/admin`, refus d'une mauvaise clé, 11
sections éditables, 2ᵉ/3ᵉ tarifs éditables, ajout d'une boisson, aller-retour
réel prix → API → restauration, prix restés en nombres entiers.
