import {
  AtSign,
  Camera,
  CirclePlay,
  Globe,
  Link2,
  MessageCircle,
  Phone,
  Send,
  Share2,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { SocialIconKey } from "@/lib/types";

const ICONS: Record<SocialIconKey, LucideIcon> = {
  facebook: Share2,
  instagram: Camera,
  youtube: CirclePlay,
  twitter: AtSign,
  tiktok: Video,
  linkedin: Link2,
  snapchat: Camera,
  telegram: Send,
  whatsapp: MessageCircle,
  phone: Phone,
  globe: Globe,
};

export function SocialIcon({
  name,
  className = "h-4 w-4",
}: {
  name: SocialIconKey;
  className?: string;
}) {
  const Icon = ICONS[name] ?? Globe;
  return <Icon className={className} aria-hidden />;
}
