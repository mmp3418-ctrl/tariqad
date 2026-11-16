import type { ComponentType } from "react";
import {
  Award,
  Bookmark,
  BookOpen,
  Clapperboard,
  FileText,
  Film,
  GraduationCap,
  Library,
  MonitorPlay,
  NotebookPen,
  PlayCircle,
  Radio,
  ScrollText,
  Tv,
  Video,
} from "lucide-react";

export const MEDIA_ICONS: Record<
  string,
  ComponentType<{ className?: string }>
> = {
  "book-open": BookOpen,
  "file-text": FileText,
  "graduation-cap": GraduationCap,
  bookmark: Bookmark,
  award: Award,
  notebook: NotebookPen,
  library: Library,
  "scroll-text": ScrollText,
  "play-circle": PlayCircle,
  youtube: PlayCircle,
  video: Video,
  "monitor-play": MonitorPlay,
  tv: Tv,
  clapperboard: Clapperboard,
  film: Film,
  radio: Radio,
};
