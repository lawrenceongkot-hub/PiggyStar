export function normalizePhilippinesMobile(value: string) {
const digits = value.replace(/\D/g, "").slice(0, 10);
if (!digits) return "";
return `+63${digits}`;
}

export function formatPhilippinesMobile(value: string) {
const digits = value.replace(/\D/g, "").slice(0, 10);
if (digits.length < 4) return digits;
const part1 = digits.slice(0, 3);
const part2 = digits.slice(3, 6);
const part3 = digits.slice(6, 10);
return `🇵🇭 +63 ${part1}${part2 ? ` ${part2}` : ""}${part3 ? ` ${part3}` : ""}`;
}
