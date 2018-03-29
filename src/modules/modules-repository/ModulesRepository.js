// @flow

// Stores registered module instances
class ModulesRepository {
  modulesById: {[string]: Object};

  constructor() {
    this.modulesById = {};
  }

  registerModule(id: string, module: Object) {
    this.modulesById[id] = module
  }

  getModule(id: string) {
    if (!this.modulesById[id]) {
      throw new ReferenceError(`Module ${id} was not found`);
    }

    return this.modulesById[id];
  }
}

module.exports = new ModulesRepository();