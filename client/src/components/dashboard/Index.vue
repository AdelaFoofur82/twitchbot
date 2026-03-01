<template>
  <main class="container py-4">
    <header class="mb-4 text-white d-flex justify-content-between align-items-center gap-2 flex-wrap">
      <h1 class="h3 mb-1">Twitch BOT</h1>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-outline-primary btn-sm" type="button" @click="handleCopyCurrentUrl">Copiar URL actual</button>
        <a
          class="btn btn-outline-secondary btn-sm"
          href="https://github.com/AdelaFoofur82/twitchbot"
          target="_blank"
          rel="noopener noreferrer"
        >
          Código en GitHub
        </a>
      </div>
    </header>

    <credentials-generator></credentials-generator>

    <overlays-section></overlays-section>

    <bot-status-card></bot-status-card>

    <bot-actions-card></bot-actions-card>

    <chat-dashboard></chat-dashboard>

    <test-alerts-panel></test-alerts-panel>

    <events-overview></events-overview>
  </main>
</template>

<script>
export default {
  name: 'IndexPage',
  setup() {
    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        return false;
      }
    }

    async function handleCopyCurrentUrl() {
      const targetUrl = window.location.href;
      const copied = await copyText(targetUrl);

      if (copied) {
            window.alert('URL copiada. Pulsa Ctrl+D (o Cmd+D) si quieres guardarla en marcadores.');
      }
    }

    return {
      handleCopyCurrentUrl
    };
  }
};
</script>
