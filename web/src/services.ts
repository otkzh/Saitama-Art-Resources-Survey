import type { Dataset, Location, MapConfig } from './types';
import { safeHttps } from './domain';

export const localAsset = (path:string) => `${import.meta.env.BASE_URL}${path}`;
export async function loadContent(signal?:AbortSignal):Promise<{dataset:Dataset;config:MapConfig}> {
  const [dataResponse,configResponse] = await Promise.all([
    fetch(localAsset('data/spots.json'),{signal,cache:'no-cache'}),
    fetch(localAsset('config.json'),{signal,cache:'no-cache'}),
  ]);
  if(!dataResponse.ok || !configResponse.ok) throw Error('データを取得できませんでした。時間をおいて再度お試しください。');
  const dataset:Dataset=await dataResponse.json(), config:MapConfig=await configResponse.json();
  if(!Array.isArray(dataset.spots) || !['review','release'].includes(dataset.mode)) throw Error('スポットデータの形式を確認してください。');
  if(config.addressSearch?.enabled && !safeHttps(config.addressSearch.endpoint)) throw Error('住所検索の設定を確認してください。');
  return {dataset,config};
}
export async function searchAddress(endpoint:string, query:string, signal:AbortSignal):Promise<Location[]> {
  const url=new URL(endpoint); url.searchParams.set('q',query.trim());
  const response=await fetch(url,{signal,credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok) throw Error('住所検索に接続できませんでした。');
  const results:unknown=await response.json();
  if(!Array.isArray(results)) throw Error('住所検索の応答を読み取れませんでした。');
  return results.flatMap(r=>{
    const point=r?.geometry?.coordinates, label=r?.properties?.title;
    if(!Array.isArray(point)||typeof point[0]!=='number'||typeof point[1]!=='number'||!Number.isFinite(point[0])||!Number.isFinite(point[1])||Math.abs(point[0])>180||Math.abs(point[1])>90||typeof label!=='string') return [];
    return [{lat:point[1],lon:point[0],label}];
  }).slice(0,10);
}
export function locate():Promise<Location> {
  return new Promise((resolve,reject)=>{
    if(!window.isSecureContext || !navigator.geolocation) { reject(Error('現在地はHTTPSで位置情報を利用できる環境でお試しください。')); return; }
    navigator.geolocation.getCurrentPosition(
      ({coords:c})=>resolve({lat:c.latitude,lon:c.longitude,label:'現在地',accuracy:c.accuracy}),
      error=>reject(Error(error.code===1?'位置情報の利用が許可されていません。住所・区・キーワードからも探せます。':error.code===3?'現在地の取得がタイムアウトしました。再度お試しください。':'現在地を取得できませんでした。端末の位置情報設定を確認してください。')),
      {enableHighAccuracy:true,timeout:12000,maximumAge:60000},
    );
  });
}
