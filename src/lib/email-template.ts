// Branded order-confirmation email, rendered as static HTML + plain text.
// EMAIL-CLIENT CONSTRAINTS: inline CSS only (no <style> block — Gmail and most
// clients strip it), table-based layout, web-safe font stacks with Fraunces /
// Inter as progressive enhancements. Palette = PRD §3.1 tokens.
import { fmtGhs } from "@/lib/products";

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  city: string;
  paymentMethod: string; // 'cod' | 'whatsapp' (PRD §8.2)
  notes: string | null;
  subtotal: number;
  delivery: number;
  total: number;
}

export interface OrderEmailItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

// Palette (PRD §3.1) — duplicated as literals because email clients receive
// raw HTML with no access to the site's CSS custom properties.
const COLOR = {
  paper: "#F6F1E7",
  paperSoft: "#FBF7EE",
  ink: "#1A1F1B",
  inkSoft: "#4A524C",
  inkMute: "#8A8F87",
  sage: "#5B7B5A",
  sageDeep: "#2F4A35",
  sageMist: "#DCE4D6",
  line: "#D7CDB6",
} as const;

const SERIF = "'Zen Old Mincho', Georgia, 'Times New Roman', serif";
const SANS = "'Inter', Arial, Helvetica, sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paymentNote(paymentMethod: string, total: number): string {
  if (paymentMethod === "whatsapp") {
    return "We'll confirm your details with you on WhatsApp before dispatch. Nothing to pay yet.";
  }
  // 'cod' (cash on delivery) is the default assumption.
  return `Pay our courier in cash when the parcel arrives — please keep ${fmtGhs(total)} ready.`;
}

export function orderEmailSubject(orderNumber: string): string {
  return `Midori order ${orderNumber} — confirmed`;
}

