import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
function emulatorConfig(): Plugin {
  return { name: 'emulator-fixture-config', apply: 'serve', configureServer(server) {
    if (process.env.SM_EMULATOR !== '1') return;
    server.middlewares.use((request, response, next) => {
      if (request.url !== '/manager-config.json') return next();
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ projectId:'demo-satsunicmanager',apiKey:'fixture-only',authDomain:'demo-satsunicmanager.firebaseapp.com',appId:'fixture-only',oauthClientId:'fixture-only',region:'us-central1',appCheckSiteKey:'fixture-only',emulator:true }));
    });
  } };
}
export default defineConfig({ plugins: [react(), tailwind(), emulatorConfig()], build: { sourcemap:false }, server:{ port:25173, strictPort:true } });
