module.exports = {
  apps: [
    {
      // 1. API Server (REST)
      // Runs in 'cluster' mode with max instances (1 per CPU core)
      name: 'bhookingo-api',
      script: './server.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      env: {
        NODE_ENV: 'production'
      },
    },
    {
      // 2. Socket Server (WebSockets)
      // Runs in 'fork' mode (1 single instance) to maintain socket state
      name: 'bhookingo-socket',
      script: './socket-server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env: {
        NODE_ENV: 'production'
      },
    },
    {
      // 3. Background Schedulers
      // Chron jobs and polling
      name: 'bhookingo-scheduler',
      script: './scheduler-server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env: {
        NODE_ENV: 'production'
      },
    },
    {
      // 4. BullMQ Workers
      name: 'worker-otp',
      script: './src/queues/workers/otp.worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'worker-notification',
      script: './src/queues/workers/notification.worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'worker-order',
      script: './src/queues/workers/order.worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'worker-tracking',
      script: './src/queues/workers/tracking.worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'worker-payment',
      script: './src/queues/workers/payment.worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env: { NODE_ENV: 'production' },
    }
  ]
};
