"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import OrbitSidebar from "../components/OrbitSidebar";
import styles from "./access.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const STANDARD_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "sales", label: "Sales Admin" },
  { value: "marketing", label: "Marketing" },
  { value: "trainer", label: "Trainer" },
  { value: "accounts_finance", label: "Finance Admin" },
];

type RequestRow = {
  request_id: string;
  full_name: string | null;
  email: string;
  requested_role: string;
  approved_role: string | null;
  status: "Pending" | "Approved" | "Rejected";
  created_at: string;
  reviewed_at: string | null;
  activated_at: string | null;
  user_id: string | null;
  user_role: string | null;
  user_is_active: boolean | null;
};

type UserRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function displayRole(role: string | null | undefined) {
  const map: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    sales: "Sales Admin",
    marketing: "Marketing",
    sales_marketing: "Sales Admin",
    trainer: "Trainer",
    accounts_finance: "Finance Admin",
    viewer_management: "Viewer / Management",
    parent: "Parent",
    student: "Student",
  };

  return role ? map[role] || role : "—";
}

function roleFromRequest(requested: string) {
  const value = requested.trim().toLowerCase();

  if (value === "admin") return "admin";
  if (
    value === "sales" ||
    value === "sales admin" ||
    value === "sales / marketing"
  ) return "sales";
  if (value === "marketing") return "marketing";
  if (value === "trainer") return "trainer";
  if (
    value === "finance admin" ||
    value === "accounts / finance"
  ) return "accounts_finance";

  return "trainer";
}

