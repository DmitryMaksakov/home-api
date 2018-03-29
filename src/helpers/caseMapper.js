const
  to = require('to-case'),
  mapKeys = require('lodash/mapKeys');

// Converts database_notation to camelCase
function caseMapper(obj) {
  return mapKeys(obj, (v, k) => { return to.camel(k) });
}

module.exports = caseMapper;