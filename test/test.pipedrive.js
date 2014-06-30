
var express      = require('express')
  , facade       = require('segmentio-facade')
  , helpers      = require('./helpers')
  , integrations = require('..')
  , should       = require('should')
  , settings     = require('./auth.json')['Pipedrive']
  , pd          = new integrations['Pipedrive']();


var app = express().use(express.bodyParser())
  , server;


describe('Pipedrive', function () {

  describe('.enabled()', function () {
    it('should only be enabled for server side messages', function () {
      pd.enabled(new facade.Track({
        channel: 'server',
        userId: 'userId'
      })).should.be.ok;
      pd.enabled(new facade.Alias({ channel : 'client' })).should.not.be.ok;
      pd.enabled(new facade.Alias({})).should.not.be.ok;
    });

    it('should only be enabled for messages with `userId`', function () {
      pd.enabled(new facade.Track({
        sessionId: 'session',
        channel: 'server'
      })).should.not.be.ok;

      pd.enabled(new facade.Track({
        userId: 'userId',
        channel: 'server'
      })).should.be.ok;
    });
  });


  describe('.validate()', function () {
    it('should require an api_token', function () {
      pd.validate({},{'api_token' : ''}).should.be.an.instanceOf(Error);
    });

    it('should validate with the required settings', function () {
      should.not.exist(pd.validate({}, { api_token : 'xxx'}));
    });
  });


  describe('.identify()', function () {
    it('should create a user when active is false', function (done) {
      var identify = helpers.identify({ userId: 'barney@himym.com', traits: { name:'Barney Stinson', email:'barney@himym.com' }, context:{ 'active':false } });
      pd.identify(identify, settings, done);
    });

    it('will error on an invalid api_token', function (done) {
      var identify = helpers.identify( { context: { 'active':false } });
      pd.identify(identify, { api_token : 'x' }, function (err) {
        should.exist(err);
        err.status.should.eql(401);
        done();
      });
    });
    
    it('should identify with only an email as id', function(done){
      var identify = new facade.Identify({ userId: 'ted@himym.com', context: { 'active':false } });
      pd.identify(identify, settings, done);
    })
    
  });

  describe('.group()', function(){
    it('should create a new organization and link user', function(done){
      var group = helpers.group({ userId: 'barney@himym.com', context: { 'active':false } });
      pd.group(group, settings, done);
    });
    it('should link a user with an existing organization', function(done){
      var group = helpers.group({ userId: 'ted@himym.com' });
      pd.group(group, settings, done);
    });
  });

  describe('.alias()', function () {
    it('should do nothing', function (done) {
      pd.alias({}, {}, function (err) {
        should.not.exist(err);
        done();
      });
    });
  });
});
