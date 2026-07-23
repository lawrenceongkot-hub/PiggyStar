/**
* Development Server Launcher
* 
* Starts both the Next.js main app and the Vite admin frontend.
*/

const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ADMIN_DIR = path.resolve(ROOT, 'admin-frontend');

console.log('=== Development Server ===');
console.log('Starting main app (Next.js) on port 3000...');
console.log('Starting Back Office (Vite) on port 3002...\n');

const next = spawn('npx', ['next', 'dev', '-p', '3000'], {
cwd: ROOT,
stdio: 'inherit',
shell: true,
});

const vite = spawn('npx', ['vite', '--port', '3002', '--host'], {
cwd: ADMIN_DIR,
stdio: 'inherit',
shell: true,
});

process.on('SIGINT', () => { next.kill(); vite.kill(); process.exit(0); });
process.on('SIGTERM', () => { next.kill(); vite.kill(); process.exit(0); });