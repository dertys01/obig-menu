import { createRequire } from 'module';

const BASE = process.env.BASE || 'https://obig-menu.dertys01.workers.dev';
const KEY = process.env.KEY;
const _req = createRequire(import.meta.url);
function req(p) { try { return _req('playwright'); } catch { return _req(p); } }
const { chromium } = req(process.env.PLAYWRIGHT || 'playwright');

const checks = [];
const ok = (name, pass, extra = '') => checks.push(`${pass ? 'OK  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
const api = async (path, opts = {}) => {
  const r = await fetch(BASE + path, opts);
  let body = null;
  try { body = await r.json(); } catch { /* vide */ }
  return { status: r.status, body };
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
/* le 401 de la « mauvaise clé » est volontaire dans ce test */
page.on('console', m => {
  if (m.type() !== 'error') return;
  if (m.text().includes('401') || m.text().includes('Failed to load resource')) return;
  errs.push('console: ' + m.text());
});

/* 1 ── Accès / login */
await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
ok('page /admin chargée', await page.locator('#loginWrap').isVisible());

await page.fill('#loginInput', 'mauvaise-cle');
await page.click('#loginBtn');
await page.waitForTimeout(600);
ok('mauvaise clé → refus', !(await page.locator('#adminWrap').isVisible()));

await page.fill('#loginInput', KEY);
await page.click('#loginBtn');
await page.waitForSelector('#adminWrap', { state: 'visible', timeout: 8000 });
ok('login bonne clé → interface', true);

/* 2 ── Structure : 11 sections, champs présents */
await page.waitForFunction(() => document.querySelectorAll('.tab-btn').length === 11, null, { timeout: 8000 });
const tabs = await page.locator('.tab-btn').count();
ok('11 onglets de section', tabs === 11, `${tabs}`);
ok('en-tête section (titre/emoji)', await page.locator('.section-row input[data-cat="name"]').count() === 1);

/* 3 ── Balayage des 3 types de panneaux */
let itemsRows = 0, tagsChips = 0, drinkRows = 0, altItems = 0, altDrinks = 0, prices3Shown = 0;
for (let i = 0; i < 11; i++) {
  await page.locator('.tab-btn').nth(i).click();
  await page.waitForTimeout(120);
  const s = await page.evaluate(() => ({
    sect: (document.querySelector('.section-row input[data-cat="name"]') || {}).value ?? null,
    names: document.querySelectorAll('#panels .item-row input[data-field="name"]').length,
    tags: document.querySelectorAll('#panels .tag-chip').length,
    detail: document.querySelectorAll('#panels input[data-field="items"]').length, // boisson
    alt: document.querySelectorAll('#panels input[data-field="priceAlt"]').length,
    p3: document.querySelectorAll('#panels input[data-field="prices"]').length,
  }));
  if (s.sect === null) { ok(`onglet ${i} rendu`, false, 'en-tête absent'); continue; }
  if (s.tags) { tagsChips += s.tags; continue; }
  if (s.detail) { drinkRows = s.names; altDrinks = s.alt; continue; }
  itemsRows += s.names;
  altItems += s.alt;
  prices3Shown += s.p3;
}
ok('panneaux items rendus (102 plats)', itemsRows === 102, `${itemsRows}`);
ok('panneau tags rendu', tagsChips === 17, `${tagsChips} chips`);
ok('2ᵉ tarif éditable — items (96 : 102 − 6 à 3 tarifs)', altItems === 96, `${altItems}`);
ok('3 tarifs éditable (6 items × 3 champs)', prices3Shown === 18, `${prices3Shown}`);
ok('boissons éditables (7)', drinkRows === 7, `${drinkRows}`);
ok('2ᵉ tarif éditable — boisson (7)', altDrinks === 7, `${altDrinks}`);
ok('bouton ajouter boisson', await page.locator('.add-item-btn').last().isVisible());

/* 4 ── Round-trip réel : modifier un prix → API → annuler → API */
const TARGET_CAT = 'pizzas', TARGET_ITEM = 'Pizza Margherita';
const readApi = async () => (await api('/api/menu')).body;
const before = await readApi();
const getVal = (doc, cat, name) => {
  const c = doc.categories.find(x => x.id === cat);
  const it = c.items.find(x => x.name === name);
  return { price: it.price, priceAlt: it.priceAlt };
};
const ref = getVal(before, TARGET_CAT, TARGET_ITEM);
ok('valeur de référence', ref.price === 5000 && ref.priceAlt === 7500, JSON.stringify(ref));

const pizzaTab = await page.evaluate(() => [...document.querySelectorAll('.tab-btn')].findIndex(b => b.textContent.includes('Pizza')));
ok('onglet Pizza trouvé', pizzaTab >= 0, `${pizzaTab}`);
await page.locator('.tab-btn').nth(pizzaTab).click();
const rowSel = `#panels .item-row:has(input[value="${TARGET_ITEM}"])`;
await page.waitForSelector(rowSel + ' input[data-field="priceAlt"]', { timeout: 8000 });
await page.fill(rowSel + ' input[data-field="price"]', '5001');
await page.fill(rowSel + ' input[data-field="priceAlt"]', '7502');
await page.click('#saveBtn');
await page.waitForTimeout(1500);
const saved = await readApi();
ok('sauvegarde admin → /api/menu', getVal(saved, TARGET_CAT, TARGET_ITEM).price === 5001 && getVal(saved, TARGET_CAT, TARGET_ITEM).priceAlt === 7502, JSON.stringify(getVal(saved, TARGET_CAT, TARGET_ITEM)));
ok('updatedAt renseigné', !!saved.updatedAt, String(saved.updatedAt));
ok('autres sections intactes (salades 3500)', getVal(saved, 'salades', 'Big Classic').price === 3500);

/* réinitialisation exacte */
await page.fill(rowSel + ' input[data-field="price"]', String(ref.price));
await page.fill(rowSel + ' input[data-field="priceAlt"]', String(ref.priceAlt));
await page.click('#saveBtn');
await page.waitForTimeout(1500);
const after = await readApi();
ok('restauration exacte après test', JSON.stringify(getVal(after, TARGET_CAT, TARGET_ITEM)) === JSON.stringify(ref), JSON.stringify(getVal(after, TARGET_CAT, TARGET_ITEM)));
ok('menu toujours complet (11 sections / 102 plats)', after.categories.length === 11 && after.categories.reduce((n, c) => n + (c.items || []).length, 0) === 102, `${after.categories.length} / ${after.categories.reduce((n, c) => n + (c.items || []).length, 0)}`);

/* 5 ── Types numériques préservés */
const bad = [];
after.categories.forEach(c => (c.items || []).forEach(it => {
  if (typeof it.price === 'string' && /^\d+$/.test(it.price)) bad.push(c.id + '/' + it.name);
  if (it.priceAlt !== undefined && typeof it.priceAlt === 'string' && /^\d+$/.test(it.priceAlt)) bad.push(c.id + '/' + it.name + ' (alt)');
}));
ok('prix stockés en nombres entiers', bad.length === 0, bad.join(', '));

ok('aucune erreur JS', errs.length === 0, errs.join(' | '));
await browser.close();

console.log(checks.join('\n'));
const fails = checks.filter(c => c.startsWith('FAIL'));
console.log(`\n${checks.length - fails.length}/${checks.length} contrôles admin OK`);
process.exit(fails.length ? 1 : 0);
