import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {buildSubscribeUrl, subscriptionKey} from '../../templates/angular-bridge/src/lib/bridge/sse/mercure-url.ts';
import {ResourceTopic} from '../../templates/angular-bridge/src/lib/bridge/sse/resource-topic.ts';

const HUB = 'https://api.example.com/.well-known/mercure';
const BASE = 'https://api.example.com';

describe('buildSubscribeUrl', () => {
  it('sends Mercure 1.0 match parameters', () => {
    const url = new URL(buildSubscribeUrl(HUB, [
      {match: `${BASE}/api/books/:id`, type: 'urlpattern'},
      {match: `${BASE}/api/events/me`, type: 'exact'},
    ]));

    assert.deepEqual(url.searchParams.getAll('match_urlpattern'), [`${BASE}/api/books/:id`]);
    assert.deepEqual(url.searchParams.getAll('match'), [`${BASE}/api/events/me`]);
    assert.equal(url.searchParams.has('topic'), false);
  });

  it('resumes with last_event_id', () => {
    const url = new URL(buildSubscribeUrl(HUB, [{match: `${BASE}/api/books/:id`, type: 'urlpattern'}], 'urn:uuid:42'));
    assert.equal(url.searchParams.get('last_event_id'), 'urn:uuid:42');
  });

  it('keys subscriptions by matcher type', () => {
    assert.notEqual(
      subscriptionKey({match: 'https://a/x', type: 'exact'}),
      subscriptionKey({match: 'https://a/x', type: 'urlpattern'}),
    );
  });
});

describe('ResourceTopic', () => {
  const books = new ResourceTopic(`${BASE}/api/books/:id`, BASE);

  it('normalizes exact relative and absolute IRIs and isolates one entity', () => {
    const relative = books.forIri('/api/books/1');
    const absolute = books.forIri(`${BASE}/api/books/1`);
    assert.equal(relative.match, `${BASE}/api/books/1`);
    assert.equal(relative.type, 'exact');
    assert.equal(absolute.match, relative.match);
    const payload = {'@id': `${BASE}/api/books/1`, title: 'Dune', author: '/api/authors/1'};
    assert.deepEqual(relative.toEvent(payload), {kind: 'upsert', iri: payload['@id'], data: payload});
    assert.deepEqual(absolute.toEvent({'@id': '/api/books/1'}), {kind: 'delete', iri: '/api/books/1'});
    assert.equal(relative.toEvent({'@id': '/api/books/2', title: 'Ubik'}), undefined);
  });

  it('rejects an empty or malformed exact IRI', () => {
    assert.throws(() => books.forIri('  '), /missing resource IRI/);
    assert.throws(() => books.forIri('https://[invalid'), TypeError);
  });

  it('reconstructs upserts from relative or absolute @id', () => {
    const payload = {'@id': '/api/books/1', '@type': 'Book', title: 'Dune'};
    assert.deepEqual(books.toEvent(payload), {kind: 'upsert', iri: '/api/books/1', data: payload});
    assert.equal(books.toEvent({'@id': `${BASE}/api/books/2`, title: 'Ubik'})?.kind, 'upsert');
  });

  it('recognises API Platform deletions', () => {
    assert.deepEqual(books.toEvent({'@id': '/api/books/1'}), {kind: 'delete', iri: '/api/books/1'});
    assert.deepEqual(books.toEvent({'@id': '/api/books/1', '@type': 'Book'}), {kind: 'delete', iri: '/api/books/1'});
  });

  it('ignores updates of other resources received on the shared connection', () => {
    assert.equal(books.toEvent({'@id': '/api/authors/1', name: 'Herbert'}), undefined);
    assert.equal(books.toEvent({'@id': '/api/books/1/reviews/3', rating: 5}), undefined);
    assert.equal(books.toEvent({'@id': 'https://other.example.com/api/books/1', title: 'Dune'}), undefined);
  });

  it('ignores payloads without @id', () => {
    assert.equal(books.toEvent({title: 'Dune'}), undefined);
    assert.equal(books.toEvent('not an object'), undefined);
    assert.equal(books.toEvent([{'@id': '/api/books/1'}]), undefined);
  });

  it('works with a non-default port in the API base URL', () => {
    const local = new ResourceTopic('http://localhost:8000/api/messages/:id', 'http://localhost:8000');
    assert.equal(local.toEvent({'@id': '/api/messages/12', originalText: 'hi'})?.kind, 'upsert');
  });
});
