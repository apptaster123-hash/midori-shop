// Mailgun order-confirmation dispatch (mailgun.js v14, PRD §7.1 "Email").
//
// Contract: sendOrderConfirmation() NEVER throws and NEVER propagates an email
// failure into an API response — every failure is caught and logged here.
//
// Demo mode: when MAILGUN_API_KEY (or the domain) is unset/placeholder, no
// network call happens at all. The full rendered email is logged to the server
// console with the "[mailgun:demo]" marker instead, so the flow stays fully
// testable before real Mailgun credentials exist (scripts/smoke.mjs greps for
// that marker).
import Mailgun from "mailgun.js";
import {
  renderOrderEmail,
  bookingEmailSubject,
  renderBookingEmailHtml,
  renderBookingEmailText,
  type BookingEmailData,
  type OrderEmailData,
  type OrderEmailItem,
} from "@/lib/email-template";

export type { OrderEmailData, OrderEmailItem };

const UNSET = new Set(["", "placeholder", "your-mailgun-api-key", "your-mailgun-domain"]);

/** Type predicate: true only when a real (non-placeholder) value is present. */
function isConfigured(value: string | undefined): value is string {
  return value !== undefined && !UNSET.has(value.trim().toLowerCase());
}

// Structural types — accept Prisma Order / OrderItem rows as well as plain
// objects (Prisma rows carry extra fields, which is fine).
export interface OrderConfirmationOrder extends OrderEmailData {}
export interface OrderConfirmationItem extends OrderEmailItem {}

/**
 * Send (or, in demo mode, log) the order confirmation email.
 * Resolves normally even when sending fails — callers may await this without
 * try/catch, but the checkout route still wraps it defensively.
 */
export async function sendOrderConfirmation(
  order: OrderConfirmationOrder,
  items: readonly OrderConfirmationItem[],
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const { subject, html, text } = renderOrderEmail(order, items);
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;

    if (!isConfigured(apiKey) || !isConfigured(domain)) {
      const reason = !isConfigured(apiKey)
        ? "MAILGUN_API_KEY is not set / placeholder — logging the rendered email instead of sending"
        : "MAILGUN_DOMAIN is not set / placeholder — logging the rendered email instead of sending";
      console.log(`[mailgun:demo] ${reason}`);
      console.log(`[mailgun:demo] to: ${order.customerEmail}`);
      console.log(`[mailgun:demo] subject: ${subject}`);
      console.log(`[mailgun:demo] --- text version ---
${text}`);
      console.log(`[mailgun:demo] --- html version ---
${html}`);
      return { sent: false, reason };
    }

    // Real send path. Uses Node's built-in FormData (Node >= 18, per the
    // mailgun.js README); form-data npm package not required.
    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({
      username: "api",
      key: apiKey,
      // Optional override for EU accounts: MAILGUN_URL=https://api.eu.mailgun.net
      ...(process.env.MAILGUN_URL ? { url: process.env.MAILGUN_URL } : {}),
    });
    const from = process.env.MAILGUN_FROM_EMAIL?.trim() || "takumistudio26@gmail.com";

    await mg.messages.create(domain, {
      from: `Midori 緑 <${from}>`,
      to: order.customerEmail,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (error) {
    // Swallowed by design (PRD §9.1: fire-and-forget, never propagated).
    console.error("[mailgun] order-confirmation email failed (swallowed):", error);
    return { sent: false, reason: "send failed — see [mailgun] error log" };
  }
}

/**
 * Notify the shop about a nurse-booking request (same demo-mode contract as
 * sendOrderConfirmation: never throws, never blocks the API response).
 * Goes TO the shop inbox, since Elizabeth replies personally.
 */
export async function sendBookingNotification(
  booking: BookingEmailData,
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const subject = bookingEmailSubject(booking.reference);
    const html = renderBookingEmailHtml(booking);
    const text = renderBookingEmailText(booking);
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    const to = process.env.MAILGUN_FROM_EMAIL?.trim() || "takumistudio26@gmail.com";

    if (!isConfigured(apiKey) || !isConfigured(domain)) {
      console.log(`[mailgun:demo] booking notification logged (Mailgun not configured)`);
      console.log(`[mailgun:demo] to: ${to}`);
      console.log(`[mailgun:demo] subject: ${subject}`);
      console.log(`[mailgun:demo] --- text version ---
${text}`);
      return { sent: false, reason: "Mailgun not configured — logged instead" };
    }

    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({
      username: "api",
      key: apiKey,
      ...(process.env.MAILGUN_URL ? { url: process.env.MAILGUN_URL } : {}),
    });
    const from = process.env.MAILGUN_FROM_EMAIL?.trim() || "takumistudio26@gmail.com";

    await mg.messages.create(domain, {
      from: `Midori 緑 <${from}>`,
      to,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (error) {
    console.error("[mailgun] booking notification email failed (swallowed):", error);
    return { sent: false, reason: "send failed — see [mailgun] error log" };
  }
}
