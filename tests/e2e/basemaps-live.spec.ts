import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {BASEMAPS} from '../../web/src/maps/basemaps';

// Opt-in only: don't make normal CI rely on availability of public tile servers.
test('公式サービスのライブ表示確認',async({page})=>{
  test.skip(!process.env.LIVE_BASEMAPS,'LIVE_BASEMAPS=1 の場合のみ公式サービスへ接続');
  test.setTimeout(150000);
  const responses:{url:string;status:number;cache:string|undefined}[]=[],errors:string[]=[];
  page.on('response',r=>{
    if(/tiles\.openfreemap\.org|cyberjapandata\.gsi\.go\.jp/.test(r.url()))responses.push({url:r.url(),status:r.status(),cache:r.headers()['cache-control']});
  });
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');await expect(page.locator('.spot-card')).toHaveCount(26);
  const results=[];
  for(const base of BASEMAPS) {
    if(base.id!=='positron') {
      await page.locator('.basemap-toggle').click();
      if(!base.primary&&await page.locator('.basemap-more').getAttribute('aria-expanded')!=='true')await page.locator('.basemap-more').click();
      await page.getByRole('button',{name:base.fullLabel,exact:true}).click();
    }
    await expect(page.locator('.map-panel')).not.toHaveAttribute('data-basemap-status','loading',{timeout:35000});
    const actual=await page.locator('.map-panel').getAttribute('data-basemap-id');
    const status=await page.locator('.map-panel').getAttribute('data-basemap-status');
    results.push({requested:base.id,actual,status});
    await expect(page.locator('.spot-card')).toHaveCount(26);
    if(actual===base.id&&status==='ready') {
      if(base.kind==='raster')await expect.poll(()=>page.locator('.leaflet-tile-loaded').evaluateAll(nodes=>nodes.length>0&&nodes.every(n=>getComputedStyle(n).opacity==='1'))).toBe(true);
      await page.screenshot({path:`dist/live-${base.id}-${test.info().project.name}.png`,fullPage:true});
    }
  }
  await writeFile(`dist/basemaps-live-${test.info().project.name}.json`,JSON.stringify({results,responses,errors},null,2));
  console.log('Live basemap results:',JSON.stringify(results));
  expect(errors).toEqual([]);
  await page.locator('.basemap-toggle').click();
  if(await page.locator('.basemap-more').getAttribute('aria-expanded')!=='true')await page.locator('.basemap-more').click();
  await page.screenshot({path:`dist/basemap-switcher-${test.info().project.name}.png`,fullPage:true});
});
