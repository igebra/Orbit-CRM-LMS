"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
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

const STATUS_OPTIONS = [
  "Scheduled",
  "Completed",
  "No Show",
  "Rescheduled",
  "Cancelled",
];

type DemoSession = {
  id: string;
  lead_id: string | null;
  student_name: string;
  grade: string | null;
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
};

type LeadOption = {
  id: string;
  parent_first_name: string;
  parent_last_name: string | null;
  child_name: string;
  grade: string | null;
  course_interested: string | null;
};

type DemoForm = {
  lead_id: string;
  student_name: string;
  grade: string;
  demo_course: string;
  local_datetime: string;
  source_timezone: string;
  trainers: string[];
  team_members: string[];
  zoom_link: string;
  session_duration_minutes: string;
  status: string;
  notes: string;
};

const EMPTY_FORM: DemoForm = {
  lead_id: "",
  student_name: "",
  grade: "",
  demo_course: "AiEdge",
  local_datetime: "",
  source_timezone: "America/New_York",
  trainers: [],
  team_members: [],
  zoom_link: "",
  session_duration_minutes: "60",
  status: "Scheduled",
  notes: "",
};

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
  let offset = getTimeZoneOffsetMs(guess, timeZone);
  let result = new Date(guess.getTime() - offset);

  const correctedOffset = getTimeZoneOffsetMs(result, timeZone);
  if (correctedOffset !== offset) {
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
  }).format(new Date(iso));
}

function zoneLabel(value: string) {
  return TIMEZONES.find((zone) => zone.value === value)?.label || value;
}

function courseFamily(course: string | null) {
  if (!course) return "AiEdge";
  const lower = course.toLowerCase();

  if (lower.includes("coding4ai")) return "Coding4AI";
  if (lower.includes("math")) return "Math";
  return "AiEdge";
}

