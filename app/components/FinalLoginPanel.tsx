"use client";

import type { FormEvent, ReactNode } from "react";
import styles from "../login-final.module.css";

type Props = {
  email: string;
  password: string;
  remember: boolean;
  showPassword: boolean;
  loading: boolean;
  message: string;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onRemember: (checked: boolean) => void;
  onTogglePassword: () => void;
  onSignIn: (event: FormEvent<HTMLFormElement>) => void;
  onForgotPassword: () => void;
  onSignUp: () => void;
  afterMessage?: ReactNode;
};

/** Orbit's approved 2026 desktop login; fully interactive, never a form screenshot. */
export default function FinalLoginPanel({
  email,password,remember,showPassword,loading,message,onEmail,onPassword,
  onRemember,onTogglePassword,onSignIn,onForgotPassword,onSignUp,
  afterMessage,
}: Props) {
  return (
    <div className={styles.signIn}>
      <header className={styles.intro}>
        <h1>Welcome back</h1>
        <p>Continue your journey in Quantum, AI, Math and Coding with Orbit.</p>
      </header>

      <form className={styles.form} onSubmit={onSignIn}>
        <label className={styles.field}>
          <span className={styles.srOnly}>Email address</span>
          <div className={styles.inputWrap}>
            <span className={styles.inputIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24"><rect x="2.5" y="4.5" width="19" height="15" rx="2"/>
                <path d="m3.5 6 8.5 7 8.5-7"/></svg>
            </span>
            <input required type="email" autoComplete="email"
              value={email} onChange={event=>onEmail(event.target.value)}
              placeholder="Email address" />
          </div>
        </label>
        <label className={styles.field}>
          <span className={styles.srOnly}>Password</span>
          <div className={styles.inputWrap}>
            <span className={styles.inputIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/>
                <path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
            </span>
            <input required type={showPassword ? "text":"password"}
              autoComplete="current-password"
              value={password} onChange={event=>onPassword(event.target.value)}
              placeholder="Password"/>
            <button className={styles.showPassword} type="button"
              onClick={onTogglePassword}
              aria-label={showPassword ? "Hide password":"Show password"}
              aria-pressed={showPassword}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.2 12s3.7-6 9.8-6 9.8 6 9.8 6-3.7 6-9.8 6-9.8-6-9.8-6Z"/>
                <circle cx="12" cy="12" r="2.8"/>
                {!showPassword && <path d="M3 21 21 3"/>}
              </svg>
            </button>
          </div>
        </label>
        <div className={styles.options}>
          <label className={styles.remember}>
            <input type="checkbox" checked={remember}
              onChange={event=>onRemember(event.target.checked)} />
            <span>Remember me</span>
          </label>
          <button type="button" className={styles.link} onClick={onForgotPassword}>
            Forgot password?
          </button>
        </div>

        {message && <div className={styles.message} role="status">{message}</div>}
        {afterMessage}

        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"} <span aria-hidden="true">→</span>
        </button>
      </form>
      <div className={styles.divider}>or</div>
      <div className={styles.secondary}>
        <span className={styles.newUser}>New user?</span>
        <button type="button" onClick={onSignUp}>Sign up for access</button>
      </div>
    </div>
  );
}
