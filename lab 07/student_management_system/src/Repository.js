class Repository {
  constructor() {
    this.records = new Map();
    this.nextId = 1;
  }

  findAll() {
    return Array.from(this.records.values(), (record) => ({ ...record }));
  }

  findById(id) {
    const record = this.records.get(id);
    return record ? { ...record } : null;
  }

  findWhere(criteria) {
    return this.findAll().filter((record) =>
      Object.entries(criteria).every(([key, value]) => record[key] === value)
    );
  }

  insert(attributes) {
    const record = { id: this.nextId++, ...attributes };
    this.records.set(record.id, record);
    return { ...record };
  }

  merge(id, attributes) {
    const current = this.records.get(id);
    if (!current) return null;
    const updated = { ...current, ...attributes, id };
    this.records.set(id, updated);
    return { ...updated };
  }

  overwrite(id, attributes) {
    if (!this.records.has(id)) return null;
    const replacement = { id, ...attributes };
    this.records.set(id, replacement);
    return { ...replacement };
  }

  erase(id) {
    return this.records.delete(id);
  }
}

module.exports = Repository;
