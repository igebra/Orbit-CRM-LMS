"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import OrbitSidebar from "../components/OrbitSidebar";
import { COURSE_OPTIONS, courseDefaults } from "../lib/orbitCourses";
import styles from "./lms.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const RESOURCE_TYPES = [
  "PPT / Deck",
  "Worksheet",
  "Homework",
  "Assessment",
  "Reference Material",
  "Trainer Guide",
  "Other",
];

const DEFAULT_REQUIRED = ["PPT / Deck", "Worksheet", "Homework"];
const VIEW_ROLES = ["super_admin","admin","sales","sales_marketing","marketing","viewer_management","trainer"];
const MANAGE_ROLES = ["super_admin","admin","sales","sales_marketing","trainer"];
const MAX_FILE = 25 * 1024 * 1024;

type CurriculumSession = {
  id: string;
  course_name: string;
  session_number: number;
  topic: string | null;
  learning_objectives: string | null;
  required_resource_types: string[];
  status: string;
};

type Resource = {
  id: string;
  curriculum_session_id: string;
  resource_type: string;
  title: string;
  description: string | null;
  is_archived: boolean;
};

type Version = {
  id: string;
  resource_id: string;
  version_number: number;
  file_name: string;
  storage_path: string;
  size_bytes: number | null;
  created_at: string;
};

function fmtSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");
}

type CourseFamily = "aiedge" | "math" | "coding4ai";

const COURSE_FAMILY_DEFAULTS: Record<CourseFamily, string> = {
  aiedge: "AiEdge Elementary - Level 01",
  math: "Math - Grade 01",
  coding4ai: "Coding4AI Elementary - Level 01",
};

function courseFamilyOf(courseName: string): CourseFamily {
  if (courseName.startsWith("AiEdge ")) return "aiedge";
  if (courseName.startsWith("Coding4AI ")) return "coding4ai";
  return "math";
}

function shortCourseLabel(courseName: string) {
  if (courseName.startsWith("AiEdge ")) return courseName.replace("AiEdge ", "");
  if (courseName.startsWith("Coding4AI ")) return courseName.replace("Coding4AI ", "");
  if (courseName.startsWith("Math - ")) return courseName.replace("Math - ", "");
  return courseName;
}

function LibraryIcon3D() {
  return (
    <span className={styles.libraryIconShell} aria-hidden="true">
      <svg viewBox="0 0 64 64" className={styles.libraryIconSvg}>
        <defs>
          <linearGradient id="orbitLibraryTeal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8fc6c1" />
            <stop offset="100%" stopColor="#558C89" />
          </linearGradient>
          <linearGradient id="orbitLibraryOrange" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f4b06f" />
            <stop offset="100%" stopColor="#D9853B" />
          </linearGradient>
        </defs>
        <rect x="9" y="13" width="13" height="38" rx="4" fill="url(#orbitLibraryTeal)" />
        <rect x="24" y="9" width="14" height="42" rx="4" fill="#74AFAD" />
        <rect x="40" y="16" width="13" height="35" rx="4" fill="url(#orbitLibraryOrange)" />
        <path d="M11 20h9M26 18h10M42 24h9" stroke="rgba(255,255,255,.72)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M8 52h47" stroke="#355f5d" strokeWidth="3.5" strokeLinecap="round" opacity=".45" />
      </svg>
    </span>
  );
}

