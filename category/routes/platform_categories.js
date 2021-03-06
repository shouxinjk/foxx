'use strict';
const db = require('@arangodb').db;
const aql = require('@arangodb').aql;
const dd = require('dedent');
const joi = require('joi');
const httpError = require('http-errors');
const status = require('statuses');
const errors = require('@arangodb').errors;
const createRouter = require('@arangodb/foxx/router');
const Platform_category = require('../models/platform_category');

//const platform_categories = module.context.collection('platform_categories');
const platform_categories = db._collection('platform_categories');
const keySchema = joi.string().required()
.description('The key of the platform_category');

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code;
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code;
const HTTP_NOT_FOUND = status('not found');
const HTTP_CONFLICT = status('conflict');

const router = createRouter();
module.exports = router;


router.tag('platform_category');

/**
router.get(function (req, res) {
  res.send(platform_categories.all());
}, 'list')
.response([Platform_category], 'A list of platform_categories.')
.summary('List all platform_categories')
.description(dd`
  Retrieves a list of all platform_categories.
`);


router.post(function (req, res) {
  const platform_category = req.body;
  let meta;
  try {
    meta = platform_categories.save(platform_category);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(platform_category, meta);
  res.status(201);
  res.set('location', req.makeAbsolute(
    req.reverse('detail', {key: platform_category._key})
  ));
  res.send(platform_category);
}, 'create')
.body(Platform_category, 'The platform_category to create.')
.response(201, Platform_category, 'The created platform_category.')
.error(HTTP_CONFLICT, 'The platform_category already exists.')
.summary('Create a new platform_category')
.description(dd`
  Creates a new platform_category from the request body and
  returns the saved document.
`);
//**/

