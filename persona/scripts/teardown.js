'use strict';
const db = require('@arangodb').db;
const collections = [
  "personas"
];

for (const localName of collections) {
  const qualifiedName = module.context.collectionName(localName);
  //do nothing
 //db._drop(qualifiedName);
}
