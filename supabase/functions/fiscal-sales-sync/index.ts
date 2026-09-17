import "jsr:@supabase/functions-js/edge-runtime.d.ts";
Deno.serve(() => new Response(JSON.stringify({
  error: "retired_transport",
  message: "Sincronização legada desativada. O fluxo ativo usa fiscal-sales-cron/reconcile e gateways Vercel.",
  transport: "vercel"
}), { status: 410, headers: { "content-type": "application/json", "cache-control": "no-store" } }));
