'use strict';
const db = require('@arangodb').db;
const collections = [
  "properties","platform_properties"
];

for (const localName of collections) {
  //const qualifiedName = module.context.collectionName(localName);
  const qualifiedName = localName;
  db._drop(qualifiedName);
}
