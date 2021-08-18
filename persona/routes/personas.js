'use strict';
const dd = require('dedent');
const joi = require('joi');
const httpError = require('http-errors');
const status = require('statuses');
const errors = require('@arangodb').errors;
const createRouter = require('@arangodb/foxx/router');
const Persona = require('../models/persona');

const personas = module.context.collection('personas');
//const personas = db._collection('persona_personas');
const keySchema = joi.string().required()
.description('The key of the persona');

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code;
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code;
const HTTP_NOT_FOUND = status('not found');
const HTTP_CONFLICT = status('conflict');

const router = createRouter();
module.exports = router;


router.tag('persona');

router.get(function (req, res) {
  res.send(personas.all());
}, 'list')
.response([Persona], 'A list of personas.')
.summary('List all personas')
.description(dd`
  Retrieves a list of all personas.
`);

/**
router.post(function (req, res) {
  const persona = req.body;
  let meta;
  try {
    meta = personas.save(persona);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(persona, meta);
  res.status(201);
  res.set('location', req.makeAbsolute(
    req.reverse('detail', {key: persona._key})
  ));
  res.send(persona);
}, 'create')
.body(Persona, 'The persona to create.')
.response(201, Persona, 'The created persona.')
.error(HTTP_CONFLICT, 'The persona already exists.')
.summary('Create a new persona')
.description(dd`
  Creates a new persona from the request body and
  returns the saved document.
`);
//**/

//**
//create a new persona with doc
router.post(':key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let persona;
  //step 1:query doc by _key
  //create blank doc if not exists
  try {
    persona = personas.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {//create new doc if not exists
      personas.save({//新建时只能包含 _key 一个字段
        _key:key
      },{//必须先创建完成
        waitForSync: true
      });
    }
  }

  //step 2:update doc
  try {
    personas.update(key, patchData);
    persona = personas.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  res.send(persona);
}, 'update')
.pathParam('key', keySchema)
.body(joi.object().description('The data to update the persona with.'))
.response(Persona, 'The updated persona.')
.summary('Update a persona')
.description(dd`
  Create and patch a persona with the request body and
  returns the updated document. 
`);
//**/

router.get(':key', function (req, res) {
  const key = req.pathParams.key;
  let persona
  try {
    persona = personas.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      //throw httpError(HTTP_NOT_FOUND, e.message);
      //just return blank persona object
      persona = {
        error:true,
        msg:"not exists."
      }
    }
    //throw e;
  }
  res.send(persona);
}, 'detail')
.pathParam('key', keySchema)
.response(Persona, 'The persona.')
.summary('Fetch a persona')
.description(dd`
  Retrieves a persona by its key.
`);

/**
router.put(':key', function (req, res) {
  const key = req.pathParams.key;
  const persona = req.body;
  let meta;
  try {
    meta = personas.replace(key, persona);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(persona, meta);
  res.send(persona);
}, 'replace')
.pathParam('key', keySchema)
.body(Persona, 'The data to replace the persona with.')
.response(Persona, 'The new persona.')
.summary('Replace a persona')
.description(dd`
  Replaces an existing persona with the request body and
  returns the new document.
`);
//**/

router.patch(':key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let persona;
  try {
    personas.update(key, patchData);
    persona = personas.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  res.send(persona);
}, 'update')
.pathParam('key', keySchema)
.body(joi.object().description('The data to update the persona with.'))
.response(Persona, 'The updated persona.')
.summary('Update a persona')
.description(dd`
  Patches a persona with the request body and
  returns the updated document.
`);

/**
router.delete(':key', function (req, res) {
  const key = req.pathParams.key;
  try {
    personas.remove(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
}, 'delete')
.pathParam('key', keySchema)
.response(null)
.summary('Remove a persona')
.description(dd`
  Deletes a persona from the database.
`);
//**/