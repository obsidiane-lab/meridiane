import {Item} from "../../bridge-sandbox/src/lib/ports/resource-repository.port";
export interface Conversation extends Item {
    id: string;
    externalId?: string;
    messageIris?: string[];
}

