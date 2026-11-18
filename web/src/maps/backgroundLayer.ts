import L from 'leaflet';
import { basemapAttribution, FALLBACK_BASEMAP, getBasemap, type BasemapId, type Basemap } from './basemaps';

export interface BackgroundEvents { ready():void; error(fatal?:boolean):void }
export interface BackgroundHandle { layer:L.Layer; mount(map:L.Map,events:BackgroundEvents):void; destroy(map:L.Map):void }
export interface BackgroundState { id:BasemapId; status:'loading'|'ready'|'error'; message:string }
type Factory=(def:Basemap)=>Promise<BackgroundHandle>;
export async function createBackground(def:Basemap):Promise<BackgroundHandle> {
  if(def.kind==='vector') return (await import('./vectorBasemap')).createVectorBasemap(def);
  const layer=L.tileLayer(def.url,{pane:'basemapPane',minZoom:2,maxZoom:18,maxNativeZoom:18});
  let detach=()=>{};
  return {
    layer,
    mount(map,events) {
      let loaded=0,failed=0;
      const loading=()=>{loaded=0;failed=0;};
      const tileLoaded=()=>{loaded++;};
      const error=()=>{failed++;events.error(false);};
      const ready=()=>{if(loaded>0){events.ready();if(failed>0)events.error(false);}};
      layer.on('loading',loading);layer.on('tileload',tileLoaded);layer.on('load',ready);layer.on('tileerror',error);
      detach=()=>{layer.off('loading',loading);layer.off('tileload',tileLoaded);layer.off('load',ready);layer.off('tileerror',error);};
      layer.addTo(map);
    },
    destroy(map) { detach(); if(map.hasLayer(layer))map.removeLayer(layer); },
  };
}

/** Owns one background only. It never changes the camera or touches overlay layers. */
export class BackgroundLayer {
  private active?:BackgroundHandle;
  private serial=0;
  private attribution='';
  private timeout?:ReturnType<typeof setTimeout>;
  private errorTimer?:ReturnType<typeof setTimeout>;
  private id:BasemapId='positron';
  private destroyed=false;
  private readonly updateCredits=()=>this.setCredits();
  constructor(private map:L.Map,private changed:(state:BackgroundState)=>void,private factory:Factory=createBackground) {
    const pane=map.getPane('basemapPane')||map.createPane('basemapPane');
    pane.style.zIndex='200';pane.style.pointerEvents='none';
    map.on('zoomend',this.updateCredits);
  }
  private setCredits() {
    const credit=basemapAttribution(this.id,this.map.getZoom());
    if(credit===this.attribution)return;
    if(this.attribution)this.map.attributionControl?.removeAttribution(this.attribution);
    this.attribution=credit;this.map.attributionControl?.addAttribution(credit);
  }
  private clearTimers() { clearTimeout(this.timeout);clearTimeout(this.errorTimer); }
  async select(id:BasemapId,fallback=false,notice=''):Promise<void> {
    if(this.destroyed)return;
    const serial=++this.serial;
    this.clearTimers();this.active?.destroy(this.map);this.active=undefined;
    this.id=id;this.setCredits();this.changed({id,status:'loading',message:notice});
    let healthy=false,errors=0,failed=false;
    const fail=()=>{
      if(this.destroyed||serial!==this.serial||failed)return;
      failed=true;this.clearTimers();
      if(!fallback&&id!==FALLBACK_BASEMAP) {
        void this.select(FALLBACK_BASEMAP,true,`${getBasemap(id).fullLabel}を読み込めませんでした。地理院 淡色に切り替えています。`);
      } else this.changed({id,status:'error',message:'背景地図を取得できません。別の背景地図を選ぶか、スポット一覧をご利用ください。'});
    };
    // Covers style/module loading too; only one automatic fallback per user choice.
    this.timeout=setTimeout(fail,15000);
    try {
      const handle=await this.factory(getBasemap(id));
      if(this.destroyed||serial!==this.serial) { handle.destroy(this.map);return; }
      this.active=handle;
      handle.mount(this.map,{
        ready:()=>{
          if(this.destroyed||serial!==this.serial)return;
          healthy=true;errors=0;this.clearTimers();
          this.changed({id,status:'ready',message:notice?notice.replace('切り替えています。','切り替えました。'):''});
        },
        error:(fatal=false)=>{
          if(this.destroyed||serial!==this.serial)return;
          if(fatal) { queueMicrotask(fail);return; }
          errors++;
          this.changed({id,status:healthy?'ready':'loading',message:'背景地図の一部を取得できません。スポット一覧は引き続きご利用いただけます。'});
          clearTimeout(this.errorTimer);
          this.errorTimer=setTimeout(()=>{if(!healthy&&errors>=3)fail();},1000);
        },
      });
    } catch { fail(); }
  }
  destroy() {
    this.destroyed=true;this.serial++;this.clearTimers();this.active?.destroy(this.map);this.active=undefined;
    this.map.off('zoomend',this.updateCredits);
    if(this.attribution)this.map.attributionControl?.removeAttribution(this.attribution);
  }
}
