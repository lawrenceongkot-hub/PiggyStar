"use client";

import { useState, useEffect, useMemo } from "react";
import { useCurrentUser } from "@/lib/auth/store";
import { apiFetch } from "@/lib/api/client";
import { toast } from "sonner";
import {
LockClosedIcon, DevicePhoneMobileIcon, EnvelopeIcon,
ComputerDesktopIcon, ShieldCheckIcon, ArrowRightIcon,
SparklesIcon, BanknotesIcon, KeyIcon,
CheckCircleIcon, XCircleIcon, ClockIcon, PencilSquareIcon,
TrashIcon, PlusIcon, ArrowPathIcon, EyeIcon, EyeSlashIcon,
UserCircleIcon, ArrowRightOnRectangleIcon
} from "@heroicons/react/24/outline";
import { GlassCard, MiniBadge, SectionHeading } from "@/components/ui/casino-ui";

const PROVIDERS = ["GCASH", "MAYA", "GOTYME", "SEABANK", "QRPH"];

interface SecurityStatus {
mobileVerified: boolean;
emailVerified: boolean;
loginPasswordSet: boolean;
withdrawPasswordSet: boolean;
bankVerified: boolean;
securityPercentage: number;
mobile: string;
email: string;
hasWithdrawalPassword: boolean;
hasBank: boolean;
}

const SECURITY_ITEMS = [
{ key: "mobileVerified" as const, label: "Mobile Number", icon: DevicePhoneMobileIcon },
{ key: "emailVerified" as const, label: "Email Address", icon: EnvelopeIcon },
{ key: "loginPasswordSet" as const, label: "Login Password", icon: LockClosedIcon },
{ key: "withdrawPasswordSet" as const, label: "Withdrawal Password", icon: KeyIcon },
{ key: "bankVerified" as const, label: "Bank Account", icon: BanknotesIcon },
];

function getItemSubtitle(key: string, status: SecurityStatus): string {
switch (key) {
case "mobileVerified":
return status.mobileVerified ? "Success" : "Not set";
case "emailVerified":
return status.emailVerified ? "Success" : "Not set";
case "loginPasswordSet":
return status.loginPasswordSet ? "Success" : "Used for account access";
case "withdrawPasswordSet":
return status.withdrawPasswordSet ? "Success" : "Required for withdrawals";
case "bankVerified":
return status.bankVerified ? "Success" : "Not linked";
default:
return "";
}
}

function getItemBadge(key: string, status: SecurityStatus): { text: string; tone: "gold" | "neutral" | "emerald" } {
const isVerified = (status as any)[key] === true;
switch (key) {
case "mobileVerified":
return isVerified ? { text: "Verified", tone: "emerald" } : { text: "Unverified", tone: "neutral" };
case "emailVerified":
return isVerified ? { text: "Verified", tone: "emerald" } : { text: "Unverified", tone: "neutral" };
case "loginPasswordSet":
return isVerified ? { text: "Verified", tone: "emerald" } : { text: "Active", tone: "neutral" };
case "withdrawPasswordSet":
return isVerified ? { text: "Verified", tone: "emerald" } : { text: "Not Set", tone: "neutral" };
case "bankVerified":
return isVerified ? { text: "Verified", tone: "emerald" } : { text: "Unverified", tone: "neutral" };
default:
return { text: "Unknown", tone: "neutral" };
}
}

export default function SecurityCenterPage() {
const user = useCurrentUser();
const [activeTab, setActiveTab] = useState("profile");
const [loading, setLoading] = useState(true);
const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);

// Profile
const [profile, setProfile] = useState<any>(null);
const [fullName, setFullName] = useState("");
const [username, setUsername] = useState("");
const [savingProfile, setSavingProfile] = useState(false);

// Email
const [email, setEmail] = useState("");
const [emailVerified, setEmailVerified] = useState(false);
const [emailOtp, setEmailOtp] = useState("");
const [emailStep, setEmailStep] = useState<"view" | "add" | "verify">("view");
const [emailLoading, setEmailLoading] = useState(false);

// Mobile
const [mobile, setMobile] = useState("");
const [mobileVerified, setMobileVerified] = useState(false);
const [mobileOtp, setMobileOtp] = useState("");
const [mobileStep, setMobileStep] = useState<"view" | "add" | "verify">("view");
const [mobileLoading, setMobileLoading] = useState(false);

