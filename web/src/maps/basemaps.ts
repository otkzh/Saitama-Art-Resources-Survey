/** Background catalog. URLs, labels and attribution live here, not in the UI. */
export const BASEMAPS = [
  { id:'positron', label:'シンプル', fullLabel:'シンプル', kind:'vector', preview:'simple', primary:true,
    url:'https://tiles.openfreemap.org/styles/positron', provider:'OpenFreeMap', providerUrl:'https://openfreemap.org/' },
  { id:'liberty', label:'街歩き', fullLabel:'街歩き', kind:'vector', preview:'streets', primary:true,
    url:'https://tiles.openfreemap.org/styles/liberty', provider:'OpenFreeMap', providerUrl:'https://openfreemap.org/' },
  { id:'pale', label:'地理院', fullLabel:'地理院 淡色', kind:'raster', preview:'pale', primary:true,
    url:'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', provider:'地理院タイル', providerUrl:'https://maps.gsi.go.jp/development/ichiran.html' },
  { id:'seamlessphoto', label:'航空写真', fullLabel:'航空写真', kind:'raster', preview:'photo', primary:true,
    url:'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg', provider:'地理院タイル', providerUrl:'https://maps.gsi.go.jp/development/ichiran.html' },
  { id:'std', label:'地理院 標準', fullLabel:'地理院 標準', kind:'raster', preview:'standard', primary:false,
    url:'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', provider:'地理院タイル', providerUrl:'https://maps.gsi.go.jp/development/ichiran.html' },
  { id:'dark', label:'ダーク', fullLabel:'ダーク', kind:'vector', preview:'dark', primary:false,
    url:'https://tiles.openfreemap.org/styles/dark', provider:'OpenFreeMap', providerUrl:'https://openfreemap.org/' },
] as const;
export type Basemap = typeof BASEMAPS[number];
export type BasemapId = Basemap['id'];
export const DEFAULT_BASEMAP:BasemapId = 'positron';
export const FALLBACK_BASEMAP:BasemapId = 'pale';
export const STORAGE_KEY = 'saitama-art-map.basemap.v1';
export function isBasemapId(value:unknown):value is BasemapId { return BASEMAPS.some(b=>b.id===value); }
export function getBasemap(id:BasemapId):Basemap { return BASEMAPS.find(b=>b.id===id)!; }
export interface PreferenceStore { getItem(key:string):string|null; setItem(key:string,value:string):void }
export function readPreference(store?:PreferenceStore):BasemapId {
  try { const value=store?.getItem(STORAGE_KEY); return isBasemapId(value)?value:DEFAULT_BASEMAP; } catch { return DEFAULT_BASEMAP; }
}
export function savePreference(store:PreferenceStore|undefined,id:BasemapId):void {
  try { store?.setItem(STORAGE_KEY,id); } catch { /* Private browsing or storage policy must not disable the map. */ }
}
const link=(url:string,label:string)=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
export function basemapAttribution(id:BasemapId,zoom:number):string {
  const def=getBasemap(id);
  if(def.kind==='vector') return [link('https://openfreemap.org/','OpenFreeMap'),link('https://www.openmaptiles.org/','© OpenMapTiles'),link('https://www.openstreetmap.org/copyright','© OpenStreetMap contributors')].join(' | ');
  let text=link(def.providerUrl,'地理院タイル');
  if(id==='pale'&&zoom<=8) text+=' | Shoreline data: United States, National Imagery and Mapping Agency, Vector Map Level 0 (VMAP0), 1997';
  if(id==='seamlessphoto') {
    if(zoom<=8) text+=' | Images on 世界衛星モザイク画像: NASA LP DAAC / USGS EROS';
    else if(zoom<=13) text+=' | データソース：Landsat8画像（GSI,TSIC,GEO Grid/AIST）, Landsat8画像（courtesy of the U.S. Geological Survey）, 海底地形（GEBCO）';
    else text+=` | ${link('https://maps.gsi.go.jp/development/ichiran.html#seamlessphoto','航空写真の出典')}（一部地域：GRUS画像 © Axelspace）`;
  }
  return text;
}
