export function formatMoney(value: number | string | { toString(): string }) {
  const amount = Number(value.toString());
  return new Intl.NumberFormat("en-TN", {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
