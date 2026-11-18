import { describe,it,expect } from 'vitest';
import { distanceBetween, emptyFilters, filterSpots, normalize, routeUrl, safeHttps } from '../web/src/domain';
import { mayPublish } from '../scripts/publication';
import type { Spot } from '../web/src/types';

const spot=(id:string,extra:Partial<Spot>={}):Spot=>({id,name:'アート ＣＡＦＥ',tagline:'',category:'ギャラリー・展示施設',tags:['展示'],ward:'浦和区',address:'さいたま市浦和区',lat:35.86,lon:139.65,year:'2024年度',title:'',subtitle:'',body:'木工体験',sections:[],images:[],info:{},source:'https://example.com/',rights:'',...extra});
describe('検索',()=>{
  it('全角英数字・大文字・余分な空白を正規化する',()=>{expect(normalize(' ＣＡＦＥ　ART ')).toBe('cafe art');});
  it('キーワードは空白区切りAND、区・カテゴリとも組み合わせる',()=>{
    const f=emptyFilters(); f.query='cafe 木工';f.ward='浦和区';
    expect(filterSpots([spot('1'),spot('2',{ward:'大宮区'}),spot('3',{body:'音楽'})],f).map(s=>s.id)).toEqual(['1']);
  });
  it('複数タグはOR、カテゴリ等とはANDになる',()=>{
    const f=emptyFilters();f.tags=['本','展示'];f.category='ギャラリー・展示施設';
    expect(filterSpots([spot('1'),spot('2',{tags:['本']}),spot('3',{tags:['音楽']}),spot('4',{category:'書店・ショップ',tags:['本']})],f).map(s=>s.id)).toEqual(['1','2']);
  });
  it('近い順に並べ、範囲外を除き、起点を解除すると距離条件を無視する',()=>{
    const f=emptyFilters();f.origin={lat:35.86,lon:139.65,label:'起点'};f.radius=1000;
    const spots=[spot('1',{lat:35.9}),spot('2',{lat:35.861}),spot('3')];
    expect(filterSpots(spots,f).map(s=>s.id)).toEqual(['3','2']);
    f.origin=null;expect(filterSpots(spots,f)).toHaveLength(3);
  });
  it('0件を返し、条件解除後はすべて返す',()=>{const f=emptyFilters();f.query='見つからない';expect(filterSpots([spot('1')],f)).toHaveLength(0);expect(filterSpots([spot('1')],emptyFilters())).toHaveLength(1);});
  it('距離は同一地点で0、緯度1度で約111km',()=>{expect(distanceBetween({lat:0,lon:0},{lat:0,lon:0})).toBe(0);expect(distanceBetween({lat:0,lon:0},{lat:1,lon:0})).toBeCloseTo(111195,-1);});
  it('リンクはHTTPSに制限し、経路に目的地と検索起点を設定する',()=>{expect(safeHttps('javascript:alert(1)')).toBe('');expect(safeHttps('http://example.com')).toBe('');const u=new URL(routeUrl(spot('1'),{lat:35,lon:139,label:'起点'}));expect(u.searchParams.get('origin')).toBe('35,139');expect(u.searchParams.get('travelmode')).toBe('walking');});
});
describe('掲載判定',()=>{
  it('未連絡・掲載不可・不明のIDはどのモードでも除外',()=>{
    for(const mode of ['review','release'] as const) {
      expect(mayPublish(undefined,mode)).toBe(false);
      for(const status of ['pending-contact','denied'] as const)expect(mayPublish({id:'5',status,evidence:'連絡記録'},mode)).toBe(false);
    }
  });
  it('確認用対象を許可済みに昇格させない',()=>{const r={id:'1',status:'remaining-in-review' as const,evidence:''};expect(mayPublish(r,'review')).toBe(true);expect(mayPublish(r,'release')).toBe(false);});
  it('許可済みでも確認記録がなければ公開しない',()=>{expect(mayPublish({id:'1',status:'approved',evidence:''},'release')).toBe(false);expect(mayPublish({id:'1',status:'approved',evidence:'担当者による確認記録'},'release')).toBe(true);});
});
