const DEFAULT_ALLOWED_ORIGINS = [
  "https://kynare.com",
  "https://www.kynare.com",
  "https://kynare.lovable.app",
  "http://localhost:5173",
  "http://localhost:4173",
];

// Function to check if origin is a valid Lovable preview URL
const isLovablePreviewOrigin = (origin: string): boolean => {
  return /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(origin) ||
         /^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.lovable\.app$/.test(origin);
};

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

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

export const checkRateLimit = (
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number; retryAfterMs: number } => {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - 1),
      retryAfterMs: windowMs,
    };
  }

  entry.count += 1;
  const allowed = entry.count <= maxRequests;

  return {
    allowed,
    remaining: Math.max(0, maxRequests - entry.count),
    retryAfterMs: Math.max(0, entry.resetAt - now),
  };
};

export const verifyTurnstile = async (
  token: string | null,
  ip?: string,
): Promise<boolean> => {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) {
    return true;
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
