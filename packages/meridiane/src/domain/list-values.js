export function splitListArgs(values) {
  return (Array.isArray(values) ? values : [])
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}
