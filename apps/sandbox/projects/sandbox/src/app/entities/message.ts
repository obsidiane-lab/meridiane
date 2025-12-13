import {Item} from "@obsidiane/bridge-sandbox";

export interface Message extends Item {
  id?: number;
  conversation?: string;
  originalText?: string;
  author?: string;
  meta?: any;
  createdAt?: string;
}
