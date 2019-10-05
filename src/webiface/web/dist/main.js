/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./script/main.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./script/main.js":
/*!************************!*\
  !*** ./script/main.js ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("const inp = document.getElementById('regex-parser-input');\nconst out = document.getElementById('regex-parser-output');\nconst ws = new WebSocket('ws://' + location.host);\nconst errorMessages = {\n  'proto|recv|bad-json': 'Received bad JSON.',\n  'proto|recv|null-packet': 'Received null.',\n  'proto|recv|typeless-packet': 'Received a packet without a type.',\n  'proto|recv|idless-packet': 'Received a packet without an id.',\n  'proto|recv|alien-packet': 'Received an unknown packet.',\n  'regex-parser|recv|null-action': 'Received no action for regex-parser',\n  'regex-parser|recv|alien-action': 'Received unknown action for regex-parser',\n  'regex-parser|recv|res|null-res': 'Received no results from regex-parser.',\n  'regex-parser|recv|err|null-err': 'Received no error from regex-parser.'\n};\nws.addEventListener('open', () => {\n  let packetCounter = 0;\n\n  const send = function (type, obj) {\n    if (obj == null) throw new Error('Packet payload cannot be null.');\n    if (obj.type != null) throw new Error('Packet payload cannot specify packet type.');\n    ws.send(JSON.stringify(Object.assign(obj, {\n      '?': type,\n      id: packetCounter++\n    })));\n  };\n\n  const sendOk = function (obj) {\n    send('ok', {\n      id: obj.id\n    });\n  };\n\n  const sendErr = function (code) {\n    send('err', {\n      code: code,\n      msg: errorMessages[code]\n    });\n  };\n\n  const sendAction = function (type, action, obj) {\n    if (obj.action != null) throw new Error('Packet payload cannot specify the action.');\n    send(type, Object.assign(obj, {\n      action: action\n    }));\n  };\n\n  let oldInpValue = inp.value;\n  inp.addEventListener('keyup', () => {\n    if (inp.value === oldInpValue) return;\n    oldInpValue = inp.value;\n    sendAction('regex-parser', 'parse', {\n      regex: inp.value\n    });\n  });\n  ws.addEventListener('message', e => {\n    var obj = null;\n\n    try {\n      obj = JSON.parse(e.data);\n    } catch (err) {\n      console.log('ERR: proto|recv|bad-json');\n      console.log(e.data);\n      sendErr('proto|recv|bad-json');\n      return;\n    }\n\n    var gName = 'RECV: ' + obj['?'] + '#' + obj.id;\n    console.groupCollapsed(gName);\n    console.log(obj);\n    console.groupEnd(gName);\n\n    if (obj == null) {\n      sendErr('proto|recv|null-packet');\n      return;\n    }\n\n    if (obj['?'] == null) {\n      sendErr('proto|recv|typeless-packet');\n      return;\n    }\n\n    if (obj.id == null) {\n      sendErr('proto|recv|idless-packet');\n      return;\n    }\n\n    if (obj['?'] === 'regex-parser') {\n      if (obj.action == null) {\n        sendErr('regex-parser|recv|null-action');\n        return;\n      }\n\n      if (obj.action === 'res') {\n        if (obj.res == null) {\n          sendErr('regex-parser|recv|res|null-res');\n          return;\n        }\n\n        var visit = function (obj) {\n          var res = document.createElement('div');\n          res.className = 'json-tree-object';\n          var labelContainer = document.createElement('div');\n          labelContainer.className = 'json-tree-labelContainer';\n          var label = document.createElement('span');\n          label.className = 'json-tree-label';\n          var subtrees = document.createElement('div');\n          subtrees.className = 'json-tree-subtrees';\n\n          if (obj['?'] === 'char') {\n            if (obj.escaped) label.innerText = '\\\\' + obj.x;else label.innerText = obj.x;\n          } else if (obj['?'] === '&') label.innerText = 'EOF';else if (obj['?'] === '.') label.innerText = '.';else if (obj['?'] === '(?:)' || obj['?'] === '(?=)' || obj['?'] === '(?!)' || obj['?'] === '(?<=)' || obj['?'] === '(?<!)' || obj['?'] === '()') {\n            label.innerText = obj['?'];\n\n            for (let i = 0; i < obj.x.length; ++i) subtrees.appendChild(visit(obj.x[i]));\n          } else if (obj['?'] === 'a-b') {\n            label.innerText = 'a-b';\n            subtrees.appendChild(visit(obj.a));\n            subtrees.appendChild(visit(obj.b));\n          } else if (obj['?'] === '[]') {\n            if (!obj.inverse) label.innerText = '[]';else label.innerText = '[^]';\n\n            for (let i = 0; i < obj.x.length; ++i) subtrees.appendChild(visit(obj.x[i]));\n          } else if (obj['?'] === '+' || obj['?'] === '*' || obj['?'] === '?') {\n            label.innerText = obj['?'];\n            subtrees.appendChild(visit(obj.x));\n          } else if (obj['?'] === '^' || obj['?'] === '$') label.innerText = obj['?'];else if (obj['?'] === '{n}') {\n            label.innerText = '{' + obj.n + '}';\n            subtrees.appendChild(visit(obj.x));\n          } else if (obj['?'] === '{a,b}') {\n            label.innerText = '{' + obj.min + ', ' + obj.max + '}';\n            subtrees.appendChild(visit(obj.x));\n          } else if (obj['?'] === '|') {\n            label.innerText = obj['?'];\n            subtrees.appendChild(visit(obj.a));\n            subtrees.appendChild(visit(obj.b));\n          } else {\n            label.innerText = JSON.stringify(obj, null, 2);\n          }\n\n          if (subtrees.children.length) {\n            var subtreeOpen = true;\n            var caret = document.createElement('span');\n            caret.className = 'json-tree-caret';\n            caret.innerText = subtreeOpen ? '↓' : '→';\n            labelContainer.appendChild(caret);\n            caret.addEventListener('click', () => {\n              subtreeOpen = !subtreeOpen;\n              caret.innerText = subtreeOpen ? '↓' : '→';\n              if (subtreeOpen) subtrees.classList.remove('json-tree-subtree-closed');else subtrees.classList.add('json-tree-subtree-closed');\n            });\n          }\n\n          labelContainer.appendChild(label);\n          res.appendChild(labelContainer);\n          res.appendChild(subtrees);\n          return res;\n        };\n\n        while (out.firstChild != null) out.removeChild(out.firstChild);\n\n        out.appendChild(visit(obj.res));\n        sendOk(obj);\n      } else if (obj.action === 'err') {\n        if (obj.err == null) {\n          sendErr('regex-parser|recv|err|null-err');\n          return;\n        }\n\n        out.innerText = obj.err;\n        sendOk(obj);\n      } else {\n        sendErr('regex-parser|recv|alien-action');\n      }\n    } else if (obj['?'] === 'ok') {// already logging everything\n    } else if (obj['?'] === 'err') {\n      console.log('ERR: (' + obj.code + ') ' + obj.msg);\n    } else {\n      sendErr('proto|recv|alien-packet');\n    }\n  });\n});\n\n//# sourceURL=webpack:///./script/main.js?");

/***/ })

/******/ });