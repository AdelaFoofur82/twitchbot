import { useTwitchBot } from '../composables/useTwitchBot.js';

const alertDurationMs = 4500;

function getAlertMessage(type, payload) {
  if (type === 'bits') {
    return `${payload.user} envió ${payload.amount} bits`;
  }

  if (type === 'followers') {
    return `Nuevo follower: ${payload.user}`;
  }

  if (type === 'subscriptions') {
    return `${payload.user} se suscribió (${payload.tier || 'unknown'})`;
  }

  return `${payload.user} - ${type}`;
}

function getAlertClass(type) {
  if (type === 'bits') {
    return 'text-bg-warning';
  }

  if (type === 'followers') {
    return 'text-bg-info';
  }

  if (type === 'subscriptions') {
    return 'text-bg-success';
  }

  return 'text-bg-secondary';
}

export function createTestAlertsPanel() {
  const { ref, onMounted, onBeforeUnmount } = Vue;

  return {
    name: 'TestAlertsPanel',
    setup() {
      const alertQueue = ref([]);
      const activeTimeouts = [];
      const unsubscribers = [];
      const { on, emitTestEvent } = useTwitchBot();

      const addAlert = (type, payload) => {
        const alert = {
          id: crypto.randomUUID(),
          type,
          cssClass: getAlertClass(type),
          message: getAlertMessage(type, payload)
        };

        alertQueue.value = [alert, ...alertQueue.value].slice(0, 4);

        const timeoutId = window.setTimeout(() => {
          alertQueue.value = alertQueue.value.filter((item) => item.id !== alert.id);
        }, alertDurationMs);

        activeTimeouts.push(timeoutId);
      };

      const runTest = (type) => {
        if (type === 'bits') {
          emitTestEvent('bits', { user: 'BitTester', amount: 250 });
          return;
        }

        if (type === 'followers') {
          emitTestEvent('followers', { user: 'FollowerTester' });
          return;
        }

        emitTestEvent('subscriptions', { user: 'SubTester', tier: 'Tier 1' });
      };

      onMounted(() => {
        unsubscribers.push(on('bits', (payload) => addAlert('bits', payload)));
        unsubscribers.push(on('followers', (payload) => addAlert('followers', payload)));
        unsubscribers.push(on('subscriptions', (payload) => addAlert('subscriptions', payload)));
      });

      onBeforeUnmount(() => {
        unsubscribers.forEach((unsubscribe) => unsubscribe());
        activeTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      });

      return {
        alertQueue,
        runTest
      };
    },
    template: `
      <section class="card bg-dark border-light-subtle text-white mb-4">
        <div class="card-body text-white">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h2 class="h5 mb-0">Mini alertas de prueba</h2>
            <div class="d-flex flex-wrap gap-2">
              <button class="btn btn-sm btn-outline-warning" @click="runTest('bits')">Test Bits</button>
              <button class="btn btn-sm btn-outline-info" @click="runTest('followers')">Test Follow</button>
              <button class="btn btn-sm btn-outline-success" @click="runTest('subscriptions')">Test Sub</button>
            </div>
          </div>

          <div class="position-relative" style="min-height: 56px;">
            <div class="d-flex flex-column gap-2">
              <div
                v-for="item in alertQueue"
                :key="item.id"
                class="alert py-2 px-3 mb-0 small"
                :class="item.cssClass"
                role="alert"
              >
                {{ item.message }}
              </div>
            </div>
          </div>
        </div>
      </section>
    `
  };
}
