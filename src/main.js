import * as THREE from 'three';
import './style.css';

const app = document.querySelector('#app');
app.innerHTML = `
<div class="game"><canvas id="view"></canvas><div class="vignette"></div><div class="grain"></div>
<div class="hud">
  <div class="topline"><div><div class="brand">D<span>G</span> / DEAD GROUND</div><div class="coordinates" id="location">BLACKWATER VALLEY · 16:42</div></div><div class="brand">FIELD NOTES <span>01</span></div></div>
  <div class="objective"><div class="eyebrow" id="objective-step">PRIMARY OBJECTIVE · 01 / 02</div><h2 id="objective-title">Find the generator fuse</h2><p id="objective-copy">A spare fuse was left at the pump house. Restore power to the relay station.</p></div>
  <div class="right-hud"><div class="meter-title"><span>GROUND VIBRATION</span><span id="noise-value">0%</span></div><div class="meter-shell"><div class="meter-fill" id="noise-fill"></div></div><div class="meter-ticks"><span>QUIET</span><span>LISTENING</span><span>HUNTING</span></div>
  <div class="stats"><div class="stat-line"><div class="stat-label">HEALTH</div><div class="stat-bar"><div class="stat-fill" id="health-fill"></div></div><div class="stat-value" id="health-value">100</div></div><div class="stat-line"><div class="stat-label">WATER</div><div class="stat-bar"><div class="stat-fill" id="water-fill"></div></div><div class="stat-value" id="water-value">78</div></div><div class="stat-line"><div class="stat-label">BREATH</div><div class="stat-bar"><div class="stat-fill" id="stamina-fill"></div></div><div class="stat-value" id="stamina-value">100</div></div></div></div>
  <div class="inventory"><div><div class="slot active" id="slot-0"><span class="key">1</span><span class="icon">◉</span><span class="count" id="water-count">1</span></div><div class="slot-name">WATER</div></div><div><div class="slot" id="slot-1"><span class="key">2</span><span class="icon">ϟ</span><span class="count" id="flare-count">2</span></div><div class="slot-name">FLARE</div></div><div><div class="slot" id="slot-2"><span class="key">3</span><span class="icon">⌁</span><span class="count" id="decoy-count">1</span></div><div class="slot-name">NOISEMAKER</div></div></div>
  <div class="crosshair"></div><div class="prompt" id="prompt"></div><div class="message" id="message"></div><div class="danger" id="danger"></div><div class="compass" id="compass">N &nbsp; · &nbsp; <span>FIND THE PUMP HOUSE</span></div><div class="watermark">WASD MOVE &nbsp; / &nbsp; MOUSE LOOK</div>
</div>
<div class="screen" id="intro"><div class="panel"><div class="kicker">BLACKWATER VALLEY · SEPTEMBER 1987</div><h1 class="title">DEAD<br><span>GROUND</span></h1><p class="tagline">The valley has gone quiet. Something beneath the sand is listening. Get the relay back online before dark — and whatever you do, don't run.</p><div class="briefing"><div class="brief-item"><b>THE SIGNAL</b><span>Find a fuse at the abandoned pump house. Reach the radio mast and call for rescue.</span></div><div class="brief-item"><b>THE HUNTER</b><span>It has no eyes. Loose ground carries every footstep straight to its mouth.</span></div></div><button class="start-button" id="start">[ ENTER THE VALLEY ]</button><div class="controls"><b>WASD</b> move &nbsp; <b>MOUSE</b> look &nbsp; <b>SHIFT</b> sprint &nbsp; <b>SPACE</b> jump<br><b>E</b> interact &nbsp; <b>1</b> water &nbsp; <b>2</b> flare &nbsp; <b>3</b> noisemaker &nbsp; <b>ESC</b> pause</div></div></div>
<div class="screen end hidden" id="ending"><div class="panel"><div class="kicker" id="end-kicker">BLACKWATER VALLEY · 18:06</div><h1 class="title" id="end-title">SIGNAL<br><span>RECEIVED</span></h1><p class="tagline" id="end-copy">The valley answers with rotor noise. For the first time, it isn't listening to you.</p><button class="start-button" id="restart">[ PLAY AGAIN ]</button></div></div>
</div>`;

