<template>
  <div class="interpretation-wrap">
    <div v-if="open" class="interpretation-card" role="status">
      <span class="interpretation-label">Interpretación</span>
      <p>{{ text }}</p>
    </div>
    <button v-if="hasData" type="button" class="interpretation-button" :aria-expanded="open" @click="open = !open">
      {{ open ? "Ocultar interpretación" : "Ver interpretación" }}
    </button>
  </div>
</template>
<script setup>
import { ref } from "vue";
defineProps({ text: { type: String, required: true }, hasData: { type: Boolean, default: false } });
const open = ref(false);
</script>
<style scoped>
.interpretation-wrap { margin-top: 12px; }
.interpretation-button { border: 1px solid rgba(113, 173, 255, 0.42); border-radius: var(--radius-sm); padding: 8px 12px; background: var(--color-primary-soft); color: #dceaff; font-size: 13px; font-weight: 700; cursor: pointer; }
.interpretation-button:hover { background: rgba(113, 173, 255, 0.25); }
.interpretation-card { display: grid; gap: 5px; margin-bottom: 10px; padding: 12px 14px; border-left: 3px solid var(--color-primary); border-radius: var(--radius-sm); background: rgba(10, 18, 32, 0.42); }
.interpretation-label { color: var(--color-primary); font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.interpretation-card p { margin: 0; color: #fff; font-size: 13px; line-height: 1.5; }
</style>
