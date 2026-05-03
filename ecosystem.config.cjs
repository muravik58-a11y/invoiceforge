module.exports = {
  apps: [
    {
      name: 'invoiceforge',
      script: 'server.js',
      cwd: '/home/deploy/apps/invoiceforge',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/home/deploy/.pm2/logs/invoiceforge-error.log',
      out_file: '/home/deploy/.pm2/logs/invoiceforge-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      autorestart: true,
      watch: false,
    },
  ],
}
