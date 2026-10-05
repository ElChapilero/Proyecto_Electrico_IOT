<template>
  <router-view v-slot="{ Component }">
    <component :is="Component" />
  </router-view>
</template>

<script setup>
import { onMounted, onUnmounted } from "vue";
import { useAuthStore } from "./stores/authStore";
import { useRealtimeStore } from "./stores/realtimeStore";

const auth = useAuthStore();
const realtime = useRealtimeStore();

function onExpired() {
  auth.clearSession();
  realtime.disconnect();
}

onMounted(() => window.addEventListener("auth:expired", onExpired));
onUnmounted(() => window.removeEventListener("auth:expired", onExpired));
</script>
