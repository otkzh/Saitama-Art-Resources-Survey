import type { Filters, Location, SearchResult, Spot } from './types';

export const CATEGORY_COLORS: Record<string, string> = {
  'ギャラリー・展示施設': '#b65339', 'カフェ・飲食店': '#ab751b',
  '書店・ショップ': '#426b9b', '工房・アトリエ': '#397663',
  '文化施設・歴史・自然': '#687044', 'コミュニティスペース': '#74558d',
};
export const WARDS = ['西区','北区','大宮区','見沼区','中央区','桜区','浦和区','南区','緑区','岩槻区','市外','区不明'];
export const TAG_ORDER = ['展示','カフェ','飲食','本','買い物','工芸','ワークショップ','音楽','子ども','地域交流','屋外','福祉'];
export const emptyFilters = (): Filters => ({ query: '', ward: '', category: '', tags: [], radius: 0, origin: null });
export function normalize(value: string): string { return value.normalize('NFKC').toLocaleLowerCase('ja').replace(/\s+/g, ' ').trim(); }
export function distanceBetween(a: Pick<Location, 'lat' | 'lon'>, b: Pick<Location, 'lat' | 'lon'>): number {
  const rad = Math.PI / 180;
  const dlat = (b.lat-a.lat)*rad, dlon = (b.lon-a.lon)*rad;
  const h = Math.sin(dlat/2)**2 + Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlon/2)**2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0,1-h)));
}
export function filterSpots(spots: Spot[], f: Filters): SearchResult[] {
  const words = normalize(f.query).split(' ').filter(Boolean);
  return spots.map(spot => ({ ...spot, distance: f.origin ? distanceBetween(f.origin,spot) : null }))
    .filter(s => (!f.ward || s.ward === f.ward) && (!f.category || s.category === f.category)
      && (!f.tags.length || f.tags.some(t => s.tags.includes(t)))
      && (!f.origin || !f.radius || (s.distance !== null && s.distance <= f.radius))
      && words.every(word => normalize([s.name,s.tagline,s.address,s.ward,s.category,...s.tags,s.body,s.osm?.name ?? ''].join(' ')).includes(word)))
    .sort((a,b) => f.origin ? (a.distance! - b.distance!) || Number(a.id)-Number(b.id) : Number(a.id)-Number(b.id));
}
export function formatDistance(distance: number): string {
  return distance < 1000 ? `${Math.round(distance)} m` : `${(distance/1000).toFixed(1)} km`;
}
export function safeHttps(value: string): string {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
}
export function routeUrl(spot: Spot, origin: Location | null): string {
  const params = new URLSearchParams({ api:'1', destination:`${spot.lat},${spot.lon}`, travelmode:'walking' });
  if (origin) params.set('origin',`${origin.lat},${origin.lon}`);
  return `https://www.google.com/maps/dir/?${params}`;
}
