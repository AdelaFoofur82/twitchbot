<template>
    <section class="card bg-dark border-light-subtle text-white mb-4">
        <div class="card-body text-white">
            <div class="d-flex justify-content-between align-items-center gap-2 mb-3 flex-wrap">
                <h2 class="h5 mb-0">Comandos de chat</h2>
                <button class="btn btn-outline-primary btn-sm" type="button" @click="addCommand">Añadir comando</button>
            </div>

            <p class="small text-white-50 mb-3">
                Cuando un usuario escriba el texto del disparador, se ejecuta la acción configurada.
            </p>

            <div v-if="!commands.length" class="small text-white-50">No hay comandos configurados.</div>

            <div v-for="command in commands" :key="command.id" class="border border-light-subtle rounded p-3 mb-3">
                <div class="row g-2 align-items-end">
                    <div class="col-12 col-md-4">
                        <label class="form-label">Disparador</label>
                        <input v-model="command.trigger" type="text"
                            class="form-control bg-dark text-white border-light-subtle" placeholder="!hola" />
                        <div class="form-text text-white-50">&nbsp;</div>
                    </div>

                    <div class="col-12 col-md-3">
                        <label class="form-label">Evento</label>
                        <select v-model="command.eventType" class="form-select bg-dark text-white border-light-subtle">
                            <option value="send_message">Escribir en chat</option>
                        </select>
                        <div class="form-text text-white-50">&nbsp;</div>
                    </div>

                    <div class="col-12 col-md-4">
                        <label class="form-label">Mensaje del bot</label>
                        <input v-model="command.payload" type="text"
                            class="form-control bg-dark text-white border-light-subtle" placeholder="¡Hola!" />
                        <div class="form-text text-white-50">Puedes usar <code class="user-select-all" v-pre>{{username}}</code>.</div>
                    </div>

                    <div class="col-12 col-md-1 d-flex justify-content-md-end">
                        <button class="btn btn-outline-danger btn-sm" type="button"
                            @click="removeCommand(command.id)">X</button>
                    </div>
                </div>

                <div class="form-check mt-2">
                    <input :id="`cmd-enabled-${command.id}`" v-model="command.enabled" class="form-check-input"
                        type="checkbox" />
                    <label :for="`cmd-enabled-${command.id}`" class="form-check-label">Activo</label>
                </div>
            </div>
        </div>
    </section>
</template>

<script>
export default {
    name: 'ChatCommandsConfig',
    setup() {
        const { inject, onBeforeUnmount, ref, watch } = Vue;
        const globalServices = inject('globalServices', {});
        const useConfig = globalServices.useConfig;
        const useTwitchBot = globalServices.useTwitchBot;

        const config = useConfig();
        const { on, sendMessage } = useTwitchBot();

        function normalizeCommand(command = {}) {
            return {
                id: String(command.id || crypto.randomUUID()),
                trigger: String(command.trigger || '').trim(),
                eventType: String(command.eventType || 'send_message').trim() || 'send_message',
                payload: String(command.payload || '').trim(),
                enabled: Boolean(command.enabled ?? true)
            };
        }

        function loadInitialCommands() {
            const fromConfig = config.getConfig('chat.commands', []);
            return Array.isArray(fromConfig) ? fromConfig.map((command) => normalizeCommand(command)) : [];
        }

        const commands = ref(loadInitialCommands());

        watch(
            commands,
            (nextCommands) => {
                config.setConfig(
                    'chat.commands',
                    nextCommands.map((command) => ({
                        id: command.id,
                        trigger: String(command.trigger || '').trim(),
                        eventType: command.eventType,
                        payload: String(command.payload || '').trim(),
                        enabled: Boolean(command.enabled)
                    }))
                );
            },
            { deep: true, immediate: true }
        );

        function addCommand() {
            commands.value.push(
                normalizeCommand({
                    trigger: '',
                    eventType: 'send_message',
                    payload: '',
                    enabled: true
                })
            );
        }

        function removeCommand(commandId) {
            commands.value = commands.value.filter((command) => command.id !== commandId);
        }

        let isExecutingCommand = false;

        const unsubscribeChat = on('chat', async (event) => {
            if (!event || event.isSelf || isExecutingCommand) {
                return;
            }

            const incomingMessage = String(event.message || '').trim().toLowerCase();

            if (!incomingMessage) {
                return;
            }

            const matchingCommand = commands.value.find((command) => {
                if (!command.enabled) {
                    return false;
                }

                const normalizedTrigger = String(command.trigger || '').trim().toLowerCase();

                if (!normalizedTrigger) {
                    return false;
                }

                return incomingMessage === normalizedTrigger;
            });

            if (!matchingCommand) {
                return;
            }

            if (matchingCommand.eventType === 'send_message') {
                const responseTemplate = String(matchingCommand.payload || '').trim();
                const eventUsername = String(event.user || '').trim();
                const response = responseTemplate.replace(/\{\{\s*username\s*\}\}/gi, eventUsername);

                if (!response) {
                    return;
                }

                isExecutingCommand = true;

                try {
                    await sendMessage(response);
                } catch (error) {
                } finally {
                    isExecutingCommand = false;
                }
            }
        });

        onBeforeUnmount(() => {
            if (typeof unsubscribeChat === 'function') {
                unsubscribeChat();
            }
        });

        return {
            addCommand,
            commands,
            removeCommand
        };
    }
};
</script>
