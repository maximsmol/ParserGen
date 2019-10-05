import {RegexDescent} from '../../alg/regex/recDescent';

export const handleWs = (ws) => {
  let packetCounter = 0;

  const send = (type, obj)=>{
    if (obj.type != null)
      throw new Error('Packet payload cannot specify packet type.');

    ws.send(JSON.stringify(Object.assign(obj, {
      '?': type,
      id: packetCounter++
    })));
  };
  const sendOk = (obj)=>{
    send('ok', {id: obj.id});
  };

  const errorMessages = {
    'proto|recv|bad-json': 'Received bad JSON.',
    'proto|recv|null-packet': 'Received null.',
    'proto|recv|typeless-packet': 'Received a packet without a type.',
    'proto|recv|idless-packet': 'Received a packet without an id.',
    'proto|recv|alien-packet': 'Received an unknown packet.',

    'regex-parser|recv|null-action': 'Received no action for regex-parser.',
    'regex-parser|recv|alien-action': 'Received unknown action for regex-parser.',
    'regex-parser|recv|parse|null-regex': 'Received no regex for regex-parser.'
  };
  const sendErr = (code)=>{
    send('err', {
      code: code,
      msg: errorMessages[code]
    });
  };

  const sendAction = (type, action, obj)=>{
    if (obj.action != null)
      throw new Error('Packet payload cannot specify the action.');

    send(type, Object.assign(obj, {action: action}));
  };

  ws.on('message', (data) => {
    let obj = null;
    try {
      obj = JSON.parse(data);
    }
    catch (e) {
      sendErr('proto|recv|bad-json');
      return;
    }
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

      if (obj.action === 'parse') {
        if (obj.regex == null) {
          sendErr('regex-parser|recv|parse|null-regex');
          return;
        }


        let parser = null;
        try {
          parser = new RegexDescent(obj.regex, {
            dumpErrorReports: false,

            escapes: {
              allowHex: true
            },
            charClass: {
              disableEscaping: false
            },
            features: {
              lookaround: true
            }
          });
          const res = parser.parse();
          sendAction('regex-parser', 'res', {res});
        }
        catch (e) {
          let msg = e.message;

          if (parser != null)
            msg = parser.errorReport.join('\n');

          sendAction('regex-parser', 'err', {err: msg});
        }
        sendOk(obj);
      }
      else {
        sendErr('regex-parser|recv|alien-action');
      }
    }
    else if (obj['?'] === 'ok') {
      // ignore
    }
    else {
      sendErr('proto|recv|alien-packet');
    }
  });
};
