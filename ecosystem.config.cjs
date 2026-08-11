// ecosystem.config.cjs — Configuração PM2 para Kixi IA no VPS Hostinger
// PM2 mantém o bot a correr 24/7 e reinicia automaticamente em caso de crash

module.exports = {
  apps: [
    {
      name: 'kixi-ia',
      script: 'index.js',
      interpreter: 'node',
      // Node.js tem 4 GB disponíveis na VPS — sem limitações artificiais
      interpreter_args: '--experimental-vm-modules',
      instances: 1,          // 1 única instância — 1 número WhatsApp
      autorestart: true,     // reinicia automaticamente em caso de crash
      watch: false,          // não monitorizar ficheiros em produção
      max_memory_restart: '1500M', // reinicia se passar 1.5 GB (proteção de segurança)
      restart_delay: 5000,   // aguarda 5 segundos antes de reiniciar
      max_restarts: 10,      // máximo 10 reinícios automáticos em 15 minutos
      min_uptime: '30s',     // considera instável se morrer em menos de 30 segundos
      env: {
        NODE_ENV: 'production'
      },
      // Logs persistentes
      out_file: './logs/kixi-ia-out.log',
      error_file: './logs/kixi-ia-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
