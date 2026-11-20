import { test } from "node:test";
import assert from "node:assert/strict";
import { handleWorkspaceRequest } from "../dist/host-adapter.js";
import { electricityInput } from "../dist/synthetic.js";
function memoryHost() {
 let revision=null;const history=[];let lock=Promise.resolve();
 const host={authenticate:async()=>({actorId:"author"}),transaction:async work=>{
  const previous=lock;let release;lock=new Promise(r=>{release=r;});await previous;
  try{return await work({contextFor:async actorId=>({actorId,active:true,enabled:true,capabilities:["data-hub.read","data-hub.edit"],now:"2026-11-20T12:00:00.000Z"}),readRevision:async()=>structuredClone(revision),writeRevision:async(expected,next,audit)=>{
   assert.equal(revision?.version??0,expected);history.push(structuredClone({revision:next,audit}));revision=structuredClone(next);
  }});}finally{release();}
 }};return {host,history};
}
test("host authentication precedes any private storage access",async()=>{
 const host={authenticate:async()=>{throw new Error("Unauthenticated");},transaction:()=>assert.fail("Storage touched")};
 await assert.rejects(()=>handleWorkspaceRequest({action:"read"},host),/Unauthenticated/);
});
test("two racing saves use the stored version; one commits with its audit/history",async()=>{
 const {host,history}=memoryHost();const command={action:"save",expectedVersion:0,input:electricityInput()};
 const results=await Promise.allSettled([handleWorkspaceRequest(command,host),handleWorkspaceRequest(command,host)]);
 assert.equal(results.filter(r=>r.status==="fulfilled").length,1);assert.equal(history.length,1);assert.equal(history[0].audit.version,1);
 assert.equal((await handleWorkspaceRequest({action:"read"},host)).revision.version,1);
});
test("request body cannot supply grants or an actor",async()=>{
 const {host,history}=memoryHost();await assert.rejects(()=>handleWorkspaceRequest({action:"read",actorId:"admin",capabilities:["data-hub.approve"]},host),/Invalid command/);assert.equal(history.length,0);
});
