import TransactionDocumentPage from "../../../sales/ui/components/TransactionDocumentPage";
import { purchasesApi } from "../../api/purchasesApi";
export default function PurchaseListPage() { return <TransactionDocumentPage title="Vendor Bills" subtitle="Record itemized supplier bills ready for approval." party="vendor" kind="purchase" create={purchasesApi.create} />; }