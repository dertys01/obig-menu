export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    // ── GET /api/menu ─────────────────────────────────────────────────────────
    if (pathname === '/api/menu' && request.method === 'GET') {
      const data = await env.MENU_KV.get('menu', 'json');
      return Response.json(data || { categories: [] }, {
        headers: { 'Cache-Control': 'no-cache' },
      });
    }

    // ── GET /api/admin/ping : vérification de la clé SANS écriture ───────────
    if (pathname === '/api/admin/ping' && request.method === 'GET') {
      const key = request.headers.get('X-Admin-Key');
      if (key !== env.ADMIN_KEY) {
        return new Response('Unauthorized', { status: 401 });
      }
      return Response.json({ ok: true });
    }

    // ── POST /api/admin/save ──────────────────────────────────────────────────
    if (pathname === '/api/admin/save' && request.method === 'POST') {
      const key = request.headers.get('X-Admin-Key');
      if (key !== env.ADMIN_KEY) {
        return new Response('Unauthorized', { status: 401 });
      }
      const body = await request.json().catch(() => null);
      // Garde-fou : on n'écrit que si le payload est bien un menu complet.
      // (admin.html envoyait { _check:true } au login → écrasait la KV entière.)
      if (!body || !Array.isArray(body.categories) || body.categories.length === 0) {
        return Response.json(
          { ok: false, error: 'payload invalide : "categories" manquante — écriture refusée' },
          { status: 400 }
        );
      }
      await env.MENU_KV.put('menu', JSON.stringify(body));
      return Response.json({ ok: true, categories: body.categories.length });
    }

    // ── Static assets fallback ────────────────────────────────────────────────
    return env.ASSETS.fetch(request);
  },
};
