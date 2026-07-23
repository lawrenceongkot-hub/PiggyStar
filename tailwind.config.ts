import type { Config } from "tailwindcss";

const config: Config = {
darkMode: ["class"],
content: [
"./src/**/*.{js,ts,jsx,tsx,mdx}",
],
theme: {
extend: {
colors: {
background: "#0A1A0F",
surface: "#0D2414",
surface2: "#112D1A",
surface3: "#163822",
line: "rgba(255,255,255,0.06)",
gold: "#D4AF37",
"gold-light": "#F0D060",
"gold-dark": "#B8962E",
emerald: "#2ECC71",
"emerald-dark": "#1A9C4A",
"emerald-light": "#58D68D",
red: "#C8102E",
"red-dark": "#A00D25",
success: "#23C483",
warning: "#F39C12",
text: "#E8F0E8",
"text-muted": "#8FA88F",
},
boxShadow: {
gold: "0 0 0 1px rgba(212,175,55,0.25), 0 10px 40px rgba(212,175,55,0.15)",
"gold-sm": "0 0 0 1px rgba(212,175,55,0.15), 0 4px 20px rgba(212,175,55,0.08)",
emerald: "0 0 0 1px rgba(46,204,113,0.25), 0 10px 40px rgba(46,204,113,0.12)",
glow: "0 0 30px rgba(212,175,55,0.12), 0 0 60px rgba(46,204,113,0.06)",
"glow-emerald": "0 0 30px rgba(46,204,113,0.15), 0 0 60px rgba(46,204,113,0.08)",
},
backgroundImage: {
"radial-glow":
"radial-gradient(circle at top, rgba(212,175,55,0.12), transparent 45%), radial-gradient(circle at bottom right, rgba(46,204,113,0.10), transparent 38%)",
"hero-gradient":
"linear-gradient(135deg, rgba(10,26,15,0.95) 0%, rgba(13,36,20,0.8) 50%, rgba(22,56,34,0.6) 100%)",
"card-gradient":
"linear-gradient(180deg, rgba(22,56,34,0.4) 0%, rgba(10,26,15,0.8) 100%)",
},
keyframes: {
marquee: {
"0%": { transform: "translateX(0)" },
"100%": { transform: "translateX(-50%)" },
},
float: {
"0%, 100%": { transform: "translateY(0px)" },
"50%": { transform: "translateY(-8px)" },
},
pulseSoft: {
"0%, 100%": { opacity: "0.75" },
"50%": { opacity: "1" },
},
shimmer: {
"0%": { backgroundPosition: "-200% 0" },
"100%": { backgroundPosition: "200% 0" },
},
slideUp: {
"0%": { opacity: "0", transform: "translateY(20px)" },
"100%": { opacity: "1", transform: "translateY(0)" },
},
fadeIn: {
"0%": { opacity: "0" },
"100%": { opacity: "1" },
},
scaleIn: {
"0%": { opacity: "0", transform: "scale(0.95)" },
"100%": { opacity: "1", transform: "scale(1)" },
},
},
animation: {
marquee: "marquee 25s linear infinite",
float: "float 6s ease-in-out infinite",
pulseSoft: "pulseSoft 3s ease-in-out infinite",
shimmer: "shimmer 2s linear infinite",
slideUp: "slideUp 0.5s ease-out",
fadeIn: "fadeIn 0.3s ease-out",
scaleIn: "scaleIn 0.3s ease-out",
},
},
},
plugins: [],
};
export default config;