// Banks
const [banks, setBanks] = useState<any[]>([]);
const [hasWithdrawalPassword, setHasWithdrawalPassword] = useState(false);
const [newBankType, setNewBankType] = useState("GCASH");
const [newBankNumber, setNewBankNumber] = useState("");
const [newBankPassword, setNewBankPassword] = useState("");
const [showPassword, setShowPassword] = useState(false);
const [bankLoading, setBankLoading] = useState(false);

// Devices
const [devices, setDevices] = useState<any[]>([]);
const [deviceLoading, setDeviceLoading] = useState(false);

// Login History
const [loginHistory, setLoginHistory] = useState<any[]>([]);
const [historyPage, setHistoryPage] = useState(1);
const [historyTotal, setHistoryTotal] = useState(0);
const [historyLoading, setHistoryLoading] = useState(false);

const loadSecurityStatus = async () => {
try {
const data: any = await apiFetch("/api/account/security");
setSecurityStatus(data.security);
} catch { /* ignore */ }
};

useEffect(() => {
if (!user) return;
loadSecurityStatus();
loadProfile();
loadEmail();
loadMobile();
loadBanks();
loadDevices();
loadLoginHistory();
}, [user]);

const loadProfile = async () => {
try {
const data: any = await apiFetch("/api/player/profile");
setProfile(data.profile);
setFullName(data.profile?.fullName || "");
setUsername(data.profile?.username || "");
} catch { /* ignore */ }
setLoading(false);
};

const loadEmail = async () => {
try {
const data: any = await apiFetch("/api/player/email");
setEmail(data.email || "");
setEmailVerified(data.verified || false);
} catch { /* ignore */ }
};

const loadMobile = async () => {
try {
const data: any = await apiFetch("/api/player/mobile");
setMobile(data.mobile || "");
setMobileVerified(data.verified || false);
} catch { /* ignore */ }
};

const loadBanks = async () => {
try {
const data: any = await apiFetch("/api/player/banks");
setBanks(data.banks || []);
setHasWithdrawalPassword(data.hasWithdrawalPassword || false);
} catch { /* ignore */ }
};

const loadDevices = async () => {
setDeviceLoading(true);
try {
const data: any = await apiFetch("/api/player/devices");
setDevices(data.devices || []);
} catch { /* ignore */ }
setDeviceLoading(false);
};

const loadLoginHistory = async () => {
setHistoryLoading(true);
try {
const data: any = await apiFetch(`/api/player/login-history?page=${historyPage}&limit=20`);
setLoginHistory(data.history || []);
setHistoryTotal(data.pagination?.total || 0);
} catch { /* ignore */ }
setHistoryLoading(false);
};

const saveProfile = async () => {
setSavingProfile(true);
try {
const data: any = await apiFetch("/api/player/profile", {
method: "PUT",
body: JSON.stringify({ fullName, username }),
});
setProfile(data.profile);
toast.success("Profile updated");
} catch (err: any) {
toast.error(err.message);
}
setSavingProfile(false);
};

const sendEmailOtp = async () => {
setEmailLoading(true);
try {
await apiFetch("/api/player/email", {
method: "POST",
body: JSON.stringify({ email }),
});
setEmailStep("verify");
toast.success("OTP sent to email");
} catch (err: any) {
toast.error(err.message);
}
setEmailLoading(false);
};

const verifyEmailOtp = async () => {
if (!email || !emailOtp || emailOtp.length < 6) {
toast.error("Enter the 6-digit verification code");
return;
}
setEmailLoading(true);
try {
await apiFetch("/api/player/email", {
method: "PUT",
body: JSON.stringify({ email, code: emailOtp }),
});
setEmailVerified(true);
setEmailStep("view");
toast.success("Email verified");
loadSecurityStatus();
} catch (err: any) {
toast.error(err.message);
}
setEmailLoading(false);
};

const sendMobileOtp = async () => {
setMobileLoading(true);
try {
await apiFetch("/api/player/mobile", {
method: "POST",
body: JSON.stringify({ mobile }),
});
setMobileStep("verify");
toast.success("OTP sent to mobile");
} catch (err: any) {
toast.error(err.message);
}
setMobileLoading(false);
};

