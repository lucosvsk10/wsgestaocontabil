// Retired legacy handler: unused by current UI and database jobs; no document mutation.
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
Deno.serve((req: Request) => req.method === "OPTIONS" ? new Response(null,{headers:cors}) : new Response(JSON.stringify({error:"Esta integração antiga foi desativada. Use o fluxo atual do painel.",code:"ENDPOINT_RETIRED"}),{status:410,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}}));

