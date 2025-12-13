import {Item} from "@obsidiane/bridge-sandbox";
export interface Conversation extends Item {
  id?: number;
  title?: string;
  externalId?: string | null;
  messages?: string[];
  createdAt?: string;
}
