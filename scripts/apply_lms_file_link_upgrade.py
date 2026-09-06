from pathlib import Path
import re

lms_page = Path("app/lms/page.tsx")
lms_css = Path("app/lms/lms.module.css")
portal_page = Path("app/portal/PortalDashboard.tsx")

for p in (lms_page, lms_css, portal_page):
    if not p.exists():
        raise SystemExit(f"Could not find {p}. Run from the Orbit-CRM-LMS root.")

page = lms_page.read_text(encoding="utf-8")
css = lms_css.read_text(encoding="utf-8")
portal = portal_page.read_text(encoding="utf-8")

# 1) App file limit
page = page.replace(
    'const MAX_FILE = 25 * 1024 * 1024;',
    'const MAX_FILE = 100 * 1024 * 1024;'
)

# 2) Resource model
old_resource_type = '''type Resource = {
  id: string;
  curriculum_session_id: string;
  resource_type: string;
  title: string;
  description: string | null;
  is_archived: boolean;
};'''

new_resource_type = '''type Resource = {
  id: string;
  curriculum_session_id: string;
  resource_type: string;
  title: string;
  description: string | null;
  external_url: string | null;
  is_archived: boolean;
};'''

if old_resource_type in page:
    page = page.replace(old_resource_type, new_resource_type, 1)
elif "external_url: string | null;" not in page:
    raise SystemExit("Could not patch LMS Resource type.")

# 3) URL validator
safe_anchor = '''function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");
}'''

url_helper = '''
function isValidExternalUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
'''

if "function isValidExternalUrl" not in page:
    if safe_anchor not in page:
        raise SystemExit("Could not find safeName helper.")
    page = page.replace(safe_anchor, safe_anchor + url_helper, 1)

# 4) Upload states
old_upload_state = '''  const [uploadOpen,setUploadOpen] = useState(false);
  const [uploadFile,setUploadFile] = useState<File|null>(null);
  const [upload,setUpload] = useState({session_number:"1",resource_type:"PPT / Deck",title:"",description:""});'''

new_upload_state = '''  const [uploadOpen,setUploadOpen] = useState(false);
  const [uploadFile,setUploadFile] = useState<File|null>(null);
  const [uploadMode,setUploadMode] = useState<"file"|"link">("file");
  const [externalUrl,setExternalUrl] = useState("");
  const [upload,setUpload] = useState({session_number:"1",resource_type:"PPT / Deck",title:"",description:""});'''

if old_upload_state in page:
    page = page.replace(old_upload_state, new_upload_state, 1)
elif "setUploadMode" not in page:
    raise SystemExit("Could not patch upload state.")

old_replace_state = '''  const [replaceResource,setReplaceResource] = useState<Resource|null>(null);
  const [replaceFile,setReplaceFile] = useState<File|null>(null);
  const [versionResource,setVersionResource] = useState<Resource|null>(null);'''

new_replace_state = '''  const [replaceResource,setReplaceResource] = useState<Resource|null>(null);
  const [replaceFile,setReplaceFile] = useState<File|null>(null);
  const [linkResource,setLinkResource] = useState<Resource|null>(null);
  const [editExternalUrl,setEditExternalUrl] = useState("");
  const [versionResource,setVersionResource] = useState<Resource|null>(null);'''

if old_replace_state in page:
    page = page.replace(old_replace_state, new_replace_state, 1)
elif "linkResource" not in page:
    raise SystemExit("Could not patch link editing state.")

# 5) Load external_url
old_select = 'supabase.from("lms_resources").select("id,curriculum_session_id,resource_type,title,description,is_archived").order("created_at",{ascending:false})'
new_select = 'supabase.from("lms_resources").select("id,curriculum_session_id,resource_type,title,description,external_url,is_archived").order("created_at",{ascending:false})'
page = page.replace(old_select, new_select)

# 6) openUpload reset
old_open_upload = '''  function openUpload(){
    setUpload({session_number:sessionFilter!=="All"?sessionFilter:String(sessions[0]?.session_number||1),resource_type:"PPT / Deck",title:"",description:""});
    setUploadFile(null); setUploadOpen(true);
  }'''

