// ইনভয়েস PNG রেন্ডার Worker — শুধু মূল সাইট (cloud-vangcur) Service Binding দিয়ে ডাকে।
// অর্ডার যাচাই, রেট-লিমিট ও ডাউনলোড-সীমা মূল সাইটেই হয়; এখানে শুধু ছবি বানানো।
import { renderInvoicePng, type RenderRequest } from './render';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      return Response.json({ ok: true });
    }

    if (request.method !== 'POST' || url.pathname !== '/render') {
      return Response.json({ ok: false, error: 'not found' }, { status: 404 });
    }

    let body: RenderRequest;
    try {
      body = (await request.json()) as RenderRequest;
    } catch {
      return Response.json({ ok: false, error: 'invalid json' }, { status: 400 });
    }
    if (!body || !body.order || !Array.isArray(body.order.items)) {
      return Response.json({ ok: false, error: 'invalid payload' }, { status: 400 });
    }

    try {
      const png = await renderInvoicePng(body);
      return new Response(png, { status: 200, headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } });
    } catch (err) {
      const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      console.error('[invoice-worker] render failed:', message, err instanceof Error ? err.stack : '');
      return Response.json({ ok: false, error: message.slice(0, 300) }, { status: 500 });
    }
  },
};
