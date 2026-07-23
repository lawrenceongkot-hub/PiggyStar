"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useCurrentUser } from "@/lib/auth/store";
import { apiFetch } from "@/lib/api/client";
import { GlassCard, SectionHeading, ProgressBar } from "@/components/ui/casino-ui";
import { toast } from "sonner";
import { formatPHP } from "@/lib/format";
import {
ShieldCheckIcon,
DevicePhoneMobileIcon,
EnvelopeIcon,
KeyIcon,
LockClosedIcon,
BuildingLibraryIcon,
CheckBadgeIcon,
XCircleIcon,
ClockIcon,
StarIcon,
TrophyIcon,
ArrowTrendingUpIcon,
CurrencyDollarIcon,
ExclamationTriangleIcon,
EyeIcon,
EyeSlashIcon,
} from "@heroicons/react/24/outline";

// ===== SECURITY CENTER =====

function SecurityCenter() {
const user = useCurrentUser();
const [security, setSecurity] = useState<any>(null);
const [loading, setLoading] = useState(true);
const [activeModal, setActiveModal] = useState<string | null>(null);

// Mobile form
const [mobile, setMobile] = useState("");
const [mobileOtp, setMobileOtp] = useState("");
const [mobileStep, setMobileStep] = useState<"input" | "otp">("input");
const [mobileLoading, setMobileLoading] = useState(false);

// Email form
const [email, setEmail] = useState("");
const [emailOtp, setEmailOtp] = useState("");
const [emailStep, setEmailStep] = useState<"input" | "otp">("input");
const [emailLoading, setEmailLoading] = useState(false);

// Login password form
const [currentPassword, setCurrentPassword] = useState("");
const [newPassword, setNewPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [passwordLoading, setPasswordLoading] = useState(false);

// Withdrawal password form
const [withdrawPassword, setWithdrawPassword] = useState("");
const [withdrawConfirm, setWithdrawConfirm] = useState("");
const [withdrawCurrent, setWithdrawCurrent] = useState("");
const [withdrawLoading, setWithdrawLoading] = useState(false);
const [showWithdrawPwd, setShowWithdrawPwd] = useState(false);

// Complete Profile form
const [profileFullName, setProfileFullName] = useState("");
const [profileNickname, setProfileNickname] = useState("");
const [profileLoading, setProfileLoading] = useState(false);
const [profileRedirectToBank, setProfileRedirectToBank] = useState(false);

// Bank form
const [accountType, setAccountType] = useState<"E_WALLET" | "BANK" | "">("");
const [providerName, setProviderName] = useState("");
const [accountName, setAccountName] = useState("");
const [accountNumber, setAccountNumber] = useState("");
const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
const [bankSearch, setBankSearch] = useState("");
const [bankLoading, setBankLoading] = useState(false);
const [bankPwdInput, setBankPwdInput] = useState("");
const [bankStep, setBankStep] = useState<"verify" | "form">("verify");

const ewallets = ["GCash", "Maya", "Coins.ph", "GrabPay"];

const resetBankForm = () => {
setProviderName("");
setAccountName("");
setAccountNumber("");
setConfirmAccountNumber("");
setBankSearch("");
};

const handleAccountTypeChange = (value: string) => {
setAccountType(value as "E_WALLET" | "BANK" | "");
resetBankForm();
};
const banks = [
"GoTyme Bank", "BDO Unibank", "BPI", "Metrobank", "Land Bank",
"PNB", "RCBC", "Security Bank", "UnionBank", "Chinabank",
"EastWest Bank", "PSBank", "AUB", "CIMB Bank", "Tonik Bank",
"SeaBank", "OwnBank", "Netbank", "UNO Digital Bank",
"Maybank Philippines", "Bank of Commerce", "HSBC Philippines",
"Standard Chartered Philippines",
];
const filteredBanks = banks.filter(b => b.toLowerCase().includes(bankSearch.toLowerCase()));

useEffect(() => {
if (!user) return;
fetchSecurity();
}, [user]);

const fetchSecurity = async () => {
setLoading(true);
try {
const data = await apiFetch<any>("/api/account/security");
setSecurity(data.security);
} catch {
// ignore
}
setLoading(false);
};

const handleMobileSubmit = async () => {
if (!mobile) { toast.error("Enter your mobile number"); return; }
setMobileLoading(true);
try {
await apiFetch("/api/player/mobile", {
method: "POST",
body: JSON.stringify({ mobile }),
});
setMobileStep("otp");
toast.success("OTP sent to your mobile");
} catch (err: any) {
toast.error(err.message);
}
setMobileLoading(false);
};

const handleMobileVerify = async () => {
if (!mobileOtp || mobileOtp.length < 4) { toast.error("Enter the OTP code"); return; }
setMobileLoading(true);
try {
await apiFetch("/api/player/mobile", {
method: "PUT",
body: JSON.stringify({ otp: mobileOtp }),
});
toast.success("Mobile number verified");
setActiveModal(null);
setMobileStep("input");
setMobileOtp("");
fetchSecurity();
} catch (err: any) {
toast.error(err.message);
}
setMobileLoading(false);
};

const handleEmailSubmit = async () => {
if (!email) { toast.error("Enter your email address"); return; }
setEmailLoading(true);
try {
await apiFetch("/api/player/email", {
method: "POST",
body: JSON.stringify({ email }),
});
setEmailStep("otp");
toast.success("OTP sent to your email");
} catch (err: any) {
toast.error(err.message);
}
setEmailLoading(false);
};

const handleEmailVerify = async () => {
if (!email || !emailOtp || emailOtp.length < 6) { toast.error("Enter the 6-digit verification code"); return; }
setEmailLoading(true);
try {
await apiFetch("/api/player/email", {
method: "PUT",
body: JSON.stringify({ email, code: emailOtp }),
});
toast.success("Email verified");
setActiveModal(null);
setEmailStep("input");
setEmailOtp("");
fetchSecurity();
} catch (err: any) {
toast.error(err.message);
}
setEmailLoading(false);
};

const handlePasswordChange = async () => {
if (!currentPassword || !newPassword || !confirmPassword) {
toast.error("Fill in all password fields"); return;
}
if (newPassword.length < 8) { toast.error("New password must be at least 8 characters"); return; }
if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
setPasswordLoading(true);
try {
await apiFetch("/api/player/profile", {
method: "PUT",
body: JSON.stringify({ currentPassword, newPassword }),
});
toast.success("Login password updated");
setActiveModal(null);
setCurrentPassword("");
setNewPassword("");
setConfirmPassword("");
fetchSecurity();
} catch (err: any) {
toast.error(err.message);
}
setPasswordLoading(false);
};

const handleWithdrawPasswordSet = async () => {
if (!withdrawPassword || !withdrawConfirm) {
toast.error("Fill in both password fields"); return;
}
if (withdrawPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
if (withdrawPassword !== withdrawConfirm) { toast.error("Passwords do not match"); return; }
setWithdrawLoading(true);
try {
await apiFetch("/api/account/password", {
method: "POST",
body: JSON.stringify({
password: withdrawPassword,
currentPassword: security?.hasWithdrawalPassword ? withdrawCurrent : undefined,
}),
});
toast.success("Withdrawal password set");
setActiveModal(null);
setWithdrawPassword("");
setWithdrawConfirm("");
setWithdrawCurrent("");
fetchSecurity();
} catch (err: any) {
toast.error(err.message);
}
setWithdrawLoading(false);
};

const handleCompleteProfile = async () => {
if (!profileFullName || profileFullName.length < 2) {
toast.error("Full name must be at least 2 characters");
return;
}
setProfileLoading(true);
try {
await apiFetch("/api/player/profile", {
method: "PUT",
body: JSON.stringify({
fullName: profileFullName,
nickname: profileNickname || undefined,
}),
});
toast.success("Profile completed successfully");
setActiveModal(null);
setProfileFullName("");
setProfileNickname("");
// Refresh user data
const { useAuthStore } = await import("@/lib/auth/store");
await useAuthStore.getState().refreshUser();
fetchSecurity();
// If user was trying to link bank, redirect them
if (profileRedirectToBank) {
setProfileRedirectToBank(false);
setTimeout(() => {
setBankStep("verify");
setBankPwdInput("");
setActiveModal("bank");
}, 300);
}
} catch (err: any) {
toast.error(err.message || "Failed to save profile");
}
setProfileLoading(false);
};

const handleBankOpen = () => {
if (!security?.hasWithdrawalPassword) {
toast.error("Please create your Withdrawal Password before adding a withdrawal account.");
setActiveModal("withdraw-password");
return;
}
// Check if Full Name is set
if (!user?.fullName) {
setProfileRedirectToBank(true);
setProfileFullName("");
setProfileNickname(user?.nickname || "");
setActiveModal("complete-profile");
return;
}
setBankStep("verify");
setBankPwdInput("");
setActiveModal("bank");
};

const handleBankVerify = async () => {
if (!bankPwdInput) { toast.error("Enter your withdrawal password"); return; }
try {
await apiFetch("/api/account/withdraw-password/verify", {
method: "POST",
body: JSON.stringify({ password: bankPwdInput }),
});
setBankStep("form");
} catch (err: any) {
toast.error(err.message || "Incorrect Withdrawal Password.");
}
};

const handleBankSubmit = async () => {
if (!accountType || !providerName || !user?.fullName || !accountNumber) {
toast.error("Fill in all bank fields"); return;
}
if (accountNumber !== confirmAccountNumber) {
toast.error("Account numbers do not match"); return;
}
if (!bankPwdInput) { toast.error("Withdrawal password is required"); return; }
setBankLoading(true);
try {
await apiFetch("/api/account/bank", {
method: "POST",
body: JSON.stringify({
bankName: providerName,
accountName: user.fullName,
accountNumber,
withdrawalPassword: bankPwdInput,
accountType,
}),
});
toast.success(`${accountType === "E_WALLET" ? "E-Wallet" : "Bank account"} saved`);
setActiveModal(null);
setAccountType("");
setProviderName("");
setAccountName("");
setAccountNumber("");
setConfirmAccountNumber("");
setBankSearch("");
setBankPwdInput("");
fetchSecurity();
} catch (err: any) {
toast.error(err.message);
}
setBankLoading(false);
};

const getStatusBadge = (verified: boolean) => {
if (verified) {
return (
<span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium bg-emerald/10 text-emerald border-emerald/20">
<CheckBadgeIcon className="h-3 w-3" />
Verified
</span>
);
}
return (
<span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium bg-white/5 text-white/50 border-white/10">
<ClockIcon className="h-3 w-3" />
Unverified
</span>
);
};

if (!user) {
return (
<GlassCard className="text-center text-white/70">
<ExclamationTriangleIcon className="mx-auto h-8 w-8 text-gold mb-3" />
Please sign in to access Security Center.
</GlassCard>
);
}

const percentage = security?.securityPercentage || 0;
const levelColor = percentage >= 80 ? "text-emerald" : percentage >= 50 ? "text-yellow-500" : "text-red";

const items = [
{
id: "mobile",
label: "Mobile Number",
icon: DevicePhoneMobileIcon,
desc: user.mobile || "Not set",
verified: security?.mobileVerified || false,
},
{
id: "email",
label: "Email Address",
icon: EnvelopeIcon,
desc: user.email || "Not set",
verified: security?.emailVerified || false,
},
{
id: "password",
label: "Login Password",
icon: LockClosedIcon,
desc: "Used for account access",
verified: security?.loginPasswordSet || false,
},
{
id: "withdraw-password",
label: "Withdrawal Password",
icon: KeyIcon,
desc: "Required for withdrawals",
verified: security?.withdrawPasswordSet || false,
},
{
id: "bank",
label: "Bank Account",
icon: BuildingLibraryIcon,
desc: security?.hasBank ? "Linked" : "Not linked",
verified: security?.bankVerified || false,
},
];

return (
<div className="space-y-6">
{/* Security Progress */}
<GlassCard>
<div className="flex items-center justify-between mb-4">
<div>
<h3 className="text-lg font-semibold text-white">Security Progress</h3>
<p className="text-sm text-white/50">Complete all 5 items to enable withdrawals</p>
</div>
<div className="text-right">
<p className={`text-3xl font-bold ${levelColor}`}>{percentage}%</p>
<p className="text-xs text-white/50">{percentage >= 100 ? "All Complete" : `${Math.round(percentage / 20)} of 5 verified`}</p>
</div>
</div>
<ProgressBar value={percentage} />
</GlassCard>

{/* Security Items */}
<GlassCard>
<h3 className="text-lg font-semibold text-white mb-4">Security Checklist</h3>
<div className="space-y-3">
{items.map((item) => {
const Icon = item.icon;
return (
<button
key={item.id}
onClick={() => item.id === "bank" ? handleBankOpen() : setActiveModal(item.id)}
className="w-full flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/5 p-4 hover:bg-white/10 transition text-left"
>
<div className="flex items-center gap-3">
<Icon className="h-5 w-5 text-gold shrink-0" />
<div>
<p className="text-sm font-medium text-white">{item.label}</p>
<p className="text-xs text-white/50">{item.desc}</p>
</div>
</div>
{getStatusBadge(item.verified)}
</button>
);
})}
</div>
</GlassCard>

{/* Modals */}
{activeModal === "mobile" && (
<Modal onClose={() => { setActiveModal(null); setMobileStep("input"); setMobileOtp(""); }}>
<h3 className="text-lg font-semibold text-white mb-4">Verify Mobile Number</h3>
{mobileStep === "input" ? (
<div className="space-y-3">
<input value={mobile} onChange={e => setMobile(e.target.value)} className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-gold/50" placeholder="+639123456789" />
<button onClick={handleMobileSubmit} disabled={mobileLoading || !mobile} className="w-full rounded-xl bg-gradient-to-r from-gold to-emerald px-4 py-3 text-sm font-semibold text-black disabled:opacity-50">
{mobileLoading ? "Sending..." : "Send OTP"}
</button>
</div>
) : (
<div className="space-y-3">
<p className="text-sm text-white/60">Enter the OTP sent to {mobile}</p>
<input value={mobileOtp} onChange={e => setMobileOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-gold/50 text-center text-2xl tracking-widest" placeholder="000000" maxLength={6} />
<button onClick={handleMobileVerify} disabled={mobileLoading || mobileOtp.length < 4} className="w-full rounded-xl bg-gradient-to-r from-gold to-emerald px-4 py-3 text-sm font-semibold text-black disabled:opacity-50">
{mobileLoading ? "Verifying..." : "Verify OTP"}
</button>
</div>
)}
</Modal>
)}

{activeModal === "email" && (
<Modal onClose={() => { setActiveModal(null); setEmailStep("input"); setEmailOtp(""); }}>
<h3 className="text-lg font-semibold text-white mb-4">Verify Email Address</h3>
{emailStep === "input" ? (
<div className="space-y-3">
<input value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-gold/50" placeholder="email@example.com" type="email" />
<button onClick={handleEmailSubmit} disabled={emailLoading || !email} className="w-full rounded-xl bg-gradient-to-r from-gold to-emerald px-4 py-3 text-sm font-semibold text-black disabled:opacity-50">
{emailLoading ? "Sending..." : "Send OTP"}
</button>
</div>
) : (
<div className="space-y-3">
<p className="text-sm text-white/60">Enter the OTP sent to {email}</p>
<input value={emailOtp} onChange={e => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-gold/50 text-center text-2xl tracking-widest" placeholder="000000" maxLength={6} />
<button onClick={handleEmailVerify} disabled={emailLoading || emailOtp.length < 4} className="w-full rounded-xl bg-gradient-to-r from-gold to-emerald px-4 py-3 text-sm font-semibold text-black disabled:opacity-50">
{emailLoading ? "Verifying..." : "Verify OTP"}
</button>
</div>
)}
</Modal>
)}

{activeModal === "password" && (
<Modal onClose={() => { setActiveModal(null); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}>
<h3 className="text-lg font-semibold text-white mb-4">Change Login Password</h3>
<div className="space-y-3">
<input value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} type="password" className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-gold/50" placeholder="Current password" />
<input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-gold/50" placeholder="New password (min 8 chars)" />
<input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-gold/50" placeholder="Confirm new password" />
<button onClick={handlePasswordChange} disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword} className="w-full rounded-xl bg-gradient-to-r from-gold to-emerald px-4 py-3 text-sm font-semibold text-black disabled:opacity-50">
{passwordLoading ? "Updating..." : "Update Password"}
</button>
</div>
</Modal>
)}

{activeModal === "withdraw-password" && (
<Modal onClose={() => { setActiveModal(null); setWithdrawPassword(""); setWithdrawConfirm(""); setWithdrawCurrent(""); }}>
<h3 className="text-lg font-semibold text-white mb-4">
{security?.hasWithdrawalPassword ? "Change Withdrawal Password" : "Set Withdrawal Password"}
</h3>
<div className="space-y-3">
{security?.hasWithdrawalPassword && (
<div className="relative">
<input value={withdrawCurrent} onChange={e => setWithdrawCurrent(e.target.value)} type={showWithdrawPwd ? "text" : "password"} className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 pr-12 text-sm text-white outline-none focus:border-gold/50" placeholder="Current withdrawal password" />
</div>
)}
<div className="relative">
<input value={withdrawPassword} onChange={e => setWithdrawPassword(e.target.value)} type={showWithdrawPwd ? "text" : "password"} className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 pr-12 text-sm text-white outline-none focus:border-gold/50" placeholder="New withdrawal password (min 6 chars)" />
<button onClick={() => setShowWithdrawPwd(!showWithdrawPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
{showWithdrawPwd ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
</button>
</div>
<input value={withdrawConfirm} onChange={e => setWithdrawConfirm(e.target.value)} type={showWithdrawPwd ? "text" : "password"} className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-gold/50" placeholder="Confirm withdrawal password" />
<button onClick={handleWithdrawPasswordSet} disabled={withdrawLoading || !withdrawPassword || !withdrawConfirm} className="w-full rounded-xl bg-gradient-to-r from-gold to-emerald px-4 py-3 text-sm font-semibold text-black disabled:opacity-50">
{withdrawLoading ? "Saving..." : security?.hasWithdrawalPassword ? "Change Password" : "Set Password"}
</button>
</div>
</Modal>
)}

{/* Complete Profile Modal */}
{activeModal === "complete-profile" && (
<Modal onClose={() => { setActiveModal(null); setProfileRedirectToBank(false); }}>
<h3 className="text-lg font-semibold text-white mb-4">Complete Your Profile</h3>
<div className="space-y-4">
<div className="rounded-xl border border-amber/20 bg-amber/5 p-3">
<p className="text-xs text-amber text-center leading-relaxed">
Your Full Name must exactly match your Bank or E-Wallet account. Incorrect information may cause withdrawal failure. This information can only be set once.
</p>
</div>
<div>
<label className="block text-xs font-medium text-white/50 mb-1.5">Full Name *</label>
<input value={profileFullName} onChange={e => setProfileFullName(e.target.value)} className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-gold/50" placeholder="Enter your full legal name" maxLength={100} />
</div>
<div>
<label className="block text-xs font-medium text-white/50 mb-1.5">Nickname (optional)</label>
<input value={profileNickname} onChange={e => setProfileNickname(e.target.value)} className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-gold/50" placeholder="How should we call you?" maxLength={50} />
</div>
<button onClick={handleCompleteProfile} disabled={profileLoading || !profileFullName || profileFullName.length < 2} className="w-full rounded-xl bg-gradient-to-r from-gold to-emerald px-4 py-3 text-sm font-semibold text-black disabled:opacity-50">
{profileLoading ? "Saving..." : "Save Profile"}
</button>
</div>
</Modal>
)}

{activeModal === "bank" && (
<Modal onClose={() => { setActiveModal(null); setAccountType(""); resetBankForm(); setBankPwdInput(""); setBankStep("verify"); }}>
<h3 className="text-lg font-semibold text-white mb-4">Link Bank Account</h3>
{bankStep === "verify" ? (
<div className="space-y-3">
<p className="text-sm text-white/60 mb-2">Enter your Withdrawal Password to continue:</p>
<div className="relative">
<input value={bankPwdInput} onChange={e => setBankPwdInput(e.target.value)} type="password" className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 pr-12 text-sm text-white outline-none focus:border-gold/50" placeholder="Withdrawal password" />
</div>
<button onClick={handleBankVerify} disabled={!bankPwdInput} className="w-full rounded-xl bg-gradient-to-r from-gold to-emerald px-4 py-3 text-sm font-semibold text-black disabled:opacity-50">
Verify Password
</button>
</div>
) : (
<div className="space-y-3">
{/* Account Type — always visible, hardcoded options */}
<div>
<label className="block text-xs font-medium text-white/50 mb-1.5">Account Type</label>
<div className="space-y-1 rounded-xl border border-white/[0.06] bg-white/5 p-1">
<button
onClick={() => handleAccountTypeChange("")}
className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition flex items-center gap-3 ${!accountType ? "bg-gold/20 text-gold" : "text-white/70 hover:bg-white/10"}`}
>
<span className="text-white/40 text-xs">Select account type...</span>
</button>
<button
onClick={() => handleAccountTypeChange("E_WALLET")}
className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition flex items-center gap-3 ${accountType === "E_WALLET" ? "bg-gold/20 text-gold" : "text-white/70 hover:bg-white/10"}`}
>
<svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<path d="M21 12a9 9 0 1 1-9-9" />
<path d="M12 3v9l4 2" />
</svg>
E-Wallet
</button>
<button
onClick={() => handleAccountTypeChange("BANK")}
className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition flex items-center gap-3 ${accountType === "BANK" ? "bg-gold/20 text-gold" : "text-white/70 hover:bg-white/10"}`}
>
<svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
<line x1="3" y1="10" x2="21" y2="10" />
<line x1="12" y1="10" x2="12" y2="19" />
</svg>
Bank
</button>
</div>
</div>

{/* Provider Dropdown — only shown after Account Type is selected */}
{accountType && (
<>
{/* E-Wallet Provider Selection */}
{accountType === "E_WALLET" && (
<div>
<label className="block text-xs font-medium text-white/50 mb-1.5">Select E-Wallet</label>
<div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-white/[0.06] bg-white/5 p-1">
<button
onClick={() => setProviderName("")}
className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition flex items-center gap-3 ${!providerName ? "bg-gold/20 text-gold" : "text-white/70 hover:bg-white/10"}`}
>
<span className="text-white/40 text-xs">Select E-Wallet...</span>
</button>
{ewallets.map(w => (
<button key={w} onClick={() => setProviderName(w)} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition flex items-center gap-3 ${providerName === w ? "bg-gold/20 text-gold" : "text-white/70 hover:bg-white/10"}`}>
{w === "GCash" && (
<svg className="h-5 w-5 shrink-0" viewBox="0 0 48 48" fill="none">
<rect width="48" height="48" rx="10" fill="#007A4B"/>
<text x="24" y="30" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="Arial">G</text>
</svg>
)}
{w === "Maya" && (
<svg className="h-5 w-5 shrink-0" viewBox="0 0 48 48" fill="none">
<rect width="48" height="48" rx="10" fill="#00AEEF"/>
<text x="24" y="30" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial">M</text>
</svg>
)}
{w === "Coins.ph" && (
<svg className="h-5 w-5 shrink-0" viewBox="0 0 48 48" fill="none">
<rect width="48" height="48" rx="10" fill="#F7941E"/>
<text x="24" y="30" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial">C</text>
</svg>
)}
{w === "GrabPay" && (
<svg className="h-5 w-5 shrink-0" viewBox="0 0 48 48" fill="none">
<rect width="48" height="48" rx="10" fill="#00B14F"/>
<text x="24" y="30" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial">G</text>
</svg>
)}
<span>{w}</span>
</button>
))}
</div>
</div>
)}

{/* Bank Searchable Dropdown */}
{accountType === "BANK" && (
<div>
<label className="block text-xs font-medium text-white/50 mb-1.5">Select Bank</label>
<input value={bankSearch} onChange={e => setBankSearch(e.target.value)} className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-gold/50" placeholder="Search bank..." />
<div className="max-h-40 overflow-y-auto space-y-1 rounded-xl border border-white/[0.06] bg-white/5 p-1 mt-1">
{filteredBanks.length > 0 ? (
filteredBanks.map(b => (
<button key={b} onClick={() => setProviderName(b)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 ${providerName === b ? "bg-gold/20 text-gold" : "text-white/70 hover:bg-white/10"}`}>
<svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
<line x1="3" y1="10" x2="21" y2="10" />
<line x1="12" y1="10" x2="12" y2="19" />
</svg>
{b}
</button>
))
) : (
<p className="text-xs text-white/40 px-3 py-2">No banks found</p>
)}
</div>
</div>
)}
</>
)}

{/* Account Name — auto-filled from user's fullName, read-only */}
{providerName && (
<>
<div>
<label className="block text-xs font-medium text-white/50 mb-1.5">Account Holder</label>
<div className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-sm text-white/80 opacity-60">
{user?.fullName || "—"}
</div>
</div>
<input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-gold/50" placeholder="Account number / Mobile number" />
<input value={confirmAccountNumber} onChange={e => setConfirmAccountNumber(e.target.value)} className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-gold/50" placeholder="Confirm account number" />
</>
)}

<button onClick={handleBankSubmit} disabled={bankLoading || !accountType || !providerName || !user?.fullName || !accountNumber || accountNumber !== confirmAccountNumber} className="w-full rounded-xl bg-gradient-to-r from-gold to-emerald px-4 py-3 text-sm font-semibold text-black disabled:opacity-50">
{bankLoading ? "Saving..." : "Save Bank Account"}
</button>
</div>
)}
</Modal>
)}
</div>
);
}

