<template>
  <span class="editable-name">
    <template v-if="!editando">
      <span class="texto">{{ modelValue }}</span>
      <button type="button" class="lapiz" @click.stop="empezar" :aria-label="`Renombrar ${modelValue}`">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
    </template>

    <form v-else class="form-edicion" @submit.prevent="confirmar" @click.stop>
      <input ref="inputRef" v-model="valor" @keyup.esc="cancelar" />
      <button type="submit" class="ok" aria-label="Guardar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </button>
      <button type="button" class="cancelar" @click="cancelar" aria-label="Cancelar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </form>
  </span>
</template>

<script setup>
import { ref, nextTick } from 'vue';

const props = defineProps({ modelValue: { type: String, required: true } });
const emit = defineEmits(['guardar']);

const editando = ref(false);
const valor = ref(props.modelValue);
const inputRef = ref(null);

async function empezar() {
  valor.value = props.modelValue;
  editando.value = true;
  await nextTick();
  inputRef.value?.focus();
  inputRef.value?.select();
}

function cancelar() {
  editando.value = false;
}

function confirmar() {
  const nuevo = valor.value.trim();
  editando.value = false;
  if (!nuevo || nuevo === props.modelValue) return;
  emit('guardar', nuevo);
}
</script>

<style scoped>
.editable-name { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
.texto { overflow: hidden; text-overflow: ellipsis; }

.lapiz { background: none; border: 0; padding: 2px; color: var(--text-muted); cursor: pointer; line-height: 0; flex-shrink: 0; }
.lapiz:hover { color: var(--volt-teal-dark); }
.lapiz svg { width: 14px; height: 14px; }

.form-edicion { display: inline-flex; align-items: center; gap: 4px; min-width: 0; }
.form-edicion input {
  font: inherit;
  padding: 3px 6px;
  border: 1px solid var(--volt-teal);
  border-radius: 6px;
  min-width: 0;
  width: 12ch;
}
.form-edicion button { background: none; border: 0; padding: 2px; cursor: pointer; line-height: 0; flex-shrink: 0; }
.form-edicion svg { width: 16px; height: 16px; }
.ok { color: var(--volt-teal-dark); }
.cancelar { color: var(--volt-coral); }
</style>