new_open_upload = '''  function openUpload(){
    setUpload({session_number:sessionFilter!=="All"?sessionFilter:String(sessions[0]?.session_number||1),resource_type:"PPT / Deck",title:"",description:""});
    setUploadFile(null);
    setUploadMode("file");
    setExternalUrl("");
    setUploadOpen(true);
  }'''

if old_open_upload in page:
    page = page.replace(old_open_upload, new_open_upload, 1)
elif 'setUploadMode("file")' not in page:
    raise SystemExit("Could not patch openUpload.")

# 7) uploadResource
upload_pattern = re.compile(
    r'  async function uploadResource\(e:FormEvent\)\{.*?\n  \}\n\n  async function openVersion',
    re.S
)

new_upload_function = '''  async function uploadResource(e:FormEvent){
    e.preventDefault();

    if(!upload.title.trim()){
      setMessage("Resource title is required.");
      return;
    }

    if(uploadMode==="file"){
      if(!uploadFile){
        setMessage("Choose a file or switch to External Link.");
        return;
      }
      if(uploadFile.size>MAX_FILE){
        setMessage("This file is over 100 MB. Please use External Link for larger files.");
        return;
      }
    }else{
      if(!externalUrl.trim()){
        setMessage("Paste the external file link.");
        return;
      }
      if(!isValidExternalUrl(externalUrl)){
        setMessage("Enter a valid http:// or https:// link.");
        return;
      }
    }

    setWorking(true);
    let resourceId="";
    let storagePath="";

    try{
      const {data:curriculumId,error:currErr} = await supabase.rpc(
        "ensure_lms_curriculum_session",
        {p_course_name:course,p_session_number:Number(upload.session_number)}
      );
      if(currErr) throw currErr;

      const {data:r,error:rErr} = await supabase
        .from("lms_resources")
        .insert({
          curriculum_session_id:String(curriculumId),
          resource_type:upload.resource_type,
          title:upload.title.trim(),
          description:upload.description.trim()||null,
          external_url:uploadMode==="link" ? externalUrl.trim() : null,
          created_by:userId||null,
          updated_by:userId||null
        })
        .select("id")
        .single();

      if(rErr || !r) throw rErr || new Error("Could not create resource.");
      resourceId = r.id;

      if(uploadMode==="file" && uploadFile){
        const clean = safeName(uploadFile.name)||"file";
        const unique =
          typeof crypto!=="undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        storagePath = `${resourceId}/${unique}-${clean}`;

        const up = await supabase.storage
          .from("lms-library")
          .upload(storagePath,uploadFile,{cacheControl:"3600",upsert:false});

        if(up.error) throw up.error;

        const {error:vErr} = await supabase
          .from("lms_resource_versions")
          .insert({
            resource_id:resourceId,
            version_number:1,
            file_name:uploadFile.name,
            storage_path:storagePath,
            mime_type:uploadFile.type||null,
            size_bytes:uploadFile.size,
            uploaded_by:userId||null
          });

        if(vErr) throw vErr;
      }

      setUploadOpen(false);
      setUploadFile(null);
      setExternalUrl("");
      setMessage(
        uploadMode==="link"
          ? `${upload.title.trim()} link saved.`
          : `${upload.title.trim()} uploaded.`
      );
      await loadAll();
    }catch(err){
      if(storagePath){
        await supabase.storage.from("lms-library").remove([storagePath]);
      }
      if(resourceId){
        await supabase.from("lms_resources").delete().eq("id",resourceId);
      }
      setMessage(err instanceof Error ? err.message : "Could not save resource.");
    }finally{
      setWorking(false);
    }
  }

  async function openVersion'''

page, count = upload_pattern.subn(new_upload_function, page, count=1)
if count != 1:
    raise SystemExit("Could not replace uploadResource function.")

# 8) Link helpers
replace_anchor = '  async function replaceFileSubmit(e:FormEvent){'

