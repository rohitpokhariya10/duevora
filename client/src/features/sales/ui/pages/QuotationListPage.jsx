import TransactionDocumentPage from "../components/TransactionDocumentPage";
import { salesApi } from "../../api/salesApi";
export default function QuotationListPage() { return <TransactionDocumentPage title="Quotations" subtitle="Prepare customer proposals and keep them ready for approval." kind="quotation" create={salesApi.createQuotation} />; }