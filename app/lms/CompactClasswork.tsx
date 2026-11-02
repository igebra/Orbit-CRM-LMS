"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import styles from "./compactClasswork.module.css";

export type ClassworkSession = {
  id: string;
  course_name: string;
  session_number: number;
  topic: string | null;
  learning_objectives: string | null;
  required_resource_types: string[];
  status: string;
};

export type ClassworkResource = {
  id: string;
  curriculum_session_id: string;
  resource_type: string;
  title: string;
  description: string | null;
  external_url: string | null;
  is_archived: boolean;
};

export type ClassworkVersion = {
  id: string;
  resource_id: string;
  version_number: number;
  file_name: string;
  storage_path: string;
  size_bytes: number | null;
  created_at: string;
};

export type ResourceDraft = {
  session_number: string;
  resource_type: string;
  title: string;
  description: string;
  mode: "file" | "link";
  file: File | null;
  externalUrl: string;
};

type Props = {
  course: string;
  plannedSessions: number | null;
  sessions: ClassworkSession[];
  resources: ClassworkResource[];
  versions: ClassworkVersion[];
  resourceTypes: string[];
  canManage: boolean;
  loading: boolean;
  working: boolean;
  onSave: (draft: ResourceDraft) => Promise<boolean>;
  onGenerateSessions: () => Promise<void>;
  onEditSession: (session: ClassworkSession) => void;
  onOpenFile: (version: ClassworkVersion) => void;
  onOpenLink: (resource: ClassworkResource) => void;
  onVersions: (resource: ClassworkResource) => void;
  onReplace: (resource: ClassworkResource) => void;
  onEditLink: (resource: ClassworkResource) => void;
  onArchive: (resource: ClassworkResource) => void;
};

