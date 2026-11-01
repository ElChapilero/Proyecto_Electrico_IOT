<template>
  <div class="info-popover" :class="`info-popover--${placement}`">
    <button
      class="info-trigger"
      type="button"
      :aria-label="`Más información sobre ${title}`"
      :aria-expanded="String(open)"
      @click.stop="open = !open"
    >
      <span aria-hidden="true">i</span>
      <span class="sr-only">Más información</span>
    </button>
    <div v-if="open" class="info-panel" role="dialog" :aria-label="title">
      <div class="info-panel__header">
        <strong>{{ title }}</strong>
        <button
          type="button"
          aria-label="Cerrar información"
          @click="open = false"
        >
          ×
        </button>
      </div>
      <p>{{ summary }}</p>
      <p><strong>¿Cómo entenderlo?</strong> {{ how }}</p>
      <details>
        <summary>Más información</summary>
        <p>{{ detail }}</p>
      </details>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

defineProps({
  title: { type: String, required: true },
  summary: { type: String, required: true },
  how: { type: String, required: true },
  detail: { type: String, required: true },
  placement: { type: String, default: "bottom-right" },
});

const open = ref(false);
function closeOnEscape(event) {
  if (event.key === "Escape") open.value = false;
}
onMounted(() => document.addEventListener("keydown", closeOnEscape));
onBeforeUnmount(() => document.removeEventListener("keydown", closeOnEscape));
</script>

<style scoped>
.info-popover {
  position: absolute;
  z-index: 12;
}
.info-popover--bottom-right {
  right: 10px;
  bottom: 9px;
}
.info-popover--top-right {
  right: 12px;
  top: 12px;
}
.info-popover--header {
  position: relative;
  flex: 0 0 auto;
}
.info-trigger {
  width: 24px;
  height: 24px;
  border: 1px solid rgba(220, 235, 255, 0.55);
  border-radius: 50%;
  background: rgba(10, 18, 32, 0.68);
  color: #fff;
  font: 700 17px/1 var(--font-body);
  cursor: pointer;
}
.info-trigger:hover,
.info-trigger:focus-visible {
  background: var(--color-primary-dark);
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.info-panel {
  position: absolute;
  right: 0;
  width: min(330px, calc(100vw - 32px));
  margin-top: 8px;
  padding: 14px;
  border: 1px solid var(--chart-tooltip-border);
  border-radius: var(--radius-sm);
  background: #0b1728;
  color: #fff;
  box-shadow: var(--shadow-md);
  font-size: 12px;
  line-height: 1.45;
}
.info-popover--header .info-panel {
  top: calc(100% + 8px);
  margin-top: 0;
}
.info-popover--bottom-right .info-panel {
  bottom: 32px;
  margin-top: 0;
}
.info-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #eaf3ff;
}
.info-panel__header button {
  border: 0;
  background: transparent;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
}
.info-panel p {
  margin: 9px 0 0;
}
.info-panel details {
  margin-top: 10px;
}
.info-panel summary {
  color: var(--color-primary);
  cursor: pointer;
  font-weight: 700;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
