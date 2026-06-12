// Fetch a job posting and extract the fields we prefill the add form with.
//
// The page is fetched server-side and parsed without any LLM/API cost. We prefer
// schema.org `JobPosting` JSON-LD (emitted by most ATS platforms and any site
// following Google for Jobs), then fall back to OpenGraph/meta tags, headings,
// and light regex for salary and work mode.

import { parse, type HTMLElement } from "node-html-parser";
import { workMode } from "@/lib/db/schema";

type WorkMode = (typeof workMode.enumValues)[number];

export type ExtractedJob = {
  companyName: string;
  role: string;
  jobDescription: string | null;
  salary: string | null;
  workMode: WorkMode | null;
};

const FETCH_TIMEOUT_MS = 10_000;
const MAX_TEXT_CHARS = 100_000;
// Matches the jobDescription column's accepted length in the create action.
const MAX_DESCRIPTION_CHARS = 50_000;
// A real desktop UA — some sites return a stripped/blocked page to unknown agents.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export class JobImportError extends Error {}

/** Strip HTML to readable text: drop script/style, remove tags, decode common
 * entities, collapse whitespace, and cap length to bound work. */
export function stripHtml(html: string): string {
  const text = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\s*\n\s*\n\s*/g, "\n\n")
    .trim();
  return text.slice(0, MAX_TEXT_CHARS);
}

/** Reject schemes and hosts we should never have the server fetch (SSRF guard). */
function assertFetchableUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new JobImportError("That doesn't look like a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new JobImportError("Only http and https URLs are supported.");
  }
  const host = url.hostname.toLowerCase();
  const isPrivate =
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host);
  if (isPrivate) {
    throw new JobImportError("That host can't be reached.");
  }
  return url;
}

// ── small typed helpers for walking untyped JSON-LD ──────────────────────────

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t === "" ? null : t;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return null;
}

// ── JSON-LD JobPosting ───────────────────────────────────────────────────────

/** Flatten every object node in a JSON-LD payload, descending into `@graph`. */
function collectNodes(data: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const visit = (v: unknown) => {
    if (Array.isArray(v)) {
      v.forEach(visit);
      return;
    }
    const obj = asRecord(v);
    if (!obj) return;
    out.push(obj);
    if (Array.isArray(obj["@graph"])) obj["@graph"].forEach(visit);
  };
  visit(data);
  return out;
}

function isJobPosting(node: Record<string, unknown>): boolean {
  const t = node["@type"];
  if (typeof t === "string") return t === "JobPosting";
  if (Array.isArray(t)) return t.includes("JobPosting");
  return false;
}

function findJobPosting(root: HTMLElement): Record<string, unknown> | null {
  const scripts = root.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    let data: unknown;
    try {
      data = JSON.parse(script.text);
    } catch {
      continue; // malformed block — skip it
    }
    const jp = collectNodes(data).find(isJobPosting);
    if (jp) return jp;
  }
  return null;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  CAD: "$",
  AUD: "$",
  GBP: "£",
  EUR: "€",
};

const UNIT_LABELS: Record<string, string> = {
  YEAR: "yr",
  HOUR: "hr",
  MONTH: "mo",
  WEEK: "wk",
  DAY: "day",
};

/** Format a schema.org MonetaryAmount (baseSalary) into a display string. */
function formatSalary(v: unknown): string | null {
  const m = asRecord(v);
  if (!m) return null;
  const currency = str(m["currency"]) ?? str(m["currencyCode"]) ?? "";
  const sym =
    CURRENCY_SYMBOLS[currency.toUpperCase()] ??
    (currency ? `${currency} ` : "");
  const value = asRecord(m["value"]);
  const min = value ? num(value["minValue"]) : null;
  const max = value ? num(value["maxValue"]) : null;
  const single = value ? num(value["value"]) : num(m["value"]);
  const fmt = (n: number) => `${sym}${n.toLocaleString("en-US")}`;

  let amount: string | null = null;
  if (min !== null && max !== null) amount = `${fmt(min)}–${fmt(max)}`;
  else if (min !== null) amount = fmt(min);
  else if (max !== null) amount = fmt(max);
  else if (single !== null) amount = fmt(single);
  if (amount === null) return null;

  const unit = str(value?.["unitText"])?.toUpperCase();
  const label = unit ? UNIT_LABELS[unit] : undefined;
  return label ? `${amount}/${label}` : amount;
}

