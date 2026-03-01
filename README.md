# Twitch BOT Layer (Vue CDN)

Layer para Twitch con Vue 3 por CDN (sin compilación) + bot en navegador.


Sirve `client/` con cualquier servidor estático y abre:

```text
http://localhost:PORT/?auth=PAYLOAD_CIFRADO
```

También puedes generar URL desde la propia interfaz con el formulario superior (username + accessToken) y compartir ese enlace directo para overlays en OBS.

El bloque de enlaces se actualiza automáticamente debajo del formulario al completar `username`, `accessToken` y `clientId`; no hace falta pulsar "Generar" para verlo.

Parámetro común para componentes: `debug=1`.

- Actívalo por componente con la casilla "Añadir `debug=1` al copiar" junto al botón de copiar URL.
- Solo se añade en la URL copiada (la URL visible puede quedar limpia sin debug).
- Convención para componentes nuevos: soportar `debug=1` para mostrar HUD/estado de diagnóstico.

En el formulario introduce el token sin `oauth:`; la app usa ese mismo token para API y añade `oauth:` automáticamente para el bot IRC.

Overlay chat (archivo separado para OBS):

```text
http://localhost:PORT/chat.html?auth=PAYLOAD_CIFRADO
```

Parámetros opcionales del chat overlay (en la URL):

- `chat_max`: máximo de líneas visibles (ej: `8`)
- `chat_size`: tamaño de fuente en px (ej: `30`)
- `chat_align`: `left`, `center` o `right`
- `chat_fade_ms`: milisegundos antes de empezar a desvanecer cada mensaje (ej: `4000`). El desvanecimiento dura siempre `500ms`

Ejemplo:

```text
http://localhost:PORT/chat.html?auth=PAYLOAD_CIFRADO&chat_max=10&chat_size=36&chat_align=left&chat_fade_ms=4000&debug=1
```

## Eventos soportados

- Bits: por eventos IRC `cheer`
- Suscripciones: `subscription`, `resub`, `subgift`
- Followers: polling Helix (`channels/followers`)
- Chat: recepción por IRC `message` y envío desde panel "Chat de Twitch (bot)"

## Extender funcionalidades

El composable está en `client/src/composables/useTwitchBot.js`.

Puedes añadir nuevos eventos con:

- `emitEvent('nombreEvento', payload)`
- `on('nombreEvento', handler)`

Y nueva lógica en `connect()` o en funciones auxiliares.
