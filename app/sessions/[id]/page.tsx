"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams, useRouter } from "next/navigation";
import OrbitSidebar from "../../components/OrbitSidebar";
import styles from "../../lms.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Session = {
  id:string; batch_id:string; session_number:number|null; session_date:string;
  topic_planned:string|null; topic_covered:string|null; status:string;
  zoom_meeting_url:string|null; zoom_recording_url:string|null; deck_url:string|null;
  homework_given:boolean; homework_url:string|null; assessment_url:string|null;
  trainer_notes:string|null; trainer_feedback:string|null; parent_feedback:string|null; trainer_name:string|null; trainer_id:string|null;
};
type Batch = {id:string;batch_name:string;course_name:string;trainer_name:string|null;recurring_zoom_url:string|null};
type Student = {id:string;student_name:string;grade:string|null};
type Att = {student_id:string;attendance_status:string};
type Hw = {student_id:string;homework_completed:boolean};
type TrainerOption = {id:string;trainer_name:string};

export default function SessionDetailPage() {
  const {id:sessionId}=useParams<{id:string}>();
  const router=useRouter();

  const [email,setEmail]=useState("");
  const [userId,setUserId]=useState("");
  const [role,setRole]=useState("");
  const [session,setSession]=useState<Session|null>(null);
  const [batch,setBatch]=useState<Batch|null>(null);
  const [students,setStudents]=useState<Student[]>([]);
  const [attendance,setAttendance]=useState<Record<string,string>>({});
  const [homework,setHomework]=useState<Record<string,boolean>>({});
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const [trainers,setTrainers]=useState<TrainerOption[]>([]);
  const [attendanceMarkedAt,setAttendanceMarkedAt]=useState<string|null>(null);

  const [form,setForm]=useState({
    trainer_id:"",topic_planned:"",topic_covered:"",status:"Scheduled",zoom_meeting_url:"",
    zoom_recording_url:"",deck_url:"",homework_given:false,homework_url:"",
    assessment_url:"",trainer_notes:"",trainer_feedback:"",parent_feedback:""
  });

  const canEdit=["super_admin","admin","sales","sales_marketing","trainer"].includes(role);
  const canChangeTrainer=["super_admin","admin","sales","sales_marketing"].includes(role);
  const canMarkAttendance=["super_admin","admin","sales","sales_marketing","trainer"].includes(role);

  useEffect(()=>{
    async function init(){
      const {data}=await supabase.auth.getUser();
      if(!data.user)return router.replace("/");
      setEmail(data.user.email||"");setUserId(data.user.id);
      const {data:p}=await supabase.from("user_profiles").select("role").eq("id",data.user.id).single();
      setRole(p?.role||"");
      await load();
    }
    init();
  },[router,sessionId]);

  async function load(){
    setLoading(true);
    const s=await supabase.from("class_sessions").select("*").eq("id",sessionId).single();
    if(s.error||!s.data){setMessage(s.error?.message||"Session not found.");setLoading(false);return;}
    const ss=s.data as Session;setSession(ss);
    setForm({
      trainer_id:ss.trainer_id||"",
      topic_planned:ss.topic_planned||"",topic_covered:ss.topic_covered||"",status:ss.status,
      zoom_meeting_url:ss.zoom_meeting_url||"",zoom_recording_url:ss.zoom_recording_url||"",
      deck_url:ss.deck_url||"",homework_given:Boolean(ss.homework_given),homework_url:ss.homework_url||"",
      assessment_url:ss.assessment_url||"",trainer_notes:ss.trainer_notes||"",
      trainer_feedback:ss.trainer_feedback||"",parent_feedback:ss.parent_feedback||""
    });

    const [b,r,a,h]=await Promise.all([
      supabase.from("batches").select("id,batch_name,course_name,trainer_name,recurring_zoom_url").eq("id",ss.batch_id).single(),
      supabase.from("batch_students").select("student_id").eq("batch_id",ss.batch_id),
      supabase.from("session_attendance").select("student_id,attendance_status,marked_at").eq("session_id",sessionId),
      supabase.from("session_homework").select("student_id,homework_completed").eq("session_id",sessionId),
    ]);
    if(!b.error)setBatch(b.data as Batch);

    const { data: trainerOptions } = await supabase.rpc("active_trainer_options");
    setTrainers((trainerOptions || []) as TrainerOption[]);

    const markedTimes = (a.data || []).map((row:any) => row.marked_at).filter(Boolean);
    setAttendanceMarkedAt(markedTimes.length ? markedTimes.sort().slice(-1)[0] : null);

    const ids=(r.data||[]).map(x=>x.student_id as string);
    let roster:Student[]=[];
    if(ids.length){
      const st=await supabase.from("students").select("id,student_name,grade").in("id",ids).order("student_name");
      roster=(st.data||[]) as Student[];
    }
    setStudents(roster);

    const am=new Map<string,string>();((a.data||[]) as Att[]).forEach(x=>am.set(x.student_id,x.attendance_status));
    const hm=new Map<string,boolean>();((h.data||[]) as Hw[]).forEach(x=>hm.set(x.student_id,x.homework_completed));
    const ao:Record<string,string>={};const ho:Record<string,boolean>={};
    roster.forEach(x=>{ao[x.id]=am.get(x.id)||"Present";ho[x.id]=hm.get(x.id)||false;});
    setAttendance(ao);setHomework(ho);setLoading(false);
  }

  const summary=useMemo(()=>Object.values(attendance).reduce((a,x)=>({...a,[x]:(a[x]||0)+1}),{} as Record<string,number>),[attendance]);

  async function saveClassDetails(e:FormEvent){
    e.preventDefault();if(!session)return;
    setSaving(true);setMessage("");

    const selectedTrainer = trainers.find((t)=>t.id===form.trainer_id);
    const up=await supabase.from("class_sessions").update({
      trainer_id: form.trainer_id || null,
      trainer_name: selectedTrainer?.trainer_name || session.trainer_name || null,
      topic_planned:form.topic_planned.trim()||null,topic_covered:form.topic_covered.trim()||null,
      status:form.status,zoom_meeting_url:form.zoom_meeting_url.trim()||null,
      zoom_recording_url:form.zoom_recording_url.trim()||null,deck_url:form.deck_url.trim()||null,
      homework_given:form.homework_given,homework_url:form.homework_given?(form.homework_url.trim()||null):null,
      assessment_url:form.assessment_url.trim()||null,trainer_notes:form.trainer_notes.trim()||null,
      trainer_feedback:form.trainer_feedback.trim()||null,parent_feedback:form.parent_feedback.trim()||null,
      updated_by:userId||null,
    }).eq("id",sessionId);
    if(up.error){setSaving(false);return setMessage(up.error.message);}

    if(students.length && form.homework_given){
      const hr=students.map(x=>({session_id:sessionId,student_id:x.id,homework_completed:Boolean(homework[x.id]),updated_by:userId||null,updated_at:new Date().toISOString()}));
      const hu=await supabase.from("session_homework").upsert(hr,{onConflict:"session_id,student_id"});
      if(hu.error){setSaving(false);return setMessage(hu.error.message);}
    }

    setSaving(false);setMessage("Session updated successfully.");await load();
  }


  async function saveAttendance(){
    if(!canMarkAttendance)return;
    setSaving(true);
    setMessage("");

    const payload = students.map((student)=>({
      student_id: student.id,
      attendance_status: attendance[student.id] || "Present",
    }));

    const { error } = await supabase.rpc("save_session_attendance", {
      p_session_id: sessionId,
      p_attendance: payload,
    });

    setSaving(false);

    if(error){
      setMessage(error.message);
      return;
    }

    setMessage("Attendance saved.");
    await load();
  }

  if(loading||!session)return <div className={styles.shell}><OrbitSidebar email={email} active="sessions"/><main className={styles.main}><div className={styles.empty}>{loading?"Loading session...":message||"Session not found."}</div></main></div>;

  const meeting=form.zoom_meeting_url||batch?.recurring_zoom_url||"";

  return (
    <div className={styles.shell}>
      <OrbitSidebar email={email} active="sessions"/>
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>LMS · CLASS SESSION</p>
            <h1>{session.session_number?`Session ${session.session_number}`:"Class Session"}</h1>
            <p className={styles.subtitle}>{batch?.batch_name||"Batch"} · {batch?.course_name||"Course"} · {session.session_date}</p>
          </div>
          <div className={styles.headerActions}>
            {meeting&&<a href={meeting} target="_blank" rel="noreferrer" className={styles.primaryLink}>Open Zoom</a>}
            {batch&&<button className={styles.secondary} onClick={()=>router.push(`/batches/${batch.id}`)}>← Batch</button>}
          </div>
        </header>

        {message&&<div className={styles.message}>{message}</div>}

        <form onSubmit={saveClassDetails}>
          <section className={styles.grid2}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}><div><h2>Class Details</h2><span>{session.trainer_name||batch?.trainer_name||"Trainer not assigned"}</span></div></div>

              <div className={styles.formGrid}>
                <label className={styles.full}>
                  <span>Actual Trainer for this Class</span>
                  <select
                    disabled={!canChangeTrainer}
                    value={form.trainer_id}
                    onChange={e=>setForm({...form,trainer_id:e.target.value})}
                  >
                    <option value="">Select trainer</option>
                    {trainers.map(t=><option key={t.id} value={t.id}>{t.trainer_name}</option>)}
                  </select>
                </label>
                <label className={styles.full}><span>Topic Planned</span><input disabled={!canEdit} value={form.topic_planned} onChange={e=>setForm({...form,topic_planned:e.target.value})}/></label>
                <label className={styles.full}><span>Topic Covered</span><input disabled={!canEdit} value={form.topic_covered} onChange={e=>setForm({...form,topic_covered:e.target.value})}/></label>
                <label><span>Status</span><select disabled={!canEdit} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Scheduled</option><option>Completed</option><option>Cancelled</option><option>Rescheduled</option></select></label>
                <label className={styles.full}><span>Session Zoom Link (optional override)</span><input disabled={!canEdit} type="url" value={form.zoom_meeting_url} onChange={e=>setForm({...form,zoom_meeting_url:e.target.value})}/></label>
              </div>

              <h3 className={styles.sectionTitle}>Attendance</h3>
              <div className={styles.attendanceGrid}>
                {students.map(x=><div className={styles.attendanceRow} key={x.id}>
                  <div><strong>{x.student_name}</strong><small>{x.grade||"—"}</small></div>
                  <select disabled={!canMarkAttendance} value={attendance[x.id]||"Present"} onChange={e=>setAttendance({...attendance,[x.id]:e.target.value})}>
                    <option>Present</option><option>Absent</option><option>Late</option><option>Excused</option>
                  </select>
                </div>)}
              </div>
              <p className={styles.subtitle}>Present {summary.Present||0} · Absent {summary.Absent||0} · Late {summary.Late||0} · Excused {summary.Excused||0}</p>
              {attendanceMarkedAt && <p className={styles.subtitle}>Last attendance update: {new Date(attendanceMarkedAt).toLocaleString()}</p>}
              {canMarkAttendance && (
                <button type="button" className={styles.primary} onClick={saveAttendance} disabled={saving}>
                  {saving ? "Saving..." : "Save Attendance"}
                </button>
              )}
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}><div><h2>Class Materials</h2><span>PPT, recording, homework and assessment</span></div></div>
              <div className={styles.formGrid}>
                <label className={styles.full}><span>PPT / Trainer Deck</span><input disabled={!canEdit} type="url" value={form.deck_url} onChange={e=>setForm({...form,deck_url:e.target.value})}/></label>
                <label className={styles.full}><span>Zoom Recording</span><input disabled={!canEdit} type="url" value={form.zoom_recording_url} onChange={e=>setForm({...form,zoom_recording_url:e.target.value})}/></label>
                <label><span>Homework Given?</span><select disabled={!canEdit} value={form.homework_given?"Yes":"No"} onChange={e=>setForm({...form,homework_given:e.target.value==="Yes"})}><option>No</option><option>Yes</option></select></label>
                {form.homework_given&&<label className={styles.full}><span>Homework / Worksheet</span><input disabled={!canEdit} type="url" value={form.homework_url} onChange={e=>setForm({...form,homework_url:e.target.value})}/></label>}
                <label className={styles.full}><span>Assessment Sheet</span><input disabled={!canEdit} type="url" value={form.assessment_url} onChange={e=>setForm({...form,assessment_url:e.target.value})}/></label>
              </div>

              {form.homework_given&&<>
                <h3 className={styles.sectionTitle}>Homework Completion</h3>
                <div className={styles.attendanceGrid}>{students.map(x=><div className={styles.attendanceRow} key={x.id}>
                  <div><strong>{x.student_name}</strong><small>Completed?</small></div>
                  <select disabled={!canEdit} value={homework[x.id]?"Yes":"No"} onChange={e=>setHomework({...homework,[x.id]:e.target.value==="Yes"})}><option>No</option><option>Yes</option></select>
                </div>)}</div>
              </>}
            </div>
          </section>

          <section className={styles.grid2} style={{marginTop:16}}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}><div><h2>Trainer Notes</h2><span>Internal teaching notes</span></div></div>
              <div className={styles.formGrid}><label className={styles.full}><span>Internal Notes</span><textarea disabled={!canEdit} rows={5} value={form.trainer_notes} onChange={e=>setForm({...form,trainer_notes:e.target.value})}/></label></div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}><div><h2>Feedback</h2><span>Academic and parent updates</span></div></div>
              <div className={styles.formGrid}>
                <label className={styles.full}><span>Trainer Feedback</span><textarea disabled={!canEdit} rows={3} value={form.trainer_feedback} onChange={e=>setForm({...form,trainer_feedback:e.target.value})}/></label>
                <label className={styles.full}><span>Parent Update</span><textarea disabled={!canEdit} rows={3} value={form.parent_feedback} onChange={e=>setForm({...form,parent_feedback:e.target.value})}/></label>
              </div>
            </div>
          </section>

          {canEdit&&<div className={styles.modalFooter} style={{marginTop:18}}><button className={styles.primary} disabled={saving}>{saving?"Saving...":"Save Class Details"}</button></div>}
        </form>
      </main>
    </div>
  );
}
