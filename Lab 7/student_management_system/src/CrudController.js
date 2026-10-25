const ApiError = require("./ApiError");

class CrudController {
  constructor({ repository, schema, beforeCreate, beforeUpdate, beforeDelete }) {
    this.repository = repository;
    this.schema = schema;
    this.beforeCreate = beforeCreate || (() => {});
    this.beforeUpdate = beforeUpdate || (() => {});
    this.beforeDelete = beforeDelete || (() => {});
  }

  list(query = {}) {
    const criteria = {};
    for (const [key, value] of Object.entries(query)) {
      const definition = this.schema.fields[key];
      if (!definition) continue;
      if (definition.type === "whole" || definition.type === "decimal") {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || (definition.type === "whole" && !Number.isSafeInteger(parsed))) {
          throw ApiError.badRequest(`${key} must be a valid ${definition.type}`);
        }
        criteria[key] = parsed;
      } else {
        criteria[key] = value;
      }
    }
    return this.repository.findWhere(this.schema.sanitize(criteria, { partial: true }));
  }

  show(id) {
    const record = this.repository.findById(id);
    if (!record) throw ApiError.notFound("Record not found");
    return record;
  }

  create(body) {
    const attributes = this.schema.sanitize(body);
    this.beforeCreate(attributes);
    return this.repository.insert(attributes);
  }

  replace(id, body) {
    const current = this.show(id);
    const attributes = this.schema.sanitize(body);
    this.beforeUpdate(attributes, current);
    return this.repository.overwrite(id, attributes);
  }

  patch(id, body) {
    const current = this.show(id);
    const attributes = this.schema.sanitize(body, { partial: true });
    this.beforeUpdate({ ...current, ...attributes }, current);
    return this.repository.merge(id, attributes);
  }

  destroy(id) {
    const current = this.show(id);
    this.beforeDelete(current);
    this.repository.erase(id);
    return { message: "Record deleted successfully" };
  }
}

module.exports = CrudController;
