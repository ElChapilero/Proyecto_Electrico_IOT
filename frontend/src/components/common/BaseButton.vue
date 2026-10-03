<template><button class="btn" :class="`btn-${variant}`" :type="type" :disabled="disabled"><slot /></button></template>
<script setup>defineProps({ variant:{type:String,default:'primary'}, type:{type:String,default:'button'}, disabled:Boolean });</script>
