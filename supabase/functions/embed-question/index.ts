import { verifySupabaseUser } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";

const embeddingModel = "text-embedding-3-small";
const maxQuestionLength = 8_000;

function jsonResponse(
  request: Request,
  body: Record<string, unknown>,
  status = 200,
): Response {
  const headers = corsHeaders(request);
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(request) });
  }

  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    console.error("Supabase Auth environment variables are missing.");
    return jsonResponse(request, { error: "Function configuration error" }, 500);
  }

  try {
    if (!await verifySupabaseUser(request, supabaseUrl, anonKey)) {
      return jsonResponse(request, { error: "Authentication required" }, 401);
    }
  } catch (error) {
    console.error("Supabase Auth verification failed:", error);
    return jsonResponse(request, { error: "Authentication verification unavailable" }, 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, { error: "Request body must be valid JSON" }, 400);
  }

  const question = typeof body === "object" && body !== null && "question" in body
    ? body.question
    : undefined;
  if (typeof question !== "string" || !question.trim()) {
    return jsonResponse(request, { error: "A non-empty question is required" }, 400);
  }
  if (question.length > maxQuestionLength) {
    return jsonResponse(request, { error: `Question must be at most ${maxQuestionLength} characters` }, 400);
  }

  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiKey) {
    console.error("OPENAI_API_KEY is not configured.");
    return jsonResponse(request, { error: "Function configuration error" }, 500);
  }

  let openAiResponse: Response;
  try {
    openAiResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: embeddingModel, input: question.trim() }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    console.error("OpenAI embedding request failed:", error);
    return jsonResponse(request, { error: "Embedding service unavailable" }, 502);
  }

  if (!openAiResponse.ok) {
    console.error(`OpenAI embedding request returned HTTP ${openAiResponse.status}.`);
    return jsonResponse(request, { error: "Embedding service returned an error" }, 502);
  }

  let result: { data?: Array<{ embedding?: unknown }> };
  try {
    result = await openAiResponse.json();
  } catch (error) {
    console.error("Could not parse the OpenAI embedding response:", error);
    return jsonResponse(request, { error: "Invalid response from embedding service" }, 502);
  }

  const embedding = result.data?.[0]?.embedding;
  if (
    !Array.isArray(embedding) ||
    embedding.length !== 1536 ||
    !embedding.every((value) => typeof value === "number" && Number.isFinite(value))
  ) {
    console.error("OpenAI returned an invalid embedding.");
    return jsonResponse(request, { error: "Invalid response from embedding service" }, 502);
  }

  return jsonResponse(request, { embedding });
});
