import { createTestAlertsPanel } from './components/TestAlertsPanel.js';

export function createLayerApp(options = {}) {
  const { createApp } = Vue;
  const {
    rootComponent = null,
    globalServices = {},
    credentialsGeneratorComponent = null,
    overlaysSectionComponent = null,
    chatConfigurationComponent = null,
    chatIndexComponent = null,
    floatingCopyUrlButtonComponent = null
  } = options;

  const app = createApp(rootComponent || {});

  app.provide('globalServices', globalServices);

  app.component('test-alerts-panel', createTestAlertsPanel());

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

  if (floatingCopyUrlButtonComponent) {
    app.component('floating-copy-url-button', floatingCopyUrlButtonComponent);
  }

  app.mount('#app');
}
