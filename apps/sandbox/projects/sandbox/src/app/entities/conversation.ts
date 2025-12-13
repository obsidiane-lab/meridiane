import {Item} from "@obsidiane/bridge-sandbox";
export interface Conversation extends Item {
  id?: number;
  externalId?: string;
  messages?: string[];
}