export function renderOrderEmailHtml(order: OrderEmailData, items: readonly OrderEmailItem[]): string {
  const e = escapeHtml;
  const firstName = order.customerName.trim().split(/\s+/)[0] || "there";
  const whatsappUrl =
    "https://wa.me/233551632777?text=" +
    encodeURIComponent(`Hello Nurse Elizabeth! I have a question about my order ${order.orderNumber}.`);
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${COLOR.line};font-family:${SANS};font-size:14px;color:${COLOR.ink};">
            ${e(item.name)}<br />
            <span style="font-size:12px;color:${COLOR.inkMute};">${item.quantity} &times; ${fmtGhs(item.unitPrice)}</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid ${COLOR.line};font-family:${SANS};font-size:14px;color:${COLOR.ink};text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;">${fmtGhs(item.lineTotal)}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${e(orderEmailSubject(order.orderNumber))}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLOR.paper};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLOR.paper};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;border:1px solid ${COLOR.line};border-radius:4px;background-color:${COLOR.paperSoft};">

        <!-- header: sage band with the 緑 mark -->
        <tr>
          <td align="center" style="background-color:${COLOR.sageDeep};padding:28px 24px;border-radius:4px 4px 0 0;">
            <div style="font-family:${SERIF};font-size:30px;color:${COLOR.sageMist};line-height:1;">緑</div>
            <div style="font-family:${SERIF};font-size:22px;color:${COLOR.paper};letter-spacing:0.28em;padding-top:6px;">MIDORI</div>
            <div style="font-family:${SANS};font-size:12px;color:${COLOR.sageMist};padding-top:6px;">Everyday wellness, the calm way &middot; Accra</div>
          </td>
        </tr>

        <!-- greeting -->
        <tr>
          <td style="padding:28px 32px 8px 32px;font-family:${SANS};">
            <div style="font-family:${SERIF};font-size:22px;color:${COLOR.ink};">Thank you, ${e(firstName)}.</div>
            <div style="font-size:14px;color:${COLOR.inkSoft};line-height:1.65;padding-top:8px;">
              Your order is in. I check every item before it's sealed and dispatched —
              you'll get a note when it leaves the studio.
            </div>
          </td>
        </tr>

        <!-- order number -->
        <tr>
          <td style="padding:12px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${COLOR.line};border-radius:4px;background-color:${COLOR.sageMist};">
              <tr>
                <td style="padding:12px 16px;font-family:${SANS};font-size:13px;color:${COLOR.inkSoft};">Order number</td>
                <td style="padding:12px 16px;font-family:${SANS};font-size:14px;font-weight:600;color:${COLOR.sageDeep};text-align:right;letter-spacing:0.06em;">${e(order.orderNumber)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- line items -->
        <tr>
          <td style="padding:8px 32px 0 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              ${rows}
            </table>
          </td>
        </tr>

        <!-- totals -->
        <tr>
          <td style="padding:16px 32px 0 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:${SANS};font-size:14px;color:${COLOR.inkSoft};">
              <tr>
                <td style="padding:4px 0;">Subtotal</td>
                <td style="padding:4px 0;text-align:right;font-variant-numeric:tabular-nums;color:${COLOR.ink};">${fmtGhs(order.subtotal)}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;">Delivery${order.delivery === 0 ? ' <span style="color:' + COLOR.sage + ';">(free)</span>' : ""}</td>
                <td style="padding:4px 0;text-align:right;font-variant-numeric:tabular-nums;color:${COLOR.ink};">${order.delivery === 0 ? "Free" : fmtGhs(order.delivery)}</td>
              </tr>
              <tr>
                <td style="padding:10px 0 0 0;border-top:1px solid ${COLOR.line};margin-top:8px;font-family:${SERIF};font-size:16px;color:${COLOR.ink};">Total</td>
                <td style="padding:10px 0 0 0;border-top:1px solid ${COLOR.line};text-align:right;font-family:${SANS};font-size:16px;font-weight:600;color:${COLOR.sageDeep};font-variant-numeric:tabular-nums;">${fmtGhs(order.total)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- delivery + payment -->
        <tr>
          <td style="padding:20px 32px 0 32px;font-family:${SANS};font-size:14px;color:${COLOR.inkSoft};line-height:1.65;">
            <div style="font-size:12px;color:${COLOR.inkMute};text-transform:uppercase;letter-spacing:0.15em;padding-bottom:4px;">Delivering to</div>
            <div style="color:${COLOR.ink};">${e(order.customerName)}<br />${e(order.deliveryAddress)}, ${e(order.city)}<br />${e(order.customerPhone)}</div>
            <div style="padding-top:12px;font-size:13px;">${e(paymentNote(order.paymentMethod, order.total))}</div>
            ${order.notes ? `<div style="padding-top:8px;font-size:13px;color:${COLOR.inkMute};">Your note: &ldquo;${e(order.notes)}&rdquo;</div>` : ""}
          </td>
        </tr>

        <!-- questions? WhatsApp the nurse -->
        <tr>
          <td style="padding:24px 32px 8px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${COLOR.line};">
              <tr>
                <td style="padding-top:16px;font-family:${SANS};font-size:14px;color:${COLOR.inkSoft};line-height:1.65;">
                  Questions about your order? <a href="${whatsappUrl}" style="color:${COLOR.sage};text-decoration:underline;">WhatsApp the nurse</a> &mdash;
                  Elizabeth, RN replies in minutes (+233 55 163 2777), or write to
                  <a href="mailto:takumistudio26@gmail.com" style="color:${COLOR.sage};text-decoration:underline;">takumistudio26@gmail.com</a>.
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- signature + footer -->
        <tr>
          <td align="center" style="padding:12px 32px 28px 32px;">
            <div style="font-family:${SERIF};font-style:italic;font-size:14px;color:${COLOR.inkSoft};">&mdash; Elizabeth David, RN &middot; Founder</div>
            <div style="font-family:${SANS};font-size:11px;color:${COLOR.inkMute};padding-top:10px;">&copy; 2025 Midori Health &amp; Wellness &middot; 緑 &middot; Made in Accra</div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function renderOrderEmailText(order: OrderEmailData, items: readonly OrderEmailItem[]): string {
  const lines: string[] = [];
  const firstName = order.customerName.trim().split(/\s+/)[0] || "there";
  lines.push(`Thank you, ${firstName}.`);
  lines.push("");
  lines.push(`Order number: ${order.orderNumber}`);
  lines.push("");
  lines.push("Your items:");
  for (const item of items) {
    lines.push(`  - ${item.name} — ${item.quantity} x ${fmtGhs(item.unitPrice)} = ${fmtGhs(item.lineTotal)}`);
  }
  lines.push("");
  lines.push(`Subtotal: ${fmtGhs(order.subtotal)}`);
  lines.push(`Delivery: ${order.delivery === 0 ? "Free" : fmtGhs(order.delivery)}`);
  lines.push(`Total: ${fmtGhs(order.total)}`);
  lines.push("");
  lines.push("Delivering to:");
  lines.push(`  ${order.customerName}`);
  lines.push(`  ${order.deliveryAddress}, ${order.city}`);
  lines.push(`  ${order.customerPhone}`);
  lines.push("");
  lines.push(paymentNote(order.paymentMethod, order.total));
  if (order.notes) {
    lines.push(`Your note: "${order.notes}"`);
  }
  lines.push("");
  lines.push("Questions about your order? WhatsApp the nurse: https://wa.me/233551632777");
  lines.push("Or write to takumistudio26@gmail.com");
  lines.push("");
  lines.push("-- Elizabeth David, RN · Founder");
  lines.push("© 2025 Midori Health & Wellness · 緑 · Made in Accra");
  return lines.join("\n");
}

export interface RenderedOrderEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderOrderEmail(order: OrderEmailData, items: readonly OrderEmailItem[]): RenderedOrderEmail {
  return {
    subject: orderEmailSubject(order.orderNumber),
    html: renderOrderEmailHtml(order, items),
    text: renderOrderEmailText(order, items),
  };
}

/* ---------------------------------------------------------------------- */
/* Nurse-booking request — a notification TO the shop (Elizabeth), not a   */
/* customer confirmation: she replies personally on WhatsApp.              */
/* ---------------------------------------------------------------------- */

export interface BookingEmailData {
  reference: string;
  customerName: string;
  customerPhone: string;
  /** "concierge" | "homecare" | "travel" */
  service: string;
  preferredDate: string;
  notes: string;
}

export const SERVICE_LABELS: Record<string, string> = {
  concierge: "Concierge nurse",
  homecare: "Home care visit",
  travel: "Travel nurse",
};

export function bookingEmailSubject(reference: string): string {
  return `Midori booking ${reference} — new nurse request`;
}

export function renderBookingEmailText(booking: BookingEmailData): string {
  const lines: string[] = [];
  lines.push("New nurse-booking request from the Midori site.");
  lines.push("");
  lines.push(`Reference: ${booking.reference}`);
  lines.push(`Service: ${SERVICE_LABELS[booking.service] ?? booking.service}`);
  lines.push(`Name: ${booking.customerName}`);
  lines.push(`Phone (WhatsApp): ${booking.customerPhone}`);
  lines.push(`Preferred date: ${booking.preferredDate}`);
  if (booking.notes) {
    lines.push(`Notes: ${booking.notes}`);
  }
  lines.push("");
  lines.push("Reply on WhatsApp to confirm the visit.");
  return lines.join("\n");
}

export function renderBookingEmailHtml(booking: BookingEmailData): string {
  const e = escapeHtml;
  const service = SERVICE_LABELS[booking.service] ?? booking.service;
  const row = (label: string, value: string) =>
    `<tr>
  <td style="padding:8px 0;font-family:${SANS};font-size:14px;color:${COLOR.inkMute};width:120px;">${label}</td>
  <td style="padding:8px 0;font-family:${SANS};font-size:14px;color:${COLOR.ink};">${value}</td>
</tr>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${e(bookingEmailSubject(booking.reference))}</title>
</head>
<body style="margin:0;padding:24px;background-color:#F6F1E7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background-color:#FBF7EE;border:1px solid ${COLOR.line};border-radius:6px;">
  <tr>
    <td style="padding:24px 32px 12px 32px;border-bottom:1px solid ${COLOR.line};">
      <div style="font-family:${SERIF};font-size:20px;color:${COLOR.ink};">midori <span style="color:#5B7B5A;">&middot;</span> nurse booking</div>
    </td>
  </tr>
  <tr>
    <td style="padding:20px 32px 8px 32px;">
      <p style="margin:0 0 14px 0;font-family:${SANS};font-size:14px;color:${COLOR.inkSoft};line-height:1.65;">
        A new booking request came in. Reply on WhatsApp to confirm the visit.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${COLOR.line};">
        ${row("Reference", e(booking.reference))}
        ${row("Service", e(service))}
        ${row("Name", e(booking.customerName))}
        ${row("Phone", `<a href="https://wa.me/${e(booking.customerPhone.replace(/[^0-9]/g, ""))}" style="color:${COLOR.sage};text-decoration:underline;">${e(booking.customerPhone)}</a>`)}
        ${row("Preferred date", e(booking.preferredDate))}
        ${booking.notes ? row("Notes", e(booking.notes)) : ""}
      </table>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding:14px 32px 26px 32px;">
      <div style="font-family:${SANS};font-size:11px;color:${COLOR.inkMute};">&copy; 2025 Midori Health &amp; Wellness &middot; 緑 &middot; Made in Accra</div>
    </td>
  </tr>
</table>
</body>
</html>`;
}
