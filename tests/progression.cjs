const assert=require('node:assert/strict'),{Game,B,MAX_LEVEL,upgradeIndex,talentOptions}=require('../dist/engine.js');
function setup(vehicle='tank'){const g=new Game();g.players[0]=g.makePlayer(0,vehicle);g.covers=[];g.bushes=[];g.structures=[];g.units=[];const p=g.players[0];p.tank.x=800;p.tank.y=700;g.players[1].tank.x=1000;g.players[1].tank.y=700;return [g,p];}
assert.equal(MAX_LEVEL,30);assert(B.levels.every((v,i)=>!i||v>B.levels[i-1]));
for(const vehicle of ['tank','bradley'])for(const first of [0,1]){const [g,p]=setup(vehicle);g.gain(p,1e9);assert.equal(p.level,30);assert.equal(p.pending.length,28);assert.equal(talentOptions(p).length,14);
 while(p.pending.length){const level=p.pending[0],choice=level<16?first:1-first;const n=p.chosen.length;if(level>=16){g.command(0,{type:'upgrade',choice:first});assert.equal(p.pending[0],level);assert.equal(p.chosen.length,n);}g.command(0,{type:'upgrade',choice});assert.equal(p.chosen.length,n+1);}
 assert.equal(p.chosen.length,28);assert.equal(new Set(p.chosen.map(v=>upgradeIndex(v.level)+':'+v.choice)).size,28);assert.equal(p.smokeTimers.length,3);assert.equal(p.smokeCooldown,50*(vehicle==='tank')||undefined);
 if(vehicle==='bradley'){assert.equal(p.skills.bService.radius,180);assert.equal(p.heCapacity,B.bradley.heReserve.capacity*1.4);assert.equal(p.stocks.tow.interval,B.bradley.weapons.TOW.interval*.8);}
}
{const [g,p]=setup();p.pending=[9];g.command(0,{type:'upgrade',choice:1});p.skillState.still=2;p.tank.turret=0;g.fire(p.tank,{x:1000,y:700,kind:'ground'});assert.equal(g.shots[0].damage,B.weapons.AP.damage*1.2);assert.equal(p.skillState.still,0);}
{const [g,p]=setup();p.pending=[10];g.command(0,{type:'upgrade',choice:1});p.tank.hp=p.tank.max*.29;g.damage({kind:'MG',team:1,player:null,vx:1,vy:0},p.tank,1);assert(p.shieldUntil>g.time);}
{const [g,p]=setup();p.pending=[12];g.command(0,{type:'upgrade',choice:0});p.weapon='HE';assert.equal(g.profile(p.tank,{kind:'ground'}).blastRadius,B.projectiles.heRadius*1.25);}
{const [g,p]=setup('bradley');p.pending=[11];g.command(0,{type:'upgrade',choice:0});g.updateWeapons(p,100);assert.equal(p.heFuel,p.heCapacity);}
console.log('30 levels, 28 unique choices, disabled duplicates, both acquisition orders, smoke/TOW/HE capacity, prepared shot and emergency shield passed');
