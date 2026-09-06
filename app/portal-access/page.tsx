"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import OrbitSidebar from "../components/OrbitSidebar";
import styles from "./portal-access.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Student = {
  id: string;
  student_name: string;
  grade: string | null;
  parent_first_name: string | null;
  parent_last_name: string | null;
  email: string | null;
};

type Grant = {
  grant_id: string;
  student_id: string;
  student_name: string;
  grade: string | null;
  access_type: string;
  full_name: string | null;
  email: string;
  relationship: string | null;
  user_id: string | null;
  activated_at: string | null;
  is_active: boolean;
  created_at: string;
};

type Curriculum = {
  id: string;
  course_name: string;
  session_number: number;
  topic: string | null;
};

type Resource = {
  id: string;
  curriculum_session_id: string;
  resource_type: string;
  title: string;
  visibility: string;
  is_archived: boolean;
};

const VISIBILITY = ["Internal Only", "Student", "Parent & Student"];

export default function PortalAccessPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [tab, setTab] = useState<"users" | "content">("users");
  const [students, setStudents] = useState<Student[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [curriculum, setCurriculum] = useState<Curriculum[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    student_id: "",
    access_type: "student",
    full_name: "",
    email: "",
    relationship: "",
  });

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return router.replace("/");

      setEmail(data.user.email || "");

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (!["super_admin", "admin"].includes(profile?.role || "")) {
        router.replace("/dashboard");
        return;
      }

      await load();
    }

    init();
  }, [router]);

  async function load() {
    const [studentsResult, grantsResult, curriculumResult, resourcesResult] =
      await Promise.all([
        supabase
          .from("students")
          .select("id,student_name,grade,parent_first_name,parent_last_name,email")
          .order("student_name"),
        supabase.rpc("portal_access_admin_list"),
        supabase
          .from("lms_curriculum_sessions")
          .select("id,course_name,session_number,topic")
          .order("course_name")
          .order("session_number"),
        supabase
          .from("lms_resources")
          .select("id,curriculum_session_id,resource_type,title,visibility,is_archived")
          .eq("is_archived", false)
          .order("created_at", { ascending: false }),
      ]);

    if (
      studentsResult.error ||
      grantsResult.error ||
      curriculumResult.error ||
      resourcesResult.error
    ) {
      setMessage(
        studentsResult.error?.message ||
          grantsResult.error?.message ||
          curriculumResult.error?.message ||
          resourcesResult.error?.message ||
          "Could not load Portal Access."
      );
      return;
    }

    setStudents((studentsResult.data || []) as Student[]);
    setGrants((grantsResult.data || []) as Grant[]);
    setCurriculum((curriculumResult.data || []) as Curriculum[]);
    setResources((resourcesResult.data || []) as Resource[]);
  }

  const filteredGrants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return grants;

    return grants.filter((grant) =>
      [
        grant.student_name,
        grant.grade,
        grant.access_type,
        grant.full_name,
        grant.email,
        grant.relationship,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [grants, search]);

  const filteredResources = useMemo(() => {
    const q = search.trim().toLowerCase();

    return resources.filter((resource) => {
      if (!q) return true;

      const session = curriculum.find(
        (item) => item.id === resource.curriculum_session_id
      );

      return [
        resource.title,
        resource.resource_type,
        resource.visibility,
        session?.course_name,
        session?.session_number,
        session?.topic,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [resources, curriculum, search]);

  function chooseStudent(studentId: string) {
    const student = students.find((item) => item.id === studentId);

    setForm((current) => ({
      ...current,
      student_id: studentId,
      full_name:
        current.access_type === "parent" && student
          ? [student.parent_first_name, student.parent_last_name]
              .filter(Boolean)
              .join(" ")
          : current.access_type === "student"
          ? student?.student_name || ""
          : current.full_name,
      email:
        current.access_type === "parent" && student?.email
          ? student.email
          : current.email,
    }));
  }

  function changeType(accessType: string) {
    const student = students.find((item) => item.id === form.student_id);

    setForm({
      ...form,
      access_type: accessType,
      full_name:
        accessType === "parent" && student
          ? [student.parent_first_name, student.parent_last_name]
              .filter(Boolean)
              .join(" ")
          : accessType === "student"
          ? student?.student_name || ""
          : "",
      email: accessType === "parent" && student?.email ? student.email : "",
      relationship: accessType === "student" ? "Self" : form.relationship,
    });
  }

  async function grant(event: FormEvent) {
    event.preventDefault();

    if (!form.student_id || !form.full_name.trim() || !form.email.trim()) {
      setMessage("Select a student and enter the portal user's name and email.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.rpc("grant_portal_access", {
      p_student_id: form.student_id,
      p_email: form.email.trim().toLowerCase(),
      p_access_type: form.access_type,
      p_full_name: form.full_name.trim(),
      p_relationship:
        form.access_type === "student"
          ? "Self"
          : form.relationship.trim() || "Parent / Guardian",
    });

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      "Portal access granted. The user can now use Activate Approved Access on the Orbit login page."
    );

    setForm({
      student_id: "",
      access_type: "student",
      full_name: "",
      email: "",
      relationship: "",
    });

    await load();
  }

  async function revoke(grantRow: Grant) {
    if (
      !confirm(
        `Remove ${grantRow.access_type} portal access for ${grantRow.email}?`
      )
    ) {
      return;
    }

    const { error } = await supabase.rpc("revoke_portal_access", {
      p_grant_id: grantRow.grant_id,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Portal access removed.");
    await load();
  }

  async function setVisibility(resource: Resource, visibility: string) {
    const { error } = await supabase
      .from("lms_resources")
      .update({ visibility })
      .eq("id", resource.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setResources((current) =>
      current.map((item) =>
        item.id === resource.id ? { ...item, visibility } : item
      )
    );

    setMessage(`"${resource.title}" visibility updated to ${visibility}.`);
  }

  return (
    <div className={styles.shell}>
      <OrbitSidebar email={email} active="portal-access" />

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>ACCESS · STUDENT & PARENT PORTALS</p>
            <h1>Portal Access</h1>
            <p>
              Link student and parent logins to the correct Student Profile
              without exposing internal Orbit.
            </p>
          </div>

          <div className={styles.headerActions}>
            <button
              className={styles.secondary}
              onClick={() => router.push("/access")}
            >
              Internal Access
            </button>
          </div>
        </header>

        {message && <div className={styles.message}>{message}</div>}

        <div className={styles.help}>
          <strong>How it works:</strong> Grant an email here. The user opens
          the normal Orbit login page → <strong>Activate Approved Access</strong>
          → creates a password. Students go only to the Student Portal; parents
          go only to the Parent Portal.
        </div>

        <div className={styles.tabs}>
          <button
            className={tab === "users" ? styles.active : ""}
            onClick={() => {
              setTab("users");
              setSearch("");
            }}
          >
            Portal Users
          </button>

          <button
            className={tab === "content" ? styles.active : ""}
            onClick={() => {
              setTab("content");
              setSearch("");
            }}
          >
            Content Visibility
          </button>
        </div>

        {tab === "users" ? (
          <>
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div>
                  <h2>Grant Portal Access</h2>
                  <p>
                    One student login per student. One parent email can be linked
                    to multiple children.
                  </p>
                </div>
              </div>

              <form className={styles.form} onSubmit={grant}>
                <label className={styles.full}>
                  <span>Student Profile</span>
                  <select
                    value={form.student_id}
                    onChange={(event) => chooseStudent(event.target.value)}
                  >
                    <option value="">Select student</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.student_name}
                        {student.grade ? ` · ${student.grade}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Access Type</span>
                  <select
                    value={form.access_type}
                    onChange={(event) => changeType(event.target.value)}
                  >
                    <option value="student">Student</option>
                    <option value="parent">Parent</option>
                  </select>
                </label>

                <label>
                  <span>
                    {form.access_type === "student"
                      ? "Student Name"
                      : "Parent / Guardian Name"}
                  </span>
                  <input
                    value={form.full_name}
                    onChange={(event) =>
                      setForm({ ...form, full_name: event.target.value })
                    }
                  />
                </label>

                <label>
                  <span>Login Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                    placeholder="Email used to activate Orbit"
                  />
                </label>

                {form.access_type === "parent" && (
                  <label>
                    <span>Relationship</span>
                    <input
                      value={form.relationship}
                      onChange={(event) =>
                        setForm({ ...form, relationship: event.target.value })
                      }
                      placeholder="Mother, Father, Guardian..."
                    />
                  </label>
                )}

                <div className={styles.formActions}>
                  <button className={styles.primary} disabled={saving}>
                    {saving ? "Granting..." : "Grant Portal Access"}
                  </button>
                </div>
              </form>
            </section>

            <section className={styles.card}>
              <div className={styles.toolbar}>
                <input
                  placeholder="Search student, parent or email..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Access</th>
                      <th>User</th>
                      <th>Email</th>
                      <th>Relationship</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredGrants.length === 0 ? (
                      <tr>
                        <td colSpan={7} className={styles.empty}>
                          No portal access has been granted yet.
                        </td>
                      </tr>
                    ) : (
                      filteredGrants.map((grantRow) => (
                        <tr key={grantRow.grant_id}>
                          <td>
                            <strong>{grantRow.student_name}</strong>
                            <small>{grantRow.grade || "—"}</small>
                          </td>
                          <td>
                            <span className={styles.badge}>
                              {grantRow.access_type === "student"
                                ? "Student"
                                : "Parent"}
                            </span>
                          </td>
                          <td>{grantRow.full_name || "—"}</td>
                          <td>{grantRow.email}</td>
                          <td>{grantRow.relationship || "—"}</td>
                          <td>
                            <span
                              className={`${styles.badge} ${
                                grantRow.activated_at
                                  ? styles.activeBadge
                                  : styles.waiting
                              }`}
                            >
                              {grantRow.activated_at
                                ? "Active"
                                : "Waiting Activation"}
                            </span>
                          </td>
                          <td>
                            <button
                              className={styles.danger}
                              onClick={() => revoke(grantRow)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <div>
                <h2>Content Visibility</h2>
                <p>
                  Internal Only is safest. Student shares after that session is
                  completed. Parent & Student shares with both.
                </p>
              </div>
            </div>

            <div className={styles.toolbar}>
              <input
                placeholder="Search course, session or resource..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Session</th>
                    <th>Resource</th>
                    <th>Type</th>
                    <th>Portal Visibility</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredResources.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={styles.empty}>
                        No LMS resources found.
                      </td>
                    </tr>
                  ) : (
                    filteredResources.map((resource) => {
                      const session = curriculum.find(
                        (item) =>
                          item.id === resource.curriculum_session_id
                      );

                      return (
                        <tr key={resource.id}>
                          <td>{session?.course_name || "—"}</td>
                          <td>
                            <strong>
                              Session {session?.session_number || "—"}
                            </strong>
                            <small>{session?.topic || "Topic not added"}</small>
                          </td>
                          <td>{resource.title}</td>
                          <td>{resource.resource_type}</td>
                          <td>
                            <select
                              className={styles.visibilitySelect}
                              value={resource.visibility}
                              onChange={(event) =>
                                setVisibility(resource, event.target.value)
                              }
                            >
                              {VISIBILITY.map((value) => (
                                <option key={value}>{value}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
