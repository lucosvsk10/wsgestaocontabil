import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(() => new Response(JSON.stringify({
  error: "retired_unsupported_al_recovery",
  message: "Recuperação NF-e 55/AL por duplicidade 539 aposentada: a SVRS valida o destinatário antes da duplicidade natural e retorna cStat 208 mesmo para uma numeração existente. Use fontes oficiais de listagem/relatório; não tente autorização sintética."
}), {
  status: 410,
  headers: {"content-type":"application/json","cache-control":"no-store"}
}));
