import { useMemo, useState } from "react";
import type { ReactNode } from "react"; // type-only import (verbatimModuleSyntax)
import { useSummary, useList } from "./features/comebacks/hooks";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";

// local type for the byStatus items so .find() callbacks are typed
type StatusCount = { status: string; count: number };

export default function App() {
  // filters
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [advisor, setAdvisor] = useState("");
  const [location, setLocation] = useState("");

  // table
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // build query params
  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (type) p.set("type", type);
    if (status) p.set("status", status);
    if (advisor) p.set("advisor", advisor);
    if (location) p.set("location", location);
    return p;
  }, [type, status, advisor, location]);

  const listParams = useMemo(() => {
    const p = new URLSearchParams(params);
    p.set("page", String(page));
    p.set("limit", String(limit));
    return p;
  }, [params, page, limit]);

  // data
  const { data: summary, isLoading: sumLoading, error: sumErr } = useSummary(params);
  const { data: list, isLoading: listLoading, error: listErr } = useList(listParams);

  const exportHref =
    `${import.meta.env.VITE_API_URL}/comebacks/export.csv?` +
    new URLSearchParams({
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(advisor ? { advisor } : {}),
      ...(location ? { location } : {}),
      limit: "5000",
    }).toString();

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", color: "#0f172a" }}>
      <h1 style={{ marginBottom: 12 }}>Comeback Tracker — Dashboard</h1>

      {/* Filters */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 220px)", gap: 12, marginBottom: 12 }}>
        <Field label="Type">
          <select value={type} onChange={e => { setType(e.target.value); setPage(1); }}>
            <option value="">(any)</option>
            <option>workmanship</option>
            <option>misdiagnosis</option>
            <option>parts_failure</option>
            <option>customer_declined_work</option>
            <option>new_issue</option>
          </select>
        </Field>
        <Field label="Status">
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">(any)</option>
            <option>open</option>
            <option>in_progress</option>
            <option>resolved</option>
            <option>closed</option>
          </select>
        </Field>
        <Field label="Advisor contains">
          <input value={advisor} onChange={e => { setAdvisor(e.target.value); setPage(1); }} placeholder="e.g. Sam" />
        </Field>
        <Field label="Location contains">
          <input value={location} onChange={e => { setLocation(e.target.value); setPage(1); }} placeholder="e.g. Evanston" />
        </Field>
        <Field label="Rows">
          <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}>
            <option>10</option><option>20</option><option>50</option><option>100</option>
          </select>
        </Field>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <Kpi label="Total" value={summary?.total ?? 0} loading={sumLoading} />
        <Kpi
          label="Open"
          value={summary?.byStatus.find((s: StatusCount) => s.status === "open")?.count ?? 0}
          loading={sumLoading}
        />
        <Kpi
          label="Resolved"
          value={summary?.byStatus.find((s: StatusCount) => s.status === "resolved")?.count ?? 0}
          loading={sumLoading}
        />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, height: 280 }}>
        <Card title="By Type" loading={sumLoading} error={sumErr}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary?.byType || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="By Status" loading={sumLoading} error={sumErr}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary?.byStatus || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div style={{ marginTop: 12, height: 280 }}>
        <Card title="Daily Trend" loading={sumLoading} error={sumErr}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={summary?.byDay || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Table */}
      <div style={{ marginTop: 12 }}>
        <Card title={`Records (page ${list?.page ?? 1} of ${list?.pages ?? 1})`} loading={listLoading} error={listErr}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["RO","Customer","Advisor","Location","Type","Status","Comeback","Orig Repair","Parts$","Labor$"].map(h => (
                  <th key={h} style={{ textAlign:"left", borderBottom:"1px solid #eee", padding:"8px 6px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(list?.items || []).map((r: any) => (
                <tr key={r._id}>
                  <Td>{r.roNumber}</Td>
                  <Td>{r.customerName}</Td>
                  <Td>{r.advisor}</Td>
                  <Td>{r.location}</Td>
                  <Td>{r.type}</Td>
                  <Td>{r.resolution?.status}</Td>
                  <Td>{(r.dateOfComeback||"").slice(0,10)}</Td>
                  <Td>{(r.dateOriginalRepair||"").slice(0,10)}</Td>
                  <Td>{r.financial?.partsCost}</Td>
                  <Td>{r.financial?.laborCost}</Td>
                </tr>
              ))}
              {(!listLoading && (list?.items?.length ?? 0) === 0) && (
                <tr><Td colSpan={10}>No records</Td></tr>
              )}
            </tbody>
          </table>

          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <button disabled={(list?.page||1) <= 1} onClick={()=> setPage(p => Math.max(1, p-1))}>Prev</button>
            <button disabled={(list?.page||1) >= (list?.pages||1)} onClick={()=> setPage(p => p+1)}>Next</button>
            <a style={{ marginLeft: "auto" }} href={exportHref}>Export CSV</a>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ fontSize:12, color:"#6b7280" }}>
      {label}
      <div style={{ marginTop: 4 }}>{children}</div>
    </label>
  );
}

function Kpi({ label, value, loading }: { label: string; value: number; loading?: boolean }) {
  return (
    <div style={{ flex:1, border:"1px solid #eee", borderRadius:12, padding:12 }}>
      <div style={{ fontSize:12, color:"#6b7280" }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:700 }}>{loading ? "…" : value}</div>
    </div>
  );
}

function Card({
  title, children, loading, error,
}:{
  title: string;
  children: ReactNode;
  loading?: boolean;
  error?: unknown;
}) {
  return (
    <div style={{ border:"1px solid #eee", borderRadius:12, padding:12, height:"100%", background:"#fff" }}>
      <div style={{ fontWeight:600, marginBottom:6 }}>{title}</div>
      {error
        ? <div style={{ color:"#b91c1c" }}>{error instanceof Error ? error.message : String(error)}</div>
        : loading
          ? <div>Loading…</div>
          : children}
    </div>
  );
}

function Td(props: any) {
  return <td {...props} style={{ borderBottom:"1px solid #f1f1f1", padding:"8px 6px" }} />;
}
