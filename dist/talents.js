/* Vehicle-specific talents. Shared by the standalone client and authoritative server. */
(function(root){'use strict';
const get=(p,id)=>p.skills?.[id];
const options=(p,B)=>B[p.vehicle]?.talents?.map(row=>row.map(t=>t.name+' — '+t.text.replace(/\{(\w+)\}/g,(_,k)=>String(t[k]??'?'))));
function barrage(p,B){const w={...B.apache.weapons.Barrage},n=get(p,'aNarrow'),long=get(p,'aLongBarrage'),wide=get(p,'aWideBarrage');if(n&&p.narrowBarrage)w.width/=n.factor;if(long){w.length*=1+long.lengthPercent/100;w.count=Math.round(w.count*(1+long.countPercent/100));}if(wide){w.width*=1+wide.widthPercent/100;w.length*=1-wide.lengthReduction/100;}return w;}
function install(Game,{B,distance,clamp,angleDiff,containingBush,vehicleConfig,vehicleWeapons,upgradeIndex}){
 const P=Game.prototype,old={};
 function wrap(name,fn){old[name]=P[name];P[name]=fn;}
 function state(p){return p.skillState||(p.skillState={still:0,flight:0,chain:0,lastShot:-100,boostUntil:0,driveReady:0,overdriveUntil:0,overdriveReady:0,lockUntil:0,focusId:null,focusHits:0,focusAt:-100});}
 function stock(p,key,max,interval){p.stocks??={};p.stocks[key]={charges:max,max,next:0,interval};}
 function consume(p,key,interval){const s=p.stocks?.[key];if(!s)return;s.charges=Math.max(0,s.charges-1);if(!s.next)s.next=interval;}
 function stockTick(p,key,dt,factor){const s=p.stocks?.[key];if(!s)return;if(s.charges<s.max){s.next-=dt*factor;while(s.next<=0&&s.charges<s.max){s.charges++;if(s.charges<s.max)s.next+=s.interval;else s.next=0;}}p[key+'Left']=s.charges?0:Math.max(0,s.next);}
 P.barrageWeapon=function(p){return p.barrage?.spec||barrage(p,B);};
 P.canTowMove=function(p){const shot=this.activeTOW(p);return !!(get(p,'bTowMove')&&shot&&!shot.pending);};
 P.chooseTalent=function(p,level,choice){const def=(B[p.vehicle]?.talents||B[p.vehicle]?.lateTalents)?.[upgradeIndex(level)]?.[choice];if(!def)return;p.skills??={};const {id,name,text,...params}=def;p.skills[def.id]=params;state(p);const t=p.tank;
   if(['tSmokeStock','bSmokeStock'].includes(def.id))p.smokeTimers.push(0);
   if(def.id==='tSmokeCooldown')p.smokeCooldown=def.cooldown;
   if(def.id==='tHull'){const extra=t.max*def.percent/100;t.max+=extra;if(t.hp>0)t.hp=Math.min(t.max,t.hp+extra);}
   if(def.id==='bService'&&get(p,'bServiceRange'))p.skills.bService.radius*=1+get(p,'bServiceRange').percent/100;
   if(def.id==='arTurn')p.turnSpeed*=1+def.percent/100;
   if(def.id==='arEngine')t.speed*=1+def.percent/100;
   if(def.id==='arLoader')p.attackSpeed*=1+def.percent/100;
   if(def.id==='arHull'){const extra=t.max*def.percent/100;t.max+=extra;if(t.hp>0)t.hp+=extra;}
   if(def.id==='arRepair')p.repairRate*=1+def.percent/100;
   if(def.id==='arVision'){p.baseTalentVision*=1+def.percent/100;t.vision=p.baseTalentVision;}
   if(def.id==='arArmor')t.armor=def.tier;
   if(def.id==='tRepair')p.repairRate*=1+def.percent/100;
   if(def.id==='bServiceRange'){p.skills.bService??={radius:120,percent:50};p.skills.bService.radius*=1+def.percent/100;}
   if(def.id==='bSustain')p.skills.bOverdrive??=Object.fromEntries(Object.entries(B.bradley.talents[8][0]).filter(([k])=>!['id','name','text'].includes(k)));
   if(def.id==='bReserve'){p.heCapacity=B.bradley.heReserve.capacity*(1+def.percent/100);p.heFuel+=p.heCapacity-B.bradley.heReserve.capacity;}
   if(def.id==='bReloadTow'&&p.stocks?.tow){p.stocks.tow.interval*=1-def.percent/100;p.stocks.tow.next*=1-def.percent/100;}

   if(def.id==='aFlareStock')stock(p,'flare',def.charges,B.apache.flares.cooldown);
   if(def.id==='aBarrageStock')stock(p,'barrage',def.charges,vehicleWeapons(p).Barrage.cooldown);
   if(def.id==='bTowStock'){const remaining=p.towLeft;stock(p,'tow',def.charges,vehicleWeapons(p).TOW.interval*(1-(get(p,'bReloadTow')?.percent??0)/100));if(remaining>0){p.stocks.tow.charges=Math.max(0,def.charges-1);p.stocks.tow.next=remaining;}}
   if(def.id==='aFlareStock')p.flareLeft=0;if(def.id==='aBarrageStock')p.barrageLeft=0;if(def.id==='bTowStock')p.towLeft=0;
   p.message='Выбран талант: '+def.name+'.';
 };
 wrap('makePlayer',function(...args){const p=old.makePlayer.apply(this,args);p.skills={};p.stocks={};p.narrowBarrage=false;state(p);p.baseTalentVision=p.tank.vision;return p;});
 wrap('command',function(id,cmd){const p=this.players[id];if(!p||!cmd)return;const st=state(p);
   if(cmd.type==='narrow'||cmd.type==='overdrive'){
     if(!this.matchStarted||this.over||this.paused||p.tank.hp<=0||p.stunnedUntil>this.time)return;
     if(p.repair){this.requestCancelRepair(p,cmd);return;}
     if(cmd.type==='narrow'&&get(p,'aNarrow')){p.narrowBarrage=!p.narrowBarrage;p.message=p.narrowBarrage?'Узкий ракетный залп.':'Обычный ракетный залп.';}
     const skill=null;if(cmd.type==='overdrive'&&skill&&this.time>=st.overdriveReady&&this.time>=st.lockUntil){st.overdriveUntil=this.time+skill.duration;st.overdriveReady=this.time+skill.cooldown;p.switchLeft=0;this.ensureShell(p);p.message='Огневая поддержка включена!';}return;
   }
   if(['stop','weapon','move'].includes(cmd.type))p.pairedMissile=null;
   return old.command.call(this,id,cmd);
 });
 wrap('load',function(p,kind,swap){if(swap&&(get(p,'bFeed')||get(p,'arFeed'))){if(p.cannon.target&&!p.cannon.swap){p.cannon.target=kind;return;}p.cannon={loaded:kind,target:null,left:0,total:0,swap:false};return;}return old.load.call(this,p,kind,swap);});
 wrap('select',function(p,name,internal){const active=(get(p,'bFeed')||get(p,'arFeed'))&&['AP','HE'].includes(name)&&['AP','HE'].includes(p.weapon),delay=p.switchDelay;if(active)p.switchDelay=0;try{return old.select.call(this,p,name,internal);}finally{p.switchDelay=delay;}});
 wrap('deployFlares',function(p){const before=this.effects.length;old.deployFlares.call(this,p);if(this.effects.length===before)return;const st=state(p),long=get(p,'aLongFlares'),escape=get(p,'aEscape');if(long){p.tank.flaresUntil=this.time+B.apache.flares.duration*long.factor;const e=this.effects[this.effects.length-1];e.life=e.duration=B.apache.flares.duration*long.factor;}if(escape)st.boostUntil=this.time+escape.duration;consume(p,'flare',B.apache.flares.cooldown);if(p.stocks?.flare)p.flareLeft=p.stocks.flare.charges?0:p.stocks.flare.next;});
 wrap('startBarrage',function(p,angle){const before=p.barrage;old.startBarrage.call(this,p,angle);if(!before&&p.barrage){p.barrage.spec=barrage(p,B);consume(p,'barrage',vehicleWeapons(p).Barrage.cooldown);if(p.stocks?.barrage)p.barrageLeft=p.stocks.barrage.charges?0:p.stocks.barrage.next;}});
 wrap('inVision',function(team,u){if(u.markedUntil?.[team]>this.time){const bush=this.bushAt(u);if(this.all().some(v=>v.team===team&&this.canSpot(v,u,bush)&&this.clearSight(v,u)))return true;}return old.inVision.call(this,team,u);});
 P.ownDenseSmoke=function(p){return this.smokes.some(f=>f.owners?.includes(p.id)&&distance(f,p.tank)<=f.r&&(f.charge?f.density:f.density*Math.min(f.age/2,1))>=(f.threshold??B.smoke.threshold));};
 wrap('startRepair',function(p){old.startRepair.call(this,p);if(p.repair&&get(p,'bSmokeRepair')&&this.ownDenseSmoke(p)){p.repair.warmup=0;p.message='Ремонт под прикрытием начат.';}});
 wrap('updateRecovery',function(p,dt){if(p.repair&&get(p,'bSmokeRepair')&&this.ownDenseSmoke(p))p.repair.warmup=0;old.updateRecovery.call(this,p,dt);const repair=p.repair,service=get(p,'bService');if(service&&repair&&repair.cancelAt===null&&this.time>=repair.started+(repair.warmup??p.repairWarmup)&&p.tank.hp>0){for(const ally of this.players)if(ally.enabled&&ally.id!==p.id&&ally.team===p.team&&ally.tank.hp>0&&distance(p.tank,ally.tank)<=service.radius)ally.tank.hp=Math.min(ally.tank.max,ally.tank.hp+p.repairRate*service.percent/100*dt);}});
 wrap('move',function(u,target,dt,stop=0,reverse=false){const p=u.kind==='tank'?this.owner(u):null,st=p?state(p):null;let factor=1;const speed=u.speed;if(p&&get(p,'bDrive')&&distance(u,target)>stop+1&&st.still>=get(p,'bDrive').prepare){st.boostUntil=this.time+get(p,'bDrive').duration;st.still=0;}
   if(u.slowUntil>this.time)factor*=u.slowFactor??1;
   if(p){const escape=get(p,'aEscape'),drive=get(p,'bDrive');if(st.boostUntil>this.time)factor*=1+(escape?.percent??drive?.percent??0)/100;
     
     if(this.canTowMove(p))factor*=get(p,'bTowMove').percent/100;
     if(reverse&&p.smokeMoveUntil>this.time&&get(p,'bSmokeMove'))factor*=1+get(p,'bSmokeMove').percent/100;
   }
   u.speed*=factor;const x=u.x,y=u.y;try{old.move.call(this,u,target,dt,stop,reverse);}finally{u.speed=speed;}
   if(st){if(Math.hypot(u.x-x,u.y-y)>.001){st.moved=true;st.still=0;st.flight+=dt;}else st.flight=0;}
 });
 wrap('attackRange',function(p){let range=old.attackRange.call(this,p),skill=null;if(p.vehicle==='apache'&&p.weapon==='ChainGun')skill=get(p,'aHover');if(p.vehicle==='bradley'&&['AP','HE'].includes(p.weapon))skill=get(p,'bSector');if(skill&&state(p).still>=skill.prepare)range*=1+skill.percent/100;return range;});
 wrap('faceApache',function(p,desired,dt){const turn=p.tank.hullTurnSpeed,skill=get(p,'aTurn');if(skill&&state(p).still>0)p.tank.hullTurnSpeed*=1+skill.percent/100;try{return old.faceApache.call(this,p,desired,dt);}finally{p.tank.hullTurnSpeed=turn;}});
 wrap('profile',function(a,b){const w=old.profile.call(this,a,b),p=a.kind==='tank'?this.owner(a):null;
   if(a.attackSlowUntil>this.time)w.interval/=a.attackSlowFactor??1;
   if(!p)return w;let bonus=1;if(['AP','HE'].includes(p.weapon))bonus=p.cannonDamageBonus??(get(p,'bStabilize')?1.25:1);if(p.weapon==='ChainGun'&&get(p,'aGunMove'))bonus=1.3;if(p.weapon==='Missiles'&&get(p,'aPass'))bonus=1.3;for(const key of ['damage','damageArmor','damageInfantry'])if(Number.isFinite(w[key]))w[key]*=bonus;const st=state(p),spin=get(p,'bSpin'),over=get(p,'bOverdrive');
   if(spin&&['AP','HE'].includes(p.weapon))w.interval/=1+spin.percent/100*clamp(st.chain/spin.ramp,0,1);
   if(over&&st.overdriveUntil>this.time&&['AP','HE'].includes(p.weapon))w.interval/=1+over.percent/100;
   return w;
 });
 wrap('fire',function(a,b,gun){const p=a.kind==='tank'?this.owner(a):null;if(!p)return old.fire.call(this,a,b,gun);const st=state(p);if(st.lockUntil>this.time&&['AP','HE','MG'].includes(p.weapon))return;
   const before=this.shots.length,pass=get(p,'aPass'),allow=pass&&p.weapon==='Missiles'&&st.flight>=pass.prepare;
   const settle=p.settleUntil;if(allow)p.settleUntil=0;
   try{old.fire.call(this,a,b,gun);}finally{p.settleUntil=settle;}
   if(this.shots.length===before)return;const shot=this.shots[this.shots.length-1];const previousShot=st.lastShot;st.lastShot=this.time;
   if(p.vehicle==='bradley'&&['AP','HE'].includes(p.weapon)){
     const over=get(p,'bOverdrive');if(over&&this.time>=st.overdriveReady){st.overdriveUntil=this.time+over.duration;st.overdriveReady=this.time+over.cooldown;st.overdriveReadyOriginal=st.overdriveReady;st.sustainUsed=0;}const spin=get(p,'bSpin');if(spin)st.chain=Math.min(spin.ramp,st.chain+(this.time-previousShot<=vehicleWeapons(p)[p.weapon].interval+.15?this.time-previousShot:0));
     const mark=get(p,'bMark'),sup=get(p,'bSuppress');shot.markDuration=mark?.duration;shot.attackSuppress=sup&&p.weapon==='HE'?{factor:1-sup.percent/100,duration:sup.duration}:null;
   }
   if(shot.ammo==='ChainGun'){const focus=get(p,'aFocus');if(focus){if(st.focusId!==b.id||this.time-st.focusAt>focus.reset){st.focusId=b.id;st.focusHits=0;}const mult=1+Math.min(focus.max,st.focusHits*focus.step)/100;shot.damage*=mult;shot.damageArmor*=mult;shot.damageInfantry*=mult;}const sup=get(p,'aSuppress');if(sup)shot.moveSuppress={factor:1-sup.percent/100,duration:sup.duration};}
   if(shot.ammo==='Missiles'){
     st.flight=0;const pair=get(p,'aPair');if(pair){shot.damage*=pair.damagePercent/100;p.pairedMissile={at:this.time+pair.delay,target:b.id,freeAim:b.id===undefined,shot:{...shot},angle:a.angle};}
     const guide=get(p,'aGuided');if(guide){shot.targetId=b.id;shot.guiding=true;shot.homingTurnSpeed=guide.turn*Math.PI/180;}
     if(p.pairedMissile)p.pairedMissile.shot={...shot};
   }
   if(shot.ammo==='AirMissiles'&&get(p,'aProximity'))shot.proximity=get(p,'aProximity').radius;
   if(shot.ammo==='TOW'){
     const prepare=get(p,'bPrepare');if(prepare&&st.still>=prepare.prepare){shot.launchAt=this.time+(shot.launchAt-this.time)/prepare.factor;p.towLaunchAt=shot.launchAt;}
     const track=get(p,'bTrack');if(track)shot.moveSuppress={factor:1-track.percent/100,duration:track.duration};
     shot.autonomousTalent=!!get(p,'bAutonomous');
   }
 });
 wrap('damage',function(s,u,damage){const before=u.hp;old.damage.call(this,s,u,damage);if(u.hp>=before||s.team===u.team)return;
   if(s.markDuration){u.markedUntil??={};u.markedUntil[s.team]=this.time+s.markDuration;}
   if(s.moveSuppress&&((s.ammo==='ChainGun'&&u.kind==='infantry')||(s.ammo==='TOW'&&u.kind==='tank'&&u.vehicle!=='apache'))){u.slowUntil=this.time+s.moveSuppress.duration;u.slowFactor=s.moveSuppress.factor;}
   if(s.attackSuppress&&u.kind==='infantry'){u.attackSlowUntil=this.time+s.attackSuppress.duration;u.attackSlowFactor=s.attackSuppress.factor;}
   const p=this.players[s.player],focus=p&&get(p,'aFocus');if(focus&&s.ammo==='ChainGun'){const st=state(p);if(st.focusId!==u.id||this.time-st.focusAt>focus.reset)st.focusHits=0;st.focusId=u.id;st.focusHits++;st.focusAt=this.time;}
 });
 wrap('projectiles',function(dt){
   // Unguided rocket bodies remain physical; guidance changes only their direction.
   for(const s of this.shots){if(s.ammo==='TOW'&&s.autonomous&&!s.pending&&!s.autonomousLockLost){const target=this.all().find(u=>u.id===(s.cursorGuided?s.autonomousTargetId:s.targetId)&&u.hp>0);if(target&&this.smokes.some(f=>(f.charge?f.density:f.density*Math.min(f.age/2,1))>=(f.threshold??1.2)&&distance(f,target)<=f.r)){s.autonomousLockLost=true;s.autonomousTargetId=null;s.passedAim=true;s.guiding=false;s.laserBroken=true;}}
   if(s.ammo==='Missiles'&&s.guiding){const t=this.all().find(u=>u.id===s.targetId);if(!t||!this.inVision(s.team,t))s.guiding=false;else{const a=Math.atan2(s.vy,s.vx),desired=Math.atan2(t.y-s.y,t.x-s.x),turn=a+clamp(angleDiff(desired,a),-s.homingTurnSpeed*dt,s.homingTurnSpeed*dt);s.vx=Math.cos(turn);s.vy=Math.sin(turn);}}
     if(s.ammo==='AirMissiles'&&s.proximity){const t=this.all().find(u=>u.id===s.targetId&&u.hp>0);if(t&&distance(s,t)<=s.proximity+t.r){this.damage(s,t,s.damage);this.effect(s.x,s.y,s.proximity,'AP');s.done=true;}}
   }
   this.shots=this.shots.filter(s=>!s.done);const pending=this.shots.filter(s=>s.ammo==='TOW'&&s.pending);old.projectiles.call(this,dt);
   for(const s of pending)if(!s.pending){const p=this.players[s.player];consume(p,'tow',s.cooldown);if(p.stocks?.tow)p.towLeft=p.stocks.tow.charges?0:p.stocks.tow.next;}
 });
 wrap('updateWeapons',function(p,dt){const st=state(p),zone=this.repairZone(p.team,p.tank),factor=zone&&get(p,'aRearm')?get(p,'aRearm').factor:1;
   old.updateWeapons.call(this,p,dt*factor);for(const key of ['flare','barrage','tow'])stockTick(p,key,dt,factor);
   if(st.overdriveUntil&&this.time>=st.overdriveUntil)st.overdriveUntil=0;
   const spin=get(p,'bSpin');if(spin&&this.time-st.lastShot>(vehicleWeapons(p)[p.weapon]?.interval??.3)+.1)st.chain=Math.max(0,st.chain-dt*spin.ramp/spin.decay);
   if(p.vehicle==='bradley'&&['AP','HE'].includes(p.weapon)&&p.cannon.target){const raw=vehicleWeapons(p)[p.cannon.target].interval,profile=this.profile(p.tank,{kind:'tank'}),speedup=raw/profile.interval;const extra=Math.max(0,speedup-1)*dt*p.attackSpeed;p.cannon.left=Math.max(0,p.cannon.left-extra);if(!p.cannon.left){p.cannon.loaded=p.cannon.target;p.cannon.target=null;}}
 });
 wrap('updatePlayer',function(p,dt){const st=state(p),t=p.tank;
   if(!st.moved)st.still+=dt;else st.still=0;if(!st.moved)st.flight=0;st.moved=false;
   const bush=get(p,'bBush');if(p.vehicle!=='tank')t.vision=p.baseTalentVision*(bush&&st.still>=bush.prepare?1+bush.percent/100:1);
   p.smokeCapacity=B.smoke.capacity;p.smokeConcentrationMultiplier=get(p,'bDense')?.concentration??1;
   p.fireOnMove=true;
   if(t.hp<=0){p.pairedMissile=null;st.flight=st.still=st.chain=0;st.focusHits=0;}
   old.updatePlayer.call(this,p,dt);if(p.vehicle==='apache'&&!st.moved)t.airSpeed=0;
   if(p.pairedMissile&&this.time>=p.pairedMissile.at){const pair=p.pairedMissile;p.pairedMissile=null;const target=this.all().find(u=>u.id===pair.target)||(pair.freeAim?{x:t.x+Math.cos(t.angle)*1000,y:t.y+Math.sin(t.angle)*1000}:null);if(t.hp>0&&!p.repair&&p.stunnedUntil<=this.time&&!this.overObstacle(p)&&p.weapon==='Missiles'&&target&&(pair.freeAim||this.visible(p.team,target))&&Math.abs(angleDiff(Math.atan2(target.y-t.y,target.x-t.x),t.angle))<.045){const side=p.missileSide;p.missileSide*=-1;const x=t.x+Math.cos(t.angle)*12-Math.sin(t.angle)*15*side,y=t.y+Math.sin(t.angle)*12+Math.cos(t.angle)*15*side,angle=t.angle;this.shots.push({...pair.shot,id:++this.id,createdAt:this.time,x,y,vx:Math.cos(angle),vy:Math.sin(angle),ignored:[],tested:[]});this.recordRecoil(t,'Missiles',t.angle);}}
 });
 const lateMove=P.move;P.move=function(u,target,dt,stop=0,reverse=false){const p=u.kind==='tank'?this.owner(u):null,speed=u.speed;let factor=1;if(p){if(p.breakUntil>this.time)factor*=1+(get(p,'tBreak')?.percent??0)/100;if(p.escapeSmokeUntil>this.time)factor*=1+(get(p,'bEscapeSmoke')?.percent??0)/100;const evac=get(p,'bEvac');if(evac&&u.hp/u.max<evac.threshold)factor*=1+evac.percent/100;}u.speed*=factor;try{return lateMove.call(this,u,target,dt,stop,reverse);}finally{u.speed=speed;}};
 const lateSmoke=P.smoke;P.smoke=function(p,held){const before=this.smokes.length;lateSmoke.call(this,p,held);if(this.smokes.length>before&&get(p,'bEscapeSmoke'))p.escapeSmokeUntil=this.time+get(p,'bEscapeSmoke').duration;};
 const lateProfile=P.profile;P.profile=function(a,b){const w=lateProfile.call(this,a,b),p=a.kind==='tank'?this.owner(a):null;if(!p)return w;if(w.kind==='TOW'){if(get(p,'bWarhead'))w.damage*=1+get(p,'bWarhead').percent/100;if(get(p,'bReloadTow'))w.interval*=1-get(p,'bReloadTow').percent/100;}if(w.kind==='HE'&&get(p,'tBlast'))w.blastRadius=B.projectiles.heRadius*(1+get(p,'tBlast').percent/100);return w;};
 const lateFire=P.fire;P.fire=function(a,b,gun){const p=a.kind==='tank'?this.owner(a):null,n=this.shots.length;lateFire.call(this,a,b,gun);if(this.shots.length===n)return;const shot=this.shots.at(-1);shot.sourceKind=a.kind;if(!p)return;if(['AP','HE'].includes(shot.ammo)&&p.vehicle==='tank'){const pos=get(p,'tPosition');if(pos&&state(p).still>=pos.prepare){shot.damage*=1+pos.percent/100;state(p).still=0;}const br=get(p,'tBreak');if(br&&this.time>=(p.breakReady??0)){p.breakUntil=this.time+br.duration;p.breakReady=this.time+br.cooldown;}}if(shot.ammo==='AP'&&get(p,'tTracks'))shot.lateTracks=get(p,'tTracks');};
 const lateWeapons=P.updateWeapons;P.updateWeapons=function(p,dt){const before=p.heFuel,oldTow=p.towLeft;lateWeapons.call(this,p,dt);const reserve=B.bradley.heReserve;if(p.vehicle==='bradley'){const cap=p.heCapacity??reserve.capacity,rate=reserve.regenPerSecond*(1+(get(p,'bSupply')?.percent??0)/100);p.heFuel=Math.min(cap,before+rate*dt);if(get(p,'bReloadTow')&&!p.stocks?.tow)p.towLeft=Math.max(0,oldTow-dt);}const last=get(p,'tLast');if(last&&p.tank.hp/p.tank.max<last.threshold&&p.cannon.target){p.cannon.left=Math.max(0,p.cannon.left-dt*p.attackSpeed*last.percent/100);if(!p.cannon.left){p.cannon.loaded=p.cannon.target;p.cannon.target=null;}}};
 const lateDamage=P.damage;P.damage=function(s,u,damage){const victim=u.kind==='tank'?this.owner(u):null,killer=this.players[s.player],before=u.hp;let factor=1;
 if(victim){const screen=get(victim,'tScreen');if(screen&&(s.sourceKind==='infantry'||this.all().find(v=>v.id===s.owner)?.kind==='infantry'))factor*=1-screen.percent/100;if(victim.shieldUntil>this.time)factor*=1-get(victim,'tEmergency').percent/100;}
 const hunter=killer&&get(killer,'bHunter');if(hunter&&['AP','HE'].includes(s.ammo)&&u.huntedBy?.[killer.id]>this.time)factor*=1+hunter.percent/100;
 lateDamage.call(this,s,u,damage*factor);if(u.hp>=before)return;
 if(victim&&u.hp>0){const skill=get(victim,'tEmergency');if(skill&&u.hp/u.max<skill.threshold&&this.time>=(victim.shieldReady??0)){victim.shieldUntil=this.time+skill.duration;victim.shieldReady=this.time+skill.cooldown;}}
 if(!killer||u.team===s.team)return;
 if(s.lateTracks&&u.kind==='tank'&&u.vehicle!=='apache'){u.slowUntil=this.time+s.lateTracks.duration;u.slowFactor=1-s.lateTracks.percent/100;}
 if(hunter&&s.ammo==='TOW'&&u.kind==='tank'){u.huntedBy??={};u.huntedBy[killer.id]=this.time+hunter.duration;}
 if(u.hp<=0&&u.kind==='tank'&&get(killer,'tLoader')&&killer.cannon.target)killer.cannon.left*=1-get(killer,'tLoader').percent/100;
 const sustain=get(killer,'bSustain');if(sustain&&['AP','HE'].includes(s.ammo)&&state(killer).overdriveReady>this.time){const st=state(killer);if(st.sustainCycle!==st.overdriveReadyOriginal){st.sustainCycle=st.overdriveReadyOriginal;st.sustainUsed=0;}const amount=Math.min(sustain.seconds,sustain.max-(st.sustainUsed??0));st.overdriveReady=Math.max(this.time,st.overdriveReady-amount);st.sustainUsed=(st.sustainUsed??0)+amount;}
 };

}
const api={get,options,barrage,install};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FrontlineTalents=api;
})(typeof globalThis!=='undefined'?globalThis:this);