// ===== MODAL COMPONENT =====

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
return (
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
<div className="w-full max-w-md mx-4 rounded-3xl border border-white/[0.06] bg-surface p-6 shadow-glow" onClick={e => e.stopPropagation()}>
{children}
<button onClick={onClose} className="mt-4 w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-2.5 text-sm text-white/60 hover:bg-white/10 transition">
Cancel
</button>
</div>
</div>
);
}

// ===== VIP STATUS SUMMARY (compact card) =====

function VIPSummary() {
const user = useCurrentUser();
const [vipData, setVipData] = useState<any>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
if (!user) return;
apiFetch<any>("/api/vip").then(d => setVipData(d)).catch(() => {}).finally(() => setLoading(false));
}, [user]);

if (!user || loading) return null;
if (!vipData) return null;

const { currentLevel, currentTierName, nextTier, remainingValidBet, remainingDeposit, progress } = vipData;

return (
<GlassCard className="space-y-4">
<div className="flex items-center justify-between">
<div className="flex items-center gap-3">
<div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-gold to-yellow-600">
<TrophyIcon className="h-5 w-5 text-black" />
</div>
<div>
<p className="text-sm font-semibold text-white">{currentTierName}</p>
<p className="text-xs text-white/50">VIP Level {currentLevel}</p>
</div>
</div>
<Link href="/vip" className="rounded-xl bg-gradient-to-r from-gold to-emerald px-4 py-2 text-xs font-semibold text-black hover:brightness-110 transition">
View VIP Benefits
</Link>
</div>
{nextTier && (
<div className="space-y-2">
<div className="flex items-center justify-between text-xs">
<span className="text-white/50">Progress to {nextTier.name}</span>
<span className="text-gold font-semibold">{progress}%</span>
</div>
<ProgressBar value={progress} />
<div className="grid grid-cols-2 gap-2 pt-1">
<div className="rounded-lg border border-white/[0.06] bg-white/5 px-3 py-2">
<p className="text-[10px] text-white/40">Remaining Valid Bet</p>
<p className="text-xs font-semibold text-white">{formatPHP(remainingValidBet)}</p>
</div>
<div className="rounded-lg border border-white/[0.06] bg-white/5 px-3 py-2">
<p className="text-[10px] text-white/40">Remaining Deposit</p>
<p className="text-xs font-semibold text-white">{formatPHP(remainingDeposit)}</p>
</div>
</div>
</div>
)}
</GlassCard>
);
}

