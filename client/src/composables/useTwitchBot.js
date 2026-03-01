const state = Vue.reactive({
  connectionStatus: 'idle',
  channel: '',
  lastError: '',
  events: {
    bits: [],
    followers: [],
    subscriptions: [],
    chat: []
  }
});

const listeners = {
  bits: new Set(),
  followers: new Set(),
  subscriptions: new Set(),
  chat: new Set(),
  raw: new Set()
};

let tmiClient = null;
let followersPollingId = null;
let knownFollowerIds = new Set();
let tmiLibraryPromise = null;
let activeCredentials = null;
const resolvedUserIdByLogin = new Map();
const debugParam = String(new URL(window.location.href).searchParams.get('debug') || '').trim().toLowerCase();
const isDebugEnabled = ['1', 'true', 'yes', 'on'].includes(debugParam);

function logDebug(scope, message, extra) {
  if (!isDebugEnabled) {
    return;
  }

  const timestamp = new Date().toISOString();

  if (extra === undefined) {
    console.log(`[twitchbot][${scope}] ${timestamp} ${message}`);
    return;
  }

  console.log(`[twitchbot][${scope}] ${timestamp} ${message}`, extra);
}

function normalizeTmiModule(moduleValue) {
  if (!moduleValue) {
    return null;
  }

  if (typeof moduleValue.Client === 'function') {
    return moduleValue;
  }

  if (moduleValue.default && typeof moduleValue.default.Client === 'function') {
    return moduleValue.default;
  }

  return null;
}

async function getTmiLibrary() {
  const fromWindow = normalizeTmiModule(window.tmi);

  if (fromWindow) {
    return fromWindow;
  }

  if (!tmiLibraryPromise) {
    tmiLibraryPromise = (async () => {
      const importUrls = [
        'https://cdn.jsdelivr.net/npm/tmi.js@1.8.5/+esm',
        'https://esm.sh/tmi.js@1.8.5'
      ];

      for (const url of importUrls) {
        try {
          const moduleValue = await import(url);
          const normalized = normalizeTmiModule(moduleValue);

          if (normalized) {
            return normalized;
          }
        } catch (error) {
          continue;
        }
      }

      throw new Error('tmi.js no está cargado. Revisa CDN/conexión y recarga la página.');
    })();
  }

  return tmiLibraryPromise;
}

function emitEvent(type, payload) {
  if (Array.isArray(state.events[type])) {
    const maxByType = {
      chat: 60,
      bits: 20,
      followers: 20,
      subscriptions: 20
    };

    const maxItems = maxByType[type] || 20;
    state.events[type].unshift(payload);
    state.events[type] = state.events[type].slice(0, maxItems);
  }

  if (listeners[type]) {
    listeners[type].forEach((handler) => handler(payload));
  }

  listeners.raw.forEach((handler) => handler(type, payload));

  if (type === 'chat') {
    logDebug('chat', 'Evento de chat emitido', {
      user: payload?.user,
      message: payload?.message,
      isSelf: payload?.isSelf,
      source: payload?.source || 'tmi',
      total: state.events.chat.length
    });
  }
}

function createEvent(user, extra = {}) {
  return {
    id: crypto.randomUUID(),
    user,
    createdAt: new Date().toISOString(),
    ...extra
  };
}

function createTestPayload(type, payload = {}) {
  const user = payload.user || 'tester';

  if (type === 'bits') {
    return createEvent(user, {
      amount: Number(payload.amount || 100),
      message: payload.message || 'Evento de prueba bits',
      source: 'test'
    });
  }

  if (type === 'followers') {
    return createEvent(user, {
      followedAt: new Date().toISOString(),
      source: 'test'
    });
  }

  if (type === 'subscriptions') {
    return createEvent(user, {
      tier: payload.tier || 'Prime',
      message: payload.message || 'Evento de prueba suscripción',
      source: 'test'
    });
  }

  if (type === 'chat') {
    return createEvent(user, {
      message: payload.message || 'Mensaje de prueba',
      isSelf: Boolean(payload.isSelf ?? true),
      source: 'test'
    });
  }

  return createEvent(user, { source: 'test', ...payload });
}

