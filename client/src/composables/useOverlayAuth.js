import {
  buildOverlayUrlWithCredentials,
  decryptCredentialsFromUrlPayload,
  getAuthHashFromUrl
} from '../services/credentials.js';

const { computed, ref } = Vue;

const authHash = ref('');
const encodedPayload = ref('');
const hasAuthInUrl = ref(false);
const cachedCredentials = ref(null);
let initialized = false;

function clearAuth() {
  authHash.value = '';
  encodedPayload.value = '';
  hasAuthInUrl.value = false;
  cachedCredentials.value = null;
}

function withDebugParam(urlText, includeDebug) {
  if (!urlText) {
    return '';
  }

  const url = new URL(urlText);

  if (includeDebug) {
    url.searchParams.set('debug', '1');
  } else {
    url.searchParams.delete('debug');
  }

  return url.toString();
}

function setAuthPayload({ nextAuthHash, nextEncodedPayload, updateBrowserUrl = false }) {
  const normalizedHash = String(nextAuthHash || '').trim();
  const normalizedPayload = String(nextEncodedPayload || '').trim();

  if (!normalizedHash || !normalizedPayload) {
    clearAuth();
    return;
  }

  authHash.value = normalizedHash;
  encodedPayload.value = normalizedPayload;
  hasAuthInUrl.value = true;
  cachedCredentials.value = null;

  if (updateBrowserUrl) {
    const dashboardUrl = buildOverlayUrlWithCredentials({
      authHash: normalizedHash,
      encodedPayload: normalizedPayload
    });

    window.history.replaceState({}, '', dashboardUrl);
  }
}

function initializeAuthFromUrl() {
  if (initialized) {
    return;
  }

  initialized = true;

  try {
    const url = new URL(window.location.href);
    const authParam = String(url.searchParams.get('auth') || '').trim();

    if (!authParam) {
      clearAuth();
      return;
    }

    setAuthPayload({
      nextAuthHash: getAuthHashFromUrl(),
      nextEncodedPayload: authParam,
      updateBrowserUrl: false
    });
  } catch (error) {
    clearAuth();
  }
}

function buildUrl({ pagePath = '', queryParams = {} } = {}) {
  if (!authHash.value || !encodedPayload.value) {
    return '';
  }

  return buildOverlayUrlWithCredentials({
    authHash: authHash.value,
    encodedPayload: encodedPayload.value,
    pagePath,
    queryParams
  });
}

async function getCredentials({ forceRefresh = false } = {}) {
  initializeAuthFromUrl();

  if (!authHash.value || !encodedPayload.value) {
    return null;
  }

  if (!forceRefresh && cachedCredentials.value) {
    return cachedCredentials.value;
  }

  const credentials = await decryptCredentialsFromUrlPayload({ authHash: authHash.value });
  cachedCredentials.value = credentials;

  return credentials;
}

async function getUsername({ forceRefresh = false } = {}) {
  const credentials = await getCredentials({ forceRefresh });
  return String(credentials?.bot?.username || '').trim();
}

export function useOverlayAuth() {
  initializeAuthFromUrl();

  return {
    authHash,
    encodedPayload,
    hasAuthInUrl,
    isReady: computed(() => Boolean(authHash.value && encodedPayload.value)),
    setAuthPayload,
    clearAuth,
    buildUrl,
    getCredentials,
    getUsername,
    withDebugParam,
    initializeAuthFromUrl
  };
}
