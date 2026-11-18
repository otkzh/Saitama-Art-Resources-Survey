export interface SpotImage { src: string; alt: string }
export interface Spot {
  id: string;
  name: string;
  tagline: string;
  category: string;
  tags: string[];
  ward: string;
  address: string;
  lat: number;
  lon: number;
  year: string;
  title: string;
  subtitle: string;
  body: string;
  sections: { heading: string; paragraphs: string[] }[];
  images: SpotImage[];
  info: Record<string, string>;
  source: string;
  rights: string;
  osm?: { url: string; name: string; status: string; hours: string; wheelchair: string };
}
export interface Location { lat: number; lon: number; label: string; accuracy?: number }
export interface Filters { query: string; ward: string; category: string; tags: string[]; radius: number; origin: Location | null }
export interface SearchResult extends Spot { distance: number | null }
export interface MapConfig {
  tileUrl: string;
  tileAttribution: string;
  tileAttributionUrl: string;
  maxZoom: number;
  addressSearch: { enabled: boolean; endpoint: string; attribution: string };
}
export interface Dataset { mode: 'review' | 'release'; generatedAt: string; spots: Spot[] }