const canvas = document.querySelector('#view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#a96f49');
scene.fog = new THREE.FogExp2('#bd8051', 0.0085);
const camera = new THREE.PerspectiveCamera(76, window.innerWidth / window.innerHeight, 0.08, 180);
camera.rotation.order = 'YXZ';
const clock = new THREE.Clock();
const sun = new THREE.DirectionalLight('#ffd29a', 2.8); sun.position.set(-32, 48, 23); sun.castShadow = true; sun.shadow.mapSize.set(1024,1024); sun.shadow.camera.left=-55; sun.shadow.camera.right=55; sun.shadow.camera.top=55; sun.shadow.camera.bottom=-55; scene.add(sun);
scene.add(new THREE.HemisphereLight('#f0b788','#3b3124',1.45));
const fillLight = new THREE.PointLight('#d28b62', 0.6, 90); fillLight.position.set(0,9,0); scene.add(fillLight);
const mat = (color, roughness=1, extra={}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
const mats = {
  sand: mat('#b07b4f'), stone:mat('#66655b'), darkStone:mat('#383c36'), concrete:mat('#777365'), rust:mat('#83533b'), wood:mat('#6a4933'), paleWood:mat('#a37b52'), plaster:mat('#9e8060'), roof:mat('#5f5244'), metal:mat('#4d5550',.62,{metalness:.45}), red:mat('#a84931'), yellow:mat('#d7a64e'), glass:mat('#33474a',.25,{metalness:.25}), dark:mat('#20211c'), grass:mat('#646043'), bone:mat('#c4b393')
};
function box(parent, name, position, size, material, options={}) { const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material); mesh.name=name; mesh.position.set(...position); mesh.castShadow=options.castShadow!==false; mesh.receiveShadow=true; parent.add(mesh); return mesh; }
function cylinder(parent,name,position,radiusTop,radiusBottom,height,material,segments=12){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radiusTop,radiusBottom,height,segments),material);mesh.name=name;mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function sphere(parent,name,position,scale,material){const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),material);mesh.name=name;mesh.position.set(...position);mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
const world = new THREE.Group(); scene.add(world);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(190,190,1,1),mats.sand);ground.rotation.x=-Math.PI/2;ground.position.y=-.12;ground.receiveShadow=true;world.add(ground);
// Broken ridgelines ring the valley and turn the town into a dusty bowl.
for(let i=0;i<36;i++){const angle=i/36*Math.PI*2;const r=68+(i%4)*5;const rock=sphere(world,'ridge',[Math.cos(angle)*r,-2.5+Math.sin(i*3)*1.5,Math.sin(angle)*r],[7+(i%3)*2,6+(i%4)*2,9+(i%5)*2],i%3===0?mats.darkStone:mats.stone);rock.rotation.y=angle;}
function safePad(x,z,rx,rz,type='rock'){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.28,32),type==='concrete'?mats.concrete:mats.stone);mesh.name='safe-ground';mesh.scale.set(rx,.55,rz);mesh.position.set(x,-.06,z);mesh.receiveShadow=true;mesh.castShadow=true;world.add(mesh);safeZones.push({x,z,rx,rz});return mesh;}
const safeZones=[];
// Scattered stone islands: a deliberate, but imperfect, path across loose ground.
[[-35,3,7,7],[-26,0,6,6],[-17,-2,7,7],[-8,2,6,6],[1,-1,7,7],[10,2,6,6],[19,-1,7,7],[28,2,8,7]].forEach(p=>safePad(...p,'rock'));
safePad(-18,-2,4.8,4.8,'concrete'); safePad(29,2,5.5,5.5,'concrete');
// Rubble, scrub and road scars.
for(let i=0;i<95;i++){const x=(Math.random()-.5)*118,z=(Math.random()-.5)*104;if(Math.abs(z)<10&&x>-38&&x<34)continue;const s=.25+Math.random()*1.1;const rock=sphere(world,'rubble',[x,-.15+s*.12,z],[s*1.6,s*.55,s],i%4?mats.stone:mats.darkStone);rock.rotation.y=Math.random()*6;}
for(let i=0;i<105;i++){const x=(Math.random()-.5)*110,z=(Math.random()-.5)*92;if(Math.abs(z)<10&&x>-38&&x<34)continue;const shrub=new THREE.Group();shrub.position.set(x,0,z);world.add(shrub);const h=.55+Math.random()*.75;for(let j=0;j<5;j++){const b=cylinder(shrub,'dry-scrub',[0,h*.32,0],.025,.05,h,mats.wood,5);b.rotation.z=(Math.random()-.5)*.8;b.rotation.x=(Math.random()-.5)*.8;}sphere(shrub,'sage',[0,h*.7,0],[.28,.18,.3],mats.grass);}
// Town landmarks and an unmistakable route to the radio mast.
function building(x,z,w,d,h,wall,roofColor,name){const g=new THREE.Group();g.position.set(x,0,z);g.name=name;world.add(g);box(g,`${name} walls`,[0,h/2,0],[w,h,d],wall);box(g,`${name} roof`,[0,h+.16,0],[w+.35,.32,d+.35],roofColor);box(g,`${name} door`,[0,.95,d/2+.015],[1.05,1.9,.08],mats.wood);box(g,`${name} lintel`,[0,2.05,d/2+.08],[1.4,.15,.13],mats.paleWood);for(const sx of [-1,1]){box(g,`${name} window`,[sx*w*.32,1.55,d/2+.02],[.7,.58,.08],mats.glass);box(g,'shutter',[sx*w*.32,1.55,d/2+.09],[.12,.75,.1],mats.red);}return g;}
building(-23,-7,8,7,4.1,mats.plaster,mats.roof,'Pump house');
building(-3,10,9,7,4.5,mats.plaster,mats.wood,'Last Chance Saloon');
building(10,-12,7,6,3.8,mats.paleWood,mats.roof,'Motel office');
building(3,14,7,6,3.6,mats.plaster,mats.red,'General store');
// Water tank and pump details beside the fuse pickup.
cylinder(world,'water tank',[-17,2.1,-8],2.2,2.2,3.8,mats.metal,20);cylinder(world,'tank cap',[-17,4.1,-8],2.25,2.25,.25,mats.dark,20);
for(let i=0;i<4;i++){const leg=box(world,'tank leg',[-18.35+i*.9,.78,-8],[.13,1.7,.13],mats.metal);leg.rotation.z=(i-1.5)*.12;}
// Telegraph poles across the valley, with sagging wires.
for(const x of [-35,-12,12,35]){const p=box(world,'telegraph pole',[x,5,-18],[.25,10,.25],mats.wood);box(world,'crossbar',[x,9.3,-18],[2.5,.18,.18],mats.wood);}
for(const [a,b] of [[-35,-12],[-12,12],[12,35]]){const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(a,9.3,-18),new THREE.Vector3((a+b)/2,8.2,-18),new THREE.Vector3(b,9.3,-18));world.add(new THREE.Mesh(new THREE.TubeGeometry(curve,24,.025,5,false),mats.dark));}
// The radio station is a concrete island, visible from the pump house.
safePad(29,2,7,7,'concrete');building(31,2,8,7,3.5,mats.paleWood,mats.roof,'Relay station');
const mast=new THREE.Group();mast.position.set(28,0,-1);world.add(mast);
for(const [x,z] of [[-1.2,-1.2],[1.2,-1.2],[-1.2,1.2],[1.2,1.2]]){const leg=box(mast,'radio mast',[x,9,z],[.12,18,.12],mats.metal);leg.rotation.z=x*.035;leg.rotation.x=z*.035;}
for(let y=2;y<18;y+=2.4){const w=2.4*(1-y/22);box(mast,'mast brace',[0,y,0],[w,.07,w],mats.metal);}
cylinder(mast,'radio beacon',[0,18.3,0],.2,.2,.9,mats.red,8);const dish=sphere(mast,'dish',[0,13,0],[2.8,2.8,.22],mats.metal);dish.rotation.y=.6;
// Utility poles and scattered wrecks make route-finding possible from the ground.
function truck(x,z,heading=0){const t=new THREE.Group();t.position.set(x,0,z);t.rotation.y=heading;world.add(t);box(t,'rusted pickup body',[0,1.0,0],[2.3,.7,4.2],mats.red);box(t,'pickup hood',[0,1.48,-1.15],[2.2,.35,1.7],mats.red);box(t,'pickup cab',[0,1.78,.5],[1.85,1.15,1.7],mats.wood);box(t,'windshield',[0,1.95,-.37],[1.66,.58,.06],mats.glass);for(const xw of [-1.12,1.12])for(const zw of [-1.35,1.35]){const w=cylinder(t,'wheel',[xw,.55,zw],.52,.52,.25,mats.dark,12);w.rotation.z=Math.PI/2;}return t;}
truck(-8,-10,-.2);truck(17,9,.55);truck(0,-24,.15);
// Dead trees silhouette the town.
for(const [x,z] of [[-34,-13],[-12,19],[15,20],[39,-13],[-39,14],[18,-25]]){const tree=new THREE.Group();tree.position.set(x,0,z);world.add(tree);cylinder(tree,'dead trunk',[0,2.6,0],.17,.31,5.2,mats.wood,7);for(let i=0;i<4;i++){const branch=cylinder(tree,'branch',[Math.cos(i*1.6)*.8,3.4+i*.3,Math.sin(i*1.6)*.7],.05,.13,2.3,mats.wood,6);branch.rotation.z=(i%2?.8:-.8);branch.rotation.x=(i-1.5)*.18;}}