function clean(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
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

  function removeValue(value: string) {
    onChange(values.filter((item) => item !== value));
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
                  onClick={() => removeValue(value)}
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

    const { data, error } = await supabase
      .from("demo_sessions")
      .select("*")
      .order("scheduled_at", { ascending: true });

    if (error) {
      setMessage(error.message);
      setDemos([]);
    } else {
      setDemos((data || []) as DemoSession[]);
    }

    setLoading(false);
  }

  async function loadLeads() {
    const { data, error } = await supabase
      .from("leads")
      .select(
        "id,parent_first_name,parent_last_name,child_name,grade,course_interested"
      )
      .order("created_at", { ascending: false });

    if (!error) {
      setLeads((data || []) as LeadOption[]);
    }
  }

  const previewIso = useMemo(
    () => localDateTimeToUtc(form.local_datetime, form.source_timezone),
    [form.local_datetime, form.source_timezone]
  );

  const filteredDemos = useMemo(() => {
    const q = search.trim().toLowerCase();

    return demos.filter((demo) => {
      if (statusFilter !== "All statuses" && demo.status !== statusFilter) {
        return false;
      }

      if (!q) return true;

      return [
        demo.student_name,
        demo.grade,
        demo.demo_course,
        demo.trainers.join(" "),
        demo.team_members.join(" "),
        demo.status,
        demo.zoom_link,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [demos, search, statusFilter]);

  const stats = useMemo(() => {
    const today = new Date();
    const todayKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(today);

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
          new Date(demo.scheduled_at).getTime() > Date.now() &&
          demo.status === "Scheduled"
      ).length,
      completed: demos.filter((demo) => demo.status === "Completed").length,
      noShow: demos.filter((demo) => demo.status === "No Show").length,
    };
  }, [demos]);

  function openNewDemo() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMessage("");
    setModalOpen(true);
  }

  function editDemo(demo: DemoSession) {
    setEditingId(demo.id);
    setForm({
      lead_id: demo.lead_id || "",
      student_name: demo.student_name,
      grade: demo.grade || "",
      demo_course: demo.demo_course,
      local_datetime: isoToLocalInput(
        demo.scheduled_at,
        demo.source_timezone
      ),
      source_timezone: demo.source_timezone,
      trainers: demo.trainers || [],
      team_members: demo.team_members || [],
      zoom_link: demo.zoom_link || "",
      session_duration_minutes: String(demo.session_duration_minutes),
      status: demo.status,
      notes: demo.notes || "",
    });
    setMessage("");
    setModalOpen(true);
  }

  function selectLead(leadId: string) {
    if (!leadId) {
      setForm((current) => ({ ...current, lead_id: "" }));
      return;
    }

    const lead = leads.find((item) => item.id === leadId);

    if (!lead) return;

    setForm((current) => ({
      ...current,
      lead_id: lead.id,
      student_name: lead.child_name,
      grade: lead.grade || "",
      demo_course: courseFamily(lead.course_interested),
    }));
  }

  async function saveDemo(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    if (!form.student_name.trim()) {
      setMessage("Student Name is required.");
      return;
    }

    if (!form.local_datetime) {
      setMessage("Demo Date & Time is required.");
      return;
    }

    const scheduledAt = localDateTimeToUtc(
      form.local_datetime,
      form.source_timezone
    );

    if (!scheduledAt) {
      setMessage("Please select a valid date and time.");
      return;
    }

    setSaving(true);

    const payload = {
      lead_id: form.lead_id || null,
      student_name: form.student_name.trim(),
      grade: clean(form.grade),
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

    let error;

    if (editingId) {
      const response = await supabase
        .from("demo_sessions")
        .update(payload)
        .eq("id", editingId);

      error = response.error;
    } else {
      const response = await supabase.from("demo_sessions").insert({
        ...payload,
        created_by: userId || null,
      });

      error = response.error;
    }

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);

    await loadDemos();
  }

  async function deleteDemo(id: string) {
    if (!window.confirm("Delete this demo schedule?")) return;

    const { error } = await supabase
      .from("demo_sessions")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadDemos();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div>
          <button
            className={styles.brand}
            onClick={() => router.push("/dashboard")}
          >
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
                <button onClick={() => router.push("/crm/leads")}>
                  Leads
                </button>
                <button className={styles.subNavActive}>
                  Demo Schedule
                </button>
              </div>
            </div>

            <button>
              <span>◉</span> Students
            </button>
            <button>
              <span>▣</span> Batches
            </button>
            <button>
              <span>₹</span> Payments
            </button>
            <button>
              <span>✦</span> Courses
            </button>
            <button>
              <span>▤</span> Reports
            </button>
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

          <button className={styles.signOut} onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>CRM · DEMO SCHEDULE</p>
            <h1>Demo Schedule</h1>
            <p className={styles.subtitle}>
              Schedule demos across US and India time zones and assign the right
              trainers and team members.
            </p>
          </div>

          <div className={styles.headerActions}>
            <button
              className={styles.secondaryButton}
              onClick={() => router.push("/crm/leads")}
            >
              View Leads
            </button>

            <button className={styles.primaryButton} onClick={openNewDemo}>
              + Schedule Demo
            </button>
          </div>
        </header>

        <section className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span>Total Demos</span>
            <strong>{stats.total}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Today</span>
            <strong>{stats.today}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Upcoming</span>
            <strong>{stats.upcoming}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Completed</span>
            <strong>{stats.completed}</strong>
          </div>
          <div className={styles.statCard}>
            <span>No Show</span>
            <strong className={styles.warningNumber}>{stats.noShow}</strong>
          </div>
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

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option>All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>

            <button className={styles.refreshButton} onClick={loadDemos}>
              Refresh
            </button>
          </div>

          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Demo</th>
                  <th>US / Selected Time</th>
                  <th>India Time</th>
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
                  <tr>
                    <td colSpan={10} className={styles.empty}>
                      Loading demo schedule...
                    </td>
                  </tr>
                ) : filteredDemos.length === 0 ? (
                  <tr>
                    <td colSpan={10} className={styles.empty}>
                      No demos scheduled yet.
                    </td>
                  </tr>
                ) : (
                  filteredDemos.map((demo) => (
                    <tr key={demo.id}>
                      <td>
                        <strong>{demo.student_name}</strong>
                        <small>{demo.grade || "—"}</small>
                      </td>

                      <td>
                        <strong>{demo.demo_course}</strong>
                      </td>

                      <td>
                        <strong>
                          {formatInZone(
                            demo.scheduled_at,
                            demo.source_timezone
                          )}
                        </strong>
                        <small>{zoneLabel(demo.source_timezone)}</small>
                      </td>

                      <td>
                        <strong>
                          {formatInZone(
                            demo.scheduled_at,
                            "Asia/Kolkata"
                          )}
                        </strong>
                        <small>India IST</small>
                      </td>

                      <td>
                        {demo.session_duration_minutes === 120
                          ? "2 Hours"
                          : "1 Hour"}
                      </td>

                      <td>
                        {demo.trainers.length > 0 ? (
                          <div className={styles.miniChips}>
                            {demo.trainers.map((trainer) => (
                              <span key={trainer}>{trainer}</span>
                            ))}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td>
                        {demo.team_members.length > 0 ? (
                          <div className={styles.miniChips}>
                            {demo.team_members.map((member) => (
                              <span key={member}>{member}</span>
                            ))}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td>
                        {demo.zoom_link ? (
                          <a
                            href={demo.zoom_link}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.zoomLink}
                          >
                            Open Zoom
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            demo.status === "Completed"
                              ? styles.statusCompleted
                              : demo.status === "No Show"
                              ? styles.statusNoShow
                              : demo.status === "Cancelled"
                              ? styles.statusCancelled
                              : ""
                          }`}
                        >
                          {demo.status}
                        </span>
                      </td>

                      <td>
                        <div className={styles.rowActions}>
                          <button onClick={() => editDemo(demo)}>Edit</button>
                          <button
                            className={styles.deleteButton}
                            onClick={() => deleteDemo(demo.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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
                <p>
                  Add the student, timezone, trainers and meeting details.
                </p>
              </div>

              <button
                className={styles.closeButton}
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form className={styles.form} onSubmit={saveDemo}>
              <section className={styles.formSection}>
                <div className={styles.sectionTitle}>
                  <span>01</span>
                  <div>
                    <h3>Student Details</h3>
                    <p>Link an existing lead or enter the student manually.</p>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <label className={styles.fullWidth}>
                    <span>Link Existing Lead (Optional)</span>
                    <select
                      value={form.lead_id}
                      onChange={(event) => selectLead(event.target.value)}
                    >
                      <option value="">Do not link a lead</option>
                      {leads.map((lead) => (
                        <option key={lead.id} value={lead.id}>
                          {lead.child_name} — {lead.parent_first_name}{" "}
                          {lead.parent_last_name || ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Student Name *</span>
                    <input
                      value={form.student_name}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          student_name: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    <span>Grade</span>
                    <select
                      value={form.grade}
                      onChange={(event) =>
                        setForm({ ...form, grade: event.target.value })
                      }
                    >
                      <option value="">Select grade</option>
                      {GRADES.map((grade) => (
                        <option key={grade}>{grade}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Demo Course</span>
                    <select
                      value={form.demo_course}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          demo_course: event.target.value,
                        })
                      }
                    >
                      {DEMO_COURSES.map((course) => (
                        <option key={course}>{course}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Session Duration</span>
                    <select
                      value={form.session_duration_minutes}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          session_duration_minutes: event.target.value,
                        })
                      }
                    >
                      <option value="60">1 Hour</option>
                      <option value="120">2 Hours</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className={styles.formSection}>
                <div className={styles.sectionTitle}>
                  <span>02</span>
                  <div>
                    <h3>Date & Time</h3>
                    <p>
                      Enter the demo in the selected timezone. India time is
                      calculated automatically.
                    </p>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <label>
                    <span>Demo Date & Time *</span>
                    <input
                      type="datetime-local"
                      value={form.local_datetime}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          local_datetime: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    <span>Primary Time Zone</span>
                    <select
                      value={form.source_timezone}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          source_timezone: event.target.value,
                        })
                      }
                    >
                      {TIMEZONES.map((zone) => (
                        <option key={zone.value} value={zone.value}>
                          {zone.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className={styles.timePreview}>
                  <div>
                    <span>Selected Time</span>
                    <strong>
                      {formatInZone(previewIso, form.source_timezone)}
                    </strong>
                    <small>{zoneLabel(form.source_timezone)}</small>
                  </div>

                  <div className={styles.timeArrow}>→</div>

                  <div>
                    <span>India Time</span>
                    <strong>
                      {formatInZone(previewIso, "Asia/Kolkata")}
                    </strong>
                    <small>India IST</small>
                  </div>
                </div>
              </section>

              <section className={styles.formSection}>
                <div className={styles.sectionTitle}>
                  <span>03</span>
                  <div>
                    <h3>People Assigned</h3>
                    <p>Add one or more trainers and team members.</p>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <MultiEntry
                    label="Trainers"
                    values={form.trainers}
                    onChange={(values) =>
                      setForm({ ...form, trainers: values })
                    }
                    placeholder="Type trainer name"
                  />

                  <MultiEntry
                    label="Team Members Assigned for Demo"
                    values={form.team_members}
                    onChange={(values) =>
                      setForm({ ...form, team_members: values })
                    }
                    placeholder="Type team member name"
                  />
                </div>
              </section>

              <section className={styles.formSection}>
                <div className={styles.sectionTitle}>
                  <span>04</span>
                  <div>
                    <h3>Meeting Details</h3>
                    <p>Update the Zoom link and current demo status.</p>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <label className={styles.fullWidth}>
                    <span>Zoom Link</span>
                    <input
                      type="url"
                      value={form.zoom_link}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          zoom_link: event.target.value,
                        })
                      }
                      placeholder="https://zoom.us/j/..."
                    />
                  </label>

                  <label>
                    <span>Status</span>
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          status: event.target.value,
                        })
                      }
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </label>

                  <label className={styles.fullWidth}>
                    <span>Notes</span>
                    <textarea
                      rows={3}
                      value={form.notes}
                      onChange={(event) =>
                        setForm({ ...form, notes: event.target.value })
                      }
                    />
                  </label>
                </div>
              </section>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Save Changes"
                    : "Schedule Demo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
