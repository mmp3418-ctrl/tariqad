import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export const TIMETABLE_DAYS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
] as const;

export type TimetableGrid = Record<string, string[]>;

export function emptyTimetableGrid(
  days: readonly string[] = TIMETABLE_DAYS,
  periodCount = 6
): TimetableGrid {
  const grid: TimetableGrid = {};
  for (const day of days) {
    grid[day] = Array.from({ length: periodCount }, () => "");
  }
  return grid;
}

export function resizeTimetableGrid(
  grid: TimetableGrid,
  days: readonly string[],
  periodCount: number
): TimetableGrid {
  const next: TimetableGrid = {};
  for (const day of days) {
    const prev = grid[day] ?? [];
    next[day] = Array.from({ length: periodCount }, (_, i) => prev[i] ?? "");
  }
  return next;
}

export type TimetablePdfMeta = {
  title: string;
  stageName: string;
  gradeName: string;
  brand?: string;
};

/**
 * Capture a rendered RTL timetable element and export a landscape A4 PDF.
 * Returns the PDF as Blob + triggers a local download when `downloadName` is set.
 */
export async function exportTimetablePdf(
  element: HTMLElement,
  meta: TimetablePdfMeta,
  downloadName?: string
): Promise<Blob> {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#0b1220",
    useCORS: true,
    logging: false,
  } as Parameters<typeof html2canvas>[1]);

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  const imgWidth = usableWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const finalHeight = Math.min(imgHeight, usableHeight);
  const finalWidth = (canvas.width * finalHeight) / canvas.height;
  const x = (pageWidth - finalWidth) / 2;
  const y = margin;

  pdf.setFillColor(11, 18, 32);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  pdf.addImage(imgData, "PNG", x, y, finalWidth, finalHeight);

  const safeTitle = (meta.title || "جدول-حصص").replace(/[^\w\u0600-\u06FF-]+/g, "-");
  const filename = downloadName || `${safeTitle}.pdf`;
  pdf.save(filename);

  return pdf.output("blob");
}
