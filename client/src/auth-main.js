const { createApp } = Vue;
const { loadModule } = window['vue3-sfc-loader'];
const bootLog = typeof window.twitchbotLog === 'function' ? window.twitchbotLog : () => {};

const sfcOptions = {
  moduleCache: {
    vue: Vue
  },
  async getFile(url) {
    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`[auth-main] No se pudo cargar SFC: ${url}`);
    }

    return response.text();
  },
  addStyle(textContent) {
    const style = document.createElement('style');
    style.textContent = textContent;
    document.head.appendChild(style);
  }
};

function hideAuthLoading() {
  const loadingNode = document.getElementById('auth-loading');

  if (loadingNode) {
    loadingNode.remove();
  }
}

function renderAuthBootstrapError(error) {
  const appNode = document.getElementById('auth-app');

  if (!appNode) {
    return;
  }

  const message = error instanceof Error ? error.message : String(error);

  appNode.innerHTML =
    '<main class="container py-4">' +
    '<section class="card bg-dark border-danger text-white mb-4">' +
    '<div class="card-body">' +
    '<h1 class="h5 mb-2">Error en auth callback</h1>' +
    '<pre class="mb-0 text-danger" style="white-space: pre-wrap;">' +
    message.replace(/[<>]/g, '') +
    '</pre>' +
    '</div>' +
    '</section>' +
    '</main>';
}

async function bootstrapAuthApp() {
  bootLog('auth-main:bootstrap:start');

  try {
    const loadedAuthCallback = await loadModule('./src/components/auth/AuthCallback.vue', sfcOptions);
    const rootComponent = loadedAuthCallback && loadedAuthCallback.default ? loadedAuthCallback.default : loadedAuthCallback;

    createApp(rootComponent || {}).mount('#auth-app');
    hideAuthLoading();

    bootLog('auth-main:bootstrap:done');
  } catch (error) {
    console.error('[auth-main] Error cargando AuthCallback.vue', error);
    bootLog('auth-main:bootstrap:error', error);
    renderAuthBootstrapError(error);
    hideAuthLoading();
  }
}

bootstrapAuthApp();
