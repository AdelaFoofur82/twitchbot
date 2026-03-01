const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function normalizeBase64Url(base64UrlText) {
  const normalized = base64UrlText.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  return `${normalized}${'='.repeat(padding)}`;
}

function toBase64Url(text) {
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(base64UrlText) {
  return atob(normalizeBase64Url(base64UrlText));
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex) {
  const pairs = hex.match(/.{1,2}/g);

  if (!pairs) {
    throw new Error('Hash inválido');
  }

  return new Uint8Array(pairs.map((pair) => Number.parseInt(pair, 16)));
}

function bytesToArrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function decryptAesGcm({ keyBytes, ivHex, encryptedHex }) {
  const cryptoKey = await crypto.subtle.importKey('raw', bytesToArrayBuffer(keyBytes), 'AES-GCM', false, ['decrypt']);

  const iv = hexToBytes(ivHex);
  const encryptedData = hexToBytes(encryptedHex);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv
    },
    cryptoKey,
    encryptedData
  );

  return textDecoder.decode(decryptedBuffer);
}

async function encryptAesGcm({ keyBytes, plainText }) {
  const cryptoKey = await crypto.subtle.importKey('raw', bytesToArrayBuffer(keyBytes), 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    cryptoKey,
    textEncoder.encode(plainText)
  );

  return {
    ivHex: bytesToHex(iv),
    encryptedHex: bytesToHex(new Uint8Array(encryptedBuffer))
  };
}

async function sha256Hex(text) {
  const digestBuffer = await crypto.subtle.digest('SHA-256', textEncoder.encode(text));
  return bytesToHex(new Uint8Array(digestBuffer));
}

function normalizeOAuthToken(accessToken) {
  const token = String(accessToken || '').trim();
  return token.startsWith('oauth:') ? token : `oauth:${token}`;
}

function normalizeBearerToken(accessToken) {
  return String(accessToken || '').trim().replace(/^oauth:/i, '');
}

export function getAuthHashFromUrl() {
  const url = new URL(window.location.href);
  const authParam = String(url.searchParams.get('auth') || '').trim();

  if (!authParam) {
    throw new Error('Falta ?auth=PAYLOAD en la URL');
  }

  const payload = JSON.parse(fromBase64Url(authParam));
  const payloadHash = String(payload?.authHash || '').trim();

  if (!/^[a-f0-9]{64}$/i.test(payloadHash)) {
    throw new Error('El payload ?auth no contiene authHash válido');
  }

  return payloadHash.toLowerCase();
}

export function getEncryptedPayloadFromUrl() {
  const url = new URL(window.location.href);
  const authParam = String(url.searchParams.get('auth') || '').trim();
  return authParam;
}

export async function decryptCredentialsFromFile({ fileUrl, authHash }) {
  const response = await fetch(fileUrl, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`No se pudo leer ${fileUrl}`);
  }

  const payload = await response.json();

  if (payload.authHash !== authHash) {
    throw new Error('Hash inválido para este fichero cifrado');
  }

  const keyBytes = hexToBytes(authHash);

  const plainText = await decryptAesGcm({
    keyBytes,
    ivHex: payload.iv,
    encryptedHex: payload.encrypted
  });

  const credentials = JSON.parse(plainText);

  if (!credentials.bot || !credentials.api) {
    throw new Error('Credenciales incompletas');
  }

  return credentials;
}

export async function decryptCredentialsFromUrlPayload({ authHash }) {
  const encodedPayload = getEncryptedPayloadFromUrl();

  if (!encodedPayload) {
    throw new Error('No existe payload cifrado en ?auth');
  }

  const rawJson = fromBase64Url(encodedPayload);
  const payload = JSON.parse(rawJson);

  if (payload.authHash !== authHash) {
    throw new Error('Hash inválido para credenciales en URL');
  }

  const keyBytes = hexToBytes(authHash);

  const plainText = await decryptAesGcm({
    keyBytes,
    ivHex: payload.iv,
    encryptedHex: payload.encrypted
  });

  const credentials = JSON.parse(plainText);

  if (!credentials.bot || !credentials.api) {
    throw new Error('Credenciales URL incompletas');
  }

  return credentials;
}

export async function decryptCredentialsFromCandidateFiles({ fileUrls, authHash }) {
  const uniqueUrls = [...new Set(fileUrls.filter(Boolean))];
  const errors = [];

  for (const fileUrl of uniqueUrls) {
    try {
      return await decryptCredentialsFromFile({ fileUrl, authHash });
    } catch (error) {
      errors.push(`${fileUrl}: ${error instanceof Error ? error.message : 'error desconocido'}`);
    }
  }

  throw new Error(`No se pudo leer/descifrar credenciales. Intentos: ${errors.join(' | ')}`);
}

export async function buildUrlCredentialsPayload({ username, accessToken, clientId, channel }) {
  const normalizedUsername = String(username || '').trim();
  const normalizedToken = normalizeBearerToken(accessToken);
  const normalizedClientId = String(clientId || '').trim();
  const normalizedChannel = String(channel || normalizedUsername).trim();

  if (!normalizedUsername) {
    throw new Error('Falta username');
  }

  if (!normalizedToken) {
    throw new Error('Falta accessToken');
  }

  if (!normalizedClientId) {
    throw new Error('Falta clientId');
  }

  if (!normalizedChannel) {
    throw new Error('Falta channel');
  }

  const credentials = {
    bot: {
      username: normalizedUsername,
      oauthToken: normalizeOAuthToken(normalizedToken),
      channel: normalizedChannel
    },
    api: {
      accessToken: normalizedToken,
      clientId: normalizedClientId,
      broadcasterId: ''
    }
  };

  const sourceString = JSON.stringify(credentials);
  const authHash = await sha256Hex(sourceString);
  const keyBytes = hexToBytes(authHash);
  const encrypted = await encryptAesGcm({ keyBytes, plainText: sourceString });

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    authHash,
    iv: encrypted.ivHex,
    encrypted: encrypted.encryptedHex
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));

  return {
    authHash,
    encodedPayload,
    credentials
  };
}

export function buildOverlayUrlWithCredentials({ authHash, encodedPayload, pagePath = '', queryParams = {} }) {
  const url = new URL(window.location.href);
  const targetUrl = pagePath ? new URL(pagePath, url) : new URL(url.toString());

  targetUrl.searchParams.set('auth', encodedPayload);

  Object.entries(queryParams || {}).forEach(([key, value]) => {
    const normalizedKey = String(key || '').trim();

    if (!normalizedKey) {
      return;
    }

    if (value === null || value === undefined || String(value).trim() === '') {
      targetUrl.searchParams.delete(normalizedKey);
      return;
    }

    targetUrl.searchParams.set(normalizedKey, String(value));
  });

  targetUrl.hash = '';

  return targetUrl.toString();
}

export function toUtf8Bytes(text) {
  return textEncoder.encode(text);
}