export default function AccessPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [tab, setTab] = useState<"requests" | "users">("requests");
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [roleSelections, setRoleSelections] = useState<Record<string, string>>({});

  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const canManage = role === "super_admin" || role === "admin";
  const isSuperAdmin = role === "super_admin";

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace("/");
        return;
      }

      setEmail(data.user.email || "");
      setUserId(data.user.id);

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      const currentRole = profile?.role || "";
      setRole(currentRole);

      if (!["super_admin", "admin"].includes(currentRole)) {
        setMessage("You do not have access to Access Management.");
        setLoading(false);
        return;
      }

      await load();
    }

    init();
  }, [router]);

  async function load() {
    setLoading(true);
    setMessage("");

    const [requestResult, userResult] = await Promise.all([
      supabase.rpc("access_management_requests"),
      supabase.rpc("access_management_users"),
    ]);

    if (requestResult.error || userResult.error) {
      setMessage(
        requestResult.error?.message ||
          userResult.error?.message ||
          "Could not load access management."
      );
      setLoading(false);
      return;
    }

    const requestRows = (requestResult.data || []) as RequestRow[];
    const userRows = (userResult.data || []) as UserRow[];

    setRequests(requestRows);
    setUsers(userRows);

    const initialSelections: Record<string, string> = {};
    requestRows.forEach((request) => {
      initialSelections[request.request_id] =
        request.approved_role || roleFromRequest(request.requested_role);
    });
    setRoleSelections(initialSelections);

    setLoading(false);
  }

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();

    return requests.filter((request) => {
      const statusMatches =
        statusFilter === "All" || request.status === statusFilter;

      const searchMatches =
        !q ||
        [
          request.full_name,
          request.email,
          request.requested_role,
          request.approved_role,
          request.user_role,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);

      return statusMatches && searchMatches;
    });
  }, [requests, search, statusFilter]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return users;

    return users.filter((user) =>
      [user.full_name, user.email, user.role]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [users, search]);

  const pending = requests.filter((request) => request.status === "Pending").length;
  const approved = requests.filter((request) => request.status === "Approved").length;
  const activeUsers = users.filter((user) => user.is_active).length;

  async function approve(request: RequestRow) {
    const selectedRole =
      roleSelections[request.request_id] || roleFromRequest(request.requested_role);

    if (!confirm(`Approve ${request.email} as ${displayRole(selectedRole)}?`)) {
      return;
    }

    setMessage("");

    const { error } = await supabase.rpc("approve_access_request", {
      p_request_id: request.request_id,
      p_role: selectedRole,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      request.user_id
        ? "Access approved and existing Orbit account activated."
        : "Access approved. The user can now activate access from the Orbit login page."
    );

    await load();
  }

  async function reject(request: RequestRow) {
    if (!confirm(`Reject access request from ${request.email}?`)) {
      return;
    }

    setMessage("");

    const { error } = await supabase.rpc("reject_access_request", {
      p_request_id: request.request_id,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Access request rejected.");
    await load();
  }

  function openUser(user: UserRow) {
    setEditUser(user);
    setEditRole(user.role);
    setEditActive(user.is_active);
  }

  async function saveUser() {
    if (!editUser) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase.rpc("update_orbit_user_access", {
      p_user_id: editUser.user_id,
      p_role: editRole,
      p_is_active: editActive,
    });

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEditUser(null);
    setMessage("User access updated.");
    await load();
  }

  function accountState(request: RequestRow) {
    if (request.user_id && request.user_is_active) return "Active";
    if (request.user_id && !request.user_is_active) return "Inactive";
    if (request.status === "Approved") return "Waiting Activation";
    return "No Account";
  }

  const roleOptions = isSuperAdmin
    ? [{ value: "super_admin", label: "Super Admin" }, ...STANDARD_ROLES]
    : STANDARD_ROLES;

  if (!canManage && !loading) {
    return (
      <div className={styles.shell}>
        <OrbitSidebar email={email} active="access" />
        <main className={styles.main}>
          <div className={styles.message}>
            You do not have access to Access Management.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <OrbitSidebar email={email} active="access" />

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>ADMIN · ACCESS</p>
            <h1>Access Management</h1>
            <p>Approve requests and manage existing Orbit users.</p>
          </div>
        </header>

        {message && <div className={styles.message}>{message}</div>}

        <section className={styles.stats}>
          <div>
            <span>Pending Requests</span>
            <strong>{pending}</strong>
          </div>
          <div>
            <span>Approved Requests</span>
            <strong>{approved}</strong>
          </div>
          <div>
            <span>Active Users</span>
            <strong>{activeUsers}</strong>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.tabs}>
            <button
              className={tab === "requests" ? styles.activeTab : ""}
              onClick={() => setTab("requests")}
            >
              Access Requests
            </button>
            <button
              className={tab === "users" ? styles.activeTab : ""}
              onClick={() => setTab("users")}
            >
              Orbit Users
            </button>
          </div>

          <div className={styles.toolbar}>
            <input
              type="search"
              placeholder={
                tab === "requests"
                  ? "Search name, email or role..."
                  : "Search users..."
              }
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            {tab === "requests" && (
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option>All</option>
                <option>Pending</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
            )}
          </div>

          {loading ? (
            <div className={styles.empty}>Loading access...</div>
          ) : tab === "requests" ? (
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Requested</th>
                    <th>Requested On</th>
                    <th>Status</th>
                    <th>Account</th>
                    <th>Approve As</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={styles.empty}>
                        No access requests found.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((request) => (
                      <tr key={request.request_id}>
                        <td>
                          <strong>{request.full_name || "—"}</strong>
                        </td>
                        <td>{request.email}</td>
                        <td>{request.requested_role}</td>
                        <td>
                          {new Date(request.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <span
                            className={`${styles.status} ${
                              request.status === "Pending"
                                ? styles.pending
                                : request.status === "Approved"
                                ? styles.approved
                                : styles.rejected
                            }`}
                          >
                            {request.status}
                          </span>
                        </td>
                        <td>
                          <span className={styles.accountState}>
                            {accountState(request)}
                          </span>
                        </td>
                        <td>
                          {request.status === "Pending" ? (
                            <select
                              value={
                                roleSelections[request.request_id] ||
                                roleFromRequest(request.requested_role)
                              }
                              onChange={(event) =>
                                setRoleSelections({
                                  ...roleSelections,
                                  [request.request_id]: event.target.value,
                                })
                              }
                            >
                              {STANDARD_ROLES.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            displayRole(
                              request.approved_role || request.user_role
                            )
                          )}
                        </td>
                        <td>
                          {request.status === "Pending" ? (
                            <div className={styles.actions}>
                              <button
                                className={styles.approveButton}
                                onClick={() => approve(request)}
                              >
                                Approve
                              </button>
                              <button
                                className={styles.rejectButton}
                                onClick={() => reject(request)}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className={styles.muted}>
                              {request.reviewed_at
                                ? new Date(
                                    request.reviewed_at
                                  ).toLocaleDateString()
                                : "—"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={styles.empty}>
                        No Orbit users found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const protectedFromAdmin =
                        !isSuperAdmin && user.role === "super_admin";
                      const isSelf = user.user_id === userId;

                      return (
                        <tr key={user.user_id}>
                          <td>
                            <strong>{user.full_name || "Orbit User"}</strong>
                          </td>
                          <td>{user.email || "—"}</td>
                          <td>{displayRole(user.role)}</td>
                          <td>
                            <span
                              className={`${styles.status} ${
                                user.is_active
                                  ? styles.approved
                                  : styles.rejected
                              }`}
                            >
                              {user.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td>
                            {isSelf ? (
                              <span className={styles.muted}>Your account</span>
                            ) : protectedFromAdmin ? (
                              <span className={styles.muted}>Protected</span>
                            ) : (
                              <button
                                className={styles.editButton}
                                onClick={() => openUser(user)}
                              >
                                Manage
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className={styles.help}>
          <strong>How approval works:</strong> approve the request and choose the
          role. The user then opens the Orbit login page and selects
          <strong> Activate Approved Access</strong> to create their password.
          Trainer access links automatically when the email matches the Trainer
          Directory. Sales Admin has full Orbit access except login approval.
        </div>
      </main>

      {editUser && (
        <div className={styles.backdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Manage User</h2>
                <p>{editUser.email}</p>
              </div>
              <button onClick={() => setEditUser(null)}>×</button>
            </div>

            <div className={styles.formGrid}>
              <label>
                <span>Role</span>
                <select
                  value={editRole}
                  onChange={(event) => setEditRole(event.target.value)}
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Status</span>
                <select
                  value={editActive ? "Active" : "Inactive"}
                  onChange={(event) =>
                    setEditActive(event.target.value === "Active")
                  }
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </label>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.secondary}
                onClick={() => setEditUser(null)}
              >
                Cancel
              </button>
              <button
                className={styles.primary}
                onClick={saveUser}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Access"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
