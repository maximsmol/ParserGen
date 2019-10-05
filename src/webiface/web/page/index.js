import {dom} from '../util/dom';

import webpackMode from '@@webpackMode';
const pretty = webpackMode === 'development';

const ieWarning = [
  '<!--[if IE]>',
  '  <p class="browserupgrade">',
  '   You are using an <strong>outdated</strong> browser.',
  '   Please <a href="https://browsehappy.com/">upgrade your browser</a>',
  '   to improve your experience and security.',
  '  </p>',
  '<![endif]-->',
  ''
];

require('../style/normalize.styl');
require('../style/main.styl');

export default () => {
  return '<!doctype html>' + (pretty ? '\n' : '')+
    <html lang='en'>
      <head>
        <meta charset='utf-8'/>
        <title>ParserGen</title>
        <meta name='description' content=''/>
        <meta name='viewport' content='width=device-width, initial-scale=1'/>

        {/*<link rel="manifest" href="site.webmanifest"/>
        <link rel="apple-touch-icon" href="icon.png"/>*/}

        <link rel='stylesheet' href={require('../style/normalize.styl')}/>
        <link rel='stylesheet' href={require('../style/main.styl')}/>

        <meta name='theme-color' content='#fafafa'/>
      </head>
      <body>
        {{str: ieWarning.join(pretty ? '\n' : '')}}
        <div class='root'>
          <div class='tabs fil'>
            <div class='tab-button-row'>
              <span class='tab-button-active' data-target='tab-regex-parser'>RegEx Parser</span>
              <span class='tab-button' data-target='tab-regex-nfa'>RegEx NFA</span>
            </div>

            <div class='tab-active' id='tab-regex-parser'>
              <div>
                <h1 class='tab-header'>Regex parser</h1>
              </div>
              <div>
                <input class='input-regex font-150' id='regex-parser-input' type='text' placeholder='RegEx'/>
              </div>
              <div>
                <div class='regex-parser-output font-150' id='regex-parser-output'/>
              </div>
            </div>
            <div class='tab' id='tab-regex-nfa'>
              Regex NFA
            </div>
          </div>
        </div>
      </body>
    </html>.str;
};
