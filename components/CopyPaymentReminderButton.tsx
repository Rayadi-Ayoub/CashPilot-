"use client";

import { useState } from "react";
import { buildPaymentReminder, PaymentReminderData } from "@/lib/paymentReminder";

export function CopyPaymentReminderButton(props: PaymentReminderData) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const message = buildPaymentReminder(props);

  async function copyReminder() {
    try {
      await navigator.clipboard.writeText(message);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="reminder-control">
      <button className="button button-primary" type="button" onClick={copyReminder}>
        {status === "copied" ? "Reminder copied" : "Copy payment reminder"}
      </button>
      <span className={status === "error" ? "reminder-error" : "reminder-success"} aria-live="polite">
        {status === "copied" && "Paste it into your usual email or messaging app."}
        {status === "error" && "Clipboard access is unavailable. Please allow clipboard access and try again."}
      </span>
    </div>
  );
}
