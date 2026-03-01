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
        <div class="col-12 col-md-2">
          <label class="form-label">Canal (opcional)</label>
          <input
            v-model="credentialsForm.channel"
            class="form-control bg-dark text-white border-light-subtle"
            type="text"
            placeholder="si vacío = username"
          />
        </div>
        <div class="col-12 col-md-1 d-grid">
          <button class="btn btn-primary" type="submit">Generar</button>
        </div>
      </form>

      <p class="small text-info mt-2 mb-0" v-if="hasAuthInUrl">
        Se ha detectado <code>?auth=...</code> en la URL actual. No necesitas rellenar nada más para usar el overlay.
      </p>
    </div>
  </section>
</template>

<script>
const { computed, ref, watch } = Vue;
const buildUrlCredentialsPayload = window.__twitchbot_buildUrlCredentialsPayload;
const useOverlayAuth = window.__twitchbot_useOverlayAuth;

export default {
  name: 'CredentialsGenerator',
  setup() {
    const overlayAuth = useOverlayAuth();

    const credentialsForm = ref({
      username: '',
      accessToken: '',
      clientId: '',
      channel: ''
    });

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
          clientId: credentialsForm.value.clientId,
          channel: credentialsForm.value.channel
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
      generateCredentialUrl
    };
  }
};
</script>
