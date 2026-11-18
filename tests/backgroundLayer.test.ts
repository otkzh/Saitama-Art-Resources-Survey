import {afterEach,describe,it,expect,vi} from 'vitest';
// Leaflet's browser import is unnecessary for testing the lifecycle controller.
vi.mock('leaflet',()=>({default:{}}));
import type L from 'leaflet';
import {BackgroundLayer,type BackgroundHandle,type BackgroundEvents,type BackgroundState} from '../web/src/maps/backgroundLayer';
import type {Basemap} from '../web/src/maps/basemaps';

function setup() {
  const handles:{id:string;events:BackgroundEvents;destroy:ReturnType<typeof vi.fn>}[]=[];
  const map={getPane:()=>({style:{}}),on:vi.fn(),off:vi.fn(),getZoom:()=>12,attributionControl:{addAttribution:vi.fn(),removeAttribution:vi.fn()},setView:vi.fn(),fitBounds:vi.fn()};
  const states:BackgroundState[]=[];
  const factory=vi.fn(async(def:Basemap):Promise<BackgroundHandle>=>{
    const h={id:def.id,events:{} as BackgroundEvents,destroy:vi.fn()};handles.push(h);
    return {layer:{} as L.Layer,mount:(_,events)=>{h.events=events;},destroy:h.destroy};
  });
  const controller=new BackgroundLayer(map as unknown as L.Map,state=>states.push(state),factory);
  return {controller,map,states,handles,factory};
}
afterEach(()=>vi.useRealTimers());
describe('背景レイヤーのライフサイクル',()=>{
  it('旧背景だけを破棄し、中心・ズーム・オーバーレイを変更しない',async()=>{
    const {controller,map,handles}=setup();await controller.select('positron');await controller.select('pale');
    expect(handles[0].destroy).toHaveBeenCalledTimes(1);expect(handles[1].destroy).not.toHaveBeenCalled();
    expect(map.setView).not.toHaveBeenCalled();expect(map.fitBounds).not.toHaveBeenCalled();
    controller.destroy();expect(handles[1].destroy).toHaveBeenCalledTimes(1);expect(map.off).toHaveBeenCalledWith('zoomend',expect.any(Function));
  });
  it('旧背景の遅延エラーを無視する',async()=>{
    const {controller,handles,states}=setup();await controller.select('positron');await controller.select('std');
    handles[0].events.error(true);await Promise.resolve();expect(states.at(-1)?.id).toBe('std');controller.destroy();
  });
  it('重大な失敗は淡色へ一度だけフォールバックし、淡色の失敗でループしない',async()=>{
    vi.useFakeTimers();const {controller,handles,states,factory}=setup();await controller.select('dark');
    handles[0].events.error(true);await vi.advanceTimersByTimeAsync(0);
    expect(states.at(-1)?.id).toBe('pale');handles[1].events.error(true);await vi.advanceTimersByTimeAsync(60000);
    expect(factory).toHaveBeenCalledTimes(2);expect(states.at(-1)?.status).toBe('error');controller.destroy();
  });
  it('一時的なタイルエラー1件で切り替えず、回復したら案内を解除する',async()=>{
    vi.useFakeTimers();const {controller,handles,states,factory}=setup();await controller.select('std');
    handles[0].events.error();await vi.advanceTimersByTimeAsync(1000);expect(factory).toHaveBeenCalledTimes(1);
    handles[0].events.ready();expect(states.at(-1)?.message).toBe('');await vi.advanceTimersByTimeAsync(20000);expect(factory).toHaveBeenCalledTimes(1);controller.destroy();
  });
  it('複数タイルの初期失敗と読み込み時間切れに上限を設ける',async()=>{
    vi.useFakeTimers();const {controller,handles,states}=setup();await controller.select('std');
    handles[0].events.error();handles[0].events.error();handles[0].events.error();await vi.advanceTimersByTimeAsync(1000);
    expect(states.at(-1)?.id).toBe('pale');await vi.advanceTimersByTimeAsync(15000);expect(states.at(-1)?.status).toBe('error');controller.destroy();
  });
});
