export type PaymentReminderData = {
  customerName: string;
  invoiceNumber: string;
  dueDate: string;
  amountRemaining: string;
};

export function buildPaymentReminder({ customerName, invoiceNumber, dueDate, amountRemaining }: PaymentReminderData) {
  return `Hello ${customerName}, this is a reminder that invoice ${invoiceNumber} was due on ${dueDate}. The remaining balance is ${amountRemaining} DT. Please arrange payment. Thank you.`;
}
