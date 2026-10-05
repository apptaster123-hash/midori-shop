// POST /api/checkout — create Order + OrderItems atomically, dispatch the
// confirmation email (PRD §9.1 validation rules, followed exactly).
//
// Request:  { customer: { name, email, phone, address, city,
//                         paymentMethod: "cod" | "whatsapp", notes? },
//             items: [{ productId, quantity }] }
// Response: 200 { ok: true, orderNumber, subtotal, delivery, total }
//           400 { ok: false, error }        — any validation failure
//           500 { ok: false, error }        — unexpected failure (logged)
//
// Prices are recomputed from DB rows — client-supplied prices are never trusted.
// All queries go through Prisma (parameterized by design).
import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { deliveryFor } from "@/lib/products";
import { getCurrentUser } from "@/lib/session";
import { sendOrderConfirmation } from "@/lib/mailgun";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_QTY_PER_LINE = 99; // mirrors the client store's cap (src/lib/store.ts)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function badRequest(error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

/** "MDR-YYYYMMDD-XXXX" — 4-char base36 suffix from node:crypto. Accra is
 *  GMT+0 with no DST, so the UTC date is the local order date. */
function makeOrderNumber(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const suffix = randomInt(0, 36 ** 4).toString(36).padStart(4, "0");
  return `MDR-${year}${month}${day}-${suffix}`;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

interface ValidatedCustomer {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  paymentMethod: "cod" | "whatsapp";
  notes: string | null;
}

function requiredString(record: Record<string, unknown>, key: string, label: string): string | null {
  const value = record[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return trimmed;
}

function validateCustomer(raw: unknown): { customer: ValidatedCustomer } | { error: string } {
  if (!isRecord(raw)) return { error: "Customer details are missing." };
  const name = requiredString(raw, "name", "Full name");
  if (name === null) return { error: "Please enter your full name." };

  const email = requiredString(raw, "email", "Email");
  if (email === null) return { error: "Please enter your email." };
  if (!EMAIL_PATTERN.test(email)) return { error: "That email address doesn't look right." };

  const phone = requiredString(raw, "phone", "Phone");
  if (phone === null) return { error: "Please enter your phone number." };
  if (phone.length < 8) return { error: "Your phone number needs at least 8 digits." };

  const address = requiredString(raw, "address", "Delivery address");
  if (address === null) return { error: "Please enter your delivery address." };

  const city = requiredString(raw, "city", "City");
  if (city === null) return { error: "Please enter your city." };

  const paymentMethod = raw["paymentMethod"];
  if (paymentMethod !== "cod" && paymentMethod !== "whatsapp") {
    return { error: "Please choose a payment method." };
  }

  const notesRaw = raw["notes"];
  let notes: string | null = null;
  if (notesRaw !== undefined && notesRaw !== null) {
    if (typeof notesRaw !== "string") return { error: "Notes must be text." };
    const trimmed = notesRaw.trim();
    notes = trimmed === "" ? null : trimmed;
  }

  return {
    customer: { name, email, phone, address, city, paymentMethod, notes },
  };
}

/** Merge duplicate product lines, validating each as we go (1..99 per line). */
function collectItems(raw: unknown): { quantities: Map<string, number> } | { error: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: "Your cart is empty — add something first." };
  }
  const quantities = new Map<string, number>();
  for (const item of raw) {
    if (!isRecord(item)) return { error: "Each cart item must be an object." };
    const productId = item["productId"];
    if (typeof productId !== "string" || productId.trim() === "") {
      return { error: "Each cart item needs a productId." };
    }
    const quantity = item["quantity"];
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_LINE) {
      return { error: "Item quantity must be a whole number between 1 and 99." };
    }
    quantities.set(productId, Math.min(MAX_QTY_PER_LINE, (quantities.get(productId) ?? 0) + quantity));
  }
  return { quantities };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid request body — expected JSON.");
  }
  if (!isRecord(body)) return badRequest("Invalid request body — expected an object.");

  const customerResult = validateCustomer(body["customer"]);
  if ("error" in customerResult) return badRequest(customerResult.error);

  const itemsResult = collectItems(body["items"]);
  if ("error" in itemsResult) return badRequest(itemsResult.error);
  const quantities = itemsResult.quantities;

  try {
    // Every productId must exist — unknown ids are rejected with 400 (PRD §9.1).
    const productIds = [...quantities.keys()];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    if (products.length !== productIds.length) {
      const known = new Set(products.map((product) => product.id));
      const unknown = productIds.filter((id) => !known.has(id));
      return badRequest(`We don't carry: ${unknown.join(", ")}.`);
    }

    // Recompute money from DB prices — never trust the client.
    const lines = products.map((product) => {
      const quantity = quantities.get(product.id) ?? 0;
      return { product, quantity, lineTotal: product.price * quantity };
    });
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const delivery = deliveryFor(subtotal);
    const total = subtotal + delivery;

    // Link to a DB user when one exists for the session email (null otherwise —
    // JWT demo sessions have no User row, and guest checkout is supported).
    const sessionUser = await getCurrentUser();
    const dbUser = sessionUser?.email
      ? await prisma.user.findUnique({
          where: { email: sessionUser.email },
          select: { id: true },
        })
      : null;

    const customer = customerResult.customer;
    const createData = {
      orderNumber: makeOrderNumber(),
      userId: dbUser?.id ?? null,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      deliveryAddress: customer.address,
      city: customer.city,
      paymentMethod: customer.paymentMethod,
      notes: customer.notes,
      subtotal,
      delivery,
      total,
      status: "pending",
      items: {
        create: lines.map((line) => ({
          productId: line.product.id,
          name: line.product.name, // snapshot at order time (PRD §8.3)
          unitPrice: line.product.price,
          quantity: line.quantity,
          lineTotal: line.lineTotal,
        })),
      },
    };

    // Order + OrderItems in ONE nested create (atomic). Retry on the (rare)
    // orderNumber collision — the suffix is random base36.
    type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;
    let order: OrderWithItems | null = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        order = await prisma.order.create({
          data: createData,
          include: { items: true },
        });
        break;
      } catch (error) {
        if (isUniqueViolation(error) && attempt < 4) {
          createData.orderNumber = makeOrderNumber();
          continue;
        }
        throw error;
      }
    }
    if (!order) {
      throw new Error("order creation produced no row");
    }

    // Email dispatch: awaited but fully self-swallowing — sendOrderConfirmation
    // never throws, and this try/catch only logs. Never part of the response.
    try {
      await sendOrderConfirmation(order, order.items);
    } catch (emailError) {
      console.error("[api/checkout] confirmation email failed (not propagated):", emailError);
    }

    return NextResponse.json({
      ok: true,
      orderNumber: order.orderNumber,
      subtotal: order.subtotal,
      delivery: order.delivery,
      total: order.total,
    });
  } catch (error) {
    console.error("[api/checkout] order creation failed:", error);
    return NextResponse.json(
      { ok: false, error: "We couldn't place your order right now. Please try again." },
      { status: 500 },
    );
  }
}
