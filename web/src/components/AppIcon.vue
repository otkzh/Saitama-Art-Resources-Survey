<script setup lang="ts">
defineProps<{ name: 'search' | 'locate' | 'arrow' | 'close' | 'pin' | 'filter' | 'external' | 'back' | 'plus'; size?: number }>();
const paths = {
  search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  locate:'M12 2v3m0 14v3M2 12h3m14 0h3M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  arrow:'M5 12h14m-6-6 6 6-6 6', close:'m6 6 12 12M18 6 6 18',
  pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  filter:'M3 6h18M6 12h12M9 18h6', external:'M14 3h7v7m0-7L10 14M10 3H3v18h18v-7',
  back:'M19 12H5m6-6-6 6 6 6', plus:'M12 5v14M5 12h14',
};
</script>
<template><svg :width="size || 18" :height="size || 18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name]" /></svg></template>
