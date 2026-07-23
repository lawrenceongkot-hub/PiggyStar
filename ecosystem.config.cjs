/**
 * PM2 Ecosystem Configuration for Staging
 *
 * Use this if deploying without Docker.
 * Requires: Node.js 20+, PostgreSQL, Redis
 *
 * Start: pm2 start ecosystem.config.cjs
 * Save:  pm2 save
 * Logs:  pm2 logs
 */

module.exports = {
  apps: [
    {
      name: "premium-casino-api",
      cwd: "./",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: 2,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_file: ".env",
      max_memory_restart: "1G",
      restart_delay: 5000,
      max_restarts: 10,
      error_file: "./logs/api-error.log",
      out_file: "./logs/api-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      kill_timeout: 10000,
      listen_timeout: 8000,
      health_check_url: "/api/health",
      health_check_interval: 30000,
    },
    {
      name: "premium-casino-backoffice",
      cwd: "./back-office",
      script: "npx",
      args: "vite preview --port 3002 --host",
      env: {
        NODE_ENV: "production",
      },
      env_file: ".env",
      max_memory_restart: "512M",
      restart_delay: 5000,
      max_restarts: 10,
      error_file: "./logs/backoffice-error.log",
      out_file: "./logs/backoffice-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
    {
      name: "premium-casino-worker",
      cwd: "./",
      script: "node",
      args: "scripts/worker/expire-deposits.js",
      instances: 1,
      env: {
        NODE_ENV: "production",
      },
      env_file: ".env",
      max_memory_restart: "256M",
      restart_delay: 5000,
      max_restarts: 10,
      error_file: "./logs/worker-error.log",
      out_file: "./logs/worker-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      cron_restart: "*/30 * * * *",
    },
  ],
};