import { createRequire } from 'module';

const BASE = process.env.BASE || 'http://127.0.0.1:8787/';
const OUT = process.env.OUT || '/tmp';

/* Playwright : résolu depuis le projet courant, sinon via PLAYWRIGHT=path/vers/node_modules */
const _req = createRequire(import.meta.url);
function req(p) { try { return _req('playwright'); } catch { return _req(p); } }
const { chromium } = req(process.env.PLAYWRIGHT || 'playwright');
const out = { errors: [], checks: [] };
const nb = s => String(s).replace(/[\u202f\u00a0]/g, ' ');           // espaces fines/insécables -> espace
const ok = (name, pass, extra = '') => out.checks.push(`${pass ? 'OK ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
const ignore = t => t.includes('/api/menu') || t.includes('Failed to load resource'); // 404 attendu en local (route du Worker)

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', m => { if (m.type() === 'error' && !ignore(m.text())) out.errors.push('console: ' + m.text()); });
page.on('pageerror', e => out.errors.push('pageerror: ' + e.message));
page.on('response', r => { if (r.status() >= 400 && !ignore(r.url())) out.errors.push(r.status() + ' ' + r.url()); });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('.section .card', { timeout: 8000 });

/* ─── ÉCRAN D'ACCUEIL ─── */
ok('écran d’accueil visible au chargement', await page.locator('#splash').isVisible());
ok('logo + affiche affichés', (await page.locator('.splash-logo').isVisible()) && (await page.locator('.splash-bg').isVisible()));
ok('CTA WhatsApp sur l’accueil', (await page.locator('#splashWa').getAttribute('href')).startsWith('https://wa.me/2250708903332'));
await page.click('#enterBtn');
await page.waitForTimeout(700);
ok('écran d’accueil fermé après « Voir le menu »', !(await page.locator('#splash').isVisible()));
ok('scroll rétabli après fermeture', await page.evaluate(() => getComputedStyle(document.documentElement).overflow !== 'hidden'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.section .card', { timeout: 8000 });
await page.waitForTimeout(400);
ok('écran d’accueil ré-affiché à chaque visite', await page.locator('#splash').isVisible());
ok('logo dans la barre du haut', await page.locator('.mark img').isVisible());
await page.click('#enterBtn');
await page.waitForTimeout(700);
ok('menu utilisable après 2ᵉ fermeture', await page.evaluate(() => getComputedStyle(document.documentElement).overflow !== 'hidden'));

ok('sections rendues (11)', await page.locator('.section').count() === 11, `${await page.locator('.section').count()}`);
ok('cartes rendues (102)', await page.locator('.card').count() === 102, `${await page.locator('.card').count()}`);
ok('pills nav (11)', await page.locator('.pill').count() === 11);
ok('squelettes masqués', await page.locator('#boot').isHidden());
ok('pas de scroll horizontal desktop', (await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1);
const fonts = await page.evaluate(async () => { await document.fonts.ready; return { a: document.fonts.check('16px Anton'), j: document.fonts.check('16px "Plus Jakarta Sans"') }; });
ok('polices Anton + Plus Jakarta', fonts.a && fonts.j, JSON.stringify(fonts));

/* hero : bannière sobre — bandeau CSS, plus de photo pleine largeur */
const hero = await page.evaluate(() => {
  const band = document.querySelector('.hero-band');
  const r = band ? band.getBoundingClientRect() : { height: 0 };
  return { band: !!band, photoInHero: !!document.querySelector('.hero img'), h: Math.round(r.height) };
});
ok('hero sobre : bandeau CSS sans photo', hero.band && !hero.photoInHero, JSON.stringify(hero));
ok('hero compact (40–200px desktop)', hero.h > 40 && hero.h <= 200, hero.h + 'px');

/* ─── PRIX : vérité terrain des fichiers Drive ─── */
const P = await page.evaluate(() => {
  const g = id => [...document.querySelectorAll(`#${id} .card`)].map(c => c.querySelector('.card-name').textContent.trim() + ' = ' + c.querySelector('.price').textContent.trim());
  return { salades: g('salades'), chawarmas: g('chawarmas'), burgers: g('burgers'), pizzas: g('pizzas'), africain: g('africain'), pates: g('pates') };
});
const want = {
  salades: ['Big Classic = 3 500 F', 'Big Poulet Plancha = 3 500 F', 'Big Boulettes de Bœuf = 3 500 F', 'Big Avocat Crevette = 4 500 F', 'Salade du Chef = 4 500 F'],
  chawarmas: ['Chawarma Viande = 2 000 F', 'Chawarma Poulet = 2 500 F / 3 000 F', 'Chawarma Poisson = 2 000 F / 2 500 F', 'Chawarma Cheese Viande = 3 000 F', 'Chawarma Cheese Poulet = 3 000 F'],
  burgers: ['Chicken Burger Assiette = 3 000 F / 4 000 F', 'Hamburger Assiette = 3 000 F / 4 000 F', 'Cheese Burger Assiette = 3 000 F / 4 000 F', 'Double Hamburger Assiette = 3 000 F / 4 000 F', 'Double Cheese Burger Assiette = 3 000 F / 4 000 F', "O'Big Hamburger = 3 000 F / 4 000 F"],
  pizzas: ['Pizza Royale = 5 000 F / 7 500 F', 'Pizza Margherita = 5 000 F / 7 500 F', 'Pizza 4 Saisons = 5 000 F / 7 500 F'],
};
for (const [cat, list] of Object.entries(want)) {
  const got = P[cat].map(nb);
  const missing = list.filter(x => !got.includes(x));
  ok(`prix ${cat} exacts (${list.length})`, missing.length === 0, missing.join(' ; ') || `${got.length} plats`);
}
ok('3 tailles conservées (Sauce Graine)', nb(P.africain.find(x => x.startsWith('Sauce Graine'))) === 'Sauce Graine = 2 000 F / 2 500 F / 3 000 F', P.africain.find(x => x.startsWith('Sauce Graine')));
ok('Riz Blanc plage conservée', nb(P.pates.find(x => x.startsWith('Riz Blanc'))) === 'Riz Blanc + Sauce Tomate au Poisson = 1 500 F / 3 000 F', nb(P.pates.find(x => x.startsWith('Riz Blanc'))));

