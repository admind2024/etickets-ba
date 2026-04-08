import { useState, useEffect } from "react";

const SUPABASE_URL = "https://hvpytasddzeprgqkwlbu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cHl0YXNkZHplcHJncWt3bGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDMyODQsImV4cCI6MjA4MjE3OTI4NH0.R1wPgBpyO7MHs0YL_pW0XBKkX8QweJ8MuhHUpuDSuKk";

interface Organizer {
  id: string;
  name: string;
  email: string;
  eventId: string;
  eventName: string;
  password: string;
  activeStatus: boolean | string;
  created_at: string;
}

interface RequestOptions extends RequestInit {
  prefer?: string;
}

const supabaseRequest = async (endpoint: string, options: RequestOptions = {}) => {
  const { prefer, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    Prefer: prefer || "return=representation",
  };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    ...fetchOptions,
    headers: headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Supabase error:", errorText);
    throw new Error(errorText);
  }

  if (options.method === "DELETE") return null;

  const text = await response.text();
  return text ? JSON.parse(text) : [];
};

export default function OrganizersAdmin() {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [events, setEvents] = useState<{ id: string; name: string; eventKey?: string; eventId?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    eventId: "",
    eventName: "",
    password: "",
    activeStatus: true,
  });

  // Mapa email -> password za auto-fill
  const [emailPasswordMap, setEmailPasswordMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [data, eventsData] = await Promise.all([
        supabaseRequest("Organizers?order=created_at.desc"),
        supabaseRequest("AboutEvents?select=id,name,eventKey,eventId&order=date.desc"),
      ]);
      setOrganizers(data || []);

      // Kreiraj mapu email -> password
      const pwMap = new Map<string, string>();
      (data || []).forEach((org: Organizer) => {
        if (org.email && org.password && !pwMap.has(org.email)) {
          pwMap.set(org.email, org.password);
        }
      });
      setEmailPasswordMap(pwMap);

      // Učitaj sve evente iz AboutEvents tabele
      setEvents((eventsData || []).map((e: { id: string; name: string; eventKey?: string; eventId?: string }) => ({
        id: e.id,
        name: e.name,
        eventKey: e.eventKey,
        eventId: e.eventId,
      })));
    } catch (error) {
      showToast("Greška pri učitavanju", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleEmailChange = (email: string) => {
    const existingPassword = emailPasswordMap.get(email);
    setFormData((prev) => ({
      ...prev,
      email,
      password: existingPassword || prev.password,
    }));
  };

  const openModal = (org: Organizer | null = null) => {
    setEditingId(org?.id || null);
    if (org) {
      const isActive = org.activeStatus === true;
      setFormData({
        name: org.name || "",
        email: org.email || "",
        eventId: org.eventId || "",
        eventName: org.eventName || "",
        password: org.password || "",
        activeStatus: isActive,
      });
    } else {
      setFormData({
        name: "",
        email: "",
        eventId: "",
        eventName: "",
        password: "",
        activeStatus: true,
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formData.email || !formData.eventId) {
      showToast("Email i događaj su obavezni", "error");
      return;
    }

    // Eksplicitno postavi boolean vrijednost
    const isActive = formData.activeStatus === true;

    const dataToSave = {
      name: formData.name,
      email: formData.email,
      eventId: formData.eventId,
      eventName: formData.eventName,
      password: formData.password,
      activeStatus: isActive,
    };

    console.log("Saving data:", dataToSave);
    console.log("Editing ID:", editingId);

    try {
      if (editingId) {
        const response = await supabaseRequest(`Organizers?id=eq.${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(dataToSave),
        });
        console.log("Update response:", response);
        showToast("Organizator ažuriran");
      } else {
        await supabaseRequest("Organizers", {
          method: "POST",
          body: JSON.stringify(dataToSave),
        });
        showToast("Organizator dodat");
      }
      closeModal();
      loadData();
    } catch (error: any) {
      console.error("Save error:", error);
      showToast("Greška: " + error.message, "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Obrisati organizatora?")) return;
    try {
      await supabaseRequest(`Organizers?id=eq.${id}`, { method: "DELETE" });
      showToast("Organizator obrisan");
      loadData();
    } catch (error) {
      showToast("Greška pri brisanju", "error");
    }
  };

  const toggleStatus = async (org: Organizer) => {
    const newStatus = !(org.activeStatus === true || org.activeStatus === "true");
    try {
      await supabaseRequest(`Organizers?id=eq.${org.id}`, {
        method: "PATCH",
        body: JSON.stringify({ activeStatus: newStatus }),
      });
      loadData();
    } catch (error) {
      showToast("Greška pri promjeni statusa", "error");
    }
  };

  const filtered = organizers.filter((org) => {
    const matchSearch =
      !search ||
      (org.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (org.email?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (org.eventName?.toLowerCase() || "").includes(search.toLowerCase());
    const matchEvent = !eventFilter || org.eventId === eventFilter;
    const matchStatus =
      statusFilter === "" ||
      (statusFilter === "true"
        ? org.activeStatus === true || org.activeStatus === "true"
        : org.activeStatus === false || org.activeStatus === "false");
    return matchSearch && matchEvent && matchStatus;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "1.5rem" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>Organizatori - Admin</h1>
            <p style={{ fontSize: "0.875rem", color: "#64748b", margin: "0.25rem 0 0" }}>
              Ukupno: {organizers.length} | Prikazano: {filtered.length}
            </p>
          </div>
          <button
            onClick={() => openModal()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0.625rem 1.25rem",
              background: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>+</span> Dodaj
          </button>
        </div>

        {/* Main Card */}
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
          {/* Filters */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              padding: "1rem",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              placeholder="Pretraži..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                minWidth: 200,
                padding: "0.5rem 0.75rem",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                fontSize: "0.875rem",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              style={{
                padding: "0.5rem 0.75rem",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                fontSize: "0.875rem",
                minWidth: 180,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              <option value="">Svi događaji</option>
              {events.map((e) => {
                const resolvedId = e.eventKey || e.eventId || e.id;
                return (
                  <option key={e.id} value={resolvedId}>
                    {e.name}
                  </option>
                );
              })}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "0.5rem 0.75rem",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                fontSize: "0.875rem",
                minWidth: 120,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              <option value="">Svi</option>
              <option value="true">Aktivni</option>
              <option value="false">Neaktivni</option>
            </select>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Ime", "Email", "Događaj", "Lozinka", "Status", "Akcije"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "0.75rem 1rem",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "#64748b",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "3rem", textAlign: "center" }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          border: "3px solid #e2e8f0",
                          borderTopColor: "#6366f1",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                          margin: "0 auto",
                        }}
                      />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                      Nema rezultata
                    </td>
                  </tr>
                ) : (
                  filtered.map((org) => {
                    const isActive = org.activeStatus === true || org.activeStatus === "true";
                    return (
                      <tr key={org.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "0.75rem 1rem", fontWeight: 500 }}>{org.name || "-"}</td>
                        <td style={{ padding: "0.75rem 1rem", color: "#64748b" }}>{org.email}</td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "0.25rem 0.5rem",
                              background: "#f1f5f9",
                              borderRadius: 4,
                              fontSize: "0.75rem",
                              color: "#475569",
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {org.eventName || org.eventId}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace", color: "#64748b" }}>
                          {org.password || "-"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <div
                            onClick={() => toggleStatus(org)}
                            style={{
                              width: 40,
                              height: 22,
                              borderRadius: 11,
                              cursor: "pointer",
                              background: isActive ? "#10b981" : "#e2e8f0",
                              position: "relative",
                              transition: "background 0.2s",
                            }}
                          >
                            <div
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                background: "white",
                                position: "absolute",
                                top: 3,
                                left: isActive ? 21 : 3,
                                transition: "left 0.2s",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                              }}
                            />
                          </div>
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={() => openModal(org)}
                              style={{
                                padding: "0.375rem 0.625rem",
                                background: "white",
                                border: "1px solid #e2e8f0",
                                borderRadius: 6,
                                fontSize: "0.75rem",
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(org.id)}
                              style={{
                                padding: "0.375rem 0.625rem",
                                background: "white",
                                border: "1px solid #fecaca",
                                borderRadius: 6,
                                fontSize: "0.75rem",
                                color: "#ef4444",
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          onClick={(e) => e.target === e.currentTarget && closeModal()}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.4)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "1rem",
            zIndex: 100,
          }}
        >
          <div style={{ background: "white", borderRadius: 12, width: "100%", maxWidth: 450 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem 1.25rem",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>
                {editingId ? "Izmijeni" : "Dodaj organizatora"}
              </h2>
              <button
                onClick={closeModal}
                style={{
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f8fafc",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: "1rem",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "1.25rem" }}>
              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    marginBottom: "0.375rem",
                    color: "#475569",
                  }}
                >
                  Događaj <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={formData.eventId}
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    const selected = events.find((ev) => (ev.eventKey || ev.eventId || ev.id) === selectedVal);
                    setFormData({ ...formData, eventId: selectedVal, eventName: selected?.name || "" });
                  }}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    fontSize: "0.875rem",
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <option value="">Izaberi događaj</option>
                  {events.map((e) => {
                    const resolvedId = e.eventKey || e.eventId || e.id;
                    return (
                      <option key={e.id} value={resolvedId}>
                        {e.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    marginBottom: "0.375rem",
                    color: "#475569",
                  }}
                >
                  Email <span style={{ color: "#ef4444" }}>*</span>
                  <span style={{ fontWeight: 400, color: "#94a3b8", marginLeft: 8 }}>(lozinka se auto-popuni)</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="email@example.com"
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    fontSize: "0.875rem",
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      marginBottom: "0.375rem",
                      color: "#475569",
                    }}
                  >
                    Ime
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ime organizatora"
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: 6,
                      fontSize: "0.875rem",
                      fontFamily: "inherit",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      marginBottom: "0.375rem",
                      color: "#475569",
                    }}
                  >
                    Lozinka
                  </label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Lozinka"
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: 6,
                      fontSize: "0.875rem",
                      fontFamily: "inherit",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    marginBottom: "0.375rem",
                    color: "#475569",
                  }}
                >
                  Status
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    onClick={() => setFormData({ ...formData, activeStatus: !formData.activeStatus })}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      cursor: "pointer",
                      background: formData.activeStatus ? "#10b981" : "#e2e8f0",
                      position: "relative",
                      transition: "background 0.2s",
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "white",
                        position: "absolute",
                        top: 3,
                        left: formData.activeStatus ? 23 : 3,
                        transition: "left 0.2s",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "0.875rem", color: formData.activeStatus ? "#10b981" : "#64748b" }}>
                    {formData.activeStatus ? "Aktivan" : "Neaktivan"}
                  </span>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
                padding: "1rem 1.25rem",
                background: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <button
                onClick={closeModal}
                style={{
                  padding: "0.5rem 1rem",
                  background: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: 6,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Otkaži
              </button>
              <button
                onClick={handleSave}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#6366f1",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Sačuvaj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            padding: "0.875rem 1.25rem",
            background: "white",
            borderRadius: 8,
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
            borderLeft: `4px solid ${toast.type === "error" ? "#ef4444" : "#10b981"}`,
            animation: "slideIn 0.3s ease",
            fontSize: "0.875rem",
          }}
        >
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
