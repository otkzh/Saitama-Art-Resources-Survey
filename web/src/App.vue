<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import SpotMap from './components/SpotMap.vue';
import Icon from './components/AppIcon.vue';
import { CATEGORY_COLORS, TAG_ORDER, WARDS, emptyFilters, filterSpots, formatDistance, routeUrl, safeHttps } from './domain';
import { loadContent, localAsset, locate, searchAddress } from './services';
import type { Dataset, Location, MapConfig } from './types';

const dataset=ref<Dataset>(), config=ref<MapConfig>(), loadError=ref(''), loading=ref(true);
const filters=ref(emptyFilters()), selectedId=ref(''), imageIndex=ref(0), filtersOpen=ref(false);
const address=ref(''), candidates=ref<Location[]>([]), addressBusy=ref(false), addressError=ref('');
const locating=ref(false), locationMessage=ref(''), toast=ref('');
const list=ref<HTMLElement>(), detailTitle=ref<HTMLElement>();
let searchController:AbortController|undefined, operation=0, lastCard='';
const loadController=new AbortController();
const items=computed(()=>filterSpots(dataset.value?.spots||[],filters.value));
const selected=computed(()=>items.value.find(s=>s.id===selectedId.value));
const categories=computed(()=>Object.keys(CATEGORY_COLORS).filter(c=>dataset.value?.spots.some(s=>s.category===c)));
const wards=computed(()=>WARDS.filter(w=>dataset.value?.spots.some(s=>s.ward===w)));
const tags=computed(()=>TAG_ORDER.filter(t=>dataset.value?.spots.some(s=>s.tags.includes(t))));
const conditions=computed(()=>[
  filters.value.query.trim()?`キーワード：${filters.value.query.trim()}`:'',
  filters.value.ward,filters.value.category,
  ...filters.value.tags.map(t=>`#${t}`),
  filters.value.origin?`${filters.value.origin.label}${filters.value.radius?`から${filters.value.radius/1000}km以内`:'から近い順'}`:'',
].filter(Boolean));
const color=(category:string)=>CATEGORY_COLORS[category]||'#59636b';
function cancelLocationOperations() { operation++; searchController?.abort(); addressBusy.value=false; locating.value=false; }
function reset() {
  cancelLocationOperations(); filters.value=emptyFilters(); address.value=''; candidates.value=[]; addressError.value=''; locationMessage.value=''; closeDetail();
}
function clearOrigin() {
  cancelLocationOperations(); filters.value.origin=null; filters.value.radius=0; candidates.value=[]; address.value=''; locationMessage.value=''; addressError.value='';
}
function toggleTag(tag:string) { const tags=filters.value.tags; filters.value.tags=tags.includes(tag)?tags.filter(t=>t!==tag):[...tags,tag]; }
function selectSpot(id:string,updateHash=true) {
  if(!items.value.some(s=>s.id===id)) return;
  lastCard=id; selectedId.value=id; imageIndex.value=0;
  if(updateHash) history.replaceState(null,'',`#spot=${encodeURIComponent(id)}`);
  nextTick(()=>detailTitle.value?.focus({preventScroll:true}));
}
function closeDetail() {
  selectedId.value=''; imageIndex.value=0;
  if(window.location.hash.startsWith('#spot=')) history.replaceState(null,'',window.location.pathname+window.location.search);
  nextTick(()=>list.value?.querySelector<HTMLButtonElement>(`[data-spot-id="${lastCard}"]`)?.focus({preventScroll:true}));
}
function readHash() {
  const id=new URLSearchParams(window.location.hash.slice(1)).get('spot');
  if(id && dataset.value?.spots.some(s=>s.id===id)) { filters.value=emptyFilters(); selectSpot(id,false); }
  else if(!id) selectedId.value='';
}
async function init() {
  loading.value=true; loadError.value='';
  try {
    const result=await loadContent(loadController.signal); dataset.value=result.dataset; config.value=result.config;
    if(result.dataset.mode==='review') { const meta=document.createElement('meta'); meta.name='robots';meta.content='noindex,nofollow';document.head.append(meta); }
    readHash();
  } catch(error) { if(!loadController.signal.aborted) loadError.value=(error as Error).message; }
  finally { loading.value=false; }
}
async function useCurrentLocation() {
  cancelLocationOperations(); candidates.value=[]; addressError.value=''; const token=operation;
  locating.value=true; locationMessage.value='現在地を取得しています…';
  try {
    const point=await locate(); if(token!==operation)return;
    filters.value.origin=point; filters.value.radius=3000; address.value='';
    locationMessage.value=`現在地から3km以内を近い順に表示しました。位置の精度：約${Math.round(point.accuracy||0)}m。`;
  } catch(error) { if(token===operation)locationMessage.value=(error as Error).message; }
  finally { if(token===operation)locating.value=false; }
}
async function findAddress() {
  if(!address.value.trim()) { addressError.value='住所を入力してください。'; return; }
  if(!config.value?.addressSearch.enabled)return;
  cancelLocationOperations(); const token=operation;
  searchController=new AbortController(); const controller=searchController;
  addressBusy.value=true; candidates.value=[]; addressError.value=''; locationMessage.value='';
  const timeout=window.setTimeout(()=>controller.abort(),12000);
  try {
    const results=await searchAddress(config.value.addressSearch.endpoint,address.value,controller.signal);
    if(token!==operation)return;
    candidates.value=results;
    if(!results.length)addressError.value='住所が見つかりませんでした。市区町村から入力し直してください。';
  } catch(error) { if(token===operation) addressError.value=controller.signal.aborted?'住所検索がタイムアウトしました。再度お試しください。':(error as Error).message; }
  finally { window.clearTimeout(timeout); if(token===operation)addressBusy.value=false; }
}
function chooseAddress(point:Location) {
  cancelLocationOperations(); filters.value.origin=point; filters.value.radius=3000; candidates.value=[];
  locationMessage.value=`${point.label}を起点に設定しました。地図上の位置をご確認ください。`;
}
async function share() {
  try { await navigator.clipboard.writeText(window.location.href); toast.value='このスポットのURLをコピーしました。'; }
  catch { toast.value='アドレスバーのURLをコピーして共有できます。'; }
}
watch(items,()=>{
  if(selectedId.value && !items.value.some(s=>s.id===selectedId.value))closeDetail();
});
onMounted(()=>{ init(); window.addEventListener('hashchange',readHash); });
onBeforeUnmount(()=>{ cancelLocationOperations(); loadController.abort(); window.removeEventListener('hashchange',readHash); });
</script>

