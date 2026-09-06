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
  "Sales Admin",
  "Marketing",
  "Trainer",
  "Finance Admin",
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
  const [activateOpen, setActivateOpen] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [requestEmail, setRequestEmail] = useState("");
  const [requestRole, setRequestRole] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");

  const [activateEmail, setActivateEmail] = useState("");
  const [activatePassword, setActivatePassword] = useState("");
  const [activateConfirm, setActivateConfirm] = useState("");
  const [activateLoading, setActivateLoading] = useState(false);
  const [activateMessage, setActivateMessage] = useState("");

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;

      await supabase.rpc("activate_portal_access");

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role,is_active")
        .eq("id", data.session.user.id)
        .single();

      if (!profile?.is_active) return;

      if (profile.role === "student") router.replace("/student");
      else if (profile.role === "parent") router.replace("/parent");
      else router.replace("/dashboard");
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

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (!userId) {
      await supabase.auth.signOut();
      setMessage("Could not verify your Orbit access.");
      return;
    }

    await supabase.rpc("activate_portal_access");

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role,is_active")
      .eq("id", userId)
      .single();

    if (!profile?.is_active) {
      await supabase.auth.signOut();
      setMessage("Your Orbit access is not active yet.");
      return;
    }

    if (remember) {
      localStorage.setItem("orbit_remember_email", email.trim());
    } else {
      localStorage.removeItem("orbit_remember_email");
    }

    if (profile.role === "student") router.replace("/student");
    else if (profile.role === "parent") router.replace("/parent");
    else router.replace("/dashboard");
  }

  async function forgotPassword() {
    setMessage("");

    if (!email.trim()) {
      setMessage("Enter your email first, then click Forgot password.");
      return;
    }

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : undefined;

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

    if (!requestName.trim() || !requestEmail.trim() || !requestRole) {
      setRequestMessage("Enter your name, email and select a role.");
      return;
    }

    setRequestLoading(true);

    const { error } = await supabase.rpc("submit_access_request", {
      p_full_name: requestName.trim(),
      p_email: requestEmail.trim().toLowerCase(),
      p_requested_role: requestRole,
    });

    setRequestLoading(false);

    if (error) {
      setRequestMessage(error.message);
      return;
    }

    setRequestMessage(
      "Access request submitted. An Admin will review it in Orbit."
    );
    setRequestName("");
    setRequestEmail("");
    setRequestRole("");
  }

  async function activateApprovedAccess(event: FormEvent) {
    event.preventDefault();
    setActivateMessage("");

    const cleanEmail = activateEmail.trim().toLowerCase();

    if (!cleanEmail || !activatePassword || !activateConfirm) {
      setActivateMessage("Enter your email and create a password.");
      return;
    }

    if (activatePassword.length < 8) {
      setActivateMessage("Password must be at least 8 characters.");
      return;
    }

    if (activatePassword !== activateConfirm) {
      setActivateMessage("Passwords do not match.");
      return;
    }

    setActivateLoading(true);

    const { data: approved, error: approvalError } = await supabase.rpc(
      "approved_access_exists",
      { p_email: cleanEmail }
    );

    if (approvalError) {
      setActivateLoading(false);
      setActivateMessage(approvalError.message);
      return;
    }

    const { data: portalApproved, error: portalApprovalError } =
      await supabase.rpc("portal_access_grant_exists", {
        p_email: cleanEmail,
      });

    if (portalApprovalError) {
      setActivateLoading(false);
      setActivateMessage(portalApprovalError.message);
      return;
    }

    if (!approved && !portalApproved) {
      setActivateLoading(false);
      setActivateMessage("Your access has not been approved yet.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: activatePassword,
    });

    setActivateLoading(false);

    if (error) {
      const lower = error.message.toLowerCase();
      if (lower.includes("already") || lower.includes("registered")) {
        setActivateMessage(
          "An account already exists for this email. Use Sign in or Forgot password."
        );
      } else {
        setActivateMessage(error.message);
      }
      return;
    }

    if (data.session) {
      const { data: portalRole } = await supabase.rpc(
        "activate_portal_access"
      );

      if (portalRole === "student") router.replace("/student");
      else if (portalRole === "parent") router.replace("/parent");
      else router.replace("/dashboard");
      return;
    }

    setActivateMessage(
      "Account created. Check your email if confirmation is required, then sign in."
    );
    setActivatePassword("");
    setActivateConfirm("");
  }

  return (
    <main className="login-shell">
      <section className={`login-panel ${requestOpen || activateOpen ? "request-is-open" : ""}`}>
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
              onClick={() => {
                setRequestOpen((value) => !value);
                setActivateOpen(false);
              }}
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
                    <span>Name</span>
                    <input
                      value={requestName}
                      onChange={(e) => setRequestName(e.target.value)}
                      placeholder="Enter your name"
                    />
                  </label>

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
                  {requestLoading ? "Submitting..." : "Submit Request"}
                </button>
              </form>
            )}

            <button
              type="button"
              className={`request-access-toggle ${activateOpen ? "active" : ""}`}
              style={{ marginLeft: 18 }}
              onClick={() => {
                setActivateOpen((value) => !value);
                setRequestOpen(false);
              }}
            >
              <span className="request-radio">
                {activateOpen && <span className="request-radio-dot" />}
              </span>
              <span>Activate Approved Access</span>
            </button>

            {activateOpen && (
              <form className="request-access-form" onSubmit={activateApprovedAccess}>
                <div className="request-grid">
                  <label>
                    <span>Email</span>
                    <input
                      type="email"
                      value={activateEmail}
                      onChange={(e) => setActivateEmail(e.target.value)}
                      placeholder="Approved email"
                    />
                  </label>

                  <label>
                    <span>Create Password</span>
                    <input
                      type="password"
                      value={activatePassword}
                      onChange={(e) => setActivatePassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                    />
                  </label>

                  <label>
                    <span>Confirm Password</span>
                    <input
                      type="password"
                      value={activateConfirm}
                      onChange={(e) => setActivateConfirm(e.target.value)}
                      placeholder="Repeat password"
                    />
                  </label>
                </div>

                {activateMessage && (
                  <div className="request-message">{activateMessage}</div>
                )}

                <button
                  type="submit"
                  className="request-submit"
                  disabled={activateLoading}
                >
                  {activateLoading ? "Activating..." : "Activate Access"}
                </button>
              </form>
            )}
          </div>
        </div>

        <img
          className="brand-characters"
          src="/igebra-characters.png"
          alt="igebra brand characters"
        />
      </section>

      <section className="hero-panel" aria-label="Orbit education technology visual">
        <div className="hero-image" />
        <div className="hero-vignette" />
      </section>
    </main>
  );
}
