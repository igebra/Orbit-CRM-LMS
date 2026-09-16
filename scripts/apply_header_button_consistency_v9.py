from pathlib import Path

page_path = Path("app/batches/page.tsx")
css_path = Path("app/lms.module.css")

for p in (page_path, css_path):
    if not p.exists():
        raise SystemExit(f"Missing {p}. Run this from the Orbit repository root.")

page = page_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

# ============================================================
# 1) Put Add Batch into the same header-actions container used
#    by the Batch detail page.
# ============================================================

old = '''          {canAdmin && (
            <button className={styles.primary} onClick={() => setModalOpen(true)}>
              + Add Batch
            </button>
          )}'''

new = '''          {canAdmin && (
            <div className={styles.headerActions}>
              <button className={styles.primary} onClick={() => setModalOpen(true)}>
                + Add Batch
              </button>
            </div>
          )}'''

if old in page:
    page = page.replace(old, new, 1)
elif '<div className={styles.headerActions}>' not in page:
    raise SystemExit("Could not locate Add Batch header button.")

page_path.write_text(page, encoding="utf-8")

# ============================================================
# 2) Standardize all top-right header buttons.
# ============================================================

marker = "/* ORBIT HEADER BUTTON CONSISTENCY V9 */"
if marker not in css:
    css += r'''

/* ORBIT HEADER BUTTON CONSISTENCY V9 */
.headerActions{
  display:flex;
  align-items:center;
  justify-content:flex-end;
  gap:8px;
  margin-left:auto;
  align-self:flex-start;
  flex-wrap:wrap;
}

.headerActions .primary,
.headerActions .secondary{
  height:38px;
  min-height:38px;
  min-width:108px;
  padding:0 13px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border-radius:9px;
  font-family:inherit;
  font-size:11px;
  font-weight:800;
  line-height:1;
  letter-spacing:0;
  white-space:nowrap;
  box-shadow:none;
  margin:0;
}

.headerActions .primary{
  border:1px solid #cf7c34;
  background:#df8a3c;
  color:#fff;
}

.headerActions .primary:hover{
  background:#d98032;
}

.headerActions .secondary{
  border:1px solid #cfddda;
  background:#fff;
  color:#0f5e61;
}

.headerActions .secondary:hover{
  background:#f5f9f8;
  border-color:#aec8c4;
}

@media(max-width:1050px){
  .headerActions{
    width:100%;
    justify-content:flex-start;
    margin-left:0;
  }
}

@media(max-width:620px){
  .headerActions{
    gap:6px;
  }

  .headerActions .primary,
  .headerActions .secondary{
    min-width:0;
    flex:1 1 auto;
  }
}
'''

css_path.write_text(css, encoding="utf-8")

print("Applied:")
print("- Add Batch now uses the shared header-actions container")
print("- Top-right header buttons have one height, font, padding and radius")
print("- Primary/secondary differ only by color treatment")
print("- Header action placement is consistent across Batches and Batch detail")
print("- No SQL / no database changes")
