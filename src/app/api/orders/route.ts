// GET /api/orders — the signed-in shopper's orders, newest first, matched by
// the session email (orders placed with that email, including guest checkout).
// Guests get an empty list, not an error, so /profile can render quietly.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const email = user?.email ?? "";
    if (email === "") {
      return NextResponse.json({ ok: true, orders: [] });
    }

    const orders = await prisma.order.findMany({
      where: { customerEmail: email },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { items: true },
    });

    return NextResponse.json({
      ok: true,
      orders: orders.map((order) => ({
        orderNumber: order.orderNumber,
        createdAt: order.createdAt.toISOString(),
        status: order.status,
        paymentMethod: order.paymentMethod,
        subtotal: order.subtotal,
        delivery: order.delivery,
        total: order.total,
        items: order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
      })),
    });
  } catch (error) {
    console.error("[midori] GET /api/orders failed:", error);
    return NextResponse.json({ ok: false, error: "Could not load orders." }, { status: 500 });
  }
}
