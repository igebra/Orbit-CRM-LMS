"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import styles from "./leads.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const LEAD_STAGES = [
  "Fresh Lead",
  "Contacted",
  "Demo Scheduled",
  "Demo Completed",
  "Interested",
  "Enrolled",
  "Lost",
];

const LEAD_SOURCES = [
  "Internal Reference",
  "Meta Ads",
  "Demo",
  "Marketing",
  "Partners",
];

const ASSIGNED_TO = ["Madhu", "Armaity", "Karuna"];

const NEXT_ACTIONS = [
  "Need to Call",
  "Awaiting response",
  "Called",
  "Email sent",
];

const GRADES = Array.from({ length: 10 }, (_, i) =>
  `Grade ${String(i + 1).padStart(2, "0")}`
);

const SCHOOL_COURSES = [
  ...["Elementary", "Middle School", "High School"].flatMap((group) =>
    ["01", "02", "03"].map((level) => `AiEdge ${group} - Level ${level}`)
  ),
  ...["Elementary", "Middle School", "High School"].flatMap((group) =>
    ["01", "02", "03"].map((level) => `Coding4AI ${group} - Level ${level}`)
  ),
  ...GRADES.map((grade) => `Math - ${grade}`),
];

const COUNTRIES = [
  { name: "United States", code: "+1" },
  { name: "Canada", code: "+1" },
  { name: "United Kingdom", code: "+44" },
  { name: "India", code: "+91" },
  { name: "UAE", code: "+971" },
  { name: "Saudi Arabia", code: "+966" },
  { name: "Qatar", code: "+974" },
  { name: "Kuwait", code: "+965" },
  { name: "Bahrain", code: "+973" },
  { name: "Oman", code: "+968" },
  { name: "Singapore", code: "+65" },
  { name: "Malaysia", code: "+60" },
  { name: "Thailand", code: "+66" },
  { name: "Indonesia", code: "+62" },
  { name: "Philippines", code: "+63" },
  { name: "Hong Kong", code: "+852" },
];

type Lead = {
  id: string;
  parent_first_name: string;
  parent_last_name: string | null;
  child_name: string;
  grade: string | null;
  email: string | null;
  phone_country_name: string;
  phone_country_code: string;
  phone_number: string | null;
  lead_source: string | null;
  course_interested: string | null;
  assigned_to: string | null;
  next_action: string | null;
  lead_stage: string;
  demo_scheduled_at: string | null;
  demo_trainer: string | null;
  demo_attended: boolean;
  demo_attended_course: string | null;
  next_follow_up_date: string | null;
  notes: string | null;
  converted_at: string | null;
  converted_student_id: string | null;
  created_at: string;
  updated_at: string;
  duplicate_count: number;
  is_duplicate: boolean;
};

type FormState = {
  parent_first_name: string;
  parent_last_name: string;
  child_name: string;
  grade: string;
  email: string;
  phone_country_name: string;
  phone_country_code: string;
  phone_number: string;
  lead_source: string;
  course_interested: string;
  assigned_to: string;
  next_action: string;
  lead_stage: string;
  demo_scheduled_at: string;
  demo_trainer: string;
  demo_attended: boolean;
  demo_attended_course: string;
  next_follow_up_date: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  parent_first_name: "",
  parent_last_name: "",
  child_name: "",
  grade: "",
  email: "",
  phone_country_name: "United States",
  phone_country_code: "+1",
  phone_number: "",
  lead_source: "",
  course_interested: "",
  assigned_to: "",
  next_action: "Need to Call",
  lead_stage: "Fresh Lead",
  demo_scheduled_at: "",
  demo_trainer: "",
  demo_attended: false,
  demo_attended_course: "",
  next_follow_up_date: "",
  notes: "",
};

function dateTimeForInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function clean(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);

  if (rows.length < 2) return [];

  const headers = rows[0].map((header) =>
    header.trim().toLowerCase().replace(/\s+/g, "_")
  );

  return rows.slice(1).map((values) => {
    const result: Record<string, string> = {};
    headers.forEach((header, index) => {
      result[header] = (values[index] || "").trim();
    });
    return result;
  });
}

function pick(row: Record<string, string>, names: string[]) {
  for (const name of names) {
    const key = name.toLowerCase().replace(/\s+/g, "_");
    if (row[key] !== undefined && row[key] !== "") return row[key];
  }
  return "";
}

