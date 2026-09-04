"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const roles = [
  "Admin",
  "Sales / Marketing",
  "Trainer",
  "Accounts / Finance",
  "Viewer / Management",
  "Parent",
  "Student",
];

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestEmail, setRequestEmail] = useState("");
  const [requestRole, setRequestRole] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace("/dashboard");
    }

    checkSession();

    const saved = localStorage.getItem("orbit_remember_email");
    if (saved) setEmail(saved);
  }, [router]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    if (!email.trim() || !password) {
      setMessage("Enter your email and password.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setMessage("Incorrect email or password.");
      return;
    }

    if (remember) {
      localStorage.setItem("orbit_remember_email", email.trim());
    } else {
      localStorage.removeItem("orbit_remember_email");
    }

    router.replace("/dashboard");
  }

  async function forgotPassword() {
    setMessage("");

    if (!email.trim()) {
      setMessage("Enter your email first, then click Forgot password.");
      return;
    }

    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/` : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Password reset link sent to your email.");
  }

  async function submitAccessRequest(event: FormEvent) {
    event.preventDefault();
    setRequestMessage("");

    if (!requestEmail.trim() || !requestRole) {
      setRequestMessage("Enter your email and select a role.");
      return;
    }

    setRequestLoading(true);

    const { error } = await supabase.from("access_requests").insert({
      email: requestEmail.trim().toLowerCase(),
      requested_role: requestRole,
      status: "Pending",
    });

    setRequestLoading(false);

    if (error) {
      setRequestMessage(error.message);
      return;
    }

    setRequestMessage("Access request submitted successfully.");
    setRequestEmail("");
    setRequestRole("");
  }

  return (
    <main className="login-shell">
      <section className={`login-panel ${requestOpen ? "request-is-open" : ""}`}>
        <div className="login-content">
          <div className="brand-lockup">
            <div className="orbit-mark" aria-hidden="true">
              <span className="orbit-dot orbit-dot-teal" />
              <span className="orbit-dot orbit-dot-orange" />
            </div>

            <div>
              <div className="brand-name">Orbit</div>
              <div className="brand-sub">
                by <strong>igebra.ai</strong>
              </div>
            </div>
          </div>

          <div className="login-copy">
            <h1>Welcome back</h1>
            <p>Sign in to continue to your Orbit workspace.</p>
          </div>

          <form onSubmit={signIn} className="login-form">
            <label>
              <span>User ID / Email</span>
              <div className="input-3d">
                <span className="field-icon">◯</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email or user ID"
                />
              </div>
            </label>

            <label>
              <span>Password</span>
              <div className="input-3d">
                <span className="field-icon">▣</span>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />

                <button
                  type="button"
                  className="show-password"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <div className="form-row">
              <label className="remember-row">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                className="text-link"
                onClick={forgotPassword}
              >
                Forgot password?
              </button>
            </div>

            {message && <div className="login-message">{message}</div>}

            <button className="signin-button" type="submit" disabled={loading}>
              <span>{loading ? "Signing in..." : "Sign in"}</span>
              <span className="signin-arrow">→</span>
            </button>
          </form>

          <div className="request-access-block">
            <button
              type="button"
              className={`request-access-toggle ${requestOpen ? "active" : ""}`}
              onClick={() => setRequestOpen((value) => !value)}
            >
              <span className="request-radio">
                {requestOpen && <span className="request-radio-dot" />}
              </span>
              <span>Request Access</span>
            </button>

            {requestOpen && (
              <form className="request-access-form" onSubmit={submitAccessRequest}>
                <div className="request-grid">
                  <label>
                    <span>Email</span>
                    <input
                      type="email"
                      value={requestEmail}
                      onChange={(e) => setRequestEmail(e.target.value)}
                      placeholder="Enter your email"
                    />
                  </label>

                  <label>
                    <span>Role</span>
                    <select
                      value={requestRole}
                      onChange={(e) => setRequestRole(e.target.value)}
                    >
                      <option value="">Select role</option>
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {requestMessage && (
                  <div className="request-message">{requestMessage}</div>
                )}

                <button
                  type="submit"
                  className="request-submit"
                  disabled={requestLoading}
                >
                  {requestLoading ? "Sending..." : "Submit Request"}
                </button>
              </form>
            )}
          </div>
        </div>

        <img
          className="brand-characters"
          src="/igebra-characters.png"
          alt="iGebra brand characters"
        />
      </section>

      <section className="hero-panel" aria-label="Orbit education technology visual">
        <div className="hero-image" />
        <div className="hero-vignette" />
      </section>
    </main>
  );
}