/* aucun prix non formaté ni valeur manquante */
const badPrice = await page.evaluate(() => [...document.querySelectorAll('.card .price, .drink-price')].filter(e => e.textContent.includes('undefined') || e.textContent.trim() === '').length);
ok('aucun prix vide/undefined', badPrice === 0, `${badPrice} problème(s)`);

/* statut */
const status = await page.locator('#statusText').textContent();
ok('statut ouvert/fermé', /Ouvert|Fermé/.test(status), status);

/* ─── PANIER ─── */
await page.locator('#salades .add').first().click();
await page.waitForTimeout(120);
ok('barre panier visible', await page.locator('#cartBtn').isVisible());
ok('total 1 article = 3 500 F', nb(await page.locator('#cartLabel').textContent()) === 'Panier · 1 article · 3 500 F', nb(await page.locator('#cartLabel').textContent()));
await page.locator('#chawarmas .add').first().click();
await page.waitForTimeout(80);
ok('2 articles = 5 500 F', nb(await page.locator('#cartLabel').textContent()) === 'Panier · 2 articles · 5 500 F', nb(await page.locator('#cartLabel').textContent()));

await page.locator('#cartBtn').click();
await page.waitForTimeout(400);
ok('tiroir ouvert', await page.locator('#drawer').evaluate(e => e.classList.contains('open')));
ok('12 zones + option sans livraison', await page.locator('#zone option').count() === 13, `${await page.locator('#zone option').count()}`);
await page.locator('#zone').selectOption({ index: 2 });
await page.waitForTimeout(120);
const wa = nb(decodeURIComponent(await page.locator('#waSend').getAttribute('href')));
ok('message WhatsApp : articles', wa.includes('1 × Big Classic') && wa.includes('1 × Chawarma Viande'), wa.split('\n')[0]);
ok('message WhatsApp : total', wa.includes('Total estimé (prix mini) : 5 500 F'));
ok('message WhatsApp : zone', wa.includes('Livraison : '), wa.match(/Livraison : .*/)?.[0]);
await page.locator('#cartList .qbtn[data-d="1"]').first().click();
await page.waitForTimeout(80);
ok('quantité +1', nb(await page.locator('#cartLabel').textContent()).startsWith('Panier · 3 articles'));
await page.keyboard.press('Escape');
await page.waitForTimeout(350);
ok('tiroir fermé (Échap)', await page.locator('#drawer').evaluate(e => !e.classList.contains('open')));
ok('tiroir inerte une fois fermé', await page.locator('#drawer').evaluate(e => e.inert === true));

/* ─── RECHERCHE ─── */
await page.fill('#search', 'pizza');
await page.waitForTimeout(150);
const s1 = await page.evaluate(() => ({ cards: [...document.querySelectorAll('.card')].filter(c => c.style.display !== 'none').length, secs: [...document.querySelectorAll('.section')].filter(s => s.style.display !== 'none').length }));
ok('recherche "pizza" = 8 plats / 1 section', s1.cards === 8 && s1.secs === 1, JSON.stringify(s1));
await page.fill('#search', 'crevette');
await page.waitForTimeout(150);
const s2 = await page.evaluate(() => [...document.querySelectorAll('.card')].filter(c => c.style.display !== 'none').map(c => c.querySelector('.card-name').textContent));
ok('recherche "crevette" (nom + description)', s2.length >= 1, s2.join(', '));
await page.fill('#search', 'zzzz');
await page.waitForTimeout(150);
ok('état "aucun résultat"', await page.locator('#noresult').isVisible());
await page.fill('#search', '');
await page.waitForTimeout(200);
ok('réinitialisation : 11 sections', await page.locator('.section:visible').count() === 11);

