/**
* Currency formatting. The platform uses the Philippine Peso (₱) exclusively.
*/

const phpFormatter = new Intl.NumberFormat("en-PH", {
style: "currency",
currency: "PHP",
minimumFractionDigits: 2,
maximumFractionDigits: 2,
});

/** Format a number as Philippine Peso, e.g. 5000 -> "₱5,000.00". */
export function formatPHP(value: number): string {
return phpFormatter.format(value);
}

/** Mask an account number, leaving only the last 4 digits visible. */
export function maskAccountNumber(value: string): string {
const cleaned = value.trim();
if (!cleaned) return "";
const visible = 4;
const maskedLength = Math.max(0, cleaned.length - visible);
return `${"*".repeat(maskedLength)}${cleaned.slice(-visible)}`;
}

/** Currency symbol used throughout the UI. */
export const CURRENCY_SYMBOL = "₱";
export const CURRENCY_CODE = "PHP";