//create a new platform_category with full attributes
router.post(function (req, res) {
  const json = req.body;

  //create meta doc
  var metaObj = {
  	_key:json._key
  };
  let meta;
  try {
    meta = platform_categories.save(metaObj);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
 		platform_categories.update(json._key, json);//update doc if exists
    }
  }
  //Object.assign(metaObj, meta);

  //update with req body
  let platform_category
  try {
    platform_categories.update(json._key, json);
    platform_category = platform_categories.document(json._key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  res.send(platform_category);
}, 'create')
//.body(Platform_category, 'The platform_category to create.')
.body(joi.object().description('The platform_category to create.'))
.response(201, Platform_category, 'The created platform_category.')
.error(HTTP_CONFLICT, 'The platform_category already exists.')
.summary('Create a new platform_category')
.description(dd`
  Creates a new platform_category from the request body and
  returns the saved document.
`);

router.get(':key', function (req, res) {
  const key = req.pathParams.key;
  let platform_category
  try {
    platform_category = platform_categories.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
  res.send(platform_category);
}, 'detail')
.pathParam('key', keySchema)
.response(Platform_category, 'The platform_category.')
.summary('Fetch a platform_category')
.description(dd`
  Retrieves a platform_category by its key.
`);

/**
router.put(':key', function (req, res) {
  const key = req.pathParams.key;
  const platform_category = req.body;
  let meta;
  try {
    meta = platform_categories.replace(key, platform_category);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(platform_category, meta);
  res.send(platform_category);
}, 'replace')
.pathParam('key', keySchema)
.body(Platform_category, 'The data to replace the platform_category with.')
.response(Platform_category, 'The new platform_category.')
.summary('Replace a platform_category')
.description(dd`
  Replaces an existing platform_category with the request body and
  returns the new document.
`);
//**/

router.patch(':key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let platform_category;
  try {
    platform_categories.update(key, patchData);
    platform_category = platform_categories.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  res.send(platform_category);
}, 'update')
.pathParam('key', keySchema)
.body(joi.object().description('The data to update the platform_category with.'))
.response(Platform_category, 'The updated platform_category.')
.summary('Update a platform_category')
.description(dd`
  Patches a platform_category with the request body and
  returns the updated document.
`);

/**
router.delete(':key', function (req, res) {
  const key = req.pathParams.key;
  try {
    platform_categories.remove(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
}, 'delete')
.pathParam('key', keySchema)
.response(null)
.summary('Remove a platform_category')
.description(dd`
  Deletes a platform_category from the database.
`);
//**/

//update labeling category with mappingId and mappingName
router.patch('fullpath/:key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let platform_category
  try {
    platform_categories.update(key, patchData);//update first
    platform_category = platform_categories.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  //find all parents node
  var fullnames = [];
  var fullids = [];
  var parentNodes = [];
  const source = platform_category.source;
  var id = platform_category.id;
  var pid = platform_category.pid;
  var isRoot = false;
  fullnames.push(platform_category.name);
  fullids.push(platform_category.id);
  do{
    var query = aql`
                FOR doc IN platform_categories
                FILTER doc.source==${source} and doc.id==${pid}
                RETURN doc
                `;
    parentNodes = db._query(query).toArray();
    if(parentNodes.length==0){//root node. exit
      isRoot = true;
    }else{
      var node = parentNodes[0];
      pid = node.pid
      fullnames = fullnames.concat(node.name.split("/"));//name????????????????????????
      fullids.push(node.id);
    }
  }while(!isRoot);
  //update platform_category
  platform_category.names = fullnames.reverse();
  platform_category.ids = fullids.reverse();
  try {
    platform_categories.update(key, platform_category);
    platform_category = platform_categories.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  res.send(platform_category);
}, 'fullpath')
.pathParam('key', keySchema)
.body(joi.object().description('The data to update the platform_category with.'))
.response(Platform_category, 'The platform_category with fullname and fullpath.')
.summary('Complete fullname and fullpath')
.description(dd`
  Complete a platform_category with fullname and fullpath by its key.
`);


//??????source???name??????mappingId???mappingName
router.patch('mapping', function (req, res) {
  const data = req.body;
  var result = {
    result:"success",
    msg:"platform category mapping changed.",
    data:data
  }
  if(!data.source || !data.name || !data.mappingId || !data.mappingName){//stop processing and return
    data.msg = "All source/name/mappingId/mappingName are required.Please check again.";
    data.result = "error";
    res.send(result);
  }else{
    let platform_category;
    var query = aql`
                FOR doc IN platform_categories 
                FILTER doc.name==${data.name} and doc.source==${data.source}
                UPDATE doc with {mappingId:${data.mappingId},mappingName:${data.mappingName}} in platform_categories 
                RETURN NEW
                `;            
    try {
      platform_category = db._query(query).toArray();
    } catch (e) {
      throw e;
    }
    result.platform_category = platform_category;
    res.send(result);
  }
}, 'mapping')
.body(joi.object().description('The data to update the platform_category with source/name/mappingId/mappingName.'))
.response(Platform_category, 'The platform_category updated.')
.summary('Update platform category with standard category mapping.')
.description(dd`
  Complete/Update a platform_category with mappingId and mappingName.
  source: platform.
  name: original catgory name.
  mappingId: standard category Id.
  mappingName: standard category name.
`);


//??????source???name??????mappingId???mappingName
router.post('mapping', function (req, res) {
  const data = req.body;
  console.log("try to retrieve category mapping.",data);
  var result = {
    success:false,
    msg:"platform category mapping retrieved",
    data:data
  }
  if(!data.source || !data.name){//stop processing and return
    data.msg = "All source/name are required.Please check again.";
    data.success = false;
    res.send(result);
  }else{
    //???name????????????????????????????????????????????????????????????????????????????????????????????????
    var name="";
    var names=[];
    if(Array.isArray(data.name)){
      name = data.name[data.name.length-1];
      names = data.name;
    }else{
      name = data.name;
      names = data.name.split(" ");
    }

    let platform_category;
    var query = aql`
                FOR doc IN platform_categories 
                FILTER doc.source==${data.source} and (doc.name==${name} or ${names} ALL IN doc.names) 
                LIMIT 1 
                RETURN doc
                `;            
    try {
      platform_category = db._query(query).toArray();
    } catch (e) {
      throw e;
    }

    result.success = true;
    result.data = platform_category;      
    res.send(result);
  }
}, 'check-mapping')
.body(joi.object().description('The data to retrieve category mapping with source/name.'))
.response(Platform_category, 'The platform_category mapping retrieved.')
.summary('Retrieve category mapping by category name and source.')
.description(dd`
  Retrieve category mapping.
  source: platform.
  name: original catgory name. can be string/blank-seperated-string/string-array
`);



