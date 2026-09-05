"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import styles from "./smart-lead-import.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type TargetKey =
  | ""
  | "parent_full_name"
  | "parent_first_name"
  | "parent_last_name"
  | "child_name"
  | "grade"
  | "email"
  | "phone_country_name"
  | "phone_country_code"
  | "phone_number"
  | "lead_source"
  | "partner_name"
  | "course_interested"
  | "assigned_to"
  | "next_action"
  | "lead_stage"
  | "next_follow_up_date"
  | "notes";

type ParsedSheet = {
  fileName: string;
  sheetName: string;
  sheetCount: number;
  headerRowNumber: number;
  headers: string[];
  rows: string[][];
};

type PreviewLead = {
  sourceRow: number;
  valid: boolean;
  missing: string[];
  payload: {
    parent_first_name: string;
    parent_last_name: string | null;
    child_name: string;
    grade: string | null;
    email: string | null;
    phone_country_name: string;
    phone_country_code: string;
    phone_number: string | null;
    lead_source: string | null;
    partner_name: string | null;
    course_interested: string | null;
    assigned_to: string | null;
    next_action: string;
    lead_stage: string;
    next_follow_up_date: string | null;
    notes: string | null;
    created_by: string | null;
    updated_by: string | null;
  };
};

type Props = {
  userId: string;
  onImported: (count: number, skipped: number) => Promise<void> | void;
};

const TARGET_OPTIONS: { value: TargetKey; label: string }[] = [
  { value: "", label: "Ignore / Keep in notes" },
  { value: "parent_full_name", label: "Parent Full Name" },
  { value: "parent_first_name", label: "Parent First Name" },
  { value: "parent_last_name", label: "Parent Last Name" },
  { value: "child_name", label: "Child / Student Name" },
  { value: "grade", label: "Grade" },
  { value: "email", label: "Email" },
  { value: "phone_country_name", label: "Country" },
  { value: "phone_country_code", label: "Country Code" },
  { value: "phone_number", label: "Phone / Mobile" },
  { value: "lead_source", label: "Lead Source" },
  { value: "partner_name", label: "Partner Name" },
  { value: "course_interested", label: "Course Interested" },
  { value: "assigned_to", label: "Assigned To" },
  { value: "next_action", label: "Next Action" },
  { value: "lead_stage", label: "Lead Stage" },
  { value: "next_follow_up_date", label: "Next Follow-up Date" },
  { value: "notes", label: "Notes" },
];

const ALIASES: Record<Exclude<TargetKey, "">, string[]> = {
  parent_full_name: [
    "parent name","parents name","guardian name","guardians name",
    "contact person","contact name","mother name","father name","parent","guardian"
  ],
  parent_first_name: [
    "parent first name","parent firstname","guardian first name",
    "contact first name","first name parent"
  ],
  parent_last_name: [
    "parent last name","parent lastname","guardian last name",
    "contact last name","surname","family name","last name parent"
  ],
  child_name: [
    "child name","childs name","student name","students name",
    "learner name","kid name","kids name","child","student","learner"
  ],
  grade: [
    "grade","class","school grade","student grade","current grade",
    "year group","school year","year"
  ],
  email: [
    "email","email address","parent email","guardian email",
    "contact email","mail","e mail"
  ],
  phone_country_name: ["country","country name","phone country","location country"],
  phone_country_code: ["country code","phone country code","dial code","dialing code","isd code"],
  phone_number: [
    "phone","phone number","mobile","mobile number","contact number",
    "whatsapp","whatsapp number","telephone","tel"
  ],
  lead_source: [
    "lead source","source","source name","campaign source",
    "channel","lead channel","marketing source"
  ],
  partner_name: ["partner","partner name","referrer","referred by","reference by"],
  course_interested: [
    "course","course interested","interested course","course interest",
    "program","programme","program interested","product","class interested"
  ],
  assigned_to: [
    "assigned to","owner","owner name","lead owner","counsellor",
    "counselor","sales person","sales owner"
  ],
  next_action: ["next action","action","follow up action","followup action","next step"],
  lead_stage: ["lead stage","stage","status","lead status","pipeline stage"],
  next_follow_up_date: [
    "next follow up date","follow up date","followup date",
    "next contact date","callback date"
  ],
  notes: ["notes","note","remarks","comments","comment","description","additional info"],
};

