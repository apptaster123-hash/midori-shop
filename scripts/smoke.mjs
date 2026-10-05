// Midori end-to-end smoke gate — plain Node, no test framework, no shell.
//
// Run as EXACTLY:  node scripts/smoke.mjs
// (after `next build` — this script starts the production server itself).
//
// What it does:
//   1. Parses .env and sets process.env BEFORE dynamically importing
//      @prisma/client (DATABASE_URL is file:./dev.db, which resolves relative
//      to prisma/schema.prisma — i.e. prisma/dev.db — regardless of cwd).
//   2. Spawns the production server purely with Node (no shell — Windows-safe):
//        spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3100"], ...)
//   3. Polls http://localhost:3100/ until 200 (90s cap).
//   4. Asserts homepage, /api/products, /api/seed, valid checkout, DB row +
//      totals, malformed-email 400, and the [mailgun:demo] stdout marker.
//   5. Prints { passed, checks: [...] } and exits 0 only when every check
//      passes. The server is killed in a finally block.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const BASE_URL = "http://localhost:3100";
const READY_CAP_MS = 90_000;
const STDOUT_CAP = 10 * 1024 * 1024; // memory guard on captured server output

// ---------------------------------------------------------------------------
// .env parsing — BEFORE any Prisma import (env vars must exist at client
// construction; sqlite file paths resolve against prisma/schema.prisma).
// ---------------------------------------------------------------------------
function parseDotEnv(text) {
  const parsed = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

const parsedEnv = parseDotEnv(readFileSync(join(projectRoot, ".env"), "utf8"));
for (const [key, value] of Object.entries(parsedEnv)) {
  process.env[key] = value;
}

const checks = [];
function record(name, pass, detail = "") {
  checks.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}${detail ? `  (${detail})` : ""}`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function tail(text, lines = 25) {
  const parts = String(text).split(/\r?\n/).filter(Boolean);
  return parts.slice(-lines).join("\n");
}

async function fetchJson(pathname, init) {
  const res = await fetch(`${BASE_URL}${pathname}`, init);
  let body = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON body — leave as null, the caller checks status first
  }
  return { res, body };
}

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3100"], {
  cwd: projectRoot,
  env: { ...process.env, ...parsedEnv },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverStdout = "";
let serverStderr = "";
server.stdout.on("data", (chunk) => {
  if (serverStdout.length < STDOUT_CAP) serverStdout += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  if (serverStderr.length < STDOUT_CAP) serverStderr += chunk.toString();
});

async function waitForServer() {
  const start = Date.now();
  let lastStatus = "";
  while (Date.now() - start < READY_CAP_MS) {
    if (server.exitCode !== null) {
      throw new Error(
        `production server exited early with code ${server.exitCode}. ` +
          `Did you run \`next build\` first?\nstderr tail:\n${tail(serverStderr)}`,
      );
    }
    try {
      const res = await fetch(`${BASE_URL}/`, { signal: AbortSignal.timeout(4000) });
      if (res.status === 200) return;
      lastStatus = `GET / answered ${res.status} (still waiting for 200)`;
    } catch {
      // not accepting connections yet — keep polling
    }
    await sleep(500);
  }
  throw new Error(
    `server did not return 200 on ${BASE_URL}/ within ${READY_CAP_MS / 1000}s. ` +
      `${lastStatus}\nstdout tail:\n${tail(serverStdout)}\nstderr tail:\n${tail(serverStderr)}`,
  );
}

function killServer() {
  if (server.exitCode !== null) return;
  server.kill("SIGTERM");
  // Windows maps SIGTERM to TerminateProcess; give it a moment, then force.
  setTimeout(() => {
    if (server.exitCode === null) server.kill("SIGKILL");
  }, 3000);
}

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------
let passed = false;
const prismaReady = { client: null };

