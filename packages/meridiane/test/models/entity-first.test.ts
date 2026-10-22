import {it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeBuildOptions, normalizeDevOptions, normalizeGenerateOptions} from '../../src/domain/bridge-options.js';
import {buildModelsFromOpenAPI} from '../../src/generators/models/openapi-to-models.js';

const spec = JSON.parse(readFileSync(new URL('../fixtures/entity-first.openapi.json', import.meta.url), 'utf8'));

it('generates identical entity contracts in dev, generate and build', () => {
  const modes = [normalizeDevOptions, normalizeGenerateOptions, normalizeBuildOptions];
  const models = modes.map((normalize) => buildModelsFromOpenAPI(spec, normalize('@acme/bridge', {})));
  assert.deepEqual(models[0], models[1]);
  assert.deepEqual(models[1], models[2]);
});

it('preserves IRI relations, required properties and declared nullability', () => {
  const {models} = buildModelsFromOpenAPI(spec, normalizeBuildOptions('@acme/bridge', {}));
  const conversation = models.find((model) => model.name === 'Conversation');
  const message = models.find((model) => model.name === 'Message');
  assert.ok(conversation?.extendsItem);
  assert.ok(message?.extendsItem);
  assert.deepEqual(conversation.props.map(({name, type, optional}) => ({name, type, optional})), [
    {name: 'title', type: 'string', optional: false},
    {name: 'description', type: 'string | null', optional: true},
    {name: 'messages', type: 'string[]', optional: false},
  ]);
  assert.equal(message.props.find((prop) => prop.name === 'conversation')?.type, 'string');
});
