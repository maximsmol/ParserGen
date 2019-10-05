const inp = document.getElementById('regex-parser-input');
const out = document.getElementById('regex-parser-output');

const ws = new WebSocket('ws://'+location.host);

const errorMessages = {
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

ws.addEventListener('open', () => {
  let packetCounter = 0;

  const send = function (type, obj) {
    if (obj == null)
      throw new Error('Packet payload cannot be null.');
    if (obj.type != null)
      throw new Error('Packet payload cannot specify packet type.');

    ws.send(JSON.stringify(Object.assign(obj, {
      '?': type,
      id: packetCounter++
    })));
  };
  const sendOk = function (obj) {
    send('ok', {id: obj.id});
  };
  const sendErr = function (code) {
    send('err', {
      code: code,
      msg: errorMessages[code]
    });
  };

  const sendAction = function (type, action, obj) {
    if (obj.action != null)
      throw new Error('Packet payload cannot specify the action.');

    send(type, Object.assign(obj, {action: action}));
  };

  let oldInpValue = inp.value;
  inp.addEventListener('keyup', () => {
    if (inp.value === oldInpValue)
      return;

    oldInpValue = inp.value;

    sendAction('regex-parser', 'parse', {
      regex: inp.value
    });
  });

  ws.addEventListener('message', (e) => {
    var obj = null;
    try {
      obj = JSON.parse(e.data);
    }
    catch (err) {
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

        var visit = function (obj) {
          var res = document.createElement('div');
          res.className = 'json-tree-object';

          var labelContainer = document.createElement('div');
          labelContainer.className = 'json-tree-labelContainer';

          var label = document.createElement('span');
          label.className = 'json-tree-label';

          var subtrees = document.createElement('div');
          subtrees.className = 'json-tree-subtrees';

          if (obj['?'] === 'char') {
            if (obj.escaped)
              label.innerText = '\\'+obj.x;
            else
              label.innerText = obj.x;
          }
          else if (obj['?'] === '&')
            label.innerText = 'EOF';
          else if (obj['?'] === '.')
            label.innerText = '.';
          else if (obj['?'] === '(?:)' ||
              obj['?'] === '(?=)' ||
              obj['?'] === '(?!)' ||
              obj['?'] === '(?<=)' ||
              obj['?'] === '(?<!)' ||
              obj['?'] === '()') {
            label.innerText = obj['?'];

            for (let i = 0; i < obj.x.length; ++i)
              subtrees.appendChild(visit(obj.x[i]));
          }
          else if (obj['?'] === 'a-b') {
            label.innerText = 'a-b';

            subtrees.appendChild(visit(obj.a));
            subtrees.appendChild(visit(obj.b));
          }
          else if (obj['?'] === '[]') {
            if (!obj.inverse)
              label.innerText = '[]';
            else
              label.innerText = '[^]';

            for (let i = 0; i < obj.x.length; ++i)
              subtrees.appendChild(visit(obj.x[i]));
          }
          else if (obj['?'] === '+' || obj['?'] === '*' || obj['?'] === '?') {
            label.innerText = obj['?'];
            subtrees.appendChild(visit(obj.x));
          }
          else if (obj['?'] === '^' || obj['?'] === '$')
            label.innerText = obj['?'];
          else if (obj['?'] === '{n}') {
            label.innerText = '{'+obj.n+'}';
            subtrees.appendChild(visit(obj.x));
          }
          else if (obj['?'] === '{a,b}') {
            label.innerText = '{'+obj.min+', '+obj.max+'}';
            subtrees.appendChild(visit(obj.x));
          }
          else if (obj['?'] === '|') {
            label.innerText = obj['?'];
            subtrees.appendChild(visit(obj.a));
            subtrees.appendChild(visit(obj.b));
          }
          else {
            label.innerText = JSON.stringify(obj, null, 2);
          }

          if (subtrees.children.length) {
            var subtreeOpen = true;

            var caret = document.createElement('span');
            caret.className = 'json-tree-caret';
            caret.innerText = subtreeOpen ? '↓' : '→';
            labelContainer.appendChild(caret);

            caret.addEventListener('click', () => {
              subtreeOpen = !subtreeOpen;

              caret.innerText = subtreeOpen ? '↓' : '→';

              if (subtreeOpen)
                subtrees.classList.remove('json-tree-subtree-closed');
              else
                subtrees.classList.add('json-tree-subtree-closed');
            });
          }
          labelContainer.appendChild(label);
          res.appendChild(labelContainer);
          res.appendChild(subtrees);

          return res;
        };

        while (out.firstChild != null)
          out.removeChild(out.firstChild);

        out.appendChild(visit(obj.res));

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
