module.exports = {
  apps: [
    {
      name: 'trading-engine',
      script: './backend/server.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1024M',
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      node_args: '--max-old-space-size=2048',
      error_file: './logs/server-error.log',
      out_file: './logs/server-out.log',
      merge_logs: true,
      time: true
    }
  ]
};