export default function LeadsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All stages");
  const [duplicateFilter, setDuplicateFilter] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function initialize() {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        router.replace("/");
        return;
      }

      setEmail(authData.user.email || "");
      setUserId(authData.user.id);
      await loadLeads();
    }

    initialize();
  }, [router]);

  async function loadLeads() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("leads_with_duplicate_status")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setLeads([]);
    } else {
      setLeads((data || []) as Lead[]);
    }

    setLoading(false);
  }

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();

    return leads.filter((lead) => {
      if (stageFilter !== "All stages" && lead.lead_stage !== stageFilter) {
        return false;
      }

      if (duplicateFilter && !lead.is_duplicate) return false;

      if (!q) return true;

      const haystack = [
        lead.parent_first_name,
        lead.parent_last_name,
        lead.child_name,
        lead.email,
        lead.phone_country_name,
        lead.phone_country_code,
        lead.phone_number,
        lead.lead_source,
        lead.course_interested,
        lead.assigned_to,
        lead.next_action,
        lead.lead_stage,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [leads, search, stageFilter, duplicateFilter]);

  const stats = useMemo(
    () => ({
      total: leads.length,
      fresh: leads.filter((lead) => lead.lead_stage === "Fresh Lead").length,
      demos: leads.filter((lead) => lead.lead_stage === "Demo Scheduled").length,
      enrolled: leads.filter((lead) => lead.lead_stage === "Enrolled").length,
      duplicates: leads.filter((lead) => lead.is_duplicate).length,
    }),
    [leads]
  );

  function newLead() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMessage("");
    setModalOpen(true);
  }

  function editLead(lead: Lead) {
    setEditingId(lead.id);
    setForm({
      parent_first_name: lead.parent_first_name || "",
      parent_last_name: lead.parent_last_name || "",
      child_name: lead.child_name || "",
      grade: lead.grade || "",
      email: lead.email || "",
      phone_country_name: lead.phone_country_name || "United States",
      phone_country_code: lead.phone_country_code || "+1",
      phone_number: lead.phone_number || "",
      lead_source: lead.lead_source || "",
      course_interested: lead.course_interested || "",
      assigned_to: lead.assigned_to || "",
      next_action: lead.next_action || "",
      lead_stage: lead.lead_stage || "Fresh Lead",
      demo_scheduled_at: dateTimeForInput(lead.demo_scheduled_at),
      demo_trainer: lead.demo_trainer || "",
      demo_attended: Boolean(lead.demo_attended),
      demo_attended_course: lead.demo_attended_course || "",
      next_follow_up_date: lead.next_follow_up_date || "",
      notes: lead.notes || "",
    });
    setMessage("");
    setModalOpen(true);
  }

  function updateCountry(countryName: string) {
    const country = COUNTRIES.find((item) => item.name === countryName);
    setForm((current) => ({
      ...current,
      phone_country_name: countryName,
      phone_country_code: country?.code || current.phone_country_code,
    }));
  }

  async function saveLead(event: FormEvent) {
    event.preventDefault();

    if (!form.parent_first_name.trim() || !form.child_name.trim()) {
      setMessage("Parent / Guardian First Name and Child Name are required.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      parent_first_name: form.parent_first_name.trim(),
      parent_last_name: clean(form.parent_last_name),
      child_name: form.child_name.trim(),
      grade: clean(form.grade),
      email: clean(form.email)?.toLowerCase() || null,
      phone_country_name: form.phone_country_name,
      phone_country_code: form.phone_country_code,
      phone_number: clean(form.phone_number),
      lead_source: clean(form.lead_source),
      course_interested: clean(form.course_interested),
      assigned_to: clean(form.assigned_to),
      next_action: clean(form.next_action),
      lead_stage: form.lead_stage,
      next_follow_up_date: clean(form.next_follow_up_date),
      notes: clean(form.notes),
      updated_by: userId || null,
    };

    let error;

    if (editingId) {
      const response = await supabase
        .from("leads")
        .update(payload)
        .eq("id", editingId);
      error = response.error;
    } else {
      const response = await supabase.from("leads").insert({
        ...payload,
        created_by: userId || null,
      });
      error = response.error;
    }

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    await loadLeads();
  }

  async function deleteLead(id: string) {
    if (!window.confirm("Delete this lead permanently?")) return;

    const { error } = await supabase.from("leads").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSelected((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });

    await loadLeads();
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected lead(s)?`)) return;

    const { error } = await supabase
      .from("leads")
      .delete()
      .in("id", Array.from(selected));

    if (error) {
      setMessage(error.message);
      return;
    }

    setSelected(new Set());
    await loadLeads();
  }

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    const visibleIds = filteredLeads.map((lead) => lead.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

    setSelected((current) => {
      const next = new Set(current);
      visibleIds.forEach((id) => {
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  }

  function downloadTemplate() {
    const headers = [
      "parent_first_name",
      "parent_last_name",
      "child_name",
      "grade",
      "email",
      "phone_country_name",
      "phone_country_code",
      "phone_number",
      "lead_source",
      "course_interested",
      "assigned_to",
      "next_action",
      "lead_stage",
      "next_follow_up_date",
      "notes",
    ];

    const example = [
      "John",
      "Smith",
      "Aarav Smith",
      "Grade 06",
      "john@example.com",
      "United States",
      "+1",
      "5551234567",
      "Meta Ads",
      "AiEdge Middle School - Level 01",
      "Madhu",
      "Need to Call",
      "Fresh Lead",
      "",
      "",
    ];

    const csv = `${headers.join(",")}\n${example
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(",")}`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "orbit-leads-import-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage("");

    try {
      const text = await file.text();
      const rows = parseCsv(text);

      if (rows.length === 0) {
        setMessage("The CSV does not contain any lead rows.");
        return;
      }

      const payload = rows
        .map((row) => {
          const countryName =
            pick(row, ["phone_country_name", "country", "phone_country"]) ||
            "United States";

          const country =
            COUNTRIES.find(
              (item) => item.name.toLowerCase() === countryName.toLowerCase()
            ) || COUNTRIES[0];

          const parentFirstName = pick(row, [
            "parent_first_name",
            "first_name",
            "parent_first",
          ]);
          const childName = pick(row, ["child_name", "student_name"]);

          if (!parentFirstName || !childName) return null;


          return {
            parent_first_name: parentFirstName,
            parent_last_name:
              pick(row, ["parent_last_name", "last_name", "parent_last"]) ||
              null,
            child_name: childName,
            grade: pick(row, ["grade", "age_grade"]) || null,
            email: pick(row, ["email", "parent_email"]).toLowerCase() || null,
            phone_country_name: country.name,
            phone_country_code:
              pick(row, ["phone_country_code", "country_code"]) || country.code,
            phone_number:
              pick(row, ["phone_number", "phone", "mobile"]) || null,
            lead_source: pick(row, ["lead_source", "source"]) || null,
            course_interested:
              pick(row, [
                "course_interested",
                "interested_course",
                "course",
              ]) || null,
            assigned_to:
              pick(row, ["assigned_to", "owner_name", "owner"]) || null,
            next_action: pick(row, ["next_action"]) || "Need to Call",
            lead_stage: pick(row, ["lead_stage", "stage"]) || "Fresh Lead",
            next_follow_up_date:
              pick(row, ["next_follow_up_date", "follow_up_date"]) || null,
            notes: pick(row, ["notes"]) || null,
            created_by: userId || null,
            updated_by: userId || null,
          };
        })
        .filter(
          (
            item
          ): item is NonNullable<typeof item> => item !== null
        );

      if (payload.length === 0) {
        setMessage(
          "No valid rows found. Parent First Name and Child Name are required."
        );
        return;
      }

      const { error } = await supabase.from("leads").insert(payload);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(`${payload.length} lead(s) imported successfully.`);
      await loadLeads();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not import the CSV."
      );
    } finally {
      setImporting(false);
      event.target.value = "";
    }
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
            <button className={styles.navActive}>
              <span>◎</span> CRM
            </button>
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
            <p className={styles.kicker}>CRM · LEAD MANAGEMENT</p>
            <h1>Leads</h1>
            <p className={styles.subtitle}>
              Add, import, assign and track enquiries from one place.
            </p>
          </div>

          <div className={styles.headerActions}>
            <button
              className={styles.secondaryButton}
              onClick={() => router.push("/crm/demos")}
            >
              Demo Schedule
            </button>

            <button className={styles.secondaryButton} onClick={downloadTemplate}>
              Download CSV Template
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={importCsv}
            />

            <button
              className={styles.secondaryButton}
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? "Importing..." : "Import Leads"}
            </button>

            <button className={styles.primaryButton} onClick={newLead}>
              + Add Lead
            </button>
          </div>
        </header>

        <section className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span>Total Leads</span>
            <strong>{stats.total}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Fresh Leads</span>
            <strong>{stats.fresh}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Demos Scheduled</span>
            <strong>{stats.demos}</strong>
          </div>
          <div className={styles.statCard}>
            <span>Enrolled</span>
            <strong>{stats.enrolled}</strong>
          </div>
          <button
            className={`${styles.statCard} ${
              duplicateFilter ? styles.duplicateCardActive : ""
            }`}
            onClick={() => setDuplicateFilter((value) => !value)}
          >
            <span>Duplicates</span>
            <strong className={styles.duplicateNumber}>{stats.duplicates}</strong>
          </button>
        </section>

        {message && <div className={styles.message}>{message}</div>}

        <section className={styles.tableCard}>
          <div className={styles.toolbar}>
            <input
              type="search"
              placeholder="Search parent, child, email, phone, course..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value)}
            >
              <option>All stages</option>
              {LEAD_STAGES.map((stage) => (
                <option key={stage}>{stage}</option>
              ))}
            </select>

            {duplicateFilter && (
              <button
                className={styles.duplicateFilter}
                onClick={() => setDuplicateFilter(false)}
              >
                Showing duplicates ×
              </button>
            )}

            {selected.size > 0 && (
              <button className={styles.deleteSelected} onClick={bulkDelete}>
                Delete Selected ({selected.size})
              </button>
            )}

            <button className={styles.refreshButton} onClick={loadLeads}>
              Refresh
            </button>
          </div>

          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Select all visible leads"
                      checked={
                        filteredLeads.length > 0 &&
                        filteredLeads.every((lead) => selected.has(lead.id))
                      }
                      onChange={toggleAllVisible}
                    />
                  </th>
                  <th>Parent</th>
                  <th>Child</th>
                  <th>Contact</th>
                  <th>Source</th>
                  <th>Course</th>
                  <th>Owner</th>
                  <th>Stage</th>
                  <th>Demo</th>
                  <th>Follow-up</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} className={styles.empty}>
                      Loading leads...
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={12} className={styles.empty}>
                      No leads found.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className={lead.is_duplicate ? styles.duplicateRow : ""}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(lead.id)}
                          onChange={() => toggleSelected(lead.id)}
                        />
                      </td>

                      <td>
                        <strong>
                          {lead.parent_first_name} {lead.parent_last_name || ""}
                        </strong>
                        {lead.is_duplicate && (
                          <span className={styles.duplicateBadge}>
                            Duplicate ×{lead.duplicate_count}
                          </span>
                        )}
                      </td>

                      <td>
                        <strong>{lead.child_name}</strong>
                        <small>{lead.grade || "—"}</small>
                      </td>

                      <td>
                        <span>{lead.email || "—"}</span>
                        <small>
                          {lead.phone_number
                            ? `${lead.phone_country_code} ${lead.phone_number}`
                            : "—"}
                        </small>
                      </td>

                      <td>{lead.lead_source || "—"}</td>
                      <td>{lead.course_interested || "—"}</td>
                      <td>{lead.assigned_to || "—"}</td>

                      <td>
                        <span
                          className={`${styles.stageBadge} ${
                            styles[
                              `stage${lead.lead_stage.replaceAll(" ", "")}` as keyof typeof styles
                            ] || ""
                          }`}
                        >
                          {lead.lead_stage}
                        </span>
                      </td>

                      <td>
                        {lead.demo_attended ? (
                          <>
                            <span className={styles.stageBadge}>✓ Demo Attended</span>
                            <small>{lead.demo_attended_course || "Demo"}</small>
                          </>
                        ) : lead.demo_scheduled_at ? (
                          <>
                            <span>
                              {new Date(lead.demo_scheduled_at).toLocaleDateString()}
                            </span>
                            <small>
                              {new Date(lead.demo_scheduled_at).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                            </small>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td>
                        {lead.next_follow_up_date
                          ? new Date(
                              `${lead.next_follow_up_date}T00:00:00`
                            ).toLocaleDateString()
                          : "—"}
                      </td>

                      <td>
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>

                      <td>
                        <div className={styles.rowActions}>
                          <button onClick={() => editLead(lead)}>Edit</button>
                          <button
                            className={styles.deleteButton}
                            onClick={() => deleteLead(lead.id)}
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
                <h2>{editingId ? "Edit Lead" : "Add Fresh Lead"}</h2>
                <p>
                  {editingId
                    ? "Update enquiry details."
                    : "Enter the enquiry details."}
                </p>
              </div>

              <button
                className={styles.closeButton}
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form className={styles.form} onSubmit={saveLead}>
              <div className={styles.formGrid}>
                <label>
                  <span>Parent / Guardian First Name *</span>
                  <input
                    value={form.parent_first_name}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        parent_first_name: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span>Parent / Guardian Last Name</span>
                  <input
                    value={form.parent_last_name}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        parent_last_name: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span>Child Name *</span>
                  <input
                    value={form.child_name}
                    onChange={(event) =>
                      setForm({ ...form, child_name: event.target.value })
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
                  <span>Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                  />
                </label>

                <label>
                  <span>Phone Country</span>
                  <select
                    value={form.phone_country_name}
                    onChange={(event) => updateCountry(event.target.value)}
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country.name} value={country.name}>
                        {country.name} ({country.code})
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Phone Number</span>
                  <div className={styles.phoneField}>
                    <span>{form.phone_country_code}</span>
                    <input
                      value={form.phone_number}
                      onChange={(event) =>
                        setForm({ ...form, phone_number: event.target.value })
                      }
                      placeholder="Phone number"
                    />
                  </div>
                </label>

                <label>
                  <span>Lead Source</span>
                  <select
                    value={form.lead_source}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        lead_source: event.target.value,
                        demo_attended:
                          event.target.value === "Demo"
                            ? form.demo_attended
                            : false,
                        demo_attended_course:
                          event.target.value === "Demo"
                            ? form.demo_attended_course
                            : "",
                      })
                    }
                  >
                    <option value="">Select source</option>
                    {LEAD_SOURCES.map((source) => (
                      <option key={source}>{source}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Course Interested</span>
                  <select
                    value={form.course_interested}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        course_interested: event.target.value,
                      })
                    }
                  >
                    <option value="">Select course</option>
                    {SCHOOL_COURSES.map((course) => (
                      <option key={course}>{course}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Assigned To</span>
                  <select
                    value={form.assigned_to}
                    onChange={(event) =>
                      setForm({ ...form, assigned_to: event.target.value })
                    }
                  >
                    <option value="">Select owner</option>
                    {ASSIGNED_TO.map((owner) => (
                      <option key={owner}>{owner}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Next Action</span>
                  <select
                    value={form.next_action}
                    onChange={(event) =>
                      setForm({ ...form, next_action: event.target.value })
                    }
                  >
                    <option value="">Select next action</option>
                    {NEXT_ACTIONS.map((action) => (
                      <option key={action}>{action}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Lead Stage</span>
                  <select
                    value={form.lead_stage}
                    onChange={(event) =>
                      setForm({ ...form, lead_stage: event.target.value })
                    }
                  >
                    {LEAD_STAGES.map((stage) => (
                      <option key={stage}>{stage}</option>
                    ))}
                  </select>
                </label>

                <div className={styles.notesField}>
                  <span style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#263f40", marginBottom: "7px" }}>Demo Scheduling</span>
                  <div style={{ border: "1px solid #d4dfdc", borderRadius: "10px", padding: "11px", background: "#f7faf9", color: "#5e7473", fontSize: "12px" }}>
                    Demo scheduling and attendance are managed from the separate Demo Schedule screen.
                  </div>
                </div>

                <label>
                  <span>Next Follow-up Date</span>
                  <input
                    type="date"
                    value={form.next_follow_up_date}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        next_follow_up_date: event.target.value,
                      })
                    }
                  />
                </label>

                <label className={styles.notesField}>
                  <span>Notes</span>
                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(event) =>
                      setForm({ ...form, notes: event.target.value })
                    }
                  />
                </label>
              </div>

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
                    : "Add Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
