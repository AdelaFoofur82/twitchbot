<template>
  <div class="card bg-dark border-light-subtle text-white mb-0">
    <div class="card-body text-white">
      <h3 class="h6">Chat overlay (OBS)</h3>

      <div class="row g-2 mb-3 align-items-end">
        <div class="col-12 col-md-3">
          <label class="form-label">Máx. líneas</label>
          <input v-model="chatOverlayConfig.maxLines" class="form-control bg-dark text-white border-light-subtle" type="number" min="1" max="60" />
          <div class="form-text text-white-50">&nbsp;</div>
        </div>
        <div class="col-12 col-md-3">
          <label class="form-label">Tamaño fuente (px)</label>
          <input v-model="chatOverlayConfig.fontSize" class="form-control bg-dark text-white border-light-subtle" type="number" min="10" max="120" />
          <div class="form-text text-white-50">&nbsp;</div>
        </div>
        <div class="col-12 col-md-3">
          <label class="form-label">Alineación</label>
          <select v-model="chatOverlayConfig.align" class="form-select bg-dark text-white border-light-subtle">
            <option value="left">Izquierda</option>
            <option value="center">Centro</option>
            <option value="right">Derecha</option>
          </select>
          <div class="form-text text-white-50">&nbsp;</div>
        </div>
        <div class="col-12 col-md-3">
          <label class="form-label">Inicio desvanecimiento (ms)</label>
          <input v-model="chatOverlayConfig.fadeMs" class="form-control bg-dark text-white border-light-subtle" type="number" min="0" step="100" />
          <div class="form-text text-white-50">0 = sin desvanecimiento</div>
        </div>
        <div class="col-12 col-md-6">
          <label class="form-label">Canal</label>
          <input v-model="chatOverlayConfig.channel" class="form-control bg-dark text-white border-light-subtle" type="text" placeholder="si vacío usa username" />
          <div class="form-text text-white-50">Se pasa sin cifrar en la URL como <code>channel</code>.</div>
        </div>
      </div>

      <div class="small mb-1"><strong>URL</strong></div>
      <textarea class="form-control bg-dark text-white border-light-subtle mb-2" rows="3" readonly :value="displayChatOverlayUrl"></textarea>
      <div class="d-flex align-items-center gap-3 flex-wrap">
        <button class="btn btn-outline-primary btn-sm" @click="copyChatOverlayUrl" :disabled="!chatOverlayUrl">Copiar URL chat overlay</button>
        <div class="form-check mb-0">
          <input v-model="copyOptions.chatDebug" class="form-check-input" type="checkbox" id="copyChatDebug" />
          <label class="form-check-label" for="copyChatDebug">Versión debug</label>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const { computed, onMounted, ref, watch } = Vue;

function normalizeAlign(value) {
  const align = String(value || '').trim().toLowerCase();
  return ['left', 'right', 'center'].includes(align) ? align : 'left';
}

function parseInitialChatConfig() {
  const url = new URL(window.location.href);

  return {
    maxLines: String(url.searchParams.get('chat_max') || '8').trim() || '8',
    fontSize: String(url.searchParams.get('chat_size') || '30').trim() || '30',
    align: normalizeAlign(url.searchParams.get('chat_align')),
    fadeMs: String(url.searchParams.get('chat_fade_ms') || '0').trim() || '0',
    channel: String(url.searchParams.get('channel') || '').trim()
  };
}

function buildInitialChatConfig(getConfig) {
  const legacyConfig = parseInitialChatConfig();

  return {
    maxLines: String(getConfig('chat.overlay.maxLines', legacyConfig.maxLines) || '8').trim() || '8',
    fontSize: String(getConfig('chat.overlay.fontSize', legacyConfig.fontSize) || '30').trim() || '30',
    align: normalizeAlign(getConfig('chat.overlay.align', legacyConfig.align)),
    fadeMs: String(getConfig('chat.overlay.fadeMs', legacyConfig.fadeMs) || '0').trim() || '0',
    channel: String(getConfig('chat.overlay.channel', legacyConfig.channel) || '').trim()
  };
}

