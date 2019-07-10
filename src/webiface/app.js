import fs from 'fs-extra';
import path from 'path';

import Koa from 'koa';
import KoaLogger from 'koa-logger';
import compress from 'koa-compress';
import send from 'koa-send';
import websocket from 'koa-easy-ws';

import {handleWs} from './ws';
import {genIndex} from './index';

const distPath = fs.realpathSync(path.join(__dirname, './dist'));

const app = new Koa();

app.use(new KoaLogger());
app.use(websocket());
app.use(compress());
app.use(async (ctx)=>{
  if (ctx.ws != null) {
    const ws = await ctx.ws();
    handleWs(ws);
    return;
  }

  if (ctx.path === '/') {
    ctx.body = genIndex();
    return;
  }

  try {
    await send(ctx, ctx.path, {root: distPath});
  }
  catch (e) {
    ctx.status = 404;
  }
});

app.listen(3000);
console.log('listening');
