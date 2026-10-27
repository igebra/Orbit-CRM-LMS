"use client";

import { useEffect, useMemo, useState, type ReactNode, type ChangeEvent } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";
import OrbitSidebar from "../../components/OrbitSidebar";
import css from "./operations.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const ALLOWED = new Set(["super_admin", "admin", "sales", "sales_marketing", "marketing", "accounts_finance", "viewer_management"]);
const FINANCE = new Set(["super_admin", "admin", "sales", "sales_marketing", "accounts_finance", "viewer_management"]);
const SALES = new Set(["super_admin", "admin", "sales", "sales_marketing", "marketing", "viewer_management"]);
const TEAM = new Set(["super_admin", "admin"]);
const TODAY = () => localDate(new Date());

type Lead = { id: string; child_name: string; parent_first_name: string; parent_last_name: string | null; email: string | null; lead_stage: string; assigned_to: string | null; next_follow_up_date: string | null; course_interested: string | null; created_at: string };
type Student = { id: string; student_name: string; grade: string | null; parent_first_name: string | null; parent_last_name: string | null; email: string | null; status: string; created_at: string };
type Outstanding = { finance_id: string; student_id: string; student_name: string; batch_name: string; course_name: string; total_fee_usd: number; total_paid_usd: number; pending_usd: number; next_due_date: string | null; payment_status: string };
type Transaction = { transaction_id: string; payment_date: string; student_name: string; amount_usd: number; payment_mode: string };
type TeamMember = { user_id: string; full_name: string | null; email: string | null; role: string; is_active: boolean; created_at: string };
type ClassSession = { id: string; session_date: string; scheduled_at: string | null; batch_id: string; trainer_name: string | null; status: string; topic_planned: string | null };
type Demo = { id: string; demo_course: string; scheduled_at: string; status: string };
type Tab = "overview" | "leads" | "students" | "payments" | "team";
type Col<T> = { label: string; id: keyof T; cell?: (item: T) => ReactNode };

function localDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function dateDisplay(v: string | null | undefined) { if (!v) return "—"; const d = new Date(v.length === 10 ? `${v}T12:00:00` : v); return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"}); }
function usd(n: number) { return Number(n || 0).toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}); }
function parentName(s: {parent_first_name:string|null;parent_last_name:string|null}) {return `${s.parent_first_name||""} ${s.parent_last_name||""}`.trim() || "—";}
function initials(name: string) { return name.trim().slice(0,1).toUpperCase() || "O"; }
function downloadCsv(name: string, rows: string[][]) {
  // Prefix formula-like values so spreadsheet applications do not execute them.
  const safe = (v: string) => { const val = /^[\s]*[=+@-]/.test(v) ? `'${v}` : v; return `"${val.replace(/"/g,'""')}"`; };
  const csv = "\uFEFF" + rows.map(r=>r.map(safe).join(",")).join("\r\n");
  const blob = new Blob([csv],{type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href=url; link.download=name; link.click(); URL.revokeObjectURL(url);
}

function DataTable<T extends {id:string}>({rows,columns,placeholder,filterValues,exportName,filterValue,filterLabel}: {rows:T[];columns:Col<T>[];placeholder:string;filterValues?:(row:T)=>string;exportName:string;filterLabel?:string;filterValue?:(row:T)=>string}) {
  const [choice,setChoice] = useState(""); const [query,setQuery] = useState(""); const [sort,setSort] = useState<keyof T>(columns[0].id); const [asc,setAsc] = useState(true); const [page,setPage] = useState(0); const perPage=12;
  const options=useMemo(()=>filterValue?Array.from(new Set(rows.map(filterValue).filter(Boolean))).sort():[],[rows,filterValue]);
  const filtered = useMemo(()=>rows.filter(r=>(!choice||!filterValue||filterValue(r)===choice) && (filterValues ? filterValues(r) : columns.map(c=>String(r[c.id]??"")).join(" ")).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>{
    const av=String(a[sort]??"");const bv=String(b[sort]??"");return (asc?1:-1)*av.localeCompare(bv,undefined,{numeric:true});
  }),[rows,query,choice,sort,asc,columns,filterValues,filterValue]);
  const pageCount=Math.max(1,Math.ceil(filtered.length/perPage)); const currentPage=Math.min(page,pageCount-1);
  function exportRows(){downloadCsv(exportName,[columns.map(c=>c.label),...filtered.map(r=>columns.map(c=>String(r[c.id]??"")))]);}
  return <div className={css.panel}>
    <div className={css.toolbar}>
      <input aria-label="Search records" className={css.search} placeholder={placeholder} value={query} onChange={(e:ChangeEvent<HTMLInputElement>)=>{setQuery(e.target.value);setPage(0);}} />
      {filterValue&&<select className={css.select} aria-label={filterLabel||"Filter records"} value={choice} onChange={(e:ChangeEvent<HTMLSelectElement>)=>{setChoice(e.target.value);setPage(0)}}><option value="">All {filterLabel||"records"}</option>{options.map(v=><option key={v} value={v}>{v}</option>)}</select>}
      <button className={css.miniButton} type="button" onClick={exportRows}>Export CSV</button>
      <span className={css.muted}>{filtered.length} records</span>
    </div>
    <div className={css.tableScroll}><table className={css.table}><thead><tr>{columns.map(c=><th key={String(c.id)} onClick={()=>{if(sort===c.id){setAsc(v=>!v)}else{setSort(c.id);setAsc(true);}}} title="Click to sort">{c.label}{sort===c.id ? (asc ? " ↑" : " ↓") : ""}</th>)}</tr></thead>
      <tbody>{filtered.slice(currentPage*perPage,(currentPage+1)*perPage).map(row=><tr key={row.id}>{columns.map(c=><td key={String(c.id)}>{c.cell ? c.cell(row) : String(row[c.id]??"—")}</td>)}</tr>)}</tbody>
    </table></div>
    {filtered.length===0 && <div className={css.empty}>No matching records found.</div>}
    <div className={css.pagination}><button className={css.miniButton} disabled={currentPage===0} onClick={()=>setPage(p=>Math.max(0,p-1))}>Previous</button><span>Page {currentPage+1} of {pageCount}</span><button className={css.miniButton} disabled={currentPage+1>=pageCount} onClick={()=>setPage(p=>p+1)}>Next</button></div>
    <div className={css.tableNote}>Read-only workspace. Exports and filters cover the first 1,000 accessible records. Use the existing CRM pages for edits.</div>
  </div>;
}

function WeeklyCalendar({weekOffset,changeWeek,classes,demos}: {weekOffset:number;changeWeek:(n:number)=>void;classes:ClassSession[];demos:Demo[]}) {
  const days=useMemo(()=>{const today=new Date();today.setHours(12,0,0,0);const diff=(today.getDay()+6)%7;today.setDate(today.getDate()-diff+weekOffset*7);return Array.from({length:7},(_,i)=>{const d=new Date(today);d.setDate(today.getDate()+i);return d;});},[weekOffset]);
  const range=`${days[0].toLocaleDateString(undefined,{day:"numeric",month:"short"})} – ${days[6].toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"})}`;
  return <section className={css.panel}><div className={css.panelHead}><div><h2>Weekly schedule</h2><p>Classes and demos for the selected week · browser-local time</p></div><div className={css.weekToolbar}><button className={css.miniButton} onClick={()=>changeWeek(weekOffset-1)} aria-label="Previous week">‹</button><span className={css.weekLabel}>{range}</span><button className={css.miniButton} onClick={()=>changeWeek(weekOffset+1)} aria-label="Next week">›</button><button className={css.miniButton} onClick={()=>changeWeek(0)}>This week</button></div></div>
  <div className={css.weekGrid}>{days.map(d=>{const k=localDate(d);const classDay=classes.filter(c=>c.session_date===k);const demoDay=demos.filter(e=>localDate(new Date(e.scheduled_at))===k);return <div className={css.day} key={k}><div className={css.dayHeader}><strong>{d.toLocaleDateString(undefined,{weekday:"short"})}</strong><small>{d.getDate()}</small></div>{classDay.map(c=><Link href="/batches" className={css.event} key={c.id}><strong>{c.topic_planned||"Class session"}</strong><small>{c.scheduled_at?new Date(c.scheduled_at).toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"}):"Time not recorded"}</small><small>{c.trainer_name||"Trainer to confirm"}</small></Link>)}{demoDay.map(e=><Link href="/crm/demos" className={`${css.event} ${css.eventDemo}`} key={e.id}><strong>{e.demo_course} demo</strong><small>{new Date(e.scheduled_at).toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"})}</small></Link>)}{classDay.length+demoDay.length===0&&<span className={css.noEvents}>No sessions</span>}</div>})}</div>
  </section>;
}

