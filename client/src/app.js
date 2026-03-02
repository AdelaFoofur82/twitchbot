export function createLayerApp(options = {}) {
  const { createApp } = Vue;
  const {
    rootComponent = null,
    globalServices = {},
    credentialsGeneratorComponent = null,
    overlaysSectionComponent = null,
    chatConfigurationComponent = null,
    chatIndexComponent = null,
    chatCommandsConfigComponent = null,
    floatingCopyUrlButtonComponent = null,
    testAlertsPanelComponent = null
  } = options;

  const app = createApp(rootComponent || {});

  app.provide('globalServices', globalServices);

  if (testAlertsPanelComponent) {
    app.component('test-alerts-panel', testAlertsPanelComponent);
  }

  if (credentialsGeneratorComponent) {
    app.component('credentials-generator', credentialsGeneratorComponent);
  }

  if (overlaysSectionComponent) {
    app.component('overlays-section', overlaysSectionComponent);
  }

  if (chatConfigurationComponent) {
    app.component('chat-configuration', chatConfigurationComponent);
  }

  if (chatIndexComponent) {
    app.component('chat-index', chatIndexComponent);
  }

  if (chatCommandsConfigComponent) {
    app.component('chat-commands-config', chatCommandsConfigComponent);
  }

  if (floatingCopyUrlButtonComponent) {
    app.component('floating-copy-url-button', floatingCopyUrlButtonComponent);
  }

  app.mount('#app');
}
