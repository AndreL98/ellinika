/** Types mirroring /content/schema. Keep in sync with the JSON schemas. */

export type ContentStatus = 'draft' | 'reviewed' | 'approved';
export type ReviewFlag = 'ai_suggestion' | 'verified';

export interface Unit {
  id: string;
  icon?: string;
  order: number;
  items: string[];
}

export interface CoreItem {
  id: string;
  kind: string;
  tags?: string[];
}

export interface PackCore {
  pack: string;
  version: number;
  units: Unit[];
  items: CoreItem[];
}

export interface Source {
  title: string;
  url?: string;
  section?: string;
}

export interface ItemText {
  text: string;
  translit?: string;
  translit_status?: ReviewFlag;
  pron?: Record<string, string>;
  pron_status?: ReviewFlag;
  audio?: string | null;
  source: Source;
  status: ContentStatus;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface LanguageFile {
  lang: string;
  script: string;
  dir: 'ltr' | 'rtl';
  items: Record<string, ItemText>;
}
