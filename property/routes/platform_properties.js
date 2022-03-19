'use strict';
const db = require('@arangodb').db;
const aql = require('@arangodb').aql;
const dd = require('dedent');
const joi = require('joi');
const httpError = require('http-errors');
const status = require('statuses');
const errors = require('@arangodb').errors;
const createRouter = require('@arangodb/foxx/router');
const platform_property = require('../models/platform_property');

//const platform_properties = module.context.collection('platform_properties');
const platform_properties = db._collection('platform_properties');
const keySchema = joi.string().required()
.description('The key of the platform_property');

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code;
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code;
const HTTP_NOT_FOUND = status('not found');
const HTTP_CONFLICT = status('conflict');

const router = createRouter();
module.exports = router;


router.tag('platform_property');

//list pending sync items
//读取已映射目录，并同步到mod_property_mapping便于分析映射
router.get('pending-sync', function (req, res) {
  const data = req.body;
  let platform_property;
  var query = aql`
              FOR doc IN platform_properties  
              FILTER doc.status=="pending" and doc.mappingId != null             
              UPDATE doc with {status:"ready"} in platform_properties 
              LIMIT 500 
              RETURN doc
              `;            
  try {
    platform_property = db._query(query).toArray();
  } catch (e) {
    throw e;
  }
  res.send(platform_property);
}, 'update')
//.body(joi.object().description('Result count required in format {count:number}. number must between 1-200.'))
.response([platform_property], '3rd-party property mapping that pending sync.')
.summary('Retrieve 3rd party property mapping by status==pending.')
.description(dd`
  Retrieve 3rd party property mapping by status==pending.
  returns pending sync documents.
`);

//append new property mapping doc
//增加新的属性映射记录，如果已经存在则直接忽略。否则写入
router.post('append', function (req, res) {
  const json = req.body;
  let platform_property
  try {
    //直接查询，如果有就结束了
    platform_property = platform_properties.document(json._key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      //如果没有则新建一个
      var metaObj = {
        _key:json._key
      };
      let meta;
      try {
        meta = platform_properties.save(metaObj);
      } catch (e) {
        if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
          //do nothing
        }
      }
      //用其他属性更新    
      try {
        platform_properties.update(json._key, json);
        platform_property = platform_properties.document(json._key);
      } catch (e) {
        if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
          throw httpError(HTTP_NOT_FOUND, e.message);
        }
        if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
          throw httpError(HTTP_CONFLICT, e.message);
        }
        throw e;
      }        
    }
  }
  res.send(platform_property);
}, 'append')
//.body(platform_property, 'The platform_property to append.')
.body(joi.object().description('The platform_property to append.'))
.response(201, platform_property, 'The append platform_property.')
.error(HTTP_CONFLICT, 'The platform_property already exists.')
.summary('Append platform_property')
.description(dd`
  Append platform_property from the request body and
  returns the saved document.
`);


/**
router.get(function (req, res) {
  res.send(platform_properties.all());
}, 'list')
.response([platform_property], 'A list of platform_properties.')
.summary('List all platform_properties')
.description(dd`
  Retrieves a list of all platform_properties.
`);


router.post(function (req, res) {
  const platform_property = req.body;
  let meta;
  try {
    meta = platform_properties.save(platform_property);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(platform_property, meta);
  res.status(201);
  res.set('location', req.makeAbsolute(
    req.reverse('detail', {key: platform_property._key})
  ));
  res.send(platform_property);
}, 'create')
.body(platform_property, 'The platform_property to create.')
.response(201, platform_property, 'The created platform_property.')
.error(HTTP_CONFLICT, 'The platform_property already exists.')
.summary('Create a new platform_property')
.description(dd`
  Creates a new platform_property from the request body and
  returns the saved document.
`);
//**/

//create a new platform_property with full attributes
router.post(function (req, res) {
  const json = req.body;

  //create meta doc
  var metaObj = {
  	_key:json._key
  };
  let meta;
  try {
    meta = platform_properties.save(metaObj);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
 		platform_properties.update(json._key, json);//update doc if exists
    }
  }
  //Object.assign(metaObj, meta);

  //update with req body
  let platform_property
  try {
    platform_properties.update(json._key, json);
    platform_property = platform_properties.document(json._key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  res.send(platform_property);
}, 'create')
//.body(platform_property, 'The platform_property to create.')
.body(joi.object().description('The platform_property to create.'))
.response(201, platform_property, 'The created platform_property.')
.error(HTTP_CONFLICT, 'The platform_property already exists.')
.summary('Create a new platform_property')
.description(dd`
  Creates a new platform_property from the request body and
  returns the saved document.
`);

router.get(':key', function (req, res) {
  const key = req.pathParams.key;
  let platform_property
  try {
    platform_property = platform_properties.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
  res.send(platform_property);
}, 'detail')
.pathParam('key', keySchema)
.response(platform_property, 'The platform_property.')
.summary('Fetch a platform_property')
.description(dd`
  Retrieves a platform_property by its key.
`);

/**
router.put(':key', function (req, res) {
  const key = req.pathParams.key;
  const platform_property = req.body;
  let meta;
  try {
    meta = platform_properties.replace(key, platform_property);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(platform_property, meta);
  res.send(platform_property);
}, 'replace')
.pathParam('key', keySchema)
.body(platform_property, 'The data to replace the platform_property with.')
.response(platform_property, 'The new platform_property.')
.summary('Replace a platform_property')
.description(dd`
  Replaces an existing platform_property with the request body and
  returns the new document.
`);
//**/

router.patch(':key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let platform_property;
  try {
    platform_properties.update(key, patchData);
    platform_property = platform_properties.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  res.send(platform_property);
}, 'update')
.pathParam('key', keySchema)
.body(joi.object().description('The data to update the platform_property with.'))
.response(platform_property, 'The updated platform_property.')
.summary('Update a platform_property')
.description(dd`
  Patches a platform_property with the request body and
  returns the updated document.
`);

/**
router.delete(':key', function (req, res) {
  const key = req.pathParams.key;
  try {
    platform_properties.remove(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
}, 'delete')
.pathParam('key', keySchema)
.response(null)
.summary('Remove a platform_property')
.description(dd`
  Deletes a platform_property from the database.
`);
//**/

//根据source、category、name查询mappingId、mappingName
router.post('get-mapping', function (req, res) {
  const data = req.body;
  console.log("try to retrieve property mapping.",data);
  var result = {
    success:false,
    msg:"platform property mapping retrieved",
    data:data
  }
  if(!data.source || !data.category ){//stop processing and return
    data.msg = "Both source/category are required.Please check again.";
    data.success = false;
    res.send(result);
  }else{
    //对name参数进行处理：可能是单个字符串、空格分隔字符串、字符串数组。对于
    var category="";
    if(Array.isArray(data.category)){
      category = data.category[data.category.length-1];
    }else{
      category = data.category;
    }

    let platform_property;
    var query = aql`
                FOR doc IN platform_properties 
                FILTER doc.source==${data.source} and doc.category==${category}
                RETURN doc
                `;            
    try {
      platform_property = db._query(query).toArray();
    } catch (e) {
      throw e;
    }

    result.success = true;
    result.data = platform_property;      
    res.send(result);
  }
}, 'get-mapping')
.body(joi.object().description('The data to retrieve category mapping with source/category.'))
.response(platform_property, 'The platform_property mapping retrieved.')
.summary('Retrieve property mapping by category name and source.')
.description(dd`
  Retrieve property mapping.
  source: platform.
  category: original catgory name. can be string/string-array
`);



