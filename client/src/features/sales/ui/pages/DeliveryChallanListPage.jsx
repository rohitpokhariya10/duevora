import TransactionDocumentPage from "../components/TransactionDocumentPage";
import { salesApi } from "../../api/salesApi";
export default function DeliveryChallanListPage() { return <TransactionDocumentPage title="Delivery Challans" subtitle="Record customer deliveries and dispatches." kind="challan" create={salesApi.createDeliveryChallan} />; }