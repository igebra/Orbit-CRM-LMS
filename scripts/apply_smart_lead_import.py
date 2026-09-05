from pathlib import Path
import re

page_path = Path("app/crm/leads/page.tsx")
css_path = Path("app/crm/leads/leads.module.css")

if not page_path.exists() or not css_path.exists():
    raise SystemExit("Could not find the Leads page. Run from Orbit-CRM-LMS root.")

page = page_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

component_import = 'import SmartLeadImport from "./SmartLeadImport";'
if component_import not in page:
    anchor = 'import OrbitSidebar from "../../components/OrbitSidebar";'
    if anchor not in page:
        raise SystemExit("Could not find OrbitSidebar import.")
    page = page.replace(anchor, anchor + "\n" + component_import, 1)

# Remove old hidden CSV-only picker if it still exists.
page = re.sub(
    r'\n\s*<input\n\s*ref=\{fileInputRef\}\n\s*type="file"\n\s*accept="\\.csv,text/csv"\n\s*hidden\n\s*onChange=\{importCsv\}\n\s*/>\n',
    "\n",
    page,
    count=1,
)

start_marker = "      {importModalOpen && canManageCrm && ("
end_marker = "\n\n      {followUpOpen && followUpLead && ("
start = page.find(start_marker)
end = page.find(end_marker, start)

if start == -1 or end == -1:
    raise SystemExit("Could not locate Import Leads modal. No patch applied.")

new_modal = '''      {importModalOpen && canManageCrm && (
        <div className={styles.modalBackdrop}>
          <div className={styles.importModal}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Smart Import Leads</h2>
                <p>
                  Upload Excel or CSV from almost any source. Orbit will detect
                  the header row, map columns automatically and show a preview
                  before anything is added to CRM.
                </p>
              </div>

              <button
                className={styles.closeButton}
                onClick={() => setImportModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.importBody}>
              <SmartLeadImport
                userId={userId}
                onImported={async (count, skipped) => {
                  setMessage(
                    `${count} lead(s) imported successfully${
                      skipped ? `. ${skipped} row(s) skipped.` : "."
                    }`
                  );
                  setImportModalOpen(false);
                  await loadLeads();
                }}
              />
            </div>
          </div>
        </div>
      )}'''

page = page[:start] + new_modal + page[end:]

# Widen modal for mapping and preview.
css = css.replace("width: min(680px, 94vw);", "width: min(1080px, 96vw);", 1)

block_start = css.find(".importModal {")
block_end = css.find("}", block_start)
if block_start != -1 and block_end != -1:
    block = css[block_start:block_end]
    if "max-height:" not in block:
        block = block.replace(
            "width: min(1080px, 96vw);",
            "width: min(1080px, 96vw);\\n  max-height: 92vh;\\n  overflow-y: auto;"
        )
    block = block.replace("\\n  overflow: hidden;", "")
    css = css[:block_start] + block + css[block_end:]

page_path.write_text(page, encoding="utf-8")
css_path.write_text(css, encoding="utf-8")
print("Smart Excel/CSV Lead Import patch applied.")
