import {describe, it, type TestContext} from 'node:test';
import './angular-runtime.ts';
import assert from 'node:assert/strict';
import {Injector, PLATFORM_ID, runInInjectionContext} from '@angular/core';

const {MercureHub} = await import('../../templates/angular-bridge/src/lib/bridge/sse/mercure-hub.ts');
const {ResourceFacade} = await import('../../templates/angular-bridge/src/lib/facades/resource.facade.ts');
const {ResourceTopic} = await import('../../templates/angular-bridge/src/lib/bridge/sse/resource-topic.ts');
const {MERCURE_HUB_URL, BRIDGE_MERCURE_WITH_CREDENTIALS} = await import('../../templates/angular-bridge/src/lib/tokens.ts');

const BASE = 'https://api.example.com';
const HUB = `${BASE}/.well-known/mercure`;
const BOOKS = {match: `${BASE}/api/books/:id`, type: 'urlpattern' as const};
const AUTHORS = {match: `${BASE}/api/authors/:id`, type: 'urlpattern' as const};

class FakeEventSource {
  static CLOSED = 2;
  static instances: FakeEventSource[] = [];
  readonly url: string;
  readonly options: EventSourceInit;
  readyState = 0;
  onopen?: () => void;
  onmessage?: (event: {data: string; lastEventId: string}) => void;
  onerror?: () => void;

  constructor(url: string, options: EventSourceInit) {
    this.url = url;
    this.options = options;
    FakeEventSource.instances.push(this);
  }

  close(): void { this.readyState = FakeEventSource.CLOSED; }
  open(): void { this.readyState = 1; this.onopen?.(); }
  message(data: unknown, id = ''): void { this.onmessage?.({data: JSON.stringify(data), lastEventId: id}); }
  fail(terminal = true): void { this.readyState = terminal ? FakeEventSource.CLOSED : 0; this.onerror?.(); }
}

function setup(t: TestContext, platform = 'browser', hubUrl = HUB) {
  const browser = new EventTarget();
  const restoreGlobals: (() => unknown)[] = [];
  for (const [key, value] of [['EventSource', FakeEventSource], ['window', browser]] as const) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, {value, configurable: true, writable: true});
    restoreGlobals.push(() => original ? Object.defineProperty(globalThis, key, original) : Reflect.deleteProperty(globalThis, key));
  }
  FakeEventSource.instances = [];
  t.mock.timers.enable({apis: ['setTimeout']});
  const injector = Injector.create({providers: [
    {provide: PLATFORM_ID, useValue: platform},
    {provide: MERCURE_HUB_URL, useValue: hubUrl},
    {provide: BRIDGE_MERCURE_WITH_CREDENTIALS, useValue: true},
  ]});
  const hub = runInInjectionContext(injector, () => new MercureHub());
  t.after(() => { hub.ngOnDestroy(); injector.destroy(); restoreGlobals.forEach((restore) => restore()); });
  return {hub, injector, browser, sources: FakeEventSource.instances};
}

