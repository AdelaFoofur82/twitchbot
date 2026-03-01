<template>
  <section class="card bg-dark border-light-subtle text-white mb-4">
    <div class="card-body text-white">
      <h2 class="h5">Generador de enlace overlay</h2>
      <p class="mb-3">
        Introduce credenciales para generar URL cifrada directamente en cliente.
      </p>

      <form class="row g-2 align-items-end" @submit.prevent="generateCredentialUrl()">
        <div class="col-12 col-md-3">
          <label class="form-label">Username</label>
          <input
            v-model="credentialsForm.username"
            class="form-control bg-dark text-white border-light-subtle"
            type="text"
            placeholder="miBot"
            required
          />
        </div>
        <div class="col-12 col-md-4">
          <label class="form-label">Access Token</label>
          <input
            v-model="credentialsForm.accessToken"
            class="form-control bg-dark text-white border-light-subtle"
            type="text"
            placeholder="token (sin oauth:)"
            required
          />
        </div>
        <div class="col-12 col-md-2">
          <label class="form-label">ClientId</label>
          <input
            v-model="credentialsForm.clientId"
            class="form-control bg-dark text-white border-light-subtle"
            type="text"
            placeholder="abc123"
            required
          />
        </div>
        <div class="col-12 col-md-1 d-grid">
          <button class="btn btn-primary" type="submit">Generar</button>
        </div>
      </form>

      <p class="small text-info mt-2 mb-0" v-if="hasAuthInUrl">
        Se ha detectado <code>?auth=...</code> en la URL actual. No necesitas rellenar nada ni hacer login para usar el overlay.
      </p>

      <div class="d-flex gap-2 mt-3 flex-wrap">
        <button class="btn btn-outline-info btn-sm" type="button" @click="startTwitchLogin">
          Login con Twitch
        </button>
        <div class="small text-white-50 d-flex align-items-center flex-wrap gap-1">
          <span>Para que funcione el login asegúrate que la aplicación de Twitch tiene <code class="user-select-all">{{ oauthRedirectUrl }}</code> como una de sus OAuth Redirect URLs.</span>
        </div>
      </div>      
    </div>
  </section>
</template>

<script>
const { computed, onBeforeUnmount, onMounted, ref, watch } = Vue;

const oauthScopes = [
  'moderator:manage:announcements',
  'channel:read:subscriptions',
  'chat:edit',
  'chat:read'
];

