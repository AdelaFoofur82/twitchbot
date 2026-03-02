<template>
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
          :disabled="botState.connectionStatus !== 'connected' || isSendingMessage"
        />
        <button
          class="btn btn-primary"
          type="submit"
          :disabled="botState.connectionStatus !== 'connected' || !chatInput.trim() || isSendingMessage"
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
</template>

<script>
export default {
  name: 'ChatDashboard',
  setup() {
    const { computed, inject, nextTick, ref } = Vue;
    const globalServices = inject('globalServices', {});
    const useTwitchBot = globalServices.useTwitchBot;
    const { state: botState, sendMessage } = useTwitchBot();

    const chatInput = ref('');
    const isSendingMessage = ref(false);
    const chatInputRef = ref(null);

    const recentChatMessages = computed(() => {
      return (Array.isArray(botState.events.chat) ? botState.events.chat.slice(0, 10) : []).reverse();
    });

    const submitChatMessage = async () => {
      if (!chatInput.value.trim()) {
        return;
      }

      isSendingMessage.value = true;

      try {
        await sendMessage(chatInput.value);
        chatInput.value = '';
      } catch (error) {
        botState.lastError = error instanceof Error ? error.message : 'No se pudo enviar el mensaje';
      } finally {
        isSendingMessage.value = false;
        await nextTick();
        if (chatInputRef.value) {
          chatInputRef.value.focus();
        }
      }
    };

    return {
      botState,
      chatInput,
      chatInputRef,
      isSendingMessage,
      recentChatMessages,
      submitChatMessage
    };
  }
};
</script>
