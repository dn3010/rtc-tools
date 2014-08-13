var couple = require('../couple');
var signaller = require('rtc-signaller');
var test = require('tape');
var rtc = require('..');
var conns = [];
var signallers = [];
var monitors = [];
var scope = [];
var messengers = [];
var dcs = [];
var roomId = require('uuid').v4();
var messenger = require('messenger-memory');
var scope = [];
var messengers = [
  messenger({ delay: Math.random() * 500, scope: scope }),
  messenger({ delay: Math.random() * 500, scope: scope })
];

// require('cog/logger').enable('*');

test('create peer connections', function(t) {
  t.plan(2);

  t.ok(conns[0] = rtc.createConnection(), 'created a');
  t.ok(conns[1] = rtc.createConnection(), 'created b');
});

test('create signallers', function(t) {
  t.plan(2);
  signallers = messengers.map(signaller);
  t.ok(signallers[0], 'created signaller a');
  t.ok(signallers[1], 'created signaller b');
});

test('announce signallers', function(t) {
  t.plan(2);
  signallers[0].once('peer:announce', t.pass.bind(t, '0 knows about 1'));
  signallers[1].once('peer:announce', t.pass.bind(t, '1 knows about 0'));

  signallers[0].announce({ room: roomId });
  signallers[1].announce({ room: roomId });
});

test('couple a --> b', function(t) {
  t.plan(1);

  monitors[0] = couple(conns[0], signallers[1].id, signallers[0], {
    reactive: true,
    debugLabel: 'conn:0'
  });

  t.ok(monitors[0], 'ok');
});

test('couple b --> a', function(t) {
  t.plan(1);

  monitors[1] = couple(conns[1], signallers[0].id, signallers[1], {
    reactive: true,
    debugLabel: 'conn:1'
  });

  t.ok(monitors[1], 'ok');
});

test('create data channels', function(t) {
  var masterIdx = signallers[0].isMaster(signallers[1].id) ? 0 : 1;
  var channels = [ 'new_a', 'new_b', 'new_c', 'new_d', 'new_e', 'new_f', 'new_g', 'new_h' ];
  var pendingChannels = [].concat(channels);

  function addChannel() {
    conns[masterIdx].createDataChannel(channels.shift());

    // if we have more channels, create another on the non-master side
    if (channels.length > 0) {
      conns[masterIdx ^ 1].createDataChannel(channels.shift());
    }

    if (channels.length > 0) {
      addChannel();
    }
  }

  t.plan(pendingChannels.length + 1);

  conns[masterIdx ^ 1].ondatachannel = conns[masterIdx].ondatachannel = function(evt) {
    var channelIdx = pendingChannels.indexOf(evt && evt.channel && evt.channel.label);
    t.ok(channelIdx >= 0, 'channel found: ' + evt.channel.label);
    pendingChannels.splice(channelIdx, 1);

    if (pendingChannels.length === 0) {
      conns[masterIdx ^ 1].ondatachannel = conns[masterIdx].ondatachannel = null;
      t.pass('got all channels');
    }
  };

  addChannel();
});

test('close the connections', function(t) {
  t.plan(conns.length);
  conns.forEach(function(conn, index) {
    monitors[index].once('closed', t.pass.bind(t, 'closed connection: ' + index));
    conn.close();
  });
});

test('release references', function(t) {
  t.plan(1);
  conns = [];
  monitors = [];
  dcs = [];
  t.pass('done');
});