<template>
  <a class="skip-link" href="#results-title">検索結果へ移動</a>
  <main class="app-shell">
    <header class="site-header">
      <div class="brand"><span class="eyebrow">SAITAMA ART RESOURCE MAP</span><h1>さいたま<span>アート資源マップ</span><span class="brand-dot" aria-hidden="true">●</span></h1></div>
      <p class="intro">まちの中にある、創造の入り口。<br>気になる場所を見つけて、会いに行こう。</p>
    </header>
    <div v-if="loading" class="page-state" role="status"><span class="eyebrow">LOADING</span><h2>地図とスポットを準備しています</h2></div>
    <div v-else-if="loadError" class="page-state" role="alert"><h2>読み込みに失敗しました</h2><p>{{loadError}}</p><button class="primary-button" @click="init">もう一度読み込む</button></div>
    <template v-else-if="dataset && config">
      <p v-if="dataset.mode==='review'" class="review-banner"><span class="review-badge">確認用</span> 正式版の動作確認用です。掲載確認待ちのスポットを除外しています。</p>
      <section class="search-tools" aria-label="スポットを探す">
        <label class="keyword-field"><span class="field-label">キーワードから探す</span><span class="text-field"><Icon name="search"/><input v-model="filters.query" type="search" placeholder="スポット名・住所・気になる言葉" aria-label="キーワードから探す" /></span></label>
        <div class="nearby-tools"><span class="field-label">近くのスポットを探す</span><button class="location-button" :disabled="locating" @click="useCurrentLocation"><Icon name="locate"/><span>{{locating?'現在地を確認中…':'現在地から探す'}}</span><Icon name="arrow"/></button></div>
        <button class="filter-toggle" :aria-expanded="filtersOpen" aria-controls="filter-panel" @click="filtersOpen=!filtersOpen"><Icon name="filter"/>絞り込み<span class="filter-total">{{conditions.length}}</span></button>
      </section>
      <section id="filter-panel" class="filter-panel" :class="{'is-open':filtersOpen}" aria-label="絞り込み条件">
        <div class="select-filters">
          <label><span class="field-label">エリア</span><select v-model="filters.ward"><option value="">すべての区</option><option v-for="ward in wards" :key="ward">{{ward}}</option></select></label>
          <label><span class="field-label">カテゴリ</span><select v-model="filters.category"><option value="">すべてのカテゴリ</option><option v-for="category in categories" :key="category">{{category}}</option></select></label>
          <label v-if="filters.origin"><span class="field-label">起点からの直線距離</span><select v-model.number="filters.radius"><option :value="0">範囲を指定しない</option><option :value="1000">1km以内</option><option :value="3000">3km以内</option><option :value="5000">5km以内</option></select></label>
        </div>
        <fieldset class="tag-field"><legend>興味・関心 <small>複数選択すると、いずれかに一致するスポットを表示</small></legend><div class="tag-options"><button v-for="tag in tags" :key="tag" :aria-pressed="filters.tags.includes(tag)" :class="{active:filters.tags.includes(tag)}" @click="toggleTag(tag)"><span aria-hidden="true">#</span>{{tag}}</button></div></fieldset>
        <form v-if="config.addressSearch.enabled" class="address-form" @submit.prevent="findAddress">
          <label for="address-input" class="field-label">住所から近くを探す</label><div class="address-input-row"><input id="address-input" v-model="address" type="search" placeholder="例：さいたま市浦和区常盤" maxlength="200"/><button class="plain-button" :disabled="addressBusy">{{addressBusy?'検索中…':'住所を検索'}}</button></div>
          <small>入力住所は{{config.addressSearch.attribution}}へ送信します。このアプリには保存しません。</small>
          <p v-if="addressError" role="alert" class="error-text">{{addressError}}</p>
          <div v-if="candidates.length" class="address-candidates"><p>検索起点を選んでください</p><button v-for="(point,i) in candidates" :key="i" type="button" @click="chooseAddress(point)"><Icon name="pin"/>{{point.label}}</button></div>
        </form>
      </section>
      <p v-if="locationMessage" class="location-status" role="status">{{locationMessage}}</p>
      <div v-if="conditions.length" class="active-conditions" aria-label="適用中の条件">
        <span v-if="filters.query.trim()" class="condition-chip"><span>「{{filters.query.trim()}}」</span><button aria-label="キーワードを解除" @click="filters.query=''">×</button></span>
        <span v-if="filters.ward" class="condition-chip">{{filters.ward}}<button aria-label="エリアを解除" @click="filters.ward=''">×</button></span>
        <span v-if="filters.category" class="condition-chip">{{filters.category}}<button aria-label="カテゴリを解除" @click="filters.category=''">×</button></span>
        <span v-for="tag in filters.tags" :key="tag" class="condition-chip">#{{tag}}<button :aria-label="`${tag}を解除`" @click="toggleTag(tag)">×</button></span>
        <span v-if="filters.origin" class="condition-chip"><span>{{filters.origin.label}} / {{filters.radius?`${filters.radius/1000}km以内`:'近い順'}}</span><button aria-label="検索起点を解除" @click="clearOrigin">×</button></span>
        <button class="reset-button" @click="reset">すべて解除</button>
      </div>
      <section class="workspace">
        <SpotMap :spots="items" :selected-id="selectedId" :origin="filters.origin" :config="config" @select="selectSpot" />
        <aside class="viewer" aria-label="スポット一覧と詳細">
          <div v-show="!selected" class="list-view">
            <div class="list-heading"><div><span class="eyebrow">PLACES & STORIES</span><h2 id="results-title" tabindex="-1">スポット一覧 <span class="result-number" aria-live="polite" aria-atomic="true">{{items.length}}<small>件</small></span></h2><p>{{filters.origin?'検索起点から近い順・直線距離':'地図と写真から、気になる場所へ。'}}</p></div></div>
            <div ref="list" class="spot-list" tabindex="0" role="region" aria-label="スポット検索結果（スクロールできます）">
              <div v-if="!items.length" class="empty-state"><Icon name="search" :size="32"/><h3>該当するスポットはありません</h3><p>検索語や絞り込み条件を変えてみてください。近くに見つからない場合は、距離の範囲を広げられます。</p><button class="primary-button" @click="reset">条件をすべて解除</button></div>
              <button v-for="(spot,i) in items" :key="spot.id" :data-spot-id="spot.id" class="spot-card" :style="{'--category-color':color(spot.category)}" @click="selectSpot(spot.id)">
                <img v-if="spot.images[0]" class="card-image" :src="localAsset(spot.images[0].src)" alt="" loading="lazy" width="104" height="94"/><span v-else class="card-image image-placeholder"><Icon name="pin"/></span>
                <span class="card-body"><span class="card-meta"><span class="category-label">{{spot.category}}</span><span>{{spot.distance!==null?formatDistance(spot.distance):spot.ward}}</span></span><strong>{{spot.name}}</strong><span class="card-tagline">{{spot.tagline}}</span><span class="card-tags"><span v-for="tag in spot.tags.slice(0,3)" :key="tag">#{{tag}}</span></span><span class="card-address">{{spot.address}}</span></span><span class="card-order">{{String(i+1).padStart(2,'0')}}</span>
              </button>
              <p v-if="items.length" class="list-end">全{{items.length}}件を表示しています</p>
            </div>
          </div>
          <section v-if="selected" class="detail-view" aria-label="スポット詳細">
            <div class="detail-toolbar"><button @click="closeDetail"><Icon name="back"/>一覧へ戻る</button><button @click="share"><Icon name="external"/>URLをコピー</button></div>
            <div class="detail-scroll">
              <figure v-if="selected.images[imageIndex]" class="hero-image"><img :src="localAsset(selected.images[imageIndex].src)" :alt="selected.images[imageIndex].alt"/><figcaption>{{imageIndex+1}} / {{selected.images.length}}</figcaption></figure>
              <div v-if="selected.images.length>1" class="image-strip" aria-label="写真を選択"><button v-for="(image,i) in selected.images" :key="image.src" :aria-label="`写真${i+1}を表示`" :aria-pressed="imageIndex===i" @click="imageIndex=i"><img :src="localAsset(image.src)" alt="" loading="lazy"/></button></div>
              <article class="reader">
                <div class="reader-meta" :style="{'--category-color':color(selected.category)}"><span class="category-label">{{selected.category}}</span><span>{{selected.ward}}</span></div>
                <h2 ref="detailTitle" tabindex="-1">{{selected.title}}</h2><p class="subtitle">{{selected.subtitle}}</p>
                <div class="reader-tags"><button v-for="tag in selected.tags" :key="tag" :aria-pressed="filters.tags.includes(tag)" @click="toggleTag(tag)">#{{tag}}</button></div>
                <div class="visit-panel"><p><Icon name="pin"/><span>{{selected.address}}</span></p><span v-if="selected.distance!==null" class="distance-note">検索起点から直線距離 {{formatDistance(selected.distance)}}</span><a class="route-button" :href="routeUrl(selected,filters.origin)" target="_blank" rel="noopener noreferrer">徒歩の経路を調べる <Icon name="external"/></a><small>Google Mapsを開きます。検索起点がある場合、その座標も送信します。</small></div>
                <section v-for="(section,i) in selected.sections" :key="i" class="article-section"><h3 v-if="section.heading">{{section.heading}}</h3><p v-for="(paragraph,j) in section.paragraphs" :key="j">{{paragraph}}</p></section>
                <p v-if="!selected.sections.length" class="article-fallback">{{selected.body}}</p>
                <section v-if="Object.keys(selected.info).length" class="basic-info"><h3>基本情報</h3><dl><div v-for="(value,key) in selected.info" :key="key"><dt>{{key}}</dt><dd>{{value}}</dd></div></dl></section>
                <a :href="safeHttps(selected.source)" class="source-link" target="_blank" rel="noopener noreferrer">公式記事で読む <Icon name="external"/></a>
                <details class="source-details"><summary>出典・調査情報</summary><p>調査年度：{{selected.year}}<br>記事・画像：{{selected.rights}}</p><p>調査当時の情報です。営業状況・開催内容等は訪問前に公式情報をご確認ください。カテゴリ・タグは地図のための編集上の分類です。</p></details>
                <details v-if="selected.osm" class="source-details"><summary>OpenStreetMapの登録情報</summary><p>{{selected.osm.status}}<br>{{selected.osm.name}}</p><p v-if="selected.osm.hours">営業時間：{{selected.osm.hours}}</p><p v-if="selected.osm.wheelchair">車椅子対応：{{selected.osm.wheelchair}}</p><a v-if="safeHttps(selected.osm.url)" :href="safeHttps(selected.osm.url)" target="_blank" rel="noopener noreferrer">OpenStreetMapで確認 ↗</a><small>取得時点の登録情報です。現状と異なる場合があります。</small></details>
              </article>
            </div>
          </section>
        </aside>
      </section>
      <section class="map-legend" aria-label="地図の凡例"><span v-for="category in categories" :key="category"><i :style="{background:color(category)}"/>{{category}}</span></section>
      <p class="data-note">アーツカウンシルさいたま「アート資源調査」をもとに作成。掲載情報は調査当時のものです。ご訪問前に公式情報をご確認ください。</p>
    </template>
    <footer class="site-footer"><span>記事・画像 © Arts Council Saitama</span><span>Map: <a :href="config?safeHttps(config.tileAttributionUrl):'https://maps.gsi.go.jp/development/ichiran.html'" target="_blank" rel="noopener noreferrer">{{config?.tileAttribution||'国土地理院'}}</a> / <a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a></span></footer>
    <p v-if="toast" class="toast" role="status">{{toast}}<button aria-label="通知を閉じる" @click="toast=''">×</button></p>
  </main>
</template>
