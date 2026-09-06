from pathlib import Path

page_path = Path("app/page.tsx")
css_path = Path("app/globals.css")

for path in (page_path, css_path):
    if not path.exists():
        raise SystemExit(f"Could not find {path}. Run this from the Orbit repository root.")

page = page_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

# Keep the overall split-screen fixed. We no longer resize/reflow the white panel
# when Request Access or Activate Approved Access is selected.
page = page.replace(
    '<section className={`login-panel ${requestOpen || activateOpen ? "request-is-open" : ""}`}>',
    '<section className="login-panel">'
)

start = page.find('          <div className="login-copy">')
image_anchor = page.find('        <img\n          className="brand-characters"')

if start == -1 or image_anchor == -1 or image_anchor <= start:
    raise SystemExit("Could not locate the login content block to replace.")

new_content = r'''          <div className="login-stage">
            {!requestOpen && !activateOpen && (
              <div className="login-view login-view-enter">
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

                <div className="login-mode-actions">
                  <button
                    type="button"
                    className="login-mode-card"
                    onClick={() => {
                      setRequestOpen(true);
                      setActivateOpen(false);
                      setRequestMessage("");
                    }}
                  >
                    <span className="login-mode-icon">+</span>
                    <span>
                      <strong>Request Access</strong>
                      <small>New to Orbit</small>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="login-mode-card login-mode-card-accent"
                    onClick={() => {
                      setActivateOpen(true);
                      setRequestOpen(false);
                      setActivateMessage("");
                    }}
                  >
                    <span className="login-mode-icon">✓</span>
                    <span>
                      <strong>Activate Access</strong>
                      <small>Already approved</small>
                    </span>
                  </button>
                </div>
              </div>
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
                  <p>Submit your details for review by an Orbit administrator.</p>
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

                    <label className="access-full">
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

'''

page = page[:start] + new_content + page[image_anchor:]

