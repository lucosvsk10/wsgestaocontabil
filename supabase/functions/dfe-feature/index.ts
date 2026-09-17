import "jsr:@supabase/functions-js/edge-runtime.d.ts";
Deno.serve(() => new Response(JSON.stringify({
  error: "retired_transport",
  message: "Laboratório fiscal legado desativado. Use dfe-issue-native/saas-dfe-issue, que operam pelo gateway Vercel.",
  transport: "vercel"
}), { status: 410, headers: { "content-type": "application/json", "cache-control": "no-store" } }));