async function fetchFollowers(credentials) {
  const url = `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${credentials.api.broadcasterId}&first=20`;

  const response = await fetch(url, {
    headers: {
      'Client-Id': credentials.api.clientId,
      Authorization: `Bearer ${credentials.api.accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Error consultando followers (${response.status})`);
  }

  return response.json();
}

async function startFollowersPolling(credentials) {
  const data = await fetchFollowers(credentials);
  const initial = data.data ?? [];

  knownFollowerIds = new Set(initial.map((item) => item.user_id));

  followersPollingId = window.setInterval(async () => {
    try {
      const result = await fetchFollowers(credentials);
      const nextFollowers = result.data ?? [];

      nextFollowers.forEach((item) => {
        if (!knownFollowerIds.has(item.user_id)) {
          emitEvent(
            'followers',
            createEvent(item.user_name, {
              userId: item.user_id,
              followedAt: item.followed_at
            })
          );
        }
      });

      knownFollowerIds = new Set(nextFollowers.map((item) => item.user_id));
    } catch (error) {
      state.lastError = error instanceof Error ? error.message : 'Error en polling de followers';
    }
  }, 15000);
}

function stopFollowersPolling() {
  if (followersPollingId) {
    window.clearInterval(followersPollingId);
    followersPollingId = null;
  }
}

function validateCredentials(credentials) {
  const hasChatCredentials =
    credentials?.bot?.username &&
    credentials?.bot?.oauthToken &&
    credentials?.bot?.channel;

  if (!hasChatCredentials) {
    throw new Error('Credenciales inválidas: revisa bot.username, bot.oauthToken y bot.channel');
  }
}

function hasFollowersApiCredentials(credentials) {
  return Boolean(credentials?.api?.clientId && credentials?.api?.accessToken && credentials?.api?.broadcasterId);
}

function getApiAccessToken(credentials) {
  return String(credentials?.api?.accessToken || '').trim().replace(/^oauth:/i, '');
}

function looksLikeUserId(value) {
  return /^\d+$/.test(String(value || '').trim());
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Timeout de red (${timeoutMs}ms)`);
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function resolveUserId(credentials, loginOrId) {
  const value = String(loginOrId || '').trim();

  if (!value) {
    throw new Error('Falta identificador de usuario para /announce');
  }

  if (looksLikeUserId(value)) {
    return value;
  }

  const cached = resolvedUserIdByLogin.get(value.toLowerCase());

  if (cached) {
    return cached;
  }

  const token = getApiAccessToken(credentials);

  if (!credentials?.api?.clientId || !token) {
    throw new Error('Para /announce faltan api.clientId y api.accessToken');
  }

  const url = new URL('https://api.twitch.tv/helix/users');
  url.searchParams.set('login', value);

  const response = await fetchWithTimeout(
    url.toString(),
    {
    headers: {
      'Client-Id': credentials.api.clientId,
      Authorization: `Bearer ${token}`
    }
    },
    10000
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`No se pudo resolver user_id para ${value} (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  const found = payload?.data?.[0]?.id;

  if (!found) {
    throw new Error(`No se encontró user_id para ${value}`);
  }

  resolvedUserIdByLogin.set(value.toLowerCase(), found);
  return found;
}

function parseAnnounceCommand(message) {
  const text = String(message || '').trim();
  const compact = text.replace(/\s+/g, ' ');

  const explicit = compact.match(/^\/announce(?:\s+-?(blue|green|orange|purple|primary))?\s+(.+)$/i);
  if (explicit) {
    return {
      color: (explicit[1] || 'primary').toLowerCase(),
      message: explicit[2].trim()
    };
  }

  const compactColor = compact.match(/^\/announce(blue|green|orange|purple)\s+(.+)$/i);
  if (compactColor) {
    const map = {
      blue: 'primary',
      green: 'green',
      orange: 'orange',
      purple: 'purple'
    };

    return {
      color: map[compactColor[1].toLowerCase()] || 'primary',
      message: compactColor[2].trim()
    };
  }

  return null;
}

async function sendAnnouncement(credentials, rawCommand) {
  const parsed = parseAnnounceCommand(rawCommand);

  if (!parsed) {
    throw new Error('Uso de /announce: /announce [-green|-orange|-purple|-blue] mensaje');
  }

  const token = getApiAccessToken(credentials);

  if (!credentials?.api?.clientId || !token) {
    throw new Error('Para /announce faltan api.clientId y api.accessToken');
  }

  const broadcasterSource = credentials?.api?.broadcasterId || credentials?.bot?.channel;
  const moderatorSource = credentials?.api?.moderatorId || credentials?.bot?.username;

  const broadcasterId = await resolveUserId(credentials, broadcasterSource);
  const moderatorId = await resolveUserId(credentials, moderatorSource);

  const url = new URL('https://api.twitch.tv/helix/chat/announcements');
  url.searchParams.set('broadcaster_id', broadcasterId);
  url.searchParams.set('moderator_id', moderatorId);

  const response = await fetchWithTimeout(
    url.toString(),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': credentials.api.clientId,
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        message: parsed.message,
        color: parsed.color
      })
    },
    10000
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`No se pudo enviar /announce (${response.status}): ${errorText}`);
  }

  emitEvent(
    'chat',
    createEvent(credentials?.bot?.username || 'bot', {
      channel: state.channel,
      message: `[ANNOUNCE:${parsed.color}] ${parsed.message}`,
      color: '#a970ff',
      isSelf: true
    })
  );
}

