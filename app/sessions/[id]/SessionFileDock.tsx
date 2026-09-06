"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams, useRouter } from "next/navigation";
import styles from "./session-files.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type SessionFile = {
  id: string;
  file_type: string;
  file_name: string;
  storage_path: string;
  size_bytes: number | null;
  created_at: string;
};

type MasterResource = {
  id: string;
  resource_type: string;
  title: string;
  description: string | null;
};

type MasterVersion = {
  id: string;
  resource_id: string;
  version_number: number;
  file_name: string;
  storage_path: string;
  size_bytes: number | null;
  created_at: string;
};

const FILE_TYPES = [
  "PPT / Deck",
  "Homework / Worksheet",
  "Assessment",
  "Reference Material",
  "Other",
];
const MAX_FILE_BYTES = 25 * 1024 * 1024;

function formatFileSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function safeFileName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function SessionFileDock() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<SessionFile[]>([]);
  const [masterResources, setMasterResources] = useState<MasterResource[]>([]);
  const [masterVersions, setMasterVersions] = useState<MasterVersion[]>([]);
  const [role, setRole] = useState("");
  const [userId, setUserId] = useState("");
  const [fileType, setFileType] = useState("PPT / Deck");
  const [uploading, setUploading] = useState(false);
  const [storageReady, setStorageReady] = useState(true);
  const [message, setMessage] = useState("");
  const [recordingUrl, setRecordingUrl] = useState("");
  const [courseName, setCourseName] = useState("");
  const [sessionNumber, setSessionNumber] = useState<number | null>(null);
  const [curriculumTopic, setCurriculumTopic] = useState("");

  const canManage = [
    "super_admin",
    "admin",
    "sales",
    "sales_marketing",
    "trainer",
  ].includes(role);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      setUserId(data.user.id);

      const [{ data: profile }, { data: session }] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("role")
          .eq("id", data.user.id)
          .single(),
        supabase
          .from("class_sessions")
          .select("zoom_recording_url,batch_id,session_number")
          .eq("id", sessionId)
          .single(),
      ]);

      setRole(profile?.role || "");
      setRecordingUrl(session?.zoom_recording_url || "");

      let course = "";
      const number: number | null = session?.session_number || null;

      if (session?.batch_id) {
        const { data: batch } = await supabase
          .from("batches")
          .select("course_name")
          .eq("id", session.batch_id)
          .single();

        course = batch?.course_name || "";
      }

      setCourseName(course);
      setSessionNumber(number);

      await Promise.all([loadFiles(), loadMasterResources(course, number)]);
    }

    init();
  }, [sessionId]);

  async function loadFiles() {
    const { data, error } = await supabase
      .from("session_files")
      .select("id,file_type,file_name,storage_path,size_bytes,created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });

    if (error) {
      setStorageReady(false);
      setFiles([]);
      return;
    }

    setStorageReady(true);
    setFiles((data || []) as SessionFile[]);
  }

  async function loadMasterResources(course: string, number: number | null) {
    if (!course || !number) {
      setMasterResources([]);
      setMasterVersions([]);
      return;
    }

    const { data: curriculum } = await supabase
      .from("lms_curriculum_sessions")
      .select("id,topic")
      .eq("course_name", course)
      .eq("session_number", number)
      .maybeSingle();

    if (!curriculum?.id) {
      setMasterResources([]);
      setMasterVersions([]);
      return;
    }

    setCurriculumTopic(curriculum.topic || "");

    const { data: resources } = await supabase
      .from("lms_resources")
      .select("id,resource_type,title,description")
      .eq("curriculum_session_id", curriculum.id)
      .eq("is_archived", false)
      .order("resource_type");

    const rows = (resources || []) as MasterResource[];
    setMasterResources(rows);

    const ids = rows.map((resource) => resource.id);
    if (!ids.length) {
      setMasterVersions([]);
      return;
    }

    const { data: versions } = await supabase
      .from("lms_resource_versions")
      .select("id,resource_id,version_number,file_name,storage_path,size_bytes,created_at")
      .in("resource_id", ids)
      .order("version_number", { ascending: false });

    setMasterVersions((versions || []) as MasterVersion[]);
  }

  const latestMasterVersions = useMemo(() => {
    const map = new Map<string, MasterVersion>();
    [...masterVersions]
      .sort((a, b) => b.version_number - a.version_number)
      .forEach((version) => {
        if (!map.has(version.resource_id)) map.set(version.resource_id, version);
      });
    return map;
  }, [masterVersions]);

  async function uploadFile(file: File | null) {
    if (!file || !canManage) return;

    if (file.size > MAX_FILE_BYTES) {
      setMessage("File is too large. Orbit allows a maximum of 25 MB per class file.");
      return;
    }

    setUploading(true);
    setMessage("");

    const cleanName = safeFileName(file.name) || "file";
    const uniquePart =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const storagePath = `${sessionId}/${uniquePart}-${cleanName}`;

    const upload = await supabase.storage
      .from("lms-files")
      .upload(storagePath, file, { cacheControl: "3600", upsert: false });

    if (upload.error) {
      setUploading(false);
      setMessage(upload.error.message);
      return;
    }

    const insert = await supabase.from("session_files").insert({
      session_id: sessionId,
      file_type: fileType,
      file_name: file.name,
      storage_path: storagePath,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: userId || null,
    });

    if (insert.error) {
      await supabase.storage.from("lms-files").remove([storagePath]);
      setUploading(false);
      setMessage(insert.error.message);
      return;
    }

    setUploading(false);
    setMessage(`${file.name} uploaded.`);
    await loadFiles();
  }

  async function openStorageFile(bucket: string, path: string) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600);

    if (error || !data?.signedUrl) {
      setMessage(error?.message || "Could not open this file.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function removeFile(file: SessionFile) {
    if (!canManage) return;
    if (!confirm(`Remove ${file.file_name} from this class?`)) return;

    const storageDelete = await supabase.storage
      .from("lms-files")
      .remove([file.storage_path]);

    if (storageDelete.error) {
      setMessage(storageDelete.error.message);
      return;
    }

    const dbDelete = await supabase
      .from("session_files")
      .delete()
      .eq("id", file.id);

    if (dbDelete.error) {
      setMessage(dbDelete.error.message);
      return;
    }

    setMessage("Class-specific file removed.");
    await loadFiles();
  }

  const totalFiles = files.length + masterResources.length;

  return (
    <>
      <button type="button" className={styles.dockButton} onClick={() => setOpen(true)}>
        <span>Class Materials</span>
        {totalFiles > 0 && <strong>{totalFiles}</strong>}
      </button>

      {open && (
        <div className={styles.backdrop} onClick={() => setOpen(false)}>
          <section className={styles.panel} onClick={(event) => event.stopPropagation()}>
            <header className={styles.header}>
              <div>
                <p>CLASS SESSION</p>
                <h2>Materials & Recording</h2>
                <span>
                  {courseName || "Course"} {sessionNumber ? `· Session ${sessionNumber}` : ""}
                  {curriculumTopic ? ` · ${curriculumTopic}` : ""}
                </span>
              </div>
              <button type="button" className={styles.close} onClick={() => setOpen(false)}>×</button>
            </header>

            {message && <div className={styles.message}>{message}</div>}

            <div className={styles.sectionHeading}>
              <div>
                <strong>Official Course Materials</strong>
                <span>Automatically inherited from the LMS Content Library.</span>
              </div>
              {canManage && courseName && sessionNumber && (
                <button
                  type="button"
                  onClick={() => router.push(`/lms?course=${encodeURIComponent(courseName)}&session=${sessionNumber}`)}
                >
                  Manage in LMS
                </button>
              )}
            </div>

            <div className={styles.fileList}>
              {masterResources.length === 0 ? (
                <div className={styles.empty}>No official course materials are linked yet.</div>
              ) : (
                masterResources.map((resource) => {
                  const latest = latestMasterVersions.get(resource.id);
                  return (
                    <div className={styles.fileRow} key={resource.id}>
                      <div className={styles.fileInfo}>
                        <span>{resource.resource_type}</span>
                        <strong>{resource.title}</strong>
                        <small>
                          {latest
                            ? `${latest.file_name} · v${latest.version_number} · ${formatFileSize(latest.size_bytes)}`
                            : "File not uploaded"}
                        </small>
                      </div>
                      {latest && (
                        <div className={styles.actions}>
                          <button type="button" onClick={() => openStorageFile("lms-library", latest.storage_path)}>Open</button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className={styles.divider} />

            <div className={styles.sectionHeading}>
              <div>
                <strong>Class-Specific Files</strong>
                <span>Use these only for extra material unique to this batch/class.</span>
              </div>
            </div>

            {!storageReady ? (
              <div className={styles.setupNote}>Class-specific storage is not enabled.</div>
            ) : (
              <>
                {canManage && (
                  <div className={styles.uploadBox}>
                    <label>
                      <span>File Type</span>
                      <select value={fileType} onChange={(event) => setFileType(event.target.value)}>
                        {FILE_TYPES.map((type) => <option key={type}>{type}</option>)}
                      </select>
                    </label>
                    <label className={styles.filePicker}>
                      <span>{uploading ? "Uploading..." : "+ Upload Extra File"}</span>
                      <input
                        type="file"
                        disabled={uploading}
                        accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp,.zip,.py,.ipynb"
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          void uploadFile(file);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                )}

                <div className={styles.fileList}>
                  {files.length === 0 ? (
                    <div className={styles.empty}>No class-specific files uploaded.</div>
                  ) : (
                    files.map((file) => (
                      <div className={styles.fileRow} key={file.id}>
                        <div className={styles.fileInfo}>
                          <span>{file.file_type}</span>
                          <strong>{file.file_name}</strong>
                          <small>{formatFileSize(file.size_bytes)} · {new Date(file.created_at).toLocaleString()}</small>
                        </div>
                        <div className={styles.actions}>
                          <button type="button" onClick={() => openStorageFile("lms-files", file.storage_path)}>Open</button>
                          {canManage && <button type="button" className={styles.remove} onClick={() => removeFile(file)}>Remove</button>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            <div className={styles.recording}>
              <div>
                <span>Zoom Recording</span>
                <strong>{recordingUrl ? "Recording link saved" : "No recording link added yet"}</strong>
                <small>Large recordings stay in Zoom Cloud / Drive. Orbit stores the link only.</small>
              </div>
              {recordingUrl && <a href={recordingUrl} target="_blank" rel="noreferrer">Open Recording</a>}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
