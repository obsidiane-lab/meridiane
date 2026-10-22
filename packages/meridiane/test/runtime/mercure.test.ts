import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {buildSubscribeUrl, subscriptionKey} from '../../templates/angular-bridge/src/lib/bridge/sse/mercure-url.ts';
import {isResourceDeletion, ResourceTopic} from '../../templates/angular-bridge/src/lib/bridge/sse/resource-topic.ts';

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
    assert.equal(relative.toResource(payload), payload);
    const deletion = {'@id': '/api/books/1'};
    assert.equal(absolute.toResource(deletion), deletion);
    assert.equal(relative.toResource({'@id': '/api/books/2', title: 'Ubik'}), undefined);
  });

  it('rejects an empty or malformed exact IRI', () => {
    assert.throws(() => books.forIri('  '), /missing resource IRI/);
    assert.throws(() => books.forIri('https://[invalid'), TypeError);
  });

  it('preserves native resources with relative or absolute @id', () => {
    const payload = {'@id': '/api/books/1', '@type': 'Book', title: 'Dune'};
    const absolute = {'@id': `${BASE}/api/books/2`, title: 'Ubik'};
    assert.equal(books.toResource(payload), payload);
    assert.equal(books.toResource(absolute), absolute);
  });

  it('preserves API Platform deletion payloads and their metadata', () => {
    for (const payload of [
      {'@id': '/api/books/1'},
      {'@id': '/api/books/1', '@type': 'Book', '@context': '/api/contexts/Book'},
    ]) {
      assert.equal(books.toResource(payload), payload);
      assert.equal(isResourceDeletion(payload), true);
    }
  });

  it('preserves business fields named kind, iri and data without interpreting them', () => {
    const payload = {'@id': '/api/books/1', kind: 'delete', iri: '/unrelated', data: {title: 'Dune'}};
    assert.equal(books.toResource(payload), payload);
    assert.equal(isResourceDeletion(payload), false);
  });

  it('ignores updates of other resources received on the shared connection', () => {
    assert.equal(books.toResource({'@id': '/api/authors/1', name: 'Herbert'}), undefined);
    assert.equal(books.toResource({'@id': '/api/books/1/reviews/3', rating: 5}), undefined);
    assert.equal(books.toResource({'@id': 'https://other.example.com/api/books/1', title: 'Dune'}), undefined);
  });

  it('ignores payloads without @id', () => {
    assert.equal(books.toResource({title: 'Dune'}), undefined);
    assert.equal(books.toResource({'@id': 42}), undefined);
    assert.equal(books.toResource('not an object'), undefined);
    assert.equal(books.toResource([{'@id': '/api/books/1'}]), undefined);
  });

  it('works with a non-default port in the API base URL', () => {
    const local = new ResourceTopic('http://localhost:8000/api/messages/:id', 'http://localhost:8000');
    const payload = {'@id': '/api/messages/12', originalText: 'hi'};
    assert.equal(local.toResource(payload), payload);
  });
});

describe('isResourceDeletion', () => {
  it('requires a string @id and allows only JSON-LD metadata', () => {
    assert.equal(isResourceDeletion({}), false);
    assert.equal(isResourceDeletion({'@id': undefined}), false);
    assert.equal(isResourceDeletion({'@type': 'Book', '@context': '/api/contexts/Book'}), false);
    assert.equal(isResourceDeletion({'@id': '/api/books/1'}), true);
    assert.equal(isResourceDeletion({'@id': '/api/books/1', '@type': 'Book'}), true);
    assert.equal(isResourceDeletion({'@id': '/api/books/1', '@context': '/api/contexts/Book'}), true);
  });

  it('keeps resources with any business property distinct from deletions', () => {
    const resource = {'@id': '/api/books/1', title: 'Dune'};
    assert.equal(isResourceDeletion(resource), false);
    for (const key of ['kind', 'iri', 'data']) {
      assert.equal(isResourceDeletion({'@id': '/api/books/1', [key]: undefined}), false);
    }
  });
});
