const assert=require('node:assert/strict'),{Game}=require('../dist/engine.js');
for(const singlePlayer of [false,true]){
 const g=new Game({singlePlayer,requireSelection:true});
 assert(g.sideTurrets().every(t=>t.hp===0&&t.cycle===0&&t.respawnAt===180));
 assert(!g.snapshot(0).ruins.some(t=>t.sideObjective));
 g.tick(.1);assert.equal(g.time,0);g.confirmVehicle(0);
 g.paused=true;g.tick(.1);assert.equal(g.time,0);g.paused=false;
 g.time=179.99;g.updateSideTurrets(0);assert(g.sideTurrets().every(t=>t.hp===0&&t.captureProgress===0));
 g.time=180;g.updateSideTurrets(0);assert(g.sideTurrets().every(t=>t.hp===t.max&&t.cycle===0&&t.team===-1&&t.respawnAt===null));
 assert(!g.snapshot(0).sidePoints.length);
}
const online=new Game({multiplayer:true,teamSize:2});assert(!online.structures.some(t=>t.sideObjective));
console.log('Solo/1v1 outposts: appear at 3:00, first cycle unchanged, no early ruins/capture; menu/pause and 2v2 unaffected.');
