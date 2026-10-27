"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import FinalLoginPanel from "./components/FinalLoginPanel";
import styles from "./login-final.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const PUBLIC_ACCESS_ROLES = ["Student", "Parent"];

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
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

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

    setNeedsConfirmation(false);

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

  async function resendConfirmation(targetEmail?: string) {
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

  async function submitAccessRequest(event: FormEvent) {
    event.preventDefault();
    setRequestMessage("");

    if (!requestName.trim() || !requestEmail.trim() || !requestRole) {
      setRequestMessage("Enter your name, email and choose Student or Parent.");
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

    const emailRedirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/?confirmed=1`
        : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: activatePassword,
      options: { emailRedirectTo },
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

    setNeedsConfirmation(true);
    setActivateMessage(
      "Account created. Confirm your email using the newest confirmation email, then return to Orbit and sign in."
    );
    setActivatePassword("");
    setActivateConfirm("");
  }

  return (
    <main className={styles.shell}>
      <section className={styles.formSide} aria-label="Orbit secure sign in">
        <div className={styles.card}>
          <img className={styles.logo} src="/orbit-logo.svg" alt="Orbit by igebra.ai" />
          <div className={styles.stage}>
            {!requestOpen && !activateOpen && (
              <FinalLoginPanel
                email={email}
                password={password}
                remember={remember}
                showPassword={showPassword}
                loading={loading}
                message={message}
                onEmail={setEmail}
                onPassword={setPassword}
                onRemember={setRemember}
                onTogglePassword={() => setShowPassword(current=>!current)}
                onSignIn={signIn}
                onForgotPassword={forgotPassword}
                onSignUp={() => {setRequestOpen(true);setActivateOpen(false);setRequestMessage("");}}
                onActivate={() => {setActivateOpen(true);setRequestOpen(false);setActivateMessage("");}}
                afterMessage={needsConfirmation ? <button type="button" className={styles.link}
                  onClick={() => resendConfirmation(email)}>Resend confirmation email</button> : null}
              />
            )}

            {requestOpen && (
              <div className="login-view login-view-enter">
                <button
                  type="button"
                  className="login-back"
                  onClick={() => {
                    setRequestOpen(false);
                    setRequestMessage("");
                  }}
                >
                  ← Back to sign in
                </button>

                <div className="login-copy login-copy-access">
                  <span className="login-view-eyebrow">ORBIT ACCESS</span>
                  <h1>Request access</h1>
                  <p>Student and parent portal access requests are reviewed by an Orbit administrator.</p>
                </div>

                <form className="request-access-form access-standalone-form" onSubmit={submitAccessRequest}>
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

                    <div className="access-full public-access-role">
                      <span className="public-access-role-label">Access for</span>
                      <div className="public-access-role-options">
                        {PUBLIC_ACCESS_ROLES.map((role) => (
                          <button
                            key={role}
                            type="button"
                            className={`public-access-role-card ${
                              requestRole === role ? "public-access-role-card-active" : ""
                            }`}
                            onClick={() => setRequestRole(role)}
                            aria-pressed={requestRole === role}
                          >
                            <span className="public-access-role-icon">
                              {role === "Student" ? "S" : "P"}
                            </span>
                            <span>
                              <strong>{role}</strong>
                              <small>
                                {role === "Student"
                                  ? "Student portal access"
                                  : "Parent / guardian portal access"}
                              </small>
                            </span>
                          </button>
                        ))}
                      </div>
                      <small className="public-access-role-note">
                        Internal team access is granted directly by an Orbit Admin.
                      </small>
                    </div>
                  </div>

                  {requestMessage && (
                    <div className="request-message">{requestMessage}</div>
                  )}

                  <button
                    type="submit"
                    className="request-submit access-primary-button"
                    disabled={requestLoading}
                  >
                    {requestLoading ? "Submitting..." : "Submit Request"}
                  </button>
                </form>

                <div className="login-view-footer">
                  <span>Already approved?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setRequestOpen(false);
                      setActivateOpen(true);
                      setRequestMessage("");
                    }}
                  >
                    Activate Access
                  </button>
                </div>
              </div>
            )}

            {activateOpen && (
              <div className="login-view login-view-enter">
                <button
                  type="button"
                  className="login-back"
                  onClick={() => {
                    setActivateOpen(false);
                    setActivateMessage("");
                  }}
                >
                  ← Back to sign in
                </button>

                <div className="login-copy login-copy-access">
                  <span className="login-view-eyebrow">APPROVED ACCESS</span>
                  <h1>Set up your account</h1>
                  <p>Use your approved email address and create your Orbit password.</p>
                </div>

                <form className="request-access-form access-standalone-form" onSubmit={activateApprovedAccess}>
                  <div className="request-grid">
                    <label className="access-full">
                      <span>Approved Email</span>
                      <input
                        type="email"
                        value={activateEmail}
                        onChange={(e) => setActivateEmail(e.target.value)}
                        placeholder="name@igebra.ai"
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
                    className="request-submit access-primary-button"
                    disabled={activateLoading}
                  >
                    {activateLoading ? "Activating..." : "Activate Access"}
                  </button>
                </form>

                <div className="login-view-footer">
                  <span>Not approved yet?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setActivateOpen(false);
                      setRequestOpen(true);
                      setActivateMessage("");
                    }}
                  >
                    Request Access
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </section>
      <section className={styles.artwork} aria-label="Orbit mascots exploring Quantum, AI, Math and Coding">
        <img className={styles.hero} src="/orbit-login-final-art.svg"
          alt="3D Orbit learning mascots exploring Quantum, AI, Math and Coding" />
      </section>
    </main>
  );
}
