import { useState, useEffect } from "react";
import "./App.css";

const API = "http://localhost:8000";

const STATUS_ORDER = ["draft", "submitted", "approved", "rejected"];

const STATUS_META = {
  draft:     { label: "Draft",     color: "status-draft" },
  submitted: { label: "Submitted", color: "status-submitted" },
  approved:  { label: "Approved",  color: "status-approved" },
  rejected:  { label: "Rejected",  color: "status-rejected" },
};

const NEXT_ACTION = {
  draft:     { label: "Submit",  next: "submitted" },
  submitted: { label: "Approve", next: "approved"  },
  rejected:  { label: "Re-draft", next: "draft"    },
};

const REJECT_FROM = ["submitted"];

export default function App() {
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [department, setDepartment] = useState("");
  const [employees, setEmployees] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [toast, setToast]         = useState("");

  // ── Fetch all employees on mount ──────────────────────────
  useEffect(() => { fetchEmployees(); }, []);

  async function fetchEmployees() {
    try {
      const res = await fetch(`${API}/employees`);
      const data = await res.json();
      setEmployees(data);
    } catch {
      showError("Could not reach the server. Is the backend running?");
    }
  }

  // ── Toast helpers ─────────────────────────────────────────
  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }
  function showError(msg) {
    setError(msg);
    setTimeout(() => setError(""), 4000);
  }

  // ── CRUD ──────────────────────────────────────────────────
  async function handleSaveDraft() {
    if (!name.trim() || !email.trim() || !department.trim()) {
      showError("All fields are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, department }),
      });
      const created = await res.json();
      setEmployees((prev) => [...prev, created]);
      clearForm();
      showToast("Draft saved.");
    } catch { showError("Failed to save draft."); }
    setLoading(false);
  }

  async function handleUpdateEmployee() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/employees/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, department }),
      });
      const updated = await res.json();
      setEmployees((prev) => prev.map((e) => (e.id === editingId ? updated : e)));
      clearForm();
      setEditingId(null);
      showToast("Record updated.");
    } catch { showError("Failed to update record."); }
    setLoading(false);
  }

  async function handleStatusChange(id, nextStatus) {
    try {
      const res = await fetch(`${API}/employees/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        showError(err.detail || "Invalid transition.");
        return;
      }
      const updated = await res.json();
      setEmployees((prev) => prev.map((e) => (e.id === id ? updated : e)));
      showToast(`Status → ${STATUS_META[nextStatus].label}`);
    } catch { showError("Status update failed."); }
  }

  async function handleDelete(id) {
    try {
      await fetch(`${API}/employees/${id}`, { method: "DELETE" });
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      if (expandedId === id) setExpandedId(null);
      showToast("Record deleted.");
    } catch { showError("Delete failed."); }
  }

  function handleEditEmployee(emp) {
    setName(emp.name);
    setEmail(emp.email);
    setDepartment(emp.department);
    setEditingId(emp.id);
    setExpandedId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearForm() {
    setName(""); setEmail(""); setDepartment("");
  }

  // ── Pipeline counts ───────────────────────────────────────
  const counts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = employees.filter((e) => e.status === s).length;
    return acc;
  }, {});

  return (
    <div className="container">

      {/* Toast / Error banners */}
      {toast && <div className="toast">{toast}</div>}
      {error && <div className="toast toast-error">{error}</div>}

      <h1 className="title">Employee Management</h1>
      <p className="title-sub">Manage employee records through the approval pipeline</p>

      {/* Pipeline status bar */}
      <div className="pipeline">
        {STATUS_ORDER.map((s, i) => (
          <div key={s} className="pipeline-step">
            <div className={`pipeline-dot ${STATUS_META[s].color}`}>
              {counts[s]}
            </div>
            <span className="pipeline-label">{STATUS_META[s].label}</span>
            {i < STATUS_ORDER.length - 1 && <div className="pipeline-arrow">→</div>}
          </div>
        ))}
      </div>

      {/* ── Form Card ── */}
      <div className="card">
        <div className="card-header">
          {editingId ? "✏️  Edit Draft" : "➕  New Employee Record"}
        </div>

        <div className="form-grid">
          <div className="field">
            <label>Full Name</label>
            <input className="input-field" placeholder="Jane Smith"
              value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Department</label>
            <input className="input-field" placeholder="Engineering"
              value={department} onChange={(e) => setDepartment(e.target.value)} />
          </div>
          <div className="field field-full">
            <label>Email Address</label>
            <input className="input-field" placeholder="jane@company.com"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>

        <div className="form-actions">
          {editingId && (
            <button className="secondary-btn"
              onClick={() => { setEditingId(null); clearForm(); }}>
              Cancel
            </button>
          )}
          {editingId ? (
            <button className="primary-btn update" onClick={handleUpdateEmployee} disabled={loading}>
              Save Changes
            </button>
          ) : (
            <button className="primary-btn" onClick={handleSaveDraft} disabled={loading}>
              {loading ? "Saving…" : "Save Draft"}
            </button>
          )}
        </div>
      </div>

      {/* ── Employee List ── */}
      <div className="card">
        <div className="list-header">
          <h2>Records</h2>
          <span className="employee-count">{employees.length} total</span>
        </div>

        {employees.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            No records yet — save a draft above to get started.
          </div>
        ) : (
          employees.map((emp) => {
            const isExpanded = expandedId === emp.id;
            const meta = STATUS_META[emp.status];
            const nextAction = NEXT_ACTION[emp.status];
            const canReject = REJECT_FROM.includes(emp.status);

            return (
              <div key={emp.id}
                className={`employee-card ${isExpanded ? "employee-card--expanded" : ""}`}>

                {/* ── Collapsed row ── */}
                <div className="employee-row"
                  onClick={() => setExpandedId(isExpanded ? null : emp.id)}>
                  <div className="employee-info">
                    <div className="employee-name">{emp.name}</div>
                    <div className="employee-meta">{emp.email}</div>
                    <span className={`status-badge ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="row-right">
                    <span className="employee-dept">{emp.department}</span>
                    <span className="expand-icon">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* ── Expanded draft view ── */}
                {isExpanded && (
                  <div className="draft-view">

                    {/* State machine timeline */}
                    <div className="state-timeline">
                      {STATUS_ORDER.map((s, i) => {
                        const idx = STATUS_ORDER.indexOf(emp.status);
                        const stepClass =
                          s === emp.status ? "step-active"
                          : i < idx        ? "step-done"
                          :                  "step-pending";
                        return (
                          <div key={s} className="timeline-step">
                            <div className={`timeline-dot ${stepClass}`} />
                            <span className={`timeline-label ${stepClass}`}>
                              {STATUS_META[s].label}
                            </span>
                            {i < STATUS_ORDER.length - 1 &&
                              <div className={`timeline-line ${i < idx ? "step-done" : "step-pending"}`} />
                            }
                          </div>
                        );
                      })}
                    </div>

                    {/* Record details */}
                    <div className="draft-details">
                      <div className="detail-row">
                        <span className="detail-label">Name</span>
                        <span className="detail-value">{emp.name}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Email</span>
                        <span className="detail-value">{emp.email}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Department</span>
                        <span className="detail-value">{emp.department}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Status</span>
                        <span className={`status-badge ${meta.color}`}>{meta.label}</span>
                      </div>
                    </div>

                    {/* Workflow actions */}
                    <div className="draft-actions">
                      {emp.status === "draft" && (
                        <button className="secondary-btn"
                          onClick={() => handleEditEmployee(emp)}>
                          Edit
                        </button>
                      )}
                      {nextAction && (
                        <button className={`primary-btn action-${nextAction.next}`}
                          onClick={() => handleStatusChange(emp.id, nextAction.next)}>
                          {nextAction.label}
                        </button>
                      )}
                      {canReject && (
                        <button className="danger-btn"
                          onClick={() => handleStatusChange(emp.id, "rejected")}>
                          Reject
                        </button>
                      )}
                      <button className="delete-btn"
                        onClick={() => handleDelete(emp.id)}>
                        Delete
                      </button>
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}