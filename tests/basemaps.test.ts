import {describe,it,expect} from 'vitest';
import {BASEMAPS,DEFAULT_BASEMAP,STORAGE_KEY,readPreference,savePreference,basemapAttribution} from '../web/src/maps/basemaps';

describe('背景地図設定',()=>{
  it('指定された6種類だけを定義し、通常表示は4種類',()=>{
    expect(BASEMAPS.map(b=>b.id)).toEqual(['positron','liberty','pale','seamlessphoto','std','dark']);
    expect(BASEMAPS.filter(b=>b.primary)).toHaveLength(4);
    expect(new Set(BASEMAPS.map(b=>b.url)).size).toBe(6);
  });
  it('保存なし・無効な値・ストレージ利用拒否時はPositronに戻す',()=>{
    for(const value of [null,'obsolete','__proto__',''])expect(readPreference({getItem:()=>value,setItem:()=>{}})).toBe(DEFAULT_BASEMAP);
    expect(readPreference({getItem:()=>{throw Error('denied');},setItem:()=>{}})).toBe(DEFAULT_BASEMAP);
    expect(readPreference()).toBe(DEFAULT_BASEMAP);
  });
  it('有効な設定だけを復元し、保存不能でも例外を伝播しない',()=>{
    let saved='';const store={getItem:()=>saved,setItem:(key:string,v:string)=>{expect(key).toBe(STORAGE_KEY);saved=v;}};
    savePreference(store,'dark');expect(readPreference(store)).toBe('dark');
    expect(()=>savePreference({getItem:()=>null,setItem:()=>{throw Error('quota');}},'pale')).not.toThrow();
  });
  it('OSM由来の3種類すべてにOpenFreeMap・OpenMapTiles・OSMを明示',()=>{
    for(const id of ['positron','liberty','dark'] as const) {
      const credit=basemapAttribution(id,12);expect(credit).toContain('OpenStreetMap contributors');expect(credit).toContain('OpenMapTiles');expect(credit).toContain('OpenFreeMap');
    }
  });
  it('地理院と航空写真のズームごとの出典を切り替える',()=>{
    expect(basemapAttribution('std',12)).toContain('地理院タイル');
    expect(basemapAttribution('pale',7)).toContain('VMAP0');
    expect(basemapAttribution('pale',12)).not.toContain('VMAP0');
    expect(basemapAttribution('seamlessphoto',8)).toContain('NASA');
    expect(basemapAttribution('seamlessphoto',12)).toContain('Landsat8');
    expect(basemapAttribution('seamlessphoto',16)).toContain('Axelspace');
  });
});
