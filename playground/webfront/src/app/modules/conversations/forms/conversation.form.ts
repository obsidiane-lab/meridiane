import { maxLength, pattern, required, schema } from '@angular/forms/signals';

export const conversationSchema = schema<{ title: string }>((path) => {
  required(path.title);
  maxLength(path.title, 200);
  pattern(path.title, /\S/);
});

export const messageSchema = schema<{ content: string }>((path) => {
  required(path.content);
  pattern(path.content, /\S/);
});

export const messageIriSchema = schema<{ iri: string }>((path) => {
  required(path.iri);
  pattern(path.iri, /^\/api\/messages\/\d+$/);
});