function CourseFamilyIcon({ family }: { family: CourseFamily }) {
  if (family === "math") {
    return (
      <span className={`${styles.courseIconShell} ${styles.mathIconShell}`} aria-hidden="true">
        <svg viewBox="0 0 48 48">
          <rect x="8" y="7" width="32" height="34" rx="9" fill="#fff7ef" />
          <rect x="12" y="11" width="24" height="8" rx="3" fill="#D9853B" opacity=".92" />
          <path d="M16 26h8M20 22v8M29 23h7M29 29h7" stroke="#a65e27" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </span>
    );
  }

  if (family === "coding4ai") {
    return (
      <span className={`${styles.courseIconShell} ${styles.tealIconShell}`} aria-hidden="true">
        <svg viewBox="0 0 48 48">
          <rect x="6" y="8" width="36" height="30" rx="8" fill="#eef8f6" />
          <path d="M18 18l-6 6 6 6M30 18l6 6-6 6M27 15l-6 18" fill="none" stroke="#558C89" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="35.5" cy="11.5" r="3" fill="#74AFAD" />
        </svg>
      </span>
    );
  }

  return (
    <span className={`${styles.courseIconShell} ${styles.tealIconShell}`} aria-hidden="true">
      <svg viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="15" fill="#eef8f6" />
        <circle cx="18" cy="22" r="4" fill="#558C89" />
        <circle cx="29" cy="17" r="3.5" fill="#74AFAD" />
        <circle cx="30" cy="30" r="4" fill="#558C89" opacity=".88" />
        <path d="M21 20l5-2M21 24l6 4M29 21v5" stroke="#356f6c" strokeWidth="2.1" strokeLinecap="round" />
        <path d="M36 9l1.4 3.4L41 14l-3.6 1.4L36 19l-1.4-3.6L31 14l3.6-1.6L36 9z" fill="#D9853B" />
      </svg>
    </span>
  );
}