const verifyMobileOtp = async () => {
setMobileLoading(true);
try {
await apiFetch("/api/player/mobile", {
method: "PUT",
body: JSON.stringify({ otp: mobileOtp }),
});
setMobileVerified(true);
setMobileStep("view");
toast.success("Mobile verified");
loadSecurityStatus();
} catch (err: any) {
toast.error(err.message);
}
setMobileLoading(false);
};

const bindBank = async () => {
if (!profile?.fullName) {
toast.error("Please set your full name in Profile first");
return;
}
setBankLoading(true);
try {
await apiFetch("/api/player/banks", {
method: "POST",
body: JSON.stringify({
accountType: newBankType,
accountNumber: newBankNumber,
withdrawalPassword: newBankPassword || undefined,
}),
});
toast.success("Bank account bound");
setNewBankNumber("");
setNewBankPassword("");
loadBanks();
loadSecurityStatus();
} catch (err: any) {
toast.error(err.message);
}
setBankLoading(false);
};

const removeBank = async (id: string) => {
try {
await apiFetch(`/api/player/banks?id=${id}`, { method: "DELETE" });
toast.success("Bank account removed");
loadBanks();
loadSecurityStatus();
} catch (err: any) {
toast.error(err.message);
}
};

const logoutAllDevices = async () => {
try {
await apiFetch("/api/player/devices", { method: "DELETE" });
toast.success("All other devices logged out");
loadDevices();
} catch (err: any) {
toast.error(err.message);
}
};

const tabs = [
{ id: "profile", label: "Profile", icon: UserCircleIcon },
{ id: "email", label: "Email", icon: EnvelopeIcon },
{ id: "mobile", label: "Mobile", icon: DevicePhoneMobileIcon },
{ id: "banks", label: "Bank & E-wallet", icon: BanknotesIcon },
{ id: "devices", label: "Devices", icon: ComputerDesktopIcon },
{ id: "history", label: "Login History", icon: ClockIcon },
];

if (!user) {
return (
<div className="space-y-6 pb-20">
<SectionHeading eyebrow="Security" title="Security Center" description="Please sign in to access security settings." />
</div>
);
}

const pct = securityStatus?.securityPercentage ?? 0;
const isComplete = pct === 100;

return (
<div className="space-y-6 pb-20">
<SectionHeading eyebrow="Security" title="Security Center" description="Manage your account security, devices, and linked accounts." />

{/* Security Summary Banner */}
<GlassCard className="space-y-5">
<div className="flex items-center justify-between">
<h3 className="text-lg font-semibold text-white">Security Completion</h3>
{isComplete ? (
<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald/15 px-4 py-1.5 text-sm font-semibold text-emerald">
<CheckCircleIcon className="h-4 w-4" />
100% Complete
</span>
) : (
<span className="text-sm font-semibold text-white/60">{pct}%</span>
)}
</div>

{/* Progress Bar */}
<div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
<div
className={`h-full rounded-full transition-all duration-500 ${isComplete ? "bg-emerald" : "bg-gold"}`}
style={{ width: `${pct}%` }}
/>
</div>

{/* 5 Security Items */}
<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
{SECURITY_ITEMS.map((item) => {
const Icon = item.icon;
const isItemVerified = securityStatus ? (securityStatus as any)[item.key] === true : false;
const subtitle = securityStatus ? getItemSubtitle(item.key, securityStatus) : "Loading...";
const badge = securityStatus ? getItemBadge(item.key, securityStatus) : { text: "Loading", tone: "neutral" as const };

return (
<div
key={item.key}
className={`rounded-xl border p-4 transition ${
isItemVerified
? "border-emerald/20 bg-emerald/5"
: "border-white/[0.06] bg-white/5"
}`}
>
<div className="flex items-center gap-3">
<div className={`rounded-lg p-2 ${isItemVerified ? "bg-emerald/10 text-emerald" : "bg-white/10 text-white/50"}`}>
<Icon className="h-5 w-5" />
</div>
<div className="flex-1 min-w-0">
<p className="text-sm font-semibold text-white truncate">{item.label}</p>
<p className="text-xs text-white/50 truncate">{subtitle}</p>
</div>
</div>
<div className="mt-3">
<span
className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
badge.tone === "emerald"
? "bg-emerald/10 text-emerald"
: badge.tone === "gold"
? "bg-gold/10 text-gold"
: "bg-white/10 text-white/60"
}`}
>
{badge.text}
</span>
</div>
</div>
);
})}
</div>
</GlassCard>

<div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/[0.06] bg-surface p-1 hide-scrollbar">
{tabs.map((tab) => {
const Icon = tab.icon;
return (
<button
key={tab.id}
onClick={() => setActiveTab(tab.id)}
className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition ${
activeTab === tab.id
? "bg-gold/10 text-gold"
: "text-white/60 hover:text-white"
}`}
>
<Icon className="h-4 w-4" />
{tab.label}
</button>
);
})}
</div>

