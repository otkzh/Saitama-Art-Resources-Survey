import {test,expect,type Page} from '@playwright/test';
import {BASEMAPS,STORAGE_KEY} from '../../web/src/maps/basemaps';

const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
async function fixtureMaps(page:Page) {
  await page.route('https://tiles.openfreemap.org/**',route=>route.fulfill({json:{
    version:8,sources:{},layers:[{id:'fixture-background',type:'background',paint:{'background-color':route.request().url().endsWith('dark')?'#222d36':'#e9e7df'}}],
  }}));
  await page.route('https://cyberjapandata.gsi.go.jp/**',route=>route.fulfill({contentType:'image/png',body:pixel}));
}
async function choose(page:Page,id:string) {
  const base=BASEMAPS.find(b=>b.id===id)!;
  await page.locator('.basemap-toggle').click();
  if(!base.primary&&await page.locator('.basemap-more').getAttribute('aria-expanded')!=='true')await page.locator('.basemap-more').click();
  await page.getByRole('button',{name:base.fullLabel,exact:true}).click();
  await expect(page.locator('.map-panel')).toHaveAttribute('data-basemap-id',id);
  await expect(page.locator('.map-panel')).toHaveAttribute('data-basemap-status','ready');
}
test.beforeEach(async({page})=>{await fixtureMaps(page);});
test('6種類の全組み合わせで切り替えても位置・マーカー・検索結果を保持する',async({page})=>{
  test.setTimeout(90000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('./');
  await expect(page.locator('.map-panel')).toHaveAttribute('data-basemap-id','positron');
  await expect(page.locator('.map-panel')).toHaveAttribute('data-basemap-status','ready');
  const positions=()=>page.locator('.map-pin-shell').evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).style.transform));
  const original=await positions();expect(original).toHaveLength(26);
  for(const from of BASEMAPS) {
    await choose(page,from.id);
    for(const to of BASEMAPS) {
      await choose(page,to.id);
      expect(await positions()).toEqual(original);
      await expect(page.locator('.spot-card')).toHaveCount(26);
      expect(await page.locator('.leaflet-basemap-pane').evaluate(el=>el.children.length)).toBe(1);
      await expect(page.locator('.leaflet-control-attribution')).toContainText(to.kind==='vector'?'OpenStreetMap contributors':'地理院タイル');
      await choose(page,from.id);
    }
  }
  await page.locator('.spot-card').last().click();
  await expect(page.locator('.leaflet-popup-content strong')).toContainText('大西屋');
  await choose(page,'liberty');
  await expect(page.locator('.leaflet-popup-content strong')).toContainText('大西屋');
  await page.getByRole('button',{name:'一覧へ戻る'}).click();
  await page.getByRole('searchbox',{name:'キーワードから探す'}).fill('さきっちょ');
  // Article text is also searchable; two articles mention this spot.
  await expect(page.locator('.spot-card')).toHaveCount(2);
  const matches=await page.locator('.spot-card').allTextContents();
  await choose(page,'std');expect(await page.locator('.spot-card').allTextContents()).toEqual(matches);
  expect(errors).toEqual([]);
  await page.screenshot({path:`dist/basemaps-${test.info().project.name}.png`,fullPage:true});
});
test('保存・再訪・無効値・キーボード・ストレージ拒否に対応する',async({page})=>{
  await page.goto('./');await choose(page,'dark');await page.reload();
  await expect(page.locator('.map-panel')).toHaveAttribute('data-basemap-id','dark');
  await page.evaluate(key=>localStorage.setItem(key,'invalid'),STORAGE_KEY);await page.reload();
  await expect(page.locator('.map-panel')).toHaveAttribute('data-basemap-id','positron');
  await page.locator('.basemap-toggle').focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('region',{name:'背景地図を選択'})).toBeVisible();
  await page.getByRole('button',{name:'街歩き',exact:true}).focus();await page.keyboard.press('Enter');
  await expect(page.locator('.map-panel')).toHaveAttribute('data-basemap-id','liberty');
  await page.locator('.basemap-toggle').click();await page.keyboard.press('Escape');
  await expect(page.getByRole('region',{name:'背景地図を選択'})).toHaveCount(0);await expect(page.locator('.basemap-toggle')).toBeFocused();
  await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('Storage disabled for test');}}));
  await page.reload();await expect(page.locator('.map-panel')).toHaveAttribute('data-basemap-id','positron');
  await choose(page,'pale');await expect(page.locator('.spot-card')).toHaveCount(26);
});
test('スタイル失敗時は淡色へ一度だけ切り替える',async({page})=>{
  let styles=0;
  await page.route('https://tiles.openfreemap.org/**',route=>{styles++;return route.abort();});
  await page.goto('./');
  await expect(page.locator('.map-panel')).toHaveAttribute('data-basemap-id','pale');
  await expect(page.locator('.map-panel')).toHaveAttribute('data-basemap-status','ready');
  await expect(page.locator('.map-message')).toContainText('切り替えました');expect(styles).toBe(1);
  await expect(page.locator('.spot-card')).toHaveCount(26);
  expect(await page.locator('.leaflet-gl-layer').count()).toBe(0);
});
test('スタイルと淡色が両方失敗しても再試行を繰り返さず一覧を保持する',async({page})=>{
  let styles=0;
  await page.route('https://tiles.openfreemap.org/**',route=>{styles++;return route.abort();});
  await page.route('https://cyberjapandata.gsi.go.jp/**',route=>route.abort());
  await page.goto('./');
  await expect(page.locator('.map-panel')).toHaveAttribute('data-basemap-id','pale');
  await expect(page.locator('.map-panel')).toHaveAttribute('data-basemap-status','error',{timeout:20000});
  expect(styles).toBe(1);await expect(page.locator('.spot-card')).toHaveCount(26);
  expect(await page.locator('.leaflet-gl-layer').count()).toBe(0);
});
