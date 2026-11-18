import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  // Core acceptance checks stay independent of external tile availability.
  await page.route('https://cyberjapandata.gsi.go.jp/**',route=>route.abort());
  await page.goto('./');
  await expect(page.locator('.spot-card')).toHaveCount(26);
});
test('最後のカードへスクロールし、詳細から一覧へ戻れる',async({page})=>{
  const list=page.getByRole('region',{name:'スポット検索結果（スクロールできます）'});
  const dimensions=await list.evaluate(el=>({client:el.clientHeight,scroll:el.scrollHeight}));
  expect(dimensions.scroll).toBeGreaterThan(dimensions.client);
  await list.locator('.spot-card').last().click();
  await expect(page.getByRole('region',{name:'スポット詳細'})).toBeVisible();
  await expect(page.locator('.reader h2')).toContainText('大西屋');
  await page.getByRole('button',{name:'一覧へ戻る'}).click();
  await expect(list).toBeVisible();
  expect(await list.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
  await expect(page.locator('.detail-view')).toHaveCount(0);
  await expect.poll(()=>list.locator('.spot-card').last().locator('img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
  await expect(page.locator('.spot-card').last()).toBeFocused();
  await page.screenshot({path:`dist/qa-${test.info().project.name}.png`,fullPage:true});
});
test('0件案内と解除、タグの反映、保留先の除外',async({page})=>{
  const search=page.getByRole('searchbox',{name:'キーワードから探す'});
  await search.fill('カフェギャラリー南風');
  await expect(page.getByText('該当するスポットはありません')).toBeVisible();
  await page.getByRole('button',{name:'条件をすべて解除',exact:true}).click();
  await expect(page.locator('.spot-card')).toHaveCount(26);
  await page.getByRole('button',{name:/絞り込み/}).click();
  await page.getByRole('button',{name:'本',exact:true}).click();
  await expect(page.locator('.spot-card')).toHaveCount(1);
  await expect(page.locator('.spot-card')).toContainText('夢中飛行');
});
test('現在地拒否と地図通信失敗でも一覧を操作できる',async({page})=>{
  await page.context().clearPermissions();
  await page.getByRole('button',{name:'現在地から探す'}).click();
  await expect(page.locator('.location-status')).toContainText(/許可されていません|取得できません|タイムアウト/,{timeout:16000});
  await expect(page.locator('.spot-card')).toHaveCount(26);
  await expect(page.locator('.map-message')).toBeVisible();
});
test('検索起点の取得と解除、共有URLには座標を含めない',async({page,context})=>{
  await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:35.86,longitude:139.65,accuracy:10});
  await page.getByRole('button',{name:'現在地から探す'}).click();
  await expect(page.locator('.location-status')).toContainText('3km以内');
  await page.locator('.spot-card').first().click();
  expect(page.url()).toMatch(/#spot=\d+$/);expect(page.url()).not.toContain('35.86');
  await page.getByRole('button',{name:'一覧へ戻る'}).click();
  await page.getByRole('button',{name:'検索起点を解除'}).click();
  await expect(page.locator('.spot-card')).toHaveCount(26);
});
test('住所の候補を選んで周辺検索し、解除できる',async({page})=>{
  await page.route('**/config.json',async route=>{
    const response=await route.fetch();const config=await response.json();
    config.addressSearch={enabled:true,endpoint:'https://address.example.invalid/search',attribution:'テスト用住所検索'};
    await route.fulfill({response,json:config});
  });
  await page.route('https://address.example.invalid/**',route=>route.fulfill({json:[
    {geometry:{coordinates:[139.65,35.86]},properties:{title:'テスト地点A'}},
    {geometry:{coordinates:[139.66,35.87]},properties:{title:'テスト地点B'}},
  ]}));
  await page.reload();await page.getByRole('button',{name:/絞り込み/}).click();
  await page.getByRole('searchbox',{name:'住所から近くを探す'}).fill('テスト住所');
  await page.getByRole('button',{name:'住所を検索',exact:true}).click();
  await expect(page.getByText('検索起点を選んでください')).toBeVisible();
  await page.getByRole('button',{name:'テスト地点B',exact:true}).click();
  await expect(page.locator('.location-status')).toContainText('テスト地点B');
  await page.getByRole('button',{name:'検索起点を解除'}).click();
  await expect(page.locator('.spot-card')).toHaveCount(26);
});
