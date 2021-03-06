var auth = require('./auth');
var facade = require('segmentio-facade');
var helpers = require('./helpers');
var integrations = require('..');
var should = require('should');
var settings = auth['Vero'];
var Track = facade.Track;

/**
 * Create our integration
 */

var vero = new integrations['Vero']()


describe('Vero', function () {

  describe('.enabled()', function () {
    it('should not be enabled for client-side messages', function () {
      vero.enabled(new Track({
        channel: 'server',
        userId: 'userId'
      })).should.be.ok;

      vero.enabled(new Track({
        channel: 'client',
        userId: 'userId'
      })).should.not.be.ok;
    })
  });

  describe('.validate()', function () {
    it('should require an authToken', function () {
      vero.validate({}, { authToken : '' }).should.be.an.instanceOf(Error);
      vero.validate({}, {}).should.be.an.instanceOf(Error);
      should.not.exist(vero.validate({}, { authToken : 'xxx' }));
    });
  });

  describe('.track()', function () {
    it('should get a good response from the API', function (done) {
      var track = helpers.track();
      vero.track(track, settings, done);
    });
  });

  describe('.identify()', function () {
    it('should get a good response from the API', function (done) {
      var identify = helpers.identify();
      vero.identify(identify, settings, done);
    });
  });

  describe('.alias()', function () {
    it('should alias correctly', function (done) {
      var alias = helpers.alias();
      vero.alias(alias, settings, done);
    });
  });
});
