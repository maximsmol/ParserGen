export const coerceWDefault = (schema, x) => {
  if (x == null)
    return schema;

  if (typeof x !== typeof schema)
    return schema;
  else if (typeof schema === 'object') {
    if (schema instanceof Map)
      for (const [k, v] of schema.entries())
        x.set(k, coerceWDefault(v, x.get(k)) );
    else
      for (const [k, v] of Object.entries(schema))
        x[k] = coerceWDefault(v, x[k]);
  }
  else if (Array.isArray(schema)) {
    for (let i = 0; i < schema.length; ++i)
      x[i] = coerceWDefault(schema[i], x[i]);
  }

  return x;
};
