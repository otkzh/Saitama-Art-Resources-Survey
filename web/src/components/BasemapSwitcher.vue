<script setup lang="ts">
import { ref } from 'vue';
import { BASEMAPS, getBasemap, type BasemapId } from '../maps/basemaps';
const props=defineProps<{modelValue:BasemapId;loading:boolean}>();
const emit=defineEmits<{'update:modelValue':[id:BasemapId]}>();
const open=ref(false),more=ref(false),toggle=ref<HTMLButtonElement>();
function close() { open.value=false;toggle.value?.focus(); }
function choose(id:BasemapId) { emit('update:modelValue',id);close(); }
</script>
<template>
  <div class="basemap-switcher" @keydown.esc.stop.prevent="close">
    <button ref="toggle" class="basemap-toggle" type="button" :aria-expanded="open" aria-controls="basemap-options" @click="open=!open">
      <span class="basemap-swatch" :class="`preview-${getBasemap(modelValue).preview}`" aria-hidden="true"/>
      <span><small>背景地図</small><b>{{getBasemap(modelValue).label}}</b></span><span aria-hidden="true">{{open?'−':'＋'}}</span>
    </button>
    <section v-if="open" id="basemap-options" class="basemap-options" aria-label="背景地図を選択">
      <div class="basemap-grid" role="group" aria-label="主な背景地図">
        <button v-for="base in BASEMAPS.filter(b=>b.primary)" :key="base.id" type="button" :aria-pressed="modelValue===base.id" :aria-label="base.fullLabel" @click="choose(base.id)">
          <span class="basemap-swatch" :class="`preview-${base.preview}`" aria-hidden="true"/><span>{{base.label}}<span v-if="modelValue===base.id" class="basemap-check" aria-hidden="true">✓</span></span>
        </button>
      </div>
      <button class="basemap-more" type="button" :aria-expanded="more" aria-controls="basemap-extra" @click="more=!more">その他の背景地図 <span aria-hidden="true">{{more?'−':'＋'}}</span></button>
      <div v-if="more" id="basemap-extra" class="basemap-grid" role="group" aria-label="その他の背景地図">
        <button v-for="base in BASEMAPS.filter(b=>!b.primary)" :key="base.id" type="button" :aria-pressed="modelValue===base.id" @click="choose(base.id)">
          <span class="basemap-swatch" :class="`preview-${base.preview}`" aria-hidden="true"/><span>{{base.label}}<span v-if="modelValue===base.id" class="basemap-check" aria-hidden="true">✓</span></span>
        </button>
      </div>
    </section>
    <span class="sr-only" role="status">{{getBasemap(props.modelValue).fullLabel}}{{loading?'を読み込み中':'を選択中'}}</span>
  </div>
</template>
