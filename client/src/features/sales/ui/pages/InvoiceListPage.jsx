import TransactionDocumentPage from "../components/TransactionDocumentPage";
import { salesApi } from "../../api/salesApi";
export default function InvoiceListPage() { return <TransactionDocumentPage title="Invoices" subtitle="Create itemized invoices ready to post to the ledger." kind="invoice" create={salesApi.createInvoice} />; }