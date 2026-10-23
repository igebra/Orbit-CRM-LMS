"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import styles from "./crm-insights.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type LeadRow = {
  id: string;
  child_name: string | null;
  parent_first_name: string | null;
  parent_last_name: string | null;
  course_interested: string | null;
  lead_stage: string | null;
  lead_source: string | null;
  next_follow_up_date: string | null;
  created_at: string;
};
type ActivityRow = {
  id: string;
  lead_id: string;
  action_type: string;
  created_at: string;
};
const CHART_COLORS = ["#B6DEE5", "#DDD0E7", "#E8C4D9", "#CDE4D7", "#F5E8B8", "#D9EBF1", "#F3D7C5"];
const MAX_ANALYTICS_LEADS = 5000;

function todayISO() {
  // CRM follow-up is stored as date-only; never invent an appointment time.
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}
function friendlyDate(d: string) {
  const [y,m,day] = d.split("-").map(Number);
  return new Date(y,m-1,day).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
}
function pct(value:number, total:number) { return total > 0 ? Math.round(100 * value / total) : 0; }
function sortCounts(rows:LeadRow[], field:"lead_stage"|"lead_source") {
  const c = new Map<string,number>();
  for (const row of rows) {
    const label = (row[field] || "").trim() || "Unspecified";
    c.set(label,(c.get(label)||0)+1);
  }
  return [...c].sort((a,b)=>b[1]-a[1]);
}