{activeTab === "profile" && (
<GlassCard className="space-y-5">
<h3 className="text-lg font-semibold text-white">Profile Information</h3>
<div className="space-y-4">
<div>
<label className="block text-sm text-white/60 mb-1.5">User ID</label>
<div className="rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-sm text-white/80 font-mono">
{profile?.id || user.id}
</div>
</div>
<div>
<label className="block text-sm text-white/60 mb-1.5">Username</label>
<input
value={username}
onChange={(e) => setUsername(e.target.value)}
className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-gold/50"
/>
{profile?.usernameUpdatedAt && (
<p className="mt-1 text-xs text-white/40">
Last changed: {new Date(profile.usernameUpdatedAt).toLocaleDateString()}
</p>
)}
</div>
<div>
<label className="block text-sm text-white/60 mb-1.5">Full Name</label>
<input
value={fullName}
onChange={(e) => setFullName(e.target.value)}
className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-gold/50"
placeholder="Enter your full name"
/>
<p className="mt-1 text-xs text-white/40">
Must match your bank account name. Changing this will invalidate existing bank bindings.
</p>
</div>
<button
onClick={saveProfile}
disabled={savingProfile}
className="rounded-xl bg-gradient-to-r from-gold to-emerald px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-70"
>
{savingProfile ? "Saving..." : "Save Changes"}
</button>
</div>
</GlassCard>
)}

{activeTab === "email" && (
<GlassCard className="space-y-5">
<h3 className="text-lg font-semibold text-white">Email Verification</h3>
{emailStep === "view" && (
<div className="space-y-4">
<div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/5 p-4">
<div>
<p className="text-sm text-white/80">{email || "No email set"}</p>
<p className="text-xs text-white/40 mt-1">
Status: {emailVerified ? <span className="text-emerald">Verified</span> : <span className="text-yellow-500">Not verified</span>}
</p>
</div>
{emailVerified && <CheckCircleIcon className="h-6 w-6 text-emerald" />}
</div>
<button
onClick={() => setEmailStep("add")}
className="rounded-xl border border-gold/30 bg-gold/10 px-5 py-2.5 text-sm font-semibold text-gold"
>
{email ? "Change Email" : "Add Email"}
</button>
</div>
)}
{emailStep === "add" && (
<div className="space-y-4">
<input
value={email}
onChange={(e) => setEmail(e.target.value)}
className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-gold/50"
placeholder="Enter your email"
type="email"
/>
<button
onClick={sendEmailOtp}
disabled={emailLoading || !email}
className="rounded-xl bg-gradient-to-r from-gold to-emerald px-6 py-3 text-sm font-semibold text-black disabled:opacity-70"
>
{emailLoading ? "Sending..." : "Send OTP"}
</button>
</div>
)}
{emailStep === "verify" && (
<div className="space-y-4">
<p className="text-sm text-white/60">Enter the 6-digit OTP sent to {email}</p>
<input
value={emailOtp}
onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-white outline-none focus:border-gold/50 font-mono text-center text-2xl tracking-[0.5em]"
placeholder="000000"
maxLength={6}
/>
<button
onClick={verifyEmailOtp}
disabled={emailLoading || emailOtp.length !== 6}
className="rounded-xl bg-gradient-to-r from-gold to-emerald px-6 py-3 text-sm font-semibold text-black disabled:opacity-70"
>
{emailLoading ? "Verifying..." : "Verify OTP"}
</button>
</div>
)}
</GlassCard>
)}

