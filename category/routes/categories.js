'use strict';
const db = require('@arangodb').db;
const aql = require('@arangodb').aql;
const dd = require('dedent');
const joi = require('joi');
const httpError = require('http-errors');
const status = require('statuses');
const errors = require('@arangodb').errors;
const createRouter = require('@arangodb/foxx/router');
const Category = require('../models/category');

//const categories = module.context.collection('categories');
const categories = db._collection('category_categories');
const keySchema = joi.string().required()
.description('The key of the category');

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code;
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code;
const HTTP_NOT_FOUND = status('not found');
const HTTP_CONFLICT = status('conflict');

const router = createRouter();
module.exports = router;


router.tag('category');


router.get(function (req, res) {
  res.send(categories.all());
}, 'list')
.response([Category], 'A list of categories.')
.summary('List all categories')
.description(dd`
  Retrieves a list of all categories.
`);


router.post(function (req, res) {
  const category = req.body;
  let meta;
  try {
    meta = categories.save(category);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(category, meta);
  res.status(201);
  res.set('location', req.makeAbsolute(
    req.reverse('detail', {key: category._key})
  ));
  res.send(category);
}, 'create')
.body(Category, 'The category to create.')
.response(201, Category, 'The created category.')
.error(HTTP_CONFLICT, 'The category already exists.')
.summary('Create a new category')
.description(dd`
  Creates a new category from the request body and
  returns the saved document.
`);


router.get(':key', function (req, res) {
  const key = req.pathParams.key;
  let category
  try {
    category = categories.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
  res.send(category);
}, 'detail')
.pathParam('key', keySchema)
.response(Category, 'The category.')
.summary('Fetch a category')
.description(dd`
  Retrieves a category by its key.
`);


router.put(':key', function (req, res) {
  const key = req.pathParams.key;
  const category = req.body;
  let meta;
  try {
    meta = categories.replace(key, category);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(category, meta);
  res.send(category);
}, 'replace')
.pathParam('key', keySchema)
.body(Category, 'The data to replace the category with.')
.response(Category, 'The new category.')
.summary('Replace a category')
.description(dd`
  Replaces an existing category with the request body and
  returns the new document.
`);


router.patch(':key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let category;
  try {
    categories.update(key, patchData);
    category = categories.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  res.send(category);
}, 'update')
.pathParam('key', keySchema)
.body(joi.object().description('The data to update the category with.'))
.response(Category, 'The updated category.')
.summary('Update a category')
.description(dd`
  Patches a category with the request body and
  returns the updated document.
`);

/**
router.delete(':key', function (req, res) {
  const key = req.pathParams.key;
  try {
    categories.remove(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
}, 'delete')
.pathParam('key', keySchema)
.response(null)
.summary('Remove a category')
.description(dd`
  Deletes a category from the database.
`);
//**/