const COUNTRIES = [
  { name: "United States", code: "+1", aliases: ["us","usa","united states","america"] },
  { name: "Canada", code: "+1", aliases: ["canada","ca"] },
  { name: "United Kingdom", code: "+44", aliases: ["uk","united kingdom","britain","great britain","england"] },
  { name: "India", code: "+91", aliases: ["india","in"] },
  { name: "UAE", code: "+971", aliases: ["uae","united arab emirates","dubai","abu dhabi"] },
  { name: "Saudi Arabia", code: "+966", aliases: ["saudi","saudi arabia","ksa"] },
  { name: "Qatar", code: "+974", aliases: ["qatar"] },
  { name: "Kuwait", code: "+965", aliases: ["kuwait"] },
  { name: "Bahrain", code: "+973", aliases: ["bahrain"] },
  { name: "Oman", code: "+968", aliases: ["oman"] },
  { name: "Singapore", code: "+65", aliases: ["singapore"] },
  { name: "Malaysia", code: "+60", aliases: ["malaysia"] },
  { name: "Thailand", code: "+66", aliases: ["thailand"] },
  { name: "Indonesia", code: "+62", aliases: ["indonesia"] },
  { name: "Philippines", code: "+63", aliases: ["philippines","philippine"] },
  { name: "Hong Kong", code: "+852", aliases: ["hong kong","hk"] },
];

const KNOWN_COURSES = [
  ...["Elementary","Middle School","High School"].flatMap((group) =>
    ["01","02","03"].map((level) => `AiEdge ${group} - Level ${level}`)
  ),
  ...["Elementary","Middle School","High School"].flatMap((group) =>
    ["01","02","03"].map((level) => `Coding4AI ${group} - Level ${level}`)
  ),
  ...Array.from({ length: 10 }, (_, i) =>
    `Math - Grade ${String(i + 1).padStart(2, "0")}`
  ),
  "AP Pre-Calculus","AP Calculus AB","AP Calculus BC","AP Statistics",
  "SAT and PSAT","Algebra 1","Geometry","Algebra 2",
];

