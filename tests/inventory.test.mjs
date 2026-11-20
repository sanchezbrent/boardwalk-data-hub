import { test } from "node:test";
import assert from "node:assert/strict";
import { inventoryDataHubData,readLegacyDataHub } from "../scripts/inventory.mjs";
import { FIGURE_IDS } from "../dist/figures.js";
const source=()=>({asOf:"2026-11-09",metrics:FIGURE_IDS.map(id=>({id,values:[1,2],specialized:{categories:["synthetic"],nested:{retained:true}}})),geographies:{example:[1,2]}});
const html=s=>`<script id="source-data" type="application/json">${JSON.stringify(s)}</script>\n<p>electricity caption</p>`;
test("inventory retains every synthetic specialized payload and envelope",()=>{
 const s=source();const result=inventoryDataHubData(html(s),JSON.stringify(s));assert.deepEqual(result.legacySource,s);assert.equal(result.figures.length,18);
 assert(result.figures.every(f=>f.readyForReview===false));assert.deepEqual(result.figures[0].legacyPayload,s.metrics[0]);
 assert.equal(result.figures.find(f=>f.id==="electricity").profile,"electricity-price");assert.equal(result.readerSha256.length,64);
});
test("inventory refuses source/snapshot drift",()=>{const s=source();const other=source();other.metrics[0].values[0]++;assert.throws(()=>inventoryDataHubData(html(s),JSON.stringify(other)),/differ/);});
test("inventory refuses duplicated, missing or unknown figure IDs",()=>{
 for(const change of [s=>s.metrics.pop(),s=>{s.metrics[0].id=s.metrics[1].id;},s=>{s.metrics[0].id="new";}]){const s=source();change(s);assert.throws(()=>readLegacyDataHub(html(s)),/registry/);}
});
test("inventory rejects ambiguous script payloads and impossible dates",()=>{
 const s=source();assert.throws(()=>readLegacyDataHub(html(s)+html(s)),/exactly one/);s.asOf="2026-02-30";assert.throws(()=>readLegacyDataHub(html(s)),/real dated/);
});
