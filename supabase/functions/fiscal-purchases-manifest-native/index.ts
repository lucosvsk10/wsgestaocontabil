import "jsr:@supabase/functions-js/edge-runtime.d.ts";
Deno.serve(() => new Response(JSON.stringify({
  error: "retired_transport",
  message: "Manifestação fiscal não é mais transmitida diretamente pelo runtime do Supabase. Use fiscal-purchases-manifest via gateway Vercel/Node.",
  transport: "vercel"
}), { status: 410, headers: { "content-type": "application/json", "cache-control": "no-store" } }));
