
/**
 * Module dependencies.
 */

var convert = require('convert-dates');
var integration = require('segmentio-integration');
var Identify = require('segmentio-facade').Identify;
var object = require('obj-case');
var time = require('unix-time');
var async = require('async');

/**
 * Expose `Pipedrive`
 */

var Pipedrive = module.exports = integration('Pipedrive')
  .endpoint('api.pipedrive.com/v1')
  .retries(2);

/**
 * Enabled.
 *
 * @param {Facade} message
 * @param {Object} settings
 * @return {Boolean}
 * @api public
 */

Pipedrive.prototype.enabled = function(message, settings){
  return !! (message.enabled(this.name)
    && 'server' == message.channel()
    && message.field('userId'));
};

/**
 * Validate.
 *
 * @param {Facade} message
 * @param {Object} settings
 * @return {Error}
 * @api public
 */

Pipedrive.prototype.validate = function(message, settings){
  return this.ensure(settings.api_token, 'api_token');
};

/**
 * Identify - creates the user if not active yet
 *
 * https://developers.pipedrive.com/v1
 *
 * @param {Identify} identify
 * @param {Object} settings
 * @param {Function} fn
 * @api public
 */

Pipedrive.prototype.identify = function(identify, settings, fn){
  
  if (!identify.active()) {
    var traits = identify.traits();
    var mapped = {};
    mapped.name = traits.name || identify.userId();
    // mapped.name = traits.firstName + ' ' + traits['Last Name'];
    mapped.email = traits.email || identify.userId();
    traits = mapped;
    this
      .post('/persons')
      .query({ api_token: settings.api_token })
      .type('json')
      .send(traits)
      .end(this.handle(fn));
  }
};

/**
 * Group - create a new org if it doesn't exist, and then link person to org
 *
 * https://developers.pipedrive.com/v1
 *
 * @param {Group} group
 * @param {Object} settings
 * @param {Function} fn
 * @api public
 */

Pipedrive.prototype.group = function(group, settings, fn){
  var self = this;
  var json = group.json();
  var traits = json.traits || {};
  var org_name = group.proxy('traits.name') || group.groupId();
  var pers_email = group.userId(); // assume they are using e-mail as userId 

  if (!group.active()) {
    var mapped = {'name':org_name};
    traits = mapped;  
    self
      .post('/organizations')
      .query({ api_token: settings.api_token })
      .type('json')
      .send(traits)
      .end(function(err, res) { linkUserToGroup(self, settings, fn, org_name, pers_email);});
  } 
  else linkUserToGroup(self, settings, fn, org_name, pers_email);
}
 

/**
 * linkUserToGroup - use async parallel to retrieve the person id and org id, and then update person with org.
 * in each retrieval, use async waterfall to make the get request, and search through response for id
 *
 * https://developers.pipedrive.com/v1
 *
 * @param {Object} pd
 * @param {Object} settings
 * @param {Function} fn
 * @param {String} org_name
 * @param {String} pers_email
 * @api public
 */
function linkUserToGroup(pd, settings, fn, org_name, pers_email) {  

  async.parallel({
    org_id: function(callback) {
          var orgs;
  	  var org_id;
	  async.waterfall([
	    function(callback){
	      pd
		.get('/organizations:(id,name)')
		.query({ api_token: settings.api_token })
		.type('json')
		.send({'limit':100})
		.end(function(err, res){
		   orgs = res.req.res.body.data;
		   callback(null, orgs);
		 });
	    },
	    function(orgs, callback){
	      for (var i = 0; i < orgs.length; i++) {
		if (orgs[i].name == org_name) { 
		  org_id = orgs[i].id; 
		  break;
		}
	      }
	      callback(null,org_id);
	    }
	  ], function (err, org_id) {
           callback(null, org_id);
	  });
    },
    pers_id: function (callback) {
	  var persons;
	  var pers_id;
	  async.waterfall([
	    function(callback){
	      pd
		.get('/persons:(id,email)')
		.query({ api_token: settings.api_token })
		.type('json')
		.send({'limit':1000})
		.end(function(err, res){
		   persons = res.req.res.body.data;
		   callback(null, persons);
		 });
	    },
	    function(persons, callback){
	      iter_pers:
		for (var i = 0; i < persons.length; i++) {
		  for (var j = 0; j < persons[j].email.length; j++) {
		    if (persons[i].email[j].value == pers_email) { 
		      pers_id = persons[i].id; 
		      break iter_pers;
		    }
		  }
		}
	      callback(null, pers_id);
	    }
	  ], function (err, pers_id) {
            callback(null, pers_id);
	  });
    }
  }, function (err,results) {
      if (results.pers_id && results.org_id)
      pd
	.put('/persons/'+results.pers_id)
	.query({ api_token: settings.api_token })
	.type('json')
	.send({'org_id':results.org_id})
	.end(pd.handle(fn));
  });
 
}