/* ─── SCROLL-SPY ─── */
await page.locator('.pill', { hasText: 'Pizzas' }).click();
await page.waitForTimeout(1100);
const active = await page.locator('.pill.active').textContent();
ok('scroll-spy suit la section', active.includes('Pizzas'), active);
const geo = await page.evaluate(() => ({ top: Math.round(document.querySelector('#pizzas').getBoundingClientRect().top), barBottom: Math.round(document.querySelector('.toolbar').getBoundingClientRect().bottom) }));
ok('ancre non masquée par la barre sticky', geo.top >= geo.barBottom - 4, JSON.stringify(geo));

/* ─── IMAGES ─── */
await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); } });
await page.waitForTimeout(1200);
const broken = await page.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src')));
ok('aucune image cassée', broken.length === 0, broken.join(', '));
const noAlt = await page.evaluate(() => [...document.images].filter(i => i.getAttribute('alt') === null).length);
ok('alt sur toutes les images', noAlt === 0);

/* ─── CTA ─── */
ok('CTA WhatsApp direct', (await page.locator('#waBar').getAttribute('href')).startsWith('https://wa.me/2250708903332'));
const waBtns = await page.evaluate(() => [...document.querySelectorAll('.btn-wa')].filter(b => !b.closest('#splash')).map(b => ({ id: b.id || b.className, bg: getComputedStyle(b).backgroundColor, col: getComputedStyle(b).color })));
ok('boutons WhatsApp verts hors accueil (' + waBtns.length + ')', waBtns.length >= 3 && waBtns.every(b => b.bg === 'rgb(37, 211, 102)'), JSON.stringify(waBtns));
ok('texte des boutons WhatsApp lisible (fond ≠ texte)', waBtns.every(b => b.col !== b.bg && b.col !== 'rgba(0, 0, 0, 0)'), JSON.stringify(waBtns.map(b => b.col)));
ok('JSON-LD Restaurant', await page.evaluate(() => { const d = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent); return d['@type'] === 'Restaurant' && d.telephone.includes('2250708903332'); }));
ok('titre + meta description', (await page.title()).includes("O'big Food") && (await page.locator('meta[name="description"]').getAttribute('content')).length > 80);

await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);
await page.screenshot({ path: OUT + '/obig-desktop.png', fullPage: true });

/* ─── MOBILE ─── */
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
m.on('console', x => { if (x.type() === 'error' && !ignore(x.text())) out.errors.push('mobile: ' + x.text()); });
m.on('pageerror', e => out.errors.push('mobile pageerror: ' + e.message));
await m.goto(BASE, { waitUntil: 'networkidle' });
await m.waitForSelector('.section .card');
if (await m.locator('#splash').isVisible()) { await m.click('#enterBtn'); await m.waitForTimeout(700); }
ok('mobile : écran d’accueil fermé', !(await m.locator('#splash').isVisible()));
ok('pas de scroll horizontal mobile 390px', (await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1);
const mh = await m.evaluate(() => Math.round(document.querySelector('.hero-band').getBoundingClientRect().height));
ok('hero mobile compact (≤ 140px)', mh > 30 && mh <= 140, mh + 'px');
const tap = await m.evaluate(() => { const r = document.querySelector('.add').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
ok('cible tactile bouton Ajouter ≥ 44px', tap.h >= 44, JSON.stringify(tap));
const pillH = await m.evaluate(() => Math.round(document.querySelector('.pill').getBoundingClientRect().height));
ok('cible tactile pill ≥ 40px', pillH >= 40, `${pillH}px`);
const fs = await m.evaluate(() => getComputedStyle(document.body).fontSize);
ok('corps de texte mobile ≥ 15px', parseFloat(fs) >= 15, fs);
await m.screenshot({ path: OUT + '/obig-mobile.png', fullPage: true });

await browser.close();
console.log(out.checks.join('\n'));
console.log('\nERREURS:', out.errors.length ? out.errors.join('\n') : 'aucune');
const failed = out.checks.filter(c => c.startsWith('FAIL')).length;
console.log(`\n${out.checks.length - failed}/${out.checks.length} contrôles OK`);
process.exit(failed ? 1 : 0);