describe('MercureHub', () => {
  it('shares the union of subscriptions, resumes after changes and closes after the last consumer', (t) => {
    const {hub, sources} = setup(t);
    let diagnostics;
    let status;
    const updates: unknown[] = [];
    hub.diagnostics$().subscribe((value) => { diagnostics = value; });
    hub.status$().subscribe((value) => { status = value; });
    const first = hub.subscribe$(BOOKS).subscribe((update) => updates.push(update));
    const second = hub.subscribe$(BOOKS).subscribe();
    const authors = hub.subscribe$(AUTHORS).subscribe();

    assert.equal(sources.length, 0);
    t.mock.timers.tick(0);
    assert.equal(sources.length, 1);
    assert.deepEqual(new URL(sources[0].url).searchParams.getAll('match_urlpattern').sort(), [AUTHORS.match, BOOKS.match]);
    assert.deepEqual(sources[0].options, {withCredentials: true});
    assert.equal(diagnostics.subscriptions.find((sub) => sub.match === BOOKS.match).consumers, 2);
    sources[0].open();
    assert.equal(status, 'connected');

    const book = {'@id': '/api/books/1', title: 'Dune'};
    sources[0].message(book, 'event-1');
    assert.equal(diagnostics.lastEventId, 'event-1');
    sources[0].onmessage?.({data: 'invalid JSON', lastEventId: 'event-2'});
    assert.deepEqual(updates, [{id: 'event-1', data: book}]);
    authors.unsubscribe();
    t.mock.timers.tick(0);
    assert.equal(sources.length, 2);
    assert.equal(sources[0].readyState, FakeEventSource.CLOSED);
    assert.equal(new URL(sources[1].url).searchParams.get('last_event_id'), 'event-2');
    assert.deepEqual(new URL(sources[1].url).searchParams.getAll('match_urlpattern'), [BOOKS.match]);

    first.unsubscribe();
    t.mock.timers.tick(0);
    assert.equal(sources.length, 2);
    assert.equal(diagnostics.subscriptions[0].consumers, 1);
    second.unsubscribe();
    t.mock.timers.tick(0);
    assert.equal(sources[1].readyState, FakeEventSource.CLOSED);
    assert.equal(status, 'closed');
    assert.deepEqual(diagnostics.subscriptions, []);
  });

  it('leaves network retries to EventSource, backs off terminal failures and cancels pending retries', (t) => {
    const {hub, sources} = setup(t);
    const subscription = hub.subscribe$(BOOKS).subscribe();
    t.mock.timers.tick(0);
    sources[0].open();
    sources[0].message({'@id': '/api/books/1', title: 'Dune'}, 'event-1');
    sources[0].fail(false);
    t.mock.timers.tick(5_000);
    assert.equal(sources.length, 1);

    sources[0].fail();
    t.mock.timers.tick(999);
    assert.equal(sources.length, 1);
    t.mock.timers.tick(1);
    assert.equal(sources.length, 2);
    assert.equal(new URL(sources[1].url).searchParams.get('last_event_id'), 'event-1');
    sources[1].fail();
    t.mock.timers.tick(1_999);
    assert.equal(sources.length, 2);
    t.mock.timers.tick(1);
    assert.equal(sources.length, 3);

    sources[2].open();
    sources[2].fail();
    t.mock.timers.tick(1_000);
    assert.equal(sources.length, 4);
    sources[3].fail();
    subscription.unsubscribe();
    t.mock.timers.tick(30_000);
    assert.equal(sources.length, 4);
  });

  it('completes consumers and cancels reconnections when destroyed', (t) => {
    const {hub, sources, browser} = setup(t);
    const removeListener = t.mock.method(browser, 'removeEventListener');
    let completed = false;
    hub.subscribe$(BOOKS).subscribe({complete: () => { completed = true; }});
    t.mock.timers.tick(0);
    const staleOpen = sources[0].onopen;
    const staleMessage = sources[0].onmessage;
    const staleError = sources[0].onerror;
    sources[0].fail();
    hub.ngOnDestroy();
    staleOpen?.();
    staleMessage?.({data: '{"@id":"/api/books/1","title":"stale"}', lastEventId: 'stale-event'});
    staleError?.();
    let laterCompleted = false;
    hub.subscribe$(BOOKS).subscribe({complete: () => { laterCompleted = true; }});
    t.mock.timers.tick(30_000);
    assert.equal(completed, true);
    assert.equal(laterCompleted, true);
    assert.equal(sources.length, 1);
    assert.equal(removeListener.mock.callCount(), 2);
  });

  it('suspends in the back/forward cache and resumes the active subscriptions with the last event ID', (t) => {
    const {hub, sources, browser} = setup(t);
    hub.subscribe$(BOOKS).subscribe();
    t.mock.timers.tick(0);
    sources[0].message({'@id': '/api/books/1', title: 'Dune'}, 'event-1');
    const hide = new Event('pagehide');
    Object.defineProperty(hide, 'persisted', {value: true});
    browser.dispatchEvent(hide);
    assert.equal(sources[0].readyState, FakeEventSource.CLOSED);
    hub.subscribe$(AUTHORS).subscribe();
    t.mock.timers.tick(30_000);
    assert.equal(sources.length, 1);

    const show = new Event('pageshow');
    Object.defineProperty(show, 'persisted', {value: true});
    browser.dispatchEvent(show);
    t.mock.timers.tick(0);
    assert.equal(sources.length, 2);
    const url = new URL(sources[1].url);
    assert.equal(url.searchParams.get('last_event_id'), 'event-1');
    assert.deepEqual(url.searchParams.getAll('match_urlpattern').sort(), [AUTHORS.match, BOOKS.match]);
  });

  for (const [name, platform, hubUrl] of [['SSR', 'server', HUB], ['no configured hub', 'browser', '']]) {
    it(`does not connect with ${name}`, (t) => {
      const {hub, sources} = setup(t, platform, hubUrl);
      let completed = false;
      hub.subscribe$(BOOKS).subscribe({complete: () => { completed = true; }});
      t.mock.timers.tick(30_000);
      assert.equal(completed, true);
      assert.equal(sources.length, 0);
    });
  }
});

describe('ResourceFacade.watch$', () => {
  it('routes native entities and deletions to collection or exact IRI observers on the shared connection', (t) => {
    const {hub, injector, sources} = setup(t);
    const books = runInInjectionContext(injector, () => new ResourceFacade({} as never, hub, new ResourceTopic(BOOKS.match, BASE)));
    const authors = runInInjectionContext(injector, () => new ResourceFacade({} as never, hub, new ResourceTopic(AUTHORS.match, BASE)));
    const all: unknown[] = [];
    const relative: unknown[] = [];
    const absolute: unknown[] = [];
    const other: unknown[] = [];
    books.watch$().subscribe((event) => all.push(event));
    books.watch$('/api/books/1').subscribe((event) => relative.push(event));
    books.watch$(`${BASE}/api/books/1`).subscribe((event) => absolute.push(event));
    authors.watch$().subscribe((event) => other.push(event));
    t.mock.timers.tick(0);

    assert.equal(sources.length, 1);
    const url = new URL(sources[0].url);
    assert.deepEqual(url.searchParams.getAll('match'), [`${BASE}/api/books/1`]);
    assert.deepEqual(url.searchParams.getAll('match_urlpattern').sort(), [AUTHORS.match, BOOKS.match]);
    const first = {'@id': '/api/books/1', title: 'Dune', author: '/api/authors/1'};
    const second = {'@id': `${BASE}/api/books/2`, title: 'Ubik'};
    const author = {'@id': '/api/authors/1', name: 'Herbert'};
    sources[0].message(first);
    sources[0].message(second);
    sources[0].message(author);
    sources[0].message({'@id': '/api/books/1/reviews/2', rating: 5});
    sources[0].message({'@id': 'https://other.example.com/api/books/1', title: 'Other API'});
    sources[0].message({'@id': `${BASE}/api/books/1`, '@type': 'Book'});

    const upsert = {kind: 'upsert', iri: first['@id'], data: first};
    const deletion = {kind: 'delete', iri: `${BASE}/api/books/1`};
    assert.deepEqual(relative, [upsert, deletion]);
    assert.deepEqual(absolute, relative);
    assert.deepEqual(all, [upsert, {kind: 'upsert', iri: second['@id'], data: second}, deletion]);
    assert.deepEqual(other, [{kind: 'upsert', iri: author['@id'], data: author}]);
  });
});
