/* eslint-disable */

'use strict';

(function () {
  var inp = document.getElementById('regex-parser-input');
  var out = document.getElementById('regex-parser-output');

  var ws = new WebSocket('ws://'+location.host);

  ws.addEventListener('open', function () {
    var packetCounter = 0;

    var send = function (type, obj) {
      if (obj == null)
        throw new Error('Packet payload cannot be null.');
      if (obj.type != null)
        throw new Error('Packet payload cannot specify packet type.');

      ws.send(JSON.stringify(Object.assign(obj, {
        '?': type,
        id: packetCounter++
      })));
    };
    var sendOk = function (obj) {
      send('ok', {id: obj.id});
    };

    var errorMessages = {
      'proto|recv|bad-json': 'Received bad JSON.',
      'proto|recv|null-packet': 'Received null.',
      'proto|recv|typeless-packet': 'Received a packet without a type.',
      'proto|recv|idless-packet': 'Received a packet without an id.',
      'proto|recv|alien-packet': 'Received an unknown packet.',

      'regex-parser|recv|null-action': 'Received no action for regex-parser',
      'regex-parser|recv|alien-action': 'Received unknown action for regex-parser',
      'regex-parser|recv|res|null-res': 'Received no results from regex-parser.',
      'regex-parser|recv|err|null-err': 'Received no error from regex-parser.'
    };
    var sendErr = function (code) {
      send('err', {
        code: code,
        msg: errorMessages[code]
      });
    };

    var sendAction = function (type, action, obj) {
      if (obj.action != null)
        throw new Error('Packet payload cannot specify the action.');

      send(type, Object.assign(obj, {action: action}));
    };

    inp.addEventListener('keyup', function (e) {
      if (e.key.length !== 1)
        return; // todo: make sure there are no keys that we are getting a false-negative on

      sendAction('regex-parser', 'parse', {
        regex: inp.value
      });
    });

    ws.addEventListener('message', function (e) {
      var obj = null;
      try {
        obj = JSON.parse(e.data);
      }
      catch (e) {
        console.log('ERR: proto|recv|bad-json');
        console.log(e.data);
        sendErr('proto|recv|bad-json');
        return;
      }

      var gName = 'RECV: '+obj['?']+'#'+obj.id;
      console.groupCollapsed(gName);
      console.log(obj);
      console.groupEnd(gName);

      if (obj == null) {
        sendErr('proto|recv|null-packet');
        return;
      }

      if (obj['?'] == null) {
        sendErr('proto|recv|typeless-packet');
        return;
      }
      if (obj.id == null) {
        sendErr('proto|recv|idless-packet');
        return;
      }

      if (obj['?'] === 'regex-parser') {
        if (obj.action == null) {
          sendErr('regex-parser|recv|null-action');
          return;
        }

        if (obj.action === 'res') {
          if (obj.res == null) {
            sendErr('regex-parser|recv|res|null-res');
            return;
          }

          out.innerText = JSON.stringify(obj.res, null, 2);
          sendOk(obj);
        }
        else if (obj.action === 'err') {
          if (obj.err == null) {
            sendErr('regex-parser|recv|err|null-err');
            return;
          }

          out.innerText = obj.err;
          sendOk(obj);
        }
        else {
          sendErr('regex-parser|recv|alien-action');
        }
      }
      else if (obj['?'] === 'ok') {
        // already logging everything
      }
      else if (obj['?'] === 'err') {
        console.log('ERR: ('+obj.code+') '+obj.msg);
      }
      else {
        sendErr('proto|recv|alien-packet');
      }
    });
  });
})();
