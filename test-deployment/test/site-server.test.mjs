import test from 'node:test';
import assert from 'node:assert/strict';
import {startSiteServer} from '../scripts/test-site-server.mjs';
import {createServer} from 'node:net';
test('owned server becomes ready, uses a separate port and closes without touching another listener',async()=>{
 const other=createServer();await new Promise(resolve=>other.listen(0,'127.0.0.1',resolve));
 let server;
 try{
  server=await startSiteServer();
  assert.notEqual(new URL(server.base).port,String(other.address().port));
  assert.equal((await fetch(server.base)).status,200);
  await server.stop();await server.stop();
  await assert.rejects(fetch(server.base));
  assert.equal(other.listening,true);
 }finally{await server?.stop();await new Promise(resolve=>other.close(resolve));}
});
test('startup failure propagates child diagnostics instead of masquerading as readiness',async()=>{
 await assert.rejects(startSiteServer({vitePath:'nonexistent-vite-test-entry.mjs'}),/Vite exited.*[\s\S]*Cannot find module/);
});