marker = "/* ORBIT LOGIN SEAMLESS ACCESS SWITCH */"
if marker not in css:
    css += r'''

/* ORBIT LOGIN SEAMLESS ACCESS SWITCH */

/*
  The left and right halves never resize when a user switches modes.
  Only the form content changes inside a fixed stage.
*/
.login-panel{
  overflow:hidden;
}

.login-content{
  width:min(100%,520px);
}

.login-stage{
  position:relative;
  min-height:470px;
  width:100%;
}

.login-view{
  width:100%;
}

.login-view-enter{
  animation:orbitLoginViewIn .22s ease-out both;
}

@keyframes orbitLoginViewIn{
  from{
    opacity:0;
    transform:translateY(6px);
  }
  to{
    opacity:1;
    transform:translateY(0);
  }
}

/* Professional secondary actions instead of expanding radio forms */
.login-mode-actions{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
  margin-top:18px;
}

.login-mode-card{
  min-height:64px;
  border:1px solid #d7e2df;
  border-radius:12px;
  padding:10px 12px;
  background:linear-gradient(145deg,#ffffff,#f6f9f8);
  color:#193436;
  display:flex;
  align-items:center;
  gap:10px;
  text-align:left;
  cursor:pointer;
  box-shadow:0 6px 16px rgba(31,78,75,.055);
  transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease;
}

.login-mode-card:hover{
  transform:translateY(-1px);
  border-color:#a9c8c4;
  box-shadow:0 8px 20px rgba(31,78,75,.085);
}

.login-mode-card-accent{
  border-color:#efc59d;
  background:linear-gradient(145deg,#ffffff,#fff6ed);
}

.login-mode-icon{
  width:34px;
  height:34px;
  flex:0 0 auto;
  display:grid;
  place-items:center;
  border-radius:10px;
  background:#e8f4f2;
  color:#0f5e61;
  font-size:16px;
  font-weight:850;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.9);
}

.login-mode-card-accent .login-mode-icon{
  background:#fff0e3;
  color:#b86a2d;
}

.login-mode-card strong,
.login-mode-card small{
  display:block;
}

.login-mode-card strong{
  font-size:12px;
  line-height:1.15;
}

.login-mode-card small{
  margin-top:3px;
  color:#758684;
  font-size:9.5px;
}

/* Access-mode header */
.login-back{
  margin:0 0 22px;
  padding:0;
  border:0;
  background:transparent;
  color:#0f5e61;
  font-size:11px;
  font-weight:760;
  cursor:pointer;
}

.login-back:hover{
  text-decoration:underline;
}

.login-copy-access{
  margin-bottom:20px;
}

.login-view-eyebrow{
  display:block;
  margin-bottom:7px;
  color:#d9853b;
  font-size:9.5px;
  font-weight:900;
  letter-spacing:1.05px;
}

.login-copy-access h1{
  font-size:34px;
  margin:0;
}

.login-copy-access p{
  margin:6px 0 0;
  max-width:430px;
}

/* Standalone access form: same footprint as sign-in area */
.access-standalone-form{
  margin-top:0;
  padding:16px;
  border-radius:14px;
  background:rgba(255,255,255,.94);
  box-shadow:0 10px 26px rgba(31,78,75,.07);
}

.access-standalone-form .request-grid{
  gap:12px;
}

.access-standalone-form input,
.access-standalone-form select{
  height:42px;
  border-radius:9px;
  font-size:12px;
}

.access-full{
  grid-column:1/-1;
}

.access-primary-button{
  height:42px;
  border-radius:9px;
  font-size:12px;
  box-shadow:0 5px 12px rgba(217,133,59,.13);
}

.login-view-footer{
  display:flex;
  justify-content:center;
  align-items:center;
  gap:5px;
  margin-top:16px;
  color:#7a8987;
  font-size:10.5px;
}

.login-view-footer button{
  border:0;
  background:transparent;
  color:#0f5e61;
  font-size:10.5px;
  font-weight:800;
  cursor:pointer;
  padding:0;
}

.login-view-footer button:hover{
  text-decoration:underline;
}

/* Previous "open panel" rules are intentionally neutralized */
.login-panel.request-is-open{
  justify-content:center;
  overflow:hidden;
  padding:26px clamp(42px,5vw,82px) 118px;
}

@media(max-height:820px) and (min-width:1001px){
  .brand-lockup{
    margin-bottom:16px;
  }

  .orbit-mark{
    width:52px;
    height:52px;
  }

  .brand-name{
    font-size:50px;
  }

  .brand-sub{
    font-size:14px;
  }

  .login-stage{
    min-height:430px;
  }

  .login-copy h1{
    font-size:32px;
  }

  .login-copy p{
    margin-bottom:15px;
  }

  .input-3d{
    min-height:46px;
  }

  .input-3d input{
    height:43px;
  }

  .signin-button{
    height:48px;
  }

  .login-mode-actions{
    margin-top:14px;
  }

  .login-mode-card{
    min-height:58px;
  }

  .login-back{
    margin-bottom:16px;
  }

  .login-copy-access{
    margin-bottom:14px;
  }

  .access-standalone-form{
    padding:13px;
  }
}

@media(max-width:620px){
  .login-stage{
    min-height:520px;
  }

  .login-mode-actions{
    grid-template-columns:1fr;
  }

  .access-full{
    grid-column:auto;
  }

  .login-copy-access h1{
    font-size:29px;
  }
}

@media(prefers-reduced-motion:reduce){
  .login-view-enter{
    animation:none;
  }
}
'''

page_path.write_text(page, encoding="utf-8")
css_path.write_text(css, encoding="utf-8")

print("Orbit seamless access switch applied.")
print("- No screen resize/reflow")
print("- Sign in / Request Access / Activate Access swap in-place")
print("- Smooth subtle transition")
print("- UI only - no database changes")
