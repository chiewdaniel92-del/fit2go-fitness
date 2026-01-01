import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  email: string;
  assessmentSummary: string;
  accessToken: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, assessmentSummary, accessToken }: EmailRequest = await req.json();

    // Validate inputs
    if (!email || !accessToken) {
      console.error("Missing required fields:", { email: !!email, accessToken: !!accessToken });
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build the assessment URL
    const baseUrl = Deno.env.get("SITE_URL") || "https://kynare.lovable.app";
    const assessmentUrl = `${baseUrl}/assessment/${accessToken}`;
    const bookingUrl = "https://kynare.com/timetable";

    console.log("Sending email to:", email);
    console.log("Assessment URL:", assessmentUrl);

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
          ${assessmentSummary}
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
