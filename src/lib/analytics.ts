import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// Get or create session ID
const getSessionId = (): string => {
  const key = "fit2go_session_id";
  let sessionId = sessionStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(key, sessionId);
  }
  
  return sessionId;
};

export async function trackEvent(
  eventType: string,
  eventData?: Record<string, Json>,
  assessmentId?: string
): Promise<void> {
  try {
    const { error } = await supabase.from("analytics_events").insert([{
      event_type: eventType,
      event_data: eventData as Json || null,
      assessment_id: assessmentId || null,
      page_url: window.location.href,
      session_id: getSessionId(),
      user_agent: navigator.userAgent,
    }]);

    if (error) {
      console.error("Failed to track event:", error);
    }
  } catch (err) {
    // Silently fail - don't break the app for analytics
    console.error("Analytics error:", err);
  }
}
