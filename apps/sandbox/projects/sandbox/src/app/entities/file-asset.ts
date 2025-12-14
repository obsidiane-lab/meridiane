import {Item} from '@obsidiane/bridge-sandbox';

export interface FileAsset extends Item {
  id?: number;
  originalName?: string;
  path?: string;
  mimeType?: string | null;
  size?: number | null;
  uploadedAt?: string | null;
}

