import {isValidTsIdentifier, sanitizeTypeName} from "./utils.js";

function isObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}


function quoteKeyIfNeeded(k) {
  return isValidTsIdentifier(k) ? k : `'${k.replace(/'/g, "\'")}'`;
}

function schemaNameFromRef($ref) {
  const m = $ref.match(/#\/components\/schemas\/(.+)$/);
  return m ? m[1] : $ref;
}

function mergeAllOf(schemas) {
  // Essaye d'aplatir un allOf en un unique object.
  // Supporte le pattern courant API Platform:
  //   allOf: [ { $ref: HydraItemBaseSchema }, { type: 'object', properties: ... } ]
  // On ignore les $ref vers HydraItemBaseSchema/HydraCollectionBaseSchema.
  const out = {type: 'object', properties: {}, required: []};
  for (const s of schemas) {
    if (s.$ref) {
      const ref = schemaNameFromRef(s.$ref);
      if (/^Hydra(?:Item|Collection)BaseSchema$/.test(ref)) {
        // Ignorer les schémas Hydra de base
        continue;
      }
      return null;
    }
    if (s.type === 'object') {
      Object.assign(out.properties, s.properties || {});
      if (Array.isArray(s.required)) out.required.push(...s.required);
    } else {
      return null;
    }
  }
  out.required = [...new Set(out.required)];
  return out;
}

function friendlyName(original) {
  // Convertit un nom de schéma OpenAPI en un nom lisible sans artefacts jsonld/jsonapi
  // et en intégrant les groupes (ex: Identity.jsonld-user.read -> Identity user read)
  const m = original.match(/^(.*?)(?:\.(?:jsonld|jsonapi))?-(.+)$/i);
  if (m) {
    const base = m[1];
    const baseSimple = base.split('.').pop();
    const groupTokens = m[2].split('.');
    if (groupTokens.length && groupTokens[0].toLowerCase() === String(baseSimple).toLowerCase()) {
      groupTokens.shift();
    }
    const group = groupTokens.join(' ');
    return group ? `${base} ${group}` : base;
  }
  // Supprime un éventuel suffixe simple .jsonld/.jsonapi
  return original.replace(/\.(jsonld|jsonapi)$/ig, '');
}

export function buildModelsFromOpenAPI(spec) {
  const schemas = spec?.components?.schemas || {};
  // Récupère les schémas de premier niveau à générer.
  // On exclut:
  //  - les schémas avec un point (noms dérivés, variantes, etc.)
  //  - les schémas jsonld
  //  - les schémas Hydra de base (remplacent Item/Collection côté API Platform 4.2)
  //    que l’on ne souhaite pas générer pour garder notre `Item`/`Collection` maison
  const origNames = Object
    .keys(schemas)
    .filter(n => !/^Hydra(?:Item|Collection)BaseSchema$/.test(n))
    .filter(n => {
      const hasGroup = n.includes('-');
      const hasDot = n.includes('.');
      const isJsonFlavor = /jsonld|jsonapi/i.test(n);
      if (hasGroup) {
        // Garde les schémas groupés (ex: *.jsonld-user.read, Identity-user.update, ...)
        return true;
      }
      // Sinon, garder uniquement les schémas "racine" (pas jsonld/jsonapi ni nom en pointillés)
      if (hasDot) return false;
      if (isJsonFlavor) return false;
      return true;
    })
    .sort((a, b) => a.localeCompare(b));

  const used = new Set();
  const nameMap = new Map(); // original → sanitized
  for (const n of origNames) nameMap.set(n, sanitizeTypeName(friendlyName(n), used));

  // Résolveur de type avec collecte de deps
  function tsTypeOf(schema, deps) {
    if (!schema) return 'any';

    if (schema.$ref) {
      const orig = schemaNameFromRef(schema.$ref);
      const name = nameMap.get(orig) || orig;
      // On enregistre la dépendance (elle sera filtrée plus tard)
      if (deps) deps.add(name);
      return name;
    }

    if (schema.allOf) {
      const merged = mergeAllOf(schema.allOf);
      if (merged) return tsTypeOf(merged, deps);
      return schema.allOf.map((s) => tsTypeOf(s, deps)).join(' & ');
    }
    if (schema.oneOf) return schema.oneOf.map((s) => tsTypeOf(s, deps)).join(' | ');
    if (schema.anyOf) return schema.anyOf.map((s) => tsTypeOf(s, deps)).join(' | ');

    if (schema.type === 'array') {
      const it = tsTypeOf(schema.items || {}, deps);
      return `${it}[]`;
    }

    if (schema.type === 'object' || (schema.properties || schema.additionalProperties)) {
      const props = schema.properties || {};
      const entries = Object.entries(props);
      const inline = entries.map(([k, v]) => {
        const t = tsTypeOf(v, deps);
        const opt = (schema.required || []).includes(k) ? '' : '?';
        const nullable = v?.nullable ? ' | null' : '';
        const key = quoteKeyIfNeeded(k);
        return `${key}${opt}: ${t}${nullable};`;
      });
      if (schema.additionalProperties) {
        const at = tsTypeOf(schema.additionalProperties, deps);
        inline.push(`[key: string]: ${at};`);
      }
      return `{ ${inline.join(' ')} }`;
    }

    if (schema.enum) {
      return schema.enum.map((v) => (typeof v === 'string' ? `'${v.replace(/'/g, "\'")}'` : v)).join(' | ');
    }

    if (schema.type === 'string') return 'string';
    if (schema.type === 'integer' || schema.type === 'number') return 'number';
    if (schema.type === 'boolean') return 'boolean';

    return 'any';
  }

  const allSanitizedNames = new Set([...nameMap.values()]);

  const models = [];
  for (const origName of origNames) {
    const s = schemas[origName];
    let effective = s;
    if (s?.allOf) {
      const merged = mergeAllOf(s.allOf);
      if (merged) effective = merged;
    }

    const isObjectLike = effective?.type === 'object' || isObject(effective?.properties);
    if (!isObjectLike) continue;

    const sanitized = nameMap.get(origName);
    const required = new Set(effective.required || []);
    const deps = new Set();

    const props = Object.entries(effective.properties || {}).map(([propName, prop]) => {
      const baseType = tsTypeOf(prop, deps);
      const nullable = prop?.nullable ? ' | null' : '';
      const type = baseType + nullable;
      return {
        name: propName,
        tsKey: quoteKeyIfNeeded(propName),
        type,
        optional: !required.has(propName),
      };
    });

    // Construire la liste d'import: uniquement les autres modèles connus, exclure soi-même et les builtins
    const imports = [...deps]
      .filter((n) => n !== sanitized)
      .filter((n) => allSanitizedNames.has(n))
      .sort((a, b) => a.localeCompare(b));

    models.push({name: sanitized, props, imports});
  }

  return {models};
}
