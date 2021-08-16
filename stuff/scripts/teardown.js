'use strict';
const db = require('@arangodb').db;
const collections = [
  "stuff"
];

/**
//NOTICE:DO NOT remove my_stuff
for (const localName of collections) {
  const qualifiedName = module.context.collectionName(localName);
  db._drop(qualifiedName);
}
//**/
