/**
* Authentication domain types.
*
* The backend stores users securely and returns only public fields to clients.
* UUID is NEVER exposed. Instead, a 10-digit userId is used.
*/

export interface PublicAccount {
id: string;
userId: string;
username: string;
nickname?: string;
email: string;
mobile: string;
fullName?: string;
avatar?: string;
referralCode?: string;
role: "USER" | "ADMIN";
status: "ACTIVE" | "SUSPENDED" | "BANNED";
vipLevel: number;
mainBalance: number;
bonusBalance: number;
pendingBalance: number;
wallets: Array<{
id: string;
provider: "GCASH" | "MAYA" | "QRPH" | "GOTYME_BANK" | "SEABANK";
accountName: string;
accountNumber: string;
isDefault: boolean;
status?: "VERIFIED" | "PENDING" | "LOCKED";
lockedUntil?: string | null;
changeRequestedAt?: string | null;
changeRequestStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
changeRequestNote?: string | null;
}>;
createdAt: string;
updatedAt: string;
}

export type AuthView = "login" | "register" | "forgot";

export interface RegisterInput {
username?: string;
mobile?: string;
password: string;
confirmPassword: string;
acceptTerms: boolean;
}

export interface LoginInput {
/** Username OR email. */
identifier: string;
password: string;
}

/** Discriminated result returned by store auth actions. */
export type AuthResult =
| { ok: true; account: PublicAccount }
| { ok: false; error: string };