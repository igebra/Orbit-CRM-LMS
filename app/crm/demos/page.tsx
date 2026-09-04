"use client";

import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import styles from "./demos.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const GRADES = Array.from({ length: 10 }, (_, i) =>
  `Grade ${String(i + 1).padStart(2, "0")}`
);

const DEMO_COURSES = ["AiEdge", "Coding4AI", "Math"];

const TIMEZONES = [
  { value: "America/New_York", label: "US Eastern" },
  { value: "America/Chicago", label: "US Central" },
  { value: "America/Denver", label: "US Mountain" },
  { value: "America/Los_Angeles", label: "US Pacific" },
  { value: "Asia/Kolkata", label: "India IST" },
];

const SESSION_STATUS_OPTIONS = [
  "Scheduled",
  "Completed",
  "No Show",
  "Rescheduled",
  "Cancelled",
];

const ATTENDANCE_OPTIONS = ["Scheduled", "Attended", "No Show", "Cancelled"];

type LeadOption = {
  id: string;
  parent_first_name: string;
  parent_last_name: string | null;
  child_name: string;
  grade: string | null;
  email: string | null;
  phone_country_code: string | null;
  phone_number: string | null;
  course_interested: string | null;
  demo_attended: boolean;
  demo_attended_course: string | null;
};

type DemoAttendee = {
  id?: string;
  temp_id: string;
  lead_id: string | null;
  student_name: string;
  grade: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  source: "Manual" | "Lead" | "Excel Import";
  attendance_status: string;
  attendance_marked_at: string | null;
  import_metadata: Record<string, string>;
};

type DemoSession = {
  id: string;
  demo_course: string;
  scheduled_at: string;
  source_timezone: string;
  trainers: string[];
  team_members: string[];
  zoom_link: string | null;
  session_duration_minutes: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  attendees: DemoAttendee[];
};

type DemoForm = {
  demo_course: string;
  local_datetime: string;
  source_timezone: string;
  trainers: string[];
  team_members: string[];
  zoom_link: string;
  session_duration_minutes: string;
  status: string;
  notes: string;
  attendees: DemoAttendee[];
};

type ExcelRow = Record<string, unknown>;

type ExcelMapping = {
  studentName: string;
  grade: string;
  email: string;
  phone: string;
};

const EMPTY_FORM: DemoForm = {
  demo_course: "AiEdge",
  local_datetime: "",
  source_timezone: "America/New_York",
  trainers: [],
  team_members: [],
  zoom_link: "",
  session_duration_minutes: "60",
  status: "Scheduled",
  notes: "",
  attendees: [],
};

const EMPTY_MAPPING: ExcelMapping = {
  studentName: "",
  grade: "",
  email: "",
  phone: "",
};

function makeTempId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }

  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );

  return asUtc - date.getTime();
}

function localDateTimeToUtc(localDateTime: string, timeZone: string) {
  if (!localDateTime) return null;

  const [datePart, timePart] = localDateTime.split("T");
  if (!datePart || !timePart) return null;

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const firstOffset = getTimeZoneOffsetMs(guess, timeZone);
  let result = new Date(guess.getTime() - firstOffset);

  const correctedOffset = getTimeZoneOffsetMs(result, timeZone);
  if (correctedOffset !== firstOffset) {
    result = new Date(guess.getTime() - correctedOffset);
  }

  return result.toISOString();
}

function isoToLocalInput(iso: string, timeZone: string) {
  const date = new Date(iso);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }

  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
}

function formatInZone(iso: string | null, timeZone: string) {
  if (!iso) return "Select a date and time";

  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(new Date(iso));
}

function zoneLabel(value: string) {
  return TIMEZONES.find((zone) => zone.value === value)?.label || value;
}

function clean(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function courseFamily(course: string | null) {
  if (!course) return "AiEdge";
  const lower = course.toLowerCase();
  if (lower.includes("coding4ai")) return "Coding4AI";
  if (lower.includes("math")) return "Math";
  return "AiEdge";
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ");
}

function autoMapHeader(headers: string[], candidates: string[]) {
  const normalized = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header),
  }));

  for (const candidate of candidates) {
    const exact = normalized.find((item) => item.normalized === candidate);
    if (exact) return exact.original;
  }

  for (const candidate of candidates) {
    const partial = normalized.find((item) => item.normalized.includes(candidate));
    if (partial) return partial.original;
  }

  return "";
}

