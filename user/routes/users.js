'use strict';
const dd = require('dedent');
const db = require('@arangodb').db;
const aql = require('@arangodb').aql;
const joi = require('joi');
const httpError = require('http-errors');
const status = require('statuses');
const errors = require('@arangodb').errors;
const createRouter = require('@arangodb/foxx/router');
const User = require('../models/user');

const users = module.context.collection('users');
const keySchema = joi.string().required()
.description('The key of the user');

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code;
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code;
const HTTP_NOT_FOUND = status('not found');
const HTTP_CONFLICT = status('conflict');

const router = createRouter();
module.exports = router;


router.tag('user');

//列出所有用户：禁用
/**
router.get(function (req, res) {
  res.send(users.all());
}, 'list')
.response([User], 'A list of users.')
.summary('List all users')
.description(dd`
  Retrieves a list of all users.
`);
//**/

//根据用户查询关心的人。是一个图查询，以当前用户为起点查询所有关联用户，默认限制返回100条
router.get("connections/:fromUser",function (req, res) {
  const fromUser = "user_users/"+req.pathParams.fromUser;
  let conns;
  let relatedUsers=[];
  var query = aql`
FOR v, e, p IN 1 OUTBOUND ${fromUser} GRAPH 'FriendsGraph'
LIMIT 100
RETURN { vertices: p.vertices[1], edges: p.edges[0].name }
              `;            
  try {
    //console.log("try query.[from]",fromUser);
    conns = db._query(query).toArray();
    for(var i=0;i<conns.length;i++){
      var relatedUser = conns[i].vertices;
      if(relatedUser){
        relatedUser.relationship = conns[i].edges;
        relatedUsers.push(relatedUser);
      }else{
        //unknown reason: relatedUser is null
      }
    }
  } catch (e) {
    throw e;
  }
  res.send(relatedUsers);
}, 'list')
.pathParam('fromUser', keySchema)
.response([User], 'A list of related users.')
.summary('List related users')
.description(dd`
  Retrieves related users connected to [fromUser]. Limit to 100.
`);

//create blank doc with pure _key
router.post(function (req, res) {
  const user = req.body;
  let meta;
  try {
    meta = users.save(user);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(user, meta);
  res.status(201);
  res.set('location', req.makeAbsolute(
    req.reverse('detail', {key: user._key})
  ));
  res.send(user);
}, 'create')
.body(User, 'The user to create.')
.response(201, User, 'The created user.')
.error(HTTP_CONFLICT, 'The user already exists.')
.summary('Create a new user')
.description(dd`
  Creates a new user from the request body and
  returns the saved document.
`);
//**/

//create doc with properties
router.post(':key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let user;

  //step 1:query doc by _key
  //create blank doc if not exists
  try {
    user = users.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {//create new doc if not exists
      users.save({//新建时只能包含 _key 一个字段
        _key:key
      },{//必须先创建完成
        waitForSync: true
      });
    }
  }

  //step 2:update doc
  try {
    users.update(key, patchData);
    user = users.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  res.send(user);
}, 'update')
.pathParam('key', keySchema)
.body(joi.object().description('The data to update the user with.'))
.response(User, 'The updated user.')
.summary('Update a user')
.description(dd`
  Creates and patches a user with the request body and
  returns the updated document.
`);

router.get(':key', function (req, res) {
  const key = req.pathParams.key;
  let user
  try {
    user = users.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
  res.send(user);
}, 'detail')
.pathParam('key', keySchema)
.response(User, 'The user.')
.summary('Fetch a user')
.description(dd`
  Retrieves a user by its key.
`);

/**
router.put(':key', function (req, res) {
  const key = req.pathParams.key;
  const user = req.body;
  let meta;
  try {
    meta = users.replace(key, user);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(user, meta);
  res.send(user);
}, 'replace')
.pathParam('key', keySchema)
.body(User, 'The data to replace the user with.')
.response(User, 'The new user.')
.summary('Replace a user')
.description(dd`
  Replaces an existing user with the request body and
  returns the new document.
`);
//**/

router.patch(':key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let user;
  try {
    users.update(key, patchData);
    user = users.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  res.send(user);
}, 'update')
.pathParam('key', keySchema)
.body(joi.object().description('The data to update the user with.'))
.response(User, 'The updated user.')
.summary('Update a user')
.description(dd`
  Patches a user with the request body and
  returns the updated document.
`);

/**
router.delete(':key', function (req, res) {
  const key = req.pathParams.key;
  try {
    users.remove(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
}, 'delete')
.pathParam('key', keySchema)
.response(null)
.summary('Remove a user')
.description(dd`
  Deletes a user from the database.
`);
//**/
