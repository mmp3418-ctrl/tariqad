import type { SocialIconKey } from "@/lib/types";

export const SOCIAL_ICON_OPTIONS: {
  value: SocialIconKey;
  label: string;
}[] = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "X / Twitter" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "snapchat", label: "Snapchat" },
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "هاتف" },
  { value: "globe", label: "موقع / أخرى" },
];

export function toWhatsAppLink(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const digits = raw.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

export function toTelegramLink(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@/, "");
  return handle ? `https://t.me/${handle}` : "";
}

export function toMailtoLink(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (/^mailto:/i.test(raw)) return raw;
  return `mailto:${raw}`;
}

export function toTelLink(value: string): string {
  const digits = value.replace(/[^\d+]/g, "");
  if (!digits) return "";
  return digits.startsWith("+") ? `tel:${digits}` : `tel:+${digits}`;
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidMapsUrl(value: string): boolean {
  if (!isValidHttpUrl(value)) return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return (
      host.includes("google.") ||
      host.includes("maps.app.goo.gl") ||
      host.includes("goo.gl") ||
      host.includes("maps.apple.com") ||
      host.includes("openstreetmap.org")
    );
  } catch {
    return false;
  }
}

/** Only allow absolute external protocols — never relative paths (avoids Next 404). */
export function safeExternalHref(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  if (/^(https?:|mailto:|tel:)/i.test(raw)) return raw;
  return null;
}

export function validateSocialUrl(
  icon: SocialIconKey,
  url: string
): string | null {
  const trimmed = url.trim();
  if (!trimmed) return "الرابط مطلوب";

  if (icon === "phone") {
    if (trimmed.replace(/\D/g, "").length < 8) {
      return "رقم الهاتف غير صالح";
    }
    return null;
  }

  if (icon === "whatsapp") {
    const link = toWhatsAppLink(trimmed);
    if (!link || !isValidHttpUrl(link)) {
      return "رابط واتساب غير صالح (مثال: https://wa.me/2189...)";
    }
    return null;
  }

  if (icon === "telegram") {
    const link = toTelegramLink(trimmed);
    if (!link || !isValidHttpUrl(link)) return "رابط تيليجرام غير صالح";
    return null;
  }

  if (!isValidHttpUrl(trimmed)) {
    return "يجب أن يكون الرابط بصيغة https://...";
  }
  return null;
}

export function normalizeSocialUrl(icon: SocialIconKey, url: string): string {
  const trimmed = url.trim();
  if (icon === "whatsapp") return toWhatsAppLink(trimmed);
  if (icon === "telegram") return toTelegramLink(trimmed);
  if (icon === "phone") return toTelLink(trimmed);
  return trimmed;
}
