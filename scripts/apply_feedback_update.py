from pathlib import Path

login_path = Path("app/page.tsx")
css_path = Path("app/globals.css")
leads_path = Path("app/crm/leads/page.tsx")
smart_path = Path("app/crm/leads/SmartLeadImport.tsx")

for p in (login_path, css_path, leads_path, smart_path):
    if not p.exists():
        raise SystemExit(f"Missing {p}")

login = login_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")
leads = leads_path.read_text(encoding="utf-8")
smart = smart_path.read_text(encoding="utf-8")

# Australia in manual CRM country list.
anchor = '  { name: "Canada", code: "+1" },\n'
entry = '  { name: "Australia", code: "+61" },\n'
if entry not in leads:
    if anchor not in leads:
        raise SystemExit("CRM country list not found.")
    leads = leads.replace(anchor, anchor + entry, 1)

# Australia in Smart Import country normalization.
anchor2 = '  { name: "Canada", code: "+1", aliases: ["canada","ca"] },\n'
entry2 = '  { name: "Australia", code: "+61", aliases: ["australia","au","aus"] },\n'
if entry2 not in smart:
    if anchor2 not in smart:
        raise SystemExit("Smart Import country list not found.")
    smart = smart.replace(anchor2, anchor2 + entry2, 1)

# Public login roles.
old_roles = '''const roles = [
  "Admin",
  "Sales Admin",
  "Marketing",
  "Trainer",
  "Finance Admin",
];'''
new_roles = 'const PUBLIC_ACCESS_ROLES = ["Student", "Parent"];'
if old_roles in login:
    login = login.replace(old_roles, new_roles, 1)
elif "PUBLIC_ACCESS_ROLES" not in login:
    raise SystemExit("Login roles block not found.")

login = login.replace(
    'setRequestMessage("Enter your name, email and select a role.");',
    'setRequestMessage("Enter your name, email and choose Student or Parent.");'
)

old_field = '''                    <label className="access-full">
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
                    </label>'''

new_field = '''                    <div className="access-full public-access-role">
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
                    </div>'''

if old_field in login:
    login = login.replace(old_field, new_field, 1)
elif "public-access-role-options" not in login:
    raise SystemExit("Request Access role dropdown not found.")

login = login.replace(
    "<p>Submit your details for review by an Orbit administrator.</p>",
    "<p>Student and parent portal access requests are reviewed by an Orbit administrator.</p>",
    1,
)

marker = "/* ORBIT PUBLIC ACCESS STUDENT PARENT */"
if marker not in css:
    css += r'''

/* ORBIT PUBLIC ACCESS STUDENT PARENT */
.public-access-role{display:block}
.public-access-role-label{display:block;margin-bottom:6px;color:#58706f;font-size:10px;font-weight:850;text-transform:uppercase}
.public-access-role-options{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.public-access-role-card{min-height:58px;border:1px solid #d7e2df;border-radius:11px;padding:9px 10px;background:linear-gradient(145deg,#fff,#f7faf9);color:#193436;display:flex;align-items:center;gap:9px;text-align:left;cursor:pointer;box-shadow:0 5px 14px rgba(31,78,75,.045);transition:transform .14s ease,border-color .14s ease,box-shadow .14s ease}
.public-access-role-card:hover{transform:translateY(-1px);border-color:#a8c7c3;box-shadow:0 7px 17px rgba(31,78,75,.075)}
.public-access-role-card-active{border-color:#558C89;background:linear-gradient(145deg,#fff,#eaf5f3);box-shadow:0 0 0 2px rgba(85,140,137,.10),0 7px 17px rgba(31,78,75,.075)}
.public-access-role-icon{width:31px;height:31px;flex:0 0 auto;display:grid;place-items:center;border-radius:9px;background:#e9f4f2;color:#0f5e61;font-size:12px;font-weight:900}
.public-access-role-card-active .public-access-role-icon{background:#558C89;color:#fff}
.public-access-role-card strong,.public-access-role-card small{display:block}
.public-access-role-card strong{font-size:11px;line-height:1.1}
.public-access-role-card small{margin-top:3px;color:#758684;font-size:8.8px;line-height:1.25}
.public-access-role-note{display:block;margin-top:6px;color:#7b8a88;font-size:9px;line-height:1.35}
@media(max-width:520px){.public-access-role-options{grid-template-columns:1fr}}
'''

login_path.write_text(login, encoding="utf-8")
css_path.write_text(css, encoding="utf-8")
leads_path.write_text(leads, encoding="utf-8")
smart_path.write_text(smart, encoding="utf-8")

print("Applied.")
