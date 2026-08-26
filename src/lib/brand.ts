/**
 * Fit2Go brand + demo configuration.
 *
 * This build is a standalone demo, so booking CTAs are inert by design: they
 * still render (the layout and copy are part of what the demo shows) but they
 * do not navigate anywhere. Set BOOKING_URL to a real scheduling link to
 * re-enable them everywhere at once.
 */
export const BRAND_NAME = "Fit2Go";

export const BOOKING_URL: string | null = null;

export function openBooking(): void {
  if (!BOOKING_URL) return;
  window.open(BOOKING_URL, "_blank", "noopener,noreferrer");
}
