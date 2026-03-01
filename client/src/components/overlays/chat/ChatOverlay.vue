<template>
  <section class="chat-overlay-root">
    <div
      v-if="debugEnabled"
      style="position: fixed; top: 8px; left: 8px; z-index: 9999; background: rgba(0, 0, 0, 0.78); color: #fff; border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 6px; padding: 8px 10px; font-family: monospace; font-size: 12px; line-height: 1.35; max-width: min(80vw, 560px);"
    >
      <div><strong>DEBUG CHAT OVERLAY</strong></div>
      <div>status: {{ debugStatus }}</div>
      <div>eventos chat: {{ debugCount }}</div>
      <div>último mensaje: {{ lastChatAt || '-' }}</div>
      <div style="word-break: break-word;">error: {{ debugError }}</div>
    </div>
    <div class="chat-overlay-stack" :style="stackStyle">
      <div
        v-for="event in chatMessages"
        :key="event.id"
        class="chat-line"
        :style="getMessageStyle(event)"
      >
        <span class="chat-user" :style="{ color: event.color || '#8ec5ff' }">{{ event.user }}</span>
        <span class="chat-separator">:</span>
        <span class="chat-message">{{ event.message }}</span>
      </div>
    </div>
  </section>
</template>

<script>
const url = new URL(window.location.href);
const maxLinesParam = Number.parseInt(String(url.searchParams.get('chat_max') || '').trim(), 10);
const fontSizeParam = Number.parseInt(String(url.searchParams.get('chat_size') || '').trim(), 10);
const alignParam = String(url.searchParams.get('chat_align') || 'left').trim().toLowerCase();
const fadeMsParam = Number.parseInt(String(url.searchParams.get('chat_fade_ms') || '').trim(), 10);
const debugParam = String(url.searchParams.get('debug') || '').trim().toLowerCase();

const maxLines = Number.isFinite(maxLinesParam) && maxLinesParam > 0 ? maxLinesParam : 8;
const fontSize = Number.isFinite(fontSizeParam) && fontSizeParam > 0 ? fontSizeParam : 30;
const align = ['left', 'center', 'right'].includes(alignParam) ? alignParam : 'left';
const fadeStartMs = Number.isFinite(fadeMsParam) && fadeMsParam >= 0 ? fadeMsParam : 0;
const fadeDurationMs = 500;
const debugEnabled = ['1', 'true', 'yes', 'on'].includes(debugParam);

const justifyByAlign = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end'
};

export default {
  name: 'ChatOverlay',
  mounted() {
    if (debugEnabled) {
      console.log('[chat-overlay] componente montado en DOM');
    }
  },
  setup() {
    const { computed, inject, onBeforeUnmount, onMounted, ref, watch } = Vue;
    const globalServices = inject('globalServices', {});
    const useTwitchBot = globalServices.useTwitchBot;
    const { state } = useTwitchBot();
    const nowMs = ref(Date.now());
    let fadeTimerId = null;

    if (debugEnabled) {
      console.log('[chat-overlay] parámetros render', {
        maxLines,
        fontSize,
        align,
        fadeStartMs,
        fadeDurationMs,
        href: window.location.href
      });
    }

    const chatMessages = computed(() => {
      return [...state.events.chat].slice(0, maxLines).reverse();
    });

    const stackStyle = computed(() => ({
      alignItems: justifyByAlign[align]
    }));

    const lineStyle = computed(() => ({
      fontSize: `${fontSize}px`,
      textAlign: align,
      width: '100%'
    }));

    const getMessageOpacity = (event) => {
      if (fadeStartMs <= 0) {
        return 1;
      }

      const createdAtMs = new Date(event.createdAt).getTime();

      if (!Number.isFinite(createdAtMs)) {
        return 1;
      }

      const elapsed = Math.max(0, nowMs.value - createdAtMs);

      if (elapsed <= fadeStartMs) {
        return 1;
      }

      const fadeElapsed = elapsed - fadeStartMs;
      const ratio = Math.min(1, fadeElapsed / fadeDurationMs);
      return Math.max(0, 1 - ratio);
    };

    const getMessageStyle = (event) => {
      const opacity = getMessageOpacity(event);

      return {
        ...lineStyle.value,
        opacity,
        transition: 'opacity 120ms linear'
      };
    };

    const debugStatus = computed(() => state.connectionStatus || 'idle');
    const debugError = computed(() => state.lastError || '-');
    const debugCount = computed(() => state.events.chat.length);

    const lastChatAt = computed(() => {
      if (!state.events.chat[0] || !state.events.chat[0].createdAt) {
        return '';
      }

      return new Date(state.events.chat[0].createdAt).toLocaleTimeString();
    });

    watch(
      () => state.events.chat.length,
      () => {
        const latest = state.events.chat[0];

        if (!latest) {
          return;
        }

        if (debugEnabled) {
          console.log('[chat-overlay] render actualizado', {
            user: latest.user,
            message: latest.message,
            isSelf: latest.isSelf,
            source: latest.source || 'tmi',
            total: state.events.chat.length
          });
        }
      }
    );

    onMounted(() => {
      fadeTimerId = window.setInterval(() => {
        nowMs.value = Date.now();
      }, 120);
    });

    onBeforeUnmount(() => {
      if (fadeTimerId) {
        window.clearInterval(fadeTimerId);
        fadeTimerId = null;
      }
    });

    return {
      chatMessages,
      debugCount,
      debugEnabled,
      debugError,
      debugStatus,
      getMessageStyle,
      lastChatAt,
      lineStyle,
      stackStyle
    };
  }
};
</script>