try {
  // Prisma client is imported AFTER .env parsing (see header note). Relative
  // sqlite paths resolve against prisma/schema.prisma → prisma/dev.db.
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  prismaReady.client = prisma;

  await waitForServer();
  console.log("server ready on http://localhost:3100\n");

  // (1) Homepage ----------------------------------------------------------------
  let homeStatus = 0;
  let homeText = "";
  try {
    const homeRes = await fetch(`${BASE_URL}/`, { signal: AbortSignal.timeout(10000) });
    homeStatus = homeRes.status;
    homeText = await homeRes.text();
  } catch (error) {
    record('GET / is reachable', false, String(error));
  }
  record(
    '(1) GET / returns 200 and contains "Midori"',
    homeStatus === 200 && homeText.includes("Midori"),
    `status ${homeStatus}${homeStatus === 200 && !homeText.includes("Midori") ? ', body lacks "Midori"' : ""}`,
  );

  // (2) Products ----------------------------------------------------------------
  let products = null;
  {
    const { res, body } = await fetchJson("/api/products");
    products = res.status === 200 && body && Array.isArray(body.products) ? body.products : null;
    record(
      "(2) GET /api/products returns 200 with 20 items",
      products !== null && products.length === 20,
      `status ${res.status}, items ${products ? products.length : "n/a"}`,
    );
  }

  // (3) Reseed ------------------------------------------------------------------
  {
    const { res, body } = await fetchJson("/api/seed", { method: "POST" });
    record(
      "(3) POST /api/seed returns 200",
      res.status === 200 && body && body.ok === true,
      `status ${res.status}, ok ${body && body.ok === true ? "true" : "false"}`,
    );
  }

  // (4) Valid checkout ----------------------------------------------------------
  let orderNumber = null;
  let checkoutResponse = null;
  let orderedProductId = null;
  let orderedQuantity = 0;
  {
    const preferred =
      products && products.find((p) => p && p.id === "vitc")
        ? products.find((p) => p.id === "vitc")
        : products && products[0]
          ? products[0]
          : null;
    orderedProductId = preferred ? preferred.id : null;
    orderedQuantity = 2;
    const payload = {
      customer: {
        name: "Ama Serwaa",
        email: "takumistudio26@gmail.com",
        phone: "+233 55 163 2777",
        address: "12 Palm Wine Street, Osu",
        city: "Accra",
        paymentMethod: "cod",
        notes: "Smoke-test order — leave with the gateman.",
      },
      items: orderedProductId ? [{ productId: orderedProductId, quantity: orderedQuantity }] : [],
    };
    const { res, body } = await fetchJson("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    checkoutResponse = body;
    orderNumber =
      res.status === 200 && body && typeof body.orderNumber === "string" ? body.orderNumber : null;
    record(
      "(4) POST /api/checkout (valid) returns 200 with orderNumber matching /^MDR-/",
      orderNumber !== null && /^MDR-/.test(orderNumber),
      orderNumber !== null
        ? `status ${res.status}, orderNumber ${orderNumber}`
        : `status ${res.status}, body ${JSON.stringify(body)}`,
    );
  }

  // (5) DB row + totals match ---------------------------------------------------
  if (orderNumber && checkoutResponse && orderedProductId) {
    const order = await prismaReady.client.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });
    const productRow = await prismaReady.client.product.findUnique({
      where: { id: orderedProductId },
    });

    const expectedSubtotal = productRow ? productRow.price * orderedQuantity : null;
    const expectedDelivery = expectedSubtotal === null ? null : expectedSubtotal >= 200 ? 0 : 25;
    const expectedTotal =
      expectedSubtotal === null ? null : expectedSubtotal + expectedDelivery;

    const dbRowOk = order !== null && order.items.length >= 1;
    const totalsOk =
      order !== null &&
      checkoutResponse !== null &&
      order.subtotal === checkoutResponse.subtotal &&
      order.delivery === checkoutResponse.delivery &&
      order.total === checkoutResponse.total &&
      expectedSubtotal !== null &&
      order.subtotal === expectedSubtotal &&
      order.delivery === expectedDelivery &&
      order.total === expectedTotal;

    record(
      "(5) Order row exists with >=1 item and totals match the response (recomputed from DB price)",
      dbRowOk && totalsOk,
      order
        ? `items ${order.items.length}, subtotal ${order.subtotal}/${checkoutResponse.subtotal}, delivery ${order.delivery}/${checkoutResponse.delivery}, total ${order.total}/${checkoutResponse.total}, expected subtotal ${expectedSubtotal}`
        : `no Order row for ${orderNumber}`,
    );
  } else {
    record("(5) Order row exists with >=1 item and totals match the response", false, "skipped — step 4 did not produce an orderNumber");
  }

  // (6) Malformed email rejected -------------------------------------------------
  {
    const badPayload = {
      customer: {
        name: "Ama Serwaa",
        email: "not-an-email",
        phone: "+233 55 163 2777",
        address: "12 Palm Wine Street, Osu",
        city: "Accra",
        paymentMethod: "cod",
      },
      items: [{ productId: orderedProductId ?? "vitc", quantity: 1 }],
    };
    const { res } = await fetchJson("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(badPayload),
    });
    record("(6) POST /api/checkout with malformed email returns 400", res.status === 400, `status ${res.status}`);
  }

  // (7) Demo Mailgun marker ------------------------------------------------------
  if ((parsedEnv.MAILGUN_API_KEY ?? "").trim() === "placeholder") {
    record(
      "(7) server stdout captured [mailgun:demo] after the order",
      serverStdout.includes("[mailgun:demo]"),
      serverStdout.includes("[mailgun:demo]") ? "marker found" : "marker missing from stdout",
    );
  } else {
    record("(7) server stdout captured [mailgun:demo] after the order", true, "skipped — MAILGUN_API_KEY is not 'placeholder'");
  }

  passed = checks.every((check) => check.pass);
} catch (error) {
  record("smoke run completed", false, error && error.message ? error.message : String(error));
  passed = false;
} finally {
  if (prismaReady.client) {
    try {
      await prismaReady.client.$disconnect();
    } catch {
      // disconnect failures must not mask the gate result
    }
  }
  killServer();
  await sleep(500);
}

console.log("");
console.log(JSON.stringify({ passed, checks }, null, 2));
process.exit(passed ? 0 : 1);
