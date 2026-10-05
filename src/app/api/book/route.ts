// POST /api/book — nurse-booking requests (concierge, home care, travel).
// Persists a Booking row and notifies the shop by email (demo mode logs it).
// Elizabeth confirms every visit personally on WhatsApp, so there is no
// payment or calendar integration here by design.
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendBookingNotification } from "@/lib/mailgun";

const SERVICES = new Set(["concierge", "homecare", "travel"]);

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("We couldn't read that request — please try again.");
  }
  if (typeof body !== "object" || body === null) {
    return badRequest("We couldn't read that request — please try again.");
  }
  const data = body as Record<string, unknown>;

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const phone = typeof data.phone === "string" ? data.phone.trim() : "";
  const service = typeof data.service === "string" ? data.service.trim() : "";
  const notes = typeof data.notes === "string" ? data.notes.trim().slice(0, 600) : "";
  const preferredDate =
    typeof data.preferredDate === "string" ? data.preferredDate.trim().slice(0, 40) : "";

  if (name.length < 2) return badRequest("Please tell us your full name.");
  if (phone.replace(/[^0-9]/g, "").length < 8) {
    return badRequest("Please leave a phone number we can reach you on (at least 8 digits).");
  }
  if (!SERVICES.has(service)) return badRequest("Please choose a nursing service.");

  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const suffix = randomBytes(2).toString("hex").toUpperCase();
  const reference = `BKN-${datePart}-${suffix}`;

  try {
    const booking = await prisma.booking.create({
      data: {
        reference,
        customerName: name,
        customerPhone: phone,
        service,
        preferredDate: preferredDate === "" ? "Flexible" : preferredDate,
        notes,
      },
    });

    // Notify the shop — fire-and-forget, never blocks the response.
    void sendBookingNotification({
      reference: booking.reference,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      service: booking.service,
      preferredDate: booking.preferredDate,
      notes: booking.notes,
    });

    return NextResponse.json({
      ok: true,
      reference: booking.reference,
      service: booking.service,
    });
  } catch (error) {
    console.error("[midori] booking create failed:", error);
    return NextResponse.json(
      { ok: false, error: "We couldn't save your request — please try again in a moment." },
      { status: 500 },
    );
  }
}
