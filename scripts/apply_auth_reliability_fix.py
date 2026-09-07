from pathlib import Path

page_path = Path("app/page.tsx")
reset_path = Path("app/reset-password/page.tsx")
css_path = Path("app/globals.css")

for path in (page_path, reset_path, css_path):
    if not path.exists():
        raise SystemExit(f"Missing {path}")

page = page_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

needle = '  const [activateMessage, setActivateMessage] = useState("");\n'
if "needsConfirmation" not in page:
    if needle not in page:
        raise SystemExit("Could not find activation state.")
    page = page.replace(
        needle,
        needle + '  const [needsConfirmation, setNeedsConfirmation] = useState(false);\n',
        1,
    )

old = '''    if (error) {
      setMessage("Incorrect email or password.");
      return;
    }'''
new = '''    if (error) {
      const lower = error.message.toLowerCase();
      if (lower.includes("email not confirmed")) {
        setNeedsConfirmation(true);
        setMessage("Your email is not confirmed yet. Please resend the confirmation email below.");
      } else {
        setNeedsConfirmation(false);
        setMessage("Incorrect email or password.");
      }
      return;
    }

    setNeedsConfirmation(false);'''
if old in page:
    page = page.replace(old, new, 1)

anchor = '  async function submitAccessRequest(event: FormEvent) {'
helper = '''  async function resendConfirmation(targetEmail?: string) {
    const cleanEmail = (targetEmail || email || activateEmail).trim().toLowerCase();

    if (!cleanEmail) {
      setMessage("Enter the email address first.");
      return;
    }

    const emailRedirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/?confirmed=1`
        : undefined;

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: cleanEmail,
      options: { emailRedirectTo },
    });

    const text = error
      ? error.message
      : "Confirmation email sent again. Please use the newest email only.";

    if (activateOpen) setActivateMessage(text);
    else setMessage(text);

    if (!error) setNeedsConfirmation(true);
  }

'''
if "async function resendConfirmation" not in page:
    if anchor not in page:
        raise SystemExit("Could not locate access-request function.")
    page = page.replace(anchor, helper + anchor, 1)

old_signup = '''    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: activatePassword,
    });'''
new_signup = '''    const emailRedirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/?confirmed=1`
        : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: activatePassword,
      options: { emailRedirectTo },
    });'''
if old_signup in page:
    page = page.replace(old_signup, new_signup, 1)

old_msg = '''    setActivateMessage(
      "Account created. Check your email if confirmation is required, then sign in."
    );'''
new_msg = '''    setNeedsConfirmation(true);
    setActivateMessage(
      "Account created. Confirm your email using the newest confirmation email, then return to Orbit and sign in."
    );'''
if old_msg in page:
    page = page.replace(old_msg, new_msg, 1)

old_login = '''                  {message && <div className="login-message">{message}</div>}

                  <button className="signin-button" type="submit" disabled={loading}>'''
new_login = '''                  {message && <div className="login-message">{message}</div>}

                  {needsConfirmation && (
                    <button
                      type="button"
                      className="auth-helper-button"
                      onClick={() => resendConfirmation(email)}
                    >
                      Resend confirmation email
                    </button>
                  )}

                  <button className="signin-button" type="submit" disabled={loading}>'''
if old_login in page:
    page = page.replace(old_login, new_login, 1)

old_activate = '''                  {activateMessage && (
                    <div className="request-message">{activateMessage}</div>
                  )}

                  <button
                    type="submit"
                    className="request-submit access-primary-button"'''
new_activate = '''                  {activateMessage && (
                    <div className="request-message">{activateMessage}</div>
                  )}

                  {needsConfirmation && activateEmail.trim() && (
                    <button
                      type="button"
                      className="auth-helper-button auth-helper-button-access"
                      onClick={() => resendConfirmation(activateEmail)}
                    >
                      Resend confirmation email
                    </button>
                  )}

                  <button
                    type="submit"
                    className="request-submit access-primary-button"'''
if old_activate in page:
    page = page.replace(old_activate, new_activate, 1)

old_effect = '''    checkSession();

    const saved = localStorage.getItem("orbit_remember_email");
    if (saved) setEmail(saved);
  }, [router]);'''
new_effect = '''    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && ["SIGNED_IN", "TOKEN_REFRESHED"].includes(event)) {
        setTimeout(() => checkSession(), 0);
      }
    });

    const saved = localStorage.getItem("orbit_remember_email");
    if (saved) setEmail(saved);

    const params = new URLSearchParams(window.location.search);
    if (params.get("confirmed") === "1") {
      setMessage("Email confirmed. You can now sign in to Orbit.");
    }

    return () => authListener.subscription.unsubscribe();
  }, [router]);'''
if old_effect in page:
    page = page.replace(old_effect, new_effect, 1)

page_path.write_text(page, encoding="utf-8")

reset = '''"use client";

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
    let mounted = true;

    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return false;
      if (data.session) {
        setReady(true);
        setMessage("");
        return true;
      }
      return false;
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setReady(true);
        setMessage("");
      }
    });

    async function init() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const hashError = hash.get("error_description");

        if (hashError) {
          setMessage(decodeURIComponent(hashError.replaceAll("+", " ")));
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setMessage("This password reset link is invalid or has expired. Request a new one from Orbit.");
            return;
          }
        }

        if (await checkSession()) return;

        await new Promise((resolve) => setTimeout(resolve, 350));
        if (await checkSession()) return;

        setMessage("This password reset link is invalid or has expired. Request a new one from Orbit.");
      } catch {
        setMessage("This password reset link is invalid or has expired. Request a new one from Orbit.");
      }
    }

    init();

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
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
    router.replace("/?password-reset=success");
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

        <button className={styles.back} type="button" onClick={() => router.replace("/")}>
          Back to Sign In
        </button>
      </section>
    </main>
  );
}
'''
reset_path.write_text(reset, encoding="utf-8")

marker = "/* ORBIT AUTH RELIABILITY FIX */"
if marker not in css:
    css += '''

/* ORBIT AUTH RELIABILITY FIX */
.auth-helper-button{
  width:100%;
  min-height:34px;
  margin:-2px 0 2px;
  border:1px solid #b9d3cf;
  border-radius:8px;
  background:#f4faf9;
  color:#0f5e61;
  font-size:10.5px;
  font-weight:800;
  cursor:pointer;
}
.auth-helper-button:hover{
  background:#eaf6f4;
  border-color:#8fb8b3;
}
.auth-helper-button-access{
  margin:8px 0 0;
}
'''
css_path.write_text(css, encoding="utf-8")

print("Orbit Auth Reliability Fix applied.")
print("No SQL/database changes.")
