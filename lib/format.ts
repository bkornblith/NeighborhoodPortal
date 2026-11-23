import type { House } from "@/lib/types";

export const TZ = process.env.APP_TIMEZONE || "America/New_York";

export function money(cents: number | null, isFree: boolean) {
  if (isFree) return "Free";
  if (cents == null) return "";
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars.toLocaleString("en-US")}` : `$${dollars.toFixed(2)}`;
}

export function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  return shortDate(iso);
}

export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: TZ });
}

export function eventWhen(starts: string, ends: string | null) {
  const s = new Date(starts);
  const day = s.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: TZ });
  const t = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });
  return ends ? `${day}, ${t(s)} – ${t(new Date(ends))}` : `${day}, ${t(s)}`;
}

export function calParts(iso: string) {
  const d = new Date(iso);
  return {
    month: d.toLocaleDateString("en-US", { month: "short", timeZone: TZ }).toUpperCase(),
    day: d.toLocaleDateString("en-US", { day: "numeric", timeZone: TZ }),
  };
}

function tzOffsetMs(at: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).formatToParts(at).map((p) => [p.type, p.value]),
  );
  const asIfUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return asIfUtc - at.getTime();
}

/** Convert a <input type="datetime-local"> value (neighborhood local time) to ISO. */
export function localInputToIso(value: string | null | undefined) {
  if (!value) return null;
  const naive = new Date(value + ":00Z");
  if (isNaN(naive.getTime())) return null;
  const guess = new Date(naive.getTime() - tzOffsetMs(naive));
  return new Date(naive.getTime() - tzOffsetMs(guess)).toISOString();
}

export function isoToLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + tzOffsetMs(new Date(iso)));
  return d.toISOString().slice(0, 16);
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
}

export function houseLabel(h: House | null | undefined) {
  return h ? `${h.street_number} ${h.street}` : "";
}

export function photoUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${path}`;
}
