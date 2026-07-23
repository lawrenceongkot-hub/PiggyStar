// ===== Wave Unified Game API Configuration =====
// All values read from environment variables - no hardcoded credentials

export const waveConfig = {
  // API
  baseUrl: process.env.WAVE_API_BASE_URL || "https://api.wavewl.tech",
  apiKey: process.env.WAVE_API_KEY || "",

  // Game Launch
  returnUrl: process.env.WAVE_RETURN_URL || "/lobby",
  defaultLanguage: process.env.WAVE_DEFAULT_LANGUAGE || "en",
  timeout: parseInt(process.env.WAVE_TIMEOUT || "30000", 10),
  useSandbox: process.env.WAVE_USE_SANDBOX === "true",

  // Session
  sessionTimeout: parseInt(process.env.WAVE_SESSION_TIMEOUT || "3600", 10), // 1 hour

  // Webhook
  webhookSecret: process.env.WAVE_WEBHOOK_SECRET || "",

  // Supported languages
  supportedLanguages: ["en", "fil", "pt"] as const,

  get isConfigured(): boolean {
    return !!this.apiKey;
  },

  get apiUrl(): string {
    return this.useSandbox ? `${this.baseUrl}/sandbox` : this.baseUrl;
  },
};

export type WaveLanguage = (typeof waveConfig.supportedLanguages)[number];