{activeTab === "mobile" && (
<GlassCard className="space-y-5">
<h3 className="text-lg font-semibold text-white">Mobile Verification</h3>
{mobileStep === "view" && (
<div className="space-y-4">
<div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/5 p-4">
<div>
<p className="text-sm text-white/80">{mobile || "No mobile set"}</p>
<p className="text-xs text-white/40 mt-1">
Status: {mobileVerified ? <span className="text-emerald">Verified</span> : <span className="text-yellow-500">Not verified</span>}
</p>
</div>
{mobileVerified && <CheckCircleIcon className="h-6 w-6 text-emerald" />}
</div>
<button
onClick={() => setMobileStep("add")}
className="rounded-xl border border-gold/30 bg-gold/10 px-5 py-2.5 text-sm font-semibold text-gold"
>
{mobile ? "Change Mobile" : "Add Mobile"}
</button>
</div>
)}
{mobileStep === "add" && (
<div className="space-y-4">
<input
value={mobile}
onChange={(e) => setMobile(e.target.value)}
className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-gold/50"
placeholder="+63XXXXXXXXXX"
/>
<button
onClick={sendMobileOtp}
disabled={mobileLoading || !mobile}
className="rounded-xl bg-gradient-to-r from-gold to-emerald px-6 py-3 text-sm font-semibold text-black disabled:opacity-70"
>
{mobileLoading ? "Sending..." : "Send OTP"}
</button>
</div>
)}
{mobileStep === "verify" && (
<div className="space-y-4">
<p className="text-sm text-white/60">Enter the 6-digit OTP sent to {mobile}</p>
<input
value={mobileOtp}
onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-white outline-none focus:border-gold/50 font-mono text-center text-2xl tracking-[0.5em]"
placeholder="000000"
maxLength={6}
/>
<button
onClick={verifyMobileOtp}
disabled={mobileLoading || mobileOtp.length !== 6}
className="rounded-xl bg-gradient-to-r from-gold to-emerald px-6 py-3 text-sm font-semibold text-black disabled:opacity-70"
>
{mobileLoading ? "Verifying..." : "Verify OTP"}
</button>
</div>
)}
</GlassCard>
)}

