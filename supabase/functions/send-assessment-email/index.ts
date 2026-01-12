import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  checkRateLimit,
  enforceCors,
  getClientIp,
  verifyTurnstile,
} from "../_shared/security.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const RATE_LIMIT_MAX = Number.parseInt(
  Deno.env.get("RATE_LIMIT_MAX_EMAIL") ??
    Deno.env.get("RATE_LIMIT_MAX") ??
    "5",
  10,
);
const RATE_LIMIT_WINDOW_MS = Number.parseInt(
  Deno.env.get("RATE_LIMIT_WINDOW_MS") ?? "60000",
  10,
);
const MAX_SUMMARY_LENGTH = 3000;
const MAX_EMAIL_LENGTH = 320;
const ACCESS_TOKEN_RE = /^[a-f0-9]{64}$/i;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface EmailRequest {
  email: string;
  assessmentSummary: string;
  accessToken: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  const { allowed, corsHeaders } = enforceCors(req);
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = getClientIp(req);
    const rateKey = `send-assessment-email:${ip}`;
    const rateLimit = checkRateLimit(rateKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": Math.ceil(rateLimit.retryAfterMs / 1000).toString(),
          "X-RateLimit-Limit": RATE_LIMIT_MAX.toString(),
          "X-RateLimit-Remaining": "0",
        },
      });
    }

    const turnstileToken = typeof body.turnstileToken === "string"
      ? body.turnstileToken
      : req.headers.get("x-turnstile-token");
    const turnstileOk = await verifyTurnstile(turnstileToken, ip);
    if (!turnstileOk) {
      return new Response(JSON.stringify({ error: "Verification failed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = typeof body.email === "string" ? body.email.trim() : "";
    const accessToken = typeof body.accessToken === "string"
      ? body.accessToken.trim()
      : "";
    const assessmentSummary = typeof body.assessmentSummary === "string"
      ? body.assessmentSummary.trim()
      : "";

    const request: EmailRequest = { email, assessmentSummary, accessToken };

    // Validate inputs
    if (
      !request.email ||
      !request.accessToken ||
      request.email.length > MAX_EMAIL_LENGTH ||
      !EMAIL_RE.test(request.email) ||
      !ACCESS_TOKEN_RE.test(request.accessToken) ||
      !request.assessmentSummary ||
      request.assessmentSummary.length > MAX_SUMMARY_LENGTH
    ) {
      console.error("Invalid email request payload");
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build the assessment URL
    const baseUrl = Deno.env.get("SITE_URL") || "https://kynare.lovable.app";
    const assessmentUrl = `${baseUrl}/assessment/${accessToken}`;
    const bookingUrl = "https://kynare.com/timetable";

    console.log("Sending email to:", email);
    console.log("Assessment URL:", assessmentUrl);

    const safeSummary = escapeHtml(assessmentSummary);

    const emailResponse = await resend.emails.send({
      from: "Kynare <onboarding@resend.dev>",
      to: [email],
      subject: "Your Kynare Assessment Results",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #18181b; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">
          Your Personalized Assessment is Ready
        </h1>
        <p style="color: #71717a; font-size: 16px; margin: 0;">
          Thank you for completing your Kynare wellness assessment
        </p>
      </div>

      <!-- Summary -->
      <div style="background-color: #f4f4f5; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
        <h2 style="color: #18181b; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
          Quick Summary
        </h2>
        <p style="color: #3f3f46; font-size: 14px; line-height: 1.6; margin: 0;">
          ${safeSummary}
        </p>
      </div>

      <!-- CTA Buttons -->
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${assessmentUrl}" style="display: inline-block; background-color: #18181b; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; margin-bottom: 12px;">
          View Full Assessment
        </a>
      </div>
      
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${bookingUrl}" style="display: inline-block; background-color: #f97316; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
          Book Your First Visit
        </a>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e4e4e7;">
        <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
          This email was sent because you completed a wellness assessment at Kynare.
        </p>
        <p style="color: #a1a1aa; font-size: 12px; margin: 8px 0 0 0;">
          © ${new Date().getFullYear()} Kynare. All rights reserved.
        </p>
      </div>

    </div>
  </div>
</body>
</html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, id: emailResponse.data?.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-assessment-email function:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
