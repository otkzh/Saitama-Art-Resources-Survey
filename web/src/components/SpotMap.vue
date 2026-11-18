<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import L from 'leaflet';
import type { SearchResult, Location, MapConfig } from '../types';
import { CATEGORY_COLORS, safeHttps } from '../domain';

const props = defineProps<{ spots:SearchResult[]; selectedId:string; origin:Location|null; config:MapConfig }>();
const emit = defineEmits<{ select:[id:string] }>();
const canvas = ref<HTMLElement>();
const tileFailed = ref(false);
let map:L.Map|undefined, points:L.LayerGroup, originLayer:L.LayerGroup, resizeObserver:ResizeObserver;
let markers = new Map<string,L.Marker>();
function render() {
  if (!map) return;
  points.clearLayers(); originLayer.clearLayers(); markers.clear();
  const bounds:L.LatLngTuple[] = [];
  props.spots.forEach(s=>{
    const color = CATEGORY_COLORS[s.category] || '#59636b';
    const node = document.createElement('span'); node.className='map-pin'; node.style.setProperty('--pin-color',color);
    const popup = document.createElement('div'); const name = document.createElement('strong'); name.textContent=s.name; popup.append(name);
    const address = document.createElement('p'); address.textContent=s.address; popup.append(address);
    const icon = L.divIcon({html:node,className:'map-pin-shell',iconSize:[28,36],iconAnchor:[14,34],popupAnchor:[0,-28]});
    const marker=L.marker([s.lat,s.lon],{icon,title:s.name,alt:`${s.name}の位置`,keyboard:true}).addTo(points).bindPopup(popup);
    marker.on('click',()=>emit('select',s.id)); markers.set(s.id,marker); bounds.push([s.lat,s.lon]);
  });
  if (props.origin) {
    const o=props.origin; bounds.push([o.lat,o.lon]);
    L.circleMarker([o.lat,o.lon],{radius:8,color:'#fffdf8',weight:3,fillColor:'#176f8c',fillOpacity:1}).addTo(originLayer).bindTooltip(o.label);
    if(o.accuracy) L.circle([o.lat,o.lon],{radius:o.accuracy,color:'#176f8c',weight:1,fillOpacity:0.08,interactive:false}).addTo(originLayer);
  }
  if(bounds.length>1) map.fitBounds(bounds,{padding:[35,35],maxZoom:14});
  else if(bounds.length) map.setView(bounds[0],14);
  // Keep the previous geographic context when a filter has no matches.
  highlight();
}
function highlight() {
  markers.forEach((marker,id)=>{
    marker.getElement()?.classList.toggle('is-selected',id===props.selectedId);
    marker.setZIndexOffset(id===props.selectedId?1000:0);
  });
}
onMounted(()=>{
  map=L.map(canvas.value!,{scrollWheelZoom:true}).setView([35.89,139.65],11);
  // Attribution is constructed locally instead of accepting arbitrary HTML from config.
  const attribution=document.createElement('a');attribution.href=safeHttps(props.config.tileAttributionUrl);attribution.textContent=props.config.tileAttribution;attribution.target='_blank';attribution.rel='noopener noreferrer';
  L.tileLayer(props.config.tileUrl, { maxZoom:props.config.maxZoom,
    attribution:attribution.outerHTML,
  }).on('tileerror',()=>{tileFailed.value=true;}).addTo(map);
  points=L.layerGroup().addTo(map); originLayer=L.layerGroup().addTo(map);
  resizeObserver=new ResizeObserver(()=>map?.invalidateSize()); resizeObserver.observe(canvas.value!);
  render();
});
watch(()=>[props.spots.map(s=>s.id).join(','),props.origin?.lat,props.origin?.lon,props.origin?.accuracy,props.origin?.label],render);
watch(()=>props.selectedId,()=>{
  highlight();
  const marker=markers.get(props.selectedId);
  if(marker&&map) { map.flyTo(marker.getLatLng(),Math.max(map.getZoom(),15),{duration:0.45}); marker.openPopup(); }
  else map?.closePopup();
});
onBeforeUnmount(()=>{ resizeObserver?.disconnect(); map?.remove(); });
</script>
<template>
  <section class="map-panel" aria-label="スポット地図">
    <div ref="canvas" class="map-canvas" aria-label="さいたま市のスポット位置" />
    <p v-if="tileFailed" class="map-message" role="status">背景地図を取得できません。スポット一覧は引き続きご利用いただけます。</p>
    <span class="map-caption">色：カテゴリ<span v-if="origin"> ／ 青：検索起点</span></span>
  </section>
</template>
