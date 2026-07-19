import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "../../../../app/store/hooks";
import { reportsApi } from "../../../reports/api/reportsApi";
import { accountingApi } from "../../../accounting/api/accountingApi";
import { remindersApi } from "../../api/dashboardApi";
import {
  HiOutlineDocumentText,
  HiOutlineUserPlus,
  HiOutlineArrowRight,
  HiOutlineShoppingBag,
  HiOutlineBuildingStorefront,
  HiOutlineArrowDownOnSquare,
  HiOutlineScale,
  HiOutlineCalendar,
} from "react-icons/hi2";
import { StatCard } from "../../../../app/components/common";
import s from "../components/css/DashboardOverview.module.css";

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatCompactCurrency = (amount) => {
  if (amount === undefined || amount === null) return "₹0";
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (absAmount >= 100000) {
    return `${sign}₹${(absAmount / 100000).toFixed(2)}L`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function DashboardOverview() {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const orgId = user?.organizationId;

  // 1. Profit & Loss Report (Revenue, Expenses, Net Profit)
  const { data: plData } = useQuery({
    queryKey: ["profitLoss", orgId],
    queryFn: () => reportsApi.profitLoss(),
    enabled: !!orgId,
    retry: false,
  });

  // 2. Cash Flow Report (Inflows & Outflows)
  const { data: cfData } = useQuery({
    queryKey: ["cashFlow", orgId],
    queryFn: () => reportsApi.cashFlow(),
    enabled: !!orgId,
    retry: false,
  });

  // 3. Balance Sheet (Assets, Liabilities)
  const { data: bsData } = useQuery({
    queryKey: ["balanceSheet", orgId],
    queryFn: () => reportsApi.balanceSheet(),
    enabled: !!orgId,
    retry: false,
  });

  // 4. Recent Transactions (Ledger Entries)
  const { data: ledgerData } = useQuery({
    queryKey: ["ledgerRecent", orgId],
    queryFn: () => accountingApi.listLedger({ limit: 5 }),
    enabled: !!orgId,
    retry: false,
  });

  // 5. Reminders List
  const { data: remindersData } = useQuery({
    queryKey: ["remindersList", orgId],
    queryFn: () => remindersApi.list(),
    enabled: !!orgId,
    retry: false,
  });

  // --- Dynamic Value Mappings ---
  const revenue = plData?.data?.revenue || 0;
  const expenses = plData?.data?.expenses || 0;
  const netProfit = plData?.data?.netProfit || 0;
  const outstanding = bsData?.data?.liabilities || 0;

  const inflow = cfData?.data?.totalInflow || 0;
  const outflow = cfData?.data?.totalOutflow || 0;
  const netCashFlow = cfData?.data?.netCashFlow || 0;

  // --- Health Score Math (Liquidity Index) ---
  const totalFlow = inflow + outflow;
  const healthScore = totalFlow > 0 ? Math.min(100, Math.max(0, Math.round((inflow / totalFlow) * 100))) : 100;
  
  let healthLabel = "Healthy";
  let healthBadge = "Good";
  let healthClass = s.greenDot;
  let healthBadgeClass = s.badgeGreen;
  
  if (healthScore < 40) {
    healthLabel = "Risky";
    healthBadge = "Critical";
    healthClass = s.redDot;
    healthBadgeClass = s.badgeRed;
  } else if (healthScore < 70) {
    healthLabel = "Fair";
    healthBadge = "Moderate";
    healthClass = s.orangeDot;
    healthBadgeClass = s.badgeOrange;
  }

  // --- Top Expenses Math ---
  const expenseRows = plData?.data?.rows?.filter(r => r.type === "expense") || [];
  const totalExpensesAmount = expenseRows.reduce((sum, r) => sum + (r.totalDebit - r.totalCredit), 0);
  
  const mappedExpenses = expenseRows.map(r => {
    const amt = r.totalDebit - r.totalCredit;
    const pct = totalExpensesAmount > 0 ? Math.round((amt / totalExpensesAmount) * 100) : 0;
    return {
      name: r.name,
      amount: amt,
      percent: pct,
      color: r.name.toLowerCase().includes("salary") ? "#475569" : 
             r.name.toLowerCase().includes("rent") ? "#0f172a" : 
             r.name.toLowerCase().includes("utility") ? "#94a3b8" : "var(--color-accent)"
    };
  }).sort((a, b) => b.amount - a.amount);

  const topExpenses = mappedExpenses.length > 0 ? mappedExpenses : [
    { name: "Salaries", percent: 42, color: "#475569" },
    { name: "Operations", percent: 24, color: "#0f172a" },
    { name: "Marketing", percent: 18, color: "var(--color-accent)" },
    { name: "Utilities", percent: 9, color: "#94a3b8" },
    { name: "Others", percent: 7, color: "#cbd5e1" },
  ];

  // --- Reminders Mapping ---
  const rawReminders = remindersData?.data || [];
  const reminders = rawReminders.length > 0 ? rawReminders.map(r => {
    const diffTime = new Date(r.dueDate) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    let daysText = `${diffDays} days left`;
    let urgency = "low";
    
    if (diffDays < 0) {
      daysText = "Overdue";
      urgency = "high";
    } else if (diffDays <= 3) {
      urgency = "high";
    } else if (diffDays <= 7) {
      urgency = "medium";
    }
    return {
      title: r.title,
      date: `Due on ${new Date(r.dueDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}`,
      days: daysText,
      urgency
    };
  }) : [
    { title: "GST Filing", date: "Due on 20 Jun 2026", days: "5 days left", urgency: "high" },
    { title: "Bank Reconciliation", date: "Due on 22 Jun 2026", days: "7 days left", urgency: "medium" },
    { title: "Payroll Processing", date: "Due on 25 Jun 2026", days: "10 days left", urgency: "low" },
  ];

  // --- Recent Transactions Mapping ---
  const rawEntries = ledgerData?.data?.entries || [];
  const recentTransactions = rawEntries.length > 0 ? rawEntries.map(tx => {
    const isDebit = tx.debit > 0;
    const amt = isDebit ? tx.debit : tx.credit;
    return {
      id: tx._id,
      type: isDebit ? "DR" : "CR",
      desc: tx.accountId?.name || "Account Entry",
      sub: tx.journalEntryId?.entryNumber || tx.journalEntryId?.narration || "Manual Entry",
      status: tx.journalEntryId?.status === "posted" ? "Paid" : "Pending",
      amount: formatCurrency(amt),
      date: new Date(tx.date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })
    };
  }) : [
    { id: 1, type: "INV", desc: "Invoice #INV-0248", sub: "Acme Corp.", amount: "₹42,500.00", date: "10 Jun 2026", status: "Paid" },
    { id: 2, type: "PAY", desc: "Payment to Vendor", sub: "PaperKart", amount: "₹18,200.00", date: "09 Jun 2026", status: "Pending" },
    { id: 3, type: "INV", desc: "Invoice #INV-0247", sub: "TechNova Pvt. Ltd.", amount: "₹1,25,000.00", date: "08 Jun 2026", status: "Paid" },
    { id: 4, type: "EXP", desc: "Expense - Office Rent", sub: "Monthly Expense", amount: "₹35,000.00", date: "07 Jun 2026", status: "Paid" },
    { id: 5, type: "PO", desc: "Purchase #PO-0112", sub: "Apex Supplies", amount: "₹56,700.00", date: "07 Jun 2026", status: "Pending" },
  ];

  // --- Dynamic SVG Paths Builder for Cash Flow Overview ---
  const maxVal = Math.max(inflow, outflow, 10000);
  const getY = (val) => 150 - (val / maxVal) * 110;
  
  // Interpolating gradual paths for visual line chart rendering
  const inflowPath = `M 20 ${getY(inflow * 0.1)} Q 120 ${getY(inflow * 0.4)}, 220 ${getY(inflow * 0.35)} T 380 ${getY(inflow * 0.75)} T 480 ${getY(inflow)}`;
  const outflowPath = `M 20 ${getY(outflow * 0.2)} Q 120 ${getY(outflow * 0.3)}, 220 ${getY(outflow * 0.5)} T 380 ${getY(outflow * 0.6)} T 480 ${getY(outflow)}`;
  const netPath = `M 20 ${getY(netCashFlow * 0.1)} Q 120 ${getY(netCashFlow * 0.5)}, 220 ${getY(netCashFlow * 0.25)} T 380 ${getY(netCashFlow * 0.8)} T 480 ${getY(netCashFlow)}`;

  return (
    <section className={s.page}>
      {/* Stat Cards */}
      <div className={s.stats}>
        <StatCard
          label="Total Revenue"
          trend="up"
          trendLabel="Active period"
          value={formatCompactCurrency(revenue)}
        />
        <StatCard
          label="Total Expenses"
          trend="down"
          trendLabel="Active period"
          value={formatCompactCurrency(expenses)}
        />
        <StatCard
          label="Net Profit"
          trend="up"
          trendLabel="Active period"
          value={formatCompactCurrency(netProfit)}
        />
        <StatCard
          label="Outstanding"
          value={formatCompactCurrency(outstanding)}
        />
      </div>

      {/* Grid Row 2: Cash Flow, Quick Actions, Health Score */}
      <div className={s.midGrid}>
        {/* Cash Flow */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <div>
              <h3 className={s.cardTitle}>Cash Flow Overview</h3>
            </div>
            <div className={s.selectors}>
              <select className={s.selectBtn}>
                <option>This Month</option>
              </select>
              <select className={s.selectBtn}>
                <option>Weekly</option>
              </select>
            </div>
          </div>
          <div className={s.chartLegend}>
            <span className={s.legendItem}><span className={[s.dot, s.blue].join(" ")}></span> Inflow</span>
            <span className={s.legendItem}><span className={[s.dot, s.black].join(" ")}></span> Outflow</span>
            <span className={s.legendItem}><span className={[s.dot, s.grey].join(" ")}></span> Net</span>
          </div>
          
          <div className={s.chartWrapper}>
            <svg className={s.chartSvg} viewBox="0 0 500 180" width="100%" height="180">
              {/* Grid Lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="70" x2="500" y2="70" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="110" x2="500" y2="110" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="150" x2="500" y2="150" stroke="#f1f5f9" strokeWidth="1" />

              {/* Chart Paths */}
              {/* Inflow - Blue Line */}
              <path
                d={inflowPath}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Outflow - Black Line */}
              <path
                d={outflowPath}
                fill="none"
                stroke="#0f172a"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Net - Grey Dashed Line */}
              <path
                d={netPath}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                strokeLinecap="round"
              />

              {/* Highlight Point Indicator */}
              <g transform={`translate(480, ${getY(netCashFlow)})`}>
                <circle r="5" fill="var(--color-accent)" stroke="#ffffff" strokeWidth="2" />
              </g>

              {/* Text labels on X axis */}
              <text x="20" y="175" className={s.chartText}>May 12</text>
              <text x="130" y="175" className={s.chartText}>May 19</text>
              <text x="245" y="175" className={s.chartText}>May 26</text>
              <text x="360" y="175" className={s.chartText}>Jun 02</text>
              <text x="450" y="175" className={s.chartText}>Jun 09</text>
            </svg>
            
            {/* Chart Tooltip */}
            <div className={s.chartTooltip}>
              <span className={s.tooltipValue}>{formatCompactCurrency(netCashFlow)}</span>
              <span className={s.tooltipDate}>Net Cash Flow</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <h3 className={s.cardTitle}>Quick Actions</h3>
          </div>
          <div className={s.quickActionsGrid}>
            <button className={s.quickActionBtn} onClick={() => navigate("/dashboard/invoices")} type="button">
              <span className={[s.actionIcon, s.blueBg].join(" ")}><HiOutlineDocumentText /></span>
              <span className={s.actionText}>Create Invoice</span>
            </button>
            <button className={s.quickActionBtn} onClick={() => navigate("/dashboard/purchases")} type="button">
              <span className={[s.actionIcon, s.redBg].join(" ")}><HiOutlineArrowDownOnSquare /></span>
              <span className={s.actionText}>Add Expense</span>
            </button>
            <button className={s.quickActionBtn} onClick={() => navigate("/dashboard/purchase-orders")} type="button">
              <span className={[s.actionIcon, s.purpleBg].join(" ")}><HiOutlineShoppingBag /></span>
              <span className={s.actionText}>New Purchase</span>
            </button>
            <button className={s.quickActionBtn} onClick={() => navigate("/dashboard/customers/create")} type="button">
              <span className={[s.actionIcon, s.greenBg].join(" ")}><HiOutlineUserPlus /></span>
              <span className={s.actionText}>Add Customer</span>
            </button>
            <button className={s.quickActionBtn} onClick={() => navigate("/dashboard/vendors/create")} type="button">
              <span className={[s.actionIcon, s.orangeBg].join(" ")}><HiOutlineBuildingStorefront /></span>
              <span className={s.actionText}>Add Vendor</span>
            </button>
            <button className={s.quickActionBtn} onClick={() => navigate("/dashboard/accounts")} type="button">
              <span className={[s.actionIcon, s.tealBg].join(" ")}><HiOutlineScale /></span>
              <span className={s.actionText}>Reconcile Bank</span>
            </button>
          </div>
        </div>

        {/* Health Score */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <h3 className={s.cardTitle}>Your Health Score</h3>
          </div>
          <div className={s.healthContent}>
            <div className={s.radialContainer}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="var(--color-accent)"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 * (1 - healthScore / 100)}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
                <text x="50" y="48" textAnchor="middle" className={s.radialPercent}>{healthScore}%</text>
                <text x="50" y="65" textAnchor="middle" className={s.radialLabel}>{healthLabel}</text>
              </svg>
            </div>
            
            <div className={s.healthMetrics}>
              <div className={s.metricRow}>
                <span className={[s.statusDot, healthClass].join(" ")}></span>
                <span className={s.metricLabel}>Cash Flow</span>
                <span className={[s.metricBadge, healthBadgeClass].join(" ")}>{healthBadge}</span>
              </div>
              <div className={s.metricRow}>
                <span className={[s.statusDot, expenses > revenue ? s.redDot : s.greenDot].join(" ")}></span>
                <span className={s.metricLabel}>Expenses</span>
                <span className={[s.metricBadge, expenses > revenue ? s.badgeRed : s.badgeGreen].join(" ")}>
                  {expenses > revenue ? "High" : "Optimal"}
                </span>
              </div>
              <div className={s.metricRow}>
                <span className={[s.statusDot, s.greenDot].join(" ")}></span>
                <span className={s.metricLabel}>Receivables</span>
                <span className={[s.metricBadge, s.badgeGreen].join(" ")}>Good</span>
              </div>
              <div className={s.metricRow}>
                <span className={[s.statusDot, outstanding > revenue * 0.5 ? s.redDot : s.greenDot].join(" ")}></span>
                <span className={s.metricLabel}>Payables</span>
                <span className={[s.metricBadge, outstanding > revenue * 0.5 ? s.badgeRed : s.badgeGreen].join(" ")}>
                  {outstanding > revenue * 0.5 ? "Risky" : "Good"}
                </span>
              </div>
            </div>
          </div>
          <div className={s.healthFooter}>
            <p className={s.healthText}>
              {healthScore >= 70 ? "Keep it up! Your business is performing well." : "Take action to balance cash flow."}
            </p>
            {/* Wave decoration */}
            <svg className={s.waveDecor} width="100%" height="16" viewBox="0 0 100 16" preserveAspectRatio="none">
              <path d="M0,8 C25,16 25,0 50,8 C75,16 75,0 100,8 L100,16 L0,16 Z" fill="#f8fafc" />
            </svg>
          </div>
        </div>
      </div>

      {/* Grid Row 3: Recent Transactions, Top Expenses, Reminders */}
      <div className={s.bottomGrid}>
        {/* Recent Transactions Table */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <h3 className={s.cardTitle}>Recent Transactions</h3>
            <button className={s.viewAll} onClick={() => navigate("/dashboard/audit-logs")} type="button">
              View All <HiOutlineArrowRight />
            </button>
          </div>
          <div className={s.tableContainer}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>TYPE</th>
                  <th>DESCRIPTION</th>
                  <th>STATUS</th>
                  <th>AMOUNT</th>
                  <th>DATE</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <span className={[s.typeBadge, s[`badge${tx.type}`]].join(" ")}>{tx.type}</span>
                    </td>
                    <td>
                      <div className={s.txDesc}>{tx.desc}</div>
                      <div className={s.txSub}>{tx.sub}</div>
                    </td>
                    <td>
                      <span className={[s.statusBadge, tx.status === "Paid" ? s.paid : s.pending].join(" ")}>
                        {tx.status}
                      </span>
                    </td>
                    <td className={s.txAmount}>{tx.amount}</td>
                    <td className={s.txDate}>{tx.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Expenses progress bars */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <h3 className={s.cardTitle}>Top Expenses</h3>
            <select className={s.selectBtn}>
              <option>This Month</option>
            </select>
          </div>
          <div className={s.expenseList}>
            {topExpenses.map((exp) => (
              <div className={s.expenseItem} key={exp.name}>
                <div className={s.expenseInfo}>
                  <span className={s.expenseName}>{exp.name}</span>
                  <span className={s.expensePercent}>{exp.percent}%</span>
                </div>
                <div className={s.progressBarBg}>
                  <div
                    className={s.progressBar}
                    style={{ width: `${exp.percent}%`, backgroundColor: exp.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <button className={s.fullReportBtn} onClick={() => navigate("/dashboard/reports")} type="button">
            View full report <HiOutlineArrowRight />
          </button>
        </div>

        {/* Upcoming Reminders */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <h3 className={s.cardTitle}>Upcoming Reminders</h3>
            <button className={s.viewAll} onClick={() => navigate("/dashboard/notifications")} type="button">
              View All <HiOutlineArrowRight />
            </button>
          </div>
          <div className={s.reminderList}>
            {reminders.map((rem) => (
              <div className={s.reminderItem} key={rem.title}>
                <div className={s.reminderContent}>
                  <div className={s.reminderBoxIcon}>
                    <HiOutlineCalendar />
                  </div>
                  <div className={s.reminderText}>
                    <div className={s.reminderTitle}>{rem.title}</div>
                    <div className={s.reminderDate}>{rem.date}</div>
                  </div>
                </div>
                <span className={[s.reminderBadge, s[rem.urgency]].join(" ")}>{rem.days}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Decorative Barcode Receipt Footer */}
      <div className={s.barcodeContainer}>
        <div className={s.barcodeWrapper}>
          <svg className={s.barcodeSvg} viewBox="0 0 100 20" width="120" height="24">
            <rect x="0" y="0" width="2" height="20" fill="#0f172a" />
            <rect x="3" y="0" width="1" height="20" fill="#0f172a" />
            <rect x="6" y="0" width="3" height="20" fill="#0f172a" />
            <rect x="11" y="0" width="1" height="20" fill="#0f172a" />
            <rect x="14" y="0" width="2" height="20" fill="#0f172a" />
            <rect x="18" y="0" width="4" height="20" fill="#0f172a" />
            <rect x="24" y="0" width="1" height="20" fill="#0f172a" />
            <rect x="27" y="0" width="2" height="20" fill="#0f172a" />
            <rect x="31" y="0" width="1" height="20" fill="#0f172a" />
            <rect x="34" y="0" width="3" height="20" fill="#0f172a" />
            <rect x="39" y="0" width="2" height="20" fill="#0f172a" />
            <rect x="43" y="0" width="1" height="20" fill="#0f172a" />
            <rect x="46" y="0" width="4" height="20" fill="#0f172a" />
            <rect x="52" y="0" width="2" height="20" fill="#0f172a" />
            <rect x="56" y="0" width="1" height="20" fill="#0f172a" />
            <rect x="59" y="0" width="3" height="20" fill="#0f172a" />
            <rect x="64" y="0" width="1" height="20" fill="#0f172a" />
            <rect x="67" y="0" width="2" height="20" fill="#0f172a" />
            <rect x="71" y="0" width="4" height="20" fill="#0f172a" />
            <rect x="77" y="0" width="1" height="20" fill="#0f172a" />
            <rect x="80" y="0" width="2" height="20" fill="#0f172a" />
            <rect x="84" y="0" width="1" height="20" fill="#0f172a" />
            <rect x="87" y="0" width="3" height="20" fill="#0f172a" />
            <rect x="92" y="0" width="2" height="20" fill="#0f172a" />
            <rect x="96" y="0" width="4" height="20" fill="#0f172a" />
          </svg>
          <span className={s.barcodeText}>DUEV-2026-001</span>
        </div>
      </div>
    </section>
  );
}
