<template>
	<section>
		<section class="card bg-dark border-light-subtle text-white mb-4">
			<div class="card-body text-white">
				<h2 class="h5">Estado del bot</h2>
				<p class="mb-2">
					<span class="fw-semibold">Conexión: </span>
					<span :class="statusClass"> {{ state.connectionStatus }}</span>
				</p>
				<p class="mb-2">
					<span class="fw-semibold">Canal: </span>
					<span>{{ state.channel || '-' }}</span>
				</p>
				<p class="mb-0">
					<span class="fw-semibold">Último error: </span>
					<span>{{ state.lastError || '-' }}</span>
				</p>
			</div>
		</section>

		<section class="card bg-dark border-light-subtle text-white mb-4">
			<div class="card-body text-white">
				<h2 class="h5">Acciones</h2>
				<div class="row g-2 mb-3 align-items-end">
					<div class="col-12 col-md-6">
						<label class="form-label">Canal para conectar</label>
						<input
							v-model="connectChannel"
							class="form-control bg-dark text-white border-light-subtle"
							type="text"
							placeholder="si vacío = username"
						/>
					</div>
				</div>
				<div class="d-flex gap-2 flex-wrap">
					<button
						class="btn btn-success"
						@click="startBot"
						:disabled="state.connectionStatus === 'connected' || isLoading"
					>
						{{ isLoading ? 'Conectando...' : 'Conectar bot' }}
					</button>
					<button
						class="btn btn-outline-light"
						@click="stopBot"
						:disabled="state.connectionStatus !== 'connected'"
					>
						Desconectar
					</button>
				</div>
			</div>
		</section>

		<section class="card bg-dark border-light-subtle text-white mb-4">
			<div class="card-body text-white">
				<h2 class="h5">Chat de Twitch (bot)</h2>
				<form class="d-flex gap-2 mb-3" @submit.prevent="submitChatMessage">
					<input
						v-model="chatInput"
						ref="chatInputRef"
						class="form-control bg-dark text-white border-light-subtle"
						type="text"
						placeholder="Escribe un mensaje para el chat"
						:disabled="state.connectionStatus !== 'connected' || isSendingMessage"
					/>
					<button
						class="btn btn-primary"
						type="submit"
						:disabled="state.connectionStatus !== 'connected' || !chatInput.trim() || isSendingMessage"
					>
						{{ isSendingMessage ? 'Enviando...' : 'Enviar' }}
					</button>
				</form>

				<p class="small text-white mb-3">
					Anuncios: <code>/announce mensaje</code>, <code>/announce -[green|orange|blue|purple] mensaje</code>.
				</p>

				<div class="small text-white mb-2">Mensajes recientes</div>
				<ul class="list-group list-group-flush">
					<li v-for="event in recentChatMessages" :key="event.id" class="list-group-item bg-dark text-white px-0">
						<span class="badge me-2" :class="event.isSelf ? 'text-bg-primary' : 'text-bg-secondary'">
							{{ event.isSelf ? 'BOT' : 'CHAT' }}
						</span>
						<strong>{{ event.user }}: </strong>
						<span>{{ event.message }}</span>
					</li>
					<li v-if="!recentChatMessages.length" class="list-group-item bg-dark text-white px-0">
						Sin mensajes aún
					</li>
				</ul>
			</div>
		</section>

		<chat-commands-config></chat-commands-config>

		<section class="row g-3">
			<div class="col-12 col-lg-4">
				<div class="card h-100 bg-dark border-light-subtle text-white">
					<div class="card-body text-white">
						<h3 class="h6">Bits</h3>
						<ul class="list-group list-group-flush">
							<li v-for="event in state.events.bits" :key="event.id" class="list-group-item bg-dark text-white px-0">
								<strong>{{ event.user }}</strong> envió {{ event.amount }} bits
							</li>
							<li v-if="!state.events.bits.length" class="list-group-item bg-dark text-white px-0">
								Sin eventos aún
							</li>
						</ul>
					</div>
				</div>
			</div>

			<div class="col-12 col-lg-4">
				<div class="card h-100 bg-dark border-light-subtle text-white">
					<div class="card-body text-white">
						<h3 class="h6">Followers</h3>
						<ul class="list-group list-group-flush">
							<li v-for="event in state.events.followers" :key="event.id" class="list-group-item bg-dark text-white px-0">
								Nuevo follower: <strong>{{ event.user }}</strong>
							</li>
							<li v-if="!state.events.followers.length" class="list-group-item bg-dark text-white px-0">
								Sin eventos aún
							</li>
						</ul>
					</div>
				</div>
			</div>

			<div class="col-12 col-lg-4">
				<div class="card h-100 bg-dark border-light-subtle text-white">
					<div class="card-body text-white">
						<h3 class="h6">Subs</h3>
						<ul class="list-group list-group-flush">
							<li
								v-for="event in state.events.subscriptions"
								:key="event.id"
								class="list-group-item bg-dark text-white px-0"
							>
								{{ event.user }} se suscribió ({{ event.tier }})
							</li>
							<li v-if="!state.events.subscriptions.length" class="list-group-item bg-dark text-white px-0">
								Sin eventos aún
							</li>
						</ul>
					</div>
				</div>
			</div>
		</section>
	</section>
