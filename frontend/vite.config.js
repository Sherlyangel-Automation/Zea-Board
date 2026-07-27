import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const allowedHosts = (env.VITE_ALLOWED_HOSTS || 'zeaboard.zeacrm.com')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);
  const apiProxyTarget = env.API_PROXY_TARGET || env.VITE_API_PROXY_TARGET || 'http://backend:5001';

  return {
    plugins: [react()],
    server: {
      host: env.HOST_IP || '0.0.0.0',
      port: Number(env.PORT || 5173),
      allowedHosts,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true
        },
        '/webhook': {
          target: apiProxyTarget,
          changeOrigin: true
        },
        '/webhooks': {
          target: apiProxyTarget,
          changeOrigin: true
        }
      }
    },
    preview: {
      host: env.HOST_IP || '0.0.0.0',
      port: Number(env.PORT || 5173),
      allowedHosts,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true
        },
        '/webhook': {
          target: apiProxyTarget,
          changeOrigin: true
        },
        '/webhooks': {
          target: apiProxyTarget,
          changeOrigin: true
        }
      }
    }
  };
});
