import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  HiOutlineScale,
  HiOutlineArrowTrendingUp,
  HiOutlineBanknotes,
  HiOutlineArrowDownOnSquare,
} from "react-icons/hi2";
import { reportsApi } from "../../api/reportsApi";
import { PageHeader, StatCard } from "../../../../app/components/common";

const today = () => new Date().toISOString().slice(0, 10);
const sixMonthsAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().slice(0, 10);
};

const inputStyle = {
  boxSizing: "border-box",
  padding: "8px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: 7,
  fontSize: 13,
};

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(sixMonthsAgo);
  const [endDate, setEndDate] = useState(today);

  const params = { startDate, endDate };

  const { data: tbData, isLoading: tbLoading } = useQuery({
    queryKey: ["trialBalance", startDate, endDate],
    queryFn: () => reportsApi.trialBalance(params),
  });

  const { data: plData, isLoading: plLoading } = useQuery({
    queryKey: ["profitLoss", startDate, endDate],
    queryFn: () => reportsApi.profitLoss(params),
  });

  const { data: bsData, isLoading: bsLoading } = useQuery({
    queryKey: ["balanceSheet", startDate, endDate],
    queryFn: () => reportsApi.balanceSheet(params),
  });

  const { data: cfData, isLoading: cfLoading } = useQuery({
    queryKey: ["cashFlow", startDate, endDate],
    queryFn: () => reportsApi.cashFlow(params),
  });

  const pl = plData?.data || {};
  const bs = bsData?.data || {};
  const cf = cfData?.data || {};
  const tb = tbData?.data?.rows || [];

  const isBalanced = tb.length > 0
    ? Math.abs(tb.reduce((s, r) => s + (r.totalDebit || 0), 0) - tb.reduce((s, r) => s + (r.totalCredit || 0), 0)) < 0.01
    : null;

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <PageHeader
        title="Reports"
        subtitle="Financial statements and trial balance for your organization."
      />

      {/* Date Range Filter */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>From</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={inputStyle}
        />
        <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>To</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 32 }}>
        <StatCard
          label="Revenue"
          value={pl.revenue != null ? `₹${Number(pl.revenue).toLocaleString("en-IN")}` : "—"}
        />
        <StatCard
          label="Expenses"
          value={pl.expenses != null ? `₹${Number(pl.expenses).toLocaleString("en-IN")}` : "—"}
        />
        <StatCard
          label="Net Profit"
          value={pl.netProfit != null ? `₹${Number(pl.netProfit).toLocaleString("en-IN")}` : "—"}
          trend={pl.netProfit > 0 ? "up" : pl.netProfit < 0 ? "down" : undefined}
        />
        <StatCard
          label="Net Cash Flow"
          value={cf.netCashFlow != null ? `₹${Number(cf.netCashFlow).toLocaleString("en-IN")}` : "—"}
          trend={cf.netCashFlow > 0 ? "up" : cf.netCashFlow < 0 ? "down" : undefined}
        />
      </div>

      {/* Report Sections */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Trial Balance */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <HiOutlineScale size={20} color="#2563eb" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Trial Balance</h3>
          </div>
          {tbLoading ? (
            <p style={{ color: "#94a3b8", fontSize: 13 }}>Loading...</p>
          ) : tb.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: 13 }}>No ledger data found for this period.</p>
          ) : (
            <>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ textAlign: "left", padding: "8px 0", color: "#64748b", fontWeight: 600 }}>Account</th>
                    <th style={{ textAlign: "right", padding: "8px 0", color: "#64748b", fontWeight: 600 }}>Debit</th>
                    <th style={{ textAlign: "right", padding: "8px 0", color: "#64748b", fontWeight: 600 }}>Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {tb.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 0" }}>{row.account?.name || row.account}</td>
                      <td style={{ padding: "8px 0", textAlign: "right" }}>
                        {row.totalDebit ? `₹${row.totalDebit.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td style={{ padding: "8px 0", textAlign: "right" }}>
                        {row.totalCredit ? `₹${row.totalCredit.toLocaleString("en-IN")}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 12, padding: "8px 0", borderTop: "2px solid #e2e8f0", display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 13 }}>
                <span>
                  Status:{" "}
                  {isBalanced === true ? (
                    <span style={{ color: "#16a34a" }}>Balanced</span>
                  ) : isBalanced === false ? (
                    <span style={{ color: "#dc2626" }}>Unbalanced</span>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Balance Sheet */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <HiOutlineBanknotes size={20} color="#16a34a" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Balance Sheet</h3>
          </div>
          {bsLoading ? (
            <p style={{ color: "#94a3b8", fontSize: 13 }}>Loading...</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Assets", value: bs.assets, color: "#2563eb" },
                { label: "Liabilities", value: bs.liabilities, color: "#dc2626" },
                { label: "Equity", value: bs.equity, color: "#16a34a" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: item.color }}>
                    {item.value != null ? `₹${Number(item.value).toLocaleString("en-IN")}` : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profit & Loss */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <HiOutlineArrowTrendingUp size={20} color="#9333ea" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Profit & Loss</h3>
          </div>
          {plLoading ? (
            <p style={{ color: "#94a3b8", fontSize: 13 }}>Loading...</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Revenue", value: pl.revenue, color: "#16a34a" },
                { label: "Expenses", value: pl.expenses, color: "#dc2626" },
                { label: "Net Profit", value: pl.netProfit, color: pl.netProfit >= 0 ? "#16a34a" : "#dc2626" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: item.color }}>
                    {item.value != null ? `₹${Number(item.value).toLocaleString("en-IN")}` : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cash Flow */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <HiOutlineArrowDownOnSquare size={20} color="#ea580c" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Cash Flow</h3>
          </div>
          {cfLoading ? (
            <p style={{ color: "#94a3b8", fontSize: 13 }}>Loading...</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Inflow", value: cf.totalInflow !== undefined ? cf.totalInflow : cf.inflow, color: "#16a34a" },
                { label: "Outflow", value: cf.totalOutflow !== undefined ? cf.totalOutflow : cf.outflow, color: "#dc2626" },
                { label: "Net Cash Flow", value: cf.netCashFlow, color: cf.netCashFlow >= 0 ? "#16a34a" : "#dc2626" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: item.color }}>
                    {item.value != null ? `₹${Number(item.value).toLocaleString("en-IN")}` : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
