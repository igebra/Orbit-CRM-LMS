"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import OrbitSidebar from "../components/OrbitSidebar";
import styles from "./trainers.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const TIMEZONES = [
  "US Eastern",
  "US Central",
  "US Mountain",
  "US Pacific",
  "India IST",
  "Other",
];

type Trainer = {
  id: string;
  trainer_name: string;
  email: string | null;
  phone: string | null;
  timezone: string | null;
  courses: string | null;
  status: string;
  linked_user_id: string | null;
};

type FormState = {
  trainer_name: string;
  email: string;
  phone: string;
  timezone: string;
  courses: string;
  status: string;
};

const EMPTY: FormState = {
  trainer_name: "",
  email: "",
  phone: "",
  timezone: "India IST",
  courses: "",
  status: "Active",
};

export default function TrainersPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const canManage = ["super_admin","admin","sales","sales_marketing"].includes(role);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return router.replace("/");

      setEmail(data.user.email || "");
      setUserId(data.user.id);

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      setRole(profile?.role || "");
      await load();
    }

    init();
  }, [router]);

  async function load() {
    const { data, error } = await supabase
      .from("trainers")
      .select("id,trainer_name,email,phone,timezone,courses,status,linked_user_id")
      .order("trainer_name");

    if (error) {
      setMessage(error.message);
      setTrainers([]);
      return;
    }

    setTrainers((data || []) as Trainer[]);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trainers;

    return trainers.filter((trainer) =>
      [
        trainer.trainer_name,
        trainer.email,
        trainer.phone,
        trainer.timezone,
        trainer.courses,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [trainers, search]);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY);
    setModalOpen(true);
  }

  function openEdit(trainer: Trainer) {
    setEditingId(trainer.id);
    setForm({
      trainer_name: trainer.trainer_name,
      email: trainer.email || "",
      phone: trainer.phone || "",
      timezone: trainer.timezone || "India IST",
      courses: trainer.courses || "",
      status: trainer.status,
    });
    setModalOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();

    if (!form.trainer_name.trim()) {
      setMessage("Trainer Name is required.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      trainer_name: form.trainer_name.trim(),
      email: form.email.trim().toLowerCase() || null,
      phone: form.phone.trim() || null,
      timezone: form.timezone || null,
      courses: form.courses.trim() || null,
      status: form.status,
      updated_by: userId || null,
    };

    const result = editingId
      ? await supabase.from("trainers").update(payload).eq("id", editingId)
      : await supabase.from("trainers").insert({
          ...payload,
          created_by: userId || null,
        });

    setSaving(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY);
    await load();
  }

  async function toggleStatus(trainer: Trainer) {
    const nextStatus = trainer.status === "Active" ? "Inactive" : "Active";

    const { error } = await supabase
      .from("trainers")
      .update({
        status: nextStatus,
        updated_by: userId || null,
      })
      .eq("id", trainer.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await load();
  }

  return (
    <div className={styles.shell}>
      <OrbitSidebar email={email} active="trainers" />

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>LMS · TRAINERS</p>
            <h1>Trainers</h1>
            <p>Simple trainer directory used for batch and class assignment.</p>
          </div>

          {canManage && (
            <button className={styles.primary} onClick={openAdd}>
              + Add Trainer
            </button>
          )}
        </header>

        {message && <div className={styles.message}>{message}</div>}

        <section className={styles.summary}>
          <div><span>Total</span><strong>{trainers.length}</strong></div>
          <div><span>Active</span><strong>{trainers.filter((t) => t.status === "Active").length}</strong></div>
          <div><span>Orbit Access</span><strong>{trainers.filter((t) => t.linked_user_id).length}</strong></div>
        </section>

        <section className={styles.card}>
          <div className={styles.toolbar}>
            <input
              type="search"
              placeholder="Search trainer, email or course..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Trainer</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Time Zone</th>
                  <th>Courses / Skills</th>
                  <th>Orbit Access</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={styles.empty}>
                      No trainers found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((trainer) => (
                    <tr key={trainer.id}>
                      <td><strong>{trainer.trainer_name}</strong></td>
                      <td>{trainer.email || "—"}</td>
                      <td>{trainer.phone || "—"}</td>
                      <td>{trainer.timezone || "—"}</td>
                      <td>{trainer.courses || "—"}</td>
                      <td>
                        <span className={trainer.linked_user_id ? styles.accessYes : styles.accessNo}>
                          {trainer.linked_user_id ? "Linked" : "No login"}
                        </span>
                      </td>
                      <td><span className={styles.status}>{trainer.status}</span></td>
                      <td>
                        <div className={styles.actions}>
                          <button onClick={() => router.push(`/reports?trainer=${trainer.id}`)}>
                            Report
                          </button>
                          {canManage && (
                            <>
                              <button onClick={() => openEdit(trainer)}>Edit</button>
                              <button onClick={() => toggleStatus(trainer)}>
                                {trainer.status === "Active" ? "Make Inactive" : "Make Active"}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className={styles.help}>
          <strong>Orbit Access:</strong> a trainer can use Gmail, Outlook, igebra.ai or any other email.
          When that same email is approved with the Trainer role, Orbit links it automatically.
        </div>
      </main>

      {modalOpen && (
        <div className={styles.backdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2>{editingId ? "Edit Trainer" : "Add Trainer"}</h2>
                <p>Keep only the details the team needs.</p>
              </div>
              <button onClick={() => setModalOpen(false)}>×</button>
            </div>

            <form onSubmit={save}>
              <div className={styles.formGrid}>
                <label>
                  <span>Trainer Name *</span>
                  <input
                    value={form.trainer_name}
                    onChange={(e) => setForm({ ...form, trainer_name: e.target.value })}
                  />
                </label>

                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Any email domain"
                  />
                </label>

                <label>
                  <span>Phone</span>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </label>

                <label>
                  <span>Time Zone</span>
                  <select
                    value={form.timezone}
                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  >
                    {TIMEZONES.map((zone) => <option key={zone}>{zone}</option>)}
                  </select>
                </label>

                <label className={styles.full}>
                  <span>Courses / Skills</span>
                  <input
                    value={form.courses}
                    onChange={(e) => setForm({ ...form, courses: e.target.value })}
                    placeholder="Example: AiEdge Middle School, Python, Math"
                  />
                </label>

                <label>
                  <span>Status</span>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </label>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.secondary} onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button className={styles.primary} disabled={saving}>
                  {saving ? "Saving..." : "Save Trainer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
