'use strict';
const dd = require('dedent');
const db = require('@arangodb').db;
const aql = require('@arangodb').aql;
const joi = require('joi');
const httpError = require('http-errors');
const status = require('statuses');
const errors = require('@arangodb').errors;
const createRouter = require('@arangodb/foxx/router');
const Stuff = require('../models/stuff');
const Category = require('../models/category');

const stuffItems = module.context.collection('stuff');
const keySchema = joi.string().required()
.description('The key of the stuff');

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code;
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code;
const HTTP_NOT_FOUND = status('not found');
const HTTP_CONFLICT = status('conflict');

const router = createRouter();
module.exports = router;


router.tag('stuff');

/**
router.get(function (req, res) {
  res.send(stuffItems.all());
}, 'list')
.response([Stuff], 'A list of stuffItems.')
.summary('List all stuffItems')
.description(dd`
  Retrieves a list of all stuffItems.
`);
//**/

router.post(function (req, res) {
  const stuff = req.body;
  let meta;
  try {
    meta = stuffItems.save(stuff);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(stuff, meta);
  res.status(201);
  res.set('location', req.makeAbsolute(
    req.reverse('detail', {key: stuff._key})
  ));
  res.send(stuff);
}, 'create')
.body(Stuff, 'The stuff to create.')
.response(201, Stuff, 'The created stuff.')
.error(HTTP_CONFLICT, 'The stuff already exists.')
.summary('Create a new stuff')
.description(dd`
  Creates a new stuff from the request body and
  returns the saved document.
`);


router.get(':key', function (req, res) {
  const key = req.pathParams.key;
  let stuff
  try {
    stuff = stuffItems.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
  res.send(stuff);
}, 'detail')
.pathParam('key', keySchema)
.response(Stuff, 'The stuff.')
.summary('Fetch a stuff')
.description(dd`
  Retrieves a stuff by its key.
`);

/**
router.put(':key', function (req, res) {
  const key = req.pathParams.key;
  const stuff = req.body;
  let meta;
  try {
    meta = stuffItems.replace(key, stuff);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(stuff, meta);
  res.send(stuff);
}, 'replace')
.pathParam('key', keySchema)
.body(Stuff, 'The data to replace the stuff with.')
.response(Stuff, 'The new stuff.')
.summary('Replace a stuff')
.description(dd`
  Replaces an existing stuff with the request body and
  returns the new document.
`);
//**/

router.patch(':key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let stuff;
  try {
    stuffItems.update(key, patchData);
    stuff = stuffItems.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  res.send(stuff);
}, 'update')
.pathParam('key', keySchema)
.body(joi.object().description('The data to update the stuff with.'))
.response(Stuff, 'The updated stuff.')
.summary('Update a stuff')
.description(dd`
  Patches a stuff with the request body and
  returns the updated document.
`);

/**
router.delete(':key', function (req, res) {
  const key = req.pathParams.key;
  try {
    stuffItems.remove(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
}, 'delete')
.pathParam('key', keySchema)
.response(null)
.summary('Remove a stuff')
.description(dd`
  Deletes a stuff from the database.
`);
//**/

/*
目录标注完成后更新stuff的目录信息。参数：
{
  source: 来源,     //required
  old: 原mappingId,//required  不传或为null则直接跳过
  new: 新mappingId //required
}
*/
router.patch('mapping/category', function (req, res) {
  const data = req.body;
  var result = {
    result:"success",
    msg:"categories are changed.",
    data:data
  }
  if(!data.source || !data.old || !data.new){//stop processing and return
    data.msg = "All source/old/new fields are required.Please check again.";
    data.result = "error";
    res.send(result);
  }else{
    let stuff;
    var query = aql`
                FOR doc IN my_stuff 
                UPDATE doc with {mappingId:${data.new}} in my_stuff 
                FILTER doc.mappingId==${data.old} and doc.source==${data.source}
                RETURN NEW
                `;            
    try {
      stuff = db._query(query).toArray();
    } catch (e) {
      throw e;
    }
    result.stuff = stuff;
    res.send(result);
  }
}, 'update')
.body(joi.object().description('The new mappingId and old mappingId.'))
.response(Category, 'The updated stuff.')
.summary('Change mappingId of stuff.')
.description(dd`
  Batch change stuff with new mappingId.
`);