link_functions = '''  function openExternalLink(resource:Resource){
    if(!resource.external_url) return;
    window.open(resource.external_url,"_blank","noopener,noreferrer");
  }

  async function updateExternalLink(e:FormEvent){
    e.preventDefault();
    if(!linkResource) return;

    if(!isValidExternalUrl(editExternalUrl)){
      setMessage("Enter a valid http:// or https:// link.");
      return;
    }

    setWorking(true);

    const {error} = await supabase
      .from("lms_resources")
      .update({
        external_url:editExternalUrl.trim(),
        updated_by:userId||null,
        updated_at:new Date().toISOString()
      })
      .eq("id",linkResource.id);

    setWorking(false);

    if(error){
      setMessage(error.message);
      return;
    }

    setLinkResource(null);
    setEditExternalUrl("");
    setMessage("External link updated.");
    await loadAll();
  }

'''

if "async function updateExternalLink" not in page:
    if replace_anchor not in page:
        raise SystemExit("Could not insert link helper functions.")
    page = page.replace(replace_anchor, link_functions + replace_anchor, 1)

# 9) Replace-file size copy
page = page.replace(
    'if(replaceFile.size>MAX_FILE){ setMessage("Maximum file size is 25 MB."); return; }',
    'if(replaceFile.size>MAX_FILE){ setMessage("This file is over 100 MB. Use an External Link instead."); return; }'
)
page = page.replace("New File · Max 25 MB", "New File · Max 100 MB")

# 10) LMS row
old_row = '''filteredResources.map(r=>{const s=curriculum.find(x=>x.id===r.curriculum_session_id);const v=latestMap.get(r.id);return <tr key={r.id}><td><strong>Session {s?.session_number||"—"}</strong><small>{s?.topic||"Topic not added"}</small></td><td><strong>{r.title}</strong><small>{r.description||"—"}</small></td><td><span className={styles.badge}>{r.resource_type}</span></td><td>{v?<><strong>{v.file_name}</strong><small>{fmtSize(v.size_bytes)}</small></>:"No file"}</td><td>{v?`v${v.version_number}`:"—"}</td><td><div className={styles.actions}>{v&&<button onClick={()=>openVersion(v)}>Open</button>}<button onClick={()=>setVersionResource(r)}>Versions</button>{canManage&&<><button onClick={()=>{setReplaceResource(r);setReplaceFile(null)}}>Replace</button><button className={styles.danger} onClick={()=>archiveResource(r)}>Archive</button></>}</div></td></tr>})'''

new_row = '''filteredResources.map(r=>{const s=curriculum.find(x=>x.id===r.curriculum_session_id);const v=latestMap.get(r.id);return <tr key={r.id}><td><strong>Session {s?.session_number||"—"}</strong><small>{s?.topic||"Topic not added"}</small></td><td><strong>{r.title}</strong><small>{r.description||"—"}</small></td><td><span className={styles.badge}>{r.resource_type}</span></td><td>{v?<><strong>{v.file_name}</strong><small>{fmtSize(v.size_bytes)} · Orbit Storage</small></>:r.external_url?<><strong>External Link</strong><small>Drive / OneDrive / Zoom / other</small></>:"No file or link"}</td><td>{v?`v${v.version_number}`:r.external_url?"Link":"—"}</td><td><div className={styles.actions}>{v&&<button onClick={()=>openVersion(v)}>Open</button>}{r.external_url&&<button onClick={()=>openExternalLink(r)}>Open Link</button>}{v&&<button onClick={()=>setVersionResource(r)}>Versions</button>}{canManage&&v&&<button onClick={()=>{setReplaceResource(r);setReplaceFile(null)}}>Replace File</button>}{canManage&&r.external_url&&<button onClick={()=>{setLinkResource(r);setEditExternalUrl(r.external_url||"")}}>Edit Link</button>}{canManage&&<button className={styles.danger} onClick={()=>archiveResource(r)}>Archive</button>}</div></td></tr>})'''

if old_row in page:
    page = page.replace(old_row, new_row, 1)
elif "Open Link" not in page:
    raise SystemExit("Could not patch resource table row.")

