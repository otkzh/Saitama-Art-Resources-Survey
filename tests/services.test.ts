import { afterEach,describe,it,expect,vi } from 'vitest';
import { searchAddress } from '../web/src/services';

afterEach(()=>vi.unstubAllGlobals());
describe('住所検索',()=>{
  it('住所をクエリへエンコードし、妥当な候補だけを返す',async()=>{
    const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>[
      {geometry:{coordinates:[139.65,35.86]},properties:{title:'さいたま市浦和区'}},
      {geometry:{coordinates:[999,35.86]},properties:{title:'不正な候補'}},
      {geometry:{coordinates:['139.65',35.86]},properties:{title:'不正な型'}},
      {properties:{title:'座標なし'}},
    ]});vi.stubGlobal('fetch',fetcher);
    const results=await searchAddress('https://example.com/address','さいたま市',new AbortController().signal);
    expect(results).toEqual([{lat:35.86,lon:139.65,label:'さいたま市浦和区'}]);
    expect(new URL(fetcher.mock.calls[0][0]).searchParams.get('q')).toBe('さいたま市');
  });
  it('エラー応答と不正な応答を区別する',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false}));
    await expect(searchAddress('https://example.com','x',new AbortController().signal)).rejects.toThrow('接続');
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({})}));
    await expect(searchAddress('https://example.com','x',new AbortController().signal)).rejects.toThrow('応答');
  });
});
