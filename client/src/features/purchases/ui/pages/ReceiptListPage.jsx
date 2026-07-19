import { useQuery } from "@tanstack/react-query";
import { receiptsApi } from "../../api/purchasesApi";
import { PageHeader, DataTable, StatusBadge } from "../../../../app/components/common";

export default function ReceiptListPage() {
  const { data: resp, isLoading } = useQuery({
    queryKey: ["receipts"],
    queryFn: () => receiptsApi.list(),
  });
  const receipts = resp?.data || [];

  const columns = [
    { key: "receiptNumber", label: "Receipt #" },
    { key: "customerName", label: "Customer", render: (_, row) => row.customerName || row.customerId?.name || "—" },
    {
      key: "amount",
      label: "Amount",
      render: (val) => <span style={{ color: "#16a34a", fontWeight: 600 }}>₹{Number(val || 0).toLocaleString("en-IN")}</span>,
    },
    { key: "receiptDate", label: "Date", render: (val) => val ? new Date(val).toLocaleDateString("en-IN") : "—" },
    { key: "paymentMethod", label: "Method", render: (val) => (val || "—").toUpperCase() },
    { key: "status", label: "Status", render: (val) => <StatusBadge status={val === "completed" ? "active" : "pending"}>{(val || "pending").toUpperCase()}</StatusBadge> },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <PageHeader title="Receipts" subtitle="All customer receipts recorded." />
      <DataTable columns={columns} data={receipts} loading={isLoading} emptyTitle="No receipts" emptyDescription="Receipts will appear here once recorded." />
    </div>
  );
}
