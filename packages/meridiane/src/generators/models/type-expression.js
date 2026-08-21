const PRECEDENCE = {
  union: 1,
  intersection: 2,
  primary: 3,
};

function expression(code, precedence, kind, members, acceptsNull) {
  return {code, precedence, kind, members, acceptsNull};
}

export function atomicType(code, acceptsNull = false) {
  return expression(code, PRECEDENCE.primary, 'atomic', [], acceptsNull);
}

export function formatType(type, parentPrecedence = PRECEDENCE.primary) {
  return type.precedence < parentPrecedence ? `(${type.code})` : type.code;
}

function uniqueTypes(types) {
  return [...new Map(types.map((type) => [type.code, type])).values()];
}

function flatten(types, kind) {
  return types.flatMap((type) => type.kind === kind ? type.members : [type]);
}

export function unionType(types) {
  const members = uniqueTypes(flatten(types, 'union')).filter((member) => member.code !== 'never');
  if (members.length === 0) return atomicType('any');
  if (members.some((member) => member.code === 'any')) return atomicType('any');
  if (members.length === 1) return members[0];

  const ordered = members.filter((member) => member.code !== 'null');
  ordered.push(...members.filter((member) => member.code === 'null'));
  return expression(
    ordered.map((member) => formatType(member, PRECEDENCE.union)).join(' | '),
    PRECEDENCE.union,
    'union',
    ordered,
    members.some((member) => member.acceptsNull)
  );
}

export function intersectionType(types) {
  const members = uniqueTypes(flatten(types, 'intersection')).filter((member) => member.code !== 'any');
  if (members.length === 0) return atomicType('any');
  if (members.some((member) => member.code === 'never')) return atomicType('never');
  if (members.length === 1) return members[0];

  return expression(
    members.map((member) => formatType(member, PRECEDENCE.intersection)).join(' & '),
    PRECEDENCE.intersection,
    'intersection',
    members,
    members.every((member) => member.acceptsNull)
  );
}

export function arrayType(item) {
  return atomicType(`${formatType(item)}[]`);
}

export function nullableType(type) {
  return type.acceptsNull ? type : unionType([type, atomicType('null', true)]);
}