# 11) Upload modal
modal_pattern = re.compile(
    r'\{uploadOpen && canManage && <div className=\{styles\.backdrop\}>.*?</form></section></div>\}',
    re.S
)

new_modal = '''{uploadOpen && canManage && <div className={styles.backdrop}>
      <section className={styles.modal}>
        <div className={styles.modalHeader}>
          <div>
            <h2>Add Course Resource</h2>
            <p>Official master material for {course}.</p>
          </div>
          <button onClick={()=>setUploadOpen(false)}>×</button>
        </div>

        <form onSubmit={uploadResource}>
          <div className={styles.formGrid}>
            <label>
              <span>Session</span>
              <input
                type="number"
                min="1"
                value={upload.session_number}
                onChange={e=>setUpload({...upload,session_number:e.target.value})}
              />
            </label>

            <label>
              <span>Resource Type</span>
              <select
                value={upload.resource_type}
                onChange={e=>setUpload({...upload,resource_type:e.target.value})}
              >
                {RESOURCE_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </label>

            <label className={styles.full}>
              <span>Title</span>
              <input
                value={upload.title}
                onChange={e=>setUpload({...upload,title:e.target.value})}
                placeholder="Example: Session 08 — Strings Trainer Deck"
              />
            </label>

            <label className={styles.full}>
              <span>Description</span>
              <textarea
                rows={3}
                value={upload.description}
                onChange={e=>setUpload({...upload,description:e.target.value})}
              />
            </label>

            <div className={styles.full}>
              <span className={styles.fieldLabel}>How do you want to add it?</span>

              <div className={styles.sourceChoice}>
                <button
                  type="button"
                  className={uploadMode==="file"?styles.sourceChoiceActive:""}
                  onClick={()=>{
                    setUploadMode("file");
                    setExternalUrl("");
                  }}
                >
                  <strong>Upload File</strong>
                  <small>Store directly in Orbit</small>
                </button>

                <button
                  type="button"
                  className={uploadMode==="link"?styles.sourceChoiceActive:""}
                  onClick={()=>{
                    setUploadMode("link");
                    setUploadFile(null);
                  }}
                >
                  <strong>External Link</strong>
                  <small>Google Drive, OneDrive, Zoom or other</small>
                </button>
              </div>
            </div>

            {uploadMode==="file" ? (
              <label className={styles.full}>
                <span>File · Orbit accepts up to 100 MB</span>
                <input
                  type="file"
                  onChange={e=>setUploadFile(e.target.files?.[0]||null)}
                />
                <small className={styles.uploadHelp}>
                  For very large files or recordings, use External Link instead.
                </small>
              </label>
            ) : (
              <label className={styles.full}>
                <span>External File Link</span>
                <input
                  type="url"
                  value={externalUrl}
                  onChange={e=>setExternalUrl(e.target.value)}
                  placeholder="https://drive.google.com/... or https://..."
                />
                <small className={styles.uploadHelp}>
                  Make sure the link has the sharing permission your team or students need.
                </small>
              </label>
            )}
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.secondary}
              onClick={()=>setUploadOpen(false)}
            >
              Cancel
            </button>
            <button className={styles.primary} disabled={working}>
              {working
                ? uploadMode==="file" ? "Uploading..." : "Saving..."
                : uploadMode==="file" ? "Upload Resource" : "Save Resource Link"}
            </button>
          </div>
        </form>
      </section>
    </div>}'''

page, count = modal_pattern.subn(new_modal, page, count=1)
if count != 1:
    raise SystemExit("Could not replace upload modal.")

# 12) Edit-link modal
version_anchor = '    {versionResource && <div className={styles.backdrop}>'

