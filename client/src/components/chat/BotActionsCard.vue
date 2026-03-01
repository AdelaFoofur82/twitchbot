<template>
  <section class="card bg-dark border-light-subtle text-white mb-4">
    <div class="card-body text-white">
      <h2 class="h5">Acciones</h2>
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
      <p class="text-white small mt-3 mb-0">
        Pasa credenciales por URL como <code>?auth=PAYLOAD_CIFRADO</code>
      </p>
    </div>
  </section>
</template>

<script>
const useTwitchBot = window.__twitchbot_useTwitchBot;
const getAuthHashFromUrl = window.__twitchbot_getAuthHashFromUrl;
const decryptCredentialsFromUrlPayload = window.__twitchbot_decryptCredentialsFromUrlPayload;

export default {
  name: 'BotActionsCard',
  setup() {
    const { ref } = Vue;
    const { state, connect, disconnect } = useTwitchBot();
    const isLoading = ref(false);

    const startBot = async () => {
      isLoading.value = true;

      try {
        const authHash = getAuthHashFromUrl();
        const credentials = await decryptCredentialsFromUrlPayload({ authHash });
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

    return {
      isLoading,
      startBot,
      state,
      stopBot
    };
  }
};
</script>
