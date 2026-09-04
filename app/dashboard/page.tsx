"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const menuItems = [
  { key: "overview", label: "Overview", icon: "⌂" },
  { key: "crm", label: "CRM", icon: "◎" },
  { key: "students", label: "Students", icon: "◉" },
  { key: "batches", label: "Batches", icon: "▣" },
  { key: "payments", label: "Payments", icon: "₹" },
  { key: "courses", label: "Courses", icon: "✦" },
  { key: "reports", label: "Reports", icon: "▤" },
  { key: "aqmatics", label: "AQMATICS", icon: "◌" },
  { key: "settings", label: "Settings", icon: "⚙" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [active, setActive] = useState("overview");

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/");
        return;
      }
      setEmail(user.email || "");
    }
    loadUser();
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  function handleMenu(key: string) {
    setActive(key);
    if (key === "crm") router.push("/crm/leads");
  }

  return (
    <div className="orbit-dashboard-shell">
      <aside className="orbit-sidebar">
        <div>
          <div className="orbit-brand-block">
            <div className="orbit-brand-mark">O</div>
            <div>
              <div className="orbit-brand-title">Orbit</div>
              <div className="orbit-brand-subtitle">by igebra.ai</div>
            </div>
          </div>

          <nav className="orbit-nav">
            {menuItems.map((item) => (
              <button
                key={item.key}
                className={`orbit-nav-item ${active === item.key ? "active" : ""}`}
                onClick={() => handleMenu(item.key)}
              >
                <span className="orbit-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.key === "aqmatics" && (
                  <span className="orbit-coming-soon">Soon</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="orbit-sidebar-footer">
          <div className="orbit-user-card">
            <div className="orbit-user-avatar">
              {email ? email.charAt(0).toUpperCase() : "A"}
            </div>
            <div>
              <div className="orbit-user-name">Orbit User</div>
              <div className="orbit-user-email">{email}</div>
            </div>
          </div>
          <button className="orbit-signout-btn" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="orbit-main">
        <header className="orbit-topbar">
          <div>
            <p className="orbit-topbar-kicker">CRM · LMS · Operations</p>
            <h1>
              Welcome to Orbit workspace <span>by igebra.ai</span>
            </h1>
            <p className="orbit-topbar-subtext">
              Manage leads, students, batches, payments and courses from one place.
            </p>
          </div>
          <div className="orbit-email-pill">{email || "Loading..."}</div>
        </header>

        <section className="orbit-stats-grid">
          <div className="orbit-stat-card">
            <span className="orbit-stat-label">CRM</span>
            <h3>Lead Management</h3>
            <p>Track enquiries, demos, follow-ups and conversions.</p>
          </div>
          <div className="orbit-stat-card">
            <span className="orbit-stat-label">Students</span>
            <h3>Enrolments</h3>
            <p>View enrolled students, course mappings and status.</p>
          </div>
          <div className="orbit-stat-card">
            <span className="orbit-stat-label">Batches</span>
            <h3>Class Operations</h3>
            <p>Manage batches, trainers, attendance and homework.</p>
          </div>
          <div className="orbit-stat-card">
            <span className="orbit-stat-label">Payments</span>
            <h3>Collections</h3>
            <p>Track fees collected, pending balances and due dates.</p>
          </div>
        </section>

        <section className="orbit-content-grid">
          <div className="orbit-panel orbit-panel-large">
            <div className="orbit-panel-header">
              <h2>Quick Access</h2>
              <span>Workspace Modules</span>
            </div>

            <div className="orbit-module-grid">
              <button className="orbit-module-card" onClick={() => router.push("/crm/leads")}>
                <div className="orbit-module-icon">◎</div>
                <h3>CRM</h3>
                <p>Leads, demos, follow-ups and conversions.</p>
              </button>

              <button className="orbit-module-card">
                <div className="orbit-module-icon">◉</div>
                <h3>Students</h3>
                <p>Profiles, enrolments and multi-course mapping.</p>
              </button>

              <button className="orbit-module-card">
                <div className="orbit-module-icon">▣</div>
                <h3>Batches</h3>
                <p>Trainer assignment, attendance and topics covered.</p>
              </button>

              <button className="orbit-module-card">
                <div className="orbit-module-icon">₹</div>
                <h3>Payments</h3>
                <p>Fee plans, payment mode, due dates and pending amounts.</p>
              </button>

              <button className="orbit-module-card">
                <div className="orbit-module-icon">✦</div>
                <h3>Courses</h3>
                <p>AiEdge, Coding4AI and Math course library.</p>
              </button>

              <button className="orbit-module-card">
                <div className="orbit-module-icon">▤</div>
                <h3>Reports</h3>
                <p>Operational summaries and management insights.</p>
              </button>
            </div>
          </div>

          <div className="orbit-panel">
            <div className="orbit-panel-header">
              <h2>Today's Focus</h2>
              <span>Suggested actions</span>
            </div>
            <ul className="orbit-task-list">
              <li>Review new incoming leads</li>
              <li>Check demo follow-ups</li>
              <li>Confirm pending enrolments</li>
              <li>Review payment dues</li>
              <li>Assign trainers to active batches</li>
            </ul>
          </div>

          <div className="orbit-panel">
            <div className="orbit-panel-header">
              <h2>Platform Scope</h2>
              <span>Current structure</span>
            </div>
            <div className="orbit-scope-box">
              <p><strong>iGebra:</strong> CRM + LMS operations</p>
              <p><strong>AQMATICS:</strong> <span className="orbit-muted">Next phase</span></p>
              <p><strong>Access:</strong> Admin, sales, trainer, accounts, parent and student roles.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
