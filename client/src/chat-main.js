import { createChatOverlayApp } from './chat-app.js';
import { useTwitchBot } from './composables/useTwitchBot.js';

const { loadModule } = window['vue3-sfc-loader'];
const debugParam = String(new URL(window.location.href).searchParams.get('debug') || '').trim().toLowerCase();
const isDebugEnabled = ['1', 'true', 'yes', 'on'].includes(debugParam);

const sfcOptions = {
	moduleCache: {
		vue: Vue
	},
	async getFile(url) {
		const response = await fetch(url, { cache: 'no-store' });

		if (!response.ok) {
			throw new Error(`[chat-main] No se pudo cargar SFC: ${url}`);
		}

		return response.text();
	},
	addStyle(textContent) {
		const style = document.createElement('style');
		style.textContent = textContent;
		document.head.appendChild(style);
	}
};
async function bootstrapChatOverlay() {
	try {
		const loadedModule = await loadModule('./src/components/overlays/chat/ChatOverlay.vue', sfcOptions);
		const chatOverlayComponent = loadedModule && loadedModule.default ? loadedModule.default : loadedModule;

		if (isDebugEnabled) {
			console.log('[chat-main] ChatOverlay.vue cargado', {
				type: typeof chatOverlayComponent,
				hasName: Boolean(chatOverlayComponent && chatOverlayComponent.name)
			});
		}

		createChatOverlayApp(chatOverlayComponent, { useTwitchBot });
	} catch (error) {
		console.error('[chat-main] Error cargando ChatOverlay.vue', error);
	}
}

bootstrapChatOverlay();