function toBase64Url(text) {
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(base64UrlText) {
  const normalized = String(base64UrlText || '').replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  return atob(normalized + '='.repeat(padding));
}

function decodeOauthState(stateText) {
  const rawState = String(stateText || '').trim();

  if (!rawState) {
    return null;
  }

  try {
    return JSON.parse(fromBase64Url(rawState));
  } catch (error) {
    return null;
  }
}

async function fetchTwitchLoginFromToken({ clientId, accessToken }) {
  const normalizedClientId = String(clientId || '').trim();
  const normalizedToken = String(accessToken || '').trim().replace(/^oauth:/i, '');

  if (!normalizedClientId || !normalizedToken) {
    return '';
  }

  const response = await fetch('https://api.twitch.tv/helix/users', {
    method: 'GET',
    headers: {
      'Client-Id': normalizedClientId,
      Authorization: `Bearer ${normalizedToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`No se pudo resolver username desde token (${response.status})`);
  }

  const payload = await response.json();
  const login = String(payload?.data?.[0]?.login || '').trim();

  return login;
}

export default {
  name: 'CredentialsGenerator',
  setup() {
    const { inject } = Vue;
    const globalServices = inject('globalServices', {});
    const buildUrlCredentialsPayload = globalServices.buildUrlCredentialsPayload;
    const useOverlayAuth = globalServices.useOverlayAuth;
    const bootLog = typeof globalServices.bootLog === 'function' ? globalServices.bootLog : () => {};

    const overlayAuth = useOverlayAuth();
    const authChannelRef = ref(null);
    const pendingStateRef = ref('');

    const credentialsForm = ref({
      username: '',
      accessToken: '',
      clientId: ''
    });

    const oauthRedirectUrl = ref(new URL('auth.html', window.location.href).toString());

    const hasRequiredFields = computed(() => {
      return Boolean(
        String(credentialsForm.value.username || '').trim() &&
          String(credentialsForm.value.accessToken || '').trim() &&
          String(credentialsForm.value.clientId || '').trim()
      );
    });

    async function generateCredentialUrl({ updateBrowserUrl = true } = {}) {
      try {
        const payload = await buildUrlCredentialsPayload({
          username: credentialsForm.value.username,
          accessToken: credentialsForm.value.accessToken,
          clientId: credentialsForm.value.clientId
        });

        overlayAuth.setAuthPayload({
          nextAuthHash: payload.authHash,
          nextEncodedPayload: payload.encodedPayload,
          updateBrowserUrl
        });
      } catch (error) {
        console.error('[dashboard] No se pudo generar URL cifrada', error);
      }
    }

    async function applyOauthResult(payload) {
      if (!payload || payload.type !== 'twitchbot:oauth-result') {
        return;
      }

      if (!payload.ok) {
        bootLog('oauth:result:error', payload);
        return;
      }

      if (!payload.accessToken) {
        bootLog('oauth:result:missing-token', payload);
        return;
      }

      if (payload.state) {
        const expectedState = String(pendingStateRef.value || '').trim();

        if (expectedState && payload.state !== expectedState) {
          bootLog('oauth:result:state-mismatch', {
            expectedState,
            receivedState: payload.state
          });
          return;
        }
      }

      const stateData = payload.stateData || decodeOauthState(payload.state);

      if (payload.clientId) {
        credentialsForm.value.clientId = String(payload.clientId).trim();
      } else if (stateData && stateData.clientId) {
        credentialsForm.value.clientId = String(stateData.clientId).trim();
      }

      if (payload.username) {
        credentialsForm.value.username = String(payload.username).trim();
      } else if (stateData && stateData.username) {
        credentialsForm.value.username = String(stateData.username).trim();
      }

      credentialsForm.value.accessToken = String(payload.accessToken).trim();

      const currentUsername = String(credentialsForm.value.username || '').trim();
      if (!currentUsername) {
        try {
          const fetchedUsername = await fetchTwitchLoginFromToken({
            clientId: credentialsForm.value.clientId,
            accessToken: credentialsForm.value.accessToken
          });

          if (fetchedUsername) {
            credentialsForm.value.username = fetchedUsername;
          }
        } catch (error) {
          bootLog('oauth:username:fetch-error', error);
        }
      }

      bootLog('oauth:result:applied', {
        clientId: credentialsForm.value.clientId,
        username: credentialsForm.value.username,
        hasToken: Boolean(credentialsForm.value.accessToken)
      });

      await generateCredentialUrl({ updateBrowserUrl: true });
    }

    function onOauthMessage(event) {
      if (!event || !event.data) {
        return;
      }

      if (event.origin && event.origin !== window.location.origin) {
        return;
      }

      applyOauthResult(event.data);
    }

    function onStorageEvent(event) {
      if (!event || event.key !== 'twitchbot-auth-result' || !event.newValue) {
        return;
      }

      try {
        const payload = JSON.parse(event.newValue);
        applyOauthResult(payload);
      } catch (error) {
        bootLog('oauth:storage:parse-error', error);
      }
    }

    function startTwitchLogin() {
      const clientId = String(credentialsForm.value.clientId || '').trim();

      if (!clientId) {
        window.alert('Necesitas indicar ClientId antes de hacer login con Twitch.');
        return;
      }

      const statePayload = {
        nonce: crypto.randomUUID(),
        clientId,
        username: String(credentialsForm.value.username || '').trim(),
        createdAt: Date.now()
      };

      const state = toBase64Url(JSON.stringify(statePayload));
      pendingStateRef.value = state;

      const redirectUri = new URL('auth.html', window.location.href);
      const authUrl = new URL('https://id.twitch.tv/oauth2/authorize');
      authUrl.searchParams.set('response_type', 'token');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri.toString());
      authUrl.searchParams.set('scope', oauthScopes.join(' '));
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('force_verify', 'true');

      bootLog('oauth:start', {
        redirectUri: redirectUri.toString(),
        clientId,
        scopes: oauthScopes
      });

      const popup = window.open(
        authUrl.toString(),
        'twitchbot-oauth',
        'popup=yes,width=560,height=760,menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes'
      );

      if (!popup) {
        window.location.href = authUrl.toString();
      }
    }

    onMounted(() => {
      window.addEventListener('message', onOauthMessage);
      window.addEventListener('storage', onStorageEvent);

      if (typeof BroadcastChannel === 'function') {
        const channel = new BroadcastChannel('twitchbot-auth');
        channel.onmessage = (event) => {
          applyOauthResult(event.data);
        };
        authChannelRef.value = channel;
      }

      try {
        const stored = localStorage.getItem('twitchbot-auth-result');

        if (stored) {
          applyOauthResult(JSON.parse(stored));
          localStorage.removeItem('twitchbot-auth-result');
        }
      } catch (error) {
        bootLog('oauth:storage:initial-read-error', error);
      }
    });

    onBeforeUnmount(() => {
      window.removeEventListener('message', onOauthMessage);
      window.removeEventListener('storage', onStorageEvent);

      if (authChannelRef.value) {
        authChannelRef.value.close();
        authChannelRef.value = null;
      }
    });

    watch(
      credentialsForm,
      async () => {
        if (overlayAuth.hasAuthInUrl.value) {
          return;
        }

        if (!hasRequiredFields.value) {
          return;
        }

        await generateCredentialUrl({ updateBrowserUrl: false });
      },
      { deep: true }
    );

    return {
      credentialsForm,
      hasAuthInUrl: overlayAuth.hasAuthInUrl,
      generateCredentialUrl,
      oauthRedirectUrl,
      startTwitchLogin
    };
  }
};
</script>