export function useTwitchBot() {
  const connect = async (credentials) => {
    validateCredentials(credentials);
    logDebug('connect', 'Iniciando conexión', {
      username: credentials?.bot?.username,
      channel: credentials?.bot?.channel,
      hasOauthToken: Boolean(credentials?.bot?.oauthToken),
      hasApiClientId: Boolean(credentials?.api?.clientId)
    });

    const tmiLibrary = await getTmiLibrary();

    if (state.connectionStatus === 'connected') {
      logDebug('connect', 'Conexión omitida: ya conectado');
      return;
    }

    state.connectionStatus = 'connecting';
    state.lastError = '';
    state.channel = credentials.bot.channel;
    activeCredentials = credentials;

    tmiClient = new tmiLibrary.Client({
      options: {
        skipUpdatingEmotesets: true
      },
      connection: {
        reconnect: true,
        secure: true
      },
      identity: {
        username: credentials.bot.username,
        password: credentials.bot.oauthToken
      },
      channels: [credentials.bot.channel]
    });

    tmiClient.on('connected', async () => {
      state.connectionStatus = 'connected';
      logDebug('connect', 'Conectado a Twitch IRC', { channel: state.channel });

      if (hasFollowersApiCredentials(credentials)) {
        try {
          await startFollowersPolling(credentials);
          logDebug('followers', 'Polling de followers iniciado');
        } catch (error) {
          state.lastError = error instanceof Error ? error.message : 'No se pudo iniciar followers';
          logDebug('followers', 'Error iniciando polling', { error: state.lastError });
        }
      }
    });

    tmiClient.on('disconnected', (reason) => {
      state.connectionStatus = 'idle';
      state.lastError = reason || '';
      stopFollowersPolling();
      logDebug('connect', 'Desconectado de Twitch IRC', { reason: reason || 'sin razón' });
    });

    tmiClient.on('reconnect', () => {
      logDebug('connect', 'Intentando reconexión automática');
    });

    tmiClient.on('notice', (channel, messageid, msg) => {
      logDebug('notice', 'Notice recibido', { channel, messageid, msg });
    });

    tmiClient.on('messagedeleted', (channel, username, deletedMessage, userstate) => {
      logDebug('moderation', 'Mensaje eliminado', {
        channel,
        username,
        deletedMessage,
        targetMsgId: userstate?.['target-msg-id']
      });
    });

    tmiClient.on('cheer', (channel, userstate, message) => {
      emitEvent(
        'bits',
        createEvent(userstate['display-name'] || userstate.username || 'anon', {
          channel,
          amount: Number(userstate.bits || 0),
          message
        })
      );
    });

    tmiClient.on('subscription', (channel, username, method, message, userstate) => {
      emitEvent(
        'subscriptions',
        createEvent(username, {
          channel,
          tier: method?.planName || userstate?.msg_param_sub_plan || 'unknown',
          message
        })
      );
    });

    tmiClient.on('resub', (channel, username, months, message, userstate, methods) => {
      emitEvent(
        'subscriptions',
        createEvent(username, {
          channel,
          tier: methods?.planName || userstate?.msg_param_sub_plan || 'unknown',
          months,
          message
        })
      );
    });

    tmiClient.on('subgift', (channel, username, streakMonths, recipient, methods, userstate) => {
      emitEvent(
        'subscriptions',
        createEvent(username, {
          channel,
          recipient,
          streakMonths,
          tier: methods?.planName || userstate?.msg_param_sub_plan || 'unknown'
        })
      );
    });

    tmiClient.on('message', (channel, userstate, message, self) => {
      emitEvent(
        'chat',
        createEvent(userstate['display-name'] || userstate.username || 'anon', {
          channel,
          message,
          color: userstate.color || '',
          isSelf: Boolean(self),
          source: 'tmi'
        })
      );
    });

    try {
      await tmiClient.connect();
      logDebug('connect', 'Handshake de conexión completado');
    } catch (error) {
      state.connectionStatus = 'error';
      state.lastError = error instanceof Error ? error.message : 'Error al conectar bot';
      logDebug('connect', 'Error al conectar', { error: state.lastError });
      throw error;
    }
  };

  const disconnect = async () => {
    stopFollowersPolling();

    if (tmiClient) {
      await tmiClient.disconnect();
      tmiClient = null;
    }

    state.connectionStatus = 'idle';
    activeCredentials = null;
    logDebug('connect', 'Desconectado manualmente');
  };

  const on = (eventName, handler) => {
    if (!listeners[eventName]) {
      listeners[eventName] = new Set();
    }

    listeners[eventName].add(handler);

    return () => {
      listeners[eventName].delete(handler);
    };
  };

  const emitTestEvent = (eventName, payload = {}) => {
    const supportedEvents = ['bits', 'followers', 'subscriptions', 'chat'];

    if (!supportedEvents.includes(eventName)) {
      throw new Error(`Evento de prueba no soportado: ${eventName}`);
    }

    const eventPayload = createTestPayload(eventName, payload);
    emitEvent(eventName, eventPayload);
    return eventPayload;
  };

  const sendMessage = async (message) => {
    const normalizedMessage = String(message || '').trim();

    if (!normalizedMessage) {
      throw new Error('El mensaje está vacío');
    }

    if (!tmiClient || state.connectionStatus !== 'connected') {
      throw new Error('El bot no está conectado');
    }

    const lower = normalizedMessage.toLowerCase();
    if (lower.startsWith('/announce')) {
      try {
        logDebug('chat', 'Enviando /announce por API', { message: normalizedMessage });
        await sendAnnouncement(activeCredentials, normalizedMessage);
      } catch (apiError) {
        logDebug('chat', 'Fallback /announce por IRC', {
          apiError: apiError instanceof Error ? apiError.message : String(apiError)
        });
        try {
          await tmiClient.say(state.channel, normalizedMessage);
        } catch (ircError) {
          const apiMessage = apiError instanceof Error ? apiError.message : 'error API desconocido';
          const ircMessage = ircError instanceof Error ? ircError.message : 'error IRC desconocido';
          throw new Error(`Falló /announce en API (${apiMessage}) y en IRC (${ircMessage})`);
        }
      }

      return;
    }

    await tmiClient.say(state.channel, normalizedMessage);
    logDebug('chat', 'Mensaje enviado por IRC', { channel: state.channel, message: normalizedMessage });
  };

  return {
    state,
    connect,
    disconnect,
    on,
    emitTestEvent,
    sendMessage
  };
}
