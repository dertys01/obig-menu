# À valider avec le restaurant

Les fichiers Google Drive fournis (28/09/2026) couvrent **4 sections** :
Salades, Chawarmas, Burgers, Pizzas (+ 1 sandwich).

Les prix des autres sections ont été **repris à l'identique** de la version précédente du site.
Ils ne doivent pas être publiés comme définitifs sans validation.

## 1. Sections NON couvertes par les fichiers Drive

| Section | Éléments | État |
|---|---|---|
| Sandwichs (hors « Poulet Crispy Assiette ») | 13 | ⚠️ prix antérieurs conservés |
| Paninis | 6 | ⚠️ prix antérieurs conservés |
| Grillades | 6 | ⚠️ prix antérieurs conservés |
| Pâtes, Riz & Couscous | 24 | ⚠️ prix antérieurs conservés |
| Plats Africains | 24 | ⚠️ prix antérieurs conservés |
| Accompagnements | 17 tags | ⚠️ supplément 1 000 F conservé |
| Boissons | 7 groupes | ⚠️ prix antérieurs conservés |

## 2. Points ambiguïté relevés sur les fichiers

1. **Burgers — « ASSIETTE 3 000 F / 4 000 F »** : que représentent les 2 tarifs ?
   (sandwich / plat ? petit / grand ? avec ou sans frites ?)
   → le site affiche tels quels : `3 000 F / 4 000 F`.
2. **« Sandwich Poulet Crispy Assiette » (3 000 F / 3 500 F)** : présent sous
   *NOS CHAWARMAS* sur l'imprimé, classé ici dans *Sandwichs*. À confirmer.
3. **Chili Bœuf** : Sandwich 2 500 F mais Plat `2 000 F / 3 000 F` — le sandwich
   plat est-il moins cher que le sandwich seul ? (incohérence possible à l'origine)
4. **Sauce Mouton** : `2 500 F / 3 000 F / 6 000 F` — 3 tailles confirmées ?
5. **Livraison** : aucun tarif par commune n'est affiché (volontairement),
   seule la zone est proposée. Fournir les tarifs pour les afficher.
6. **Boissons** : prix par référence (bières, vins) repris de l'ancien menu.
7. **Sandwichs simples** (viande / poulet / combo) : `1 500 F / 2 000 F` inchangé —
   à vérifier : la tendance constatée sur les autres sections est +40 à +60 %.

## 3. Procédure de mise à jour après validation

1. Modifier `menu.json` (prix en **nombre entier** : `3500`, jamais `"3.500F"`).
2. Recharger la KV **sinon le site continuera d'afficher les anciens prix** :
   ```bash
   npx wrangler kv key put menu --path menu.json --binding MENU_KV
   ```
   ou via l'interface d'administration (`admin.html`) avec la clé d'admin.
3. Vérifier sur le site : `/api/menu` doit renvoyer les nouveaux prix.
4. Mettre à jour `updatedAt` dans `menu.json`.
