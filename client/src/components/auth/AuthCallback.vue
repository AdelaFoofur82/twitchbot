<template>
  <main class="container py-4">
    <section class="card bg-dark border-light-subtle text-white mb-4">
      <div class="card-body text-white">
        <h1 class="h5 mb-2">Autenticación de Twitch</h1>
        <p class="mb-2">{{ statusText }}</p>
        <p class="small text-white-50 mb-3" v-if="detailText">{{ detailText }}</p>
        <button class="btn btn-outline-light btn-sm" type="button" @click="closeWindow">Cerrar ventana</button>
      </div>
    </section>
  </main>
</template>

<script>
const { onMounted, ref } = Vue;

function parseHashParams() {
  const raw = String(window.location.hash || '').replace(/^#/, '');
  const params = new URLSearchParams(raw);

  return {
    accessToken: String(params.get('access_token') || '').trim(),
    scope: String(params.get('scope') || '').trim(),
    tokenType: String(params.get('token_type') || '').trim(),
    state: String(params.get('state') || '').trim(),
    error: String(params.get('error') || '').trim(),
    errorDescription: String(params.get('error_description') || '').trim()
  };
}

function fromBase64Url(base64UrlText) {
  const normalized = String(base64UrlText || '').replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  return atob(normalized + '='.repeat(padding));
}

function decodeState(stateText) {
  const state = String(stateText || '').trim();

  if (!state) {
    return null;
  }

  try {
    return JSON.parse(fromBase64Url(state));
  } catch (error) {
    return null;
  }
}

function publishAuthResult(payload) {
  const hasOpener = Boolean(window.opener && !window.opener.closed);

  const message = {
    type: 'twitchbot:oauth-result',
    source: 'auth-callback',
    timestamp: Date.now(),
    hasOpener,
    ...payload
  };

  if (hasOpener) {
    try {
      window.opener.postMessage(message, window.location.origin);
    } catch (error) {
    }
  }

  if (typeof window.BroadcastChannel === 'function') {
    try {
      const channel = new BroadcastChannel('twitchbot-auth');
      channel.postMessage(message);
      channel.close();
    } catch (error) {
    }
  }

  try {
    localStorage.setItem('twitchbot-auth-result', JSON.stringify(message));
  } catch (error) {
  }

  return message;
}

export default {
  name: 'AuthCallback',
  setup() {
    const statusText = ref('Procesando respuesta de Twitch...');
    const detailText = ref('');

    function closeWindow() {
      window.close();
    }

    onMounted(() => {
      const payload = parseHashParams();
      const stateData = decodeState(payload.state);

      if (payload.error) {
        statusText.value = 'Twitch devolvió un error.';
        detailText.value = payload.errorDescription || payload.error;

        publishAuthResult({
          ok: false,
          error: payload.error,
          errorDescription: payload.errorDescription,
          state: payload.state,
          stateData
        });

        return;
      }

      if (!payload.accessToken) {
        statusText.value = 'No se recibió access_token.';
        detailText.value = 'Revisa redirect_uri, clientId y scopes del login OAuth.';

        publishAuthResult({
          ok: false,
          error: 'missing_access_token',
          state: payload.state,
          stateData
        });

        return;
      }

      publishAuthResult({
        ok: true,
        accessToken: payload.accessToken,
        tokenType: payload.tokenType,
        scope: payload.scope,
        state: payload.state,
        stateData,
        clientId: stateData && stateData.clientId ? String(stateData.clientId) : '',
        username: stateData && stateData.username ? String(stateData.username) : '',
        channel: stateData && stateData.channel ? String(stateData.channel) : ''
      });

      statusText.value = 'Token recibido y enviado a la pestaña principal.';
      detailText.value = 'Puedes cerrar esta ventana.';

      window.setTimeout(() => {
        if (window.opener && !window.opener.closed) {
          window.close();
          return;
        }

        const indexUrl = new URL('index.html', window.location.href);
        window.location.replace(indexUrl.toString());
      }, 1000);
    });

    return {
      statusText,
      detailText,
      closeWindow
    };
  }
};
</script>