function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function normal(value: string) {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function compact(value: string) {
  return normal(value).replace(/\s+/g, "");
}

function aliasScore(header: string, alias: string) {
  const h = normal(header);
  const a = normal(alias);
  if (!h || !a) return 0;
  if (h === a) return 100;
  if (compact(h) === compact(a)) return 98;
  if (h.startsWith(`${a} `) || h.endsWith(` ${a}`)) return 88;
  if (h.includes(a) && a.length >= 5) return 78;
  return 0;
}

function fieldFromHeader(header: string): TargetKey {
  let best: TargetKey = "";
  let score = 0;

  (Object.keys(ALIASES) as Exclude<TargetKey, "">[]).forEach((field) => {
    ALIASES[field].forEach((alias) => {
      const current = aliasScore(header, alias);
      if (current > score) {
        score = current;
        best = field;
      }
    });
  });

  return score >= 75 ? best : "";
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function looksLikePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 16;
}

function looksLikeGrade(value: string) {
  return /\b(?:grade|class|year)?\s*(?:0?[1-9]|1[0-2])(?:st|nd|rd|th)?\b/i.test(value);
}

function inferFieldFromValues(values: string[]): TargetKey {
  const sample = values.filter(Boolean).slice(0, 12);
  if (!sample.length) return "";

  const ratio = (fn: (value: string) => boolean) => sample.filter(fn).length / sample.length;

  if (ratio(looksLikeEmail) >= 0.7) return "email";
  if (ratio(looksLikePhone) >= 0.75) return "phone_number";
  if (ratio(looksLikeGrade) >= 0.8) return "grade";

  const combined = normal(sample.join(" "));
  if (
    combined.includes("aiedge") ||
    combined.includes("ai edge") ||
    combined.includes("coding4ai") ||
    combined.includes("coding 4 ai") ||
    combined.includes("algebra") ||
    combined.includes("calculus") ||
    combined.includes("statistics") ||
    combined.includes("geometry") ||
    combined.includes("sat")
  ) {
    return "course_interested";
  }

  return "";
}

function autoMapping(headers: string[], rows: string[][]) {
  const mapping: Record<number, TargetKey> = {};

  headers.forEach((header, index) => {
    const byHeader = fieldFromHeader(header);
    const values = rows.map((row) => text(row[index]));
    mapping[index] = byHeader || inferFieldFromValues(values);
  });

  headers.forEach((header, index) => {
    if (mapping[index]) return;
    const h = normal(header);
    if (!["name","full name","contact"].includes(h)) return;

    const hasChild = Object.values(mapping).includes("child_name");
    const hasParent =
      Object.values(mapping).includes("parent_full_name") ||
      Object.values(mapping).includes("parent_first_name");

    if (hasChild && !hasParent) mapping[index] = "parent_full_name";
    else if (hasParent && !hasChild) mapping[index] = "child_name";
  });

  return mapping;
}

function headerRowScore(row: string[]) {
  const values = row.map(text).filter(Boolean);
  if (!values.length) return -1;
  const recognized = values.filter((value) => fieldFromHeader(value)).length;
  const mostlyText = values.filter((value) => /[a-z]/i.test(value)).length;
  const unique = new Set(values.map(normal)).size;
  return recognized * 20 + mostlyText * 2 + unique;
}

function findHeaderRow(rows: string[][]) {
  let bestIndex = -1;
  let bestScore = -1;

  rows.slice(0, 20).forEach((row, index) => {
    const score = headerRowScore(row);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex >= 0 ? bestIndex : rows.findIndex((row) => row.some((cell) => text(cell)));
}

function normalizeHeaders(row: string[], allRows: string[][]) {
  const maxColumns = Math.max(row.length, ...allRows.map((current) => current.length));
  return Array.from({ length: maxColumns }, (_, index) => text(row[index]) || `Column ${index + 1}`);
}

function splitName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] || "", last: parts.slice(1).join(" ") };
}

function normalizeGrade(value: string) {
  const raw = value.trim();
  if (!raw) return null;
  const match = raw.match(/\b(?:grade|class|year)?\s*(\d{1,2})\b/i);
  if (match) {
    const number = Number(match[1]);
    if (number >= 1 && number <= 10) return `Grade ${String(number).padStart(2, "0")}`;
  }
  return raw;
}

function normalizeCountry(value: string) {
  const n = normal(value);
  if (!n) return null;
  return COUNTRIES.find((country) => country.aliases.some((alias) => normal(alias) === n)) || null;
}

function countryFromCode(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  return [...COUNTRIES]
    .sort((a, b) => b.code.length - a.code.length)
    .find((country) => digits === country.code.replace(/\D/g, "")) || null;
}

function parsePhone(rawPhone: string, rawCountry: string, rawCode: string) {
  let country = normalizeCountry(rawCountry) || countryFromCode(rawCode);
  let code = rawCode.trim();
  let number = rawPhone.trim();

  if (number.startsWith("+")) {
    const digits = number.replace(/\D/g, "");
    const detected = [...COUNTRIES]
      .sort((a, b) => b.code.replace(/\D/g, "").length - a.code.replace(/\D/g, "").length)
      .find((item) => digits.startsWith(item.code.replace(/\D/g, "")));

    if (detected) {
      country = country || detected;
      code = detected.code;
      number = digits.slice(detected.code.replace(/\D/g, "").length);
    }
  }

  if (!country) country = COUNTRIES.find((item) => item.code === code) || COUNTRIES[0];
  if (!code) code = country.code;

  number = number.replace(/\D/g, "");
  const codeDigits = code.replace(/\D/g, "");

  if (rawPhone.trim().startsWith("+") && number.startsWith(codeDigits)) {
    number = number.slice(codeDigits.length);
  }

  return {
    countryName: country.name,
    countryCode: code.startsWith("+") ? code : `+${code.replace(/\D/g, "")}`,
    number: number || null,
  };
}

