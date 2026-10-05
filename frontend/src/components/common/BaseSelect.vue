<template>
  <label class="field"
    ><span v-if="label">{{ label }}</span
    ><select
      :value="modelValue"
      :disabled="disabled"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <slot /></select
  ></label>
</template>
<script setup>
defineProps({ label: String, modelValue: [String, Number], disabled: Boolean });
defineEmits(["update:modelValue"]);
</script>
