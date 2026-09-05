Deno.serve(() => new Response(JSON.stringify({ error: 'Endpoint retired' }), {
  status: 410,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
}));
