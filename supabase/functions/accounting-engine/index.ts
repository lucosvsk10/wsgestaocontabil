import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

const encoder = new TextEncoder();
const toHex = (bytes: Uint8Array) => [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
const toBase64Url = (value: Uint8Array | string) => {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};
const fromBase64Url = (value: string) => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  return atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
};

async function passwordHash(password: string, saltHex: string, iterations: number) {
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)?.map((part) => Number.parseInt(part, 16)) ?? []);
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, material, 256);
  return toHex(new Uint8Array(bits));
}

async function signToken(userId: string) {
  const payload = toBase64Url(JSON.stringify({ uid: userId, exp: Date.now() + 2 * 60 * 60 * 1000, nonce: crypto.randomUUID() }));
  const secret = Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  return `${payload}.${toBase64Url(signature)}`;
}

async function verifyToken(token: string, userId: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const secret = Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))));
  if (signature !== expected) return false;
  try {
    const decoded = JSON.parse(fromBase64Url(payload));
    return decoded.uid === userId && Number(decoded.exp) > Date.now();
  } catch {
    return false;
  }
}

const priceFor = (model: string) => {
  const prices: Record<string, { input: number; cached: number; output: number }> = {
    "gpt-5.6-sol": { input: 5, cached: 0.5, output: 30 },
    "gpt-5.6": { input: 5, cached: 0.5, output: 30 },
    "gpt-5.6-terra": { input: 2, cached: 0.2, output: 12 },
    "gpt-5.6-luna": { input: 0.2, cached: 0.02, output: 1.2 },
  };
  return prices[model] ?? null;
};

const estimateCost = (model: string, usage: any) => {
  const price = priceFor(model);
  if (!price) return 0;
  const cached = Number(usage?.input_tokens_details?.cached_tokens ?? 0);
  const input = Math.max(0, Number(usage?.input_tokens ?? 0) - cached);
  const output = Number(usage?.output_tokens ?? 0);
  return (input * price.input + cached * price.cached + output * price.output) / 1_000_000;
};

type OfficialBucket = { start_time?: number; end_time?: number; results?: any[] };

