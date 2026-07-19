import { useQuery } from "@tanstack/react-query";
import { paymentsApi } from "../../api/purchasesApi";
import { PageHeader, DataTable, StatusBadge } from "../../../../app/components/common";

export default function PaymentListPage() {
  const { data: resp, isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: () => paymentsApi.list(),
  });
  const payments = resp?.data || [];

  const columns = [
    { key: "paymentNumber", label: "Payment #" },
    { key: "vendorName", label: "Vendor", render: (_, row) => row.vendorName || row.vendorId?.name || "—" },
    {
      key: "amount",
      label: "Amount",
      render: (val) => <span style={{ color: "#dc2626", fontWeight: 600 }}>₹{Number(val || 0).toLocaleString("en-IN")}</span>,
    },
    { key: "paymentDate", label: "Date", render: (val) => val ? new Date(val).toLocaleDateString("en-IN") : "—" },
    { key: "paymentMethod", label: "Method", render: (val) => (val || "—").toUpperCase() },
    { key: "status", label: "Status", render: (val) => <StatusBadge status={val === "completed" ? "active" : "pending"}>{(val || "pending").toUpperCase()}</StatusBadge> },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <PageHeader title="Payments" subtitle="All vendor payments recorded." />
      <DataTable columns={columns} data={payments} loading={isLoading} emptyTitle="No payments" emptyDescription="Payments will appear here once recorded." />
    </div>
  );
}
