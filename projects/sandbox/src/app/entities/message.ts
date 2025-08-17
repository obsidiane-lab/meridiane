import {Item} from "../../bridge-sandbox/src/lib/ports/resource-repository.port";

export interface Message extends Item {
    id: string;
    conversationId?: string;
    conversationIri?: string;
    originalText?: string;
    translatedText?: string;
    sourceLang?: string;
    targetLang?: string;
    createdAt?: Date | null;
    senderId?: string;
}