async function fetchOfficialOpenAIUsage() {
  const adminKey = Deno.env.get("OPENAI_ADMIN_KEY");
  if (!adminKey) return {
    configured: false,
    available: false,
    error: "Configure OPENAI_ADMIN_KEY no cofre do Supabase para consultar uso e custos oficiais.",
    totals: { costUsd: 0, inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, requests: 0 },
    daily: [],
  };

  const endTime = Math.floor(Date.now() / 1000);
  const startTime = endTime - 30 * 24 * 60 * 60;
  const params = new URLSearchParams({
    start_time: String(startTime),
    end_time: String(endTime),
    bucket_width: "1d",
    limit: "31",
  });
  const headers = { Authorization: `Bearer ${adminKey}` };
  const [usageResponse, costResponse] = await Promise.all([
    fetch(`https://api.openai.com/v1/organization/usage/completions?${params}`, { headers }),
    fetch(`https://api.openai.com/v1/organization/costs?${params}`, { headers }),
  ]);
  const [usageRaw, costRaw] = await Promise.all([usageResponse.json(), costResponse.json()]);
  if (!usageResponse.ok || !costResponse.ok) {
    const failure = !usageResponse.ok ? usageRaw : costRaw;
    return {
      configured: true,
      available: false,
      error: failure?.error?.message || "A OpenAI recusou a consulta de uso oficial.",
      totals: { costUsd: 0, inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, requests: 0 },
      daily: [],
    };
  }

  const daily = new Map<number, { startTime: number; endTime: number; costUsd: number; inputTokens: number; cachedInputTokens: number; outputTokens: number; requests: number }>();
  const bucketFor = (bucket: OfficialBucket) => {
    const start = Number(bucket.start_time ?? 0);
    const current = daily.get(start) ?? { startTime: start, endTime: Number(bucket.end_time ?? 0), costUsd: 0, inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, requests: 0 };
    daily.set(start, current);
    return current;
  };
  for (const bucket of (usageRaw.data ?? []) as OfficialBucket[]) {
    const current = bucketFor(bucket);
    for (const result of bucket.results ?? []) {
      current.inputTokens += Number(result.input_tokens ?? 0);
      current.cachedInputTokens += Number(result.input_cached_tokens ?? 0);
      current.outputTokens += Number(result.output_tokens ?? 0);
      current.requests += Number(result.num_model_requests ?? 0);
    }
  }
  for (const bucket of (costRaw.data ?? []) as OfficialBucket[]) {
    const current = bucketFor(bucket);
    for (const result of bucket.results ?? []) current.costUsd += Number(result.amount?.value ?? 0);
  }
  const rows = [...daily.values()].sort((a, b) => b.startTime - a.startTime);
  const totals = rows.reduce((acc, row) => ({
    costUsd: acc.costUsd + row.costUsd,
    inputTokens: acc.inputTokens + row.inputTokens,
    cachedInputTokens: acc.cachedInputTokens + row.cachedInputTokens,
    outputTokens: acc.outputTokens + row.outputTokens,
    requests: acc.requests + row.requests,
  }), { costUsd: 0, inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, requests: 0 });
  return { configured: true, available: true, error: null, totals, daily: rows };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Não autenticado" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Não autenticado" }, 401);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((row: any) => row.role === "admin")) return json({ error: "Acesso exclusivo para administradores" }, 403);

    const body = await req.json();
    const action = String(body.action || "bootstrap");
    const { data: settings } = await admin.from("accounting_engine_settings").select("*").eq("id", 1).maybeSingle();

    if (action === "bootstrap") return json({ configured: Boolean(settings) });

    if (action === "set_password") {
      const password = String(body.password || "");
      if (password.length < 8) return json({ error: "A senha deve ter pelo menos 8 caracteres." }, 400);
      if (settings) {
        const current = String(body.current_password || "");
        if (!current || await passwordHash(current, settings.password_salt, settings.password_iterations) !== settings.password_hash) {
          return json({ error: "Senha atual incorreta." }, 401);
        }
      }
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const saltHex = toHex(salt);
      const iterations = 210000;
      const hash = await passwordHash(password, saltHex, iterations);
      const { error } = await admin.from("accounting_engine_settings").upsert({
        id: 1,
        password_salt: saltHex,
        password_hash: hash,
        password_iterations: iterations,
        configured_by: user.id,
        configured_at: settings?.configured_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return json({ token: await signToken(user.id) });
    }

    if (action === "unlock") {
      if (!settings) return json({ error: "Defina a senha da Engine primeiro.", setup_required: true }, 409);
      const hash = await passwordHash(String(body.password || ""), settings.password_salt, settings.password_iterations);
      if (hash !== settings.password_hash) return json({ error: "Senha incorreta." }, 401);
      return json({ token: await signToken(user.id) });
    }

    if (!await verifyToken(String(body.engine_token || ""), user.id)) return json({ error: "Sessão da Engine expirada." }, 401);

    const model = Deno.env.get("OPENAI_ACCOUNTING_FAST_MODEL") || "gpt-5.6-luna";
    const reviewModel = Deno.env.get("OPENAI_ACCOUNTING_REVIEW_MODEL") || "gpt-5.6-terra";
    const apiConfigured = Boolean(Deno.env.get("OPENAI_API_KEY"));

    if (action === "test_connection") {
      if (!apiConfigured) return json({ error: "OPENAI_API_KEY não configurada." }, 503);
      const startedAt = Date.now();
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, input: "Responda somente: OK", reasoning: { effort: "none" }, max_output_tokens: 32 }),
      });
      const raw = await response.json();
      const usage = raw.usage ?? {};
      const status = response.ok ? "success" : "error";
      await admin.from("accounting_ai_usage").insert({
        created_by: user.id, module: "engine-test", model, status, response_id: raw.id,
        input_tokens: usage.input_tokens ?? 0,
        cached_input_tokens: usage.input_tokens_details?.cached_tokens ?? 0,
        output_tokens: usage.output_tokens ?? 0,
        total_tokens: usage.total_tokens ?? 0,
        estimated_cost_usd: estimateCost(model, usage), latency_ms: Date.now() - startedAt,
        error_code: raw.error?.code ?? null, error_message: raw.error?.message ?? null,
      });
      if (!response.ok) return json({ error: raw.error?.message || "Falha na OpenAI", code: raw.error?.code || null }, 502);
      return json({ ok: true });
    }

    if (action !== "status") return json({ error: "Ação inválida." }, 400);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: usage, error } = await admin.from("accounting_ai_usage").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(250);
    if (error) throw error;
    const rows = usage ?? [];
    const official = await fetchOfficialOpenAIUsage();
    const totals = rows.reduce((acc: any, row: any) => ({
      requests: acc.requests + 1,
      success: acc.success + (row.status === "success" ? 1 : 0),
      errors: acc.errors + (row.status === "error" ? 1 : 0),
      inputTokens: acc.inputTokens + Number(row.input_tokens),
      outputTokens: acc.outputTokens + Number(row.output_tokens),
      totalTokens: acc.totalTokens + Number(row.total_tokens),
      estimatedCostUsd: acc.estimatedCostUsd + Number(row.estimated_cost_usd),
    }), { requests: 0, success: 0, errors: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUsd: 0 });
    return json({
      provider: "OpenAI", model, reviewModel, routing: "validation_fallback", apiConfigured, price: priceFor(model), totals, official,
      lastRequest: rows[0] ?? null,
      recent: rows.slice(0, 40).map((row: any) => ({
        id: row.id, createdAt: row.created_at, companyKey: row.company_key, competence: row.competence,
        module: row.module, model: row.model, status: row.status, inputTokens: row.input_tokens,
        outputTokens: row.output_tokens, totalTokens: row.total_tokens, estimatedCostUsd: row.estimated_cost_usd,
        latencyMs: row.latency_ms, errorCode: row.error_code, errorMessage: row.error_message,
      })),
    });
  } catch (error) {
    console.error("accounting-engine", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
