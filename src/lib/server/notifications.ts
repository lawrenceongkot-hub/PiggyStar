export async function sendSms(mobile: string, message: string) {
// Provider selection: default to LOG in development if no provider configured.
const provider = (process.env.SMS_PROVIDER_NAME || "LOG").toUpperCase();

// LOG provider: safe no-op that writes to server logs (useful for local/dev).
if (provider === "LOG") {
// Keep message sending non-blocking but recorded.
console.info(`[SMS][LOG] To=${mobile} Message=${message}`);
return;
}

// TWILIO provider (optional): requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
if (provider === "TWILIO") {
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_FROM;

if (!accountSid || !authToken || !from) {
throw new Error(
"Twilio is selected as SMS provider but TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM is not set.",
);
}

const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
const body = new URLSearchParams({ From: from, To: mobile, Body: message });
const basic = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

const res = await fetch(url, {
method: "POST",
headers: {
Authorization: `Basic ${basic}`,
"Content-Type": "application/x-www-form-urlencoded",
},
body: body.toString(),
});

if (!res.ok) {
const text = await res.text().catch(() => "");
throw new Error(`Twilio SMS send failed: ${res.status} ${res.statusText} ${text}`);
}

return;
}

// Unsupported provider
throw new Error(
`SMS provider '${provider}' is not supported. Supported providers: LOG, TWILIO. Update src/lib/server/notifications.ts to add other providers.`,
);
}