</template>

<script>
export default {
	name: 'ChatIndex',
	setup() {
		const { computed, inject, nextTick, onMounted, ref, watch } = Vue;
		const globalServices = inject('globalServices', {});
		const useTwitchBot = globalServices.useTwitchBot;
		const useOverlayAuth = globalServices.useOverlayAuth;
		const useConfig = globalServices.useConfig;
		const getChannelFromUrl = globalServices.getChannelFromUrl;

		const { state, connect, disconnect, sendMessage } = useTwitchBot();
		const overlayAuth = useOverlayAuth();
		const config = useConfig();
		const initialChannelFromConfig = String(config.getConfig('chat.channel', '') || '').trim();

		const isLoading = ref(false);
		const connectChannel = ref(initialChannelFromConfig);
		const chatInput = ref('');
		const isSendingMessage = ref(false);
		const chatInputRef = ref(null);

		const statusClass = computed(() => {
			if (state.connectionStatus === 'connected') {
				return 'text-success';
			}

			if (state.connectionStatus === 'connecting') {
				return 'text-warning';
			}

			return 'text-danger';
		});

		const recentChatMessages = computed(() => {
			return (Array.isArray(state.events.chat) ? state.events.chat.slice(0, 10) : []).reverse();
		});

		watch(
			connectChannel,
			(nextChannel) => {
				config.setConfig('chat.channel', String(nextChannel || '').trim());
			}
		);

		const startBot = async () => {
			isLoading.value = true;

			try {
				const credentials = await overlayAuth.getCredentials();

				if (!credentials) {
					throw new Error('No hay credenciales en ?auth para conectar.');
				}

				const selectedChannel = String(connectChannel.value || '').trim() || String(credentials?.bot?.username || '').trim();

				if (!selectedChannel) {
					throw new Error('Debes indicar un canal o disponer de username válido.');
				}

				credentials.bot.channel = selectedChannel;
				connectChannel.value = selectedChannel;
				config.setConfig('chat.channel', selectedChannel);

				await connect(credentials);
			} catch (error) {
				state.lastError = error instanceof Error ? error.message : 'Error desconocido';
				state.connectionStatus = 'error';
			} finally {
				isLoading.value = false;
			}
		};

		const stopBot = async () => {
			await disconnect();
		};

		const submitChatMessage = async () => {
			if (!chatInput.value.trim()) {
				return;
			}

			isSendingMessage.value = true;

			try {
				await sendMessage(chatInput.value);
				chatInput.value = '';
			} catch (error) {
				state.lastError = error instanceof Error ? error.message : 'No se pudo enviar el mensaje';
			} finally {
				isSendingMessage.value = false;
				await nextTick();
				if (chatInputRef.value) {
					chatInputRef.value.focus();
				}
			}
		};

		onMounted(async () => {
			if (connectChannel.value) {
				return;
			}

			const channelFromUrl = getChannelFromUrl ? getChannelFromUrl() : '';

			if (channelFromUrl) {
				connectChannel.value = channelFromUrl;
				return;
			}

			try {
				const username = await overlayAuth.getUsername();

				if (username) {
					connectChannel.value = username;
				}
			} catch (error) {
			}
		});

		return {
			chatInput,
			chatInputRef,
			connectChannel,
			isLoading,
			isSendingMessage,
			recentChatMessages,
			startBot,
			state,
			statusClass,
			stopBot,
			submitChatMessage
		};
	}
};
</script>