function fileLabel(bytes: number | null) {
  if (bytes == null) return "";
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CompactClasswork({
  course, plannedSessions, sessions, resources, versions, resourceTypes,
  canManage, loading, working, onSave, onGenerateSessions, onEditSession,
  onOpenFile, onOpenLink, onVersions, onReplace, onEditLink, onArchive
}: Props) {
  const [selected, setSelected] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("PPT / Deck");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [mode, setMode] = useState<"file" | "link">("file");
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [fileKey, setFileKey] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(1);
    setSearch("");
    setTitle("");
    setDescription("");
    setFile(null);
    setExternalUrl("");
    setShowDescription(false);
    setMode("file");
    setFileKey((key) => key + 1);
  }, [course]);

  const sessionByNumber = useMemo(
    () => new Map(sessions.map((session) => [session.session_number, session])),
    [sessions]
  );
  const resourcesBySession = useMemo(() => {
    const grouped = new Map<string, ClassworkResource[]>();
    resources.filter((item) => !item.is_archived).forEach((item) => {
      grouped.set(item.curriculum_session_id, [...(grouped.get(item.curriculum_session_id) || []), item]);
    });
    return grouped;
  }, [resources]);
  const versionByResource = useMemo(() => {
    const latest = new Map<string, ClassworkVersion>();
    for (const version of versions) {
      const prev = latest.get(version.resource_id);
      if (!prev || version.version_number > prev.version_number) latest.set(version.resource_id, version);
    }
    return latest;
  }, [versions]);

  const maximum = Math.max(plannedSessions || 0, ...sessions.map((session) => session.session_number), 0);
  const numbers = Array.from({ length: maximum }, (_, i) => i + 1);
  const shown = numbers.filter((num) => {
    const session = sessionByNumber.get(num);
    const term = search.trim().toLowerCase();
    return !term || `class ${num} ${session?.topic || ""}`.toLowerCase().includes(term);
  });
  const current = sessionByNumber.get(selected);
  const attached = current ? resourcesBySession.get(current.id) || [] : [];
  const total = resources.filter((item) => !item.is_archived && sessions.some((s) => s.id === item.curriculum_session_id)).length;

  function pickClass(num: number) {
    setSelected(num);
    setTitle("");
    setDescription("");
    setShowDescription(false);
    setFile(null);
    setExternalUrl("");
    setMode("file");
    setFileKey((key) => key + 1);
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canManage || saving) return;
    setSaving(true);
    try {
      const ok = await onSave({
        session_number: String(selected), resource_type: type,
        title: title.trim(), description: description.trim(),
        mode, file, externalUrl: externalUrl.trim()
      });
      if (ok) {
        setTitle("");
        setDescription("");
        setFile(null);
        setExternalUrl("");
        setShowDescription(false);
        setFileKey((key) => key + 1);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.wrap} aria-label="Classroom-style content administration">
      <div className={styles.banner}>
        <div>
          <span className={styles.eyebrow}>MASTER COURSE LIBRARY</span>
          <h2>{course}</h2>
          <p>Classwork · Add resources directly to a lesson. No batch required.</p>
        </div>
        <div className={styles.bannerStats}>
          <span><strong>{sessions.length}</strong> saved classes</span>
          <span><strong>{total}</strong> resources</span>
        </div>
      </div>
      <div className={styles.subnav} role="navigation" aria-label="Classwork navigation">
        <strong>Classwork</strong>
        <span>Everything in one place</span>
        <span className={styles.hint}>Select class → Add material → Review below</span>
      </div>
      <div className={styles.columns}>
        <section className={styles.lessonPanel} aria-label="Lessons">
          <div className={styles.panelHeading}>
            <div><h3>Lessons</h3><p>{maximum} classes · select to edit</p></div>
          </div>
          <label className={styles.searchLabel}>
            <span className={styles.srOnly}>Find a lesson</span>
            <input type="search" placeholder="Find a lesson..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          {loading ? <p className={styles.empty}>Loading curriculum...</p> : maximum === 0 ?
            <div className={styles.empty}>No classes yet. Create curriculum sessions to get started.</div> :
            <div className={styles.lessonList}>
              {shown.map((num) => {
                const session = sessionByNumber.get(num);
                const items = session ? resourcesBySession.get(session.id) || [] : [];
                const required = session?.required_resource_types || [];
                const present = new Set(items.map((item) => item.resource_type));
                const complete = session && required.length > 0 && required.every((item) => present.has(item));
                return (
                  <button key={num} type="button" onClick={() => pickClass(num)} className={`${styles.lesson} ${selected === num ? styles.selected : ""}`} aria-pressed={selected === num}>
                    <span className={styles.lessonNumber}>{String(num).padStart(2, "0")}</span>
                    <span className={styles.lessonText}>
                      <strong>{session?.topic || `Class ${String(num).padStart(2, "0")}`}</strong>
                      <small>{items.length} material{items.length === 1 ? "" : "s"} · {complete ? "Complete" : session ? "In progress" : "Not started"}</small>
                    </span>
                    <span className={styles.chevron} aria-hidden="true">›</span>
                  </button>
                );
              })}
              {shown.length === 0 && <p className={styles.empty}>No lessons match your search.</p>}
            </div>
          }
          {canManage && <div className={styles.listFooter}>
            <button type="button" onClick={onGenerateSessions} disabled={working}>Create missing class slots</button>
            <small>AiEdge / Coding4AI: 20 per level. Math: configurable.</small>
          </div>}
        </section>

        <section className={styles.editorPanel} aria-label="Selected lesson details">
          <div className={styles.editorHeading}>
            <div>
              <span className={styles.eyebrowDark}>CLASS {String(selected).padStart(2, "0")}</span>
              <h3>{current?.topic || `Class ${String(selected).padStart(2, "0")}`}</h3>
              <p>{current?.learning_objectives || "Add slides, worksheets, recordings, homework, and class notes."}</p>
            </div>
            {canManage && current && <button className={styles.editTopic} type="button" onClick={() => onEditSession(current)}>Edit lesson details</button>}
          </div>

          {maximum === 0 ? <div className={styles.empty}>Create class slots to begin adding resources.</div> : <div className={styles.editorContent}>
            {canManage && <form onSubmit={save} className={styles.form}>
              <div className={styles.formHeading}>
                <h4>+ Add learning material</h4>
                <span>Saved to the master library</span>
              </div>
              <div className={styles.fields}>
                <label><span>Material type</span><select value={type} onChange={(e) => setType(e.target.value)}>{resourceTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label><span>Title</span><input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="E.g. Class 03 slides" /></label>
              </div>
              <div className={styles.modeRow} role="group" aria-label="Material source">
                <button type="button" className={mode === "file" ? styles.activeMode : ""} onClick={() => { setMode("file"); setExternalUrl(""); }}>Upload file</button>
                <button type="button" className={mode === "link" ? styles.activeMode : ""} onClick={() => { setMode("link"); setFile(null); }}>External link</button>
              </div>
              {mode === "file" ?
                <label className={styles.filePick}><span>Choose a file (max 100 MB)</span><input key={fileKey} type="file" onChange={(e) => { const value = e.target.files?.[0] || null; setFile(value); if (value && !title.trim()) setTitle(value.name.replace(/\.[^.]+$/, "")); }} required /></label> :
                <label className={styles.filePick}><span>Google Drive, Zoom, YouTube, or other HTTPS link</span><input type="url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} required placeholder="https://..." /></label>
              }
              <button type="button" className={styles.descriptionToggle} aria-expanded={showDescription} onClick={() => setShowDescription(!showDescription)}>{showDescription ? "− Hide description" : "+ Optional description"}</button>
              {showDescription && <label className={styles.descriptionField}><span>Description</span><textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Instructions for the trainer or students" /></label>}
              <div className={styles.formActions}><small>Saved files appear in the attachments panel immediately.</small><button type="submit" disabled={saving || working}>{saving ? "Saving..." : mode === "file" ? "Upload material" : "Save link"}</button></div>
            </form>}

            <div className={styles.attachments}>
              <div className={styles.attachHeading}>
                <div><h4>Attached materials</h4><p>Visible immediately after upload · {attached.length} item{attached.length === 1 ? "" : "s"}</p></div>
              </div>
              {attached.length === 0 ? <div className={styles.emptyAttachment}>No materials attached to this class yet.</div> :
                <div className={styles.resourceList}>{attached.map((item) => {
                  const version = versionByResource.get(item.id);
                  return <article key={item.id} className={styles.resource}>
                    <div className={styles.resourceIcon}>{version ? "▤" : "↗"}</div>
                    <div className={styles.resourceInfo}>
                      <strong>{item.title}</strong>
                      <small>{item.resource_type} · {version ? `${version.file_name} · v${version.version_number} · ${fileLabel(version.size_bytes)}` : item.external_url ? "External link" : "No file linked"}</small>
                      {item.description && <p>{item.description}</p>}
                    </div>
                    <div className={styles.resourceActions}>
                      {version && <button type="button" onClick={() => onOpenFile(version)}>Open</button>}
                      {item.external_url && <button type="button" onClick={() => onOpenLink(item)}>Open link</button>}
                      {version && <button type="button" onClick={() => onVersions(item)}>Versions</button>}
                      {canManage && version && <button type="button" onClick={() => onReplace(item)}>Replace</button>}
                      {canManage && item.external_url && <button type="button" onClick={() => onEditLink(item)}>Edit link</button>}
                      {canManage && <button type="button" className={styles.archive} onClick={() => onArchive(item)}>Archive</button>}
                    </div>
                  </article>;
                })}</div>
              }
            </div>
          </div>}
        </section>
      </div>
    </section>
  );
}