function companyFromJsonLd(node: Record<string, unknown>): string | null {
  const ho = node["hiringOrganization"];
  if (typeof ho === "string") return str(ho);
  return str(asRecord(ho)?.["name"]);
}

function workModeFromJsonLd(node: Record<string, unknown>): WorkMode | null {
  const loc = node["jobLocationType"];
  const types = Array.isArray(loc) ? loc.map(String) : [String(loc ?? "")];
  if (types.some((t) => t.toUpperCase().includes("TELECOMMUTE")))
    return "remote";
  return null;
}

// ── HTML fallbacks ───────────────────────────────────────────────────────────

function metaContent(root: HTMLElement, keys: string[]): string | null {
  for (const key of keys) {
    const el =
      root.querySelector(`meta[property="${key}"]`) ??
      root.querySelector(`meta[name="${key}"]`);
    const content = str(el?.getAttribute("content"));
    if (content) return content;
  }
  return null;
}

function firstH1(root: HTMLElement): string | null {
  return str(root.querySelector("h1")?.text);
}

/** Page <title>, minus a trailing " | Company" / " - Company" suffix. */
function cleanTitle(root: HTMLElement): string | null {
  const title = str(root.querySelector("title")?.text);
  if (!title) return null;
  const [first] = title.split(/\s+[|–—-]\s+/);
  return str(first) ?? title;
}

const SALARY_RE =
  /[$£€]\s?\d[\d,.]*\s?[kK]?(?:\s?[–\-—]\s?[$£€]?\s?\d[\d,.]*\s?[kK]?)?(?:\s?(?:per\s+(?:year|annum|hour|month)|\/\s?(?:yr|hr|mo|year|hour|month)|a\s+year|annually|per\s+annum))?/;

function matchSalary(text: string): string | null {
  const m = text.match(SALARY_RE);
  return m ? m[0].replace(/\s+/g, " ").trim() : null;
}

function workModeFromText(text: string): WorkMode | null {
  const lower = text.toLowerCase();
  if (/\bhybrid\b/.test(lower)) return "hybrid";
  if (/\bremote\b|work from home|\bwfh\b|telecommute/.test(lower))
    return "remote";
  if (/on-?site|in[-\s]?office|on premises/.test(lower)) return "in_office";
  return null;
}

// ── public entry point ───────────────────────────────────────────────────────

/** Fetch a job posting URL and extract the fields we prefill the form with.
 * Throws JobImportError with a user-facing message on any failure. */
export async function extractJobFromUrl(rawUrl: string): Promise<ExtractedJob> {
  const url = assertFetchableUrl(rawUrl);

  let html: string;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new JobImportError(
        `Couldn't load the page (HTTP ${res.status}). It may require a login.`,
      );
    }
    html = await res.text();
  } catch (err) {
    if (err instanceof JobImportError) throw err;
    throw new JobImportError("Couldn't reach that URL.");
  }

  const root = parse(html);
  const jp = findJobPosting(root);
  const bodyText = stripHtml(html);

  if (!jp && bodyText.length < 50) {
    throw new JobImportError(
      "The page had no readable text — it may be login-gated or JS-only.",
    );
  }

  // Prefer JSON-LD; fall back to OpenGraph/meta/headings + regex.
  let role = jp ? str(jp["title"]) : null;
  let company = jp ? companyFromJsonLd(jp) : null;
  let descriptionRaw = jp ? str(jp["description"]) : null;
  let salary = jp ? formatSalary(jp["baseSalary"]) : null;
  let mode = jp ? workModeFromJsonLd(jp) : null;

  if (!role)
    role = metaContent(root, ["og:title"]) ?? firstH1(root) ?? cleanTitle(root);
  if (!company) company = metaContent(root, ["og:site_name"]);
  if (!descriptionRaw) {
    descriptionRaw = metaContent(root, ["og:description", "description"]);
  }
  if (!salary) salary = matchSalary(bodyText);
  if (!mode) {
    mode = workModeFromText(
      `${role ?? ""} ${descriptionRaw ?? ""} ${bodyText}`,
    );
  }

  const companyName = str(company) ?? "";
  const roleName = str(role) ?? "";
  if (companyName === "" && roleName === "") {
    throw new JobImportError("Couldn't find a company or role on that page.");
  }

  const description = descriptionRaw
    ? stripHtml(descriptionRaw).slice(0, MAX_DESCRIPTION_CHARS)
    : null;

  return {
    companyName,
    role: roleName,
    jobDescription: description === "" ? null : description,
    salary,
    workMode: mode,
  };
}
