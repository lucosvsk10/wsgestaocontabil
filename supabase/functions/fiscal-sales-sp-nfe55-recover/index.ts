import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(() => new Response(JSON.stringify({
  error: "retired_unsafe_recovery",
  message: "Recuperação NF-e 55/SP isolada aposentada. Use fiscal-sales-sp-sync, que exige controle 539 validado e classificação restrita de gaps.",
  replacement: "fiscal-sales-sp-sync"
}), {
  status: 410,
  headers: {"content-type":"application/json","cache-control":"no-store"}
}));
