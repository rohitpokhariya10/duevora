import TransactionDocumentPage from "../components/TransactionDocumentPage";
import { salesApi } from "../../api/salesApi";
export default function SalesOrderListPage() { return <TransactionDocumentPage title="Sales Orders" subtitle="Capture confirmed customer commitments." kind="order" create={salesApi.createSalesOrder} />; }