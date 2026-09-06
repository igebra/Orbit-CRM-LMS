from pathlib import Path

path = Path("app/globals.css")
if not path.exists():
    raise SystemExit("Could not find app/globals.css. Run this from the Orbit repository root.")

css = path.read_text(encoding="utf-8")

marker = "/* ORBIT LOGIN OPEN-PANEL POLISH */"

if marker not in css:
    css += r'''

/* ORBIT LOGIN OPEN-PANEL POLISH */

/*
  Compact only when Request Access or Activate Approved Access is open.
  Closed login view stays unchanged.
*/
.login-panel.request-is-open{
  justify-content:flex-start;
  overflow-y:auto;
  padding-top:18px;
  padding-bottom:72px;
  scrollbar-width:thin;
  scrollbar-color:rgba(85,140,137,.28) transparent;
}

.login-panel.request-is-open .login-content{
  width:min(100%,520px);
}

/* Brand stays fully visible instead of getting cropped at the top */
.login-panel.request-is-open .brand-lockup{
  gap:12px;
  margin-bottom:12px;
}

.login-panel.request-is-open .orbit-mark{
  width:48px;
  height:48px;
  border-width:4px;
}

.login-panel.request-is-open .orbit-dot-teal{
  width:7px;
  height:7px;
  right:3px;
  top:7px;
}

.login-panel.request-is-open .orbit-dot-orange{
  width:13px;
  height:13px;
  right:-5px;
  top:-3px;
}

.login-panel.request-is-open .brand-name{
  font-size:46px;
  line-height:.9;
  letter-spacing:-2.4px;
}

.login-panel.request-is-open .brand-sub{
  margin-top:4px;
  font-size:13px;
}

/* Slightly smaller heading and tighter spacing */
.login-panel.request-is-open .login-copy h1{
  font-size:30px;
  letter-spacing:-.8px;
}

.login-panel.request-is-open .login-copy p{
  margin:4px 0 13px;
  font-size:12.5px;
}

/* Compact login controls */
.login-panel.request-is-open .login-form{
  gap:9px;
}

.login-panel.request-is-open .login-form>label>span,
.login-panel.request-is-open .request-access-form label>span{
  margin-bottom:4px;
  font-size:10.5px;
}

.login-panel.request-is-open .input-3d{
  min-height:43px;
  padding:0 13px;
  border-radius:10px;
  box-shadow:5px 5px 13px rgba(75,100,98,.10),
             -5px -5px 12px rgba(255,255,255,.85),
             inset 1px 1px 0 rgba(255,255,255,.9);
}

.login-panel.request-is-open .input-3d input{
  height:41px;
  font-size:12.5px;
}

.login-panel.request-is-open .field-icon{
  font-size:15px;
}

.login-panel.request-is-open .show-password,
.login-panel.request-is-open .text-link{
  font-size:10.5px;
}

.login-panel.request-is-open .remember-row{
  font-size:10.5px;
}

.login-panel.request-is-open .remember-row input{
  width:14px;
  height:14px;
}

.login-panel.request-is-open .signin-button{
  height:46px;
  border-radius:11px;
  padding:0 16px 0 20px;
  font-size:15px;
  box-shadow:0 4px 0 #073c40,
             0 9px 16px rgba(14,78,78,.18),
             inset 0 2px 0 rgba(255,255,255,.22);
}

.login-panel.request-is-open .signin-arrow{
  font-size:22px;
}

/* Request / Activate controls */
.login-panel.request-is-open .request-access-block{
  margin-top:12px;
}

.login-panel.request-is-open .request-access-toggle{
  gap:6px;
  font-size:11.5px;
}

.login-panel.request-is-open .request-radio{
  width:15px;
  height:15px;
}

.login-panel.request-is-open .request-radio-dot{
  width:5px;
  height:5px;
}

/* Cleaner, denser access form */
.login-panel.request-is-open .request-access-form{
  margin-top:8px;
  padding:10px 11px;
  border-radius:11px;
  box-shadow:0 5px 15px rgba(31,78,75,.04);
}

.login-panel.request-is-open .request-grid{
  gap:7px 9px;
}

.login-panel.request-is-open .request-access-form input,
.login-panel.request-is-open .request-access-form select{
  height:34px;
  border-radius:7px;
  padding:0 8px;
  font-size:11px;
}

.login-panel.request-is-open .request-message{
  margin-top:6px;
  padding:6px 8px;
  font-size:10px;
}

.login-panel.request-is-open .request-submit{
  margin-top:7px;
  height:34px;
  border-radius:7px;
  font-size:11px;
}

/*
  Keep mascots decorative, fully out of the form controls,
  and smaller while an access panel is open.
*/
.login-panel.request-is-open .brand-characters{
  right:16px;
  left:auto;
  bottom:4px;
  width:128px;
  max-height:58px;
  opacity:.96;
}

/* Extra protection for laptop-height screens */
@media(max-height:820px) and (min-width:1001px){
  .login-panel.request-is-open{
    padding-top:12px;
    padding-bottom:58px;
  }

  .login-panel.request-is-open .brand-lockup{
    margin-bottom:8px;
  }

  .login-panel.request-is-open .orbit-mark{
    width:43px;
    height:43px;
  }

  .login-panel.request-is-open .brand-name{
    font-size:41px;
  }

  .login-panel.request-is-open .brand-sub{
    font-size:12px;
  }

  .login-panel.request-is-open .login-copy h1{
    font-size:27px;
  }

  .login-panel.request-is-open .login-copy p{
    margin-bottom:10px;
  }

  .login-panel.request-is-open .signin-button{
    height:43px;
  }

  .login-panel.request-is-open .request-access-block{
    margin-top:10px;
  }

  .login-panel.request-is-open .brand-characters{
    width:112px;
    max-height:50px;
  }
}

@media(max-width:620px){
  .login-panel.request-is-open{
    padding:18px 24px 70px;
  }

  .login-panel.request-is-open .brand-name{
    font-size:40px;
  }

  .login-panel.request-is-open .login-copy h1{
    font-size:27px;
  }

  .login-panel.request-is-open .brand-characters{
    right:12px;
    width:105px;
    max-height:48px;
  }
}
'''

path.write_text(css, encoding="utf-8")

print("Orbit login open-panel polish applied.")
print("UI only - no database changes.")
