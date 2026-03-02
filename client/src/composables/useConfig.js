const { ref } = Vue;

const configData = ref({});
const configHash = ref('');
const configVersion = ref(0);
let initialized = false;

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(String(text || ''));
  let binary = '';

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(hashText) {
  const normalized = String(hashText || '').trim().replace(/-/g, '+').replace(/_/g, '/');

  if (!normalized) {
    return '';
  }

  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new TextDecoder().decode(bytes);
}

function parseConfigHash(hashText) {
  try {
    const decodedText = fromBase64Url(hashText);

    if (!decodedText) {
      return {};
    }

    const parsed = JSON.parse(decodedText);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

function buildConfigHash(nextData) {
  try {
    return toBase64Url(JSON.stringify(nextData || {}));
  } catch (error) {
    return toBase64Url('{}');
  }
}

function getNestedValue(target, path, defaultValue) {
  const segments = String(path || '').split('.').filter(Boolean);

  if (!segments.length) {
    return defaultValue;
  }

  let current = target;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];

    if (!current || typeof current !== 'object' || !(segment in current)) {
      return defaultValue;
    }

    current = current[segment];
  }

  return current;
}

function setNestedValue(target, path, value) {
  const segments = String(path || '').split('.').filter(Boolean);

  if (!segments.length) {
    return false;
  }

  let current = target;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];

    if (!current[segment] || typeof current[segment] !== 'object' || Array.isArray(current[segment])) {
      current[segment] = {};
    }

    current = current[segment];
  }

  current[segments[segments.length - 1]] = value;
  return true;
}

function replaceCurrentUrlWithConfig(nextHash) {
  const url = new URL(window.location.href);

  if (nextHash) {
    url.searchParams.set('config', nextHash);
  } else {
    url.searchParams.delete('config');
  }

  window.history.replaceState({}, '', url.toString());
}

function syncFromUrl({ ensureConfigParam = true } = {}) {
  const url = new URL(window.location.href);
  const hashFromUrl = String(url.searchParams.get('config') || '').trim();
  const parsedData = parseConfigHash(hashFromUrl);
  const nextHash = buildConfigHash(parsedData);

  configData.value = parsedData;
  configHash.value = nextHash;

  if (ensureConfigParam && hashFromUrl !== nextHash) {
    replaceCurrentUrlWithConfig(nextHash);
  }
}

function persistConfig() {
  const nextHash = buildConfigHash(configData.value);

  if (nextHash === configHash.value) {
    return;
  }

  configHash.value = nextHash;
  replaceCurrentUrlWithConfig(nextHash);
  configVersion.value += 1;
}

function ensureInitialized() {
  if (initialized) {
    return;
  }

  initialized = true;
  syncFromUrl({ ensureConfigParam: true });
}

export function useConfig() {
  ensureInitialized();

  function setConfig(key, value) {
    if (!setNestedValue(configData.value, key, value)) {
      return;
    }

    persistConfig();
  }

  function getConfig(key, defaultValue = '') {
    return getNestedValue(configData.value, key, defaultValue);
  }

  return {
    configData,
    configHash,
    configVersion,
    setConfig,
    getConfig,
    syncFromUrl
  };
}
