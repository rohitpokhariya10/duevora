import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { auditLogsApi } from "../../api/auditLogsApi";
import { DataTable, PageHeader, StatusBadge } from "../../../../app/components/common";

export default function AuditLogListPage() {
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ["auditLogs"], queryFn: () => auditLogsApi.list() });

  const columns = [
    {
      key: "createdAt",
      label: "When",
      render: (v) => (v ? new Date(v).toLocaleString("en-IN") : "—"),
    },
    {
      key: "user",
      label: "Actor",
      render: (v) => v?.name || v?.email || "System",
    },
    {
      key: "action",
      label: "Action",
      render: (val) => {
        const colors = { create: "#16a34a", update: "#2563eb", delete: "#dc2626", login: "#9333ea" };
        return <StatusBadge status={val === "delete" ? "error" : val === "create" ? "active" : "pending"}>{(val || "—").toUpperCase()}</StatusBadge>;
      },
    },
    { key: "resourceType", label: "Resource" },
    {
      key: "description",
      label: "Details",
      render: (val) => (
        <span style={{ maxWidth: 250, display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {val || "—"}
        </span>
      ),
    },
    { key: "ipAddress", label: "IP" },
  ];

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto" }}>
      <PageHeader title="Audit Trail" subtitle="Review who changed what and when across the organization." />
      <DataTable
        loading={query.isLoading}
        data={query.data?.data || []}
        columns={columns}
        onRowClick={(row) => navigate(`/dashboard/audit-logs/${row._id}`)}
        emptyTitle="No audit logs"
        emptyDescription="Actions will be logged as you use the system."
      />
    </div>
  );
}