export default function CRMInsights({role}:{role:string}) {
  const router=useRouter();
  const canView=["super_admin","admin","sales","sales_marketing","marketing","viewer_management"].includes(role);
  const [rows,setRows]=useState<LeadRow[]>([]);
  const [activities,setActivities]=useState<ActivityRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [activityError,setActivityError]=useState(false);
  const [truncated,setTruncated]=useState(false);
  const [revision,setRevision]=useState(0);

  const refresh=useCallback(()=>setRevision(n=>n+1),[]);
  useEffect(()=>{
    if(!canView){setRows([]);setActivities([]);setLoading(false);return;}
    let cancelled=false;
    async function load(){
      setLoading(true);setError(null);setActivityError(false);
      const all:LeadRow[]=[];
      try{
        for(let offset=0;offset<MAX_ANALYTICS_LEADS;offset+=500){
          const res=await supabase
            .from("leads")
            .select("id,child_name,parent_first_name,parent_last_name,course_interested,lead_stage,lead_source,next_follow_up_date,created_at")
            .order("created_at",{ascending:false})
            .range(offset,offset+499);
          if(res.error)throw res.error;
          const page=(res.data||[]) as LeadRow[];
          all.push(...page);
          if(page.length<500)break;
        }
        if(cancelled)return;
        setRows(all);
        setTruncated(all.length>=MAX_ANALYTICS_LEADS);
      } catch(e) {
        if(!cancelled)setError(e instanceof Error ? e.message : "Could not load CRM insights.");
      }
      const activity=await supabase.from("lead_activities")
        .select("id,lead_id,action_type,created_at")
        .order("created_at",{ascending:false}).limit(5);
      if(!cancelled){
        if(activity.error)setActivityError(true);
        else setActivities((activity.data||[]) as ActivityRow[]);
        setLoading(false);
      }
    }
    void load();
    return()=>{cancelled=true;};
  },[canView,revision]);

  const stageData=useMemo(()=>sortCounts(rows,"lead_stage"),[rows]);
  const sourceData=useMemo(()=>sortCounts(rows,"lead_source"),[rows]);
  const maxStage=Math.max(1,...stageData.map(r=>r[1]));
  const sourceGradient=useMemo(()=>{
    if(!rows.length)return "#F0F4F5";
    let p=0;
    const segments=sourceData.map(([,count],i)=>{
      const end=p+count/rows.length*100;
      const part=`${CHART_COLORS[i%CHART_COLORS.length]} ${p}% ${end}%`;
      p=end;
      return part;
    });
    return `conic-gradient(${segments.join(",")})`;
  },[rows,sourceData]);
  const followUps=useMemo(()=>{
    const today=todayISO();
    return rows.filter(r=>r.next_follow_up_date &&
      !["Enrolled","Lost"].includes(r.lead_stage||""))
      .sort((a,b)=>(a.next_follow_up_date||"").localeCompare(b.next_follow_up_date||""))
      .slice(0,5).map(r=>({...r,isOverdue:(r.next_follow_up_date||"")<today}));
  },[rows]);
  if(!canView)return null;

  return <section className={styles.root} aria-label="CRM Insights">
    <div className={styles.sectionHeading}>
      <div><h2>CRM insights</h2><p>Lead stages, sources and upcoming work · authorized CRM records</p></div>
      <button type="button" onClick={refresh} disabled={loading} className={styles.refresh}>Refresh</button>
    </div>
    {loading ? <div className={styles.loading} role="status">Loading CRM insights…</div> :
      error ? <div className={styles.error} role="alert">Unable to load CRM insights: {error} <button type="button" onClick={refresh}>Try again</button></div> :
      <div className={styles.grid}>
        <div className={styles.panel}>
          <header><h3>Current lead distribution</h3><span>{rows.length.toLocaleString("en-IN")} visible leads</span></header>
          {!stageData.length?<p className={styles.empty}>No lead stages to display.</p> :
          <div className={styles.bars}>
            {stageData.map(([label,n],i)=><div key={label} className={styles.barRow}>
              <span className={styles.barLabel}>{label}</span>
              <div className={styles.track} role="img" aria-label={`${label}: ${n} leads`}>
                <div className={styles.bar} style={{width:`${n/maxStage*100}%`,backgroundColor:CHART_COLORS[i%CHART_COLORS.length]}} />
              </div>
              <strong>{n}</strong>
            </div>)}
          </div>}
          <p className={styles.caption}>Counts show current stages, not historical conversion rates.</p>
        </div>
        <div className={styles.panel}>
          <header><h3>Lead sources</h3><span>All visible leads</span></header>
          {!rows.length?<p className={styles.empty}>No source data yet.</p>:
          <div className={styles.sourceBody}>
            <div className={styles.donut} style={{background:sourceGradient}} role="img" aria-label="Lead sources chart"><span>{rows.length}</span></div>
            <div className={styles.legend}>
              {sourceData.map(([name,n],i)=><div key={name}><i style={{background:CHART_COLORS[i%CHART_COLORS.length]}}/><span title={name}>{name}</span><strong>{pct(n,rows.length)}%</strong></div>)}
            </div>
          </div>}
        </div>
        <div className={styles.panel}>
          <header><h3>Recent leads</h3><button type="button" className={styles.link} onClick={()=>router.push("/crm/leads")}>View all →</button></header>
          {!rows.length?<p className={styles.empty}>No recent leads.</p>:
          <div className={styles.tableWrap}><table>
            <thead><tr><th>Student</th><th>Parent</th><th>Stage</th></tr></thead>
            <tbody>{rows.slice(0,5).map(r=><tr key={r.id}>
              <td>{r.child_name||"Not recorded"}</td>
              <td>{[r.parent_first_name,r.parent_last_name].filter(Boolean).join(" ")||"Not recorded"}</td>
              <td><span className={styles.status}>{r.lead_stage||"Unspecified"}</span></td>
            </tr>)}</tbody>
          </table></div>}
        </div>
        <div className={styles.stacked}>
          <div className={styles.panel}>
            <header><h3>Upcoming follow-ups</h3><button type="button" className={styles.link} onClick={()=>router.push("/crm/leads")}>Open leads →</button></header>
            {!followUps.length?<p className={styles.empty}>No upcoming or overdue follow-ups.</p> :
            <div className={styles.followUps}>{followUps.map(r=>
              <div key={r.id}>
                <span>{r.child_name||"Student not recorded"}<small>{r.lead_stage||"Unspecified"}</small></span>
                <strong className={r.isOverdue?styles.overdue:""}>{r.next_follow_up_date?friendlyDate(r.next_follow_up_date):""}{r.isOverdue?" · overdue":""}</strong>
              </div>)}</div>}
          </div>
          <div className={styles.panel}>
            <header><h3>Recent activity</h3></header>
            {activityError?<p className={styles.empty}>Activity records are not available for this account.</p>:
              !activities.length?<p className={styles.empty}>No recent activity.</p>:
              <div className={styles.activities}>{activities.map(a=><div key={a.id}>
                <span>{a.action_type||"Updated lead"}</span>
                <small>{new Date(a.created_at).toLocaleDateString("en-IN")}</small>
              </div>)}</div>}
          </div>
          <div className={styles.mascot}>
            <div><strong>Need to follow up?</strong><p>Review your active leads and keep every conversation moving.</p><button type="button" onClick={()=>router.push("/crm/leads")}>Open CRM Leads →</button></div>
            {/* Decorative: copy and button fully communicate the helper */}
            <img src="/orbit-mascot.png" alt="" />
          </div>
        </div>
      </div>}
    {truncated&&!loading&&!error?<p className={styles.caption}>Showing up to {MAX_ANALYTICS_LEADS.toLocaleString("en-IN")} authorized leads. Use CRM reports for larger datasets.</p>:null}
  </section>;
}
