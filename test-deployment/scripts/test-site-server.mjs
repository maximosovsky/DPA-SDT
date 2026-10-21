import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));

// Own a direct Node/Vite child, never a shell tree or a user's existing server.
export async function startSiteServer({preview=false, timeoutMs=30000, vitePath=fileURLToPath(new URL('../node_modules/vite/bin/vite.js',import.meta.url))}={}) {
 const port=await new Promise((resolve,reject)=>{
  const socket=createServer();socket.once('error',reject);
  socket.listen(0,'127.0.0.1',()=>{const port=socket.address().port;socket.close(error=>error?reject(error):resolve(port));});
 });
 const child=spawn(process.execPath,[vitePath,...(preview?['preview']:[]),'--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:root,stdio:['ignore','pipe','pipe']});
 let output='',spawnError;
 for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{output=(output+data.toString()).slice(-12000);});
 child.on('error',error=>{spawnError=error;});
 const exited=once(child,'close').catch(()=>{});
 let stopped=false;
 const stop=async()=>{
  if(stopped)return;stopped=true;
  if(child.exitCode===null&&child.signalCode===null){
   child.kill();
   const done=await Promise.race([exited.then(()=>true),new Promise(resolve=>setTimeout(()=>resolve(false),5000))]);
   if(!done){child.kill('SIGKILL');await exited;}
  }else await exited;
 };
 const base=`http://127.0.0.1:${port}`;
 try {
  const deadline=Date.now()+timeoutMs;
  while(Date.now()<deadline){
   if(spawnError)throw spawnError;
   if(child.exitCode!==null||child.signalCode!==null)throw Error(`Vite exited (${child.exitCode??child.signalCode}): ${output}`);
   try{
    const response=await fetch(base+(preview?'/index1.html':'/'),{signal:AbortSignal.timeout(1000)});
    const text=await response.text();
    if(response.ok&&/text\/html/.test(response.headers.get('content-type')??'')&&text.includes('id="main"')) return {base,stop,pid:child.pid};
   }catch{/* Connection may not be available while Vite starts. Deadline still applies. */}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw Error(`Vite readiness timed out after ${timeoutMs}ms: ${output}`);
 }catch(error){await stop();throw error;}
}
