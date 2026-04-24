/**
 * Validation runtime légère — remplace Zod (absent du frontend).
 * Chaque template expose un `contract` et appelle `validateContract(data, contract)`.
 *
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string[]} errors - chemin.clé => message
 */

const TYPE_CHECKERS = {
  string: (v) => typeof v === 'string',
  number: (v) => typeof v === 'number' && !Number.isNaN(v),
  boolean: (v) => typeof v === 'boolean',
  object: (v) => v !== null && typeof v === 'object' && !Array.isArray(v),
  array: (v) => Array.isArray(v),
  any: () => true,
};

function checkType(value, type) {
  if (type.startsWith('array<')) return Array.isArray(value);
  if (type.startsWith('enum:')) {
    const options = type.slice(5).split('|');
    return typeof value === 'string' && options.includes(value);
  }
  const checker = TYPE_CHECKERS[type];
  return checker ? checker(value) : true;
}

/**
 * @param {*} data
 * @param {Object} contract - { field: { type, required, length?, shape? } }
 * @param {string} [path=''] - internal
 * @returns {ValidationResult}
 */
export function validateContract(data, contract, path = '') {
  const errors = [];

  if (!contract || typeof contract !== 'object') {
    return { valid: true, errors: [] };
  }

  if (data === null || data === undefined) {
    return { valid: false, errors: [`${path || 'data'}: missing`] };
  }

  for (const [key, spec] of Object.entries(contract)) {
    const fieldPath = path ? `${path}.${key}` : key;
    const value = data[key];
    const isMissing = value === undefined || value === null;

    if (isMissing) {
      if (spec.required) errors.push(`${fieldPath}: required but missing`);
      continue;
    }

    if (spec.type && !checkType(value, spec.type)) {
      errors.push(`${fieldPath}: expected ${spec.type}`);
      continue;
    }

    if (spec.type && spec.type.startsWith('array<') && spec.length != null) {
      if (value.length !== spec.length) {
        errors.push(`${fieldPath}: expected length ${spec.length}, got ${value.length}`);
      }
    }

    if (spec.shape && typeof value === 'object' && !Array.isArray(value)) {
      const nested = validateContract(value, spec.shape, fieldPath);
      errors.push(...nested.errors);
    }

    if (spec.shape && Array.isArray(value)) {
      value.forEach((item, i) => {
        const nested = validateContract(item, spec.shape, `${fieldPath}[${i}]`);
        errors.push(...nested.errors);
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Helper: log warnings en dev, throw en strict mode.
 */
export function assertValid(data, contract, templateName, strict = false) {
  const { valid, errors } = validateContract(data, contract);
  if (!valid) {
    const message = `[Template:${templateName}] invalid data\n  - ${errors.join('\n  - ')}`;
    if (strict) throw new Error(message);
    if (typeof console !== 'undefined') console.warn(message);
  }
  return valid;
}