link_modal = '''    {linkResource && canManage && <div className={styles.backdrop}>
      <section className={styles.smallModal}>
        <div className={styles.modalHeader}>
          <div>
            <h2>Edit External Link</h2>
            <p>{linkResource.title}</p>
          </div>
          <button onClick={()=>setLinkResource(null)}>×</button>
        </div>

        <form onSubmit={updateExternalLink}>
          <div className={styles.formGrid}>
            <label className={styles.full}>
              <span>External Link</span>
              <input
                type="url"
                value={editExternalUrl}
                onChange={e=>setEditExternalUrl(e.target.value)}
                placeholder="https://..."
              />
            </label>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.secondary}
              onClick={()=>setLinkResource(null)}
            >
              Cancel
            </button>
            <button className={styles.primary} disabled={working}>
              {working?"Saving...":"Save Link"}
            </button>
          </div>
        </form>
      </section>
    </div>}

'''

if "linkResource && canManage" not in page:
    if version_anchor not in page:
        raise SystemExit("Could not insert Edit Link modal.")
    page = page.replace(version_anchor, link_modal + version_anchor, 1)

# 13) CSS
marker = "/* ORBIT LMS FILE OR EXTERNAL LINK */"
if marker not in css:
    css += '''

/* ORBIT LMS FILE OR EXTERNAL LINK */
.sourceChoice{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:9px;
}

.sourceChoice button{
  min-height:68px;
  border:1px solid #d6e2df;
  border-radius:11px;
  padding:10px 12px;
  background:#fbfdfc;
  color:#526a68;
  text-align:left;
  cursor:pointer;
  transition:border-color .14s ease,background .14s ease,box-shadow .14s ease;
}

.sourceChoice button strong,
.sourceChoice button small{
  display:block;
}

.sourceChoice button strong{
  font-size:11px;
  color:#183032;
}

.sourceChoice button small{
  margin-top:4px;
  color:#7a8988;
  font-size:9px;
  line-height:1.3;
}

.sourceChoice .sourceChoiceActive{
  border-color:#558C89;
  background:#eef7f5;
  box-shadow:0 0 0 2px rgba(85,140,137,.08);
}

.uploadHelp{
  display:block;
  margin-top:6px;
  color:#778886;
  font-size:9px;
  font-weight:500;
  line-height:1.35;
  text-transform:none;
}

@media(max-width:620px){
  .sourceChoice{
    grid-template-columns:1fr;
  }
}
'''

# 14) Portal resource model
portal_old_type = '''type Resource = {
  resource_id: string;
  course_name: string;
  session_number: number;
  topic: string | null;
  resource_type: string;
  title: string;
  description: string | null;
  visibility: string;
  file_name: string;
  storage_path: string;
  version_number: number;
  class_date: string;
};'''

portal_new_type = '''type Resource = {
  resource_id: string;
  course_name: string;
  session_number: number;
  topic: string | null;
  resource_type: string;
  title: string;
  description: string | null;
  visibility: string;
  file_name: string | null;
  storage_path: string | null;
  version_number: number | null;
  external_url: string | null;
  class_date: string;
};'''

if portal_old_type in portal:
    portal = portal.replace(portal_old_type, portal_new_type, 1)
elif "external_url: string | null;" not in portal:
    raise SystemExit("Could not patch portal Resource type.")

# 15) Portal opener
portal_pattern = re.compile(
    r'  async function openResource\(resource: Resource\) \{.*?\n  \}\n\n  async function signOut',
    re.S
)

portal_new_open = '''  async function openResource(resource: Resource) {
    if (resource.external_url) {
      window.open(resource.external_url, "_blank", "noopener,noreferrer");
      return;
    }

    if (!resource.storage_path) {
      setMessage("No file or link is available for this resource.");
      return;
    }

    const { data, error } = await supabase.storage
      .from("lms-library")
      .createSignedUrl(resource.storage_path, 60 * 60);

    if (error || !data?.signedUrl) {
      setMessage(error?.message || "Could not open this resource.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function signOut'''

portal, count = portal_pattern.subn(portal_new_open, portal, count=1)
if count != 1:
    raise SystemExit("Could not patch portal resource opener.")

lms_page.write_text(page, encoding="utf-8")
lms_css.write_text(css, encoding="utf-8")
portal_page.write_text(portal, encoding="utf-8")

print("LMS file/link upgrade applied.")
