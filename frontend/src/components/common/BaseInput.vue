<template>
  <label class="field"
    ><span>{{ label }}</span
    ><input
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :required="required"
      :autocomplete="autocomplete"
      :disabled="disabled"
      @input="$emit('update:modelValue', $event.target.value)"
  /></label>
</template>
<script setup>
defineProps({
  label: String,
  modelValue: [String, Number],
  type: { type: String, default: "text" },
  placeholder: String,
  required: Boolean,
  autocomplete: String,
  disabled: Boolean,
});
defineEmits(["update:modelValue"]);
</script>
