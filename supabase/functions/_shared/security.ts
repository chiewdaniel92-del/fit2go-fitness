const DEFAULT_ALLOWED_ORIGINS = [
  // Standalone Fit2Go demo: override with the ALLOWED_ORIGINS env var once the
  // demo has a real hostname.
  "https://fit2go.com",
  "https://www.fit2go.com",
  "http://localhost:5173",
  "http://localhost:4173",
];

// Function to check if origin is a valid Lovable preview URL
const isLovablePreviewOrigin = (origin: string): boolean => {
  return /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(origin) ||
         /^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.lovable\.app$/.test(origin);
};

const getAllowedOrigins = (): string[] => {
  const raw = Deno.env.get("ALLOWED_ORIGINS");
  if (!raw) {
    return DEFAULT_ALLOWED_ORIGINS;
  }

  const parsed = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return parsed.length ? parsed : DEFAULT_ALLOWED_ORIGINS;
};

export const buildCorsHeaders = (
  origin: string | null,
  allowedOrigins: string[],
): HeadersInit => {
  // If origin is a Lovable preview URL, allow it dynamically
  const allowOrigin = origin && (allowedOrigins.includes(origin) || isLovablePreviewOrigin(origin))
    ? origin
    : allowedOrigins[0] ?? "null";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-turnstile-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};

export const enforceCors = (req: Request): {
  allowed: boolean;
  corsHeaders: HeadersInit;
} => {
  const allowedOrigins = getAllowedOrigins();
  const origin = req.headers.get("origin");

  // Allow if origin is in the explicit list OR is a valid Lovable preview URL
  const isAllowed = !origin || 
    allowedOrigins.includes(origin) || 
    isLovablePreviewOrigin(origin);

  if (!isAllowed) {
    return { allowed: false, corsHeaders: buildCorsHeaders(null, allowedOrigins) };
  }

  return { allowed: true, corsHeaders: buildCorsHeaders(origin, allowedOrigins) };
};

export const getClientIp = (req: Request): string => {
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) {
    return cfIp;
  }

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return req.headers.get("x-real-ip") ?? "unknown";
};

export const checkRateLimit = async (
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; retryAfterMs: number }> => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[RateLimit] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured");
    // Fail open so the app keeps running, but log loudly
    return { allowed: true, remaining: maxRequests - 1, retryAfterMs: windowMs };
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/check_rate_limit`, {
      method: "POST",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_key: key,
        p_max_requests: maxRequests,
        p_window_ms: windowMs,
      }),
    });

    if (!response.ok) {
      console.error("[RateLimit] DB check failed with status", response.status);
      return { allowed: true, remaining: maxRequests - 1, retryAfterMs: windowMs };
    }

    const rows = await response.json() as Array<{
      allowed: boolean;
      request_count: number;
      retry_after_ms: number;
    }>;
    const row = rows[0];

    return {
      allowed: row.allowed,
      remaining: Math.max(0, maxRequests - Number(row.request_count)),
      retryAfterMs: Number(row.retry_after_ms),
    };
  } catch (err) {
    console.error("[RateLimit] Unexpected error, allowing request:", err);
    return { allowed: true, remaining: maxRequests - 1, retryAfterMs: windowMs };
  }
};

// Standalone demo escape hatch. Turnstile needs a browser-side widget to mint a
// token, and this build has none, so the check can never pass. Setting
// DEMO_MODE=true skips it. This must be opted into explicitly: anything other
// than the exact string "true" leaves the normal fail-closed behaviour intact,
// so a missing or misspelled value can never silently disable the check.
const isDemoMode = (): boolean =>
  (Deno.env.get("DEMO_MODE") ?? "").trim().toLowerCase() === "true";

export const verifyTurnstile = async (
  token: string | null,
  ip?: string,
): Promise<boolean> => {
  if (isDemoMode()) {
    console.warn(
      "[Security] DEMO_MODE=true — skipping Turnstile verification. " +
        "Do NOT set this in production; rate limiting is the only abuse control left.",
    );
    return true;
  }

  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) {
    console.error("[Security] TURNSTILE_SECRET_KEY is not configured — rejecting request");
    return false;
  }

  if (!token) {
    return false;
  }

  const body = new URLSearchParams({ secret, response: token });
  if (ip) {
    body.set("remoteip", ip);
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body,
    },
  );

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  return Boolean(data?.success);
};
