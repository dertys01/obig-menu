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

    // ── POST /api/admin/save ──────────────────────────────────────────────────
    if (pathname === '/api/admin/save' && request.method === 'POST') {
      const key = request.headers.get('X-Admin-Key');
      if (key !== env.ADMIN_KEY) {
        return new Response('Unauthorized', { status: 401 });
      }
      const body = await request.json();
      await env.MENU_KV.put('menu', JSON.stringify(body));
      return Response.json({ ok: true });
    }

    // ── Static assets fallback ────────────────────────────────────────────────
    return env.ASSETS.fetch(request);
  },
};
