"use client";

import { useEffect, useState } from "react";
import { createClient, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace("/");
        return;
      }

      setUser(data.user);
    }

    loadUser();
  }, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <main className="dashboard-shell">
      <div className="dashboard-topbar">
        <div className="dashboard-brand">
          Orbit <span>by igebra.ai</span>
        </div>

        <button className="dashboard-signout" onClick={signOut}>
          Sign out
        </button>
      </div>

      <section className="dashboard-card">
        <h1>Welcome to Orbit</h1>
        <p>{user?.email || "Loading your workspace..."}</p>

        <div className="dashboard-grid">
          <div className="module-card">
            <strong>CRM</strong>
            <span>Leads, follow-ups, demos and conversions.</span>
          </div>
          <div className="module-card">
            <strong>Students</strong>
            <span>Student profiles and enrolments.</span>
          </div>
          <div className="module-card">
            <strong>Batches</strong>
            <span>Trainers, classes and attendance.</span>
          </div>
          <div className="module-card">
            <strong>Payments</strong>
            <span>Collections, balances and due dates.</span>
          </div>
          <div className="module-card">
            <strong>Courses</strong>
            <span>AiEdge, Coding4AI and Math.</span>
          </div>
          <div className="module-card">
            <strong>Reports</strong>
            <span>Operations and management insights.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
