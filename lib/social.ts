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

export function normalizePhone(value: string): string {
  return value.replace(/[^\d+]/g, "").trim();
}

export function toWhatsAppLink(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const digits = raw.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : raw;
}

export function toTelegramLink(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@/, "");
  return `https://t.me/${handle}`;
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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
    if (!isValidHttpUrl(link)) return "رابط واتساب غير صالح (مثال: https://wa.me/2189...)";
    return null;
  }

  if (icon === "telegram") {
    const link = toTelegramLink(trimmed);
    if (!isValidHttpUrl(link)) return "رابط تيليجرام غير صالح";
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
  if (icon === "phone") {
    const digits = trimmed.replace(/\D/g, "");
    return digits ? `tel:+${digits.replace(/^\+/, "")}` : trimmed;
  }
  return trimmed;
}