export default {
  name: 'ChatConfiguration',
  setup() {
    const { inject } = Vue;
    const globalServices = inject('globalServices', {});
    const useOverlayAuth = globalServices.useOverlayAuth;
    const useConfig = globalServices.useConfig;

    const overlayAuth = useOverlayAuth();
    const config = useConfig();

    const chatOverlayConfig = ref(buildInitialChatConfig(config.getConfig));
    const usernameFromAuth = ref('');
    const copyOptions = ref({
      chatDebug: false
    });

    async function applyDefaultChannelFromUsername() {
      if (!overlayAuth.isReady.value) {
        return;
      }

      try {
        const username = await overlayAuth.getUsername();

        if (!username) {
          return;
        }

        usernameFromAuth.value = username;

        if (!String(chatOverlayConfig.value.channel || '').trim()) {
          chatOverlayConfig.value.channel = username;
        }
      } catch (error) {
      }
    }

    const chatQueryParams = computed(() => {
      const normalizedMaxLines = Number.parseInt(chatOverlayConfig.value.maxLines, 10);
      const normalizedFontSize = Number.parseInt(chatOverlayConfig.value.fontSize, 10);
      const normalizedFadeMs = Number.parseInt(chatOverlayConfig.value.fadeMs, 10);
      const resolvedChannel = String(chatOverlayConfig.value.channel || '').trim() || String(usernameFromAuth.value || '').trim();

      return {
        chat_max: Number.isFinite(normalizedMaxLines) && normalizedMaxLines > 0 ? String(normalizedMaxLines) : '8',
        chat_size: Number.isFinite(normalizedFontSize) && normalizedFontSize > 0 ? String(normalizedFontSize) : '30',
        chat_align: normalizeAlign(chatOverlayConfig.value.align),
        chat_fade_ms: Number.isFinite(normalizedFadeMs) && normalizedFadeMs >= 0 ? String(normalizedFadeMs) : '0',
        channel: resolvedChannel
      };
    });

    const chatOverlayUrl = computed(() => {
      if (!overlayAuth.isReady.value) {
        return '';
      }

      return overlayAuth.buildUrl({
        pagePath: 'chat.html',
        queryParams: chatQueryParams.value
      });
    });

    const displayChatOverlayUrl = computed(() => {
      return overlayAuth.withDebugParam(chatOverlayUrl.value, copyOptions.value.chatDebug);
    });

    async function copyChatOverlayUrl() {
      if (!chatOverlayUrl.value) {
        return;
      }

      try {
        await navigator.clipboard.writeText(displayChatOverlayUrl.value);
      } catch (error) {
        console.error('[dashboard] No se pudo copiar URL chat overlay', error);
      }
    }

    onMounted(() => {
      applyDefaultChannelFromUsername();
    });

    watch(
      chatOverlayConfig,
      (nextConfig) => {
        config.setConfig('chat.overlay.maxLines', String(nextConfig.maxLines || '').trim() || '8');
        config.setConfig('chat.overlay.fontSize', String(nextConfig.fontSize || '').trim() || '30');
        config.setConfig('chat.overlay.align', normalizeAlign(nextConfig.align));
        config.setConfig('chat.overlay.fadeMs', String(nextConfig.fadeMs || '').trim() || '0');
        config.setConfig('chat.overlay.channel', String(nextConfig.channel || '').trim());
      },
      { deep: true, immediate: true }
    );

    watch(
      () => overlayAuth.isReady.value,
      (isReady) => {
        if (isReady) {
          applyDefaultChannelFromUsername();
        }
      }
    );

    return {
      chatOverlayConfig,
      copyOptions,
      chatOverlayUrl,
      displayChatOverlayUrl,
      copyChatOverlayUrl
    };
  }
};
</script>
