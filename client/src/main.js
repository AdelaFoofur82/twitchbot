import { createLayerApp } from './app.js';
import { useTwitchBot } from './composables/useTwitchBot.js';
import { useOverlayAuth } from './composables/useOverlayAuth.js';
import {
	buildUrlCredentialsPayload,
	decryptCredentialsFromUrlPayload,
	getAuthHashFromUrl
} from './services/credentials.js';

const { loadModule } = window['vue3-sfc-loader'];

const sfcOptions = {
	moduleCache: {
		vue: Vue
	},
	async getFile(url) {
		const response = await fetch(url, { cache: 'no-store' });

		if (!response.ok) {
			throw new Error(`[main] No se pudo cargar SFC: ${url}`);
		}

		return response.text();
	},
	addStyle(textContent) {
		const style = document.createElement('style');
		style.textContent = textContent;
		document.head.appendChild(style);
	}
};

window.__twitchbot_useTwitchBot = useTwitchBot;
window.__twitchbot_useOverlayAuth = useOverlayAuth;
window.__twitchbot_buildUrlCredentialsPayload = buildUrlCredentialsPayload;
window.__twitchbot_decryptCredentialsFromUrlPayload = decryptCredentialsFromUrlPayload;
window.__twitchbot_getAuthHashFromUrl = getAuthHashFromUrl;

function hideAppLoading() {
	const loadingNode = document.getElementById('app-loading');

	if (loadingNode) {
		loadingNode.remove();
	}
}

async function bootstrapMainApp() {
	try {
		const [
			loadedIndexPage,
			loadedCredentialsGenerator,
			loadedOverlaysSection,
			loadedChatConfiguration,
			loadedChatDashboard,
			loadedBotStatusCard,
			loadedBotActionsCard,
			loadedEventsOverview
		] = await Promise.all([
			loadModule('./src/components/dashboard/Index.vue', sfcOptions),
			loadModule('./src/components/dashboard/CredentialsGenerator.vue', sfcOptions),
			loadModule('./src/components/dashboard/OverlaysSection.vue', sfcOptions),
			loadModule('./src/components/overlays/chat/ChatConfiguration.vue', sfcOptions),
			loadModule('./src/components/chat/ChatDashboard.vue', sfcOptions),
			loadModule('./src/components/chat/BotStatusCard.vue', sfcOptions),
			loadModule('./src/components/chat/BotActionsCard.vue', sfcOptions),
			loadModule('./src/components/chat/EventsOverview.vue', sfcOptions)
		]);

		const credentialsGeneratorComponent =
			loadedCredentialsGenerator && loadedCredentialsGenerator.default
				? loadedCredentialsGenerator.default
				: loadedCredentialsGenerator;
		const rootComponent = loadedIndexPage && loadedIndexPage.default ? loadedIndexPage.default : loadedIndexPage;
		const overlaysSectionComponent =
			loadedOverlaysSection && loadedOverlaysSection.default ? loadedOverlaysSection.default : loadedOverlaysSection;
		const chatConfigurationComponent =
			loadedChatConfiguration && loadedChatConfiguration.default
				? loadedChatConfiguration.default
				: loadedChatConfiguration;

		const chatDashboardComponent =
			loadedChatDashboard && loadedChatDashboard.default ? loadedChatDashboard.default : loadedChatDashboard;
		const botStatusCardComponent =
			loadedBotStatusCard && loadedBotStatusCard.default ? loadedBotStatusCard.default : loadedBotStatusCard;
		const botActionsCardComponent =
			loadedBotActionsCard && loadedBotActionsCard.default ? loadedBotActionsCard.default : loadedBotActionsCard;
		const eventsOverviewComponent =
			loadedEventsOverview && loadedEventsOverview.default ? loadedEventsOverview.default : loadedEventsOverview;

		createLayerApp({
			rootComponent,
			credentialsGeneratorComponent,
			overlaysSectionComponent,
			chatConfigurationComponent,
			chatDashboardComponent,
			botStatusCardComponent,
			botActionsCardComponent,
			eventsOverviewComponent
		});
		hideAppLoading();
	} catch (error) {
		console.error('[main] Error cargando componentes SFC', error);
		createLayerApp();
		hideAppLoading();
	}
}

bootstrapMainApp();
