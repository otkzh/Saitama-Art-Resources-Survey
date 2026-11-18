import { readFile, writeFile, mkdir, rm, copyFile } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { mayPublish } from './publication';

const root = resolve(import.meta.dirname, '..');
const mode = process.argv.includes('--release') ? 'release' : 'review';
const publicationSchema = z.object({ spots: z.array(z.object({ id:z.string(), status:z.enum(['approved','pending-contact','remaining-in-review','denied']), evidence:z.string() })) });
const spotSchema = z.object({
  id:z.string().regex(/^\d+$/), name:z.string().min(1), tagline:z.string(), category:z.string().min(1), tags:z.array(z.string()),
  ward:z.string(), address:z.string().min(1), lat:z.number().min(-90).max(90), lon:z.number().min(-180).max(180), year:z.string(),
  title:z.string(), subtitle:z.string(), body:z.string(), sections:z.array(z.object({heading:z.string(),paragraphs:z.array(z.string())})),
  images:z.array(z.object({src:z.string(),alt:z.string()})), info:z.record(z.string(),z.string()), source:z.url().startsWith('https://'), rights:z.string(),
  osm:z.object({ url:z.string(), name:z.string(), status:z.string(), hours:z.string(), wheelchair:z.string() }).optional(),
});
const readJson = async (p:string) => JSON.parse(await readFile(resolve(root,p),'utf8'));
const csv = async (p:string): Promise<Record<string,string>[]> => parse(await readFile(resolve(root,p),'utf8'),{columns:true,bom:true,skip_empty_lines:true});
const publication = publicationSchema.parse(await readJson('data/publication-status.json'));
if (new Set(publication.spots.map(x=>x.id)).size !== publication.spots.length) throw Error('掲載管理のIDが重複しています');
const metadata = z.record(z.string(), z.object({category:z.string(),tags:z.array(z.string())})).parse(await readJson('data/spot-metadata.json'));
const facilities = await csv('data/arts_council_saitama_art_resources_official_gsi_pending.csv');
const articles = new Map((await csv('data/copyrighted/arts_council_saitama_articles.csv')).map(row=>[row.id,row]));
const osms = new Map((await csv('data/open_data/111007_public_facility.csv')).map(row=>[row.ID,row]));
if (new Set(facilities.map(x=>x.id)).size !== facilities.length) throw Error('施設IDが重複しています');
const validIds = new Set(facilities.map(x=>x.id));
if(publication.spots.some(x=>!validIds.has(x.id))) throw Error('掲載管理に不明なIDがあります');
const publishById = new Map(publication.spots.map(row=>[row.id,row]));
const selected = facilities.filter(row=>mayPublish(publishById.get(row.id),mode) && row.国土地理院緯度 && row.国土地理院経度);
if (!selected.length) throw Error('公開できる座標付きスポットがありません。掲載管理の許可状態と確認記録を確認してください。');
const publicDir = resolve(root,'web/public');
// A clean stage prevents removed spots and old images from surviving the next build.
await rm(publicDir,{recursive:true,force:true});
await mkdir(resolve(publicDir,'data'),{recursive:true});
const spots = [];
for (const row of selected) {
  const a = articles.get(row.id), meta = metadata[row.id], osm = osms.get(`ACS${row.id.padStart(4,'0')}`);
  if (!a || !meta) throw Error(`記事または分類がありません: ${row.id}`);
  const address = row.国土地理院結果住所 || row.参考住所;
  const images = [];
  for (const im of JSON.parse(a.画像JSON || '[]')) {
    if (!im.local_path) continue;
    const path = String(im.local_path);
    const prefix = `images/ACS${row.id.padStart(4,'0')}/`;
    if (!path.startsWith(prefix) || path.includes('..') || isAbsolute(path)) throw Error(`不正な画像パス: ${path}`);
    const src = resolve(root,'data/copyrighted',path);
    if(relative(resolve(root,'data/copyrighted'),src).startsWith('..')) throw Error('画像パスが範囲外です');
    const dest = resolve(publicDir,path);
    await mkdir(dirname(dest),{recursive:true}); await copyFile(src,dest);
    images.push({src:path, alt:im.alt || a.記事タイトル || row.施設名});
  }
  spots.push(spotSchema.parse({
    id:row.id, name:row.施設名, tagline:row.キャッチコピー || '', ...meta,
    ward:address.match(/さいたま市([^\s市]+?区)/)?.[1] || (address.includes('さいたま市')?'区不明':'市外'),
    address, lat:Number(row.国土地理院緯度), lon:Number(row.国土地理院経度), year:row.年度 || '',
    title:a.記事タイトル || row.施設名, subtitle:a.記事サブタイトル || row.キャッチコピー || '', body:a.記事本文 || '',
    sections:JSON.parse(a.記事セクションJSON || '[]').map((s:{heading?:string;paragraphs?:string[]})=>({heading:s.heading||'',paragraphs:s.paragraphs||[]})),
    images, info:JSON.parse(a.基本情報JSON || '{}'), source:a.出典URL || row.公式記事URL, rights:a.権利者表示 || 'アーツカウンシルさいたま',
    osm:osm ? {url:osm.OSM_URL || '',name:osm.OSM名称 || '',status:osm.OSM照合状態 || '',hours:osm.OSM営業時間 || '',wheelchair:osm.OSM車椅子対応 || ''} : undefined,
  }));
}
await writeFile(resolve(publicDir,'data/spots.json'),JSON.stringify({mode,generatedAt:new Date().toISOString(),spots}));
await copyFile(resolve(root,'web/config.template.json'),resolve(publicDir,'config.json'));
await copyFile(resolve(root,'assets/favicon.svg'),resolve(publicDir,'favicon.svg'));
await writeFile(resolve(publicDir,'robots.txt'),mode==='review'?'User-agent: *\nDisallow: /\n':'User-agent: *\nAllow: /\n');
await writeFile(resolve(publicDir,'INSTALL.txt'),await readFile(resolve(root,'docs/production-install.txt'),'utf8'));
const notices = ['Vue: MIT','Leaflet: BSD-2-Clause','地図: 国土地理院（https://maps.gsi.go.jp/development/ichiran.html）','OSM登録情報: © OpenStreetMap contributors, ODbL（https://www.openstreetmap.org/copyright）','記事・画像: 公益財団法人さいたま市文化振興事業団 / アーツカウンシルさいたま。オープンデータではありません。'];
for(const [name,path] of [['Vue','node_modules/vue/LICENSE'],['Leaflet','node_modules/leaflet/LICENSE']]) {
  notices.push(`\n--- ${name} ---\n${await readFile(resolve(root,path),'utf8')}`);
}
await writeFile(resolve(publicDir,'THIRD_PARTY_NOTICES.txt'),notices.join('\n'));
console.log(`${mode}: ${spots.length} spots staged (publication status checked).`);
