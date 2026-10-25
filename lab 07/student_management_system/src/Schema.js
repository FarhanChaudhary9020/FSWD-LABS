const ApiError = require("./ApiError");

class Schema {
  constructor(fields) {
    this.fields = fields;
  }

  sanitize(input, { partial = false } = {}) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw ApiError.badRequest("Request data must be an object");
    }

    const output = {};
    for (const [name, definition] of Object.entries(this.fields)) {
      if (!Object.prototype.hasOwnProperty.call(input, name)) {
        if (!partial && definition.required !== false) {
          throw ApiError.badRequest(`${name} is required`);
        }
        continue;
      }
      output[name] = this.validate(name, input[name], definition);
    }
    return output;
  }

  validate(name, value, definition) {
    const invalid = () => {
      throw ApiError.badRequest(`${name} must be a valid ${definition.type}`);
    };

    switch (definition.type) {
      case "text":
        if (typeof value !== "string" || value.trim() === "") invalid();
        return value.trim();
      case "email":
        if (
          typeof value !== "string" ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
        ) {
          invalid();
        }
        return value.trim();
      case "whole":
        if (!Number.isSafeInteger(value)) invalid();
        return value;
      case "decimal":
        if (typeof value !== "number" || !Number.isFinite(value)) invalid();
        return value;
      case "day": {
        if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          invalid();
        }
        const date = new Date(`${value}T00:00:00.000Z`);
        if (
          !Number.isFinite(date.getTime()) ||
          date.toISOString().slice(0, 10) !== value
        ) {
          invalid();
        }
        return value;
      }
      case "choice":
        if (!definition.options.includes(value)) invalid();
        return value;
      default:
        throw new Error(`Unsupported schema type: ${definition.type}`);
    }
  }
}

module.exports = Schema;
