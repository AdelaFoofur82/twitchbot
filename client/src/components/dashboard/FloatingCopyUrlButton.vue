<template>
  <button
    type="button"
    class="btn btn-primary btn-sm floating-copy-btn"
    :class="{ 'floating-copy-btn--pulse': isPulsing }"
    @click="handleCopyCurrentUrl"
  >
    COPIAR URL
  </button>
</template>

<script>
const { inject, onBeforeUnmount, ref, watch } = Vue;

export default {
  name: 'FloatingCopyUrlButton',
  setup() {
    const globalServices = inject('globalServices', {});
    const useConfig = globalServices.useConfig;
    const config = useConfig ? useConfig() : null;
    const isPulsing = ref(false);
    let pulseTimer = null;

    function triggerPulse() {
      isPulsing.value = false;

      requestAnimationFrame(() => {
        isPulsing.value = true;
      });

      if (pulseTimer) {
        clearTimeout(pulseTimer);
      }

      pulseTimer = window.setTimeout(() => {
        isPulsing.value = false;
      }, 1300);
    }

    watch(
      () => (config ? config.configVersion.value : 0),
      (nextVersion, previousVersion) => {
        if (nextVersion > previousVersion) {
          triggerPulse();
        }
      }
    );

    onBeforeUnmount(() => {
      if (pulseTimer) {
        clearTimeout(pulseTimer);
      }
    });

    async function handleCopyCurrentUrl() {
      try {
        await navigator.clipboard.writeText(window.location.href);
        window.alert('URL copiada. Pulsa Ctrl+D (o Cmd+D) si quieres guardarla en marcadores.');
      } catch (error) {
      }
    }

    return {
      handleCopyCurrentUrl,
      isPulsing
    };
  }
};
</script>

<style scoped>
.floating-copy-btn {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 1050;
  transform: translateY(0);
  will-change: transform;
}

.floating-copy-btn--pulse {
  animation: floatingCopyPulse 1.2s ease-in-out;
}

@keyframes floatingCopyPulse {
  0% {
    transform: translateY(0) scale(1);
    box-shadow: 0 0 0 0 rgba(13, 110, 253, 0.35);
  }

  20% {
    transform: translateY(-8px) scale(1.03);
  }

  40% {
    transform: translateY(0) scale(1);
  }

  60% {
    transform: translateY(-5px) scale(1.02);
  }

  100% {
    transform: translateY(0) scale(1);
    box-shadow: 0 0 0 0 rgba(13, 110, 253, 0);
  }
}
</style>
