"use client";

// Local shopper preferences (PRD §5.18 spirit): stored on this device only,
// used to prefill checkout. No server round-trip — honest about that in the UI.
import { useEffect, useState } from "react";

export interface ShopperSettings {
  /** Preferred checkout name (falls back to the session name). */
  name: string;
  /** WhatsApp phone for delivery coordination. */
  phone: string;
  /** Default delivery city. */
  city: string;
}

const KEY = "midori-settings";

export const DEFAULT_SETTINGS: ShopperSettings = { name: "", phone: "", city: "Accra" };

/** Read settings on the client; defaults during SSR. */
export function loadSettings(): ShopperSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_SETTINGS;
    const record = parsed as Record<string, unknown>;
    return {
      name: typeof record.name === "string" ? record.name : "",
      phone: typeof record.phone === "string" ? record.phone : "",
      city: typeof record.city === "string" && record.city !== "" ? record.city : "Accra",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: ShopperSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(settings));
}

/** Hydration-safe view of the settings: defaults on first render, real values after mount. */
export function useShopperSettings(): [ShopperSettings, boolean] {
  const [settings, setSettings] = useState<ShopperSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setSettings(loadSettings());
    setMounted(true);
  }, []);
  return [settings, mounted];
}
