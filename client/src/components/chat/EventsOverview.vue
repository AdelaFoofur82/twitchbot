<template>
  <section class="row g-3">
    <div class="col-12 col-lg-4">
      <div class="card h-100 bg-dark border-light-subtle text-white">
        <div class="card-body text-white">
          <h3 class="h6">Bits</h3>
          <ul class="list-group list-group-flush">
            <li v-for="event in state.events.bits" :key="event.id" class="list-group-item bg-dark text-white px-0">
              <strong>{{ event.user }}</strong> envió {{ event.amount }} bits
            </li>
            <li v-if="!state.events.bits.length" class="list-group-item bg-dark text-white px-0">
              Sin eventos aún
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="col-12 col-lg-4">
      <div class="card h-100 bg-dark border-light-subtle text-white">
        <div class="card-body text-white">
          <h3 class="h6">Followers</h3>
          <ul class="list-group list-group-flush">
            <li v-for="event in state.events.followers" :key="event.id" class="list-group-item bg-dark text-white px-0">
              Nuevo follower: <strong>{{ event.user }}</strong>
            </li>
            <li v-if="!state.events.followers.length" class="list-group-item bg-dark text-white px-0">
              Sin eventos aún
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="col-12 col-lg-4">
      <div class="card h-100 bg-dark border-light-subtle text-white">
        <div class="card-body text-white">
          <h3 class="h6">Subs</h3>
          <ul class="list-group list-group-flush">
            <li v-for="event in state.events.subscriptions" :key="event.id" class="list-group-item bg-dark text-white px-0">
              {{ event.user }} se suscribió ({{ event.tier }})
            </li>
            <li v-if="!state.events.subscriptions.length" class="list-group-item bg-dark text-white px-0">
              Sin eventos aún
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
const useTwitchBot = window.__twitchbot_useTwitchBot;

export default {
  name: 'EventsOverview',
  setup() {
    const { state } = useTwitchBot();

    return {
      state
    };
  }
};
</script>
