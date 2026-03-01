<template>
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
</template>

<script>
export default {
  name: 'BotActionsCard',
  setup() {
    const { inject, onMounted, ref } = Vue;
    const globalServices = inject('globalServices', {});
    const useTwitchBot = globalServices.useTwitchBot;
    const useOverlayAuth = globalServices.useOverlayAuth;
    const getChannelFromUrl = globalServices.getChannelFromUrl;

    const { state, connect, disconnect } = useTwitchBot();
    const overlayAuth = useOverlayAuth();
    const isLoading = ref(false);
    const connectChannel = ref('');

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

    onMounted(async () => {
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
      connectChannel,
      isLoading,
      startBot,
      state,
      stopBot
    };
  }
};
</script>
