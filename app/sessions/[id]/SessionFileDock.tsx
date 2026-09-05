"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams } from "next/navigation";
import styles from "./session-files.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type SessionFile = {
  id: string;
  session_id: string;
  file_type: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
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

  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<SessionFile[]>([]);
  const [role, setRole] = useState("");
  const [userId, setUserId] = useState("");
  const [fileType, setFileType] = useState("PPT / Deck");
  const [uploading, setUploading] = useState(false);
  const [storageReady, setStorageReady] = useState(true);
  const [message, setMessage] = useState("");
  const [recordingUrl, setRecordingUrl] = useState("");

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
          .select("zoom_recording_url")
          .eq("id", sessionId)
          .single(),
      ]);

      setRole(profile?.role || "");
      setRecordingUrl(session?.zoom_recording_url || "");
      await loadFiles();
    }

    init();
  }, [sessionId]);

  async function loadFiles() {
    const { data, error } = await supabase
      .from("session_files")
      .select(
        "id,session_id,file_type,file_name,storage_path,mime_type,size_bytes,uploaded_by,created_at"
      )
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
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

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

  async function openFile(file: SessionFile) {
    setMessage("");

    const { data, error } = await supabase.storage
      .from("lms-files")
      .createSignedUrl(file.storage_path, 60 * 60);

    if (error || !data?.signedUrl) {
      setMessage(error?.message || "Could not open this file.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function removeFile(file: SessionFile) {
    if (!canManage) return;

    if (!confirm(`Remove ${file.file_name} from this class?`)) return;

    setMessage("");

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

    setMessage("File removed.");
    await loadFiles();
  }

  return (
    <>
      <button
        type="button"
        className={styles.dockButton}
        onClick={() => setOpen(true)}
      >
        <span>Class Files</span>
        {files.length > 0 && <strong>{files.length}</strong>}
      </button>

      {open && (
        <div className={styles.backdrop} onClick={() => setOpen(false)}>
          <section
            className={styles.panel}
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.header}>
              <div>
                <p>CLASS SESSION</p>
                <h2>Files & Recording</h2>
                <span>
                  Store class documents in Orbit. Keep large video recordings in Zoom Cloud or Drive.
                </span>
              </div>
              <button
                type="button"
                className={styles.close}
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </header>

            {message && <div className={styles.message}>{message}</div>}

            {!storageReady ? (
              <div className={styles.setupNote}>
                Orbit class-file storage is not enabled yet. Run{" "}
                <strong>Orbit_LMS_File_Storage.sql</strong> once in Supabase,
                then refresh this page.
              </div>
            ) : (
              <>
                {canManage && (
                  <div className={styles.uploadBox}>
                    <label>
                      <span>File Type</span>
                      <select
                        value={fileType}
                        onChange={(event) => setFileType(event.target.value)}
                      >
                        {FILE_TYPES.map((type) => (
                          <option key={type}>{type}</option>
                        ))}
                      </select>
                    </label>

                    <label className={styles.filePicker}>
                      <span>{uploading ? "Uploading..." : "+ Upload File"}</span>
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

                    <small>
                      Maximum 25 MB. PPT, PDF, Word, Excel, images, ZIP, Python
                      and notebook files are supported.
                    </small>
                  </div>
                )}

                <div className={styles.fileList}>
                  {files.length === 0 ? (
                    <div className={styles.empty}>No class files uploaded yet.</div>
                  ) : (
                    files.map((file) => (
                      <div className={styles.fileRow} key={file.id}>
                        <div className={styles.fileInfo}>
                          <span>{file.file_type}</span>
                          <strong>{file.file_name}</strong>
                          <small>
                            {formatFileSize(file.size_bytes)} ·{" "}
                            {new Date(file.created_at).toLocaleString()}
                          </small>
                        </div>

                        <div className={styles.actions}>
                          <button
                            type="button"
                            onClick={() => void openFile(file)}
                          >
                            Open
                          </button>
                          {canManage && (
                            <button
                              type="button"
                              className={styles.remove}
                              onClick={() => void removeFile(file)}
                            >
                              Remove
                            </button>
                          )}
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
                <strong>
                  {recordingUrl
                    ? "Recording link saved for this class"
                    : "No recording link added yet"}
                </strong>
                <small>
                  Add or update the recording URL in the Class Materials section
                  of this session.
                </small>
              </div>

              {recordingUrl && (
                <a href={recordingUrl} target="_blank" rel="noreferrer">
                  Open Recording
                </a>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