// A safe stone apron reaches the pump and relay doors; gaps elsewhere are loose sand.
safePad(-23,-7,7,6,'concrete');
safePad(31,2,7,7,'concrete');
// Add a few stepping stones that make the long exposed crossing a deliberate route.
[[-13,-3,3.2,3.1],[-5,1,3.4,3.3],[3,0,3.2,3.2],[11,1,3.4,3.2],[20,1,3.2,3.2]].forEach(p=>safePad(...p,'rock'));

const player={pos:new THREE.Vector3(-35,0,3),velY:0,yaw:-1.08,pitch:0,grounded:true,health:100,water:78,stamina:100,noise:0,stepClock:0,inventory:{water:1,flare:2,decoy:1},selected:0};
const keys={};
const ui={intro:document.querySelector('#intro'),ending:document.querySelector('#ending'),prompt:document.querySelector('#prompt'),message:document.querySelector('#message'),noise:document.querySelector('#noise-fill'),noiseText:document.querySelector('#noise-value'),health:document.querySelector('#health-fill'),healthText:document.querySelector('#health-value'),water:document.querySelector('#water-fill'),waterText:document.querySelector('#water-value'),stamina:document.querySelector('#stamina-fill'),staminaText:document.querySelector('#stamina-value'),objectiveStep:document.querySelector('#objective-step'),objectiveTitle:document.querySelector('#objective-title'),objectiveCopy:document.querySelector('#objective-copy'),compass:document.querySelector('#compass'),danger:document.querySelector('#danger')};
let started=false,paused=false,gameOver=false,hasFuse=false,relayOn=false,elapsed=0,messageTimer=0,selectedTarget=null,stepNoise=0,externalNoise=0;
function makeInteractable(name,position,label,kind){return{name,position:new THREE.Vector3(...position),label,kind,available:true};}
const fuseObj=makeInteractable('brass fuse',[-23,1.15,-3.15],'TAKE THE GENERATOR FUSE  [E]','fuse');
const radioObj=makeInteractable('radio console',[27.3,1.3,4.2],'RESTORE POWER & SEND DISTRESS CALL  [E]','radio');
const interactables=[fuseObj,radioObj];
const fuseMesh=box(world,'brass fuse',[-23,1.05,-3.15],[.28,.72,.28],mats.yellow);fuseMesh.rotation.z=.2;
const fuseGlow=new THREE.PointLight('#ffc56f',1.2,5);fuseGlow.position.set(-23,2,-3.15);world.add(fuseGlow);
const radioLamp=new THREE.Mesh(new THREE.SphereGeometry(.12,12,8),new THREE.MeshBasicMaterial({color:'#481d15'}));radioLamp.position.set(27.5,1.7,4.15);world.add(radioLamp);
// Creature silhouette: a segmented, eyeless burrower that rises only after warning tremors.
const worm=new THREE.Group();scene.add(worm);const wormMat=mat('#594334',.85),mouthMat=mat('#171311'),toothMat=mat('#d7c8a9');
const bodyParts=[];for(let i=0;i<7;i++){const part=sphere(worm,`burrower segment ${i}`,[0,-3-i*.55,0],[1.05-i*.065,.7-i*.035,1.0-i*.06],wormMat);bodyParts.push(part);}
const mouth=sphere(worm,'tooth-lined maw',[0,-2.75,0],[.83,.24,.82],mouthMat);
for(let i=0;i<8;i++){const tooth=cylinder(worm,'ivory tooth',[Math.cos(i*Math.PI/4)*.57,-2.55,Math.sin(i*Math.PI/4)*.57],.015,.09,.19,toothMat,5);tooth.rotation.z=Math.PI;tooth.rotation.x=Math.cos(i*Math.PI/4)*.5;}
const tendrils=[];for(let i=0;i<4;i++){const t=cylinder(worm,'feeler',[0,-3,0],.08,.12,2.4,wormMat,7);tendrils.push(t);}
const warningRing=new THREE.Mesh(new THREE.RingGeometry(1.6,1.82,48),new THREE.MeshBasicMaterial({color:'#d47c48',transparent:true,opacity:.75,side:THREE.DoubleSide}));warningRing.rotation.x=-Math.PI/2;warningRing.position.y=.04;scene.add(warningRing);warningRing.visible=false;
const dustGroup=new THREE.Group();scene.add(dustGroup);const dustMat=new THREE.MeshBasicMaterial({color:'#d8a16c',transparent:true,opacity:.72});
for(let i=0;i<24;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.08+Math.random()*.1,5,4),dustMat);p.userData={angle:Math.random()*Math.PI*2,r:.3+Math.random()*2.2,speed:.25+Math.random()*.75};dustGroup.add(p);}
const creature={pos:new THREE.Vector3(8,0,-8),state:'idle',timer:0,target:new THREE.Vector3(8,0,-8),lastNoise:0,attackCooldown:0};
const interactRay=new THREE.Raycaster();
function isSafe(x,z){return safeZones.some(q=>((x-q.x)*(x-q.x))/(q.rx*q.rx)+((z-q.z)*(z-q.z))/(q.rz*q.rz)<.87);}
function showMessage(text,duration=2.3){ui.message.textContent=text;ui.message.classList.add('show');messageTimer=duration;}
function setObjective(step,title,copy,marker){ui.objectiveStep.textContent=`PRIMARY OBJECTIVE · ${step}`;ui.objectiveTitle.textContent=title;ui.objectiveCopy.textContent=copy;ui.compass.innerHTML=`N &nbsp; · &nbsp; <span>${marker}</span>`;}
function begin(){if(started&&!paused)return;started=true;paused=false;ui.intro.classList.add('hidden');if(!gameOver)canvas.requestPointerLock?.();clock.getDelta();}
document.querySelector('#start').addEventListener('click',begin);
canvas.addEventListener('click',()=>{if(started&&!paused&&!gameOver&&document.pointerLockElement!==canvas)canvas.requestPointerLock?.();});
document.addEventListener('pointerlockchange',()=>{if(started&&document.pointerLockElement!==canvas&&!gameOver){paused=true;ui.intro.classList.remove('hidden');document.querySelector('.kicker').textContent='PAUSED · BLACKWATER VALLEY';document.querySelector('.title').innerHTML='STAY<br><span>QUIET</span>';document.querySelector('.tagline').textContent='The valley is still listening. Click below to continue.';document.querySelector('#start').textContent='[ CONTINUE ]';}});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas){player.yaw-=e.movementX*.0022;player.pitch=Math.max(-1.35,Math.min(1.35,player.pitch-e.movementY*.0022));}});
document.addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='Escape'&&started&&!gameOver&&document.pointerLockElement===canvas)document.exitPointerLock();if(e.code==='KeyE')interact();if(e.code==='Digit1')useItem(0);if(e.code==='Digit2')useItem(1);if(e.code==='Digit3')useItem(2);});
document.addEventListener('keyup',e=>{keys[e.code]=false;});
document.querySelector('#restart').addEventListener('click',()=>location.reload());
function useItem(slot){if(!started||paused||gameOver)return;player.selected=slot;document.querySelectorAll('.slot').forEach((el,i)=>el.classList.toggle('active',i===slot));if(slot===0){if(player.inventory.water>0){player.inventory.water--;player.water=Math.min(100,player.water+32);showMessage('WATER BOTTLE · THIRST EASED');}else showMessage('NO WATER LEFT');}else if(slot===1){if(player.inventory.flare>0){player.inventory.flare--;externalNoise=1;creature.timer=0;creature.state='stunned';creature.target.copy(player.pos);showMessage('FLARE LIT · IT HATES THE FIRE');}else showMessage('NO FLARES LEFT');}else{if(player.inventory.decoy>0){player.inventory.decoy--;externalNoise=1;creature.target.set(player.pos.x+Math.sin(player.yaw)*12,0,player.pos.z+Math.cos(player.yaw)*12);creature.state='investigate';creature.timer=0;showMessage('NOISEMAKER THROWN · MOVE NOW');}else showMessage('NO NOISEMAKERS LEFT');}updateInventory();}
function updateInventory(){document.querySelector('#water-count').textContent=player.inventory.water;document.querySelector('#flare-count').textContent=player.inventory.flare;document.querySelector('#decoy-count').textContent=player.inventory.decoy;}
function interact(){if(!selectedTarget)return;if(selectedTarget.kind==='fuse'&&!hasFuse){hasFuse=true;fuseObj.available=false;fuseMesh.visible=false;fuseGlow.visible=false;player.inventory.decoy++;updateInventory();setObjective('02 / 02','Reach the relay station','The fuse is in hand. Cross the valley and restore the radio before the light dies.','RELAY STATION →');showMessage('FUSE SECURED · NOISEMAKER ADDED');}else if(selectedTarget.kind==='radio'&&hasFuse&&!relayOn){relayOn=true;radioLamp.material.color.set('#65d58b');fillLight.color.set('#b5e5bb');fillLight.intensity=2;setObjective('COMPLETE','Rescue is on the way','You sent the distress call. Stay on the concrete and keep the creature at bay.','SIGNAL TRANSMITTED');showMessage('DISTRESS CALL SENT · HOLD THE RELAY');setTimeout(()=>finish(true),12500);}else if(selectedTarget.kind==='radio'&&!hasFuse)showMessage('THE GENERATOR IS DEAD · FIND A FUSE');}
function finish(won){if(gameOver)return;gameOver=true;document.exitPointerLock?.();ui.ending.classList.remove('hidden');document.querySelector('#end-kicker').textContent=won?'BLACKWATER VALLEY · 18:06':'BLACKWATER VALLEY · SIGNAL LOST';document.querySelector('#end-title').innerHTML=won?'SIGNAL<br><span>RECEIVED</span>':'THE SAND<br><span>REMEMBERS</span>';document.querySelector('#end-copy').textContent=won?'Rotor noise rolls over the ridge. For the first time, it is not listening to you. You made it out of Blackwater Valley.':'The ground settles. The valley goes quiet again.';}
function doNoise(amount,source=player.pos){externalNoise=Math.max(externalNoise,amount);creature.target.set(source.x,0,source.z);creature.lastNoise=amount;}
const blockers=[{x:-23,z:-7,w:8.6,d:7.6},{x:-3,z:10,w:9.6,d:7.6},{x:10,z:-12,w:7.6,d:6.6},{x:3,z:14,w:7.6,d:6.6},{x:31,z:2,w:8.6,d:7.6}];
function collide(x,z){for(const b of blockers){const dx=x-b.x,dz=z-b.z;if(Math.abs(dx)<b.w/2+.38&&Math.abs(dz)<b.d/2+.38){if(Math.abs(dx/b.w)<Math.abs(dz/b.d))x=b.x+Math.sign(dx||1)*(b.w/2+.4);else z=b.z+Math.sign(dz||1)*(b.d/2+.4);}}return{x,z};}
function updatePlayer(dt){const forward=Number(keys.KeyW||keys.ArrowUp)-Number(keys.KeyS||keys.ArrowDown),side=Number(keys.KeyD||keys.ArrowRight)-Number(keys.KeyA||keys.ArrowLeft);const moving=forward!==0||side!==0;const sprint=moving&&(keys.ShiftLeft||keys.ShiftRight)&&player.stamina>2;const speed=sprint?7.2:4.15;let dx=0,dz=0;if(moving){const len=Math.hypot(forward,side)||1,f=forward/len,s=side/len;dx=(-Math.sin(player.yaw)*f+Math.cos(player.yaw)*s)*speed*dt;dz=(-Math.cos(player.yaw)*f-Math.sin(player.yaw)*s)*speed*dt;const next=collide(player.pos.x+dx,player.pos.z+dz);dx=next.x-player.pos.x;dz=next.z-player.pos.z;player.pos.x=THREE.MathUtils.clamp(next.x,-56,56);player.pos.z=THREE.MathUtils.clamp(next.z,-47,47);}
if(keys.Space&&player.grounded){player.velY=6.7;player.grounded=false;doNoise(isSafe(player.pos.x,player.pos.z)?.13:.55);}
player.velY-=18*dt;player.pos.y+=player.velY*dt;if(player.pos.y<=0){if(!player.grounded&&player.velY< -3)doNoise(isSafe(player.pos.x,player.pos.z)?.12:.5);player.pos.y=0;player.velY=0;player.grounded=true;}
if(moving&&player.grounded){player.stepClock-=dt;if(player.stepClock<=0){const safe=isSafe(player.pos.x,player.pos.z);const intensity=safe?.08:(sprint?.95:.48);doNoise(intensity);player.stepClock=sprint?.33:.52;}}else player.stepClock=0;
player.stamina=THREE.MathUtils.clamp(player.stamina+(sprint?-28:18)*dt,0,100);player.water=Math.max(0,player.water-dt*.17);if(player.water<18)player.health=Math.max(0,player.health-dt*.3);if(player.health<=0)finish(false);
const bob=moving&&player.grounded?Math.sin(elapsed*(sprint?15:10))*(sprint?.07:.035):0;camera.position.set(player.pos.x,1.66+player.pos.y+bob,player.pos.z);camera.rotation.set(player.pitch,player.yaw,0,'YXZ');camera.position.y+=Math.sin(elapsed*1.6)*.012;}
function updateCreature(dt){creature.attackCooldown=Math.max(0,creature.attackCooldown-dt);if(externalNoise>.02){creature.target.set(player.pos.x,0,player.pos.z);creature.lastNoise=Math.max(creature.lastNoise,externalNoise);}
if(creature.state==='stunned'){creature.timer+=dt;if(creature.timer>4){creature.state='investigate';creature.timer=0;}}
else if(creature.state==='idle'){creature.timer+=dt;if(creature.timer>8){creature.target.set(player.pos.x+(Math.random()-.5)*18,0,player.pos.z+(Math.random()-.5)*18);creature.state='wander';creature.timer=0;}if(player.noise>.25){creature.state='investigate';creature.target.set(player.pos.x,0,player.pos.z);creature.timer=0;}}
else if(creature.state==='wander'){if(player.noise>.25){creature.state='investigate';creature.target.set(player.pos.x,0,player.pos.z);}else if(creature.pos.distanceTo(creature.target)<2||creature.timer>10){creature.state='idle';creature.timer=0;}}
else if(creature.state==='investigate'||creature.state==='hunt'){const active=player.noise>.36&&!isSafe(player.pos.x,player.pos.z);if(active){creature.target.set(player.pos.x,0,player.pos.z);creature.state='hunt';}else if(creature.pos.distanceTo(creature.target)<2.5){creature.state='idle';creature.timer=0;}const distance=creature.pos.distanceTo(new THREE.Vector3(player.pos.x,0,player.pos.z));if(distance<5.4&&creature.attackCooldown<=0&&!isSafe(player.pos.x,player.pos.z)){creature.state='warning';creature.timer=0;creature.target.set(player.pos.x,0,player.pos.z);}}
else if(creature.state==='warning'){creature.timer+=dt;creature.target.set(player.pos.x,0,player.pos.z);if(isSafe(player.pos.x,player.pos.z)){creature.state='investigate';creature.timer=0;}else if(creature.timer>1.8){creature.state='attack';creature.timer=0;player.health=Math.max(0,player.health-35);creature.attackCooldown=8;doNoise(.8);showMessage('IT BROKE THROUGH THE SAND · KEEP MOVING',2.4);if(player.health<=0)finish(false);}}
else if(creature.state==='attack'){creature.timer+=dt;if(creature.timer>1.5){creature.state='stunned';creature.timer=0;creature.pos.set(creature.target.x+8,0,creature.target.z+7);}}
const movingState=['investigate','hunt','wander'].includes(creature.state);if(movingState){const dir=creature.target.clone().sub(creature.pos);dir.y=0;if(dir.length()>1.4)creature.pos.add(dir.normalize().multiplyScalar(dt*(creature.state==='hunt'?5.8:3.35)));}
const visible=creature.state==='warning'||creature.state==='attack';const rise=visible?(creature.state==='warning'?Math.min(1,creature.timer/.7):1):creature.state==='stunned'?.5:0;worm.position.set(creature.pos.x,0,creature.pos.z);for(let i=0;i<bodyParts.length;i++){const depth=visible?(-.15-i*.48):(-3.1-i*.4);bodyParts[i].position.y=THREE.MathUtils.lerp(bodyParts[i].position.y,depth+rise*1.3,dt*5);}mouth.position.y=-1.6+rise*1.25;for(let i=0;i<tendrils.length;i++){const a=i*Math.PI/2+elapsed*1.8;tendrils[i].position.set(Math.cos(a)*.55,-1.7+rise*1.2,Math.sin(a)*.55);tendrils[i].rotation.set(Math.sin(a)*-.48,0,Math.cos(a)*.48);}
warningRing.visible=creature.state==='warning'||creature.state==='attack';warningRing.position.set(creature.target.x,.05,creature.target.z);warningRing.scale.setScalar(creature.state==='warning'?1+Math.sin(elapsed*12)*.18:1.55);warningRing.material.opacity=creature.state==='warning'?.6:.85;worm.visible=visible||creature.state==='stunned';dustGroup.visible=visible;dustGroup.position.set(creature.target.x,.18,creature.target.z);dustGroup.children.forEach(p=>{p.position.set(Math.cos(elapsed*p.userData.speed+p.userData.angle)*p.userData.r,.2+Math.abs(Math.sin(elapsed*2+p.userData.angle))*.8,Math.sin(elapsed*p.userData.speed+p.userData.angle)*p.userData.r);});ui.danger.classList.toggle('active',creature.state==='warning'||creature.state==='attack');}
function updateTargets(){selectedTarget=null;let best=3.5;for(const item of interactables){if(!item.available)continue;const dist=item.position.distanceTo(new THREE.Vector3(player.pos.x,1.2+player.pos.y,player.pos.z));if(dist<best){best=dist;selectedTarget=item;}}if(selectedTarget){ui.prompt.textContent=selectedTarget.label;ui.prompt.classList.add('show');}else ui.prompt.classList.remove('show');}
function updateHud(){const val=Math.round(player.noise*100);ui.noise.style.width=`${val}%`;ui.noise.style.background=val>65?'#d64938':val>35?'#d39b45':'#75a58a';ui.noiseText.textContent=`${val}%`;ui.health.style.width=`${player.health}%`;ui.healthText.textContent=Math.ceil(player.health);ui.water.style.width=`${player.water}%`;ui.waterText.textContent=Math.ceil(player.water);ui.stamina.style.width=`${player.stamina}%`;ui.staminaText.textContent=Math.ceil(player.stamina);document.querySelector('#location').textContent=`BLACKWATER VALLEY · ${new Date(0,0,0,16,42+Math.floor(elapsed/12)).toTimeString().slice(0,5)}`;}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);if(started&&!paused&&!gameOver){elapsed+=dt;updatePlayer(dt);player.noise=Math.max(0,player.noise-dt*.8);player.noise=Math.max(player.noise,externalNoise);externalNoise=Math.max(0,externalNoise-dt*.34);updateCreature(dt);updateTargets();if(messageTimer>0){messageTimer-=dt;if(messageTimer<=0)ui.message.classList.remove('show');}if(relayOn)fillLight.intensity=2+Math.sin(elapsed*4)*.3;const dusk=Math.min(1,elapsed/240);sun.intensity=2.8-dusk*1.25;scene.fog.color.setRGB(.74-dusk*.3,.5-dusk*.26,.32-dusk*.12);scene.background.copy(scene.fog.color);updateHud();}renderer.render(scene,camera);}
window.addEventListener('resize',()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);});
updateInventory();animate();

