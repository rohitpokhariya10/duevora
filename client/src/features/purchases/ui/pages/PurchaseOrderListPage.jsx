import TransactionDocumentPage from "../../../sales/ui/components/TransactionDocumentPage";
import { purchasesApi } from "../../api/purchasesApi";
export default function PurchaseOrderListPage() { return <TransactionDocumentPage title="Purchase Orders" subtitle="Prepare supplier purchase commitments." party="vendor" kind="po" create={purchasesApi.createPurchaseOrder} />; }