"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import styles from "./reset-password.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("Checking your reset link...");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setMessage("This password reset link is invalid or has expired.");
            return;
          }
        }

        const { data } = await supabase.auth.getSession();

        if (!data.session) {
          setMessage("This password reset link is invalid or has expired.");
          return;
        }

        setReady(true);
        setMessage("");
      } catch {
        setMessage("This password reset link is invalid or has expired.");
      }
    }

    init();
  }, []);

  async function updatePassword(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({ password });

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <div className={styles.brand}>
          <img src="/orbit-mascot.png" alt="Orbit mascot" />
          <div>
            <strong>Orbit</strong>
            <span>by igebra.ai</span>
          </div>
        </div>

        <div className={styles.copy}>
          <p>ACCOUNT SECURITY</p>
          <h1>Set New Password</h1>
          <span>Create a new password for your Orbit account.</span>
        </div>

        {message && <div className={styles.message}>{message}</div>}

        {ready && (
          <form onSubmit={updatePassword}>
            <label>
              <span>New Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
              />
            </label>

            <label>
              <span>Confirm Password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
              />
            </label>

            <button disabled={saving}>
              {saving ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}

        <button
          className={styles.back}
          type="button"
          onClick={() => router.replace("/")}
        >
          Back to Sign In
        </button>
      </section>
    </main>
  );
}