export default function LmsPage() {
  const router = useRouter();
  const [email,setEmail] = useState("");
  const [userId,setUserId] = useState("");
  const [role,setRole] = useState("");
  const [tab,setTab] = useState<"library"|"curriculum">("library");
  const [course,setCourse] = useState("Math - Grade 01");
  const [sessionFilter,setSessionFilter] = useState("All");
  const [typeFilter,setTypeFilter] = useState("All");
  const [search,setSearch] = useState("");
  const [curriculum,setCurriculum] = useState<CurriculumSession[]>([]);
  const [resources,setResources] = useState<Resource[]>([]);
  const [versions,setVersions] = useState<Version[]>([]);
  const [message,setMessage] = useState("");
  const [loading,setLoading] = useState(true);
  const [working,setWorking] = useState(false);

  const [uploadOpen,setUploadOpen] = useState(false);
  const [uploadFile,setUploadFile] = useState<File|null>(null);
  const [upload,setUpload] = useState({session_number:"1",resource_type:"PPT / Deck",title:"",description:""});
  const [editSession,setEditSession] = useState<CurriculumSession|null>(null);
  const [editTopic,setEditTopic] = useState("");
  const [editObjectives,setEditObjectives] = useState("");
  const [editRequired,setEditRequired] = useState<string[]>([]);
  const [editStatus,setEditStatus] = useState("Draft");
  const [sessionCount,setSessionCount] = useState("20");
  const [replaceResource,setReplaceResource] = useState<Resource|null>(null);
  const [replaceFile,setReplaceFile] = useState<File|null>(null);
  const [versionResource,setVersionResource] = useState<Resource|null>(null);

  const canManage = MANAGE_ROLES.includes(role);

  const activeFamily = useMemo(() => courseFamilyOf(course), [course]);

  const familyCourses = useMemo(
    () =>
      COURSE_OPTIONS.filter((courseName) => {
        if (activeFamily === "aiedge") return courseName.startsWith("AiEdge ");
        if (activeFamily === "coding4ai") return courseName.startsWith("Coding4AI ");
        return !courseName.startsWith("AiEdge ") && !courseName.startsWith("Coding4AI ");
      }),
    [activeFamily]
  );

  function selectCourseName(courseName: string) {
    setCourse(courseName);
    setSessionFilter("All");
    const defaults = courseDefaults(courseName);
    setSessionCount(String(defaults.plannedSessions || 20));
  }

  function selectFamily(family: CourseFamily) {
    selectCourseName(COURSE_FAMILY_DEFAULTS[family]);
  }


  useEffect(() => {
    async function init(){
      const {data} = await supabase.auth.getUser();
      if(!data.user){ router.replace("/"); return; }
      setEmail(data.user.email || "");
      setUserId(data.user.id);
      const {data:profile} = await supabase.from("user_profiles").select("role").eq("id",data.user.id).single();
      const currentRole = profile?.role || "";
      setRole(currentRole);
      if(!VIEW_ROLES.includes(currentRole)){ router.replace("/dashboard"); return; }

      if(typeof window !== "undefined"){
        const params = new URLSearchParams(window.location.search);
        const qCourse = params.get("course");
        const qSession = params.get("session");
        if(qCourse && COURSE_OPTIONS.includes(qCourse)) setCourse(qCourse);
        if(qSession) setSessionFilter(qSession);
      }
      await loadAll();
    }
    init();
  },[router]);

  async function loadAll(){
    setLoading(true);
    const [c,r,v] = await Promise.all([
      supabase.from("lms_curriculum_sessions").select("id,course_name,session_number,topic,learning_objectives,required_resource_types,status").order("course_name").order("session_number"),
      supabase.from("lms_resources").select("id,curriculum_session_id,resource_type,title,description,is_archived").order("created_at",{ascending:false}),
      supabase.from("lms_resource_versions").select("id,resource_id,version_number,file_name,storage_path,size_bytes,created_at").order("version_number",{ascending:false}),
    ]);
    if(c.error || r.error || v.error){
      setMessage(c.error?.message || r.error?.message || v.error?.message || "Could not load LMS.");
    }else{
      setCurriculum((c.data||[]) as CurriculumSession[]);
      setResources((r.data||[]) as Resource[]);
      setVersions((v.data||[]) as Version[]);
    }
    setLoading(false);
  }

  const sessions = useMemo(() => curriculum.filter(x=>x.course_name===course).sort((a,b)=>a.session_number-b.session_number),[curriculum,course]);
  const activeResources = useMemo(() => resources.filter(x=>!x.is_archived),[resources]);
  const resourcesBySession = useMemo(()=>{
    const map = new Map<string,Resource[]>();
    activeResources.forEach(r=>map.set(r.curriculum_session_id,[...(map.get(r.curriculum_session_id)||[]),r]));
    return map;
  },[activeResources]);
  const latestMap = useMemo(()=>{
    const map = new Map<string,Version>();
    [...versions].sort((a,b)=>b.version_number-a.version_number).forEach(v=>{ if(!map.has(v.resource_id)) map.set(v.resource_id,v); });
    return map;
  },[versions]);

  const missing = useMemo(()=> sessions.map(s=>{
    const present = new Set((resourcesBySession.get(s.id)||[]).map(r=>r.resource_type));
    return {session:s,missing:(s.required_resource_types||[]).filter(t=>!present.has(t))};
  }).filter(x=>x.missing.length),[sessions,resourcesBySession]);

  const filteredResources = useMemo(()=>{
    const sessionIds = new Set(sessions.filter(s=>sessionFilter==="All" || String(s.session_number)===sessionFilter).map(s=>s.id));
    const q = search.trim().toLowerCase();
    return activeResources.filter(r=>sessionIds.has(r.curriculum_session_id))
      .filter(r=>typeFilter==="All" || r.resource_type===typeFilter)
      .filter(r=>{
        if(!q) return true;
        const s = curriculum.find(x=>x.id===r.curriculum_session_id);
        return [r.title,r.resource_type,r.description,s?.topic,s?.session_number].filter(Boolean).join(" ").toLowerCase().includes(q);
      });
  },[activeResources,sessions,sessionFilter,typeFilter,search,curriculum]);

  const requiredCount = sessions.reduce((n,s)=>n+(s.required_resource_types||[]).length,0);
  const missingCount = missing.reduce((n,x)=>n+x.missing.length,0);
  const courseResourceCount = activeResources.filter(r=>sessions.some(s=>s.id===r.curriculum_session_id)).length;

  async function generateSessions(){
    const count = Number(sessionCount);
    if(!count || count<1 || count>200){ setMessage("Enter a session count between 1 and 200."); return; }
    setWorking(true);
    const {data,error} = await supabase.rpc("generate_lms_curriculum",{p_course_name:course,p_session_count:count,p_required_types:DEFAULT_REQUIRED});
    setWorking(false);
    if(error){ setMessage(error.message); return; }
    setMessage(`${Number(data||0)} curriculum session(s) created.`);
    await loadAll();
  }

  function openEdit(s: CurriculumSession){
    setEditSession(s); setEditTopic(s.topic||""); setEditObjectives(s.learning_objectives||""); setEditRequired(s.required_resource_types||[]); setEditStatus(s.status);
  }

  async function saveEdit(e:FormEvent){
    e.preventDefault(); if(!editSession) return;
    setWorking(true);
    const {error} = await supabase.from("lms_curriculum_sessions").update({topic:editTopic.trim()||null,learning_objectives:editObjectives.trim()||null,required_resource_types:editRequired,status:editStatus,updated_by:userId||null,updated_at:new Date().toISOString()}).eq("id",editSession.id);
    setWorking(false);
    if(error){ setMessage(error.message); return; }
    setEditSession(null); setMessage(`Session ${editSession.session_number} updated.`); await loadAll();
  }

  function openUpload(){
    setUpload({session_number:sessionFilter!=="All"?sessionFilter:String(sessions[0]?.session_number||1),resource_type:"PPT / Deck",title:"",description:""});
    setUploadFile(null); setUploadOpen(true);
  }

  async function uploadResource(e:FormEvent){
    e.preventDefault();
    if(!uploadFile){ setMessage("Choose a file."); return; }
    if(uploadFile.size>MAX_FILE){ setMessage("Maximum file size is 25 MB."); return; }
    if(!upload.title.trim()){ setMessage("Resource title is required."); return; }
    setWorking(true); let resourceId=""; let storagePath="";
    try{
      const {data:curriculumId,error:currErr} = await supabase.rpc("ensure_lms_curriculum_session",{p_course_name:course,p_session_number:Number(upload.session_number)});
      if(currErr) throw currErr;
      const {data:r,error:rErr} = await supabase.from("lms_resources").insert({curriculum_session_id:String(curriculumId),resource_type:upload.resource_type,title:upload.title.trim(),description:upload.description.trim()||null,created_by:userId||null,updated_by:userId||null}).select("id").single();
      if(rErr || !r) throw rErr || new Error("Could not create resource.");
      resourceId = r.id;
      const clean = safeName(uploadFile.name)||"file";
      const unique = typeof crypto!=="undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      storagePath = `${resourceId}/${unique}-${clean}`;
      const up = await supabase.storage.from("lms-library").upload(storagePath,uploadFile,{cacheControl:"3600",upsert:false});
      if(up.error) throw up.error;
      const {error:vErr} = await supabase.from("lms_resource_versions").insert({resource_id:resourceId,version_number:1,file_name:uploadFile.name,storage_path:storagePath,mime_type:uploadFile.type||null,size_bytes:uploadFile.size,uploaded_by:userId||null});
      if(vErr) throw vErr;
      setUploadOpen(false); setMessage(`${upload.title.trim()} uploaded.`); await loadAll();
    }catch(err){
      if(storagePath) await supabase.storage.from("lms-library").remove([storagePath]);
      if(resourceId) await supabase.from("lms_resources").delete().eq("id",resourceId);
      setMessage(err instanceof Error?err.message:"Could not upload resource.");
    }finally{ setWorking(false); }
  }

  async function openVersion(v:Version){
    const {data,error} = await supabase.storage.from("lms-library").createSignedUrl(v.storage_path,3600);
    if(error || !data?.signedUrl){ setMessage(error?.message||"Could not open file."); return; }
    window.open(data.signedUrl,"_blank","noopener,noreferrer");
  }

  async function replaceFileSubmit(e:FormEvent){
    e.preventDefault(); if(!replaceResource || !replaceFile) return;
    if(replaceFile.size>MAX_FILE){ setMessage("Maximum file size is 25 MB."); return; }
    setWorking(true); let storagePath="";
    try{
      const next = Math.max(0,...versions.filter(v=>v.resource_id===replaceResource.id).map(v=>v.version_number))+1;
      const clean=safeName(replaceFile.name)||"file";
      const unique=typeof crypto!=="undefined" && "randomUUID" in crypto?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;
      storagePath=`${replaceResource.id}/${unique}-${clean}`;
      const up=await supabase.storage.from("lms-library").upload(storagePath,replaceFile,{cacheControl:"3600",upsert:false}); if(up.error) throw up.error;
      const {error}=await supabase.from("lms_resource_versions").insert({resource_id:replaceResource.id,version_number:next,file_name:replaceFile.name,storage_path:storagePath,mime_type:replaceFile.type||null,size_bytes:replaceFile.size,uploaded_by:userId||null}); if(error) throw error;
      setReplaceResource(null); setReplaceFile(null); setMessage(`Version ${next} uploaded.`); await loadAll();
    }catch(err){ if(storagePath) await supabase.storage.from("lms-library").remove([storagePath]); setMessage(err instanceof Error?err.message:"Could not replace file."); }
    finally{ setWorking(false); }
  }

  async function archiveResource(r:Resource){
    if(!confirm(`Archive ${r.title}? Version history will be kept.`)) return;
    const {error}=await supabase.from("lms_resources").update({is_archived:true,updated_by:userId||null,updated_at:new Date().toISOString()}).eq("id",r.id);
    if(error){ setMessage(error.message); return; }
    setMessage("Resource archived."); await loadAll();
  }

  const versionRows = versionResource ? versions.filter(v=>v.resource_id===versionResource.id).sort((a,b)=>b.version_number-a.version_number) : [];

  return <div className={styles.shell}>
    <OrbitSidebar email={email} active="lms" />
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.headerIdentity}>
          <LibraryIcon3D />
          <span className={styles.headerIdentityLabel}>
            {tab === "library" ? "Content Library" : "Curriculum"}
          </span>
        </div>

        <div className={styles.tabs}>
          <button
            className={tab==="library"?styles.activeTab:""}
            onClick={()=>setTab("library")}
          >
            Content Library
          </button>
          <button
            className={tab==="curriculum"?styles.activeTab:""}
            onClick={()=>setTab("curriculum")}
          >
            Curriculum
          </button>
        </div>
      </header>
      {message && <div className={styles.message}>{message}</div>}

      <section className={styles.courseBar}>
        <div className={styles.familyButtons} role="group" aria-label="Course family">
          <button
            type="button"
            className={`${styles.courseFamilyCard} ${styles.tealCourseCard} ${
              activeFamily === "aiedge" ? styles.courseFamilyCardActive : ""
            }`}
            onClick={() => selectFamily("aiedge")}
          >
            <CourseFamilyIcon family="aiedge" />
            <span>AiEdge</span>
          </button>

          <button
            type="button"
            className={`${styles.courseFamilyCard} ${styles.orangeCourseCard} ${
              activeFamily === "math" ? styles.courseFamilyCardActive : ""
            }`}
            onClick={() => selectFamily("math")}
          >
            <CourseFamilyIcon family="math" />
            <span>Math</span>
          </button>

          <button
            type="button"
            className={`${styles.courseFamilyCard} ${styles.tealCourseCard} ${
              activeFamily === "coding4ai" ? styles.courseFamilyCardActive : ""
            }`}
            onClick={() => selectFamily("coding4ai")}
          >
            <CourseFamilyIcon family="coding4ai" />
            <span>Coding4AI</span>
          </button>
        </div>

        <div className={styles.courseChoices}>
          <span className={styles.courseChoiceLabel}>
            {activeFamily === "math" ? "Grade / Course" : "Level"}
          </span>

          <div className={styles.courseChips}>
            {familyCourses.map((courseName) => (
              <button
                type="button"
                key={courseName}
                className={`${styles.courseChip} ${
                  courseName === course ? styles.courseChipActive : ""
                }`}
                onClick={() => selectCourseName(courseName)}
              >
                {shortCourseLabel(courseName)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.courseMeta}>
          <strong>{course}</strong>
          <span>
            {courseDefaults(course).plannedSessions
              ? `${courseDefaults(course).plannedSessions} planned sessions`
              : "Session count configurable"}
          </span>
        </div>
      </section>

      <section className={styles.stats}><div><span>Sessions</span><strong>{sessions.length}</strong></div><div><span>Resources</span><strong>{courseResourceCount}</strong></div><div><span>Required</span><strong>{requiredCount}</strong></div><div className={missingCount?styles.warning:""}><span>Missing</span><strong>{missingCount}</strong></div></section>

      {tab==="library" ? <>
        {missingCount>0 && <section className={styles.missingPanel}><div><h2>Missing Resources</h2><p>Required by curriculum but not uploaded yet.</p></div><div className={styles.missingGrid}>{missing.slice(0,8).map(x=><button key={x.session.id} onClick={()=>setSessionFilter(String(x.session.session_number))}><strong>Session {x.session.session_number}</strong><span>{x.session.topic||"Topic not added"}</span><small>{x.missing.join(" · ")}</small></button>)}</div></section>}
        <section className={styles.card}>
          <div className={styles.toolbar}><input type="search" placeholder="Search resources or topics..." value={search} onChange={e=>setSearch(e.target.value)}/><select value={sessionFilter} onChange={e=>setSessionFilter(e.target.value)}><option value="All">All Sessions</option>{sessions.map(s=><option key={s.id} value={s.session_number}>Session {s.session_number}{s.topic?` — ${s.topic}`:""}</option>)}</select><select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option value="All">All Resource Types</option>{RESOURCE_TYPES.map(t=><option key={t}>{t}</option>)}</select>{canManage && <button className={styles.primary} onClick={openUpload}>+ Upload Resource</button>}</div>
          <div className={styles.tableWrap}><table><thead><tr><th>Session</th><th>Resource</th><th>Type</th><th>Current File</th><th>Version</th><th>Actions</th></tr></thead><tbody>{loading?<tr><td colSpan={6} className={styles.empty}>Loading...</td></tr>:filteredResources.length===0?<tr><td colSpan={6} className={styles.empty}>No resources found.</td></tr>:filteredResources.map(r=>{const s=curriculum.find(x=>x.id===r.curriculum_session_id);const v=latestMap.get(r.id);return <tr key={r.id}><td><strong>Session {s?.session_number||"—"}</strong><small>{s?.topic||"Topic not added"}</small></td><td><strong>{r.title}</strong><small>{r.description||"—"}</small></td><td><span className={styles.badge}>{r.resource_type}</span></td><td>{v?<><strong>{v.file_name}</strong><small>{fmtSize(v.size_bytes)}</small></>:"No file"}</td><td>{v?`v${v.version_number}`:"—"}</td><td><div className={styles.actions}>{v&&<button onClick={()=>openVersion(v)}>Open</button>}<button onClick={()=>setVersionResource(r)}>Versions</button>{canManage&&<><button onClick={()=>{setReplaceResource(r);setReplaceFile(null)}}>Replace</button><button className={styles.danger} onClick={()=>archiveResource(r)}>Archive</button></>}</div></td></tr>})}</tbody></table></div>
        </section>
      </> : <>
        <section className={styles.curriculumTop}>{canManage && <><label><span>Session Count</span><input type="number" min="1" max="200" value={sessionCount} onChange={e=>setSessionCount(e.target.value)}/></label><button className={styles.primary} onClick={generateSessions} disabled={working}>{working?"Working...":"Create Missing Sessions"}</button></>}<span>For AiEdge/Coding4AI use 20. Math remains configurable.</span></section>
        <section className={styles.card}><div className={styles.tableWrap}><table><thead><tr><th>Session</th><th>Topic</th><th>Learning Objectives</th><th>Required Resources</th><th>Missing</th><th>Status</th>{canManage&&<th>Action</th>}</tr></thead><tbody>{loading?<tr><td colSpan={canManage?7:6} className={styles.empty}>Loading...</td></tr>:sessions.length===0?<tr><td colSpan={canManage?7:6} className={styles.empty}>No curriculum sessions yet.</td></tr>:sessions.map(s=>{const present=new Set((resourcesBySession.get(s.id)||[]).map(r=>r.resource_type));const miss=(s.required_resource_types||[]).filter(t=>!present.has(t));return <tr key={s.id}><td><strong>Session {s.session_number}</strong></td><td>{s.topic||"Not added"}</td><td><span className={styles.clamp}>{s.learning_objectives||"—"}</span></td><td><div className={styles.chips}>{(s.required_resource_types||[]).map(t=><span key={t}>{t}</span>)}</div></td><td>{miss.length?<span className={styles.missingText}>{miss.join(" · ")}</span>:<span className={styles.ready}>Complete</span>}</td><td><span className={styles.status}>{s.status}</span></td>{canManage&&<td><button className={styles.smallButton} onClick={()=>openEdit(s)}>Edit</button></td>}</tr>})}</tbody></table></div></section>
      </>}

      <img
        src="/orbit-mascot.png"
        alt=""
        aria-hidden="true"
        className={styles.pageMascot}
      />
    </main>

    {uploadOpen && canManage && <div className={styles.backdrop}><section className={styles.modal}><div className={styles.modalHeader}><div><h2>Upload Course Resource</h2><p>Official master material for {course}.</p></div><button onClick={()=>setUploadOpen(false)}>×</button></div><form onSubmit={uploadResource}><div className={styles.formGrid}><label><span>Session</span><input type="number" min="1" value={upload.session_number} onChange={e=>setUpload({...upload,session_number:e.target.value})}/></label><label><span>Resource Type</span><select value={upload.resource_type} onChange={e=>setUpload({...upload,resource_type:e.target.value})}>{RESOURCE_TYPES.map(t=><option key={t}>{t}</option>)}</select></label><label className={styles.full}><span>Title</span><input value={upload.title} onChange={e=>setUpload({...upload,title:e.target.value})} placeholder="Example: Session 08 — Strings Trainer Deck"/></label><label className={styles.full}><span>Description</span><textarea rows={3} value={upload.description} onChange={e=>setUpload({...upload,description:e.target.value})}/></label><label className={styles.full}><span>File · Max 25 MB</span><input type="file" onChange={e=>setUploadFile(e.target.files?.[0]||null)}/></label></div><div className={styles.modalFooter}><button type="button" className={styles.secondary} onClick={()=>setUploadOpen(false)}>Cancel</button><button className={styles.primary} disabled={working}>{working?"Uploading...":"Upload Resource"}</button></div></form></section></div>}

    {editSession && canManage && <div className={styles.backdrop}><section className={styles.modal}><div className={styles.modalHeader}><div><h2>Session {editSession.session_number}</h2><p>Define topic, objectives and required materials.</p></div><button onClick={()=>setEditSession(null)}>×</button></div><form onSubmit={saveEdit}><div className={styles.formGrid}><label className={styles.full}><span>Topic</span><input value={editTopic} onChange={e=>setEditTopic(e.target.value)}/></label><label className={styles.full}><span>Learning Objectives</span><textarea rows={5} value={editObjectives} onChange={e=>setEditObjectives(e.target.value)}/></label><div className={styles.full}><span className={styles.fieldLabel}>Required Resources</span><div className={styles.checkGrid}>{RESOURCE_TYPES.map(t=><label key={t}><input type="checkbox" checked={editRequired.includes(t)} onChange={()=>setEditRequired(editRequired.includes(t)?editRequired.filter(x=>x!==t):[...editRequired,t])}/><span>{t}</span></label>)}</div></div><label><span>Status</span><select value={editStatus} onChange={e=>setEditStatus(e.target.value)}><option>Draft</option><option>Ready</option><option>Archived</option></select></label></div><div className={styles.modalFooter}><button type="button" className={styles.secondary} onClick={()=>setEditSession(null)}>Cancel</button><button className={styles.primary} disabled={working}>Save Session</button></div></form></section></div>}

    {replaceResource && canManage && <div className={styles.backdrop}><section className={styles.smallModal}><div className={styles.modalHeader}><div><h2>Replace File</h2><p>{replaceResource.title}. Previous versions are kept.</p></div><button onClick={()=>setReplaceResource(null)}>×</button></div><form onSubmit={replaceFileSubmit}><div className={styles.formGrid}><label className={styles.full}><span>New File · Max 25 MB</span><input type="file" onChange={e=>setReplaceFile(e.target.files?.[0]||null)}/></label></div><div className={styles.modalFooter}><button type="button" className={styles.secondary} onClick={()=>setReplaceResource(null)}>Cancel</button><button className={styles.primary} disabled={working||!replaceFile}>Upload New Version</button></div></form></section></div>}

    {versionResource && <div className={styles.backdrop}><section className={styles.smallModal}><div className={styles.modalHeader}><div><h2>Version History</h2><p>{versionResource.title}</p></div><button onClick={()=>setVersionResource(null)}>×</button></div><div className={styles.versionList}>{versionRows.length===0?<div className={styles.empty}>No versions.</div>:versionRows.map(v=><div key={v.id}><div><strong>Version {v.version_number}</strong><span>{v.file_name}</span><small>{fmtSize(v.size_bytes)} · {new Date(v.created_at).toLocaleString()}</small></div><button onClick={()=>openVersion(v)}>Open</button></div>)}</div></section></div>}
  </div>;
}
