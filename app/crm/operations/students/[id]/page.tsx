"use client";

import {useEffect,useMemo,useState} from "react";
import {useParams,useRouter} from "next/navigation";
import Link from "next/link";
import {createClient} from "@supabase/supabase-js";
import OrbitSidebar from "../../../../components/OrbitSidebar";
import css from "../../operations.module.css";

const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
const ALLOWED=new Set(["super_admin","admin","sales","sales_marketing","marketing","accounts_finance","viewer_management"]);
const FINANCE=new Set(["super_admin","admin","sales","sales_marketing","accounts_finance","viewer_management"]);
type Student={id:string;student_name:string;grade:string|null;parent_first_name:string|null;parent_last_name:string|null;email:string|null;phone:string|null;status:string};
type Enrollment={id:string;course_name:string;status:string;enrolled_at:string;completed_at:string|null;notes:string|null};
type Batch={id:string;batch_name:string;course_name:string;trainer_name:string|null;status:string};
type Progress={session_id:string;class_date:string;batch_name:string;course_name:string;session_number:number|null;topic_covered:string|null;class_status:string;attendance_status:string|null;homework_completed:boolean|null};
type Payment={finance_id:string;student_id:string;batch_id:string;batch_name:string;course_name:string;total_fee_usd:number;total_paid_usd:number;pending_usd:number;payment_status:string;next_due_date:string|null};
type Pane="profile"|"enrollments"|"batches"|"progress"|"finance";
function dateString(v:string|null|undefined){if(!v)return "—";const d=new Date(v.length===10?`${v}T12:00:00`:v);return Number.isNaN(d.getTime())?v:d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});}
function usd(v:number){return Number(v||0).toLocaleString("en-US",{style:"currency",currency:"USD"});}
export default function StudentOperationsProfile(){
 const params=useParams();const id=String(params.id||"");const router=useRouter();const [email,setEmail]=useState("");const [role,setRole]=useState("");const [ready,setReady]=useState(false);const [message,setMessage]=useState("");const [student,setStudent]=useState<Student|null>(null);const [enrollments,setEnrollments]=useState<Enrollment[]>([]);const [batches,setBatches]=useState<Batch[]>([]);const [progress,setProgress]=useState<Progress[]>([]);const [payments,setPayments]=useState<Payment[]>([]);const [tab,setTab]=useState<Pane>("profile");
 useEffect(()=>{let mounted=true;(async()=>{
  const {data:{user}}=await supabase.auth.getUser();if(!mounted)return;if(!user){router.replace("/");return;}
  const {data:p}=await supabase.from("user_profiles").select("role,is_active").eq("id",user.id).maybeSingle();if(!mounted)return;
  if(!p?.is_active||!ALLOWED.has(p.role)){router.replace("/dashboard");return;}setRole(p.role);setEmail(user.email||"");
  const [s,en,bs,allB,pg]=await Promise.all([
   supabase.from("students").select("id,student_name,grade,parent_first_name,parent_last_name,email,phone,status").eq("id",id).maybeSingle(),
   supabase.from("student_enrollments").select("id,course_name,status,enrolled_at,completed_at,notes").eq("student_id",id).order("enrolled_at",{ascending:false}),
   supabase.from("batch_students").select("batch_id").eq("student_id",id),
   supabase.from("batches").select("id,batch_name,course_name,trainer_name,status"),
   supabase.rpc("student_progress_report",{p_student_id:id})
  ]);
  if(!mounted)return;
  if(s.error||!s.data){setMessage(s.error?.message||"Student record not found or not accessible.");setReady(true);return;}
  setStudent(s.data as Student);
  if(en.error||bs.error||allB.error||pg.error)setMessage([en.error?.message,bs.error?.message,allB.error?.message,pg.error?.message].filter(Boolean).join(" | "));
  setEnrollments((en.data||[]) as Enrollment[]);
  const membershipRows=(bs.data||[]) as {batch_id:string}[];const allBatchRows=(allB.data||[]) as Batch[];const memberships=new Set(membershipRows.map(x=>x.batch_id));setBatches(allBatchRows.filter(x=>memberships.has(x.id)));
  setProgress((pg.data||[]) as Progress[]);
  if(FINANCE.has(p.role)){const f=await supabase.rpc("payment_outstanding_report");if(mounted){if(f.error)setMessage(v=>[v,f.error?.message].filter(Boolean).join(" | "));else setPayments(((f.data||[]) as Payment[]).filter(x=>x.student_id===id));}}
  if(mounted)setReady(true);
 })();return()=>{mounted=false;};},[id,router]);
 const fullParent=student?`${student.parent_first_name||""} ${student.parent_last_name||""}`.trim():"";
 const stats=useMemo(()=>({sessions:progress.length,attended:progress.filter(x=>x.attendance_status?.toLowerCase()==="present"||x.attendance_status?.toLowerCase()==="attended").length,homework:progress.filter(x=>x.homework_completed===true).length}),[progress]);
 if(!ready)return <div className={css.loading}>Verifying access and loading the student profile…</div>;
 return <div className={css.shell}><OrbitSidebar email={email} active="students"/><main className={css.main}>
  <div className={css.top}><div><p className={css.eyebrow}>STUDENT 360 / ACADEMIC RECORD</p><h1>{student?.student_name||"Student Profile"}</h1><p className={css.subheading}>Academic enrollment, classes, progress and permitted financial records in one place.</p></div><div className={css.topLinks}><Link href="/crm/operations" className={css.textLink}>← Operations Hub</Link><Link href={`/students/${encodeURIComponent(id)}`} className={css.textLink}>Open existing student record ↗</Link></div></div>
  {message&&<div role="status" className={css.notice}>{message}</div>}
  {student&&<><div className={css.cards}>
   <div className={css.metric}><span className={css.metricLabel}>Grade</span><div className={css.metricValue}>{student.grade||"—"}</div><span className={css.metricHint}>Current student grade</span></div>
   <div className={css.metric}><span className={css.metricLabel}>Course enrollments</span><div className={css.metricValue}>{enrollments.length}</div><span className={css.metricHint}>All recorded courses</span></div>
   <div className={css.metric}><span className={css.metricLabel}>Assigned batches</span><div className={css.metricValue}>{batches.length}</div><span className={css.metricHint}>Active and historical</span></div>
   <div className={css.metric}><span className={css.metricLabel}>Sessions in progress report</span><div className={css.metricValue}>{stats.sessions}</div><span className={css.metricHint}>{stats.attended} attended · {stats.homework} homework completed</span></div>
  </div>
  <div className={css.studentTabs} role="tablist" aria-label="Student profile sections">{([{key:"profile",label:"Profile"},{key:"enrollments",label:"Enrollments"},{key:"batches",label:"Batches"},{key:"progress",label:"Progress"},...(FINANCE.has(role)?[{key:"finance",label:"Fees & Payments"}]:[])] as {key:Pane;label:string}[]).map(x=><button key={x.key} role="tab" aria-selected={tab===x.key} className={`${css.studentTab} ${tab===x.key?css.studentTabActive:""}`} onClick={()=>setTab(x.key)}>{x.label}</button>)}</div>
  {tab==="profile"&&<section className={css.panel}><div className={css.panelHead}><div><h2>Student and guardian details</h2><p>Data from the existing Students module</p></div></div><div className={css.panelBody}><div className={css.detailGrid}>{[["Student name",student.student_name],["Grade",student.grade||"—"],["Parent / Guardian",fullParent||"—"],["Email",student.email||"—"],["Phone",student.phone||"—"],["Status",student.status]].map(([label,value])=><div className={css.detail} key={label}><small>{label}</small><strong>{value}</strong></div>)}</div></div></section>}
  {tab==="enrollments"&&<section className={css.panel}><div className={css.panelHead}><div><h2>Course enrollments</h2><p>Courses assigned to this student</p></div></div><div className={css.panelBody}><div className={css.recordList}>{enrollments.map(x=><div className={css.record} key={x.id}><div><strong>{x.course_name}</strong><p>Enrolled {dateString(x.enrolled_at)}{x.notes?` · ${x.notes}`:""}</p></div><span className={css.pill}>{x.status}</span></div>)}{!enrollments.length&&<p className={css.muted}>No enrollments recorded.</p>}</div></div></section>}
  {tab==="batches"&&<section className={css.panel}><div className={css.panelHead}><div><h2>Teaching batches</h2><p>Only batches linked to this student's membership</p></div></div><div className={css.panelBody}><div className={css.recordList}>{batches.map(x=><div className={css.record} key={x.id}><div><strong>{x.batch_name}</strong><p>{x.course_name} · {x.trainer_name||"Trainer unassigned"}</p></div><span className={css.pill}>{x.status}</span></div>)}{!batches.length&&<p className={css.muted}>No batch assignments recorded.</p>}</div></div></section>}
  {tab==="progress"&&<section className={css.panel}><div className={css.panelHead}><div><h2>Class progress and attendance</h2><p>Read-only view from the student progress report</p></div></div><div className={css.tableScroll}><table className={css.table}><thead><tr><th>Class date</th><th>Batch</th><th>Topic</th><th>Attendance</th><th>Homework</th></tr></thead><tbody>{progress.map((x,i)=><tr key={`${x.session_id}-${i}`}><td>{dateString(x.class_date)}</td><td>{x.batch_name}</td><td>{x.topic_covered||"—"}</td><td>{x.attendance_status||"Not recorded"}</td><td>{x.homework_completed===true?"Completed":x.homework_completed===false?"Not completed":"Not recorded"}</td></tr>)}</tbody></table></div>{!progress.length&&<div className={css.empty}>No progress entries found.</div>}</section>}
  {tab==="finance"&&FINANCE.has(role)&&<section className={css.panel}><div className={css.panelHead}><div><h2>Student fees and payments</h2><p>Financial details are shown only for authorized CRM roles</p></div></div><div className={css.tableScroll}><table className={css.table}><thead><tr><th>Batch</th><th>Course</th><th>Fees</th><th>Received</th><th>Pending</th><th>Next due</th><th>Status</th></tr></thead><tbody>{payments.map((p,i)=><tr key={`${p.finance_id||p.batch_id}-${i}`}><td>{p.batch_name}</td><td>{p.course_name}</td><td>{usd(p.total_fee_usd)}</td><td>{usd(p.total_paid_usd)}</td><td>{usd(p.pending_usd)}</td><td>{dateString(p.next_due_date)}</td><td><span className={css.pill}>{p.payment_status}</span></td></tr>)}</tbody></table></div>{!payments.length&&<div className={css.empty}>No accessible financial records for this student.</div>}</section>}
  </>}
 </main></div>;
}
