import { createTestAlertsPanel } from './components/TestAlertsPanel.js';

export function createLayerApp(options = {}) {
  const { createApp } = Vue;
  const {
    credentialsGeneratorComponent = null,
    overlaysSectionComponent = null,
    chatConfigurationComponent = null,
    chatDashboardComponent = null,
    botStatusCardComponent = null,
    botActionsCardComponent = null,
    eventsOverviewComponent = null
  } = options;

  const app = createApp({});

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

  if (chatDashboardComponent) {
    app.component('chat-dashboard', chatDashboardComponent);
  }

  if (botStatusCardComponent) {
    app.component('bot-status-card', botStatusCardComponent);
  }

  if (botActionsCardComponent) {
    app.component('bot-actions-card', botActionsCardComponent);
  }

  if (eventsOverviewComponent) {
    app.component('events-overview', eventsOverviewComponent);
  }

  app.mount('#app');
}
