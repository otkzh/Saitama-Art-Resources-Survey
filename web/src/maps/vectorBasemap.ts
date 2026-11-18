import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import type L from 'leaflet';
import type { Basemap } from './basemaps';
import type { BackgroundHandle, BackgroundEvents } from './backgroundLayer';

// A local worker keeps the ZIP relocatable, without CDN scripts or blob workers.
setWorkerUrl(workerUrl);
export function createVectorBasemap(def:Basemap):BackgroundHandle {
  const probe=document.createElement('canvas');
  const context=probe.getContext('webgl2');
  if(!context) throw Error('WebGL2を利用できません');
  context.getExtension('WEBGL_lose_context')?.loseContext();
  const options={style:def.url,pane:'basemapPane',interactive:false,attributionControl:false as const,renderWorldCopies:true};
  const layer=maplibreGL(options);
  let detach=()=>{};
  return {
    layer,
    mount(map:L.Map,events:BackgroundEvents) {
      layer.addTo(map);
      const gl=layer.getMaplibreMap();
      const ready=()=>events.ready();
      const error=(event:{type:string;sourceId?:string;tile?:unknown})=>events.error(!event.sourceId&&!event.tile);
      const lost=()=>events.error(true);
      // idle also waits for visible tiles and rendering, unlike initial style load.
      gl.on('idle',ready); gl.on('error',error); gl.on('webglcontextlost',lost);
      detach=()=>{gl.off('idle',ready);gl.off('error',error);gl.off('webglcontextlost',lost);};
    },
    destroy(map:L.Map) { detach(); if(map.hasLayer(layer))map.removeLayer(layer); },
  };
}
