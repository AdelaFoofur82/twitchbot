<template>
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
</template>

<script>
export default {
  name: 'BotStatusCard',
  setup() {
    const { computed, inject } = Vue;
    const globalServices = inject('globalServices', {});
    const useTwitchBot = globalServices.useTwitchBot;
    const { state } = useTwitchBot();

    const statusClass = computed(() => {
      if (state.connectionStatus === 'connected') {
        return 'text-success';
      }

      if (state.connectionStatus === 'connecting') {
        return 'text-warning';
      }

      return 'text-danger';
    });

    return {
      state,
      statusClass
    };
  }
};
</script>
