import { createLayerApp } from './app.js';
import { useTwitchBot } from './composables/useTwitchBot.js';
import { useOverlayAuth } from './composables/useOverlayAuth.js';
import {
	buildUrlCredentialsPayload,
	decryptCredentialsFromUrlPayload,
	getChannelFromUrl,
	getAuthHashFromUrl
} from './services/credentials.js';

const { loadModule } = window['vue3-sfc-loader'];
const bootLog = typeof window.twitchbotLog === 'function' ? window.twitchbotLog : () => {};

const sfcOptions = {
	moduleCache: {
		vue: Vue
	},
	async getFile(url) {
		bootLog('main:getFile:start', { url });
		const response = await fetch(url, { cache: 'no-store' });

		if (!response.ok) {
			bootLog('main:getFile:error', { url, status: response.status });
			throw new Error(`[main] No se pudo cargar SFC: ${url}`);
		}

		bootLog('main:getFile:ok', { url, status: response.status });

		return response.text();
	},
	addStyle(textContent) {
		const style = document.createElement('style');
		style.textContent = textContent;
		document.head.appendChild(style);
	}
};

const globalServices = {
	useTwitchBot,
	useOverlayAuth,
	buildUrlCredentialsPayload,
	decryptCredentialsFromUrlPayload,
	getChannelFromUrl,
	getAuthHashFromUrl,
	bootLog
};
bootLog('main:globals-ready');

function hideAppLoading() {
	const loadingNode = document.getElementById('app-loading');

	if (loadingNode) {
		loadingNode.remove();
	}
}

function loadSfcWithLog(path) {
	bootLog('main:loadModule:start', { path });

	return loadModule(path, sfcOptions)
		.then((moduleValue) => {
			bootLog('main:loadModule:ok', { path });
			return moduleValue;
		})
		.catch((error) => {
			bootLog('main:loadModule:error', {
				path,
				error: error instanceof Error ? error.message : String(error)
			});
			throw error;
		});
}

async function bootstrapMainApp() {
	bootLog('main:bootstrap:start');
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
			loadSfcWithLog('./src/components/dashboard/Index.vue'),
			loadSfcWithLog('./src/components/dashboard/CredentialsGenerator.vue'),
			loadSfcWithLog('./src/components/dashboard/OverlaysSection.vue'),
			loadSfcWithLog('./src/components/overlays/chat/ChatConfiguration.vue'),
			loadSfcWithLog('./src/components/chat/ChatDashboard.vue'),
			loadSfcWithLog('./src/components/chat/BotStatusCard.vue'),
			loadSfcWithLog('./src/components/chat/BotActionsCard.vue'),
			loadSfcWithLog('./src/components/chat/EventsOverview.vue')
		]);

		bootLog('main:loadModule:all-ok');

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
			globalServices,
			credentialsGeneratorComponent,
			overlaysSectionComponent,
			chatConfigurationComponent,
			chatDashboardComponent,
			botStatusCardComponent,
			botActionsCardComponent,
			eventsOverviewComponent
		});
		bootLog('main:createLayerApp:ok');
		hideAppLoading();
		bootLog('main:bootstrap:done');
	} catch (error) {
		console.error('[main] Error cargando componentes SFC', error);
		bootLog('main:bootstrap:error', error);
		createLayerApp();
		hideAppLoading();
	}
}

bootstrapMainApp();