// ===== ACCOUNT DASHBOARD =====

export default function AccountDashboard() {
const user = useCurrentUser();
const [activeSection, setActiveSection] = useState<"security" | "vip">("security");

if (!user) {
return (
<div className="space-y-6 pb-20">
<SectionHeading title="Account Dashboard" description="Sign in to access your account settings." />
</div>
);
}

return (
<div className="space-y-6 pb-20">
<SectionHeading eyebrow="Account" title="Account Dashboard" description="Manage your security settings and view your VIP progression." />

<div className="flex gap-2 rounded-2xl border border-white/[0.06] bg-surface p-1">
<button onClick={() => setActiveSection("security")} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${activeSection === "security" ? "bg-gold/10 text-gold" : "text-white/60 hover:text-white"}`}>
<ShieldCheckIcon className="h-4 w-4 inline-block mr-1.5" />
Security Center
</button>
<button onClick={() => setActiveSection("vip")} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${activeSection === "vip" ? "bg-gold/10 text-gold" : "text-white/60 hover:text-white"}`}>
<TrophyIcon className="h-4 w-4 inline-block mr-1.5" />
VIP Level
</button>
</div>

{activeSection === "security" && (
<div>
<h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
<ShieldCheckIcon className="h-6 w-6 text-gold" />
Security Center
</h2>
<SecurityCenter />
</div>
)}

{activeSection === "vip" && (
<div>
<h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
<TrophyIcon className="h-6 w-6 text-gold" />
VIP Level
</h2>
<VIPSummary />
</div>
)}
</div>
);
}