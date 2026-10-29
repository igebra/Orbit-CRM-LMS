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

const TEAM_DEPARTMENTS = ["Marketing", "Sales", "CX", "Admin", "Management", "Finance"];

// CRM authentication is internal-only. LMS roles must never enter the CRM dashboard.
const CRM_ALLOWED_ROLES = new Set([
  "super_admin", "admin", "sales", "sales_marketing",
  "marketing", "accounts_finance", "viewer_management",
]);

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [requestEmail, setRequestEmail] = useState("");
  const [requestDepartment, setRequestDepartment] = useState("");
  const [requestCountryCode, setRequestCountryCode] = useState("+91");
  const [requestPhone, setRequestPhone] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");

  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupAccountId, setSignupAccountId] = useState("");
  const [signupAccountEmail, setSignupAccountEmail] = useState("");
  const [requestSubmitted, setRequestSubmitted] = useState(false);
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

      if (!profile?.is_active || !CRM_ALLOWED_ROLES.has(profile.role)) return;
      router.replace("/dashboard");
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

    if (!CRM_ALLOWED_ROLES.has(profile.role)) {
      await supabase.auth.signOut();
      setMessage("This account does not have CRM access. Please use Orbit LMS.");
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
    const cleanEmail = (targetEmail || email).trim().toLowerCase();

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

    setMessage(text);

    if (!error) setNeedsConfirmation(true);
  }

  async function submitAccessRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestLoading || requestSubmitted) return;
    setRequestMessage("");
    const cleanName = requestName.trim();
    const cleanEmail = requestEmail.trim().toLowerCase();
    if (cleanName.length < 2 || !cleanEmail || !TEAM_DEPARTMENTS.includes(requestDepartment)) {
      setRequestMessage("Complete your name, email and role.");
      return;
    }
    // Do not create an Auth account if the phone is blank or just a dialling code.
    const countryCode = requestCountryCode.trim();
    const nationalDigits = requestPhone.replace(/[\s()-]/g, "");
    const phone = countryCode + nationalDigits;
    if (!/^\+[1-9][0-9]{0,3}$/.test(countryCode) ||
        !/^[0-9]{6,14}$/.test(nationalDigits) ||
        phone.replace(/\D/g, "").length > 15) {
      setRequestMessage("Enter a valid phone number. You can change +91 to +1 (US) or another country code.");
      return;
    }
    if (signupPassword.length < 8) {
      setRequestMessage("Password must contain at least 8 characters.");
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setRequestMessage("The passwords do not match.");
      return;
    }
    setRequestLoading(true);

    // Retry after a transient access-request failure without attempting a
    // second Supabase Auth signup for the same newly created user.
    let authUserId = signupAccountEmail === cleanEmail ? signupAccountId : "";
    if (!authUserId) {
      const emailRedirectTo = window.location.origin + "/?confirmed=1";
      const { data: signup, error: signupError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: signupPassword,
        options: { emailRedirectTo, data: { full_name: cleanName } },
      });
      if (signupError || !signup.user?.id || signup.user.identities?.length === 0) {
        setRequestLoading(false);
        setRequestMessage(signupError?.message ||
          "This email may already have an account. Use Sign in or Forgot password.");
        return;
      }
      authUserId = signup.user.id;
      setSignupAccountId(authUserId);
      setSignupAccountEmail(cleanEmail);
      // An unapproved user must never remain signed in after signup.
      if (signup.session) await supabase.auth.signOut();
    }
    const { error: requestError } = await supabase.rpc("submit_crm_password_signup_request", {
      p_full_name: cleanName,
      p_email: cleanEmail,
      p_phone: phone,
      p_department: requestDepartment,
      p_auth_user_id: authUserId,
    });
    setRequestLoading(false);
    if (requestError) {
      setRequestMessage("Account created, but the access request failed: " +
        requestError.message + ". Retry or contact your Superadmin.");
      return;
    }
    setRequestSubmitted(true);
    setSignupPassword("");
    setSignupConfirmPassword("");
    setRequestMessage(
      "Account created. Confirm your email if prompted, then wait for Superadmin approval. Once approved, sign in with your password. No separate activation is needed."
    );
  }

  return (
    <main className={styles.shell}>
      <section className={styles.formSide} aria-label="Orbit secure sign in">
        <div className={styles.card}>
          <img className={styles.logo} src="/orbit-logo.svg" alt="Orbit by igebra.ai" />
          <div className={styles.stage}>
            {!requestOpen && (
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
                onSignUp={() => {
                  setRequestOpen(true);
                  setMessage("");
                  setRequestMessage("");
                }}
                afterMessage={needsConfirmation ? <button type="button" className={styles.link}
                  onClick={() => resendConfirmation(email)}>Resend confirmation email</button> : null}
              />
            )}

            {requestOpen && (
              <section className={styles.signupView} aria-label="Create CRM account">
                <button className={styles.signupBack} type="button"
                  onClick={() => {setRequestOpen(false);setRequestMessage("");}}>
                  ← Back to sign in
                </button>
                <header className={styles.signupTitle}>
                  <span>ORBIT CRM / TEAM ACCESS</span>
                  <h1>Create your account</h1>
                  <p>Your workspace opens after Superadmin approval.</p>
                </header>
                <form className={styles.signupForm} onSubmit={submitAccessRequest}>
                  <div className={styles.signupGrid}>
                    <label className={styles.signupField}>
                      <span>Full name</span>
                      <input required maxLength={120} autoComplete="name"
                        value={requestName} disabled={requestSubmitted || !!signupAccountId}
                        onChange={e=>setRequestName(e.target.value)} placeholder="Your full name"/>
                    </label>
                    <label className={styles.signupField}>
                      <span>Work email</span>
                      <input required type="email" autoComplete="email"
                        value={requestEmail} disabled={requestSubmitted || !!signupAccountId}
                        onChange={e=>setRequestEmail(e.target.value)} placeholder="name@company.com"/>
                    </label>
                    <label className={styles.signupField}>
                      <span>Phone number</span>
                      <div className={styles.phonePair}>
                        <input aria-label="Editable country calling code" title="Type any country code"
                          required type="tel" inputMode="tel" list="crm-country-codes"
                          value={requestCountryCode} disabled={requestSubmitted}
                          onChange={e=>setRequestCountryCode(e.target.value)} placeholder="+91"/>
                        <datalist id="crm-country-codes">
                          <option value="+91">India</option>
                          <option value="+1">US / Canada</option>
                          <option value="+971">UAE</option>
                          <option value="+44">UK</option>
                          <option value="+966">Saudi Arabia</option>
                          <option value="+974">Qatar</option>
                        </datalist>
                        <input required type="tel" autoComplete="tel-national" inputMode="tel"
                          value={requestPhone} disabled={requestSubmitted}
                          onChange={e=>setRequestPhone(e.target.value)} placeholder="Phone number"/>
                      </div>
                      <small className={styles.phoneHelp}>Country code is editable. Use +1 for US numbers.</small>
                    </label>
                    <label className={styles.signupField}>
                      <span>Your role</span>
                      <select required value={requestDepartment} disabled={requestSubmitted}
                        onChange={e=>setRequestDepartment(e.target.value)}>
                        <option value="">Select your role</option>
                        {TEAM_DEPARTMENTS.map(dept=><option key={dept} value={dept}>{dept}</option>)}
                      </select>
                    </label>
                    <label className={styles.signupField}>
                      <span>Create password</span>
                      <div className={styles.signupPasswordWrap}>
                        <input type={showSignupPassword?"text":"password"} minLength={8}
                          required autoComplete="new-password" disabled={requestSubmitted}
                          value={signupPassword} onChange={e=>setSignupPassword(e.target.value)}
                          placeholder="Minimum 8 characters"/>
                        <button type="button" aria-label={showSignupPassword?"Hide passwords":"Show passwords"}
                          onClick={()=>setShowSignupPassword(v=>!v)} aria-pressed={showSignupPassword}>
                          {showSignupPassword?"Hide":"Show"}
                        </button>
                      </div>
                    </label>
                    <label className={styles.signupField}>
                      <span>Confirm password</span>
                      <input type={showSignupPassword?"text":"password"} required
                        autoComplete="new-password" disabled={requestSubmitted}
                        value={signupConfirmPassword} onChange={e=>setSignupConfirmPassword(e.target.value)}
                        placeholder="Repeat your password"/>
                    </label>
                  </div>
                  <p className={styles.passwordHint}>Use a unique password of at least 8 characters.</p>
                  {requestMessage && <div className={requestSubmitted?styles.signupSuccess:styles.signupError}
                    role="status">{requestMessage}</div>}
                  <button className={styles.signupSubmit} type="submit"
                    disabled={requestLoading||requestSubmitted}>
                    {requestSubmitted?"Request submitted":requestLoading?"Creating account…":"Create Account & Request Access"}
                    {!requestSubmitted&&<span aria-hidden="true">→</span>}
                  </button>
                </form>
                <div className={styles.signupFooter}>
                  Already have an account? <button type="button"
                    onClick={()=>{setRequestOpen(false);setRequestMessage("");}}>
                    Sign in
                  </button>
                </div>
              </section>
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