{activeTab === "banks" && (
<div className="space-y-5">
<GlassCard className="space-y-5">
<h3 className="text-lg font-semibold text-white">Bound Accounts</h3>
{banks.length === 0 ? (
<p className="text-sm text-white/50">No bank accounts bound yet.</p>
) : (
<div className="space-y-3">
{banks.filter(b => b.status === "ACTIVE").map((bank) => (
<div key={bank.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/5 p-4">
<div>
<p className="text-sm font-semibold text-white">{bank.bankName}</p>
<p className="text-xs text-white/50">{bank.accountName} · {bank.accountNumber}</p>
</div>
<button onClick={() => removeBank(bank.id)} className="text-red/70 hover:text-red">
<TrashIcon className="h-5 w-5" />
</button>
</div>
))}
</div>
)}
</GlassCard>

<GlassCard className="space-y-5">
<h3 className="text-lg font-semibold text-white">Bind New Account</h3>
<div className="space-y-4">
<div>
<label className="block text-sm text-white/60 mb-1.5">Account Type</label>
<select
value={newBankType}
onChange={(e) => setNewBankType(e.target.value)}
className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-gold/50"
>
{PROVIDERS.map((p) => (
<option key={p} value={p}>{p}</option>
))}
</select>
</div>
<div>
<label className="block text-sm text-white/60 mb-1.5">Account Name</label>
<div className="rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-sm text-white/60">
{profile?.fullName || "Set your full name in Profile first"}
</div>
</div>
<div>
<label className="block text-sm text-white/60 mb-1.5">Account Number</label>
<input
value={newBankNumber}
onChange={(e) => setNewBankNumber(e.target.value)}
className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-gold/50"
placeholder="Account number"
/>
</div>
<div>
<label className="block text-sm text-white/60 mb-1.5">
{hasWithdrawalPassword ? "Withdrawal Password" : "Set Withdrawal Password (first time)"}
</label>
<div className="relative">
<input
type={showPassword ? "text" : "password"}
value={newBankPassword}
onChange={(e) => setNewBankPassword(e.target.value)}
className="w-full rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3 pr-12 text-sm text-white outline-none focus:border-gold/50"
placeholder="Withdrawal password"
/>
<button
onClick={() => setShowPassword(!showPassword)}
className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
>
{showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
</button>
</div>
</div>
<button
onClick={bindBank}
disabled={bankLoading || !newBankNumber || (!hasWithdrawalPassword && !newBankPassword)}
className="rounded-xl bg-gradient-to-r from-gold to-emerald px-6 py-3 text-sm font-semibold text-black disabled:opacity-70"
>
{bankLoading ? "Binding..." : "Bind Account"}
</button>
</div>
</GlassCard>
</div>
)}

{activeTab === "devices" && (
<GlassCard className="space-y-5">
<div className="flex items-center justify-between">
<h3 className="text-lg font-semibold text-white">Login Devices</h3>
<button
onClick={logoutAllDevices}
className="rounded-xl border border-red/30 bg-red/10 px-4 py-2 text-xs font-semibold text-red"
>
Logout All Devices
</button>
</div>
{deviceLoading ? (
<p className="text-sm text-white/50">Loading devices...</p>
) : devices.length === 0 ? (
<p className="text-sm text-white/50">No devices found.</p>
) : (
<div className="space-y-3">
{devices.map((device) => (
<div key={device.id} className="rounded-xl border border-white/[0.06] bg-white/5 p-4">
<div className="flex items-center justify-between">
<div className="flex items-center gap-3">
<ComputerDesktopIcon className="h-5 w-5 text-gold" />
<div>
<p className="text-sm font-semibold text-white">
{device.browser} on {device.os}
{device.isCurrent && <span className="ml-2 text-xs text-emerald">(Current)</span>}
</p>
<p className="text-xs text-white/50">IP: {device.ip}</p>
</div>
</div>
<MiniBadge tone={device.status === "Active" ? "gold" : "neutral"}>
{device.status}
</MiniBadge>
</div>
<p className="mt-2 text-xs text-white/40">
First login: {new Date(device.firstLogin).toLocaleString()}
</p>
</div>
))}
</div>
)}
</GlassCard>
)}

{activeTab === "history" && (
<GlassCard className="space-y-5">
<h3 className="text-lg font-semibold text-white">Login History</h3>
{historyLoading ? (
<p className="text-sm text-white/50">Loading history...</p>
) : loginHistory.length === 0 ? (
<p className="text-sm text-white/50">No login history found.</p>
) : (
<div className="overflow-x-auto">
<table className="w-full text-sm">
<thead>
<tr className="border-b border-white/[0.06] text-left text-xs uppercase tracking-wider text-white/40">
<th className="pb-3 pr-4">Date & Time</th>
<th className="pb-3 pr-4">IP Address</th>
<th className="pb-3 pr-4">Browser</th>
<th className="pb-3 pr-4">OS</th>
<th className="pb-3">Status</th>
</tr>
</thead>
<tbody>
{loginHistory.map((entry) => (
<tr key={entry.id} className="border-b border-white/[0.04]">
<td className="py-3 pr-4 text-white/80">{new Date(entry.dateTime).toLocaleString()}</td>
<td className="py-3 pr-4 text-white/60 font-mono text-xs">{entry.ip}</td>
<td className="py-3 pr-4 text-white/60">{entry.browser}</td>
<td className="py-3 pr-4 text-white/60">{entry.os}</td>
<td className="py-3">
<span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
entry.status === "Success" ? "bg-emerald/10 text-emerald" : "bg-red/10 text-red"
}`}>
{entry.status === "Success" ? <CheckCircleIcon className="h-3 w-3" /> : <XCircleIcon className="h-3 w-3" />}
{entry.status}
</span>
</td>
</tr>
))}
</tbody>
</table>
{historyTotal > 20 && (
<div className="mt-4 flex items-center justify-between">
<button
onClick={() => { setHistoryPage(p => Math.max(1, p - 1)); loadLoginHistory(); }}
disabled={historyPage === 1}
className="rounded-xl border border-white/[0.06] bg-white/5 px-4 py-2 text-xs text-white/60 disabled:opacity-40"
>
Previous
</button>
<span className="text-xs text-white/40">Page {historyPage} of {Math.ceil(historyTotal / 20)}</span>
<button
onClick={() => { setHistoryPage(p => p + 1); loadLoginHistory(); }}
disabled={historyPage >= Math.ceil(historyTotal / 20)}
className="rounded-xl border border-white/[0.06] bg-white/5 px-4 py-2 text-xs text-white/60 disabled:opacity-40"
>
Next
</button>
</div>
)}
</div>
)}
</GlassCard>
)}
</div>
);
}