function normalizeLeadSource(value: string) {
  const n = normal(value);
  if (!n) return null;
  if (n.includes("facebook") || n.includes("instagram") || n.includes("meta")) return "Meta Ads";
  if (n.includes("partner")) return "Partners";
  if (n.includes("demo")) return "Demo";
  if (n.includes("internal") || n.includes("employee referral") || n.includes("reference")) return "Internal Reference";
  if (n.includes("marketing") || n.includes("website") || n.includes("web") || n.includes("organic") || n.includes("google")) return "Marketing";
  return value.trim();
}

function normalizeOwner(value: string) {
  const n = normal(value);
  if (!n) return null;
  if (n.includes("madhu") || n.includes("madhurima")) return "Madhu";
  if (n.includes("armaity")) return "Armaity";
  if (n.includes("karuna")) return "Karuna";
  return value.trim();
}

function normalizeNextAction(value: string) {
  const n = normal(value);
  if (!n) return "Need to Call";
  if (n.includes("await") || n.includes("response")) return "Awaiting response";
  if (n.includes("email")) return "Email sent";
  if (n.includes("called") || n === "call done") return "Called";
  return "Need to Call";
}

function normalizeStage(value: string) {
  const n = normal(value);
  if (!n) return "Fresh Lead";
  if (n.includes("lost") || n.includes("not interested")) return "Lost";
  if (n.includes("enrol") || n.includes("convert")) return "Enrolled";
  if (n.includes("interested")) return "Interested";
  if (n.includes("demo completed") || n.includes("demo done")) return "Demo Completed";
  if (n.includes("demo") && (n.includes("schedule") || n.includes("book"))) return "Demo Scheduled";
  if (n.includes("contact")) return "Contacted";
  return "Fresh Lead";
}

function normalizeCourse(value: string) {
  const raw = value.trim();
  if (!raw) return null;
  const n = normal(raw);

  const exact = KNOWN_COURSES.find((course) => compact(course) === compact(raw));
  if (exact) return exact;

  const aiEdge = /(?:aiedge|ai\s*edge)/i.test(raw);
  const coding = /(?:coding\s*4\s*ai|coding\s*for\s*ai|coding4ai)/i.test(raw);

  if (aiEdge || coding) {
    let group = "";
    if (/(elementary|primary|junior)/i.test(raw)) group = "Elementary";
    else if (/(middle|ms\b)/i.test(raw)) group = "Middle School";
    else if (/(high|hs\b|secondary)/i.test(raw)) group = "High School";

    const levelMatch = raw.match(/level\s*0?([123])/i) || raw.match(/\bl\s*0?([123])\b/i);
    if (group && levelMatch) {
      return `${aiEdge ? "AiEdge" : "Coding4AI"} ${group} - Level 0${levelMatch[1]}`;
    }
  }

  if (n.includes("ap") && n.includes("pre") && n.includes("calc")) return "AP Pre-Calculus";
  if (n.includes("calculus") && n.includes("ab")) return "AP Calculus AB";
  if (n.includes("calculus") && n.includes("bc")) return "AP Calculus BC";
  if (n.includes("ap") && n.includes("statistics")) return "AP Statistics";
  if (n.includes("sat") || n.includes("psat")) return "SAT and PSAT";
  if (n.includes("algebra") && /\b1\b/.test(n)) return "Algebra 1";
  if (n.includes("algebra") && /\b2\b/.test(n)) return "Algebra 2";
  if (n.includes("geometry")) return "Geometry";

  const grade = normalizeGrade(raw);
  if (n.includes("math") && grade?.startsWith("Grade ")) return `Math - ${grade}`;

  return raw;
}