function cellToString(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function normalizeGrade(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const numberMatch = trimmed.match(/\d{1,2}/);
  if (!numberMatch) return null;

  const gradeNumber = Number(numberMatch[0]);
  if (gradeNumber < 1 || gradeNumber > 10) return null;

  return `Grade ${String(gradeNumber).padStart(2, "0")}`;
}

function metadataFromRow(row: ExcelRow) {
  const metadata: Record<string, string> = {};
  Object.entries(row).forEach(([key, value]) => {
    metadata[key] = cellToString(value);
  });
  return metadata;
}

function attendeeKey(attendee: DemoAttendee) {
  if (attendee.lead_id) return `lead:${attendee.lead_id}`;
  return [
    attendee.student_name.trim().toLowerCase(),
    attendee.contact_email?.trim().toLowerCase() || "",
    attendee.contact_phone?.replace(/\D/g, "") || "",
  ].join("|");
}

function normalizedPhone(value: string | null | undefined) {
  return (value || "").replace(/\D/g, "");
}

function MultiEntry({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  function addValue() {
    const value = draft.trim();
    if (!value) return;

    if (!values.some((item) => item.toLowerCase() === value.toLowerCase())) {
      onChange([...values, value]);
    }

    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addValue();
    }
  }

  return (
    <label className={styles.multiField}>
      <span>{label}</span>
      <div className={styles.chipEditor}>
        {values.length > 0 && (
          <div className={styles.chipList}>
            {values.map((value) => (
              <span className={styles.chip} key={value}>
                {value}
                <button
                  type="button"
                  onClick={() => onChange(values.filter((item) => item !== value))}
                  aria-label={`Remove ${value}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className={styles.chipInputRow}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
          />
          <button type="button" onClick={addValue}>
            Add
          </button>
        </div>
      </div>
    </label>
  );
}

export default function DemoSchedulePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [demos, setDemos] = useState<DemoSession[]>([]);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<DemoForm>(EMPTY_FORM);

  const [studentMode, setStudentMode] = useState<"leads" | "manual" | "excel">(
    "leads"
  );
  const [leadSearch, setLeadSearch] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  const [manualName, setManualName] = useState("");
  const [manualGrade, setManualGrade] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPhone, setManualPhone] = useState("");

  const [excelFileName, setExcelFileName] = useState("");
  const [excelRows, setExcelRows] = useState<ExcelRow[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelMapping, setExcelMapping] = useState<ExcelMapping>(EMPTY_MAPPING);
  const [excelError, setExcelError] = useState("");

  useEffect(() => {
    async function initialize() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace("/");
        return;
      }

      setEmail(data.user.email || "");
      setUserId(data.user.id);
      await Promise.all([loadDemos(), loadLeads()]);
    }

    initialize();
  }, [router]);

  async function loadDemos() {
    setLoading(true);
    setMessage("");

    const [sessionsResponse, attendeesResponse] = await Promise.all([
      supabase.from("demo_sessions").select("*").order("scheduled_at", {
        ascending: true,
      }),
      supabase.from("demo_attendees").select("*").order("created_at", {
        ascending: true,
      }),
    ]);

    if (sessionsResponse.error) {
      setMessage(sessionsResponse.error.message);
      setDemos([]);
      setLoading(false);
      return;
    }

    if (attendeesResponse.error) {
      setMessage(attendeesResponse.error.message);
      setDemos([]);
      setLoading(false);
      return;
    }

    const attendeesBySession = new Map<string, DemoAttendee[]>();

    for (const row of attendeesResponse.data || []) {
      const attendee: DemoAttendee = {
        id: row.id,
        temp_id: row.id,
        lead_id: row.lead_id,
        student_name: row.student_name,
        grade: row.grade,
        contact_email: row.contact_email,
        contact_phone: row.contact_phone,
        source: row.source,
        attendance_status: row.attendance_status,
        attendance_marked_at: row.attendance_marked_at,
        import_metadata: row.import_metadata || {},
      };

      const existing = attendeesBySession.get(row.demo_session_id) || [];
      existing.push(attendee);
      attendeesBySession.set(row.demo_session_id, existing);
    }

    const sessions: DemoSession[] = (sessionsResponse.data || []).map((row) => ({
      id: row.id,
      demo_course: row.demo_course,
      scheduled_at: row.scheduled_at,
      source_timezone: row.source_timezone,
      trainers: row.trainers || [],
      team_members: row.team_members || [],
      zoom_link: row.zoom_link,
      session_duration_minutes: row.session_duration_minutes,
      status: row.status,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      attendees: attendeesBySession.get(row.id) || [],
    }));

    setDemos(sessions);
    setLoading(false);
  }

  async function loadLeads() {
    const { data, error } = await supabase
      .from("leads")
      .select(
        "id,parent_first_name,parent_last_name,child_name,grade,email,phone_country_code,phone_number,course_interested,demo_attended,demo_attended_course"
      )
      .order("created_at", { ascending: false });

    if (!error) setLeads((data || []) as LeadOption[]);
  }

  const previewIso = useMemo(
    () => localDateTimeToUtc(form.local_datetime, form.source_timezone),
    [form.local_datetime, form.source_timezone]
  );

  const filteredLeads = useMemo(() => {
    const q = leadSearch.trim().toLowerCase();
    const alreadyAdded = new Set(
      form.attendees.filter((item) => item.lead_id).map((item) => item.lead_id)
    );

    return leads
      .filter((lead) => !alreadyAdded.has(lead.id))
      .filter((lead) => {
        if (!q) return true;
        return [
          lead.child_name,
          lead.parent_first_name,
          lead.parent_last_name,
          lead.email,
          lead.phone_number,
          lead.course_interested,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .slice(0, 50);
  }, [leads, leadSearch, form.attendees]);

  const filteredDemos = useMemo(() => {
    const q = search.trim().toLowerCase();

    return demos.filter((demo) => {
      if (statusFilter !== "All statuses" && demo.status !== statusFilter) {
        return false;
      }

      if (!q) return true;

      return [
        demo.demo_course,
        demo.trainers.join(" "),
        demo.team_members.join(" "),
        demo.status,
        demo.zoom_link,
        demo.attendees.map((item) => item.student_name).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [demos, search, statusFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    return {
      total: demos.length,
      today: demos.filter((demo) => {
        const key = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(demo.scheduled_at));
        return key === todayKey && demo.status === "Scheduled";
      }).length,
      upcoming: demos.filter(
        (demo) =>
          new Date(demo.scheduled_at).getTime() > now.getTime() &&
          demo.status === "Scheduled"
      ).length,
      students: demos.reduce((sum, demo) => sum + demo.attendees.length, 0),
      attended: demos.reduce(
        (sum, demo) =>
          sum +
          demo.attendees.filter((item) => item.attendance_status === "Attended")
            .length,
        0
      ),
    };
  }, [demos]);

  function resetStudentTools() {
    setStudentMode("leads");
    setLeadSearch("");
    setSelectedLeadIds(new Set());
    setManualName("");
    setManualGrade("");
    setManualEmail("");
    setManualPhone("");
    setExcelFileName("");
    setExcelRows([]);
    setExcelHeaders([]);
    setExcelMapping(EMPTY_MAPPING);
    setExcelError("");
  }

  function openNewDemo() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, attendees: [] });
    setMessage("");
    resetStudentTools();
    setModalOpen(true);
  }

  function editDemo(demo: DemoSession) {
    setEditingId(demo.id);
    setForm({
      demo_course: demo.demo_course,
      local_datetime: isoToLocalInput(demo.scheduled_at, demo.source_timezone),
      source_timezone: demo.source_timezone,
      trainers: [...demo.trainers],
      team_members: [...demo.team_members],
      zoom_link: demo.zoom_link || "",
      session_duration_minutes: String(demo.session_duration_minutes),
      status: demo.status,
      notes: demo.notes || "",
      attendees: demo.attendees.map((item) => ({ ...item })),
    });
    setMessage("");
    resetStudentTools();
    setModalOpen(true);
  }

  function addAttendees(items: DemoAttendee[]) {
    setForm((current) => {
      const existingKeys = new Set(current.attendees.map(attendeeKey));
      const additions = items.filter((item) => !existingKeys.has(attendeeKey(item)));
      return { ...current, attendees: [...current.attendees, ...additions] };
    });
  }

  function addSelectedLeads() {
    const attendees: DemoAttendee[] = leads
      .filter((lead) => selectedLeadIds.has(lead.id))
      .map((lead) => ({
        temp_id: makeTempId(),
        lead_id: lead.id,
        student_name: lead.child_name,
        grade: lead.grade,
        contact_email: lead.email,
        contact_phone: lead.phone_number
          ? `${lead.phone_country_code || ""} ${lead.phone_number}`.trim()
          : null,
        source: "Lead",
        attendance_status: "Scheduled",
        attendance_marked_at: null,
        import_metadata: {},
      }));

    addAttendees(attendees);
    setSelectedLeadIds(new Set());
  }

  function addManualStudent() {
    if (!manualName.trim()) {
      setMessage("Student Name is required before adding a manual student.");
      return;
    }

    addAttendees([
      {
        temp_id: makeTempId(),
        lead_id: null,
        student_name: manualName.trim(),
        grade: clean(manualGrade),
        contact_email: clean(manualEmail),
        contact_phone: clean(manualPhone),
        source: "Manual",
        attendance_status: "Scheduled",
        attendance_marked_at: null,
        import_metadata: {},
      },
    ]);

    setManualName("");
    setManualGrade("");
    setManualEmail("");
    setManualPhone("");
    setMessage("");
  }

  async function readExcelFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setExcelError("");
    setExcelFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("The Excel file does not contain a sheet.");

      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, {
        defval: "",
        raw: false,
      });

      if (rows.length === 0) {
        throw new Error("The first sheet does not contain any student rows.");
      }

      const headers = Array.from(
        new Set(rows.flatMap((row) => Object.keys(row)))
      );

      setExcelRows(rows);
      setExcelHeaders(headers);
      setExcelMapping({
        studentName: autoMapHeader(headers, [
          "student name",
          "child name",
          "student",
          "child",
          "name",
        ]),
        grade: autoMapHeader(headers, ["grade", "class", "standard"]),
        email: autoMapHeader(headers, [
          "email",
          "parent email",
          "guardian email",
          "student email",
        ]),
        phone: autoMapHeader(headers, [
          "phone",
          "phone number",
          "mobile",
          "mobile number",
          "contact number",
        ]),
      });
    } catch (error) {
      setExcelRows([]);
      setExcelHeaders([]);
      setExcelMapping(EMPTY_MAPPING);
      setExcelError(
        error instanceof Error ? error.message : "Could not read the Excel file."
      );
    }
  }

  function importMappedExcelRows() {
    setExcelError("");

    if (!excelMapping.studentName) {
      setExcelError("Map the Student Name column before importing.");
      return;
    }

    const attendees: DemoAttendee[] = excelRows.flatMap((row) => {
      const studentName = cellToString(row[excelMapping.studentName]);
      if (!studentName) return [];

      const importedEmail = excelMapping.email
        ? clean(cellToString(row[excelMapping.email]))
        : null;
      const importedPhone = excelMapping.phone
        ? clean(cellToString(row[excelMapping.phone]))
        : null;

      const matchedLead =
        importedEmail && importedPhone
          ? leads.find((lead) => {
              const leadPhone = `${lead.phone_country_code || ""}${
                lead.phone_number || ""
              }`;
              return (
                lead.child_name.trim().toLowerCase() ===
                  studentName.trim().toLowerCase() &&
                (lead.email || "").trim().toLowerCase() ===
                  importedEmail.toLowerCase() &&
                normalizedPhone(leadPhone) === normalizedPhone(importedPhone)
              );
            })
          : undefined;

      const attendee: DemoAttendee = {
        temp_id: makeTempId(),
        lead_id: matchedLead?.id || null,
        student_name: studentName,
        grade:
          (excelMapping.grade
            ? normalizeGrade(cellToString(row[excelMapping.grade]))
            : null) || matchedLead?.grade || null,
        contact_email: importedEmail || matchedLead?.email || null,
        contact_phone:
          importedPhone ||
          (matchedLead?.phone_number
            ? `${matchedLead.phone_country_code || ""} ${
                matchedLead.phone_number
              }`.trim()
            : null),
        source: "Excel Import",
        attendance_status: "Scheduled",
        attendance_marked_at: null,
        import_metadata: metadataFromRow(row),
      };

      return [attendee];
    });

    if (attendees.length === 0) {
      setExcelError("No student names were found in the mapped column.");
      return;
    }

    const existingKeys = new Set(form.attendees.map(attendeeKey));
    const unique = attendees.filter((item) => !existingKeys.has(attendeeKey(item)));

    setForm((current) => ({
      ...current,
      attendees: [...current.attendees, ...unique],
    }));

    setMessage(
      `${unique.length} student(s) added from ${excelFileName}. ${
        attendees.length - unique.length
      } duplicate row(s) skipped.`
    );


    setExcelRows([]);
    setExcelHeaders([]);
    setExcelMapping(EMPTY_MAPPING);
    setExcelFileName("");
  }

  function removeAttendee(tempId: string) {
    setForm((current) => ({
      ...current,
      attendees: current.attendees.filter((item) => item.temp_id !== tempId),
    }));
  }

  function updateAttendance(tempId: string, status: string) {
    setForm((current) => ({
      ...current,
      attendees: current.attendees.map((item) => {
        if (item.temp_id !== tempId) return item;

        return {
          ...item,
          attendance_status: status,
          attendance_marked_at:
            status === "Attended"
              ? item.attendance_marked_at || new Date().toISOString()
              : null,
        };
      }),
    }));
  }

  function markAll(status: string) {
    setForm((current) => ({
      ...current,
      attendees: current.attendees.map((item) => ({
        ...item,
        attendance_status: status,
        attendance_marked_at:
          status === "Attended"
            ? item.attendance_marked_at || new Date().toISOString()
            : null,
      })),
    }));
  }

  async function saveDemo(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    if (!form.local_datetime) {
      setMessage("Demo Date & Time is required.");
      return;
    }

    if (form.attendees.length === 0) {
      setMessage("Add at least one student to the demo.");
      return;
    }

    const scheduledAt = localDateTimeToUtc(
      form.local_datetime,
      form.source_timezone
    );

    if (!scheduledAt) {
      setMessage("Please select a valid demo date and time.");
      return;
    }

    setSaving(true);

    const sessionPayload = {
      lead_id: null,
      student_name: null,
      grade: null,
      demo_course: form.demo_course,
      scheduled_at: scheduledAt,
      source_timezone: form.source_timezone,
      trainers: form.trainers,
      team_members: form.team_members,
      zoom_link: clean(form.zoom_link),
      session_duration_minutes: Number(form.session_duration_minutes),
      status: form.status,
      notes: clean(form.notes),
      updated_by: userId || null,
    };

    let sessionId = editingId;

    if (editingId) {
      const { error } = await supabase
        .from("demo_sessions")
        .update(sessionPayload)
        .eq("id", editingId);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("demo_sessions")
        .insert({
          ...sessionPayload,
          created_by: userId || null,
        })
        .select("id")
        .single();

      if (error || !data) {
        setMessage(error?.message || "Could not create the demo session.");
        setSaving(false);
        return;
      }

      sessionId = data.id;
    }

    if (!sessionId) {
      setMessage("Could not determine the demo session ID.");
      setSaving(false);
      return;
    }

    const attendeeValues = (attendee: DemoAttendee) => ({
      demo_session_id: sessionId,
      lead_id: attendee.lead_id,
      student_name: attendee.student_name,
      grade: attendee.grade,
      contact_email: attendee.contact_email,
      contact_phone: attendee.contact_phone,
      source: attendee.source,
      attendance_status: attendee.attendance_status,
      attendance_marked_at: attendee.attendance_marked_at,
      import_metadata: attendee.import_metadata,
      updated_by: userId || null,
    });

    if (editingId) {
      const originalDemo = demos.find((demo) => demo.id === editingId);
      const originalIds = new Set(
        (originalDemo?.attendees || [])
          .map((attendee) => attendee.id)
          .filter((id): id is string => Boolean(id))
      );
      const retainedIds = new Set(
        form.attendees
          .map((attendee) => attendee.id)
          .filter((id): id is string => Boolean(id))
      );
      const removedIds = Array.from(originalIds).filter(
        (id) => !retainedIds.has(id)
      );

      if (removedIds.length > 0) {
        const { error: removeError } = await supabase
          .from("demo_attendees")
          .delete()
          .in("id", removedIds);

        if (removeError) {
          setMessage(removeError.message);
          setSaving(false);
          return;
        }
      }

      const existingAttendees = form.attendees.filter((attendee) => attendee.id);
      const updateResults = await Promise.all(
        existingAttendees.map((attendee) =>
          supabase
            .from("demo_attendees")
            .update(attendeeValues(attendee))
            .eq("id", attendee.id!)
        )
      );
      const attendeeUpdateError = updateResults.find((result) => result.error)?.error;

      if (attendeeUpdateError) {
        setMessage(attendeeUpdateError.message);
        setSaving(false);
        return;
      }

      const newAttendees = form.attendees.filter((attendee) => !attendee.id);
      if (newAttendees.length > 0) {
        const { error: insertError } = await supabase
          .from("demo_attendees")
          .insert(
            newAttendees.map((attendee) => ({
              ...attendeeValues(attendee),
              created_by: userId || null,
            }))
          );

        if (insertError) {
          setMessage(insertError.message);
          setSaving(false);
          return;
        }
      }
    } else {
      const { error: attendeeError } = await supabase
        .from("demo_attendees")
        .insert(
          form.attendees.map((attendee) => ({
            ...attendeeValues(attendee),
            created_by: userId || null,
          }))
        );

      if (attendeeError) {
        setMessage(
          `The demo session saved, but the student list could not be saved: ${attendeeError.message}`
        );
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setModalOpen(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM, attendees: [] });
    resetStudentTools();

    await Promise.all([loadDemos(), loadLeads()]);
  }

  async function deleteDemo(id: string) {
    if (!window.confirm("Delete this demo session and its student list?")) return;

    const { error } = await supabase.from("demo_sessions").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await Promise.all([loadDemos(), loadLeads()]);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div>
          <button className={styles.brand} onClick={() => router.push("/dashboard")}>
            <span className={styles.brandMark}>O</span>
            <span>
              <strong>Orbit</strong>
              <small>by igebra.ai</small>
            </span>
          </button>

          <nav className={styles.nav}>
            <button onClick={() => router.push("/dashboard")}>
              <span>⌂</span> Overview
            </button>

            <div className={styles.crmGroup}>
              <button className={styles.navActive}>
                <span>◎</span> CRM
              </button>
              <div className={styles.subNav}>
                <button onClick={() => router.push("/crm/leads")}>Leads</button>
                <button className={styles.subNavActive}>Demo Schedule</button>
              </div>
            </div>

            <button><span>◉</span> Students</button>
            <button><span>▣</span> Batches</button>
            <button><span>₹</span> Payments</button>
            <button><span>✦</span> Courses</button>
            <button><span>▤</span> Reports</button>
            <button>
              <span>◌</span> AQMATICS
              <small className={styles.soon}>Soon</small>
            </button>
          </nav>
        </div>

        <div className={styles.sidebarBottom}>
          <div className={styles.userBox}>
            <span className={styles.avatar}>
              {email ? email.charAt(0).toUpperCase() : "A"}
            </span>
            <span>
              <strong>Orbit User</strong>
              <small>{email}</small>
            </span>
          </div>
          <button className={styles.signOut} onClick={signOut}>Sign out</button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>CRM · DEMO SCHEDULE</p>
            <h1>Demo Schedule</h1>
            <p className={styles.subtitle}>
              Create one demo session and add students from Leads, manually, or by Excel import.
            </p>
          </div>

          <div className={styles.headerActions}>
            <button className={styles.secondaryButton} onClick={() => router.push("/crm/leads")}>
              View Leads
            </button>
            <button className={styles.primaryButton} onClick={openNewDemo}>
              + Schedule Demo
            </button>
          </div>
        </header>

        <section className={styles.statsGrid}>
          <div className={styles.statCard}><span>Total Demos</span><strong>{stats.total}</strong></div>
          <div className={styles.statCard}><span>Today</span><strong>{stats.today}</strong></div>
          <div className={styles.statCard}><span>Upcoming</span><strong>{stats.upcoming}</strong></div>
          <div className={styles.statCard}><span>Students Scheduled</span><strong>{stats.students}</strong></div>
          <div className={styles.statCard}><span>Students Attended</span><strong>{stats.attended}</strong></div>
        </section>

        {message && <div className={styles.message}>{message}</div>}

        <section className={styles.scheduleCard}>
          <div className={styles.toolbar}>
            <input
              type="search"
              placeholder="Search student, trainer, course, team member..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option>All statuses</option>
              {SESSION_STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
            </select>
            <button className={styles.refreshButton} onClick={loadDemos}>Refresh</button>
          </div>

          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Demo</th>
                  <th>Students</th>
                  <th>Selected Time</th>
                  <th>India Time</th>
                  <th>Attendance</th>
                  <th>Duration</th>
                  <th>Trainers</th>
                  <th>Team Members</th>
                  <th>Zoom</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className={styles.empty}>Loading demo schedule...</td></tr>
                ) : filteredDemos.length === 0 ? (
                  <tr><td colSpan={11} className={styles.empty}>No demos scheduled yet.</td></tr>
                ) : (
                  filteredDemos.map((demo) => {
                    const attendedCount = demo.attendees.filter(
                      (item) => item.attendance_status === "Attended"
                    ).length;
                    const names = demo.attendees.slice(0, 2).map((item) => item.student_name);

                    return (
                      <tr key={demo.id}>
                        <td><strong>{demo.demo_course}</strong></td>
                        <td>
                          <strong>{demo.attendees.length} student(s)</strong>
                          <small>
                            {names.join(", ")}
                            {demo.attendees.length > 2 ? ` +${demo.attendees.length - 2} more` : ""}
                          </small>
                        </td>
                        <td>
                          <strong>{formatInZone(demo.scheduled_at, demo.source_timezone)}</strong>
                          <small>{zoneLabel(demo.source_timezone)}</small>
                        </td>
                        <td>
                          <strong>{formatInZone(demo.scheduled_at, "Asia/Kolkata")}</strong>
                          <small>India IST</small>
                        </td>
                        <td>
                          <strong>{attendedCount} / {demo.attendees.length}</strong>
                          <small>attended</small>
                        </td>
                        <td>{demo.session_duration_minutes === 120 ? "2 Hours" : "1 Hour"}</td>
                        <td>
                          {demo.trainers.length ? (
                            <div className={styles.miniChips}>{demo.trainers.map((name) => <span key={name}>{name}</span>)}</div>
                          ) : "—"}
                        </td>
                        <td>
                          {demo.team_members.length ? (
                            <div className={styles.miniChips}>{demo.team_members.map((name) => <span key={name}>{name}</span>)}</div>
                          ) : "—"}
                        </td>
                        <td>
                          {demo.zoom_link ? (
                            <a className={styles.zoomLink} href={demo.zoom_link} target="_blank" rel="noreferrer">Open Zoom</a>
                          ) : "—"}
                        </td>
                        <td><span className={styles.statusBadge}>{demo.status}</span></td>
                        <td>
                          <div className={styles.rowActions}>
                            <button onClick={() => editDemo(demo)}>Edit / Attendance</button>
                            <button className={styles.deleteButton} onClick={() => deleteDemo(demo.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {modalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2>{editingId ? "Edit Demo" : "Schedule Demo"}</h2>
                <p>Set the session once, then add as many students as required.</p>
              </div>
              <button className={styles.closeButton} onClick={() => setModalOpen(false)} aria-label="Close">×</button>
            </div>

            <form className={styles.form} onSubmit={saveDemo}>
              <section className={styles.formSection}>
                <div className={styles.sectionTitle}>
                  <span>01</span>
                  <div><h3>Demo Details</h3><p>These details apply to every student in this demo session.</p></div>
                </div>

                <div className={styles.formGrid}>
                  <label>
                    <span>Demo Course</span>
                    <select value={form.demo_course} onChange={(event) => setForm({ ...form, demo_course: event.target.value })}>
                      {DEMO_COURSES.map((course) => <option key={course}>{course}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Session Duration</span>
                    <select value={form.session_duration_minutes} onChange={(event) => setForm({ ...form, session_duration_minutes: event.target.value })}>
                      <option value="60">1 Hour</option>
                      <option value="120">2 Hours</option>
                    </select>
                  </label>
                  <label>
                    <span>Demo Date & Time *</span>
                    <input type="datetime-local" value={form.local_datetime} onChange={(event) => setForm({ ...form, local_datetime: event.target.value })} />
                  </label>
                  <label>
                    <span>Primary Time Zone</span>
                    <select value={form.source_timezone} onChange={(event) => setForm({ ...form, source_timezone: event.target.value })}>
                      {TIMEZONES.map((zone) => <option key={zone.value} value={zone.value}>{zone.label}</option>)}
                    </select>
                  </label>
                </div>

                <div className={styles.timePreview}>
                  <div>
                    <span>Selected Time</span>
                    <strong>{formatInZone(previewIso, form.source_timezone)}</strong>
                    <small>{zoneLabel(form.source_timezone)}</small>
                  </div>
                  <div className={styles.timeArrow}>→</div>
                  <div>
                    <span>India Time</span>
                    <strong>{formatInZone(previewIso, "Asia/Kolkata")}</strong>
                    <small>India IST</small>
                  </div>
                </div>
              </section>

              <section className={styles.formSection}>
                <div className={styles.sectionTitle}>
                  <span>02</span>
                  <div><h3>Students</h3><p>Select from Leads, add manually, or import an Excel file with many students.</p></div>
                </div>

                <div className={styles.modeTabs}>
                  <button type="button" className={studentMode === "leads" ? styles.modeActive : ""} onClick={() => setStudentMode("leads")}>Select from Leads</button>
                  <button type="button" className={studentMode === "manual" ? styles.modeActive : ""} onClick={() => setStudentMode("manual")}>Add Manually</button>
                  <button type="button" className={studentMode === "excel" ? styles.modeActive : ""} onClick={() => setStudentMode("excel")}>Import Excel</button>
                </div>

                {studentMode === "leads" && (
                  <div className={styles.studentToolPanel}>
                    <div className={styles.leadPickerTop}>
                      <input type="search" placeholder="Search child, parent, email, phone or course..." value={leadSearch} onChange={(event) => setLeadSearch(event.target.value)} />
                      <button type="button" className={styles.smallPrimary} onClick={addSelectedLeads} disabled={selectedLeadIds.size === 0}>
                        Add Selected ({selectedLeadIds.size})
                      </button>
                    </div>

                    <div className={styles.leadPickerList}>
                      {filteredLeads.length === 0 ? (
                        <div className={styles.inlineEmpty}>No matching leads available.</div>
                      ) : (
                        filteredLeads.map((lead) => (
                          <label className={styles.leadRow} key={lead.id}>
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.has(lead.id)}
                              onChange={() => {
                                setSelectedLeadIds((current) => {
                                  const next = new Set(current);
                                  if (next.has(lead.id)) next.delete(lead.id);
                                  else next.add(lead.id);
                                  return next;
                                });
                              }}
                            />
                            <span className={styles.leadMain}>
                              <strong>{lead.child_name}</strong>
                              <small>{lead.grade || "No grade"} · Parent: {lead.parent_first_name} {lead.parent_last_name || ""}</small>
                            </span>
                            <span className={styles.leadCourse}>{lead.course_interested || "No course selected"}</span>
                            {lead.demo_attended && <span className={styles.attendedTag}>Demo attended</span>}
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {studentMode === "manual" && (
                  <div className={styles.studentToolPanel}>
                    <div className={styles.formGrid}>
                      <label><span>Student Name *</span><input value={manualName} onChange={(event) => setManualName(event.target.value)} /></label>
                      <label><span>Grade</span><select value={manualGrade} onChange={(event) => setManualGrade(event.target.value)}><option value="">Select grade</option>{GRADES.map((grade) => <option key={grade}>{grade}</option>)}</select></label>
                      <label><span>Email (Optional)</span><input type="email" value={manualEmail} onChange={(event) => setManualEmail(event.target.value)} /></label>
                      <label><span>Phone (Optional)</span><input value={manualPhone} onChange={(event) => setManualPhone(event.target.value)} /></label>
                    </div>
                    <div className={styles.toolFooter}>
                      <button type="button" className={styles.smallPrimary} onClick={addManualStudent}>+ Add Student</button>
                    </div>
                  </div>
                )}

                {studentMode === "excel" && (
                  <div className={styles.studentToolPanel}>
                    <div className={styles.excelIntro}>
                      <div>
                        <strong>Upload Excel or CSV</strong>
                        <p>Extra spreadsheet columns are allowed. Orbit keeps them as import metadata and only asks you to map the fields it needs.</p>
                      </div>
                      <label className={styles.fileButton}>
                        Choose File
                        <input type="file" accept=".xlsx,.xls,.csv" onChange={readExcelFile} hidden />
                      </label>
                    </div>

                    {excelFileName && <div className={styles.fileName}>File: {excelFileName} · {excelRows.length} row(s)</div>}
                    {excelError && <div className={styles.inlineError}>{excelError}</div>}

                    {excelRows.length > 0 && (
                      <>
                        <div className={styles.mappingGrid}>
                          <label>
                            <span>Student Name Column *</span>
                            <select value={excelMapping.studentName} onChange={(event) => setExcelMapping({ ...excelMapping, studentName: event.target.value })}>
                              <option value="">Select column</option>
                              {excelHeaders.map((header) => <option key={header} value={header}>{header}</option>)}
                            </select>
                          </label>
                          <label>
                            <span>Grade Column</span>
                            <select value={excelMapping.grade} onChange={(event) => setExcelMapping({ ...excelMapping, grade: event.target.value })}>
                              <option value="">Not available</option>
                              {excelHeaders.map((header) => <option key={header} value={header}>{header}</option>)}
                            </select>
                          </label>
                          <label>
                            <span>Email Column</span>
                            <select value={excelMapping.email} onChange={(event) => setExcelMapping({ ...excelMapping, email: event.target.value })}>
                              <option value="">Not available</option>
                              {excelHeaders.map((header) => <option key={header} value={header}>{header}</option>)}
                            </select>
                          </label>
                          <label>
                            <span>Phone Column</span>
                            <select value={excelMapping.phone} onChange={(event) => setExcelMapping({ ...excelMapping, phone: event.target.value })}>
                              <option value="">Not available</option>
                              {excelHeaders.map((header) => <option key={header} value={header}>{header}</option>)}
                            </select>
                          </label>
                        </div>

                        <div className={styles.excelPreview}>
                          <div className={styles.previewTitle}>Preview — first 5 rows</div>
                          <div className={styles.previewTableWrap}>
                            <table>
                              <thead><tr>{excelHeaders.slice(0, 6).map((header) => <th key={header}>{header}</th>)}</tr></thead>
                              <tbody>
                                {excelRows.slice(0, 5).map((row, index) => (
                                  <tr key={index}>{excelHeaders.slice(0, 6).map((header) => <td key={header}>{cellToString(row[header]) || "—"}</td>)}</tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className={styles.toolFooter}>
                          <button type="button" className={styles.smallPrimary} onClick={importMappedExcelRows}>Add {excelRows.length} Student(s)</button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className={styles.attendeeHeader}>
                  <div>
                    <strong>Students in this Demo</strong>
                    <span>{form.attendees.length} student(s)</span>
                  </div>
                  {form.attendees.length > 0 && (
                    <div className={styles.bulkActions}>
                      <button type="button" onClick={() => markAll("Attended")}>Mark All Attended</button>
                      <button type="button" onClick={() => markAll("Scheduled")}>Reset Attendance</button>
                    </div>
                  )}
                </div>

                <div className={styles.attendeeList}>
                  {form.attendees.length === 0 ? (
                    <div className={styles.inlineEmpty}>No students added yet.</div>
                  ) : (
                    form.attendees.map((attendee, index) => (
                      <div className={styles.attendeeRow} key={attendee.temp_id}>
                        <div className={styles.studentNumber}>{index + 1}</div>
                        <div className={styles.attendeeIdentity}>
                          <strong>{attendee.student_name}</strong>
                          <small>{attendee.grade || "No grade"} · {attendee.source}{attendee.lead_id ? " · Linked to Lead" : ""}</small>
                        </div>
                        <div className={styles.attendeeContact}>
                          <span>{attendee.contact_email || "—"}</span>
                          <small>{attendee.contact_phone || "—"}</small>
                        </div>
                        <select value={attendee.attendance_status} onChange={(event) => updateAttendance(attendee.temp_id, event.target.value)}>
                          {ATTENDANCE_OPTIONS.map((status) => <option key={status}>{status}</option>)}
                        </select>
                        <button type="button" className={styles.removeStudent} onClick={() => removeAttendee(attendee.temp_id)}>Remove</button>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className={styles.formSection}>
                <div className={styles.sectionTitle}>
                  <span>03</span>
                  <div><h3>People Assigned</h3><p>Add one or more trainers and team members.</p></div>
                </div>
                <div className={styles.formGrid}>
                  <MultiEntry label="Trainers" values={form.trainers} onChange={(values) => setForm({ ...form, trainers: values })} placeholder="Type trainer name" />
                  <MultiEntry label="Team Members Assigned for Demo" values={form.team_members} onChange={(values) => setForm({ ...form, team_members: values })} placeholder="Type team member name" />
                </div>
              </section>

              <section className={styles.formSection}>
                <div className={styles.sectionTitle}>
                  <span>04</span>
                  <div><h3>Meeting Details</h3><p>Update the Zoom link and demo status.</p></div>
                </div>
                <div className={styles.formGrid}>
                  <label className={styles.fullWidth}><span>Zoom Link</span><input type="url" value={form.zoom_link} onChange={(event) => setForm({ ...form, zoom_link: event.target.value })} placeholder="https://zoom.us/j/..." /></label>
                  <label><span>Demo Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{SESSION_STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select></label>
                  <label className={styles.fullWidth}><span>Notes</span><textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
                </div>
              </section>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelButton} onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.primaryButton} disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Schedule Demo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
