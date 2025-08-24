import {Item} from "../../bridge-sandbox/src/lib/ports/resource-repository.port";
export interface Conversation extends Item {
  id?: number;
  externalId?: string;
  messages?: string[];
}

