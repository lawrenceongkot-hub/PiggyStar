export function validateDepositAmount(amount: number) {
if (!Number.isFinite(amount)) {
return { ok: false, message: "Amount must be a valid number." };
}
if (amount < 100 || amount > 50000) {
return { ok: false, message: "Deposit amount must be between PHP 100 and PHP 50,000." };
}
return { ok: true };
}

export function validateWithdrawalAmount(amount: number) {
if (!Number.isFinite(amount)) {
return { ok: false, message: "Amount must be a valid number." };
}
if (amount < 100 || amount > 49999) {
return { ok: false, message: "Withdrawal amount must be between PHP 100 and PHP 49,999." };
}
return { ok: true };
}
