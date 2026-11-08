import { createPayment } from "@/lib/actions/payments";
import { SubmitButton } from "./SubmitButton";
import { formatMoney } from "@/lib/format";

type PaymentInvoice = { id: string; number: string | null; contact: { name: string }; remaining: string };

export function PaymentForm({ invoices, invoiceId }: { invoices?: PaymentInvoice[]; invoiceId?: string }) {
  return (
    <form action={createPayment} className="form-stack">
      {invoiceId ? <input type="hidden" name="invoiceId" value={invoiceId} /> : (
        <label>Unpaid invoice<select name="invoiceId" required>{invoices?.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.number} · {invoice.contact.name} · {formatMoney(invoice.remaining)} left</option>)}</select></label>
      )}
      <div className="form-grid">
        <label>Amount (DT)<input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required /></label>
        <label>Payment date<input name="paymentDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label>
      </div>
      <label>Method<select name="method" defaultValue="Bank transfer"><option>Bank transfer</option><option>Cash</option><option>Card</option><option>Cheque</option></select></label>
      <label>Reference <span className="field-hint">Optional</span><input name="reference" /></label>
      <SubmitButton>Record payment</SubmitButton>
    </form>
  );
}
