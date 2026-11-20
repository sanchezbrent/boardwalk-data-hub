import { test } from "node:test";
import assert from "node:assert/strict";
import { manifest,checkManifest,installPlugin } from "../dist/contract.js";
test("compatible exact package mounts and cleans up",()=>{
 let mounts=0,disposals=0;const module={manifest,mount:()=>{mounts++;return()=>{disposals++;};}};
 const cleanup=installPlugin({enabled:true,allowedId: "data-hub", allowedCapabilities: manifest.capabilities, allowedVersion:manifest.version,hostApiVersion:1,module,target:{},bridge:{}});
 assert.equal(mounts,1);cleanup();assert.equal(disposals,1);
});
test("disabled plugins do not load UI",()=>{
 installPlugin({enabled:false,allowedId: "data-hub", allowedCapabilities: manifest.capabilities, allowedVersion:manifest.version,hostApiVersion:1,module:{manifest,mount:()=>assert.fail()},target:{},bridge:{}})();
});
for(const [name,mutate] of [
 ["remote code URL",m=>{m.entrypoint="https://example.org/plugin.js";}],
 ["unknown permissions",m=>{m.capabilities.push("content.publish");}],
 ["incompatible API",m=>{m.hostApiVersion=2;}],
 ["route escape",m=>{m.route="/settings";}],
 ["repeated capability",m=>{m.capabilities[0]=m.capabilities[1];}],
 ["inconsistent identity and route",m=>{m.id="unreviewed";}],
])test(`rejects ${name}`,()=>{const m=structuredClone(manifest);mutate(m);assert.throws(()=>checkManifest(m,1));});
test("unallowlisted package never mounts",()=>{
 assert.throws(()=>installPlugin({enabled:true,allowedId: "data-hub", allowedCapabilities: manifest.capabilities, allowedVersion:"0.2.0",hostApiVersion:1,module:{manifest,mount:()=>assert.fail()},target:{},bridge:{}}),/allowlisted/);
 assert.throws(()=>checkManifest(manifest,2),/Incompatible/);
});

test("the same lifecycle contract admits a separately allowlisted future plugin",()=>{
 const next={id:"release-calendar",version:"0.1.0",hostApiVersion:1,route:"/plugins/release-calendar",capabilities:["release-calendar.read"]};
 let mounted=false;installPlugin({enabled:true,allowedId:next.id,allowedVersion:next.version,allowedCapabilities:next.capabilities,hostApiVersion:1,module:{manifest:next,mount:()=>{mounted=true;return()=>{};}},target:{},bridge:{}})();
 assert.equal(mounted,true);
});