export default function OperationsWorkspace(){
  const router=useRouter(); const [email,setEmail]=useState("");const [role,setRole]=useState("");const [ready,setReady]=useState(false);const [error,setError]=useState("");const [tab,setTab]=useState<Tab>("overview");
  const [leads,setLeads]=useState<Lead[]>([]);const [students,setStudents]=useState<Student[]>([]);const [outstanding,setOutstanding]=useState<Outstanding[]>([]);const [transactions,setTransactions]=useState<Transaction[]>([]);const [members,setMembers]=useState<TeamMember[]>([]);const [classes,setClasses]=useState<ClassSession[]>([]);const [demos,setDemos]=useState<Demo[]>([]);const [weekOffset,setWeekOffset]=useState(0);const [pendingAccess,setPendingAccess]=useState(0);
  const canFinance=FINANCE.has(role); const canSales=SALES.has(role);const canTeam=TEAM.has(role);
  useEffect(()=>{let mounted=true;(async()=>{
    const {data:{user},error:authError}=await supabase.auth.getUser();if(!mounted)return;if(authError||!user){router.replace("/");return;}
    const {data:profile,error:profileError}=await supabase.from("user_profiles").select("role,is_active").eq("id",user.id).maybeSingle();if(!mounted)return;
    const userRole=profile?.role||"";const active=profile?.is_active===true;
    if(profileError||!active||!ALLOWED.has(userRole)){router.replace(userRole==="student"?"/student":userRole==="parent"?"/parent":"/dashboard");return;}
    setRole(userRole);setEmail(user.email||"");
    const baseTasks=[supabase.from("students").select("id,student_name,grade,parent_first_name,parent_last_name,email,status,created_at").order("created_at",{ascending:false}).limit(1000)];
    const studentResult=await baseTasks[0];
    if(!mounted)return;if(studentResult.error){setError(`Students: ${studentResult.error.message}`)}else setStudents((studentResult.data||[]) as Student[]);
    const tasks:Promise<void>[]=[];
    if(SALES.has(userRole))tasks.push((async()=>{const r=await supabase.from("leads").select("id,child_name,parent_first_name,parent_last_name,email,lead_stage,assigned_to,next_follow_up_date,course_interested,created_at").order("created_at",{ascending:false}).limit(1000);if(!mounted)return;if(r.error)setError(v=>[v,`Leads: ${r.error?.message}`].filter(Boolean).join(" | "));else setLeads((r.data||[]) as Lead[]);})());
    if(FINANCE.has(userRole))tasks.push((async()=>{const from=new Date();from.setDate(1);const [a,b]=await Promise.all([supabase.rpc("payment_outstanding_report"),supabase.rpc("payment_report_transactions",{p_from:localDate(from),p_to:TODAY()})]);if(!mounted)return;if(a.error||b.error)setError(v=>[v,`Finance: ${a.error?.message||b.error?.message}`].filter(Boolean).join(" | "));else{setOutstanding((a.data||[]) as Outstanding[]);setTransactions((b.data||[]) as Transaction[]);}})());
    if(TEAM.has(userRole))tasks.push((async()=>{const [m,c]=await Promise.all([supabase.rpc("access_management_users"),supabase.rpc("pending_access_request_count")]);if(!mounted)return;if(m.error)setError(v=>[v,`Team directory: ${m.error?.message}`].filter(Boolean).join(" | "));else setMembers((m.data||[]) as TeamMember[]);if(!c.error)setPendingAccess(Number(c.data||0));})());
    await Promise.all(tasks);if(mounted)setReady(true);
  })();return()=>{mounted=false};},[router]);
  useEffect(()=>{if(!ready)return;let active=true;(async()=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7)+weekOffset*7);const start=localDate(d);const startUtc=new Date(d.getFullYear(),d.getMonth(),d.getDate()).toISOString();d.setDate(d.getDate()+7);const end=localDate(d);const endUtc=new Date(d.getFullYear(),d.getMonth(),d.getDate()).toISOString();const [c,dm]=await Promise.all([supabase.from("class_sessions").select("id,session_date,scheduled_at,batch_id,trainer_name,status,topic_planned").gte("session_date",start).lt("session_date",end).in("status",["Scheduled","Rescheduled"]).order("session_date").limit(1000),supabase.from("demo_sessions").select("id,demo_course,scheduled_at,status").gte("scheduled_at",startUtc).lt("scheduled_at",endUtc).in("status",["Scheduled","Rescheduled"]).order("scheduled_at").limit(500)]);if(!active)return;if(c.error||dm.error)setError(v=>[v,`Schedule: ${c.error?.message||dm.error?.message}`].filter(Boolean).join(" | "));else{setClasses((c.data||[]) as ClassSession[]);setDemos((dm.data||[]) as Demo[]);}})();return()=>{active=false;};},[weekOffset,ready]);
  const dueLeads=leads.filter(l=>l.next_follow_up_date&&l.next_follow_up_date<=TODAY()&&!new Set(["Lost","Enrolled"]).has(l.lead_stage));
  const overdue=outstanding.filter(p=>Number(p.pending_usd)>0&&!!p.next_due_date&&p.next_due_date<TODAY());
  const pipeline=useMemo(()=>["Fresh Lead","Contacted","Demo Scheduled","Demo Completed","Interested","Enrolled","Lost"].map(stage=>({stage,count:leads.filter(l=>l.lead_stage===stage).length})),[leads]);
  const maxStage=Math.max(1,...pipeline.map(p=>p.count)); const monthPaid=transactions.reduce((sum,p)=>sum+Number(p.amount_usd||0),0); const balance=outstanding.reduce((sum,p)=>sum+Math.max(0,Number(p.pending_usd||0)),0);
  if(!ready)return <div className={css.loading}>Checking your Orbit permissions and loading operations…</div>;
  const leadCols:Col<Lead>[]=[{label:"Student",id:"child_name"},{label:"Parent",id:"parent_first_name",cell:r=>parentName(r)},{label:"Interested in",id:"course_interested"},{label:"Stage",id:"lead_stage",cell:r=><span className={css.pill}>{r.lead_stage}</span>},{label:"Assigned",id:"assigned_to"},{label:"Next follow-up",id:"next_follow_up_date",cell:r=>dateDisplay(r.next_follow_up_date)},{label:"Created",id:"created_at",cell:r=>dateDisplay(r.created_at)}];
  const studentCols:Col<Student>[]=[{label:"Student",id:"student_name",cell:r=><Link className={css.textLink} href={`/crm/operations/students/${encodeURIComponent(r.id)}`}>{r.student_name} ↗</Link>},{label:"Grade",id:"grade"},{label:"Parent",id:"parent_first_name",cell:r=>parentName(r)},{label:"Email",id:"email"},{label:"Status",id:"status",cell:r=><span className={css.pill}>{r.status}</span>},{label:"Added",id:"created_at",cell:r=>dateDisplay(r.created_at)}];
  const paymentRows=outstanding.map(p=>({...p,id:p.finance_id}));const paymentCols:Col<Outstanding & {id:string}>[]=[{label:"Student",id:"student_name"},{label:"Batch",id:"batch_name"},{label:"Course",id:"course_name"},{label:"Total fees",id:"total_fee_usd",cell:r=>usd(r.total_fee_usd)},{label:"Received",id:"total_paid_usd",cell:r=>usd(r.total_paid_usd)},{label:"Pending",id:"pending_usd",cell:r=><span className={Number(r.pending_usd)>0?css.pillWarn:css.pill}>{usd(r.pending_usd)}</span>},{label:"Due date",id:"next_due_date",cell:r=>dateDisplay(r.next_due_date)},{label:"Status",id:"payment_status"}];
  const teamRows=members.map(m=>({...m,id:m.user_id}));const teamCols:Col<TeamMember & {id:string}>[]=[{label:"Employee",id:"full_name",cell:m=><div className={css.person}><span className={css.personInitial}>{initials(m.full_name||m.email||"")}</span>{m.full_name||"Unnamed"}</div>},{label:"Email",id:"email"},{label:"Role",id:"role"},{label:"Status",id:"is_active",cell:m=><span className={css.pill}>{m.is_active?"Active":"Inactive"}</span>},{label:"Created",id:"created_at",cell:m=>dateDisplay(m.created_at)}];
  const tabs:{id:Tab,label:string,show:boolean}[]=[{id:"overview",label:"Overview",show:true},{id:"leads",label:"Leads",show:canSales},{id:"students",label:"Students 360",show:true},{id:"payments",label:"Payments",show:canFinance},{id:"team",label:"Team Directory",show:canTeam}];
  return <div className={css.shell}><OrbitSidebar email={email} active="overview"/><main className={css.main}>
    <div className={css.top}><div><p className={css.eyebrow}>CRM / OPERATIONS WORKSPACE</p><h1>Operations Hub</h1><p className={css.subheading}>Actionable records, upcoming sessions and financial visibility — connected to your existing Orbit CRM.</p></div><div className={css.topLinks}><Link className={css.textLink} href="/dashboard">← Dashboard</Link><Link className={css.textLink} href="/crm/leads">Open CRM</Link></div></div>
    {error&&<div className={css.notice} role="status">Some information could not be loaded: {error}. Access and records remain unchanged.</div>}
    <div className={css.tabbar} role="tablist" aria-label="CRM operations sections">{tabs.filter(t=>t.show).map(t=><button key={t.id} type="button" role="tab" aria-selected={tab===t.id} className={`${css.tab} ${tab===t.id?css.tabActive:""}`} onClick={()=>setTab(t.id)}>{t.label}</button>)}</div>
    {tab==="overview"&&<>
      <div className={css.cards}><div className={css.metric}><span className={css.metricLabel}>Accessible student records</span><div className={css.metricValue}>{students.length}</div><span className={css.metricHint}>Student directory</span></div><div className={css.metric}><span className={css.metricLabel}>{canSales?"Leads":"Student records"}</span><div className={css.metricValue}>{canSales?leads.length:students.length}</div><span className={css.metricHint}>Visible to your role</span></div><div className={css.metric}><span className={css.metricLabel}>Sessions this week</span><div className={css.metricValue}>{classes.length+demos.length}</div><span className={css.metricHint}>Classes and demos</span></div><div className={css.metric}><span className={css.metricLabel}>{canFinance?"Collected this month":"Outstanding actions"}</span><div className={css.metricValue}>{canFinance?usd(monthPaid):canSales?dueLeads.length:"—"}</div><span className={css.metricHint}>{canFinance?"Recorded transactions":"Role-specific priorities"}</span></div></div>
      <div className={css.grid}><section className={css.panel}><div className={css.panelHead}><div><h2>Action queue</h2><p>Live tasks derived from your records</p></div></div><div className={css.panelBody}><div className={css.actionList}>{canSales&&<Link href="/crm/leads" className={css.action}><span>Leads awaiting follow-up</span><span className={css.actionCount}>{dueLeads.length}</span></Link>}{canFinance&&<Link href="/payments" className={css.action}><span>Overdue payments</span><span className={`${css.actionCount} ${overdue.length?css.actionCritical:""}`}>{overdue.length}</span></Link>}{canTeam&&<Link href="/access" className={css.action}><span>Pending access requests</span><span className={css.actionCount}>{pendingAccess}</span></Link>}<Link href="/batches" className={css.action}><span>Class sessions this week</span><span className={css.actionCount}>{classes.length}</span></Link><Link href="/crm/demos" className={css.action}><span>Scheduled demo sessions</span><span className={css.actionCount}>{demos.length}</span></Link></div></div></section>
      <section className={css.panel}><div className={css.panelHead}><div><h2>{canSales?"Lead pipeline":"Operations summary"}</h2><p>{canSales?"Lead stages across accessible records":"Key workload indicators"}</p></div></div><div className={css.panelBody}>{canSales?<div className={css.pipeline}>{pipeline.map(p=><div key={p.stage} className={css.pipelineLine}><span>{p.stage}</span><div className={css.pipelineBar}><div className={css.pipelineFill} style={{width:`${100*p.count/maxStage}%`}}/></div><strong>{p.count}</strong></div>)}</div>:<div className={css.statColumns}><div className={css.statTile}><span>Active students</span><strong>{students.filter(s=>s.status==="Active").length}</strong></div><div className={css.statTile}><span>Scheduled sessions</span><strong>{classes.length}</strong></div></div>}</div></section></div>
      <div className={css.section}><WeeklyCalendar weekOffset={weekOffset} changeWeek={setWeekOffset} classes={classes} demos={demos}/></div>
      {canFinance&&<div className={css.section}><section className={css.panel}><div className={css.panelHead}><div><h2>Finance at a glance</h2><p>Based on current payment reports</p></div><button className={css.miniButton} onClick={()=>setTab("payments")}>View payments →</button></div><div className={css.panelBody}><div className={css.statColumns}><div className={css.statTile}><span>Receipts this month</span><strong>{usd(monthPaid)}</strong></div><div className={css.statTile}><span>Pending balances</span><strong>{usd(balance)}</strong></div></div></div></section></div>}
    </>}
    {tab==="leads"&&canSales&&<><div className={css.top}><div><h1>Leads</h1><p className={css.subheading}>Search, sort and export your accessible pipeline records.</p></div><Link href="/crm/leads" className={css.textLink}>Manage leads →</Link></div><DataTable rows={leads} columns={leadCols} placeholder="Find student, parent, stage or assigned team member" exportName="orbit-crm-leads.csv" filterLabel="stages" filterValue={r=>r.lead_stage} filterValues={r=>`${r.child_name} ${parentName(r)} ${r.lead_stage} ${r.email||""} ${r.assigned_to||""} ${r.course_interested||""}`}/></>}
    {tab==="students"&&<><div className={css.top}><div><h1>Students</h1><p className={css.subheading}>Select a student to open the 360-degree academic and enrollment view.</p></div><Link href="/students" className={css.textLink}>Manage students →</Link></div><DataTable rows={students} columns={studentCols} placeholder="Search by student, parent, grade or email" exportName="orbit-crm-students.csv" filterLabel="statuses" filterValue={r=>r.status} filterValues={r=>`${r.student_name} ${parentName(r)} ${r.grade||""} ${r.email||""} ${r.status}`}/></>}
    {tab==="payments"&&canFinance&&<><div className={css.cards}><div className={css.metric}><span className={css.metricLabel}>Collected this month</span><div className={css.metricValue}>{usd(monthPaid)}</div></div><div className={css.metric}><span className={css.metricLabel}>Outstanding balances</span><div className={css.metricValue}>{usd(balance)}</div></div><div className={css.metric}><span className={css.metricLabel}>Overdue accounts</span><div className={css.metricValue}>{overdue.length}</div></div><div className={css.metric}><span className={css.metricLabel}>Recorded transactions</span><div className={css.metricValue}>{transactions.length}</div></div></div><div className={css.top}><div><h1>Payment overview</h1><p className={css.subheading}>Read-only reporting with filtered CSV export.</p></div><Link href="/payments" className={css.textLink}>Open payment management →</Link></div><DataTable rows={paymentRows} columns={paymentCols} placeholder="Find student, batch, payment status or course" exportName="orbit-crm-outstanding.csv" filterLabel="statuses" filterValue={r=>r.payment_status}/></>}
    {tab==="team"&&canTeam&&<><div className={css.top}><div><h1>Team directory</h1><p className={css.subheading}>Review team members and account status. Existing Access controls remain the authority.</p></div><Link href="/access" className={css.textLink}>Manage access →</Link></div><DataTable rows={teamRows} columns={teamCols} placeholder="Find colleague, role or email" exportName="orbit-crm-team.csv" filterLabel="roles" filterValue={r=>r.role}/></>}
  </main></div>;
}
