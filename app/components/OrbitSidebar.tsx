"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import styles from "../lms.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Props = {
  email: string;
  active: "students" | "batches" | "sessions" | "courses";
};

export default function OrbitSidebar({ email, active }: Props) {
  const router = useRouter();
  const [crmOpen, setCrmOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <aside className={styles.sidebar}>
      <div>
        <button className={styles.brand} onClick={() => router.push("/dashboard")}>
          <img src="/orbit-mascot.png" alt="Orbit mascot" className={styles.brandMascot} />
          <span className={styles.brandCopy}>
            <strong>Orbit</strong>
            <small>by igebra.ai</small>
          </span>
        </button>

        <nav className={styles.nav}>
          <button onClick={() => router.push("/dashboard")}>
            <span>⌂</span> Overview
          </button>

          <div className={styles.crmGroup}>
            <button onClick={() => setCrmOpen((value) => !value)}>
              <span>◎</span> CRM
              <span className={styles.chevron}>{crmOpen ? "▾" : "▸"}</span>
            </button>
            {crmOpen && (
              <div className={styles.subNav}>
                <button onClick={() => router.push("/crm/leads")}>Leads</button>
                <button onClick={() => router.push("/crm/demos")}>Demo Schedule</button>
              </div>
            )}
          </div>

          <button
            className={active === "students" ? styles.navActive : ""}
            onClick={() => router.push("/students")}
          >
            <span>◉</span> Students
          </button>

          <button
            className={active === "batches" || active === "sessions" ? styles.navActive : ""}
            onClick={() => router.push("/batches")}
          >
            <span>▣</span> Batches
          </button>

          <button><span>$</span> Payments</button>

          <button
            className={active === "courses" ? styles.navActive : ""}
            onClick={() => router.push("/courses")}
          >
            <span>✦</span> Courses
          </button>

          <button><span>▤</span> Reports</button>

          <button>
            <span>◌</span> AQMATICS
            <small className={styles.soon}>Soon</small>
          </button>
        </nav>
      </div>

      <div className={styles.sidebarBottom}>
        <div className={styles.userBox}>
          <span className={styles.avatar}>{email ? email.charAt(0).toUpperCase() : "A"}</span>
          <span>
            <strong>Orbit User</strong>
            <small>{email}</small>
          </span>
        </div>
        <button className={styles.signOut} onClick={signOut}>Sign out</button>
      </div>
    </aside>
  );
}
