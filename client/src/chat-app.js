import {
  decryptCredentialsFromUrlPayload,
  getAuthHashFromUrl
} from './services/credentials.js';
import { useTwitchBot } from './composables/useTwitchBot.js';

export function createChatOverlayApp(chatOverlayComponent) {
  const { createApp } = Vue;
  const debugParam = String(new URL(window.location.href).searchParams.get('debug') || '').trim().toLowerCase();
  const isDebugEnabled = ['1', 'true', 'yes', 'on'].includes(debugParam);

  const debugLog = (message, extra) => {
    if (!isDebugEnabled) {
      return;
    }

    if (extra === undefined) {
      console.log(message);
      return;
    }

    console.log(message, extra);
  };

  const app = createApp({
    setup() {
      const { state: botState, connect } = useTwitchBot();

      const startBot = async () => {
        try {
          const authParam = new URL(window.location.href).searchParams.get('auth');
          debugLog('[chat-overlay] URL cargada', {
            href: window.location.href,
            hasAuthParam: Boolean(authParam),
            authLength: authParam ? String(authParam).length : 0
          });

          const authHash = getAuthHashFromUrl();
          debugLog('[chat-overlay] authHash resuelto', { authHash });
          const credentials = await decryptCredentialsFromUrlPayload({ authHash });
          debugLog('[chat-overlay] credenciales descifradas desde ?auth');

          await connect(credentials);
          debugLog('[chat-overlay] conexión bot solicitada correctamente');
        } catch (error) {
          botState.lastError = error instanceof Error ? error.message : 'No se pudo conectar el bot';
          console.error('Error conectando chat overlay:', error);
        }
      };

      startBot();

      return {
        botState
      };
    }
  });

  const normalizedComponent =
    chatOverlayComponent && chatOverlayComponent.default ? chatOverlayComponent.default : chatOverlayComponent;

  app.component('chat-overlay', normalizedComponent);
  app.mount('#app');
}
