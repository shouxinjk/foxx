'use strict';
const dd = require('dedent');
const joi = require('joi');
const httpError = require('http-errors');
const status = require('statuses');
const errors = require('@arangodb').errors;
const createRouter = require('@arangodb/foxx/router');
const Property = require('../models/property');

//const properties = module.context.collection('properties');
const properties = module.collection('properties');
const keySchema = joi.string().required()
.description('The key of the property');

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code;
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code;
const HTTP_NOT_FOUND = status('not found');
const HTTP_CONFLICT = status('conflict');

const router = createRouter();
module.exports = router;


router.tag('property');


router.get(function (req, res) {
  res.send(properties.all());
}, 'list')
.response([Property], 'A list of properties.')
.summary('List all properties')
.description(dd`
  Retrieves a list of all properties.
`);


router.post(function (req, res) {
  const property = req.body;
  let meta;
  try {
    meta = properties.save(property);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(property, meta);
  res.status(201);
  res.set('location', req.makeAbsolute(
    req.reverse('detail', {key: property._key})
  ));
  res.send(property);
}, 'create')
.body(Property, 'The property to create.')
.response(201, Property, 'The created property.')
.error(HTTP_CONFLICT, 'The property already exists.')
.summary('Create a new property')
.description(dd`
  Creates a new property from the request body and
  returns the saved document.
`);


router.get(':key', function (req, res) {
  const key = req.pathParams.key;
  let property
  try {
    property = properties.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
  res.send(property);
}, 'detail')
.pathParam('key', keySchema)
.response(Property, 'The property.')
.summary('Fetch a property')
.description(dd`
  Retrieves a property by its key.
`);


router.put(':key', function (req, res) {
  const key = req.pathParams.key;
  const property = req.body;
  let meta;
  try {
    meta = properties.replace(key, property);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(property, meta);
  res.send(property);
}, 'replace')
.pathParam('key', keySchema)
.body(Property, 'The data to replace the property with.')
.response(Property, 'The new property.')
.summary('Replace a property')
.description(dd`
  Replaces an existing property with the request body and
  returns the new document.
`);


router.patch(':key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let property;
  try {
    properties.update(key, patchData);
    property = properties.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  res.send(property);
}, 'update')
.pathParam('key', keySchema)
.body(joi.object().description('The data to update the property with.'))
.response(Property, 'The updated property.')
.summary('Update a property')
.description(dd`
  Patches a property with the request body and
  returns the updated document.
`);

/**
router.delete(':key', function (req, res) {
  const key = req.pathParams.key;
  try {
    properties.remove(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
}, 'delete')
.pathParam('key', keySchema)
.response(null)
.summary('Remove a property')
.description(dd`
  Deletes a property from the database.
`);
//**/