function normalizeDate(value: string) {
  const raw = value.trim();
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) {
    return `${iso[1]}-${String(Number(iso[2])).padStart(2, "0")}-${String(Number(iso[3])).padStart(2, "0")}`;
  }

  const dayFirst = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dayFirst) {
    const day = Number(dayFirst[1]);
    const month = Number(dayFirst[2]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${dayFirst[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  return null;
}


function sheetNamePenalty(name: string) {
  const n = normal(name);

  if (
    n.includes("instruction") ||
    n.includes("read me") ||
    n.includes("readme") ||
    n.includes("test case") ||
    n.includes("sample note")
  ) {
    return -120;
  }

  if (
    n.includes("payment") ||
    n.includes("batch assignment") ||
    n === "batches" ||
    n === "enrollments"
  ) {
    return -35;
  }

  return 0;
}

function makeParsedSheet(
  fileName: string,
  sheetName: string,
  rows: string[][],
  sheetCount: number
): ParsedSheet | null {
  const nonEmptyRows = rows.filter((row) => row.some((cell) => text(cell)));
  if (!nonEmptyRows.length) return null;

  const headerIndex = findHeaderRow(rows);
  if (headerIndex < 0) return null;

  const dataRows = rows
    .slice(headerIndex + 1)
    .filter((row) => row.some((cell) => text(cell)));

  if (!dataRows.length) return null;

  const headers = normalizeHeaders(rows[headerIndex], dataRows);

  return {
    fileName,
    sheetName,
    sheetCount,
    headerRowNumber: headerIndex + 1,
    headers,
    rows: dataRows,
  };
}

function scoreSheet(sheet: ParsedSheet) {
  const mapping = autoMapping(sheet.headers, sheet.rows);
  const mapped = Object.values(mapping).filter(Boolean);
  const unique = new Set(mapped);

  const hasParent =
    unique.has("parent_full_name") ||
    unique.has("parent_first_name");

  const hasChild = unique.has("child_name");
  const hasEmail = unique.has("email");
  const hasPhone = unique.has("phone_number");
  const hasGrade = unique.has("grade");
  const hasCourse = unique.has("course_interested");

  let score = unique.size * 12;
  if (hasParent) score += 55;
  if (hasChild) score += 55;
  if (hasParent && hasChild) score += 75;
  if (hasEmail) score += 22;
  if (hasPhone) score += 22;
  if (hasGrade) score += 12;
  if (hasCourse) score += 12;

  score += Math.min(sheet.rows.length, 100) * 0.45;
  score += sheetNamePenalty(sheet.sheetName);

  return score;
}

function analyzeWorkbook(fileName: string, workbook: XLSX.WorkBook) {
  const parsed = workbook.SheetNames
    .map((name) => {
      const rows = XLSX.utils
        .sheet_to_json<unknown[]>(workbook.Sheets[name], {
          header: 1,
          defval: "",
          raw: false,
          blankrows: false,
        })
        .map((row) => (Array.isArray(row) ? row.map(text) : []));

      return makeParsedSheet(fileName, name, rows, workbook.SheetNames.length);
    })
    .filter((sheet): sheet is ParsedSheet => Boolean(sheet))
    .sort((a, b) => scoreSheet(b) - scoreSheet(a));

  if (!parsed.length) {
    throw new Error("Orbit could not find a usable data sheet in this workbook.");
  }

  return parsed;
}

export default function SmartLeadImport({ userId, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<Record<number, TargetKey>>({});
  const [message, setMessage] = useState("");
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setReading(true);
    setMessage("");
    setProgress("");
    setAdvancedOpen(false);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (!["xlsx", "xls", "csv"].includes(extension || "")) {
        throw new Error("Choose an Excel (.xlsx/.xls) or CSV file.");
      }

      let workbook: XLSX.WorkBook;

      if (extension === "csv") {
        workbook = XLSX.read(await file.text(), { type: "string" });
      } else {
        workbook = XLSX.read(await file.arrayBuffer(), {
          type: "array",
          cellDates: true,
        });
      }

      const rankedSheets = analyzeWorkbook(file.name, workbook);
      const selected = rankedSheets[0];
      const auto = autoMapping(selected.headers, selected.rows);

      setSheets(rankedSheets);
      setSheet(selected);
      setMapping(auto);

      setMessage(
        `Orbit selected "${selected.sheetName}" and found ${selected.rows.length} record(s).`
      );
    } catch (error) {
      setSheets([]);
      setSheet(null);
      setMapping({});
      setMessage(
        error instanceof Error
          ? error.message
          : "Orbit could not read this file."
      );
    } finally {
      setReading(false);
      event.target.value = "";
    }
  }

  function selectSheet(sheetName: string) {
    const selected = sheets.find((item) => item.sheetName === sheetName);
    if (!selected) return;

    setSheet(selected);
    setMapping(autoMapping(selected.headers, selected.rows));
    setAdvancedOpen(false);
    setMessage(
      `Using "${selected.sheetName}" — ${selected.rows.length} record(s) detected.`
    );
  }

  function valuesForTarget(row: string[], target: TargetKey) {
    if (!target) return [];

    return Object.entries(mapping)
      .filter(([, mapped]) => mapped === target)
      .map(([index]) => text(row[Number(index)]))
      .filter(Boolean);
  }

  function buildLead(row: string[], rowIndex: number): PreviewLead {
    const get = (target: TargetKey) =>
      valuesForTarget(row, target)[0] || "";

    const fullParent = get("parent_full_name");
    const split = splitName(fullParent);

    const parentFirst = get("parent_first_name") || split.first;
    const parentLast = get("parent_last_name") || split.last;
    const child = get("child_name");

    const phone = parsePhone(
      get("phone_number"),
      get("phone_country_name"),
      get("phone_country_code")
    );

    const mappedIndexes = new Set(
      Object.entries(mapping)
        .filter(([, target]) => Boolean(target))
        .map(([index]) => Number(index))
    );

    const extras = sheet
      ? sheet.headers
          .map((header, index) => ({
            header,
            value: text(row[index]),
            mapped: mappedIndexes.has(index),
          }))
          .filter((item) => item.value && !item.mapped)
          .map((item) => `${item.header}: ${item.value}`)
      : [];

    const directNotes = get("notes");
    const combinedNotes = [directNotes, ...extras]
      .filter(Boolean)
      .join(" | ");

    const missing: string[] = [];
    if (!parentFirst) missing.push("Parent Name");
    if (!child) missing.push("Child / Student Name");

    const source = normalizeLeadSource(get("lead_source"));

    return {
      sourceRow: (sheet?.headerRowNumber || 1) + rowIndex + 1,
      valid: missing.length === 0,
      missing,
      payload: {
        parent_first_name: parentFirst,
        parent_last_name: parentLast || null,
        child_name: child,
        grade: normalizeGrade(get("grade")),
        email: get("email").toLowerCase() || null,
        phone_country_name: phone.countryName,
        phone_country_code: phone.countryCode,
        phone_number: phone.number,
        lead_source: source,
        partner_name:
          source === "Partners" ? get("partner_name") || null : null,
        course_interested: normalizeCourse(get("course_interested")),
        assigned_to: normalizeOwner(get("assigned_to")),
        next_action: normalizeNextAction(get("next_action")),
        lead_stage: normalizeStage(get("lead_stage")),
        next_follow_up_date: normalizeDate(get("next_follow_up_date")),
        notes: combinedNotes || null,
        created_by: userId || null,
        updated_by: userId || null,
      },
    };
  }

  const preview = useMemo(() => {
    if (!sheet) return [];
    return sheet.rows.map((row, index) => buildLead(row, index));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, mapping, userId]);

  const validRows = preview.filter((row) => row.valid);
  const invalidRows = preview.filter((row) => !row.valid);

  const mappedFields = Object.values(mapping).filter(Boolean).length;

  const hasParentMapping =
    Object.values(mapping).includes("parent_full_name") ||
    Object.values(mapping).includes("parent_first_name");

  const hasChildMapping = Object.values(mapping).includes("child_name");

  function setRequiredField(target: TargetKey, sourceIndex: string) {
    const next = { ...mapping };

    Object.keys(next).forEach((key) => {
      if (next[Number(key)] === target) {
        next[Number(key)] = "";
      }
    });

    if (sourceIndex !== "") {
      next[Number(sourceIndex)] = target;
    }

    setMapping(next);
  }

  async function importRows() {
    if (!validRows.length) {
      setMessage(
        "No rows are ready yet. Choose the Parent Name and Child / Student Name columns."
      );
      return;
    }

    setImporting(true);
    setMessage("");
    setProgress("");

    try {
      const payload = validRows.map((row) => row.payload);
      const chunkSize = 200;
      let imported = 0;

      for (let index = 0; index < payload.length; index += chunkSize) {
        const chunk = payload.slice(index, index + chunkSize);

        const { error } = await supabase.from("leads").insert(chunk);
        if (error) throw error;

        imported += chunk.length;
        setProgress(`Imported ${imported} of ${payload.length}...`);
      }

      setProgress("");

      await onImported(imported, invalidRows.length);
    } catch (error) {
      setProgress("");
      setMessage(
        error instanceof Error
          ? error.message
          : "Orbit could not import the leads."
      );
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setSheets([]);
    setSheet(null);
    setMapping({});
    setMessage("");
    setProgress("");
    setAdvancedOpen(false);
  }

  if (!sheet) {
    return (
      <div className={styles.wrap}>
        <div className={styles.start}>
          <div>
            <h3>Upload Excel or CSV</h3>
            <p>
              Upload the file as you received it. Orbit will choose the most
              likely data sheet, detect the header row and prepare the CRM
              fields automatically.
            </p>
          </div>

          <button
            type="button"
            className={styles.choose}
            onClick={() => inputRef.current?.click()}
            disabled={reading}
          >
            {reading ? "Reading File..." : "Choose Excel / CSV File"}
          </button>

          <input
            ref={inputRef}
            type="file"
            hidden
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            onChange={readFile}
          />

          <div className={styles.support}>
            <strong>No template required.</strong> .xlsx, .xls and .csv are
            supported.
          </div>
        </div>

        {message && <div className={styles.message}>{message}</div>}
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.fileBar}>
        <div>
          <strong>{sheet.fileName}</strong>
          <span>
            Using sheet: <b>{sheet.sheetName}</b> · Header row{" "}
            {sheet.headerRowNumber}
          </span>
        </div>

        <div className={styles.fileActions}>
          {sheets.length > 1 && (
            <label>
              <span>Change sheet</span>
              <select
                value={sheet.sheetName}
                onChange={(event) => selectSheet(event.target.value)}
              >
                {sheets.map((item) => (
                  <option key={item.sheetName} value={item.sheetName}>
                    {item.sheetName}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button type="button" onClick={reset}>
            Choose Another File
          </button>
        </div>
      </div>

      <section className={styles.summary}>
        <div>
          <span>Records Detected</span>
          <strong>{preview.length}</strong>
        </div>
        <div>
          <span>Ready to Import</span>
          <strong>{validRows.length}</strong>
        </div>
        <div>
          <span>Need Attention</span>
          <strong>{invalidRows.length}</strong>
        </div>
      </section>

      {message && <div className={styles.message}>{message}</div>}

      {(!hasParentMapping || !hasChildMapping) && (
        <section className={styles.attentionCard}>
          <div>
            <h3>One quick check</h3>
            <p>
              Orbit needs these two fields before it can safely create CRM
              leads.
            </p>
          </div>

          <div className={styles.requiredFields}>
            {!hasParentMapping && (
              <label>
                <span>Which column contains Parent Name?</span>
                <select
                  defaultValue=""
                  onChange={(event) =>
                    setRequiredField(
                      "parent_full_name",
                      event.target.value
                    )
                  }
                >
                  <option value="">Choose column</option>
                  {sheet.headers.map((header, index) => (
                    <option key={`${header}-${index}`} value={index}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {!hasChildMapping && (
              <label>
                <span>Which column contains Child / Student Name?</span>
                <select
                  defaultValue=""
                  onChange={(event) =>
                    setRequiredField("child_name", event.target.value)
                  }
                >
                  <option value="">Choose column</option>
                  {sheet.headers.map((header, index) => (
                    <option key={`${header}-${index}`} value={index}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </section>
      )}

      <section className={styles.previewCard}>
        <div className={styles.sectionHead}>
          <div>
            <h3>Import Preview</h3>
            <p>
              Check a few records below. Orbit will process all{" "}
              {preview.length} rows.
            </p>
          </div>

          <span
            className={
              invalidRows.length === 0 ? styles.ready : styles.needs
            }
          >
            {invalidRows.length === 0
              ? "Ready to Import"
              : `${invalidRows.length} Need Attention`}
          </span>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Parent</th>
                <th>Child</th>
                <th>Grade</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Course</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {preview.slice(0, 6).map((row) => (
                <tr key={row.sourceRow}>
                  <td>
                    {row.payload.parent_first_name}{" "}
                    {row.payload.parent_last_name || ""}
                  </td>
                  <td>{row.payload.child_name || "—"}</td>
                  <td>{row.payload.grade || "—"}</td>
                  <td>
                    {row.payload.phone_number
                      ? `${row.payload.phone_country_code} ${row.payload.phone_number}`
                      : "—"}
                  </td>
                  <td>{row.payload.email || "—"}</td>
                  <td>{row.payload.course_interested || "—"}</td>
                  <td>
                    <span
                      className={
                        row.valid ? styles.ready : styles.needs
                      }
                    >
                      {row.valid
                        ? "Ready"
                        : `Missing ${row.missing.join(", ")}`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {preview.length > 6 && (
          <p className={styles.previewNote}>
            Showing 6 of {preview.length} records.
          </p>
        )}
      </section>

      <button
        type="button"
        className={styles.advancedToggle}
        onClick={() => setAdvancedOpen((value) => !value)}
      >
        {advancedOpen ? "Hide detected fields" : "Review detected fields"}{" "}
        <span>{mappedFields} mapped</span>
      </button>

      {advancedOpen && (
        <section className={styles.mappingCard}>
          <div className={styles.sectionHead}>
            <div>
              <h3>Detected Fields</h3>
              <p>
                Optional. Change these only when Orbit has put a column in the
                wrong CRM field.
              </p>
            </div>
          </div>

          <div className={styles.mappingGrid}>
            {sheet.headers.map((header, index) => (
              <div
                className={styles.mappingRow}
                key={`${header}-${index}`}
              >
                <div>
                  <strong>{header}</strong>
                  <small>
                    {sheet.rows
                      .slice(0, 3)
                      .map((row) => text(row[index]))
                      .filter(Boolean)
                      .join(" · ") || "Empty column"}
                  </small>
                </div>

                <span>→</span>

                <select
                  value={mapping[index] || ""}
                  onChange={(event) =>
                    setMapping({
                      ...mapping,
                      [index]: event.target.value as TargetKey,
                    })
                  }
                >
                  {TARGET_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className={styles.footer}>
        <div>
          <strong>{validRows.length} lead(s) ready</strong>
          <span>
            Unrecognised extra columns are kept automatically in Notes.
            Existing duplicate detection will still flag duplicates after
            import.
          </span>
        </div>

        <button
          type="button"
          className={styles.importButton}
          onClick={importRows}
          disabled={importing || validRows.length === 0}
        >
          {importing
            ? progress || "Importing..."
            : invalidRows.length
            ? `Import ${validRows.length} Ready Leads`
            : `Import All ${validRows.length} Leads`}
        </button>
      </div>
    </div>
  );
}
