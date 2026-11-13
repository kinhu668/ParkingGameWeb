(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=[`chase_near`,`chase_far`,`hood`,`cockpit`,`top`],t=`parkinggame.cameraView`,n=`view`;function r(t){return e.includes(t)}function i(e){return e===`chase_near`||e===`chase_far`}function a(t){return e[(e.indexOf(t)+1)%e.length]??`chase_near`}function o(e){let t=new URLSearchParams(e).get(n);return t!==null&&r(t)?t:void 0}function s(e){try{let t=e?.getItem(`parkinggame.cameraView`)??null;return t!==null&&r(t)?t:void 0}catch{return}}function c(e,n){try{e?.setItem(t,n)}catch{}}function l(e,t){return o(e)??s(t)??`chase_near`}var u=[`throttle`,`reverse`,`steerLeft`,`steerRight`,`brake`,`handbrake`,`gearDrive`,`gearReverse`,`restart`,`toggleCamera`,`pause`],d={throttle:[`KeyW`,`ArrowUp`],reverse:[`KeyS`,`ArrowDown`],steerLeft:[`KeyA`,`ArrowLeft`],steerRight:[`KeyD`,`ArrowRight`],brake:[`Comma`],handbrake:[`Slash`,`Space`],gearDrive:[`KeyQ`],gearReverse:[`KeyR`],restart:[`Backspace`,`KeyT`],toggleCamera:[`KeyV`],pause:[`Escape`]},f=`parkinggame.controls.v1`,p=[`ControlLeft`,`ControlRight`,`AltLeft`,`AltRight`,`MetaLeft`,`MetaRight`,`OSLeft`,`OSRight`,`Tab`,`ContextMenu`,`Unidentified`],m=/^[A-Za-z][A-Za-z0-9]{0,31}$/,h=/^F\d{1,2}$/;function g(e){return m.test(e)&&!h.test(e)&&!p.includes(e)}function _(e,t){return u.find(n=>e[n].includes(t))}function v(e,t){return u.every(n=>e[n].length===t[n].length&&e[n].every((e,r)=>e===t[n][r]))}function y(e,t,n,r){let i=e[t];if(!g(r)||!Number.isInteger(n)||n<0||n>i.length||n>=2)return{kind:`unsupported`};if(i[n]===r)return{kind:`ok`,bindings:e};let a=_(e,r);if(a!==void 0)return{kind:`conflict`,action:a};let o=[...i];return o[n]=r,{kind:`ok`,bindings:{...e,[t]:o}}}function b(e,t){let n=e[t];return n.length<=1?e:{...e,[t]:n.slice(0,-1)}}function x(e){return typeof e==`object`&&!!e&&!Array.isArray(e)}function S(e){if(!x(e)||e.version!==1||!x(e.bindings))return;let t=new Set,n={};for(let r of u){let i=e.bindings[r];if(!Array.isArray(i)||i.length<1||i.length>2)return;let a=[];for(let e of i){if(typeof e!=`string`||!g(e)||t.has(e))return;t.add(e),a.push(e)}n[r]=a}return n}function C(e){try{let t=e?.getItem(`parkinggame.controls.v1`)??null;if(t===null)return d;let n;try{n=S(JSON.parse(t))}catch{n=void 0}return n===void 0?(e?.removeItem(f),d):n}catch{return d}}function w(e,t){try{if(v(t,d)){e?.removeItem(f);return}e?.setItem(f,JSON.stringify({version:1,bindings:t}))}catch{}}var T={ArrowUp:`↑`,ArrowDown:`↓`,ArrowLeft:`←`,ArrowRight:`→`,Escape:`Esc`,Comma:`,`,Period:`.`,Slash:`/`,Semicolon:`;`,Quote:`'`,BracketLeft:`[`,BracketRight:`]`,Backslash:`\\`,Minus:`-`,Equal:`=`,Backquote:"`",ShiftLeft:`L Shift`,ShiftRight:`R Shift`,CapsLock:`Caps`,PageUp:`PgUp`,PageDown:`PgDn`,Delete:`Del`,Insert:`Ins`};function E(e){if(e===`Space`)return{key:`hud.keySpace`};let t=T[e];if(t!==void 0)return{text:t};let n=/^Key([A-Z])$/.exec(e)?.[1];if(n!==void 0)return{text:n};let r=/^Digit(\d)$/.exec(e)?.[1];if(r!==void 0)return{text:r};let i=/^Numpad(.+)$/.exec(e)?.[1];return i===void 0?{text:e}:{text:`Num ${i}`}}var D=1/60,O=.25,k=20261110,A={maxSpeedMph:.5,holdSeconds:1,defaultAngleToleranceDeg:8},j={cooldownSeconds:.5,restitution:.3,maxBounceSpeedMph:3},ee={threeStarMaxAngleDeg:3};function M(e,t){let n=e+Math.min(Math.max(t,0),O),r=0;for(;n>=D;)n-=D,r+=1;return{steps:r,accumulatorSeconds:n,alpha:n/D}}var N={"hud.speed":`Speed`,"hud.speedUnit":`mph`,"hud.controls":`Controls`,"hud.controlDrive":`Throttle / Reverse`,"hud.controlSteer":`Steer`,"hud.controlHandbrake":`Handbrake`,"hud.controlBrake":`Brake`,"hud.controlGears":`Shift D / R`,"hud.controlRestart":`Restart`,"hud.controlCamera":`Change camera`,"hud.controlPause":`Pause`,"hud.controlsEdit":`Customize keys`,"hud.keySpace":`Space`,"hud.language":`Switch language`,"hud.languageTarget":`繁體中文`,"hud.time":`Time left`,"hud.collisions":`Hits`,"hud.gear":`Gear`,"hud.gearForward":`Drive`,"hud.gearReverse":`Reverse`,"hud.gearManual":`Manual shift`,"hud.angle":`Angle off`,"camera.chase_near":`Chase Cam (Near)`,"camera.chase_far":`Chase Cam (Far)`,"camera.hood":`Hood Cam`,"camera.cockpit":`Cockpit`,"camera.top":`Top-Down`,"status.parked":`Parked!`,"status.restartHint":`Press {key} to restart`,"status.failed":`Failed`,"status.failTimeout":`Out of time`,"status.failCollisions":`Too many collisions`,"result.time":`Time`,"result.collisions":`Hits`,"result.angle":`Angle off`,"result.next":`Next level`,"result.retry":`Retry`,"result.levelSelect":`Level select`,"pause.title":`Paused`,"pause.resume":`Resume`,"pause.hint":`Press {key} to resume`,"pause.controls":`Key bindings`,"controls.title":`Key Bindings`,"controls.hint":`Click a key, then press the new key. Esc cancels. Use + to add a second key.`,"controls.action.throttle":`Throttle`,"controls.action.reverse":`Reverse throttle`,"controls.action.steerLeft":`Steer left`,"controls.action.steerRight":`Steer right`,"controls.action.brake":`Brake (foot)`,"controls.action.handbrake":`Handbrake`,"controls.action.gearDrive":`Shift to D`,"controls.action.gearReverse":`Shift to R`,"controls.action.restart":`Restart`,"controls.action.toggleCamera":`Change camera`,"controls.action.pause":`Pause`,"controls.listening":`Press a key…`,"controls.addKey":`Add a second key`,"controls.rebind":`Click to change this key`,"controls.clear":`Remove the second key`,"controls.bound":`{action} is now {key}.`,"controls.conflict":`{key} is already used by "{action}". Change that action first.`,"controls.unsupported":`That key can't be used.`,"controls.resetDone":`Default keys restored.`,"controls.gearNote":`Shift to D defaults to Q so that D keeps steering right — rebind it if you like. Until you shift, W drives forward and S reverses. After you shift, the car is in manual mode: D only drives forward and R only backward (the opposite throttle key just brakes). Restarting returns to automatic in D.`,"controls.reset":`Restore defaults`,"controls.done":`Done`,"select.title":`Select a Level`,"select.world":`World 1`,"select.bestTime":`Best time`,"select.locked":`Earn a star on the previous level to unlock`,"select.comingSoon":`Coming soon`,"level.prototype.name":`Prototype Lot`,"level.w1_l01.name":`First Spot`,"level.w1_l02.name":`Turn In`,"level.w1_l03.name":`Between Neighbors`,"level.w1_l04.name":`Cart Return`,"level.w1_l05.name":`Back Straight`,"level.w1_l06.name":`Back It In`,"level.w1_l07.name":`Storm Run`,"level.w1_l08.name":`Curbside`,"level.w1_l09.name":`Night Curb`,"level.w1_l10.name":`Back Alley`,"level.unknown":`Unknown level. Available:`,"show.unknown":`Unknown showcase object. Available:`,"bench.running":`Benchmark running…`,"bench.avgFps":`Average FPS`,"bench.low1":`1% low FPS`,"bench.drawCalls":`Draw calls (avg)`,"bench.drawCallsMax":`Draw calls (max)`,"assist.bird":`Bird view`,"assist.rear":`Rear camera`,"assist.mirrorLeft":`Left mirror`,"assist.mirrorRight":`Right mirror`,"assist.warning":`Check surroundings for safety.`,"touch.wheel":`Steering wheel`,"touch.gas":`Gas`,"touch.brake":`Brake`,"touch.gearDrive":`Shift to D`,"touch.gearReverse":`Shift to R`,"touch.pause":`Pause`,"touch.restart":`Restart`,"touch.camera":`Camera`,"touch.rebindPrompt":`{action}: press the new key…`,"touch.rebindCancel":` (Esc cancels)`},P={"hud.speed":`車速`,"hud.speedUnit":`mph`,"hud.controls":`操作`,"hud.controlDrive":`油門／倒車`,"hud.controlSteer":`轉向`,"hud.controlHandbrake":`手煞車`,"hud.controlBrake":`剎車`,"hud.controlGears":`掛 D／R 檔`,"hud.controlRestart":`重來`,"hud.controlCamera":`切換鏡頭`,"hud.controlPause":`暫停`,"hud.controlsEdit":`自訂按鍵`,"hud.keySpace":`空白鍵`,"hud.language":`切換語言`,"hud.languageTarget":`English`,"hud.time":`剩餘時間`,"hud.collisions":`碰撞`,"hud.gear":`檔位`,"hud.gearForward":`前進`,"hud.gearReverse":`倒車`,"hud.gearManual":`手排`,"hud.angle":`角度誤差`,"camera.chase_near":`近距離跟車`,"camera.chase_far":`遠距離跟車`,"camera.hood":`引擎蓋`,"camera.cockpit":`駕駛座`,"camera.top":`俯視`,"status.parked":`停車成功！`,"status.restartHint":`按 {key} 重來`,"status.failed":`停車失敗`,"status.failTimeout":`時間到了`,"status.failCollisions":`碰撞太多次`,"result.time":`時間`,"result.collisions":`碰撞`,"result.angle":`角度誤差`,"result.next":`下一關`,"result.retry":`重來`,"result.levelSelect":`關卡選擇`,"pause.title":`暫停`,"pause.resume":`繼續`,"pause.hint":`按 {key} 繼續`,"pause.controls":`按鍵設定`,"controls.title":`按鍵設定`,"controls.hint":`點一下按鍵，再按想換成的鍵；按 Esc 取消。按 ＋ 可以多加一個備用鍵。`,"controls.action.throttle":`油門`,"controls.action.reverse":`倒車油門`,"controls.action.steerLeft":`左轉`,"controls.action.steerRight":`右轉`,"controls.action.brake":`剎車（腳剎）`,"controls.action.handbrake":`手煞車`,"controls.action.gearDrive":`掛 D 檔`,"controls.action.gearReverse":`掛 R 檔`,"controls.action.restart":`重來`,"controls.action.toggleCamera":`切換鏡頭`,"controls.action.pause":`暫停`,"controls.listening":`請按鍵…`,"controls.addKey":`多加一個備用鍵`,"controls.rebind":`點一下改這個鍵`,"controls.clear":`拿掉備用鍵`,"controls.bound":`「{action}」已改成 {key}。`,"controls.conflict":`{key} 已經是「{action}」的按鍵，請先把那個動作改成別的鍵。`,"controls.unsupported":`這個鍵不能用。`,"controls.resetDone":`已恢復預設按鍵。`,"controls.gearNote":`掛 D 檔預設是 Q（D 留給右轉），可以自行改綁。沒按過掛檔鍵時，W 前進、S 倒車。按了掛檔鍵就進入手排：D 檔只能前進、R 檔只能後退（反方向的油門鍵只會剎車）；重來後回到自排 D 檔。`,"controls.reset":`恢復預設`,"controls.done":`完成`,"select.title":`選擇關卡`,"select.world":`第 1 世界`,"select.bestTime":`最佳時間`,"select.locked":`前一關拿到 1 顆星後解鎖`,"select.comingSoon":`即將推出`,"level.prototype.name":`原型測試場`,"level.w1_l01.name":`第一個車位`,"level.w1_l02.name":`轉彎入位`,"level.w1_l03.name":`左鄰右舍`,"level.w1_l04.name":`推車回收區`,"level.w1_l05.name":`直線倒車`,"level.w1_l06.name":`倒車入庫`,"level.w1_l07.name":`雷雨採買`,"level.w1_l08.name":`路邊停車`,"level.w1_l09.name":`夜間路邊`,"level.w1_l10.name":`後巷卸貨`,"level.unknown":`找不到這個關卡，可用的有：`,"show.unknown":`找不到這個展示物件，可用的有：`,"bench.running":`效能測試中…`,"bench.avgFps":`平均 FPS`,"bench.low1":`最低 1% FPS`,"bench.drawCalls":`繪製呼叫數（平均）`,"bench.drawCallsMax":`繪製呼叫數（最大）`,"assist.bird":`鳥瞰`,"assist.rear":`倒車鏡頭`,"assist.mirrorLeft":`左後視鏡`,"assist.mirrorRight":`右後視鏡`,"assist.warning":`請注意周圍安全。`,"touch.wheel":`方向盤`,"touch.gas":`油門`,"touch.brake":`剎車`,"touch.gearDrive":`掛 D 檔`,"touch.gearReverse":`掛 R 檔`,"touch.pause":`暫停`,"touch.restart":`重來`,"touch.camera":`鏡頭`,"touch.rebindPrompt":`「{action}」：請按新的鍵…`,"touch.rebindCancel":`（Esc 取消）`},te=[`zh-TW`,`en`],ne={"zh-TW":P,en:N},re=`lang`,ie=`zh`,ae=`en`,oe=[];function se(e){return te.includes(e)}function ce(e){return Object.hasOwn(P,e)}function le(e,t,n){let r=new URLSearchParams(e).get(re);return r!==null&&se(r)?r:n===void 0?t.toLowerCase().startsWith(ie)?`zh-TW`:`en`:n}function ue(){return ae}function de(e){if(e!==ae){ae=e;for(let e of oe)e()}}function fe(e){oe.push(e)}function F(e){return ne[ae][e]}var pe=[`ArrowUp`,`ArrowDown`,`ArrowLeft`,`ArrowRight`,`Space`,`Slash`,`Quote`,`Backspace`];function me(e,t){return e.some(e=>t.has(e))}function he(e,t){return e===t?0:e?1:-1}function ge(e){return pe.includes(e)}function _e(e,t=d){return{throttle:he(me(t.throttle,e),me(t.reverse,e)),steer:he(me(t.steerRight,e),me(t.steerLeft,e)),handbrake:me(t.handbrake,e),brake:me(t.brake,e)}}function ve(e,t=()=>d){let n=new Set,r=!1,i=!1,a=!1,o=null,s;return e.addEventListener(`keydown`,e=>{if(!(e.ctrlKey||e.metaKey||e.altKey)){if(s!==void 0){if(e.preventDefault(),!e.repeat){let t=s;s=void 0,t(e.code)}}else{if(ge(e.code)&&e.preventDefault(),!e.repeat){let n=t();n.restart.includes(e.code)&&(r=!0,o=null),n.toggleCamera.includes(e.code)&&(i=!0),n.pause.includes(e.code)&&(a=!0),n.gearDrive.includes(e.code)&&(o=`forward`),n.gearReverse.includes(e.code)&&(o=`reverse`)}n.add(e.code)}}}),e.addEventListener(`keyup`,e=>{n.delete(e.code)}),e.addEventListener(`blur`,()=>{n.clear(),r=!1,i=!1,a=!1,o=null}),{driveInput:()=>_e(n,t()),consumeRestart:()=>{let e=r;return r=!1,e},consumeToggleCamera:()=>{let e=i;return i=!1,e},consumePause:()=>{let e=a;return a=!1,e},consumeShift:()=>{let e=o;return o=null,e},captureNextKey:e=>(s=e,()=>{s===e&&(s=void 0)})}}function ye(e){return e!==`off`}function be(e){return!e}var xe=2*Math.PI/3,Se=.18,I=.15;function Ce(e){let t=e;for(;t>Math.PI;)t-=2*Math.PI;for(;t<=-Math.PI;)t+=2*Math.PI;return t}function L(e,t,n,r){let i=r*I;if(Math.hypot(t.dx,t.dy)<i||Math.hypot(n.dx,n.dy)<i)return e;let a=Ce(Math.atan2(n.dy,n.dx)-Math.atan2(t.dy,t.dx));return Math.min(Math.max(e+a,-xe),xe)}function we(e,t){let n=xe/Se*Math.max(t,0);return Math.abs(e)<=n?0:e-Math.sign(e)*n}function R(e){return Math.min(Math.max(e/xe,-1),1)}var Te={wheelAngleRad:0,gas:!1,brake:!1};function z(e,t){let n=t.manual&&t.gear===`reverse`?-1:1;return{throttle:e.gas?n:0,steer:R(e.wheelAngleRad),handbrake:!1,brake:e.brake}}function B(e,t){return{throttle:e.throttle===0?t.throttle:e.throttle,steer:Math.min(Math.max(e.steer+t.steer,-1),1),handbrake:e.handbrake||t.handbrake,brake:(e.brake??!1)||(t.brake??!1)}}var Ee=.3048,De=.44704,Oe=180,ke=1e3;function V(e){return e*Ee}function Ae(e){return e/Ee}function je(e){return e*De}function Me(e){return e/De}function Ne(e){return e*De}function H(e){return e*Math.PI/Oe}function Pe(e){return e*Oe/Math.PI}function Fe(e){return e/ke}var Ie=Math.PI,Le=2*Math.PI;function Re(e){return{x:Math.sin(e),z:-Math.cos(e)}}function ze(e){return{x:Math.cos(e),z:Math.sin(e)}}function Be(e){let t=e%Le;if(t>0)return t;if(t===0)return 0;let n=t+Le;return n<Le?n:0}function Ve(e,t){let n=((t-e)%Le+Le)%Le;return n>Ie?n-Le:n}function He(e){return-e}var Ue={maxSpeedMph:18,maxReverseSpeedMph:9,accelerationMphPerS:6,brakeMphPerS:18,coastDecelMphPerS:3,handbrakeMphPerS:30,maxSteerDeg:35,steerRateDegPerS:90,steerReturnRateDegPerS:120,wheelbaseFt:9,lengthFt:15,widthFt:6,heightFt:4.6},U={maxSpeedMps:je(Ue.maxSpeedMph),maxReverseSpeedMps:je(Ue.maxReverseSpeedMph),accelerationMps2:Ne(Ue.accelerationMphPerS),brakeMps2:Ne(Ue.brakeMphPerS),coastDecelMps2:Ne(Ue.coastDecelMphPerS),handbrakeMps2:Ne(Ue.handbrakeMphPerS),maxSteerRad:H(Ue.maxSteerDeg),steerRateRadPerS:H(Ue.steerRateDegPerS),steerReturnRateRadPerS:H(Ue.steerReturnRateDegPerS),wheelbaseM:V(Ue.wheelbaseFt),lengthM:V(Ue.lengthFt),widthM:V(Ue.widthFt),heightM:V(Ue.heightFt)},We=1e-9,Ge=U.widthM/2,Ke=U.lengthM/2;function qe(e){return{x:V(e.centerXFt),z:V(e.centerZFt),halfWidthM:V(e.widthFt)/2,halfLengthM:V(e.lengthFt)/2,headingRad:H(e.headingDeg)}}function Je(e){return{x:e.x,z:e.z,halfWidthM:Ge,halfLengthM:Ke,headingRad:e.headingRad}}function Ye(e){return Math.hypot(e.halfWidthM,e.halfLengthM)}function Xe(e,t){let n=Ye(e)+Ye(t),r=t.x-e.x,i=t.z-e.z;return r*r+i*i<=n*n}function Ze(e,t,n,r){return e.halfWidthM*Math.abs(t.x*r.x+t.z*r.z)+e.halfLengthM*Math.abs(n.x*r.x+n.z*r.z)}function Qe(e,t){let n=ze(e.headingRad),r=Re(e.headingRad),i=ze(t.headingRad),a=Re(t.headingRad),o=t.x-e.x,s=t.z-e.z;for(let c of[n,r,i,a])if(Math.abs(o*c.x+s*c.z)>=Ze(e,n,r,c)+Ze(t,i,a,c)-We)return!1;return!0}function $e(e){let t=(e.minXFt+e.maxXFt)/2,n=(e.minZFt+e.maxZFt)/2,r=e.maxXFt-e.minXFt+8,i=e.maxZFt-e.minZFt+8,a=(e,t,n,r)=>({centerXFt:e,centerZFt:t,widthFt:n,lengthFt:r,headingDeg:0});return[a(e.minXFt-2,n,4,i),a(e.maxXFt+2,n,4,i),a(t,e.minZFt-2,r,4),a(t,e.maxZFt+2,r,4)]}var et=[];function tt(e,t){if(t.length===0)return et;let n=Je(e),r;return t.forEach((e,t)=>{Xe(n,e)&&Qe(n,e)&&(r??=[],r.push(t))}),r??et}var nt={parked_car:{widthFt:6,lengthFt:15},cone:{widthFt:1.2,lengthFt:1.2},shopping_cart:{widthFt:2,lengthFt:3.2},cart_corral:{widthFt:6,lengthFt:16},trash_bin:{widthFt:2.5,lengthFt:2.5},dumpster:{widthFt:6,lengthFt:3.5},mailbox:{widthFt:1.8,lengthFt:1.8},pallet:{widthFt:3.4,lengthFt:4},pallet_stack:{widthFt:3.4,lengthFt:4},bollard:{widthFt:.8,lengthFt:.8},barrier:{widthFt:6,lengthFt:1.5},planter:{widthFt:4,lengthFt:4},wall:null},rt=Object.keys(nt);function it(e){return rt.includes(e)}function at(e){return nt[e]}var ot=U.wheelbaseM/2,st=U.lengthM/2,ct=U.widthM/2;function lt(e,t,n){let r=t-e;return Math.abs(r)<=n?t:e+Math.sign(r)*n}function ut(e,t,n){return t===0?lt(e,0,U.steerReturnRateRadPerS*n):lt(e,Math.min(Math.max(t,-1),1)*U.maxSteerRad,U.steerRateRadPerS*n)}function dt(e,t,n){return t.handbrake?lt(e,0,U.handbrakeMps2*n):t.brake===!0?lt(e,0,U.brakeMps2*n):t.throttle===0?lt(e,0,U.coastDecelMps2*n):e*t.throttle<0?lt(e,0,U.brakeMps2*n):lt(e,t.throttle>0?U.maxSpeedMps:-U.maxReverseSpeedMps,U.accelerationMps2*n)}function ft(e,t,n){let r=ut(e.steerRad,t.steer,n),i=dt(e.speedMps,t,n),a=i/U.wheelbaseM*Math.tan(r)*n,o=e.headingRad+a,s=i*n,c=Re(e.headingRad+a/2),l=Re(e.headingRad),u=Re(o);return{x:e.x+c.x*s+(u.x-l.x)*ot,z:e.z+c.z*s+(u.z-l.z)*ot,headingRad:Be(o),speedMps:i,steerRad:r}}function pt(e){let t=Re(e.headingRad),n=ze(e.headingRad),r=(r,i)=>({x:e.x+n.x*r+t.x*i,z:e.z+n.z*r+t.z*i});return[r(-ct,st),r(ct,st),r(ct,-st),r(-ct,-st)]}function mt(e,t,n){return{x:e.x+(t.x-e.x)*n,z:e.z+(t.z-e.z)*n,headingRad:Be(e.headingRad+Ve(e.headingRad,t.headingRad)*n),steerRad:e.steerRad+(t.steerRad-e.steerRad)*n}}var ht=1e-9,gt=1e-9,_t=je(A.maxSpeedMph),vt=Math.round(A.holdSeconds*60);function yt(e){return{x:V(e.centerXFt),z:V(e.centerZFt),widthM:V(e.widthFt),lengthM:V(e.lengthFt),headingRad:H(e.headingDeg),angleToleranceRad:H(e.angleToleranceDeg??A.defaultAngleToleranceDeg)}}function bt(e,t){return Math.abs(Ve(e.headingRad,t.headingRad))}function xt(e,t){let n=ze(t.headingRad),r=Re(t.headingRad),i=t.widthM/2+ht,a=t.lengthM/2+ht;return pt(e).every(e=>{let o=e.x-t.x,s=e.z-t.z,c=o*n.x+s*n.z,l=o*r.x+s*r.z;return Math.abs(c)<=i&&Math.abs(l)<=a})}function St(e,t){return bt(e,t)<=t.angleToleranceRad+gt}function Ct(e){return Math.abs(e.speedMps)<_t}function wt(e,t){return Ct(e)&&St(e,t)&&xt(e,t)}function Tt(e,t,n){return wt(t,n)?e+1:0}function Et(e){return e>=vt}var Dt={timeLimitSteps:1/0,targetSteps:1/0,maxCollisions:1/0},Ot=H(ee.threeStarMaxAngleDeg);function kt(e){return Math.round(e*60)}function At(e){return e/60}function jt(e,t,n){return{timeLimitSteps:kt(e),targetSteps:kt(t),maxCollisions:n}}function Mt(e){return e.timeSteps>e.targetSteps?1:e.collisions===0&&Math.abs(e.angleErrorRad)<Ot?3:2}function Nt(e){return e.collisions>e.rules.maxCollisions?`collisions`:e.elapsedSteps>e.rules.timeLimitSteps?`timeout`:null}var Pt=[`open_lot`,`warehouse_club`,`post_office`,`city_street`,`narrow_alley`],Ft=[`clear`,`dusk`,`rain`,`wet`,`storm`,`night`],It=`clear`,Lt=[`sedan`],Rt=5,zt=/^[a-z0-9_]+$/,Bt=360,Vt=180,Ht=class extends Error{constructor(e,t,n){super(t===``?`${e}: ${n}`:`${e}: ${t} ${n}`),this.name=`LevelFormatError`}};function Ut(e,t){throw new Ht(e.source,e.path,t)}function Wt(e,t){return typeof t==`number`?{source:e.source,path:`${e.path}[${t}]`}:{source:e.source,path:e.path===``?t:`${e.path}.${t}`}}function Gt(e){return e===void 0?`沒有這個欄位`:`拿到 ${JSON.stringify(e)}`}function Kt(e,t){if(typeof e!=`object`||!e||Array.isArray(e))return Ut(t,`必須是物件，${Gt(e)}`);let n={...e},r=new Set,i=e=>(r.add(e),Object.hasOwn(n,e)?{value:n[e],at:Wt(t,e)}:void 0);return{optional:i,required:e=>i(e)??Ut(Wt(t,e),`是必填欄位`),done:()=>{let e=Object.keys(n).filter(e=>!r.has(e));e.length>0&&Ut(t,`有不認得的欄位：${e.join(`、`)}`)}}}function qt(e,t){return typeof e!=`number`||!Number.isFinite(e)?Ut(t,`必須是有限的數字，${Gt(e)}`):e}function Jt(e,t){let n=qt(e,t);return n>0?n:Ut(t,`必須大於 0，${Gt(e)}`)}function Yt(e,t,n,r){let i=qt(e,t);return!Number.isInteger(i)||i<n||i>r?Ut(t,`必須是 ${Number.isFinite(r)?`${n}–${r}`:`≥ ${n}`} 的整數，${Gt(e)}`):i}function Xt(e,t){return typeof e!=`string`||e.trim()===``?Ut(t,`必須是非空字串，${Gt(e)}`):e}function Zt(e,t,n){return n.find(t=>t===e)??Ut(t,`必須是 ${n.join(`、`)} 其中之一，${Gt(e)}`)}function Qt(e,t){let n=qt(e,t);return n<0||n>=Bt?Ut(t,`必須在 0（含）到 360（不含）之間，${Gt(e)}`):n}function $t(e,t,n){return!Array.isArray(e)||e.length!==n?Ut(t,`必須是 ${n} 個數字的陣列，${Gt(e)}`):e.map((e,n)=>qt(e,Wt(t,n)))}function en(e,t){let[n=0,r=0,i=0]=$t(e,t,3);return r!==0&&Ut(Wt(t,1),`（y）本階段必須是 0，${Gt(r)}`),{xFt:n,zFt:i}}function tn(e,t){let[n=0,r=0]=$t(e,t,2);return{xFt:n,zFt:r}}function nn(e,t){let[n=0,r=0]=$t(e,t,2);return Jt(n,Wt(t,0)),Jt(r,Wt(t,1)),{widthFt:n,lengthFt:r}}function rn(e,t){let n=Kt(e,t),r=n.required(`pos`),i=n.required(`heading`);return n.done(),{...en(r.value,r.at),headingDeg:Qt(i.value,i.at)}}function an(e,t,n){let r=Kt(e,t),i=r.required(`pos`),a=r.required(`heading`),o=r.required(`size`);r.done();let s=en(i.value,i.at);return{centerXFt:s.xFt,centerZFt:s.zFt,...nn(o.value,o.at),headingDeg:Qt(a.value,a.at),angleToleranceDeg:n}}function on(e,t){let n=Kt(e,t),r=n.required(`min`),i=n.required(`max`);n.done();let a=tn(r.value,r.at),o=tn(i.value,i.at);return(a.xFt>=o.xFt||a.zFt>=o.zFt)&&Ut(t,`min 的 x、z 都必須小於 max`),{minXFt:a.xFt,minZFt:a.zFt,maxXFt:o.xFt,maxZFt:o.zFt}}function sn(e,t){let n=Kt(e,t),r=n.required(`type`),i=n.required(`pos`),a=n.optional(`heading`),o=n.optional(`size`);n.done();let s=Xt(r.value,r.at);if(!it(s))return Ut(r.at,`是不認得的障礙物類型，${Gt(s)}`);let c=en(i.value,i.at),l=o===void 0?at(s):nn(o.value,o.at);return l===null?Ut(Wt(t,`size`),`是必填欄位（${s} 沒有預設大小）`):{type:s,centerXFt:c.xFt,centerZFt:c.zFt,headingDeg:a===void 0?0:Qt(a.value,a.at),widthFt:l.widthFt,lengthFt:l.lengthFt}}function cn(e,t){return Array.isArray(e)?e.map((e,n)=>sn(e,Wt(t,n))):Ut(t,`必須是陣列（可以是空的），${Gt(e)}`)}function ln(e,t,n,r,i){let a=r===void 0?[]:$e(r);return{spot:yt(t),startState:{x:V(e.xFt),z:V(e.zFt),headingRad:H(e.headingDeg),speedMps:0,steerRad:0},obstacles:[...n,...a].map(qe),rules:i}}function un(e,t){let n=Kt(e,{source:t,path:``}),r=n.required(`id`),i=n.required(`name_key`),a=n.required(`world`),o=n.required(`environment`),s=n.optional(`weather`),c=n.required(`vehicle`),l=n.required(`time_limit`),u=n.required(`target_time`),d=n.required(`max_collisions`),f=n.optional(`angle_tolerance`),p=n.optional(`bounds`),m=n.required(`start`),h=n.required(`target`),g=n.required(`obstacles`);n.done();let _=Xt(r.value,r.at);zt.test(_)||Ut(r.at,`只能用小寫英數與底線，${Gt(_)}`);let v=Jt(l.value,l.at),y=Jt(u.value,u.at);y>=v&&Ut(u.at,`必須小於 time_limit（${v}），${Gt(y)}`);let b=f===void 0?A.defaultAngleToleranceDeg:Jt(f.value,f.at);f!==void 0&&b>Vt&&Ut(f.at,`不能超過 ${Vt}，${Gt(b)}`);let x=rn(m.value,m.at),S=an(h.value,h.at,b),C=Yt(d.value,d.at,0,1/0),w=p===void 0?void 0:on(p.value,p.at),T=cn(g.value,g.at);return{id:_,nameKey:Xt(i.value,i.at),world:Yt(a.value,a.at,0,Rt),environment:Zt(o.value,o.at,Pt),weather:s===void 0?It:Zt(s.value,s.at,Ft),vehicle:Zt(c.value,c.at,Lt),timeLimitS:v,targetTimeS:y,maxCollisions:C,...w===void 0?{}:{boundsFt:w},startFt:x,spotFt:S,obstaclesFt:T,layout:ln(x,S,T,w,jt(v,y,C))}}var dn=Ft,fn=`weather`;function pn(e){return dn.includes(e)}function mn(e){let t=new URLSearchParams(e).get(fn)?.trim().toLowerCase();return t!==void 0&&pn(t)?t:void 0}function hn(e,t){return mn(e)??t??`clear`}var gn=`parkinggame.save.v1`,_n=3,vn={version:1,levels:{},settings:{}};function yn(e){return typeof e==`object`&&!!e&&!Array.isArray(e)}function bn(e){return typeof e==`number`&&Number.isInteger(e)&&e>=1&&e<=_n}function xn(e){if(!yn(e))return;let{stars:t,bestTimeS:n}=e;if(bn(t)&&!(typeof n!=`number`||!Number.isFinite(n)||n<0))return{stars:t,bestTimeS:n}}function Sn(e){if(!yn(e)||e.version!==1||!yn(e.levels)||!yn(e.settings))return;let t={};for(let[n,r]of Object.entries(e.levels)){let e=xn(r);if(e===void 0)return;t[n]=e}let{locale:n}=e.settings;if(n===void 0)return{version:1,levels:t,settings:{}};if(typeof n==`string`&&se(n))return{version:1,levels:t,settings:{locale:n}}}function Cn(e){try{let t=e?.getItem(`parkinggame.save.v1`)??null;return t===null?vn:Sn(JSON.parse(t))??vn}catch{return vn}}function wn(e,t){if(e===void 0)return!1;try{return e.setItem(gn,JSON.stringify(t)),!0}catch{return!1}}function Tn(e,t){let n=t(Cn(e));return wn(e,n),n}function En(e,t){return Object.hasOwn(e.levels,t)?e.levels[t]:void 0}function Dn(e,t){return{...e,settings:{...e.settings,locale:t}}}var On=[`follow`,`top`,`spot_low`],kn=`follow`,An=`show`,jn=`cam`,Mn=`t`,Nn=`bench`,Pn=`level`,Fn=`unlock`,In=`fx`,Ln=`off`,Rn=`all`;function zn(e){return On.includes(e)}function Bn(e){let t=Number(e??``);return Number.isFinite(t)&&t>0?t:0}function Vn(e){let t=new URLSearchParams(e),n=t.get(An);if(n!==null)return{kind:`show`,id:n};let r=t.get(jn);return r===null?t.has(Nn)?{kind:`bench`}:{kind:`game`}:{kind:`cam`,preset:zn(r)?r:kn,timeSeconds:Bn(t.get(Mn))}}function Hn(e){let t=new URLSearchParams(e).get(Pn)?.trim();return t===void 0||t===``?void 0:t}function Un(e){return new URLSearchParams(e).get(Fn)===Rn}function Wn(e){return new URLSearchParams(e).get(In)===Ln}function Gn(e,t,n){let r=new URLSearchParams(e);r.delete(Pn),r.has(`lang`)&&r.set(re,n);let i=new URLSearchParams;t!==void 0&&i.set(Pn,t);for(let[e,t]of r)i.append(e,t);let a=i.toString();return a===``?``:`?${a}`}var Kn=`assist`,qn=`off`;function Jn(e){let t=new URLSearchParams(e);return t.get(Kn)===qn||t.get(In)===Ln}var Yn=`touch`;function Xn(e){let t=new URLSearchParams(e).get(Yn);return t===`on`||t===`off`?t:void 0}var Zn=600,Qn={throttle:0,steer:0,handbrake:!0},$n=[{untilSeconds:1.75,input:{throttle:1,steer:0,handbrake:!1}},{untilSeconds:3,input:{throttle:1,steer:1,handbrake:!1}},{untilSeconds:5.5,input:{throttle:1,steer:-1,handbrake:!1}},{untilSeconds:7,input:{throttle:1,steer:1,handbrake:!1}},{untilSeconds:7.25,input:{throttle:1,steer:0,handbrake:!1}},{untilSeconds:10,input:Qn}];function er(e){for(let t of $n)if(e<Math.round(t.untilSeconds*60))return t.input;return Qn}function tr(e,t){let n=e;for(let e=0;e<t;e+=1)n=ft(n,er(e),D);return n}var nr={id:`prototype`,name_key:`level.prototype.name`,world:0,environment:`open_lot`,weather:`dusk`,vehicle:`sedan`,time_limit:600,target_time:30,max_collisions:0,angle_tolerance:8,start:{pos:[0,0,0],heading:0},target:{pos:[0,0,-60],heading:0,size:[9,18]},obstacles:[]},rr={id:`w1_l01`,name_key:`level.w1_l01.name`,world:1,environment:`open_lot`,weather:`clear`,vehicle:`sedan`,time_limit:60,target_time:15,max_collisions:5,bounds:{min:[-30,-76],max:[30,16]},start:{pos:[0,0,0],heading:0},target:{pos:[0,0,-60],heading:0,size:[11,20]},obstacles:[]},ir={id:`w1_l02`,name_key:`level.w1_l02.name`,world:1,environment:`open_lot`,weather:`dusk`,vehicle:`sedan`,time_limit:75,target_time:20,max_collisions:5,bounds:{min:[-12,-42],max:[35,44]},start:{pos:[0,0,30],heading:0},target:{pos:[23.5,0,-20],heading:90,size:[10,19]},obstacles:[{type:`cone`,pos:[-10,0,-8]},{type:`cone`,pos:[-9,0,-16]},{type:`cone`,pos:[-6,0,-23]},{type:`cone`,pos:[0,0,-28]}]},ar={id:`w1_l03`,name_key:`level.w1_l03.name`,world:1,environment:`warehouse_club`,weather:`clear`,vehicle:`sedan`,time_limit:75,target_time:22,max_collisions:4,angle_tolerance:8,bounds:{min:[-22,-48],max:[34,44]},start:{pos:[0,0,-33],heading:180},target:{pos:[20,0,13],heading:90,size:[9.5,18.5]},obstacles:[{type:`parked_car`,pos:[20,0,4],heading:90},{type:`parked_car`,pos:[20,0,22],heading:270},{type:`cone`,pos:[-18,0,14]},{type:`shopping_cart`,pos:[-8,0,30],heading:20}]},or={id:`w1_l04`,name_key:`level.w1_l04.name`,world:1,environment:`warehouse_club`,weather:`wet`,vehicle:`sedan`,time_limit:80,target_time:25,max_collisions:3,bounds:{min:[-33,-40],max:[31,62]},start:{pos:[2,0,52],heading:0},target:{pos:[20,0,-10],heading:90,size:[9,18]},obstacles:[{type:`cart_corral`,pos:[20,0,-19],heading:90},{type:`parked_car`,pos:[20,0,-1],heading:270},{type:`parked_car`,pos:[-25,0,40],heading:90},{type:`parked_car`,pos:[-25,0,-15],heading:270},{type:`shopping_cart`,pos:[5,0,27],heading:10},{type:`shopping_cart`,pos:[-21,0,3],heading:70},{type:`shopping_cart`,pos:[-6,0,-32],heading:340},{type:`pallet_stack`,pos:[7.5,0,6]}]},sr={id:`w1_l05`,name_key:`level.w1_l05.name`,world:1,environment:`post_office`,weather:`clear`,vehicle:`sedan`,time_limit:60,target_time:18,max_collisions:3,bounds:{min:[-22,-22],max:[22,47]},start:{pos:[0,0,0],heading:0},target:{pos:[0,0,35],heading:0,size:[10,19]},obstacles:[{type:`mailbox`,pos:[-6.6,0,28]},{type:`trash_bin`,pos:[7,0,28]},{type:`trash_bin`,pos:[-7,0,38]},{type:`mailbox`,pos:[6.6,0,38]}]},cr={id:`w1_l06`,name_key:`level.w1_l06.name`,world:1,environment:`post_office`,weather:`dusk`,vehicle:`sedan`,time_limit:90,target_time:30,max_collisions:3,bounds:{min:[-44,-13],max:[36,33]},start:{pos:[-32,0,1],heading:90},target:{pos:[0,0,22.25],heading:0,size:[9.5,18.5]},obstacles:[{type:`parked_car`,pos:[9.5,0,22.25],heading:0},{type:`parked_car`,pos:[19,0,22.25],heading:180},{type:`mailbox`,pos:[-6.5,0,15]},{type:`bollard`,pos:[-6.5,0,19.5]},{type:`bollard`,pos:[-6.5,0,24]},{type:`trash_bin`,pos:[-12,0,15.5]}]},lr={id:`w1_l07`,name_key:`level.w1_l07.name`,world:1,environment:`warehouse_club`,weather:`storm`,vehicle:`sedan`,time_limit:95,target_time:34,max_collisions:3,bounds:{min:[-48,-27.5],max:[38,30.5]},start:{pos:[-38,0,1],heading:90},target:{pos:[0,0,21],heading:0,size:[9,18]},obstacles:[{type:`parked_car`,pos:[-18,0,21],heading:180},{type:`parked_car`,pos:[-9,0,21],heading:0},{type:`parked_car`,pos:[9,0,21],heading:180},{type:`parked_car`,pos:[18,0,21],heading:0},{type:`parked_car`,pos:[-18,0,-19.5],heading:180},{type:`parked_car`,pos:[-9,0,-19.5],heading:0},{type:`parked_car`,pos:[9,0,-19.5],heading:180},{type:`parked_car`,pos:[18,0,-19.5],heading:180},{type:`shopping_cart`,pos:[1,0,-15],heading:80},{type:`shopping_cart`,pos:[-24,0,8.5],heading:15},{type:`cone`,pos:[30,0,-3]},{type:`cone`,pos:[30,0,5]}]},ur={id:`w1_l08`,name_key:`level.w1_l08.name`,world:1,environment:`city_street`,weather:`clear`,vehicle:`sedan`,time_limit:90,target_time:30,max_collisions:3,bounds:{min:[-60,-14.5],max:[60,14]},start:{pos:[-45,0,2],heading:90},target:{pos:[0,0,9.75],heading:90,size:[8.5,25]},obstacles:[{type:`parked_car`,pos:[-21,0,10.5],heading:90},{type:`parked_car`,pos:[21,0,10.5],heading:90},{type:`parked_car`,pos:[-41,0,10.5],heading:90},{type:`parked_car`,pos:[42,0,10.5],heading:90},{type:`trash_bin`,pos:[50,0,-12.5]},{type:`planter`,pos:[-30,0,-12]}]},dr={id:`w1_l09`,name_key:`level.w1_l09.name`,world:1,environment:`city_street`,weather:`night`,vehicle:`sedan`,time_limit:110,target_time:40,max_collisions:2,angle_tolerance:7,bounds:{min:[-60,-14.5],max:[60,13.5]},start:{pos:[-45,0,2],heading:90},target:{pos:[0,0,9.5],heading:90,size:[8,21.5]},obstacles:[{type:`parked_car`,pos:[-18.75,0,10],heading:90},{type:`parked_car`,pos:[18.75,0,10],heading:90},{type:`parked_car`,pos:[-37,0,10],heading:90},{type:`parked_car`,pos:[37.5,0,10],heading:90},{type:`cone`,pos:[-36,0,-10.1]},{type:`cone`,pos:[-24,0,-10.1]},{type:`cone`,pos:[-12,0,-10.1]},{type:`cone`,pos:[0,0,-10.1]},{type:`cone`,pos:[12,0,-10.1]},{type:`cone`,pos:[24,0,-10.1]},{type:`cone`,pos:[36,0,-10.1]}]},fr={id:`w1_l10`,name_key:`level.w1_l10.name`,world:1,environment:`narrow_alley`,weather:`rain`,vehicle:`sedan`,time_limit:130,target_time:50,max_collisions:2,angle_tolerance:6,bounds:{min:[-6.75,-40],max:[31.25,90]},start:{pos:[1.3,0,80],heading:0},target:{pos:[3,0,-30.75],heading:180,size:[9,17.5]},obstacles:[{type:`wall`,pos:[19,0,45],heading:0,size:[24.5,90]},{type:`dumpster`,pos:[-4.9,0,66],heading:90},{type:`pallet`,pos:[4.95,0,40]},{type:`trash_bin`,pos:[-5.4,0,15]},{type:`trash_bin`,pos:[-5.4,0,18.5]},{type:`dumpster`,pos:[-3.6,0,-33],heading:90},{type:`pallet_stack`,pos:[9.8,0,-27]},{type:`pallet`,pos:[24,0,-36]},{type:`trash_bin`,pos:[28,0,-4]}]},pr=un(nr,`prototype.json`),mr={spot:pr.spotFt,start:pr.startFt};pr.layout;var hr=Object.assign({"../levels/prototype.json":nr,"../levels/w1_l01.json":rr,"../levels/w1_l02.json":ir,"../levels/w1_l03.json":ar,"../levels/w1_l04.json":or,"../levels/w1_l05.json":sr,"../levels/w1_l06.json":cr,"../levels/w1_l07.json":lr,"../levels/w1_l08.json":ur,"../levels/w1_l09.json":dr,"../levels/w1_l10.json":fr}),gr=`.json`,_r=2;function vr(e){return e.slice(e.lastIndexOf(`/`)+1)}function yr(){return Object.entries(hr).map(([e,t])=>{let n=vr(e),r=un(t,n);if(`${r.id}${gr}`!==n)throw Error(`${n}: id 必須與檔名相同，拿到 ${JSON.stringify(r.id)}`);return r}).sort((e,t)=>e.id<t.id?-1:+(e.id>t.id))}var br=yr(),xr=new Map(br.map(e=>[e.id,e])),Sr=br.map(e=>e.id);function Cr(e){return xr.get(e)}function wr(e){return br.filter(t=>t.world===e)}function Tr(e,t){return`w${e}_l${String(t).padStart(_r,`0`)}`}function Er(e){return Array.from({length:10},(t,n)=>{let r=Tr(e,n+1);return{number:n+1,id:r,level:Cr(r)}})}function Dr(e){let t=Cr(e);if(t===void 0||t.world===0)return;let n=wr(t.world);return n[n.indexOf(t)+1]?.id}function Or(e){if(e===void 0)return{kind:`level`,level:pr};let t=Cr(e);return t===void 0?{kind:`unknown`,id:e}:{kind:`level`,level:t}}var kr={level:`w1_l01`,segments:[{type:`path`,gear:`forward`,speed_mph:14,points:[[0,0],[0,-60]]}]},Ar={level:`w1_l02`,segments:[{type:`path`,gear:`forward`,speed_mph:9,points:[[0,30],[0,-6],[.21,-8.43],[.84,-10.79],[1.88,-13],[3.28,-15],[5,-16.72],[7,-18.12],[9.21,-19.16],[11.57,-19.79],[14,-20],[23.5,-20]]}]},jr={level:`w1_l03`,segments:[{type:`path`,gear:`forward`,speed_mph:8,points:[[0,-33],[0,-31.7],[-.22,-29.06],[-.87,-26.49],[-1.94,-24.06],[-3.39,-21.85],[-10.11,-13.25],[-11.61,-10.95],[-12.69,-8.43],[-13.33,-5.75],[-13.5,-3.01],[-13.19,-.28],[-12.43,2.35],[-11.23,4.82],[-9.62,7.05],[-7.65,8.97],[-5.39,10.52],[-2.89,11.66],[-.24,12.36],[2.5,12.6],[20,13]]}]},Mr={level:`w1_l04`,segments:[{type:`path`,gear:`forward`,speed_mph:8,points:[[2,52],[2,48],[1.78,44.97],[1.12,42],[.03,39.16],[-1.46,36.51],[-3.31,34.11],[-5.5,32],[-7.69,29.89],[-9.54,27.49],[-11.03,24.84],[-12.12,22],[-12.78,19.03],[-13,16],[-13,10],[-13,5],[-12.77,2.4],[-12.1,-.13],[-10.99,-2.5],[-9.49,-4.64],[-7.64,-6.49],[-5.5,-7.99],[-3.13,-9.1],[-.6,-9.77],[2,-10],[20,-10]]}]},Nr={level:`w1_l05`,segments:[{type:`path`,gear:`reverse`,speed_mph:6,points:[[0,0],[0,35]]}]},Pr={level:`w1_l06`,segments:[{type:`path`,gear:`forward`,speed_mph:10,points:[[-32,1],[17.35,1]]},{type:`arc`,gear:`reverse`,steer:1,distance_ft:20.19,speed_mph:4},{type:`path`,gear:`reverse`,speed_mph:4,points:[[0,9.35],[0,22.25]]}]},Fr={level:`w1_l07`,segments:[{type:`path`,gear:`forward`,speed_mph:10,points:[[-38,1],[17.35,1]]},{type:`arc`,gear:`reverse`,steer:1,distance_ft:20.19,speed_mph:4},{type:`path`,gear:`reverse`,speed_mph:4,points:[[0,9.35],[0,21]]}]},Ir={level:`w1_l08`,segments:[{type:`path`,gear:`forward`,speed_mph:10,points:[[-45,2],[16.9,2]]},{type:`arc`,gear:`reverse`,steer:1,distance_ft:10.25,speed_mph:3},{type:`arc`,gear:`reverse`,steer:-1,distance_ft:10.25,speed_mph:3}]},Lr={level:`w1_l09`,segments:[{type:`path`,gear:`forward`,speed_mph:10,points:[[-45,2],[15.95,2]]},{type:`arc`,gear:`reverse`,steer:1,distance_ft:10.11,speed_mph:3},{type:`arc`,gear:`reverse`,steer:-1,distance_ft:10.11,speed_mph:3}]},Rr={level:`w1_l10`,segments:[{type:`path`,gear:`forward`,speed_mph:6,points:[[1.3,80],[1.3,62],[-1,46],[-1,36],[.8,23],[.8,12],[0,3],[0,-1],[.21,-3.34],[.81,-5.62],[1.81,-7.75],[3.16,-9.68],[4.82,-11.34],[6.75,-12.69],[8.88,-13.69],[11.16,-14.29],[13.5,-14.5],[20.35,-14.5]]},{type:`arc`,gear:`reverse`,steer:-1,distance_ft:20.19,speed_mph:3},{type:`path`,gear:`reverse`,speed_mph:3,points:[[3,-22.85],[3,-30.75]]}]},zr=Math.round(j.cooldownSeconds*60),Br=je(j.maxBounceSpeedMph),Vr=[];function Hr(e){return e.throttle!==0||e.steer!==0||e.handbrake||e.brake===!0}function Ur(e){return{layout:e,vehicle:e.startState,heldSteps:0,parked:!1,status:`ready`,stepCount:0,elapsedSteps:0,collisions:0,hitCooldownUntil:(e.obstacles??Vr).map(()=>0),failReason:null,result:null}}function Wr(e){return Ur(e.layout)}function Gr(e,t){let n=-t.speedMps*j.restitution;return{x:e.x,z:e.z,headingRad:e.headingRad,speedMps:Math.min(Math.max(n,-Br),Br),steerRad:t.steerRad}}function Kr(e,t){if(e.status===`parked`||e.status===`failed`)return e;let{layout:n}=e,r=n.rules??Dt,i=e.stepCount+1,a=ft(e.vehicle,t,D),o=tt(a,n.obstacles??Vr),s=a,c=e.collisions,l=e.hitCooldownUntil;if(o.length>0){s=Gr(e.vehicle,a);let t=o.filter(e=>i>=(l[e]??0));t.length>0&&(c+=t.length,l=l.map((e,n)=>t.includes(n)?i+zr:e))}let u=e.status===`driving`||Hr(t),d=u?e.elapsedSteps+1:0,f=Nt({elapsedSteps:d,collisions:c,rules:r});if(f!==null)return{layout:n,vehicle:{...s,speedMps:0},heldSteps:0,parked:!1,status:`failed`,stepCount:i,elapsedSteps:d,collisions:c,hitCooldownUntil:l,failReason:f,result:null};let p=Tt(e.heldSteps,s,n.spot);if(Et(p)){let e=bt(s,n.spot);return{layout:n,vehicle:{...s,speedMps:0},heldSteps:p,parked:!0,status:`parked`,stepCount:i,elapsedSteps:d,collisions:c,hitCooldownUntil:l,failReason:null,result:{stars:Mt({timeSteps:d,targetSteps:r.targetSteps,collisions:c,angleErrorRad:e}),timeSteps:d,collisions:c,angleErrorRad:e}}}return{layout:n,vehicle:s,heldSteps:p,parked:!1,status:u?`driving`:`ready`,stepCount:i,elapsedSteps:d,collisions:c,hitCooldownUntil:l,failReason:null,result:null}}function qr(e){return{xFt:Ae(e.vehicle.x),zFt:Ae(e.vehicle.z),headingDeg:Pe(e.vehicle.headingRad),speedMph:Me(e.vehicle.speedMps),parked:e.parked,status:e.status,elapsedS:At(e.elapsedSteps),collisions:e.collisions,angleErrorDeg:Pe(bt(e.vehicle,e.layout.spot)),stars:e.result?.stars??null,failReason:e.failReason}}var Jr={segmentIndex:0,pathEdge:0,braking:!1,arcStart:null},Yr={lookaheadSeconds:.45,minLookaheadFt:5,approachDecelMphPerS:7,creepMph:1.5,speedBandMph:.4,steerSettledDeg:.01},Xr=V(Yr.minLookaheadFt),Zr=Ne(Yr.approachDecelMphPerS),Qr=je(Yr.creepMph),$r=je(Yr.speedBandMph),ei=Yr.steerSettledDeg*Math.PI/180,ti=U.wheelbaseM,ni=ti/2,ri={throttle:0,steer:0,handbrake:!0};function ii(e){return e===`forward`?1:-1}function ai(e){let t=Re(e.headingRad);return{x:e.x-t.x*ni,z:e.z-t.z*ni}}function oi(e){return e**2/(2*U.handbrakeMps2)}function si(e,t,n,r){let i=ii(t),a=e.speedMps*i,o=Math.sqrt(Qr**2+2*Zr*Math.max(r,0)),s=Math.min(n,o);return a>s+$r?i===1?-1:1:a<s-$r||a<=0?i:0}function ci(e,t,n){let r=0,i=0;for(;r<t.length-1&&n>i+(t[r]??0);)i+=t[r]??0,r+=1;let a=e[r]??{x:0,z:0},o=e[r+1]??a,s=(n-i)/(t[r]??1);return{x:a.x+(o.x-a.x)*s,z:a.z+(o.z-a.z)*s}}function li(e,t,n){let{points:r}=e,i=ii(e.gear),a=r.slice(1).map((e,t)=>{let n=r[t]??e;return Math.hypot(e.x-n.x,e.z-n.z)}),o=a.reduce((e,t)=>e+t,0),s=ai(n),c=Math.min(t.pathEdge,a.length-1),l=a.slice(0,c).reduce((e,t)=>e+t,0),u=0;for(;;){let e=r[c]??s,t=r[c+1]??e,n=a[c]??1;if(u=((s.x-e.x)*(t.x-e.x)+(s.z-e.z)*(t.z-e.z))/n,u<=n||c>=a.length-1)break;l+=n,c+=1}let d=l+u,f=o-d-i*ni,p=Math.abs(n.speedMps),m=t.braking||f<=oi(p),h={...t,pathEdge:c,braking:m};if(m&&n.speedMps===0)return{input:ri,state:h,done:!0};let g=ci(r,a,d+Math.max(Xr,p*Yr.lookaheadSeconds)),_=g.x-s.x,v=g.z-s.z,y=ze(n.headingRad),b=2*((_*y.x+v*y.z)*i)/Math.max(_*_+v*v,1e-9),x=Math.atan(i*ti*b),S=Math.min(Math.max(x/U.maxSteerRad,-1),1);return m?{input:{throttle:0,steer:S,handbrake:!0},state:h,done:!1}:{input:{throttle:si(n,e.gear,e.speedMps,f),steer:S,handbrake:!1},state:h,done:!1}}function ui(e,t,n){if(e.steer===0)return Math.hypot(n.x-t.x,n.z-t.z);let r=ti/Math.tan(Math.abs(e.steer)*U.maxSteerRad);return Math.abs(Ve(t.headingRad,n.headingRad))*r}function di(e,t,n){let r={throttle:0,steer:e.steer,handbrake:!0},i=t.arcStart;if(i===null){let a=e.steer*U.maxSteerRad;if(!(Math.abs(n.steerRad-a)<=ei)||n.speedMps!==0)return{input:r,state:t,done:!1};i={x:n.x,z:n.z,headingRad:n.headingRad}}let a=e.distanceM-ui(e,i,n),o=t.braking||a<=oi(Math.abs(n.speedMps)),s={...t,arcStart:i,braking:o};return o?{input:r,state:s,done:n.speedMps===0}:{input:{throttle:si(n,e.gear,e.speedMps,a),steer:e.steer,handbrake:!1},state:s,done:!1}}function fi(e,t,n){let r=t;for(;;){let t=e.segments[r.segmentIndex];if(t===void 0)return{input:ri,state:r};let i=t.kind===`path`?li(t,r,n):di(t,r,n);if(!i.done)return{input:i.input,state:i.state};r={...Jr,segmentIndex:r.segmentIndex+1}}}function pi(e,t,n){let r=n.decisionEverySteps??1,i=Ur(e),a=Jr,o=ri;for(let e=0;e<n.maxSteps&&i.status!==`parked`&&i.status!==`failed`;e+=1){if(e%r===0){let e=fi(t,a,i.vehicle);a=e.state,o=e.input}i=Kr(i,o)}return i}var mi=Object.assign({"../levels/routes/w1_l01.json":kr,"../levels/routes/w1_l02.json":Ar,"../levels/routes/w1_l03.json":jr,"../levels/routes/w1_l04.json":Mr,"../levels/routes/w1_l05.json":Nr,"../levels/routes/w1_l06.json":Pr,"../levels/routes/w1_l07.json":Fr,"../levels/routes/w1_l08.json":Ir,"../levels/routes/w1_l09.json":Lr,"../levels/routes/w1_l10.json":Rr}),hi=`.json`,gi=class extends Error{constructor(e,t){super(`${e}: ${t}`),this.name=`RouteFormatError`}};function _i(e,t,n){if(typeof e!=`object`||!e||Array.isArray(e))throw new gi(t,`${n} 必須是物件`);return{...e}}function vi(e,t,n){if(!Array.isArray(e))throw new gi(t,`${n} 必須是陣列`);return e}function yi(e,t,n){if(typeof e!=`number`||!Number.isFinite(e))throw new gi(t,`${n} 必須是有限的數字，拿到 ${JSON.stringify(e)}`);return e}function bi(e,t,n){let r=yi(e,t,n);if(r<=0)throw new gi(t,`${n} 必須大於 0，拿到 ${r}`);return r}function xi(e,t,n){if(e!==`forward`&&e!==`reverse`)throw new gi(t,`${n} 必須是 forward 或 reverse，拿到 ${JSON.stringify(e)}`);return e}function Si(e,t,n,r){let i=bi(e,n,r),a=t===`forward`?Ue.maxSpeedMph:Ue.maxReverseSpeedMph;if(i>a)throw new gi(n,`${r} 不能超過 ${a} mph，拿到 ${i}`);return je(i)}function Ci(e){if(e===0)return 1/0;let t=Ue.maxSteerDeg*Math.PI/180;return Math.PI*Ue.wheelbaseFt/Math.tan(Math.abs(e)*t)}function wi(e,t,n){let r=_i(e,t,n),i=xi(r.gear,t,`${n}.gear`),a=Si(r.speed_mph,i,t,`${n}.speed_mph`);if(r.type===`path`){let e=vi(r.points,t,`${n}.points`).map((e,r)=>{let i=vi(e,t,`${n}.points[${r}]`);if(i.length!==2)throw new gi(t,`${n}.points[${r}] 必須是 [x, z]`);return{x:V(yi(i[0],t,`${n}.points[${r}][0]`)),z:V(yi(i[1],t,`${n}.points[${r}][1]`))}});if(e.length<2)throw new gi(t,`${n}.points 至少要兩點`);return e.slice(1).forEach((r,i)=>{let a=e[i]??r;if(a.x===r.x&&a.z===r.z)throw new gi(t,`${n}.points[${i+1}] 與前一點重合`)}),{kind:`path`,gear:i,speedMps:a,points:e}}if(r.type===`arc`){let e=yi(r.steer,t,`${n}.steer`);if(e<-1||e>1)throw new gi(t,`${n}.steer 必須在 −1 到 1 之間，拿到 ${e}`);let o=bi(r.distance_ft,t,`${n}.distance_ft`);if(o>=Ci(e))throw new gi(t,`${n}.distance_ft 不能超過半圈，拿到 ${o}`);return{kind:`arc`,gear:i,steer:e,distanceM:V(o),speedMps:a}}throw new gi(t,`${n}.type 必須是 path 或 arc，拿到 ${JSON.stringify(r.type)}`)}function Ti(e,t){let n=_i(e,t,`最外層`);if(typeof n.level!=`string`||n.level===``)throw new gi(t,`level 必須是關卡 id`);let r=vi(n.segments,t,`segments`).map((e,n)=>wi(e,t,`segments[${n}]`));if(r.length===0)throw new gi(t,`segments 至少要一段`);return{levelId:n.level,route:{segments:r}}}function Ei(){let e=new Map;for(let[t,n]of Object.entries(mi)){let r=t.slice(t.lastIndexOf(`/`)+1),{levelId:i,route:a}=Ti(n,`routes/${r}`);if(`${i}${hi}`!==r)throw new gi(`routes/${r}`,`level 必須與檔名相同，拿到 ${JSON.stringify(i)}`);e.set(i,a)}return e}var Di=Ei();[...Di.keys()].sort();function Oi(e){return Di.get(e)}function ki(e,t){let n=Oi(e.id);if(n===void 0)return;let r=Math.round(Math.min(Math.max(t,0),e.timeLimitS)*60);return pi(e.layout,n,{maxSteps:r}).vehicle}function Ai(e,t){return En(e,t)?.stars??0}function ji(e,t,n){let r=e.indexOf(t);if(r<0)return!1;let i=e[r-1];return i===void 0||Ai(n,i)>=1}function Mi(e,t,n=!1){let r=Cr(e);return r===void 0?!1:n?!0:ji(wr(r.world).map(e=>e.id),e,t)}function Ni(e,t,n){let r=En(e,t),i=r!==void 0&&r.stars>n.stars?r.stars:n.stars,a=r===void 0?n.timeS:Math.min(r.bestTimeS,n.timeS);return{...e,levels:{...e.levels,[t]:{stars:i,bestTimeS:a}}}}var Pi=1e3,Fi=1001,Ii=1002,Li=1003,Ri=1004,zi=1005,Bi=1006,Vi=1007,Hi=1008,Ui=1009,Wi=1010,Gi=1011,Ki=1012,qi=1013,Ji=1014,Yi=1015,Xi=1016,Zi=1017,Qi=1018,$i=1020,ea=35902,ta=35899,na=1021,ra=1022,ia=1023,aa=1026,oa=1027,sa=1028,ca=1029,la=1030,ua=1031,da=1033,fa=33776,pa=33777,ma=33778,ha=33779,ga=35840,_a=35841,va=35842,ya=35843,ba=36196,xa=37492,Sa=37496,Ca=37488,wa=37489,Ta=37490,Ea=37491,Da=37808,Oa=37809,ka=37810,Aa=37811,ja=37812,Ma=37813,Na=37814,Pa=37815,Fa=37816,Ia=37817,La=37818,Ra=37819,za=37820,Ba=37821,Va=36492,Ha=36494,Ua=36495,Wa=36283,Ga=36284,Ka=36285,qa=36286,Ja=2300,Ya=2301,Xa=2302,Za=2303,Qa=2400,$a=2401,eo=2402,to=3200,no=`srgb`,ro=`srgb-linear`,io=`linear`,ao=`srgb`,oo=7680,so=35044,co=35048,lo=`300 es`,uo=2e3;function fo(e){for(let t=e.length-1;t>=0;--t)if(e[t]>=65535)return!0;return!1}function po(e){return ArrayBuffer.isView(e)&&!(e instanceof DataView)}function mo(e){return document.createElementNS(`http://www.w3.org/1999/xhtml`,e)}function ho(){let e=mo(`canvas`);return e.style.display=`block`,e}var go={};function _o(...e){let t=`THREE.`+e.shift();console.log(t,...e)}function vo(e){let t=e[0];if(typeof t==`string`&&t.startsWith(`TSL:`)){let t=e[1];t&&t.isStackTrace?e[0]+=` `+t.getLocation():e[1]=`Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.`}return e}function W(...e){e=vo(e);let t=`THREE.`+e.shift();{let n=e[0];n&&n.isStackTrace?console.warn(n.getError(t)):console.warn(t,...e)}}function G(...e){e=vo(e);let t=`THREE.`+e.shift();{let n=e[0];n&&n.isStackTrace?console.error(n.getError(t)):console.error(t,...e)}}function yo(...e){let t=e.join(` `);t in go||(go[t]=!0,W(...e))}function bo(e,t,n){return new Promise(function(r,i){function a(){switch(e.clientWaitSync(t,e.SYNC_FLUSH_COMMANDS_BIT,0)){case e.WAIT_FAILED:i();break;case e.TIMEOUT_EXPIRED:setTimeout(a,n);break;default:r()}}setTimeout(a,n)})}var xo={0:0,2:6,4:4,3:5,1:1,6:2,7:7,5:3},So=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n!==void 0&&n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let r=n[e];if(r!==void 0){let e=r.indexOf(t);e!==-1&&r.splice(e,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let t=n.slice(0);for(let n=0,r=t.length;n<r;n++)t[n].call(this,e);e.target=null}}},Co=`00.01.02.03.04.05.06.07.08.09.0a.0b.0c.0d.0e.0f.10.11.12.13.14.15.16.17.18.19.1a.1b.1c.1d.1e.1f.20.21.22.23.24.25.26.27.28.29.2a.2b.2c.2d.2e.2f.30.31.32.33.34.35.36.37.38.39.3a.3b.3c.3d.3e.3f.40.41.42.43.44.45.46.47.48.49.4a.4b.4c.4d.4e.4f.50.51.52.53.54.55.56.57.58.59.5a.5b.5c.5d.5e.5f.60.61.62.63.64.65.66.67.68.69.6a.6b.6c.6d.6e.6f.70.71.72.73.74.75.76.77.78.79.7a.7b.7c.7d.7e.7f.80.81.82.83.84.85.86.87.88.89.8a.8b.8c.8d.8e.8f.90.91.92.93.94.95.96.97.98.99.9a.9b.9c.9d.9e.9f.a0.a1.a2.a3.a4.a5.a6.a7.a8.a9.aa.ab.ac.ad.ae.af.b0.b1.b2.b3.b4.b5.b6.b7.b8.b9.ba.bb.bc.bd.be.bf.c0.c1.c2.c3.c4.c5.c6.c7.c8.c9.ca.cb.cc.cd.ce.cf.d0.d1.d2.d3.d4.d5.d6.d7.d8.d9.da.db.dc.dd.de.df.e0.e1.e2.e3.e4.e5.e6.e7.e8.e9.ea.eb.ec.ed.ee.ef.f0.f1.f2.f3.f4.f5.f6.f7.f8.f9.fa.fb.fc.fd.fe.ff`.split(`.`),wo=Math.PI/180,To=180/Math.PI;function Eo(){let e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(Co[e&255]+Co[e>>8&255]+Co[e>>16&255]+Co[e>>24&255]+`-`+Co[t&255]+Co[t>>8&255]+`-`+Co[t>>16&15|64]+Co[t>>24&255]+`-`+Co[n&63|128]+Co[n>>8&255]+`-`+Co[n>>16&255]+Co[n>>24&255]+Co[r&255]+Co[r>>8&255]+Co[r>>16&255]+Co[r>>24&255]).toLowerCase()}function Do(e,t,n){return Math.max(t,Math.min(n,e))}function Oo(e,t){return(e%t+t)%t}function ko(e,t,n){return(1-n)*e+n*t}function Ao(e){return 2**Math.floor(Math.log(e)/Math.LN2)}function jo(e){switch(e.constructor){case Uint32Array:return 4294967295;case Uint16Array:return 65535;case Uint8Array:case Uint8ClampedArray:return 255;case Int32Array:return 2147483647;case Int16Array:return 32767;case Int8Array:return 127;default:return}}function Mo(e,t){if(t.constructor===Float32Array)return e;let n=jo(t);if(n===void 0)throw Error(`THREE.MathUtils: Invalid component type.`);return Math.max(e/n,-1)}function No(e,t){if(t.constructor===Float32Array)return e;let n=jo(t);if(n===void 0)throw Error(`THREE.MathUtils: Invalid component type.`);return Math.round(e*n)}var K=class{static{this.prototype.isVector2=!0}constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw Error(`THREE.Vector2: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw Error(`THREE.Vector2: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Do(this.x,e.x,t.x),this.y=Do(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Do(this.x,e,t),this.y=Do(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Do(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(Do(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),r=Math.sin(t),i=this.x-e.x,a=this.y-e.y;return this.x=i*n-a*r+e.x,this.y=i*r+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},Po=class{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,i,a,o){let s=n[r+0],c=n[r+1],l=n[r+2],u=n[r+3],d=i[a+0],f=i[a+1],p=i[a+2],m=i[a+3];if(u!==m||s!==d||c!==f||l!==p){let e=s*d+c*f+l*p+u*m;e<0&&(d=-d,f=-f,p=-p,m=-m,e=-e);let t=1-o;if(e<.9995){let n=Math.acos(e),r=Math.sin(n);t=Math.sin(t*n)/r,o=Math.sin(o*n)/r,s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o}else{s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o;let e=1/Math.sqrt(s*s+c*c+l*l+u*u);s*=e,c*=e,l*=e,u*=e}}e[t]=s,e[t+1]=c,e[t+2]=l,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,r,i,a){let o=n[r],s=n[r+1],c=n[r+2],l=n[r+3],u=i[a],d=i[a+1],f=i[a+2],p=i[a+3];return e[t]=o*p+l*u+s*f-c*d,e[t+1]=s*p+l*d+c*u-o*f,e[t+2]=c*p+l*f+o*d-s*u,e[t+3]=l*p-o*u-s*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,r=e._y,i=e._z,a=e._order,o=Math.cos,s=Math.sin,c=o(n/2),l=o(r/2),u=o(i/2),d=s(n/2),f=s(r/2),p=s(i/2);switch(a){case`XYZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`YXZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`ZXY`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`ZYX`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`YZX`:this._x=d*l*u+c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u-d*f*p;break;case`XZY`:this._x=d*l*u-c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u+d*f*p;break;default:W(`Quaternion: .setFromEuler() encountered an unknown order: `+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],r=t[4],i=t[8],a=t[1],o=t[5],s=t[9],c=t[2],l=t[6],u=t[10],d=n+o+u;if(d>0){let e=.5/Math.sqrt(d+1);this._w=.25/e,this._x=(l-s)*e,this._y=(i-c)*e,this._z=(a-r)*e}else if(n>o&&n>u){let e=2*Math.sqrt(1+n-o-u);this._w=(l-s)/e,this._x=.25*e,this._y=(r+a)/e,this._z=(i+c)/e}else if(o>u){let e=2*Math.sqrt(1+o-n-u);this._w=(i-c)/e,this._x=(r+a)/e,this._y=.25*e,this._z=(s+l)/e}else{let e=2*Math.sqrt(1+u-n-o);this._w=(a-r)/e,this._x=(i+c)/e,this._y=(s+l)/e,this._z=.25*e}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Do(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x*=e,this._y*=e,this._z*=e,this._w*=e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=t._x,s=t._y,c=t._z,l=t._w;return this._x=n*l+a*o+r*c-i*s,this._y=r*l+a*s+i*o-n*c,this._z=i*l+a*c+n*s-r*o,this._w=a*l-n*o-r*s-i*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=this.dot(e);o<0&&(n=-n,r=-r,i=-i,a=-a,o=-o);let s=1-t;if(o<.9995){let e=Math.acos(o),c=Math.sin(e);s=Math.sin(s*e)/c,t=Math.sin(t*e)/c,this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this._onChangeCallback()}else this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),i=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),i*Math.sin(t),i*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},q=class{static{this.prototype.isVector3=!0}constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw Error(`THREE.Vector3: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error(`THREE.Vector3: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Io.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Io.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6]*r,this.y=i[1]*t+i[4]*n+i[7]*r,this.z=i[2]*t+i[5]*n+i[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=e.elements,a=1/(i[3]*t+i[7]*n+i[11]*r+i[15]);return this.x=(i[0]*t+i[4]*n+i[8]*r+i[12])*a,this.y=(i[1]*t+i[5]*n+i[9]*r+i[13])*a,this.z=(i[2]*t+i[6]*n+i[10]*r+i[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,r=this.z,i=e.x,a=e.y,o=e.z,s=e.w,c=2*(a*r-o*n),l=2*(o*t-i*r),u=2*(i*n-a*t);return this.x=t+s*c+a*u-o*l,this.y=n+s*l+o*c-i*u,this.z=r+s*u+i*l-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[4]*n+i[8]*r,this.y=i[1]*t+i[5]*n+i[9]*r,this.z=i[2]*t+i[6]*n+i[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Do(this.x,e.x,t.x),this.y=Do(this.y,e.y,t.y),this.z=Do(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Do(this.x,e,t),this.y=Do(this.y,e,t),this.z=Do(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Do(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,r=e.y,i=e.z,a=t.x,o=t.y,s=t.z;return this.x=r*s-i*o,this.y=i*a-n*s,this.z=n*o-r*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Fo.copy(this).projectOnVector(e),this.sub(Fo)}reflect(e){return this.sub(Fo.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(Do(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Fo=new q,Io=new Po,Lo=class{static{this.prototype.isMatrix3=!0}constructor(e,t,n,r,i,a,o,s,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c)}set(e,t,n,r,i,a,o,s,c){let l=this.elements;return l[0]=e,l[1]=r,l[2]=o,l[3]=t,l[4]=i,l[5]=s,l[6]=n,l[7]=a,l[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[3],s=n[6],c=n[1],l=n[4],u=n[7],d=n[2],f=n[5],p=n[8],m=r[0],h=r[3],g=r[6],_=r[1],v=r[4],y=r[7],b=r[2],x=r[5],S=r[8];return i[0]=a*m+o*_+s*b,i[3]=a*h+o*v+s*x,i[6]=a*g+o*y+s*S,i[1]=c*m+l*_+u*b,i[4]=c*h+l*v+u*x,i[7]=c*g+l*y+u*S,i[2]=d*m+f*_+p*b,i[5]=d*h+f*v+p*x,i[8]=d*g+f*y+p*S,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8];return t*a*l-t*o*c-n*i*l+n*o*s+r*i*c-r*a*s}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=l*a-o*c,d=o*s-l*i,f=c*i-a*s,p=t*u+n*d+r*f;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);let m=1/p;return e[0]=u*m,e[1]=(r*c-l*n)*m,e[2]=(o*n-r*a)*m,e[3]=d*m,e[4]=(l*t-r*s)*m,e[5]=(r*i-o*t)*m,e[6]=f*m,e[7]=(n*s-c*t)*m,e[8]=(a*t-n*i)*m,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,i,a,o){let s=Math.cos(i),c=Math.sin(i);return this.set(n*s,n*c,-n*(s*a+c*o)+a+e,-r*c,r*s,-r*(-c*a+s*o)+o+t,0,0,1),this}scale(e,t){return yo(`Matrix3: .scale() is deprecated. Use .makeScale() instead.`),this.premultiply(Ro.makeScale(e,t)),this}rotate(e){return yo(`Matrix3: .rotate() is deprecated. Use .makeRotation() instead.`),this.premultiply(Ro.makeRotation(-e)),this}translate(e,t){return yo(`Matrix3: .translate() is deprecated. Use .makeTranslation() instead.`),this.premultiply(Ro.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<9;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}},Ro=new Lo,zo=new Lo().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Bo=new Lo().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Vo(){let e={enabled:!0,workingColorSpace:ro,spaces:{},convert:function(e,t,n){return this.enabled===!1||t===n||!t||!n||(this.spaces[t].transfer===`srgb`&&(e.r=Uo(e.r),e.g=Uo(e.g),e.b=Uo(e.b)),this.spaces[t].primaries!==this.spaces[n].primaries&&(e.applyMatrix3(this.spaces[t].toXYZ),e.applyMatrix3(this.spaces[n].fromXYZ)),this.spaces[n].transfer===`srgb`&&(e.r=Wo(e.r),e.g=Wo(e.g),e.b=Wo(e.b))),e},workingToColorSpace:function(e,t){return this.convert(e,this.workingColorSpace,t)},colorSpaceToWorking:function(e,t){return this.convert(e,t,this.workingColorSpace)},getPrimaries:function(e){return this.spaces[e].primaries},getTransfer:function(e){return e===``?io:this.spaces[e].transfer},getToneMappingMode:function(e){return this.spaces[e].outputColorSpaceConfig.toneMappingMode||`standard`},getLuminanceCoefficients:function(e,t=this.workingColorSpace){return e.fromArray(this.spaces[t].luminanceCoefficients)},define:function(e){Object.assign(this.spaces,e)},_getMatrix:function(e,t,n){return e.copy(this.spaces[n].fromXYZ).multiply(this.spaces[t].toXYZ)},_getDrawingBufferColorSpace:function(e){return this.spaces[e].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(e=this.workingColorSpace){return this.spaces[e].workingColorSpaceConfig.unpackColorSpace}},t=[.64,.33,.3,.6,.15,.06],n=[.2126,.7152,.0722],r=[.3127,.329];return e.define({[ro]:{primaries:t,whitePoint:r,transfer:io,toXYZ:zo,fromXYZ:Bo,luminanceCoefficients:n,workingColorSpaceConfig:{unpackColorSpace:no},outputColorSpaceConfig:{drawingBufferColorSpace:no}},[no]:{primaries:t,whitePoint:r,transfer:ao,toXYZ:zo,fromXYZ:Bo,luminanceCoefficients:n,outputColorSpaceConfig:{drawingBufferColorSpace:no}}}),e}var Ho=Vo();function Uo(e){return e<.04045?e*.0773993808:(e*.9478672986+.0521327014)**2.4}function Wo(e){return e<.0031308?e*12.92:1.055*e**.41666-.055}var Go,Ko=class{static getDataURL(e,t=`image/png`){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>`u`)return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{Go===void 0&&(Go=mo(`canvas`)),Go.width=e.width,Go.height=e.height;let t=Go.getContext(`2d`);e instanceof ImageData?t.putImageData(e,0,0):t.drawImage(e,0,0,e.width,e.height),n=Go}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap){let t=mo(`canvas`);t.width=e.width,t.height=e.height;let n=t.getContext(`2d`);n.drawImage(e,0,0,e.width,e.height);let r=n.getImageData(0,0,e.width,e.height),i=r.data;for(let e=0;e<i.length;e++)i[e]=Uo(i[e]/255)*255;return n.putImageData(r,0,0),t}if(e.data){let t=e.data.slice(0);for(let e=0;e<t.length;e++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[e]=Math.floor(Uo(t[e]/255)*255):t[e]=Uo(t[e]);return{data:t,width:e.width,height:e.height}}return W(`ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied.`),e}},qo=0,Jo=class{constructor(e=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:qo++}),this.uuid=Eo(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<`u`&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<`u`&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t===null?e.set(0,0,0):e.set(t.width||0,t.height||0,t.depth||0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:``},r=this.data;if(r!==null){let e;if(Array.isArray(r)){e=[];for(let t=0,n=r.length;t<n;t++)r[t].isDataTexture?e.push(Yo(r[t].image)):e.push(Yo(r[t]))}else e=Yo(r);n.url=e}return t||(e.images[this.uuid]=n),n}};function Yo(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap?Ko.getDataURL(e):e.data?{data:Array.from(e.data),width:e.width,height:e.height,type:e.data.constructor.name}:(W(`Texture: Unable to serialize Texture.`),{})}var Xo=0,Zo=new q,Qo=class e extends So{constructor(t=e.DEFAULT_IMAGE,n=e.DEFAULT_MAPPING,r=Fi,i=Fi,a=Bi,o=Hi,s=ia,c=Ui,l=e.DEFAULT_ANISOTROPY,u=``){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Xo++}),this.uuid=Eo(),this.name=``,this.source=new Jo(t),this.mipmaps=[],this.mapping=n,this.channel=0,this.wrapS=r,this.wrapT=i,this.magFilter=a,this.minFilter=o,this.anisotropy=l,this.format=s,this.internalFormat=null,this.type=c,this.offset=new K(0,0),this.repeat=new K(1,1),this.center=new K(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Lo,this.generateMipmaps=!0,this.mipmapsAutoUpdate=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.isPMREMTexture=!1,this.normalized=!1}get width(){return this.source.getSize(Zo).x}get height(){return this.source.getSize(Zo).y}get depth(){return this.source.getSize(Zo).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.mipmapsAutoUpdate=e.mipmapsAutoUpdate,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isPMREMTexture=e.isPMREMTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){W(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let r=this[t];r===void 0?W(`Texture.setValues(): property '${t}' does not exist.`):r&&n&&r.isVector2&&n.isVector2||r&&n&&r.isVector3&&n.isVector3||r&&n&&r.isMatrix3&&n.isMatrix3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:`Texture`,generator:`Texture.toJSON`},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,mipmapsAutoUpdate:this.mipmapsAutoUpdate,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:`dispose`})}transformUv(e){if(this.mapping!==300)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Pi:e.x-=Math.floor(e.x);break;case Fi:e.x=e.x<0?0:1;break;case Ii:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x-=Math.floor(e.x)}if(e.y<0||e.y>1)switch(this.wrapT){case Pi:e.y-=Math.floor(e.y);break;case Fi:e.y=e.y<0?0:1;break;case Ii:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y-=Math.floor(e.y)}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};Qo.DEFAULT_IMAGE=null,Qo.DEFAULT_MAPPING=300,Qo.DEFAULT_ANISOTROPY=1;var $o=class{static{this.prototype.isVector4=!0}constructor(e=0,t=0,n=0,r=1){this.x=e,this.y=t,this.z=n,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw Error(`THREE.Vector4: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error(`THREE.Vector4: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w===void 0?1:e.w,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*r+a[12]*i,this.y=a[1]*t+a[5]*n+a[9]*r+a[13]*i,this.z=a[2]*t+a[6]*n+a[10]*r+a[14]*i,this.w=a[3]*t+a[7]*n+a[11]*r+a[15]*i,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,i,a=.01,o=.1,s=e.elements,c=s[0],l=s[4],u=s[8],d=s[1],f=s[5],p=s[9],m=s[2],h=s[6],g=s[10];if(Math.abs(l-d)<a&&Math.abs(u-m)<a&&Math.abs(p-h)<a){if(Math.abs(l+d)<o&&Math.abs(u+m)<o&&Math.abs(p+h)<o&&Math.abs(c+f+g-3)<o)return this.set(1,0,0,0),this;t=Math.PI;let e=(c+1)/2,s=(f+1)/2,_=(g+1)/2,v=(l+d)/4,y=(u+m)/4,b=(p+h)/4;return e>s&&e>_?e<a?(n=0,r=.707106781,i=.707106781):(n=Math.sqrt(e),r=v/n,i=y/n):s>_?s<a?(n=.707106781,r=0,i=.707106781):(r=Math.sqrt(s),n=v/r,i=b/r):_<a?(n=.707106781,r=.707106781,i=0):(i=Math.sqrt(_),n=y/i,r=b/i),this.set(n,r,i,t),this}let _=Math.sqrt((h-p)*(h-p)+(u-m)*(u-m)+(d-l)*(d-l));return Math.abs(_)<.001&&(_=1),this.x=(h-p)/_,this.y=(u-m)/_,this.z=(d-l)/_,this.w=Math.acos((c+f+g-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Do(this.x,e.x,t.x),this.y=Do(this.y,e.y,t.y),this.z=Do(this.z,e.z,t.z),this.w=Do(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Do(this.x,e,t),this.y=Do(this.y,e,t),this.z=Do(this.z,e,t),this.w=Do(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Do(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},es=class extends So{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Bi,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new $o(0,0,e,t),this.scissorTest=!1,this.viewport=new $o(0,0,e,t),this.textures=[];let r=n.count;for(let i=0;i<r;i++)this.textures[i]=new Qo({width:e,height:t,depth:n.depth}),this.textures[i].isRenderTargetTexture=!0,this.textures[i].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){let t={minFilter:Bi,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.mipmapsAutoUpdate!==void 0&&(t.mipmapsAutoUpdate=e.mipmapsAutoUpdate),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let e=0;e<this.textures.length;e++)this.textures[e].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),e!==null&&e.renderTarget===null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let r=0,i=this.textures.length;r<i;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=n,this.textures[r].isData3DTexture!==!0&&(this.textures[r].isArrayTexture=this.textures[r].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let n=Object.assign({},e.textures[t].image);this.textures[t].source=new Jo(n)}if(this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveColorBuffer=e.resolveColorBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,this.storeMultisampledColorBuffer=e.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=e.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=e.storeMultisampledStencilBuffer,e.depthTexture!==null){if(e.depthTexture.renderTarget===e){let t=e.depthTexture.clone();t.renderTarget=null,this.depthTexture=t}else this.depthTexture=e.depthTexture}else this.depthTexture=null;return this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:`dispose`})}},ts=class extends es{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},ns=class extends Qo{constructor(e=null,t=1,n=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=Li,this.minFilter=Li,this.wrapR=Fi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}},rs=class extends Qo{constructor(e=null,t=1,n=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=Li,this.minFilter=Li,this.wrapR=Fi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}},is=class e{static{this.prototype.isMatrix4=!0}constructor(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h)}set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){let g=this.elements;return g[0]=e,g[4]=t,g[8]=n,g[12]=r,g[1]=i,g[5]=a,g[9]=o,g[13]=s,g[2]=c,g[6]=l,g[10]=u,g[14]=d,g[3]=f,g[7]=p,g[11]=m,g[15]=h,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new e().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();let t=this.elements,n=e.elements,r=1/as.setFromMatrixColumn(e,0).length(),i=1/as.setFromMatrixColumn(e,1).length(),a=1/as.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*i,t[5]=n[5]*i,t[6]=n[6]*i,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,r=e.y,i=e.z,a=Math.cos(n),o=Math.sin(n),s=Math.cos(r),c=Math.sin(r),l=Math.cos(i),u=Math.sin(i);if(e.order===`XYZ`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=-s*u,t[8]=c,t[1]=n+r*c,t[5]=e-i*c,t[9]=-o*s,t[2]=i-e*c,t[6]=r+n*c,t[10]=a*s}else if(e.order===`YXZ`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e+i*o,t[4]=r*o-n,t[8]=a*c,t[1]=a*u,t[5]=a*l,t[9]=-o,t[2]=n*o-r,t[6]=i+e*o,t[10]=a*s}else if(e.order===`ZXY`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e-i*o,t[4]=-a*u,t[8]=r+n*o,t[1]=n+r*o,t[5]=a*l,t[9]=i-e*o,t[2]=-a*c,t[6]=o,t[10]=a*s}else if(e.order===`ZYX`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=r*c-n,t[8]=e*c+i,t[1]=s*u,t[5]=i*c+e,t[9]=n*c-r,t[2]=-c,t[6]=o*s,t[10]=a*s}else if(e.order===`YZX`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=i-e*u,t[8]=r*u+n,t[1]=u,t[5]=a*l,t[9]=-o*l,t[2]=-c*l,t[6]=n*u+r,t[10]=e-i*u}else if(e.order===`XZY`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=-u,t[8]=c*l,t[1]=e*u+i,t[5]=a*l,t[9]=n*u-r,t[2]=r*u-n,t[6]=o*l,t[10]=i*u+e}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(ss,e,cs)}lookAt(e,t,n){let r=this.elements;return ds.subVectors(e,t),ds.lengthSq()===0&&(ds.z=1),ds.normalize(),ls.crossVectors(n,ds),ls.lengthSq()===0&&(Math.abs(n.z)===1?ds.x+=1e-4:ds.z+=1e-4,ds.normalize(),ls.crossVectors(n,ds)),ls.normalize(),us.crossVectors(ds,ls),r[0]=ls.x,r[4]=us.x,r[8]=ds.x,r[1]=ls.y,r[5]=us.y,r[9]=ds.y,r[2]=ls.z,r[6]=us.z,r[10]=ds.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[4],s=n[8],c=n[12],l=n[1],u=n[5],d=n[9],f=n[13],p=n[2],m=n[6],h=n[10],g=n[14],_=n[3],v=n[7],y=n[11],b=n[15],x=r[0],S=r[4],C=r[8],w=r[12],T=r[1],E=r[5],D=r[9],O=r[13],k=r[2],A=r[6],j=r[10],ee=r[14],M=r[3],N=r[7],P=r[11],te=r[15];return i[0]=a*x+o*T+s*k+c*M,i[4]=a*S+o*E+s*A+c*N,i[8]=a*C+o*D+s*j+c*P,i[12]=a*w+o*O+s*ee+c*te,i[1]=l*x+u*T+d*k+f*M,i[5]=l*S+u*E+d*A+f*N,i[9]=l*C+u*D+d*j+f*P,i[13]=l*w+u*O+d*ee+f*te,i[2]=p*x+m*T+h*k+g*M,i[6]=p*S+m*E+h*A+g*N,i[10]=p*C+m*D+h*j+g*P,i[14]=p*w+m*O+h*ee+g*te,i[3]=_*x+v*T+y*k+b*M,i[7]=_*S+v*E+y*A+b*N,i[11]=_*C+v*D+y*j+b*P,i[15]=_*w+v*O+y*ee+b*te,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[12],a=e[1],o=e[5],s=e[9],c=e[13],l=e[2],u=e[6],d=e[10],f=e[14],p=e[3],m=e[7],h=e[11],g=e[15],_=s*f-c*d,v=o*f-c*u,y=o*d-s*u,b=a*f-c*l,x=a*d-s*l,S=a*u-o*l;return t*(m*_-h*v+g*y)-n*(p*_-h*b+g*x)+r*(p*v-m*b+g*S)-i*(p*y-m*x+h*S)}determinantAffine(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[1],a=e[5],o=e[9],s=e[2],c=e[6],l=e[10];return t*(a*l-o*c)-n*(i*l-o*s)+r*(i*c-a*s)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=e[9],d=e[10],f=e[11],p=e[12],m=e[13],h=e[14],g=e[15],_=t*o-n*a,v=t*s-r*a,y=t*c-i*a,b=n*s-r*o,x=n*c-i*o,S=r*c-i*s,C=l*m-u*p,w=l*h-d*p,T=l*g-f*p,E=u*h-d*m,D=u*g-f*m,O=d*g-f*h,k=_*O-v*D+y*E+b*T-x*w+S*C;if(k===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let A=1/k;return e[0]=(o*O-s*D+c*E)*A,e[1]=(r*D-n*O-i*E)*A,e[2]=(m*S-h*x+g*b)*A,e[3]=(d*x-u*S-f*b)*A,e[4]=(s*T-a*O-c*w)*A,e[5]=(t*O-r*T+i*w)*A,e[6]=(h*y-p*S-g*v)*A,e[7]=(l*S-d*y+f*v)*A,e[8]=(a*D-o*T+c*C)*A,e[9]=(n*T-t*D-i*C)*A,e[10]=(p*x-m*y+g*_)*A,e[11]=(u*y-l*x-f*_)*A,e[12]=(o*w-a*E-s*C)*A,e[13]=(t*E-n*w+r*C)*A,e[14]=(m*v-p*b-h*_)*A,e[15]=(l*b-u*v+d*_)*A,this}scale(e){let t=this.elements,n=e.x,r=e.y,i=e.z;return t[0]*=n,t[4]*=r,t[8]*=i,t[1]*=n,t[5]*=r,t[9]*=i,t[2]*=n,t[6]*=r,t[10]*=i,t[3]*=n,t[7]*=r,t[11]*=i,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),r=Math.sin(t),i=1-n,a=e.x,o=e.y,s=e.z,c=i*a,l=i*o;return this.set(c*a+n,c*o-r*s,c*s+r*o,0,c*o+r*s,l*o+n,l*s-r*a,0,c*s-r*o,l*s+r*a,i*s*s+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,i,a){return this.set(1,n,i,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){let r=this.elements,i=t._x,a=t._y,o=t._z,s=t._w,c=i+i,l=a+a,u=o+o,d=i*c,f=i*l,p=i*u,m=a*l,h=a*u,g=o*u,_=s*c,v=s*l,y=s*u,b=n.x,x=n.y,S=n.z;return r[0]=(1-(m+g))*b,r[1]=(f+y)*b,r[2]=(p-v)*b,r[3]=0,r[4]=(f-y)*x,r[5]=(1-(d+g))*x,r[6]=(h+_)*x,r[7]=0,r[8]=(p+v)*S,r[9]=(h-_)*S,r[10]=(1-(d+m))*S,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){let r=this.elements;e.x=r[12],e.y=r[13],e.z=r[14];let i=this.determinantAffine();if(i===0)return n.set(1,1,1),t.identity(),this;let a=as.set(r[0],r[1],r[2]).length(),o=as.set(r[4],r[5],r[6]).length(),s=as.set(r[8],r[9],r[10]).length();i<0&&(a=-a),os.copy(this);let c=1/a,l=1/o,u=1/s;return os.elements[0]*=c,os.elements[1]*=c,os.elements[2]*=c,os.elements[4]*=l,os.elements[5]*=l,os.elements[6]*=l,os.elements[8]*=u,os.elements[9]*=u,os.elements[10]*=u,t.setFromRotationMatrix(os),n.x=a,n.y=o,n.z=s,this}makePerspective(e,t,n,r,i,a,o=uo,s=!1){let c=this.elements,l=2*i/(t-e),u=2*i/(n-r),d=(t+e)/(t-e),f=(n+r)/(n-r),p,m;if(s)p=i/(a-i),m=a*i/(a-i);else if(o===2e3)p=-(a+i)/(a-i),m=-2*a*i/(a-i);else if(o===2001)p=-a/(a-i),m=-a*i/(a-i);else throw Error(`THREE.Matrix4.makePerspective(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,r,i,a,o=uo,s=!1){let c=this.elements,l=2/(t-e),u=2/(n-r),d=-(t+e)/(t-e),f=-(n+r)/(n-r),p,m;if(s)p=1/(a-i),m=a/(a-i);else if(o===2e3)p=-2/(a-i),m=-(a+i)/(a-i);else if(o===2001)p=-1/(a-i),m=-i/(a-i);else throw Error(`THREE.Matrix4.makeOrthographic(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<16;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}},as=new q,os=new is,ss=new q(0,0,0),cs=new q(1,1,1),ls=new q,us=new q,ds=new q,fs=new is,ps=new Po,ms=class e{constructor(t=0,n=0,r=0,i=e.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=n,this._z=r,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let r=e.elements,i=r[0],a=r[4],o=r[8],s=r[1],c=r[5],l=r[9],u=r[2],d=r[6],f=r[10];switch(t){case`XYZ`:this._y=Math.asin(Do(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-l,f),this._z=Math.atan2(-a,i)):(this._x=Math.atan2(d,c),this._z=0);break;case`YXZ`:this._x=Math.asin(-Do(l,-1,1)),Math.abs(l)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(s,c)):(this._y=Math.atan2(-u,i),this._z=0);break;case`ZXY`:this._x=Math.asin(Do(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(s,i));break;case`ZYX`:this._y=Math.asin(-Do(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(s,i)):(this._x=0,this._z=Math.atan2(-a,c));break;case`YZX`:this._z=Math.asin(Do(s,-1,1)),Math.abs(s)<.9999999?(this._x=Math.atan2(-l,c),this._y=Math.atan2(-u,i)):(this._x=0,this._y=Math.atan2(o,f));break;case`XZY`:this._z=Math.asin(-Do(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(o,i)):(this._x=Math.atan2(-l,f),this._y=0);break;default:W(`Euler: .setFromRotationMatrix() encountered an unknown order: `+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return fs.makeRotationFromQuaternion(e),this.setFromRotationMatrix(fs,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return ps.setFromEuler(this),this.setFromQuaternion(ps,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};ms.DEFAULT_ORDER=`XYZ`;var hs=class{constructor(){this.mask=1}set(e){this.mask=1<<e>>>0}enable(e){this.mask|=1<<e}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e}disable(e){this.mask&=~(1<<e)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return!!(this.mask&1<<e)}},gs=0,_s=new q,vs=new Po,ys=new is,bs=new q,xs=new q,Ss=new q,Cs=new Po,ws=new q(1,0,0),Ts=new q(0,1,0),Es=new q(0,0,1),Ds={type:`added`},Os={type:`removed`},ks={type:`childadded`,child:null},As={type:`childremoved`,child:null},js=class e extends So{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:gs++}),this.uuid=Eo(),this.name=``,this.type=`Object3D`,this.parent=null,this.children=[],this.up=e.DEFAULT_UP.clone();let t=new q,n=new ms,r=new Po,i=new q(1,1,1);function a(){r.setFromEuler(n,!1)}function o(){n.setFromQuaternion(r,void 0,!1)}n._onChange(a),r._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:n},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new is},normalMatrix:{value:new Lo}}),this.matrix=new is,this.matrixWorld=new is,this.matrixAutoUpdate=e.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new hs,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale),this.pivot!==null&&this.position.copy(this.pivot).applyMatrix4(this.matrix).sub(this.pivot)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return vs.setFromAxisAngle(e,t),this.quaternion.multiply(vs),this}rotateOnWorldAxis(e,t){return vs.setFromAxisAngle(e,t),this.quaternion.premultiply(vs),this}rotateX(e){return this.rotateOnAxis(ws,e)}rotateY(e){return this.rotateOnAxis(Ts,e)}rotateZ(e){return this.rotateOnAxis(Es,e)}translateOnAxis(e,t){return _s.copy(e).applyQuaternion(this.quaternion),this.position.add(_s.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(ws,e)}translateY(e){return this.translateOnAxis(Ts,e)}translateZ(e){return this.translateOnAxis(Es,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(ys.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?bs.copy(e):bs.set(e,t,n);let r=this.parent;this.updateWorldMatrix(!0,!1),xs.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?ys.lookAt(xs,bs,this.up):ys.lookAt(bs,xs,this.up),this.quaternion.setFromRotationMatrix(ys),r&&(ys.extractRotation(r.matrixWorld),vs.setFromRotationMatrix(ys),this.quaternion.premultiply(vs.invert()))}add(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return e===this?(G(`Object3D.add: object can't be added as a child of itself.`,e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Ds),ks.child=e,this.dispatchEvent(ks),ks.child=null):G(`Object3D.add: object not an instance of THREE.Object3D.`,e),this)}remove(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.remove(arguments[e]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Os),As.child=e,this.dispatchEvent(As),As.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),ys.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),ys.multiply(e.parent.matrixWorld)),e.applyMatrix4(ys),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Ds),ks.child=e,this.dispatchEvent(ks),ks.child=null,this}getObjectById(e){return this.getObjectByProperty(`id`,e)}getObjectByName(e){return this.getObjectByProperty(`name`,e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){let r=this.children[n].getObjectByProperty(e,t);if(r!==void 0)return r}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let r=this.children;for(let i=0,a=r.length;i<a;i++)r[i].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(xs,e,Ss),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(xs,Cs,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}intersectsFrustum(){return!0}traverse(e){e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,r=e.z,i=this.matrix.elements;i[12]+=t-i[0]*t-i[4]*n-i[8]*r,i[13]+=n-i[1]*t-i[5]*n-i[9]*r,i[14]+=r-i[2]*t-i[6]*n-i[10]*r}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){let r=this.parent;if(e===!0&&r!==null&&r.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){let e=this.children;for(let t=0,r=e.length;t<r;t++)e[t].updateWorldMatrix(!1,!0,n)}}toJSON(e){let t=e===void 0||typeof e==`string`,n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:`Object`,generator:`Object3D.toJSON`});let r={};r.uuid=this.uuid,r.type=this.type,r.name=this.name,r.castShadow=this.castShadow,r.receiveShadow=this.receiveShadow,r.visible=this.visible,r.frustumCulled=this.frustumCulled,r.renderOrder=this.renderOrder,r.static=this.static,r.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.pivot!==null&&(r.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(r.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(r.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(r.type=`InstancedMesh`,r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type=`BatchedMesh`,r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(e=>({...e,boundingBox:e.boundingBox?e.boundingBox.toJSON():void 0,boundingSphere:e.boundingSphere?e.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(e=>({...e})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function i(t,n){return t[n.uuid]===void 0&&(t[n.uuid]=n.toJSON(e)),n.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=i(e.geometries,this.geometry);let t=this.geometry.parameters;if(t!==void 0&&t.shapes!==void 0){let n=t.shapes;if(Array.isArray(n))for(let t=0,r=n.length;t<r;t++){let r=n[t];i(e.shapes,r)}else i(e.shapes,n)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(i(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0){if(Array.isArray(this.material)){let t=[];for(let n=0,r=this.material.length;n<r;n++)t.push(i(e.materials,this.material[n]));r.material=t}else r.material=i(e.materials,this.material)}if(this.children.length>0){r.children=[];for(let t=0;t<this.children.length;t++)r.children.push(this.children[t].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let t=0;t<this.animations.length;t++){let n=this.animations[t];r.animations.push(i(e.animations,n))}}if(t){let t=a(e.geometries),r=a(e.materials),i=a(e.textures),o=a(e.images),s=a(e.shapes),c=a(e.skeletons),l=a(e.animations),u=a(e.nodes);t.length>0&&(n.geometries=t),r.length>0&&(n.materials=r),i.length>0&&(n.textures=i),o.length>0&&(n.images=o),s.length>0&&(n.shapes=s),c.length>0&&(n.skeletons=c),l.length>0&&(n.animations=l),u.length>0&&(n.nodes=u)}return n.object=r,n;function a(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot===null?null:e.pivot.clone(),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let t=0;t<e.children.length;t++){let n=e.children[t];this.add(n.clone())}return this}dispose(){this.dispatchEvent({type:`dispose`})}};js.DEFAULT_UP=new q(0,1,0),js.DEFAULT_MATRIX_AUTO_UPDATE=!0,js.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Ms=class extends js{constructor(){super(),this.isGroup=!0,this.type=`Group`}},Ns={type:`move`},Ps=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ms,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ms,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new q,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new q),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ms,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new q,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new q,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:`connected`,data:e}),this}disconnect(e){return this.dispatchEvent({type:`disconnected`,data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,i=null,a=null,o=this._targetRay,s=this._grip,c=this._hand;if(e&&t.session.visibilityState!==`visible-blurred`){if(c&&e.hand){a=!0;for(let r of e.hand.values()){let e=t.getJointPose(r,n),i=this._getHandJoint(c,r);e!==null&&(i.matrix.fromArray(e.transform.matrix),i.matrix.decompose(i.position,i.quaternion,i.scale),i.matrixWorldNeedsUpdate=!0,i.jointRadius=e.radius),i.visible=e!==null}let r=c.joints[`index-finger-tip`],i=c.joints[`thumb-tip`],o=r.position.distanceTo(i.position);c.inputState.pinching&&o>.025?(c.inputState.pinching=!1,this.dispatchEvent({type:`pinchend`,handedness:e.handedness,target:this})):!c.inputState.pinching&&o<=.015&&(c.inputState.pinching=!0,this.dispatchEvent({type:`pinchstart`,handedness:e.handedness,target:this}))}else s!==null&&e.gripSpace&&(i=t.getPose(e.gripSpace,n),i!==null&&(s.matrix.fromArray(i.transform.matrix),s.matrix.decompose(s.position,s.quaternion,s.scale),s.matrixWorldNeedsUpdate=!0,i.linearVelocity?(s.hasLinearVelocity=!0,s.linearVelocity.copy(i.linearVelocity)):s.hasLinearVelocity=!1,i.angularVelocity?(s.hasAngularVelocity=!0,s.angularVelocity.copy(i.angularVelocity)):s.hasAngularVelocity=!1,s.eventsEnabled&&s.dispatchEvent({type:`gripUpdated`,data:e,target:this})));o!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&i!==null&&(r=i),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Ns)))}return o!==null&&(o.visible=r!==null),s!==null&&(s.visible=i!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new Ms;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},Fs={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Is={h:0,s:0,l:0},Ls={h:0,s:0,l:0};function Rs(e,t,n){return n<0&&(n+=1),n>1&&--n,n<1/6?e+(t-e)*6*n:n<1/2?t:n<2/3?e+(t-e)*6*(2/3-n):e}var J=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let t=e;t&&t.isColor?this.copy(t):typeof t==`number`?this.setHex(t):typeof t==`string`&&this.setStyle(t)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=no){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Ho.colorSpaceToWorking(this,t),this}setRGB(e,t,n,r=Ho.workingColorSpace){return this.r=e,this.g=t,this.b=n,Ho.colorSpaceToWorking(this,r),this}setHSL(e,t,n,r=Ho.workingColorSpace){if(e=Oo(e,1),t=Do(t,0,1),n=Do(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,i=2*n-r;this.r=Rs(i,r,e+1/3),this.g=Rs(i,r,e),this.b=Rs(i,r,e-1/3)}return Ho.colorSpaceToWorking(this,r),this}setStyle(e,t=no){function n(t){t!==void 0&&parseFloat(t)<1&&W(`Color: Alpha component of `+e+` will be ignored.`)}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let i,a=r[1],o=r[2];switch(a){case`rgb`:case`rgba`:if(i=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(255,parseInt(i[1],10))/255,Math.min(255,parseInt(i[2],10))/255,Math.min(255,parseInt(i[3],10))/255,t);if(i=/^\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(100,parseFloat(i[1]))/100,Math.min(100,parseFloat(i[2]))/100,Math.min(100,parseFloat(i[3]))/100,t);break;case`hsl`:case`hsla`:if(i=/^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return n(i[4]),this.setHSL(parseFloat(i[1])/360,parseFloat(i[2])/100,parseFloat(i[3])/100,t);break;default:W(`Color: Unknown color model `+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){let n=r[1],i=n.length;if(i===3)return this.setRGB(parseInt(n.charAt(0),16)/15,parseInt(n.charAt(1),16)/15,parseInt(n.charAt(2),16)/15,t);if(i===6)return this.setHex(parseInt(n,16),t);W(`Color: Invalid hex color `+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=no){let n=Fs[e.toLowerCase()];return n===void 0?W(`Color: Unknown color `+e):this.setHex(n,t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Uo(e.r),this.g=Uo(e.g),this.b=Uo(e.b),this}copyLinearToSRGB(e){return this.r=Wo(e.r),this.g=Wo(e.g),this.b=Wo(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=no){return Ho.workingToColorSpace(zs.copy(this),e),Math.round(Do(zs.r*255,0,255))*65536+Math.round(Do(zs.g*255,0,255))*256+Math.round(Do(zs.b*255,0,255))}getHexString(e=no){return(`000000`+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Ho.workingColorSpace){Ho.workingToColorSpace(zs.copy(this),t);let n=zs.r,r=zs.g,i=zs.b,a=Math.max(n,r,i),o=Math.min(n,r,i),s,c,l=(o+a)/2;if(o===a)s=0,c=0;else{let e=a-o;switch(c=l<=.5?e/(a+o):e/(2-a-o),a){case n:s=(r-i)/e+(r<i?6:0);break;case r:s=(i-n)/e+2;break;case i:s=(n-r)/e+4}s/=6}return e.h=s,e.s=c,e.l=l,e}getRGB(e,t=Ho.workingColorSpace){return Ho.workingToColorSpace(zs.copy(this),t),e.r=zs.r,e.g=zs.g,e.b=zs.b,e}getStyle(e=no){Ho.workingToColorSpace(zs.copy(this),e);let t=zs.r,n=zs.g,r=zs.b;return e===`srgb`?`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`:`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`}offsetHSL(e,t,n){return this.getHSL(Is),this.setHSL(Is.h+e,Is.s+t,Is.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Is),e.getHSL(Ls);let n=ko(Is.h,Ls.h,t),r=ko(Is.s,Ls.s,t),i=ko(Is.l,Ls.l,t);return this.setHSL(n,r,i),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,r=this.b,i=e.elements;return this.r=i[0]*t+i[3]*n+i[6]*r,this.g=i[1]*t+i[4]*n+i[7]*r,this.b=i[2]*t+i[5]*n+i[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},zs=new J;J.NAMES=Fs;var Bs=class e{constructor(e,t=1,n=1e3){this.isFog=!0,this.name=``,this.color=new J(e),this.near=t,this.far=n}clone(){return new e(this.color,this.near,this.far)}toJSON(){return{type:`Fog`,name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}},Vs=class extends js{constructor(){super(),this.isScene=!0,this.type=`Scene`,this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new ms,this.environmentIntensity=1,this.environmentRotation=new ms,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}copy(e,t){return super.copy(e,t),this.background=e.background===null?null:e.background.clone(),this.environment=e.environment===null?null:e.environment.clone(),this.fog=e.fog===null?null:e.fog.clone(),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),this.overrideMaterial=e.overrideMaterial===null?null:e.overrideMaterial.clone(),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),t.object.backgroundBlurriness=this.backgroundBlurriness,t.object.backgroundIntensity=this.backgroundIntensity,t.object.backgroundRotation=this.backgroundRotation.toArray(),t.object.environmentIntensity=this.environmentIntensity,t.object.environmentRotation=this.environmentRotation.toArray(),t}},Hs=new q,Us=new q,Ws=new q,Gs=new q,Ks=new q,qs=new q,Js=new q,Ys=new q,Xs=new q,Zs=new q,Qs=new $o,$s=new $o,ec=new $o,tc=class e{constructor(e=new q,t=new q,n=new q){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),Hs.subVectors(e,t),r.cross(Hs);let i=r.lengthSq();return i>0?r.multiplyScalar(1/Math.sqrt(i)):r.set(0,0,0)}static getBarycoord(e,t,n,r,i){Hs.subVectors(r,t),Us.subVectors(n,t),Ws.subVectors(e,t);let a=Hs.dot(Hs),o=Hs.dot(Us),s=Hs.dot(Ws),c=Us.dot(Us),l=Us.dot(Ws),u=a*c-o*o;if(u===0)return i.set(0,0,0),null;let d=1/u,f=(c*s-o*l)*d,p=(a*l-o*s)*d;return i.set(1-f-p,p,f)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,Gs)!==null&&Gs.x>=0&&Gs.y>=0&&Gs.x+Gs.y<=1}static getInterpolation(e,t,n,r,i,a,o,s){return this.getBarycoord(e,t,n,r,Gs)===null?(s.x=0,s.y=0,`z`in s&&(s.z=0),`w`in s&&(s.w=0),null):(s.setScalar(0),s.addScaledVector(i,Gs.x),s.addScaledVector(a,Gs.y),s.addScaledVector(o,Gs.z),s)}static getInterpolatedAttribute(e,t,n,r,i,a){return Qs.setScalar(0),$s.setScalar(0),ec.setScalar(0),Qs.fromBufferAttribute(e,t),$s.fromBufferAttribute(e,n),ec.fromBufferAttribute(e,r),a.setScalar(0),a.addScaledVector(Qs,i.x),a.addScaledVector($s,i.y),a.addScaledVector(ec,i.z),a}static isFrontFacing(e,t,n,r){return Hs.subVectors(n,t),Us.subVectors(e,t),Hs.cross(Us).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Hs.subVectors(this.c,this.b),Us.subVectors(this.a,this.b),Hs.cross(Us).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return e.getNormal(this.a,this.b,this.c,t)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,n){return e.getBarycoord(t,this.a,this.b,this.c,n)}getInterpolation(t,n,r,i,a){return e.getInterpolation(t,this.a,this.b,this.c,n,r,i,a)}containsPoint(t){return e.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return e.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,r=this.b,i=this.c,a,o;Ks.subVectors(r,n),qs.subVectors(i,n),Ys.subVectors(e,n);let s=Ks.dot(Ys),c=qs.dot(Ys);if(s<=0&&c<=0)return t.copy(n);Xs.subVectors(e,r);let l=Ks.dot(Xs),u=qs.dot(Xs);if(l>=0&&u<=l)return t.copy(r);let d=s*u-l*c;if(d<=0&&s>=0&&l<=0&&s-l>0)return a=s/(s-l),t.copy(n).addScaledVector(Ks,a);Zs.subVectors(e,i);let f=Ks.dot(Zs),p=qs.dot(Zs);if(p>=0&&f<=p)return t.copy(i);let m=f*c-s*p;if(m<=0&&c>=0&&p<=0)return o=c/(c-p),t.copy(n).addScaledVector(qs,o);let h=l*p-f*u;if(h<=0&&u-l>=0&&f-p>=0)return Js.subVectors(i,r),o=(u-l)/(u-l+(f-p)),t.copy(r).addScaledVector(Js,o);let g=1/(h+m+d);return a=m*g,o=d*g,t.copy(n).addScaledVector(Ks,a).addScaledVector(qs,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},nc=class{constructor(e=new q(1/0,1/0,1/0),t=new q(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(ic.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(ic.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=ic.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute(`position`);if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0&&e.isBatchedMesh!==!0)for(let t=0,n=r.count;t<n;t++)e.isMesh===!0?e.getVertexPosition(t,ic):ic.fromBufferAttribute(r,t),ic.applyMatrix4(e.matrixWorld),this.expandByPoint(ic);else e.boundingBox===void 0?(n.boundingBox===null&&n.computeBoundingBox(),ac.copy(n.boundingBox)):(e.boundingBox===null&&e.computeBoundingBox(),ac.copy(e.boundingBox)),ac.applyMatrix4(e.matrixWorld),this.union(ac)}let r=e.children;for(let e=0,n=r.length;e<n;e++)this.expandByObject(r[e],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,ic),ic.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(fc),pc.subVectors(this.max,fc),oc.subVectors(e.a,fc),sc.subVectors(e.b,fc),cc.subVectors(e.c,fc),lc.subVectors(sc,oc),uc.subVectors(cc,sc),dc.subVectors(oc,cc);let t=[0,-lc.z,lc.y,0,-uc.z,uc.y,0,-dc.z,dc.y,lc.z,0,-lc.x,uc.z,0,-uc.x,dc.z,0,-dc.x,-lc.y,lc.x,0,-uc.y,uc.x,0,-dc.y,dc.x,0];return!gc(t,oc,sc,cc,pc)||(t=[1,0,0,0,1,0,0,0,1],!gc(t,oc,sc,cc,pc))?!1:(mc.crossVectors(lc,uc),t=[mc.x,mc.y,mc.z],gc(t,oc,sc,cc,pc))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,ic).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(ic).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()||(rc[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),rc[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),rc[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),rc[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),rc[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),rc[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),rc[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),rc[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(rc)),this}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},rc=[new q,new q,new q,new q,new q,new q,new q,new q],ic=new q,ac=new nc,oc=new q,sc=new q,cc=new q,lc=new q,uc=new q,dc=new q,fc=new q,pc=new q,mc=new q,hc=new q;function gc(e,t,n,r,i){for(let a=0,o=e.length-3;a<=o;a+=3){hc.fromArray(e,a);let o=i.x*Math.abs(hc.x)+i.y*Math.abs(hc.y)+i.z*Math.abs(hc.z),s=t.dot(hc),c=n.dot(hc),l=r.dot(hc);if(Math.max(-Math.max(s,c,l),Math.min(s,c,l))>o)return!1}return!0}var _c=new q,vc=new K,yc=0,bc=class extends So{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw TypeError(`THREE.BufferAttribute: array should be a Typed Array.`);this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:yc++}),this.name=``,this.array=e,this.itemSize=t,this.count=e===void 0?0:e.length/t,this.normalized=n,this.usage=so,this.updateRanges=[],this.gpuType=Yi,this.version=0,this._normalizationScale=e===void 0?void 0:jo(e)}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this._normalizationScale=e._normalizationScale,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,i=this.itemSize;r<i;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)vc.fromBufferAttribute(this,t),vc.applyMatrix3(e),this.setXY(t,vc.x,vc.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)_c.fromBufferAttribute(this,t),_c.applyMatrix3(e),this.setXYZ(t,_c.x,_c.y,_c.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)_c.fromBufferAttribute(this,t),_c.applyMatrix4(e),this.setXYZ(t,_c.x,_c.y,_c.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)_c.fromBufferAttribute(this,t),_c.applyNormalMatrix(e),this.setXYZ(t,_c.x,_c.y,_c.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)_c.fromBufferAttribute(this,t),_c.transformDirection(e),this.setXYZ(t,_c.x,_c.y,_c.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=this._denormalize(n)),n}setComponent(e,t,n){return this.normalized&&(n=this._normalize(n)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=this._denormalize(t)),t}setX(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=this._denormalize(t)),t}setY(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=this._denormalize(t)),t}setZ(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=this._denormalize(t)),t}setW(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),n=this._normalize(n)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),n=this._normalize(n),r=this._normalize(r)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,i){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),n=this._normalize(n),r=this._normalize(r),i=this._normalize(i)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=i,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return e.name=this.name,e.usage=this.usage,e.gpuType=this.gpuType,e}dispose(){this.dispatchEvent({type:`dispose`})}_denormalize(e){let t=this._normalizationScale;return t===void 0?Mo(e,this.array):Math.max(e/t,-1)}_normalize(e){let t=this._normalizationScale;return t===void 0?No(e,this.array):Math.round(e*t)}},xc=class extends bc{constructor(e,t,n){super(new Uint16Array(e),t,n)}},Sc=class extends bc{constructor(e,t,n){super(new Uint32Array(e),t,n)}},Cc=class extends bc{constructor(e,t,n){super(new Float32Array(e),t,n)}},wc=new nc,Tc=new q,Ec=new q,Dc=class{constructor(e=new q,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t===void 0?wc.setFromPoints(e).getCenter(n):n.copy(t);let r=0;for(let t=0,i=e.length;t<i;t++)r=Math.max(r,n.distanceToSquared(e[t]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius*=e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Tc.subVectors(e,this.center);let t=Tc.lengthSq();if(t>this.radius*this.radius){let e=Math.sqrt(t),n=(e-this.radius)*.5;this.center.addScaledVector(Tc,n/e),this.radius+=n}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Ec.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Tc.copy(e.center).add(Ec)),this.expandByPoint(Tc.copy(e.center).sub(Ec))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},Oc=0,kc=new is,Ac=new js,jc=new q,Mc=new nc,Nc=new nc,Pc=new q,Fc=class e extends So{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Oc++}),this.uuid=Eo(),this.name=``,this.type=`BufferGeometry`,this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return this.index=Array.isArray(e)?new(fo(e)?Sc:xc)(e,1):e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let t=new Lo().getNormalMatrix(e);n.applyNormalMatrix(t),n.needsUpdate=!0}let r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return kc.makeRotationFromQuaternion(e),this.applyMatrix4(kc),this}rotateX(e){return kc.makeRotationX(e),this.applyMatrix4(kc),this}rotateY(e){return kc.makeRotationY(e),this.applyMatrix4(kc),this}rotateZ(e){return kc.makeRotationZ(e),this.applyMatrix4(kc),this}translate(e,t,n){return kc.makeTranslation(e,t,n),this.applyMatrix4(kc),this}scale(e,t,n){return kc.makeScale(e,t,n),this.applyMatrix4(kc),this}lookAt(e){return Ac.lookAt(e),Ac.updateMatrix(),this.applyMatrix4(Ac.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(jc).negate(),this.translate(jc.x,jc.y,jc.z),this}setFromPoints(e){let t=this.getAttribute(`position`);if(t===void 0){let t=[];for(let n=0,r=e.length;n<r;n++){let r=e[n];t.push(r.x,r.y,r.z||0)}this.setAttribute(`position`,new Cc(t,3))}else{let n=Math.min(e.length,t.count);for(let r=0;r<n;r++){let n=e[r];t.setXYZ(r,n.x,n.y,n.z||0)}e.length>t.count&&W(`BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.`),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new nc);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute)G(`BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.`,this),this.boundingBox.set(new q(-1/0,-1/0,-1/0),new q(1/0,1/0,1/0));else{if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];Mc.setFromBufferAttribute(n),this.morphTargetsRelative?(Pc.addVectors(this.boundingBox.min,Mc.min),this.boundingBox.expandByPoint(Pc),Pc.addVectors(this.boundingBox.max,Mc.max),this.boundingBox.expandByPoint(Pc)):(this.boundingBox.expandByPoint(Mc.min),this.boundingBox.expandByPoint(Mc.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&G(`BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.`,this)}}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Dc);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute)G(`BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.`,this),this.boundingSphere.set(new q,1/0);else if(e){let n=this.boundingSphere.center;if(Mc.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];Nc.setFromBufferAttribute(n),this.morphTargetsRelative?(Pc.addVectors(Mc.min,Nc.min),Mc.expandByPoint(Pc),Pc.addVectors(Mc.max,Nc.max),Mc.expandByPoint(Pc)):(Mc.expandByPoint(Nc.min),Mc.expandByPoint(Nc.max))}Mc.getCenter(n);let r=0;for(let t=0,i=e.count;t<i;t++)Pc.fromBufferAttribute(e,t),r=Math.max(r,n.distanceToSquared(Pc));if(t)for(let i=0,a=t.length;i<a;i++){let a=t[i],o=this.morphTargetsRelative;for(let t=0,i=a.count;t<i;t++)Pc.fromBufferAttribute(a,t),o&&(jc.fromBufferAttribute(e,t),Pc.add(jc)),r=Math.max(r,n.distanceToSquared(Pc))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&G(`BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.`,this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){G(`BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)`);return}let n=t.position,r=t.normal,i=t.uv,a=this.getAttribute(`tangent`);(a===void 0||a.count!==n.count)&&(a=new bc(new Float32Array(4*n.count),4),this.setAttribute(`tangent`,a));let o=[],s=[],c=new Uint8Array(n.count);for(let e=0;e<n.count;e++)o[e]=new q,s[e]=new q;let l=new q,u=new q,d=new q,f=new K,p=new K,m=new K,h=new q,g=new q;function _(e,t,r){c[e]=c[t]=c[r]=1,l.fromBufferAttribute(n,e),u.fromBufferAttribute(n,t),d.fromBufferAttribute(n,r),f.fromBufferAttribute(i,e),p.fromBufferAttribute(i,t),m.fromBufferAttribute(i,r),u.sub(l),d.sub(l),p.sub(f),m.sub(f);let a=1/(p.x*m.y-m.x*p.y);isFinite(a)&&(h.copy(u).multiplyScalar(m.y).addScaledVector(d,-p.y).multiplyScalar(a),g.copy(d).multiplyScalar(p.x).addScaledVector(u,-m.x).multiplyScalar(a),o[e].add(h),o[t].add(h),o[r].add(h),s[e].add(g),s[t].add(g),s[r].add(g))}let v=this.groups;v.length===0&&(v=[{start:0,count:e.count}]);for(let t=0,n=v.length;t<n;++t){let n=v[t],r=n.start,i=n.count;for(let t=r,n=r+i;t<n;t+=3)_(e.getX(t+0),e.getX(t+1),e.getX(t+2))}let y=new q,b=new q,x=new q,S=new q;function C(e){x.fromBufferAttribute(r,e),S.copy(x);let t=o[e];y.copy(t),y.sub(x.multiplyScalar(x.dot(t))).normalize(),b.crossVectors(S,t);let n=b.dot(s[e])<0?-1:1;a.setXYZW(e,y.x,y.y,y.z,n)}for(let e=0,t=n.count;e<t;++e)c[e]&&C(e);this._transformed=!0}computeVertexNormals(){let e=this.index,t=this.getAttribute(`position`);if(t!==void 0){let n=this.getAttribute(`normal`);if(n===void 0||n.count!==t.count)n=new bc(new Float32Array(t.count*3),3),this.setAttribute(`normal`,n);else for(let e=0,t=n.count;e<t;e++)n.setXYZ(e,0,0,0);let r=new q,i=new q,a=new q,o=new q,s=new q,c=new q,l=new q,u=new q;if(e)for(let d=0,f=e.count;d<f;d+=3){let f=e.getX(d+0),p=e.getX(d+1),m=e.getX(d+2);r.fromBufferAttribute(t,f),i.fromBufferAttribute(t,p),a.fromBufferAttribute(t,m),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),o.fromBufferAttribute(n,f),s.fromBufferAttribute(n,p),c.fromBufferAttribute(n,m),o.add(l),s.add(l),c.add(l),n.setXYZ(f,o.x,o.y,o.z),n.setXYZ(p,s.x,s.y,s.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let e=0,o=t.count;e<o;e+=3)r.fromBufferAttribute(t,e+0),i.fromBufferAttribute(t,e+1),a.fromBufferAttribute(t,e+2),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),n.setXYZ(e+0,l.x,l.y,l.z),n.setXYZ(e+1,l.x,l.y,l.z),n.setXYZ(e+2,l.x,l.y,l.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Pc.fromBufferAttribute(e,t),Pc.normalize(),e.setXYZ(t,Pc.x,Pc.y,Pc.z)}toNonIndexed(){function t(e,t){let n=e.array,r=e.itemSize,i=e.normalized,a=new n.constructor(t.length*r),o=0,s=0;for(let i=0,c=t.length;i<c;i++){o=e.isInterleavedBufferAttribute?t[i]*e.data.stride+e.offset:t[i]*r;for(let e=0;e<r;e++)a[s++]=n[o++]}return new bc(a,r,i)}if(this.index===null)return W(`BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed.`),this;let n=new e,r=this.index.array,i=this.attributes;for(let e in i){let a=i[e],o=t(a,r);n.setAttribute(e,o)}let a=this.morphAttributes;for(let e in a){let i=[],o=a[e];for(let e=0,n=o.length;e<n;e++){let n=o[e],a=t(n,r);i.push(a)}n.morphAttributes[e]=i}n.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let e=0,t=o.length;e<t;e++){let t=o[e];n.addGroup(t.start,t.count,t.materialIndex)}return n}toJSON(){let e={metadata:{version:4.7,type:`BufferGeometry`,generator:`BufferGeometry.toJSON`}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?`BufferGeometry`:this.type,e.name=this.name,Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let t=this.parameters;for(let n in t)t[n]!==void 0&&(e[n]=t[n]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let t in n){let r=n[t];e.data.attributes[t]=r.toJSON(e.data)}let r={},i=!1;for(let t in this.morphAttributes){let n=this.morphAttributes[t],a=[];for(let t=0,r=n.length;t<r;t++){let r=n[t];a.push(r.toJSON(e.data))}a.length>0&&(r[t]=a,i=!0)}i&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let r=e.attributes;for(let e in r){let n=r[e];this.setAttribute(e,n.clone(t))}let i=e.morphAttributes;for(let e in i){let n=[],r=i[e];for(let e=0,i=r.length;e<i;e++)n.push(r[e].clone(t));this.morphAttributes[e]=n}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let e=0,t=a.length;e<t;e++){let t=a[e];this.addGroup(t.start,t.count,t.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let s=e.boundingSphere;return s!==null&&(this.boundingSphere=s.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:`dispose`})}},Ic=new q,Lc=new q,Rc=new Lo,zc=class{constructor(e=new q(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let r=Ic.subVectors(n,t).cross(Lc.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){let r=e.delta(Ic),i=this.normal.dot(r);if(i===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let a=-(e.start.dot(this.normal)+this.constant)/i;return n===!0&&(a<0||a>1)?null:t.copy(e.start).addScaledVector(r,a)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||Rc.getNormalMatrix(e),r=this.coplanarPoint(Ic).applyMatrix4(e),i=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(i),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(e){return this.normal.fromArray(e.normal),this.constant=e.constant,this}},Bc=0,Vc=class extends So{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Bc++}),this.uuid=Eo(),this.name=``,this.type=`Material`,this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new J(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=oo,this.stencilZFail=oo,this.stencilZPass=oo,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){W(`Material: parameter '${t}' has value of undefined.`);continue}let r=this[t];r===void 0?W(`Material: '${t}' is not a property of THREE.${this.type}.`):r&&r.isColor?r.set(n):r&&r.isVector2&&n&&n.isVector2||r&&r.isEuler&&n&&n.isEuler||r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:`Material`,generator:`Material.toJSON`}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.diffuseRoughness!==void 0&&(n.diffuseRoughness=this.diffuseRoughness),this.diffuseRoughnessMap&&this.diffuseRoughnessMap.isTexture&&(n.diffuseRoughnessMap=this.diffuseRoughnessMap.toJSON(e).uuid),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessMinimum!==void 0&&(n.iridescenceThicknessMinimum=this.iridescenceThicknessMinimum),this.iridescenceThicknessMaximum!==void 0&&(n.iridescenceThicknessMaximum=this.iridescenceThicknessMaximum),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(e=>e.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}if(t){let t=r(e.textures),i=r(e.images);t.length>0&&(n.textures=t),i.length>0&&(n.images=i)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new J().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.diffuseRoughness!==void 0&&(this.diffuseRoughness=e.diffuseRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.retroreflectivity!==void 0&&(this.retroreflectivity=e.retroreflectivity),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessMinimum!==void 0&&(this.iridescenceThicknessMinimum=e.iridescenceThicknessMinimum),e.iridescenceThicknessMaximum!==void 0&&(this.iridescenceThicknessMaximum=e.iridescenceThicknessMaximum),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessMinimum=e.iridescenceThicknessRange[0],this.iridescenceThicknessMaximum=e.iridescenceThicknessRange[1]),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.clippingPlanes!==void 0&&(this.clippingPlanes=e.clippingPlanes.map(e=>new zc().fromJSON(e))),e.clipIntersection!==void 0&&(this.clipIntersection=e.clipIntersection),e.clipShadows!==void 0&&(this.clipShadows=e.clipShadows),e.depthPacking!==void 0&&(this.depthPacking=e.depthPacking),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.linecap!==void 0&&(this.linecap=e.linecap),e.linejoin!==void 0&&(this.linejoin=e.linejoin),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(this.vertexColors=typeof e.vertexColors==`number`?e.vertexColors>0:e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let t=e.normalScale;Array.isArray(t)===!1&&(t=[t,t]),this.normalScale=new K().fromArray(t)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new K().fromArray(e.clearcoatNormalScale)),e.diffuseRoughnessMap!==void 0&&(this.diffuseRoughnessMap=t[e.diffuseRoughnessMap]||null),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let e=t.length;n=Array(e);for(let r=0;r!==e;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:`dispose`})}set needsUpdate(e){e===!0&&this.version++}},Hc=new q,Uc=new q,Wc=new q,Gc=new q,Kc=class{constructor(e=new q,t=new q(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Hc)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Hc.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Hc.copy(this.origin).addScaledVector(this.direction,t),Hc.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){Uc.copy(e).add(t).multiplyScalar(.5),Wc.copy(t).sub(e).normalize(),Gc.copy(this.origin).sub(Uc);let i=e.distanceTo(t)*.5,a=-this.direction.dot(Wc),o=Gc.dot(this.direction),s=-Gc.dot(Wc),c=Gc.lengthSq(),l=Math.abs(1-a*a),u,d,f,p;if(l>0){if(u=a*s-o,d=a*o-s,p=i*l,u>=0){if(d>=-p){if(d<=p){let e=1/l;u*=e,d*=e,f=u*(u+a*d+2*o)+d*(a*u+d+2*s)+c}else d=i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c}else d=-i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c}else d<=-p?(u=Math.max(0,-(-a*i+o)),d=u>0?-i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c):d<=p?(u=0,d=Math.min(Math.max(-i,-s),i),f=d*(d+2*s)+c):(u=Math.max(0,-(a*i+o)),d=u>0?i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c)}else d=a>0?-i:i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),r&&r.copy(Uc).addScaledVector(Wc,d),f}intersectSphere(e,t){if(e.radius<0)return null;Hc.subVectors(e.center,this.origin);let n=Hc.dot(this.direction),r=Hc.dot(Hc)-n*n,i=e.radius*e.radius;if(r>i)return null;let a=Math.sqrt(i-r),o=n-a,s=n+a;return s<0?null:o<0?this.at(s,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,i,a,o,s,c=1/this.direction.x,l=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,r=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,r=(e.min.x-d.x)*c),l>=0?(i=(e.min.y-d.y)*l,a=(e.max.y-d.y)*l):(i=(e.max.y-d.y)*l,a=(e.min.y-d.y)*l),n>a||i>r||((i>n||isNaN(n))&&(n=i),(a<r||isNaN(r))&&(r=a),u>=0?(o=(e.min.z-d.z)*u,s=(e.max.z-d.z)*u):(o=(e.max.z-d.z)*u,s=(e.min.z-d.z)*u),n>s||o>r)||((o>n||n!==n)&&(n=o),(s<r||r!==r)&&(r=s),r<0)?null:this.at(n>=0?n:r,t)}intersectsBox(e){return this.intersectBox(e,Hc)!==null}intersectTriangle(e,t,n,r,i){let a=this.origin,o=this.direction,s=o.x,c=o.y,l=o.z,u=e.x-a.x,d=e.y-a.y,f=e.z-a.z,p=t.x-a.x,m=t.y-a.y,h=t.z-a.z,g=n.x-a.x,_=n.y-a.y,v=n.z-a.z,y=Math.abs(s),b=Math.abs(c),x=Math.abs(l),S,C,w,T,E,D,O,k,A,j,ee,M;if(y>=b&&y>=x?(w=s,D=u,A=p,M=g,s>=0?(S=c,C=l,T=d,E=f,O=m,k=h,j=_,ee=v):(S=l,C=c,T=f,E=d,O=h,k=m,j=v,ee=_)):b>=x?(w=c,D=d,A=m,M=_,c>=0?(S=l,C=s,T=f,E=u,O=h,k=p,j=v,ee=g):(S=s,C=l,T=u,E=f,O=p,k=h,j=g,ee=v)):(w=l,D=f,A=h,M=v,l>=0?(S=s,C=c,T=u,E=d,O=p,k=m,j=g,ee=_):(S=c,C=s,T=d,E=u,O=m,k=p,j=_,ee=g)),w===0)return null;let N=S/w,P=C/w,te=1/w,ne=T-N*D,re=E-P*D,ie=O-N*A,ae=k-P*A,oe=j-N*M,se=ee-P*M,ce=oe*ae-se*ie,le=ne*se-re*oe,ue=ie*re-ae*ne;if(r){if(ce<0||le<0||ue<0)return null}else if((ce<0||le<0||ue<0)&&(ce>0||le>0||ue>0))return null;let de=ce+le+ue;if(de===0)return null;let fe=te*(ce*D+le*A+ue*M);return(de>0?fe<0:fe>0)?null:this.at(fe/de,i)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},qc=class extends Vc{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type=`MeshBasicMaterial`,this.color=new J(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new ms,this.combine=0,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},Jc=new is,Yc=new Kc,Xc=new Dc,Zc=new q,Qc=new q,$c=new q,el=new q,tl=new q,nl=new q,rl=new q,il=new q,al=class extends js{constructor(e=new Fc,t=new qc){super(),this.isMesh=!0,this.type=`Mesh`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.morphTargetInfluences=e.morphTargetInfluences===void 0?void 0:e.morphTargetInfluences.slice(),this.morphTargetDictionary=e.morphTargetDictionary===void 0?void 0:Object.assign({},e.morphTargetDictionary),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}getVertexPosition(e,t){let n=this.geometry,r=n.attributes.position,i=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(r,e);let o=this.morphTargetInfluences;if(i&&o){nl.set(0,0,0);for(let n=0,r=i.length;n<r;n++){let r=o[n],s=i[n];r!==0&&(tl.fromBufferAttribute(s,e),a?nl.addScaledVector(tl,r):nl.addScaledVector(tl.sub(t),r))}t.add(nl)}return t}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let n=this.geometry,r=this.material,i=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Xc.copy(n.boundingSphere),Xc.applyMatrix4(i),Yc.copy(e.ray).recast(e.near),Xc.containsPoint(Yc.origin)===!1&&(Yc.intersectSphere(Xc,Zc)===null||Yc.origin.distanceToSquared(Zc)>(e.far-e.near)**2)||(Jc.copy(i).invert(),Yc.copy(e.ray).applyMatrix4(Jc),(n.boundingBox===null||Yc.intersectsBox(n.boundingBox)!==!1)&&this._computeIntersections(e,t,Yc)))}_computeIntersections(e,t,n){let r,i=this.geometry,a=this.material,o=i.index,s=i.attributes.position,c=i.attributes.uv,l=i.attributes.uv1,u=i.attributes.normal,d=i.groups,f=i.drawRange;if(o!==null){if(Array.isArray(a))for(let i=0,s=d.length;i<s;i++){let s=d[i],p=a[s.materialIndex],m=Math.max(s.start,f.start),h=Math.min(o.count,Math.min(s.start+s.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=o.getX(i),d=o.getX(i+1),f=o.getX(i+2);r=sl(this,p,e,n,c,l,u,a,d,f),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=s.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),s=Math.min(o.count,f.start+f.count);for(let d=i,f=s;d<f;d+=3){let i=o.getX(d),s=o.getX(d+1),f=o.getX(d+2);r=sl(this,a,e,n,c,l,u,i,s,f),r&&(r.faceIndex=Math.floor(d/3),t.push(r))}}}else if(s!==void 0){if(Array.isArray(a))for(let i=0,o=d.length;i<o;i++){let o=d[i],p=a[o.materialIndex],m=Math.max(o.start,f.start),h=Math.min(s.count,Math.min(o.start+o.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=i,s=i+1,d=i+2;r=sl(this,p,e,n,c,l,u,a,s,d),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=o.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),o=Math.min(s.count,f.start+f.count);for(let s=i,d=o;s<d;s+=3){let i=s,o=s+1,d=s+2;r=sl(this,a,e,n,c,l,u,i,o,d),r&&(r.faceIndex=Math.floor(s/3),t.push(r))}}}}};function ol(e,t,n,r,i,a,o,s){let c;if(c=t.side===1?r.intersectTriangle(o,a,i,!0,s):r.intersectTriangle(i,a,o,t.side===0,s),c===null)return null;il.copy(s),il.applyMatrix4(e.matrixWorld);let l=n.ray.origin.distanceTo(il);return l<n.near||l>n.far?null:{distance:l,point:il.clone(),object:e}}function sl(e,t,n,r,i,a,o,s,c,l){e.getVertexPosition(s,Qc),e.getVertexPosition(c,$c),e.getVertexPosition(l,el);let u=ol(e,t,n,r,Qc,$c,el,rl);if(u){let e=new q;tc.getBarycoord(rl,Qc,$c,el,e),i&&(u.uv=tc.getInterpolatedAttribute(i,s,c,l,e,new K)),a&&(u.uv1=tc.getInterpolatedAttribute(a,s,c,l,e,new K)),o&&(u.normal=tc.getInterpolatedAttribute(o,s,c,l,e,new q),u.normal.dot(r.direction)>0&&u.normal.multiplyScalar(-1));let t={a:s,b:c,c:l,normal:new q,materialIndex:0};tc.getNormal(Qc,$c,el,t.normal),u.face=t,u.barycoord=e}return u}var cl=class extends Qo{constructor(e=null,t=1,n=1,r,i,a,o,s,c=Li,l=Li,u,d){super(null,a,o,s,c,l,r,i,u,d),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},ll=class extends bc{constructor(e,t,n,r=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=r}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},ul=new is,dl=new is,fl=[],pl=new nc,ml=new is,hl=new al,gl=new Dc,_l=class extends al{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new ll(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let e=0;e<n;e++)this.setMatrixAt(e,ml)}computeBoundingBox(){let e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new nc),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,ul),pl.copy(e.boundingBox).applyMatrix4(ul),this.boundingBox.union(pl)}computeBoundingSphere(){let e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new Dc),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,ul),gl.copy(e.boundingSphere).applyMatrix4(ul),this.boundingSphere.union(gl)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),this.morphTexture=e.morphTexture===null?null:e.morphTexture.clone(),this.instanceColor=e.instanceColor===null?null:e.instanceColor.clone(),this.count=e.count,this.boundingBox=e.boundingBox===null?null:e.boundingBox.clone(),this.boundingSphere=e.boundingSphere===null?null:e.boundingSphere.clone(),this}getColorAt(e,t){return this.instanceColor===null?t.setRGB(1,1,1):t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){return t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){let n=t.morphTargetInfluences,r=this.morphTexture.source.data.data,i=e*(n.length+1)+1;for(let e=0;e<n.length;e++)n[e]=r[i+e]}raycast(e,t){let n=this.matrixWorld,r=this.count;if(hl.geometry=this.geometry,hl.material=this.material,hl.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),gl.copy(this.boundingSphere),gl.applyMatrix4(n),e.ray.intersectsSphere(gl)!==!1))for(let i=0;i<r;i++){this.getMatrixAt(i,ul),dl.multiplyMatrices(n,ul),hl.matrixWorld=dl,hl.raycast(e,fl);for(let e=0,n=fl.length;e<n;e++){let n=fl[e];n.instanceId=i,n.object=this,t.push(n)}fl.length=0}}setColorAt(e,t){return this.instanceColor===null&&(this.instanceColor=new ll(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3),this}setMatrixAt(e,t){return t.toArray(this.instanceMatrix.array,e*16),this}setMorphAt(e,t){let n=t.morphTargetInfluences,r=n.length+1;this.morphTexture===null&&(this.morphTexture=new cl(new Float32Array(r*this.count),r,this.count,sa,Yi));let i=this.morphTexture.source.data.data,a=0;for(let e=0;e<n.length;e++)a+=n[e];let o=this.geometry.morphTargetsRelative?1:1-a,s=r*e;return i[s]=o,i.set(n,s+1),this}updateMorphTargets(){}dispose(){super.dispose(),this.instanceMatrix.dispose(),this.instanceColor!==null&&this.instanceColor.dispose(),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},vl=new Dc,yl=new K(.5,.5),bl=new q,xl=class{constructor(e=new zc,t=new zc,n=new zc,r=new zc,i=new zc,a=new zc){this.planes=[e,t,n,r,i,a]}set(e,t,n,r,i,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(r),o[4].copy(i),o[5].copy(a),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=uo,n=!1){let r=this.planes,i=e.elements,a=i[0],o=i[1],s=i[2],c=i[3],l=i[4],u=i[5],d=i[6],f=i[7],p=i[8],m=i[9],h=i[10],g=i[11],_=i[12],v=i[13],y=i[14],b=i[15];if(r[0].setComponents(c-a,f-l,g-p,b-_).normalize(),r[1].setComponents(c+a,f+l,g+p,b+_).normalize(),r[2].setComponents(c+o,f+u,g+m,b+v).normalize(),r[3].setComponents(c-o,f-u,g-m,b-v).normalize(),n)r[4].setComponents(s,d,h,y).normalize(),r[5].setComponents(c-s,f-d,g-h,b-y).normalize();else if(r[4].setComponents(c-s,f-d,g-h,b-y).normalize(),t===2e3)r[5].setComponents(c+s,f+d,g+h,b+y).normalize();else if(t===2001)r[5].setComponents(s,d,h,y).normalize();else throw Error(`THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: `+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),vl.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),vl.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(vl)}intersectsSprite(e){return vl.center.set(0,0,0),vl.radius=.7071067811865476+yl.distanceTo(e.center),vl.applyMatrix4(e.matrixWorld),this.intersectsSphere(vl)}intersectsSphere(e){let t=this.planes,n=e.center,r=-e.radius;for(let e=0;e<6;e++)if(t[e].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let r=t[n];if(bl.x=r.normal.x>0?e.max.x:e.min.x,bl.y=r.normal.y>0?e.max.y:e.min.y,bl.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(bl)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}},Sl=new is,Cl=class e{constructor(){this.coordinateSystem=uo,this._frustums=[],this._count=0}setFromArrayCamera(e){let t=e.cameras,n=this._frustums;for(let e=0;e<t.length;e++){let r=t[e];Sl.multiplyMatrices(r.projectionMatrix,r.matrixWorldInverse),n[e]===void 0&&(n[e]=new xl),n[e].setFromProjectionMatrix(Sl,r.coordinateSystem,r.reversedDepth)}return this._count=t.length,this}getFrustum(e){return this._frustums[e]}intersectsObject(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsObject(e))return!0;return!1}intersectsSprite(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsSprite(e))return!0;return!1}intersectsSphere(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsSphere(e))return!0;return!1}intersectsBox(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsBox(e))return!0;return!1}containsPoint(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].containsPoint(e))return!0;return!1}copy(e){this.coordinateSystem=e.coordinateSystem;let t=this._frustums,n=e._frustums;for(let r=0;r<e._count;r++)t[r]===void 0&&(t[r]=new xl),t[r].copy(n[r]);return this._count=e._count,this}clone(){return new e().copy(this)}},wl=class extends Vc{constructor(e){super(),this.isLineBasicMaterial=!0,this.type=`LineBasicMaterial`,this.color=new J(16777215),this.map=null,this.linewidth=1,this.linecap=`round`,this.linejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},Tl=new q,El=new q,Dl=new is,Ol=new Kc,kl=new Dc,Al=new q,jl=new q,Ml=class extends js{constructor(e=new Fc,t=new wl){super(),this.isLine=!0,this.type=`Line`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.morphTargetInfluences=e.morphTargetInfluences===void 0?void 0:e.morphTargetInfluences.slice(),this.morphTargetDictionary=e.morphTargetDictionary===void 0?void 0:Object.assign({},e.morphTargetDictionary),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[0];for(let e=1,r=t.count;e<r;e++)Tl.fromBufferAttribute(t,e-1),El.fromBufferAttribute(t,e),n[e]=n[e-1],n[e]+=Tl.distanceTo(El);e.setAttribute(`lineDistance`,new Cc(n,1))}else W(`Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.`);return this}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let n=this.geometry,r=this.matrixWorld,i=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),kl.copy(n.boundingSphere),kl.applyMatrix4(r),kl.radius+=i,e.ray.intersectsSphere(kl)===!1)return;Dl.copy(r).invert(),Ol.copy(e.ray).applyMatrix4(Dl);let o=i/((this.scale.x+this.scale.y+this.scale.z)/3),s=o*o,c=this.isLineSegments?2:1,l=n.index,u=n.attributes.position;if(l!==null){let n=Math.max(0,a.start),r=Math.min(l.count,a.start+a.count);for(let i=n,a=r-1;i<a;i+=c){let n=l.getX(i),r=l.getX(i+1),a=Nl(this,e,Ol,s,n,r,i);a&&t.push(a)}if(this.isLineLoop){let i=l.getX(r-1),a=l.getX(n),o=Nl(this,e,Ol,s,i,a,r-1);o&&t.push(o)}}else{let n=Math.max(0,a.start),r=Math.min(u.count,a.start+a.count);for(let i=n,a=r-1;i<a;i+=c){let n=Nl(this,e,Ol,s,i,i+1,i);n&&t.push(n)}if(this.isLineLoop){let i=Nl(this,e,Ol,s,r-1,n,r-1);i&&t.push(i)}}}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}};function Nl(e,t,n,r,i,a,o){let s=e.geometry.attributes.position;if(Tl.fromBufferAttribute(s,i),El.fromBufferAttribute(s,a),n.distanceSqToSegment(Tl,El,Al,jl)>r)return;Al.applyMatrix4(e.matrixWorld);let c=t.ray.origin.distanceTo(Al);if(!(c<t.near||c>t.far))return{distance:c,point:jl.clone().applyMatrix4(e.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:e}}var Pl=new q,Fl=new q,Il=class extends Ml{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type=`LineSegments`}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[];for(let e=0,r=t.count;e<r;e+=2)Pl.fromBufferAttribute(t,e),Fl.fromBufferAttribute(t,e+1),n[e]=e===0?0:n[e-1],n[e+1]=n[e]+Pl.distanceTo(Fl);e.setAttribute(`lineDistance`,new Cc(n,1))}else W(`LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.`);return this}},Ll=class extends Vc{constructor(e){super(),this.isPointsMaterial=!0,this.type=`PointsMaterial`,this.color=new J(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},Rl=new is,zl=new Kc,Bl=new Dc,Vl=new q,Hl=class extends js{constructor(e=new Fc,t=new Ll){super(),this.isPoints=!0,this.type=`Points`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.morphTargetInfluences=e.morphTargetInfluences===void 0?void 0:e.morphTargetInfluences.slice(),this.morphTargetDictionary=e.morphTargetDictionary===void 0?void 0:Object.assign({},e.morphTargetDictionary),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let n=this.geometry,r=this.matrixWorld,i=e.params.Points.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Bl.copy(n.boundingSphere),Bl.applyMatrix4(r),Bl.radius+=i,e.ray.intersectsSphere(Bl)===!1)return;Rl.copy(r).invert(),zl.copy(e.ray).applyMatrix4(Rl);let o=i/((this.scale.x+this.scale.y+this.scale.z)/3),s=o*o,c=n.index,l=n.attributes.position;if(c!==null){let n=Math.max(0,a.start),i=Math.min(c.count,a.start+a.count);for(let a=n,o=i;a<o;a++){let n=c.getX(a);Vl.fromBufferAttribute(l,n),Ul(Vl,n,s,r,e,t,this)}}else{let n=Math.max(0,a.start),i=Math.min(l.count,a.start+a.count);for(let a=n,o=i;a<o;a++)Vl.fromBufferAttribute(l,a),Ul(Vl,a,s,r,e,t,this)}}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}};function Ul(e,t,n,r,i,a,o){let s=zl.distanceSqToPoint(e);if(s<n){let n=new q;zl.closestPointToPoint(e,n),n.applyMatrix4(r);let c=i.ray.origin.distanceTo(n);if(c<i.near||c>i.far)return;a.push({distance:c,distanceToRay:Math.sqrt(s),point:n,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}var Wl=class extends Qo{constructor(e=[],t=301,n,r,i,a,o,s,c,l){super(e,t,n,r,i,a,o,s,c,l),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},Gl=class extends Qo{constructor(e,t,n,r,i,a,o,s,c){super(e,t,n,r,i,a,o,s,c),this.isCanvasTexture=!0,this.needsUpdate=!0}},Kl=class extends Qo{constructor(e,t,n=Ji,r,i,a,o=Li,s=Li,c,l=aa,u=1){if(l!==1026&&l!==1027)throw Error(`THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat`);super({width:e,height:t,depth:u},r,i,a,o,s,l,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Jo(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return t.compareFunction=this.compareFunction,t}},ql=class extends Kl{constructor(e,t=Ji,n=301,r,i,a=Li,o=Li,s,c=aa){let l={width:e,height:e,depth:1},u=[l,l,l,l,l,l];super(e,e,t,n,r,i,a,o,s,c),this.image=u,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},Jl=class extends Qo{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},Yl=class e extends Fc{constructor(e=1,t=1,n=1,r=1,i=1,a=1){super(),this.type=`BoxGeometry`,this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:i,depthSegments:a};let o=this;r=Math.floor(r),i=Math.floor(i),a=Math.floor(a);let s=[],c=[],l=[],u=[],d=0,f=0;p(`z`,`y`,`x`,-1,-1,n,t,e,a,i,0),p(`z`,`y`,`x`,1,-1,n,t,-e,a,i,1),p(`x`,`z`,`y`,1,1,e,n,t,r,a,2),p(`x`,`z`,`y`,1,-1,e,n,-t,r,a,3),p(`x`,`y`,`z`,1,-1,e,t,n,r,i,4),p(`x`,`y`,`z`,-1,-1,e,t,-n,r,i,5),this.setIndex(s),this.setAttribute(`position`,new Cc(c,3)),this.setAttribute(`normal`,new Cc(l,3)),this.setAttribute(`uv`,new Cc(u,2));function p(e,t,n,r,i,a,p,m,h,g,_){let v=a/h,y=p/g,b=a/2,x=p/2,S=m/2,C=h+1,w=g+1,T=0,E=0,D=new q;for(let a=0;a<w;a++){let o=a*y-x;for(let s=0;s<C;s++)D[e]=(s*v-b)*r,D[t]=o*i,D[n]=S,c.push(D.x,D.y,D.z),D[e]=0,D[t]=0,D[n]=m>0?1:-1,l.push(D.x,D.y,D.z),u.push(s/h),u.push(1-a/g),T+=1}for(let e=0;e<g;e++)for(let t=0;t<h;t++){let n=d+t+C*e,r=d+t+C*(e+1),i=d+(t+1)+C*(e+1),a=d+(t+1)+C*e;s.push(n,r,a),s.push(r,i,a),E+=6}o.addGroup(f,E,_),f+=E,d+=T}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}},Xl=class e extends Fc{constructor(e=1,t=32,n=0,r=Math.PI*2){super(),this.type=`CircleGeometry`,this.parameters={radius:e,segments:t,thetaStart:n,thetaLength:r},t=Math.max(3,t);let i=[],a=[],o=[],s=[],c=new q,l=new K;a.push(0,0,0),o.push(0,0,1),s.push(.5,.5);for(let i=0,u=3;i<=t;i++,u+=3){let d=n+i/t*r;c.x=e*Math.cos(d),c.y=e*Math.sin(d),a.push(c.x,c.y,c.z),o.push(0,0,1),l.x=(a[u]/e+1)/2,l.y=(a[u+1]/e+1)/2,s.push(l.x,l.y)}for(let e=1;e<=t;e++)i.push(e,e+1,0);this.setIndex(i),this.setAttribute(`position`,new Cc(a,3)),this.setAttribute(`normal`,new Cc(o,3)),this.setAttribute(`uv`,new Cc(s,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.segments,t.thetaStart,t.thetaLength)}},Zl=class e extends Fc{constructor(e=1,t=1,n=1,r=32,i=1,a=!1,o=0,s=Math.PI*2){super(),this.type=`CylinderGeometry`,this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:r,heightSegments:i,openEnded:a,thetaStart:o,thetaLength:s};let c=this;r=Math.floor(r),i=Math.floor(i);let l=[],u=[],d=[],f=[],p=0,m=[],h=n/2,g=0;_(),a===!1&&(e>0&&v(!0),t>0&&v(!1)),this.setIndex(l),this.setAttribute(`position`,new Cc(u,3)),this.setAttribute(`normal`,new Cc(d,3)),this.setAttribute(`uv`,new Cc(f,2));function _(){let a=new q,_=new q,v=0,y=(t-e)/n;for(let c=0;c<=i;c++){let l=[],g=c/i,v=g*(t-e)+e;for(let e=0;e<=r;e++){let t=e/r,i=t*s+o,c=Math.sin(i),m=Math.cos(i);_.x=v*c,_.y=-g*n+h,_.z=v*m,u.push(_.x,_.y,_.z),a.set(c,y,m).normalize(),d.push(a.x,a.y,a.z),f.push(t,1-g),l.push(p++)}m.push(l)}for(let n=0;n<r;n++)for(let r=0;r<i;r++){let a=m[r][n],o=m[r+1][n],s=m[r+1][n+1],c=m[r][n+1];(e>0||r!==0)&&(l.push(a,o,c),v+=3),(t>0||r!==i-1)&&(l.push(o,s,c),v+=3)}c.addGroup(g,v,0),g+=v}function v(n){let i=p,a=new K,m=new q,_=0,v=n===!0?e:t,y=n===!0?1:-1;for(let e=1;e<=r;e++)u.push(0,h*y,0),d.push(0,y,0),f.push(.5,.5),p++;let b=p;for(let e=0;e<=r;e++){let t=e/r*s+o,n=Math.cos(t),i=Math.sin(t);m.x=v*i,m.y=h*y,m.z=v*n,u.push(m.x,m.y,m.z),d.push(0,y,0),a.x=n*.5+.5,a.y=i*.5*y+.5,f.push(a.x,a.y),p++}for(let e=0;e<r;e++){let t=i+e,r=b+e;n===!0?l.push(r,r+1,t):l.push(r+1,r,t),_+=3}c.addGroup(g,_,n===!0?1:2),g+=_}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},Ql=class e extends Fc{constructor(e=[],t=[],n=1,r=0){super(),this.type=`PolyhedronGeometry`,this.parameters={vertices:e,indices:t,radius:n,detail:r};let i=[],a=[];o(r),c(n),l(),this.setAttribute(`position`,new Cc(i,3)),this.setAttribute(`normal`,new Cc(i.slice(),3)),this.setAttribute(`uv`,new Cc(a,2)),r===0?this.computeVertexNormals():this.normalizeNormals();function o(e){let n=new q,r=new q,i=new q;for(let a=0;a<t.length;a+=3)f(t[a+0],n),f(t[a+1],r),f(t[a+2],i),s(n,r,i,e)}function s(e,t,n,r){let i=r+1,a=[];for(let r=0;r<=i;r++){a[r]=[];let o=e.clone().lerp(n,r/i),s=t.clone().lerp(n,r/i),c=i-r;for(let e=0;e<=c;e++)e===0&&r===i?a[r][e]=o:a[r][e]=o.clone().lerp(s,e/c)}for(let e=0;e<i;e++)for(let t=0;t<2*(i-e)-1;t++){let n=Math.floor(t/2);t%2==0?(d(a[e][n+1]),d(a[e+1][n]),d(a[e][n])):(d(a[e][n+1]),d(a[e+1][n+1]),d(a[e+1][n]))}}function c(e){let t=new q;for(let n=0;n<i.length;n+=3)t.x=i[n+0],t.y=i[n+1],t.z=i[n+2],t.normalize().multiplyScalar(e),i[n+0]=t.x,i[n+1]=t.y,i[n+2]=t.z}function l(){let e=new q;for(let t=0;t<i.length;t+=3){e.x=i[t+0],e.y=i[t+1],e.z=i[t+2];let n=h(e)/2/Math.PI+.5,r=g(e)/Math.PI+.5;a.push(n,1-r)}p(),u()}function u(){for(let e=0;e<a.length;e+=6){let t=a[e+0],n=a[e+2],r=a[e+4];Math.max(t,n,r)>.9&&Math.min(t,n,r)<.1&&(t<.2&&(a[e+0]+=1),n<.2&&(a[e+2]+=1),r<.2&&(a[e+4]+=1))}}function d(e){i.push(e.x,e.y,e.z)}function f(t,n){let r=t*3;n.x=e[r+0],n.y=e[r+1],n.z=e[r+2]}function p(){let e=new q,t=new q,n=new q,r=new q,o=new K,s=new K,c=new K;for(let l=0,u=0;l<i.length;l+=9,u+=6){e.set(i[l+0],i[l+1],i[l+2]),t.set(i[l+3],i[l+4],i[l+5]),n.set(i[l+6],i[l+7],i[l+8]),o.set(a[u+0],a[u+1]),s.set(a[u+2],a[u+3]),c.set(a[u+4],a[u+5]),r.copy(e).add(t).add(n).divideScalar(3);let d=h(r);m(o,u+0,e,d),m(s,u+2,t,d),m(c,u+4,n,d)}}function m(e,t,n,r){r<0&&e.x===1&&(a[t]=e.x-1),n.x===0&&n.z===0&&(a[t]=r/2/Math.PI+.5)}function h(e){return Math.atan2(e.z,-e.x)}function g(e){return Math.atan2(-e.y,Math.sqrt(e.x*e.x+e.z*e.z))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.vertices,t.indices,t.radius,t.detail)}},$l=class{constructor(){this.type=`Curve`,this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){W(`Curve: .getPoint() not implemented.`)}getPointAt(e,t){let n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],n,r=this.getPoint(0),i=0;t.push(0);for(let a=1;a<=e;a++)n=this.getPoint(a/e),i+=n.distanceTo(r),t.push(i),r=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){let n=this.getLengths(),r=0,i=n.length,a;a=t||e*n[i-1];let o=0,s=i-1,c;for(;o<=s;)if(r=Math.floor(o+(s-o)/2),c=n[r]-a,c<0)o=r+1;else if(c>0)s=r-1;else{s=r;break}if(r=s,n[r]===a)return r/(i-1);let l=n[r],u=n[r+1]-l,d=(a-l)/u;return(r+d)/(i-1)}getTangent(e,t){let n=1e-4,r=e-n,i=e+n;r<0&&(r=0),i>1&&(i=1);let a=this.getPoint(r),o=this.getPoint(i),s=t||(a.isVector2?new K:new q);return s.copy(o).sub(a).normalize(),s}getTangentAt(e,t){let n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){let n=new q,r=[],i=[],a=[],o=new q,s=new is;for(let t=0;t<=e;t++){let n=t/e;r[t]=this.getTangentAt(n,new q)}i[0]=new q,a[0]=new q;let c=Number.MAX_VALUE,l=Math.abs(r[0].x),u=Math.abs(r[0].y),d=Math.abs(r[0].z);l<=c&&(c=l,n.set(1,0,0)),u<=c&&(c=u,n.set(0,1,0)),d<=c&&n.set(0,0,1),o.crossVectors(r[0],n).normalize(),i[0].crossVectors(r[0],o),a[0].crossVectors(r[0],i[0]);for(let t=1;t<=e;t++){if(i[t]=i[t-1].clone(),a[t]=a[t-1].clone(),o.crossVectors(r[t-1],r[t]),o.length()>2**-52){o.normalize();let e=Math.acos(Do(r[t-1].dot(r[t]),-1,1));i[t].applyMatrix4(s.makeRotationAxis(o,e))}a[t].crossVectors(r[t],i[t])}if(t===!0){let t=Math.acos(Do(i[0].dot(i[e]),-1,1));t/=e,r[0].dot(o.crossVectors(i[0],i[e]))>0&&(t=-t);for(let n=1;n<=e;n++)i[n].applyMatrix4(s.makeRotationAxis(r[n],t*n)),a[n].crossVectors(r[n],i[n])}return{tangents:r,normals:i,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this.cacheArcLengths=null,this}toJSON(){let e={metadata:{version:4.7,type:`Curve`,generator:`Curve.toJSON`}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this.cacheArcLengths=null,this}},eu=class extends $l{constructor(e=0,t=0,n=1,r=1,i=0,a=Math.PI*2,o=!1,s=0){super(),this.isEllipseCurve=!0,this.type=`EllipseCurve`,this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=r,this.aStartAngle=i,this.aEndAngle=a,this.aClockwise=o,this.aRotation=s}getPoint(e,t=new K){let n=t,r=Math.PI*2,i=this.aEndAngle-this.aStartAngle,a=Math.abs(i)<2**-52;for(;i<0;)i+=r;for(;i>r;)i-=r;i<2**-52&&(i=a?0:r),this.aClockwise===!0&&!a&&(i===r?i=-r:i-=r);let o=this.aStartAngle+e*i,s=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let e=Math.cos(this.aRotation),t=Math.sin(this.aRotation),n=s-this.aX,r=c-this.aY;s=n*e-r*t+this.aX,c=n*t+r*e+this.aY}return n.set(s,c)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},tu=class extends eu{constructor(e,t,n,r,i,a){super(e,t,n,n,r,i,a),this.isArcCurve=!0,this.type=`ArcCurve`}};function nu(){let e=0,t=0,n=0,r=0;function i(i,a,o,s){e=i,t=o,n=-3*i+3*a-2*o-s,r=2*i-2*a+o+s}return{initCatmullRom:function(e,t,n,r,a){i(t,n,a*(n-e),a*(r-t))},initNonuniformCatmullRom:function(e,t,n,r,a,o,s){let c=(t-e)/a-(n-e)/(a+o)+(n-t)/o,l=(n-t)/o-(r-t)/(o+s)+(r-n)/s;c*=o,l*=o,i(t,n,c,l)},calc:function(i){let a=i*i,o=a*i;return e+t*i+n*a+r*o}}}var ru=new q,iu=new q,au=new nu,ou=new nu,su=new nu,cu=class extends $l{constructor(e=[],t=!1,n=`centripetal`,r=.5){super(),this.isCatmullRomCurve3=!0,this.type=`CatmullRomCurve3`,this.points=e,this.closed=t,this.curveType=n,this.tension=r}getPoint(e,t=new q){let n=t,r=this.points,i=r.length,a=(i-+!this.closed)*e,o=Math.floor(a),s=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/i)+1)*i:s===0&&o===i-1&&(o=i-2,s=1);let c,l;this.closed||o>0?c=r[(o-1)%i]:(iu.subVectors(r[0],r[1]).add(r[0]),c=iu);let u=r[o%i],d=r[(o+1)%i];if(this.closed||o+2<i?l=r[(o+2)%i]:(ru.subVectors(r[i-1],r[i-2]).add(r[i-1]),l=ru),this.curveType===`centripetal`||this.curveType===`chordal`){let e=this.curveType===`chordal`?.5:.25,t=c.distanceToSquared(u)**+e,n=u.distanceToSquared(d)**+e,r=d.distanceToSquared(l)**+e;n<1e-4&&(n=1),t<1e-4&&(t=n),r<1e-4&&(r=n),au.initNonuniformCatmullRom(c.x,u.x,d.x,l.x,t,n,r),ou.initNonuniformCatmullRom(c.y,u.y,d.y,l.y,t,n,r),su.initNonuniformCatmullRom(c.z,u.z,d.z,l.z,t,n,r)}else this.curveType===`catmullrom`&&(au.initCatmullRom(c.x,u.x,d.x,l.x,this.tension),ou.initCatmullRom(c.y,u.y,d.y,l.y,this.tension),su.initCatmullRom(c.z,u.z,d.z,l.z,this.tension));return n.set(au.calc(s),ou.calc(s),su.calc(s)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(n.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let n=this.points[t];e.points.push(n.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(new q().fromArray(n))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function lu(e,t,n,r,i){let a=(r-t)*.5,o=(i-n)*.5,s=e*e,c=e*s;return(2*n-2*r+a+o)*c+(-3*n+3*r-2*a-o)*s+a*e+n}function uu(e,t){let n=1-e;return n*n*t}function du(e,t){return 2*(1-e)*e*t}function fu(e,t){return e*e*t}function pu(e,t,n,r){return uu(e,t)+du(e,n)+fu(e,r)}function mu(e,t){let n=1-e;return n*n*n*t}function hu(e,t){let n=1-e;return 3*n*n*e*t}function gu(e,t){return 3*(1-e)*e*e*t}function _u(e,t){return e*e*e*t}function vu(e,t,n,r,i){return mu(e,t)+hu(e,n)+gu(e,r)+_u(e,i)}var yu=class extends $l{constructor(e=new K,t=new K,n=new K,r=new K){super(),this.isCubicBezierCurve=!0,this.type=`CubicBezierCurve`,this.v0=e,this.v1=t,this.v2=n,this.v3=r}getPoint(e,t=new K){let n=t,r=this.v0,i=this.v1,a=this.v2,o=this.v3;return n.set(vu(e,r.x,i.x,a.x,o.x),vu(e,r.y,i.y,a.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},bu=class extends $l{constructor(e=new q,t=new q,n=new q,r=new q){super(),this.isCubicBezierCurve3=!0,this.type=`CubicBezierCurve3`,this.v0=e,this.v1=t,this.v2=n,this.v3=r}getPoint(e,t=new q){let n=t,r=this.v0,i=this.v1,a=this.v2,o=this.v3;return n.set(vu(e,r.x,i.x,a.x,o.x),vu(e,r.y,i.y,a.y,o.y),vu(e,r.z,i.z,a.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},xu=class extends $l{constructor(e=new K,t=new K){super(),this.isLineCurve=!0,this.type=`LineCurve`,this.v1=e,this.v2=t}getPoint(e,t=new K){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new K){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Su=class extends $l{constructor(e=new q,t=new q){super(),this.isLineCurve3=!0,this.type=`LineCurve3`,this.v1=e,this.v2=t}getPoint(e,t=new q){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new q){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Cu=class extends $l{constructor(e=new K,t=new K,n=new K){super(),this.isQuadraticBezierCurve=!0,this.type=`QuadraticBezierCurve`,this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new K){let n=t,r=this.v0,i=this.v1,a=this.v2;return n.set(pu(e,r.x,i.x,a.x),pu(e,r.y,i.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},wu=class extends $l{constructor(e=new q,t=new q,n=new q){super(),this.isQuadraticBezierCurve3=!0,this.type=`QuadraticBezierCurve3`,this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new q){let n=t,r=this.v0,i=this.v1,a=this.v2;return n.set(pu(e,r.x,i.x,a.x),pu(e,r.y,i.y,a.y),pu(e,r.z,i.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Tu=class extends $l{constructor(e=[]){super(),this.isSplineCurve=!0,this.type=`SplineCurve`,this.points=e}getPoint(e,t=new K){let n=t,r=this.points,i=(r.length-1)*e,a=Math.floor(i),o=i-a,s=r[a===0?a:a-1],c=r[a],l=r[a>r.length-2?r.length-1:a+1],u=r[a>r.length-3?r.length-1:a+2];return n.set(lu(o,s.x,c.x,l.x,u.x),lu(o,s.y,c.y,l.y,u.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(n.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let n=this.points[t];e.points.push(n.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(new K().fromArray(n))}return this}},Eu=Object.freeze({__proto__:null,ArcCurve:tu,CatmullRomCurve3:cu,CubicBezierCurve:yu,CubicBezierCurve3:bu,EllipseCurve:eu,LineCurve:xu,LineCurve3:Su,QuadraticBezierCurve:Cu,QuadraticBezierCurve3:wu,SplineCurve:Tu}),Du=class extends $l{constructor(){super(),this.type=`CurvePath`,this.curves=[],this.autoClose=!1,this.cacheLengths=null}add(e){this.curves.push(e)}closePath(){let e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){let n=e.isVector2===!0?`LineCurve`:`LineCurve3`;this.curves.push(new Eu[n](t,e))}return this}getPoint(e,t){let n=e*this.getLength(),r=this.getCurveLengths(),i=0;for(;i<r.length;){if(r[i]>=n){let e=r[i]-n,a=this.curves[i],o=a.getLength(),s=o===0?0:1-e/o;return a.getPointAt(s,t)}i++}return null}getLength(){let e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let e=[],t=0;for(let n=0,r=this.curves.length;n<r;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){let t=[],n;for(let r=0,i=this.curves;r<i.length;r++){let a=i[r],o=a.isEllipseCurve?e*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?e*a.points.length:e,s=a.getPoints(o);for(let e=0;e<s.length;e++){let r=s[e];n&&n.equals(r)||(t.push(r),n=r)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let n=e.curves[t];this.curves.push(n.clone())}return this.autoClose=e.autoClose,this.cacheLengths=null,this}toJSON(){let e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){let n=this.curves[t];e.curves.push(n.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let n=e.curves[t];this.curves.push(new Eu[n.type]().fromJSON(n))}return this.cacheLengths=null,this}},Ou=class extends Du{constructor(e){super(),this.type=`Path`,this.currentPoint=new K,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){let n=new xu(this.currentPoint.clone(),new K(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,r){let i=new Cu(this.currentPoint.clone(),new K(e,t),new K(n,r));return this.curves.push(i),this.currentPoint.set(n,r),this}bezierCurveTo(e,t,n,r,i,a){let o=new yu(this.currentPoint.clone(),new K(e,t),new K(n,r),new K(i,a));return this.curves.push(o),this.currentPoint.set(i,a),this}splineThru(e){let t=new Tu([this.currentPoint.clone()].concat(e));return this.curves.push(t),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,r,i,a){let o=this.currentPoint.x,s=this.currentPoint.y;return this.absarc(e+o,t+s,n,r,i,a),this}absarc(e,t,n,r,i,a){return this.absellipse(e,t,n,n,r,i,a),this}ellipse(e,t,n,r,i,a,o,s){let c=this.currentPoint.x,l=this.currentPoint.y;return this.absellipse(e+c,t+l,n,r,i,a,o,s),this}absellipse(e,t,n,r,i,a,o,s){let c=new eu(e,t,n,r,i,a,o,s);if(this.curves.length>0){let e=c.getPoint(0);e.equals(this.currentPoint)||this.lineTo(e.x,e.y)}this.curves.push(c);let l=c.getPoint(1);return this.currentPoint.copy(l),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){let e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}},ku=class extends Ou{constructor(e){super(e),this.uuid=Eo(),this.type=`Shape`,this.holes=[]}getPointsHoles(e){let t=[];for(let n=0,r=this.holes.length;n<r;n++)t[n]=this.holes[n].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let n=e.holes[t];this.holes.push(n.clone())}return this}toJSON(){let e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,n=this.holes.length;t<n;t++){let n=this.holes[t];e.holes.push(n.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let n=e.holes[t];this.holes.push(new Ou().fromJSON(n))}return this}};function Au(e,t,n=2){let r=t&&t.length,i=r?t[0]*n:e.length,a=ju(e,0,i,n,!0),o=[];if(!a||a.next===a.prev)return o;let s,c,l;if(r&&(a=Ru(e,t,a,n)),e.length>80*n){s=e[0],c=e[1];let t=s,r=c;for(let a=n;a<i;a+=n){let n=e[a],i=e[a+1];n<s&&(s=n),i<c&&(c=i),n>t&&(t=n),i>r&&(r=i)}l=Math.max(t-s,r-c),l=l===0?0:32767/l}return Nu(a,o,n,s,c,l,0),o}function ju(e,t,n,r,i){let a;if(i===cd(e,t,n,r)>0)for(let i=t;i<n;i+=r)a=ad(i/r|0,e[i],e[i+1],a);else for(let i=n-r;i>=t;i-=r)a=ad(i/r|0,e[i],e[i+1],a);return a&&Zu(a,a.next)&&(od(a),a=a.next),a}function Mu(e,t){if(!e)return e;t||=e;let n=e,r;do if(r=!1,!n.steiner&&(Zu(n,n.next)||Xu(n.prev,n,n.next)===0)){if(od(n),n=t=n.prev,n===n.next)break;r=!0}else n=n.next;while(r||n!==t);return t}function Nu(e,t,n,r,i,a,o){if(!e)return;!o&&a&&Uu(e,r,i,a);let s=e;for(;e.prev!==e.next;){let c=e.prev,l=e.next;if(a?Fu(e,r,i,a):Pu(e))t.push(c.i,e.i,l.i),od(e),e=l.next,s=l.next;else if(e=l,e===s){o?o===1?(e=Iu(Mu(e),t),Nu(e,t,n,r,i,a,2)):o===2&&Lu(e,t,n,r,i,a):Nu(Mu(e),t,n,r,i,a,1);break}}}function Pu(e){let t=e.prev,n=e,r=e.next;if(Xu(t,n,r)>=0)return!1;let i=t.x,a=n.x,o=r.x,s=t.y,c=n.y,l=r.y,u=Math.min(i,a,o),d=Math.min(s,c,l),f=Math.max(i,a,o),p=Math.max(s,c,l),m=r.next;for(;m!==t;){if(m.x>=u&&m.x<=f&&m.y>=d&&m.y<=p&&Ju(i,s,a,c,o,l,m.x,m.y)&&Xu(m.prev,m,m.next)>=0)return!1;m=m.next}return!0}function Fu(e,t,n,r){let i=e.prev,a=e,o=e.next;if(Xu(i,a,o)>=0)return!1;let s=i.x,c=a.x,l=o.x,u=i.y,d=a.y,f=o.y,p=Math.min(s,c,l),m=Math.min(u,d,f),h=Math.max(s,c,l),g=Math.max(u,d,f),_=Gu(p,m,t,n,r),v=Gu(h,g,t,n,r),y=e.prevZ,b=e.nextZ;for(;y&&y.z>=_&&b&&b.z<=v;){if(y.x>=p&&y.x<=h&&y.y>=m&&y.y<=g&&y!==i&&y!==o&&Ju(s,u,c,d,l,f,y.x,y.y)&&Xu(y.prev,y,y.next)>=0||(y=y.prevZ,b.x>=p&&b.x<=h&&b.y>=m&&b.y<=g&&b!==i&&b!==o&&Ju(s,u,c,d,l,f,b.x,b.y)&&Xu(b.prev,b,b.next)>=0))return!1;b=b.nextZ}for(;y&&y.z>=_;){if(y.x>=p&&y.x<=h&&y.y>=m&&y.y<=g&&y!==i&&y!==o&&Ju(s,u,c,d,l,f,y.x,y.y)&&Xu(y.prev,y,y.next)>=0)return!1;y=y.prevZ}for(;b&&b.z<=v;){if(b.x>=p&&b.x<=h&&b.y>=m&&b.y<=g&&b!==i&&b!==o&&Ju(s,u,c,d,l,f,b.x,b.y)&&Xu(b.prev,b,b.next)>=0)return!1;b=b.nextZ}return!0}function Iu(e,t){let n=e;do{let r=n.prev,i=n.next.next;!Zu(r,i)&&Qu(r,n,n.next,i)&&nd(r,i)&&nd(i,r)&&(t.push(r.i,n.i,i.i),od(n),od(n.next),n=e=i),n=n.next}while(n!==e);return Mu(n)}function Lu(e,t,n,r,i,a){let o=e;do{let e=o.next.next;for(;e!==o.prev;){if(o.i!==e.i&&Yu(o,e)){let s=id(o,e);o=Mu(o,o.next),s=Mu(s,s.next),Nu(o,t,n,r,i,a,0),Nu(s,t,n,r,i,a,0);return}e=e.next}o=o.next}while(o!==e)}function Ru(e,t,n,r){let i=[];for(let n=0,a=t.length;n<a;n++){let o=ju(e,t[n]*r,n<a-1?t[n+1]*r:e.length,r,!1);o===o.next&&(o.steiner=!0),i.push(Ku(o))}i.sort(zu);for(let e=0;e<i.length;e++)n=Bu(i[e],n);return n}function zu(e,t){let n=e.x-t.x;return n===0&&(n=e.y-t.y,n===0&&(n=(e.next.y-e.y)/(e.next.x-e.x)-(t.next.y-t.y)/(t.next.x-t.x))),n}function Bu(e,t){let n=Vu(e,t);if(!n)return t;let r=id(n,e);return Mu(r,r.next),Mu(n,n.next)}function Vu(e,t){let n=t,r=e.x,i=e.y,a=-1/0,o;if(Zu(e,n))return n;do{if(Zu(e,n.next))return n.next;if(i<=n.y&&i>=n.next.y&&n.next.y!==n.y){let e=n.x+(i-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(e<=r&&e>a&&(a=e,o=n.x<n.next.x?n:n.next,e===r))return o}n=n.next}while(n!==t);if(!o)return null;let s=o,c=o.x,l=o.y,u=1/0;n=o;do{if(r>=n.x&&n.x>=c&&r!==n.x&&qu(i<l?r:a,i,c,l,i<l?a:r,i,n.x,n.y)){let t=Math.abs(i-n.y)/(r-n.x);nd(n,e)&&(t<u||t===u&&(n.x>o.x||n.x===o.x&&Hu(o,n)))&&(o=n,u=t)}n=n.next}while(n!==s);return o}function Hu(e,t){return Xu(e.prev,e,t.prev)<0&&Xu(t.next,e,e.next)<0}function Uu(e,t,n,r){let i=e;do i.z===0&&(i.z=Gu(i.x,i.y,t,n,r)),i.prevZ=i.prev,i.nextZ=i.next,i=i.next;while(i!==e);i.prevZ.nextZ=null,i.prevZ=null,Wu(i)}function Wu(e){let t,n=1;do{let r=e,i;e=null;let a=null;for(t=0;r;){t++;let o=r,s=0;for(let e=0;e<n&&(s++,o=o.nextZ,o);e++);let c=n;for(;s>0||c>0&&o;)s!==0&&(c===0||!o||r.z<=o.z)?(i=r,r=r.nextZ,s--):(i=o,o=o.nextZ,c--),a?a.nextZ=i:e=i,i.prevZ=a,a=i;r=o}a.nextZ=null,n*=2}while(t>1);return e}function Gu(e,t,n,r,i){return e=(e-n)*i|0,t=(t-r)*i|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function Ku(e){let t=e,n=e;do(t.x<n.x||t.x===n.x&&t.y<n.y)&&(n=t),t=t.next;while(t!==e);return n}function qu(e,t,n,r,i,a,o,s){return(i-o)*(t-s)>=(e-o)*(a-s)&&(e-o)*(r-s)>=(n-o)*(t-s)&&(n-o)*(a-s)>=(i-o)*(r-s)}function Ju(e,t,n,r,i,a,o,s){return(e!==o||t!==s)&&qu(e,t,n,r,i,a,o,s)}function Yu(e,t){return e.next.i!==t.i&&e.prev.i!==t.i&&!td(e,t)&&(nd(e,t)&&nd(t,e)&&rd(e,t)&&(Xu(e.prev,e,t.prev)||Xu(e,t.prev,t))||Zu(e,t)&&Xu(e.prev,e,e.next)>0&&Xu(t.prev,t,t.next)>0)}function Xu(e,t,n){return(t.y-e.y)*(n.x-t.x)-(t.x-e.x)*(n.y-t.y)}function Zu(e,t){return e.x===t.x&&e.y===t.y}function Qu(e,t,n,r){let i=ed(Xu(e,t,n)),a=ed(Xu(e,t,r)),o=ed(Xu(n,r,e)),s=ed(Xu(n,r,t));return!!(i!==a&&o!==s||i===0&&$u(e,n,t)||a===0&&$u(e,r,t)||o===0&&$u(n,e,r)||s===0&&$u(n,t,r))}function $u(e,t,n){return t.x<=Math.max(e.x,n.x)&&t.x>=Math.min(e.x,n.x)&&t.y<=Math.max(e.y,n.y)&&t.y>=Math.min(e.y,n.y)}function ed(e){return e>0?1:e<0?-1:0}function td(e,t){let n=e;do{if(n.i!==e.i&&n.next.i!==e.i&&n.i!==t.i&&n.next.i!==t.i&&Qu(n,n.next,e,t))return!0;n=n.next}while(n!==e);return!1}function nd(e,t){return Xu(e.prev,e,e.next)<0?Xu(e,t,e.next)>=0&&Xu(e,e.prev,t)>=0:Xu(e,t,e.prev)<0||Xu(e,e.next,t)<0}function rd(e,t){let n=e,r=!1,i=(e.x+t.x)/2,a=(e.y+t.y)/2;do n.y>a!=n.next.y>a&&n.next.y!==n.y&&i<(n.next.x-n.x)*(a-n.y)/(n.next.y-n.y)+n.x&&(r=!r),n=n.next;while(n!==e);return r}function id(e,t){let n=sd(e.i,e.x,e.y),r=sd(t.i,t.x,t.y),i=e.next,a=t.prev;return e.next=t,t.prev=e,n.next=i,i.prev=n,r.next=n,n.prev=r,a.next=r,r.prev=a,r}function ad(e,t,n,r){let i=sd(e,t,n);return r?(i.next=r.next,i.prev=r,r.next.prev=i,r.next=i):(i.prev=i,i.next=i),i}function od(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ)}function sd(e,t,n){return{i:e,x:t,y:n,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function cd(e,t,n,r){let i=0;for(let a=t,o=n-r;a<n;a+=r)i+=(e[o]-e[a])*(e[a+1]+e[o+1]),o=a;return i}var ld=class{static triangulate(e,t,n=2){return Au(e,t,n)}},ud=class e{static area(e){let t=e.length,n=0;for(let r=t-1,i=0;i<t;r=i++)n+=e[r].x*e[i].y-e[i].x*e[r].y;return n*.5}static isClockWise(t){return e.area(t)<0}static triangulateShape(e,t){let n=[],r=[],i=[];dd(e),fd(n,e);let a=e.length;t.forEach(dd);for(let e=0;e<t.length;e++)r.push(a),a+=t[e].length,fd(n,t[e]);let o=ld.triangulate(n,r);for(let e=0;e<o.length;e+=3)i.push(o.slice(e,e+3));return i}};function dd(e){let t=e.length;t>2&&e[t-1].equals(e[0])&&e.pop()}function fd(e,t){for(let n=0;n<t.length;n++)e.push(t[n].x),e.push(t[n].y)}var pd=class e extends Fc{constructor(e=new ku([new K(.5,.5),new K(-.5,.5),new K(-.5,-.5),new K(.5,-.5)]),t={}){super(),this.type=`ExtrudeGeometry`,this.parameters={shapes:e,options:t},e=Array.isArray(e)?e:[e];let n=this,r=[],i=[];for(let t=0,n=e.length;t<n;t++){let n=e[t];a(n)}this.setAttribute(`position`,new Cc(r,3)),this.setAttribute(`uv`,new Cc(i,2)),this.computeVertexNormals();function a(e){let a=[],o=t.curveSegments===void 0?12:t.curveSegments,s=t.steps===void 0?1:t.steps,c=t.depth===void 0?1:t.depth,l=t.bevelEnabled===void 0||t.bevelEnabled,u=t.bevelThickness===void 0?.2:t.bevelThickness,d=t.bevelSize===void 0?u-.1:t.bevelSize,f=t.bevelOffset===void 0?0:t.bevelOffset,p=t.bevelSegments===void 0?3:t.bevelSegments,m=t.extrudePath,h=t.UVGenerator===void 0?md:t.UVGenerator,g,_=!1,v,y,b,x;if(m){g=m.getSpacedPoints(s),_=!0,l=!1;let e=m.isCatmullRomCurve3?m.closed:!1;v=m.computeFrenetFrames(s,e),y=new q,b=new q,x=new q}l||(p=0,u=0,d=0,f=0);let S=e.extractPoints(o),C=S.shape,w=S.holes;if(!ud.isClockWise(C)){C=C.reverse();for(let e=0,t=w.length;e<t;e++){let t=w[e];ud.isClockWise(t)&&(w[e]=t.reverse())}}function T(e){let t=e[0];for(let n=1;n<=e.length;n++){let r=n%e.length,i=e[r],a=i.x-t.x,o=i.y-t.y,s=a*a+o*o,c=Math.max(Math.abs(i.x),Math.abs(i.y),Math.abs(t.x),Math.abs(t.y));s<=10000000000000001e-36*c*c?(e.splice(r,1),n--):t=i}}T(C),w.forEach(T);let E=w.length,D=C;for(let e=0;e<E;e++){let t=w[e];C=C.concat(t)}function O(e,t,n){return t||G(`ExtrudeGeometry: vec does not exist`),e.clone().addScaledVector(t,n)}let k=C.length;function A(e,t,n){let r,i,a,o=e.x-t.x,s=e.y-t.y,c=n.x-e.x,l=n.y-e.y,u=o*o+s*s,d=o*l-s*c;if(Math.abs(d)>2**-52){let d=Math.sqrt(u),f=Math.sqrt(c*c+l*l),p=t.x-s/d,m=t.y+o/d,h=n.x-l/f,g=n.y+c/f,_=((h-p)*l-(g-m)*c)/(o*l-s*c);r=p+o*_-e.x,i=m+s*_-e.y;let v=r*r+i*i;if(v<=2)return new K(r,i);a=Math.sqrt(v/2)}else{let e=!1;o>2**-52?c>2**-52&&(e=!0):o<-(2**-52)?c<-(2**-52)&&(e=!0):Math.sign(s)===Math.sign(l)&&(e=!0),e?(r=-s,i=o,a=Math.sqrt(u)):(r=o,i=s,a=Math.sqrt(u/2))}return new K(r/a,i/a)}let j=[];for(let e=0,t=D.length,n=t-1,r=e+1;e<t;e++,n++,r++)n===t&&(n=0),r===t&&(r=0),j[e]=A(D[e],D[n],D[r]);let ee=[],M,N=j.concat();for(let e=0,t=E;e<t;e++){let t=w[e];M=[];for(let e=0,n=t.length,r=n-1,i=e+1;e<n;e++,r++,i++)r===n&&(r=0),i===n&&(i=0),M[e]=A(t[e],t[r],t[i]);ee.push(M),N=N.concat(M)}let P;if(p===0)P=ud.triangulateShape(D,w);else{let e=[],t=[];for(let n=0;n<p;n++){let r=n/p,i=u*Math.cos(r*Math.PI/2),a=d*Math.sin(r*Math.PI/2)+f;for(let t=0,n=D.length;t<n;t++){let n=O(D[t],j[t],a);oe(n.x,n.y,-i),r===0&&e.push(n)}for(let e=0,n=E;e<n;e++){let n=w[e];M=ee[e];let o=[];for(let e=0,t=n.length;e<t;e++){let t=O(n[e],M[e],a);oe(t.x,t.y,-i),r===0&&o.push(t)}r===0&&t.push(o)}}P=ud.triangulateShape(e,t)}let te=P.length,ne=d+f;for(let e=0;e<k;e++){let t=l?O(C[e],N[e],ne):C[e];_?(b.copy(v.normals[0]).multiplyScalar(t.x),y.copy(v.binormals[0]).multiplyScalar(t.y),x.copy(g[0]).add(b).add(y),oe(x.x,x.y,x.z)):oe(t.x,t.y,0)}for(let e=1;e<=s;e++)for(let t=0;t<k;t++){let n=l?O(C[t],N[t],ne):C[t];_?(b.copy(v.normals[e]).multiplyScalar(n.x),y.copy(v.binormals[e]).multiplyScalar(n.y),x.copy(g[e]).add(b).add(y),oe(x.x,x.y,x.z)):oe(n.x,n.y,c/s*e)}for(let e=p-1;e>=0;e--){let t=e/p,n=u*Math.cos(t*Math.PI/2),r=d*Math.sin(t*Math.PI/2)+f;for(let e=0,t=D.length;e<t;e++){let t=O(D[e],j[e],r);oe(t.x,t.y,c+n)}for(let e=0,t=w.length;e<t;e++){let t=w[e];M=ee[e];for(let e=0,i=t.length;e<i;e++){let i=O(t[e],M[e],r);_?oe(i.x,i.y+g[s-1].y,g[s-1].x+n):oe(i.x,i.y,c+n)}}}re(),ie();function re(){let e=r.length/3;if(l){let e=0,t=k*e;for(let e=0;e<te;e++){let n=P[e];se(n[2]+t,n[1]+t,n[0]+t)}e=s+p*2,t=k*e;for(let e=0;e<te;e++){let n=P[e];se(n[0]+t,n[1]+t,n[2]+t)}}else{for(let e=0;e<te;e++){let t=P[e];se(t[2],t[1],t[0])}for(let e=0;e<te;e++){let t=P[e];se(t[0]+k*s,t[1]+k*s,t[2]+k*s)}}n.addGroup(e,r.length/3-e,0)}function ie(){let e=r.length/3,t=0;ae(D,t),t+=D.length;for(let e=0,n=w.length;e<n;e++){let n=w[e];ae(n,t),t+=n.length}n.addGroup(e,r.length/3-e,1)}function ae(e,t){let n=e.length;for(;--n>=0;){let r=n,i=n-1;i<0&&(i=e.length-1);for(let e=0,n=s+p*2;e<n;e++){let n=k*e,a=k*(e+1);ce(t+r+n,t+i+n,t+i+a,t+r+a)}}}function oe(e,t,n){a.push(e),a.push(t),a.push(n)}function se(e,t,i){le(e),le(t),le(i);let a=r.length/3,o=h.generateTopUV(n,r,a-3,a-2,a-1);ue(o[0]),ue(o[1]),ue(o[2])}function ce(e,t,i,a){le(e),le(t),le(a),le(t),le(i),le(a);let o=r.length/3,s=h.generateSideWallUV(n,r,o-6,o-3,o-2,o-1);ue(s[0]),ue(s[1]),ue(s[3]),ue(s[1]),ue(s[2]),ue(s[3])}function le(e){r.push(a[e*3+0]),r.push(a[e*3+1]),r.push(a[e*3+2])}function ue(e){i.push(e.x),i.push(e.y)}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON(),t=this.parameters.shapes,n=this.parameters.options;return hd(t,n,e)}static fromJSON(t,n){let r=[];for(let e=0,i=t.shapes.length;e<i;e++){let i=n[t.shapes[e]];r.push(i)}let i=t.options.extrudePath;return i!==void 0&&(t.options.extrudePath=new Eu[i.type]().fromJSON(i)),new e(r,t.options)}},md={generateTopUV:function(e,t,n,r,i){let a=t[n*3],o=t[n*3+1],s=t[r*3],c=t[r*3+1],l=t[i*3],u=t[i*3+1];return[new K(a,o),new K(s,c),new K(l,u)]},generateSideWallUV:function(e,t,n,r,i,a){let o=t[n*3],s=t[n*3+1],c=t[n*3+2],l=t[r*3],u=t[r*3+1],d=t[r*3+2],f=t[i*3],p=t[i*3+1],m=t[i*3+2],h=t[a*3],g=t[a*3+1],_=t[a*3+2];return Math.abs(s-u)<Math.abs(o-l)?[new K(o,1-c),new K(l,1-d),new K(f,1-m),new K(h,1-_)]:[new K(s,1-c),new K(u,1-d),new K(p,1-m),new K(g,1-_)]}};function hd(e,t,n){if(n.shapes=[],Array.isArray(e))for(let t=0,r=e.length;t<r;t++){let r=e[t];n.shapes.push(r.uuid)}else n.shapes.push(e.uuid);return n.options=Object.assign({},t),t.extrudePath!==void 0&&(n.options.extrudePath=t.extrudePath.toJSON()),n}var gd=class e extends Ql{constructor(e=1,t=0){let n=(1+Math.sqrt(5))/2,r=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1];super(r,[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1],e,t),this.type=`IcosahedronGeometry`,this.parameters={radius:e,detail:t}}static fromJSON(t){return new e(t.radius,t.detail)}},_d=class e extends Fc{constructor(e=1,t=1,n=1,r=1){super(),this.type=`PlaneGeometry`,this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};let i=e/2,a=t/2,o=Math.floor(n),s=Math.floor(r),c=o+1,l=s+1,u=e/o,d=t/s,f=[],p=[],m=[],h=[];for(let e=0;e<l;e++){let t=e*d-a;for(let n=0;n<c;n++){let r=n*u-i;p.push(r,-t,0),m.push(0,0,1),h.push(n/o),h.push(1-e/s)}}for(let e=0;e<s;e++)for(let t=0;t<o;t++){let n=t+c*e,r=t+c*(e+1),i=t+1+c*(e+1),a=t+1+c*e;f.push(n,r,a),f.push(r,i,a)}this.setIndex(f),this.setAttribute(`position`,new Cc(p,3)),this.setAttribute(`normal`,new Cc(m,3)),this.setAttribute(`uv`,new Cc(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.widthSegments,t.heightSegments)}},vd=class e extends Fc{constructor(e=.5,t=1,n=32,r=1,i=0,a=Math.PI*2){super(),this.type=`RingGeometry`,this.parameters={innerRadius:e,outerRadius:t,thetaSegments:n,phiSegments:r,thetaStart:i,thetaLength:a},n=Math.max(3,n),r=Math.max(1,r);let o=[],s=[],c=[],l=[],u=e,d=(t-e)/r,f=new q,p=new K;for(let e=0;e<=r;e++){for(let e=0;e<=n;e++){let r=i+e/n*a;f.x=u*Math.cos(r),f.y=u*Math.sin(r),s.push(f.x,f.y,f.z),c.push(0,0,1),p.x=(f.x/t+1)/2,p.y=(f.y/t+1)/2,l.push(p.x,p.y)}u+=d}for(let e=0;e<r;e++){let t=e*(n+1);for(let e=0;e<n;e++){let r=e+t,i=r,a=r+n+1,s=r+n+2,c=r+1;o.push(i,a,c),o.push(a,s,c)}}this.setIndex(o),this.setAttribute(`position`,new Cc(s,3)),this.setAttribute(`normal`,new Cc(c,3)),this.setAttribute(`uv`,new Cc(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.innerRadius,t.outerRadius,t.thetaSegments,t.phiSegments,t.thetaStart,t.thetaLength)}},yd=class e extends Fc{constructor(e=new ku([new K(0,.5),new K(-.5,-.5),new K(.5,-.5)]),t=12){super(),this.type=`ShapeGeometry`,this.parameters={shapes:e,curveSegments:t};let n=[],r=[],i=[],a=[],o=0,s=0;if(Array.isArray(e)===!1)c(e);else for(let t=0;t<e.length;t++)c(e[t]),this.addGroup(o,s,t),o+=s,s=0;this.setIndex(n),this.setAttribute(`position`,new Cc(r,3)),this.setAttribute(`normal`,new Cc(i,3)),this.setAttribute(`uv`,new Cc(a,2));function c(e){let o=r.length/3,c=e.extractPoints(t),l=c.shape,u=c.holes;ud.isClockWise(l)===!1&&(l=l.reverse());for(let e=0,t=u.length;e<t;e++){let t=u[e];ud.isClockWise(t)===!0&&(u[e]=t.reverse())}let d=ud.triangulateShape(l,u);for(let e=0,t=u.length;e<t;e++){let t=u[e];l=l.concat(t)}for(let e=0,t=l.length;e<t;e++){let t=l[e];r.push(t.x,t.y,0),i.push(0,0,1),a.push(t.x,t.y)}for(let e=0,t=d.length;e<t;e++){let t=d[e],r=t[0]+o,i=t[1]+o,a=t[2]+o;n.push(r,i,a),s+=3}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON(),t=this.parameters.shapes;return bd(t,e)}static fromJSON(t,n){let r=[];for(let e=0,i=t.shapes.length;e<i;e++){let i=n[t.shapes[e]];r.push(i)}return new e(r,t.curveSegments)}};function bd(e,t){if(t.shapes=[],Array.isArray(e))for(let n=0,r=e.length;n<r;n++){let r=e[n];t.shapes.push(r.uuid)}else t.shapes.push(e.uuid);return t}var xd=class e extends Fc{constructor(e=1,t=32,n=16,r=0,i=Math.PI*2,a=0,o=Math.PI){super(),this.type=`SphereGeometry`,this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:r,phiLength:i,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));let s=Math.min(a+o,Math.PI),c=0,l=[],u=new q,d=new q,f=[],p=[],m=[],h=[];for(let f=0;f<=n;f++){let g=[],_=f/n,v=a+_*o,y=e*Math.cos(v),b=Math.sqrt(e*e-y*y),x=0;f===0&&a===0?x=.5/t:f===n&&s===Math.PI&&(x=-.5/t);for(let e=0;e<=t;e++){let n=e/t,a=r+n*i;u.x=-b*Math.cos(a),u.y=y,u.z=b*Math.sin(a),p.push(u.x,u.y,u.z),d.copy(u).normalize(),m.push(d.x,d.y,d.z),h.push(n+x,1-_),g.push(c++)}l.push(g)}for(let e=0;e<n;e++)for(let r=0;r<t;r++){let t=l[e][r+1],i=l[e][r],o=l[e+1][r],c=l[e+1][r+1];(e!==0||a>0)&&f.push(t,i,c),(e!==n-1||s<Math.PI)&&f.push(i,o,c)}this.setIndex(f),this.setAttribute(`position`,new Cc(p,3)),this.setAttribute(`normal`,new Cc(m,3)),this.setAttribute(`uv`,new Cc(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}},Sd=class e extends Fc{constructor(e=1,t=.4,n=12,r=48,i=Math.PI*2,a=0,o=Math.PI*2){super(),this.type=`TorusGeometry`,this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:r,arc:i,thetaStart:a,thetaLength:o},n=Math.floor(n),r=Math.floor(r);let s=[],c=[],l=[],u=[],d=new q,f=new q,p=new q;for(let s=0;s<=n;s++){let m=a+s/n*o;for(let a=0;a<=r;a++){let o=a/r*i;f.x=(e+t*Math.cos(m))*Math.cos(o),f.y=(e+t*Math.cos(m))*Math.sin(o),f.z=t*Math.sin(m),c.push(f.x,f.y,f.z),d.x=e*Math.cos(o),d.y=e*Math.sin(o),p.subVectors(f,d).normalize(),l.push(p.x,p.y,p.z),u.push(a/r),u.push(s/n)}}for(let e=1;e<=n;e++)for(let t=1;t<=r;t++){let n=(r+1)*e+t-1,i=(r+1)*(e-1)+t-1,a=(r+1)*(e-1)+t,o=(r+1)*e+t;s.push(n,i,o),s.push(i,a,o)}this.setIndex(s),this.setAttribute(`position`,new Cc(c,3)),this.setAttribute(`normal`,new Cc(l,3)),this.setAttribute(`uv`,new Cc(u,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc,t.thetaStart,t.thetaLength)}};function Cd(e){let t={};for(let n in e){t[n]={};for(let r in e[n]){let i=e[n][r];if(Td(i))i.isRenderTargetTexture?(W(`UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms().`),t[n][r]=null):t[n][r]=i.clone();else if(Array.isArray(i)){if(Td(i[0])){let e=[];for(let t=0,n=i.length;t<n;t++)e[t]=i[t].clone();t[n][r]=e}else t[n][r]=i.slice()}else t[n][r]=i}}return t}function wd(e){let t={};for(let n=0;n<e.length;n++){let r=Cd(e[n]);for(let e in r)t[e]=r[e]}return t}function Td(e){return e&&(e.isColor||e.isMatrix3||e.isMatrix4||e.isVector2||e.isVector3||e.isVector4||e.isTexture||e.isQuaternion)}function Ed(e){let t=[];for(let n=0;n<e.length;n++)t.push(e[n].clone());return t}function Dd(e){let t=e.getRenderTarget();return t===null?e.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Ho.workingColorSpace}var Od={clone:Cd,merge:wd},kd=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Ad=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,jd=class extends Vc{constructor(e){super(),this.isShaderMaterial=!0,this.type=`ShaderMaterial`,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=kd,this.fragmentShader=Ad,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Cd(e.uniforms),this.uniformsGroups=Ed(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let n in this.uniforms){let r=this.uniforms[n].value;r&&r.isTexture?t.uniforms[n]={type:`t`,value:r.toJSON(e).uuid}:r&&r.isColor?t.uniforms[n]={type:`c`,value:r.getHex()}:r&&r.isVector2?t.uniforms[n]={type:`v2`,value:r.toArray()}:r&&r.isVector3?t.uniforms[n]={type:`v3`,value:r.toArray()}:r&&r.isVector4?t.uniforms[n]={type:`v4`,value:r.toArray()}:r&&r.isMatrix3?t.uniforms[n]={type:`m3`,value:r.toArray()}:r&&r.isMatrix4?t.uniforms[n]={type:`m4`,value:r.toArray()}:t.uniforms[n]={value:r}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let e in this.extensions)this.extensions[e]===!0&&(n[e]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(let n in e.uniforms){let r=e.uniforms[n];switch(this.uniforms[n]={},r.type){case`t`:this.uniforms[n].value=t[r.value]||null;break;case`c`:this.uniforms[n].value=new J().setHex(r.value);break;case`v2`:this.uniforms[n].value=new K().fromArray(r.value);break;case`v3`:this.uniforms[n].value=new q().fromArray(r.value);break;case`v4`:this.uniforms[n].value=new $o().fromArray(r.value);break;case`m3`:this.uniforms[n].value=new Lo().fromArray(r.value);break;case`m4`:this.uniforms[n].value=new is().fromArray(r.value);break;default:this.uniforms[n].value=r.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(let t in e.extensions)this.extensions[t]=e.extensions[t];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}},Md=class extends jd{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type=`RawShaderMaterial`}},Nd=class extends Vc{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type=`MeshStandardMaterial`,this.defines={STANDARD:``},this.color=new J(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new J(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new K(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new ms,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:``},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},Pd=class extends Nd{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:``,PHYSICAL:``},this.type=`MeshPhysicalMaterial`,this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new K(1,1),this.clearcoatNormalMap=null,this.diffuseRoughnessMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return Do(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessMinimum=100,this.iridescenceThicknessMaximum=400,this.iridescenceThicknessMap=null,this.sheenColor=new J(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new J(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new J(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._diffuseRoughness=0,this._dispersion=0,this._iridescence=0,this._retroreflectivity=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get diffuseRoughness(){return this._diffuseRoughness}set diffuseRoughness(e){this._diffuseRoughness>0!=e>0&&this.version++,this._diffuseRoughness=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get retroreflectivity(){return this._retroreflectivity}set retroreflectivity(e){this._retroreflectivity>0!=e>0&&this.version++,this._retroreflectivity=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}get iridescenceThicknessRange(){return yo(`MeshPhysicalMaterial: The "iridescenceThicknessRange" property has been replaced by "iridescenceThicknessMinimum" and "iridescenceThicknessMaximum".`),[this.iridescenceThicknessMinimum,this.iridescenceThicknessMaximum]}set iridescenceThicknessRange(e){yo(`MeshPhysicalMaterial: The "iridescenceThicknessRange" property has been replaced by "iridescenceThicknessMinimum" and "iridescenceThicknessMaximum".`),this.iridescenceThicknessMinimum=e[0],this.iridescenceThicknessMaximum=e[1]}copy(e){return super.copy(e),this.defines={STANDARD:``,PHYSICAL:``},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.diffuseRoughness=e.diffuseRoughness,this.diffuseRoughnessMap=e.diffuseRoughnessMap,this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessMinimum=e.iridescenceThicknessMinimum,this.iridescenceThicknessMaximum=e.iridescenceThicknessMaximum,this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.retroreflectivity=e.retroreflectivity,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}},Fd=class extends Vc{constructor(e){super(),this.isMeshNormalMaterial=!0,this.type=`MeshNormalMaterial`,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new K(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.flatShading=!1,this.setValues(e)}copy(e){return super.copy(e),this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.flatShading=e.flatShading,this}},Id=class extends Vc{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type=`MeshDepthMaterial`,this.depthPacking=to,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},Ld=class extends Vc{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type=`MeshDistanceMaterial`,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function Rd(e,t){return!e||e.constructor===t?e:typeof t.BYTES_PER_ELEMENT==`number`?new t(e):Array.prototype.slice.call(e)}function zd(e){return e!==void 0&&e.inTangents!==void 0&&e.outTangents!==void 0}var Bd=class{constructor(e,t,n,r){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=r===void 0?new t.constructor(n):r,this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,r=t[n],i=t[n-1];validate_interval:{seek:{let a;linear_scan:{forward_scan:if(!(e<r)){for(let a=n+2;;){if(r===void 0){if(e<i)break forward_scan;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(i=r,r=t[++n],e<r)break seek}a=t.length;break linear_scan}if(!(e>=i)){let o=t[1];e<o&&(n=2,i=o);for(let a=n-2;;){if(i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===a)break;if(r=i,i=t[--n-1],e>=i)break seek}a=n,n=0;break linear_scan}break validate_interval}for(;n<a;){let r=n+a>>>1;e<t[r]?a=r:n=r+1}if(r=t[n],i=t[n-1],i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,i,r)}return this.interpolate_(n,i,e,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,i=e*r;for(let e=0;e!==r;++e)t[e]=n[i+e];return t}interpolate_(){throw Error(`THREE.Interpolant: Call to abstract method.`)}intervalChanged_(){}},Vd=class extends Bd{constructor(e,t,n,r){super(e,t,n,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Qa,endingEnd:Qa}}intervalChanged_(e,t,n){let r=this.parameterPositions,i=e-2,a=e+1,o=r[i],s=r[a];if(o===void 0)switch(this.getSettings_().endingStart){case $a:i=e,o=2*t-n;break;case eo:i=r.length-2,o=t+r[i]-r[i+1];break;default:i=e,o=n}if(s===void 0)switch(this.getSettings_().endingEnd){case $a:a=e,s=2*n-t;break;case eo:a=1,s=n+r[1]-r[0];break;default:a=e-1,s=t}let c=(n-t)*.5,l=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(s-n),this._offsetPrev=i*l,this._offsetNext=a*l}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,p=(n-t)/(r-t),m=p*p,h=m*p,g=-d*h+2*d*m-d*p,_=(1+d)*h+(-1.5-2*d)*m+(-.5+d)*p+1,v=(-1-f)*h+(1.5+f)*m+.5*p,y=f*h-f*m;for(let e=0;e!==o;++e)i[e]=g*a[l+e]+_*a[c+e]+v*a[s+e]+y*a[u+e];return i}},Hd=class extends Bd{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=(n-t)/(r-t),u=1-l;for(let e=0;e!==o;++e)i[e]=a[c+e]*u+a[s+e]*l;return i}},Ud=class extends Bd{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e){return this.copySampleValue_(e-1)}},Wd=class extends Bd{interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this.inTangents,u=this.outTangents;if(!l||!u){let e=(n-t)/(r-t),l=1-e;for(let t=0;t!==o;++t)i[t]=a[c+t]*l+a[s+t]*e;return i}let d=o*2,f=e-1;for(let p=0;p!==o;++p){let o=a[c+p],m=a[s+p],h=f*d+p*2,g=u[h],_=u[h+1],v=e*d+p*2,y=l[v],b=l[v+1],x=qd(n,t,g,y,r);i[p]=Gd(x,o,_,b,m)}return i}};function Gd(e,t,n,r,i){let a=1-e;return a*a*a*t+3*a*a*e*n+3*a*e*e*r+e*e*e*i}function Kd(e,t,n,r,i){let a=1-e;return 3*a*a*(n-t)+6*a*e*(r-n)+3*e*e*(i-r)}function qd(e,t,n,r,i){let a=(e-t)/(i-t);for(let o=0;o<8;o++){let o=Gd(a,t,n,r,i)-e;if(Math.abs(o)<1e-10)break;let s=Kd(a,t,n,r,i);if(Math.abs(s)<1e-10)break;a=Math.max(0,Math.min(1,a-o/s))}return a}var Jd=class{constructor(e,t,n,r){if(e===void 0)throw Error(`THREE.KeyframeTrack: track name is undefined`);if(t===void 0||t.length===0)throw Error(`THREE.KeyframeTrack: no keyframes in track named `+e);this.name=e,this.times=Rd(t,this.TimeBufferType),this.values=Rd(n,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:Rd(e.times,Array),values:Rd(e.values,Array)};let t=e.getInterpolation();t!==e.DefaultInterpolation&&(n.interpolation=t),zd(e.settings)&&(n.settings={inTangents:Rd(e.settings.inTangents,Array),outTangents:Rd(e.settings.outTangents,Array)})}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new Ud(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new Hd(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new Vd(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new Wd(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case Ja:t=this.InterpolantFactoryMethodDiscrete;break;case Ya:t=this.InterpolantFactoryMethodLinear;break;case Xa:t=this.InterpolantFactoryMethodSmooth;break;case Za:t=this.InterpolantFactoryMethodBezier}if(t===void 0){let t=`unsupported interpolation for `+this.ValueTypeName+` keyframe track named `+this.name;if(this.createInterpolant===void 0){if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error(t)}return W(`KeyframeTrack:`,t),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Ja;case this.InterpolantFactoryMethodLinear:return Ya;case this.InterpolantFactoryMethodSmooth:return Xa;case this.InterpolantFactoryMethodBezier:return Za}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]+=e;zd(this.settings)&&(Yd(this.settings.inTangents,e),Yd(this.settings.outTangents,e))}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]*=e;zd(this.settings)&&(Xd(this.settings.inTangents,e),Xd(this.settings.outTangents,e))}return this}trim(e,t){let n=this.times,r=n.length,i=0,a=r-1;for(;i!==r&&n[i]<e;)++i;for(;a!==-1&&n[a]>t;)--a;if(++a,i!==0||a!==r){i>=a&&(a=Math.max(a,1),i=a-1);let e=this.getValueSize();this.times=n.slice(i,a),this.values=this.values.slice(i*e,a*e)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(G(`KeyframeTrack: Invalid value size in track.`,this),e=!1);let n=this.times,r=this.values,i=n.length;i===0&&(G(`KeyframeTrack: Track is empty.`,this),e=!1);let a=null;for(let t=0;t!==i;t++){let r=n[t];if(typeof r==`number`&&isNaN(r)){G(`KeyframeTrack: Time is not a valid number.`,this,t,r),e=!1;break}if(a!==null&&a>r){G(`KeyframeTrack: Out of order keys.`,this,t,r,a),e=!1;break}a=r}if(r!==void 0&&po(r))for(let t=0,n=r.length;t!==n;++t){let n=r[t];if(isNaN(n)){G(`KeyframeTrack: Value is not a valid number.`,this,t,n),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),r=this.getInterpolation()===Xa,i=e.length-1,a=1;for(let o=1;o<i;++o){let i=!1,s=e[o];if(s!==e[o+1]&&(o!==1||s!==e[0])){if(r)i=!0;else{let e=o*n,r=e-n,a=e+n;for(let o=0;o!==n;++o){let n=t[e+o];if(n!==t[r+o]||n!==t[a+o]){i=!0;break}}}}if(i){if(o!==a){e[a]=e[o];let r=o*n,i=a*n;for(let e=0;e!==n;++e)t[i+e]=t[r+e]}++a}}if(i>0){e[a]=e[i];for(let e=i*n,r=a*n,o=0;o!==n;++o)t[r+o]=t[e+o];++a}return a===e.length?(this.times=e,this.values=t):(this.times=e.slice(0,a),this.values=t.slice(0,a*n)),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,r=new n(this.name,e,t);return r.createInterpolant=this.createInterpolant,zd(this.settings)&&(r.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),r}};function Yd(e,t){for(let n=0,r=e.length;n!==r;n+=2)e[n]+=t}function Xd(e,t){for(let n=0,r=e.length;n!==r;n+=2)e[n]*=t}Jd.prototype.ValueTypeName=``,Jd.prototype.TimeBufferType=Float32Array,Jd.prototype.ValueBufferType=Float32Array,Jd.prototype.DefaultInterpolation=Ya;var Zd=class extends Jd{constructor(e,t,n){super(e,t,n)}};Zd.prototype.ValueTypeName=`bool`,Zd.prototype.ValueBufferType=Array,Zd.prototype.DefaultInterpolation=Ja,Zd.prototype.InterpolantFactoryMethodLinear=void 0,Zd.prototype.InterpolantFactoryMethodSmooth=void 0;var Qd=class extends Jd{constructor(e,t,n,r){super(e,t,n,r)}};Qd.prototype.ValueTypeName=`color`;var $d=class extends Jd{constructor(e,t,n,r){super(e,t,n,r)}};$d.prototype.ValueTypeName=`number`;var ef=class extends Bd{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=(n-t)/(r-t),c=e*o;for(let e=c+o;c!==e;c+=4)Po.slerpFlat(i,0,a,c-o,a,c,s);return i}},tf=class extends Jd{constructor(e,t,n,r){super(e,t,n,r)}InterpolantFactoryMethodLinear(e){return new ef(this.times,this.values,this.getValueSize(),e)}};tf.prototype.ValueTypeName=`quaternion`,tf.prototype.InterpolantFactoryMethodSmooth=void 0;var nf=class extends Jd{constructor(e,t,n){super(e,t,n)}};nf.prototype.ValueTypeName=`string`,nf.prototype.ValueBufferType=Array,nf.prototype.DefaultInterpolation=Ja,nf.prototype.InterpolantFactoryMethodLinear=void 0,nf.prototype.InterpolantFactoryMethodSmooth=void 0;var rf=class extends Jd{constructor(e,t,n,r){super(e,t,n,r)}};rf.prototype.ValueTypeName=`vector`;var af=class extends js{static registerNode(e){this.prototype._lightNode=e}constructor(e,t=1){super(),this.isLight=!0,this.type=`Light`,this.color=new J(e),this.intensity=t}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}},of=class extends af{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type=`HemisphereLight`,this.position.copy(js.DEFAULT_UP),this.updateMatrix(),this.groundColor=new J(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){let t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}},sf=new is,cf=new q,lf=new q,uf=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new K(512,512),this.mapType=Ui,this.map=null,this.mapPass=null,this.matrix=new is,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new xl,this._frameExtents=new K(1,1),this._viewportCount=1,this._viewports=[new $o(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera;cf.setFromMatrixPosition(e.matrixWorld),t.position.copy(cf),lf.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(lf),t.updateMatrixWorld(),this._updateMatrix(t,this.matrix,this._frustum)}_updateMatrix(e,t,n,r){sf.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),n.setFromProjectionMatrix(sf,e.coordinateSystem,e.reversedDepth);let i=this._frameExtents,a=r?r.z/i.x:1,o=r?r.w/i.y:1,s=r?r.x/i.x:0,c=r?r.y/i.y:0;e.coordinateSystem===2001||e.reversedDepth?t.set(.5*a,0,0,.5*a+s,0,.5*o,0,.5*o+c,0,0,1,0,0,0,0,1):t.set(.5*a,0,0,.5*a+s,0,.5*o,0,.5*o+c,0,0,.5,.5,0,0,0,1),t.multiply(sf)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.mapType=e.mapType,this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return e.intensity=this.intensity,e.bias=this.bias,e.normalBias=this.normalBias,e.radius=this.radius,e.blurSamples=this.blurSamples,e.mapSize=this.mapSize.toArray(),e.mapType=this.mapType,e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},df=new q,ff=new Po,pf=new q,mf=class extends js{constructor(){super(),this.isCamera=!0,this.type=`Camera`,this.matrixWorldInverse=new is,this.projectionMatrix=new is,this.projectionMatrixInverse=new is,this.coordinateSystem=uo,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(df,ff,pf),pf.x===1&&pf.y===1&&pf.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(df,ff,pf.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(df,ff,pf),pf.x===1&&pf.y===1&&pf.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(df,ff,pf.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},hf=new q,gf=new K,_f=new K,vf=class extends mf{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type=`PerspectiveCamera`,this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=To*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(wo*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return To*2*Math.atan(Math.tan(wo*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){hf.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(hf.x,hf.y).multiplyScalar(-e/hf.z),hf.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(hf.x,hf.y).multiplyScalar(-e/hf.z)}getViewSize(e,t){return this.getViewBounds(e,gf,_f),t.subVectors(_f,gf)}setViewOffset(e,t,n,r,i,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(wo*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,i=-.5*r,a=this.view;if(this.view!==null&&this.view.enabled){let e=a.fullWidth,o=a.fullHeight;i+=a.offsetX*r/e,t-=a.offsetY*n/o,r*=a.width/e,n*=a.height/o}let o=this.filmOffset;o!==0&&(i+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(i,i+r,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},yf=class extends uf{constructor(){super(new vf(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){let t=this.camera,n=To*2*e.angle*this.focus,r=this.mapSize.width/this.mapSize.height*this.aspect,i=e.distance||t.far;(n!==t.fov||r!==t.aspect||i!==t.far)&&(t.fov=n,t.aspect=r,t.far=i,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this.aspect=e.aspect,this}toJSON(){let e=super.toJSON();return e.focus=this.focus,e.aspect=this.aspect,e}},bf=class extends af{constructor(e,t,n=0,r=Math.PI/3,i=0,a=2){super(e,t),this.isSpotLight=!0,this.type=`SpotLight`,this.position.copy(js.DEFAULT_UP),this.updateMatrix(),this.target=new js,this.distance=n,this.angle=r,this.penumbra=i,this.decay=a,this.map=null,this.shadow=new yf}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.map=e.map,this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.distance=this.distance,t.object.angle=this.angle,t.object.decay=this.decay,t.object.penumbra=this.penumbra,t.object.target=this.target.uuid,this.map&&this.map.isTexture&&(t.object.map=this.map.toJSON(e).uuid),t.object.shadow=this.shadow.toJSON(),t}},xf=class extends mf{constructor(e=-1,t=1,n=1,r=-1,i=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type=`OrthographicCamera`,this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=i,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,i,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2,i=n-e,a=n+e,o=r+t,s=r-t;if(this.view!==null&&this.view.enabled){let e=(this.right-this.left)/this.view.fullWidth/this.zoom,t=(this.top-this.bottom)/this.view.fullHeight/this.zoom;i+=e*this.view.offsetX,a=i+e*this.view.width,o-=t*this.view.offsetY,s=o-t*this.view.height}this.projectionMatrix.makeOrthographic(i,a,o,s,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},Sf=class extends uf{constructor(){super(new xf(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Cf=class extends af{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type=`DirectionalLight`,this.position.copy(js.DEFAULT_UP),this.updateMatrix(),this.target=new js,this.shadow=new Sf}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}},wf=-90,Tf=1,Ef=class extends js{constructor(e,t,n){super(),this.type=`CubeCamera`,this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let r=new vf(wf,Tf,e,t);r.layers=this.layers,this.add(r);let i=new vf(wf,Tf,e,t);i.layers=this.layers,this.add(i);let a=new vf(wf,Tf,e,t);a.layers=this.layers,this.add(a);let o=new vf(wf,Tf,e,t);o.layers=this.layers,this.add(o);let s=new vf(wf,Tf,e,t);s.layers=this.layers,this.add(s);let c=new vf(wf,Tf,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,r,i,a,o,s]=t;for(let e of t)this.remove(e);if(e===2e3)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),i.up.set(0,0,-1),i.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),s.up.set(0,1,0),s.lookAt(0,0,-1);else if(e===2001)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),i.up.set(0,0,1),i.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),s.up.set(0,-1,0),s.lookAt(0,0,-1);else throw Error(`THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: `+e);for(let e of t)this.add(e),e.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[i,a,o,s,c,l]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),p=e.xr.enabled;e.xr.enabled=!1;let m=n.texture.mipmapsAutoUpdate;n.texture.mipmapsAutoUpdate=!1;let h=!1;h=e.isWebGLRenderer===!0?e.state.buffers.depth.getReversed():e.reversedDepthBuffer,e.setRenderTarget(n,0,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,i),e.setRenderTarget(n,1,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,2,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,3,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(n,4,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),n.texture.mipmapsAutoUpdate=m,e.setRenderTarget(n,5,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(u,d,f),e.xr.enabled=p,n.texture.needsPMREMUpdate=!0}},Df=class extends vf{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e,this.perCameraFrustumCulled=!1}},Of=class{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(e){this._document=e,e.hidden!==void 0&&(this._pageVisibilityHandler=kf.bind(this),e.addEventListener(`visibilitychange`,this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener(`visibilitychange`,this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(e){return this._timescale=e,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(e){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(e===void 0?performance.now():e)-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}};function kf(){this._document.hidden===!1&&this.reset()}var Af=`\\[\\]\\.:\\/`,jf=RegExp(`[\\[\\]\\.:\\/]`,`g`),Mf=`[^\\[\\]\\.:\\/]`,Nf=`[^`+Af.replace(`\\.`,``)+`]`,Pf=`((?:WC+[\\/:])*)`.replace(`WC`,Mf),Ff=`(WCOD+)?`.replace(`WCOD`,Nf),If=`(?:\\.(WC+)(?:\\[(.+)\\])?)?`.replace(`WC`,Mf),Lf=`\\.(WC+)(?:\\[(.+)\\])?`.replace(`WC`,Mf),Rf=RegExp(`^`+Pf+Ff+If+Lf+`$`),zf=[`material`,`materials`,`bones`,`map`],Bf=class{constructor(e,t,n){let r=n||Vf.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,r)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,r=this._bindings[n];r!==void 0&&r.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let r=this._targetGroup.nCachedObjects_,i=n.length;r!==i;++r)n[r].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},Vf=class e{constructor(t,n,r){this.path=n,this.parsedPath=r||e.parseTrackName(n),this.node=e.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,n,r){return t&&t.isAnimationObjectGroup?new e.Composite(t,n,r):new e(t,n,r)}static sanitizeNodeName(e){return e.replace(/\s/g,`_`).replace(jf,``)}static parseTrackName(e){let t=Rf.exec(e);if(t===null)throw Error(`THREE.PropertyBinding: Cannot parse trackName: `+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},r=n.nodeName&&n.nodeName.lastIndexOf(`.`);if(r!==void 0&&r!==-1){let e=n.nodeName.substring(r+1);zf.indexOf(e)!==-1&&(n.nodeName=n.nodeName.substring(0,r),n.objectName=e)}if(n.propertyName===null||n.propertyName.length===0)throw Error(`THREE.PropertyBinding: can not parse propertyName from trackName: `+e);return n}static findNode(e,t){if(t===void 0||t===``||t===`.`||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(e){for(let r=0;r<e.length;r++){let i=e[r];if(i.name===t||i.uuid===t)return i;let a=n(i.children);if(a)return a}return null},r=n(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)e[t++]=n[r]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let t=this.node,n=this.parsedPath,r=n.objectName,i=n.propertyName,a=n.propertyIndex;if(t||(t=e.findNode(this.rootNode,n.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){W(`PropertyBinding: No target node found for track: `+this.path+`.`);return}if(r){let e=n.objectIndex;switch(r){case`materials`:if(!t.material){G(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.materials){G(`PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.`,this);return}t=t.material.materials;break;case`bones`:if(!t.skeleton){G(`PropertyBinding: Can not bind to bones as node does not have a skeleton.`,this);return}t=t.skeleton.bones;for(let n=0;n<t.length;n++)if(t[n].name===e){e=n;break}break;case`map`:if(`map`in t){t=t.map;break}if(!t.material){G(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.map){G(`PropertyBinding: Can not bind to material.map as node.material does not have a map.`,this);return}t=t.material.map;break;default:if(t[r]===void 0){G(`PropertyBinding: Can not bind to objectName of node undefined.`,this);return}t=t[r]}if(e!==void 0){if(t[e]===void 0){G(`PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.`,this,t);return}t=t[e]}}let o=t[i];if(o===void 0){let e=n.nodeName;G(`PropertyBinding: Trying to update property for track: `+e+`.`+i+` but it wasn't found.`,t);return}let s=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?s=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(s=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(a!==void 0){if(i===`morphTargetInfluences`){if(!t.geometry){G(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.`,this);return}if(!t.geometry.morphAttributes){G(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.`,this);return}t.morphTargetDictionary[a]!==void 0&&(a=t.morphTargetDictionary[a])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=a}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=i;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][s]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Vf.Composite=Bf,Vf.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3},Vf.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2},Vf.prototype.GetterByBindingType=[Vf.prototype._getValue_direct,Vf.prototype._getValue_array,Vf.prototype._getValue_arrayElement,Vf.prototype._getValue_toArray],Vf.prototype.SetterByBindingTypeAndVersioning=[[Vf.prototype._setValue_direct,Vf.prototype._setValue_direct_setNeedsUpdate,Vf.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Vf.prototype._setValue_array,Vf.prototype._setValue_array_setNeedsUpdate,Vf.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Vf.prototype._setValue_arrayElement,Vf.prototype._setValue_arrayElement_setNeedsUpdate,Vf.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Vf.prototype._setValue_fromArray,Vf.prototype._setValue_fromArray_setNeedsUpdate,Vf.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]],class{static{this.prototype.isMatrix2=!0}constructor(e,t,n,r){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,r)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,r){let i=this.elements;return i[0]=e,i[2]=t,i[1]=n,i[3]=r,this}};function Hf(e,t,n,r){let i=Uf(r);switch(n){case na:return e*t;case sa:return e*t/i.components*i.byteLength;case ca:return e*t/i.components*i.byteLength;case la:return e*t*2/i.components*i.byteLength;case ua:return e*t*2/i.components*i.byteLength;case ra:return e*t*3/i.components*i.byteLength;case ia:return e*t*4/i.components*i.byteLength;case da:return e*t*4/i.components*i.byteLength;case fa:case pa:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case ma:case ha:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case _a:case ya:return Math.max(e,16)*Math.max(t,8)/4;case ga:case va:return Math.max(e,8)*Math.max(t,8)/2;case ba:case xa:case Ca:case wa:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case Sa:case Ta:case Ea:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case Da:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case Oa:return Math.floor((e+4)/5)*Math.floor((t+3)/4)*16;case ka:return Math.floor((e+4)/5)*Math.floor((t+4)/5)*16;case Aa:return Math.floor((e+5)/6)*Math.floor((t+4)/5)*16;case ja:return Math.floor((e+5)/6)*Math.floor((t+5)/6)*16;case Ma:return Math.floor((e+7)/8)*Math.floor((t+4)/5)*16;case Na:return Math.floor((e+7)/8)*Math.floor((t+5)/6)*16;case Pa:return Math.floor((e+7)/8)*Math.floor((t+7)/8)*16;case Fa:return Math.floor((e+9)/10)*Math.floor((t+4)/5)*16;case Ia:return Math.floor((e+9)/10)*Math.floor((t+5)/6)*16;case La:return Math.floor((e+9)/10)*Math.floor((t+7)/8)*16;case Ra:return Math.floor((e+9)/10)*Math.floor((t+9)/10)*16;case za:return Math.floor((e+11)/12)*Math.floor((t+9)/10)*16;case Ba:return Math.floor((e+11)/12)*Math.floor((t+11)/12)*16;case Va:case Ha:case Ua:return Math.ceil(e/4)*Math.ceil(t/4)*16;case Wa:case Ga:return Math.ceil(e/4)*Math.ceil(t/4)*8;case Ka:case qa:return Math.ceil(e/4)*Math.ceil(t/4)*16}throw Error(`Unable to determine texture byte length for ${n} format.`)}function Uf(e){switch(e){case Ui:case Wi:return{byteLength:1,components:1};case Ki:case Gi:case Xi:return{byteLength:2,components:1};case Zi:case Qi:return{byteLength:2,components:4};case Ji:case qi:case Yi:return{byteLength:4,components:1};case ea:case ta:return{byteLength:4,components:3}}throw Error(`THREE.TextureUtils: Unknown texture type ${e}.`)}typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`register`,{detail:{revision:`187`}})),typeof window<`u`&&(window.__THREE__?W(`WARNING: Multiple instances of Three.js being imported.`):window.__THREE__=`187`);function Wf(){let e=null,t=!1,n=null,r=null;function i(t,a){r=e.requestAnimationFrame(i),n(t,a)}return{start:function(){t!==!0&&n!==null&&e!==null&&(r=e.requestAnimationFrame(i),t=!0)},stop:function(){e!==null&&e.cancelAnimationFrame(r),t=!1},setAnimationLoop:function(e){n=e},setContext:function(t){e=t}}}function Gf(e){let t=new WeakMap;function n(t,n){let r=t.array,i=t.usage,a=r.byteLength,o=e.createBuffer();e.bindBuffer(n,o),e.bufferData(n,r,i),t.onUploadCallback();let s;if(r instanceof Float32Array)s=e.FLOAT;else if(typeof Float16Array<`u`&&r instanceof Float16Array)s=e.HALF_FLOAT;else if(r instanceof Uint16Array)s=t.isFloat16BufferAttribute?e.HALF_FLOAT:e.UNSIGNED_SHORT;else if(r instanceof Int16Array)s=e.SHORT;else if(r instanceof Uint32Array)s=e.UNSIGNED_INT;else if(r instanceof Int32Array)s=e.INT;else if(r instanceof Int8Array)s=e.BYTE;else if(r instanceof Uint8Array)s=e.UNSIGNED_BYTE;else if(r instanceof Uint8ClampedArray)s=e.UNSIGNED_BYTE;else throw Error(`THREE.WebGLAttributes: Unsupported buffer data format: `+r);return{buffer:o,type:s,bytesPerElement:r.BYTES_PER_ELEMENT,version:t.version,size:a}}function r(t,n,r){let i=n.array,a=n.updateRanges;if(e.bindBuffer(r,t),a.length===0)e.bufferSubData(r,0,i);else{a.sort((e,t)=>e.start-t.start);let t=0;for(let e=1;e<a.length;e++){let n=a[t],r=a[e];r.start<=n.start+n.count+1?n.count=Math.max(n.count,r.start+r.count-n.start):(++t,a[t]=r)}a.length=t+1;for(let t=0,n=a.length;t<n;t++){let n=a[t];e.bufferSubData(r,n.start*i.BYTES_PER_ELEMENT,i,n.start,n.count)}n.clearUpdateRanges()}n.onUploadCallback()}function i(e){return e.isInterleavedBufferAttribute&&(e=e.data),t.get(e)}function a(n){n.isInterleavedBufferAttribute&&(n=n.data);let r=t.get(n);r&&(e.deleteBuffer(r.buffer),t.delete(n))}function o(e,i){if(e.isInterleavedBufferAttribute&&(e=e.data),e.isGLBufferAttribute){let n=t.get(e);(!n||n.version<e.version)&&t.set(e,{buffer:e.buffer,type:e.type,bytesPerElement:e.elementSize,version:e.version});return}let a=t.get(e);if(a===void 0)t.set(e,n(e,i));else if(a.version<e.version){if(a.size!==e.array.byteLength)throw Error(`THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.`);r(a.buffer,e,i),a.version=e.version}}return{get:i,remove:a,update:o}}var Kf={alphahash_fragment:`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,alphahash_pars_fragment:`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,alphamap_fragment:`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,alphamap_pars_fragment:`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,alphatest_fragment:`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,alphatest_pars_fragment:`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aomap_fragment:`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,aomap_pars_fragment:`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,batching_pars_vertex:`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,batching_vertex:`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,begin_vertex:`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,beginnormal_vertex:`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bsdfs:`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,iridescence_fragment:`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,bumpmap_pars_fragment:`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,clipping_planes_fragment:`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,clipping_planes_pars_fragment:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,clipping_planes_pars_vertex:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,clipping_planes_vertex:`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,color_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,color_pars_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,color_pars_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,color_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,common:`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,defaultnormal_vertex:`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,displacementmap_pars_vertex:`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,displacementmap_vertex:`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,emissivemap_fragment:`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,emissivemap_pars_fragment:`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,colorspace_fragment:`gl_FragColor = linearToOutputTexel( gl_FragColor );`,colorspace_pars_fragment:`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,envmap_fragment:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,envmap_common_pars_fragment:`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	uniform samplerCube envMap;
	#ifdef ENVMAP_TYPE_PMREM
		float roughnessToMip( const in float roughness ) {
			float r = clamp( roughness, 0.0, 1.0 );
			return ENVMAP_MAX_LOD * r * ( 2.0 - r );
		}
	#endif
#endif`,envmap_pars_fragment:`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,envmap_pars_vertex:`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,envmap_physical_pars_fragment:`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * worldNormal, ENVMAP_MAX_LOD );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * reflectVec, roughnessToMip( roughness ) );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureLod( envMap, envMapRotation * retroVec, roughnessToMip( roughness ) );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_PMREM
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,envmap_vertex:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,fog_vertex:`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fog_pars_vertex:`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fog_fragment:`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fog_pars_fragment:`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gradientmap_pars_fragment:`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,lightmap_pars_fragment:`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lights_lambert_fragment:`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lights_lambert_pars_fragment:`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,lights_pars_begin:`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,lights_toon_fragment:`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lights_toon_pars_fragment:`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lights_phong_fragment:`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lights_phong_pars_fragment:`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lights_physical_fragment:`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.045 );
material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef USE_DIFFUSE_ROUGHNESS
	float diffuseRoughnessFactor = diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		diffuseRoughnessFactor *= texture2D( diffuseRoughnessMap, vDiffuseRoughnessMapUv ).r;
	#endif
	material.diffuseRoughness = saturate( diffuseRoughnessFactor );
#endif
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.045 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,lights_physical_pars_fragment:`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float diffuseRoughness;
	#endif
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
#ifdef USE_DIFFUSE_ROUGHNESS
	const float EON_EPSILON = 1e-7;
	float FON_DirectionalAlbedo( const in float mu, const in float roughness, const in float A ) {
		float muComp = 1.0 - mu;
		float gOverPi = muComp * ( 0.0571085289 + muComp * ( 0.491881867 + muComp * ( - 0.332181442 + muComp * 0.0714429953 ) ) );
		return A * ( 1.0 + roughness * gOverPi );
	}
	vec3 BRDF_EON( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 diffuseColor, const in float roughness ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return BRDF_Lambert( rho );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float s = dot( lightDir, viewDir ) - dotNL * dotNV;
		float sOverT = ( s > 0.0 ) ? s / max( max( dotNL, dotNV ), EON_EPSILON ) : s;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		vec3 singleScatter = rho * RECIPROCAL_PI * A * ( 1.0 + roughness * sOverT );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		float albedoV = FON_DirectionalAlbedo( dotNV, roughness, A );
		float albedoL = FON_DirectionalAlbedo( dotNL, roughness, A );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		vec3 multiScatter = rhoMultiScatter * RECIPROCAL_PI
			* max( EON_EPSILON, 1.0 - albedoV )
			* max( EON_EPSILON, 1.0 - albedoL )
			/ max( EON_EPSILON, 1.0 - averageAlbedo );
		return singleScatter + multiScatter;
	}
	vec3 EON_DirectionalAlbedo( const in vec3 diffuseColor, const in float roughness, const in float dotNV ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return rho;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		float directionalAlbedo = FON_DirectionalAlbedo( dotNV, roughness, A );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		return rho * directionalAlbedo + rhoMultiScatter * ( 1.0 - directionalAlbedo );
	}
#endif
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = max( material.clearcoatRoughness, 0.045 );
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = max( material.roughness, 0.045 );
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float alphaT = max( material.alphaT, alpha );
		float V = V_GGX_SmithCorrelated_Anisotropic( alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		vec3 diffuseBRDF = BRDF_EON( directLight.direction, geometryViewDir, geometryNormal, material.diffuseColor, material.diffuseRoughness ) * ( 1.0 - material.metalness );
	#else
		vec3 diffuseBRDF = BRDF_Lambert( material.diffuseContribution );
	#endif
	reflectedLight.directDiffuse += irradiance * diffuseBRDF * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuseAlbedo = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness );
		vec3 diffuse = irradiance * RECIPROCAL_PI * diffuseAlbedo * ( 1.0 - singleScattering - multiScattering );
	#else
		vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#endif
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuse = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness ) * ( 1.0 - totalScatteringDielectric );
	#else
		vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	#endif
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lights_fragment_begin:`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_LIGHT_PROBE_GRIDS > 0
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		int probeGrid = - 1;
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( isInsideLightProbeGrid( probeWorldPos, probeWorldNormal, probesMin[ i ], probesMax[ i ], probesResolution[ i ] ) ) probeGrid = UNROLLED_LOOP_INDEX;
		}
		#pragma unroll_loop_end
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( probeGrid == UNROLLED_LOOP_INDEX ) irradiance += getLightProbeGridIrradiance( probesSH[ i ], probesMin[ i ], probesMax[ i ], probesResolution[ i ], probeWorldPos, probeWorldNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lights_fragment_maps:`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_PMREM )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lights_fragment_end:`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,lightprobes_pars_fragment:`#if NUM_LIGHT_PROBE_GRIDS > 0
uniform highp sampler3D probesSH[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMin[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMax[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesResolution[ NUM_LIGHT_PROBE_GRIDS ];
bool isInsideLightProbeGrid( vec3 worldPos, vec3 worldNormal, vec3 probesMin, vec3 probesMax, vec3 probesResolution ) {
	vec3 spacing = ( probesMax - probesMin ) / probesResolution;
	vec3 samplePos = worldPos + worldNormal * spacing * 0.5;
	vec3 margin = spacing * 0.01;
	return all( greaterThanEqual( samplePos, probesMin - margin ) ) && all( lessThanEqual( samplePos, probesMax + margin ) );
}
vec3 getLightProbeGridIrradiance( highp sampler3D probesSH, vec3 probesMin, vec3 probesMax, vec3 probesResolution, vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 probeSpacing = gridRange / res;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.5 / res, 1.0 - 0.5 / res );
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,logdepthbuf_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,logdepthbuf_pars_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_pars_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,map_fragment:`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,map_pars_fragment:`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,map_particle_fragment:`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,map_particle_pars_fragment:`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,metalnessmap_fragment:`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,metalnessmap_pars_fragment:`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,morphinstance_vertex:`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,morphcolor_vertex:`#if defined( USE_MORPHCOLORS )
	#if defined( USE_COLOR_ALPHA )
		vColor *= morphTargetBaseInfluence;
	#elif defined( USE_COLOR )
		vColor.rgb *= morphTargetBaseInfluence;
	#endif
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor.rgb += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,morphnormal_vertex:`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,morphtarget_pars_vertex:`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,morphtarget_vertex:`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,normal_fragment_begin:`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,normal_fragment_maps:`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,normal_pars_fragment:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_pars_vertex:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_vertex:`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,normalmap_pars_fragment:`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,clearcoat_normal_fragment_begin:`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,clearcoat_normal_fragment_maps:`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,clearcoat_pars_fragment:`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iridescence_pars_fragment:`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,opaque_fragment:`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,packing:`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,premultiplied_alpha_fragment:`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,project_vertex:`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dithering_fragment:`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dithering_pars_fragment:`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,roughnessmap_fragment:`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,roughnessmap_pars_fragment:`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,shadowmap_pars_fragment:`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				vec2 radius = shadowRadius * texelSize;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float lightDistance = length( lightToPosition );
			float depthRange = shadowCameraFar - shadowCameraNear;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float depthA = - shadowCameraNear / depthRange - shadowBias;
				float depthB = shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#else
				float depthA = shadowCameraFar / depthRange + shadowBias;
				float depthB = - shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			shadow = 0.0;
			for ( int i = 0; i < 5; i ++ ) {
				vec2 offset = vogelDiskSample( i, 5, phi );
				vec3 direction = bd3D + ( tangent * offset.x + bitangent * offset.y ) * texelSize;
				vec3 absDirection = abs( direction );
				float dp = depthA + depthB / max( max( absDirection.x, absDirection.y ), absDirection.z );
				shadow += texture( shadowMap, vec4( direction, dp ) );
			}
			shadow *= 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,shadowmap_pars_vertex:`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,shadowmap_vertex:`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,shadowmask_pars_fragment:`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,skinbase_vertex:`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,skinning_pars_vertex:`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,skinning_vertex:`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,skinnormal_vertex:`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,specularmap_fragment:`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,specularmap_pars_fragment:`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tonemapping_fragment:`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tonemapping_pars_fragment:`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,transmission_fragment:`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,transmission_pars_fragment:`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,uv_pars_fragment:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_pars_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	uniform mat3 diffuseRoughnessMapTransform;
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	vDiffuseRoughnessMapUv = ( diffuseRoughnessMapTransform * vec3( DIFFUSE_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,worldpos_vertex:`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <envmap_common_pars_fragment>
void main() {
	#ifdef ENVMAP_TYPE_PMREM
		vec4 texColor = textureLod( envMap, backgroundRotation * vWorldDirection, roughnessToMip( backgroundBlurriness ) );
	#else
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,depth_frag:`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,distance_vert:`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,distance_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,linedashed_frag:`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,meshbasic_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,meshbasic_frag:`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshlambert_vert:`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshmatcap_vert:`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,meshmatcap_frag:`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshnormal_vert:`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshphysical_vert:`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,meshphysical_frag:`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DIFFUSE_ROUGHNESS
	uniform float diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		uniform sampler2D diffuseRoughnessMap;
	#endif
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshtoon_vert:`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,points_vert:`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,points_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,shadow_vert:`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sprite_vert:`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sprite_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`},Y={common:{diffuse:{value:new J(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Lo},alphaMap:{value:null},alphaMapTransform:{value:new Lo},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Lo}},envmap:{envMap:{value:null},envMapRotation:{value:new Lo},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Lo}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Lo}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Lo},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Lo},normalScale:{value:new K(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Lo},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Lo}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Lo}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Lo}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new J(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:[]},probesMin:{value:[]},probesMax:{value:[]},probesResolution:{value:[]}},points:{diffuse:{value:new J(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Lo},alphaTest:{value:0},uvTransform:{value:new Lo}},sprite:{diffuse:{value:new J(16777215)},opacity:{value:1},center:{value:new K(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Lo},alphaMap:{value:null},alphaMapTransform:{value:new Lo},alphaTest:{value:0}}},qf={basic:{uniforms:wd([Y.common,Y.specularmap,Y.envmap,Y.aomap,Y.lightmap,Y.fog]),vertexShader:Kf.meshbasic_vert,fragmentShader:Kf.meshbasic_frag},lambert:{uniforms:wd([Y.common,Y.specularmap,Y.envmap,Y.aomap,Y.lightmap,Y.emissivemap,Y.bumpmap,Y.normalmap,Y.displacementmap,Y.fog,Y.lights,{emissive:{value:new J(0)},envMapIntensity:{value:1}}]),vertexShader:Kf.meshlambert_vert,fragmentShader:Kf.meshlambert_frag},phong:{uniforms:wd([Y.common,Y.specularmap,Y.envmap,Y.aomap,Y.lightmap,Y.emissivemap,Y.bumpmap,Y.normalmap,Y.displacementmap,Y.fog,Y.lights,{emissive:{value:new J(0)},specular:{value:new J(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Kf.meshphong_vert,fragmentShader:Kf.meshphong_frag},standard:{uniforms:wd([Y.common,Y.envmap,Y.aomap,Y.lightmap,Y.emissivemap,Y.bumpmap,Y.normalmap,Y.displacementmap,Y.roughnessmap,Y.metalnessmap,Y.fog,Y.lights,{emissive:{value:new J(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Kf.meshphysical_vert,fragmentShader:Kf.meshphysical_frag},toon:{uniforms:wd([Y.common,Y.aomap,Y.lightmap,Y.emissivemap,Y.bumpmap,Y.normalmap,Y.displacementmap,Y.gradientmap,Y.fog,Y.lights,{emissive:{value:new J(0)}}]),vertexShader:Kf.meshtoon_vert,fragmentShader:Kf.meshtoon_frag},matcap:{uniforms:wd([Y.common,Y.bumpmap,Y.normalmap,Y.displacementmap,Y.fog,{matcap:{value:null}}]),vertexShader:Kf.meshmatcap_vert,fragmentShader:Kf.meshmatcap_frag},points:{uniforms:wd([Y.points,Y.fog]),vertexShader:Kf.points_vert,fragmentShader:Kf.points_frag},dashed:{uniforms:wd([Y.common,Y.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Kf.linedashed_vert,fragmentShader:Kf.linedashed_frag},depth:{uniforms:wd([Y.common,Y.displacementmap]),vertexShader:Kf.depth_vert,fragmentShader:Kf.depth_frag},normal:{uniforms:wd([Y.common,Y.bumpmap,Y.normalmap,Y.displacementmap,{opacity:{value:1}}]),vertexShader:Kf.meshnormal_vert,fragmentShader:Kf.meshnormal_frag},sprite:{uniforms:wd([Y.sprite,Y.fog]),vertexShader:Kf.sprite_vert,fragmentShader:Kf.sprite_frag},background:{uniforms:{uvTransform:{value:new Lo},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Kf.background_vert,fragmentShader:Kf.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Lo}},vertexShader:Kf.backgroundCube_vert,fragmentShader:Kf.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Kf.cube_vert,fragmentShader:Kf.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Kf.equirect_vert,fragmentShader:Kf.equirect_frag},distance:{uniforms:wd([Y.common,Y.displacementmap,{referencePosition:{value:new q},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Kf.distance_vert,fragmentShader:Kf.distance_frag},shadow:{uniforms:wd([Y.lights,Y.fog,{color:{value:new J(0)},opacity:{value:1}}]),vertexShader:Kf.shadow_vert,fragmentShader:Kf.shadow_frag}};qf.physical={uniforms:wd([qf.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Lo},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Lo},clearcoatNormalScale:{value:new K(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Lo},diffuseRoughness:{value:0},diffuseRoughnessMap:{value:null},diffuseRoughnessMapTransform:{value:new Lo},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Lo},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Lo},sheen:{value:0},sheenColor:{value:new J(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Lo},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Lo},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Lo},transmissionSamplerSize:{value:new K},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Lo},attenuationDistance:{value:0},attenuationColor:{value:new J(0)},specularColor:{value:new J(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Lo},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Lo},anisotropyVector:{value:new K},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Lo}}]),vertexShader:Kf.meshphysical_vert,fragmentShader:Kf.meshphysical_frag};var Jf={r:0,b:0,g:0},Yf=new is,Xf=new Lo;Xf.set(-1,0,0,0,1,0,0,0,1);function Zf(e,t,n,r,i,a){let o=new J(0),s=i===!0?0:1,c,l,u=null,d=0,f=null;function p(e){let n=e.isScene===!0?e.background:null;if(n&&n.isTexture){let r=e.backgroundBlurriness>0;n=t.get(n,r)}return n}function m(t){let r=!1,i=p(t);i===null?g(o,s):i&&i.isColor&&(g(i,1),r=!0);let c=e.xr.getEnvironmentBlendMode();c===`additive`?n.buffers.color.setClear(0,0,0,1,a):c===`alpha-blend`&&n.buffers.color.setClear(0,0,0,0,a),(e.autoClear||r)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function h(t,n){let i=p(n);i&&i.isCubeTexture?(l===void 0&&(l=new al(new Yl(1,1,1),new jd({name:`BackgroundCubeMaterial`,uniforms:Cd(qf.backgroundCube.uniforms),vertexShader:qf.backgroundCube.vertexShader,fragmentShader:qf.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute(`normal`),l.geometry.deleteAttribute(`uv`),l.onBeforeRender=function(e,t,n){this.matrixWorld.copyPosition(n.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(l)),l.material.uniforms.envMap.value=i,l.material.uniforms.backgroundBlurriness.value=n.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(Yf.makeRotationFromEuler(n.backgroundRotation)).transpose(),i.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(Xf),l.material.toneMapped=Ho.getTransfer(i.colorSpace)!==ao,(u!==i||d!==i.version||f!==e.toneMapping)&&(l.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),l.layers.enableAll(),t.unshift(l,l.geometry,l.material,0,0,null)):i&&i.isTexture&&(c===void 0&&(c=new al(new _d(2,2),new jd({name:`BackgroundMaterial`,uniforms:Cd(qf.background.uniforms),vertexShader:qf.background.vertexShader,fragmentShader:qf.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute(`normal`),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=i,c.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,c.material.toneMapped=Ho.getTransfer(i.colorSpace)!==ao,i.matrixAutoUpdate===!0&&i.updateMatrix(),c.material.uniforms.uvTransform.value.copy(i.matrix),(u!==i||d!==i.version||f!==e.toneMapping)&&(c.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),c.layers.enableAll(),t.unshift(c,c.geometry,c.material,0,0,null))}function g(t,r){t.getRGB(Jf,Dd(e)),n.buffers.color.setClear(Jf.r,Jf.g,Jf.b,r,a)}function _(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(e,t=1){o.set(e),s=t,g(o,s)},getClearAlpha:function(){return s},setClearAlpha:function(e){s=e,g(o,s)},render:m,addToRenderList:h,dispose:_}}function Qf(e,t){let n=e.getParameter(e.MAX_VERTEX_ATTRIBS),r={},i=f(null),a=i,o=!1;function s(n,r,i,s,c){let u=!1,f=d(n,s,i,r);a!==f&&(a=f,l(a.object)),u=p(n,s,i,c),u&&m(n,s,i,c),c!==null&&t.update(c,e.ELEMENT_ARRAY_BUFFER),(u||o)&&(o=!1,b(n,r,i,s),c!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(c).buffer))}function c(){return e.createVertexArray()}function l(t){return e.bindVertexArray(t)}function u(t){return e.deleteVertexArray(t)}function d(e,t,n,i){let a=i.wireframe===!0,o=r[t.id];o===void 0&&(o={},r[t.id]=o);let s=e.isInstancedMesh===!0?e.id:0,l=o[s];l===void 0&&(l={},o[s]=l);let u=l[n.id];u===void 0&&(u={},l[n.id]=u);let d=u[a];return d===void 0&&(d=f(c()),u[a]=d),d}function f(e){let t=[],r=[],i=[];for(let e=0;e<n;e++)t[e]=0,r[e]=0,i[e]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:t,enabledAttributes:r,attributeDivisors:i,object:e,attributes:{},index:null}}function p(e,t,n,r){let i=a.attributes,o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=i[t],r=o[t];if(r===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(r=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(r=e.instanceColor)),n===void 0||n.attribute!==r||r&&n.data!==r.data)return!0;s++}return a.attributesNum!==s||a.index!==r}function m(e,t,n,r){let i={},o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=o[t];n===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(n=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(n=e.instanceColor));let r={};r.attribute=n,n&&n.data&&(r.data=n.data),i[t]=r,s++}a.attributes=i,a.attributesNum=s,a.index=r}function h(){let e=a.newAttributes;for(let t=0,n=e.length;t<n;t++)e[t]=0}function g(e){_(e,0)}function _(t,n){let r=a.newAttributes,i=a.enabledAttributes,o=a.attributeDivisors;r[t]=1,i[t]===0&&(e.enableVertexAttribArray(t),i[t]=1),o[t]!==n&&(e.vertexAttribDivisor(t,n),o[t]=n)}function v(){let t=a.newAttributes,n=a.enabledAttributes;for(let r=0,i=n.length;r<i;r++)n[r]!==t[r]&&(e.disableVertexAttribArray(r),n[r]=0)}function y(t,n,r,i,a,o,s){s===!0?e.vertexAttribIPointer(t,n,r,a,o):e.vertexAttribPointer(t,n,r,i,a,o)}function b(n,r,i,a){h();let o=a.attributes,s=i.getAttributes(),c=r.defaultAttributeValues;for(let r in s){let i=s[r];if(i.location>=0){let s=o[r];if(s===void 0&&(r===`instanceMatrix`&&n.instanceMatrix&&(s=n.instanceMatrix),r===`instanceColor`&&n.instanceColor&&(s=n.instanceColor)),s!==void 0){let r=s.normalized,o=s.itemSize,c=t.get(s);if(c===void 0)continue;let l=c.buffer,u=c.type,d=c.bytesPerElement,f=u===e.INT||u===e.UNSIGNED_INT||s.gpuType===1013;if(s.isInterleavedBufferAttribute){let t=s.data,c=t.isInterleavedBuffer===!0?t.stride:t.itemSize,p=s.offset;if(t.isInstancedInterleavedBuffer||t.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,t.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=t.meshPerAttribute*t.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,c*d,(p+o/i.locationSize*e)*d,f)}else{if(s.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,s.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=s.meshPerAttribute*s.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,o*d,o/i.locationSize*e*d,f)}}else if(c!==void 0){let t=c[r];if(t!==void 0)switch(t.length){case 2:e.vertexAttrib2fv(i.location,t);break;case 3:e.vertexAttrib3fv(i.location,t);break;case 4:e.vertexAttrib4fv(i.location,t);break;default:e.vertexAttrib1fv(i.location,t)}}}}v()}function x(){T();for(let e in r){let t=r[e];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e]}}function S(e){if(r[e.id]===void 0)return;let t=r[e.id];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e.id]}function C(e){for(let t in r){let n=r[t];for(let t in n){let r=n[t];if(r[e.id]===void 0)continue;let i=r[e.id];for(let e in i)u(i[e].object),delete i[e];delete r[e.id]}}}function w(e){for(let t in r){let n=r[t],i=e.isInstancedMesh===!0?e.id:0,a=n[i];if(a!==void 0){for(let e in a){let t=a[e];for(let e in t)u(t[e].object),delete t[e];delete a[e]}delete n[i],Object.keys(n).length===0&&delete r[t]}}}function T(){E(),o=!0,a!==i&&(a=i,l(a.object))}function E(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:s,reset:T,resetDefaultState:E,dispose:x,releaseStatesOfGeometry:S,releaseStatesOfObject:w,releaseStatesOfProgram:C,initAttributes:h,enableAttribute:g,disableUnusedAttributes:v}}function $f(e,t,n){let r;function i(e){r=e}function a(t,i){e.drawArrays(r,t,i),n.update(i,r,1)}function o(t,i,a){a!==0&&(e.drawArraysInstanced(r,t,i,a),n.update(i,r,a))}function s(e,i,a){if(a===0)return;t.get(`WEBGL_multi_draw`).multiDrawArraysWEBGL(r,e,0,i,0,a);let o=0;for(let e=0;e<a;e++)o+=i[e];n.update(o,r,1)}this.setMode=i,this.render=a,this.renderInstances=o,this.renderMultiDraw=s}function ep(e,t,n,r){let i;function a(){if(i!==void 0)return i;if(t.has(`EXT_texture_filter_anisotropic`)===!0){let n=t.get(`EXT_texture_filter_anisotropic`);i=e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(t){return t===1023||r.convert(t)===e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT)}function s(n){let i=n===1016&&(t.has(`EXT_color_buffer_half_float`)||t.has(`EXT_color_buffer_float`));return!(n!==1009&&n!==1015&&!i&&r.convert(n)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE))}function c(t){if(t===`highp`){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return`highp`;t=`mediump`}return t===`mediump`&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?`mediump`:`lowp`}let l=n.precision===void 0?`highp`:n.precision,u=c(l);u!==l&&(W(`WebGLRenderer:`,l,`not supported, using`,u,`instead.`),l=u);let d=n.reversedDepthBuffer===!0&&t.has(`EXT_clip_control`),f=n.logarithmicDepthBuffer===!0&&d===!1;n.reversedDepthBuffer===!0&&d===!1&&W(`WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.`),n.logarithmicDepthBuffer===!0&&d===!0&&W(`WebGLRenderer: Logarithmic depth buffer is ignored when reversed depth buffer is enabled.`);let p=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),m=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),h=e.getParameter(e.MAX_TEXTURE_SIZE),g=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),_=e.getParameter(e.MAX_VERTEX_ATTRIBS),v=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),y=e.getParameter(e.MAX_VARYING_VECTORS),b=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),x=e.getParameter(e.MAX_SAMPLES),S=e.getParameter(e.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:s,precision:l,logarithmicDepthBuffer:f,reversedDepthBuffer:d,maxTextures:p,maxVertexTextures:m,maxTextureSize:h,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:v,maxVaryings:y,maxFragmentUniforms:b,maxSamples:x,samples:S}}function tp(e){let t=this,n=null,r=0,i=!1,a=!1,o=new zc,s=new Lo,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(e,t){let n=e.length!==0||t||r!==0||i;return i=t,r=e.length,n},this.beginShadows=function(){a=!0,u(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(e,t){n=u(e,t,0)},this.setState=function(t,o,s){let d=t.clippingPlanes,f=t.clipIntersection,p=t.clipShadows,m=e.get(t);if(!i||d===null||d.length===0||a&&!p)a?u(null):l();else{let e=a?0:r,t=e*4,i=m.clippingState||null;c.value=i,i=u(d,o,t,s);for(let e=0;e!==t;++e)i[e]=n[e];m.clippingState=i,this.numIntersection=f?this.numPlanes:0,this.numPlanes+=e}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=r>0),t.numPlanes=r,t.numIntersection=0}function u(e,n,r,i){let a=e===null?0:e.length,l=null;if(a!==0){if(l=c.value,i!==!0||l===null){let t=r+a*4,i=n.matrixWorldInverse;s.getNormalMatrix(i),(l===null||l.length<t)&&(l=new Float32Array(t));for(let t=0,n=r;t!==a;++t,n+=4)o.copy(e[t]).applyMatrix4(i,s),o.normal.toArray(l,n),l[n+3]=o.constant}c.value=l,c.needsUpdate=!0}return t.numPlanes=a,t.numIntersection=0,l}}var np=class extends ts{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new Wl(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new Yl(5,5,5),i=new jd({name:`CubemapFromEquirect`,uniforms:Cd(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:1,blending:0});i.uniforms.tEquirect.value=t;let a=new al(r,i),o=t.minFilter;return t.minFilter===1008&&(t.minFilter=Bi),new Ef(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){let i=e.getRenderTarget();for(let i=0;i<6;i++)e.setRenderTarget(this,i),e.clear(t,n,r);e.setRenderTarget(i)}},rp=256,ip=3,ap=20,op=256,sp=16,cp=3,lp=new q,up=new J,dp=class e{constructor(e){this._renderer=e,this._cubeSize=0,this._sourceTarget=null,this._cubeCamera=new Ef(1,10,null),this._boxMesh=new al(new Yl(5,5,5),null),this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null,this._integrationMaterial=null}fromScene(e,t=0,n=.1,r=100,i={}){let{size:a=256,position:o=lp}=i,s=this._renderer;this._setSize(a);let c=this._allocateTarget(),l=this._getSourceTarget(!0);t>0&&(l.texture.mipmapsAutoUpdate=!1);let u=s.autoClear,d=s.autoClearColor,f=s.autoClearDepth,p=s.autoClearStencil,m=e.background;s.autoClear=!0,s.autoClearColor=!0,s.autoClearDepth=!0,s.autoClearStencil=!0,m===null&&(e.background=s.getClearColor(up));let h=new Ef(n,r,l);return h.position.copy(o),h.update(s,e),s.autoClear=u,s.autoClearColor=d,s.autoClearDepth=f,s.autoClearStencil=p,e.background=m,t>0&&(l.texture.mipmapsAutoUpdate=!0,this._blur(c,t)),this._applyPMREM(c),c}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=vp(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=_p(),this._compileMaterial(this._equirectMaterial))}dispose(){this._sourceTarget!==null&&this._sourceTarget.dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._integrationMaterial!==null&&this._integrationMaterial.dispose(),this._boxMesh.geometry.dispose()}static lodToRoughness(e,t){return t>0?1-Math.sqrt(1-e/t):0}_setSize(e){this._cubeSize=Math.max(rp,Ao(e))}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?rp:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4);let n=t||this._allocateTarget();return this._textureToCubemap(e),this._applyPMREM(n),n}_allocateTarget(){let e=this._cubeSize,t=fp(e,!1,!1),n=Math.log2(e)-ip;for(let r=0;r<=n;r++)t.texture.mipmaps.push({width:e>>r,height:e>>r});return t.texture.name=`PMREM`,t.texture.isPMREMTexture=!0,t}_getSourceTarget(e=!1){let t=this._cubeSize,n=this._sourceTarget;return(n===null||n.width!==t||e&&n.depthBuffer===!1)&&(n!==null&&n.dispose(),this._sourceTarget=fp(t,!0,e)),this._sourceTarget}_compileMaterial(e){this._boxMesh.material=e,this._renderer.compile(this._boxMesh,this._cubeCamera.children[0])}_renderCube(e,t,n){let r=this._boxMesh,i=this._cubeCamera;r.material=n,i.renderTarget=e,i.activeMipmapLevel=t;let a=e.width>>t;e.viewport.set(0,0,a,a),i.update(this._renderer,r),e.viewport.set(0,0,e.width,e.height)}_textureToCubemap(e){let t;e.mapping===301||e.mapping===302?(this._cubemapMaterial===null&&(this._cubemapMaterial=vp()),t=this._cubemapMaterial,t.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):(this._equirectMaterial===null&&(this._equirectMaterial=_p()),t=this._equirectMaterial),t.uniforms.envMap.value=e,this._renderCube(this._getSourceTarget(),0,t)}_applyPMREM(t){this._ggxMaterial===null&&(this._ggxMaterial=mp(),this._integrationMaterial=hp());let n=this._cubeSize,r=t.texture.mipmaps.length-1,i=this._ggxMaterial.uniforms;i.envMap.value=this._sourceTarget.texture;let a=this._integrationMaterial.uniforms;a.envMap.value=this._sourceTarget.texture,a.sourceLod.value=Math.log2(n/sp);for(let o=0;o<=r;o++){let s=e.lodToRoughness(o,r);if(o>r-cp)a.roughness.value=s,this._renderCube(t,o,this._integrationMaterial);else{let e=s>0?Math.log2(n)+.5*Math.log2(6/(op*s**4))+.5:0;i.roughness.value=s,i.lodBias.value=e,this._renderCube(t,o,this._ggxMaterial)}}}_blur(e,t){this._blurMaterial===null&&(this._blurMaterial=gp());let n=this._blurMaterial,r=n.uniforms,i=this._sourceTarget;r.sigma.value=Math.min(t,Math.PI)/Math.SQRT2,r.envMap.value=i.texture,this._renderCube(e,0,n),r.envMap.value=e.texture,this._renderCube(i,0,n)}};function fp(e,t,n){return new np(e,{minFilter:Hi,generateMipmaps:t,type:Xi,colorSpace:ro,depthBuffer:n})}function pp(e,t,n){return new jd({name:e,uniforms:t,vertexShader:Kf.cube_vert,fragmentShader:n,side:1,blending:0,depthTest:!1,depthWrite:!1})}function mp(){return pp(`PMREMGGXConvolution`,{envMap:{value:null},roughness:{value:0},lodBias:{value:0}},`

		#define GGX_SAMPLES ${op}u

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float lodBias;

		#include <common>

		// Van der Corput radical inverse
		float radicalInverse_VdC( uint bits ) {

			bits = ( bits << 16u ) | ( bits >> 16u );
			bits = ( ( bits & 0x55555555u ) << 1u ) | ( ( bits & 0xAAAAAAAAu ) >> 1u );
			bits = ( ( bits & 0x33333333u ) << 2u ) | ( ( bits & 0xCCCCCCCCu ) >> 2u );
			bits = ( ( bits & 0x0F0F0F0Fu ) << 4u ) | ( ( bits & 0xF0F0F0F0u ) >> 4u );
			bits = ( ( bits & 0x00FF00FFu ) << 8u ) | ( ( bits & 0xFF00FF00u ) >> 8u );
			return float( bits ) * 2.3283064365386963e-10; // / 0x100000000

		}

		// Hammersley sequence
		vec2 hammersley( uint i, uint N ) {

			return vec2( float( i ) / float( N ), radicalInverse_VdC( i ) );

		}

		void main() {

			vec3 N = normalize( vWorldDirection );

			// For very low roughness, just sample the environment directly
			if ( roughness < 0.001 ) {

				gl_FragColor = vec4( textureLod( envMap, N, 0.0 ).rgb, 1.0 );
				return;

			}

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			// Tangent space basis for VNDF sampling
			vec3 up = abs( N.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, N ) );
			vec3 bitangent = cross( N, tangent );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			for ( uint i = 0u; i < GGX_SAMPLES; i ++ ) {

				vec2 Xi = hammersley( i, GGX_SAMPLES );

				// With V = N, sample the reflected direction directly.
				float invQ = 1.0 / ( 1.0 - Xi.x + alpha2 * Xi.x );
				float NdotL = ( 1.0 - Xi.x - alpha2 * Xi.x ) * invQ;

				if ( NdotL > 0.0 ) {

					float phi = 2.0 * PI * Xi.y;
					float sinTheta = 2.0 * alpha * sqrt( Xi.x * ( 1.0 - Xi.x ) ) * invQ;
					vec3 L = N * NdotL + ( tangent * cos( phi ) + bitangent * sin( phi ) ) * sinTheta;

					// Match the source mip to the sample's solid angle. The terms
					// independent of the sample are precomputed in lodBias.
					float d = alpha2 * invQ;
					float lod = max( log2( d ) + lodBias, 0.0 );

					// Weight by NdotL for the split-sum approximation
					prefilteredColor += textureLod( envMap, L, lod ).rgb * NdotL;
					totalWeight += NdotL;

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function hp(){return pp(`PMREMGGXIntegration`,{envMap:{value:null},roughness:{value:0},sourceLod:{value:0},sourceSize:{value:sp}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float sourceLod;
		uniform int sourceSize;

		void main() {

			vec3 N = normalize( vWorldDirection );

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			float texelSize = 2.0 / float( sourceSize );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			// Pair opposite texels: only the one in N's hemisphere contributes.
			for ( int face = 0; face < 3; face ++ ) {

				for ( int y = 0; y < sourceSize; y ++ ) {

					for ( int x = 0; x < sourceSize; x ++ ) {

						vec2 uv = ( vec2( x, y ) + 0.5 ) * texelSize - 1.0;
						vec3 texelDirection = face == 0 ? vec3( 1.0, uv ) : ( face == 1 ? vec3( uv.x, 1.0, uv.y ) : vec3( uv, 1.0 ) );

						float invDistance = inversesqrt( 1.0 + dot( uv, uv ) );
						float NdotL = dot( N, texelDirection );
						texelDirection *= NdotL < 0.0 ? - 1.0 : 1.0;
						NdotL = abs( NdotL ) * invDistance;

						// With V = N, NdotH squared is ( 1 + NdotL ) / 2. Common factors
						// in the GGX distribution and texel solid angle cancel when normalized.
						float d = 1.0 + alpha2 + ( alpha2 - 1.0 ) * NdotL;
						float weight = NdotL * invDistance * invDistance * invDistance / ( d * d );

						prefilteredColor += textureLod( envMap, texelDirection, sourceLod ).rgb * weight;
						totalWeight += weight;

					}

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function gp(){return pp(`PMREMSphericalGaussianBlur`,{envMap:{value:null},sigma:{value:0}},`

		#define SAMPLES ${ap}
		#define GOLDEN_ANGLE 2.39996322973

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float sigma;

		#include <common>

		void main() {

			vec3 outputDirection = normalize( vWorldDirection );

			vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, outputDirection ) );
			vec3 bitangent = cross( outputDirection, tangent );

			// Truncate the kernel at three standard deviations or at the antipode.
			float thetaMax = min( 3.0 * sigma, PI );
			float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

			vec3 accumColor = vec3( 0.0 );
			float accumWeight = 0.0;

			for ( int i = 0; i < SAMPLES; i ++ ) {

				// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
				float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
				float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
				float phi = float( i ) * GOLDEN_ANGLE;

				vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
				vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

				// Correct the planar sample density to solid angle.
				float weight = sin( theta ) / theta;

				accumColor += weight * textureLod( envMap, sampleDirection, 0.0 ).rgb;
				accumWeight += weight;

			}

			gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

		}
	`)}function _p(){return pp(`PMREMEquirectangularToCubemap`,{envMap:{value:null}},`

		varying vec3 vWorldDirection;

		uniform sampler2D envMap;

		#include <common>

		void main() {

			// Average four subpixel samples to preserve small, bright features.
			vec3 direction = normalize( vWorldDirection );
			vec3 dx = dFdx( direction ) * 0.25;
			vec3 dy = dFdy( direction ) * 0.25;

			vec3 color = textureLod( envMap, equirectUv( normalize( direction - dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction - dx + dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx + dy ) ), 0.0 ).rgb;
			gl_FragColor = vec4( color * 0.25, 1.0 );

		}
	`)}function vp(){return pp(`PMREMCubemapToCubemap`,{envMap:{value:null},flipEnvMap:{value:-1}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float flipEnvMap;

		void main() {

			gl_FragColor = vec4( textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) ).rgb, 1.0 );

		}
	`)}function yp(e){let t=new WeakMap,n=new WeakMap,r=null;function i(e,t=!1){return e==null?null:t?o(e):a(e)}function a(n){if(n&&n.isTexture){let r=n.mapping;if(r===303||r===304){if(t.has(n)){let e=t.get(n).texture;return s(e,n.mapping)}{let r=n.image;if(r&&r.height>0){let i=new np(r.height);return i.fromEquirectangularTexture(e,n),t.set(n,i),n.addEventListener(`dispose`,l),s(i.texture,n.mapping)}return null}}}return n}function o(t){if(t&&t.isTexture&&t.isPMREMTexture!==!0){let i=t.mapping,a=i===303||i===304,o=i===301||i===302;if(a||o){let i=n.get(t),s=i===void 0?0:i.texture.pmremVersion;if(t.isRenderTargetTexture&&t.pmremVersion!==s)return r===null&&(r=new dp(e)),i=a?r.fromEquirectangular(t,i):r.fromCubemap(t,i),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),i.texture;if(i!==void 0)return i.texture;{let s=t.image;return a&&s&&s.height>0||o&&s&&c(s)?(r===null&&(r=new dp(e)),i=a?r.fromEquirectangular(t):r.fromCubemap(t),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),t.addEventListener(`dispose`,u),i.texture):null}}}return t}function s(e,t){return t===303?e.mapping=301:t===304&&(e.mapping=302),e}function c(e){let t=0;for(let n=0;n<6;n++)e[n]!==void 0&&t++;return t===6}function l(e){let n=e.target;n.removeEventListener(`dispose`,l);let r=t.get(n);r!==void 0&&(t.delete(n),r.dispose())}function u(e){let t=e.target;t.removeEventListener(`dispose`,u);let r=n.get(t);r!==void 0&&(n.delete(t),r.dispose())}function d(){t=new WeakMap,n=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:i,dispose:d}}function bp(e){let t={};function n(n){if(t[n]!==void 0)return t[n];let r=e.getExtension(n);return t[n]=r,r}return{has:function(e){return n(e)!==null},init:function(){n(`EXT_color_buffer_float`),n(`WEBGL_clip_cull_distance`),n(`OES_texture_float_linear`),n(`EXT_color_buffer_half_float`),n(`WEBGL_multisampled_render_to_texture`),n(`WEBGL_render_shared_exponent`)},get:function(e){let t=n(e);return t===null&&yo(`WebGLRenderer: `+e+` extension not supported.`),t}}}function xp(e,t,n,r){let i={},a=new WeakMap,o=new FinalizationRegistry(e=>delete i[e]);function s(e){c(e.target)}function c(e){e.index!==null&&t.remove(e.index);for(let n in e.attributes)t.remove(e.attributes[n]);e.removeEventListener(`dispose`,s),delete i[e.id],o.unregister(e);let c=a.get(e);c&&(t.remove(c),a.delete(e)),r.releaseStatesOfGeometry(e),e.isInstancedBufferGeometry===!0&&delete e._maxInstanceCount,n.memory.geometries--}function l(e,t){return i[t.id]===void 0&&(t.addEventListener(`dispose`,s),i[t.id]=new WeakRef(t),o.register(t,t.id,t),n.memory.geometries++),t}function u(n){let r=n.attributes;for(let n in r)t.update(r[n],e.ARRAY_BUFFER)}function d(e){let n=e.index,r=e.attributes.position,i=0;if(r===void 0)return;let o=n===null?r.array.length/3-1:n.array.length,s=new(r.count>=65535?Sc:xc)(Math.ceil(o/3)*6,1),c=s.array;if(n!==null){let e=n.array;i=n.version;for(let t=0,n=0;t<o;t+=3){let r=e[t+0],i=e[t+1],a=e[t+2];c[n++]=r,c[n++]=i,c[n++]=i,c[n++]=a,c[n++]=a,c[n++]=r}}else{i=r.version;for(let e=0,t=0;e<o;e+=3){let n=e+0,r=e+1,i=e+2;c[t++]=n,c[t++]=r,c[t++]=r,c[t++]=i,c[t++]=i,c[t++]=n}}s.version=i;let l=a.get(e);l&&t.remove(l),a.set(e,s)}function f(e){let t=a.get(e);if(t){let n=e.index;n!==null&&t.version<n.version&&d(e)}else d(e);return a.get(e)}function p(){for(let e in i){let t=i[e].deref();t!==void 0&&c(t)}}return{get:l,update:u,getWireframeAttribute:f,dispose:p}}function Sp(e,t,n){let r;function i(e){r=e}let a,o;function s(e){a=e.type,o=e.bytesPerElement}function c(t,i){e.drawElements(r,i,a,t*o),n.update(i,r,1)}function l(t,i,s){s!==0&&(e.drawElementsInstanced(r,i,a,t*o,s),n.update(i,r,s))}function u(e,i,o){if(o===0)return;t.get(`WEBGL_multi_draw`).multiDrawElementsWEBGL(r,i,0,a,e,0,o);let s=0;for(let e=0;e<o;e++)s+=i[e];n.update(s,r,1)}this.setMode=i,this.setIndex=s,this.render=c,this.renderInstances=l,this.renderMultiDraw=u}function Cp(e){let t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function r(t,r,i){switch(n.calls++,r){case e.TRIANGLES:n.triangles+=t/3*i;break;case e.LINES:n.lines+=t/2*i;break;case e.LINE_STRIP:n.lines+=i*(t-1);break;case e.LINE_LOOP:n.lines+=i*t;break;case e.POINTS:n.points+=i*t;break;default:G(`WebGLInfo: Unknown draw mode:`,r)}}function i(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:i,update:r}}function wp(e,t,n){let r=new WeakMap,i=new $o;function a(a,o,s){let c=a.morphTargetInfluences,l=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=l===void 0?0:l.length,d=r.get(o);if(d===void 0||d.count!==u){d!==void 0&&d.texture.dispose();let e=o.morphAttributes.position!==void 0,n=o.morphAttributes.normal!==void 0,a=o.morphAttributes.color!==void 0,s=o.morphAttributes.position||[],c=o.morphAttributes.normal||[],l=o.morphAttributes.color||[],f=0;e===!0&&(f=1),n===!0&&(f=2),a===!0&&(f=3);let p=o.attributes.position.count*f,m=1;p>t.maxTextureSize&&(m=Math.ceil(p/t.maxTextureSize),p=t.maxTextureSize);let h=new Float32Array(p*m*4*u),g=new ns(h,p,m,u);g.type=Yi,g.needsUpdate=!0;let _=f*4;for(let t=0;t<u;t++){let r=s[t],o=c[t],u=l[t],d=p*m*4*t;for(let t=0;t<r.count;t++){let s=t*_;e===!0&&(i.fromBufferAttribute(r,t),h[d+s+0]=i.x,h[d+s+1]=i.y,h[d+s+2]=i.z,h[d+s+3]=0),n===!0&&(i.fromBufferAttribute(o,t),h[d+s+4]=i.x,h[d+s+5]=i.y,h[d+s+6]=i.z,h[d+s+7]=0),a===!0&&(i.fromBufferAttribute(u,t),h[d+s+8]=i.x,h[d+s+9]=i.y,h[d+s+10]=i.z,h[d+s+11]=u.itemSize===4?i.w:1)}}d={count:u,texture:g,size:new K(p,m)},r.set(o,d);function v(){g.dispose(),r.delete(o),o.removeEventListener(`dispose`,v)}o.addEventListener(`dispose`,v)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)s.getUniforms().setValue(e,`morphTexture`,a.morphTexture,n);else{let t=0;for(let e=0;e<c.length;e++)t+=c[e];let n=o.morphTargetsRelative?1:1-t;s.getUniforms().setValue(e,`morphTargetBaseInfluence`,n),s.getUniforms().setValue(e,`morphTargetInfluences`,c)}s.getUniforms().setValue(e,`morphTargetsTexture`,d.texture,n),s.getUniforms().setValue(e,`morphTargetsTextureSize`,d.size)}return{update:a}}function Tp(e,t,n,r,i){let a=new WeakMap;function o(r){let o=i.render.frame,s=r.geometry,l=t.get(r,s);if(a.get(l)!==o&&(t.update(l),a.set(l,o)),r.isInstancedMesh&&(r.hasEventListener(`dispose`,c)===!1&&r.addEventListener(`dispose`,c),a.get(r)!==o&&(n.update(r.instanceMatrix,e.ARRAY_BUFFER),r.instanceColor!==null&&n.update(r.instanceColor,e.ARRAY_BUFFER),a.set(r,o))),r.isSkinnedMesh){let e=r.skeleton;a.get(e)!==o&&(e.update(),a.set(e,o))}return l}function s(){a=new WeakMap}function c(e){let t=e.target;t.removeEventListener(`dispose`,c),r.releaseStatesOfObject(t),n.remove(t.instanceMatrix),t.instanceColor!==null&&n.remove(t.instanceColor)}return{update:o,dispose:s}}var Ep={1:`LINEAR_TONE_MAPPING`,2:`REINHARD_TONE_MAPPING`,3:`CINEON_TONE_MAPPING`,4:`ACES_FILMIC_TONE_MAPPING`,6:`AGX_TONE_MAPPING`,7:`NEUTRAL_TONE_MAPPING`,5:`CUSTOM_TONE_MAPPING`};function Dp(e,t,n,r,i,a){let o=new ts(t,n,{type:e,depthBuffer:i,stencilBuffer:a,samples:r?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),s=null,c=null,l=null,u=new Fc;u.setAttribute(`position`,new Cc([-1,3,0,-1,-1,0,3,-1,0],3)),u.setAttribute(`uv`,new Cc([0,2,0,0,2,0],2));let d=new Md({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),f=new al(u,d),p=new xf(-1,1,1,-1,0,1),m=null,h=null,g=!1,_,v=null,y=[],b=!1;this.setSize=function(e,t){o.setSize(e,t),s!==null&&s.setSize(e,t),c!==null&&c.setSize(e,t);for(let n=0;n<y.length;n++){let r=y[n];r.setSize&&r.setSize(e,t)}},this.setEffects=function(e){y=e,b=y.length>0&&y[0].isRenderPass===!0;let t=o.width,n=o.height;y.length>0&&s===null&&(s=new ts(t,n,{type:Xi,depthBuffer:!1,stencilBuffer:!1}),c=new ts(t,n,{type:Xi,depthBuffer:!1,stencilBuffer:!1}));let r=i===!0&&y.some(e=>e.needsDepthTexture===!0);r!==(o.depthTexture!==null)&&(r===!0&&l===null&&(l=new Kl(t,n),a===!0&&(l.format=oa,l.type=$i)),o.dispose(),o.depthTexture=r?l:null,o.resolveDepthBuffer=r,o.storeMultisampledDepthBuffer=r);for(let e=0;e<y.length;e++){let i=y[e];i.setSize&&i.setSize(t,n),r&&i.needsDepthTexture===!0&&i.setDepthTexture&&i.setDepthTexture(l)}},this.begin=function(e,t){if(g||e.toneMapping===0&&y.length===0)return!1;if(v=t,t!==null){let e=t.width,n=t.height;(o.width!==e||o.height!==n)&&this.setSize(e,n)}return b===!1&&e.setRenderTarget(o),_=e.toneMapping,e.toneMapping=0,!0},this.hasRenderPass=function(){return b},this.end=function(e,t){e.toneMapping=_,g=!0;let n=o,r=s;for(let i=0;i<y.length;i++){let a=y[i];a.enabled!==!1&&(a.render(e,r,n,t),a.needsSwap!==!1&&(n=r,r=r===s?c:s))}if(m!==e.outputColorSpace||h!==e.toneMapping){m=e.outputColorSpace,h=e.toneMapping,d.defines={},Ho.getTransfer(m)===`srgb`&&(d.defines.SRGB_TRANSFER=``);let t=Ep[h];t&&(d.defines[t]=``),d.needsUpdate=!0}d.uniforms.tDiffuse.value=n.texture,e.setRenderTarget(v),e.render(f,p),v=null,g=!1},this.isCompositing=function(){return g},this.dispose=function(){o.dispose(),s!==null&&s.dispose(),c!==null&&c.dispose(),u.dispose(),d.dispose()}}var Op=new Qo,kp=new Kl(1,1),Ap=new ql(1),jp=new ns,Mp=new rs,Np=new Wl,Pp=[],Fp=[],Ip=new Float32Array(16),Lp=new Float32Array(9),Rp=new Float32Array(4);function zp(e,t,n){let r=e[0];if(r<=0||r>0)return e;let i=t*n,a=Pp[i];if(a===void 0&&(a=new Float32Array(i),Pp[i]=a),t!==0){r.toArray(a,0);for(let r=1,i=0;r!==t;++r)i+=n,e[r].toArray(a,i)}return a}function Bp(e,t){if(e.length!==t.length)return!1;for(let n=0,r=e.length;n<r;n++)if(e[n]!==t[n])return!1;return!0}function Vp(e,t){for(let n=0,r=t.length;n<r;n++)e[n]=t[n]}function Hp(e,t){let n=Fp[t];n===void 0&&(n=new Int32Array(t),Fp[t]=n);for(let r=0;r!==t;++r)n[r]=e.allocateTextureUnit();return n}function Up(e,t){let n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function Wp(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Bp(n,t))return;e.uniform2fv(this.addr,t),Vp(n,t)}}function Gp(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(Bp(n,t))return;e.uniform3fv(this.addr,t),Vp(n,t)}}function Kp(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Bp(n,t))return;e.uniform4fv(this.addr,t),Vp(n,t)}}function qp(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(Bp(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),Vp(n,t)}else{if(Bp(n,r))return;Rp.set(r),e.uniformMatrix2fv(this.addr,!1,Rp),Vp(n,r)}}function Jp(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(Bp(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),Vp(n,t)}else{if(Bp(n,r))return;Lp.set(r),e.uniformMatrix3fv(this.addr,!1,Lp),Vp(n,r)}}function Yp(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(Bp(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),Vp(n,t)}else{if(Bp(n,r))return;Ip.set(r),e.uniformMatrix4fv(this.addr,!1,Ip),Vp(n,r)}}function Xp(e,t){let n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function Zp(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Bp(n,t))return;e.uniform2iv(this.addr,t),Vp(n,t)}}function Qp(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(Bp(n,t))return;e.uniform3iv(this.addr,t),Vp(n,t)}}function $p(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Bp(n,t))return;e.uniform4iv(this.addr,t),Vp(n,t)}}function em(e,t){let n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function tm(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Bp(n,t))return;e.uniform2uiv(this.addr,t),Vp(n,t)}}function nm(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(Bp(n,t))return;e.uniform3uiv(this.addr,t),Vp(n,t)}}function rm(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Bp(n,t))return;e.uniform4uiv(this.addr,t),Vp(n,t)}}function im(e){return e.version===0&&(e.compareFunction=519,e.needsUpdate=!0),e}function am(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;a=this.type===e.SAMPLER_2D_SHADOW?im(kp):Op,n.setTexture2D(t||a,i)}function om(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture3D(t||Mp,i)}function sm(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;a=this.type===e.SAMPLER_CUBE_SHADOW?im(Ap):Np,n.setTextureCube(t||a,i)}function cm(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture2DArray(t||jp,i)}function lm(e){switch(e){case 5126:return Up;case 35664:return Wp;case 35665:return Gp;case 35666:return Kp;case 35674:return qp;case 35675:return Jp;case 35676:return Yp;case 5124:case 35670:return Xp;case 35667:case 35671:return Zp;case 35668:case 35672:return Qp;case 35669:case 35673:return $p;case 5125:return em;case 36294:return tm;case 36295:return nm;case 36296:return rm;case 35678:case 36198:case 36298:case 36306:case 35682:return am;case 35679:case 36299:case 36307:return om;case 35680:case 36300:case 36308:case 36293:return sm;case 36289:case 36303:case 36311:case 36292:return cm}}function um(e,t){e.uniform1fv(this.addr,t)}function dm(e,t){let n=zp(t,this.size,2);e.uniform2fv(this.addr,n)}function fm(e,t){let n=zp(t,this.size,3);e.uniform3fv(this.addr,n)}function pm(e,t){let n=zp(t,this.size,4);e.uniform4fv(this.addr,n)}function mm(e,t){let n=zp(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function hm(e,t){let n=zp(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function gm(e,t){let n=zp(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function _m(e,t){e.uniform1iv(this.addr,t)}function vm(e,t){e.uniform2iv(this.addr,t)}function ym(e,t){e.uniform3iv(this.addr,t)}function bm(e,t){e.uniform4iv(this.addr,t)}function xm(e,t){e.uniform1uiv(this.addr,t)}function Sm(e,t){e.uniform2uiv(this.addr,t)}function Cm(e,t){e.uniform3uiv(this.addr,t)}function wm(e,t){e.uniform4uiv(this.addr,t)}function Tm(e,t,n){let r=this.cache,i=t.length,a=Hp(n,i);Bp(r,a)||(e.uniform1iv(this.addr,a),Vp(r,a));let o;o=this.type===e.SAMPLER_2D_SHADOW?im(kp):Op;for(let e=0;e!==i;++e)n.setTexture2D(t[e]||o,a[e])}function Em(e,t,n){let r=this.cache,i=t.length,a=Hp(n,i);Bp(r,a)||(e.uniform1iv(this.addr,a),Vp(r,a));for(let e=0;e!==i;++e)n.setTexture3D(t[e]||Mp,a[e])}function Dm(e,t,n){let r=this.cache,i=t.length,a=Hp(n,i);Bp(r,a)||(e.uniform1iv(this.addr,a),Vp(r,a));let o;o=this.type===e.SAMPLER_CUBE_SHADOW?im(Ap):Np;for(let e=0;e!==i;++e)n.setTextureCube(t[e]||o,a[e])}function Om(e,t,n){let r=this.cache,i=t.length,a=Hp(n,i);Bp(r,a)||(e.uniform1iv(this.addr,a),Vp(r,a));for(let e=0;e!==i;++e)n.setTexture2DArray(t[e]||jp,a[e])}function km(e){switch(e){case 5126:return um;case 35664:return dm;case 35665:return fm;case 35666:return pm;case 35674:return mm;case 35675:return hm;case 35676:return gm;case 5124:case 35670:return _m;case 35667:case 35671:return vm;case 35668:case 35672:return ym;case 35669:case 35673:return bm;case 5125:return xm;case 36294:return Sm;case 36295:return Cm;case 36296:return wm;case 35678:case 36198:case 36298:case 36306:case 35682:return Tm;case 35679:case 36299:case 36307:return Em;case 35680:case 36300:case 36308:case 36293:return Dm;case 36289:case 36303:case 36311:case 36292:return Om}}var Am=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=lm(t.type)}},jm=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=km(t.type)}},Mm=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let r=this.seq;for(let i=0,a=r.length;i!==a;++i){let a=r[i];a.setValue(e,t[a.id],n)}}},Nm=/(\w+)(\])?(\[|\.)?/g;function Pm(e,t){e.seq.push(t),e.map[t.id]=t}function Fm(e,t,n){let r=e.name,i=r.length;for(Nm.lastIndex=0;;){let a=Nm.exec(r),o=Nm.lastIndex,s=a[1],c=a[2]===`]`,l=a[3];if(c&&(s|=0),l===void 0||l===`[`&&o+2===i){Pm(n,l===void 0?new Am(s,e,t):new jm(s,e,t));break}{let e=n.map[s];e===void 0&&(e=new Mm(s),Pm(n,e)),n=e}}}var Im=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){let n=e.getActiveUniform(t,r);Fm(n,e.getUniformLocation(t,n.name),this)}let r=[],i=[];for(let t of this.seq)t.type===e.SAMPLER_2D_SHADOW||t.type===e.SAMPLER_CUBE_SHADOW||t.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(t):i.push(t);r.length>0&&(this.seq=r.concat(i))}setValue(e,t,n,r){let i=this.map[t];i!==void 0&&i.setValue(e,n,r)}setOptional(e,t,n){let r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let i=0,a=t.length;i!==a;++i){let a=t[i],o=n[a.id];o.needsUpdate!==!1&&a.setValue(e,o.value,r)}}static seqWithValue(e,t){let n=[];for(let r=0,i=e.length;r!==i;++r){let i=e[r];i.id in t&&n.push(i)}return n}};function Lm(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),r}var Rm=37297,zm=0;function Bm(e,t){let n=e.split(`
`),r=[],i=Math.max(t-6,0),a=Math.min(t+6,n.length);for(let e=i;e<a;e++){let i=e+1;r.push(`${i===t?`>`:` `} ${i}: ${n[e]}`)}return r.join(`
`)}var Vm=new Lo;function Hm(e){Ho._getMatrix(Vm,Ho.workingColorSpace,e);let t=`mat3( ${Vm.elements.map(e=>e.toFixed(4))} )`;switch(Ho.getTransfer(e)){case io:return[t,`LinearTransferOETF`];case ao:return[t,`sRGBTransferOETF`];default:return W(`WebGLProgram: Unsupported color space: `,e),[t,`LinearTransferOETF`]}}function Um(e,t,n){let r=e.getShaderParameter(t,e.COMPILE_STATUS),i=(e.getShaderInfoLog(t)||``).trim();if(r&&i===``)return``;let a=/ERROR: 0:(\d+)/.exec(i);if(a){let r=parseInt(a[1]);return n.toUpperCase()+`

`+i+`

`+Bm(e.getShaderSource(t),r)}return i}function Wm(e,t){let n=Hm(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( ${n[0]} * value.rgb, value.a ) );`,`}`].join(`
`)}var Gm={1:`Linear`,2:`Reinhard`,3:`Cineon`,4:`ACESFilmic`,6:`AgX`,7:`Neutral`,5:`Custom`};function Km(e,t){let n=Gm[t];return n===void 0?(W(`WebGLProgram: Unsupported toneMapping:`,t),`vec3 `+e+`( vec3 color ) { return LinearToneMapping( color ); }`):`vec3 `+e+`( vec3 color ) { return `+n+`ToneMapping( color ); }`}var qm=new q;function Jm(){return Ho.getLuminanceCoefficients(qm),[`float luminance( const in vec3 rgb ) {`,`	const vec3 weights = vec3( ${qm.x.toFixed(4)}, ${qm.y.toFixed(4)}, ${qm.z.toFixed(4)} );`,`	return dot( weights, rgb );`,`}`].join(`
`)}function Ym(e){return[e.extensionClipCullDistance?`#extension GL_ANGLE_clip_cull_distance : require`:``,e.extensionMultiDraw?`#extension GL_ANGLE_multi_draw : require`:``].filter(Qm).join(`
`)}function Xm(e){let t=[];for(let n in e){let r=e[n];r!==!1&&t.push(`#define `+n+` `+r)}return t.join(`
`)}function Zm(e,t){let n={},r=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let i=0;i<r;i++){let r=e.getActiveAttrib(t,i),a=r.name,o=1;r.type===e.FLOAT_MAT2&&(o=2),r.type===e.FLOAT_MAT3&&(o=3),r.type===e.FLOAT_MAT4&&(o=4),n[a]={type:r.type,location:e.getAttribLocation(t,a),locationSize:o}}return n}function Qm(e){return e!==``}function $m(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows).replace(/NUM_LIGHT_PROBE_GRIDS/g,t.numLightProbeGrids)}function eh(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var th=/^[ \t]*#include +<([\w\d./]+)>/gm;function nh(e){return e.replace(th,rh)}function rh(e,t){let n=Kf[t];if(n===void 0)throw Error(`THREE.WebGLProgram: Can not resolve #include <`+t+`>`);return nh(n)}var ih=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function ah(e){return e.replace(ih,oh)}function oh(e,t,n,r){let i=``;for(let e=parseInt(t);e<parseInt(n);e++)i+=r.replace(/\[\s*i\s*\]/g,`[ `+e+` ]`).replace(/UNROLLED_LOOP_INDEX/g,e);return i}function sh(e){let t=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision===`highp`?t+=`
#define HIGH_PRECISION`:e.precision===`mediump`?t+=`
#define MEDIUM_PRECISION`:e.precision===`lowp`&&(t+=`
#define LOW_PRECISION`),t}var ch={1:`SHADOWMAP_TYPE_PCF`,3:`SHADOWMAP_TYPE_VSM`};function lh(e){return ch[e.shadowMapType]||`SHADOWMAP_TYPE_BASIC`}var uh={302:`ENVMAP_MODE_REFRACTION`};function dh(e){return e.envMap===!1?`ENVMAP_MODE_REFLECTION`:uh[e.envMapMode]||`ENVMAP_MODE_REFLECTION`}var fh={0:`ENVMAP_BLENDING_MULTIPLY`,1:`ENVMAP_BLENDING_MIX`,2:`ENVMAP_BLENDING_ADD`};function ph(e){return e.envMap===!1?`ENVMAP_BLENDING_NONE`:fh[e.combine]||`ENVMAP_BLENDING_NONE`}function mh(e,t,n,r){let i=e.getContext(),a=n.defines,o=n.vertexShader,s=n.fragmentShader,c=lh(n),l=n.envMapPMREM===!0?`ENVMAP_TYPE_PMREM`:`ENVMAP_TYPE_CUBE`,u=dh(n),d=ph(n),f=Ym(n),p=Xm(a),m=i.createProgram(),h,g,_=n.glslVersion?`#version `+n.glslVersion+`
`:``;n.isRawShaderMaterial?(h=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p].filter(Qm).join(`
`),h.length>0&&(h+=`
`),g=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p].filter(Qm).join(`
`),g.length>0&&(g+=`
`)):(h=[sh(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p,n.extensionClipCullDistance?`#define USE_CLIP_DISTANCE`:``,n.batching?`#define USE_BATCHING`:``,n.batchingColor?`#define USE_BATCHING_COLOR`:``,n.instancing?`#define USE_INSTANCING`:``,n.instancingColor?`#define USE_INSTANCING_COLOR`:``,n.instancingMorph?`#define USE_INSTANCING_MORPH`:``,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.map?`#define USE_MAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+u:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.displacementMap?`#define USE_DISPLACEMENTMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.diffuseRoughnessMap?`#define USE_DIFFUSE_ROUGHNESSMAP`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.mapUv?`#define MAP_UV `+n.mapUv:``,n.alphaMapUv?`#define ALPHAMAP_UV `+n.alphaMapUv:``,n.lightMapUv?`#define LIGHTMAP_UV `+n.lightMapUv:``,n.aoMapUv?`#define AOMAP_UV `+n.aoMapUv:``,n.emissiveMapUv?`#define EMISSIVEMAP_UV `+n.emissiveMapUv:``,n.bumpMapUv?`#define BUMPMAP_UV `+n.bumpMapUv:``,n.normalMapUv?`#define NORMALMAP_UV `+n.normalMapUv:``,n.displacementMapUv?`#define DISPLACEMENTMAP_UV `+n.displacementMapUv:``,n.metalnessMapUv?`#define METALNESSMAP_UV `+n.metalnessMapUv:``,n.roughnessMapUv?`#define ROUGHNESSMAP_UV `+n.roughnessMapUv:``,n.anisotropyMapUv?`#define ANISOTROPYMAP_UV `+n.anisotropyMapUv:``,n.clearcoatMapUv?`#define CLEARCOATMAP_UV `+n.clearcoatMapUv:``,n.clearcoatNormalMapUv?`#define CLEARCOAT_NORMALMAP_UV `+n.clearcoatNormalMapUv:``,n.clearcoatRoughnessMapUv?`#define CLEARCOAT_ROUGHNESSMAP_UV `+n.clearcoatRoughnessMapUv:``,n.diffuseRoughnessMapUv?`#define DIFFUSE_ROUGHNESSMAP_UV `+n.diffuseRoughnessMapUv:``,n.iridescenceMapUv?`#define IRIDESCENCEMAP_UV `+n.iridescenceMapUv:``,n.iridescenceThicknessMapUv?`#define IRIDESCENCE_THICKNESSMAP_UV `+n.iridescenceThicknessMapUv:``,n.sheenColorMapUv?`#define SHEEN_COLORMAP_UV `+n.sheenColorMapUv:``,n.sheenRoughnessMapUv?`#define SHEEN_ROUGHNESSMAP_UV `+n.sheenRoughnessMapUv:``,n.specularMapUv?`#define SPECULARMAP_UV `+n.specularMapUv:``,n.specularColorMapUv?`#define SPECULAR_COLORMAP_UV `+n.specularColorMapUv:``,n.specularIntensityMapUv?`#define SPECULAR_INTENSITYMAP_UV `+n.specularIntensityMapUv:``,n.transmissionMapUv?`#define TRANSMISSIONMAP_UV `+n.transmissionMapUv:``,n.thicknessMapUv?`#define THICKNESSMAP_UV `+n.thicknessMapUv:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexNormals?`#define HAS_NORMAL`:``,n.vertexColors?`#define USE_COLOR`:``,n.vertexAlphas?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.flatShading?`#define FLAT_SHADED`:``,n.skinning?`#define USE_SKINNING`:``,n.morphTargets?`#define USE_MORPHTARGETS`:``,n.morphNormals&&n.flatShading===!1?`#define USE_MORPHNORMALS`:``,n.morphColors?`#define USE_MORPHCOLORS`:``,n.morphTargetsCount>0?`#define MORPHTARGETS_TEXTURE_STRIDE `+n.morphTextureStride:``,n.morphTargetsCount>0?`#define MORPHTARGETS_COUNT `+n.morphTargetsCount:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.sizeAttenuation?`#define USE_SIZEATTENUATION`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 modelMatrix;`,`uniform mat4 modelViewMatrix;`,`uniform mat4 projectionMatrix;`,`uniform mat4 viewMatrix;`,`uniform mat3 normalMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,`#ifdef USE_INSTANCING`,`	attribute mat4 instanceMatrix;`,`#endif`,`#ifdef USE_INSTANCING_COLOR`,`	attribute vec3 instanceColor;`,`#endif`,`#ifdef USE_INSTANCING_MORPH`,`	uniform sampler2D morphTexture;`,`#endif`,`attribute vec3 position;`,`attribute vec3 normal;`,`attribute vec2 uv;`,`#ifdef USE_UV1`,`	attribute vec2 uv1;`,`#endif`,`#ifdef USE_UV2`,`	attribute vec2 uv2;`,`#endif`,`#ifdef USE_UV3`,`	attribute vec2 uv3;`,`#endif`,`#ifdef USE_TANGENT`,`	attribute vec4 tangent;`,`#endif`,`#if defined( USE_COLOR_ALPHA )`,`	attribute vec4 color;`,`#elif defined( USE_COLOR )`,`	attribute vec3 color;`,`#endif`,`#ifdef USE_SKINNING`,`	attribute vec4 skinIndex;`,`	attribute vec4 skinWeight;`,`#endif`,`
`].filter(Qm).join(`
`),g=[sh(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.alphaToCoverage?`#define ALPHA_TO_COVERAGE`:``,n.map?`#define USE_MAP`:``,n.matcap?`#define USE_MATCAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+l:``,n.envMap?`#define `+u:``,n.envMap?`#define `+d:``,n.envMapPMREM?`#define ENVMAP_MAX_LOD `+n.envMapMaxLod+`.0`:``,n.envMapPMREM?`#define ENVMAP_SIZE `+n.envMapSize+`.0`:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.packedNormalMap?`#define USE_PACKED_NORMALMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoat?`#define USE_CLEARCOAT`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.diffuseRoughness?`#define USE_DIFFUSE_ROUGHNESS`:``,n.diffuseRoughnessMap?`#define USE_DIFFUSE_ROUGHNESSMAP`:``,n.dispersion?`#define USE_DISPERSION`:``,n.retroreflection?`#define USE_RETROREFLECTION`:``,n.iridescence?`#define USE_IRIDESCENCE`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaTest?`#define USE_ALPHATEST`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.sheen?`#define USE_SHEEN`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexColors||n.instancingColor?`#define USE_COLOR`:``,n.vertexAlphas||n.batchingColor?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.gradientMap?`#define USE_GRADIENTMAP`:``,n.flatShading?`#define FLAT_SHADED`:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.premultipliedAlpha?`#define PREMULTIPLIED_ALPHA`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.decodeVideoTexture?`#define DECODE_VIDEO_TEXTURE`:``,n.decodeVideoTextureEmissive?`#define DECODE_VIDEO_TEXTURE_EMISSIVE`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 viewMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,n.toneMapping===0?``:`#define TONE_MAPPING`,n.toneMapping===0?``:Kf.tonemapping_pars_fragment,n.toneMapping===0?``:Km(`toneMapping`,n.toneMapping),n.dithering?`#define DITHERING`:``,n.opaque?`#define OPAQUE`:``,Kf.colorspace_pars_fragment,Wm(`linearToOutputTexel`,n.outputColorSpace),Jm(),n.useDepthPacking?`#define DEPTH_PACKING `+n.depthPacking:``,`
`].filter(Qm).join(`
`)),o=nh(o),o=$m(o,n),o=eh(o,n),s=nh(s),s=$m(s,n),s=eh(s,n),o=ah(o),s=ah(s),n.isRawShaderMaterial!==!0&&(_=`#version 300 es
`,h=[f,`#define attribute in`,`#define varying out`,`#define texture2D texture`].join(`
`)+`
`+h,g=[`#define varying in`,n.glslVersion===`300 es`?``:`layout(location = 0) out highp vec4 pc_fragColor;`,n.glslVersion===`300 es`?``:`#define gl_FragColor pc_fragColor`,`#define gl_FragDepthEXT gl_FragDepth`,`#define texture2D texture`,`#define textureCube texture`,`#define texture2DProj textureProj`,`#define texture2DLodEXT textureLod`,`#define texture2DProjLodEXT textureProjLod`,`#define textureCubeLodEXT textureLod`,`#define texture2DGradEXT textureGrad`,`#define texture2DProjGradEXT textureProjGrad`,`#define textureCubeGradEXT textureGrad`].join(`
`)+`
`+g);let v=_+h+o,y=_+g+s,b=Lm(i,i.VERTEX_SHADER,v),x=Lm(i,i.FRAGMENT_SHADER,y);i.attachShader(m,b),i.attachShader(m,x),n.index0AttributeName===void 0?n.hasPositionAttribute===!0&&i.bindAttribLocation(m,0,`position`):i.bindAttribLocation(m,0,n.index0AttributeName),i.linkProgram(m);function S(t){if(e.debug.checkShaderErrors){let n=i.getProgramInfoLog(m)||``,r=i.getShaderInfoLog(b)||``,a=i.getShaderInfoLog(x)||``,o=n.trim(),s=r.trim(),c=a.trim(),l=!0,u=!0;if(i.getProgramParameter(m,i.LINK_STATUS)===!1){if(l=!1,typeof e.debug.onShaderError==`function`)e.debug.onShaderError(i,m,b,x);else{let e=Um(i,b,`vertex`),n=Um(i,x,`fragment`);G(`WebGLProgram: Shader Error `+i.getError()+` - VALIDATE_STATUS `+i.getProgramParameter(m,i.VALIDATE_STATUS)+`

Material Name: `+t.name+`
Material Type: `+t.type+`

Program Info Log: `+o+`
`+e+`
`+n)}}else o===``?(s===``||c===``)&&(u=!1):W(`WebGLProgram: Program Info Log:`,o);u&&(t.diagnostics={runnable:l,programLog:o,vertexShader:{log:s,prefix:h},fragmentShader:{log:c,prefix:g}})}i.deleteShader(b),i.deleteShader(x),C=new Im(i,m),w=Zm(i,m)}let C;this.getUniforms=function(){return C===void 0&&S(this),C};let w;this.getAttributes=function(){return w===void 0&&S(this),w};let T=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return T===!1&&(T=i.getProgramParameter(m,Rm)),T},this.destroy=function(){r.releaseStatesOfProgram(this),i.deleteProgram(m),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=zm++,this.cacheKey=t,this.usedTimes=1,this.program=m,this.vertexShader=b,this.fragmentShader=x,this}var hh=0,gh=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(n)===!1&&(r.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let e of t)e.usedTimes--,e.usedTimes===0&&this.shaderCache.delete(e.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new _h(e),t.set(e,n)),n}},_h=class{constructor(e){this.id=hh++,this.code=e,this.usedTimes=0}};function vh(e){return e===1030||e===37490||e===36285}function yh(e,t,n,r,i,a){let o=new hs,s=new gh,c=new Set,l=[],u=new Map,d=r.logarithmicDepthBuffer,f={MeshDepthMaterial:`depth`,MeshDistanceMaterial:`distance`,MeshNormalMaterial:`normal`,MeshBasicMaterial:`basic`,MeshLambertMaterial:`lambert`,MeshPhongMaterial:`phong`,MeshToonMaterial:`toon`,MeshStandardMaterial:`physical`,MeshPhysicalMaterial:`physical`,MeshMatcapMaterial:`matcap`,LineBasicMaterial:`basic`,LineDashedMaterial:`dashed`,PointsMaterial:`points`,ShadowMaterial:`shadow`,SpriteMaterial:`sprite`};function p(e){return c.add(e),e===0?`uv`:`uv${e}`}function m(i,o,l,u,m,h){let g=u.fog,_=m.geometry,v=i.isMeshStandardMaterial||i.isMeshLambertMaterial||i.isMeshPhongMaterial?u.environment:null,y=i.isMeshStandardMaterial||i.isMeshLambertMaterial&&!i.envMap||i.isMeshPhongMaterial&&!i.envMap,b=t.get(i.envMap||v,y),x=f[i.type],S=r.precision;i.precision!==null&&(S=r.getMaxPrecision(i.precision),S!==i.precision&&W(`WebGLProgram.getParameters:`,i.precision,`not supported, using`,S,`instead.`));let C=_.morphAttributes.position||_.morphAttributes.normal||_.morphAttributes.color,w=C===void 0?0:C.length,T=0;_.morphAttributes.position!==void 0&&(T=1),_.morphAttributes.normal!==void 0&&(T=2),_.morphAttributes.color!==void 0&&(T=3);let E,D,O,k;if(x){let e=qf[x];E=e.vertexShader,D=e.fragmentShader}else{E=i.vertexShader,D=i.fragmentShader;let e=s.getVertexShaderStage(i),t=s.getFragmentShaderStage(i);s.update(i,e,t),O=e.id,k=t.id}let A=e.getRenderTarget(),j=e.state.buffers.depth.getReversed(),ee=m.isInstancedMesh===!0,M=m.isBatchedMesh===!0,N=!!i.map,P=!!i.matcap,te=!!b,ne=te&&b.isPMREMTexture===!0,re=!!i.aoMap,ie=!!i.lightMap,ae=!!i.bumpMap&&i.wireframe===!1,oe=!!i.normalMap,se=!!i.displacementMap,ce=!!i.emissiveMap,le=!!i.metalnessMap,ue=!!i.roughnessMap,de=i.anisotropy>0,fe=i.clearcoat>0,F=i.diffuseRoughness>0,pe=i.dispersion>0,me=i.retroreflectivity>0,he=i.iridescence>0,ge=i.sheen>0,_e=i.transmission>0,ve=de&&!!i.anisotropyMap,ye=fe&&!!i.clearcoatMap,be=fe&&!!i.clearcoatNormalMap,xe=fe&&!!i.clearcoatRoughnessMap,Se=F&&!!i.diffuseRoughnessMap,I=he&&!!i.iridescenceMap,Ce=he&&!!i.iridescenceThicknessMap,L=ge&&!!i.sheenColorMap,we=ge&&!!i.sheenRoughnessMap,R=!!i.specularMap,Te=!!i.specularColorMap,z=!!i.specularIntensityMap,B=_e&&!!i.transmissionMap,Ee=_e&&!!i.thicknessMap,De=!!i.gradientMap,Oe=!!i.alphaMap,ke=i.alphaTest>0,V=!!i.alphaHash,Ae=!!i.extensions,je=0;i.toneMapped&&(A===null||A.isXRRenderTarget===!0)&&(je=e.toneMapping);let Me=ne?b.isCompressedCubeTexture?b.image[0].mipmaps:b.mipmaps:null,Ne={shaderID:x,shaderType:i.type,shaderName:i.name,vertexShader:E,fragmentShader:D,defines:i.defines,customVertexShaderID:O,customFragmentShaderID:k,isRawShaderMaterial:i.isRawShaderMaterial===!0,glslVersion:i.glslVersion,precision:S,batching:M,batchingColor:M&&m._colorsTexture!==null,instancing:ee,instancingColor:ee&&m.instanceColor!==null,instancingMorph:ee&&m.morphTexture!==null,outputColorSpace:A===null?e.outputColorSpace:A.isXRRenderTarget===!0?A.texture.colorSpace:Ho.workingColorSpace,alphaToCoverage:!!i.alphaToCoverage,map:N,matcap:P,envMap:te,envMapMode:te&&b.mapping,envMapPMREM:ne,envMapMaxLod:ne?Me.length-1:null,envMapSize:ne?Me[0].width:null,aoMap:re,lightMap:ie,bumpMap:ae,normalMap:oe,displacementMap:se,emissiveMap:ce,normalMapObjectSpace:oe&&i.normalMapType===1,normalMapTangentSpace:oe&&i.normalMapType===0,packedNormalMap:oe&&i.normalMapType===0&&vh(i.normalMap.format),metalnessMap:le,roughnessMap:ue,anisotropy:de,anisotropyMap:ve,clearcoat:fe,clearcoatMap:ye,clearcoatNormalMap:be,clearcoatRoughnessMap:xe,diffuseRoughness:F,diffuseRoughnessMap:Se,dispersion:pe,retroreflection:me,iridescence:he,iridescenceMap:I,iridescenceThicknessMap:Ce,sheen:ge,sheenColorMap:L,sheenRoughnessMap:we,specularMap:R,specularColorMap:Te,specularIntensityMap:z,transmission:_e,transmissionMap:B,thicknessMap:Ee,gradientMap:De,opaque:i.transparent===!1&&i.blending===1&&i.alphaToCoverage===!1,alphaMap:Oe,alphaTest:ke,alphaHash:V,combine:i.combine,mapUv:N&&p(i.map.channel),aoMapUv:re&&p(i.aoMap.channel),lightMapUv:ie&&p(i.lightMap.channel),bumpMapUv:ae&&p(i.bumpMap.channel),normalMapUv:oe&&p(i.normalMap.channel),displacementMapUv:se&&p(i.displacementMap.channel),emissiveMapUv:ce&&p(i.emissiveMap.channel),metalnessMapUv:le&&p(i.metalnessMap.channel),roughnessMapUv:ue&&p(i.roughnessMap.channel),anisotropyMapUv:ve&&p(i.anisotropyMap.channel),clearcoatMapUv:ye&&p(i.clearcoatMap.channel),clearcoatNormalMapUv:be&&p(i.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:xe&&p(i.clearcoatRoughnessMap.channel),diffuseRoughnessMapUv:Se&&p(i.diffuseRoughnessMap.channel),iridescenceMapUv:I&&p(i.iridescenceMap.channel),iridescenceThicknessMapUv:Ce&&p(i.iridescenceThicknessMap.channel),sheenColorMapUv:L&&p(i.sheenColorMap.channel),sheenRoughnessMapUv:we&&p(i.sheenRoughnessMap.channel),specularMapUv:R&&p(i.specularMap.channel),specularColorMapUv:Te&&p(i.specularColorMap.channel),specularIntensityMapUv:z&&p(i.specularIntensityMap.channel),transmissionMapUv:B&&p(i.transmissionMap.channel),thicknessMapUv:Ee&&p(i.thicknessMap.channel),alphaMapUv:Oe&&p(i.alphaMap.channel),vertexTangents:!!_.attributes.tangent&&(oe||de),vertexNormals:!!_.attributes.normal,vertexColors:i.vertexColors,vertexAlphas:i.vertexColors===!0&&!!_.attributes.color&&_.attributes.color.itemSize===4,pointsUvs:m.isPoints===!0&&!!_.attributes.uv&&(N||Oe),fog:!!g,useFog:i.fog===!0,fogExp2:!!g&&g.isFogExp2,flatShading:i.wireframe===!1&&(i.flatShading===!0||_.attributes.normal===void 0&&oe===!1&&(i.isMeshLambertMaterial||i.isMeshPhongMaterial||i.isMeshStandardMaterial||i.isMeshPhysicalMaterial)),sizeAttenuation:i.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:j,skinning:m.isSkinnedMesh===!0,hasPositionAttribute:_.attributes.position!==void 0,morphTargets:_.morphAttributes.position!==void 0,morphNormals:_.morphAttributes.normal!==void 0,morphColors:_.morphAttributes.color!==void 0,morphTargetsCount:w,morphTextureStride:T,numSunLights:o.sun.length,numDirLights:o.directional.length,numPointLights:o.point.length,numSpotLights:o.spot.length,numSpotLightMaps:o.spotLightMap.length,numRectAreaLights:o.rectArea.length,numHemiLights:o.hemi.length,numSunLightShadows:o.sunShadowMap.length,numDirLightShadows:o.directionalShadowMap.length,numPointLightShadows:o.pointShadowMap.length,numSpotLightShadows:o.spotShadowMap.length,numSpotLightShadowsWithMaps:o.numSpotLightShadowsWithMaps,numLightProbes:o.numLightProbes,numLightProbeGrids:h.filter(e=>e.texture!==null).length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:i.dithering,shadowMapEnabled:e.shadowMap.enabled&&l.length>0,shadowMapType:e.shadowMap.type,toneMapping:je,decodeVideoTexture:N&&i.map.isVideoTexture===!0&&Ho.getTransfer(i.map.colorSpace)===`srgb`,decodeVideoTextureEmissive:ce&&i.emissiveMap.isVideoTexture===!0&&Ho.getTransfer(i.emissiveMap.colorSpace)===`srgb`,premultipliedAlpha:i.premultipliedAlpha,doubleSided:i.side===2,flipSided:i.side===1,useDepthPacking:i.depthPacking>=0,depthPacking:i.depthPacking||0,index0AttributeName:i.index0AttributeName,extensionClipCullDistance:Ae&&i.extensions.clipCullDistance===!0&&n.has(`WEBGL_clip_cull_distance`),extensionMultiDraw:(Ae&&i.extensions.multiDraw===!0||M)&&n.has(`WEBGL_multi_draw`),rendererExtensionParallelShaderCompile:n.has(`KHR_parallel_shader_compile`),customProgramCacheKey:i.customProgramCacheKey()};return Ne.vertexUv1s=c.has(1),Ne.vertexUv2s=c.has(2),Ne.vertexUv3s=c.has(3),c.clear(),Ne}function h(t){let n=[];if(t.shaderID?n.push(t.shaderID):(n.push(t.customVertexShaderID),n.push(t.customFragmentShaderID)),t.defines!==void 0)for(let e in t.defines)n.push(e),n.push(t.defines[e]);return t.isRawShaderMaterial===!1&&(g(n,t),_(n,t),n.push(e.outputColorSpace)),n.push(t.customProgramCacheKey),n.join()}function g(e,t){e.push(t.precision),e.push(t.outputColorSpace),e.push(t.envMapMode),e.push(t.envMapPMREM),e.push(t.envMapMaxLod),e.push(t.envMapSize),e.push(t.mapUv),e.push(t.alphaMapUv),e.push(t.lightMapUv),e.push(t.aoMapUv),e.push(t.bumpMapUv),e.push(t.normalMapUv),e.push(t.displacementMapUv),e.push(t.emissiveMapUv),e.push(t.metalnessMapUv),e.push(t.roughnessMapUv),e.push(t.anisotropyMapUv),e.push(t.clearcoatMapUv),e.push(t.clearcoatNormalMapUv),e.push(t.clearcoatRoughnessMapUv),e.push(t.diffuseRoughnessMapUv),e.push(t.iridescenceMapUv),e.push(t.iridescenceThicknessMapUv),e.push(t.sheenColorMapUv),e.push(t.sheenRoughnessMapUv),e.push(t.specularMapUv),e.push(t.specularColorMapUv),e.push(t.specularIntensityMapUv),e.push(t.transmissionMapUv),e.push(t.thicknessMapUv),e.push(t.combine),e.push(t.fogExp2),e.push(t.sizeAttenuation),e.push(t.morphTargetsCount),e.push(t.numSunLights),e.push(t.numDirLights),e.push(t.numPointLights),e.push(t.numSpotLights),e.push(t.numSpotLightMaps),e.push(t.numHemiLights),e.push(t.numRectAreaLights),e.push(t.numSunLightShadows),e.push(t.numDirLightShadows),e.push(t.numPointLightShadows),e.push(t.numSpotLightShadows),e.push(t.numSpotLightShadowsWithMaps),e.push(t.numLightProbes),e.push(t.numLightProbeGrids),e.push(t.shadowMapType),e.push(t.toneMapping),e.push(t.numClippingPlanes),e.push(t.numClipIntersection),e.push(t.depthPacking)}function _(e,t){o.disableAll(),t.instancing&&o.enable(0),t.instancingColor&&o.enable(1),t.instancingMorph&&o.enable(2),t.matcap&&o.enable(3),t.envMap&&o.enable(4),t.normalMapObjectSpace&&o.enable(5),t.normalMapTangentSpace&&o.enable(6),t.clearcoat&&o.enable(7),t.iridescence&&o.enable(8),t.alphaTest&&o.enable(9),t.vertexColors&&o.enable(10),t.vertexAlphas&&o.enable(11),t.vertexUv1s&&o.enable(12),t.vertexUv2s&&o.enable(13),t.vertexUv3s&&o.enable(14),t.vertexTangents&&o.enable(15),t.anisotropy&&o.enable(16),t.alphaHash&&o.enable(17),t.batching&&o.enable(18),t.dispersion&&o.enable(19),t.retroreflection&&o.enable(24),t.diffuseRoughness&&o.enable(25),t.batchingColor&&o.enable(20),t.gradientMap&&o.enable(21),t.packedNormalMap&&o.enable(22),t.vertexNormals&&o.enable(23),e.push(o.mask),o.disableAll(),t.fog&&o.enable(0),t.useFog&&o.enable(1),t.flatShading&&o.enable(2),t.logarithmicDepthBuffer&&o.enable(3),t.reversedDepthBuffer&&o.enable(4),t.skinning&&o.enable(5),t.morphTargets&&o.enable(6),t.morphNormals&&o.enable(7),t.morphColors&&o.enable(8),t.premultipliedAlpha&&o.enable(9),t.shadowMapEnabled&&o.enable(10),t.doubleSided&&o.enable(11),t.flipSided&&o.enable(12),t.useDepthPacking&&o.enable(13),t.dithering&&o.enable(14),t.transmission&&o.enable(15),t.sheen&&o.enable(16),t.opaque&&o.enable(17),t.pointsUvs&&o.enable(18),t.decodeVideoTexture&&o.enable(19),t.decodeVideoTextureEmissive&&o.enable(20),t.alphaToCoverage&&o.enable(21),t.numLightProbeGrids>0&&o.enable(22),t.hasPositionAttribute&&o.enable(23),e.push(o.mask)}function v(e){let t=f[e.type],n;if(t){let e=qf[t];n=Od.clone(e.uniforms)}else n=e.uniforms;return n}function y(t,n){let r=u.get(n);return r===void 0?(r=new mh(e,n,t,i),l.push(r),u.set(n,r)):++r.usedTimes,r}function b(e){if(--e.usedTimes===0){let t=l.indexOf(e);l[t]=l[l.length-1],l.pop(),u.delete(e.cacheKey),e.destroy()}}function x(e){s.remove(e)}function S(){s.dispose()}return{getParameters:m,getProgramCacheKey:h,getUniforms:v,acquireProgram:y,releaseProgram:b,releaseShaderCache:x,programs:l,dispose:S}}function bh(){let e=new WeakMap;function t(t){return e.has(t)}function n(t){let n=e.get(t);return n===void 0&&(n={},e.set(t,n)),n}function r(t){e.delete(t)}function i(t,n,r){e.get(t)[n]=r}function a(){e=new WeakMap}return{has:t,get:n,remove:r,update:i,dispose:a}}function xh(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.material.id===t.material.id?e.materialVariant===t.materialVariant?e.z===t.z?e.id-t.id:e.z-t.z:e.materialVariant-t.materialVariant:e.material.id-t.material.id:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Sh(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.z===t.z?e.id-t.id:t.z-e.z:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Ch(){let e=[],t=0,n=[],r=[],i=[];function a(){t=0,n.length=0,r.length=0,i.length=0}function o(e){let t=0;return e.isInstancedMesh&&(t+=2),e.isSkinnedMesh&&(t+=1),t}function s(n,r,i,a,s,c){let l=e[t];return l===void 0?(l={id:n.id,object:n,geometry:r,material:i,materialVariant:o(n),groupOrder:a,renderOrder:n.renderOrder,z:s,group:c},e[t]=l):(l.id=n.id,l.object=n,l.geometry=r,l.material=i,l.materialVariant=o(n),l.groupOrder=a,l.renderOrder=n.renderOrder,l.z=s,l.group=c),t++,l}function c(e,t,a,o,c,l,u){u.reversedDepth===!0&&(c=-c);let d=s(e,t,a,o,c,l);a.transmission>0?r.push(d):a.transparent===!0?i.push(d):n.push(d)}function l(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.unshift(u):a.transparent===!0?i.unshift(u):n.unshift(u)}function u(e,t){n.length>1&&n.sort(e||xh),r.length>1&&r.sort(t||Sh),i.length>1&&i.sort(t||Sh)}function d(){for(let n=t,r=e.length;n<r;n++){let t=e[n];if(t.id===null)break;t.id=null,t.object=null,t.geometry=null,t.material=null,t.group=null}}return{opaque:n,transmissive:r,transparent:i,init:a,push:c,unshift:l,finish:d,sort:u}}function wh(){let e=new WeakMap;function t(t,n){let r=e.get(t),i;return r===void 0?(i=new Ch,e.set(t,[i])):n>=r.length?(i=new Ch,r.push(i)):i=r[n],i}function n(){e=new WeakMap}return{get:t,dispose:n}}function Th(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={direction:new q,color:new J};break;case`SpotLight`:n={position:new q,direction:new q,color:new J,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case`PointLight`:n={position:new q,color:new J,distance:0,decay:0};break;case`HemisphereLight`:n={direction:new q,skyColor:new J,groundColor:new J};break;case`RectAreaLight`:n={color:new J,position:new q,halfWidth:new q,halfHeight:new q}}return e[t.id]=n,n}}}function Eh(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new K};break;case`SpotLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new K};break;case`PointLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new K,shadowCameraNear:1,shadowCameraFar:1e3}}return e[t.id]=n,n}}}var Dh=0;function Oh(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+ +!!t.map-!!e.map}function kh(e){let t=new Th,n=Eh(),r={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let e=0;e<9;e++)r.probe.push(new q);let i=new q,a=new is,o=new is;function s(i){let a=0,o=0,s=0;for(let e=0;e<9;e++)r.probe[e].set(0,0,0);let c=0,l=0,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=0,y=0,b=0,x=0;i.sort(Oh);for(let e=0,S=i.length;e<S;e++){let S=i[e],C=S.color,w=S.intensity,T=S.distance,E=null;if(S.shadow&&S.shadow.map&&(E=S.shadow.map.texture.format===1030?S.shadow.map.texture:S.shadow.map.depthTexture||S.shadow.map.texture),S.isAmbientLight)a+=C.r*w,o+=C.g*w,s+=C.b*w;else if(S.isLightProbe){for(let e=0;e<9;e++)r.probe[e].addScaledVector(S.sh.coefficients[e],w);x++}else if(S.isSunLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize.copy(e.mapSize).multiply(e.getFrameExtents()),r.sunShadow[l]=t,r.sunShadowMap[l]=E;let i=e.getViewportCount();for(let t=0;t<i;t++)r.sunShadowMatrix[u+t]=e.getMatrix(t),r.sunShadowCascade[u+t]=e._cascadeData[t];u+=i,l++}r.sun[c]=e,c++}else if(S.isDirectionalLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,r.directionalShadow[d]=t,r.directionalShadowMap[d]=E,r.directionalShadowMatrix[d]=S.shadow.matrix,g++}r.directional[d]=e,d++}else if(S.isSpotLight){let e=t.get(S);e.position.setFromMatrixPosition(S.matrixWorld),e.color.copy(C).multiplyScalar(w),e.distance=T,e.coneCos=Math.cos(S.angle),e.penumbraCos=Math.cos(S.angle*(1-S.penumbra)),e.decay=S.decay,r.spot[p]=e;let i=S.shadow;if(S.map&&(r.spotLightMap[y]=S.map,y++,i.updateMatrices(S),S.castShadow&&b++),r.spotLightMatrix[p]=i.matrix,S.castShadow){let e=n.get(S);e.shadowIntensity=i.intensity,e.shadowBias=i.bias,e.shadowNormalBias=i.normalBias,e.shadowRadius=i.radius,e.shadowMapSize=i.mapSize,r.spotShadow[p]=e,r.spotShadowMap[p]=E,v++}p++}else if(S.isRectAreaLight){let e=t.get(S);e.color.copy(C).multiplyScalar(w),e.halfWidth.set(S.width*.5,0,0),e.halfHeight.set(0,S.height*.5,0),r.rectArea[m]=e,m++}else if(S.isPointLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),e.distance=S.distance,e.decay=S.decay,S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,t.shadowCameraNear=e.camera.near,t.shadowCameraFar=e.camera.far,r.pointShadow[f]=t,r.pointShadowMap[f]=E,r.pointShadowMatrix[f]=S.shadow.matrix,_++}r.point[f]=e,f++}else if(S.isHemisphereLight){let e=t.get(S);e.skyColor.copy(S.color).multiplyScalar(w),e.groundColor.copy(S.groundColor).multiplyScalar(w),r.hemi[h]=e,h++}}m>0&&(e.has(`OES_texture_float_linear`)===!0?(r.rectAreaLTC1=Y.LTC_FLOAT_1,r.rectAreaLTC2=Y.LTC_FLOAT_2):(r.rectAreaLTC1=Y.LTC_HALF_1,r.rectAreaLTC2=Y.LTC_HALF_2)),r.ambient[0]=a,r.ambient[1]=o,r.ambient[2]=s;let S=r.hash;(S.sunLength!==c||S.directionalLength!==d||S.pointLength!==f||S.spotLength!==p||S.rectAreaLength!==m||S.hemiLength!==h||S.numSunShadows!==l||S.numDirectionalShadows!==g||S.numPointShadows!==_||S.numSpotShadows!==v||S.numSpotMaps!==y||S.numLightProbes!==x)&&(r.sun.length=c,r.directional.length=d,r.spot.length=p,r.rectArea.length=m,r.point.length=f,r.hemi.length=h,r.sunShadow.length=l,r.sunShadowMap.length=l,r.sunShadowMatrix.length=u,r.sunShadowCascade.length=u,r.directionalShadow.length=g,r.directionalShadowMap.length=g,r.directionalShadowMatrix.length=g,r.pointShadow.length=_,r.pointShadowMap.length=_,r.pointShadowMatrix.length=_,r.spotShadow.length=v,r.spotShadowMap.length=v,r.spotLightMatrix.length=v+y-b,r.spotLightMap.length=y,r.numSpotLightShadowsWithMaps=b,r.numLightProbes=x,S.sunLength=c,S.directionalLength=d,S.pointLength=f,S.spotLength=p,S.rectAreaLength=m,S.hemiLength=h,S.numSunShadows=l,S.numDirectionalShadows=g,S.numPointShadows=_,S.numSpotShadows=v,S.numSpotMaps=y,S.numLightProbes=x,r.version=Dh++)}function c(e,t){let n=0,s=0,c=0,l=0,u=0,d=0,f=t.matrixWorldInverse;for(let t=0,p=e.length;t<p;t++){let p=e[t];if(p.isSunLight){let e=r.sun[n];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),n++}else if(p.isDirectionalLight){let e=r.directional[s];e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),s++}else if(p.isSpotLight){let e=r.spot[l];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),l++}else if(p.isRectAreaLight){let e=r.rectArea[u];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),o.identity(),a.copy(p.matrixWorld),a.premultiply(f),o.extractRotation(a),e.halfWidth.set(p.width*.5,0,0),e.halfHeight.set(0,p.height*.5,0),e.halfWidth.applyMatrix4(o),e.halfHeight.applyMatrix4(o),u++}else if(p.isPointLight){let e=r.point[c];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),c++}else if(p.isHemisphereLight){let e=r.hemi[d];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),d++}}}return{setup:s,setupView:c,state:r}}function Ah(e){let t=new kh(e),n=[],r=[],i=[];function a(e){u.camera=e,n.length=0,r.length=0,i.length=0}function o(e){e.isLightProbeGrid?i.push(e):n.push(e)}function s(e){r.push(e)}function c(){t.setup(n),i.sort((e,t)=>e.priority-t.priority||e.id-t.id)}function l(e){t.setupView(n,e)}let u={lightsArray:n,shadowsArray:r,lightProbeGridArray:i,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:a,state:u,setupLights:c,setupLightsView:l,pushLight:o,pushShadow:s}}function jh(e){let t=new WeakMap;function n(n,r=0){let i=t.get(n),a;return i===void 0?(a=new Ah(e),t.set(n,[a])):r>=i.length?(a=new Ah(e),i.push(a)):a=i[r],a}function r(){t=new WeakMap}return{get:n,dispose:r}}var Mh=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Nh=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,Ph=[new q(1,0,0),new q(-1,0,0),new q(0,1,0),new q(0,-1,0),new q(0,0,1),new q(0,0,-1)],Fh=[new q(0,-1,0),new q(0,-1,0),new q(0,0,1),new q(0,0,-1),new q(0,-1,0),new q(0,-1,0)],Ih=new is,Lh=new q,Rh=new q;function zh(e,t,n){let r=new xl,i=new K,a=new K,o=new $o,s=new Id,c=new Ld,l={},u=n.maxTextureSize,d={0:1,1:0,2:2},f=new jd({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new K},radius:{value:4}},vertexShader:Mh,fragmentShader:Nh}),p=f.clone();p.defines.HORIZONTAL_PASS=1;let m=new Fc;m.setAttribute(`position`,new bc(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let h=new al(m,f),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let _=this.type;this.render=function(t,n,s){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||t.length===0)return;this.type===2&&(W(`WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.`),this.type=1);let c=e.getRenderTarget(),l=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),f=e.state;f.setBlending(0),f.buffers.depth.getReversed()===!0?f.buffers.color.setClear(0,0,0,0):f.buffers.color.setClear(1,1,1,1),f.buffers.depth.setTest(!0),f.setScissorTest(!1);let p=_!==this.type;p&&n.traverse(function(e){e.material&&(Array.isArray(e.material)?e.material.forEach(e=>e.needsUpdate=!0):e.material.needsUpdate=!0)});for(let c=0,l=t.length;c<l;c++){let l=t[c],d=l.shadow;if(d===void 0){W(`WebGLShadowMap:`,l,`has no shadow.`);continue}if(d.autoUpdate===!1&&d.needsUpdate===!1)continue;i.copy(d.mapSize);let m=d.getFrameExtents();i.multiply(m),a.copy(d.mapSize),(i.x>u||i.y>u)&&(i.x>u&&(a.x=Math.floor(u/m.x),i.x=a.x*m.x,d.mapSize.x=a.x),i.y>u&&(a.y=Math.floor(u/m.y),i.y=a.y*m.y,d.mapSize.y=a.y));let h=e.state.buffers.depth.getReversed();if(d.camera._reversedDepth=h,d.map===null||p===!0){if(d.map!==null&&(d.map.depthTexture!==null&&(d.map.depthTexture.dispose(),d.map.depthTexture=null),d.map.dispose()),this.type===3){if(l.isPointLight){W(`WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.`);continue}d.map=new ts(i.x,i.y,{format:la,type:Xi,minFilter:Bi,magFilter:Bi,generateMipmaps:!1}),d.map.texture.name=l.name+`.shadowMap`,d.map.depthTexture=new Kl(i.x,i.y,Yi),d.map.depthTexture.name=l.name+`.shadowMapDepth`,d.map.depthTexture.format=aa,d.map.depthTexture.compareFunction=null,d.map.depthTexture.minFilter=Li,d.map.depthTexture.magFilter=Li}else l.isPointLight?(d.map=new np(i.x),d.map.depthTexture=new ql(i.x,Ji)):(d.map=new ts(i.x,i.y),d.map.depthTexture=new Kl(i.x,i.y,Ji)),d.map.depthTexture.name=l.name+`.shadowMap`,d.map.depthTexture.format=aa,this.type===1?(d.map.depthTexture.compareFunction=h?518:515,d.map.depthTexture.minFilter=Bi,d.map.depthTexture.magFilter=Bi):(d.map.depthTexture.compareFunction=null,d.map.depthTexture.minFilter=Li,d.map.depthTexture.magFilter=Li);d.camera.updateProjectionMatrix()}d.map.isWebGLCubeRenderTarget!==!0&&(d.map.width!==i.x||d.map.height!==i.y)&&d.map.setSize(i.x,i.y);let g=d.map.isWebGLCubeRenderTarget?6:d.getViewportCount();l.isPointLight!==!0&&d.updateMatrices(l,s);let _=d.camera.layers.mask&4294967294?d.camera.layers:s.layers;for(let t=0;t<g;t++){let i=d.getCamera(t);if(l.isPointLight){let e=d.camera,n=d.matrix,r=l.distance||e.far;r!==e.far&&(e.far=r,e.updateProjectionMatrix()),Lh.setFromMatrixPosition(l.matrixWorld),e.position.copy(Lh),Rh.copy(e.position),Rh.add(Ph[t]),e.up.copy(Fh[t]),e.lookAt(Rh),e.updateMatrixWorld(),n.makeTranslation(-Lh.x,-Lh.y,-Lh.z),Ih.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),d._frustum.setFromProjectionMatrix(Ih,e.coordinateSystem,e.reversedDepth)}if(d.map.isWebGLCubeRenderTarget)e.setRenderTarget(d.map,t),e.clear();else{t===0&&(e.setRenderTarget(d.map),e.clear());let n=d.getViewport(t);o.set(a.x*n.x,a.y*n.y,a.x*n.z,a.y*n.w),f.viewport(o)}r=d.getFrustum(t),b(n,s,i,l,_,this.type)}d.isPointLightShadow!==!0&&this.type===3&&v(d,s),d.needsUpdate=!1}_=this.type,g.needsUpdate=!1,e.setRenderTarget(c,l,d)};function v(n,r){let a=t.update(h);f.defines.VSM_SAMPLES!==n.blurSamples&&(f.defines.VSM_SAMPLES=n.blurSamples,p.defines.VSM_SAMPLES=n.blurSamples,f.needsUpdate=!0,p.needsUpdate=!0),n.mapPass===null?n.mapPass=new ts(i.x,i.y,{format:la,type:Xi}):(n.mapPass.width!==n.map.width||n.mapPass.height!==n.map.height)&&n.mapPass.setSize(n.map.width,n.map.height),f.uniforms.shadow_pass.value=n.map.depthTexture,f.uniforms.resolution.value.set(n.map.width,n.map.height),f.uniforms.radius.value=n.radius,e.setRenderTarget(n.mapPass),e.clear(),e.renderBufferDirect(r,null,a,f,h,null),p.uniforms.shadow_pass.value=n.mapPass.texture,p.uniforms.resolution.value.set(n.map.width,n.map.height),p.uniforms.radius.value=n.radius,e.setRenderTarget(n.map),e.clear(),e.renderBufferDirect(r,null,a,p,h,null)}function y(t,n,r,i){let a=null,o=r.isPointLight===!0?t.customDistanceMaterial:t.customDepthMaterial;if(o!==void 0)a=o;else if(a=r.isPointLight===!0?c:s,e.localClippingEnabled&&n.clipShadows===!0&&Array.isArray(n.clippingPlanes)&&n.clippingPlanes.length!==0||n.displacementMap&&n.displacementScale!==0||n.alphaMap&&n.alphaTest>0||n.map&&n.alphaTest>0||n.alphaToCoverage===!0){let e=a.uuid,t=n.uuid,r=l[e];r===void 0&&(r={},l[e]=r);let i=r[t];i===void 0&&(i=a.clone(),r[t]=i,n.addEventListener(`dispose`,x)),a=i}if(a.visible=n.visible,a.wireframe=n.wireframe,i===3?a.side=n.shadowSide===null?n.side:n.shadowSide:a.side=n.shadowSide===null?d[n.side]:n.shadowSide,a.alphaMap=n.alphaMap,a.alphaTest=n.alphaToCoverage===!0?.5:n.alphaTest,a.map=n.map,a.clipShadows=n.clipShadows,a.clippingPlanes=n.clippingPlanes,a.clipIntersection=n.clipIntersection,a.displacementMap=n.displacementMap,a.displacementScale=n.displacementScale,a.displacementBias=n.displacementBias,a.wireframeLinewidth=n.wireframeLinewidth,a.linewidth=n.linewidth,r.isPointLight===!0&&a.isMeshDistanceMaterial===!0){let t=e.properties.get(a);t.light=r}return a}function b(n,i,a,o,s,c){if(n.visible===!1)return;if(n.layers.test(s)&&(n.isMesh||n.isLine||n.isPoints)&&(n.castShadow||n.receiveShadow&&c===3)&&(!n.frustumCulled||n.intersectsFrustum(r))){n.modelViewMatrix.multiplyMatrices(a.matrixWorldInverse,n.matrixWorld);let r=t.update(n),s=n.material;if(Array.isArray(s)){let t=r.groups;for(let l=0,u=t.length;l<u;l++){let u=t[l],d=s[u.materialIndex];if(d&&d.visible){let t=y(n,d,o,c);n.onBeforeShadow(e,n,i,a,r,t,u),e.renderBufferDirect(a,null,r,t,n,u),n.onAfterShadow(e,n,i,a,r,t,u)}}}else if(s.visible){let t=y(n,s,o,c);n.onBeforeShadow(e,n,i,a,r,t,null),e.renderBufferDirect(a,null,r,t,n,null),n.onAfterShadow(e,n,i,a,r,t,null)}}let l=n.children;for(let e=0,t=l.length;e<t;e++)b(l[e],i,a,o,s,c)}function x(e){e.target.removeEventListener(`dispose`,x);for(let t in l){let n=l[t],r=e.target.uuid;r in n&&(n[r].dispose(),delete n[r])}}}function Bh(e,t){function n(){let t=!1,n=new $o,r=null,i=new $o(0,0,0,0);return{setMask:function(n){r!==n&&!t&&(e.colorMask(n,n,n,n),r=n)},setLocked:function(e){t=e},setClear:function(t,r,a,o,s){s===!0&&(t*=o,r*=o,a*=o),n.set(t,r,a,o),i.equals(n)===!1&&(e.clearColor(t,r,a,o),i.copy(n))},reset:function(){t=!1,r=null,i.set(-1,0,0,0)}}}function r(){let n=!1,r=!1,i=null,a=null,o=null;return{setReversed:function(e){if(r!==e){let n=t.get(`EXT_clip_control`);e?n.clipControlEXT(n.LOWER_LEFT_EXT,n.ZERO_TO_ONE_EXT):n.clipControlEXT(n.LOWER_LEFT_EXT,n.NEGATIVE_ONE_TO_ONE_EXT),r=e;let i=o;o=null,this.setClear(i)}},getReversed:function(){return r},setTest:function(t){t?le(e.DEPTH_TEST):ue(e.DEPTH_TEST)},setMask:function(t){i!==t&&!n&&(e.depthMask(t),i=t)},setFunc:function(t){if(r&&(t=xo[t]),a!==t){switch(t){case 0:e.depthFunc(e.NEVER);break;case 1:e.depthFunc(e.ALWAYS);break;case 2:e.depthFunc(e.LESS);break;case 3:e.depthFunc(e.LEQUAL);break;case 4:e.depthFunc(e.EQUAL);break;case 5:e.depthFunc(e.GEQUAL);break;case 6:e.depthFunc(e.GREATER);break;case 7:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}a=t}},setLocked:function(e){n=e},setClear:function(t){o!==t&&(o=t,r&&(t=1-t),e.clearDepth(t))},reset:function(){n=!1,i=null,a=null,o=null,r=!1}}}function i(){let t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null;return{setTest:function(n){t||(n?le(e.STENCIL_TEST):ue(e.STENCIL_TEST))},setMask:function(r){n!==r&&!t&&(e.stencilMask(r),n=r)},setFunc:function(t,n,o){(r!==t||i!==n||a!==o)&&(e.stencilFunc(t,n,o),r=t,i=n,a=o)},setOp:function(t,n,r){(o!==t||s!==n||c!==r)&&(e.stencilOp(t,n,r),o=t,s=n,c=r)},setLocked:function(e){t=e},setClear:function(t){l!==t&&(e.clearStencil(t),l=t)},reset:function(){t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null}}}let a=new n,o=new r,s=new i,c={},l=new WeakMap,u={},d={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new J(0,0,0),T=0,E=!1,D=null,O=null,k=null,A=null,j=null,ee=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),M=!1,N=0,P=e.getParameter(e.VERSION);P.indexOf(`WebGL`)===-1?P.indexOf(`OpenGL ES`)!==-1&&(N=parseFloat(/^OpenGL ES (\d)/.exec(P)[1]),M=N>=2):(N=parseFloat(/^WebGL (\d)/.exec(P)[1]),M=N>=1);let te=null,ne={},re=e.getParameter(e.SCISSOR_BOX),ie=e.getParameter(e.VIEWPORT),ae=new $o().fromArray(re),oe=new $o().fromArray(ie);function se(t,n,r,i){let a=new Uint8Array(4),o=e.createTexture();e.bindTexture(t,o),e.texParameteri(t,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(t,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let o=0;o<r;o++)t===e.TEXTURE_3D||t===e.TEXTURE_2D_ARRAY?e.texImage3D(n,0,e.RGBA,1,1,i,0,e.RGBA,e.UNSIGNED_BYTE,a):e.texImage2D(n+o,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,a);return o}let ce={};ce[e.TEXTURE_2D]=se(e.TEXTURE_2D,e.TEXTURE_2D,1),ce[e.TEXTURE_CUBE_MAP]=se(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),ce[e.TEXTURE_2D_ARRAY]=se(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),ce[e.TEXTURE_3D]=se(e.TEXTURE_3D,e.TEXTURE_3D,1,1),a.setClear(0,0,0,1),o.setClear(1),s.setClear(0),le(e.DEPTH_TEST),o.setFunc(3),_e(!1),ve(1),le(e.CULL_FACE),he(0);function le(t){u[t]!==!0&&(e.enable(t),u[t]=!0)}function ue(t){u[t]!==!1&&(e.disable(t),u[t]=!1)}function de(t,n){return f[t]!==n&&(e.bindFramebuffer(t,n),f[t]=n,t===e.DRAW_FRAMEBUFFER&&(f[e.FRAMEBUFFER]=n),t===e.FRAMEBUFFER&&(f[e.DRAW_FRAMEBUFFER]=n),!0)}function fe(t,n){let r=m,i=!1;if(t){r=p.get(n),r===void 0&&(r=[],p.set(n,r));let a=t.textures;if(r.length!==a.length||r[0]!==e.COLOR_ATTACHMENT0){for(let t=0,n=a.length;t<n;t++)r[t]=e.COLOR_ATTACHMENT0+t;r.length=a.length,i=!0}}else r[0]!==e.BACK&&(r[0]=e.BACK,i=!0);i&&e.drawBuffers(r)}function F(t){return h!==t&&(e.useProgram(t),h=t,!0)}let pe={100:e.FUNC_ADD,101:e.FUNC_SUBTRACT,102:e.FUNC_REVERSE_SUBTRACT};pe[103]=e.MIN,pe[104]=e.MAX;let me={200:e.ZERO,201:e.ONE,202:e.SRC_COLOR,204:e.SRC_ALPHA,210:e.SRC_ALPHA_SATURATE,208:e.DST_COLOR,206:e.DST_ALPHA,203:e.ONE_MINUS_SRC_COLOR,205:e.ONE_MINUS_SRC_ALPHA,209:e.ONE_MINUS_DST_COLOR,207:e.ONE_MINUS_DST_ALPHA,211:e.CONSTANT_COLOR,212:e.ONE_MINUS_CONSTANT_COLOR,213:e.CONSTANT_ALPHA,214:e.ONE_MINUS_CONSTANT_ALPHA};function he(t,n,r,i,a,o,s,c,l,u){if(t===0)g===!0&&(ue(e.BLEND),g=!1);else if(g===!1&&(le(e.BLEND),g=!0),t!==5){if(t!==_||u!==E){if((v!==100||x!==100)&&(e.blendEquation(e.FUNC_ADD),v=100,x=100),u)switch(t){case 1:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFunc(e.ONE,e.ONE);break;case 3:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case 4:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:G(`WebGLState: Invalid blending: `,t)}else switch(t){case 1:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case 3:G(`WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true`);break;case 4:G(`WebGLState: MultiplyBlending requires material.premultipliedAlpha = true`);break;default:G(`WebGLState: Invalid blending: `,t)}y=null,b=null,S=null,C=null,w.set(0,0,0),T=0,_=t,E=u}}else a||=n,o||=r,s||=i,(n!==v||a!==x)&&(e.blendEquationSeparate(pe[n],pe[a]),v=n,x=a),(r!==y||i!==b||o!==S||s!==C)&&(e.blendFuncSeparate(me[r],me[i],me[o],me[s]),y=r,b=i,S=o,C=s),(c.equals(w)===!1||l!==T)&&(e.blendColor(c.r,c.g,c.b,l),w.copy(c),T=l),_=t,E=!1}function ge(t,n){t.side===2?ue(e.CULL_FACE):le(e.CULL_FACE);let r=t.side===1;n&&(r=!r),_e(r),t.blending===1&&t.transparent===!1?he(0):he(t.blending,t.blendEquation,t.blendSrc,t.blendDst,t.blendEquationAlpha,t.blendSrcAlpha,t.blendDstAlpha,t.blendColor,t.blendAlpha,t.premultipliedAlpha),o.setFunc(t.depthFunc),o.setTest(t.depthTest),o.setMask(t.depthWrite),a.setMask(t.colorWrite);let i=t.stencilWrite;s.setTest(i),i&&(s.setMask(t.stencilWriteMask),s.setFunc(t.stencilFunc,t.stencilRef,t.stencilFuncMask),s.setOp(t.stencilFail,t.stencilZFail,t.stencilZPass)),be(t.polygonOffset,t.polygonOffsetFactor,t.polygonOffsetUnits),t.alphaToCoverage===!0?le(e.SAMPLE_ALPHA_TO_COVERAGE):ue(e.SAMPLE_ALPHA_TO_COVERAGE)}function _e(t){D!==t&&(t?e.frontFace(e.CW):e.frontFace(e.CCW),D=t)}function ve(t){t===0?ue(e.CULL_FACE):(le(e.CULL_FACE),t!==O&&(t===1?e.cullFace(e.BACK):t===2?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))),O=t}function ye(t){t!==k&&(M&&e.lineWidth(t),k=t)}function be(t,n,r){t?(le(e.POLYGON_OFFSET_FILL),(A!==n||j!==r)&&(A=n,j=r,o.getReversed()&&(n=-n,r=-r),e.polygonOffset(n,r))):ue(e.POLYGON_OFFSET_FILL)}function xe(t){t?le(e.SCISSOR_TEST):ue(e.SCISSOR_TEST)}function Se(t){t===void 0&&(t=e.TEXTURE0+ee-1),te!==t&&(e.activeTexture(t),te=t)}function I(t,n,r){r===void 0&&(r=te===null?e.TEXTURE0+ee-1:te);let i=ne[r];i===void 0&&(i={type:void 0,texture:void 0},ne[r]=i),(i.type!==t||i.texture!==n)&&(te!==r&&(e.activeTexture(r),te=r),e.bindTexture(t,n||ce[t]),i.type=t,i.texture=n)}function Ce(){let t=ne[te];t!==void 0&&t.type!==void 0&&(e.bindTexture(t.type,null),t.type=void 0,t.texture=void 0)}function L(){try{e.compressedTexImage2D(...arguments)}catch(e){G(`WebGLState:`,e)}}function we(){try{e.compressedTexImage3D(...arguments)}catch(e){G(`WebGLState:`,e)}}function R(){try{e.texSubImage2D(...arguments)}catch(e){G(`WebGLState:`,e)}}function Te(){try{e.texSubImage3D(...arguments)}catch(e){G(`WebGLState:`,e)}}function z(){try{e.compressedTexSubImage2D(...arguments)}catch(e){G(`WebGLState:`,e)}}function B(){try{e.compressedTexSubImage3D(...arguments)}catch(e){G(`WebGLState:`,e)}}function Ee(){try{e.texStorage2D(...arguments)}catch(e){G(`WebGLState:`,e)}}function De(){try{e.texStorage3D(...arguments)}catch(e){G(`WebGLState:`,e)}}function Oe(){try{e.texImage2D(...arguments)}catch(e){G(`WebGLState:`,e)}}function ke(){try{e.texImage3D(...arguments)}catch(e){G(`WebGLState:`,e)}}function V(t){return d[t]===void 0?e.getParameter(t):d[t]}function Ae(t,n){d[t]!==n&&(e.pixelStorei(t,n),d[t]=n)}function je(t){ae.equals(t)===!1&&(e.scissor(t.x,t.y,t.z,t.w),ae.copy(t))}function Me(t){oe.equals(t)===!1&&(e.viewport(t.x,t.y,t.z,t.w),oe.copy(t))}function Ne(t,n){let r=l.get(n);r===void 0&&(r=new WeakMap,l.set(n,r));let i=r.get(t);i===void 0&&(i=e.getUniformBlockIndex(n,t.name),e.uniformBlockBinding(n,i,i),r.set(t,i))}function H(t,n,r){let i=l.get(n).get(t);c[i]!==r&&(e.bindBufferBase(e.UNIFORM_BUFFER,i,r),c[i]=r)}function Pe(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),o.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),e.pixelStorei(e.PACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.pixelStorei(e.PACK_ROW_LENGTH,0),e.pixelStorei(e.PACK_SKIP_PIXELS,0),e.pixelStorei(e.PACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_ROW_LENGTH,0),e.pixelStorei(e.UNPACK_IMAGE_HEIGHT,0),e.pixelStorei(e.UNPACK_SKIP_PIXELS,0),e.pixelStorei(e.UNPACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_SKIP_IMAGES,0),u={},d={},te=null,ne={},f={},c={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new J(0,0,0),T=0,E=!1,D=null,O=null,k=null,A=null,j=null,ae.set(0,0,e.canvas.width,e.canvas.height),oe.set(0,0,e.canvas.width,e.canvas.height),a.reset(),o.reset(),s.reset()}return{buffers:{color:a,depth:o,stencil:s},enable:le,disable:ue,bindFramebuffer:de,drawBuffers:fe,useProgram:F,setBlending:he,setMaterial:ge,setFlipSided:_e,setCullFace:ve,setLineWidth:ye,setPolygonOffset:be,setScissorTest:xe,activeTexture:Se,bindTexture:I,unbindTexture:Ce,compressedTexImage2D:L,compressedTexImage3D:we,texImage2D:Oe,texImage3D:ke,pixelStorei:Ae,getParameter:V,updateUBOMapping:Ne,uniformBlockBinding:H,texStorage2D:Ee,texStorage3D:De,texSubImage2D:R,texSubImage3D:Te,compressedTexSubImage2D:z,compressedTexSubImage3D:B,scissor:je,viewport:Me,reset:Pe}}function Vh(e,t,n,r,i,a,o){let s=t.has(`WEBGL_multisampled_render_to_texture`)?t.get(`WEBGL_multisampled_render_to_texture`):null,c=typeof navigator>`u`?!1:/OculusBrowser/g.test(navigator.userAgent),l=new K,u=new WeakMap,d=new Set,f,p=new WeakMap,m=new Set,h=new FinalizationRegistry(e=>m.delete(e)),g=!1;try{g=typeof OffscreenCanvas<`u`&&new OffscreenCanvas(1,1).getContext(`2d`)!==null}catch{}function _(e,t){return g?new OffscreenCanvas(e,t):mo(`canvas`)}function v(e,t,n){let r=1,i=Ee(e);if((i.width>n||i.height>n)&&(r=n/Math.max(i.width,i.height)),r<1){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap||typeof VideoFrame<`u`&&e instanceof VideoFrame){let n=Math.floor(r*i.width),a=Math.floor(r*i.height);f===void 0&&(f=_(n,a));let o=t?_(n,a):f;return o.width=n,o.height=a,o.getContext(`2d`).drawImage(e,0,0,n,a),W(`WebGLRenderer: Texture has been resized from (`+i.width+`x`+i.height+`) to (`+n+`x`+a+`).`),o}return`data`in e&&W(`WebGLRenderer: Image in DataTexture is too big (`+i.width+`x`+i.height+`).`),e}return e}function y(e){return e.generateMipmaps}function b(t){e.generateMipmap(t)}function x(t){return t.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:t.isWebGL3DRenderTarget?e.TEXTURE_3D:t.isWebGLArrayRenderTarget||t.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function S(n,r,i,a,o,s=!1){if(n!==null){if(e[n]!==void 0)return e[n];W(`WebGLRenderer: Attempt to use non-existing WebGL internal format '`+n+`'`)}let c;a&&(c=t.get(`EXT_texture_norm16`),c||W(`WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension`));let l=r;if(r===e.RED&&(i===e.FLOAT&&(l=e.R32F),i===e.HALF_FLOAT&&(l=e.R16F),i===e.UNSIGNED_BYTE&&(l=e.R8),i===e.UNSIGNED_SHORT&&c&&(l=c.R16_EXT),i===e.SHORT&&c&&(l=c.R16_SNORM_EXT)),r===e.RED_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.R8UI),i===e.UNSIGNED_SHORT&&(l=e.R16UI),i===e.UNSIGNED_INT&&(l=e.R32UI),i===e.BYTE&&(l=e.R8I),i===e.SHORT&&(l=e.R16I),i===e.INT&&(l=e.R32I)),r===e.RG&&(i===e.FLOAT&&(l=e.RG32F),i===e.HALF_FLOAT&&(l=e.RG16F),i===e.UNSIGNED_BYTE&&(l=e.RG8),i===e.UNSIGNED_SHORT&&c&&(l=c.RG16_EXT),i===e.SHORT&&c&&(l=c.RG16_SNORM_EXT)),r===e.RG_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RG8UI),i===e.UNSIGNED_SHORT&&(l=e.RG16UI),i===e.UNSIGNED_INT&&(l=e.RG32UI),i===e.BYTE&&(l=e.RG8I),i===e.SHORT&&(l=e.RG16I),i===e.INT&&(l=e.RG32I)),r===e.RGB_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGB8UI),i===e.UNSIGNED_SHORT&&(l=e.RGB16UI),i===e.UNSIGNED_INT&&(l=e.RGB32UI),i===e.BYTE&&(l=e.RGB8I),i===e.SHORT&&(l=e.RGB16I),i===e.INT&&(l=e.RGB32I)),r===e.RGBA_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGBA8UI),i===e.UNSIGNED_SHORT&&(l=e.RGBA16UI),i===e.UNSIGNED_INT&&(l=e.RGBA32UI),i===e.BYTE&&(l=e.RGBA8I),i===e.SHORT&&(l=e.RGBA16I),i===e.INT&&(l=e.RGBA32I)),r===e.RGB&&(i===e.UNSIGNED_SHORT&&c&&(l=c.RGB16_EXT),i===e.SHORT&&c&&(l=c.RGB16_SNORM_EXT),i===e.UNSIGNED_INT_5_9_9_9_REV&&(l=e.RGB9_E5),i===e.UNSIGNED_INT_10F_11F_11F_REV&&(l=e.R11F_G11F_B10F)),r===e.RGBA){let t=s?io:Ho.getTransfer(o);i===e.FLOAT&&(l=e.RGBA32F),i===e.HALF_FLOAT&&(l=e.RGBA16F),i===e.UNSIGNED_BYTE&&(l=t===`srgb`?e.SRGB8_ALPHA8:e.RGBA8),i===e.UNSIGNED_SHORT&&c&&(l=c.RGBA16_EXT),i===e.SHORT&&c&&(l=c.RGBA16_SNORM_EXT),i===e.UNSIGNED_SHORT_4_4_4_4&&(l=e.RGBA4),i===e.UNSIGNED_SHORT_5_5_5_1&&(l=e.RGB5_A1)}return(l===e.R16F||l===e.R32F||l===e.RG16F||l===e.RG32F||l===e.RGBA16F||l===e.RGBA32F)&&t.get(`EXT_color_buffer_float`),l}function C(t,n){let r;return t?n===null||n===1014||n===1020?r=e.DEPTH24_STENCIL8:n===1015?r=e.DEPTH32F_STENCIL8:n===1012&&(r=e.DEPTH24_STENCIL8,W(`DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.`)):n===null||n===1014||n===1020?r=e.DEPTH_COMPONENT24:n===1015?r=e.DEPTH_COMPONENT32F:n===1012&&(r=e.DEPTH_COMPONENT16),r}function w(e,t){return y(e)===!0||e.isFramebufferTexture&&e.minFilter!==1003&&e.minFilter!==1006?Math.log2(Math.max(t.width,t.height))+1:e.mipmaps.length>0?e.mipmaps.length:e.isCompressedTexture&&Array.isArray(e.image)?t.mipmaps.length:1}function T(e){let t=new WeakRef(e);r.get(e).__ref=t,m.add(t),h.register(e,t,t)}function E(e){let t=r.get(e).__ref;t!==void 0&&(m.delete(t),h.unregister(t))}function D(e){k(e.target)}function O(e){A(e.target)}function k(e){e.removeEventListener(`dispose`,D),E(e),ee(e),e.isVideoTexture&&u.delete(e),e.isHTMLTexture&&d.delete(e)}function A(e){e.removeEventListener(`dispose`,O),E(e),N(e)}function j(){for(let e of m){let t=e.deref();t!==void 0&&(t.isRenderTarget===!0?A(t):k(t))}m.clear(),d.clear()}function ee(e){let t=r.get(e);if(t.__webglInit===void 0)return;let n=e.source,i=p.get(n);if(i){let r=i[t.__cacheKey];r.usedTimes--,r.usedTimes===0&&M(e),Object.keys(i).length===0&&p.delete(n)}r.remove(e)}function M(t){let n=r.get(t);e.deleteTexture(n.__webglTexture);let i=t.source,a=p.get(i);delete a[n.__cacheKey],o.memory.textures--}function N(t){let n=r.get(t);n.__depthDisposeCallback&&n.__depthDisposeCallback();let i=t.depthTexture;if(i&&i.renderTarget===t&&k(i),t.isWebGLCubeRenderTarget)for(let t=0;t<6;t++){if(Array.isArray(n.__webglFramebuffer[t]))for(let r=0;r<n.__webglFramebuffer[t].length;r++)e.deleteFramebuffer(n.__webglFramebuffer[t][r]);else e.deleteFramebuffer(n.__webglFramebuffer[t]);n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer[t])}else{if(Array.isArray(n.__webglFramebuffer))for(let t=0;t<n.__webglFramebuffer.length;t++)e.deleteFramebuffer(n.__webglFramebuffer[t]);else e.deleteFramebuffer(n.__webglFramebuffer);if(n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer),n.__webglMultisampledFramebuffer&&e.deleteFramebuffer(n.__webglMultisampledFramebuffer),n.__webglColorRenderbuffer)for(let t=0;t<n.__webglColorRenderbuffer.length;t++)n.__webglColorRenderbuffer[t]&&e.deleteRenderbuffer(n.__webglColorRenderbuffer[t]);n.__webglDepthRenderbuffer&&e.deleteRenderbuffer(n.__webglDepthRenderbuffer)}let a=t.textures;for(let t=0,n=a.length;t<n;t++){let n=r.get(a[t]);n.__webglTexture&&(e.deleteTexture(n.__webglTexture),o.memory.textures--),r.remove(a[t])}r.remove(t)}let P=0;function te(){P=0}function ne(){return P}function re(e){P=e}function ie(){let e=P;return e>=i.maxTextures&&W(`WebGLTextures: Trying to use `+(e+1)+` texture units while this GPU supports only `+i.maxTextures),P+=1,e}function ae(e){let t=[];return t.push(e.wrapS),t.push(e.wrapT),t.push(e.wrapR||0),t.push(e.magFilter),t.push(e.minFilter),t.push(e.anisotropy),t.push(e.internalFormat),t.push(e.format),t.push(e.type),t.push(e.generateMipmaps),t.push(e.mipmapsAutoUpdate),t.push(e.premultiplyAlpha),t.push(e.flipY),t.push(e.unpackAlignment),t.push(e.colorSpace),t.join()}function oe(t,i){let a=r.get(t);if(t.isVideoTexture&&z(t),t.isRenderTargetTexture===!1&&t.isExternalTexture!==!0&&t.version>0&&a.__version!==t.version){let e=t.image;if(e===null)W(`WebGLRenderer: Texture marked for update but no image data found.`);else if(e.complete===!1)W(`WebGLRenderer: Texture marked for update but image is incomplete`);else{ge(a,t,i);return}}else t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null);n.bindTexture(e.TEXTURE_2D,a.__webglTexture,e.TEXTURE0+i)}function se(t,i){let a=r.get(t);t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version?ge(a,t,i):(t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null),n.bindTexture(e.TEXTURE_2D_ARRAY,a.__webglTexture,e.TEXTURE0+i))}function ce(t,i){let a=r.get(t);t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version?ge(a,t,i):n.bindTexture(e.TEXTURE_3D,a.__webglTexture,e.TEXTURE0+i)}function le(t,i){let a=r.get(t);t.version>0&&a.__version!==t.version?_e(a,t,i):n.bindTexture(e.TEXTURE_CUBE_MAP,a.__webglTexture,e.TEXTURE0+i)}let ue={[Pi]:e.REPEAT,[Fi]:e.CLAMP_TO_EDGE,[Ii]:e.MIRRORED_REPEAT},de={[Li]:e.NEAREST,[Ri]:e.NEAREST_MIPMAP_NEAREST,[zi]:e.NEAREST_MIPMAP_LINEAR,[Bi]:e.LINEAR,[Vi]:e.LINEAR_MIPMAP_NEAREST,[Hi]:e.LINEAR_MIPMAP_LINEAR},fe={512:e.NEVER,519:e.ALWAYS,513:e.LESS,515:e.LEQUAL,514:e.EQUAL,518:e.GEQUAL,516:e.GREATER,517:e.NOTEQUAL};function F(n,a){if(a.type===1015&&t.has(`OES_texture_float_linear`)===!1&&(a.magFilter===1006||a.magFilter===1007||a.magFilter===1005||a.magFilter===1008||a.minFilter===1006||a.minFilter===1007||a.minFilter===1005||a.minFilter===1008)&&W(`WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.`),e.texParameteri(n,e.TEXTURE_WRAP_S,ue[a.wrapS]),e.texParameteri(n,e.TEXTURE_WRAP_T,ue[a.wrapT]),(n===e.TEXTURE_3D||n===e.TEXTURE_2D_ARRAY)&&e.texParameteri(n,e.TEXTURE_WRAP_R,ue[a.wrapR]),e.texParameteri(n,e.TEXTURE_MAG_FILTER,de[a.magFilter]),e.texParameteri(n,e.TEXTURE_MIN_FILTER,de[a.minFilter]),a.compareFunction&&(e.texParameteri(n,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(n,e.TEXTURE_COMPARE_FUNC,fe[a.compareFunction])),t.has(`EXT_texture_filter_anisotropic`)===!0){if(a.magFilter===1003||a.minFilter!==1005&&a.minFilter!==1008||a.type===1015&&t.has(`OES_texture_float_linear`)===!1)return;if(a.anisotropy>1||r.get(a).__currentAnisotropy){let o=t.get(`EXT_texture_filter_anisotropic`);e.texParameterf(n,o.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(a.anisotropy,i.getMaxAnisotropy())),r.get(a).__currentAnisotropy=a.anisotropy}}}function pe(t,n){let r=!1;t.__webglInit===void 0&&(t.__webglInit=!0,n.addEventListener(`dispose`,D),T(n));let i=n.source,a=p.get(i);a===void 0&&(a={},p.set(i,a));let s=ae(n);if(s!==t.__cacheKey){a[s]===void 0&&(a[s]={texture:e.createTexture(),usedTimes:0},o.memory.textures++,r=!0),a[s].usedTimes++;let i=a[t.__cacheKey];i!==void 0&&(a[t.__cacheKey].usedTimes--,i.usedTimes===0&&M(n)),t.__cacheKey=s,t.__webglTexture=a[s].texture}return r}function me(e,t,n){return Math.floor(Math.floor(e/n)/t)}function he(t,r,i,a){let o=t.updateRanges;if(o.length===0)n.texSubImage2D(e.TEXTURE_2D,0,0,0,r.width,r.height,i,a,r.data);else{o.sort((e,t)=>e.start-t.start);let s=0;for(let e=1;e<o.length;e++){let t=o[s],n=o[e],i=t.start+t.count,a=me(n.start,r.width,4),c=me(t.start,r.width,4);n.start<=i+1&&a===c&&me(n.start+n.count-1,r.width,4)===a?t.count=Math.max(t.count,n.start+n.count-t.start):(++s,o[s]=n)}o.length=s+1;let c=n.getParameter(e.UNPACK_ROW_LENGTH),l=n.getParameter(e.UNPACK_SKIP_PIXELS),u=n.getParameter(e.UNPACK_SKIP_ROWS);n.pixelStorei(e.UNPACK_ROW_LENGTH,r.width);for(let t=0,s=o.length;t<s;t++){let s=o[t],c=Math.floor(s.start/4),l=Math.ceil(s.count/4),u=c%r.width,d=Math.floor(c/r.width),f=l;n.pixelStorei(e.UNPACK_SKIP_PIXELS,u),n.pixelStorei(e.UNPACK_SKIP_ROWS,d),n.texSubImage2D(e.TEXTURE_2D,0,u,d,f,1,i,a,r.data)}t.clearUpdateRanges(),n.pixelStorei(e.UNPACK_ROW_LENGTH,c),n.pixelStorei(e.UNPACK_SKIP_PIXELS,l),n.pixelStorei(e.UNPACK_SKIP_ROWS,u)}}function ge(t,o,s){let c=e.TEXTURE_2D;(o.isDataArrayTexture||o.isCompressedArrayTexture)&&(c=e.TEXTURE_2D_ARRAY),o.isData3DTexture&&(c=e.TEXTURE_3D);let l=pe(t,o),u=o.source;n.bindTexture(c,t.__webglTexture,e.TEXTURE0+s);let f=r.get(u);if(u.version!==f.__version||l===!0){if(n.activeTexture(e.TEXTURE0+s),!(typeof ImageBitmap<`u`&&o.image instanceof ImageBitmap)){let t=Ho.getPrimaries(Ho.workingColorSpace),r=o.colorSpace===``?null:Ho.getPrimaries(o.colorSpace),i=o.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,i)}n.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment);let t=v(o.image,!1,i.maxTextureSize);t=B(o,t);let r=a.convert(o.format,o.colorSpace),p=a.convert(o.type),m=S(o.internalFormat,r,p,o.normalized,o.colorSpace,o.isVideoTexture);F(c,o);let h,g=o.mipmaps,_=o.isVideoTexture!==!0,x=f.__version===void 0||l===!0,T=u.dataReady,E=w(o,t);if(o.isDepthTexture)m=C(o.format===oa,o.type),x&&(_?n.texStorage2D(e.TEXTURE_2D,1,m,t.width,t.height):n.texImage2D(e.TEXTURE_2D,0,m,t.width,t.height,0,r,p,null));else if(o.isDataTexture){if(g.length>0){_&&x&&n.texStorage2D(e.TEXTURE_2D,E,m,g[0].width,g[0].height);for(let t=0,i=g.length;t<i;t++)h=g[t],_?T&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,p,h.data):n.texImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,r,p,h.data);o.generateMipmaps=!1}else _?(x&&n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height),T&&he(o,t,r,p)):n.texImage2D(e.TEXTURE_2D,0,m,t.width,t.height,0,r,p,t.data)}else if(o.isCompressedTexture){if(o.isCompressedArrayTexture){_&&x&&n.texStorage3D(e.TEXTURE_2D_ARRAY,E,m,g[0].width,g[0].height,t.depth);for(let i=0,a=g.length;i<a;i++)if(h=g[i],o.format!==1023){if(r!==null){if(_){if(T){if(o.layerUpdates.size>0){let t=Hf(h.width,h.height,o.format,o.type);for(let a of o.layerUpdates){let o=h.data.subarray(a*t/h.data.BYTES_PER_ELEMENT,(a+1)*t/h.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,a,h.width,h.height,1,r,o)}}else n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,h.width,h.height,t.depth,r,h.data)}}else n.compressedTexImage3D(e.TEXTURE_2D_ARRAY,i,m,h.width,h.height,t.depth,0,h.data,0,0)}else W(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`)}else _?T&&n.texSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,h.width,h.height,t.depth,r,p,h.data):n.texImage3D(e.TEXTURE_2D_ARRAY,i,m,h.width,h.height,t.depth,0,r,p,h.data);o.layerUpdates.size>0&&o.clearLayerUpdates()}else{_&&x&&n.texStorage2D(e.TEXTURE_2D,E,m,g[0].width,g[0].height);for(let t=0,i=g.length;t<i;t++)h=g[t],o.format===1023?_?T&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,p,h.data):n.texImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,r,p,h.data):r===null?W(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`):_?T&&n.compressedTexSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,h.data):n.compressedTexImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,h.data)}}else if(o.isDataArrayTexture){if(_){if(x&&n.texStorage3D(e.TEXTURE_2D_ARRAY,E,m,t.width,t.height,t.depth),T){if(o.layerUpdates.size>0){let i=Hf(t.width,t.height,o.format,o.type);for(let a of o.layerUpdates){let o=t.data.subarray(a*i/t.data.BYTES_PER_ELEMENT,(a+1)*i/t.data.BYTES_PER_ELEMENT);n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,a,t.width,t.height,1,r,p,o)}o.clearLayerUpdates()}else n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,t.width,t.height,t.depth,r,p,t.data)}}else n.texImage3D(e.TEXTURE_2D_ARRAY,0,m,t.width,t.height,t.depth,0,r,p,t.data)}else if(o.isData3DTexture)_?(x&&n.texStorage3D(e.TEXTURE_3D,E,m,t.width,t.height,t.depth),T&&n.texSubImage3D(e.TEXTURE_3D,0,0,0,0,t.width,t.height,t.depth,r,p,t.data)):n.texImage3D(e.TEXTURE_3D,0,m,t.width,t.height,t.depth,0,r,p,t.data);else if(o.isFramebufferTexture){if(x){if(_)n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height);else{let i=t.width,a=t.height;for(let t=0;t<E;t++)n.texImage2D(e.TEXTURE_2D,t,m,i,a,0,r,p,null),i>>=1,a>>=1}}}else if(o.isHTMLTexture){if(`texElementImage2D`in e){let n=e.canvas;if(n.hasAttribute(`layoutsubtree`)||n.setAttribute(`layoutsubtree`,`true`),t.parentNode!==n){n.appendChild(t),d.add(o),n.onpaint=e=>{let t=e.changedElements;for(let e of d)t.includes(e.image)&&(e.needsUpdate=!0)},n.requestPaint();return}if(e.texElementImage2D.length===3)e.texElementImage2D(e.TEXTURE_2D,e.RGBA8,t);else{let n=e.RGBA,r=e.RGBA,i=e.UNSIGNED_BYTE;e.texElementImage2D(e.TEXTURE_2D,0,n,r,i,t)}e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE)}}else if(g.length>0){if(_&&x){let t=Ee(g[0]);n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height)}for(let t=0,i=g.length;t<i;t++)h=g[t],_?T&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,r,p,h):n.texImage2D(e.TEXTURE_2D,t,m,r,p,h);o.generateMipmaps=!1}else if(_){if(x){let r=Ee(t);n.texStorage2D(e.TEXTURE_2D,E,m,r.width,r.height)}T&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,r,p,t)}else n.texImage2D(e.TEXTURE_2D,0,m,r,p,t);y(o)&&o.mipmapsAutoUpdate===!0&&b(c),f.__version=u.version,o.onUpdate&&o.onUpdate(o)}t.__version=o.version}function _e(t,o,s){if(o.image.length!==6)return;let c=pe(t,o),l=o.source;n.bindTexture(e.TEXTURE_CUBE_MAP,t.__webglTexture,e.TEXTURE0+s);let u=r.get(l);if(l.version!==u.__version||c===!0){n.activeTexture(e.TEXTURE0+s);let t=Ho.getPrimaries(Ho.workingColorSpace),r=o.colorSpace===``?null:Ho.getPrimaries(o.colorSpace),d=o.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),n.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,d);let f=o.isCompressedTexture||o.image[0].isCompressedTexture,p=o.image[0]&&o.image[0].isDataTexture,m=[];for(let e=0;e<6;e++)!f&&!p?m[e]=v(o.image[e],!0,i.maxCubemapSize):m[e]=p?o.image[e].image:o.image[e],m[e]=B(o,m[e]);let h=m[0],g=a.convert(o.format,o.colorSpace),_=a.convert(o.type),x=S(o.internalFormat,g,_,o.normalized,o.colorSpace),T=o.isVideoTexture!==!0,E=u.__version===void 0||c===!0,D=l.dataReady,O=w(o,h);F(e.TEXTURE_CUBE_MAP,o);let k;if(o.isDepthTexture){if(x=C(o.format===oa,o.type),E){if(T)n.texStorage2D(e.TEXTURE_CUBE_MAP,1,x,h.width,h.height);else for(let t=0;t<6;t++)n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,x,h.width,h.height,0,g,_,null)}}else if(f){T&&E&&n.texStorage2D(e.TEXTURE_CUBE_MAP,O,x,h.width,h.height);for(let t=0;t<6;t++){k=m[t].mipmaps;for(let r=0;r<k.length;r++){let i=k[r];o.format===1023?T?D&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,g,_,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,x,i.width,i.height,0,g,_,i.data):g===null?W(`WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()`):T?D&&n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,g,i.data):n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,x,i.width,i.height,0,i.data)}}}else{if(k=o.mipmaps,T&&E){k.length>0&&O++;let t=Ee(m[0]);n.texStorage2D(e.TEXTURE_CUBE_MAP,O,x,t.width,t.height)}for(let t=0;t<6;t++)if(p){T?D&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,m[t].width,m[t].height,g,_,m[t].data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,x,m[t].width,m[t].height,0,g,_,m[t].data);for(let r=0;r<k.length;r++){let i=k[r].image[t].image;T?D&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,i.width,i.height,g,_,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,x,i.width,i.height,0,g,_,i.data)}}else{T?D&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,g,_,m[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,x,g,_,m[t]);for(let r=0;r<k.length;r++){let i=k[r];T?D&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,g,_,i.image[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,x,g,_,i.image[t])}}}y(o)&&o.mipmapsAutoUpdate===!0&&b(e.TEXTURE_CUBE_MAP),u.__version=l.version,o.onUpdate&&o.onUpdate(o)}t.__version=o.version}function ve(t,i,o,c,l,u){let d=a.convert(o.format,o.colorSpace),f=a.convert(o.type),p=S(o.internalFormat,d,f,o.normalized,o.colorSpace),m=r.get(i),h=r.get(o);if(h.__renderTarget=i,!m.__hasExternalTextures){let t=Math.max(1,i.width>>u),r=Math.max(1,i.height>>u);l===e.TEXTURE_3D||l===e.TEXTURE_2D_ARRAY?n.texImage3D(l,u,p,t,r,i.depth,0,d,f,null):n.texImage2D(l,u,p,t,r,0,d,f,null)}n.bindFramebuffer(e.FRAMEBUFFER,t),Te(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,c,l,h.__webglTexture,0,R(i)):(l===e.TEXTURE_2D||l>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&l<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,c,l,h.__webglTexture,u),n.bindFramebuffer(e.FRAMEBUFFER,null)}function ye(t,n,r){if(e.bindRenderbuffer(e.RENDERBUFFER,t),n.depthBuffer){let i=n.depthTexture,a=i&&i.isDepthTexture?i.type:null,o=C(n.stencilBuffer,a),c=n.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;Te(n)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,R(n),o,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,R(n),o,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,o,n.width,n.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,c,e.RENDERBUFFER,t)}else{let t=n.textures;for(let i=0;i<t.length;i++){let o=t[i],c=a.convert(o.format,o.colorSpace),l=a.convert(o.type),u=S(o.internalFormat,c,l,o.normalized,o.colorSpace);Te(n)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,R(n),u,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,R(n),u,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,u,n.width,n.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function be(t,i,a){let o=i.isWebGLCubeRenderTarget===!0;if(n.bindFramebuffer(e.FRAMEBUFFER,t),!(i.depthTexture&&i.depthTexture.isDepthTexture))throw Error(`THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.`);let c=r.get(i.depthTexture);c.__renderTarget=i;let l=o?i.depthTexture.image[0]:i.depthTexture.image;c.__webglTexture&&l.width===i.width&&l.height===i.height||(l.width=i.width,l.height=i.height,i.depthTexture.needsUpdate=!0),o?le(i.depthTexture,0):oe(i.depthTexture,0);let u=c.__webglTexture,d=R(i),f=o?e.TEXTURE_CUBE_MAP_POSITIVE_X+a:e.TEXTURE_2D,p=i.depthTexture.format===1027?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;if(i.depthTexture.format===1026)Te(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else if(i.depthTexture.format===1027)Te(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else throw Error(`THREE.WebGLTextures: Unknown depthTexture format.`)}function xe(t){let i=r.get(t),a=t.isWebGLCubeRenderTarget===!0;if(i.__boundDepthTexture!==t.depthTexture){let e=t.depthTexture;if(i.__depthDisposeCallback&&i.__depthDisposeCallback(),e){let t=()=>{delete i.__boundDepthTexture,delete i.__depthDisposeCallback,e.removeEventListener(`dispose`,t)};e.addEventListener(`dispose`,t),i.__depthDisposeCallback=t}i.__boundDepthTexture=e}if(t.depthTexture&&!i.__autoAllocateDepthBuffer){if(a)for(let e=0;e<6;e++)be(i.__webglFramebuffer[e],t,e);else t.texture.mipmaps.length>0?be(i.__webglFramebuffer[0],t,0):be(i.__webglFramebuffer,t,0)}else if(a){i.__webglDepthbuffer=[];for(let r=0;r<6;r++)if(n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[r]),i.__webglDepthbuffer[r]===void 0)i.__webglDepthbuffer[r]=e.createRenderbuffer(),ye(i.__webglDepthbuffer[r],t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,a=i.__webglDepthbuffer[r];e.bindRenderbuffer(e.RENDERBUFFER,a),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,a)}}else if(t.texture.mipmaps.length>0?n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[0]):n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer),i.__webglDepthbuffer===void 0)i.__webglDepthbuffer=e.createRenderbuffer(),ye(i.__webglDepthbuffer,t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,r=i.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,r),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,r)}n.bindFramebuffer(e.FRAMEBUFFER,null)}function Se(t,n,i){let a=r.get(t);n!==void 0&&ve(a.__webglFramebuffer,t,t.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),i!==void 0&&xe(t)}function I(t){let i=t.texture,s=r.get(t),c=r.get(i);t.addEventListener(`dispose`,O),T(t);let l=t.textures,u=t.isWebGLCubeRenderTarget===!0,d=l.length>1;if(d||(c.__webglTexture===void 0&&(c.__webglTexture=e.createTexture()),c.__version=i.version,o.memory.textures++),u){s.__webglFramebuffer=[];for(let t=0;t<6;t++)if(i.mipmaps.length>0){s.__webglFramebuffer[t]=[];for(let n=0;n<i.mipmaps.length;n++)s.__webglFramebuffer[t][n]=e.createFramebuffer()}else s.__webglFramebuffer[t]=e.createFramebuffer()}else{if(i.mipmaps.length>0){s.__webglFramebuffer=[];for(let t=0;t<i.mipmaps.length;t++)s.__webglFramebuffer[t]=e.createFramebuffer()}else s.__webglFramebuffer=e.createFramebuffer();if(d)for(let t=0,n=l.length;t<n;t++){let n=r.get(l[t]);n.__webglTexture===void 0&&(n.__webglTexture=e.createTexture(),o.memory.textures++)}if(t.samples>0&&Te(t)===!1){s.__webglMultisampledFramebuffer=e.createFramebuffer(),s.__webglColorRenderbuffer=[],n.bindFramebuffer(e.FRAMEBUFFER,s.__webglMultisampledFramebuffer);for(let n=0;n<l.length;n++){let r=l[n];s.__webglColorRenderbuffer[n]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,s.__webglColorRenderbuffer[n]);let i=a.convert(r.format,r.colorSpace),o=a.convert(r.type),c=S(r.internalFormat,i,o,r.normalized,r.colorSpace,t.isXRRenderTarget===!0),u=R(t);e.renderbufferStorageMultisample(e.RENDERBUFFER,u,c,t.width,t.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+n,e.RENDERBUFFER,s.__webglColorRenderbuffer[n])}e.bindRenderbuffer(e.RENDERBUFFER,null),t.depthBuffer&&(s.__webglDepthRenderbuffer=e.createRenderbuffer(),ye(s.__webglDepthRenderbuffer,t,!0)),n.bindFramebuffer(e.FRAMEBUFFER,null)}}if(u){n.bindTexture(e.TEXTURE_CUBE_MAP,c.__webglTexture),F(e.TEXTURE_CUBE_MAP,i);for(let n=0;n<6;n++)if(i.mipmaps.length>0)for(let r=0;r<i.mipmaps.length;r++)ve(s.__webglFramebuffer[n][r],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,r);else ve(s.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0);y(i)?b(e.TEXTURE_CUBE_MAP):i.mipmaps.length>0&&e.texParameteri(e.TEXTURE_CUBE_MAP,e.TEXTURE_MAX_LEVEL,i.mipmaps.length-1),n.unbindTexture()}else if(d){for(let i=0,a=l.length;i<a;i++){let a=l[i],o=r.get(a),c=e.TEXTURE_2D;(t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(c=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(c,o.__webglTexture),F(c,a),ve(s.__webglFramebuffer,t,a,e.COLOR_ATTACHMENT0+i,c,0),y(a)&&b(c)}n.unbindTexture()}else{let r=e.TEXTURE_2D;if((t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(r=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(r,c.__webglTexture),F(r,i),i.mipmaps.length>0)for(let n=0;n<i.mipmaps.length;n++)ve(s.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,r,n);else ve(s.__webglFramebuffer,t,i,e.COLOR_ATTACHMENT0,r,0);y(i)?b(r):i.mipmaps.length>0&&e.texParameteri(r,e.TEXTURE_MAX_LEVEL,i.mipmaps.length-1),n.unbindTexture()}t.depthBuffer&&xe(t)}function Ce(e){let t=e.textures;for(let i=0,a=t.length;i<a;i++){let a=t[i];if(y(a)&&a.mipmapsAutoUpdate===!0){let t=x(e),i=r.get(a).__webglTexture;n.bindTexture(t,i),b(t),n.unbindTexture()}}}let L=[];function we(t){if(t.samples>0){if(Te(t)===!1){let i=t.textures,a=t.width,o=t.height,s=e.COLOR_BUFFER_BIT,l=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,u=r.get(t),d=i.length>1;if(d)for(let t=0;t<i.length;t++)n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,null),n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,null,0);n.bindFramebuffer(e.READ_FRAMEBUFFER,u.__webglMultisampledFramebuffer),t.texture.mipmaps.length>0?n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer[0]):n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer);for(let n=0;n<i.length;n++){if(t.resolveDepthBuffer&&(t.depthBuffer&&(s|=e.DEPTH_BUFFER_BIT),t.stencilBuffer&&t.resolveStencilBuffer&&(s|=e.STENCIL_BUFFER_BIT)),d){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,u.__webglColorRenderbuffer[n]);let t=r.get(i[n]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0)}e.blitFramebuffer(0,0,a,o,0,0,a,o,s,e.NEAREST),c===!0&&(L.length=0,L.push(e.COLOR_ATTACHMENT0+n),t.depthBuffer&&t.storeMultisampledDepthBuffer===!1&&L.push(l),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,L))}if(n.bindFramebuffer(e.READ_FRAMEBUFFER,null),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),d)for(let t=0;t<i.length;t++){n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,u.__webglColorRenderbuffer[t]);let a=r.get(i[t]).__webglTexture;n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,a,0)}n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglMultisampledFramebuffer)}else if(t.depthBuffer&&t.storeMultisampledDepthBuffer===!1&&c){let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[n])}}}function R(e){return Math.min(i.maxSamples,e.samples)}function Te(e){let n=r.get(e);return e.samples>0&&t.has(`WEBGL_multisampled_render_to_texture`)===!0&&n.__useRenderToTexture!==!1}function z(e){let t=o.render.frame;u.get(e)!==t&&(u.set(e,t),e.update())}function B(e,t){let n=e.colorSpace,r=e.format,i=e.type;return e.isCompressedTexture===!0||e.isVideoTexture===!0||n!==`srgb-linear`&&n!==``&&(Ho.getTransfer(n)===`srgb`?(r!==1023||i!==1009)&&W(`WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.`):G(`WebGLTextures: Unsupported texture color space:`,n)),t}function Ee(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?(l.width=e.naturalWidth||e.width,l.height=e.naturalHeight||e.height):typeof VideoFrame<`u`&&e instanceof VideoFrame?(l.width=e.displayWidth,l.height=e.displayHeight):(l.width=e.width,l.height=e.height),l}this.allocateTextureUnit=ie,this.resetTextureUnits=te,this.getTextureUnits=ne,this.setTextureUnits=re,this.setTexture2D=oe,this.setTexture2DArray=se,this.setTexture3D=ce,this.setTextureCube=le,this.rebindTextures=Se,this.setupRenderTarget=I,this.updateRenderTargetMipmap=Ce,this.updateMultisampleRenderTarget=we,this.setupDepthRenderbuffer=xe,this.setupFrameBufferTexture=ve,this.useMultisampledRTT=Te,this.dispose=j}function Hh(e,t){function n(n,r=``){let i,a=Ho.getTransfer(r);if(n===1009)return e.UNSIGNED_BYTE;if(n===1017)return e.UNSIGNED_SHORT_4_4_4_4;if(n===1018)return e.UNSIGNED_SHORT_5_5_5_1;if(n===35902)return e.UNSIGNED_INT_5_9_9_9_REV;if(n===35899)return e.UNSIGNED_INT_10F_11F_11F_REV;if(n===1010)return e.BYTE;if(n===1011)return e.SHORT;if(n===1012)return e.UNSIGNED_SHORT;if(n===1013)return e.INT;if(n===1014)return e.UNSIGNED_INT;if(n===1015)return e.FLOAT;if(n===1016)return e.HALF_FLOAT;if(n===1021)return e.ALPHA;if(n===1022)return e.RGB;if(n===1023)return e.RGBA;if(n===1026)return e.DEPTH_COMPONENT;if(n===1027)return e.DEPTH_STENCIL;if(n===1028)return e.RED;if(n===1029)return e.RED_INTEGER;if(n===1030)return e.RG;if(n===1031)return e.RG_INTEGER;if(n===1033)return e.RGBA_INTEGER;if(n===33776||n===33777||n===33778||n===33779){if(a===`srgb`){if(i=t.get(`WEBGL_compressed_texture_s3tc_srgb`),i!==null){if(n===33776)return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null}else if(i=t.get(`WEBGL_compressed_texture_s3tc`),i!==null){if(n===33776)return i.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null}if(n===35840||n===35841||n===35842||n===35843){if(i=t.get(`WEBGL_compressed_texture_pvrtc`),i!==null){if(n===35840)return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===35841)return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===35842)return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===35843)return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null}if(n===36196||n===37492||n===37496||n===37488||n===37489||n===37490||n===37491){if(i=t.get(`WEBGL_compressed_texture_etc`),i!==null){if(n===36196||n===37492)return a===`srgb`?i.COMPRESSED_SRGB8_ETC2:i.COMPRESSED_RGB8_ETC2;if(n===37496)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:i.COMPRESSED_RGBA8_ETC2_EAC;if(n===37488)return i.COMPRESSED_R11_EAC;if(n===37489)return i.COMPRESSED_SIGNED_R11_EAC;if(n===37490)return i.COMPRESSED_RG11_EAC;if(n===37491)return i.COMPRESSED_SIGNED_RG11_EAC}else return null}if(n===37808||n===37809||n===37810||n===37811||n===37812||n===37813||n===37814||n===37815||n===37816||n===37817||n===37818||n===37819||n===37820||n===37821){if(i=t.get(`WEBGL_compressed_texture_astc`),i!==null){if(n===37808)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:i.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===37809)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:i.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===37810)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:i.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===37811)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:i.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===37812)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:i.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===37813)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:i.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===37814)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:i.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===37815)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:i.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===37816)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:i.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===37817)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:i.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===37818)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:i.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===37819)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:i.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===37820)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:i.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===37821)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:i.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null}if(n===36492||n===36494||n===36495){if(i=t.get(`EXT_texture_compression_bptc`),i!==null){if(n===36492)return a===`srgb`?i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:i.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===36494)return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===36495)return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null}if(n===36283||n===36284||n===36285||n===36286){if(i=t.get(`EXT_texture_compression_rgtc`),i!==null){if(n===36283)return i.COMPRESSED_RED_RGTC1_EXT;if(n===36284)return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===36285)return i.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===36286)return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null}return n===1020?e.UNSIGNED_INT_24_8:e[n]===void 0?null:e[n]}return{convert:n}}var Uh=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Wh=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,Gh=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new Jl(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new jd({vertexShader:Uh,fragmentShader:Wh,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new al(new _d(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Kh=class extends So{constructor(e,t){super();let n=this,r=null,i=1,a=null,o=`local-floor`,s=1,c=null,l=null,u=null,d=null,f=null,p=null,m=typeof XRWebGLBinding<`u`,h=new Gh,g={},_=t.getContextAttributes(),v=null,y=null,b=[],x=[],S=new K,C=null,w=null,T=new vf;T.viewport=new $o;let E=new vf;E.viewport=new $o;let D=[T,E],O=new Df,k=null,A=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(e){let t=b[e];return t===void 0&&(t=new Ps,b[e]=t),t.getTargetRaySpace()},this.getControllerGrip=function(e){let t=b[e];return t===void 0&&(t=new Ps,b[e]=t),t.getGripSpace()},this.getHand=function(e){let t=b[e];return t===void 0&&(t=new Ps,b[e]=t),t.getHandSpace()};function j(e){let t=x.indexOf(e.inputSource);if(t===-1)return;let n=b[t];n!==void 0&&(n.update(e.inputSource,e.frame,c||a),n.dispatchEvent({type:e.type,data:e.inputSource}))}function ee(){r.removeEventListener(`select`,j),r.removeEventListener(`selectstart`,j),r.removeEventListener(`selectend`,j),r.removeEventListener(`squeeze`,j),r.removeEventListener(`squeezestart`,j),r.removeEventListener(`squeezeend`,j),r.removeEventListener(`end`,ee),r.removeEventListener(`inputsourceschange`,M);for(let e=0;e<b.length;e++){let t=x[e];t!==null&&(x[e]=null,b[e].disconnect(t))}k=null,A=null,h.reset();for(let e in g)delete g[e];if(e.setRenderTarget(v),f=null,d=null,u=null,r=null,y=null,re.stop(),n.isPresenting=!1,e.setPixelRatio(C),e.setSize(S.width,S.height,!1),w!==null){let e=w.camera;e.fov=w.fov,e.zoom=w.zoom,e.updateProjectionMatrix(),w=null}n.dispatchEvent({type:`sessionend`})}this.setFramebufferScaleFactor=function(e){i=e,n.isPresenting===!0&&W(`WebXRManager: Cannot change framebuffer scale while presenting.`)},this.setReferenceSpaceType=function(e){o=e,n.isPresenting===!0&&W(`WebXRManager: Cannot change reference space type while presenting.`)},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(e){c=e},this.getBaseLayer=function(){return d===null?f:d},this.getBinding=function(){return u===null&&m&&(u=new XRWebGLBinding(r,t)),u},this.getFrame=function(){return p},this.getSession=function(){return r},this.setSession=async function(l){if(r=l,r!==null){if(v=e.getRenderTarget(),r.addEventListener(`select`,j),r.addEventListener(`selectstart`,j),r.addEventListener(`selectend`,j),r.addEventListener(`squeeze`,j),r.addEventListener(`squeezestart`,j),r.addEventListener(`squeezeend`,j),r.addEventListener(`end`,ee),r.addEventListener(`inputsourceschange`,M),_.xrCompatible!==!0&&await t.makeXRCompatible(),C=e.getPixelRatio(),e.getSize(S),m&&`createProjectionLayer`in XRWebGLBinding.prototype){let n=null,a=null,o=null;_.depth&&(o=_.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,n=_.stencil?oa:aa,a=_.stencil?$i:Ji);let s={colorFormat:t.RGBA8,depthFormat:o,scaleFactor:i};u=this.getBinding(),d=u.createProjectionLayer(s),r.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),y=new ts(d.textureWidth,d.textureHeight,{format:ia,type:Ui,depthTexture:new Kl(d.textureWidth,d.textureHeight,a,void 0,void 0,void 0,void 0,void 0,void 0,n),stencilBuffer:_.stencil,colorSpace:e.outputColorSpace,samples:_.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1,storeMultisampledDepthBuffer:d.ignoreDepthValues===!1,storeMultisampledStencilBuffer:d.ignoreDepthValues===!1})}else{let n={antialias:_.antialias,alpha:!0,depth:_.depth,stencil:_.stencil,framebufferScaleFactor:i};f=new XRWebGLLayer(r,t,n),r.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),y=new ts(f.framebufferWidth,f.framebufferHeight,{format:ia,type:Ui,colorSpace:e.outputColorSpace,stencilBuffer:_.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(s),c=null,a=await r.requestReferenceSpace(o),re.setContext(r),re.start(),n.isPresenting=!0,n.dispatchEvent({type:`sessionstart`})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return h.getDepthTexture()};function M(e){for(let t=0;t<e.removed.length;t++){let n=e.removed[t],r=x.indexOf(n);r>=0&&(x[r]=null,b[r].disconnect(n))}for(let t=0;t<e.added.length;t++){let n=e.added[t],r=x.indexOf(n);if(r===-1){for(let e=0;e<b.length;e++)if(e>=x.length){x.push(n),r=e;break}else if(x[e]===null){x[e]=n,r=e;break}if(r===-1)break}let i=b[r];i&&i.connect(n)}}function N(e,t){t===null?e.matrixWorld.copy(e.matrix):e.matrixWorld.multiplyMatrices(t.matrixWorld,e.matrix),e.matrixWorldInverse.copy(e.matrixWorld).invert()}this.updateCamera=function(e){if(r===null)return;let t=e.near,n=e.far;h.texture!==null&&(h.depthNear>0&&(t=h.depthNear),h.depthFar>0&&(n=h.depthFar)),O.near=E.near=T.near=t,O.far=E.far=T.far=n,(k!==O.near||A!==O.far)&&(r.updateRenderState({depthNear:O.near,depthFar:O.far}),k=O.near,A=O.far),O.layers.mask=e.layers.mask|6,T.layers.mask=O.layers.mask&-5,E.layers.mask=O.layers.mask&-3;let i=e.parent,a=O.cameras;N(O,i);for(let e=0;e<a.length;e++)N(a[e],i);O.projectionMatrix.copy(T.projectionMatrix),O.projectionMatrixInverse.copy(T.projectionMatrixInverse),w===null&&e.isPerspectiveCamera&&(w={camera:e,fov:e.fov,zoom:e.zoom}),P(e,O,i)};function P(e,t,n){n===null?e.matrix.copy(t.matrixWorld):(e.matrix.copy(n.matrixWorld),e.matrix.invert(),e.matrix.multiply(t.matrixWorld)),e.matrix.decompose(e.position,e.quaternion,e.scale),e.updateMatrixWorld(!0),e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse),e.isPerspectiveCamera&&(e.fov=To*2*Math.atan(1/e.projectionMatrix.elements[5]),e.zoom=1)}this.getCamera=function(){return O},this.getFoveation=function(){if(d!==null||f!==null)return s},this.setFoveation=function(e){s=e,d!==null&&(d.fixedFoveation=e),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=e)},this.hasDepthSensing=function(){return h.texture!==null},this.getDepthSensingMesh=function(){return h.getMesh(O)},this.getCameraTexture=function(e){return g[e]};let te=null;function ne(t,i){if(l=i.getViewerPose(c||a),p=i,l!==null){let t=l.views;f!==null&&(e.setRenderTargetFramebuffer(y,f.framebuffer),e.setRenderTarget(y));let i=!1;t.length!==O.cameras.length&&(O.cameras.length=0,i=!0);for(let n=0;n<t.length;n++){let r=t[n],a=null;if(f!==null)a=f.getViewport(r);else{let t=u.getViewSubImage(d,r);a=t.viewport,n===0&&(e.setRenderTargetTextures(y,t.colorTexture,t.depthStencilTexture),e.setRenderTarget(y))}let o=D[n];o===void 0&&(o=new vf,o.layers.enable(n),o.viewport=new $o,D[n]=o),o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.projectionMatrix.fromArray(r.projectionMatrix),o.projectionMatrixInverse.copy(o.projectionMatrix).invert(),o.viewport.set(a.x,a.y,a.width,a.height),n===0&&(O.matrix.copy(o.matrix),O.matrix.decompose(O.position,O.quaternion,O.scale)),i===!0&&O.cameras.push(o)}let a=r.enabledFeatures;if(a&&a.includes(`depth-sensing`)&&r.depthUsage==`gpu-optimized`&&m){u=n.getBinding();let e=u.getDepthInformation(t[0]);e&&e.isValid&&e.texture&&h.init(e,r.renderState)}if(a&&a.includes(`camera-access`)&&m){e.state.unbindTexture(),u=n.getBinding();for(let e=0;e<t.length;e++){let n=t[e].camera;if(n){let e=g[n];e||(e=new Jl,g[n]=e);let t=u.getCameraImage(n);e.sourceTexture=t}}}}for(let e=0;e<b.length;e++){let t=x[e],n=b[e];t!==null&&n!==void 0&&n.update(t,i,c||a)}te&&te(t,i),i.detectedPlanes&&n.dispatchEvent({type:`planesdetected`,data:i}),p=null}let re=new Wf;re.setAnimationLoop(ne),this.setAnimationLoop=function(e){te=e},this.dispose=function(){}}},qh=new is,Jh=new Lo;Jh.set(-1,0,0,0,1,0,0,0,1);function Yh(e,t){function n(e,t){e.matrixAutoUpdate===!0&&e.updateMatrix(),t.value.copy(e.matrix)}function r(t,n){n.color.getRGB(t.fogColor.value,Dd(e)),n.isFog?(t.fogNear.value=n.near,t.fogFar.value=n.far):n.isFogExp2&&(t.fogDensity.value=n.density)}function i(e,t,n,r,i){t.isNodeMaterial?t.uniformsNeedUpdate=!1:t.isMeshBasicMaterial?a(e,t):t.isMeshLambertMaterial?(a(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshToonMaterial?(a(e,t),d(e,t)):t.isMeshPhongMaterial?(a(e,t),u(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshStandardMaterial?(a(e,t),f(e,t),t.isMeshPhysicalMaterial&&p(e,t,i)):t.isMeshMatcapMaterial?(a(e,t),m(e,t)):t.isMeshDepthMaterial?a(e,t):t.isMeshDistanceMaterial?(a(e,t),h(e,t)):t.isMeshNormalMaterial?a(e,t):t.isLineBasicMaterial?(o(e,t),t.isLineDashedMaterial&&s(e,t)):t.isPointsMaterial?c(e,t,n,r):t.isSpriteMaterial?l(e,t):t.isShadowMaterial?(e.color.value.copy(t.color),e.opacity.value=t.opacity):t.isShaderMaterial&&(t.uniformsNeedUpdate=!1)}function a(e,r){e.opacity.value=r.opacity,r.color&&e.diffuse.value.copy(r.color),r.emissive&&e.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(e.map.value=r.map,n(r.map,e.mapTransform)),r.alphaMap&&(e.alphaMap.value=r.alphaMap,n(r.alphaMap,e.alphaMapTransform)),r.bumpMap&&(e.bumpMap.value=r.bumpMap,n(r.bumpMap,e.bumpMapTransform),e.bumpScale.value=r.bumpScale,r.side===1&&(e.bumpScale.value*=-1)),r.normalMap&&(e.normalMap.value=r.normalMap,n(r.normalMap,e.normalMapTransform),e.normalScale.value.copy(r.normalScale),r.side===1&&e.normalScale.value.negate()),r.displacementMap&&(e.displacementMap.value=r.displacementMap,n(r.displacementMap,e.displacementMapTransform),e.displacementScale.value=r.displacementScale,e.displacementBias.value=r.displacementBias),r.emissiveMap&&(e.emissiveMap.value=r.emissiveMap,n(r.emissiveMap,e.emissiveMapTransform)),r.specularMap&&(e.specularMap.value=r.specularMap,n(r.specularMap,e.specularMapTransform)),r.alphaTest>0&&(e.alphaTest.value=r.alphaTest);let i=t.get(r),a=i.envMap,o=i.envMapRotation;a&&(e.envMap.value=a,e.envMapRotation.value.setFromMatrix4(qh.makeRotationFromEuler(o)).transpose(),a.isCubeTexture&&a.isRenderTargetTexture===!1&&e.envMapRotation.value.premultiply(Jh),e.reflectivity.value=r.reflectivity,e.ior.value=r.ior,e.refractionRatio.value=r.refractionRatio),r.lightMap&&(e.lightMap.value=r.lightMap,e.lightMapIntensity.value=r.lightMapIntensity,n(r.lightMap,e.lightMapTransform)),r.aoMap&&(e.aoMap.value=r.aoMap,e.aoMapIntensity.value=r.aoMapIntensity,n(r.aoMap,e.aoMapTransform))}function o(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform))}function s(e,t){e.dashSize.value=t.dashSize,e.totalSize.value=t.dashSize+t.gapSize,e.scale.value=t.scale}function c(e,t,r,i){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.size.value=t.size*r,e.scale.value=i*.5,t.map&&(e.map.value=t.map,n(t.map,e.uvTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function l(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.rotation.value=t.rotation,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function u(e,t){e.specular.value.copy(t.specular),e.shininess.value=Math.max(t.shininess,1e-4)}function d(e,t){t.gradientMap&&(e.gradientMap.value=t.gradientMap)}function f(e,t){e.metalness.value=t.metalness,t.metalnessMap&&(e.metalnessMap.value=t.metalnessMap,n(t.metalnessMap,e.metalnessMapTransform)),e.roughness.value=t.roughness,t.roughnessMap&&(e.roughnessMap.value=t.roughnessMap,n(t.roughnessMap,e.roughnessMapTransform)),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)}function p(e,t,r){e.ior.value=t.ior,t.diffuseRoughness>0&&(e.diffuseRoughness.value=t.diffuseRoughness,t.diffuseRoughnessMap&&(e.diffuseRoughnessMap.value=t.diffuseRoughnessMap,n(t.diffuseRoughnessMap,e.diffuseRoughnessMapTransform))),t.sheen>0&&(e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen),e.sheenRoughness.value=t.sheenRoughness,t.sheenColorMap&&(e.sheenColorMap.value=t.sheenColorMap,n(t.sheenColorMap,e.sheenColorMapTransform)),t.sheenRoughnessMap&&(e.sheenRoughnessMap.value=t.sheenRoughnessMap,n(t.sheenRoughnessMap,e.sheenRoughnessMapTransform))),t.clearcoat>0&&(e.clearcoat.value=t.clearcoat,e.clearcoatRoughness.value=t.clearcoatRoughness,t.clearcoatMap&&(e.clearcoatMap.value=t.clearcoatMap,n(t.clearcoatMap,e.clearcoatMapTransform)),t.clearcoatRoughnessMap&&(e.clearcoatRoughnessMap.value=t.clearcoatRoughnessMap,n(t.clearcoatRoughnessMap,e.clearcoatRoughnessMapTransform)),t.clearcoatNormalMap&&(e.clearcoatNormalMap.value=t.clearcoatNormalMap,n(t.clearcoatNormalMap,e.clearcoatNormalMapTransform),e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale),t.side===1&&e.clearcoatNormalScale.value.negate())),t.dispersion>0&&(e.dispersion.value=t.dispersion),t.retroreflectivity>0&&(e.retroreflectivity.value=t.retroreflectivity),t.iridescence>0&&(e.iridescence.value=t.iridescence,e.iridescenceIOR.value=t.iridescenceIOR,e.iridescenceThicknessMinimum.value=t.iridescenceThicknessMinimum,e.iridescenceThicknessMaximum.value=t.iridescenceThicknessMaximum,t.iridescenceMap&&(e.iridescenceMap.value=t.iridescenceMap,n(t.iridescenceMap,e.iridescenceMapTransform)),t.iridescenceThicknessMap&&(e.iridescenceThicknessMap.value=t.iridescenceThicknessMap,n(t.iridescenceThicknessMap,e.iridescenceThicknessMapTransform))),t.transmission>0&&(e.transmission.value=t.transmission,e.transmissionSamplerMap.value=r.texture,e.transmissionSamplerSize.value.set(r.width,r.height),t.transmissionMap&&(e.transmissionMap.value=t.transmissionMap,n(t.transmissionMap,e.transmissionMapTransform)),e.thickness.value=t.thickness,t.thicknessMap&&(e.thicknessMap.value=t.thicknessMap,n(t.thicknessMap,e.thicknessMapTransform)),e.attenuationDistance.value=t.attenuationDistance,e.attenuationColor.value.copy(t.attenuationColor)),t.anisotropy>0&&(e.anisotropyVector.value.set(t.anisotropy*Math.cos(t.anisotropyRotation),t.anisotropy*Math.sin(t.anisotropyRotation)),t.anisotropyMap&&(e.anisotropyMap.value=t.anisotropyMap,n(t.anisotropyMap,e.anisotropyMapTransform))),e.specularIntensity.value=t.specularIntensity,e.specularColor.value.copy(t.specularColor),t.specularColorMap&&(e.specularColorMap.value=t.specularColorMap,n(t.specularColorMap,e.specularColorMapTransform)),t.specularIntensityMap&&(e.specularIntensityMap.value=t.specularIntensityMap,n(t.specularIntensityMap,e.specularIntensityMapTransform))}function m(e,t){t.matcap&&(e.matcap.value=t.matcap)}function h(e,n){let r=t.get(n).light;e.referencePosition.value.setFromMatrixPosition(r.matrixWorld),e.nearDistance.value=r.shadow.camera.near,e.farDistance.value=r.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:i}}function Xh(e,t,n,r){let i={},a={};function o(e,t){let n=t.program;r.uniformBlockBinding(e,n,i[e.id])}function s(e,n){let o=i[e.id];o===void 0&&(m(e),o=c(e),i[e.id]=o,e.addEventListener(`dispose`,g));let s=n.program;r.updateUBOMapping(e,s);let u=t.render.frame;a[e.id]!==u&&(l(e),a[e.id]=u)}function c(t){let n=e.createBuffer(),r=t.__size,i=t.usage;return e.bindBuffer(e.UNIFORM_BUFFER,n),e.bufferData(e.UNIFORM_BUFFER,r,i),e.bindBuffer(e.UNIFORM_BUFFER,null),n}function l(t){let n=i[t.id],r=t.uniforms,a=t.__cache;e.bindBuffer(e.UNIFORM_BUFFER,n);for(let e=0,t=r.length;e<t;e++){let t=r[e];if(Array.isArray(t))for(let n=0,r=t.length;n<r;n++)u(t[n],e,n,a);else u(t,e,0,a)}e.bindBuffer(e.UNIFORM_BUFFER,null)}function u(t,n,r,i){if(f(t,n,r,i)===!0){let n=t.__offset,r=t.value;if(Array.isArray(r)){let e=0;for(let n=0;n<r.length;n++){let i=r[n],a=h(i,!0);d(i,t.__data,e),e+=a.storage/Float32Array.BYTES_PER_ELEMENT}}else d(r,t.__data,0);e.bufferSubData(e.UNIFORM_BUFFER,n,t.__data)}}function d(e,t,n){typeof e==`number`||typeof e==`boolean`?t[n]=e:e.isMatrix3?(t[n]=e.elements[0],t[n+1]=e.elements[1],t[n+2]=e.elements[2],t[n+3]=0,t[n+4]=e.elements[3],t[n+5]=e.elements[4],t[n+6]=e.elements[5],t[n+7]=0,t[n+8]=e.elements[6],t[n+9]=e.elements[7],t[n+10]=e.elements[8],t[n+11]=0):ArrayBuffer.isView(e)?t.set(e.subarray(0,t.length-n),n):e.toArray(t,n)}function f(e,t,n,r){let i=e.value,a=t+`_`+n;if(Array.isArray(i)){r[a]===void 0&&(r[a]=[]);let e=r[a],t=!1;for(let n=0;n<i.length;n++)p(i[n],e,n)===!0&&(t=!0);return t}return p(i,r,a)}function p(e,t,n){if(t[n]===void 0)return t[n]=typeof e==`number`||typeof e==`boolean`?e:ArrayBuffer.isView(e)?e.slice():e.clone(),!0;{let r=t[n];if(typeof e==`number`||typeof e==`boolean`){if(r!==e)return t[n]=e,!0}else if(ArrayBuffer.isView(e))return!0;else if(r.equals(e)===!1)return r.copy(e),!0}return!1}function m(e){let t=e.uniforms,n=0;for(let e=0,r=t.length;e<r;e++){let r=Array.isArray(t[e])?t[e]:[t[e]];for(let i=0,a=r.length;i<a;i++){let a=r[i],o=Array.isArray(a.value)?a.value:[a.value],s=Array.isArray(t[e])||Array.isArray(a.value),c=n;for(let e=0,t=o.length;e<t;e++){let t=o[e],r=h(t,s),i=n%16,a=i%r.boundary,l=i+a;n+=a,l!==0&&16-l<r.storage&&(n+=16-l),e===0&&(c=n),n+=r.storage}a.__data=new(a.type===`int`?Int32Array:a.type===`uint`?Uint32Array:Float32Array)((n-c)/Float32Array.BYTES_PER_ELEMENT),a.__offset=c}}let r=n%16;return r>0&&(n+=16-r),e.__size=n,e.__cache={},this}function h(e,t){let n={boundary:0,storage:0};return typeof e==`number`||typeof e==`boolean`?(n.boundary=4,n.storage=4):e.isVector2?(n.boundary=8,n.storage=8):e.isVector3||e.isColor?(n.boundary=16,n.storage=12):e.isVector4?(n.boundary=16,n.storage=16):e.isMatrix3?(n.boundary=16,n.storage=48):e.isMatrix4?(n.boundary=16,n.storage=64):e.isTexture?W(`WebGLRenderer: Texture samplers can not be part of an uniforms group.`):ArrayBuffer.isView(e)?(n.boundary=16,n.storage=e.byteLength):W(`WebGLRenderer: Unsupported uniform value type.`,e),t===!0&&(n.boundary=16,n.storage=Math.ceil(n.storage/16)*16),n}function g(t){let n=t.target;n.removeEventListener(`dispose`,g),e.deleteBuffer(i[n.id]),delete i[n.id],delete a[n.id]}function _(){for(let t in i)e.deleteBuffer(i[t]);i={},a={}}return{bind:o,update:s,dispose:_}}var Zh=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Qh=null;function $h(){return Qh===null&&(Qh=new cl(Zh,16,16,la,Xi),Qh.name=`DFG_LUT`,Qh.minFilter=Bi,Qh.magFilter=Bi,Qh.wrapS=Fi,Qh.wrapT=Fi,Qh.generateMipmaps=!1,Qh.needsUpdate=!0),Qh}var eg=class{constructor(e={}){let{canvas:t=ho(),context:n=null,depth:r=!0,stencil:i=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:s=!0,preserveDrawingBuffer:c=!1,powerPreference:l=`default`,failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1,outputBufferType:f=Ui}=e;this.isWebGLRenderer=!0;let p;if(n!==null){if(typeof WebGLRenderingContext<`u`&&n instanceof WebGLRenderingContext)throw Error(`THREE.WebGLRenderer: WebGL 1 is not supported since r163.`);p=n.getContextAttributes().alpha}else p=a;let m=f,h=new Set([da,ua,ca]),g=new Set([Ui,Ji,Ki,$i,Zi,Qi]),_=new Uint32Array(4),v=new Int32Array(4),y={textures:[],min:[],max:[],resolution:[]},b=null,x=null,S=[],C=[],w=null;this.domElement=t,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let T=this,E=!1,D=null,O=null,k=null,A=null;this._outputColorSpace=no;let j=0,ee=0,M=null,N=-1,P=null,te=new $o,ne=new $o,re=null,ie=new J(0),ae=0,oe=t.width,se=t.height,ce=1,le=null,ue=null,de=new $o(0,0,oe,se),fe=new $o(0,0,oe,se),F=!1,pe=new xl,me=new Cl,he=!1,ge=!1,_e=new is,ve=new q,ye=new $o,be={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},xe=!1;function Se(){return M===null?ce:1}let I=n;function Ce(e,n){return t.getContext(e,n)}let L,we,R,Te,z,B,Ee,De,Oe,ke,V,Ae,je,Me,Ne,H,Pe,Fe,Ie,Le,Re,ze,Be;try{let e={alpha:!0,depth:r,stencil:i,antialias:o,premultipliedAlpha:s,preserveDrawingBuffer:c,powerPreference:l,failIfMajorPerformanceCaveat:u};if(`setAttribute`in t&&t.setAttribute(`data-engine`,`three.js r187`),t.addEventListener(`webglcontextlost`,Ue,!1),t.addEventListener(`webglcontextrestored`,U,!1),t.addEventListener(`webglcontextcreationerror`,We,!1),I===null){let t=`webgl2`;if(I=Ce(t,e),I===null)throw Ce(t)?Error(`THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.`):Error(`THREE.WebGLRenderer: Error creating WebGL context.`)}Ve()}catch(e){throw t.removeEventListener(`webglcontextlost`,Ue,!1),t.removeEventListener(`webglcontextrestored`,U,!1),t.removeEventListener(`webglcontextcreationerror`,We,!1),G(`WebGLRenderer: `+e.message),e}function Ve(){L=new bp(I),L.init(),Re=new Hh(I,L),we=new ep(I,L,e,Re),R=new Bh(I,L),we.reversedDepthBuffer&&d&&R.buffers.depth.setReversed(!0),O=I.createFramebuffer(),k=I.createFramebuffer(),A=I.createFramebuffer(),Te=new Cp(I),z=new bh,B=new Vh(I,L,R,z,we,Re,Te),Ee=new yp(T),De=new Gf(I),ze=new Qf(I,De),Oe=new xp(I,De,Te,ze),ke=new Tp(I,Oe,De,ze,Te),Fe=new wp(I,we,B),Ne=new tp(z),V=new yh(T,Ee,L,we,ze,Ne),Ae=new Yh(T,z),je=new wh,Me=new jh(L),Pe=new Zf(T,Ee,R,ke,p,s),H=new zh(T,ke,we),Be=new Xh(I,Te,we,R),Ie=new $f(I,L,Te),Le=new Sp(I,L,Te),Te.programs=V.programs,T.capabilities=we,T.extensions=L,T.properties=z,T.renderLists=je,T.shadowMap=H,T.state=R,T.info=Te}m!==1009&&(w=new Dp(m,t.width,t.height,o,r,i));let He=new Kh(T,I);this.xr=He,this.getContext=function(){return I},this.getContextAttributes=function(){return I.getContextAttributes()},this.forceContextLoss=function(){let e=L.get(`WEBGL_lose_context`);e&&e.loseContext()},this.forceContextRestore=function(){let e=L.get(`WEBGL_lose_context`);e&&e.restoreContext()},this.getPixelRatio=function(){return ce},this.setPixelRatio=function(e){e!==void 0&&(ce=e,this.setSize(oe,se,!1))},this.getSize=function(e){return e.set(oe,se)},this.setSize=function(e,n,r=!0){He.isPresenting?W(`WebGLRenderer: Can't change size while VR device is presenting.`):(oe=e,se=n,t.width=Math.floor(e*ce),t.height=Math.floor(n*ce),r===!0&&(t.style.width=e+`px`,t.style.height=n+`px`),w!==null&&w.setSize(t.width,t.height),this.setViewport(0,0,e,n))},this.getDrawingBufferSize=function(e){return e.set(oe*ce,se*ce).floor()},this.setDrawingBufferSize=function(e,n,r){oe=e,se=n,ce=r,t.width=Math.floor(e*r),t.height=Math.floor(n*r),this.setViewport(0,0,e,n)},this.setEffects=function(e){if(m===1009)G(`WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.`);else{if(e){for(let t=0;t<e.length;t++)if(e[t].isOutputPass===!0){W(`WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.`);break}}w.setEffects(e||[])}},this.getCurrentViewport=function(e){return e.copy(te)},this.getViewport=function(e){return e.copy(de)},this.setViewport=function(e,t,n,r){e.isVector4?de.set(e.x,e.y,e.z,e.w):de.set(e,t,n,r),R.viewport(te.copy(de).multiplyScalar(Se()).round())},this.getScissor=function(e){return e.copy(fe)},this.setScissor=function(e,t,n,r){e.isVector4?fe.set(e.x,e.y,e.z,e.w):fe.set(e,t,n,r),R.scissor(ne.copy(fe).multiplyScalar(Se()).round())},this.getScissorTest=function(){return F},this.setScissorTest=function(e){R.setScissorTest(F=e)},this.setOpaqueSort=function(e){le=e},this.setTransparentSort=function(e){ue=e},this.getClearColor=function(e){return e.copy(Pe.getClearColor())},this.setClearColor=function(){Pe.setClearColor(...arguments)},this.getClearAlpha=function(){return Pe.getClearAlpha()},this.setClearAlpha=function(){Pe.setClearAlpha(...arguments)},this.clear=function(e=!0,t=!0,n=!0){let r=0;if(e){let e=!1;if(M!==null){let t=M.texture.format;e=h.has(t)}if(e){let e=M.texture.type,t=g.has(e),n=Pe.getClearColor(),r=Pe.getClearAlpha(),i=n.r,a=n.g,o=n.b;t?(_[0]=i,_[1]=a,_[2]=o,_[3]=r,I.clearBufferuiv(I.COLOR,0,_)):(v[0]=i,v[1]=a,v[2]=o,v[3]=r,I.clearBufferiv(I.COLOR,0,v))}else r|=I.COLOR_BUFFER_BIT}t&&(r|=I.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),n&&(r|=I.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),r!==0&&I.clear(r)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(e){e.setRenderer(this),D=e},this.dispose=function(){t.removeEventListener(`webglcontextlost`,Ue,!1),t.removeEventListener(`webglcontextrestored`,U,!1),t.removeEventListener(`webglcontextcreationerror`,We,!1),Pe.dispose(),je.dispose(),Me.dispose(),B.dispose(),z.dispose(),Ee.dispose(),ke.dispose(),Oe.dispose(),ze.dispose(),Be.dispose(),V.dispose(),He.dispose(),He.removeEventListener(`sessionstart`,Ze),He.removeEventListener(`sessionend`,Qe),$e.stop()};function Ue(e){e.preventDefault(),_o(`WebGLRenderer: Context Lost.`),E=!0}function U(){_o(`WebGLRenderer: Context Restored.`),E=!1;let e=Te.autoReset,t=H.enabled,n=H.autoUpdate,r=H.needsUpdate,i=H.type;Ve(),Te.autoReset=e,H.enabled=t,H.autoUpdate=n,H.needsUpdate=r,H.type=i}function We(e){G(`WebGLRenderer: A WebGL context could not be created. Reason: `,e.statusMessage)}function Ge(e){let t=e.target;t.removeEventListener(`dispose`,Ge),Ke(t)}function Ke(e){qe(e),z.remove(e)}function qe(e){let t=z.get(e).programs;t!==void 0&&(t.forEach(function(e){V.releaseProgram(e)}),e.isShaderMaterial&&V.releaseShaderCache(e))}this.renderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=be);let o=i.isMesh&&i.matrixWorld.determinantAffine()<0,s=ut(e,t,n,r,i);R.setMaterial(r,o);let c=n.index,l=1;if(r.wireframe===!0){if(c=Oe.getWireframeAttribute(n),c===void 0)return;l=2}let u=n.drawRange,d=n.attributes.position,f=u.start*l,p=(u.start+u.count)*l;a!==null&&(f=Math.max(f,a.start*l),p=Math.min(p,(a.start+a.count)*l)),c===null?d!=null&&(f=Math.max(f,0),p=Math.min(p,d.count)):(f=Math.max(f,0),p=Math.min(p,c.count));let m=p-f;if(m<0||m===1/0)return;ze.setup(i,r,s,n,c);let h,g=Ie;if(c!==null&&(h=De.get(c),g=Le,g.setIndex(h)),i.isMesh)r.wireframe===!0?(R.setLineWidth(r.wireframeLinewidth*Se()),g.setMode(I.LINES)):g.setMode(I.TRIANGLES);else if(i.isLine){let e=r.linewidth;e===void 0&&(e=1),R.setLineWidth(e*Se()),i.isLineSegments?g.setMode(I.LINES):i.isLineLoop?g.setMode(I.LINE_LOOP):g.setMode(I.LINE_STRIP)}else i.isPoints?g.setMode(I.POINTS):i.isSprite&&g.setMode(I.TRIANGLES);if(i.isBatchedMesh){if(L.get(`WEBGL_multi_draw`))g.renderMultiDraw(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount);else{let e=i._multiDrawStarts,t=i._multiDrawCounts,n=i._multiDrawCount,a=c?De.get(c).bytesPerElement:1,o=z.get(r).currentProgram.getUniforms();for(let r=0;r<n;r++)o.setValue(I,`_gl_DrawID`,r),g.render(e[r]/a,t[r])}}else if(i.isInstancedMesh)g.renderInstances(f,m,i.count);else if(n.isInstancedBufferGeometry){let e=n._maxInstanceCount===void 0?1/0:n._maxInstanceCount,t=Math.min(n.instanceCount,e);g.renderInstances(f,m,t)}else g.render(f,m)};function Je(e,t,n,r){D!==null&&e.isNodeMaterial&&D.setObject(r,e),he===!0&&Ne.setState(e,n,!1),e.transparent===!0&&e.side===2&&e.forceSinglePass===!1?(e.side=1,e.needsUpdate=!0,ot(e,t,r),e.side=0,e.needsUpdate=!0,ot(e,t,r),e.side=2):ot(e,t,r)}this.compile=function(e,t,n=null){n===null&&(n=e),D!==null&&D.renderStart(e,t,n),x=Me.get(n),x.init(t),C.push(x),n.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(x.pushLight(e),e.castShadow&&x.pushShadow(e))}),e!==n&&e.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(x.pushLight(e),e.castShadow&&x.pushShadow(e))}),x.setupLights(),D!==null&&D.updateLights(x.state.lightsArray),ge=this.localClippingEnabled,he=Ne.init(this.clippingPlanes,ge),he===!0&&Ne.setGlobalState(this.clippingPlanes,t),D!==null&&H.render(x.state.shadowsArray,n,t);let r=new Set;return e.traverse(function(e){if(!(e.isMesh||e.isPoints||e.isLine||e.isSprite))return;let i=e.material;if(i){if(Array.isArray(i))for(let a=0;a<i.length;a++){let o=i[a];Je(o,n,t,e),r.add(o)}else Je(i,n,t,e),r.add(i)}}),x=C.pop(),D!==null&&D.renderEnd(),r},this.compileAsync=function(e,t,n=null){let r=this.compile(e,t,n);return new Promise(t=>{function n(){r.forEach(function(e){let t=z.get(e).currentProgram;(t===void 0||t.isReady())&&r.delete(e)}),r.size===0?t(e):setTimeout(n,10)}L.get(`KHR_parallel_shader_compile`)===null?setTimeout(n,10):n()})};let Ye=null;function Xe(e){Ye&&Ye(e)}function Ze(){$e.stop()}function Qe(){$e.start()}let $e=new Wf;$e.setAnimationLoop(Xe),typeof self<`u`&&$e.setContext(self),this.setAnimationLoop=function(e){Ye=e,He.setAnimationLoop(e),e===null?$e.stop():$e.start()},He.addEventListener(`sessionstart`,Ze),He.addEventListener(`sessionend`,Qe),this.render=function(e,t){if(t!==void 0&&t.isCamera!==!0){G(`WebGLRenderer.render: camera is not an instance of THREE.Camera.`);return}if(E===!0)return;D!==null&&D.renderStart(e,t);let n=He.enabled===!0&&He.isPresenting===!0,r=w!==null&&(M===null||n)&&w.begin(T,M);if(e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t.parent===null&&t.matrixWorldAutoUpdate===!0&&t.updateMatrixWorld(),He.enabled===!0&&He.isPresenting===!0&&(w===null||w.isCompositing()===!1)&&(He.cameraAutoUpdate===!0&&He.updateCamera(t),t=He.getCamera()),e.isScene===!0&&e.onBeforeRender(T,e,t,M),x=Me.get(e,C.length),x.init(t),x.state.textureUnits=B.getTextureUnits(),C.push(x),_e.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),t.isArrayCamera?me.setFromArrayCamera(t):pe.setFromProjectionMatrix(_e,uo,t.reversedDepth),ge=this.localClippingEnabled,he=Ne.init(this.clippingPlanes,ge),b=je.get(e,S.length),b.init(),S.push(b),this.info.render.frame++,He.enabled===!0&&He.isPresenting===!0){let e=T.xr.getDepthSensingMesh();e!==null&&et(e,t,-1/0,T.sortObjects)}et(e,t,0,T.sortObjects),b.finish(),D!==null&&D.updateLights(x.state.lightsArray),T.sortObjects===!0&&b.sort(le,ue),xe=He.enabled===!1||He.isPresenting===!1||He.hasDepthSensing()===!1,xe&&Pe.addToRenderList(b,e),this.info.autoReset===!0&&this.info.reset(),he===!0&&Ne.beginShadows();let i=x.state.shadowsArray;if(H.render(i,e,t),he===!0&&Ne.endShadows(),(r&&w.hasRenderPass())===!1){let n=b.opaque,r=b.transmissive;if(x.setupLights(),t.isArrayCamera){let i=t.cameras;if(r.length>0)for(let t=0,a=i.length;t<a;t++){let a=i[t];nt(n,r,e,a)}xe&&Pe.render(e);for(let t=0,n=i.length;t<n;t++){let n=i[t];tt(b,e,n,n.viewport)}}else r.length>0&&nt(n,r,e,t),xe&&Pe.render(e),tt(b,e,t)}M!==null&&ee===0&&(B.updateMultisampleRenderTarget(M),B.updateRenderTargetMipmap(M)),r&&w.end(T),e.isScene===!0&&e.onAfterRender(T,e,t),ze.resetDefaultState(),N=-1,P=null,C.pop(),C.length>0?(x=C[C.length-1],B.setTextureUnits(x.state.textureUnits),he===!0&&Ne.setGlobalState(T.clippingPlanes,x.state.camera)):x=null,S.pop(),b=S.length>0?S[S.length-1]:null,D!==null&&D.renderEnd()};function et(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.isGroup)n=e.renderOrder;else if(e.isLOD)e.autoUpdate===!0&&e.update(t);else if(e.isLight)x.pushLight(e),e.castShadow&&x.pushShadow(e);else if(e.isSprite){let i=t.isArrayCamera?me:pe;if(!e.frustumCulled||e.intersectsFrustum(i)){r&&ye.setFromMatrixPosition(e.matrixWorld).applyMatrix4(_e);let i=ke.update(e),a=e.material;a.visible&&b.push(e,i,a,n,ye.z,null,t)}}else if(e.isMesh||e.isLine||e.isPoints){let i=t.isArrayCamera?me:pe;if(!e.frustumCulled||e.intersectsFrustum(i)){let i=ke.update(e),a=e.material;if(r&&(e.boundingSphere===void 0?(i.boundingSphere===null&&i.computeBoundingSphere(),ye.copy(i.boundingSphere.center)):(e.boundingSphere===null&&e.computeBoundingSphere(),ye.copy(e.boundingSphere.center)),ye.applyMatrix4(e.matrixWorld).applyMatrix4(_e)),Array.isArray(a)){let r=i.groups;for(let o=0,s=r.length;o<s;o++){let s=r[o],c=a[s.materialIndex];c&&c.visible&&b.push(e,i,c,n,ye.z,s,t)}}else a.visible&&b.push(e,i,a,n,ye.z,null,t)}}}let i=e.children;for(let e=0,a=i.length;e<a;e++)et(i[e],t,n,r)}function tt(e,t,n,r){let{opaque:i,transmissive:a,transparent:o}=e;x.setupLightsView(n),he===!0&&Ne.setGlobalState(T.clippingPlanes,n),r&&R.viewport(te.copy(r)),i.length>0&&rt(i,t,n),a.length>0&&rt(a,t,n),o.length>0&&rt(o,t,n),R.buffers.depth.setTest(!0),R.buffers.depth.setMask(!0),R.buffers.color.setMask(!0),R.setPolygonOffset(!1)}function nt(e,t,n,r){if((n.isScene===!0?n.overrideMaterial:null)!==null)return;if(x.state.transmissionRenderTarget[r.id]===void 0){let e=L.has(`EXT_color_buffer_half_float`)||L.has(`EXT_color_buffer_float`);x.state.transmissionRenderTarget[r.id]=new ts(1,1,{generateMipmaps:!0,type:e?Xi:Ui,minFilter:Hi,samples:Math.max(4,we.samples),stencilBuffer:i,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:Ho.workingColorSpace})}let a=x.state.transmissionRenderTarget[r.id],o=r.viewport||te;a.setSize(o.z*T.transmissionResolutionScale,o.w*T.transmissionResolutionScale);let s=T.getRenderTarget(),c=T.getActiveCubeFace(),l=T.getActiveMipmapLevel();T.setRenderTarget(a),T.getClearColor(ie),ae=T.getClearAlpha(),ae<1&&T.setClearColor(16777215,.5),T.clear(),xe&&Pe.render(n);let u=T.toneMapping;T.toneMapping=0;let d=r.viewport;if(r.viewport!==void 0&&(r.viewport=void 0),x.setupLightsView(r),he===!0&&Ne.setGlobalState(T.clippingPlanes,r),rt(e,n,r),B.updateMultisampleRenderTarget(a),B.updateRenderTargetMipmap(a),L.has(`WEBGL_multisampled_render_to_texture`)===!1){let e=!1;for(let i=0,a=t.length;i<a;i++){let{object:a,geometry:o,material:s,group:c}=t[i];if(s.side===2&&a.layers.test(r.layers)){let t=s.side;s.side=1,s.needsUpdate=!0,it(a,n,r,o,s,c),s.side=t,s.needsUpdate=!0,e=!0}}e===!0&&(B.updateMultisampleRenderTarget(a),B.updateRenderTargetMipmap(a))}T.setRenderTarget(s,c,l),T.setClearColor(ie,ae),d!==void 0&&(r.viewport=d),T.toneMapping=u}function rt(e,t,n){let r=t.isScene===!0?t.overrideMaterial:null;for(let i=0,a=e.length;i<a;i++){let a=e[i],{object:o,geometry:s,group:c}=a,l=a.material;l.allowOverride===!0&&r!==null&&(l=r),o.layers.test(n.layers)&&it(o,t,n,s,l,c)}}function it(e,t,n,r,i,a){D!==null&&i.isNodeMaterial&&D.setObject(e,i),e.onBeforeRender(T,t,n,r,i,a),e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix),i.onBeforeRender(T,t,n,r,e,a),i.transparent===!0&&i.side===2&&i.forceSinglePass===!1?(i.side=1,i.needsUpdate=!0,T.renderBufferDirect(n,t,r,i,e,a),i.side=0,i.needsUpdate=!0,T.renderBufferDirect(n,t,r,i,e,a),i.side=2):T.renderBufferDirect(n,t,r,i,e,a),e.onAfterRender(T,t,n,r,i,a)}function at(e){let t=0;for(let n of e)n.texture!==null&&t++;return t}function ot(e,t,n){t.isScene!==!0&&(t=be);let r=z.get(e),i=x.state.lights,a=x.state.shadowsArray,o=i.state.version,s=V.getParameters(e,i.state,a,t,n,x.state.lightProbeGridArray),c=V.getProgramCacheKey(s),l=r.programs;r.environment=e.isMeshStandardMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial?t.environment:null,r.fog=t.fog;let u=e.isMeshStandardMaterial||e.isMeshLambertMaterial&&!e.envMap||e.isMeshPhongMaterial&&!e.envMap;r.envMap=Ee.get(e.envMap||r.environment,u),r.envMapRotation=r.environment!==null&&e.envMap===null?t.environmentRotation:e.envMapRotation,l===void 0&&(e.addEventListener(`dispose`,Ge),l=new Map,r.programs=l,r.programVariants=new Map);let d=l.get(c);if(d!==void 0){if(r.currentProgram===d&&r.lightsStateVersion===o)return lt(e,s),d}else s.uniforms=V.getUniforms(e),D!==null&&e.isNodeMaterial&&D.build(e,n,s),e.onBeforeCompile(s,T),d=V.acquireProgram(s,c),l.set(c,d),r.uniforms=s.uniforms;let f=r.uniforms;return(!e.isShaderMaterial&&!e.isRawShaderMaterial||e.clipping===!0)&&(f.clippingPlanes=Ne.uniform),lt(e,s),r.needsLights=ft(e),r.lightsStateVersion=o,r.needsLights&&(f.ambientLightColor.value=i.state.ambient,f.lightProbe.value=i.state.probe,f.sunLights.value=i.state.sun,f.sunLightShadows.value=i.state.sunShadow,f.directionalLights.value=i.state.directional,f.directionalLightShadows.value=i.state.directionalShadow,f.spotLights.value=i.state.spot,f.spotLightShadows.value=i.state.spotShadow,f.rectAreaLights.value=i.state.rectArea,f.ltc_1.value=i.state.rectAreaLTC1,f.ltc_2.value=i.state.rectAreaLTC2,f.pointLights.value=i.state.point,f.pointLightShadows.value=i.state.pointShadow,f.hemisphereLights.value=i.state.hemi,f.sunShadowMatrix.value=i.state.sunShadowMatrix,f.sunShadowCascade.value=i.state.sunShadowCascade,f.directionalShadowMatrix.value=i.state.directionalShadowMatrix,f.spotLightMatrix.value=i.state.spotLightMatrix,f.spotLightMap.value=i.state.spotLightMap,f.pointShadowMatrix.value=i.state.pointShadowMatrix),r.numLightProbeGrids=at(x.state.lightProbeGridArray),r.currentProgram=d,r.uniformsList=null,d}function st(e,t,n,r,i){let a=z.get(e),o=a.currentProgram.id+`,`+r+`,`+i,s=a.programVariants.get(o);return s===void 0?(s=ot(e,t,n),a.programVariants.set(o,s)):(a.currentProgram=s,a.uniformsList=null,a.outputColorSpace=r,a.toneMapping=i),s}function ct(e){if(e.uniformsList===null){let t=e.currentProgram.getUniforms();e.uniformsList=Im.seqWithValue(t.seq,e.uniforms)}return e.uniformsList}function lt(e,t){let n=z.get(e);n.outputColorSpace=t.outputColorSpace,n.batching=t.batching,n.batchingColor=t.batchingColor,n.instancing=t.instancing,n.instancingColor=t.instancingColor,n.instancingMorph=t.instancingMorph,n.skinning=t.skinning,n.morphTargets=t.morphTargets,n.morphNormals=t.morphNormals,n.morphColors=t.morphColors,n.morphTargetsCount=t.morphTargetsCount,n.numClippingPlanes=t.numClippingPlanes,n.numIntersection=t.numClipIntersection,n.vertexAlphas=t.vertexAlphas,n.vertexTangents=t.vertexTangents,n.toneMapping=t.toneMapping}function ut(e,t,n,r,i){t.isScene!==!0&&(t=be),B.resetTextureUnits();let a=t.fog,o=r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial?t.environment:null,s=M===null?T.outputColorSpace:M.isXRRenderTarget===!0?M.texture.colorSpace:Ho.workingColorSpace,c=r.isMeshStandardMaterial||r.isMeshLambertMaterial&&!r.envMap||r.isMeshPhongMaterial&&!r.envMap,l=Ee.get(r.envMap||o,c),u=r.vertexColors===!0&&!!n.attributes.color&&n.attributes.color.itemSize===4,d=!!n.attributes.tangent&&(!!r.normalMap||r.anisotropy>0),f=!!n.morphAttributes.position,p=!!n.morphAttributes.normal,m=!!n.morphAttributes.color,h=0;r.toneMapped&&(M===null||M.isXRRenderTarget===!0)&&(h=T.toneMapping);let g=n.morphAttributes.position||n.morphAttributes.normal||n.morphAttributes.color,_=g===void 0?0:g.length,v=z.get(r),b=x.state.lights;if(he===!0&&(ge===!0||e!==P)){let t=e===P&&r.id===N;Ne.setState(r,e,t)}let S=!1,C=!1;r.version===v.__version?v.needsLights&&v.lightsStateVersion!==b.state.version||i.isBatchedMesh&&v.batching===!1||!i.isBatchedMesh&&v.batching===!0||i.isBatchedMesh&&v.batchingColor===!0&&i._colorsTexture===null||i.isBatchedMesh&&v.batchingColor===!1&&i._colorsTexture!==null||i.isInstancedMesh&&v.instancing===!1||!i.isInstancedMesh&&v.instancing===!0||i.isSkinnedMesh&&v.skinning===!1||!i.isSkinnedMesh&&v.skinning===!0||i.isInstancedMesh&&v.instancingColor===!0&&i.instanceColor===null||i.isInstancedMesh&&v.instancingColor===!1&&i.instanceColor!==null||i.isInstancedMesh&&v.instancingMorph===!0&&i.morphTexture===null||i.isInstancedMesh&&v.instancingMorph===!1&&i.morphTexture!==null?S=!0:v.envMap===l?r.fog===!0&&v.fog!==a||v.numClippingPlanes!==void 0&&(v.numClippingPlanes!==Ne.numPlanes||v.numIntersection!==Ne.numIntersection)?S=!0:v.vertexAlphas===u&&v.vertexTangents===d&&v.morphTargets===f&&v.morphNormals===p&&v.morphColors===m&&v.morphTargetsCount===_&&v.numLightProbeGrids===at(x.state.lightProbeGridArray)?(v.outputColorSpace!==s||v.toneMapping!==h)&&(C=!0):S=!0:S=!0:(S=!0,v.__version=r.version);let w=v.currentProgram;(S===!0||C===!0)&&(w=C===!0?st(r,t,i,s,h):ot(r,t,i),D&&r.isNodeMaterial&&D.onUpdateProgram(r,w,v));let E=!1,O=!1,k=!1,A=w.getUniforms(),j=v.uniforms;if(R.useProgram(w.program)&&(E=!0,O=!0,k=!0),r.id!==N&&(N=r.id,O=!0),E||P!==e){R.buffers.depth.getReversed()&&e.reversedDepth!==!0&&(e._reversedDepth=!0,e.updateProjectionMatrix()),A.setValue(I,`projectionMatrix`,e.projectionMatrix),A.setValue(I,`viewMatrix`,e.matrixWorldInverse);let t=A.map.cameraPosition;t!==void 0&&t.setValue(I,ve.setFromMatrixPosition(e.matrixWorld)),we.logarithmicDepthBuffer&&A.setValue(I,`logDepthBufFC`,2/(Math.log(e.far+1)/Math.LN2)),(r.isMeshPhongMaterial||r.isMeshToonMaterial||r.isMeshLambertMaterial||r.isMeshBasicMaterial||r.isMeshStandardMaterial||r.isShaderMaterial)&&A.setValue(I,`isOrthographic`,e.isOrthographicCamera===!0),P!==e&&(P=e,O=!0,k=!0)}if(v.needsLights&&(b.state.sunShadowMap.length>0&&A.setValue(I,`sunShadowMap`,b.state.sunShadowMap,B),b.state.directionalShadowMap.length>0&&A.setValue(I,`directionalShadowMap`,b.state.directionalShadowMap,B),b.state.spotShadowMap.length>0&&A.setValue(I,`spotShadowMap`,b.state.spotShadowMap,B),b.state.pointShadowMap.length>0&&A.setValue(I,`pointShadowMap`,b.state.pointShadowMap,B)),i.isSkinnedMesh){A.setOptional(I,i,`bindMatrix`),A.setOptional(I,i,`bindMatrixInverse`);let e=i.skeleton;e&&(e.boneTexture===null&&e.computeBoneTexture(),A.setValue(I,`boneTexture`,e.boneTexture,B))}i.isBatchedMesh&&(A.setOptional(I,i,`batchingTexture`),A.setValue(I,`batchingTexture`,i._matricesTexture,B),A.setOptional(I,i,`batchingIdTexture`),A.setValue(I,`batchingIdTexture`,i._indirectTexture,B),A.setOptional(I,i,`batchingColorTexture`),i._colorsTexture!==null&&A.setValue(I,`batchingColorTexture`,i._colorsTexture,B));let ee=n.morphAttributes;if((ee.position!==void 0||ee.normal!==void 0||ee.color!==void 0)&&Fe.update(i,n,w),(O||v.receiveShadow!==i.receiveShadow)&&(v.receiveShadow=i.receiveShadow,A.setValue(I,`receiveShadow`,i.receiveShadow)),(r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial)&&r.envMap===null&&t.environment!==null&&(j.envMapIntensity.value=t.environmentIntensity),j.dfgLUT!==void 0&&(j.dfgLUT.value=$h()),O){if(A.setValue(I,`toneMappingExposure`,T.toneMappingExposure),v.needsLights&&dt(j,k),a&&r.fog===!0&&Ae.refreshFogUniforms(j,a),Ae.refreshMaterialUniforms(j,r,ce,se,x.state.transmissionRenderTarget[e.id]),v.needsLights&&v.numLightProbeGrids>0){let e=y,t=0;for(let n of x.state.lightProbeGridArray)n.texture!==null&&(e.textures[t]=n.texture,e.min[t]=n.boundingBox.min,e.max[t]=n.boundingBox.max,e.resolution[t]=n.resolution,t++);for(let n in e)e[n].length=t;j.probesSH.value=e.textures,j.probesMin.value=e.min,j.probesMax.value=e.max,j.probesResolution.value=e.resolution}Im.upload(I,ct(v),j,B)}if(r.isShaderMaterial&&r.uniformsNeedUpdate===!0&&(Im.upload(I,ct(v),j,B),r.uniformsNeedUpdate=!1),r.isSpriteMaterial&&A.setValue(I,`center`,i.center),A.setValue(I,`modelViewMatrix`,i.modelViewMatrix),A.setValue(I,`normalMatrix`,i.normalMatrix),A.setValue(I,`modelMatrix`,i.matrixWorld),r.uniformsGroups!==void 0){let e=r.uniformsGroups;for(let t=0,n=e.length;t<n;t++){let n=e[t];Be.update(n,w),Be.bind(n,w)}}return w}function dt(e,t){e.ambientLightColor.needsUpdate=t,e.lightProbe.needsUpdate=t,e.sunLights.needsUpdate=t,e.sunLightShadows.needsUpdate=t,e.directionalLights.needsUpdate=t,e.directionalLightShadows.needsUpdate=t,e.pointLights.needsUpdate=t,e.pointLightShadows.needsUpdate=t,e.spotLights.needsUpdate=t,e.spotLightShadows.needsUpdate=t,e.rectAreaLights.needsUpdate=t,e.hemisphereLights.needsUpdate=t}function ft(e){return e.isMeshLambertMaterial||e.isMeshToonMaterial||e.isMeshPhongMaterial||e.isMeshStandardMaterial||e.isShadowMaterial||e.isShaderMaterial&&e.lights===!0}this.getActiveCubeFace=function(){return j},this.getActiveMipmapLevel=function(){return ee},this.getRenderTarget=function(){return M},this.setRenderTargetTextures=function(e,t,n){let r=z.get(e);r.__autoAllocateDepthBuffer=e.resolveDepthBuffer===!1,r.__autoAllocateDepthBuffer===!1&&(r.__useRenderToTexture=!1),z.get(e.texture).__webglTexture=t,z.get(e.depthTexture).__webglTexture=r.__autoAllocateDepthBuffer?void 0:n,r.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(e,t){let n=z.get(e);n.__webglFramebuffer=t,n.__useDefaultFramebuffer=t===void 0},this.setRenderTarget=function(e,t=0,n=0){M=e,j=t,ee=n;let r=null,i=!1,a=!1;if(e){let o=z.get(e);if(o.__useDefaultFramebuffer!==void 0){R.bindFramebuffer(I.FRAMEBUFFER,o.__webglFramebuffer),te.copy(e.viewport),ne.copy(e.scissor),re=e.scissorTest,R.viewport(te),R.scissor(ne),R.setScissorTest(re),N=-1;return}if(o.__webglFramebuffer===void 0)B.setupRenderTarget(e);else if(o.__hasExternalTextures)B.rebindTextures(e,z.get(e.texture).__webglTexture,z.get(e.depthTexture).__webglTexture);else if(e.depthBuffer){let t=e.depthTexture;if(o.__boundDepthTexture!==t){if(t!==null&&z.has(t)&&(e.width!==t.image.width||e.height!==t.image.height))throw Error(`THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.`);B.setupDepthRenderbuffer(e)}}let s=e.texture;(s.isData3DTexture||s.isDataArrayTexture||s.isCompressedArrayTexture)&&(a=!0);let c=z.get(e).__webglFramebuffer;e.isWebGLCubeRenderTarget?(r=Array.isArray(c[t])?c[t][n]:c[t],i=!0):r=e.samples>0&&B.useMultisampledRTT(e)===!1?z.get(e).__webglMultisampledFramebuffer:Array.isArray(c)?c[n]:c,te.copy(e.viewport),ne.copy(e.scissor),re=e.scissorTest}else te.copy(de).multiplyScalar(ce).floor(),ne.copy(fe).multiplyScalar(ce).floor(),re=F;if(n!==0&&(r=O),R.bindFramebuffer(I.FRAMEBUFFER,r)&&R.drawBuffers(e,r),R.viewport(te),R.scissor(ne),R.setScissorTest(re),i){let r=z.get(e.texture);I.framebufferTexture2D(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_CUBE_MAP_POSITIVE_X+t,r.__webglTexture,n)}else if(a){let r=t;for(let t=0;t<e.textures.length;t++){let i=z.get(e.textures[t]);I.framebufferTextureLayer(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0+t,i.__webglTexture,n,r)}}else if(e!==null&&n!==0){let t=z.get(e.texture);I.framebufferTexture2D(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,t.__webglTexture,n)}N=-1};function pt(e){let t=z.get(e);return(t.__readFormat!==e.format||t.__readType!==e.type)&&(t.__readFormat=e.format,t.__readType=e.type,t.__formatReadable=we.textureFormatReadable(e.format),t.__typeReadable=we.textureTypeReadable(e.type)),t}this.readRenderTargetPixels=function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget)){G(`WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);return}let c=z.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o],Array.isArray(c)&&(c=c[0])),c){R.bindFramebuffer(I.FRAMEBUFFER,c);try{let o=e.textures[s],c=o.format,l=o.type;e.textures.length>1&&I.readBuffer(I.COLOR_ATTACHMENT0+s);let u=pt(o);if(u.__formatReadable===!1){G(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.`);return}if(u.__typeReadable===!1){G(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.`);return}t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i&&I.readPixels(t,n,r,i,Re.convert(c),Re.convert(l),a)}finally{let e=M===null?null:z.get(M).__webglFramebuffer;R.bindFramebuffer(I.FRAMEBUFFER,e)}}},this.readRenderTargetPixelsAsync=async function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget))throw Error(`THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);let c=z.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o],Array.isArray(c)&&(c=c[0])),c){if(t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i){R.bindFramebuffer(I.FRAMEBUFFER,c);let o=e.textures[s],l=o.format,u=o.type;e.textures.length>1&&I.readBuffer(I.COLOR_ATTACHMENT0+s);let d=pt(o);if(d.__formatReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.`);if(d.__typeReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.`);let f=I.createBuffer();I.bindBuffer(I.PIXEL_PACK_BUFFER,f),I.bufferData(I.PIXEL_PACK_BUFFER,a.byteLength,I.STREAM_READ),I.readPixels(t,n,r,i,Re.convert(l),Re.convert(u),0),I.bindBuffer(I.PIXEL_PACK_BUFFER,null);let p=M===null?null:z.get(M).__webglFramebuffer;R.bindFramebuffer(I.FRAMEBUFFER,p);let m=I.fenceSync(I.SYNC_GPU_COMMANDS_COMPLETE,0);return I.flush(),await bo(I,m,4),I.bindBuffer(I.PIXEL_PACK_BUFFER,f),I.getBufferSubData(I.PIXEL_PACK_BUFFER,0,a),I.bindBuffer(I.PIXEL_PACK_BUFFER,null),I.deleteBuffer(f),I.deleteSync(m),a}throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.`)}},this.copyFramebufferToTexture=function(e,t=null,n=0){let r=2**-n,i=Math.floor(e.image.width*r),a=Math.floor(e.image.height*r),o=t===null?0:t.x,s=t===null?0:t.y;B.setTexture2D(e,0),I.copyTexSubImage2D(I.TEXTURE_2D,n,0,0,o,s,i,a),R.unbindTexture()},this.copyTextureToTexture=function(e,t,n=null,r=null,i=0,a=0){let o,s,c,l,u,d,f,p,m,h=e.isCompressedTexture?e.mipmaps[a]:e.image;if(n!==null)o=n.max.x-n.min.x,s=n.max.y-n.min.y,c=n.isBox3?n.max.z-n.min.z:1,l=n.min.x,u=n.min.y,d=n.isBox3?n.min.z:0;else{let t=2**-i;o=Math.floor(h.width*t),s=Math.floor(h.height*t),c=e.isDataArrayTexture?h.depth:e.isData3DTexture?Math.floor(h.depth*t):1,l=0,u=0,d=0}r===null?(f=0,p=0,m=0):(f=r.x,p=r.y,m=r.z);let g=Re.convert(t.format),_=Re.convert(t.type),v;t.isData3DTexture?(B.setTexture3D(t,0),v=I.TEXTURE_3D):t.isDataArrayTexture||t.isCompressedArrayTexture?(B.setTexture2DArray(t,0),v=I.TEXTURE_2D_ARRAY):(B.setTexture2D(t,0),v=I.TEXTURE_2D),R.activeTexture(I.TEXTURE0),R.pixelStorei(I.UNPACK_FLIP_Y_WEBGL,t.flipY),R.pixelStorei(I.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),R.pixelStorei(I.UNPACK_ALIGNMENT,t.unpackAlignment);let y=R.getParameter(I.UNPACK_ROW_LENGTH),b=R.getParameter(I.UNPACK_IMAGE_HEIGHT),x=R.getParameter(I.UNPACK_SKIP_PIXELS),S=R.getParameter(I.UNPACK_SKIP_ROWS),C=R.getParameter(I.UNPACK_SKIP_IMAGES);R.pixelStorei(I.UNPACK_ROW_LENGTH,h.width),R.pixelStorei(I.UNPACK_IMAGE_HEIGHT,h.height),R.pixelStorei(I.UNPACK_SKIP_PIXELS,l),R.pixelStorei(I.UNPACK_SKIP_ROWS,u),R.pixelStorei(I.UNPACK_SKIP_IMAGES,d);let w=e.isDataArrayTexture||e.isData3DTexture,T=t.isDataArrayTexture||t.isData3DTexture;if(e.isDepthTexture){let n=z.get(e),r=z.get(t),h=z.get(n.__renderTarget),g=z.get(r.__renderTarget);R.bindFramebuffer(I.READ_FRAMEBUFFER,h.__webglFramebuffer),R.bindFramebuffer(I.DRAW_FRAMEBUFFER,g.__webglFramebuffer);for(let n=0;n<c;n++)w&&(I.framebufferTextureLayer(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,z.get(e).__webglTexture,i,d+n),I.framebufferTextureLayer(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,z.get(t).__webglTexture,a,m+n)),I.blitFramebuffer(l,u,l+o,u+s,f,p,f+o,p+s,I.DEPTH_BUFFER_BIT,I.NEAREST);R.bindFramebuffer(I.READ_FRAMEBUFFER,null),R.bindFramebuffer(I.DRAW_FRAMEBUFFER,null)}else if(i!==0||e.isRenderTargetTexture||z.has(e)){let n=z.get(e),r=z.get(t);R.bindFramebuffer(I.READ_FRAMEBUFFER,k),R.bindFramebuffer(I.DRAW_FRAMEBUFFER,A);for(let e=0;e<c;e++)w?I.framebufferTextureLayer(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,n.__webglTexture,i,d+e):I.framebufferTexture2D(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,n.__webglTexture,i),T?I.framebufferTextureLayer(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,r.__webglTexture,a,m+e):I.framebufferTexture2D(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,r.__webglTexture,a),i===0?T?I.copyTexSubImage3D(v,a,f,p,m+e,l,u,o,s):I.copyTexSubImage2D(v,a,f,p,l,u,o,s):I.blitFramebuffer(l,u,l+o,u+s,f,p,f+o,p+s,I.COLOR_BUFFER_BIT,I.NEAREST);R.bindFramebuffer(I.READ_FRAMEBUFFER,null),R.bindFramebuffer(I.DRAW_FRAMEBUFFER,null)}else T?e.isDataTexture||e.isData3DTexture?I.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h.data):t.isCompressedArrayTexture?I.compressedTexSubImage3D(v,a,f,p,m,o,s,c,g,h.data):I.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h):e.isDataTexture?I.texSubImage2D(I.TEXTURE_2D,a,f,p,o,s,g,_,h.data):e.isCompressedTexture?I.compressedTexSubImage2D(I.TEXTURE_2D,a,f,p,h.width,h.height,g,h.data):I.texSubImage2D(I.TEXTURE_2D,a,f,p,o,s,g,_,h);R.pixelStorei(I.UNPACK_ROW_LENGTH,y),R.pixelStorei(I.UNPACK_IMAGE_HEIGHT,b),R.pixelStorei(I.UNPACK_SKIP_PIXELS,x),R.pixelStorei(I.UNPACK_SKIP_ROWS,S),R.pixelStorei(I.UNPACK_SKIP_IMAGES,C),a===0&&t.generateMipmaps===!0&&t.mipmapsAutoUpdate===!0&&I.generateMipmap(v),R.unbindTexture()},this.initRenderTarget=function(e){z.get(e).__webglFramebuffer===void 0&&B.setupRenderTarget(e)},this.initTexture=function(e){e.isCubeTexture?B.setTextureCube(e,0):e.isData3DTexture?B.setTexture3D(e,0):e.isDataArrayTexture||e.isCompressedArrayTexture?B.setTexture2DArray(e,0):B.setTexture2D(e,0),R.unbindTexture()},this.resetState=function(){j=0,ee=0,M=null,R.reset(),ze.reset()},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}get coordinateSystem(){return uo}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=Ho._getDrawingBufferColorSpace(e),t.unpackColorSpace=Ho._getUnpackColorSpace()}},tg=[`asphaltDry`,`asphaltWet`,`concrete`,`epoxy`,`wornPaint`,`rustedIron`,`galvanized`,`corrugated`,`brick`,`glass`,`tire`,`carPaint`,`plastic`,`chrome`,`paintedMetal`,`plaster`],ng={asphaltDry:{color:6119010,roughness:.93,metalness:0,clearcoat:0,clearcoatRoughness:0,tileM:2.2,normalScale:.9,macro:.1},asphaltWet:{color:3948100,roughness:.55,metalness:0,clearcoat:0,clearcoatRoughness:0,tileM:2.2,normalScale:.6,macro:.08},concrete:{color:12170666,roughness:.88,metalness:0,clearcoat:0,clearcoatRoughness:0,tileM:3.048,normalScale:.8,macro:.12},epoxy:{color:8227468,roughness:.32,metalness:0,clearcoat:.6,clearcoatRoughness:.18,tileM:2,normalScale:.35,macro:.05},wornPaint:{color:15131610,roughness:.78,metalness:0,clearcoat:0,clearcoatRoughness:0,tileM:1.1,normalScale:.6,macro:.06},rustedIron:{color:7301734,roughness:.62,metalness:.85,clearcoat:0,clearcoatRoughness:0,tileM:1.5,normalScale:.9,macro:.1},galvanized:{color:11186356,roughness:.42,metalness:.9,clearcoat:0,clearcoatRoughness:0,tileM:.9,normalScale:.35,macro:.06},corrugated:{color:10133668,roughness:.5,metalness:.8,clearcoat:0,clearcoatRoughness:0,tileM:1.22,normalScale:1.3,macro:.08},brick:{color:10115652,roughness:.9,metalness:0,clearcoat:0,clearcoatRoughness:0,tileM:1.28,normalScale:1.1,macro:.14},glass:{color:1911347,roughness:.06,metalness:0,clearcoat:0,clearcoatRoughness:0,tileM:1.4,normalScale:0,macro:0},tire:{color:1513498,roughness:.9,metalness:0,clearcoat:0,clearcoatRoughness:0,tileM:1,normalScale:0,macro:0},carPaint:{color:2057139,roughness:.32,metalness:.4,clearcoat:1,clearcoatRoughness:.06,tileM:.22,normalScale:.5,macro:0},plastic:{color:1842464,roughness:.62,metalness:0,clearcoat:0,clearcoatRoughness:0,tileM:.4,normalScale:.45,macro:0},chrome:{color:15133164,roughness:.1,metalness:1,clearcoat:0,clearcoatRoughness:0,tileM:.5,normalScale:.15,macro:0},paintedMetal:{color:4870230,roughness:.5,metalness:.25,clearcoat:0,clearcoatRoughness:0,tileM:1.6,normalScale:.4,macro:.07},plaster:{color:13483935,roughness:.92,metalness:0,clearcoat:0,clearcoatRoughness:0,tileM:2,normalScale:.7,macro:.12}},rg=20261112;function ig(e){return tg.indexOf(e)}var ag={dirt:0,streaks:0,oil:0,tireMarks:0},og={asphaltDry:{dirt:.3,streaks:0,oil:.6,tireMarks:.6},asphaltWet:{dirt:.2,streaks:0,oil:.4,tireMarks:.3},concrete:{dirt:.5,streaks:.5,oil:.3,tireMarks:.15},epoxy:{dirt:.15,streaks:0,oil:.3,tireMarks:.6},wornPaint:{dirt:.35,streaks:0,oil:.3,tireMarks:.6},rustedIron:{dirt:.4,streaks:.5,oil:0,tireMarks:0},galvanized:{dirt:.2,streaks:.3,oil:0,tireMarks:0},corrugated:{dirt:.35,streaks:.6,oil:0,tireMarks:0},brick:{dirt:.55,streaks:.6,oil:0,tireMarks:0},glass:ag,tire:ag,carPaint:ag,plastic:{dirt:.25,streaks:.2,oil:0,tireMarks:0},chrome:ag,paintedMetal:{dirt:.3,streaks:.5,oil:0,tireMarks:0},plaster:{dirt:.5,streaks:.55,oil:0,tireMarks:0}},sg=tg.length,cg=`
precision highp float;
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,lg=`
const uint SEED = ${rg}u;

uint hashU(uint x) {
  x ^= x >> 16; x *= 0x7feb352dU; x ^= x >> 15; x *= 0x846ca68bU; x ^= x >> 16;
  return x;
}
float hash(ivec2 p, uint s) {
  uint h = hashU(uint(p.x) * 0x9e3779b9U + hashU(uint(p.y) + hashU(s + SEED)));
  return float(h >> 8) * (1.0 / 16777215.0);
}
// 取餘數的被除數不能是負的（GLSL ES 的 % 對負數沒有定義）：先加一個周期。
ivec2 wrap2(ivec2 p, ivec2 n) { return (p + n) % n; }

/** 周期是 freq 格的值噪聲（兩個方向的格數可以不同：拉長的條紋）。 */
float vnoise2(vec2 uv, ivec2 freq, uint s) {
  vec2 p = uv * vec2(freq);
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 u = f * f * (3.0 - 2.0 * f);
  ivec2 ip = ivec2(i);
  float a = hash(wrap2(ip, freq), s);
  float b = hash(wrap2(ip + ivec2(1, 0), freq), s);
  float c = hash(wrap2(ip + ivec2(0, 1), freq), s);
  float d = hash(wrap2(ip + ivec2(1, 1), freq), s);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float vnoise(vec2 uv, int freq, uint s) { return vnoise2(uv, ivec2(freq), s); }

float fbm(vec2 uv, int freq, int octaves, uint s) {
  float sum = 0.0;
  float amp = 0.5;
  float norm = 0.0;
  for (int o = 0; o < octaves; o++) {
    sum += amp * vnoise(uv, freq, s + uint(o) * 17u);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

/** 細胞噪聲：x = 到最近的點的距離、y = 那一格的亂數、z = 第二近 − 最近（細胞邊界上是 0）。 */
vec3 cells(vec2 uv, int freq, uint s) {
  vec2 p = uv * float(freq);
  ivec2 ip = ivec2(floor(p));
  vec2 f = p - floor(p);
  float d1 = 9.0;
  float d2 = 9.0;
  float id = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      ivec2 c = wrap2(ip + ivec2(x, y), ivec2(freq));
      vec2 o = vec2(hash(c, s), hash(c, s + 71u));
      vec2 r = vec2(float(x), float(y)) + o - f;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; id = hash(c, s + 133u); }
      else if (d < d2) { d2 = d; }
    }
  }
  return vec3(sqrt(d1), id, sqrt(d2) - sqrt(d1));
}
`,ug=`
struct Surf {
  vec3 over;   // 不跟底色走的顏色（線性）
  float cov;   // 它蓋住多少
  float tint;  // 底色的明暗倍率
  float ao;
  float rough; // 粗糙度倍率
  float metal; // 金屬度倍率
  float h;     // 高度（以貼圖邊長為 1）
  vec2 nrm;    // 直接加在法線上的偏移（金屬片）
};

Surf blank() {
  return Surf(vec3(0.0), 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, vec2(0.0));
}

// 柏油：碎石骨材＋細顆粒；wet > 0 時有潮濕的深色區與反光的小水窪。
Surf asphalt(vec2 uv, float wet) {
  Surf s = blank();
  vec3 c = cells(uv, 96, 1u);
  float stone = smoothstep(0.55, 0.15, c.x);
  float grain = fbm(uv, 128, 3, 3u);
  float mott = fbm(uv, 6, 4, 4u);
  s.tint = 0.78 + 0.34 * stone * c.y + 0.16 * (grain - 0.5) + 0.2 * (mott - 0.5);
  s.h = 0.0016 * stone * (0.5 + 0.5 * c.y) + 0.0006 * grain;
  s.ao = 0.8 + 0.2 * stone;
  s.rough = 1.0 + 0.1 * (grain - 0.5);
  if (wet > 0.0) {
    float puddle = smoothstep(0.5, 0.62, fbm(uv, 3, 4, 5u));
    float damp = smoothstep(0.3, 0.6, fbm(uv, 5, 3, 6u));
    s.tint *= mix(1.0, 0.72, damp) * mix(1.0, 0.8, puddle);
    s.rough = mix(mix(1.4, 0.8, damp), 0.14, puddle);
    s.h *= 1.0 - puddle;
  }
  return s;
}

// 水泥：大片的色斑、細砂、氣孔、每半張貼圖一道伸縮縫、水漬。
Surf concrete(vec2 uv) {
  Surf s = blank();
  float mott = fbm(uv, 4, 5, 10u);
  float fine = fbm(uv, 96, 3, 11u);
  vec3 pores = cells(uv, 56, 12u);
  float pore = smoothstep(0.13, 0.05, pores.x) * step(0.8, pores.y);
  vec2 g = abs(fract(uv * 2.0 + 0.5) - 0.5) * 0.5;
  float joint = smoothstep(0.0035, 0.0012, min(g.x, g.y));
  float stain = smoothstep(0.52, 0.75, fbm(uv, 3, 4, 13u));
  s.tint = 0.92 + 0.22 * (mott - 0.5) + 0.1 * (fine - 0.5) - 0.3 * pore - 0.4 * joint - 0.1 * stain;
  s.h = 0.0012 * fine - 0.004 * pore - 0.006 * joint;
  s.ao = 1.0 - 0.5 * joint - 0.4 * pore;
  s.rough = 1.0 + 0.12 * (fine - 0.5) - 0.08 * stain;
  return s;
}

// 環氧地坪：平滑反光、撒了彩色碎片、鞋印與拖痕把局部磨霧。
Surf epoxy(vec2 uv) {
  Surf s = blank();
  vec3 fl = cells(uv, 72, 20u);
  float flake = smoothstep(0.3, 0.2, fl.x) * step(0.55, fl.y);
  float scuff = smoothstep(0.55, 0.8, fbm(uv, 8, 4, 21u));
  float streak = vnoise2(uv, ivec2(4, 96), 22u);
  s.tint = 0.95 + 0.1 * (fbm(uv, 5, 3, 23u) - 0.5) + flake * (fl.y > 0.8 ? 0.45 : -0.3);
  s.rough = 1.0 + 0.9 * scuff * streak + 0.3 * scuff;
  s.h = 0.0006 * fbm(uv, 24, 2, 24u);
  return s;
}

// 磨損標線：漆面被磨穿的地方露出底下的柏油，另有細裂紋。
Surf wornPaint(vec2 uv) {
  Surf s = blank();
  float wear = fbm(uv, 6, 5, 30u);
  vec3 ag = cells(uv, 64, 31u);
  float worn = smoothstep(0.5, 0.7, wear + 0.25 * (ag.x - 0.4));
  vec3 cr = cells(uv, 7, 32u);
  worn = max(worn, smoothstep(0.03, 0.01, cr.z));
  s.over = vec3(0.1, 0.1, 0.105) * (0.8 + 0.5 * ag.y);
  s.cov = worn * 0.92;
  s.tint = 0.94 + 0.14 * (fbm(uv, 24, 3, 33u) - 0.5) - 0.12 * smoothstep(0.35, 0.5, wear);
  s.h = 0.0015 * (1.0 - worn) + 0.0008 * smoothstep(0.5, 0.1, ag.x);
  s.rough = 1.0 + 0.2 * worn;
  s.ao = 1.0 - 0.15 * worn;
  return s;
}

// 生鏽鐵件：成片的鏽（不是金屬、粗糙、有坑），其餘是還看得到的鐵。
Surf rustedIron(vec2 uv) {
  Surf s = blank();
  float r = fbm(uv, 4, 6, 40u);
  float r2 = fbm(uv, 24, 4, 41u);
  float rust = smoothstep(0.42, 0.62, r + 0.25 * (r2 - 0.5));
  vec3 pit = cells(uv, 48, 42u);
  float pits = smoothstep(0.4, 0.1, pit.x);
  vec3 rustA = vec3(0.36, 0.14, 0.05);
  vec3 rustB = vec3(0.19, 0.08, 0.04);
  vec3 rustC = vec3(0.55, 0.27, 0.09);
  s.over = mix(mix(rustB, rustA, r2), rustC, smoothstep(0.6, 0.9, pit.y) * 0.6);
  s.cov = rust;
  s.metal = 1.0 - rust;
  s.rough = mix(0.75, 1.5, rust);
  s.h = rust * (0.002 * r2 + 0.0015 * pits);
  s.tint = 0.9 + 0.2 * (r2 - 0.5);
  s.ao = 1.0 - 0.25 * rust * pits;
  return s;
}

// 鍍鋅鋼：一片一片亮度不同的鋅花、淡淡的拉絲、少量白鏽。
Surf galvanized(vec2 uv) {
  Surf s = blank();
  vec3 sp = cells(uv, 14, 50u);
  vec3 sp2 = cells(uv, 30, 51u);
  float streak = vnoise2(uv, ivec2(160, 3), 52u);
  float white = smoothstep(0.62, 0.82, fbm(uv, 5, 4, 53u));
  s.tint = 0.86 + 0.22 * sp.y + 0.1 * (sp2.y - 0.5) + 0.06 * (streak - 0.5);
  s.rough = 0.8 + 0.5 * sp2.y + 0.2 * (streak - 0.5);
  s.metal = 1.0 - 0.3 * white;
  s.over = vec3(0.6, 0.62, 0.62);
  s.cov = 0.3 * white;
  s.h = 0.0004 * sp.y;
  return s;
}

// 瓦楞鐵皮：16 道波（沿 v 變化：貼在牆上是橫的），搭接縫、谷底積的鏽。
Surf corrugated(vec2 uv) {
  Surf s = blank();
  float w = sin(uv.y * 6.2831853 * 16.0);
  float seam = smoothstep(0.006, 0.002, abs(fract(uv.x + 0.5) - 0.5));
  float rust = smoothstep(0.55, 0.8, fbm(uv, 5, 5, 60u)) * (0.3 + 0.7 * smoothstep(0.2, -0.6, w));
  s.h = 0.0065 * w;
  s.ao = 0.72 + 0.28 * smoothstep(-1.0, 0.4, w);
  s.tint = 0.92 + 0.12 * (fbm(uv, 8, 3, 62u) - 0.5) - 0.25 * seam + 0.05 * w;
  s.over = vec3(0.3, 0.13, 0.05);
  s.cov = 0.6 * rust;
  s.metal = 1.0 - 0.6 * rust;
  s.rough = 1.0 + 0.5 * rust;
  return s;
}

// 磚：6 塊 × 20 皮的順砌；每塊磚明暗不同、少數燒得較深，灰縫凹下去。
Surf brick(vec2 uv) {
  Surf s = blank();
  const float cols = 6.0;
  const float rows = 20.0;
  float row = floor(uv.y * rows);
  vec2 p = vec2(uv.x * cols + mod(row, 2.0) * 0.5, uv.y * rows);
  ivec2 id = ivec2(int(mod(floor(p.x), cols)), int(row));
  vec2 f = fract(p);
  // 到磚緣的距離（公釐）：一塊磚連灰縫 213 × 64 mm。
  vec2 edge = min(f, 1.0 - f) * vec2(213.0, 64.0);
  float d = min(edge.x, edge.y);
  float mortar = smoothstep(6.5, 4.0, d);
  float face = smoothstep(4.0, 9.0, d);
  float rnd = hash(id, 70u);
  float grain = fbm(uv, 64, 4, 72u);
  float mott = fbm(uv, 12, 3, 73u);
  s.tint = (0.78 + 0.36 * rnd) * (0.9 + 0.2 * (grain - 0.5)) * (0.94 + 0.12 * mott);
  s.tint *= hash(id, 71u) > 0.86 ? 0.68 : 1.0;
  s.over = vec3(0.52, 0.5, 0.46) * (0.85 + 0.3 * fbm(uv, 48, 3, 74u));
  s.cov = mortar;
  s.h = face * (0.0035 + 0.001 * rnd) + 0.0012 * grain * face;
  s.ao = mix(0.62, 1.0, face);
  s.rough = 1.0 + 0.1 * (grain - 0.5);
  return s;
}

// 玻璃：幾乎乾淨，只有淡淡的指紋與灰塵把局部磨霧。
Surf glass(vec2 uv) {
  Surf s = blank();
  float smudge = smoothstep(0.5, 0.8, fbm(uv, 5, 4, 80u));
  float dust = fbm(uv, 48, 3, 81u);
  s.rough = 1.0 + 1.6 * smudge + 0.5 * (dust - 0.5);
  s.tint = 1.0 + 0.1 * smudge;
  return s;
}

// 輪胎：下半張（v < 0.5）是胎面的人字溝，上半張是胎壁的同心稜線與一圈凸字。
Surf tire(vec2 uv) {
  Surf s = blank();
  float grain = fbm(uv, 64, 3, 90u);
  if (uv.y < 0.5) {
    float a = abs(uv.y * 2.0 - 0.5);
    float sipe = smoothstep(0.12, 0.06, abs(fract(uv.x * 4.0 + a * 1.4) - 0.5));
    float rib = smoothstep(0.03, 0.015, abs(a - 0.17));
    float block = 1.0 - max(sipe, rib);
    s.tint = mix(0.45, 1.0, block) * (0.92 + 0.16 * grain);
    s.ao = mix(0.5, 1.0, block);
  } else {
    float v = (uv.y - 0.5) * 2.0;
    float ring = smoothstep(0.02, 0.008, abs(v - 0.22)) + smoothstep(0.02, 0.008, abs(v - 0.8));
    float cell = floor(uv.x * 24.0);
    float fx = fract(uv.x * 24.0);
    float letter = step(0.45, hash(ivec2(int(cell), 3), 91u)) * step(0.15, fx) * step(fx, 0.8)
      * step(0.42, v) * step(v, 0.62);
    float tick = step(0.86, v) * step(fract(uv.x * 32.0), 0.5);
    s.tint = 0.92 + 0.3 * letter + 0.25 * ring - 0.3 * tick + 0.1 * (grain - 0.5);
    s.rough = 1.0 - 0.15 * letter;
    s.ao = 1.0 - 0.3 * tick;
  }
  return s;
}

// 車漆：清漆底下的金屬片（每一片的法線各自歪一點、亮度略有不同）＋很淡的橘皮。
Surf carPaint(vec2 uv) {
  Surf s = blank();
  // 兩層金屬片：2 mm 的細片（近看才分得出來）＋少數 6 mm 的大片（幾步之外仍看得到零星的亮點）。
  vec3 fl = cells(uv, 110, 100u);
  float flake = smoothstep(0.5, 0.25, fl.x);
  float a = fl.y * 6.2831853;
  vec3 big = cells(uv, 36, 101u);
  float bigFlake = smoothstep(0.42, 0.22, big.x) * step(0.55, big.y);
  float b = big.y * 91.7;
  s.nrm = flake * vec2(cos(a), sin(a)) * (0.25 + 0.75 * fract(fl.y * 7.31))
    + 0.5 * bigFlake * vec2(cos(b), sin(b));
  s.tint = 1.0 + 0.1 * flake * (fract(fl.y * 13.7) - 0.4) + 0.09 * bigFlake * (fract(big.y * 5.3) - 0.3);
  s.rough = 1.0 + 0.25 * flake * (fract(fl.y * 3.3) - 0.5) - 0.2 * bigFlake;
  s.h = 0.0005 * fbm(uv, 10, 2, 102u);
  return s;
}

// 塑膠：咬花的細顆粒＋少量刮痕。
Surf plastic(vec2 uv) {
  Surf s = blank();
  vec3 g = cells(uv, 90, 110u);
  s.h = 0.0012 * smoothstep(0.6, 0.1, g.x);
  s.tint = 0.96 + 0.08 * g.y;
  s.rough = 0.95 + 0.15 * g.y + 0.2 * smoothstep(0.6, 0.8, fbm(uv, 6, 4, 111u));
  return s;
}

// 鉻：鏡面，只有兩個方向的細刮痕把反光拉霧一點。
Surf chrome(vec2 uv) {
  Surf s = blank();
  float sc = vnoise2(uv, ivec2(3, 220), 120u);
  float sc2 = vnoise2(uv, ivec2(200, 4), 121u);
  s.rough = 0.85 + 0.9 * smoothstep(0.7, 0.95, sc) + 0.5 * smoothstep(0.75, 0.95, sc2);
  return s;
}

// 塗裝鋼：平滑的漆面、淡淡的橘皮、零星的掉漆（露出鏽或底漆）、垂直的水痕。
Surf paintedMetal(vec2 uv) {
  Surf s = blank();
  float peel = fbm(uv, 40, 3, 130u);
  vec3 cc = cells(uv, 22, 132u);
  float chip = smoothstep(0.66, 0.72, fbm(uv, 10, 5, 131u)) * smoothstep(0.35, 0.2, cc.x);
  float streak = vnoise2(uv, ivec2(48, 2), 133u);
  s.over = mix(vec3(0.3, 0.13, 0.06), vec3(0.42, 0.4, 0.38), step(0.5, cc.y));
  s.cov = chip;
  s.tint = 0.95 + 0.14 * (fbm(uv, 5, 3, 134u) - 0.5) - 0.07 * smoothstep(0.6, 0.9, streak);
  s.rough = 1.0 + 0.6 * chip + 0.15 * (peel - 0.5);
  s.h = 0.0005 * peel - 0.0015 * chip;
  return s;
}

// 粉刷牆：粗顆粒的抹面、大片的色斑、幾道髮絲裂紋。
Surf plaster(vec2 uv) {
  Surf s = blank();
  float b = fbm(uv, 48, 4, 140u);
  vec3 c = cells(uv, 80, 141u);
  float bump = smoothstep(0.5, 0.1, c.x);
  float mott = fbm(uv, 4, 5, 142u);
  vec3 cr = cells(uv, 5, 143u);
  float crack = smoothstep(0.012, 0.004, cr.z) * smoothstep(0.5, 0.7, fbm(uv, 3, 3, 144u));
  s.h = 0.002 * b + 0.0012 * bump - 0.004 * crack;
  s.tint = 0.93 + 0.16 * (mott - 0.5) + 0.08 * (b - 0.5) - 0.3 * crack;
  s.ao = 1.0 - 0.4 * crack - 0.08 * (1.0 - bump);
  return s;
}

// 髒污疊加（四個色版）：r 髒斑、g 垂直的雨痕、b 油漬、a 舊輪胎痕。
vec4 overlays(vec2 uv) {
  float grime = smoothstep(0.42, 0.75, fbm(uv, 4, 6, 150u));
  float column = vnoise2(uv, ivec2(72, 1), 151u);
  float streak = smoothstep(0.55, 0.9, column) * smoothstep(0.25, 0.7, vnoise2(uv, ivec2(9, 2), 153u));
  vec3 oc = cells(uv, 5, 154u);
  float blob = smoothstep(0.34, 0.1, oc.x + 0.18 * (fbm(uv, 24, 3, 155u) - 0.5)) * step(0.45, oc.y);
  vec3 sp = cells(uv, 40, 156u);
  float splat = smoothstep(0.25, 0.1, sp.x) * step(0.9, sp.y) * smoothstep(0.6, 0.3, oc.x);
  float oil = max(blob * (0.5 + 0.5 * oc.y), splat * 0.7);
  float track = abs(fract((uv.x + 0.06 * sin(uv.y * 6.2831853 + 1.3)) * 2.0) - 0.5);
  float mark = smoothstep(0.012, 0.007, abs(track - 0.2))
    * smoothstep(0.45, 0.6, vnoise2(uv, ivec2(2, 5), 157u))
    * (0.6 + 0.4 * fbm(uv, 96, 2, 158u));
  return vec4(grime, streak, oil, mark);
}

Surf surfaceAt(int id, vec2 uv) {
  if (id == 0) return asphalt(uv, 0.0);
  if (id == 1) return asphalt(uv, 1.0);
  if (id == 2) return concrete(uv);
  if (id == 3) return epoxy(uv);
  if (id == 4) return wornPaint(uv);
  if (id == 5) return rustedIron(uv);
  if (id == 6) return galvanized(uv);
  if (id == 7) return corrugated(uv);
  if (id == 8) return brick(uv);
  if (id == 9) return glass(uv);
  if (id == 10) return tire(uv);
  if (id == 11) return carPaint(uv);
  if (id == 12) return plastic(uv);
  if (id == 13) return chrome(uv);
  if (id == 14) return paintedMetal(uv);
  return plaster(uv);
}
`;function dg(e){return`
precision highp float;
precision highp int;
in vec2 vUv;
uniform int uSurface;
uniform float uTexel;
layout(location = 0) out vec4 oColor;
layout(location = 1) out vec4 oOrm;
${e?`layout(location = 2) out vec4 oNormal;`:``}
${lg}
${ug}
void main() {
  if (uSurface == ${sg}) {
    oColor = overlays(vUv);
    oOrm = vec4(1.0, 0.5, 1.0, 0.5);
    ${e?`oNormal = vec4(0.5, 0.5, 1.0, 0.5);`:``}
    return;
  }
  Surf s = surfaceAt(uSurface, vUv);
  oColor = vec4(clamp(s.over, 0.0, 1.0), clamp(s.cov, 0.0, 1.0));
  oOrm = vec4(clamp(s.ao, 0.0, 1.0), clamp(s.rough * 0.5, 0.0, 1.0), clamp(s.metal, 0.0, 1.0), clamp(s.tint * 0.5, 0.0, 1.0));
  ${e?`// 法線：高度在一個像素的距離上的斜率，再加上金屬片自己的偏移。
  float hU = surfaceAt(uSurface, vUv + vec2(uTexel, 0.0)).h;
  float hV = surfaceAt(uSurface, vUv + vec2(0.0, uTexel)).h;
  vec2 slope = clamp(vec2(s.h - hU, s.h - hV) / uTexel, -2.0, 2.0);
  vec3 n = normalize(vec3(slope + s.nrm, 1.0));
  oNormal = vec4(n * 0.5 + 0.5, clamp(s.h * 100.0 + 0.5, 0.0, 1.0));`:``}
}
`}function fg(e,t,n,r){let i=new cl(new Uint8Array([e,t,n,r]),1,1,ia,Ui);return i.wrapS=Pi,i.wrapT=Pi,i.magFilter=Bi,i.needsUpdate=!0,i}var pg={color:fg(0,0,0,0),orm:fg(255,128,255,128),normal:fg(128,128,255,128),overlay:fg(0,0,0,0)},mg=new Map(tg.map(e=>[e,{color:{value:pg.color},orm:{value:pg.orm},normal:{value:pg.normal}}]));function hg(e){let t=mg.get(e);if(t===void 0)throw Error(`材質庫沒有這種表面：${e}`);return t}var gg={value:pg.overlay},_g={value:0};function vg(e){_g.value=Math.min(Math.max(e,0),1)}var yg={normals:!1,triplanarBlend:!1};function bg(){return yg}var xg=new WeakMap;function Sg(e){tg.forEach(t=>{let n=e.targets.get(ig(t)),r=hg(t);r.color.value=n?.textures[0]??pg.color,r.orm.value=n?.textures[1]??pg.orm,r.normal.value=(e.normals?n?.textures[2]:void 0)??pg.normal}),gg.value=e.targets.get(sg)?.textures[0]??pg.overlay}function Cg(e,t){let n=new Set([...e].map(ig));return n.add(sg),[...n].filter(e=>!t.has(e)).sort((e,t)=>e-t)}function wg(e){yg.normals=e.normals,yg.triplanarBlend=e.triplanarBlend}function Tg(e,t,n=tg){wg(t);let r=xg.get(e);(r===void 0||r.sizePx!==t.textureSizePx||r.normals!==t.normals)&&(r?.targets.forEach(e=>{e.dispose()}),r={sizePx:t.textureSizePx,normals:t.normals,targets:new Map},xg.set(e,r));let i=Cg(n,r.targets);if(i.length===0){Sg(r);return}let a=t.textureSizePx,o=Math.min(e.capabilities.getMaxAnisotropy(),t.maxAnisotropy),s=new Md({glslVersion:lo,vertexShader:cg,fragmentShader:dg(t.normals),uniforms:{uSurface:{value:0},uTexel:{value:1/a}},depthTest:!1,depthWrite:!1}),c=new al(new _d(2,2),s);c.frustumCulled=!1;let l=new Vs;l.add(c);let u=new xf(-1,1,1,-1,0,1),d=e.getRenderTarget();for(let n of i){let i=new ts(a,a,{count:t.normals?3:2,depthBuffer:!1,generateMipmaps:!0,minFilter:Hi,magFilter:Bi,wrapS:Pi,wrapT:Pi,anisotropy:o});s.uniforms.uSurface={value:n},e.setRenderTarget(i),e.render(l,u),r.targets.set(n,i)}e.setRenderTarget(d),c.geometry.dispose(),s.dispose(),Sg(r)}function Eg(e){let t=xg.get(e);return t===void 0?[]:tg.filter(e=>t.targets.has(ig(e)))}function Dg(e){let t=xg.get(e);if(t===void 0)return;let n=new Uint8Array(t.sizePx*t.sizePx*4),r=0;return[...t.targets.entries()].sort(([e],[t])=>e-t).map(([,e])=>e).forEach(i=>{for(let a=0;a<i.textures.length;a+=1){e.readRenderTargetPixels(i,0,0,t.sizePx,t.sizePx,n,void 0,a);for(let e=0;e<n.length;e+=1)r=Math.imul(r,31)+(n[e]??0)|0}}),r>>>0}var Og={toneMappingExposure:1},kg={low:{level:`low`,materials:{textureSizePx:128,normals:!1,triplanarBlend:!1,maxAnisotropy:2},tireMarks:{maxSegments:60,lifetimeS:6},particles:{dust:0,leaves:0},headlights:{groundPool:!1,spotLights:0},maxPixelRatio:1,toneMapping:`agx`,shadowMapSize:1024,msaaSamples:4,skyCubeSizePx:256,ambientOcclusion:null,bloom:null,lens:null,smaa:!1,ground:{textureSizePx:512,maxAnisotropy:2,normals:!1,wetness:!1},vehicleDetail:`low`,props:{parkedCars:5,lampHeads:4,realLights:0,lightCones:!1,pillars:4,buildings:5,trees:5,bushes:6,fencePostSpacingM:V(20),detailFraction:.3,detailShadows:!1,meshDetail:`low`}},medium:{level:`medium`,materials:{textureSizePx:256,normals:!0,triplanarBlend:!1,maxAnisotropy:4},tireMarks:{maxSegments:160,lifetimeS:10},particles:{dust:64,leaves:36},headlights:{groundPool:!0,spotLights:0},maxPixelRatio:1.5,toneMapping:`agx`,shadowMapSize:2048,msaaSamples:4,skyCubeSizePx:512,ambientOcclusion:null,bloom:null,lens:{vignette:.24,chromaticAberration:0},smaa:!1,ground:{textureSizePx:1024,maxAnisotropy:4,normals:!1,wetness:!0},vehicleDetail:`low`,props:{parkedCars:10,lampHeads:8,realLights:0,lightCones:!0,pillars:8,buildings:9,trees:10,bushes:14,fencePostSpacingM:V(12),detailFraction:.6,detailShadows:!1,meshDetail:`low`}},high:{level:`high`,materials:{textureSizePx:512,normals:!0,triplanarBlend:!0,maxAnisotropy:8},tireMarks:{maxSegments:360,lifetimeS:16},particles:{dust:110,leaves:100},headlights:{groundPool:!0,spotLights:1},maxPixelRatio:2,toneMapping:`agx`,shadowMapSize:4096,msaaSamples:4,skyCubeSizePx:1024,ambientOcclusion:{radiusM:.6,samples:12,denoiseSamples:12,intensity:.85},bloom:{strength:.18,radius:.5,threshold:1.8},lens:{vignette:.4,chromaticAberration:.0012},smaa:!1,ground:{textureSizePx:1024,maxAnisotropy:8,normals:!0,wetness:!0},vehicleDetail:`high`,props:{parkedCars:22,lampHeads:15,realLights:3,lightCones:!0,pillars:8,buildings:14,trees:20,bushes:28,fencePostSpacingM:V(8),detailFraction:1,detailShadows:!0,meshDetail:`high`}},ultra:{level:`ultra`,materials:{textureSizePx:1024,normals:!0,triplanarBlend:!0,maxAnisotropy:16},tireMarks:{maxSegments:600,lifetimeS:24},particles:{dust:160,leaves:160},headlights:{groundPool:!0,spotLights:2},maxPixelRatio:2,toneMapping:`agx`,shadowMapSize:4096,msaaSamples:4,skyCubeSizePx:2048,ambientOcclusion:{radiusM:.75,samples:24,denoiseSamples:16,intensity:1},bloom:{strength:.24,radius:.6,threshold:1.6},lens:{vignette:.4,chromaticAberration:.0012},smaa:!0,ground:{textureSizePx:2048,maxAnisotropy:16,normals:!0,wetness:!0},vehicleDetail:`high`,props:{parkedCars:30,lampHeads:19,realLights:5,lightCones:!0,pillars:8,buildings:18,trees:28,bushes:40,fencePostSpacingM:V(8),detailFraction:1,detailShadows:!0,meshDetail:`high`}}},Ag={shadowLift:{r:0,g:.0025,b:.007},highlightTint:{r:1,g:.955,b:.88},saturation:1.3,contrast:1.1,contrastPivot:.18},jg={fovDeg:40,nearM:V(2),farM:V(1500),offsetHeightM:V(45),offsetBackM:V(55),followTimeConstantS:.25},Mg={topHeightM:V(150),spotLowLateralM:V(-17),spotLowAheadM:V(15),spotLowHeightM:V(4.5),spotLowLookAtHeightM:V(2)},Ng={opacity:.3,fadeSeconds:.2,sightMarginM:V(.7),cameraClearanceM:V(1.5),targetInset:.8,targetHeightRatio:.6,minHeightM:V(3.45)},Pg={farM:V(1500),headingFollowSpeedMps:je(1),headingTimeConstantS:.35,reverseHeadingTimeConstantS:2,positionTimeConstantS:.14,lookAtTimeConstantS:.08,chaseNear:{fovDeg:58,nearM:V(1),behindRearM:V(11),heightM:V(5.5),lookAtHeightM:V(4)},chaseFar:{fovDeg:45,nearM:V(2),behindRearM:V(30),heightM:V(22),lookAtHeightM:V(2)},hood:{fovDeg:65,nearM:V(.25),lateralM:0,heightM:V(3.55),aheadM:V(4.2),pitchDownRad:H(5)},cockpit:{fovDeg:72,nearM:V(.25),lateralM:V(-1.3),heightM:V(3.8),aheadM:V(-.8),pitchDownRad:H(3)},top:{fovDeg:50,nearM:V(2),heightM:V(70)}},Fg={farM:V(600),mirror:{fovDeg:42,nearM:.05,outboardM:.04,heightM:V(3.25),aheadM:V(1.45),yawOutRad:H(12),pitchDownRad:H(7)},rear:{fovDeg:96,nearM:.05,behindRearM:.03,heightM:V(3),pitchDownRad:H(32)},bird:{heightM:20,halfDepthM:V(19),clipAboveGroundM:V(10.5)},quality:{low:{resolutionScale:.5,msaaSamples:0,viewsPerFrame:2},medium:{resolutionScale:1,msaaSamples:0,viewsPerFrame:2},high:{resolutionScale:1,msaaSamples:4,viewsPerFrame:4},ultra:{resolutionScale:1,msaaSamples:4,viewsPerFrame:4}}},Ig={backgroundColor:1777187,floorColor:3817029,floorRoughness:.9,floorRadiusM:V(30),floorSegments:96,directionToKeyLight:{x:.45,y:1,z:-.75},keyLightColor:16773599,keyLightIntensity:3.4,cameraAzimuthDeg:38,cameraElevationDeg:24,fitScale:.9},Lg={warmupFrames:30,minMeasuredFrames:10,lowFraction:.01,decimals:1},Rg={turbidity:3,rayleigh:3,mieCoefficient:.003,mieDirectionalG:.85,cloudCoverage:.42,cloudDensity:.5,cloudElevation:.5,cloudScale:2e-4,sunDiscIntensity:.004,intensity:.35,environmentIntensity:.4,environmentCubeSizePx:256},zg={color:9798274,nearM:V(120),farM:V(700),hazeTopDeg:9,groundFadeDeg:12,groundColor:3880241},Bg={skyColor:10466528,groundColor:7033412,intensity:.25},Vg={color:16759178,intensity:8,azimuthDeg:-32,elevationDeg:9,distanceM:V(160),shadowHalfExtentM:V(45),shadowNearM:V(20),shadowFarM:V(320),shadowBias:-4e-4,shadowNormalBias:.03,shadowNormalBiasTexels:1.2,shadowBiasPerCasterHeight:.4,lotShadowMarginM:V(18),lotShadowMaxHeightM:V(27),lotShadowDepthMarginM:V(10),lotShadowCasterHeightM:V(70),buildingShadowReachM:V(60)},Hg={vignetteInner:.85,vignetteOuter:2.1,aoDenoiseRadiusPx:8,readyTimeoutMs:2e3},Ug={sizeM:V(2400),roughness:.93,baseColor:6119010,layers:{fineGrain:{periodM:V(13.7),angleDeg:0},coarseGrain:{periodM:V(47.3),angleDeg:27.3},macroA:{periodM:V(347),angleDeg:61.7},macroB:{periodM:V(113),angleDeg:-38.9},cracks:{periodM:V(43.9),angleDeg:14.2},stains:{periodM:V(61.3),angleDeg:-53.3},stainStreaks:{periodM:V(35.3),angleDeg:-8.3},wetness:{periodM:V(187),angleDeg:43.1}},fineGrainContrast:.5,coarseGrainContrast:.62,macroAContrast:.26,macroBContrast:.2,dustTint:{r:1.08,g:1.04,b:.97},crackMaskStart:.5,crackMaskEnd:.66,crackDarken:.78,crackWarp:.035,stainStart:.74,stainEnd:.9,stainTint:{r:.45,g:.43,b:.42},stainRoughness:.7,stainWarpScale:3.7,stainWarp:.05,stainStreakStretch:6,stainStreakWeight:.24,stainSmearM:V(16),stainSplatterScale:2.9,stainSplatterWeight:.16,stainMacroAWeight:.25,stainMacroBWeight:.2,stainDriftM:V(140),wetStart:.64,wetEnd:.84,wetDarken:.28,wetRoughness:.62,puddleStart:.87,puddleEnd:.91,puddleRoughness:.2,wetWarp:.016,fineGrainHeightM:.0011,coarseGrainHeightM:.004,crackDepthM:.006,normalFadeStartM:V(60),normalFadeEndM:V(220)},Wg={grainAmplitude:.24,mottleAmplitude:.2,mottleCells:96,stoneChance:.02,stoneBrighten:.42,pitChance:.015,pitDarken:.36,patchCells:[4,9,19],patchWeights:[.5,.3,.2],crackCells:6,crackJitter:.85,crackHalfWidth:.0016,crackWarp:.02,crackWarpCells:13,crackBreakCells:7,crackBreakStart:.5,crackBreakEnd:.68,blotchCells:[5,13,31],blotchWeights:[.55,.3,.15]},Gg={lineWidthM:V(1/3),liftM:V(.03),color:15000278,roughness:.82,chipSizeM:V(.42),chipLacunarity:3.1,patchSizeM:V(2.6),baseWear:.22,patchWear:.3,edgeWear:.26,tireWear:.34,chipSoftness:.05,tireTrackOffsetM:V(2.6),tireTrackHalfWidthM:V(.55),fadeMin:.62,opacity:.94},Kg={color:16755482,parkedColor:3530874,heightM:V(3.2),liftM:V(.06),wallOpacity:.85,wallFalloff:1.7,wallLayers:6,groundBandM:V(2.2),groundOpacity:.6,pulseDepth:.3,pulsePeriodS:1.8,greenSeconds:.2,greenHoldSeconds:.7,fadeSeconds:.8},qg={halfWidthM:V(84),aheadOfSpotM:V(4.5),behindSpotM:V(150),widthM:V(.5),heightM:V(.5),color:10131085,roughness:.9},Jg={lengthM:V(6),baseDepthM:V(.65),topDepthM:V(.4),heightM:V(.36),gapFromSpotM:V(.3),color:11906452,roughness:.86},X={groundClearanceM:V(.65),lowerBodyHeightM:V(2),mirrorOverhangM:V(.25),planTaper:.07,hoodLengthM:V(4.6),trunkLengthM:V(2.3),noseDropM:V(.34),deckRiseM:V(.2),tailDropM:V(.12),windshieldRakeM:V(2.45),rearWindowRakeM:V(2.3),crownM:V(.09),shoulderInsetM:V(.25),tumblehomeM:V(.38),roofRailM:V(.15),pillarHalfWidthM:V(.14),bPillarBehindHeaderM:V(1.45),noseDepthM:V(.75),tailDepthM:V(.65),endExponent:6.5,bodyEndInsetM:V(.11),wheelRadiusM:V(1.1),wheelWidthM:V(.75),rimRadiusM:V(.72),archGapM:V(.2),wheelTuckM:V(.06),treadDepthM:V(.035),rimSpokes:5,dashboardHeightM:V(.1),dashboardLengthM:V(1.5),dashboardInsetM:V(.08),steeringWheelRadiusM:V(.58),steeringWheelTiltRad:H(24),steeringRatio:8,rearViewMirror:{sizeM:{x:.22,y:.07,z:.03},aheadOfHeaderM:.1,belowGlassM:.07,yawRad:.3,tiltRad:.1,rimM:.006,bezelM:.008,stemM:.016,mountAheadOfHeaderM:.03},bodyColor:2057139,bodyRoughness:.32,bodyMetalness:.4,clearcoat:1,minGlossRoughness:.12,hoodViewPaint:{metalness:.1,specularIntensity:.25,clearcoat:.15,clearcoatRoughness:.3,envMapIntensity:.7},glassColor:858144,glassOpacity:.48,trimColor:1382170,trimRoughness:.7,headlinerColor:10130312,headlinerEmissiveIntensity:.16,cabinTrimColor:3816770,cabinTrimEmissiveIntensity:.08,dashboardColor:3159356,dashboardRoughness:.85,dashAccentColor:9278620,seatColor:4866104,gaugeColor:10474738,gaugeEmissiveIntensity:.55,screenColor:2837864,screenEmissiveIntensity:.5,tireColor:1513498,tireRoughness:.92,rimColor:12896719,rimRoughness:.28,rimMetalness:.9,mirrorGlassColor:14673646,chromeColor:13225684,chromeRoughness:.22,plateColor:15658212,plateRoughness:.6,headlightColor:16774096,headlightEmissiveIntensity:2.3,taillightColor:14684696,taillightEmissiveIntensity:.9,brakeLightEmissiveIntensity:4,reverseLightOffColor:9278364,reverseLightColor:16054015,reverseLightEmissiveIntensity:3},Yg={low:{stationStepM:.34,archSegments:6,endScales:[.975,.92,.8,.45,0],wheelSegments:20},high:{stationStepM:.16,archSegments:12,endScales:[.992,.97,.94,.9,.84,.72,.4,0],wheelSegments:40}},Z={corridorHalfWidthM:V(9),corridorBehindStartM:V(14),corridorPastSpotM:V(2),spotMarginM:V(1.5),cameraClearRadiusM:V(12),cameraClearHalfAngleRad:H(50),aisleHalfWidthStalls:1.5,islandBehindSpotM:V(73),carJitterLateralM:V(.45),carJitterLengthwiseM:V(.7),carJitterHeadingRad:H(2.5),carReversedChance:.22,carColors:[14277340,11120051,1842464,4869458,9312796,3099194,12167562,6957602,15262938],carRoughness:.36,carMetalness:.45,lampHeightM:V(22),lampPoleRadiusM:V(.3),lampArmLengthM:V(6),lampHeadSizeM:{x:V(1.5),y:V(.45),z:V(3)},lampColor:2895667,lampOutsideCurbM:V(2.5),lampGlowColor:16766106,lampGlowIntensity:3.2,lampConeTopRadiusM:V(.8),lampConeBottomRadiusM:V(13),lampConeColor:16763274,lampConeBrightness:{hdr:.11,direct:.04},lampPoolRadiusM:V(14),lampPoolBrightness:{hdr:.32,direct:.085},lampLightIntensity:150,lampLightDistanceM:V(75),lampLightAngleRad:H(58),lampLightPenumbra:.85,pillarSizeM:{x:V(1.6),y:V(11),z:V(1.6)},beamThicknessM:V(1.1),concreteColor:9407364,concreteRoughness:.92,fenceOutsideCurbM:V(4),fencePostSizeM:{x:V(.3),y:V(3.9),z:V(.3)},fenceRailThicknessM:V(.16),fenceRailHeightsM:[V(1.7),V(3.4)],fenceColor:4935509,buildingFloorHeightM:V(11),buildingWindowSizeM:{x:V(6.5),y:V(4.6)},buildingWindowSpacingM:V(11),buildingWindowLitChance:.36,buildingWindowLitColor:{r:1.25,g:.9,b:.5},buildingWindowDarkColor:{r:.045,g:.055,b:.075},buildingColors:[7301734,8222316,5988456,9077112,6778484,7694946],buildingRoughness:.95,buildingSunGapDeg:15,trunkColor:4864556,foliageColors:[4020782,4876851,3428396,5664568],foliageRoughness:.95,stallLineColor:12434352,stallLineHeightM:V(.02),binColor:3100479,binLidColor:2435116,trafficConeColor:14833436,trafficConeStripeColor:15328988,trafficConeBaseColor:1776670,signPoleColor:9146518,signPlateColor:1920936,signMarkColor:15329764,drainColor:2500651},Xg={lampOffsetM:V(2),color:16769712,poolLiftM:V(.07),frontPool:{lengthM:V(40),halfWidthM:V(11),lobeOffsetM:V(2),nearSpreadM:V(1.1),farSpreadM:V(6),riseM:V(3.5),falloffExponent:1.4},poolBrightness:{hdr:.55,direct:.17},poolWithLightScale:.5,reversePool:{lengthM:V(11),halfWidthM:V(5.5),lobeOffsetM:0,nearSpreadM:V(1.8),farSpreadM:V(3.2),riseM:V(2),falloffExponent:1.5},reverseColor:15331327,reverseBrightness:{hdr:.16,direct:.05},lightIntensity:70,lightDistanceM:V(80),lightAngleRad:H(20),lightPenumbra:.9,lightDecay:1,lightHeightM:V(3.4),lightAheadOfNoseM:V(.3),lightAimAheadM:V(40)},Zg={widthM:V(.55),segmentLengthM:V(.9),liftM:V(.012),color:789517,opacity:.4,fadeStartFraction:.5,minReverseStepM:1e-5,teleportStepM:V(6.5)},Qg={windHeadingDeg:118,leaf:{minSizeM:V(.6),maxSizeM:V(.95),colors:[11887901,13210158,9063203,10259002,10699806],roughness:.85,minCycleS:32,maxCycleS:58,fallFraction:.1,blowFraction:.08,minHops:2,maxHops:4,restFraction:.72,fallHeightM:V(7),swayM:V(.6),minHopLengthM:V(3),maxHopLengthM:V(7),hopHeightM:V(.7),blowLengthM:V(9),blowHeightM:V(4),restLiftM:V(.05),restTiltRad:H(7),curbMarginM:V(2)},dust:{color:13615011,opacity:.34,startSizeM:V(1.3),endSizeM:V(3.8),minLifetimeS:1.1,maxLifetimeS:2,minSpeedMps:je(.6),emitPerMeterPerCapacity:.07,launchBoost:2.2,launchSpeedMps:je(5),steerBoost:1.2,spawnHeightM:V(.5),spawnSpreadM:V(.7),riseSpeedMps:.45,outwardSpeedMps:.6,trailSpeedFraction:.18,maxTrailSpeedMps:.9,dragPerSecond:.25,spriteSizePx:32,teleportStepM:V(6.5)}};function $g(e){let t=e.length;if(t===0)throw Error(`bench 沒有量到任何一幀`);let n=0,r=0,i=0;for(let t of e)n+=t.frameSeconds,r+=t.drawCalls,i=Math.max(i,t.drawCalls);let a=e.map(e=>e.frameSeconds).sort((e,t)=>t-e),o=Math.max(1,Math.floor(t*Lg.lowFraction)),s=0;for(let e of a.slice(0,o))s+=e;return{frames:t,avgFps:t/n,low1Fps:o/s,drawCallsAvg:r/t,drawCallsMax:i}}function e_(e,t){return 1-Math.exp(-e/t)}function t_(){return new vf(jg.fovDeg,1,jg.nearM,jg.farM)}function n_(e,t){let n=t_(),r=e,i=t,a=()=>{n.position.set(r,jg.offsetHeightM,i+jg.offsetBackM),n.lookAt(r,0,i)};return a(),{camera:n,update(e,t,n){let o=e_(n,jg.followTimeConstantS);r+=(e-r)*o,i+=(t-i)*o,a()}}}function r_(e,t,n,r){switch(e){case`follow`:return n_(t,n).camera;case`top`:{let e=t_();return e.position.set(r.x,Mg.topHeightM,r.z),e.up.set(0,0,-1),e.lookAt(r.x,0,r.z),e}case`spot_low`:{let e=t_(),t=ze(r.headingRad),n=Re(r.headingRad);return e.position.set(r.x+t.x*Mg.spotLowLateralM+n.x*Mg.spotLowAheadM,Mg.spotLowHeightM,r.z+t.z*Mg.spotLowLateralM+n.z*Mg.spotLowAheadM),e.lookAt(r.x,Mg.spotLowLookAtHeightM,r.z),e}}}var i_=1831565813,a_=4294967296;function o_(e){let t=e>>>0;return()=>{t=t+i_>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/a_}}var s_={sky:{...Rg,overcast:0},sun:Vg,fog:zg,hemisphere:Bg,ground:{...Ug,fallback:null},rain:0,lightning:!1,lampsOn:!0,surfaceWetness:0},c_={...s_.ground,wetStart:2,wetEnd:3,puddleStart:2,puddleEnd:3},l_={wetStart:-.3,wetEnd:.05,wetDarken:.42,wetRoughness:.42,puddleStart:.46,puddleEnd:.56,puddleRoughness:.08,fallback:{colorScale:.62,roughness:.45}},u_={...Rg,turbidity:10,rayleigh:1,cloudCoverage:.9,cloudDensity:.8,sunDiscIntensity:0,intensity:.2,environmentIntensity:.3,overcast:.86},d_={clear:{sky:{...Rg,turbidity:2,rayleigh:1.1,cloudCoverage:.22,sunDiscIntensity:.002,intensity:.3,environmentIntensity:.34,overcast:0},sun:{color:16774108,intensity:3.45,azimuthDeg:-38,elevationDeg:42},fog:{color:11124694,nearM:V(260),farM:V(1400),groundColor:4867908},hemisphere:{skyColor:12375295,groundColor:7235423,intensity:.53},ground:c_,rain:0,lightning:!1,lampsOn:!1,surfaceWetness:0},dusk:s_,rain:{sky:u_,sun:{color:12831960,intensity:.9,azimuthDeg:-32,elevationDeg:40},fog:{color:8029068,nearM:V(60),farM:V(380),groundColor:3159098},hemisphere:{skyColor:11122374,groundColor:5001045,intensity:.75},ground:l_,rain:.6,lightning:!1,lampsOn:!0,surfaceWetness:.85},wet:{sky:{...Rg,turbidity:4,rayleigh:1.6,cloudCoverage:.55,cloudDensity:.6,sunDiscIntensity:.003,intensity:.3,environmentIntensity:.5,overcast:.18},sun:{color:16769725,intensity:4.6,azimuthDeg:-32,elevationDeg:22},fog:{color:11055286,nearM:V(160),farM:V(850),groundColor:3816253},hemisphere:{skyColor:12044514,groundColor:6117456,intensity:.4},ground:{wetStart:.22,wetEnd:.5,wetDarken:.38,wetRoughness:.36,puddleStart:.52,puddleEnd:.6,puddleRoughness:.05,fallback:{colorScale:.74,roughness:.5}},rain:0,lightning:!1,lampsOn:!1,surfaceWetness:.5},storm:{sky:{...u_,intensity:.11,environmentIntensity:.17,overcast:.93},sun:{color:11187396,intensity:.4,azimuthDeg:-32,elevationDeg:40},fog:{color:4673112,nearM:V(35),farM:V(240),groundColor:1974566},hemisphere:{skyColor:8885416,groundColor:3356220,intensity:.5},ground:l_,rain:1,lightning:!0,lampsOn:!0,surfaceWetness:1},night:{sky:{...Rg,turbidity:2,rayleigh:1.4,cloudCoverage:.2,sunDiscIntensity:.012,intensity:.012,environmentIntensity:.02,overcast:0},sun:{color:9348840,intensity:.55,azimuthDeg:40,elevationDeg:38},fog:{color:725024,nearM:V(70),farM:V(420),groundColor:461071},hemisphere:{skyColor:3820152,groundColor:1315868,intensity:.32},ground:c_,rain:0,lightning:!1,lampsOn:!0,surfaceWetness:0}},f_={w1_l03:160,w1_l06:112};function p_(e,t){return(t===void 0?void 0:f_[t])??d_[e].sun.azimuthDeg}function m_(e){return d_[e]}var h_={maxStreaks:{low:0,medium:900,high:1800,ultra:3e3},boxSizeM:V(110),boxHeightM:V(42),fallSpeedMps:13,streakLengthM:V(2.6),windXMps:2.6,windZMps:1.1,color:13227750,opacity:.34},g_={firstStrikeS:2,minGapS:4,maxGapS:11,secondPulseDelayS:.16,secondPulseScale:.6,decayS:.09,durationS:.7,hemisphereBoost:2.2,environmentBoost:3,fogBlend:.3,skyBoost:1.6,flashColor:12175078};function __(e){if(e<0||e>=g_.durationS)return 0;let t=Math.exp(-e/g_.decayS),n=e-g_.secondPulseDelayS,r=n<0?0:g_.secondPulseScale*Math.exp(-n/g_.decayS);return Math.min(1,Math.max(t,r))}function v_(e){let t=o_(e),n=-1/0,r=g_.firstStrikeS;return{flashAt(e){for(;e>=r;)n=r,r+=g_.minGapS+t()*(g_.maxGapS-g_.minGapS);return __(e-n)}}}var y_=`skipAmbientOcclusion`,b_=[`paint`,`glass`,`trim`,`headlight`,`taillight`,`reverseLight`,`chrome`,`plate`,`headliner`,`cabinTrim`],x_=U.lengthM/2,S_=U.wheelbaseM/2,C_={halfWidthM:U.widthM/2-X.mirrorOverhangM,cabinHalfWidthM:U.widthM/2-X.mirrorOverhangM-X.shoulderInsetM,cowlHeightM:X.groundClearanceM+X.lowerBodyHeightM,windshieldBaseZM:-x_+X.hoodLengthM,windshieldTopZM:-x_+X.hoodLengthM+X.windshieldRakeM,rearWindowTopZM:x_-X.trunkLengthM-X.rearWindowRakeM,rearWindowBaseZM:x_-X.trunkLengthM,archRadiusM:X.wheelRadiusM+X.archGapM,bPillarZM:-x_+X.hoodLengthM+X.windshieldRakeM+X.bPillarBehindHeaderM,noseStartZM:-x_+X.bodyEndInsetM+X.noseDepthM,tailStartZM:x_-X.bodyEndInsetM-X.tailDepthM,noseTipZM:-x_+X.bodyEndInsetM,tailTipZM:x_-X.bodyEndInsetM},Q=C_,w_=Q.rearWindowTopZM-Q.windshieldTopZM,T_=.4,E_=Q.windshieldTopZM+T_*w_,D_=.975,O_=.93,k_=Q.bPillarZM,A_=Q.rearWindowTopZM+.22*X.rearWindowRakeM,j_=.035,M_=Q.noseStartZM,N_=Q.tailStartZM,P_=[M_,Q.windshieldBaseZM,Q.windshieldTopZM,Q.rearWindowTopZM,Q.rearWindowBaseZM,N_],F_=24,I_=46,L_={rockerTop:4,characterLine:7,windowBase:12,crownCrease:20},R_={rockerEnd:3,sill:13,sideGlassStart:14,sideGlassEnd:15,topStart:18},z_=.56,B_=.74;function V_(e){return Math.min(Math.max(e,0),1)}function H_(e){let t=V_(e);return t*t*(3-2*t)}function U_(e){if(e<=Q.windshieldBaseZM){let t=(Q.windshieldBaseZM-e)/(Q.windshieldBaseZM+x_);return Q.cowlHeightM-X.noseDropM*t**1.6}if(e<=Q.rearWindowBaseZM){let t=(e-Q.windshieldBaseZM)/(Q.rearWindowBaseZM-Q.windshieldBaseZM);return Q.cowlHeightM+X.deckRiseM*H_(t)}let t=(e-Q.rearWindowBaseZM)/(x_-Q.rearWindowBaseZM);return Q.cowlHeightM+X.deckRiseM-X.tailDropM*t*t}var W_=U.heightM-X.crownM-Q.cowlHeightM,G_=X.deckRiseM/W_;function K_(e){if(e<=Q.windshieldBaseZM||e>=Q.rearWindowBaseZM)return 0;if(e<Q.windshieldTopZM)return D_*(1-(1-(e-Q.windshieldBaseZM)/X.windshieldRakeM)**1.25);if(e<=Q.rearWindowTopZM){let t=(e-Q.windshieldTopZM)/w_;return t<T_?1-.025000000000000022*((T_-t)/T_)**2:1-.06999999999999995*((t-T_)/.6)**2}let t=(e-Q.rearWindowTopZM)/X.rearWindowRakeM;return G_+(O_-G_)*(1-t**1.35)}function q_(e){let t=X.groundClearanceM;for(let n of[-S_,S_]){let r=e-n;Math.abs(r)<Q.archRadiusM&&(t=Math.max(t,X.wheelRadiusM+Math.sqrt(Q.archRadiusM**2-r**2)))}return t}function J_(e){let t=Q.halfWidthM*(1-X.planTaper*Math.abs(e/x_)**3),n=q_(e),r=U_(e),i=K_(e),a=Math.max(W_*i-(r-Q.cowlHeightM),0),o=r-n,s=Math.min(.07,.3*o),c=t-X.shoulderInsetM,l=c-X.tumblehomeM*i,u=Math.min(X.roofRailM,a/2),d=r+a-u,f=(e,t)=>[c+(l-c)*e+t,r+(d-r)*e],p=a>0?Math.min(.03,.25*a)/(a-u):0,m=l-u,h=r+a,g=e=>a>0?1-e*e:e>z_?B_*(1-e)/.43999999999999995:B_+.26*(1-(e/z_)**2),_=e=>[m*e,h+X.crownM*g(e)],v=[t-.004,n+s],y=[t,n+.64*o],b=[t-.026,r-Math.min(.012,.05*o)],x=[c,r],S=_(z_);return[[0,n],[.55*t,n],[t-.06,n],[t-.016,n+.4*s],v,v,[t-.002,n+.38*o],y,y,[t-.014,n+.86*o],b,b,x,x,f(p,0),f(.55,.012*i),[l,d],[l-.293*u,h-.293*u],_(1),_(.8),S,S,_(.28),_(0)]}function Y_(e){return J_(e).slice(L_.rockerTop+1,L_.windowBase+1)}function X_(e,t){let n=J_(e).slice(L_.windowBase+1),r=Math.abs(t);for(let e=0;e+1<n.length;e+=1){let[t,i]=n[e]??[0,0],[a,o]=n[e+1]??[0,0];if(r<=t&&r>=a&&t>a)return i+(o-i)*(t-r)/(t-a)}return n[0]?.[1]??0}function Z_(e,t,n){let r=e?M_:N_,i=e?X.noseDepthM:X.tailDepthM,a=J_(r),o=((a[0]?.[1]??0)+(a[L_.windowBase]?.[1]??0))/2,s=Math.abs(t),c=n-o,l=0;for(let e=0;e+1<a.length;e+=1){let[t,n]=a[e]??[0,0],[r,i]=a[e+1]??[0,0],u=n-o,d=i-o,f=s*(d-u)-c*(r-t);if(Math.abs(f)<1e-12)continue;let p=(t*(d-u)-u*(r-t))/f,m=(t*c-u*s)/f;p>0&&m>=0&&m<=1&&(l=Math.max(l,1/p))}let u=Q_(i,Math.min(l,1));return e?Q.noseTipZM+u:Q.tailTipZM-u}function Q_(e,t){return e*(1-(1-t**X.endExponent)**(1/X.endExponent))}function $_(e){let{stationStepM:t,archSegments:n,endScales:r}=Yg[e],i=[M_,Q.windshieldBaseZM,Q.windshieldBaseZM+j_,Q.windshieldTopZM-j_,Q.windshieldTopZM,E_,k_-X.pillarHalfWidthM,k_+X.pillarHalfWidthM,Q.rearWindowTopZM,Q.rearWindowTopZM+j_,A_,Q.rearWindowBaseZM-j_,Q.rearWindowBaseZM,N_];for(let e of[-S_,S_])for(let t=0;t<=n;t+=1)i.push(e-Q.archRadiusM*Math.cos(Math.PI*t/n));i.sort((e,t)=>e-t);let a=[];for(let e of i){let n=a.at(-1);if(n===void 0){a.push(e);continue}let r=e-n;if(r<.005)continue;let i=Math.ceil(r/t);for(let e=1;e<=i;e+=1)a.push(n+r*e/i)}let o=a.flatMap(e=>P_.some(t=>Math.abs(t-e)<1e-6)?[e,e]:[e]),s=r.map(e=>({zM:Q.noseTipZM+Q_(X.noseDepthM,e),sectionZM:M_,scale:e})),c=r.map(e=>({zM:Q.tailTipZM-Q_(X.tailDepthM,e),sectionZM:N_,scale:e}));return[...s.reverse(),...o.map(e=>({zM:e,sectionZM:e,scale:1})),...c]}function ev(e,t,n){let r=(e.zM+t.zM)/2;if((e.scale+t.scale)/2<1)return`paint`;if(n<=R_.rockerEnd)return`trim`;if(!(r>Q.windshieldBaseZM&&r<Q.rearWindowBaseZM))return`paint`;if(n===R_.sill)return`trim`;if(n>=R_.sideGlassStart&&n<=R_.sideGlassEnd)return r<Q.windshieldBaseZM+j_||r>A_?`paint`:Math.abs(r-k_)<X.pillarHalfWidthM?`trim`:`glass`;if(n>=R_.topStart){let e=r>Q.windshieldBaseZM+j_&&r<Q.windshieldTopZM-j_,t=r>Q.rearWindowTopZM+j_&&r<Q.rearWindowBaseZM-j_;return e||t?`glass`:`paint`}return`paint`}function tv(e){let t=$_(e),n=new Float32Array(t.length*I_*3);t.forEach((e,t)=>{let r=J_(e.sectionZM),i=((r[0]?.[1]??0)+(r[L_.windowBase]?.[1]??0))/2;for(let a=0;a<I_;a+=1){let o=a>=F_,[s,c]=r[o?I_-a:a]??[0,0],l=(t*I_+a)*3;n[l]=(o?-s:s)*e.scale,n[l+1]=i+(c-i)*e.scale,n[l+2]=e.zM}});let r=new Map,i=(e,t,n,i)=>{let a=r.get(e)??[];a.push(t,n,i),r.set(e,a)};for(let e=0;e+1<t.length;e+=1){let n=t[e],r=t[e+1];if(n===void 0||r===void 0)continue;let a=n.zM>=Q.windshieldBaseZM-1e-6&&r.zM<=Q.rearWindowBaseZM+1e-6;for(let t=0;t<I_;t+=1){let o=(t+1)%I_,s=t<23?t:45-t,c=e*I_+t,l=e*I_+o,u=c+I_,d=l+I_,f=ev(n,r,s);if(i(f,c,l,u),i(f,l,d,u),a&&f!==`glass`){let e=s>=R_.sideGlassStart?`headliner`:`cabinTrim`;i(e,c,u,l),i(e,l,u,d)}}}let a=new Fc,o=new bc(n,3);a.setAttribute(`position`,o),a.setIndex(b_.filter(e=>e!==`headliner`&&e!==`cabinTrim`).flatMap(e=>r.get(e)??[])),a.computeVertexNormals();let s=a.getAttribute(`normal`),c=new q,l=new q;for(let e=1;e<s.count;e+=1)c.fromBufferAttribute(s,e).lengthSq()<1e-12&&(l.fromBufferAttribute(s,e-1),s.setXYZ(e,l.x,l.y,l.z));t.forEach((e,t)=>{if(!(e.scale<1||K_(e.sectionZM)<=0))for(let e of[L_.crownCrease,I_-L_.crownCrease-1]){let n=t*I_+e;c.fromBufferAttribute(s,n).add(l.fromBufferAttribute(s,n+1)).normalize(),s.setXYZ(n,c.x,c.y,c.z),s.setXYZ(n+1,c.x,c.y,c.z)}});let u=new bc(Float32Array.from(s.array,e=>-e),3),d=new Map;for(let e of b_){let t=r.get(e);if(t===void 0)continue;let n=new Fc;n.setAttribute(`position`,o),n.setAttribute(`normal`,e===`headliner`||e===`cabinTrim`?u:s),n.setIndex(t),d.set(e,n)}return d}var nv=U.wheelbaseM/2,rv=C_.halfWidthM-X.wheelTuckM-X.wheelWidthM/2;function iv(e){let t=Re(e.headingRad),n=ze(e.headingRad),r=e.x-t.x*nv,i=e.z-t.z*nv;return{left:{x:r-n.x*rv,z:i-n.z*rv},right:{x:r+n.x*rv,z:i+n.z*rv}}}function av(e,t){if(!(e<t))return 0;let n=Zg.fadeStartFraction*t,r=Math.min(Math.max((e-n)/(t-n),0),1);return Zg.opacity*(1-r*r*(3-2*r))}function ov(e){let t=e.maxSegments,n=new Float32Array(t*8),r=new Float32Array(t).fill(1/0),i=0,a,o,s=(e,a,o,s)=>{let c=Zg.widthM/2,l=ze(a),u=ze(s);n.set([e.x-l.x*c,e.z-l.z*c,e.x+l.x*c,e.z+l.z*c,o.x+u.x*c,o.z+u.z*c,o.x-u.x*c,o.z-u.z*c],i*8),r[i]=0,i=(i+1)%t};return{capacity:t,lifetimeS:e.lifetimeS,corners:n,ages:r,liveCount(){let t=0;for(let n of r)n<e.lifetimeS&&(t+=1);return t},advance(n,i){for(let n=0;n<t;n+=1){let t=(r[n]??1/0)+i;r[n]=t<e.lifetimeS?t:1/0}let c=a;if(a=n,c===void 0||t===0)return 0;let l=n.x-c.x,u=n.z-c.z,d=Re(n.headingRad),f=l*d.x+u*d.z;if(Math.hypot(l,u)>Zg.teleportStepM||f>Zg.minReverseStepM)return o=void 0,0;if(f>=-Zg.minReverseStepM)return 0;let p=iv(n);return o===void 0?(o={...p,headingRad:n.headingRad},0):Math.max(Math.hypot(p.left.x-o.left.x,p.left.z-o.left.z),Math.hypot(p.right.x-o.right.x,p.right.z-o.right.z))<Zg.segmentLengthM?0:(s(o.left,o.headingRad,p.left,n.headingRad),s(o.right,o.headingRad,p.right,n.headingRad),o={...p,headingRad:n.headingRad},2)}}}var sv=4;function cv(e){let t=ov(e),{capacity:n}=t,r=new Float32Array(n*sv*3);for(let e=1;e<r.length;e+=3)r[e]=Zg.liftM;let i=new Float32Array(n*sv*4).fill(1),a=[];for(let e=0;e<n;e+=1){let t=e*sv;a.push(t,t+1,t+2,t,t+2,t+3)}let o=new bc(r,3).setUsage(co),s=new bc(i,4).setUsage(co),c=new Fc;c.setAttribute(`position`,o),c.setAttribute(`color`,s),c.setIndex(a);let l=new al(c,new qc({color:Zg.color,vertexColors:!0,transparent:!0,depthWrite:!1,side:2}));return l.name=`tireMarks`,l.castShadow=!1,l.receiveShadow=!1,l.frustumCulled=!1,l.renderOrder=-1,l.userData[y_]=!0,l.visible=!1,{mesh:l,trail:t,update(e,a){let c=t.advance(e,a),u=l.visible;if(l.visible=t.liveCount()>0,l.visible||u){if(c>0){for(let e=0;e<n;e+=1)for(let n=0;n<sv;n+=1){let i=e*8+n*2,a=(e*sv+n)*3;r[a]=t.corners[i]??0,r[a+2]=t.corners[i+1]??0}o.needsUpdate=!0}for(let e=0;e<n;e+=1){let n=av(t.ages[e]??1/0,t.lifetimeS);for(let t=0;t<sv;t+=1)i[(e*sv+t)*4+3]=n}s.needsUpdate=!0}}}}var lv=Qg.dust;function uv(e){if(!(e>=0&&e<1))return 0;let t=Math.min(e/.15,1),n=Math.min(Math.max((e-.3)/.7,0),1);return lv.opacity*t*(1-n*n*(3-2*n))}function dv(e,t){let n=o_(t),r=()=>n()*2-1,i=new Float32Array(e*3),a=new Float32Array(e*3),o=new Float32Array(e),s=new Float32Array(e),c=new Float32Array(e).fill(1/0),l=new Float32Array(e).fill(1),u=0,d,f=0,p=(t,o,s,d)=>{let f=iv(t),p=n()<.5?-1:1,m=p<0?f.left:f.right,h=ze(t.headingRad),g=Math.min(lv.trailSpeedFraction*d,lv.maxTrailSpeedMps),_=u*3;i[_]=m.x+r()*lv.spawnSpreadM,i[_+1]=n()*lv.spawnHeightM,i[_+2]=m.z+r()*lv.spawnSpreadM;let v=p*lv.outwardSpeedMps*(.4+.6*n());a[_]=-o*g+h.x*v,a[_+1]=lv.riseSpeedMps*(.5+.5*n()),a[_+2]=-s*g+h.z*v,c[u]=0,l[u]=lv.minLifetimeS+(lv.maxLifetimeS-lv.minLifetimeS)*n(),u=(u+1)%e},m=()=>{for(let t=0;t<e;t+=1){let e=(c[t]??1/0)/(l[t]??1);e<1?(o[t]=lv.startSizeM+(lv.endSizeM-lv.startSizeM)*Math.sqrt(e),s[t]=uv(e)):(c[t]=1/0,o[t]=0,s[t]=0)}};return{capacity:e,positions:i,sizes:o,opacities:s,liveCount(){let t=0;for(let n=0;n<e;n+=1)(c[n]??1/0)<(l[n]??1)&&(t+=1);return t},advance(t,n){let r=d;if(d=t,r===void 0||e===0||n<=0)return 0;let o=lv.dragPerSecond**n;for(let t=0;t<e;t+=1)if((c[t]??1/0)!==1/0){c[t]=(c[t]??0)+n;for(let e=0;e<3;e+=1){let r=t*3+e;i[r]=(i[r]??0)+(a[r]??0)*n,a[r]=(a[r]??0)*o}}let s=0,l=t.x-r.x,u=t.z-r.z,h=Math.hypot(l,u),g=h/n;if(h<=lv.teleportStepM&&g>=lv.minSpeedMps){let n=Math.max(1-g/lv.launchSpeedMps,0),r=Math.min(Math.abs(t.steerRad)/U.maxSteerRad,1);for(f+=h*e*lv.emitPerMeterPerCapacity*(1+lv.launchBoost*n)*(1+lv.steerBoost*r),f=Math.min(f,e);f>=1;)--f,p(t,l/h,u/h,g),s+=1}return m(),s}}}function fv(e){let t=new Uint8Array(e*e*4),n=(e-1)/2;for(let r=0;r<e;r+=1)for(let i=0;i<e;i+=1){let a=Math.hypot(i-n,r-n)/(e/2),o=Math.max(1-a,0),s=(r*e+i)*4;t[s]=255,t[s+1]=255,t[s+2]=255,t[s+3]=Math.round(255*o*o*(3-2*o))}return t}var pv=`gl_PointSize = size;`;function mv(e){if(!e.includes(pv))throw Error(`灰塵著色器：找不到插入點 ${pv}`);return e.replace(`void main() {`,`attribute float dustSize;
void main() {`).replace(pv,`gl_PointSize = dustSize * projectionMatrix[ 1 ][ 1 ];`)}function hv(e,t){let n=dv(e,t),r=new Float32Array(e*4).fill(1),i=new bc(n.positions,3).setUsage(co),a=new bc(n.sizes,1).setUsage(co),o=new bc(r,4).setUsage(co),s=new Fc;s.setAttribute(`position`,i),s.setAttribute(`dustSize`,a),s.setAttribute(`color`,o);let c=new cl(fv(lv.spriteSizePx),lv.spriteSizePx,lv.spriteSizePx,ia,Ui);c.magFilter=Bi,c.minFilter=Bi,c.needsUpdate=!0;let l=new Ll({color:lv.color,map:c,vertexColors:!0,transparent:!0,depthWrite:!1,sizeAttenuation:!0});l.onBeforeCompile=e=>{e.vertexShader=mv(e.vertexShader)},l.customProgramCacheKey=()=>`dust`;let u=new Hl(s,l);return u.name=`dust`,u.castShadow=!1,u.receiveShadow=!1,u.frustumCulled=!1,u.userData[y_]=!0,u.visible=!1,{points:u,cloud:n,update(t,s){n.advance(t,s);let c=u.visible;if(u.visible=n.liveCount()>0,u.visible||c){for(let t=0;t<e;t+=1)r[t*4+3]=n.opacities[t]??0;i.needsUpdate=!0,a.needsUpdate=!0,o.needsUpdate=!0}}}}var gv=`surface`,_v=`
varying vec3 vSurfPos;
#ifndef SURF_WORLD
  varying vec3 vSurfNormal;
  varying mat3 vSurfBasis;
#endif
`,vv=`
#ifdef SURF_WORLD
  vec4 surfWorld = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    surfWorld = instanceMatrix * surfWorld;
  #endif
  vSurfPos = ( modelMatrix * surfWorld ).xyz;
#else
  vSurfPos = transformed;
  vSurfNormal = normal;
  mat3 surfBasis = mat3( modelViewMatrix );
  #ifdef USE_INSTANCING
    surfBasis = surfBasis * mat3( instanceMatrix );
  #endif
  vSurfBasis = surfBasis;
#endif
`,yv=`
varying vec3 vSurfPos;
#ifndef SURF_WORLD
  varying vec3 vSurfNormal;
  varying mat3 vSurfBasis;
#endif
uniform sampler2D uSurfColor;
uniform sampler2D uSurfOrm;
uniform sampler2D uSurfNormal;
uniform sampler2D uSurfOverlayMap;
// x = 1 ÷ 貼圖鋪一次的公尺數、y = 法線強度、z = 大尺度明暗、w = 潮濕的作用
uniform vec4 uSurfParams;
// 髒污、雨痕、油漬、舊輪胎痕
uniform vec4 uSurfOverlay;
uniform vec4 uSurfRadial;
uniform float uSurfWet;
// 蓋色（灰縫、鏽…）的明暗倍率：深色的舊磚牆灰縫也跟著暗
uniform float uSurfOverTint;
`,bv=`
float surfAo = 1.0;
{
  #ifdef SURF_WORLD
    vec3 sN = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
  #else
    vec3 sN = normalize( vSurfNormal );
  #endif
  vec3 sP = vSurfPos;
  vec3 sW = pow( abs( sN ), vec3( 6.0 ) );
  sW /= sW.x + sW.y + sW.z;
  vec3 sQ = sP * uSurfParams.x;
  vec3 sG = vec3( 0.0 );
  #if defined( SURF_RADIAL )
    // 輪胎：u 繞輪軸一圈、v 在胎面是橫向位置（貼圖下半）、在胎壁是半徑（貼圖上半）。
    // 角度在 ±180° 那一條線上會跳：改用轉半圈的另一個角度算導數，那條線上才不會取到最糊的那一層。
    float sAngA = atan( sP.z, sP.y ) / 6.2831853;
    float sAngB = atan( - sP.z, - sP.y ) / 6.2831853;
    bool sUseA = fwidth( sAngA ) <= fwidth( sAngB );
    vec2 sDu = uSurfRadial.x * ( sUseA ? vec2( dFdx( sAngA ), dFdy( sAngA ) ) : vec2( dFdx( sAngB ), dFdy( sAngB ) ) );
    float sRad = length( sP.yz );
    bool sTread = abs( sN.x ) < 0.6;
    float sV = sTread
      ? 0.5 * clamp( sP.x / ( 2.0 * uSurfRadial.y ) + 0.5, 0.03, 0.97 )
      : 0.5 + 0.5 * clamp( ( sRad - uSurfRadial.z ) / ( uSurfRadial.w - uSurfRadial.z ), 0.03, 0.97 );
    vec2 sUv = vec2( ( sAngA + 0.5 ) * uSurfRadial.x, sV );
    vec2 sDv = clamp( vec2( dFdx( sV ), dFdy( sV ) ), - 0.02, 0.02 );
    vec4 sC = textureGrad( uSurfColor, sUv, vec2( sDu.x, sDv.x ), vec2( sDu.y, sDv.y ) );
    vec4 sO = textureGrad( uSurfOrm, sUv, vec2( sDu.x, sDv.x ), vec2( sDu.y, sDv.y ) );
  #elif defined( SURF_BLEND )
    vec4 sC = texture2D( uSurfColor, sQ.zy ) * sW.x + texture2D( uSurfColor, sQ.xz ) * sW.y + texture2D( uSurfColor, sQ.xy ) * sW.z;
    vec4 sO = texture2D( uSurfOrm, sQ.zy ) * sW.x + texture2D( uSurfOrm, sQ.xz ) * sW.y + texture2D( uSurfOrm, sQ.xy ) * sW.z;
    #ifdef SURF_NORMALS
      vec2 sTx = texture2D( uSurfNormal, sQ.zy ).xy * 2.0 - 1.0;
      vec2 sTy = texture2D( uSurfNormal, sQ.xz ).xy * 2.0 - 1.0;
      vec2 sTz = texture2D( uSurfNormal, sQ.xy ).xy * 2.0 - 1.0;
      // 每個投影面的切線方向就是世界（或物件）座標軸：把三面的偏移各自放回去再混合，不需要切線、不怕鏡射。
      sG = sW.x * vec3( 0.0, sTx.y, sTx.x ) + sW.y * vec3( sTy.x, 0.0, sTy.y ) + sW.z * vec3( sTz.x, sTz.y, 0.0 );
    #endif
  #else
    // 只取樣最正對的那一面。
    bool sIsX = sW.x > max( sW.y, sW.z );
    bool sIsY = ! sIsX && sW.y > sW.z;
    vec2 sUv = sIsX ? sQ.zy : ( sIsY ? sQ.xz : sQ.xy );
    vec4 sC = texture2D( uSurfColor, sUv );
    vec4 sO = texture2D( uSurfOrm, sUv );
    #ifdef SURF_NORMALS
      vec2 sT = texture2D( uSurfNormal, sUv ).xy * 2.0 - 1.0;
      sG = sIsX ? vec3( 0.0, sT.y, sT.x ) : ( sIsY ? vec3( sT.x, 0.0, sT.y ) : vec3( sT.x, sT.y, 0.0 ) );
    #endif
  #endif

  vec3 sBase = mix( diffuseColor.rgb * ( sO.a * 2.0 ), sC.rgb * uSurfOverTint, sC.a );
  float sRough = roughnessFactor * sO.g * 2.0;
  float sMetal = metalnessFactor * sO.b;
  surfAo = sO.r;

  #ifdef SURF_OVERLAYS
    // 髒污疊加：只看最正對的那一面，用世界座標（公尺）。
    bool oIsX = sW.x > max( sW.y, sW.z );
    bool oIsY = ! oIsX && sW.y > sW.z;
    vec2 oUv = oIsX ? sP.zy : ( oIsY ? sP.xz : sP.xy );
    float oUp = ( oIsY && sN.y > 0.0 ) ? 1.0 : 0.0;
    float oMacro = texture2D( uSurfOverlayMap, oUv * 0.0437 + 0.37 ).r;
    vec4 oMask = texture2D( uSurfOverlayMap, oUv * 0.1667 );
    sBase *= 1.0 + uSurfParams.z * ( oMacro - 0.35 ) * 2.0;
    // 垂直面：牆腳 1.4 m 內的濺痕＋大片髒斑、由上往下的雨痕（潮濕時更明顯）。
    float oFoot = smoothstep( 1.4, 0.0, sP.y );
    float oDirt = uSurfOverlay.x * mix( clamp( oMask.r * 0.55 + oFoot * ( 0.35 + 0.65 * oMask.r ), 0.0, 1.0 ), oMask.r * 0.6, oUp );
    float oStreak = ( 1.0 - oUp ) * oMask.g * uSurfOverlay.y * ( 0.45 + 0.55 * uSurfWet );
    // 朝上的面：油漬（深色、比較亮）與舊輪胎痕（深色、霧面）。
    float oOil = oUp * oMask.b * uSurfOverlay.z;
    float oTire = oUp * oMask.a * uSurfOverlay.w;
    sBase = mix( sBase, sBase * vec3( 0.55, 0.52, 0.47 ), oDirt );
    sBase *= ( 1.0 - 0.45 * oStreak ) * ( 1.0 - 0.6 * oOil ) * ( 1.0 - 0.5 * oTire );
    sRough = mix( sRough, sRough * 0.55, oOil );
    sRough = mix( sRough, min( sRough * 1.2, 1.0 ), oDirt );
    sMetal *= 1.0 - 0.7 * oDirt;
    // 天氣的潮濕：朝上的面整片濕，垂直面順著雨痕濕。
    float oWet = uSurfWet * uSurfParams.w * mix( 0.3 + 0.7 * oMask.g, 1.0, oUp );
    sBase *= 1.0 - 0.3 * oWet * ( 1.0 - sMetal );
    sRough *= 1.0 - 0.55 * oWet;
  #endif

  diffuseColor.rgb = sBase * mix( 1.0, surfAo, 0.6 );
  roughnessFactor = clamp( sRough, 0.04, 1.0 );
  metalnessFactor = clamp( sMetal, 0.0, 1.0 );
  #ifdef SURF_NORMALS
    #ifdef SURF_WORLD
      normal = normalize( normal + uSurfParams.y * ( viewMatrix * vec4( sG, 0.0 ) ).xyz );
    #else
      normal = normalize( normal + uSurfParams.y * ( vSurfBasis * sG ) );
    #endif
  #endif
}
`,xv=`
reflectedLight.indirectDiffuse *= surfAo;
reflectedLight.indirectSpecular *= mix( 1.0, surfAo, 0.7 );
`;function Sv(e,t={}){let n=ng[e],r=t.space??`world`,i=t.clearcoat??n.clearcoat,a={color:t.color??n.color,roughness:t.roughness??n.roughness,metalness:t.metalness??n.metalness,...t.parameters},o=i>0?new Pd({...a,clearcoat:i,clearcoatRoughness:t.clearcoatRoughness??n.clearcoatRoughness}):new Nd(a);o.userData[gv]=e;let s={...ag,...t.overlays},c=r===`world`&&(n.macro>0||s.dirt+s.streaks+s.oil+s.tireMarks>0),l=hg(e),u=new $o(1/(t.tileM??n.tileM),n.normalScale*(t.normalScale??1),n.macro,t.wetResponse??+(r===`world`)),d=new $o(s.dirt,s.streaks,s.oil,s.tireMarks),f=new $o(...t.radial??[1,1,0,1]),p=n.normalScale>0&&r!==`radial`&&o.side!==2,m=()=>{let e=bg();return[r,e.normals&&p?`n`:``,e.triplanarBlend?`b`:``,c?`o`:``].join(`:`)};return o.onBeforeCompile=e=>{let n=bg();e.uniforms.uSurfColor=l.color,e.uniforms.uSurfOrm=l.orm,e.uniforms.uSurfNormal=l.normal,e.uniforms.uSurfOverlayMap=gg,e.uniforms.uSurfParams={value:u},e.uniforms.uSurfOverlay={value:d},e.uniforms.uSurfRadial={value:f},e.uniforms.uSurfWet=_g,e.uniforms.uSurfOverTint={value:t.overlayTint??1};let i=[r===`world`?`#define SURF_WORLD`:``,r===`radial`?`#define SURF_RADIAL`:``,n.normals&&p?`#define SURF_NORMALS`:``,n.triplanarBlend?`#define SURF_BLEND`:``,c?`#define SURF_OVERLAYS`:``].filter(e=>e!==``).join(`
`);e.vertexShader=e.vertexShader.replace(`void main() {`,`${i}\n${_v}\nvoid main() {`).replace(`#include <project_vertex>`,`#include <project_vertex>\n${vv}`),e.fragmentShader=e.fragmentShader.replace(`void main() {`,`${i}\n${yv}\nvoid main() {`).replace(`#include <normal_fragment_maps>`,`#include <normal_fragment_maps>\n${bv}`).replace(`#include <aomap_fragment>`,`#include <aomap_fragment>\n${xv}`)},o.customProgramCacheKey=()=>`surface:${m()}`,o}function Cv(e,t={}){return Sv(e,{...t,space:`world`,overlays:{...og[e],...t.overlays}})}function wv(e){let t=e.userData[gv];return typeof t==`string`?t:void 0}function Tv(e){let t=new Set;return e.traverse(e=>{if(!(e instanceof al))return;let n=Array.isArray(e.material)?e.material:[e.material];for(let e of n){let n=wv(e);n!==void 0&&t.add(n)}}),t}function Ev(e){return{minX:-qg.halfWidthM,maxX:qg.halfWidthM,minZ:-(e.lengthM/2+qg.aheadOfSpotM),maxZ:qg.behindSpotM}}function Dv(e){let t=-(e.lengthM/2+Jg.gapFromSpotM);return{minX:-Jg.lengthM/2,maxX:Jg.lengthM/2,minZ:t-Jg.baseDepthM,maxZ:t}}function Ov(e){let{widthM:t}=qg,n=Ev(e);return[{minX:n.minX,maxX:n.maxX,minZ:n.minZ-t,maxZ:n.minZ},{minX:n.minX,maxX:n.maxX,minZ:n.maxZ,maxZ:n.maxZ+t},{minX:n.minX-t,maxX:n.minX,minZ:n.minZ-t,maxZ:n.maxZ+t},{minX:n.maxX,maxX:n.maxX+t,minZ:n.minZ-t,maxZ:n.maxZ+t}]}function kv(e){let t=Dv(e),n=(Jg.baseDepthM-Jg.topDepthM)/4;return[...Ov(e).map(e=>({...e,heightM:qg.heightM})),{minX:t.minX,maxX:t.maxX,minZ:t.minZ+n,maxZ:t.maxZ-n,heightM:Jg.heightM}]}var Av=.001;function jv(e){let t=(Jg.baseDepthM-Jg.topDepthM)/4,n=[];for(let r of e){let e=r.headingRad/(Math.PI/2);if(Math.abs(e-Math.round(e))>Av)continue;let i=Math.abs(Math.round(e))%2==1,a=r.sizeX/2,o=r.sizeZ/2-t,s=i?o:a,c=i?a:o;n.push({minX:r.x-s,maxX:r.x+s,minZ:r.z-c,maxZ:r.z+c,heightM:r.sizeY})}return n}function Mv(e){let t=new Ms;return t.position.set(e.x,0,e.z),t.rotation.y=He(e.headingRad),t}function Nv(e){let{heightM:t}=qg,n=Cv(`concrete`,{color:qg.color,roughness:qg.roughness}),r=Mv(e);for(let i of Ov(e)){let e=new al(new Yl(i.maxX-i.minX,t,i.maxZ-i.minZ),n);e.position.set((i.minX+i.maxX)/2,t/2,(i.minZ+i.maxZ)/2),e.castShadow=!0,e.receiveShadow=!0,r.add(e)}return r}function Pv(){let{lengthM:e,baseDepthM:t,topDepthM:n,heightM:r}=Jg,i=new ku;return i.moveTo(-t/2,0),i.lineTo(t/2,0),i.lineTo(n/2,r),i.lineTo(-n/2,r),i.closePath(),new pd(i,{depth:e,bevelEnabled:!1}).translate(0,0,-e/2).rotateY(Math.PI/2)}function Fv(){return Cv(`concrete`,{color:Jg.color,roughness:Jg.roughness,tileM:1.9})}function Iv(e){let t=Dv(e),n=new al(Pv(),Fv());n.position.set(0,0,(t.minZ+t.maxZ)/2),n.castShadow=!0,n.receiveShadow=!0;let r=Mv(e);return r.add(n),r}var Lv=[`parkedCars`,`lamps`,`pillars`,`beams`,`buildings`,`windows`,`fencePosts`,`fenceRails`,`trees`,`bushes`,`stallLines`,`wheelStops`,`bins`,`trafficCones`,`signs`,`drains`];function Rv(e,t,n){let r=ze(e.headingRad),i=Re(e.headingRad),a=t-e.x,o=n-e.z;return{x:a*r.x+o*r.z,z:-(a*i.x+o*i.z)}}function zv(e,t,n){let r=ze(e.headingRad),i=Re(e.headingRad);return{x:e.x+r.x*t-i.x*n,z:e.z+r.z*t-i.z*n}}function Bv(e,t){let n=Rv(e,t.x,t.z),r=Math.hypot(n.x,n.z),i=r>0?-n.x/r:0,a=r>0?-n.z/r:-1,o=Mg.spotLowLateralM,s=-Mg.spotLowAheadM,c=Math.hypot(o,s);return{corridor:{fromX:n.x,fromZ:n.z,axisX:i,axisZ:a,minAlongM:-Z.corridorBehindStartM,maxAlongM:r+e.lengthM/2+Z.corridorPastSpotM,halfWidthM:Z.corridorHalfWidthM},spotRect:{minX:-e.widthM/2-Z.spotMarginM,maxX:e.widthM/2+Z.spotMarginM,minZ:-e.lengthM/2-Z.spotMarginM,maxZ:e.lengthM/2+Z.spotMarginM},camera:{x:o,z:s,dirX:-o/c,dirZ:-s/c,radiusM:Z.cameraClearRadiusM,minCos:Math.cos(Z.cameraClearHalfAngleRad)}}}var Vv=V(1.5);function Hv(e,t,n){let{corridor:r,spotRect:i,camera:a}=e,o=(t-r.fromX)*r.axisX+(n-r.fromZ)*r.axisZ,s=(t-r.fromX)*-r.axisZ+(n-r.fromZ)*r.axisX;if(o>=r.minAlongM&&o<=r.maxAlongM&&Math.abs(s)<=r.halfWidthM||t>=i.minX&&t<=i.maxX&&n>=i.minZ&&n<=i.maxZ)return!0;let c=t-a.x,l=n-a.z,u=Math.hypot(c,l);return u<=Vv||u<=a.radiusM&&c*a.dirX+l*a.dirZ>=a.minCos*u}var Uv=1;function Wv(e){let t=ze(e.headingRad),n=Re(e.headingRad),r=Math.max(2,Math.ceil(e.sizeX/Uv)),i=Math.max(2,Math.ceil(e.sizeZ/Uv)),a=[];for(let o=0;o<=r;o+=1){let s=(o/r-.5)*e.sizeX;for(let r=0;r<=i;r+=1){let o=(r/i-.5)*e.sizeZ;a.push({x:e.x+t.x*s+n.x*o,z:e.z+t.z*s+n.z*o})}}return a}function Gv(e,t){return Wv(t).some(t=>Hv(e,t.x,t.z))}function Kv(e,t,n,r=0,i=0,a=0){return{x:e,z:t,y:a,headingRad:r,sizeX:n.x,sizeY:n.y,sizeZ:n.z,variant:i}}function qv(e,t){return o_(e+7919*(Lv.indexOf(t)+1))}function Jv(e){return e()*2-1}var Yv=[{side:`n`,alongFt:46,outFt:45,widthFt:62,depthFt:40,heightFt:48},{side:`n`,alongFt:-2,outFt:64,widthFt:30,depthFt:40,heightFt:34},{side:`n`,alongFt:118,outFt:52,widthFt:70,depthFt:50,heightFt:68},{side:`e`,alongFt:-50,outFt:45,widthFt:90,depthFt:50,heightFt:52},{side:`w`,alongFt:-40,outFt:45,widthFt:80,depthFt:50,heightFt:44},{side:`n`,alongFt:185,outFt:30,widthFt:60,depthFt:60,heightFt:40},{side:`n`,alongFt:70,outFt:190,widthFt:80,depthFt:50,heightFt:115},{side:`n`,alongFt:165,outFt:170,widthFt:60,depthFt:60,heightFt:92},{side:`n`,alongFt:-120,outFt:150,widthFt:100,depthFt:50,heightFt:13},{side:`n`,alongFt:-25,outFt:240,widthFt:60,depthFt:50,heightFt:100},{side:`e`,alongFt:50,outFt:50,widthFt:60,depthFt:60,heightFt:38},{side:`w`,alongFt:60,outFt:55,widthFt:70,depthFt:60,heightFt:60},{side:`w`,alongFt:-108,outFt:80,widthFt:70,depthFt:60,heightFt:55},{side:`e`,alongFt:-130,outFt:120,widthFt:70,depthFt:70,heightFt:80},{side:`s`,alongFt:-70,outFt:50,widthFt:80,depthFt:50,heightFt:46},{side:`s`,alongFt:30,outFt:55,widthFt:70,depthFt:50,heightFt:64},{side:`s`,alongFt:125,outFt:40,widthFt:60,depthFt:60,heightFt:40},{side:`s`,alongFt:-160,outFt:45,widthFt:60,depthFt:50,heightFt:34}],Xv=[{side:`n`,alongFt:60,outFt:12},{side:`w`,alongFt:-25,outFt:12},{side:`e`,alongFt:-45,outFt:13},{side:`n`,alongFt:-68,outFt:13},{side:`e`,alongFt:-75,outFt:12},{side:`w`,alongFt:-60,outFt:13},{side:`n`,alongFt:95,outFt:10},{side:`n`,alongFt:-95,outFt:10},{side:`e`,alongFt:-18,outFt:14},{side:`w`,alongFt:15,outFt:12},{side:`n`,alongFt:28,outFt:15},{side:`e`,alongFt:10,outFt:12},{side:`n`,alongFt:-38,outFt:16},{side:`w`,alongFt:45,outFt:13},{side:`e`,alongFt:38,outFt:13},{side:`n`,alongFt:8,outFt:30},{side:`e`,alongFt:66,outFt:12},{side:`w`,alongFt:72,outFt:12},{side:`e`,alongFt:-60,outFt:24},{side:`w`,alongFt:-45,outFt:24},{side:`s`,alongFt:-15,outFt:12},{side:`s`,alongFt:45,outFt:12},{side:`s`,alongFt:-75,outFt:12},{side:`s`,alongFt:15,outFt:13},{side:`s`,alongFt:95,outFt:10},{side:`s`,alongFt:-95,outFt:10},{side:`s`,alongFt:-45,outFt:14},{side:`s`,alongFt:75,outFt:14}],Zv=[{line:`north`,stalls:1.5,headingRad:Math.PI},{line:`island`,stalls:-2.5,headingRad:0},{line:`island`,stalls:2.5,headingRad:0},{line:`north`,stalls:-3.5,headingRad:Math.PI},{line:`island`,stalls:-2.5,headingRad:Math.PI},{line:`island`,stalls:2.5,headingRad:Math.PI},{line:`north`,stalls:4.5,headingRad:Math.PI},{line:`north`,stalls:-6.5,headingRad:Math.PI},{line:`island`,stalls:6.5,headingRad:0},{line:`island`,stalls:-6.5,headingRad:0},{line:`north`,stalls:7.5,headingRad:Math.PI},{line:`island`,stalls:6.5,headingRad:Math.PI},{line:`island`,stalls:-6.5,headingRad:Math.PI},{line:`south`,stalls:1.5,headingRad:0},{line:`south`,stalls:-1.5,headingRad:0},{line:`south`,stalls:4.5,headingRad:0},{line:`south`,stalls:-4.5,headingRad:0},{line:`south`,stalls:7.5,headingRad:0},{line:`south`,stalls:-7.5,headingRad:0}],Qv=3,$v=V(5),ey=V(.8),ty=2.2;function ny(e,t){return e.slice(0,Math.max(0,Math.ceil(t)))}function ry(e,t,n,r){let i=Bv(e,t),a=Ev(e),o=e.widthM,s=e.lengthM,c=Z.islandBehindSpotM,l=(a.minX+a.maxX)/2,u=(a.minZ+a.maxZ)/2,d=e=>!Gv(i,e),f=Math.ceil(Z.aisleHalfWidthStalls+.5),p=Math.floor((a.maxX-o/2)/o),m=[{centerZ:0,headingRad:0,firstStall:1,parkingWeight:0},{centerZ:c-s/2,headingRad:Math.PI,firstStall:f,parkingWeight:1},{centerZ:c+s/2,headingRad:0,firstStall:f,parkingWeight:1.6},{centerZ:a.maxZ-s/2,headingRad:Math.PI,firstStall:f,parkingWeight:3}],h=[];for(let e of m)for(let t=e.firstStall;t<=p;t+=1)for(let n of[-1,1])h.push({x:n*t*o,z:e.centerZ,headingRad:e.headingRad,row:e,index:t});let g=qv(n,`parkedCars`),_={x:U.widthM,y:U.heightM,z:U.lengthM},v=h.filter(e=>e.index>=f).map(e=>{let t=e.row.parkingWeight+.12*e.index+2.6*g(),n=Jv(g)*Z.carJitterLateralM,r=Jv(g)*Z.carJitterLengthwiseM,i=g()<Z.carReversedChance,a=e.headingRad+(i?Math.PI:0)+Jv(g)*Z.carJitterHeadingRad;return{priority:t,placement:Kv(e.x+n,e.z+r,_,a,g())}}).sort((e,t)=>e.priority-t.priority).map(e=>e.placement).filter(d),y=Gg.lineWidthM,b=Gg.liftM,x=[],S=(e,t,n,r)=>{x.push(Kv(e,t,{x:n,y:Z.stallLineHeightM,z:r},0,0,b))};for(let e=1;e<=p;e+=1)for(let t of[-1,1]){let n=t*(e+.5)*o;S(n,0,y,s),e>=f-1&&(S(n,c,y,2*s),S(n,a.maxZ-s/2,y,s))}let C=(f-.5)*o,w=(p+.5)*o;for(let e of[-1,1])S(e*(C+w)/2,c,w-C,y);let T={x:Jg.lengthM,y:Jg.heightM,z:Jg.baseDepthM},E=Dv(e),D=(E.minZ+E.maxZ)/2,O=V(1.4),k=h.map(e=>{let t=Re(e.headingRad).z,n=e.row.centerZ===0?D:e.z+t*(s/2-O);return Kv(e.x,n,T,e.headingRad)}),A={x:2*Z.lampPoleRadiusM,y:Z.lampHeightM,z:2*Z.lampPoleRadiusM},j={north:a.minZ-Z.lampOutsideCurbM,island:c,south:a.maxZ+Z.lampOutsideCurbM},ee=Zv.filter(e=>Math.abs(e.stalls)<=p+.5).map(e=>Kv(e.stalls*o,j[e.line],A,e.headingRad)),M=[];for(let e=f-.5;e<=p+.5;e+=2)for(let t of[-1,1])M.push(Kv(t*e*o,c,Z.pillarSizeM));let N=ny(M.filter(d),r.pillars),P=[];for(let e of[-1,1]){let t=N.filter(t=>t.x*e>0).map(e=>e.x);if(t.length>=2){let e=Math.min(...t),n=Math.max(...t),r=Kv((e+n)/2,c,{x:n-e+Z.pillarSizeM.x,y:Z.beamThicknessM,z:Z.beamThicknessM},0,0,Z.pillarSizeM.y);d(r)&&P.push(r)}}let te=(e,t)=>{let n=V(e.alongFt);switch(e.side){case`n`:return{x:l+n,z:a.minZ-t};case`s`:return{x:l+n,z:a.maxZ+t};case`e`:return{x:a.maxX+t,z:u+n};case`w`:return{x:a.minX-t,z:u+n}}},ne=H(Vg.azimuthDeg)-e.headingRad,re=H(Z.buildingSunGapDeg),ie=H(Vg.elevationDeg-Qv),ae=[{x:0,z:0},{x:i.corridor.fromX,z:i.corridor.fromZ}],oe=e=>ae.some(t=>Wv(e).some(n=>{let r=n.x-t.x,i=n.z-t.z,a=Math.atan2(r,-i),o=Math.atan2(e.sizeY-$v,Math.hypot(r,i));return Math.abs(Ve(ne,a))<re&&o>ie})),se=qv(n,`buildings`),ce=ny(Yv.map(e=>{let t=e.side===`n`||e.side===`s`,n=te(e,V(e.outFt+e.depthFt/2));return Kv(n.x,n.z,{x:V(t?e.widthFt:e.depthFt),y:V(e.heightFt),z:V(t?e.depthFt:e.widthFt)},0,se())}).filter(e=>d(e)&&!oe(e)),r.buildings),le=[],ue={x:Z.buildingWindowSizeM.x,y:Z.buildingWindowSizeM.y,z:ey};ce.forEach(e=>{let t=o_(n+Math.round(e.variant*16777215)),r=Math.floor((e.sizeY-.4*Z.buildingFloorHeightM)/Z.buildingFloorHeightM),i=[{axis:`z`,sign:1,visible:u>e.z+e.sizeZ/2},{axis:`z`,sign:-1,visible:u<e.z-e.sizeZ/2},{axis:`x`,sign:1,visible:l>e.x+e.sizeX/2},{axis:`x`,sign:-1,visible:l<e.x-e.sizeX/2}];for(let n of i){if(!n.visible)continue;let i=n.axis===`z`?e.sizeX:e.sizeZ,a=Math.floor((i-.5*Z.buildingWindowSpacingM)/Z.buildingWindowSpacingM);for(let i=0;i<r;i+=1)for(let r=0;r<a;r+=1){let o=(r-(a-1)/2)*Z.buildingWindowSpacingM,s=t()<Z.buildingWindowLitChance?.55+.45*t():0,c=(i+.35)*Z.buildingFloorHeightM;le.push(n.axis===`z`?Kv(e.x+o,e.z+n.sign*e.sizeZ/2,ue,0,s,c):Kv(e.x+n.sign*e.sizeX/2,e.z+o,ue,Math.PI/2,s,c))}}});let de=qv(n,`trees`),fe=ny(Xv.map(e=>{let t=te(e,V(e.outFt)),n=V(12+6*de()),r=V(16+8*de());return Kv(t.x+Jv(de)*V(3),t.z+Jv(de)*V(3),{x:n,y:r,z:n},de()*2*Math.PI,de())}).filter(d),r.trees),F=qv(n,`bushes`),pe=[];for(let e=0;e<7;e+=1)for(let t of[1,-1])pe.push({side:`n`,alongFt:t*(12+11*e),outFt:ty});for(let e=0;e<8;e+=1)pe.push({side:`e`,alongFt:-68+20*e,outFt:ty}),pe.push({side:`w`,alongFt:-68+20*e,outFt:ty});for(let e=0;e<6;e+=1)for(let t of[1,-1])pe.push({side:`s`,alongFt:t*(10+14*e),outFt:ty});let me=ny(pe.map(e=>{let t=te(e,V(e.outFt)),n=Jv(F)*V(1.5),r=V(3+2*F()),i=e.side===`n`||e.side===`s`;return Kv(t.x+(i?n:0),t.z+(i?0:n),{x:r,y:r*(.6+.25*F()),z:r},F()*2*Math.PI,F())}).filter(d),r.bushes),he=a.minX-Z.fenceOutsideCurbM,ge=a.maxX+Z.fenceOutsideCurbM,_e=a.minZ-Z.fenceOutsideCurbM,ve=a.maxZ+Z.fenceOutsideCurbM,ye=[{x:he,z:_e},{x:ge,z:_e},{x:ge,z:ve},{x:he,z:ve}],be=[],xe=[];ye.forEach((e,t)=>{let n=ye[(t+1)%ye.length]??e,i=Math.hypot(n.x-e.x,n.z-e.z),a=Math.max(1,Math.round(i/r.fencePostSpacingM)),o=i/a,s=Math.abs(n.x-e.x)>Math.abs(n.z-e.z)?0:Math.PI/2;for(let t=0;t<a;t+=1){let r=t/a,i=(t+.5)/a,c=Kv(e.x+(n.x-e.x)*r,e.z+(n.z-e.z)*r,Z.fencePostSizeM);d(c)&&be.push(c);for(let t of Z.fenceRailHeightsM){let r=Kv(e.x+(n.x-e.x)*i,e.z+(n.z-e.z)*i,{x:o,y:Z.fenceRailThicknessM,z:Z.fenceRailThicknessM},s,0,t);d(r)&&xe.push(r)}}});let Se=a.maxX-V(3.5),I=(f-.5)*o,Ce=I+4*o,L=(e,t)=>[{x:e,z:t},{x:-e,z:t}],we={x:V(2),y:V(3.3),z:V(2)},R=[...L(I+V(2.4),c),...L(Se,V(20)),...L(Ce+V(2.4),c),...L(Se,c+s+V(9))].map(e=>Kv(e.x,e.z,we)),Te=qv(n,`trafficCones`),z={x:V(1.2),y:V(2.3),z:V(1.2)},B=[...L(I-V(1.4),c-V(1.7)),...L(I-V(1.2),c+V(1.8)),...L(Se,V(40)),...L(Se+V(1.4),V(43.5)),...L(Se-V(1),-V(9)),...L(Se+V(1.2),-V(11)),...L(Se-V(.6),V(118)),...L(Se+V(1.3),V(121))].map(e=>Kv(e.x+Jv(Te)*V(.3),e.z+Jv(Te)*V(.3),z,Te()*2*Math.PI)),Ee={x:V(1.7),y:V(7.4),z:V(.3)},De=V(1.8),Oe=[{x:0,z:a.minZ-De},...L(4.5*o,c),{x:3*o,z:a.minZ-De},{x:-5*o,z:a.minZ-De},{x:7*o,z:a.minZ-De},...L(3*o,a.maxZ+De)].map(e=>Kv(e.x,e.z,Ee,e.z>u?0:Math.PI)),ke={x:V(2.4),y:V(.04),z:V(2.4)},Ae=(s/2+c-s)/2,je=(c+s+a.maxZ-s)/2,Me=[...L(3.3*o,Ae),...L(2.7*o,je),...L(7.3*o,Ae),...L(6.7*o,je)].map(e=>Kv(e.x,e.z,ke)),Ne=e=>{let t=e.filter(d);return ny(t,t.length*r.detailFraction)};return{parkedCars:ny(v,r.parkedCars),lamps:ny(ee.filter(d),r.lampHeads),pillars:N,beams:P,buildings:ce,windows:le,fencePosts:be,fenceRails:xe,trees:fe,bushes:me,stallLines:x.filter(d),wheelStops:Ne(k),bins:Ne(R),trafficCones:Ne(B),signs:Ne(Oe),drains:Ne(Me)}}var iy=Qg.leaf,ay=2*Math.PI,oy=40,sy=.4;function cy(e){let t=Math.min(Math.max(e,0),1);return t*t*(3-2*t)}var ly=Re(H(Qg.windHeadingDeg)),uy=ze(H(Qg.windHeadingDeg));function dy(e,t){return e*t+iy.blowLengthM}function fy(e,t,n,r){let i=o_(n),a=(e,t)=>e+(t-e)*i(),o=Ev(e),s=Bv(e,t),c=(t,n)=>{let r=Rv(e,t,n);return r.x>=o.minX+iy.curbMarginM&&r.x<=o.maxX-iy.curbMarginM&&r.z>=o.minZ+iy.curbMarginM&&r.z<=o.maxZ-iy.curbMarginM&&!Hv(s,r.x,r.z)},l=(e,t,n)=>{let r=Math.ceil(n/sy);for(let i=0;i<=r;i+=1){let a=n*i/r;for(let n of[-iy.swayM,0,iy.swayM]){let r=e+ly.x*a+uy.x*n,i=t+ly.z*a+uy.z*n;if(!c(r,i))return!1}}return!0},u=[];for(let t=0;t<r;t+=1){let t=iy.minHops+Math.floor(i()*(iy.maxHops-iy.minHops+1)),n=a(iy.minHopLengthM,iy.maxHopLengthM);for(let r=0;r<oy;r+=1){let r=zv(e,a(o.minX,o.maxX),a(o.minZ,o.maxZ));if(l(r.x,r.z,dy(t,n))){u.push({homeX:r.x,homeZ:r.z,cycleS:a(iy.minCycleS,iy.maxCycleS),phase:i(),hops:t,hopLengthM:n,sizeM:a(iy.minSizeM,iy.maxSizeM),yawRad:i()*ay,swaySide:i()<.5?-1:1,tumbleTurns:1+Math.floor(i()*2),colorIndex:Math.floor(i()*iy.colors.length)});break}}}let d=(e,t)=>{let n=t/e.cycleS+e.phase,r=n-Math.floor(n),i,a=0,o=iy.restLiftM,s=iy.restTiltRad,c=e.yawRad,l=1;if(r<iy.fallFraction){let t=r/iy.fallFraction;i=0,a=e.swaySide*iy.swayM*Math.sin(2*Math.PI*t)*(1-t),o=iy.restLiftM+iy.fallHeightM*(1-t)**1.5,s=iy.restTiltRad+e.tumbleTurns*ay*(1-cy(t)),c+=(1-t)*Math.PI,l=cy(t/.2)}else if(r<1-iy.blowFraction){let t=(r-iy.fallFraction)/(1-iy.fallFraction-iy.blowFraction)*e.hops,n=Math.min(Math.floor(t),e.hops-1),l=Math.max((t-n-iy.restFraction)/(1-iy.restFraction),0);i=(n+cy(l))*e.hopLengthM,a=e.swaySide*.5*iy.swayM*Math.sin(Math.PI*l),o=iy.restLiftM+iy.hopHeightM*Math.sin(Math.PI*l),s=iy.restTiltRad+e.tumbleTurns*ay*cy(l),c+=(n+cy(l))*1.7}else{let t=(r-(1-iy.blowFraction))/iy.blowFraction;i=e.hops*e.hopLengthM+iy.blowLengthM*t*t,o=iy.restLiftM+iy.blowHeightM*t*t,s=iy.restTiltRad+(e.tumbleTurns+1)*ay*t,c+=e.hops*1.7+t*Math.PI,l=1-cy((t-.4)/.6)}return{x:e.homeX+ly.x*i+uy.x*a,y:o,z:e.homeZ+ly.z*i+uy.z*a,yawRad:c,tumbleRad:s,scale:l}},f=e=>{let t=u[e];if(t===void 0)throw Error(`沒有第 ${e} 片落葉`);return t};return{count:u.length,sizeM:e=>f(e).sizeM,colorIndex:e=>f(e).colorIndex,stateAt:(e,t)=>d(f(e),t)}}function py(){let e=[0,0,-.5],t=[0,0,.5],n=[.3,.07,.04],r=[-.3,.07,.04],i=new Fc;return i.setAttribute(`position`,new bc(new Float32Array([...e,...t,...n,...e,...r,...t]),3)),i.computeVertexNormals(),i}function my(e,t,n,r){let i=fy(e,t,n,r),a=new _l(py(),new Nd({color:16777215,roughness:iy.roughness,side:2}),i.count);a.name=`leaves`,a.castShadow=!1,a.receiveShadow=!0,a.frustumCulled=!1;for(let e=0;e<i.count;e+=1)a.setColorAt(e,new J(iy.colors[i.colorIndex(e)]??iy.colors[0]));let o=new is,s=new q,c=new Po,l=new ms(0,0,0,`YXZ`),u=new q,d=e=>{for(let t=0;t<i.count;t+=1){let n=i.stateAt(t,e);s.set(n.x,n.y,n.z),l.set(n.tumbleRad,n.yawRad,0),c.setFromEuler(l),u.setScalar(i.sizeM(t)*n.scale),a.setMatrixAt(t,o.compose(s,c,u))}a.instanceMatrix.needsUpdate=!0};return d(0),{mesh:a,field:i,setTime:d}}function hy(e,t){let n=o_(e),r=[];for(let e=0;e<t;e+=1)r.push({x:n()*h_.boxSizeM,y:n()*h_.boxHeightM,z:n()*h_.boxSizeM});return r}function gy(e,t){return(e%t+t)%t}function _y(e,t,n,r){let i=h_.boxSizeM/2,a=e.x+h_.windXMps*t,o=e.z+h_.windZMps*t;return{x:n-i+gy(a-n+i,h_.boxSizeM),y:gy(e.y-h_.fallSpeedMps*t,h_.boxHeightM),z:r-i+gy(o-r+i,h_.boxSizeM)}}var vy=3,yy=2;function by(e,t){let n=hy(t,e),r=new Float32Array(e*yy*vy),i=new Fc,a=new bc(r,vy);i.setAttribute(`position`,a);let o=new Il(i,new wl({color:h_.color,transparent:!0,opacity:h_.opacity,depthWrite:!1}));o.name=`rain`,o.frustumCulled=!1,o.userData[y_]=!0;let s=Math.hypot(h_.fallSpeedMps,h_.windXMps,h_.windZMps),c=-h_.windXMps/s*h_.streakLengthM,l=h_.fallSpeedMps/s*h_.streakLengthM,u=-h_.windZMps/s*h_.streakLengthM;return{lines:o,update(e,t,i){n.forEach((n,a)=>{let o=_y(n,e,t,i),s=a*yy*vy;r[s]=o.x,r[s+1]=o.y,r[s+2]=o.z,r[s+3]=o.x+c,r[s+4]=o.y+l,r[s+5]=o.z+u}),a.needsUpdate=!0}}}var xy=81,Sy=167,Cy=211;function wy(e,t,n,r,i={}){let a=new Ms;a.name=`effects`;let o=e.tireMarks.maxSegments>0?cv(e.tireMarks):void 0,s=e.particles.dust>0&&(i.dust??!0)?hv(e.particles.dust,r+xy):void 0,c=e.particles.leaves>0&&(i.leaves??!0)?my(t,n,r+Sy,e.particles.leaves):void 0;o!==void 0&&a.add(o.mesh),s!==void 0&&a.add(s.points),c!==void 0&&a.add(c.mesh);let l=Math.round(i.rainStreaks??0),u=l>0?by(l,r+Cy):void 0;u!==void 0&&a.add(u.lines);let d=0;return{root:a,update(e,t){d+=t,o?.update(e,t),s?.update(e,t),c?.setTime(d),u?.update(d,e.x,e.z)},drawWithoutDust(e){if(s===void 0||!s.points.visible)e();else{s.points.visible=!1;try{e()}finally{s.points.visible=!0}}}}}var Ty=4,Ey=255,Dy={grain:0,patch:1,crack:2,blotch:3};function Oy(e,t,n){let r=Math.min(Math.max((n-e)/(t-e),0),1);return r*r*(3-2*r)}function ky(e,t){return(e%t+t)%t}function Ay(e,t){let n=Float32Array.from({length:t*t},()=>e()),r=(e,r)=>n[ky(r,t)*t+ky(e,t)]??0,i=e=>e*e*(3-2*e);return(e,n)=>{let a=e*t,o=n*t,s=Math.floor(a),c=Math.floor(o),l=i(a-s),u=i(o-c),d=r(s,c)+(r(s+1,c)-r(s,c))*l;return d+(r(s,c+1)+(r(s+1,c+1)-r(s,c+1))*l-d)*u}}function jy(e,t,n){let r=t.map((t,r)=>({sample:Ay(e,t),weight:n[r]??0}));return(e,t)=>{let n=0;for(let i of r)n+=i.sample(e,t)*i.weight;return n}}function My(e,t,n){let r=new Float32Array(t*t),i=new Float32Array(t*t);for(let a=0;a<t*t;a+=1)r[a]=.5+(e()-.5)*n,i[a]=.5+(e()-.5)*n;return(e,n)=>{let a=e*t,o=n*t,s=Math.floor(a),c=Math.floor(o),l=1/0,u=1/0;for(let e=-1;e<=1;e+=1)for(let n=-1;n<=1;n+=1){let d=ky(c+e,t)*t+ky(s+n,t),f=s+n+(r[d]??0)-a,p=c+e+(i[d]??0)-o,m=Math.hypot(f,p);m<l?(u=l,l=m):m<u&&(u=m)}return(u-l)/t}}function Ny(e,t,n){let r=1/0,i=-1/0;for(let e of t)r=Math.min(r,e),i=Math.max(i,e);let a=i>r?i-r:1;for(let i=0;i<t.length;i+=1){let o=t[i]??0;e[i*Ty+n]=Math.round((o-r)/a*Ey)}}function Py(e,t){let n=Wg,r=o_(e),i=Ay(r,n.mottleCells),a=jy(r,n.patchCells,n.patchWeights),o=jy(r,n.blotchCells,n.blotchWeights),s=My(r,n.crackCells,n.crackJitter),c=Ay(r,n.crackWarpCells),l=Ay(r,n.crackWarpCells),u=Ay(r,n.crackBreakCells),d=e=>e*2-1,f=Math.max(n.crackHalfWidth,1/t),p=t*t,m=new Uint8Array(p*Ty),h=new Float32Array(p),g=new Float32Array(p);for(let e=0;e<t;e+=1)for(let p=0;p<t;p+=1){let _=p/t,v=e/t,y=e*t+p,b=y*Ty,x=.5+d(r())*n.grainAmplitude+d(i(_,v))*n.mottleAmplitude,S=r();S<n.stoneChance?x+=n.stoneBrighten:S<n.stoneChance+n.pitChance&&(x-=n.pitDarken),m[b+Dy.grain]=Math.round(Math.min(Math.max(x,0),1)*Ey),h[y]=a(_,v),g[y]=o(_,v);let C=(1-Oy(0,f,s(_+d(c(_,v))*n.crackWarp,v+d(l(_,v))*n.crackWarp)/2))*Oy(n.crackBreakStart,n.crackBreakEnd,u(_,v));m[b+Dy.crack]=Math.round(C*Ey)}return Ny(m,h,Dy.patch),Ny(m,g,Dy.blotch),m}var Fy=[`fineGrain`,`coarseGrain`,`macroA`,`macroB`,`cracks`,`stains`,`wetness`,`stainStreaks`];function Iy(e){let t=o_(e);return Fy.map(e=>{let n=Ug.layers[e],r=H(n.angleDeg);return{cosOverPeriod:Math.cos(r)/n.periodM,sinOverPeriod:Math.sin(r)/n.periodM,offsetU:t(),offsetV:t()}})}function Ly(){let e=H(Ug.layers.stainStreaks.angleDeg);return{x:Math.sin(e)*Ug.stainSmearM,z:Math.cos(e)*Ug.stainSmearM}}var Ry=.06,zy=1e-4;function By(e,t,n,r){let i=Math.cos(t),a=Math.sin(t),o=e=>Math.abs(e)<zy?zy:e;return{originX:e.x,originZ:e.z,rightX:i,rightZ:a,sunRunX:o((n.x*i+n.z*a)/n.y),sunRunZ:o((-n.x*a+n.z*i)/n.y),boxes:r}}function Vy(e,t=0){let n=[];return e.normals&&n.push(`GROUND_NORMALS`),e.wetness&&n.push(`GROUND_WETNESS`),t>0&&n.push(`GROUND_EDGE_BOXES ${t}`),n}var Hy=`
varying vec2 vGroundXZ;
`,Uy=`
vGroundXZ = ( modelMatrix * vec4( transformed, 1.0 ) ).xz;
`,Wy=`
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * worldPosition;
	}
	#pragma unroll_loop_end
#endif
`,Gy=`
varying vec2 vGroundXZ;
uniform sampler2D uGroundNoise;
uniform vec4 uGroundLayers[ ${Fy.length} ];
uniform vec4 uGroundContrast;
uniform vec3 uGroundDustTint;
uniform vec4 uGroundCrack;
uniform vec4 uGroundStain;
uniform vec3 uGroundStainTint;
uniform vec3 uGroundStainWarp;
uniform vec4 uGroundStainShape;
uniform vec2 uGroundStainMacro;
uniform vec2 uGroundStainSmear;
uniform float uGroundStainDrift;
uniform vec4 uGroundWet;
uniform vec4 uGroundPuddle;
uniform vec4 uGroundHeights;
uniform vec2 uGroundNormalFade;

vec2 groundUv( vec4 layer, vec2 p ) {
	return vec2( layer.x * p.x - layer.y * p.y, layer.y * p.x + layer.x * p.y ) + layer.zw;
}

#ifdef GROUND_EDGE_BOXES
uniform vec4 uGroundEdgeFrame;
uniform vec3 uGroundEdgeSun;
uniform vec4 uGroundEdgeBoxes[ GROUND_EDGE_BOXES ];
uniform float uGroundEdgeHeights[ GROUND_EDGE_BOXES ];

// 路緣石、車擋的影子：從地面這一點朝太陽走到箱頂的高度，這段光路在水平面上是一條線段；
// 線段穿過箱子底面範圍的那一截越長，擋掉的陽光越多（邊緣因此是柔的）。
float groundEdgeLight( vec2 p ) {
	vec2 offset = p - uGroundEdgeFrame.xy;
	vec2 local = vec2( dot( offset, uGroundEdgeFrame.zw ), dot( offset, vec2( - uGroundEdgeFrame.w, uGroundEdgeFrame.z ) ) );
	float lit = 1.0;
	for ( int i = 0; i < GROUND_EDGE_BOXES; i ++ ) {
		vec2 run = uGroundEdgeSun.xy * uGroundEdgeHeights[ i ];
		vec2 t0 = ( uGroundEdgeBoxes[ i ].xy - local ) / run;
		vec2 t1 = ( uGroundEdgeBoxes[ i ].zw - local ) / run;
		vec2 tNear = min( t0, t1 );
		vec2 tFar = max( t0, t1 );
		float enter = max( max( tNear.x, tNear.y ), 0.0 );
		float leave = min( min( tFar.x, tFar.y ), 1.0 );
		lit *= 1.0 - smoothstep( 0.0, uGroundEdgeSun.z, leave - enter );
	}
	return lit;
}
#endif

#ifdef GROUND_NORMALS
// 表面高度（公尺）：細顆粒 + 粗顆粒 − 裂縫。
float groundHeight( vec2 p, vec2 crackWarp, float crackMask ) {
	float fine = texture2D( uGroundNoise, groundUv( uGroundLayers[ 0 ], p ) ).r;
	float coarse = texture2D( uGroundNoise, groundUv( uGroundLayers[ 1 ], p ) ).r;
	float crack = texture2D( uGroundNoise, groundUv( uGroundLayers[ 4 ], p ) + crackWarp ).b;
	return fine * uGroundHeights.x + coarse * uGroundHeights.y - crack * crackMask * uGroundHeights.z;
}
#endif
`,Ky=`
float groundFine = texture2D( uGroundNoise, groundUv( uGroundLayers[ 0 ], vGroundXZ ) ).r;
float groundCoarse = texture2D( uGroundNoise, groundUv( uGroundLayers[ 1 ], vGroundXZ ) ).r;
vec4 groundMacroATexel = texture2D( uGroundNoise, groundUv( uGroundLayers[ 2 ], vGroundXZ ) );
float groundMacroA = groundMacroATexel.g;
float groundMacroB = texture2D( uGroundNoise, groundUv( uGroundLayers[ 3 ], vGroundXZ ) ).g;

// 裂縫：取樣位置被兩層大片噪聲扭曲，而且只出現在一部分區域，裂縫層自己的周期就看不出來。
vec2 groundCrackWarp = ( vec2( groundMacroB, groundMacroA ) - 0.5 ) * uGroundCrack.w;
float groundCrackMask = smoothstep( uGroundCrack.x, uGroundCrack.y, 0.5 * ( 1.0 - groundMacroA ) + 0.5 * groundMacroB );
float groundCrack = texture2D( uGroundNoise, groundUv( uGroundLayers[ 4 ], vGroundXZ ) + groundCrackWarp ).b * groundCrackMask;

// 油漬與污斑：不是圓團。取樣位置先被較高頻的噪聲扭曲（邊緣彎彎曲曲），
// 斑塊被順著車道拉長的條紋拖出尾巴（拉絲）、減去高頻的缺口（濺灑），再被大片噪聲調整濃淡，最後才過門檻。
// 漂移：取樣位置被最大的那一層噪聲推開，油漬層自己的周期在世界座標上就不是整齊的格子。
vec2 groundStainXZ = vGroundXZ + ( groundMacroATexel.ga - 0.5 ) * uGroundStainDrift;
vec2 groundStainUv = groundUv( uGroundLayers[ 5 ], groundStainXZ );
vec2 groundStainWarp = texture2D( uGroundNoise, groundStainUv * uGroundStainWarp.x ).ga - 0.5;
vec2 groundStreakUv = groundUv( uGroundLayers[ 7 ], vGroundXZ ) + groundStainWarp * uGroundStainWarp.y;
float groundStainStreak = texture2D( uGroundNoise, vec2( groundStreakUv.x, groundStreakUv.y / uGroundStainShape.x ) ).a;
vec2 groundStainBodyUv = groundUv( uGroundLayers[ 5 ], groundStainXZ + uGroundStainSmear * ( groundStainStreak - 0.5 ) );
float groundStainBody = texture2D( uGroundNoise, groundStainBodyUv + groundStainWarp * uGroundStainWarp.y ).a;
float groundStainSplatter = texture2D( uGroundNoise, groundStainUv * uGroundStainShape.z + groundStainWarp * uGroundStainWarp.y ).g;
float groundStain = smoothstep( uGroundStain.x, uGroundStain.y,
	groundStainBody
	+ ( groundStainStreak - 0.5 ) * uGroundStainShape.y
	- ( groundStainSplatter - 0.5 ) * uGroundStainShape.w
	+ ( groundMacroA - 0.5 ) * uGroundStainMacro.x
	+ ( groundMacroB - 0.5 ) * uGroundStainMacro.y );

float groundShade = 1.0
	+ ( groundFine - 0.5 ) * uGroundContrast.x
	+ ( groundCoarse - 0.5 ) * uGroundContrast.y
	+ ( groundMacroA - 0.5 ) * uGroundContrast.z
	+ ( groundMacroB - 0.5 ) * uGroundContrast.w;
vec3 groundColor = diffuseColor.rgb * max( groundShade, 0.0 );
groundColor *= mix( vec3( 1.0 ), uGroundDustTint, smoothstep( 0.35, 0.8, groundMacroB ) );
groundColor *= 1.0 - uGroundCrack.z * groundCrack;
groundColor *= mix( vec3( 1.0 ), uGroundStainTint, groundStain );

float groundWet = 0.0;
float groundPuddle = 0.0;
#ifdef GROUND_WETNESS
	// 濕斑的取樣位置跟著油漬的扭曲噪聲推開，邊緣才不是圓弧。
	float groundWetNoise = 0.65 * texture2D( uGroundNoise, groundUv( uGroundLayers[ 6 ], vGroundXZ ) + groundStainWarp * uGroundStainWarp.z ).a + 0.35 * ( 1.0 - groundMacroB );
	groundWet = smoothstep( uGroundWet.x, uGroundWet.y, groundWetNoise );
	groundPuddle = smoothstep( uGroundPuddle.x, uGroundPuddle.y, groundWetNoise );
	// 濕的柏油比較深；積水處顆粒被水蓋住，對比降低。
	groundColor *= 1.0 - uGroundWet.z * groundWet;
#endif
diffuseColor.rgb = groundColor;

float groundEdgeLit = 1.0;
#ifdef GROUND_EDGE_BOXES
	groundEdgeLit = groundEdgeLight( vGroundXZ );
#endif
`,qy=`vDirectionalShadowCoord[ i ] ) : 1.0;`,Jy=`vDirectionalShadowCoord[ i ] ) * groundEdgeLit : 1.0;`,Yy=`
roughnessFactor = mix( roughnessFactor, uGroundStain.z, groundStain );
#ifdef GROUND_WETNESS
	roughnessFactor = mix( roughnessFactor, uGroundWet.w, groundWet );
	roughnessFactor = mix( roughnessFactor, uGroundPuddle.z, groundPuddle );
#endif
`,Xy=`
#ifdef GROUND_NORMALS
{
	float groundEps = uGroundHeights.w;
	float groundH0 = groundHeight( vGroundXZ, groundCrackWarp, groundCrackMask );
	float groundHx = groundHeight( vGroundXZ + vec2( groundEps, 0.0 ), groundCrackWarp, groundCrackMask );
	float groundHz = groundHeight( vGroundXZ + vec2( 0.0, groundEps ), groundCrackWarp, groundCrackMask );
	vec2 groundSlope = vec2( groundHx - groundH0, groundHz - groundH0 ) / groundEps;
	// 遠處的起伏小於一個像素：淡出，免得閃爍。積水的水面是平的。
	float groundFade = 1.0 - smoothstep( uGroundNormalFade.x, uGroundNormalFade.y, length( vViewPosition ) );
	groundSlope *= groundFade * ( 1.0 - groundPuddle );
	vec3 groundNormal = normalize( vec3( - groundSlope.x, 1.0, - groundSlope.y ) );
	normal = normalize( ( viewMatrix * vec4( groundNormal, 0.0 ) ).xyz );
}
#endif
`;function Zy(e,t,n){if(!e.includes(t))throw Error(`地面著色器：找不到插入點 ${t}`);return e.replace(t,n)}function Qy(e,t){let n=t.map(e=>`#define ${e}`).join(`
`),r=e.vertexShader;r=Zy(r,`#include <common>`,`#include <common>\n${Hy}`),r=Zy(r,`#include <begin_vertex>`,`#include <begin_vertex>\n${Uy}`),r=Zy(r,`#include <shadowmap_vertex>`,`#include <shadowmap_vertex>\n${Wy}`),e.vertexShader=r;let i=e.fragmentShader;i=Zy(i,`#include <common>`,`${n}\n#include <common>\n${Gy}`),i=Zy(i,`#include <map_fragment>`,Ky),i=Zy(i,`#include <roughnessmap_fragment>`,`#include <roughnessmap_fragment>\n${Yy}`),i=Zy(i,`#include <normal_fragment_maps>`,`#include <normal_fragment_maps>\n${Xy}`),i=Zy(i,`#include <lights_fragment_begin>`,Zy(Kf.lights_fragment_begin,qy,Jy)),e.fragmentShader=i}function $y(e,t,n){let r=new cl(Py(e,t),t,t,ia,Ui);return r.colorSpace=``,r.wrapS=Pi,r.wrapT=Pi,r.magFilter=Bi,r.minFilter=Hi,r.generateMipmaps=!0,r.anisotropy=n,r.needsUpdate=!0,r}var eb={...Ug,fallback:null};function tb(e,t,n,r,i=eb){let a=Ug,o=t.wetness?null:i.fallback,s=Math.max(1,Math.min(n,t.maxAnisotropy)),c=$y(e,t.textureSizePx,s),l=Iy(e).map(e=>new $o(e.cosOverPeriod,e.sinOverPeriod,e.offsetU,e.offsetV)),u=Ly(),d=Vy(t,r?.boxes.length),f=a.layers.fineGrain.periodM/t.textureSizePx,p=new Nd({color:o===null?new J(a.baseColor):new J(a.baseColor).multiplyScalar(o.colorScale),roughness:o===null?a.roughness:o.roughness,metalness:0});return p.onBeforeCompile=e=>{Object.assign(e.uniforms,{uGroundNoise:{value:c},uGroundLayers:{value:l},uGroundContrast:{value:new $o(a.fineGrainContrast,a.coarseGrainContrast,a.macroAContrast,a.macroBContrast)},uGroundDustTint:{value:new q(a.dustTint.r,a.dustTint.g,a.dustTint.b)},uGroundCrack:{value:new $o(a.crackMaskStart,a.crackMaskEnd,a.crackDarken,a.crackWarp)},uGroundStain:{value:new $o(a.stainStart,a.stainEnd,a.stainRoughness,0)},uGroundStainTint:{value:new q(a.stainTint.r,a.stainTint.g,a.stainTint.b)},uGroundStainWarp:{value:new q(a.stainWarpScale,a.stainWarp,a.wetWarp)},uGroundStainMacro:{value:new K(a.stainMacroAWeight,a.stainMacroBWeight)},uGroundStainSmear:{value:new K(u.x,u.z)},uGroundStainDrift:{value:a.stainDriftM},uGroundStainShape:{value:new $o(a.stainStreakStretch,a.stainStreakWeight,a.stainSplatterScale,a.stainSplatterWeight)},uGroundWet:{value:new $o(i.wetStart,i.wetEnd,i.wetDarken,i.wetRoughness)},uGroundPuddle:{value:new $o(i.puddleStart,i.puddleEnd,i.puddleRoughness,0)},uGroundHeights:{value:new $o(a.fineGrainHeightM,a.coarseGrainHeightM,a.crackDepthM,f)},uGroundNormalFade:{value:new K(a.normalFadeStartM,a.normalFadeEndM)}}),r!==void 0&&r.boxes.length>0&&Object.assign(e.uniforms,{uGroundEdgeFrame:{value:new $o(r.originX,r.originZ,r.rightX,r.rightZ)},uGroundEdgeSun:{value:new q(r.sunRunX,r.sunRunZ,Ry)},uGroundEdgeBoxes:{value:r.boxes.map(e=>new $o(e.minX,e.minZ,e.maxX,e.maxZ))},uGroundEdgeHeights:{value:r.boxes.map(e=>e.heightM)}}),Qy(e,d)},p.customProgramCacheKey=()=>`ground:${d.join(`,`)}`,p}function nb(e,t,n,r,i){let a=new al(new _d(Ug.sizeM,Ug.sizeM),tb(e,t,n,r,i));return a.rotation.x=-Math.PI/2,a.receiveShadow=!0,a}function rb(e,t=!1){let n=e[0].index!==null,r=new Set(Object.keys(e[0].attributes)),i=new Set(Object.keys(e[0].morphAttributes)),a={},o={},s=e[0].morphTargetsRelative,c=new Fc;c.morphTargetsRelative=s;let l=0;for(let u=0;u<e.length;++u){let d=e[u],f=0,p=0;if(n!==(d.index!==null))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.`),null;for(let e in d.attributes){if(!r.has(e))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. All geometries must have compatible attributes; make sure "`+e+`" attribute exists among all geometries, or in none of them.`),null;a[e]===void 0&&(a[e]=[]),a[e].push(d.attributes[e]),f++}if(f!==r.size)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. Make sure all geometries have the same number of attributes.`),null;if(s!==d.morphTargetsRelative)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. .morphTargetsRelative must be consistent throughout all geometries.`),null;for(let t in d.morphAttributes){if(!i.has(t))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`.  .morphAttributes must be consistent throughout all geometries.`),null;if(d.morphAttributes[t].length!==e[0].morphAttributes[t].length)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. All geometries must have the same number of morph targets for the "`+t+`" morph attribute.`),null;o[t]===void 0&&(o[t]=[]),o[t].push(d.morphAttributes[t]),p++}if(p!==i.size)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. Make sure all geometries have the same number of morph attributes.`),null;if(t){let e;if(n)e=d.index.count;else if(d.attributes.position!==void 0)e=d.attributes.position.count;else return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. The geometry must have either an index or a position attribute`),null;c.addGroup(l,e,u),l+=e}}if(n){let t=0,n=[];for(let r=0;r<e.length;++r){let i=e[r].index;for(let e=0;e<i.count;++e)n.push(i.getX(e)+t);t+=e[r].attributes.position.count}c.setIndex(n)}for(let e in a){let t=ib(a[e]);if(!t)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` attribute.`),null;c.setAttribute(e,t)}for(let e in o){let t=o[e][0].length;if(t!==0){c.morphAttributes=c.morphAttributes||{},c.morphAttributes[e]=[];for(let n=0;n<t;++n){let t=[];for(let r=0;r<o[e].length;++r)t.push(o[e][r][n]);let r=ib(t);if(!r)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` morphAttribute.`),null;c.morphAttributes[e].push(r)}}}return c}function ib(e){let t,n,r,i=-1,a=0;for(let o=0;o<e.length;++o){let s=e[o];if(t===void 0&&(t=s.array.constructor),t!==s.array.constructor)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes.`),null;if(n===void 0&&(n=s.itemSize),n!==s.itemSize)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes.`),null;if(r===void 0&&(r=s.normalized),r!==s.normalized)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes.`),null;if(i===-1&&(i=s.gpuType),i!==s.gpuType)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes.`),null;a+=s.count*n}let o=new t(a),s=new bc(o,n,r),c=0;for(let t=0;t<e.length;++t){let r=e[t];if(r.isInterleavedBufferAttribute){let e=c/n;for(let t=0,i=r.count;t<i;t++)for(let i=0;i<n;i++){let n=r.getComponent(t,i);s.setComponent(t+e,i,n)}}else o.set(r.array,c);c+=r.count*n}return i!==void 0&&(s.gpuType=i),s}var ab=new WeakMap;function ob(e,t){let n=ab.get(e);n===void 0?ab.set(e,[...t]):n.push(...t)}function sb(e){return ab.get(e)??[]}var cb=new q(0,1,0);function lb(e,t,n=0){return new is().compose(new q(e.x,e.y,e.z),new Po().setFromAxisAngle(cb,n),new q(t.x,t.y,t.z))}var ub=C_,db=U.lengthM/2,$={bumperBottomM:.3,bumperTopM:.47,bumperWrapM:.4,bumperCornerM:.1,bumperBevelM:.012,bumperProudM:.012,valanceBottomM:.185,valanceInsetM:.022,plateWidthM:.36,plateHeightM:.115,plateThicknessM:.008,frontPlateCenterYM:.385,rearPlateCenterYM:.665,plateTextProudM:.001,lampInnerXM:.3,lampOuterXM:.71,lampHeightM:.125,lampDepthM:.1,lampProudM:.01,lensProudM:.004,lampRimM:.012,lampDividerM:.014,lampInnerShare:.3,headlampCenterYM:.585,taillampCenterYM:.685,grilleHalfWidthM:.26,grilleBars:3,seamWidthM:.007,frontDoorBehindCowlM:.07,rearDoorAheadOfArchM:.03,lidSeamInsetM:.028,handleSizeM:{length:.11,height:.022,depth:.02},handleBelowBeltM:.085,handleFromDoorRearM:.14},fb=3,pb=5,mb={0:[7,5,5,5,7],1:[2,6,2,2,7],2:[7,1,7,4,7],3:[7,1,7,1,7],4:[5,5,7,1,1],5:[7,4,7,1,7],6:[7,4,7,5,7],7:[7,1,1,1,1],8:[7,5,7,5,7],9:[7,5,7,1,7],A:[2,5,7,5,5],C:[7,4,4,4,7],E:[7,4,7,4,7],F:[7,4,7,4,4],H:[5,5,7,5,5],J:[1,1,1,5,7],L:[4,4,4,4,7],P:[7,5,7,4,4],T:[7,2,2,2,2],U:[5,5,5,5,7],Y:[5,5,2,2,2],"-":[0,0,7,0,0]},hb=`ACEFHJLPTUY`,gb=`0123456789`;function _b(e){let t=o_(e),n=e=>e.charAt(Math.min(Math.floor(t()*e.length),e.length-1));return`${[n(hb),n(hb),n(hb)].join(``)}-${[n(gb),n(gb),n(gb),n(gb)].join(``)}`}function vb(e){if(e.deleteAttribute(`uv`),e.getIndex()===null){let t=e.getAttribute(`position`).count;e.setIndex(Array.from({length:t},(e,t)=>t))}return e}function yb(e,t){return vb(new Yl(...e).translate(...t))}function bb(e,t,n){let r=new q(...e),i=new q(...t).sub(r),a=i.length(),o=new Po().setFromUnitVectors(new q(0,0,1),i.clone().normalize()),s=r.add(i.multiplyScalar(.5));return vb(new Yl(n,n,a).applyMatrix4(new is().compose(s,o,new q(1,1,1))))}function xb(e,t){let n=[];for(let r=0;r+1<e.length;r+=1){let i=e[r],a=e[r+1];i!==void 0&&a!==void 0&&Math.hypot(a[0]-i[0],a[1]-i[1],a[2]-i[2])>1e-4&&n.push(bb(i,a,t))}return n}function Sb(e){return rb([...e])}function Cb(e){return e.rotateY(Math.PI)}function wb(e,t,n,r,i){let a=$.bumperBevelM,o=$.bumperCornerM,s=-t,c=s-n,l=new ku;return l.moveTo(-e,c),l.lineTo(-e,s-o),l.quadraticCurveTo(-e,s,-e+o,s),l.lineTo(e-o,s),l.quadraticCurveTo(e,s,e,s-o),l.lineTo(e,c),l.closePath(),vb(new pd(l,{depth:i-r-2*a,bevelEnabled:!0,bevelThickness:a,bevelSize:a,bevelOffset:-a,bevelSegments:1,curveSegments:5}).rotateX(-Math.PI/2).translate(0,r+a,0))}function Tb(e){return Math.max(...Y_(e).map(([e])=>e))}function Eb(e,t){let n=Y_(e);for(let e=0;e+1<n.length;e+=1){let[r,i]=n[e]??[0,0],[a,o]=n[e+1]??[0,0];if(t>=i&&t<=o&&o>i)return r+(a-r)*(t-i)/(o-i)}return n[0]?.[0]??0}function Db(e,t,n,r){let i=yb([$.plateWidthM,$.plateHeightM,$.plateThicknessM],[0,t,n-r*$.plateThicknessM/2]),a=e.length*4-1,o=$.plateWidthM*.86/a,s=$.plateHeightM*.62/pb,c=n+r*$.plateTextProudM,l=r,u=[],d=[],f=[];[...e].forEach((e,n)=>{(mb[e]??[]).forEach((e,i)=>{for(let p=0;p<fb;p+=1){if(!(e&1<<2-p))continue;let m=(n*4+p-a/2)*o,h=t+(pb/2-i)*s,g=u.length/3;for(let[e,t]of[[m,h-s],[m+o,h-s],[m+o,h],[m,h]])u.push(e*l,t,c),d.push(0,0,r);f.push(g,g+1,g+2,g,g+2,g+3)}})});let p=new Fc;return p.setAttribute(`position`,new bc(new Float32Array(u),3)),p.setAttribute(`normal`,new bc(new Float32Array(d),3)),p.setIndex(f),{plate:i,text:p}}function Ob(e,t){let n=e?-1:1,r=$.lampOuterXM-$.lampInnerXM,i=Z_(e,$.lampInnerXM,t)+n*$.lampProudM,a=r-2*$.lampRimM-$.lampDividerM,o=a*$.lampInnerShare,s=a-o,c=$.lampHeightM-2*$.lampRimM,l=.02,u=i+n*($.lensProudM-l/2),d=[],f=[],p=[];for(let e of[-1,1]){d.push(yb([r,$.lampHeightM,$.lampDepthM],[e*($.lampInnerXM+$.lampOuterXM)/2,t,i-n*$.lampDepthM/2]));let a=$.lampInnerXM+$.lampRimM+o/2,m=$.lampOuterXM-$.lampRimM-s/2;p.push(yb([o,c,l],[e*a,t,u])),f.push(yb([s,c,l],[e*m,t,u]))}return{housing:Sb(d),main:Sb(f),inner:Sb(p)}}function kb(){let e=$.seamWidthM,t=ub.windshieldBaseZM+$.frontDoorBehindCowlM,n=U.wheelbaseM/2-ub.archRadiusM-$.rearDoorAheadOfArchM,r=(e,t,n)=>Array.from({length:n+1},(r,i)=>e+(t-e)*i/n),i=[];for(let a of[-1,1]){for(let r of[t,ub.bPillarZM,n])i.push(...xb(Y_(r).map(([e,t])=>[a*e,t,r]),e));i.push(...xb(r(t,n,6).map(e=>{let[t,n]=Y_(e)[0]??[0,0];return[a*t,n+.012,e]}),e))}let a=(t,n,i)=>xb(r(n,i,6).map(e=>[t,X_(e,t),e]),e),o=(t,n)=>xb(r(-n,n,10).map(e=>[e,X_(t,e),t]),e),s=e=>(Y_(e).at(-1)?.[0]??0)-$.lidSeamInsetM,c=ub.noseStartZM+.01,l=ub.windshieldBaseZM-.03,u=Math.min(s(c),s(l)),d=[...a(-u,c,l),...a(u,c,l),...o(c,u),...o(l,u)],f=ub.rearWindowBaseZM+.04,p=ub.tailStartZM-.01,m=Math.min(s(f),s(p)),h=[...a(-m,f,p),...a(m,f,p),...o(f,m),...o(p,m)];return{doors:Sb(i),hood:Sb(d),trunk:Sb(h)}}function Ab(){let{length:e,height:t,depth:n}=$.handleSizeM,r=U.wheelbaseM/2-ub.archRadiusM-$.rearDoorAheadOfArchM,i=[];for(let a of[-1,1])for(let o of[ub.bPillarZM,r]){let r=o-$.handleFromDoorRearM,s=(Y_(r).at(-1)?.[1]??0)-$.handleBelowBeltM;i.push(yb([n,t,e],[a*Eb(r,s),s,r]))}return Sb(i)}function jb(e){return{front:Db(e,$.frontPlateCenterYM,-db+$.plateTextProudM,-1),rear:Db(e,$.rearPlateCenterYM,Z_(!1,0,$.rearPlateCenterYM)+$.plateThicknessM,1)}}var Mb=[`plate:front:text`,`plate:rear:text`];function Nb(e){let t=jb(e);return Sb([t.front.text,t.rear.text])}function Pb(){let e=[],t=(t,n,r)=>{e.push({name:t,part:n,geometry:r})},n=-db+$.plateThicknessM+$.plateTextProudM,r=Tb(n+$.bumperWrapM)+$.bumperProudM,i=e=>wb(r,e,$.bumperWrapM,$.bumperBottomM,$.bumperTopM),a=e=>wb(r-$.valanceInsetM,e+$.valanceInsetM,$.bumperWrapM-2*$.valanceInsetM,$.valanceBottomM,$.bumperBottomM+$.bumperBevelM);t(`bumper:front`,`paint`,i(n)),t(`valance:front`,`trim`,a(n)),t(`bumper:rear`,`paint`,Cb(i(-db))),t(`valance:rear`,`trim`,Cb(a(-db)));let o=Ob(!0,$.headlampCenterYM);t(`headlamp:housing`,`trim`,o.housing),t(`headlamp:lens`,`headlight`,Sb([o.main,o.inner]));let s=Ob(!1,$.taillampCenterYM);t(`taillamp:housing`,`trim`,s.housing),t(`taillamp:lens`,`taillight`,s.main),t(`reverselamp:lens`,`reverseLight`,s.inner);let c=Z_(!0,$.grilleHalfWidthM,$.headlampCenterYM),l=$.lampHeightM-.02;t(`grille`,`trim`,yb([2*$.grilleHalfWidthM,l,.04],[0,$.headlampCenterYM,c+.02-.006])),t(`grille:bars`,`chrome`,Sb(Array.from({length:$.grilleBars},(e,t)=>yb([2*$.grilleHalfWidthM-.02,.012,.012],[0,$.headlampCenterYM+(t-($.grilleBars-1)/2)*l/$.grilleBars,c-.006]))));let u=Z_(!1,$.lampInnerXM,$.taillampCenterYM);t(`trunk:garnish`,`chrome`,yb([2*$.lampInnerXM-.02,.016,.014],[0,$.taillampCenterYM+$.lampHeightM/2-.012,u]));let d=jb(_b(k));t(`plate:front`,`plate`,d.front.plate),t(`plate:front:text`,`trim`,d.front.text),t(`plate:rear`,`plate`,d.rear.plate),t(`plate:rear:text`,`trim`,d.rear.text);let f=kb();return t(`seam:doors`,`trim`,f.doors),t(`seam:hood`,`trim`,f.hood),t(`seam:trunk`,`trim`,f.trunk),t(`handle:doors`,`chrome`,Ab()),e}function Fb(e,t={}){let n=tv(e),r=new Map;for(let e of Pb())t.plateText===!1&&Mb.includes(e.name)||r.set(e.part,[...r.get(e.part)??[],e]);for(let[e,t]of r){let r=n.get(e),i=Sb([...r===void 0?[]:[r],...t.map(e=>e.geometry)]);i.userData.fittings=t.map(e=>e.name),n.set(e,i)}return n}var Ib=X.wheelRadiusM,Lb=X.rimRadiusM,Rb=X.wheelWidthM/2,zb=Ib-Lb,Bb=X.treadDepthM,Vb=[[-.8*Rb,Lb,!1],[-.98*Rb,Lb+.3*zb,!1],[-Rb,Lb+.62*zb,!1],[-.93*Rb,Ib-2*Bb,!1],[-.84*Rb,Ib-.5*Bb,!0],[-.5*Rb,Ib,!0],[-.42*Rb,Ib,!1],[-.39*Rb,Ib-Bb,!1],[-.29*Rb,Ib-Bb,!1],[-.26*Rb,Ib,!1],[0,Ib,!1],[.26*Rb,Ib,!1],[.29*Rb,Ib-Bb,!1],[.39*Rb,Ib-Bb,!1],[.42*Rb,Ib,!1],[.5*Rb,Ib,!0],[.84*Rb,Ib-.5*Bb,!0],[.93*Rb,Ib-2*Bb,!1],[Rb,Lb+.62*zb,!1],[.98*Rb,Lb+.3*zb,!1],[.8*Rb,Lb,!1]];function Hb(e){let t=Vb.length,n=new Float32Array(e*t*3),r=[];for(let i=0;i<e;i+=1){let a=2*Math.PI*i/e,o=i%2==1;Vb.forEach(([s,c,l],u)=>{let d=l&&o?c-Bb:c,f=(i*t+u)*3;n[f]=s,n[f+1]=d*Math.cos(a),n[f+2]=d*Math.sin(a);let p=(i+1)%e,m=(u+1)%t,h=i*t+u,g=i*t+m,_=p*t+u,v=p*t+m;r.push(h,_,g,g,_,v)})}let i=new Fc;return i.setAttribute(`position`,new bc(n,3)),i.setIndex(r),i.computeVertexNormals(),i}function Ub(e){let t=.72*Rb,n=.014,r=new Sd(Lb-n/2,n,6,e).rotateY(Math.PI/2).translate(t,0,0),i=.24*Lb,a=new Zl(.8*i,i,.04,16).rotateZ(-Math.PI/2).translate(t,0,0),o=Lb-.6*i,s=[r,a];for(let e=0;e<X.rimSpokes;e+=1)s.push(new Yl(.024,o,.22*Lb).translate(t-.012,.6*i+o/2,0).rotateX(2*Math.PI*e/X.rimSpokes));return rb(s)}function Wb(e){return new Xl(Lb,e).rotateY(Math.PI/2).translate(.45*Rb,0,0)}var Gb=Pg.cockpit.lateralM,Kb=C_.cabinHalfWidthM-.03,qb=X.groundClearanceM,Jb=C_.cowlHeightM,Yb=C_.windshieldBaseZM+X.dashboardInsetM,Xb=Yb+X.dashboardLengthM,Zb=Jb+X.dashboardHeightM;function Qb(e,t){let n=new al(e,t);return n.castShadow=!0,n.receiveShadow=!0,n}function $b(e,t,n){let r=Qb(new Yl(...t),e);return r.position.set(...n),r}function ex(){let e=new ku;e.moveTo(Yb,Jb-.02),e.lineTo(Xb-.1,Zb),e.quadraticCurveTo(Xb,Zb,Xb,Zb-.07),e.lineTo(Xb-.05,Zb-.24),e.lineTo(Xb-.16,Zb-.34),e.lineTo(Yb,Zb-.34),e.closePath();let t=2*Kb;return new pd(e,{depth:t,bevelEnabled:!1,curveSegments:6}).rotateY(-Math.PI/2).translate(t/2,0,0)}function tx(e){let t=X.steeringWheelRadiusM,n=new Ms;n.add(Qb(new Sd(t,.016,8,28),e)),n.add(Qb(new Zl(.05,.06,.04,16).rotateX(Math.PI/2),e));for(let r of[Math.PI/2,-Math.PI/2,Math.PI]){let i=Qb(new Yl(.034,t,.014).translate(0,t/2,0),e);i.rotation.z=r,n.add(i)}return n}function nx(e,t,n,r){let i=new Ms;i.add($b(e,[r,.14,.5],[t,qb+.27,n-.22]));let a=$b(e,[r,.6,.12],[t,qb+.6,n+.1]);return a.rotation.x=.2,i.add(a),i.add($b(e,[.5*r,.17,.09],[t,qb+.98,n+.2])),i}function rx(e,t,n){let{sizeM:r,aheadOfHeaderM:i,belowGlassM:a,yawRad:o,tiltRad:s,rimM:c,bezelM:l,stemM:u,mountAheadOfHeaderM:d}=X.rearViewMirror,f=C_.windshieldTopZM,p=f-i,m=X_(p,0)-a,h=new Ms;h.name=`rearViewMirror`;let g=new Ms;g.name=`rearViewMirror:head`,g.position.set(0,m,p),g.rotation.order=`YXZ`,g.rotation.y=-o,g.rotation.x=s;let _=Qb(new Yl(r.x,r.y,r.z),e);_.name=`rearViewMirror:housing`;let v=r.z/2,y=new al(new Yl(r.x,r.y,.004),t);y.name=`rearViewMirror:rim`,y.position.z=v;let b=new al(new Yl(r.x-2*c,r.y-2*c,.004),e);b.name=`rearViewMirror:frame`,b.position.z=v+.002;let x=new al(new _d(r.x-2*(c+l),r.y-2*(c+l)),n);x.name=`rearViewMirror:glass`,x.position.z=v+.0055,g.add(_,y,b,x);let S=f-d,C=X_(S,0)-.02,w=Qb(bb([0,m+r.y/2-.012,p-.004],[0,C,S],u),e);w.name=`rearViewMirror:stem`;let T=$b(e,[.06,.012,.045],[0,C+.004,S]);return T.name=`rearViewMirror:mount`,h.add(g,w,T),h}function ix(e){let t=new Nd({color:X.dashboardColor,roughness:X.dashboardRoughness}),n=new Nd({color:X.dashAccentColor,roughness:.35,metalness:.8}),r=new Nd({color:X.seatColor,roughness:.95}),i=new Nd({color:X.gaugeColor,emissive:X.gaugeColor,emissiveIntensity:X.gaugeEmissiveIntensity}),a=new Nd({color:X.screenColor,emissive:X.screenColor,emissiveIntensity:X.screenEmissiveIntensity,roughness:.2}),o=new Ms;o.add(Qb(ex(),t));let s=Qb(new xd(1,20,8,0,2*Math.PI,0,Math.PI/2).scale(.2,.06,.15),t);s.position.set(Gb,Zb-.012,Xb-.12),o.add(s);let c=new Ms;c.position.set(Gb,Zb-.1,Xb+.016),c.rotation.x=-.3;for(let e of[-1,1]){let t=new al(new vd(.04,.046,24),i);t.position.set(e*.075,0,0),c.add(t)}o.add(c),o.add($b(n,[2*Kb-.06,.012,.012],[0,Zb-.2,Xb-.035]));let l=$b(a,[.24,.12,.008],[.02,Zb-.09,Xb+.02]);l.rotation.x=-.25,o.add(l);let u=new Ms;u.position.set(Gb,Zb+.09-X.steeringWheelRadiusM*Math.cos(X.steeringWheelTiltRad),Xb+.2),u.rotation.x=-X.steeringWheelTiltRad;let d=tx(t);u.add(d),u.add(Qb(new Zl(.03,.035,.24,12).rotateX(Math.PI/2).translate(0,0,-.12),t)),o.add(u),o.add($b(t,[.2,.24,.9],[0,qb+.22,Xb+.4]));let f=Pg.cockpit.aheadM*-1+.2;o.add(nx(r,Gb,f,.5)),o.add(nx(r,-Gb,f,.5));let p=C_.rearWindowBaseZM-.5;o.add($b(r,[2*Kb,.22,.5],[0,qb+.31,p-.2])),o.add($b(r,[2*Kb-.1,.5,.3],[0,qb+.52,p+.15])),o.add($b(t,[2*Kb,.03,.24],[0,Jb+.03,C_.rearWindowBaseZM-.1])),o.add($b(t,[2*Kb,Jb-qb,.02],[0,(Jb+qb)/2,C_.windshieldBaseZM+.02]));let m=new Nd({color:X.trimColor,roughness:X.trimRoughness}),h=new Nd({color:X.chromeColor,roughness:X.chromeRoughness,metalness:1});return o.add(rx(m,h,e)),{root:o,steeringWheel:d}}var ax=6,ox=U.widthM/2,sx=U.wheelbaseM/2;function cx(e,t){let n=new al(e,t);return n.castShadow=!0,n.receiveShadow=!0,n}function lx(){return Sv(`tire`,{space:`radial`,color:X.tireColor,roughness:X.tireRoughness,radial:[ax,X.wheelWidthM/2,X.rimRadiusM,X.wheelRadiusM]})}function ux(){return Sv(`chrome`,{space:`local`,color:X.rimColor,roughness:X.rimRoughness,metalness:X.rimMetalness})}function dx(e,t,n){return new Nd({color:e,emissive:t,emissiveIntensity:n,roughness:.3})}function fx(e,t,n,r){let i={x:.19,y:.12,z:.07},a=new Ms;a.name=`doorMirror`,a.position.set(e*(ox-i.x/2),C_.cowlHeightM+.09,C_.windshieldBaseZM+.3),a.add(cx(new Yl(i.x,i.y,i.z),t));let o=cx(new Yl(i.x-.012,i.y-.012,.012),n);o.name=`doorMirror:frame`,o.position.z=i.z/2;let s=new al(new _d(i.x-.04,i.y-.04),r);s.name=`doorMirror:glass`,s.position.z=i.z/2+.007;let c=cx(new Yl(.12,.035,.05),n);return c.position.set(-e*.12,-.035,0),a.add(o,s,c),a}function px(e){let t=new Ms;t.name=`wipers`;let n=C_.windshieldBaseZM+.085,r=C_.windshieldBaseZM+.01,i=(e,t)=>[e,X_(t,e)+.014,t];for(let[a,o]of[[-.56,-.04],[.06,.58]]){let s=new al(bb(i(a,n),i(o,n+.03),.014),e);s.name=`wiper:blade`;let c=(a+o)/2,l=new al(bb(i(a+.03,r),i(c,n+.015),.01),e);l.name=`wiper:arm`,t.add(s,l)}return t}function mx(e=`high`){let t=Sv(`carPaint`,{space:`local`,color:X.bodyColor,roughness:X.bodyRoughness,metalness:X.bodyMetalness,clearcoat:X.clearcoat,clearcoatRoughness:X.minGlossRoughness}),n=Sv(`glass`,{space:`local`,color:X.glassColor,roughness:X.minGlossRoughness,parameters:{transparent:!0,opacity:X.glassOpacity,depthWrite:!1,side:2}}),r=Sv(`plastic`,{space:`local`,color:X.trimColor,roughness:X.trimRoughness}),i=new Nd({color:X.headlinerColor,emissive:X.headlinerColor,emissiveIntensity:X.headlinerEmissiveIntensity,roughness:1}),a=new Nd({color:X.cabinTrimColor,emissive:X.cabinTrimColor,emissiveIntensity:X.cabinTrimEmissiveIntensity,roughness:.9}),o=dx(X.taillightColor,X.taillightColor,X.taillightEmissiveIntensity),s=dx(X.reverseLightOffColor,X.reverseLightColor,0),c=Sv(`chrome`,{space:`local`,color:X.chromeColor,roughness:X.chromeRoughness,metalness:1}),l=new Nd({color:X.plateColor,roughness:X.plateRoughness}),u={paint:t,glass:n,trim:r,headlight:dx(X.headlightColor,X.headlightColor,X.headlightEmissiveIntensity),taillight:o,reverseLight:s,chrome:c,plate:l,headliner:i,cabinTrim:a},d=new Ms,f=new Map;for(let[t,n]of Fb(e)){let e=cx(n,u[t]);e.castShadow=t!==`glass`,e.name=`body:${t}`,f.set(t,e),d.add(e)}let p=f.get(`paint`),m=f.get(`glass`),h=f.get(`headliner`);if(p===void 0||m===void 0||h===void 0)throw Error(`車殼缺少烤漆、玻璃或頂篷分區`);let g=new Nd({color:X.mirrorGlassColor,roughness:X.minGlossRoughness,metalness:1}),_=ix(g);d.add(_.root),d.add(fx(-1,t,r,g),fx(1,t,r,g)),d.add(px(r));let{wheelSegments:v}=Yg[e],y=Hb(v),b=Ub(v),x=Wb(v),S=lx(),C=ux(),w=C_.halfWidthM-X.wheelTuckM-X.wheelWidthM/2,T=[],E=(e,t)=>{let n=new Ms;n.position.set(e*w,X.wheelRadiusM,t);let i=new Ms,a=new Ms;return a.rotation.y=e<0?Math.PI:0,a.add(cx(y,S),cx(b,C),cx(x,r)),i.add(a),n.add(i),d.add(n),T.push(i),n},D=E(-1,-sx),O=E(1,-sx);E(-1,sx),E(1,sx);let k=new Zl(C_.archRadiusM-.012,C_.archRadiusM-.012,2*(w-X.wheelWidthM/2-.02),v/2,1,!1,0,Math.PI).rotateZ(Math.PI/2);for(let e of[-sx,sx]){let t=cx(k,r);t.position.set(0,X.wheelRadiusM,e),d.add(t)}return{root:d,frontWheelPivots:[D,O],wheelSpinners:T,steeringWheel:_.steeringWheel,body:p,glass:m,headliner:h,taillightMaterial:o,reverseLightMaterial:s,lastPlacement:void 0}}function hx(e,t){e.glass.visible=!t}function gx(e,t){let n=e.body.material;if(!(n instanceof Pd))return;let r=X.hoodViewPaint;n.metalness=t?r.metalness:X.bodyMetalness,n.specularIntensity=t?r.specularIntensity:1,n.clearcoat=t?r.clearcoat:X.clearcoat,n.clearcoatRoughness=t?r.clearcoatRoughness:X.minGlossRoughness,n.envMapIntensity=t?r.envMapIntensity:1}function _x(e,t){return{braking:e.handbrake||e.brake===!0||t*e.throttle<0,reversing:t<0||t===0&&e.throttle<0}}function vx(e,t){e.taillightMaterial.emissiveIntensity=t.braking?X.brakeLightEmissiveIntensity:X.taillightEmissiveIntensity,e.reverseLightMaterial.emissiveIntensity=t.reversing?X.reverseLightEmissiveIntensity:0}function yx(e,t){if(e.lastPlacement!==void 0){let n=Re(t.headingRad),r=-((t.x-e.lastPlacement.x)*n.x+(t.z-e.lastPlacement.z)*n.z)/X.wheelRadiusM;for(let t of e.wheelSpinners)t.rotation.x=(t.rotation.x+r)%(2*Math.PI)}e.lastPlacement={x:t.x,z:t.z},e.root.position.set(t.x,0,t.z),e.root.rotation.y=He(t.headingRad);let n=He(t.steerRad);for(let t of e.frontWheelPivots)t.rotation.y=n;e.steeringWheel.rotation.z=-t.steerRad*X.steeringRatio}var bx=[`paint`,`glass`,`trim`,`headlight`,`taillight`,`reverseLight`,`chrome`,`plate`],xx=12,Sx=new q(1,1,1);function Cx(e){let t=Z.carColors;return new J(t[Math.min(Math.floor(e*t.length),t.length-1)]??t[0])}var wx=k+7919;function Tx(e){let t=o_(wx),n=new Set([_b(k)]),r=[];for(;r.length<e;){let e=_b(Math.floor(t()*2147483647));n.has(e)||(n.add(e),r.push(e))}return r}function Ex(e){return new is().compose(new q(e.x,e.y,e.z),new Po().setFromEuler(new ms(0,He(e.headingRad),0)),Sx)}function Dx(e,t,n){let r=new _l(e,t,n.length);return n.forEach((e,t)=>{r.setMatrixAt(t,e)}),r.instanceMatrix.needsUpdate=!0,r.receiveShadow=!0,r}function Ox(e,t=`high`){let n=new Ms;if(n.name=`parkedCars`,e.length===0)return n;let r=e=>new Nd({color:e,roughness:.3}),i=Sv(`plastic`,{space:`local`,color:X.trimColor,roughness:X.trimRoughness}),a={paint:Sv(`carPaint`,{space:`local`,color:16777215,roughness:Z.carRoughness,metalness:Z.carMetalness,clearcoat:0}),glass:Sv(`glass`,{space:`local`,color:X.glassColor,roughness:X.minGlossRoughness}),trim:i,headlight:r(X.headlightColor),taillight:r(X.taillightColor),reverseLight:r(X.reverseLightOffColor),chrome:Sv(`chrome`,{space:`local`,color:X.chromeColor,roughness:X.chromeRoughness,metalness:1}),plate:new Nd({color:X.plateColor,roughness:X.plateRoughness}),headliner:i,cabinTrim:i},o=e.map(Ex),s=Fb(`low`,{plateText:!1}),c=[];for(let t of bx){let r=s.get(t);if(r===void 0)continue;let i=Dx(r,a[t],o);i.name=`parkedCars:${t}`,t===`paint`&&(i.castShadow=!0,e.forEach((e,t)=>{i.setColorAt(t,Cx(e.variant))})),n.add(i),c.push(i)}let l=Tx(e.length),u=o.map((e,t)=>Nb(l[t]??``).applyMatrix4(e)),d=u.map(e=>e.getIndex()?.count??e.getAttribute(`position`).count),f=rb(u),p=new al(f,i),m=new Set,h=(e,t)=>{if(t?m.add(e):m.delete(e),f.clearGroups(),m.size===0){p.material=i;return}let n=0;d.forEach((e,t)=>{m.has(t)||f.addGroup(n,e,0),n+=e}),p.material=[i]};p.name=`parkedCars:plateText`,p.receiveShadow=!0,p.userData.plates=l,n.add(p);let g=C_.halfWidthM-X.wheelTuckM-X.wheelWidthM/2,_=U.wheelbaseM/2,v=[];for(let e of o)for(let t of[-1,1])for(let n of[-_,_]){let r=new is().compose(new q(t*g,X.wheelRadiusM,n),new Po().setFromEuler(new ms(0,t<0?Math.PI:0,0)),Sx);v.push(e.clone().multiply(r))}let y=xx,b=Dx(Hb(y),lx(),v);b.name=`parkedCars:tire`;let x=Dx(t===`high`?Ub(y):Wb(y),ux(),v);x.name=`parkedCars:rim`,n.add(b,x);let S={x:U.widthM,y:U.heightM,z:U.lengthM};return ob(n,e.map((e,t)=>{let n=[0,1,2,3].flatMap(e=>[{mesh:b,index:t*4+e},{mesh:x,index:t*4+e}]);return{boxes:[lb({x:e.x,y:e.y+S.y/2,z:e.z},S,He(e.headingRad))],parts:[...c.map(e=>({mesh:e,index:t})),...n],setHidden:e=>{h(t,e)}}})),n}var kx=.5;function Ax(e){let t=Math.hypot(e.x,e.z);return t===0?1/0:Math.max(Vg.buildingShadowReachM*Math.max(e.y,0)/t,kx)}var jx=`shadowMaxHeightM`,Mx=`
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
vec4 cappedWorld = modelMatrix * mvPosition;
cappedWorld.y = min( cappedWorld.y, ${jx} );
mvPosition = viewMatrix * cappedWorld;
gl_Position = projectionMatrix * mvPosition;
`;function Nx(e){return e.replace(`#include <common>`,`#include <common>\nuniform float ${jx};`).replace(`#include <project_vertex>`,Mx)}function Px(e){let t=new Id;return t.userData[jx]=e,t.onBeforeCompile=t=>{t.uniforms[jx]={value:e},t.vertexShader=Nx(t.vertexShader)},t.customProgramCacheKey=()=>`cappedShadowDepth`,t}var Fx=V(.08),Ix=V(1.2),Lx=14210248;function Rx(e){return new is().compose(new q(e.x,e.y,e.z),new Po().setFromEuler(new ms(0,e.rotationY,0)),new q(e.scaleX,e.scaleY,e.scaleZ))}function zx(e){return{x:e.x,y:e.y,z:e.z,rotationY:He(e.headingRad),scaleX:1,scaleY:1,scaleZ:1}}function Bx(e){return{...zx(e),scaleX:e.sizeX,scaleY:e.sizeY,scaleZ:e.sizeZ}}function Vx(e,t,n,r){if(n.length===0)return;let i=new _l(e,t,n.length);return n.forEach((e,t)=>{i.setMatrixAt(t,Rx(e))}),r.colors?.forEach((e,t)=>{i.setColorAt(t,e)}),i.instanceMatrix.needsUpdate=!0,i.name=r.name,i.castShadow=r.castShadow??!1,i.receiveShadow=r.receiveShadow??!0,i}function Hx(e,t){return e.flatMap(e=>e===void 0?[]:[{mesh:e,index:t}])}function Ux(){return new Yl(1,1,1).translate(0,.5,0)}function Wx(e,t){let n=new J(t),r=e.getAttribute(`position`).count,i=new Float32Array(r*3);for(let e=0;e<r;e+=1)i[e*3]=n.r,i[e*3+1]=n.g,i[e*3+2]=n.b;return e.setAttribute(`color`,new bc(i,3)),e}function Gx(e,t,n=.5){return new J(e[Math.min(Math.floor(t*e.length),e.length-1)]??16777215).multiplyScalar(.85+.3*n)}function Kx(e){return e*7.31%1}function qx(e,t,n,r=0){return Cv(e,{color:t,roughness:n,metalness:r,overlayTint:e===`galvanized`?.5:1})}function Jx(e){let t=Re(e.headingRad);return{x:e.x+t.x*Z.lampArmLengthM,y:e.sizeY-Z.lampHeadSizeM.y/2,z:e.z+t.z*Z.lampArmLengthM}}function Yx(e){let t=Z.lampHeightM,n=Z.lampHeadSizeM,r=Z.lampArmLengthM,i=new Zl(Z.lampPoleRadiusM*.75,Z.lampPoleRadiusM,t,10).translate(0,t/2,0),a=new Yl(n.x,n.y,n.z).translate(0,t,-r);if(e===`classic`){let e=V(.35);return[i,new Yl(e,e,r).translate(0,t-e,-r/2),a]}let o=V(1.6),s={x:V(.8),y:V(.9),z:V(.8)},c={x:V(.55),y:V(.4)},l=r-n.z/2+V(.4),u=V(3.2),d=V(3.2),f=Math.hypot(u,d),p=V(.3),m=new Yl(p,p,f).rotateX(Math.atan2(u,d)).translate(0,t-u/2-c.y/2,-d/2),h=V(.9),g=new Yl(n.x*.62,n.y*1.25,h).translate(0,t,-r+n.z/2+h/2-V(.1));return[new Zl(Z.lampPoleRadiusM*1.5,Z.lampPoleRadiusM*1.9,o,10).translate(0,o/2,0),i,new Yl(s.x,s.y,s.z).translate(0,t-s.y/2+n.y/2,0),new Yl(c.x,c.y,l).translate(0,t,-l/2),m,g,a]}function Xx(e,t,n,r,i,a){if(t.length===0)return;let o=Z.lampHeightM,s=Z.lampHeadSizeM,c=Z.lampArmLengthM,l=Vx(rb(Yx(a)),qx(`galvanized`,Z.lampColor,.6,.5),t.map(zx),{name:`lampPosts`,castShadow:!0}),u=V(.1),d=Vx(new Yl(s.x*.82,u,s.z*.82).translate(0,o-s.y/2-u/2,-c),i?new Nd({color:Z.lampGlowColor,emissive:Z.lampGlowColor,emissiveIntensity:Z.lampGlowIntensity,roughness:.4}):new Nd({color:Lx,roughness:.4}),t.map(zx),{name:`lampLenses`,receiveShadow:!1});for(let t of[l,d])t!==void 0&&e.add(t);let f=c+s.z/2;if(ob(e,t.map((e,t)=>{let n=Re(e.headingRad);return{boxes:[lb({x:e.x,y:o/2,z:e.z},{x:2*Z.lampPoleRadiusM,y:o,z:2*Z.lampPoleRadiusM}),lb({x:e.x+n.x*f/2,y:o-Ix/2+s.y/2,z:e.z+n.z*f/2},{x:s.x,y:Ix,z:f},He(e.headingRad))],parts:Hx([l,d],t)}})),!i)return;let p=t.map(Jx),m=Math.min(n.realLights,t.length),h=e=>new qc({color:new J(Z.lampConeColor).multiplyScalar(r?e.hdr:e.direct),vertexColors:!0,transparent:!0,blending:2,depthWrite:!1,fog:!1,toneMapped:!1});if(n.lightCones){let t=new Zl(1,1,1,24,6,!0).translate(0,-.5,0),n=t.getAttribute(`position`),r=new Float32Array(n.count*3);for(let e=0;e<n.count;e+=1){let t=-n.getY(e),i=Z.lampConeTopRadiusM+(Z.lampConeBottomRadiusM-Z.lampConeTopRadiusM)*t;n.setXYZ(e,n.getX(e)*i,-t,n.getZ(e)*i);let a=(1-t)**2;r.set([a,a,a],e*3)}t.setAttribute(`color`,new bc(r,3));let i=Vx(t,h(Z.lampConeBrightness),p.map(e=>({x:e.x,y:e.y,z:e.z,rotationY:0,scaleX:1,scaleY:e.y,scaleZ:1})),{name:`lampCones`,receiveShadow:!1});i!==void 0&&(i.userData[y_]=!0,e.add(i))}let g=new Xl(Z.lampPoolRadiusM,32).rotateX(-Math.PI/2),_=g.getAttribute(`position`),v=new Float32Array(_.count*3);for(let e=0;e<_.count;e+=1){let t=Math.hypot(_.getX(e),_.getZ(e))/Z.lampPoolRadiusM,n=Math.max(0,1-t);v.set([n,n,n],e*3)}g.setAttribute(`color`,new bc(v,3));let y=Vx(g,h(Z.lampPoolBrightness),p.slice(m).map(e=>({x:e.x,y:Fx,z:e.z,rotationY:0,scaleX:1,scaleY:1,scaleZ:1})),{name:`lampPools`,receiveShadow:!1});y!==void 0&&(y.userData[y_]=!0,e.add(y));for(let t of p.slice(0,m)){let n=new bf(Z.lampGlowColor,Z.lampLightIntensity,Z.lampLightDistanceM,Z.lampLightAngleRad,Z.lampLightPenumbra);n.name=`lampLight`,n.position.set(t.x,t.y,t.z),n.target.position.set(t.x,0,t.z),e.add(n,n.target)}}function Zx(e,t,n,r){let i=V(.55),a=Vx(new Zl(.7,1,1,8).translate(0,.5,0),new Nd({color:Z.trunkColor,roughness:.95}),t.map(e=>({...zx(e),scaleX:i,scaleY:e.sizeY*.5,scaleZ:i})),{name:`treeTrunks`,castShadow:!0}),o=[],s=[];for(let e of t){let t=e.sizeX/2,n=Re(e.headingRad),r=He(e.headingRad);o.push({x:e.x,y:e.sizeY*.62,z:e.z,rotationY:r,scaleX:t,scaleY:e.sizeY*.36,scaleZ:t*(.85+.15*e.variant)}),o.push({x:e.x+n.x*t*.45,y:e.sizeY*.74,z:e.z+n.z*t*.45,rotationY:r+1,scaleX:t*.62,scaleY:e.sizeY*.24,scaleZ:t*.62});let i=Gx(Z.foliageColors,e.variant,Kx(e.variant));s.push(i,i.clone().multiplyScalar(1.12))}for(let e of n)o.push({x:e.x,y:e.sizeY*.4,z:e.z,rotationY:He(e.headingRad),scaleX:e.sizeX/2,scaleY:e.sizeY*.6,scaleZ:e.sizeZ/2}),s.push(Gx(Z.foliageColors,e.variant,Kx(e.variant)));let c=Vx(new gd(1,r===`high`?2:1),new Nd({color:16777215,roughness:Z.foliageRoughness,flatShading:!0}),o,{name:`foliage`,castShadow:!0,colors:s});for(let t of[a,c])t!==void 0&&e.add(t);ob(e,t.map((e,t)=>({boxes:[lb({x:e.x,y:e.sizeY*.25,z:e.z},{x:2*i,y:e.sizeY*.5,z:2*i}),lb({x:e.x,y:e.sizeY*.64,z:e.z},{x:e.sizeX*.8,y:e.sizeY*.6,z:e.sizeX*.8})],parts:[...Hx([a],t),...Hx([c],2*t),...Hx([c],2*t+1)]})))}function Qx(){let e=V(1.2),t=V(.12),n=V(2.15),r=V(.45),i=V(.1),a=e=>r+(i-r)*e,o=V(.02);return rb([Wx(new Yl(e,t,e).translate(0,t/2,0),Z.trafficConeBaseColor),Wx(new Zl(i,r,n,12).translate(0,t+n/2,0),Z.trafficConeColor),Wx(new Zl(a(.68)+o,a(.45)+o,.23000000000000004*n,12,1,!0).translate(0,t+1.1300000000000001/2*n,0),Z.trafficConeStripeColor)])}function $x(){let e=V(3),t=V(.3);return rb([Wx(new Zl(V(1),V(.85),e,14).translate(0,e/2,0),Z.binColor),Wx(new Zl(V(1.08),V(1.08),t,14).translate(0,e+t/2,0),Z.binLidColor)])}function eS(){let e=V(7.4),t=V(1.7),n=V(.08),r=e-t/2,i=t*.5;return rb([Wx(new Zl(V(.09),V(.09),e,6).translate(0,e/2,0),Z.signPoleColor),Wx(new Yl(t,t,n).translate(0,r,0),Z.signPlateColor),Wx(new Yl(i,i,n*1.6).translate(0,r,0),Z.signMarkColor)])}function tS(e,t,n,r,i=!0,a=`classic`,o=1/0){let s=Mv(e);s.name=`lotProps`;let c=e=>{e!==void 0&&s.add(e)},l=Ux(),u=(e,t)=>{c(e),e!==void 0&&ob(s,t.flatMap((t,n)=>t.y+t.sizeY<Ng.minHeightM?[]:[{boxes:[lb({x:t.x,y:t.y+t.sizeY/2,z:t.z},{x:t.sizeX,y:t.sizeY,z:t.sizeZ},He(t.headingRad))],parts:[{mesh:e,index:n}]}]))};s.add(Ox(t.parkedCars,n.meshDetail)),Xx(s,t.lamps,n,r,i,a);let d=[...t.pillars,...t.beams];u(Vx(l,qx(`concrete`,Z.concreteColor,Z.concreteRoughness),d.map(Bx),{name:`concrete`,castShadow:!0}),d);let f=Vx(l,qx(`concrete`,16777215,Z.buildingRoughness),t.buildings.map(Bx),{name:`buildings`,castShadow:!0,colors:t.buildings.map(e=>Gx(Z.buildingColors,e.variant,Kx(e.variant)))});f!==void 0&&Number.isFinite(o)&&(f.customDepthMaterial=Px(o)),u(f,t.buildings);let p=Z.buildingWindowLitColor,m=Z.buildingWindowDarkColor;u(Vx(l,new qc({color:16777215}),t.windows.map(Bx),{name:`buildingWindows`,receiveShadow:!1,colors:t.windows.map(e=>e.variant>0?new J().setRGB(p.r,p.g,p.b).multiplyScalar(e.variant):new J().setRGB(m.r,m.g,m.b))}),t.windows),c(Vx(l,qx(`galvanized`,Z.fenceColor,.6,.4),[...t.fencePosts,...t.fenceRails].map(Bx),{name:`fence`,castShadow:n.detailShadows})),Zx(s,t.trees,t.bushes,n.meshDetail),c(Vx(l,qx(`wornPaint`,Z.stallLineColor,.85),t.stallLines.map(Bx),{name:`stallLines`})),c(Vx(Pv(),Fv(),t.wheelStops.map(zx),{name:`wheelStops`,castShadow:!0}));let h=Cv(`paintedMetal`,{color:16777215,roughness:.75,metalness:.15,parameters:{vertexColors:!0}}),g=Cv(`plastic`,{color:16777215,roughness:.75,parameters:{vertexColors:!0}});return c(Vx($x(),h,t.bins.map(zx),{name:`bins`,castShadow:n.detailShadows})),c(Vx(Qx(),g,t.trafficCones.map(zx),{name:`trafficCones`,castShadow:n.detailShadows})),c(Vx(eS(),h,t.signs.map(zx),{name:`signs`,castShadow:n.detailShadows})),c(Vx(l,qx(`galvanized`,Z.drainColor,.55,.6),t.drains.map(Bx),{name:`drains`})),s}var nS={open_lot:{main:null,secondary:[]},warehouse_club:{main:`BULKWORTH WHOLESALE CLUB`,secondary:[`MEMBERS ENTRANCE`,`TIRE CENTER`,`CART RETURN`]},post_office:{main:`MAPLE HOLLOW POST OFFICE`,secondary:[`MAIL`,`15 MIN PARKING`]},city_street:{main:null,secondary:[`DELLA'S DINER`,`CORNER BOOKS`,`SUDS LAUNDROMAT`,`HANK'S HARDWARE`,`BLUE KETTLE CAFE`,`OAK ST`,`2 HR PARKING`]},narrow_alley:{main:null,secondary:[`LOADING ZONE`,`DELIVERIES ONLY`,`NO PARKING`]}};function rS(e){let{main:t,secondary:n}=nS[e];return t===null?n:[t,...n]}function iS(e,t){if(!rS(e).includes(t))throw Error(`招牌文字「${t}」不在 ${e} 的表裡`);return t}var aS=[`n`,`s`,`w`,`e`],oS=.12,sS=4,cS=9,lS=7,uS=5.6,dS={lateralFt:.25,lengthwiseFt:.7,skewDeg:1.5};function fS(e,t){switch(t){case`n`:return{side:t,from:e.minXFt,to:e.maxXFt,inwardDeg:180,point:(t,n)=>({x:t,z:e.minZFt-n})};case`s`:return{side:t,from:e.minXFt,to:e.maxXFt,inwardDeg:0,point:(t,n)=>({x:t,z:e.maxZFt+n})};case`w`:return{side:t,from:e.minZFt,to:e.maxZFt,inwardDeg:90,point:(t,n)=>({x:e.minXFt-n,z:t})};case`e`:return{side:t,from:e.minZFt,to:e.maxZFt,inwardDeg:270,point:(t,n)=>({x:e.maxXFt+n,z:t})}}}function pS(e){let t=Re(H(e));return Math.abs(t.x)>Math.abs(t.z)?t.x>0?`e`:`w`:t.z>0?`s`:`n`}var mS=class{lot;slabs=[];signs=[];poleSigns=[];constructor(){let e={};for(let t of Lv)e[t]=[];this.lot=e}slab(e,t,n,r,i,a,o={}){this.slabs.push({...o,kind:e,minX:V(Math.min(t.x,n.x)),maxX:V(Math.max(t.x,n.x)),minZ:V(Math.min(t.z,n.z)),maxZ:V(Math.max(t.z,n.z)),minY:V(r),maxY:V(i),color:a,surface:HS(e,a)})}sideSlab(e,t,n,r,i,a,o,s,c){this.slab(e,t.point(n,i),t.point(r,a),o,s,c,e===`decal`?{facingRad:H(t.inwardDeg)}:{})}wallGlass(e,t,n,r,i,a){this.slab(`decal`,e.point(t,-.12),e.point(n,0),r,i,0,{facingRad:H(e.inwardDeg),lit:a})}prop(e,t,n,r=0,i=0,a=0){this.lot[e].push({x:V(t.x),z:V(t.z),y:V(a),headingRad:H(r),sizeX:V(n.x),sizeY:V(n.y),sizeZ:V(n.z),variant:i})}glass(e,t,n,r,i,a,o){let s=e.side===`n`||e.side===`s`,c=Math.abs(n-t),l=2*oS;this.prop(`windows`,e.point((t+n)/2,r),s?{x:c,y:a-i,z:l}:{x:l,y:a-i,z:c},0,o,i)}sign(e,t,n,r,i,a,o,s,c=0){let l=e.point(r,i-oS-.05);this.signs.push({text:t,style:n,x:V(l.x),y:V(a),z:V(l.z),facingRad:H(e.inwardDeg),widthM:V(o),heightM:V(s),glow:c})}poleSign(e,t,n,r,i,a,o){let s=.12;this.poleSigns.push({slab:this.slabs.length,sign:this.signs.length}),this.slab(`solid`,{x:e.x-s,z:e.z-s},{x:e.x+s,z:e.z+s},0,o,4935509);let c=Re(H(r));this.signs.push({text:t,style:n,x:V(e.x+c.x*.16999999999999998),y:V(o-a/2),z:V(e.z+c.z*.16999999999999998),facingRad:H(r),widthM:V(i),heightM:V(a),glow:0})}},hS={x:U.widthM/V(1),y:U.heightM/V(1),z:U.lengthM/V(1)},gS={x:2*Z.lampPoleRadiusM/V(1),y:Z.lampHeightM/V(1),z:2*Z.lampPoleRadiusM/V(1)},_S=Gg.lineWidthM/V(1),vS=Gg.liftM/V(1),yS=Z.stallLineHeightM/V(1);function bS(e,t,n){e.prop(`stallLines`,{x:(t.x+n.x)/2,z:(t.z+n.z)/2},{x:Math.abs(n.x-t.x),y:yS,z:Math.abs(n.z-t.z)},0,0,vS)}function xS(e,t,n,r){let i=Math.max(1,Math.floor((t.to-t.from)/cS)),a=(t.from+t.to)/2-i*cS/2,o=lS;for(let s=0;s<=i;s+=1){let c=a+s*cS;if(bS(e,t.point(c-_S/2,o),t.point(c+_S/2,25)),s===i)break;let l=n()<r,u=(n()*2-1)*dS.lateralFt,d=(n()*2-1)*dS.lengthwiseFt,f=n()<.3,p=(n()*2-1)*dS.skewDeg,m=n();l&&e.prop(`parkedCars`,t.point(c+cS/2+u,16+d),hS,t.inwardDeg+(f?180:0)+p,m)}bS(e,t.point(a,25),t.point(a+i*cS,25+_S))}function SS(e,t,n,r=uS){let i=t.to-t.from,a=Math.max(1,Math.round(i/n));for(let n=0;n<a;n+=1){let o=t.from+(n+.5)/a*i;e.prop(`lamps`,t.point(o,r),gS,t.inwardDeg)}}function CS(e,t,n,r,i,a=13){let o=t.to-t.from+40,s=Math.max(1,Math.round(o/i));for(let i=0;i<s;i+=1){let c=t.from-20+(i+.5)/s*o+(n()*2-1)*4,l=a+5*n();e.prop(`trees`,t.point(c,r+3*n()),{x:l,y:l+5+6*n(),z:l},n()*360,n())}}function wS(e,t,n,r,i,a,o,s){let c=Z.buildingWindowSpacingM/V(1),l=Z.buildingFloorHeightM/V(1),u=Z.buildingWindowSizeM.x/V(1),d=Z.buildingWindowSizeM.y/V(1),f=Math.floor((r-n-.5*c)/c),p=Math.floor((o-a-.2*l)/l);for(let o=0;o<p;o+=1)for(let p=0;p<f;p+=1){let m=(n+r)/2+(p-(f-1)/2)*c,h=s()<Z.buildingWindowLitChance?.55+.45*s():0,g=a+(o+.3)*l;e.glass(t,m-u/2,m+u/2,i,g,g+d,h)}}function TS(e,t,n,r){let i=t.side===`n`||t.side===`s`,a=(t.from+t.to)/2;for(let o of[-55,45]){let s=50+20*n(),c=45+15*n(),l=30+26*n(),u=a+o+(n()*2-1)*10,d=r+25*n();e.prop(`buildings`,t.point(u,d+c/2),i?{x:s,y:l,z:c}:{x:c,y:l,z:s},0,n()),wS(e,t,u-s/2,u+s/2,d,0,l,n)}}function ES(e,t,n,r,i){for(let a of aS){let o=fS(t,a);SS(e,o,46),a!==r&&(xS(e,o,n,i),CS(e,o,n,35,34),TS(e,o,n,85))}}var DS={wall:13617336,portal:14472902,teal:2068362,orange:15237674,walkway:12433581,bayDoor:4870230},OS={halfWidth:10,topY:9.6,frameColor:3488320,frameDepth:.4,frameWidth:.5,mullionWidth:.28,doorWidth:4,doorTopY:7.3,doorGlow:.3,sideGlow:.17,transomGlow:.22,kickColor:2830132,kickTopY:1.1,handleColor:13225683,canopyDepth:3.6,canopyHalfWidth:13,canopyY:10.1,canopyTopY:10.8,canopyPost:.5};function kS(e,t,n,r){let i=OS,a=r-i.frameDepth,o=n-i.halfWidth,s=n+i.halfWidth;e.sideSlab(`solid`,t,o,o+i.frameWidth,a,r,0,i.topY,i.frameColor),e.sideSlab(`solid`,t,s-i.frameWidth,s,a,r,0,i.topY,i.frameColor),e.sideSlab(`solid`,t,o,s,a,r,i.topY-i.frameWidth,i.topY,i.frameColor),e.sideSlab(`solid`,t,o,s,a,r,i.doorTopY,i.doorTopY+i.mullionWidth,i.frameColor);let c=o+i.frameWidth,l=s-i.frameWidth,u=(l-c-2*i.doorWidth)/4,d=[c,c+u,c+2*u,n,l-2*u,l-u,l],f=i.topY-i.frameWidth;d.slice(0,-1).forEach((n,o)=>{let s=d[o+1]??n,c=o===2||o===3,l=i.mullionWidth/2;e.glass(t,n+l,s-l,r,i.kickTopY,i.doorTopY,c?i.doorGlow:i.sideGlow),e.glass(t,n+l,s-l,r,i.doorTopY+i.mullionWidth,f,i.transomGlow),e.sideSlab(`solid`,t,n,s,a+.1,r,.45,i.kickTopY,i.kickColor),o>0&&e.sideSlab(`solid`,t,n-l,n+l,a,r,0,f,i.frameColor)});for(let r of[-1,1]){let o=n+r*.55;e.sideSlab(`solid`,t,o-.07,o+.07,a-.12,a,2.9,4.7,i.handleColor)}let p=r-i.canopyDepth;e.sideSlab(`solid`,t,n-i.canopyHalfWidth,n+i.canopyHalfWidth,p,r,i.canopyY,i.canopyTopY,DS.teal),e.sideSlab(`solid`,t,n-i.canopyHalfWidth,n+i.canopyHalfWidth,p-.15,p,i.canopyY-.25,i.canopyY+.1,DS.orange);for(let r of[-1,1]){let a=n+r*(i.canopyHalfWidth-.8);e.sideSlab(`solid`,t,a-i.canopyPost/2,a+i.canopyPost/2,p+.2,p+.2+i.canopyPost,.45,i.canopyY,i.frameColor)}let m=i.canopyTopY,h=i.canopyTopY+2.4;e.sideSlab(`solid`,t,n-10-.2,n+10+.2,p+.1,p+.5,m,h+.15,DS.portal),e.sign(t,iS(`warehouse_club`,`MEMBERS ENTRANCE`),`clubMinor`,n,p+.1,(m+h)/2,20,h-m,.3)}function AS(e,t){let n=(t.from+t.to)/2,r=Math.max((t.to-t.from)/2+55,95);e.sideSlab(`solid`,t,n-r,n+r,sS,16,0,.45,DS.walkway),e.sideSlab(`solid`,t,n-r,n+r,16,136,0,30,DS.wall),e.sideSlab(`solid`,t,n-r,n+r,15.7,16,21.5,25,DS.teal),e.sideSlab(`solid`,t,n-r,n+r,15.65,16,19.8,20.9,DS.orange),e.sideSlab(`solid`,t,n-24,n+24,11,16,0,36,DS.portal),e.sideSlab(`solid`,t,n-24,n+24,10.7,11,33,36,DS.teal),e.sideSlab(`solid`,t,n-24,n+24,10.7,11,13.2,14.2,DS.orange),e.sign(t,iS(`warehouse_club`,`BULKWORTH WHOLESALE CLUB`),`club`,n,11,24,44,7.6,.85),kS(e,t,n,11);let i=n+58;for(let n of[-13,0,13])e.sideSlab(`solid`,t,i+n-5.5,i+n+5.5,15.8,16,0,11,DS.bayDoor);e.sign(t,iS(`warehouse_club`,`TIRE CENTER`),`clubMinor`,i,16,15.5,22,3.2,.3)}var jS={brick:10115652,cream:15327951,green:2054970,walkway:12762545};function MS(e,t){let n=(t.from+t.to)/2,r=Math.max((t.to-t.from)/2+20,43);e.sideSlab(`solid`,t,n-r,n+r,sS,14,0,.45,jS.walkway),e.sideSlab(`solid`,t,n-33,n+33,14,56,0,19,jS.brick),e.sideSlab(`solid`,t,n-33-.5,n+33+.5,13.6,14,11.6,20.2,jS.cream),e.sideSlab(`solid`,t,n-33-.5,n+33+.5,13.5,14,10.8,11.6,jS.green),e.sign(t,iS(`post_office`,`MAPLE HOLLOW POST OFFICE`),`postal`,n,13.6,15.8,50,6.6,.7),e.glass(t,n-4,n+4,14,.4,8.2,.9),e.sideSlab(`solid`,t,n-6.5,n+6.5,10.5,14,8.8,9.5,jS.green);for(let r of[-1,1])e.glass(t,n+r*12,n+r*24,14,3,8.6,r>0?.75:.5);let i=t.point(n-9.5,11.6),a=t.point(n-6.5,13.6);e.slab(`solid`,i,a,0,4.4,jS.green),e.sign(t,iS(`post_office`,`MAIL`),`mail`,n-8,11.719999999999999,3.2,2.4,1),e.poleSign(t.point(n+18,5.2),iS(`post_office`,`15 MIN PARKING`),`notice`,t.inwardDeg,3,2.2,7.2)}var NS={sidewalk:11775908,yellow:14070330,parkWall:9198152,grass:5204794,shops:[9194044,13483935,6255744,10191976,7307100,10572858,8022666],awnings:[2054970,9382434,2578027,12154666,3881526]},PS=[`shopA`,`shopB`,`shopC`,`shopD`,`shopE`],FS=14,IS=70;function LS(e,t,n,r){let i=n.minXFt-IS,a=n.maxXFt+IS,o=[`DELLA'S DINER`,`CORNER BOOKS`,`SUDS LAUNDROMAT`,`HANK'S HARDWARE`,`BLUE KETTLE CAFE`].map(e=>iS(`city_street`,e)),s=0;for(let t of[`n`,`s`]){let c=fS(n,t);if(e.sideSlab(`solid`,c,i,a,sS,FS,0,.48,NS.sidewalk),e.sideSlab(`solid`,c,i,n.minXFt-sS,0,sS,0,.5,NS.sidewalk),e.sideSlab(`solid`,c,n.maxXFt+sS,a,0,sS,0,.5,NS.sidewalk),SS(e,{...c,from:i+(t===`n`?0:30),to:a},62,6),CS(e,{...c,from:c.from+(t===`n`?25:-5),to:c.to-20},r,9.5,58,7),t===`s`){e.sideSlab(`solid`,c,i,a,FS,15,0,2.6,NS.parkWall),e.sideSlab(`solid`,c,i,a,15,104,0,.3,NS.grass),CS(e,c,r,28,30),CS(e,c,r,56,36);continue}let l=i;for(;l<a-12;){let t=Math.min(28+6*r(),a-l),i=24+Math.floor(r()*3)*7,u=NS.shops[Math.floor(r()*NS.shops.length)]??NS.shops[0],d=NS.awnings[Math.floor(r()*NS.awnings.length)]??NS.awnings[0],f=.6+.4*r();e.sideSlab(`solid`,c,l+.3,l+t-.3,FS,59,0,i,u),e.glass(c,l+3,l+6.6,FS,.5,8,f*.7),e.glass(c,l+8.5,l+t-3,FS,2.2,8.6,f),e.sideSlab(`solid`,c,l+1.5,l+t-1.5,11,FS,9.6,10.2,d),wS(e,c,l+1,l+t-1,FS,13.5,i,r);let p=l+t/2;if(p>n.minXFt-25&&p<n.maxXFt+25&&s<o.length){let n=o[s]??``;e.sign(c,n,PS[s%PS.length]??`shopA`,p,FS,12,Math.min(t-4,26),3.2,.45),s+=1}l+=t}}let c=t.spotFt,l=(n.minZFt+n.maxZFt)/2,u=c.centerZFt>l?1:-1,d=u>0?n.maxZFt:n.minZFt,f=u>0?n.minZFt:n.maxZFt,p=c.centerZFt-u*c.widthFt/2;bS(e,{x:i,z:p-_S/2},{x:a,z:p+_S/2});let m=[{center:c.centerXFt,half:c.lengthFt/2},...t.obstaclesFt.filter(e=>e.type===`parked_car`&&(e.centerZFt-p)*u>0).map(e=>({center:e.centerXFt,half:e.lengthFt/2+2}))].sort((e,t)=>e.center-t.center),h=[];m.forEach((e,t)=>{let n=m[t-1];h.push(n===void 0?e.center-e.half:(n.center+n.half+e.center-e.half)/2),t===m.length-1&&h.push(e.center+e.half)});for(let t of h)bS(e,{x:t-_S/2,z:p},{x:t+_S/2,z:d});let g=(f+p)/2;for(let t=i+5;t+10<=a;t+=30)e.slab(`flat`,{x:t,z:g-_S/2},{x:t+10,z:g+_S/2},vS,vS+yS,NS.yellow);let _=t.startFt.xFt<(n.minXFt+n.maxXFt)/2?-1:1;e.poleSign({x:_<0?n.minXFt+22:n.maxXFt-22,z:f-u*5.5},iS(`city_street`,`OAK ST`),`street`,_<0?270:90,4.6,1.3,10.5),e.poleSign({x:c.centerXFt+c.lengthFt/2+1.5,z:d+u*5.2},iS(`city_street`,`2 HR PARKING`),`notice`,u>0?0:180,2.8,2.3,7.6)}var RS={doors:[5911334,3099194,4015696],rollUp:10133668,rollUpRib:8423050,yellow:14070330,roofUnit:9146516};function zS(e,t,n){return e.obstaclesFt.some(e=>{if(e.type!==`wall`)return!1;let r=Math.abs(Math.round(e.headingDeg/90))%2==1,i=(r?e.lengthFt:e.widthFt)/2,a=(r?e.widthFt:e.lengthFt)/2;return Math.abs(t-e.centerXFt)<=i&&Math.abs(n-e.centerZFt)<=a})}function BS(e,t,n,r){let i=t.spotFt,a=pS(i.headingDeg+180);for(let o of aS){let s=fS(n,o),c=e=>{let n=s.point(e,-.5);return!zS(t,n.x,n.z)},l=o===`n`||o===`s`?i.centerXFt:i.centerZFt,u=0;for(let t=s.from+7;t<=s.to-7;t+=15,u+=1){let n=r()<.45?.5+.5*r():0,i=RS.doors[Math.floor(r()*RS.doors.length)]??RS.doors[0];!c(t)||o===a&&Math.abs(t-l)<12||(u%3==0?(e.sideSlab(`decal`,s,t-1.8,t+1.8,-.12,0,0,7.2,i),e.wallGlass(s,t-.6,t+.6,8,8.6,1)):e.wallGlass(s,t-2.2,t+2.2,10.5,15,n))}SS(e,s,34,2.5);for(let t=s.from;t<s.to;t+=6)c(t+3)&&e.sideSlab(`flat`,s,t,Math.min(t+6,s.to),-1.2,-1.2+_S,vS,vS+yS,RS.yellow);for(let t of[.25,.7]){let n=s.from+(s.to-s.from)*t;e.sideSlab(`solid`,s,n-4,n+4,10+6*r(),18+6*r(),20,29,RS.roofUnit)}if(o===a){e.sideSlab(`decal`,s,l-6,l+6,-.12,0,0,11,RS.rollUp);for(let t=1;t<=6;t+=1)e.sideSlab(`decal`,s,l-6,l+6,-.15,0,t*1.55,t*1.55+.18,RS.rollUpRib);e.sign(s,iS(`narrow_alley`,`LOADING ZONE`),`alley`,l,0,13,13,2.1,.3);let t=l+16<=s.to-6?l+16:l-16;c(t)&&e.sign(s,iS(`narrow_alley`,`DELIVERIES ONLY`),`notice`,t,0,8.4,9,1.6,.2)}}let o=t.startFt,s=Re(H(o.headingDeg)),c=Math.abs(s.z)>=Math.abs(s.x);for(let r of c?[`w`,`e`]:[`n`,`s`]){let i=fS(n,r),a=c?o.zFt+s.z*34:o.xFt+s.x*34,l=i.point(a,-.5);zS(t,l.x,l.z)||e.sign(i,iS(`narrow_alley`,`NO PARKING`),`warning`,a,0,7.6,7,1.5,.2)}for(let i of t.obstaclesFt){if(i.type!==`wall`)continue;let t=Math.abs(Math.round(i.headingDeg/90))%2==1,a={minXFt:i.centerXFt-(t?i.lengthFt:i.widthFt)/2,maxXFt:i.centerXFt+(t?i.lengthFt:i.widthFt)/2,minZFt:i.centerZFt-(t?i.widthFt:i.lengthFt)/2,maxZFt:i.centerZFt+(t?i.widthFt:i.lengthFt)/2};for(let t of aS){let i=fS(a,t),o={...i,inwardDeg:i.inwardDeg+180,point:(e,t)=>i.point(e,-t)},s=i.point((i.from+i.to)/2,1);if(!(s.x>n.minXFt&&s.x<n.maxXFt&&s.z>n.minZFt&&s.z<n.maxZFt))continue;let c=0;for(let t=i.from+9;t<=i.to-7;t+=15,c+=1){let n=r()<.45?.5+.5*r():0;c%3==1?(e.sideSlab(`decal`,o,t-1.8,t+1.8,-.12,0,0,7.2,RS.doors[c%RS.doors.length]??RS.doors[0]),e.wallGlass(o,t-.6,t+.6,8,8.6,1)):e.wallGlass(o,t-2.2,t+2.2,10.5,15,n)}}}}var VS=new Map([[DS.wall,`concrete`],[DS.portal,`concrete`],[DS.walkway,`concrete`],[DS.teal,`paintedMetal`],[DS.orange,`paintedMetal`],[DS.bayDoor,`corrugated`],[OS.frameColor,`paintedMetal`],[OS.kickColor,`paintedMetal`],[OS.handleColor,`chrome`],[jS.brick,`brick`],[jS.cream,`plaster`],[jS.green,`paintedMetal`],[jS.walkway,`concrete`],[NS.sidewalk,`concrete`],[NS.parkWall,`brick`],[NS.grass,`plaster`],[9194044,`brick`],[13483935,`plaster`],[6255744,`plaster`],[10191976,`brick`],[7307100,`concrete`],[10572858,`brick`],[8022666,`plaster`],[9382434,`plastic`],[2578027,`plastic`],[12154666,`plastic`],[3881526,`plastic`],...RS.doors.map(e=>[e,`paintedMetal`]),[RS.rollUp,`corrugated`],[RS.rollUpRib,`galvanized`],[RS.roofUnit,`galvanized`]]);function HS(e,t){return e===`flat`?`wornPaint`:VS.get(t)??`plaster`}var US=1.2;function WS(e,t){let n=ze(e.headingRad),r=Re(e.headingRad),i=e.sizeX/2+t,a=e.sizeZ/2+t;return[[-1,-1],[1,-1],[1,1],[-1,1]].map(([t=0,o=0])=>({x:e.x+n.x*t*i+r.x*o*a,z:e.z+n.z*t*i+r.z*o*a}))}function GS(e,t,n=0){let r=WS(e,n/2),i=WS(t,n/2);for(let n of[e,t])for(let e of[ze(n.headingRad),Re(n.headingRad)]){let t=t=>t.x*e.x+t.z*e.z,n=r.map(t),a=i.map(t);if(Math.max(...n)<Math.min(...a)||Math.max(...a)<Math.min(...n))return!1}return!0}function KS(e,t,n){let r=V(US),i=[...n,...t.obstaclesFt.filter(e=>e.type===`parked_car`).map(e=>({x:V(e.centerXFt),z:V(e.centerZFt),y:0,headingRad:H(e.headingDeg),sizeX:V(e.widthFt),sizeY:0,sizeZ:V(e.lengthFt),variant:0}))],a=[];for(let t of e)[...i,...a].some(e=>GS(t,e,r))||a.push(t);return a}function qS(e,t){return e.slice(0,Math.max(0,Math.ceil(t)))}function JS(e,t,n){return[...e].sort((e,r)=>Math.hypot(e.x-t,e.z-n)-Math.hypot(r.x-t,r.z-n))}function YS(e,t,n=k){let r=e.boundsFt;if(r===void 0)return;let i=new mS,a=o_(n+104729),o=pS(e.startFt.headingDeg);switch(e.environment){case`open_lot`:ES(i,r,a,void 0,.55);break;case`warehouse_club`:ES(i,r,a,o,.7),AS(i,fS(r,o));break;case`post_office`:ES(i,r,a,o,.35),MS(i,fS(r,o));break;case`city_street`:LS(i,e,r,a);break;case`narrow_alley`:BS(i,e,r,a)}let s=V(e.spotFt.centerXFt),c=V(e.spotFt.centerZFt);return{lot:{...i.lot,parkedCars:qS(KS(JS(i.lot.parkedCars,s,c),e,i.lot.lamps),t.parkedCars),lamps:qS(JS(i.lot.lamps,s,c),t.lampHeads),trees:qS(JS(i.lot.trees,s,c),t.trees)},slabs:i.slabs,signs:i.signs,poleSigns:i.poleSigns}}var XS={club:{background:`#12706c`,color:`#f6efdc`,border:`#e8822a`},clubMinor:{background:`#f1ead8`,color:`#12706c`},postal:{background:`#ece5d0`,color:`#1f5b3a`,border:`#1f5b3a`},mail:{background:`#1f5b3a`,color:`#f1ead8`},notice:{background:`#f4f2ea`,color:`#1d4d33`,border:`#1d4d33`},street:{background:`#1d5e3c`,color:`#f4f2ea`,border:`#f4f2ea`},shopA:{background:`#7a2e2a`,color:`#f6e9c8`},shopB:{background:`#2f3f4f`,color:`#f1ead8`},shopC:{background:`#e9dfc3`,color:`#2b4a5a`},shopD:{background:`#3b3a36`,color:`#f0b64a`},shopE:{background:`#27566b`,color:`#f4f2ea`},alley:{background:`#e2c33b`,color:`#1b1b1a`,border:`#1b1b1a`},warning:{background:`#f4f2ea`,color:`#8f2a22`,border:`#8f2a22`}},ZS={width:512,height:128};function QS(e){let{width:t,height:n}=ZS;return e>=t/n?{width:t,height:Math.max(16,Math.round(t/e))}:{width:Math.max(16,Math.round(n*e)),height:n}}var $S=new Map;function eC(e,t,n){if(typeof document>`u`)return;let{width:r,height:i}=QS(n),a=`${e}|${t.background}|${t.color}|${t.border??``}|${r}x${i}`,o=$S.get(a);if(o!==void 0)return o;let s=document.createElement(`canvas`);s.width=r,s.height=i;let c=s.getContext(`2d`);if(c===null)return;c.fillStyle=t.background,c.fillRect(0,0,r,i);let l=t.border===void 0?0:Math.max(2,Math.round(i*.06));t.border!==void 0&&(c.strokeStyle=t.border,c.lineWidth=l,c.strokeRect(l/2,l/2,r-l,i-l));let u=(r-2*l)*.9,d=Math.round((i-2*l)*.68),f=e=>`bold ${e}px sans-serif`;c.font=f(d);let p=c.measureText(e).width;p>u&&(d=Math.max(8,Math.floor(d*u/p)),c.font=f(d)),c.fillStyle=t.color,c.textAlign=`center`,c.textBaseline=`middle`,c.fillText(e,r/2,i/2+d*.04);let m=new Gl(s);return m.colorSpace=no,m.anisotropy=4,$S.set(a,m),m}function tC(e){let t=XS[e.style],n=eC(e.text,t,e.widthM/e.heightM),r=n===void 0?new Nd({color:t.background,roughness:.7}):new Nd({map:n,roughness:.7,emissive:16777215,emissiveMap:n,emissiveIntensity:e.glow}),i=new al(new _d(e.widthM,e.heightM),r);return i.name=`sign`,i.userData.signText=e.text,i.position.set(e.x,e.y,e.z),i.rotation.y=He(e.facingRad)+Math.PI,i.receiveShadow=!0,i}var nC=Gg.liftM*1.5,rC=.55;function iC(e){let t=V(.45),n=V(1.5),r=V(3.2),i=Math.min(e.lengthM*.42,V(9)),a=i/2,o=a-r,s=new ku;s.moveTo(-t,-i/2),s.lineTo(t,-i/2),s.lineTo(t,o),s.lineTo(n,o),s.lineTo(0,a),s.lineTo(-n,o),s.lineTo(-t,o),s.closePath();let c=new al(new yd(s).rotateX(-Math.PI/2),new Nd({color:Gg.color,roughness:Gg.roughness,transparent:!0,opacity:rC,depthWrite:!1}));c.name=`spotArrow`,c.position.y=nC,c.receiveShadow=!0;let l=Mv(e);return l.add(c),l}function aC(e,t,n,r,i=!0,a=1/0){let o=new Ms;o.name=`environment`,o.add(tS({...e,x:0,z:0,headingRad:0},t.lot,n,r,i,`braced`,a));let s=t.slabs.filter(e=>e.facingRad===void 0),c=e=>Math.max(...s.filter(t=>t.surface===e).map(e=>e.maxY)),l=[...new Set(s.map(e=>e.surface))].sort((e,t)=>c(t)-c(e)),u=new Map;for(let e of l){let t=s.filter(t=>t.surface===e),n=new _l(new Yl(1,1,1),Cv(e,{color:16777215}),t.length);t.forEach((e,t)=>{n.setMatrixAt(t,new is().makeTranslation((e.minX+e.maxX)/2,(e.minY+e.maxY)/2,(e.minZ+e.maxZ)/2).scale(new q(e.maxX-e.minX,e.maxY-e.minY,e.maxZ-e.minZ))),n.setColorAt(t,new J(e.color)),u.set(e,{mesh:n,index:t})}),n.instanceMatrix.needsUpdate=!0,n.name=`environmentSlabs`,n.userData.surface=e,n.castShadow=e!==`wornPaint`,n.castShadow&&Number.isFinite(a)&&(n.customDepthMaterial=Px(a)),n.receiveShadow=!0,o.add(n)}let d=Z.buildingWindowLitColor,f=Z.buildingWindowDarkColor,p=t.slabs.filter(e=>e.facingRad!==void 0),m=[...new Set(p.filter(e=>e.lit===void 0).map(e=>e.surface)),`glow`];for(let e of m){let t=e===`glow`,n=p.filter(n=>t?n.lit!==void 0:n.lit===void 0&&n.surface===e);if(n.length===0)continue;let r=new _l(new _d(1,1),t?new qc({color:16777215}):Cv(e,{color:16777215}),n.length);n.forEach((e,t)=>{let n=e.facingRad??0,i=Re(n),a=e.maxX-e.minX,o=e.maxZ-e.minZ,s=Math.min(a,o);r.setMatrixAt(t,new is().compose(new q((e.minX+e.maxX)/2+i.x*s/2,(e.minY+e.maxY)/2,(e.minZ+e.maxZ)/2+i.z*s/2),new Po().setFromAxisAngle(new q(0,1,0),He(n)+Math.PI),new q(Math.max(a,o),e.maxY-e.minY,1)));let c=e.lit??0;r.setColorAt(t,e.lit===void 0?new J(e.color):c>0?new J().setRGB(d.r,d.g,d.b).multiplyScalar(c):new J().setRGB(f.r,f.g,f.b))}),r.instanceMatrix.needsUpdate=!0,r.name=t?`environmentGlass`:`environmentDecals`,r.receiveShadow=!t,o.add(r)}let h=t.signs.map(e=>tC(i?e:{...e,glow:0}));for(let e of h)o.add(e);let g=[];for(let e of s){let n=u.get(e);if(n===void 0||e.kind!==`solid`||e.maxY<Ng.minHeightM)continue;let r=t.poleSigns.find(n=>t.slabs[n.slab]===e),i=r===void 0?void 0:h[r.sign];g.push({boxes:[lb({x:(e.minX+e.maxX)/2,y:(e.minY+e.maxY)/2,z:(e.minZ+e.maxZ)/2},{x:e.maxX-e.minX,y:e.maxY-e.minY,z:e.maxZ-e.minZ})],parts:[n],...i===void 0?{}:{meshes:[i]}})}return g.length>0&&ob(o,g),o.add(iC(e)),o}var oC={heightFt:.6,depthFt:4,color:12170408},sC={open_lot:oC,warehouse_club:oC,post_office:oC,city_street:{heightFt:.5,depthFt:4,color:11775908},narrow_alley:{heightFt:22,depthFt:45,color:7360575}},cC={open_lot:{heightFt:7,color:10128253},warehouse_club:{heightFt:7,color:10128253},post_office:{heightFt:7,color:9329224},city_street:{heightFt:7,color:10128253},narrow_alley:{heightFt:22,color:8542282}};function lC(e,t,n,r,i,a,o){return Wx(new Yl(e,t,n).translate(r,i+t/2,a),o)}function uC(e,t,n,r,i,a,o,s=12){return Wx(new Zl(e,t,n,s).translate(r,i+n/2,a),o)}function dC(e,t,n,r,i,a){return Wx(new Zl(e,e,t,12).rotateZ(Math.PI/2).translate(n,r,i),a)}function fC(e,t,n,r){let i=new q(...e),a=new q(...t),o=a.clone().sub(i),s=new Yl(n,n,o.length());s.applyQuaternion(new Po().setFromUnitVectors(new q(0,0,1),o.normalize()));let c=i.add(a).multiplyScalar(.5);return Wx(s.translate(c.x,c.y,c.z),r)}function pC(e,t,n,r,i){return Wx(new xd(e,8,6).translate(t,n,r),i)}function mC(e,t,n){return e+(t-e)*n}function hC(e){let t=rb([...e]),n=V(1);return t.scale(n,n,n)}function gC(e=0,t=0){let n=12896976,r=.07,i=[],a=(n,r,i)=>[n+e,r,i+t],o=1.4,s=2.9,c={halfX:.8,frontZ:-1.2,rearZ:1.4},l={halfX:.96,frontZ:-1.52,rearZ:1.45};for(let u of[-1,1]){for(let r of[-1.3,1.3])i.push(dC(.2,.12,u*.78+e,.2,r+t,2303271)),i.push(fC(a(u*.78,.2,r),a(u*.78,.5,r),.08,n));i.push(fC(a(u*.78,.5,-1.4),a(u*.78,.5,1.4),.1,n)),i.push(fC(a(u*.78,.5,1.4),a(u*.92,3.3,1.5),.09,n));for(let e of[0,.5,1]){let t=mC(o,s,e),d=mC(c.halfX,l.halfX,e);i.push(fC(a(u*d,t,mC(c.frontZ,l.frontZ,e)),a(u*d,t,mC(c.rearZ,l.rearZ,e)),r,n))}for(let e=0;e<=6;e+=1){let t=e/6;i.push(fC(a(u*c.halfX,o,mC(c.frontZ,c.rearZ,t)),a(u*l.halfX,s,mC(l.frontZ,l.rearZ,t)),r,n))}}for(let e of[`frontZ`,`rearZ`]){for(let t of[0,.5,1]){let u=mC(o,s,t),d=mC(c.halfX,l.halfX,t),f=mC(c[e],l[e],t);i.push(fC(a(-d,u,f),a(d,u,f),r,n))}for(let t=1;t<=3;t+=1){let u=t/4;i.push(fC(a(mC(-c.halfX,c.halfX,u),o,c[e]),a(mC(-l.halfX,l.halfX,u),s,l[e]),r,n))}}return i.push(lC(1.6,.05,2.6,e,1.38,.1+t,10133928)),i.push(fC(a(-.96,3.3,1.5),a(.96,3.3,1.5),.14,2068362)),i}function _C(){let e=9279910,t=[];for(let n of[-1,1]){for(let r=0;r<=4;r+=1)t.push(lC(.2,3.6,.2,n*2.9,0,mC(-7.9,7.9,r/4),e));for(let r of[1.4,3.4])t.push(lC(.14,.14,16,n*2.93,r,0,e));t.push(lC(.24,7.2,.24,n*2.88,0,-7.88,6055536))}for(let n of[1.4,3.4])t.push(lC(6,.14,.14,0,n,-7.93,e));t.push(lC(5.9,1.7,.16,0,5.4,-7.88,1208428));for(let[e,n]of[[-1.3,-5.6],[-1.3,-4.4],[-1.3,-3.2],[1.3,-5.4],[1.3,-4.2]])t.push(...gC(e,n));return t}function vC(){let e=2312767,t=[lC(5.4,3.2,3.3,0,.45,0,3104080),lC(5.6,.2,3.5,0,3.65,0,e),lC(2.72,.16,3.4,-1.39,3.85,0,1974306),lC(2.72,.16,3.4,1.39,3.85,0,2500651),lC(5.5,.3,.3,0,3.85,1.55,1974306)];for(let n of[-1,1]){t.push(lC(.3,.6,2.6,n*2.85,1.9,0,e));for(let e of[-1.3,1.3])t.push(dC(.26,.2,n*2.3,.26,e,1710876));for(let r of[-1.8,0,1.8])t.push(lC(.16,2.8,.1,r,.6,n*1.7,e))}return t}function yC(){let e=2054970,t=[lC(1.8,2.3,1.8,0,.9,0,e),dC(.9,1.8,0,3.2,0,e),lC(1.8,.22,1.8,0,1.25,0,15327951),lC(1.4,.5,.05,0,3.05,-.875,1457961),lC(.9,.08,.05,0,3.2,-.875,13225683)];for(let e of[-.72,.72])for(let n of[-.72,.72])t.push(lC(.18,.9,.18,e,0,n,1457961));return t}function bC(){let e=[];for(let t of[-1.55,0,1.55])e.push(lC(.3,.3,4,t,.08,0,9399361));for(let t of[-1.75,0,1.75])e.push(lC(3.4,.08,.5,0,0,t,10254152));for(let t=0;t<7;t+=1)e.push(lC(3.4,.1,.46,0,.38,mC(-1.77,1.77,t/6),t%2==0?11569754:10648911));return e}function xC(){let e=bC(),t=[12161630,11109199,12687974,11569752];[.5,2.22].forEach((n,r)=>{[-1,1].forEach((i,a)=>{[-1,1].forEach((o,s)=>{e.push(lC(1.58,1.68,1.86,i*.82,n,o*.96,t[(r+a+s)%t.length]??12161630))})})}),e.push(lC(3.3,.06,3.9,0,3.92,0,14278370));for(let t of[-.85,.85])e.push(lC(.16,3.5,3.98,t,.48,0,14673642));return e}function SC(){return[uC(.4,.4,.08,0,0,0,4869458),uC(.34,.36,2.7,0,0,0,14861115),uC(.37,.37,.3,0,2,0,15921902),uC(.12,.34,.3,0,2.7,0,14861115)]}function CC(){let e=14277076,t=[];for(let n of[-2.6,2.6])t.push(lC(.26,.14,1.5,n,0,0,e)),t.push(fC([n,.1,-.68],[n,3.1,0],.16,e)),t.push(fC([n,.1,.68],[n,3.1,0],.16,e));for(let e=0;e<8;e+=1){let n=-2.625+.75*e;t.push(lC(.75,.62,.12,n,2.35,0,e%2==0?15886875:16052712)),t.push(lC(.75,.36,.12,n,1.2,0,e%2==0?16052712:15886875))}return t}function wC(){return[lC(4,1.5,4,0,0,0,10132110),lC(3.5,.14,3.5,0,1.5,0,3878436),pC(1.05,-.75,2.2,-.6,4020782),pC(1.15,.7,2.3,.5,4876851),pC(.85,-.5,2.1,.9,5664568),pC(.8,.8,2,-.9,3428396)]}function TC(e){switch(e){case`cone`:return Qx();case`trash_bin`:return $x();case`shopping_cart`:return hC(gC());case`cart_corral`:return hC(_C());case`dumpster`:return hC(vC());case`mailbox`:return hC(yC());case`pallet`:return hC(bC());case`pallet_stack`:return hC(xC());case`bollard`:return hC(SC());case`barrier`:return hC(CC());case`planter`:return hC(wC());case`wall`:return Wx(new Yl(1,1,1).translate(0,.5,0),16777215)}}var EC=.78,DC=.45,OC={cone:`plastic`,shopping_cart:`galvanized`,cart_corral:`galvanized`,trash_bin:`paintedMetal`,dumpster:`rustedIron`,mailbox:`paintedMetal`,pallet:`plaster`,pallet_stack:`plaster`,bollard:`paintedMetal`,barrier:`plastic`,planter:`concrete`},kC={open_lot:`concrete`,warehouse_club:`concrete`,post_office:`brick`,city_street:`concrete`,narrow_alley:`brick`};function AC(e,t,n=1){t.computeBoundingBox();let r=new q,i=new q;t.boundingBox?.getSize(r),t.boundingBox?.getCenter(i);let a=new q(V(e.widthFt)/r.x,n,V(e.lengthFt)/r.z),o=new Po().setFromAxisAngle(new q(0,1,0),He(H(e.headingDeg)));return new is().compose(new q(V(e.centerXFt),0,V(e.centerZFt)),o,a).multiply(new is().makeTranslation(-i.x,0,-i.z))}function jC(e,t){let n=e.maxXFt-e.minXFt,r=e.maxZFt-e.minZFt,i=(e.minXFt+e.maxXFt)/2,a=(e.minZFt+e.maxZFt)/2,o={centerXFt:i,widthFt:n+2*t,lengthFt:t,headingDeg:0},s={centerZFt:a,widthFt:t,lengthFt:r,headingDeg:0};return[{...o,centerZFt:e.minZFt-t/2},{...o,centerZFt:e.maxZFt+t/2},{...s,centerXFt:e.minXFt-t/2},{...s,centerXFt:e.maxXFt+t/2}]}var MC=[{height:1.18,shade:.92},{height:.9,shade:1.06},{height:1,shade:1},{height:1.1,shade:.86}];function NC(e,t){let n=H(t.headingDeg),r=Re(n),i=V(t.centerXFt),a=V(t.centerZFt);if(e===`mailbox`){let e=V(t.lengthFt/2+.03);return[tC({text:iS(`post_office`,`MAIL`),style:`mail`,x:i+r.x*e,y:V(2.15),z:a+r.z*e,facingRad:n,widthM:V(1.3),heightM:V(.55),glow:0})]}return e===`cart_corral`?[1,-1].map(e=>{let o=V(t.lengthFt/2-.12+e*.1);return tC({text:iS(`warehouse_club`,`CART RETURN`),style:`club`,x:i+r.x*o,y:V(6.25),z:a+r.z*o,facingRad:e>0?n:n+Math.PI,widthM:V(5.6),heightM:V(1.45),glow:.25})}):[]}function PC(e,t=`high`){let n=new Ms;n.name=`obstacles`;let r=e.environment??`open_lot`,i=new Map,a=e=>{let t=i.get(e);if(t!==void 0)return t;let n=Cv(e,{color:16777215,roughness:EC,metalness:Math.min(ng[e].metalness,DC),...e===`brick`?{overlayTint:.6}:{},parameters:{vertexColors:!0}});return i.set(e,n),n},o=kC[r],s=new Map;e.obstaclesFt.forEach((e,t)=>{let n=s.get(e.type)??[];n.push(t),s.set(e.type,n)});let c=t=>{let n=e.obstaclesFt[t];if(n===void 0)throw Error(`沒有第 ${t} 個障礙物`);return n};for(let e of rt){let i=s.get(e);if(i===void 0)continue;if(e===`parked_car`){let e=Ox(i.map(e=>{let t=c(e);return{x:V(t.centerXFt),z:V(t.centerZFt),y:0,headingRad:H(t.headingDeg),sizeX:V(t.widthFt),sizeY:0,sizeZ:V(t.lengthFt),variant:((e*.381966+.07)%1+1)%1}}),t);e.userData.obstacleIndices=i,n.add(e);continue}let l=TC(e);l.computeBoundingBox();let u=new _l(l,a(e===`wall`?o:OC[e]),i.length),d=cC[r],f=(l.boundingBox?.max.y??0)*(e===`wall`?V(d.heightFt):1),p=[];i.forEach((t,r)=>{let i=c(t);u.setMatrixAt(r,AC(i,l,e===`wall`?V(d.heightFt):1));let a=NC(e,i);a.length>0&&n.add(...a),f>=Ng.minHeightM&&p.push({boxes:[lb({x:V(i.centerXFt),y:f/2,z:V(i.centerZFt)},{x:V(i.widthFt),y:f,z:V(i.lengthFt)},He(H(i.headingDeg)))],parts:[{mesh:u,index:r}],...a.length>0?{meshes:a}:{}}),e===`wall`&&u.setColorAt(r,new J(d.color))}),u.instanceMatrix.needsUpdate=!0,u.name=`obstacle:${e}`,u.userData.obstacleIndices=i,u.castShadow=!0,u.receiveShadow=!0,n.add(u),ob(n,p)}if(e.boundsFt!==void 0){let t=sC[r],i=TC(`wall`),s=jC(e.boundsFt,t.depthFt),c=t.heightFt>10,l=new _l(i,a(c?o:`concrete`),s.length);s.forEach((e,n)=>{let r=MC[n],a=t.heightFt*(c?r?.height??1:1);l.setMatrixAt(n,AC(e,i,V(a))),l.setColorAt(n,new J(t.color).multiplyScalar(c?r?.shade??1:1))}),l.instanceMatrix.needsUpdate=!0,l.name=`bounds`,l.castShadow=!0,l.receiveShadow=!0,n.add(l)}return n}function FC(e,t=`high`){return PC({obstaclesFt:[{type:e,centerXFt:0,centerZFt:0,headingDeg:0,...nt[e]??{widthFt:12,lengthFt:1}}],environment:e===`mailbox`?`post_office`:`warehouse_club`},t)}function IC(e){let t=Math.min(Math.max(e,0),1);return Kg.wallOpacity*(1-t)**Kg.wallFalloff}function LC(e){let t=e/Kg.pulsePeriodS*Math.PI*2;return 1-Kg.pulseDepth*(.5-.5*Math.cos(t))}function RC(e){return Math.min(Math.max(e/Kg.greenSeconds,0),1)}function zC(e){let t=(e-Kg.greenHoldSeconds)/Kg.fadeSeconds;return 1-Math.min(Math.max(t,0),1)}function BC(e){let t=e.widthM/2,n=e.lengthM/2,r=[[-t,-n],[t,-n],[t,n],[-t,n]],i=Math.min(Kg.groundBandM,t,n),a=r.map(([e,t])=>[e-Math.sign(e)*i,t-Math.sign(t)*i]),o=[],s=[],c=(e,t,n,r)=>{o.push(e,t,n),s.push(1,1,1,r)},l=(e,t,n,r)=>{for(let i of[e,t,n,e,n,r])c(...i)},u=Kg.wallLayers;for(let e=0;e<r.length;e+=1){let t=r[e],n=r[(e+1)%r.length],i=a[e],o=a[(e+1)%r.length];if(t!==void 0&&n!==void 0&&i!==void 0&&o!==void 0){for(let e=0;e<u;e+=1){let r=e/u,i=(e+1)/u,a=Kg.liftM+r*(Kg.heightM-Kg.liftM),o=Kg.liftM+i*(Kg.heightM-Kg.liftM),s=IC(r),c=IC(i);l([t[0],a,t[1],s],[n[0],a,n[1],s],[n[0],o,n[1],c],[t[0],o,t[1],c])}l([t[0],Kg.liftM,t[1],Kg.groundOpacity],[n[0],Kg.liftM,n[1],Kg.groundOpacity],[o[0],Kg.liftM,o[1],0],[i[0],Kg.liftM,i[1],0])}}let d=new Fc;return d.setAttribute(`position`,new Cc(o,3)),d.setAttribute(`color`,new Cc(s,4)),d.computeBoundingBox(),d.computeBoundingSphere(),d}var VC=2;function HC(e,t=!0){let n=new J(Kg.color),r=new J(Kg.parkedColor),i=new qc({color:n.clone(),vertexColors:!0,fog:!1,transparent:!0,depthWrite:!1,side:2,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-4}),a=new al(BC(e),i);a.name=`spotGlowMesh`,a.renderOrder=VC;let o=new Ms;o.name=`spotGlow`,o.add(a),o.position.set(e.x,0,e.z),o.rotation.y=He(e.headingRad),o.userData[y_]=!0;let s=0,c=0,l=!1,u=()=>l?zC(c):1,d=()=>l?RC(c):0,f=()=>t?LC(s):1,p=()=>{i.color.copy(n).lerp(r,d()),i.opacity=u()*f(),o.visible=u()>0};return{root:o,advance(e){t&&(s+=Math.max(e,0),p())},show(e,t){c=e?c+Math.max(t,0):0,l=e,p()},opacity:u,drawHidden(e){let t=o.visible;o.visible=!1;try{e()}finally{o.visible=t}},snapshot:()=>({xFt:Ae(o.position.x),zFt:Ae(o.position.z),widthFt:Ae(e.widthM),lengthFt:Ae(e.lengthM),headingDeg:Pe(e.headingRad),heightFt:Ae(Kg.heightM),pulse:f(),green:d(),opacity:u(),visible:o.visible})}}function UC(e,t,n){e.moveTo(-t,-n),e.lineTo(t,-n),e.lineTo(t,n),e.lineTo(-t,n),e.closePath()}var WC=`
varying vec2 vPaintXZ;
`,GC=`
vPaintXZ = transformed.xz;
`,KC=`
varying vec2 vPaintXZ;
uniform vec2 uPaintHalfSize;
uniform vec4 uPaintScale;
uniform vec4 uPaintWear;
uniform vec4 uPaintTire;

// 固定的雜湊（Dave Hoskins 的 hash12）：同樣的座標永遠得到同樣的數，標線的磨損每次都一樣。
float paintHash( vec2 p ) {
	vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
	p3 += dot( p3, p3.yzx + 33.33 );
	return fract( ( p3.x + p3.y ) * p3.z );
}

float paintNoise( vec2 p ) {
	vec2 cell = floor( p );
	vec2 t = fract( p );
	t = t * t * ( 3.0 - 2.0 * t );
	float top = mix( paintHash( cell ), paintHash( cell + vec2( 1.0, 0.0 ) ), t.x );
	float bottom = mix( paintHash( cell + vec2( 0.0, 1.0 ) ), paintHash( cell + vec2( 1.0, 1.0 ) ), t.x );
	return mix( top, bottom, t.y );
}
`,qC=`
vec2 paintAbs = abs( vPaintXZ );
float paintLineWidth = uPaintScale.w;
// 離線的外緣、內緣各多遠；0 = 在邊上、1 = 在線的正中央。
float paintOuter = min( uPaintHalfSize.x - paintAbs.x, uPaintHalfSize.y - paintAbs.y );
float paintInner = max( paintAbs.x - ( uPaintHalfSize.x - paintLineWidth ), paintAbs.y - ( uPaintHalfSize.y - paintLineWidth ) );
float paintCenter = clamp( min( paintOuter, paintInner ) / ( 0.5 * paintLineWidth ), 0.0, 1.0 );

// 剝落：三層由粗到細的噪聲。
vec2 paintP = vPaintXZ * uPaintScale.x;
float paintChips = 0.5 * paintNoise( paintP )
	+ 0.3 * paintNoise( paintP * uPaintScale.y + 17.0 )
	+ 0.2 * paintNoise( paintP * uPaintScale.y * uPaintScale.y + 41.0 );
// 整段磨損：沿線一段深一段淺。
float paintPatch = smoothstep( 0.45, 0.8, paintNoise( vPaintXZ * uPaintScale.z + 7.0 ) );
// 輪胎磨痕：只在後緣那條線上，左右輪各一道。
float paintTire = exp( - pow( ( paintAbs.x - uPaintTire.x ) / uPaintTire.y, 2.0 ) )
	* step( uPaintHalfSize.y - 1.5 * paintLineWidth, vPaintXZ.y );

float paintWear = uPaintWear.x
	+ uPaintWear.y * paintPatch
	+ uPaintWear.z * ( 1.0 - paintCenter )
	+ uPaintTire.z * paintTire;
float paintCoverage = smoothstep( paintWear - uPaintTire.w, paintWear + uPaintTire.w, paintChips );

// 褪色：磨損多的地方漆也比較髒、比較暗。
diffuseColor.rgb *= mix( uPaintWear.w, 1.0, clamp( paintChips + 0.35 - 0.5 * paintPatch, 0.0, 1.0 ) );
diffuseColor.a *= paintCoverage;
`;function JC(e,t,n){if(!e.includes(t))throw Error(`標線著色器：找不到插入點 ${t}`);return e.replace(t,n)}function YC(e){let t=e.vertexShader;t=JC(t,`#include <common>`,`#include <common>\n${WC}`),t=JC(t,`#include <begin_vertex>`,`#include <begin_vertex>\n${GC}`),e.vertexShader=t;let n=e.fragmentShader;n=JC(n,`#include <common>`,`#include <common>\n${KC}`),n=JC(n,`#include <map_fragment>`,qC),e.fragmentShader=n}function XC(e,t){let n=Gg,r=new Nd({color:n.color,roughness:n.roughness,metalness:0,transparent:!0,opacity:n.opacity,depthWrite:!1});return r.onBeforeCompile=r=>{Object.assign(r.uniforms,{uPaintHalfSize:{value:new K(e,t)},uPaintScale:{value:new $o(1/n.chipSizeM,n.chipLacunarity,1/n.patchSizeM,n.lineWidthM)},uPaintWear:{value:new $o(n.baseWear,n.patchWear,n.edgeWear,n.fadeMin)},uPaintTire:{value:new $o(n.tireTrackOffsetM,n.tireTrackHalfWidthM,n.tireWear,n.chipSoftness)}}),YC(r)},r.customProgramCacheKey=()=>`spot-paint`,r}function ZC(e){let t=e.widthM/2,n=e.lengthM/2,r=new ku;UC(r,t,n);let i=new Ou;UC(i,t-Gg.lineWidthM,n-Gg.lineWidthM),r.holes.push(i);let a=new al(new yd(r).rotateX(-Math.PI/2),XC(t,n));return a.position.set(e.x,Gg.liftM,e.z),a.rotation.y=He(e.headingRad),a.receiveShadow=!0,a}var QC=28,$C=32,ew=2,tw=U.lengthM/2;function nw(e,t,n){let r=Math.min(Math.max((n-e)/(t-e),0),1);return r*r*(3-2*r)}function rw(e,t,n){if(n<=0||n>=e.lengthM||Math.abs(t)>=e.halfWidthM)return 0;let r=n/e.lengthM,i=e.nearSpreadM+(e.farSpreadM-e.nearSpreadM)*r,a=e=>Math.exp(-(((t-e)/i)**2)),o=e.lobeOffsetM>0?Math.min(a(-e.lobeOffsetM)+a(e.lobeOffsetM),1):a(0),s=nw(0,e.riseM,n)*(1-r)**e.falloffExponent,c=1-nw(.6,1,Math.abs(t)/e.halfWidthM);return o*s*c}function iw(e){let t=new _d(2*e.halfWidthM,e.lengthM,QC,$C).rotateX(-Math.PI/2).translate(0,0,-e.lengthM/2),n=t.getAttribute(`position`),r=new Float32Array(n.count*3);for(let t=0;t<n.count;t+=1){let i=rw(e,n.getX(t),-n.getZ(t));r.set([i,i,i],t*3)}return t.setAttribute(`color`,new bc(r,3)),t}function aw(e,t,n,r){let i=new al(iw(t),new qc({color:new J(n).multiplyScalar(r),vertexColors:!0,transparent:!0,blending:2,depthWrite:!1,fog:!1,toneMapped:!1}));return i.name=e,i.renderOrder=ew,i.userData[y_]=!0,i}function ow(e,t){let n=new Ms;n.name=`headlights`;let r=Math.min(Math.max(Math.round(e.spotLights),0),2),i;if(e.groundPool){let e=t?Xg.poolBrightness.hdr:Xg.poolBrightness.direct,a=aw(`headlightPool`,Xg.frontPool,Xg.color,r>0?e*Xg.poolWithLightScale:e);a.position.set(0,Xg.poolLiftM,-tw),n.add(a),i=aw(`reversePool`,Xg.reversePool,Xg.reverseColor,t?Xg.reverseBrightness.hdr:Xg.reverseBrightness.direct),i.position.set(0,Xg.poolLiftM,tw),i.rotation.y=Math.PI,i.visible=!1,n.add(i)}let a=r===2?[-Xg.lampOffsetM,Xg.lampOffsetM]:r===1?[0]:[];for(let e of a){let t=new bf(Xg.color,Xg.lightIntensity/a.length,Xg.lightDistanceM,Xg.lightAngleRad,Xg.lightPenumbra,Xg.lightDecay);t.name=`headlightSpot`,t.castShadow=!1;let r=-tw-Xg.lightAheadOfNoseM;t.position.set(e,Xg.lightHeightM,r),t.target.position.set(e,0,r-Xg.lightAimAheadM),n.add(t,t.target)}return{root:n,setReversing(e){i!==void 0&&(i.visible=e)}}}var sw=[`low`,`medium`,`high`,`ultra`],cw=`quality`,lw=[`swiftshader`,`llvmpipe`,`softpipe`,`software`,`microsoft basic render`],uw=4,dw=4,fw=`medium`,pw=`medium`,mw=`high`;function hw(e){return sw.includes(e)}function gw(e){let t=new URLSearchParams(e).get(cw)?.trim().toLowerCase();return t!==void 0&&hw(t)?t:void 0}function _w(e){if(e===void 0)return!1;let t=e.toLowerCase();return lw.some(e=>t.includes(e))}function vw(e){if(_w(e.rendererName))return fw;let t=e.deviceMemoryGb!==void 0&&e.deviceMemoryGb<=uw,n=e.hardwareConcurrency!==void 0&&e.hardwareConcurrency<=dw;return t||n?pw:mw}function yw(e){return kg[e]}function bw(e,t){let n=gw(e);return n===void 0?{settings:yw(vw(t)),source:`auto`}:{settings:yw(n),source:`url`}}function xw(e){return e.ambientOcclusion!==null||e.bloom!==null||e.smaa}function Sw(e,t){return Math.min(t,e.maxPixelRatio)}function Cw(e){let t=new q().setFromMatrixScale(e),n=new q().setFromMatrixPosition(e);return{inverse:e.clone().invert(),size:{x:t.x,y:t.y,z:t.z},center:{x:n.x,y:n.y,z:n.z},radiusM:t.length()/2}}var ww=new q,Tw=new q;function Ew(e,t){return[.5+t/e.size.x,.5+t/e.size.y,.5+t/e.size.z]}function Dw(e,t,n=0){ww.set(e.x,e.y,e.z).applyMatrix4(t.inverse);let[r,i,a]=Ew(t,n);return Math.abs(ww.x)<=r&&Math.abs(ww.y)<=i&&Math.abs(ww.z)<=a}function Ow(e,t,n,r=0){ww.set(e.x,e.y,e.z).applyMatrix4(n.inverse),Tw.set(t.x,t.y,t.z).applyMatrix4(n.inverse);let i=Ew(n,r),a=[ww.x,ww.y,ww.z],o=[Tw.x,Tw.y,Tw.z],s=0,c=1;for(let e=0;e<3;e+=1){let t=a[e]??0,n=(o[e]??0)-t,r=i[e]??.5;if(Math.abs(n)<1e-12){if(Math.abs(t)>r)return!1;continue}let l=(-r-t)/n,u=(r-t)/n;if(s=Math.max(s,Math.min(l,u)),c=Math.min(c,Math.max(l,u)),s>c)return!1}return!0}function kw(e){let t=Re(e.headingRad),n=ze(e.headingRad),r=U.lengthM/2*Ng.targetInset,i=U.widthM/2*Ng.targetInset,a=U.heightM*Ng.targetHeightRatio,o=[];for(let s of[-1,0,1])for(let c of[-1,0,1])o.push({x:e.x+t.x*s*r+n.x*c*i,y:a,z:e.z+t.z*s*r+n.z*c*i});return o}function Aw(e,t,n){return Dw(e,n,Ng.cameraClearanceM)||t.some(t=>Ow(e,t,n,Ng.sightMarginM))}function jw(e,t,n){let r=(e.x+t.x)/2,i=e.y/2,a=(e.z+t.z)/2,o=Math.hypot(e.x-t.x,e.y,e.z-t.z)/2+U.lengthM/2+Ng.cameraClearanceM;return Math.hypot(n.center.x-r,n.center.y-i,n.center.z-a)<=o+n.radiusM}function Mw(e,t,n){let r=(1-Ng.opacity)*Math.max(n,0)/Ng.fadeSeconds;return t?Math.max(Ng.opacity,e-r):Math.min(1,e+r)}var Nw=new is().makeScale(0,0,0),Pw=10;function Fw(e){return Array.isArray(e)?e[0]:e}function Iw(e){let t=Fw(e.mesh.material);if(t===void 0)return;let n=t.clone();if(n.onBeforeCompile=t.onBeforeCompile,n.customProgramCacheKey=t.customProgramCacheKey,n.transparent=!0,e.mesh.instanceColor!==null&&(n instanceof Nd||n instanceof qc)){let t=new J;e.mesh.getColorAt(e.index,t),n.color.multiply(t)}let r=new is;e.mesh.getMatrixAt(e.index,r);let i=new al(e.mesh.geometry,n);return i.name=`${e.mesh.name}:faded`,i.matrixAutoUpdate=!1,i.matrix.copy(r),i.castShadow=e.mesh.castShadow,e.mesh.customDepthMaterial!==void 0&&(i.customDepthMaterial=e.mesh.customDepthMaterial),i.receiveShadow=e.mesh.receiveShadow,i.renderOrder=Pw,i.visible=!1,i.userData[y_]=!0,e.mesh.add(i),i.updateMatrixWorld(!0),{part:e,mesh:i,material:n,original:r}}function Lw(e,t){e.mesh.setMatrixAt(e.index,t),e.mesh.instanceMatrix.needsUpdate=!0}function Rw(e,t){for(let n of e.standIns??[])Lw(n.part,t?Nw:n.original),n.mesh.visible=t;e.occluder.setHidden?.(t)}function zw(e,t){for(let n of e.occluder.meshes??[]){let e=Fw(n.material);e!==void 0&&(e.opacity=t)}}function Bw(e,t){let n=e.opacity<1,r=t<1;e.opacity=t,r&&e.standIns===void 0&&(e.standIns=e.occluder.parts.map(Iw).filter(e=>e!==void 0));let i=e.standIns??[];if(r!==n){Rw(e,r);for(let t of e.occluder.meshes??[]){let e=Fw(t.material);e!==void 0&&(e.transparent=r,e.needsUpdate=!0)}}for(let e of i)e.material.opacity=t;zw(e,t)}function Vw(e){e.updateMatrixWorld(!0);let t=[];return e.traverse(e=>{for(let n of sb(e))t.push({occluder:n,boxes:n.boxes.map(t=>Cw(new is().multiplyMatrices(e.matrixWorld,t))),opacity:1,standIns:void 0})}),{count:t.length,update(e,n,r,i){let a=r?kw(n):[];for(let o of t){let t=r&&o.boxes.some(t=>jw(e,n,t)&&Aw(e,a,t));if(!t&&o.opacity>=1)continue;let s=Mw(o.opacity,t,i);s!==o.opacity&&Bw(o,s)}},fadedCount:()=>t.filter(e=>e.opacity<1).length,drawUnfaded(e){let n=t.filter(e=>e.opacity<1);for(let e of n)Rw(e,!1),zw(e,1);try{e()}finally{for(let e of n)Rw(e,!0),zw(e,e.opacity)}}}}var Hw=1e-6;function Uw(e,t,n,r,i,a=n){let o=Math.hypot(e.x,e.y,e.z),s={x:e.x/o,y:e.y/o,z:e.z/o},c=Math.hypot(s.z,s.x),l=c>Hw?{x:s.z/c,y:0,z:-s.x/c}:{x:1,y:0,z:0},u={x:s.y*l.z-s.z*l.y,y:s.z*l.x-s.x*l.z,z:s.x*l.y-s.y*l.x},d=t.reduce((e,t)=>e+t.x,0)/t.length,f=t.reduce((e,t)=>e+t.z,0)/t.length,p=1/0,m=-1/0,h=1/0,g=-1/0,_=-1/0,v=1/0;for(let e of t){for(let t of[0,n]){let n=e.x-d,r=e.z-f,i=n*l.x+t*l.y+r*l.z,a=n*u.x+t*u.y+r*u.z,o=n*s.x+t*s.y+r*s.z;p=Math.min(p,i),m=Math.max(m,i),h=Math.min(h,a),g=Math.max(g,a),_=Math.max(_,o),v=Math.min(v,o)}_=Math.max(_,(e.x-d)*s.x+a*s.y+(e.z-f)*s.z)}return{targetX:d,targetZ:f,left:p,right:m,bottom:h,top:g,near:r-_-i,far:r-v+i}}var Ww=class e extends al{constructor(){let t=e.SkyShader,n=new jd({name:t.name,uniforms:Od.clone(t.uniforms),vertexShader:t.vertexShader,fragmentShader:t.fragmentShader,side:1,depthWrite:!1});super(new Yl(1,1,1),n),this.isSky=!0}};Ww.SkyShader={name:`SkyShader`,uniforms:{turbidity:{value:2},rayleigh:{value:1},mieCoefficient:{value:.005},mieDirectionalG:{value:.8},sunPosition:{value:new q},cloudScale:{value:2e-4},cloudSpeed:{value:2e-5},cloudCoverage:{value:.4},cloudDensity:{value:.4},cloudElevation:{value:.5},showSunDisc:{value:1},time:{value:0}},vertexShader:`
		uniform vec3 sunPosition;
		uniform float rayleigh;
		uniform float turbidity;
		uniform float mieCoefficient;

		varying vec3 vWorldPosition;
		varying vec3 vSunDirection;
		varying float vSunfade;
		varying vec3 vBetaR;
		varying vec3 vBetaM;
		varying float vSunE;

		// constants for atmospheric scattering
		const float e = 2.71828182845904523536028747135266249775724709369995957;
		const float pi = 3.141592653589793238462643383279502884197169;

		// wavelength of used primaries, according to preetham
		const vec3 lambda = vec3( 680E-9, 550E-9, 450E-9 );
		// this pre-calculation replaces older TotalRayleigh(vec3 lambda) function:
		// (8.0 * pow(pi, 3.0) * pow(pow(n, 2.0) - 1.0, 2.0) * (6.0 + 3.0 * pn)) / (3.0 * N * pow(lambda, vec3(4.0)) * (6.0 - 7.0 * pn))
		const vec3 totalRayleigh = vec3( 5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5 );

		// mie stuff
		// K coefficient for the primaries
		const float v = 4.0;
		const vec3 K = vec3( 0.686, 0.678, 0.666 );
		// MieConst = pi * pow( ( 2.0 * pi ) / lambda, vec3( v - 2.0 ) ) * K
		const vec3 MieConst = vec3( 1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14 );

		// earth shadow hack
		// cutoffAngle = pi / 1.95;
		const float cutoffAngle = 1.6110731556870734;
		const float steepness = 1.5;
		const float EE = 1000.0;

		float sunIntensity( float zenithAngleCos ) {
			zenithAngleCos = clamp( zenithAngleCos, -1.0, 1.0 );
			return EE * max( 0.0, 1.0 - pow( e, -( ( cutoffAngle - acos( zenithAngleCos ) ) / steepness ) ) );
		}

		vec3 totalMie( float T ) {
			float c = ( 0.2 * T ) * 10E-18;
			return 0.434 * c * MieConst;
		}

		void main() {

			vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
			vWorldPosition = worldPosition.xyz;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			gl_Position.z = gl_Position.w; // set z to camera.far

			vSunDirection = normalize( sunPosition );

			vSunE = sunIntensity( vSunDirection.y );

			vSunfade = 1.0 - clamp( 1.0 - exp( ( sunPosition.y / 450000.0 ) ), 0.0, 1.0 );

			float rayleighCoefficient = rayleigh - ( 1.0 * ( 1.0 - vSunfade ) );

			// extinction (absorption + out scattering)
			// rayleigh coefficients
			vBetaR = totalRayleigh * rayleighCoefficient;

			// mie coefficients
			vBetaM = totalMie( turbidity ) * mieCoefficient;

		}`,fragmentShader:`
		varying vec3 vWorldPosition;
		varying vec3 vSunDirection;
		varying vec3 vBetaR;
		varying vec3 vBetaM;
		varying float vSunE;

		uniform float mieDirectionalG;
		uniform float cloudScale;
		uniform float cloudSpeed;
		uniform float cloudCoverage;
		uniform float cloudDensity;
		uniform float cloudElevation;
		uniform float showSunDisc;
		uniform float time;

		// gradient at a lattice corner; sinless hash so every GPU produces the same clouds
		vec2 gradient( vec2 i ) {
			vec3 p = fract( i.xyx * vec3( 0.1031, 0.1030, 0.0973 ) );
			p += dot( p, p.yzx + 33.33 );
			return fract( ( p.xx + p.yz ) * p.zy ) * 2.0 - 1.0;
		}

		// 2D gradient noise: isotropic lobes like Perlin at value-noise cost
		float noise( vec2 p ) {
			vec2 i = floor( p );
			vec2 f = fract( p );
			vec2 u = f * f * f * ( f * ( f * 6.0 - 15.0 ) + 10.0 ); // quintic fade
			float a = dot( gradient( i ), f );
			float b = dot( gradient( i + vec2( 1.0, 0.0 ) ), f - vec2( 1.0, 0.0 ) );
			float c = dot( gradient( i + vec2( 0.0, 1.0 ) ), f - vec2( 0.0, 1.0 ) );
			float d = dot( gradient( i + vec2( 1.0, 1.0 ) ), f - vec2( 1.0, 1.0 ) );
			return mix( mix( a, b, u.x ), mix( c, d, u.x ), u.y ) * 1.6; // ~[-1,1]
		}

		// fbm; per-octave drift makes clouds billow instead of scrolling as a rigid stamp
		float fbm( vec2 p, float drift ) {
			float result = 0.0;
			float amplitude = 1.0;
			for ( int i = 0; i < 4; i ++ ) {
				result += amplitude * noise( p );
				amplitude *= 0.5;
				p = p * 2.0 + drift;
			}
			return result;
		}

		// constants for atmospheric scattering
		const float pi = 3.141592653589793238462643383279502884197169;

		const float n = 1.0003; // refractive index of air
		const float N = 2.545E25; // number of molecules per unit volume for air at 288.15K and 1013mb (sea level -45 celsius)

		// optical length at zenith for molecules
		const float rayleighZenithLength = 8.4E3;
		const float mieZenithLength = 1.25E3;
		// 66 arc seconds -> degrees, and the cosine of that
		const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;

		// 3.0 / ( 16.0 * pi )
		const float THREE_OVER_SIXTEENPI = 0.05968310365946075;
		// 1.0 / ( 4.0 * pi )
		const float ONE_OVER_FOURPI = 0.07957747154594767;

		float rayleighPhase( float cosTheta ) {
			return THREE_OVER_SIXTEENPI * ( 1.0 + pow( cosTheta, 2.0 ) );
		}

		float hgPhase( float cosTheta, float g ) {
			float g2 = pow( g, 2.0 );
			float inverse = 1.0 / pow( 1.0 - 2.0 * g * cosTheta + g2, 1.5 );
			return ONE_OVER_FOURPI * ( ( 1.0 - g2 ) * inverse );
		}

		void main() {

			vec3 direction = normalize( vWorldPosition - cameraPosition );

			// optical length
			// cutoff angle at 90 to avoid singularity in next formula.
			float zenithAngle = acos( max( 0.0, direction.y ) );
			float inverse = 1.0 / ( cos( zenithAngle ) + 0.15 * pow( 93.885 - ( ( zenithAngle * 180.0 ) / pi ), -1.253 ) );
			float sR = rayleighZenithLength * inverse;
			float sM = mieZenithLength * inverse;

			// combined extinction factor
			vec3 Fex = exp( -( vBetaR * sR + vBetaM * sM ) );

			// in scattering
			float cosTheta = dot( direction, vSunDirection );

			float rPhase = rayleighPhase( cosTheta * 0.5 + 0.5 );
			vec3 betaRTheta = vBetaR * rPhase;

			float mPhase = hgPhase( cosTheta, mieDirectionalG );
			vec3 betaMTheta = vBetaM * mPhase;

			vec3 Lin = pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * ( 1.0 - Fex ), vec3( 1.5 ) );
			Lin *= mix( vec3( 1.0 ), pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * Fex, vec3( 1.0 / 2.0 ) ), clamp( pow( 1.0 - vSunDirection.y, 5.0 ), 0.0, 1.0 ) );

			// nightsky
			float theta = acos( direction.y ); // elevation --> y-axis, [-pi/2, pi/2]
			float phi = atan( direction.z, direction.x ); // azimuth --> x-axis [-pi/2, pi/2]
			vec2 uv = vec2( phi, theta ) / vec2( 2.0 * pi, pi ) + vec2( 0.5, 0.0 );
			vec3 L0 = vec3( 0.1 ) * Fex;

			// composition + solar disc
			float sundisc = clamp( ( cosTheta - sunAngularDiameterCos ) * 50000.0, 0.0, 1.0 ) * showSunDisc;
			vec3 sundiscColor = ( 760.0 * sundisc ) * min( vSunE * Fex, 80.0 );

			vec3 texColor = ( Lin + L0 ) * 0.04 + sundiscColor + vec3( 0.0, 0.0003, 0.00075 );

			// Clouds
			if ( direction.y > 0.0 && cloudCoverage > 0.0 ) {

				// Project to cloud plane (higher elevation = clouds appear lower/closer)
				float elevation = mix( 1.0, 0.1, cloudElevation );
				vec2 cloudUV = direction.xz / ( direction.y * elevation );
				cloudUV *= cloudScale;
				cloudUV += time * cloudSpeed;

				// Cloud density field
				float evolve = time * cloudSpeed * 300.0;
				float cloudNoise = clamp( fbm( cloudUV * 1000.0, evolve ) * 0.7 + 0.5, 0.0, 1.0 );

				// Large-scale coverage variation: clear gaps next to dense banks
				float region = noise( cloudUV * 300.0 ) * 0.37 + 0.5;
				float cov = clamp( cloudCoverage + ( region - 0.5 ) * 0.6, 0.0, 1.0 );

				// Carve clouds where noise rises above the coverage level
				float threshold = 1.0 - cov;
				float cloudMask = smoothstep( threshold, threshold + 0.3, cloudNoise );

				// Fade clouds near horizon (adjusted by elevation)
				float horizonFade = smoothstep( 0.0, 0.03 + 0.06 * cloudElevation, direction.y );
				cloudMask *= horizonFade;

				// Cloud lighting from the sky's own radiance
				float dayFactor = smoothstep( -0.08, 0.3, vSunDirection.y );
				vec3 sunColor = vSunE * Fex * 0.22 * 0.04; // 0.22 ~ albedo/pi, 0.04 = exposure; the aerial composite adds the eye-leg extinction
				vec3 skyAmbient = Lin * 0.04 + vec3( 0.0, 0.0003, 0.00075 );

				// Beer-powder self-shadow from the sampled density
				float depth = max( 0.0, cloudNoise - threshold );
				float beer = exp( depth * -4.0 );
				float powder = 1.0 - beer * beer; // beer*beer == exp(-8*depth)
				float shade = mix( 0.45, 1.0, clamp( beer * powder * 2.6, 0.0, 1.0 ) ); // 2.6 = 1/0.385, normalizes beer*powder peak to 1

				// Henyey-Greenstein forward lobe ( g = 0.7 ): silver lining on rims toward the sun
				float silver = clamp( 0.51 / pow( 1.49 - cosTheta * 1.4, 1.5 ), 0.0, 3.0 ); // 0.51=1-g^2, 1.49=1+g^2, 1.4=2g
				float edge = cloudMask * ( 1.0 - cloudMask ) * 4.0;

				vec3 cloudColor = skyAmbient + sunColor * shade;
				cloudColor += sunColor * silver * edge * 0.6;
				cloudColor *= max( dayFactor, 0.03 );

				// Cloud opacity via Beer's law: density sets how solid the clouds get
				float alpha = ( 1.0 - exp( depth * cloudDensity * -12.0 ) ) * horizonFade;

				// Occlude the sun disc/glow behind opaque cloud
				texColor -= L0 * 0.04 * alpha;

				// Composite through the atmosphere so distant clouds dissolve into haze
				vec3 cloudAerial = mix( texColor, cloudColor, Fex );
				texColor = mix( texColor, cloudAerial, alpha );

			}

			gl_FragColor = vec4( texColor, 1.0 );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>

		}`};function Gw(e,t){let n=Re(e),r=Math.cos(t);return{x:n.x*r,y:Math.sin(t),z:n.z*r}}var Kw=Gw(H(Vg.azimuthDeg),H(Vg.elevationDeg));function qw(e,t=0){if(e<=0)return 1;let n=Math.max(1-e/zg.hazeTopDeg,0);return Math.max(n*n,t)}function Jw(e){return Math.min(Math.max(-e/zg.groundFadeDeg,0),1)}var Yw=48,Xw=180,Zw=.1,Qw=10,$w=8,eT=4;function tT(e,t,n){let r=new xd(1,Yw,Xw),i=r.getAttribute(`position`),a=new J(n.color).multiplyScalar(1/t.intensity),o=new J(n.groundColor).multiplyScalar(1/t.intensity),s=new J,c=new Float32Array(i.count*eT);for(let e=0;e<i.count;e+=1){let n=Math.asin(Math.min(Math.max(i.getY(e),-1),1))*180/Math.PI;s.copy(a).lerp(o,Jw(n)),c.set([s.r,s.g,s.b,qw(n,t.overcast)],e*eT)}return r.setAttribute(`color`,new bc(c,eT)),new al(r,e)}function nT(){return new qc({vertexColors:!0,transparent:!0,side:1,depthTest:!1,depthWrite:!1,fog:!1})}var rT=1e3,iT=`
  varying vec3 vDirection;
  void main() {
    vDirection = position;
    // 只取視角矩陣的旋轉：穹頂永遠以鏡頭為中心，鏡頭怎麼移動天空都不動。
    gl_Position = projectionMatrix * vec4( mat3( viewMatrix ) * position, 1.0 );
    // 深度釘在遠平面：任何場景裡的東西都擋得住它。
    gl_Position.z = gl_Position.w;
  }
`,aT=`
  uniform samplerCube tSky;
  uniform float intensity;
  varying vec3 vDirection;
  void main() {
    gl_FragColor = vec4( textureCube( tSky, vDirection ).rgb * intensity, 1.0 );
    // 直接畫到畫面上（沒有後製）時在這裡做色調映射；畫進後製鏈的緩衝區時 three 不會注入，維持線性。
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;function oT(e,t){let n=new al(new Yl(1,1,1),new jd({name:`SkyDomeShader`,uniforms:{tSky:{value:e},intensity:{value:t}},vertexShader:iT,fragmentShader:aT,side:1,depthWrite:!1}));return n.frustumCulled=!1,n.renderOrder=rT,n.userData[y_]=!0,n}function sT(e,t,n){let r=new np(n,{type:Xi,generateMipmaps:!1,minFilter:Bi,magFilter:Bi});return new Ef(Zw,Qw,r).update(e,t),r}var cT={...Rg,overcast:0};function lT(e,t){let n=e.material;if(n instanceof jd){let e=n.uniforms.intensity;e!==void 0&&(e.value=t)}}function uT(e,t,n=cT,r=zg,i=Kw){let a=new Ww;a.scale.setScalar($w);let o=a.material.uniforms,s=(e,t)=>{let n=o[e];if(n===void 0)throw Error(`Sky 沒有 uniform「${e}」`);n.value=t};s(`turbidity`,n.turbidity),s(`rayleigh`,n.rayleigh),s(`mieCoefficient`,n.mieCoefficient),s(`mieDirectionalG`,n.mieDirectionalG),s(`cloudScale`,n.cloudScale),s(`cloudDensity`,n.cloudDensity),s(`cloudElevation`,n.cloudElevation),s(`cloudCoverage`,n.cloudCoverage),s(`time`,0);let c=o.sunPosition?.value;if(!(c instanceof q))throw Error(`Sky 沒有 sunPosition`);c.set(i.x,i.y,i.z);let l=new Vs,u=nT(),d=tT(u,n,r);d.renderOrder=1,l.add(a,d),s(`showSunDisc`,n.sunDiscIntensity);let f=sT(e,l,t.skyCubeSizePx);s(`showSunDisc`,0);let p=sT(e,l,Rg.environmentCubeSizePx),m=new dp(e),h=m.fromCubemap(p.texture).texture;return m.dispose(),p.dispose(),a.geometry.dispose(),a.material.dispose(),d.geometry.dispose(),u.dispose(),{dome:oT(f.texture,n.intensity),environment:h}}var dT=499,fT={targetX:0,targetZ:0,left:-Vg.shadowHalfExtentM,right:Vg.shadowHalfExtentM,bottom:-Vg.shadowHalfExtentM,top:Vg.shadowHalfExtentM,near:Vg.shadowNearM,far:Vg.shadowFarM};function pT(e,t){return Math.max(Vg.shadowNormalBias,e/t*Vg.shadowNormalBiasTexels)}function mT(e,t,n){let r=new Cf(e.color,e.intensity);return r.castShadow=!0,r.shadow.mapSize.set(t,t),r.shadow.camera.left=n.left,r.shadow.camera.right=n.right,r.shadow.camera.top=n.top,r.shadow.camera.bottom=n.bottom,r.shadow.camera.near=n.near,r.shadow.camera.far=n.far,r.shadow.bias=Vg.shadowBias,r.shadow.normalBias=pT(n.right-n.left,t),r}function hT(e,t=Kw){let n=Ev(e),r=Vg.lotShadowMarginM;return Uw(t,[zv(e,n.minX-r,n.minZ-r),zv(e,n.maxX+r,n.minZ-r),zv(e,n.maxX+r,n.maxZ+r),zv(e,n.minX-r,n.maxZ+r)],Vg.lotShadowMaxHeightM,Vg.distanceM,Vg.lotShadowDepthMarginM,Vg.lotShadowCasterHeightM)}function gT(e,t){let n=V(e.minXFt)-t,r=V(e.maxXFt)+t,i=V(e.minZFt)-t,a=V(e.maxZFt)+t;return[{x:n,z:i},{x:r,z:i},{x:r,z:a},{x:n,z:a}]}function _T(e,t=Kw){return Uw(t,gT(e,Vg.lotShadowMarginM),Vg.lotShadowMaxHeightM,Vg.distanceM,Vg.lotShadowDepthMarginM,Vg.lotShadowCasterHeightM)}function vT(e,t,n){let r=kv(e);return n>Jg.heightM*Vg.shadowBiasPerCasterHeight?[...r,...jv(t)]:r}function yT(e,t){let n=sC[t.environment??`open_lot`];return n.heightFt>2?[]:jC(e,n.depthFt).map(e=>({minX:V(e.centerXFt-e.widthFt/2),maxX:V(e.centerXFt+e.widthFt/2),minZ:V(e.centerZFt-e.lengthFt/2),maxZ:V(e.centerZFt+e.lengthFt/2),heightM:V(n.heightFt)}))}function bT(e,t,n,r){let i=r===void 0?uT(t,n):uT(t,n,r.sky,r.fog,r.sunDirection);return e.environment=i.environment,e.environmentIntensity=r===void 0?Rg.environmentIntensity:r.sky.environmentIntensity,i}function xT(e,t,n,r=Vg,i=fT,a=Bg){let o=new of(a.skyColor,a.groundColor,a.intensity);e.add(o);let s=mT(r,n.shadowMapSize,i),c=new q(t.x,t.y,t.z).setLength(Vg.distanceM);e.add(s,s.target);let l=(e,t)=>{s.target.position.set(e,0,t),s.position.copy(s.target.position).add(c)};return l(i.targetX,i.targetZ),{aimAt:l,scaleFill(e){o.intensity=a.intensity*e}}}function ST(e,t,n,r,i,a=`dusk`,o=!0){let s=m_(a),c=Gw(H(p_(a,i?.id)),H(s.sun.elevationDeg));wg(t.materials),vg(s.surfaceWetness);let l=new Vs,u=bT(l,e,t,{...s,sunDirection:c}).dome;l.add(u);let d=new Bs(s.fog.color,s.fog.nearM,s.fog.farM);l.fog=d;let f=i?.boundsFt,p=i===void 0?void 0:YS(i,t.props),m=Ax(c),h=f===void 0?hT(n,c):_T(f,c),g=xT(l,c,t,s.sun,h,s.hemisphere),_=Ev(n),v=f===void 0?[zv(n,_.minX,_.minZ),zv(n,_.maxX,_.minZ),zv(n,_.maxX,_.maxZ),zv(n,_.minX,_.maxZ)]:gT(f,0),y=Math.min(...v.map(e=>e.x)),b=Math.max(...v.map(e=>e.x)),x=Math.min(...v.map(e=>e.z)),S=Math.max(...v.map(e=>e.z)),C=p===void 0?ry(n,r,k,t.props):void 0,w=nb(k,t.ground,e.capabilities.getMaxAnisotropy(),f===void 0||i===void 0?By(n,n.headingRad,c,vT(n,C?.wheelStops??[],pT(h.right-h.left,t.shadowMapSize))):By({x:0,z:0},0,c,yT(f,i)),s.ground);l.add(w),l.add(ZC(n)),C===void 0?p!==void 0&&l.add(aC(n,p,t.props,xw(t),s.lampsOn,m)):(l.add(Nv(n),Iv(n)),l.add(tS(n,C,t.props,xw(t),s.lampsOn,`classic`,m))),i!==void 0&&l.add(PC(i,t.props.meshDetail));let T=HC(n,o);l.add(T.root);let E=mx(t.vehicleDetail);l.add(E.root);let D=ow(t.headlights,xw(t));E.root.add(D.root);let O=s.rain>0,A=wy(t,n,r,k,{rainStreaks:o?h_.maxStreaks[t.level]*s.rain:0,leaves:o&&!O,dust:!O});l.add(A.root);let j=o&&s.lightning?v_(k+dT):void 0,ee=new J(s.fog.color),M=new J(g_.flashColor),N=0,P=0,te=e=>{g.scaleFill(1+g_.hemisphereBoost*e),l.environmentIntensity=s.sky.environmentIntensity*(1+g_.environmentBoost*e),lT(u,s.sky.intensity*(1+g_.skyBoost*e)),d.color.copy(ee).lerp(M,g_.fogBlend*e)},ne=o?Vw(l):void 0;return Tg(e,t.materials,Tv(l)),{scene:l,fadeOccluders(e,t,n,r){ne?.update(e,t,n,r)},drawAssistViews(e){T.drawHidden(()=>{A.drawWithoutDust(()=>{ne===void 0?e():ne.drawUnfaded(e)})})},updateSpotGlow(e,t){T.show(e,t)},spotGlow:()=>T.snapshot(),update(e,t=0){if(yx(E,e),A.update(e,t),T.advance(t),j!==void 0){N+=t;let e=j.flashAt(N);e!==P&&(P=e,te(e))}g.aimAt(h.targetX+e.x-Math.min(Math.max(e.x,y),b),h.targetZ+e.z-Math.min(Math.max(e.z,x),S)),w.position.x=e.x,w.position.z=e.z},setInteriorView(e){hx(E,e)},setHoodView(e){gx(E,e)},setLights(e){vx(E,e),D.setReversing(e.reversing)}}}function CT(e,t){let n=[[`bench.avgFps`,t.avgFps.toFixed(Lg.decimals)],[`bench.low1`,t.low1Fps.toFixed(Lg.decimals)],[`bench.drawCalls`,t.drawCallsAvg.toFixed(Lg.decimals)],[`bench.drawCallsMax`,String(t.drawCallsMax)]],r=document.createElement(`dl`);r.className=`bench-rows`;for(let[e,t]of n){let n=document.createElement(`dt`);n.textContent=F(e);let i=document.createElement(`dd`);i.textContent=t,r.append(n,i)}e.replaceChildren(r),e.dataset.result=JSON.stringify(t)}function wT({renderer:e,quality:t,pipeline:n},r){let{spot:i,startState:a}=r.layout,o=ST(e,t,i,a,r,hn(window.location.search,r.weather),!Wn(window.location.search)),s=n_(a.x,a.z),c=document.createElement(`div`);c.id=`bench-result`,c.className=`hud-panel mode-panel`,c.dataset.quality=t.level,c.textContent=F(`bench.running`),document.body.append(c);let l=a,u=a,d=0,f=0,p,m=0,h=Lg.warmupFrames,g=[];function _(e){let t=p===void 0?0:Math.max(Fe(e-p),0),r=p===void 0;p=e,m+=t;let i=M(f,t);f=i.accumulatorSeconds;for(let e=0;e<i.steps;e+=1)l=u,u=ft(u,er(d),D),d+=1;let a=mt(l,u,i.alpha);if(o.update(a,t),s.update(a.x,a.z,t),n.render(o.scene,s.camera),r||(h>0?--h:g.push({frameSeconds:t,drawCalls:n.drawCalls()})),m>=10&&g.length>=Lg.minMeasuredFrames){let e=$g(g);CT(c,e),console.log(`[bench] ${JSON.stringify(e)}`)}else requestAnimationFrame(_)}requestAnimationFrame(_)}var TT=U.lengthM/2,ET={chase_near:Pg.chaseNear,chase_far:Pg.chaseFar,hood:Pg.hood,cockpit:Pg.cockpit,top:Pg.top};function DT(e,t,n,r){if(Math.abs(n)<=Pg.headingFollowSpeedMps)return e;let i=n>0?Pg.headingTimeConstantS:Pg.reverseHeadingTimeConstantS;return Be(e+Ve(e,t)*e_(r,i))}function OT(e,t){let n=new vf;n.far=Pg.farM;let r=e,i=t,a=t.headingRad,o=new q,s=new q,c=new q,l=new q;function u(e,t){let r=Re(a),u=TT+e.behindRearM;c.set(i.x-r.x*u,e.heightM,i.z-r.z*u),l.set(i.x,e.lookAtHeightM,i.z),t===void 0?(o.copy(c),s.copy(l)):(o.lerp(c,e_(t,Pg.positionTimeConstantS)),s.lerp(l,e_(t,Pg.lookAtTimeConstantS))),n.position.copy(o),n.lookAt(s)}function d(e){let t=Re(i.headingRad),r=ze(i.headingRad);n.position.set(i.x+r.x*e.lateralM+t.x*e.aheadM,e.heightM,i.z+r.z*e.lateralM+t.z*e.aheadM);let a=Math.cos(e.pitchDownRad);n.lookAt(n.position.x+t.x*a,n.position.y-Math.sin(e.pitchDownRad),n.position.z+t.z*a)}function f(e){switch(r){case`chase_near`:u(Pg.chaseNear,e);break;case`chase_far`:u(Pg.chaseFar,e);break;case`hood`:d(Pg.hood);break;case`cockpit`:d(Pg.cockpit);break;case`top`:n.position.set(i.x,Pg.top.heightM,i.z),n.lookAt(i.x,0,i.z)}}function p(){let e=ET[r];n.fov=e.fovDeg,n.near=e.nearM,n.updateProjectionMatrix(),r===`top`?n.up.set(0,0,-1):n.up.set(0,1,0)}return p(),f(),{camera:n,view:()=>r,setView(e){r=e,p(),f()},update(e,t,n){i=e,a=DT(a,i.headingRad,t,n),f(n)},snapTo(e){i=e,a=e.headingRad,f()}}}var kT=class{constructor(e=Math){this.grad3=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]],this.grad4=[[0,1,1,1],[0,1,1,-1],[0,1,-1,1],[0,1,-1,-1],[0,-1,1,1],[0,-1,1,-1],[0,-1,-1,1],[0,-1,-1,-1],[1,0,1,1],[1,0,1,-1],[1,0,-1,1],[1,0,-1,-1],[-1,0,1,1],[-1,0,1,-1],[-1,0,-1,1],[-1,0,-1,-1],[1,1,0,1],[1,1,0,-1],[1,-1,0,1],[1,-1,0,-1],[-1,1,0,1],[-1,1,0,-1],[-1,-1,0,1],[-1,-1,0,-1],[1,1,1,0],[1,1,-1,0],[1,-1,1,0],[1,-1,-1,0],[-1,1,1,0],[-1,1,-1,0],[-1,-1,1,0],[-1,-1,-1,0]],this.p=[];for(let t=0;t<256;t++)this.p[t]=Math.floor(e.random()*256);this.perm=[];for(let e=0;e<512;e++)this.perm[e]=this.p[e&255];this.simplex=[[0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0],[0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0],[1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0],[2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0]]}noise(e,t){let n,r,i,a=.5*(Math.sqrt(3)-1),o=(e+t)*a,s=Math.floor(e+o),c=Math.floor(t+o),l=(3-Math.sqrt(3))/6,u=(s+c)*l,d=s-u,f=c-u,p=e-d,m=t-f,h,g;p>m?(h=1,g=0):(h=0,g=1);let _=p-h+l,v=m-g+l,y=p-1+2*l,b=m-1+2*l,x=s&255,S=c&255,C=this.perm[x+this.perm[S]]%12,w=this.perm[x+h+this.perm[S+g]]%12,T=this.perm[x+1+this.perm[S+1]]%12,E=.5-p*p-m*m;E<0?n=0:(E*=E,n=E*E*this._dot(this.grad3[C],p,m));let D=.5-_*_-v*v;D<0?r=0:(D*=D,r=D*D*this._dot(this.grad3[w],_,v));let O=.5-y*y-b*b;return O<0?i=0:(O*=O,i=O*O*this._dot(this.grad3[T],y,b)),70*(n+r+i)}noise3d(e,t,n){let r,i,a,o,s=(e+t+n)*(1/3),c=Math.floor(e+s),l=Math.floor(t+s),u=Math.floor(n+s),d=1/6,f=(c+l+u)*d,p=c-f,m=l-f,h=u-f,g=e-p,_=t-m,v=n-h,y,b,x,S,C,w;g>=_?_>=v?(y=1,b=0,x=0,S=1,C=1,w=0):g>=v?(y=1,b=0,x=0,S=1,C=0,w=1):(y=0,b=0,x=1,S=1,C=0,w=1):_<v?(y=0,b=0,x=1,S=0,C=1,w=1):g<v?(y=0,b=1,x=0,S=0,C=1,w=1):(y=0,b=1,x=0,S=1,C=1,w=0);let T=g-y+d,E=_-b+d,D=v-x+d,O=g-S+2*d,k=_-C+2*d,A=v-w+2*d,j=g-1+3*d,ee=_-1+3*d,M=v-1+3*d,N=c&255,P=l&255,te=u&255,ne=this.perm[N+this.perm[P+this.perm[te]]]%12,re=this.perm[N+y+this.perm[P+b+this.perm[te+x]]]%12,ie=this.perm[N+S+this.perm[P+C+this.perm[te+w]]]%12,ae=this.perm[N+1+this.perm[P+1+this.perm[te+1]]]%12,oe=.6-g*g-_*_-v*v;oe<0?r=0:(oe*=oe,r=oe*oe*this._dot3(this.grad3[ne],g,_,v));let se=.6-T*T-E*E-D*D;se<0?i=0:(se*=se,i=se*se*this._dot3(this.grad3[re],T,E,D));let ce=.6-O*O-k*k-A*A;ce<0?a=0:(ce*=ce,a=ce*ce*this._dot3(this.grad3[ie],O,k,A));let le=.6-j*j-ee*ee-M*M;return le<0?o=0:(le*=le,o=le*le*this._dot3(this.grad3[ae],j,ee,M)),32*(r+i+a+o)}noise4d(e,t,n,r){let i=this.grad4,a=this.simplex,o=this.perm,s=(Math.sqrt(5)-1)/4,c=(5-Math.sqrt(5))/20,l,u,d,f,p,m=(e+t+n+r)*s,h=Math.floor(e+m),g=Math.floor(t+m),_=Math.floor(n+m),v=Math.floor(r+m),y=(h+g+_+v)*c,b=h-y,x=g-y,S=_-y,C=v-y,w=e-b,T=t-x,E=n-S,D=r-C,O=w>T?32:0,k=w>E?16:0,A=T>E?8:0,j=w>D?4:0,ee=T>D?2:0,M=+(E>D),N=O+k+A+j+ee+M,P=+(a[N][0]>=3),te=+(a[N][1]>=3),ne=+(a[N][2]>=3),re=+(a[N][3]>=3),ie=+(a[N][0]>=2),ae=+(a[N][1]>=2),oe=+(a[N][2]>=2),se=+(a[N][3]>=2),ce=+(a[N][0]>=1),le=+(a[N][1]>=1),ue=+(a[N][2]>=1),de=+(a[N][3]>=1),fe=w-P+c,F=T-te+c,pe=E-ne+c,me=D-re+c,he=w-ie+2*c,ge=T-ae+2*c,_e=E-oe+2*c,ve=D-se+2*c,ye=w-ce+3*c,be=T-le+3*c,xe=E-ue+3*c,Se=D-de+3*c,I=w-1+4*c,Ce=T-1+4*c,L=E-1+4*c,we=D-1+4*c,R=h&255,Te=g&255,z=_&255,B=v&255,Ee=o[R+o[Te+o[z+o[B]]]]%32,De=o[R+P+o[Te+te+o[z+ne+o[B+re]]]]%32,Oe=o[R+ie+o[Te+ae+o[z+oe+o[B+se]]]]%32,ke=o[R+ce+o[Te+le+o[z+ue+o[B+de]]]]%32,V=o[R+1+o[Te+1+o[z+1+o[B+1]]]]%32,Ae=.6-w*w-T*T-E*E-D*D;Ae<0?l=0:(Ae*=Ae,l=Ae*Ae*this._dot4(i[Ee],w,T,E,D));let je=.6-fe*fe-F*F-pe*pe-me*me;je<0?u=0:(je*=je,u=je*je*this._dot4(i[De],fe,F,pe,me));let Me=.6-he*he-ge*ge-_e*_e-ve*ve;Me<0?d=0:(Me*=Me,d=Me*Me*this._dot4(i[Oe],he,ge,_e,ve));let Ne=.6-ye*ye-be*be-xe*xe-Se*Se;Ne<0?f=0:(Ne*=Ne,f=Ne*Ne*this._dot4(i[ke],ye,be,xe,Se));let H=.6-I*I-Ce*Ce-L*L-we*we;return H<0?p=0:(H*=H,p=H*H*this._dot4(i[V],I,Ce,L,we)),27*(l+u+d+f+p)}_dot(e,t,n){return e[0]*t+e[1]*n}_dot3(e,t,n,r){return e[0]*t+e[1]*n+e[2]*r}_dot4(e,t,n,r,i){return e[0]*t+e[1]*n+e[2]*r+e[3]*i}},AT={name:`CopyShader`,uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`},jT=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error(`THREE.Pass: .render() must be implemented in derived pass.`)}dispose(){}},MT=new xf(-1,1,1,-1,0,1),NT=new class extends Fc{constructor(){super(),this.setAttribute(`position`,new Cc([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute(`uv`,new Cc([0,2,0,0,2,0],2))}},PT=class{constructor(e){this._mesh=new al(NT,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,MT)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}},FT=class extends jT{constructor(e,t=`tDiffuse`){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof jd?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=Od.clone(e.uniforms),this.material=new jd({name:e.name===void 0?`unspecified`:e.name,defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new PT(this.material)}render(e,t,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}},IT=class extends jT{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,n){let r=e.getContext(),i=e.state;i.buffers.color.setMask(!1),i.buffers.depth.setMask(!1),i.buffers.color.setLocked(!0),i.buffers.depth.setLocked(!0);let a,o;this.inverse?(a=0,o=1):(a=1,o=0),i.buffers.stencil.setTest(!0),i.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),i.buffers.stencil.setFunc(r.ALWAYS,a,4294967295),i.buffers.stencil.setClear(o),i.buffers.stencil.setLocked(!0),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),i.buffers.color.setLocked(!1),i.buffers.depth.setLocked(!1),i.buffers.color.setMask(!0),i.buffers.depth.setMask(!0),i.buffers.stencil.setLocked(!1),i.buffers.stencil.setFunc(r.EQUAL,1,4294967295),i.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),i.buffers.stencil.setLocked(!0)}},LT=class extends jT{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}},RT=class{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){let n=e.getSize(new K);this._width=n.width,this._height=n.height,t=new ts(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:Xi}),t.texture.name=`EffectComposer.rt1`}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name=`EffectComposer.rt2`,this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new FT(AT),this.copyPass.material.blending=0,this.timer=new Of}swapBuffers(){let e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){let t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){this.timer.update(),e===void 0&&(e=this.timer.getDelta());let t=this.renderer.getRenderTarget(),n=!1;for(let t=0,r=this.passes.length;t<r;t++){let r=this.passes[t];if(r.enabled!==!1){if(r.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(t),r.render(this.renderer,this.writeBuffer,this.readBuffer,e,n),r.needsSwap){if(n){let t=this.renderer.getContext(),n=this.renderer.state.buffers.stencil;n.setFunc(t.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),n.setFunc(t.EQUAL,1,4294967295)}this.swapBuffers()}IT!==void 0&&(r instanceof IT?n=!0:r instanceof LT&&(n=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){let t=this.renderer.getSize(new K);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;let n=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(n,r),this.renderTarget2.setSize(n,r);for(let e=0;e<this.passes.length;e++)this.passes[e].setSize(n,r)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}},zT={name:`GTAOShader`,defines:{PERSPECTIVE_CAMERA:1,SAMPLES:16,NORMAL_VECTOR_TYPE:1,SCREEN_SPACE_RADIUS:0,SCREEN_SPACE_RADIUS_SCALE:100,SCENE_CLIP_BOX:0},uniforms:{tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new K},cameraNear:{value:null},cameraFar:{value:null},cameraProjectionMatrix:{value:new is},cameraProjectionMatrixInverse:{value:new is},cameraWorldMatrix:{value:new is},radius:{value:.25},distanceExponent:{value:1},thickness:{value:1},distanceFallOff:{value:1},scale:{value:1},sceneBoxMin:{value:new q(-1,-1,-1)},sceneBoxMax:{value:new q(1,1,1)}},vertexShader:`

		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		varying vec2 vUv;
		uniform highp sampler2D tNormal;
		uniform highp sampler2D tDepth;
		uniform sampler2D tNoise;
		uniform vec2 resolution;
		uniform float cameraNear;
		uniform float cameraFar;
		uniform mat4 cameraProjectionMatrix;
		uniform mat4 cameraProjectionMatrixInverse;
		uniform mat4 cameraWorldMatrix;
		uniform float radius;
		uniform float distanceExponent;
		uniform float thickness;
		uniform float distanceFallOff;
		uniform float scale;
		#if SCENE_CLIP_BOX == 1
			uniform vec3 sceneBoxMin;
			uniform vec3 sceneBoxMax;
		#endif

		#include <common>
		#include <packing>

		#ifndef FRAGMENT_OUTPUT
		#define FRAGMENT_OUTPUT vec4(vec3(ao), 1.)
		#endif

		vec3 getViewPosition( const in vec2 screenPosition, const in float depth ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				vec4 clipSpacePosition = vec4( vec2( screenPosition ) * 2.0 - 1.0, depth, 1.0 );
			#else
				vec4 clipSpacePosition = vec4( vec3( screenPosition, depth ) * 2.0 - 1.0, 1.0 );
			#endif
			vec4 viewSpacePosition = cameraProjectionMatrixInverse * clipSpacePosition;
			return viewSpacePosition.xyz / viewSpacePosition.w;
		}

		float getDepth(const vec2 uv) {
			return textureLod(tDepth, uv.xy, 0.0).r;
		}

		float fetchDepth(const ivec2 uv) {
			return texelFetch(tDepth, uv.xy, 0).r;
		}

		float getViewZ(const in float depth) {
			#if PERSPECTIVE_CAMERA == 1
				return perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
			#else
				return orthographicDepthToViewZ(depth, cameraNear, cameraFar);
			#endif
		}

		vec3 computeNormalFromDepth(const vec2 uv) {
			vec2 size = vec2(textureSize(tDepth, 0));
			ivec2 p = ivec2(uv * size);
			float c0 = fetchDepth(p);
			float l2 = fetchDepth(p - ivec2(2, 0));
			float l1 = fetchDepth(p - ivec2(1, 0));
			float r1 = fetchDepth(p + ivec2(1, 0));
			float r2 = fetchDepth(p + ivec2(2, 0));
			float b2 = fetchDepth(p - ivec2(0, 2));
			float b1 = fetchDepth(p - ivec2(0, 1));
			float t1 = fetchDepth(p + ivec2(0, 1));
			float t2 = fetchDepth(p + ivec2(0, 2));
			float dl = abs((2.0 * l1 - l2) - c0);
			float dr = abs((2.0 * r1 - r2) - c0);
			float db = abs((2.0 * b1 - b2) - c0);
			float dt = abs((2.0 * t1 - t2) - c0);
			vec3 ce = getViewPosition(uv, c0).xyz;
			vec3 dpdx = (dl < dr) ? ce - getViewPosition((uv - vec2(1.0 / size.x, 0.0)), l1).xyz : -ce + getViewPosition((uv + vec2(1.0 / size.x, 0.0)), r1).xyz;
			vec3 dpdy = (db < dt) ? ce - getViewPosition((uv - vec2(0.0, 1.0 / size.y)), b1).xyz : -ce + getViewPosition((uv + vec2(0.0, 1.0 / size.y)), t1).xyz;
			return normalize(cross(dpdx, dpdy));
		}

		vec3 getViewNormal(const vec2 uv) {
			#if NORMAL_VECTOR_TYPE == 2
				return normalize(textureLod(tNormal, uv, 0.).rgb);
			#elif NORMAL_VECTOR_TYPE == 1
				return unpackRGBToNormal(textureLod(tNormal, uv, 0.).rgb);
			#else
				return computeNormalFromDepth(uv);
			#endif
		}

		vec3 getSceneUvAndDepth(vec3 sampleViewPos) {
			vec4 sampleClipPos = cameraProjectionMatrix * vec4(sampleViewPos, 1.);
			vec2 sampleUv = sampleClipPos.xy / sampleClipPos.w * 0.5 + 0.5;
			float sampleSceneDepth = getDepth(sampleUv);
			return vec3(sampleUv, sampleSceneDepth);
		}

		void main() {
			float depth = getDepth(vUv.xy);

			#ifdef USE_REVERSED_DEPTH_BUFFER
				if (depth <= 0.0) {
					discard;
					return;
				}
			#else
				if (depth >= 1.0) {
					discard;
					return;
				}
			#endif
			
			vec3 viewPos = getViewPosition(vUv, depth);
			vec3 viewNormal = getViewNormal(vUv);

			float radiusToUse = radius;
			float distanceFalloffToUse = thickness;
			#if SCREEN_SPACE_RADIUS == 1
				float radiusScale = getViewPosition(vec2(0.5 + float(SCREEN_SPACE_RADIUS_SCALE) / resolution.x, 0.0), depth).x;
				radiusToUse *= radiusScale;
				distanceFalloffToUse *= radiusScale;
			#endif

			#if SCENE_CLIP_BOX == 1
				vec3 worldPos = (cameraWorldMatrix * vec4(viewPos, 1.0)).xyz;
				float boxDistance = length(max(vec3(0.0), max(sceneBoxMin - worldPos, worldPos - sceneBoxMax)));
				if (boxDistance > radiusToUse) {
					discard;
					return;
				}
			#endif

			vec2 noiseResolution = vec2(textureSize(tNoise, 0));
			vec2 noiseUv = vUv * resolution / noiseResolution;
			vec4 noiseTexel = textureLod(tNoise, noiseUv, 0.0);
			vec3 randomVec = noiseTexel.xyz * 2.0 - 1.0;
			vec3 tangent = normalize(vec3(randomVec.xy, 0.));
			vec3 bitangent = vec3(-tangent.y, tangent.x, 0.);
			mat3 kernelMatrix = mat3(tangent, bitangent, vec3(0., 0., 1.));

			const int DIRECTIONS = SAMPLES < 30 ? 3 : 5;
			const int STEPS = (SAMPLES + DIRECTIONS - 1) / DIRECTIONS;
			float ao = 0.0;
			for (int i = 0; i < DIRECTIONS; ++i) {

				float angle = float(i) / float(DIRECTIONS) * PI;
				vec4 sampleDir = vec4(cos(angle), sin(angle), 0., 0.5 + 0.5 * noiseTexel.w);
				sampleDir.xyz = normalize(kernelMatrix * sampleDir.xyz);

				#if PERSPECTIVE_CAMERA == 1
					vec3 viewDir = normalize(-viewPos.xyz);
				#else
					vec3 viewDir = vec3(0., 0., 1.);
				#endif
				vec3 sliceBitangent = normalize(cross(sampleDir.xyz, viewDir));
				vec3 sliceTangent = cross(sliceBitangent, viewDir);
				vec3 normalInSlice = normalize(viewNormal - sliceBitangent * dot(viewNormal, sliceBitangent));

				vec3 tangentToNormalInSlice = cross(normalInSlice, sliceBitangent);
				vec2 cosHorizons = vec2(dot(viewDir, tangentToNormalInSlice), dot(viewDir, -tangentToNormalInSlice));

				for (int j = 0; j < STEPS; ++j) {
					vec3 sampleViewOffset = sampleDir.xyz * radiusToUse * sampleDir.w * pow(float(j + 1) / float(STEPS), distanceExponent);

					vec3 sampleSceneUvDepth = getSceneUvAndDepth(viewPos + sampleViewOffset);
					vec3 sampleSceneViewPos = getViewPosition(sampleSceneUvDepth.xy, sampleSceneUvDepth.z);
					vec3 viewDelta = sampleSceneViewPos - viewPos;
					if (abs(viewDelta.z) < thickness) {
						float sampleCosHorizon = dot(viewDir, normalize(viewDelta));
						cosHorizons.x += max(0., (sampleCosHorizon - cosHorizons.x) * mix(1., 2. / float(j + 2), distanceFallOff));
					}

					sampleSceneUvDepth = getSceneUvAndDepth(viewPos - sampleViewOffset);
					sampleSceneViewPos = getViewPosition(sampleSceneUvDepth.xy, sampleSceneUvDepth.z);
					viewDelta = sampleSceneViewPos - viewPos;
					if (abs(viewDelta.z) < thickness) {
						float sampleCosHorizon = dot(viewDir, normalize(viewDelta));
						cosHorizons.y += max(0., (sampleCosHorizon - cosHorizons.y) * mix(1., 2. / float(j + 2), distanceFallOff));
					}
				}

				vec2 sinHorizons = sqrt(1. - cosHorizons * cosHorizons);
				float nx = dot(normalInSlice, sliceTangent);
				float ny = dot(normalInSlice, viewDir);
				float nxb = 1. / 2. * (acos(cosHorizons.y) - acos(cosHorizons.x) + sinHorizons.x * cosHorizons.x - sinHorizons.y * cosHorizons.y);
				float nyb = 1. / 2. * (2. - cosHorizons.x * cosHorizons.x - cosHorizons.y * cosHorizons.y);
				float occlusion = nx * nxb + ny * nyb;
				ao += occlusion;
			}

			ao = clamp(ao / float(DIRECTIONS), 0., 1.);
		#if SCENE_CLIP_BOX == 1
			ao = mix(ao, 1., smoothstep(0., radiusToUse, boxDistance));
		#endif
			ao = pow(ao, scale);

			gl_FragColor = FRAGMENT_OUTPUT;
		}`},BT={name:`GTAODepthShader`,defines:{PERSPECTIVE_CAMERA:1},uniforms:{tDepth:{value:null},cameraNear:{value:null},cameraFar:{value:null}},vertexShader:`
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		uniform sampler2D tDepth;
		uniform float cameraNear;
		uniform float cameraFar;
		varying vec2 vUv;

		#include <packing>

		float getLinearDepth( const in vec2 screenPosition ) {
			#if PERSPECTIVE_CAMERA == 1
				float fragCoordZ = texture2D( tDepth, screenPosition ).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
			#else
				return texture2D( tDepth, screenPosition ).x;
			#endif
		}

		void main() {
			float depth = getLinearDepth( vUv );
			gl_FragColor = vec4( vec3( 1.0 - depth ), 1.0 );

		}`},VT={name:`GTAOBlendShader`,uniforms:{tDiffuse:{value:null},intensity:{value:1}},vertexShader:`
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		uniform float intensity;
		uniform sampler2D tDiffuse;
		varying vec2 vUv;

		void main() {
			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = vec4(mix(vec3(1.), texel.rgb, intensity), texel.a);
		}`};function HT(e=5){let t=Math.floor(e)%2==0?Math.floor(e)+1:Math.floor(e),n=UT(t),r=n.length,i=new Uint8Array(r*4);for(let e=0;e<r;++e){let t=n[e],a=2*Math.PI*t/r,o=new q(Math.cos(a),Math.sin(a),0).normalize();i[e*4]=(o.x*.5+.5)*255,i[e*4+1]=(o.y*.5+.5)*255,i[e*4+2]=127,i[e*4+3]=255}let a=new cl(i,t,t);return a.wrapS=Pi,a.wrapT=Pi,a.needsUpdate=!0,a}function UT(e){let t=Math.floor(e)%2==0?Math.floor(e)+1:Math.floor(e),n=t*t,r=Array(n).fill(0),i=Math.floor(t/2),a=t-1;for(let e=1;e<=n;)i===-1&&a===t?(a=t-2,i=0):(a===t&&(a=0),i<0&&(i=t-1)),r[i*t+a]===0?(r[i*t+a]=e++,a++,i--):(a-=2,i++);return r}var WT={name:`PoissonDenoiseShader`,defines:{SAMPLES:16,SAMPLE_VECTORS:GT(16,2,1),NORMAL_VECTOR_TYPE:1},uniforms:{tDiffuse:{value:null},tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new K},cameraProjectionMatrixInverse:{value:new is},lumaPhi:{value:5},depthPhi:{value:5},normalPhi:{value:5},radius:{value:4},index:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`

		varying vec2 vUv;

		uniform sampler2D tDiffuse;
		uniform sampler2D tNormal;
		uniform sampler2D tDepth;
		uniform sampler2D tNoise;
		uniform vec2 resolution;
		uniform mat4 cameraProjectionMatrixInverse;
		uniform float lumaPhi;
		uniform float depthPhi;
		uniform float normalPhi;
		uniform float radius;
		uniform int index;

		#include <common>
		#include <packing>

		#ifndef SAMPLE_LUMINANCE
		#define SAMPLE_LUMINANCE dot(vec3(0.2125, 0.7154, 0.0721), a)
		#endif

		#ifndef FRAGMENT_OUTPUT
		#define FRAGMENT_OUTPUT vec4(denoised, 1.)
		#endif

		float getLuminance(const in vec3 a) {
			return SAMPLE_LUMINANCE;
		}

		const vec3 poissonDisk[SAMPLES] = SAMPLE_VECTORS;

		vec3 getViewPosition( const in vec2 screenPosition, const in float depth ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				vec4 clipSpacePosition = vec4( vec2( screenPosition ) * 2.0 - 1.0, depth, 1.0 );
			#else
				vec4 clipSpacePosition = vec4( vec3( screenPosition, depth ) * 2.0 - 1.0, 1.0 );
			#endif
			vec4 viewSpacePosition = cameraProjectionMatrixInverse * clipSpacePosition;
			return viewSpacePosition.xyz / viewSpacePosition.w;
		}

		float getDepth(const vec2 uv) {
			return textureLod(tDepth, uv.xy, 0.0).r;
		}

		float fetchDepth(const ivec2 uv) {
			return texelFetch(tDepth, uv.xy, 0).r;
		}

		vec3 computeNormalFromDepth(const vec2 uv) {
			vec2 size = vec2(textureSize(tDepth, 0));
			ivec2 p = ivec2(uv * size);
			float c0 = fetchDepth(p);
			float l2 = fetchDepth(p - ivec2(2, 0));
			float l1 = fetchDepth(p - ivec2(1, 0));
			float r1 = fetchDepth(p + ivec2(1, 0));
			float r2 = fetchDepth(p + ivec2(2, 0));
			float b2 = fetchDepth(p - ivec2(0, 2));
			float b1 = fetchDepth(p - ivec2(0, 1));
			float t1 = fetchDepth(p + ivec2(0, 1));
			float t2 = fetchDepth(p + ivec2(0, 2));
			float dl = abs((2.0 * l1 - l2) - c0);
			float dr = abs((2.0 * r1 - r2) - c0);
			float db = abs((2.0 * b1 - b2) - c0);
			float dt = abs((2.0 * t1 - t2) - c0);
			vec3 ce = getViewPosition(uv, c0).xyz;
			vec3 dpdx = (dl < dr) ?  ce - getViewPosition((uv - vec2(1.0 / size.x, 0.0)), l1).xyz
									: -ce + getViewPosition((uv + vec2(1.0 / size.x, 0.0)), r1).xyz;
			vec3 dpdy = (db < dt) ?  ce - getViewPosition((uv - vec2(0.0, 1.0 / size.y)), b1).xyz
									: -ce + getViewPosition((uv + vec2(0.0, 1.0 / size.y)), t1).xyz;
			return normalize(cross(dpdx, dpdy));
		}

		vec3 getViewNormal(const vec2 uv) {
		#if NORMAL_VECTOR_TYPE == 2
			return normalize(textureLod(tNormal, uv, 0.).rgb);
		#elif NORMAL_VECTOR_TYPE == 1
			return unpackRGBToNormal(textureLod(tNormal, uv, 0.).rgb);
		#else
			return computeNormalFromDepth(uv);
		#endif
		}

		void denoiseSample(in vec3 center, in vec3 viewNormal, in vec3 viewPos, in vec2 sampleUv, inout vec3 denoised, inout float totalWeight) {
			vec4 sampleTexel = textureLod(tDiffuse, sampleUv, 0.0);
			float sampleDepth = getDepth(sampleUv);
			vec3 sampleNormal = getViewNormal(sampleUv);
			vec3 neighborColor = sampleTexel.rgb;
			vec3 viewPosSample = getViewPosition(sampleUv, sampleDepth);

			float normalDiff = dot(viewNormal, sampleNormal);
			float normalSimilarity = pow(max(normalDiff, 0.), normalPhi);
			float lumaDiff = abs(getLuminance(neighborColor) - getLuminance(center));
			float lumaSimilarity = max(1.0 - lumaDiff / lumaPhi, 0.0);
			float depthDiff = abs(dot(viewPos - viewPosSample, viewNormal));
			float depthSimilarity = max(1. - depthDiff / depthPhi, 0.);
			float w = lumaSimilarity * depthSimilarity * normalSimilarity;

			denoised += w * neighborColor;
			totalWeight += w;
		}

		void main() {
			float depth = getDepth(vUv.xy);
			vec3 viewNormal = getViewNormal(vUv);
			if (depth == 1. || dot(viewNormal, viewNormal) == 0.) {
				discard;
				return;
			}
			vec4 texel = textureLod(tDiffuse, vUv, 0.0);
			vec3 center = texel.rgb;
			vec3 viewPos = getViewPosition(vUv, depth);

			vec2 noiseResolution = vec2(textureSize(tNoise, 0));
			vec2 noiseUv = vUv * resolution / noiseResolution;
			vec4 noiseTexel = textureLod(tNoise, noiseUv, 0.0);
      		vec2 noiseVec = vec2(sin(noiseTexel[index % 4] * 2. * PI), cos(noiseTexel[index % 4] * 2. * PI));
    		mat2 rotationMatrix = mat2(noiseVec.x, -noiseVec.y, noiseVec.x, noiseVec.y);

			float totalWeight = 1.0;
			vec3 denoised = texel.rgb;
			for (int i = 0; i < SAMPLES; i++) {
				vec3 sampleDir = poissonDisk[i];
				vec2 offset = rotationMatrix * (sampleDir.xy * (1. + sampleDir.z * (radius - 1.)) / resolution);
				vec2 sampleUv = vUv + offset;
				denoiseSample(center, viewNormal, viewPos, sampleUv, denoised, totalWeight);
			}

			if (totalWeight > 0.) {
				denoised /= totalWeight;
			}
			gl_FragColor = FRAGMENT_OUTPUT;
		}`};function GT(e,t,n){let r=KT(e,t,n),i=`vec3[SAMPLES](`;for(let t=0;t<e;t++){let n=r[t];i+=`vec3(${n.x}, ${n.y}, ${n.z})${t<e-1?`,`:`)`}`}return i}function KT(e,t,n){let r=[];for(let i=0;i<e;i++){let a=2*Math.PI*t*i/e,o=(i/(e-1))**n;r.push(new q(Math.cos(a),Math.sin(a),o))}return r}var qT=class e extends jT{constructor(e,t,n=512,r=512,i,a,o){super(),this.width=n,this.height=r,this.clear=!0,this.camera=t,this.scene=e,this.output=0,this._renderGBuffer=!0,this._visibilityCache=[],this.blendIntensity=1,this.pdRings=2,this.pdRadiusExponent=2,this.pdSamples=16,this.gtaoNoiseTexture=HT(),this.pdNoiseTexture=this._generateNoise(),this.gtaoRenderTarget=new ts(this.width,this.height,{type:Xi,depthBuffer:!1}),this.pdRenderTarget=this.gtaoRenderTarget.clone(),this.gtaoMaterial=new jd({defines:Object.assign({},zT.defines),uniforms:Od.clone(zT.uniforms),vertexShader:zT.vertexShader,fragmentShader:zT.fragmentShader,blending:0,depthTest:!1,depthWrite:!1}),this.gtaoMaterial.defines.PERSPECTIVE_CAMERA=+!!this.camera.isPerspectiveCamera,this.gtaoMaterial.uniforms.tNoise.value=this.gtaoNoiseTexture,this.gtaoMaterial.uniforms.resolution.value.set(this.width,this.height),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.normalMaterial=new Fd,this.normalMaterial.blending=0,this.pdMaterial=new jd({defines:Object.assign({},WT.defines),uniforms:Od.clone(WT.uniforms),vertexShader:WT.vertexShader,fragmentShader:WT.fragmentShader,depthTest:!1,depthWrite:!1}),this.pdMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.pdMaterial.uniforms.tNoise.value=this.pdNoiseTexture,this.pdMaterial.uniforms.resolution.value.set(this.width,this.height),this.pdMaterial.uniforms.lumaPhi.value=10,this.pdMaterial.uniforms.depthPhi.value=2,this.pdMaterial.uniforms.normalPhi.value=3,this.pdMaterial.uniforms.radius.value=8,this.depthRenderMaterial=new jd({defines:Object.assign({},BT.defines),uniforms:Od.clone(BT.uniforms),vertexShader:BT.vertexShader,fragmentShader:BT.fragmentShader,blending:0}),this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this.copyMaterial=new jd({uniforms:Od.clone(AT.uniforms),vertexShader:AT.vertexShader,fragmentShader:AT.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blendSrc:208,blendDst:200,blendEquation:100,blendSrcAlpha:206,blendDstAlpha:200,blendEquationAlpha:100}),this.blendMaterial=new jd({uniforms:Od.clone(VT.uniforms),vertexShader:VT.vertexShader,fragmentShader:VT.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blending:5,blendSrc:208,blendDst:200,blendEquation:100,blendSrcAlpha:206,blendDstAlpha:200,blendEquationAlpha:100}),this._fsQuad=new PT(null),this._originalClearColor=new J,this.setGBuffer(i?i.depthTexture:void 0,i?i.normalTexture:void 0),a!==void 0&&this.updateGtaoMaterial(a),o!==void 0&&this.updatePdMaterial(o)}setSize(e,t){this.width=e,this.height=t,this.gtaoRenderTarget.setSize(e,t),this.normalRenderTarget&&this.normalRenderTarget.setSize(e,t),this.pdRenderTarget.setSize(e,t),this.gtaoMaterial.uniforms.resolution.value.set(e,t),this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.pdMaterial.uniforms.resolution.value.set(e,t),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse)}dispose(){this.gtaoNoiseTexture.dispose(),this.pdNoiseTexture.dispose(),this.normalRenderTarget&&this.normalRenderTarget.dispose(),this.gtaoRenderTarget.dispose(),this.pdRenderTarget.dispose(),this.normalMaterial.dispose(),this.pdMaterial.dispose(),this.copyMaterial.dispose(),this.depthRenderMaterial.dispose(),this._fsQuad.dispose()}get gtaoMap(){return this.pdRenderTarget.texture}setGBuffer(e,t){if(e!==void 0)this.depthTexture=e,this.normalTexture=t,this._renderGBuffer=!1;else{if(this.normalRenderTarget===void 0){let e=new Kl;e.format=oa,e.type=$i,this.normalRenderTarget=new ts(this.width,this.height,{minFilter:Li,magFilter:Li,type:Xi,depthTexture:e})}this.depthTexture=this.normalRenderTarget.depthTexture,this.normalTexture=this.normalRenderTarget.texture,this._renderGBuffer=!0}let n=+!!this.normalTexture;this.gtaoMaterial.defines.NORMAL_VECTOR_TYPE=n,this.gtaoMaterial.needsUpdate=!0,this.gtaoMaterial.uniforms.tNormal.value=this.normalTexture,this.gtaoMaterial.uniforms.tDepth.value=this.depthTexture,this.pdMaterial.defines.NORMAL_VECTOR_TYPE=n,this.pdMaterial.needsUpdate=!0,this.pdMaterial.uniforms.tNormal.value=this.normalTexture,this.pdMaterial.uniforms.tDepth.value=this.depthTexture,this.depthRenderMaterial.uniforms.tDepth.value=this.depthTexture}setSceneClipBox(e){e?(this.gtaoMaterial.needsUpdate=this.gtaoMaterial.defines.SCENE_CLIP_BOX!==1,this.gtaoMaterial.defines.SCENE_CLIP_BOX=1,this.gtaoMaterial.uniforms.sceneBoxMin.value.copy(e.min),this.gtaoMaterial.uniforms.sceneBoxMax.value.copy(e.max)):(this.gtaoMaterial.needsUpdate=this.gtaoMaterial.defines.SCENE_CLIP_BOX===0,this.gtaoMaterial.defines.SCENE_CLIP_BOX=0)}updateGtaoMaterial(e){e.radius!==void 0&&(this.gtaoMaterial.uniforms.radius.value=e.radius),e.distanceExponent!==void 0&&(this.gtaoMaterial.uniforms.distanceExponent.value=e.distanceExponent),e.thickness!==void 0&&(this.gtaoMaterial.uniforms.thickness.value=e.thickness),e.distanceFallOff!==void 0&&(this.gtaoMaterial.uniforms.distanceFallOff.value=e.distanceFallOff,this.gtaoMaterial.needsUpdate=!0),e.scale!==void 0&&(this.gtaoMaterial.uniforms.scale.value=e.scale),e.samples!==void 0&&e.samples!==this.gtaoMaterial.defines.SAMPLES&&(this.gtaoMaterial.defines.SAMPLES=e.samples,this.gtaoMaterial.needsUpdate=!0),e.screenSpaceRadius!==void 0&&+!!e.screenSpaceRadius!==this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS&&(this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS=+!!e.screenSpaceRadius,this.gtaoMaterial.needsUpdate=!0)}updatePdMaterial(e){let t=!1;e.lumaPhi!==void 0&&(this.pdMaterial.uniforms.lumaPhi.value=e.lumaPhi),e.depthPhi!==void 0&&(this.pdMaterial.uniforms.depthPhi.value=e.depthPhi),e.normalPhi!==void 0&&(this.pdMaterial.uniforms.normalPhi.value=e.normalPhi),e.radius!==void 0&&e.radius!==this.radius&&(this.pdMaterial.uniforms.radius.value=e.radius),e.radiusExponent!==void 0&&e.radiusExponent!==this.pdRadiusExponent&&(this.pdRadiusExponent=e.radiusExponent,t=!0),e.rings!==void 0&&e.rings!==this.pdRings&&(this.pdRings=e.rings,t=!0),e.samples!==void 0&&e.samples!==this.pdSamples&&(this.pdSamples=e.samples,t=!0),t&&(this.pdMaterial.defines.SAMPLES=this.pdSamples,this.pdMaterial.defines.SAMPLE_VECTORS=GT(this.pdSamples,this.pdRings,this.pdRadiusExponent),this.pdMaterial.needsUpdate=!0)}render(t,n,r){switch(this._renderGBuffer&&(this._overrideVisibility(),this._renderOverride(t,this.normalMaterial,this.normalRenderTarget,7829503,1),this._restoreVisibility()),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.gtaoMaterial.uniforms.cameraWorldMatrix.value.copy(this.camera.matrixWorld),this._renderPass(t,this.gtaoMaterial,this.gtaoRenderTarget,16777215,1),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this._renderPass(t,this.pdMaterial,this.pdRenderTarget,16777215,1),this.output){case e.OUTPUT.Off:break;case e.OUTPUT.Diffuse:this.copyMaterial.uniforms.tDiffuse.value=r.texture,this.copyMaterial.blending=0,this._renderPass(t,this.copyMaterial,this.renderToScreen?null:n);break;case e.OUTPUT.AO:this.copyMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.copyMaterial.blending=0,this._renderPass(t,this.copyMaterial,this.renderToScreen?null:n);break;case e.OUTPUT.Denoise:this.copyMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this.copyMaterial.blending=0,this._renderPass(t,this.copyMaterial,this.renderToScreen?null:n);break;case e.OUTPUT.Depth:this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this._renderPass(t,this.depthRenderMaterial,this.renderToScreen?null:n);break;case e.OUTPUT.Normal:this.copyMaterial.uniforms.tDiffuse.value=this.normalTexture||null,this.copyMaterial.blending=0,this._renderPass(t,this.copyMaterial,this.renderToScreen?null:n);break;case e.OUTPUT.Default:this.copyMaterial.uniforms.tDiffuse.value=r.texture,this.copyMaterial.blending=0,this._renderPass(t,this.copyMaterial,this.renderToScreen?null:n),this.blendMaterial.uniforms.intensity.value=this.blendIntensity,this.blendMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this._renderPass(t,this.blendMaterial,this.renderToScreen?null:n);break;default:console.warn(`THREE.GTAOPass: Unknown output type.`)}}_renderPass(e,t,n,r,i){e.getClearColor(this._originalClearColor);let a=e.getClearAlpha(),o=e.autoClear;e.setRenderTarget(n),e.autoClear=!1,r!=null&&(e.setClearColor(r),e.setClearAlpha(i||0),e.clear()),this._fsQuad.material=t,this._fsQuad.render(e),e.autoClear=o,e.setClearColor(this._originalClearColor),e.setClearAlpha(a)}_renderOverride(e,t,n,r,i){e.getClearColor(this._originalClearColor);let a=e.getClearAlpha(),o=e.autoClear;e.setRenderTarget(n),e.autoClear=!1,r=t.clearColor||r,i=t.clearAlpha||i,r!=null&&(e.setClearColor(r),e.setClearAlpha(i||0),e.clear()),this.scene.overrideMaterial=t,e.render(this.scene,this.camera),this.scene.overrideMaterial=null,e.autoClear=o,e.setClearColor(this._originalClearColor),e.setClearAlpha(a)}_overrideVisibility(){let e=this.scene,t=this._visibilityCache;e.traverse(function(e){(e.isPoints||e.isLine||e.isLine2)&&e.visible&&(e.visible=!1,t.push(e))})}_restoreVisibility(){let e=this._visibilityCache;for(let t=0;t<e.length;t++)e[t].visible=!0;e.length=0}_generateNoise(e=64){let t=new kT,n=e*e*4,r=new Uint8Array(n);for(let n=0;n<e;n++)for(let i=0;i<e;i++){let a=n,o=i;r[(n*e+i)*4]=(t.noise(a,o)*.5+.5)*255,r[(n*e+i)*4+1]=(t.noise(a+e,o)*.5+.5)*255,r[(n*e+i)*4+2]=(t.noise(a,o+e)*.5+.5)*255,r[(n*e+i)*4+3]=(t.noise(a+e,o+e)*.5+.5)*255}let i=new cl(r,e,e,ia,Ui);return i.wrapS=Pi,i.wrapT=Pi,i.needsUpdate=!0,i}};qT.OUTPUT={Off:-1,Default:0,Diffuse:1,Depth:2,Normal:3,AO:4,Denoise:5};var JT=class extends jT{constructor(e,t,n=null,r=null,i=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=n,this.clearColor=r,this.clearAlpha=i,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new J}render(e,t,n){let r=e.autoClear;e.autoClear=!1;let i,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(i=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==1&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(i),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),e.autoClear=r}},YT={name:`SMAAEdgesShader`,defines:{SMAA_THRESHOLD:`0.1`},uniforms:{tDiffuse:{value:null},resolution:{value:new K(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];

		void SMAAEdgeDetectionVS( vec2 texcoord ) {
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -1.0, 0.0, 0.0,  1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4(  1.0, 0.0, 0.0, -1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 2 ] = texcoord.xyxy + resolution.xyxy * vec4( -2.0, 0.0, 0.0,  2.0 ); // WebGL port note: Changed sign in W component
		}

		void main() {

			vUv = uv;

			SMAAEdgeDetectionVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];

		vec4 SMAAColorEdgeDetectionPS( vec2 texcoord, vec4 offset[3], sampler2D colorTex ) {
			vec2 threshold = vec2( SMAA_THRESHOLD, SMAA_THRESHOLD );

			// Calculate color deltas:
			vec4 delta;
			vec3 C = texture2D( colorTex, texcoord ).rgb;

			vec3 Cleft = texture2D( colorTex, offset[0].xy ).rgb;
			vec3 t = abs( C - Cleft );
			delta.x = max( max( t.r, t.g ), t.b );

			vec3 Ctop = texture2D( colorTex, offset[0].zw ).rgb;
			t = abs( C - Ctop );
			delta.y = max( max( t.r, t.g ), t.b );

			// We do the usual threshold:
			vec2 edges = step( threshold, delta.xy );

			// Then discard if there is no edge:
			if ( dot( edges, vec2( 1.0, 1.0 ) ) == 0.0 )
				discard;

			// Calculate right and bottom deltas:
			vec3 Cright = texture2D( colorTex, offset[1].xy ).rgb;
			t = abs( C - Cright );
			delta.z = max( max( t.r, t.g ), t.b );

			vec3 Cbottom  = texture2D( colorTex, offset[1].zw ).rgb;
			t = abs( C - Cbottom );
			delta.w = max( max( t.r, t.g ), t.b );

			// Calculate the maximum delta in the direct neighborhood:
			float maxDelta = max( max( max( delta.x, delta.y ), delta.z ), delta.w );

			// Calculate left-left and top-top deltas:
			vec3 Cleftleft  = texture2D( colorTex, offset[2].xy ).rgb;
			t = abs( C - Cleftleft );
			delta.z = max( max( t.r, t.g ), t.b );

			vec3 Ctoptop = texture2D( colorTex, offset[2].zw ).rgb;
			t = abs( C - Ctoptop );
			delta.w = max( max( t.r, t.g ), t.b );

			// Calculate the final maximum delta:
			maxDelta = max( max( maxDelta, delta.z ), delta.w );

			// Local contrast adaptation in action:
			edges.xy *= step( 0.5 * maxDelta, delta.xy );

			return vec4( edges, 0.0, 0.0 );
		}

		void main() {

			gl_FragColor = SMAAColorEdgeDetectionPS( vUv, vOffset, tDiffuse );

		}`},XT={name:`SMAAWeightsShader`,defines:{SMAA_MAX_SEARCH_STEPS:`8`,SMAA_AREATEX_MAX_DISTANCE:`16`,SMAA_AREATEX_PIXEL_SIZE:`( 1.0 / vec2( 160.0, 560.0 ) )`,SMAA_AREATEX_SUBTEX_SIZE:`( 1.0 / 7.0 )`},uniforms:{tDiffuse:{value:null},tArea:{value:null},tSearch:{value:null},resolution:{value:new K(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];
		varying vec2 vPixcoord;

		void SMAABlendingWeightCalculationVS( vec2 texcoord ) {
			vPixcoord = texcoord / resolution;

			// We will use these offsets for the searches later on (see @PSEUDO_GATHER4):
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -0.25, 0.125, 1.25, 0.125 ); // WebGL port note: Changed sign in Y and W components
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4( -0.125, 0.25, -0.125, -1.25 ); // WebGL port note: Changed sign in Y and W components

			// And these for the searches, they indicate the ends of the loops:
			vOffset[ 2 ] = vec4( vOffset[ 0 ].xz, vOffset[ 1 ].yw ) + vec4( -2.0, 2.0, -2.0, 2.0 ) * resolution.xxyy * float( SMAA_MAX_SEARCH_STEPS );

		}

		void main() {

			vUv = uv;

			SMAABlendingWeightCalculationVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		#define SMAASampleLevelZeroOffset( tex, coord, offset ) texture2D( tex, coord + float( offset ) * resolution, 0.0 )

		uniform sampler2D tDiffuse;
		uniform sampler2D tArea;
		uniform sampler2D tSearch;
		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[3];
		varying vec2 vPixcoord;

		#if __VERSION__ == 100
		vec2 round( vec2 x ) {
			return sign( x ) * floor( abs( x ) + 0.5 );
		}
		#endif

		float SMAASearchLength( sampler2D searchTex, vec2 e, float bias, float scale ) {
			// Not required if searchTex accesses are set to point:
			// float2 SEARCH_TEX_PIXEL_SIZE = 1.0 / float2(66.0, 33.0);
			// e = float2(bias, 0.0) + 0.5 * SEARCH_TEX_PIXEL_SIZE +
			//     e * float2(scale, 1.0) * float2(64.0, 32.0) * SEARCH_TEX_PIXEL_SIZE;
			e.r = bias + e.r * scale;
			return 255.0 * texture2D( searchTex, e, 0.0 ).r;
		}

		float SMAASearchXLeft( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			/**
				* @PSEUDO_GATHER4
				* This texcoord has been offset by (-0.25, -0.125) in the vertex shader to
				* sample between edge, thus fetching four edges in a row.
				* Sampling with different offsets in each direction allows to disambiguate
				* which edges are active from the four fetched ones.
				*/
			vec2 e = vec2( 0.0, 1.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord -= vec2( 2.0, 0.0 ) * resolution;
				if ( ! ( texcoord.x > end && e.g > 0.8281 && e.r == 0.0 ) ) break;
			}

			// We correct the previous (-0.25, -0.125) offset we applied:
			texcoord.x += 0.25 * resolution.x;

			// The searches are bias by 1, so adjust the coords accordingly:
			texcoord.x += resolution.x;

			// Disambiguate the length added by the last step:
			texcoord.x += 2.0 * resolution.x; // Undo last step
			texcoord.x -= resolution.x * SMAASearchLength(searchTex, e, 0.0, 0.5);

			return texcoord.x;
		}

		float SMAASearchXRight( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 0.0, 1.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord += vec2( 2.0, 0.0 ) * resolution;
				if ( ! ( texcoord.x < end && e.g > 0.8281 && e.r == 0.0 ) ) break;
			}

			texcoord.x -= 0.25 * resolution.x;
			texcoord.x -= resolution.x;
			texcoord.x -= 2.0 * resolution.x;
			texcoord.x += resolution.x * SMAASearchLength( searchTex, e, 0.5, 0.5 );

			return texcoord.x;
		}

		float SMAASearchYUp( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 1.0, 0.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord += vec2( 0.0, 2.0 ) * resolution; // WebGL port note: Changed sign
				if ( ! ( texcoord.y > end && e.r > 0.8281 && e.g == 0.0 ) ) break;
			}

			texcoord.y -= 0.25 * resolution.y; // WebGL port note: Changed sign
			texcoord.y -= resolution.y; // WebGL port note: Changed sign
			texcoord.y -= 2.0 * resolution.y; // WebGL port note: Changed sign
			texcoord.y += resolution.y * SMAASearchLength( searchTex, e.gr, 0.0, 0.5 ); // WebGL port note: Changed sign

			return texcoord.y;
		}

		float SMAASearchYDown( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 1.0, 0.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord -= vec2( 0.0, 2.0 ) * resolution; // WebGL port note: Changed sign
				if ( ! ( texcoord.y < end && e.r > 0.8281 && e.g == 0.0 ) ) break;
			}

			texcoord.y += 0.25 * resolution.y; // WebGL port note: Changed sign
			texcoord.y += resolution.y; // WebGL port note: Changed sign
			texcoord.y += 2.0 * resolution.y; // WebGL port note: Changed sign
			texcoord.y -= resolution.y * SMAASearchLength( searchTex, e.gr, 0.5, 0.5 ); // WebGL port note: Changed sign

			return texcoord.y;
		}

		vec2 SMAAArea( sampler2D areaTex, vec2 dist, float e1, float e2, float offset ) {
			// Rounding prevents precision errors of bilinear filtering:
			vec2 texcoord = float( SMAA_AREATEX_MAX_DISTANCE ) * round( 4.0 * vec2( e1, e2 ) ) + dist;

			// We do a scale and bias for mapping to texel space:
			texcoord = SMAA_AREATEX_PIXEL_SIZE * texcoord + ( 0.5 * SMAA_AREATEX_PIXEL_SIZE );

			// Move to proper place, according to the subpixel offset:
			texcoord.y += SMAA_AREATEX_SUBTEX_SIZE * offset;

			return texture2D( areaTex, texcoord, 0.0 ).rg;
		}

		vec4 SMAABlendingWeightCalculationPS( vec2 texcoord, vec2 pixcoord, vec4 offset[ 3 ], sampler2D edgesTex, sampler2D areaTex, sampler2D searchTex, ivec4 subsampleIndices ) {
			vec4 weights = vec4( 0.0, 0.0, 0.0, 0.0 );

			vec2 e = texture2D( edgesTex, texcoord ).rg;

			if ( e.g > 0.0 ) { // Edge at north
				vec2 d;

				// Find the distance to the left:
				vec2 coords;
				coords.x = SMAASearchXLeft( edgesTex, searchTex, offset[ 0 ].xy, offset[ 2 ].x );
				coords.y = offset[ 1 ].y; // offset[1].y = texcoord.y - 0.25 * resolution.y (@CROSSING_OFFSET)
				d.x = coords.x;

				// Now fetch the left crossing edges, two at a time using bilinear
				// filtering. Sampling at -0.25 (see @CROSSING_OFFSET) enables to
				// discern what value each edge has:
				float e1 = texture2D( edgesTex, coords, 0.0 ).r;

				// Find the distance to the right:
				coords.x = SMAASearchXRight( edgesTex, searchTex, offset[ 0 ].zw, offset[ 2 ].y );
				d.y = coords.x;

				// We want the distances to be in pixel units (doing this here allow to
				// better interleave arithmetic and memory accesses):
				d = d / resolution.x - pixcoord.x;

				// SMAAArea below needs a sqrt, as the areas texture is compressed
				// quadratically:
				vec2 sqrt_d = sqrt( abs( d ) );

				// Fetch the right crossing edges:
				coords.y -= 1.0 * resolution.y; // WebGL port note: Added
				float e2 = SMAASampleLevelZeroOffset( edgesTex, coords, ivec2( 1, 0 ) ).r;

				// Ok, we know how this pattern looks like, now it is time for getting
				// the actual area:
				weights.rg = SMAAArea( areaTex, sqrt_d, e1, e2, float( subsampleIndices.y ) );
			}

			if ( e.r > 0.0 ) { // Edge at west
				vec2 d;

				// Find the distance to the top:
				vec2 coords;

				coords.y = SMAASearchYUp( edgesTex, searchTex, offset[ 1 ].xy, offset[ 2 ].z );
				coords.x = offset[ 0 ].x; // offset[1].x = texcoord.x - 0.25 * resolution.x;
				d.x = coords.y;

				// Fetch the top crossing edges:
				float e1 = texture2D( edgesTex, coords, 0.0 ).g;

				// Find the distance to the bottom:
				coords.y = SMAASearchYDown( edgesTex, searchTex, offset[ 1 ].zw, offset[ 2 ].w );
				d.y = coords.y;

				// We want the distances to be in pixel units:
				d = d / resolution.y - pixcoord.y;

				// SMAAArea below needs a sqrt, as the areas texture is compressed
				// quadratically:
				vec2 sqrt_d = sqrt( abs( d ) );

				// Fetch the bottom crossing edges:
				coords.y -= 1.0 * resolution.y; // WebGL port note: Added
				float e2 = SMAASampleLevelZeroOffset( edgesTex, coords, ivec2( 0, 1 ) ).g;

				// Get the area for this direction:
				weights.ba = SMAAArea( areaTex, sqrt_d, e1, e2, float( subsampleIndices.x ) );
			}

			return weights;
		}

		void main() {

			gl_FragColor = SMAABlendingWeightCalculationPS( vUv, vPixcoord, vOffset, tDiffuse, tArea, tSearch, ivec4( 0.0 ) );

		}`},ZT={name:`SMAABlendShader`,uniforms:{tDiffuse:{value:null},tColor:{value:null},resolution:{value:new K(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 2 ];

		void SMAANeighborhoodBlendingVS( vec2 texcoord ) {
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -1.0, 0.0, 0.0, 1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4( 1.0, 0.0, 0.0, -1.0 ); // WebGL port note: Changed sign in W component
		}

		void main() {

			vUv = uv;

			SMAANeighborhoodBlendingVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform sampler2D tColor;
		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 2 ];

		vec4 SMAANeighborhoodBlendingPS( vec2 texcoord, vec4 offset[ 2 ], sampler2D colorTex, sampler2D blendTex ) {
			// Fetch the blending weights for current pixel:
			vec4 a;
			a.xz = texture2D( blendTex, texcoord ).xz;
			a.y = texture2D( blendTex, offset[ 1 ].zw ).g;
			a.w = texture2D( blendTex, offset[ 1 ].xy ).a;

			// Is there any blending weight with a value greater than 0.0?
			if ( dot(a, vec4( 1.0, 1.0, 1.0, 1.0 )) < 1e-5 ) {
				return texture2D( colorTex, texcoord, 0.0 );
			} else {
				// Up to 4 lines can be crossing a pixel (one through each edge). We
				// favor blending by choosing the line with the maximum weight for each
				// direction:
				vec2 offset;
				offset.x = a.a > a.b ? a.a : -a.b; // left vs. right
				offset.y = a.g > a.r ? -a.g : a.r; // top vs. bottom // WebGL port note: Changed signs

				// Then we go in the direction that has the maximum weight:
				if ( abs( offset.x ) > abs( offset.y )) { // horizontal vs. vertical
					offset.y = 0.0;
				} else {
					offset.x = 0.0;
				}

				// Fetch the opposite color and lerp by hand:
				vec4 C = texture2D( colorTex, texcoord, 0.0 );
				texcoord += sign( offset ) * resolution;
				vec4 Cop = texture2D( colorTex, texcoord, 0.0 );
				float s = abs( offset.x ) > abs( offset.y ) ? abs( offset.x ) : abs( offset.y );

				// WebGL port note: Added gamma correction
				C.xyz = pow(C.xyz, vec3(2.2));
				Cop.xyz = pow(Cop.xyz, vec3(2.2));
				vec4 mixed = mix(C, Cop, s);
				mixed.xyz = pow(mixed.xyz, vec3(1.0 / 2.2));

				return mixed;
			}
		}

		void main() {

			gl_FragColor = SMAANeighborhoodBlendingPS( vUv, vOffset, tColor, tDiffuse );

		}`},QT=class extends jT{constructor(){super(),this._edgesRT=new ts(1,1,{depthBuffer:!1,type:Xi}),this._edgesRT.texture.name=`SMAAPass.edges`,this._weightsRT=new ts(1,1,{depthBuffer:!1,type:Xi}),this._weightsRT.texture.name=`SMAAPass.weights`;let e=this,t=new Image;t.src=this._getAreaTexture(),t.onload=function(){e._areaTexture.needsUpdate=!0},this._areaTexture=new Qo,this._areaTexture.name=`SMAAPass.area`,this._areaTexture.image=t,this._areaTexture.minFilter=Bi,this._areaTexture.generateMipmaps=!1,this._areaTexture.flipY=!1;let n=new Image;n.src=this._getSearchTexture(),n.onload=function(){e._searchTexture.needsUpdate=!0},this._searchTexture=new Qo,this._searchTexture.name=`SMAAPass.search`,this._searchTexture.image=n,this._searchTexture.magFilter=Li,this._searchTexture.minFilter=Li,this._searchTexture.generateMipmaps=!1,this._searchTexture.flipY=!1,this._uniformsEdges=Od.clone(YT.uniforms),this._materialEdges=new jd({defines:Object.assign({},YT.defines),uniforms:this._uniformsEdges,vertexShader:YT.vertexShader,fragmentShader:YT.fragmentShader}),this._uniformsWeights=Od.clone(XT.uniforms),this._uniformsWeights.tDiffuse.value=this._edgesRT.texture,this._uniformsWeights.tArea.value=this._areaTexture,this._uniformsWeights.tSearch.value=this._searchTexture,this._materialWeights=new jd({defines:Object.assign({},XT.defines),uniforms:this._uniformsWeights,vertexShader:XT.vertexShader,fragmentShader:XT.fragmentShader}),this._uniformsBlend=Od.clone(ZT.uniforms),this._uniformsBlend.tDiffuse.value=this._weightsRT.texture,this._materialBlend=new jd({uniforms:this._uniformsBlend,vertexShader:ZT.vertexShader,fragmentShader:ZT.fragmentShader}),this._fsQuad=new PT(null)}render(e,t,n){this._uniformsEdges.tDiffuse.value=n.texture,this._fsQuad.material=this._materialEdges,e.setRenderTarget(this._edgesRT),this.clear&&e.clear(),this._fsQuad.render(e),this._fsQuad.material=this._materialWeights,e.setRenderTarget(this._weightsRT),this.clear&&e.clear(),this._fsQuad.render(e),this._uniformsBlend.tColor.value=n.texture,this._fsQuad.material=this._materialBlend,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(),this._fsQuad.render(e))}setSize(e,t){this._edgesRT.setSize(e,t),this._weightsRT.setSize(e,t),this._materialEdges.uniforms.resolution.value.set(1/e,1/t),this._materialWeights.uniforms.resolution.value.set(1/e,1/t),this._materialBlend.uniforms.resolution.value.set(1/e,1/t)}dispose(){this._edgesRT.dispose(),this._weightsRT.dispose(),this._areaTexture.dispose(),this._searchTexture.dispose(),this._materialEdges.dispose(),this._materialWeights.dispose(),this._materialBlend.dispose(),this._fsQuad.dispose()}_getAreaTexture(){return`data:image/png;base64,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`}_getSearchTexture(){return`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEIAAAAhCAAAAABIXyLAAAAAOElEQVRIx2NgGAWjYBSMglEwEICREYRgFBZBqDCSLA2MGPUIVQETE9iNUAqLR5gIeoQKRgwXjwAAGn4AtaFeYLEAAAAASUVORK5CYII=`}},$T={name:`LuminosityHighPassShader`,uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new J(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`},eE=class e extends jT{constructor(e,t=1,n,r){super(),this.strength=t,this.radius=n,this.threshold=r,this.resolution=e===void 0?new K(256,256):new K(e.x,e.y),this.clearColor=new J(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let i=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);this.renderTargetBright=new ts(i,a,{type:Xi,depthBuffer:!1}),this.renderTargetBright.texture.name=`UnrealBloomPass.bright`,this.renderTargetBright.texture.generateMipmaps=!1;for(let e=0;e<this.nMips;e++){let t=new ts(i,a,{type:Xi,depthBuffer:!1});t.texture.name=`UnrealBloomPass.h`+e,t.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(t);let n=new ts(i,a,{type:Xi,depthBuffer:!1});n.texture.name=`UnrealBloomPass.v`+e,n.texture.generateMipmaps=!1,this.renderTargetsVertical.push(n),i=Math.round(i/2),a=Math.round(a/2)}let o=$T;this.highPassUniforms=Od.clone(o.uniforms),this.highPassUniforms.luminosityThreshold.value=r,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new jd({uniforms:this.highPassUniforms,vertexShader:o.vertexShader,fragmentShader:o.fragmentShader}),this.separableBlurMaterials=[];let s=[6,10,14,18,22];i=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);for(let e=0;e<this.nMips;e++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(s[e])),this.separableBlurMaterials[e].uniforms.invSize.value=new K(1/i,1/a),i=Math.round(i/2),a=Math.round(a/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;let c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new q(1,1,1),new q(1,1,1),new q(1,1,1),new q(1,1,1),new q(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=Od.clone(AT.uniforms),this.blendMaterial=new jd({uniforms:this.copyUniforms,vertexShader:AT.vertexShader,fragmentShader:AT.fragmentShader,premultipliedAlpha:!0,blending:2,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new J,this._oldClearAlpha=1,this._basic=new qc,this._fsQuad=new PT(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,t){let n=Math.round(e/2),r=Math.round(t/2);this.renderTargetBright.setSize(n,r);for(let e=0;e<this.nMips;e++)this.renderTargetsHorizontal[e].setSize(n,r),this.renderTargetsVertical[e].setSize(n,r),this.separableBlurMaterials[e].uniforms.invSize.value=new K(1/n,1/r),n=Math.round(n/2),r=Math.round(r/2)}render(t,n,r,i,a){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();let o=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),a&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=r.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=r.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let s=this.renderTargetBright;for(let n=0;n<this.nMips;n++)this._fsQuad.material=this.separableBlurMaterials[n],this.separableBlurMaterials[n].uniforms.colorTexture.value=s.texture,this.separableBlurMaterials[n].uniforms.direction.value=e.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[n]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[n].uniforms.colorTexture.value=this.renderTargetsHorizontal[n].texture,this.separableBlurMaterials[n].uniforms.direction.value=e.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[n]),t.clear(),this._fsQuad.render(t),s=this.renderTargetsVertical[n];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,a&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(r),this._fsQuad.render(t)),t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=o}_getSeparableBlurMaterial(e){let t=[],n=e/3;for(let r=0;r<e;r++)t.push(.39894*Math.exp(-.5*r*r/(n*n))/n);let r=[],i=[];for(let n=1;n<e;n+=2){let a=t[n],o=n+1<e?t[n+1]:0,s=a+o;r.push((n*a+(n+1)*o)/s),i.push(s)}return new jd({defines:{KERNEL_PAIRS:r.length},uniforms:{colorTexture:{value:null},invSize:{value:new K(.5,.5)},direction:{value:new K(.5,.5)},centerWeight:{value:t[0]},gaussianOffsets:{value:r},gaussianWeights:{value:i}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				#include <common>

				varying vec2 vUv;

				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float centerWeight;
				uniform float gaussianOffsets[KERNEL_PAIRS];
				uniform float gaussianWeights[KERNEL_PAIRS];

				void main() {

					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * centerWeight;

					for ( int i = 0; i < KERNEL_PAIRS; i ++ ) {

						vec2 uvOffset = direction * invSize * gaussianOffsets[ i ];
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += ( sample1 + sample2 ) * gaussianWeights[ i ];

					}

					gl_FragColor = vec4( diffuseSum, 1.0 );

				}`})}_getCompositeMaterial(e){return new jd({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				varying vec2 vUv;

				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor( const in float factor ) {

					float mirrorFactor = 1.2 - factor;
					return mix( factor, mirrorFactor, bloomRadius );

				}

				void main() {

					// 3.0 for backwards compatibility with previous alpha-based intensity
					vec3 bloom = 3.0 * bloomStrength * (
						lerpBloomFactor( bloomFactors[ 0 ] ) * bloomTintColors[ 0 ] * texture2D( blurTexture1, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 1 ] ) * bloomTintColors[ 1 ] * texture2D( blurTexture2, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 2 ] ) * bloomTintColors[ 2 ] * texture2D( blurTexture3, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 3 ] ) * bloomTintColors[ 3 ] * texture2D( blurTexture4, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 4 ] ) * bloomTintColors[ 4 ] * texture2D( blurTexture5, vUv ).rgb
					);

					float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
					gl_FragColor = vec4( bloom, bloomAlpha );

				}`})}};eE.BlurDirectionX=new K(1,0),eE.BlurDirectionY=new K(0,1);var tE=64,nE=255,rE=`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`,iE=`
  uniform float aspect;
  uniform float vignette;
  uniform float vignetteInner;
  uniform float vignetteOuter;

  // 以畫面半高為 1 的座標：中心 (0, 0)，上下邊 ±1，左右邊 ±aspect。
  vec2 lensCoord( vec2 uv ) {
    return ( uv - 0.5 ) * 2.0 * vec2( aspect, 1.0 );
  }

  float vignetteFactor( vec2 uv ) {
    return 1.0 - vignette * smoothstep( vignetteInner, vignetteOuter, length( lensCoord( uv ) ) );
  }
`,aE=`
  ${iE}
  varying vec2 vUv;
  void main() {
    gl_FragColor = vec4( vec3( vignetteFactor( vUv ) ), 1.0 );
  }
`,oE=`
  ${iE}
  uniform sampler2D tDiffuse;
  uniform float chromaticAberration;
  varying vec2 vUv;

  // 只跟像素座標有關的雜湊：同一個像素每幀都一樣，截圖可以重現。
  float hash( vec2 p ) {
    vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
    p3 += dot( p3, p3.yzx + 33.33 );
    return fract( ( p3.x + p3.y ) * p3.z );
  }

  void main() {
    gl_FragColor = vec4( texture2D( tDiffuse, vUv ).rgb, 1.0 );

    #ifdef CHROMATIC_ABERRATION
      // 色差：紅、藍兩個色版沿半徑方向往相反的方向錯開，越靠角落越多。
      vec2 lens = lensCoord( vUv );
      vec2 shift = ( vUv - 0.5 ) * dot( lens, lens ) * chromaticAberration;
      gl_FragColor.r = texture2D( tDiffuse, vUv - shift ).r;
      gl_FragColor.b = texture2D( tDiffuse, vUv + shift ).b;
    #endif

    // 暈影乘在色調映射之前：等於角落少一點曝光，太陽與車燈這些很亮的地方不會被壓成灰色。
    gl_FragColor.rgb *= vignetteFactor( vUv );

    // 色調映射與輸出色域：畫到畫面上時 three 會注入 renderer.toneMapping 對應的函式。整條鏈只有這裡做。
    #include <tonemapping_fragment>
    #include <colorspace_fragment>

    // 抖色（顯示空間）：加上不到一階的雜訊再量化成 8 位元，天空的漸層才不會出現色帶。
    vec3 color = gl_FragColor.rgb;
    color += ( hash( gl_FragCoord.xy ) - 0.5 ) / 255.0;
    gl_FragColor = vec4( clamp( color, 0.0, 1.0 ), 1.0 );
  }
`;function sE(e){return{aspect:{value:1},vignette:{value:e?.vignette??0},vignetteInner:{value:Hg.vignetteInner},vignetteOuter:{value:Hg.vignetteOuter}}}function cE(e){return new jd({name:`VignetteOverlayShader`,uniforms:sE(e),vertexShader:rE,fragmentShader:aE,transparent:!0,blending:5,blendSrc:200,blendDst:202,toneMapped:!1,depthTest:!1,depthWrite:!1})}function lE(e){let t={};return e!==null&&e.chromaticAberration>0&&(t.CHROMATIC_ABERRATION=``),new jd({name:`OutputShader`,defines:t,uniforms:{...sE(e),tDiffuse:{value:null},chromaticAberration:{value:e?.chromaticAberration??0}},vertexShader:rE,fragmentShader:oE,depthTest:!1,depthWrite:!1})}function uE(){let e=new kT({random:o_(k)}),t=tE,n=new Uint8Array(16384),r=e=>Math.round((e*.5+.5)*nE);for(let i=0;i<t;i+=1)for(let a=0;a<t;a+=1){let o=(i*t+a)*4;n[o]=r(e.noise(i,a)),n[o+1]=r(e.noise(i+t,a)),n[o+2]=r(e.noise(i,a+t)),n[o+3]=r(e.noise(i+t,a+t))}let i=new cl(n,t,t,ia,Ui);return i.wrapS=Pi,i.wrapT=Pi,i.needsUpdate=!0,i}var dE=class extends qT{hidden=[];render(e,t,n,r,i){this.scene.traverseVisible(e=>{e.userData.skipAmbientOcclusion===!0&&(e.visible=!1,this.hidden.push(e))}),super.render(e,t,n,r,i);for(let e of this.hidden)e.visible=!0;this.hidden.length=0}};function fE(e){let t=[];for(let n of[`_areaTexture`,`_searchTexture`]){let r=Reflect.get(e,n);if(!(r instanceof Qo)||r.version>0)continue;let i=r.image;i instanceof HTMLImageElement&&t.push(new Promise(e=>{i.addEventListener(`load`,()=>e(),{once:!0}),i.addEventListener(`error`,()=>e(),{once:!0})}))}if(t.length===0)return Promise.resolve();let n=new Promise(e=>{window.setTimeout(e,Hg.readyTimeoutMs)});return Promise.race([Promise.all(t).then(()=>void 0),n])}function pE(e,t,n){let r=e.uniforms[t];if(r===void 0)throw Error(`著色器「${e.name}」沒有 uniform「${t}」`);r.value=n}function mE(e,t){let n=0,r=n=>{let r=e.domElement,i=r.clientWidth,a=r.clientHeight;if(i===0||a===0)return!1;let o=Sw(t,window.devicePixelRatio),s=r.width!==Math.floor(i*o)||r.height!==Math.floor(a*o);s&&(e.setPixelRatio(o),e.setSize(i,a,!1));let c=i/a;return n.aspect!==c&&(n.aspect=c,n.updateProjectionMatrix()),s};if(e.info.autoReset=!1,!xw(t)){let i=t.lens,a=i!==null&&i.vignette>0?cE(i):void 0,o=a===void 0?void 0:new PT(a);return{fit(e){r(e)},render(t,i){r(i),e.info.reset(),e.render(t,i),o!==void 0&&a!==void 0&&(pE(a,`aspect`,i.aspect),e.autoClear=!1,o.render(e),e.autoClear=!0),n=e.info.render.calls},drawCalls:()=>n,ready:Promise.resolve()}}let i=e.getDrawingBufferSize(new K),a=Math.max(i.x,1),o=Math.max(i.y,1),s=new ts(a,o,{type:Xi}),c=new ts(a,o,{type:Xi,samples:t.msaaSamples}),l=new RT(e,s);l.renderTarget2.dispose(),l.renderTarget2=c,l.setPixelRatio(1);let u=new JT(new Vs,new vf);l.addPass(u);let d;if(t.ambientOcclusion!==null){let e=t.ambientOcclusion;d=new dE(u.scene,u.camera,i.x,i.y),d.blendIntensity=e.intensity,d.updateGtaoMaterial({radius:e.radiusM,samples:e.samples}),d.updatePdMaterial({samples:e.denoiseSamples,radius:Hg.aoDenoiseRadiusPx}),d.pdNoiseTexture.dispose(),d.pdNoiseTexture=uE(),pE(d.pdMaterial,`tNoise`,d.pdNoiseTexture),l.addPass(d)}if(t.bloom!==null){let e=t.bloom;l.addPass(new eE(new K(i.x,i.y),e.strength,e.radius,e.threshold))}let f=Promise.resolve();if(t.smaa){let e=new QT;l.addPass(e),f=fE(e)}let p=lE(t.lens);l.addPass(new FT(p));let m=!1,h=t=>{(r(t)||!m)&&(e.getDrawingBufferSize(i),l.setSize(i.x,i.y),m=!0),pE(p,`aspect`,t.aspect)};return{fit:h,render(t,r){h(r),u.scene=t,u.camera=r,d!==void 0&&(d.scene=t,d.camera=r),l.readBuffer=c,l.writeBuffer=s,e.info.reset(),l.render(),n=e.info.render.calls},drawCalls:()=>n,ready:f}}var hE={aces:4,agx:5},gE=`vec3 CustomToneMapping( vec3 color ) { return color; }`;function _E(e){return e.toFixed(5)}function vE(e){return`vec3( ${_E(e.r)}, ${_E(e.g)}, ${_E(e.b)} )`}function yE(){let e=Ag;return`vec3 CustomToneMapping( vec3 color ) {
	color = AgXToneMapping( color );
	const vec3 lumaWeights = vec3( 0.2126, 0.7152, 0.0722 );
	float luma = dot( color, lumaWeights );
	// 暗部往冷色抬一點，亮部乘上暖色。
	color += ${vE(e.shadowLift)} * ( 1.0 - luma ) * ( 1.0 - luma );
	color *= mix( vec3( 1.0 ), ${vE(e.highlightTint)}, smoothstep( 0.08, 0.7, luma ) );
	// 飽和度，再以中間灰為支點加一點對比。
	luma = dot( color, lumaWeights );
	color = max( mix( vec3( luma ), color, ${_E(e.saturation)} ), 0.0 );
	color = ${_E(e.contrastPivot)} * pow( color / ${_E(e.contrastPivot)}, vec3( ${_E(e.contrast)} ) );
	return clamp( color, 0.0, 1.0 );
}`}function bE(){let e=Kf.tonemapping_pars_fragment,t=yE();if(!e.includes(t)){if(!e.includes(gE))throw Error(`three 的色調映射著色器裡找不到 CustomToneMapping 的預設實作`);Kf.tonemapping_pars_fragment=e.replace(gE,t)}}function xE(e,t){bE();let n=new eg({canvas:e,antialias:!xw(t)&&t.msaaSamples>0});return n.outputColorSpace=no,n.toneMapping=hE[t.toneMapping],n.toneMappingExposure=Og.toneMappingExposure,n.shadowMap.enabled=!0,n.shadowMap.type=1,n}function SE(){let e=document.createElement(`canvas`).getContext(`webgl2`);if(e===null)return;let t=e.getExtension(`WEBGL_debug_renderer_info`),n=e.getParameter(t===null?e.RENDERER:t.UNMASKED_RENDERER_WEBGL);return e.getExtension(`WEBGL_lose_context`)?.loseContext(),typeof n==`string`?n:void 0}function CE(){let e=Reflect.get(navigator,`deviceMemory`),t=navigator.hardwareConcurrency;return{rendererName:SE(),deviceMemoryGb:typeof e==`number`?e:void 0,hardwareConcurrency:typeof t==`number`?t:void 0}}function wE(e,t){let n=xE(e,t);return{renderer:n,quality:t,pipeline:mE(n,t)}}function TE(e,t,n){let r=document.createElement(`div`);r.id=e,r.className=`hud-panel mode-panel`;let i=document.createElement(`div`);i.textContent=t;let a=document.createElement(`ul`);a.className=`mode-list`;for(let e of n){let t=document.createElement(`li`),n=document.createElement(`code`);n.textContent=e,t.append(n),a.append(t)}r.append(i,a),document.body.append(r)}function EE(e){let t=new Ms,n=1.4,r=Sv(e,{overlays:{dirt:.5,streaks:.5,oil:.5,tireMarks:.5}}),i=new al(new Yl(n,n,n),r),a=.42;i.position.set(-.98/2,n/2,0);let o=new al(new xd(a,48,24),r);o.position.set(.77,a,n*.2);for(let e of[i,o])e.castShadow=!0,e.receiveShadow=!0;return t.add(i,o),t.name=`surface:${e}`,t}function DE(){let e=new Ms;return tg.forEach((t,n)=>{let r=EE(t);r.position.set((n%4-3/2)*3,0,(Math.floor(n/4)-1.5)*3),e.add(r)}),e.name=`surfaceGrid`,e}var OE=new Map([[`car_sedan`,e=>mx(e).root],[`parking_spot`,()=>ZC(yt({...mr.spot,centerXFt:0,centerZFt:0}))],[`materials`,()=>DE()],...tg.map(e=>[`material_${e}`,()=>EE(e)]),...rt.map(e=>[`obstacle_${e}`,t=>FC(e,t)])]),kE=[...OE.keys()];function AE(e,t=`high`){return OE.get(e)?.(t)}function jE(){let e=new al(new Xl(Ig.floorRadiusM,Ig.floorSegments),new Nd({color:Ig.floorColor,roughness:Ig.floorRoughness,metalness:0}));return e.rotation.x=-Math.PI/2,e.receiveShadow=!0,e}function ME({renderer:e,quality:t,pipeline:n},r){Tg(e,t.materials),r===`materials`&&(document.body.dataset.surfaceChecksum=String(Dg(e)));let i=new Vs;i.background=new J(Ig.backgroundColor),bT(i,e,t),xT(i,Ig.directionToKeyLight,t,{color:Ig.keyLightColor,intensity:Ig.keyLightIntensity});let a=jE();i.add(a);let o=AE(r,t.vehicleDetail);o===void 0?TE(`show-notice`,F(`show.unknown`),kE):i.add(o);let s=new nc().setFromObject(o??a).getBoundingSphere(new Dc),c=Re(H(Ig.cameraAzimuthDeg)),l=H(Ig.cameraElevationDeg),u=t_();function d(){n.fit(u);let e=H(u.fov)/2,t=Math.atan(Math.tan(e)*u.aspect),r=s.radius/Math.sin(Math.min(e,t))*Ig.fitScale,a=r*Math.cos(l);u.position.set(s.center.x+c.x*a,s.center.y+r*Math.sin(l),s.center.z+c.z*a),u.lookAt(s.center),n.render(i,u),f&&(document.body.dataset.shotReady=`true`),requestAnimationFrame(d)}let f=!1;n.ready.then(()=>{f=!0}),requestAnimationFrame(d)}var NE={throttle:`controls.action.throttle`,reverse:`controls.action.reverse`,steerLeft:`controls.action.steerLeft`,steerRight:`controls.action.steerRight`,brake:`controls.action.brake`,handbrake:`controls.action.handbrake`,gearDrive:`controls.action.gearDrive`,gearReverse:`controls.action.gearReverse`,restart:`controls.action.restart`,toggleCamera:`controls.action.toggleCamera`,pause:`controls.action.pause`},PE=`Escape`;function FE(e){let t=E(e);return`key`in t?F(t.key):t.text}function IE(e){return e.map(FE).join(` / `)}function LE(e,t){return e.replace(/\{(\w+)\}/g,(e,n)=>t[n]??e)}function RE(e,t,n){let r,i;function a(){r?.cancel(),r=void 0}function o(r,a){i=a,r!==e.current()&&(e.apply(r),t()),n()}function s(t,r,a){if(a===PE&&t!==`pause`){i=void 0,n();return}let s=y(e.current(),t,r,a);switch(s.kind){case`ok`:o(s.bindings,{warning:!1,text:()=>LE(F(`controls.bound`),{key:FE(a),action:F(NE[t])})});break;case`conflict`:{let t=s.action;o(e.current(),{warning:!0,text:()=>LE(F(`controls.conflict`),{key:FE(a),action:F(NE[t])})});break}case`unsupported`:o(e.current(),{warning:!0,text:()=>F(`controls.unsupported`)})}}return{listening:()=>r,message:()=>i,listen(t,o){let c=r?.action===t&&r.slot===o;a(),i=void 0,c||(r={action:t,slot:o,cancel:e.captureNextKey(e=>{r=void 0,s(t,o,e)})}),n()},stop:a,change:o,reset(){a(),i=void 0}}}function zE(e,t,n,r,i){let a=e.element(`div`,`hud-status controls-overlay`,t);a.id=`controls-panel`,a.setAttribute(`role`,`dialog`),a.hidden=!0;let o=e.element(`div`,`hud-panel controls-panel`,a);e.translatedElement(`div`,`controls-title`,o,`controls.title`),e.translatedElement(`div`,`controls-hint`,o,`controls.hint`);let s=RE(n,r,()=>{h()}),c=e.element(`div`,`controls-rows`,o),l=[],f=[];for(let t of u){let r=e.element(`div`,`controls-row`,c);r.dataset.action=t,e.translatedElement(`span`,`controls-action`,r,NE[t]);for(let n=0;n<2;n+=1){let i=e.plainButton(`bind-${t}-${n}`,`controls-key`,r);i.addEventListener(`click`,()=>{s.listen(t,n)}),l.push({action:t,slot:n,button:i})}let i=e.plainButton(`bind-${t}-clear`,`controls-clear`,r);i.textContent=`×`,i.addEventListener(`click`,()=>{s.stop(),s.change(b(n.current(),t),void 0)}),f.push({action:t,button:i})}let p=e.element(`div`,`controls-message`,o);p.id=`controls-message`,p.setAttribute(`role`,`status`),e.translatedElement(`div`,`controls-note`,o,`controls.gearNote`);let m=e.element(`div`,`panel-actions`,o);e.button(`controls-reset`,`panel-button`,m,`controls.reset`,()=>{s.stop(),s.change(d,{warning:!1,text:()=>F(`controls.resetDone`)})}),e.button(`controls-done`,`panel-button panel-button-primary`,m,`controls.done`,()=>{g()});function h(){let e=n.current(),t=s.listening(),r=s.message();for(let{action:n,slot:r,button:i}of l){let a=e[n][r],o=t?.action===n&&t.slot===r;i.textContent=o?F(`controls.listening`):a===void 0?`＋`:FE(a),i.dataset.listening=String(o),i.dataset.code=a??``;let s=F(NE[n]);i.setAttribute(`aria-label`,a===void 0?`${s}: ${F(`controls.addKey`)}`:`${s}: ${FE(a)}`),i.title=F(a===void 0?`controls.addKey`:`controls.rebind`)}for(let{action:t,button:n}of f)n.dataset.available=String(e[t].length>1),n.disabled=e[t].length<=1,n.title=F(`controls.clear`),n.setAttribute(`aria-label`,`${F(NE[t])}: ${F(`controls.clear`)}`);p.textContent=r?.text()??``,p.dataset.kind=r===void 0?`none`:r.warning?`warning`:`info`}function g(){a.hidden||(s.reset(),a.hidden=!0,i())}return h(),{open(){a.hidden&&(a.hidden=!1,h(),i())},close:g,isOpen:()=>!a.hidden,refresh:h}}function BE(e){return e===`zh-TW`?`en`:`zh-TW`}function VE(){let e=[],t=[];function n(e,t,n){let r=document.createElement(e);return r.className=t,n.append(r),r}function r(t,r,i,a,o){let s=n(t,r,i);return e.push(o===void 0?{element:s,key:a}:{element:s,key:a,fill:o}),s}function i(e,t,n){let r=document.createElement(`button`);return r.type=`button`,r.id=e,r.className=t,n.append(r),r.addEventListener(`mousedown`,e=>{e.preventDefault()}),r}return{element:n,translatedElement:r,plainButton:i,button(t,n,r,a,o){let s=i(t,n,r);return e.push({element:s,key:a}),s.addEventListener(`click`,o),s},languageButton(n,r,a){let o=i(n,r,a);return e.push({element:o,key:`hud.languageTarget`}),t.push(o),o.addEventListener(`click`,()=>{de(BE(ue()))}),o},refreshTexts(){for(let t of e){let e=F(t.key);t.element.textContent=t.fill===void 0?e:t.fill(e)}for(let e of t){e.lang=BE(ue());let t=F(`hud.language`);e.title=t,e.setAttribute(`aria-label`,`${t}: ${F(`hud.languageTarget`)}`)}}}}var HE=60,UE=10,WE=1e-6,GE=1;function KE(e){return`${Math.abs(Pe(e)).toFixed(GE)}°`}function qE(e,t){return Number.isFinite(t)?`${e} / ${t}`:String(e)}function JE(e){if(!Number.isFinite(e))return`–:––.–`;let t=Math.floor(Math.max(e,0)*UE+WE),n=t%UE,r=Math.floor(t/UE),i=r%HE;return`${Math.floor(r/HE)}:${String(i).padStart(2,`0`)}.${n}`}function YE(e){let t=Math.min(Math.max(Math.round(e),0),3);return`★`.repeat(t)+`☆`.repeat(3-t)}function XE(e,t,n,r,i,a){let o=e.element(`div`,`hud-status hud-pause`,t);o.id=`hud-pause`,o.setAttribute(`role`,`dialog`),o.hidden=!0;let s=e.element(`div`,`hud-panel hud-status-panel`,o);e.translatedElement(`div`,`hud-status-title`,s,`pause.title`);let c=e.element(`div`,`panel-actions`,s);e.button(`pause-resume`,`panel-button panel-button-primary`,c,`pause.resume`,r),e.button(`pause-retry`,`panel-button`,c,`result.retry`,n.restart),e.button(`pause-select`,`panel-button`,c,`result.levelSelect`,n.levelSelect);let l=e.element(`div`,`panel-actions`,s);return e.button(`pause-controls`,`panel-button`,l,`pause.controls`,i),e.translatedElement(`div`,`hud-status-hint`,s,`pause.hint`,e=>LE(e,{key:a()})),{setVisible(e){o.hidden=!e}}}var ZE={timeout:`status.failTimeout`,collisions:`status.failCollisions`};function QE(e){if(e.status!==`parked`&&e.status!==`failed`)return null;let t=e.layout.rules??Dt,{result:n}=e;return{outcome:e.status,stars:n?.stars??null,failReason:e.failReason,time:JE(At(n?.timeSteps??e.elapsedSteps)),collisions:qE(n?.collisions??e.collisions,t.maxCollisions),angle:KE(n?.angleErrorRad??bt(e.vehicle,e.layout.spot))}}function $E(e,t,n,r){let i=e.element(`div`,`hud-status`,t);i.id=`hud-status`,i.setAttribute(`role`,`status`),i.hidden=!0;let a=e.element(`div`,`hud-panel hud-status-panel`,i),o=e.element(`div`,`hud-status-title`,a),s=e.element(`div`,`hud-status-detail`,a);s.id=`hud-status-detail`;let c=document.createElement(`span`);c.id=`result-stars`;let l=e.element(`dl`,`result-rows`,a);function u(t,n){e.translatedElement(`dt`,`result-label`,l,n);let r=e.element(`dd`,`result-value`,l);return r.id=t,r}let d=u(`result-time`,`result.time`),f=u(`result-collisions`,`result.collisions`),p=u(`result-angle`,`result.angle`),m=e.element(`div`,`panel-actions`,a),{nextLevel:h}=n,g=h===void 0?void 0:e.button(`result-next`,`panel-button panel-button-primary`,m,`result.next`,h);e.button(`result-retry`,`panel-button`,m,`result.retry`,n.restart),e.button(`result-select`,`panel-button`,m,`result.levelSelect`,n.levelSelect),e.translatedElement(`div`,`hud-status-hint`,a,`status.restartHint`,e=>LE(e,{key:r()}));let _=null;function v(){if(i.hidden=_===null,_===null)delete i.dataset.status,delete s.dataset.stars;else{if(i.dataset.status=_.outcome,_.outcome===`parked`){let e=_.stars??0;o.textContent=F(`status.parked`),c.textContent=YE(e),c.dataset.stars=String(e),s.replaceChildren(c),s.dataset.stars=String(e)}else o.textContent=F(`status.failed`),s.textContent=_.failReason===null?``:F(ZE[_.failReason]),delete s.dataset.stars;d.textContent=_.time,f.textContent=_.collisions,p.textContent=_.angle,g!==void 0&&(g.hidden=_.outcome!==`parked`)}}return fe(v),{show(e){_=e,v()}}}var eD={gear:`forward`,manual:!1};function tD(e,t,n){return t===0||e*t<0?n:t>0?`forward`:`reverse`}function nD(e){return{gear:e,manual:!0}}function rD(e,t){let n=t.restarted?eD:e;return t.shift!==null&&t.canShift?nD(t.shift):n}function iD(e,t,n,r){if(e.manual)return e;let i=t===`ready`?`forward`:e.gear,a=t===`ready`||t===`driving`?tD(n,r,i):i;return a===e.gear?e:{gear:a,manual:!1}}function aD(e,t){if(!t.manual||e.throttle===0)return e;let n=t.gear===`forward`?1:-1;return e.throttle===n?e:{...e,throttle:0,brake:!0}}var oD=1,sD=10,cD={forward:{letter:`D`,key:`hud.gearForward`},reverse:{letter:`R`,key:`hud.gearReverse`}},lD=2600,uD=.65,dD={chase_near:`camera.chase_near`,chase_far:`camera.chase_far`,hood:`camera.hood`,cockpit:`camera.cockpit`,top:`camera.top`},fD=[{actions:[`throttle`,`reverse`],label:`hud.controlDrive`},{actions:[`steerLeft`,`steerRight`],label:`hud.controlSteer`},{actions:[`brake`],label:`hud.controlBrake`},{actions:[`handbrake`],label:`hud.controlHandbrake`},{actions:[`gearDrive`,`gearReverse`],label:`hud.controlGears`},{actions:[`restart`],label:`hud.controlRestart`},{actions:[`toggleCamera`],label:`hud.controlCamera`},{actions:[`pause`],label:`hud.controlPause`}];function pD(e,t){let n=t.length>1?1:1/0;return t.flatMap(t=>e[t].slice(0,n).map(e=>({action:t,code:e})))}function mD(e){return dD[e]}function hD(e){return Math.abs(Me(e)).toFixed(oD)}function gD(e){let t=e.layout.rules??Dt,n=At(Math.max(t.timeLimitSteps-e.elapsedSteps,0));return{speed:hD(e.vehicle.speedMps),time:JE(n),lowTime:n<sD,collisions:qE(e.collisions,t.maxCollisions),angle:KE(bt(e.vehicle,e.layout.spot)),outcome:e.status===`parked`||e.status===`failed`?e.status:null,stars:e.result?.stars??null,failReason:e.failReason}}function _D(e,t,n,r){let i=VE(),{element:a,translatedElement:o}=i,s=a(`div`,`hud-panel hud-speed`,e);o(`span`,`hud-speed-label`,s,`hud.speed`);let c=a(`span`,`hud-speed-value`,s);c.id=`hud-speed`,o(`span`,`hud-speed-unit`,s,`hud.speedUnit`);let l=a(`div`,`hud-panel hud-stats`,e);function u(e,t){let n=a(`div`,`hud-stat`,l);o(`span`,`hud-stat-label`,n,t);let r=a(`span`,`hud-stat-value`,n);return r.id=e,r}let d=u(`hud-time`,`hud.time`),f=u(`hud-collisions`,`hud.collisions`),p=u(`hud-gear`,`hud.gear`),m=u(`hud-angle`,`hud.angle`),h=a(`div`,`hud-corner`,e);i.languageButton(`hud-language`,`hud-panel hud-button`,h),i.button(`hud-level-select`,`hud-panel hud-button`,h,`result.levelSelect`,t.levelSelect);let g=a(`div`,`hud-panel hud-controls`,e);o(`div`,`hud-controls-title`,g,`hud.controls`);let _=a(`dl`,`hud-controls-list`,g),v=fD.map(e=>{let t=a(`dt`,`hud-controls-keys`,_);return o(`dd`,`hud-controls-action`,_,e.label),{caps:t,actions:e.actions}});i.button(`hud-controls-edit`,`hud-controls-edit`,g,`hud.controlsEdit`,()=>{r.hold(),T.open()});let y=a(`div`,`hud-panel hud-camera`,e);y.id=`hud-camera`,y.setAttribute(`role`,`status`);let b,x,S=!1,C=$E(i,e,t,()=>IE(r.current().restart)),w=XE(i,e,t,n,()=>{T.open()},()=>IE(r.current().pause)),T=zE(i,e,r,ee,E);function E(){w.setVisible(S&&!T.isOpen())}let D,O=`forward`,k=!1;function A(){let e=cD[O];p.dataset.gear=O,p.dataset.mode=k?`manual`:`auto`,p.textContent=`${e.letter} ${F(e.key)}`,p.title=k?F(`hud.gearManual`):``}function j(){let e=r.current();for(let t of v){t.caps.replaceChildren();for(let{action:n,code:r}of pD(e,t.actions)){let e=a(`kbd`,`hud-key`,t.caps);e.dataset.action=n,e.textContent=FE(r)}}}function ee(){i.refreshTexts(),A(),j(),T.refresh(),b!==void 0&&(y.textContent=F(mD(b)))}return ee(),fe(ee),{update(e,t){let n=gD(e),r=D;D=n,n.speed!==r?.speed&&(c.textContent=n.speed),n.time!==r?.time&&(d.textContent=n.time),n.lowTime!==r?.lowTime&&(d.dataset.low=String(n.lowTime)),n.collisions!==r?.collisions&&(f.textContent=n.collisions),n.angle!==r?.angle&&(m.textContent=n.angle),(t.gear!==O||t.manual!==k)&&(O=t.gear,k=t.manual,A()),(n.outcome!==r?.outcome||n.stars!==r.stars||n.failReason!==r.failReason)&&C.show(QE(e))},setPaused(e){S=e,e||T.close(),E()},controlsOpen:()=>T.isOpen(),closeControls(){T.close()},refreshBindings:ee,showCameraView(e){b=e,y.dataset.view=e,y.textContent=F(mD(e)),x?.cancel(),x=y.animate([{opacity:1},{opacity:1,offset:uD},{opacity:0}],{duration:lD,fill:`forwards`})}}}function vD(e,t,n){return e.map(({number:e,id:r,level:i})=>{if(i===void 0)return{number:e,id:r,state:`soon`,nameKey:void 0,stars:0,bestTimeS:void 0};let a=En(t,r);return{number:e,id:r,state:Mi(r,t,n)?`unlocked`:`locked`,nameKey:ce(i.nameKey)?i.nameKey:void 0,stars:a?.stars??0,bestTimeS:a?.bestTimeS}})}var yD=`http://www.w3.org/2000/svg`;function bD(){let e=document.createElementNS(yD,`svg`);e.setAttribute(`viewBox`,`0 0 24 24`),e.setAttribute(`class`,`level-card-lock`),e.setAttribute(`aria-hidden`,`true`);let t=document.createElementNS(yD,`path`);t.setAttribute(`d`,`M7.5 11V8a4.5 4.5 0 0 1 9 0v3`),t.setAttribute(`fill`,`none`),t.setAttribute(`stroke`,`currentColor`),t.setAttribute(`stroke-width`,`2`);let n=document.createElementNS(yD,`rect`);return n.setAttribute(`x`,`5`),n.setAttribute(`y`,`11`),n.setAttribute(`width`,`14`),n.setAttribute(`height`,`10`),n.setAttribute(`rx`,`2`),n.setAttribute(`fill`,`currentColor`),e.append(t,n),e}function xD(e,t,n){let r=VE(),i=r.element(`div`,`level-select`,e);i.id=`level-select`,r.languageButton(`select-language`,`hud-panel hud-button select-language`,i);let a=r.element(`main`,`select-inner`,i);r.translatedElement(`h1`,`select-title`,a,`select.title`),r.translatedElement(`div`,`select-world`,a,`select.world`);let o=r.element(`div`,`select-grid`,a);for(let e of t){let t=document.createElement(`button`);if(t.type=`button`,t.className=`hud-panel level-card`,t.dataset.state=e.state,t.disabled=e.state!==`unlocked`,o.append(t),r.element(`span`,`level-card-number`,t).textContent=String(e.number),e.state===`soon`){r.translatedElement(`span`,`level-card-name`,t,`select.comingSoon`);continue}if(t.dataset.level=e.id,t.dataset.stars=String(e.stars),e.nameKey===void 0?r.element(`span`,`level-card-name`,t).textContent=e.id:r.translatedElement(`span`,`level-card-name`,t,e.nameKey),e.state===`locked`){t.append(bD()),r.translatedElement(`span`,`level-card-note`,t,`select.locked`);continue}r.element(`span`,`level-card-stars`,t).textContent=YE(e.stars);let i=r.element(`span`,`level-card-time`,t);r.translatedElement(`span`,`level-card-time-label`,i,`select.bestTime`),r.element(`span`,`level-card-time-value`,i).textContent=JE(e.bestTimeS??NaN),t.addEventListener(`click`,()=>{n(e.id)})}r.refreshTexts(),fe(()=>{r.refreshTexts()})}var SD=[`bird`,`rear`,`mirrorLeft`,`mirrorRight`],CD={bird:.7,rear:1.6,mirrorLeft:1.5,mirrorRight:1.5},wD={marginPx:16,gapPx:10,topRowYPx:92,narrowWidthPx:600,narrowTopRowYPx:138,topRowHeightFraction:.27,topRowMinHeightPx:90,topRowMaxHeightPx:230,mirrorWidthFraction:.17,mirrorMinWidthPx:100,mirrorMaxWidthPx:250,mirrorCenterYFraction:.44,phoneShortSideMaxPx:500,phoneScale:.66,phoneMirrorMinWidthPx:70};function TD(e,t,n){return Math.min(Math.max(e,t),n)}function ED(e,t){return Math.min(e,t)<=wD.phoneShortSideMaxPx}function DD(e,t){return ED(e,t)?wD.phoneScale:1}function OD(e,t){let n=DD(e,t),r=Math.max(e-2*wD.marginPx,1),i=e<=wD.narrowWidthPx?wD.narrowTopRowYPx:wD.topRowYPx,a=CD.bird+CD.rear,o=TD(t*wD.topRowHeightFraction,wD.topRowMinHeightPx,wD.topRowMaxHeightPx),s=Math.max(Math.floor(Math.min(o,(r-wD.gapPx)/a)*n),1),c=Math.max(Math.round(s*CD.bird),1),l=Math.max(Math.round(s*CD.rear),1),u=Math.round((e-(c+wD.gapPx+l))/2),d=Math.min(TD(e*wD.mirrorWidthFraction,wD.mirrorMinWidthPx,wD.mirrorMaxWidthPx),(r-wD.gapPx)/2),f=Math.round(n<1?Math.min(Math.max(d*n,wD.phoneMirrorMinWidthPx),d):d),p=Math.max(Math.round(f/CD.mirrorLeft),1),m=Math.round(t*wD.mirrorCenterYFraction-p/2),h=wD.marginPx+f+wD.gapPx>u?Math.max(m,i+s+wD.gapPx):m;return{bird:{x:u,y:i,width:c,height:s},rear:{x:u+c+wD.gapPx,y:i,width:l,height:s},mirrorLeft:{x:wD.marginPx,y:h,width:f,height:p},mirrorRight:{x:e-wD.marginPx-f,y:h,width:f,height:p}}}var kD={fadeSeconds:.2,rollbackSpeedMps:je(.5),rollbackHoldSeconds:.4},AD={opacity:0,rollbackSeconds:0};function jD(e,t,n){let r=kD,i=Math.max(n,0),a=t.speedMps<-r.rollbackSpeedMps&&t.running?e.rollbackSeconds+i:0,o=t.running&&(t.reverseGear||a>=r.rollbackHoldSeconds),s=i/r.fadeSeconds;return{opacity:o?Math.min(e.opacity+s,1):Math.max(e.opacity-s,0),rollbackSeconds:a}}var MD=U.lengthM/2,ND=U.widthM/2,PD={bird:!1,rear:!0,mirrorLeft:!0,mirrorRight:!0};function FD(){return new vf(Fg.mirror.fovDeg,CD.mirrorLeft,Fg.mirror.nearM,Fg.farM)}function ID(){let e=Fg.bird.halfDepthM,t=e*CD.bird;return{bird:new xf(-t,t,e,-e,Fg.bird.heightM-Fg.bird.clipAboveGroundM,Fg.bird.heightM+1),rear:new vf(Fg.rear.fovDeg,CD.rear,Fg.rear.nearM,Fg.farM),mirrorLeft:FD(),mirrorRight:FD()}}function LD(e,t,n,r,i,a,o){e.position.set(t,n,r);let s=Math.cos(o);e.lookAt(t+i*s,n-Math.sin(o),r+a*s)}function RD(e,t){let n=Re(t.headingRad),r=ze(t.headingRad);e.bird.up.set(n.x,0,n.z),e.bird.position.set(t.x,Fg.bird.heightM,t.z),e.bird.lookAt(t.x,0,t.z);let i=MD+Fg.rear.behindRearM;LD(e.rear,t.x-n.x*i,Fg.rear.heightM,t.z-n.z*i,-n.x,-n.z,Fg.rear.pitchDownRad);let a=Fg.mirror,o=ND+a.outboardM,s=Math.cos(a.yawOutRad),c=Math.sin(a.yawOutRad);for(let[i,l]of[[e.mirrorLeft,-1],[e.mirrorRight,1]])LD(i,t.x+r.x*l*o+n.x*a.aheadM,a.heightM,t.z+r.z*l*o+n.z*a.aheadM,-n.x*s+r.x*l*c,-n.z*s+r.z*l*c,a.pitchDownRad);for(let t of SD)e[t].updateMatrixWorld()}var zD={x:0,z:0,headingRad:0,steerRad:0};function BD(){let e=ID();RD(e,zD);let t=new q;return(n,r)=>{t.set(r.lateralM,0,-r.aheadM).project(e[n]);let i=(t.x+1)/2;return{u:PD[n]?1-i:i,v:(1-t.y)/2}}}var VD=`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`,HD=`
  uniform sampler2D tView;
  uniform float opacity;
  uniform float mirrored;
  varying vec2 vUv;
  void main() {
    vec2 uv = vec2( mix( vUv.x, 1.0 - vUv.x, mirrored ), vUv.y );
    gl_FragColor = vec4( texture2D( tView, uv ).rgb, opacity );
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;function UD(e,t,n=e=>{e()}){let r=Fg.quality[t.level],i=ID(),a=e.extensions.has(`EXT_color_buffer_float`)||e.extensions.has(`EXT_color_buffer_half_float`)?Xi:Ui,o=()=>new ts(1,1,{type:a,samples:r.msaaSamples,minFilter:Bi,magFilter:Bi,generateMipmaps:!1}),s={bird:o(),rear:o(),mirrorLeft:o(),mirrorRight:o()},c=new jd({name:`AssistBlitShader`,uniforms:{tView:{value:null},opacity:{value:1},mirrored:{value:0}},vertexShader:VD,fragmentShader:HD,transparent:!0,depthTest:!1,depthWrite:!1}),l=new PT(c),u=c.uniforms,d=new K,f=!1,p=0;function m(e,n){let i=Sw(t,window.devicePixelRatio)*r.resolutionScale,a=Math.max(Math.round(n.width*i),1),o=Math.max(Math.round(n.height*i),1);return e.width===a&&e.height===o?!1:(e.setSize(a,o),!0)}return{warmUp(t){RD(i,zD),e.setRenderTarget(s.rear),e.compileAsync(t,i.rear),e.setRenderTarget(null)},render(t,a,o,c){if(c<=0){f=!1;return}RD(i,a);let h=new Set;for(let e of SD)(m(s[e],o[e])||!f)&&h.add(e);for(let e=0;e<r.viewsPerFrame;e+=1){let e=SD[p%SD.length];p+=1,e!==void 0&&h.add(e)}f=!0;let g=e.shadowMap.autoUpdate;e.shadowMap.autoUpdate=!1,n(()=>{for(let n of h)e.setRenderTarget(s[n]),e.render(t,i[n])}),e.setRenderTarget(null),e.shadowMap.autoUpdate=g,e.getSize(d),e.autoClear=!1,u.opacity!==void 0&&(u.opacity.value=Math.min(c,1));for(let t of SD){let n=o[t];u.tView!==void 0&&u.mirrored!==void 0&&(u.tView.value=s[t].texture,u.mirrored.value=+!!PD[t]),e.setViewport(n.x,d.y-n.y-n.height,n.width,n.height),l.render(e)}e.setViewport(0,0,d.x,d.y),e.autoClear=!0}}}var WD=U.lengthM/2,GD=U.widthM/2,KD=U.wheelbaseM/2,qD=[{color:`red`,fromM:V(1),toM:V(3.5)},{color:`yellow`,fromM:V(3.5),toM:V(7.5)},{color:`green`,fromM:V(7.5),toM:V(14)}],JD={sideMarginM:V(.5),tickM:V(1.6),centerFromM:V(1),centerToM:V(17),pathLengthM:V(10),pathStepM:V(1),pathRungM:V(5),straightSteerRad:1e-4};function YD(e,t){return{lateralM:e,aheadM:-(WD+t)}}function XD(){let e=JD,t=GD+e.sideMarginM,n=[];for(let r of qD)for(let i of[-1,1])n.push({color:r.color,dashed:!1,points:[YD(i*t,r.fromM),YD(i*t,r.toM),YD(i*(t-e.tickM),r.toM)]});return n.push({color:`blue`,dashed:!0,points:[YD(0,e.centerFromM),YD(0,e.centerToM)]}),n}function ZD(e,t,n){if(Math.abs(t)<JD.straightSteerRad)return{lateralM:e.lateralM,aheadM:e.aheadM-n};let r=U.wheelbaseM/Math.tan(t),i=n/r,a=e.lateralM-r,o=e.aheadM+KD,s=Math.cos(i),c=Math.sin(i);return{lateralM:r+a*s-o*c,aheadM:-KD+a*c+o*s}}function QD(e){let t=JD,n=[-1,1].map(e=>({lateralM:e*GD,aheadM:-WD})),r=Math.round(t.pathLengthM/t.pathStepM),i=n.map(n=>({color:`green`,dashed:!1,points:Array.from({length:r+1},(r,i)=>ZD(n,e,i*t.pathStepM))})),a=Math.round(t.pathLengthM/t.pathRungM);for(let r=1;r<=a;r+=1){let a=r*t.pathRungM;i.push({color:`green`,dashed:!1,points:n.map(t=>ZD(t,e,a))})}return i}var $D=`Check surroundings for safety.`,eO=`http://www.w3.org/2000/svg`,tO=100,nO=.004,rO={bird:{id:`assist-bird`,key:`assist.bird`},rear:{id:`assist-rear`,key:`assist.rear`},mirrorLeft:{id:`assist-mirror-left`,key:`assist.mirrorLeft`},mirrorRight:{id:`assist-mirror-right`,key:`assist.mirrorRight`}};function iO(e,t,n){return e.points.map(e=>{let{u:r,v:i}=n(t,e);return`${(r*tO).toFixed(2)},${(i*tO).toFixed(2)}`}).join(` `)}function aO(e,t,n,r,i){let a=UD(e,t,i);a.warmUp(r);let o=BD(),s=VE(),c=document.createElement(`div`);c.id=`reverse-assist`,c.className=`assist`,c.dataset.visible=`false`,c.setAttribute(`aria-hidden`,`true`),n.prepend(c);let l={},u={};for(let e of SD){let t=s.element(`div`,`assist-view`,c);t.id=rO[e].id,t.dataset.view=e;let n=document.createElementNS(eO,`svg`);n.setAttribute(`class`,`assist-guides`),n.setAttribute(`viewBox`,`0 0 ${tO} ${tO}`),n.setAttribute(`preserveAspectRatio`,`none`),t.append(n),s.translatedElement(`span`,`assist-label`,t,rO[e].key),l[e]=t,u[e]=n}function d(e,t){let n=document.createElementNS(eO,`polyline`);return n.setAttribute(`class`,`assist-guide`),n.dataset.color=t.color,n.dataset.dashed=String(t.dashed),n.setAttribute(`points`,iO(t,e,o)),u[e].append(n),n}for(let e of XD())d(`rear`,e);let f=s.element(`div`,`assist-warning`,l.rear);f.id=`assist-warning`;let p=s.element(`span`,`assist-warning-line`,f);p.lang=`en`,p.textContent=$D;let m=s.translatedElement(`span`,`assist-warning-line`,f,`assist.warning`);m.id=`assist-warning-local`;let h=QD(0).map(e=>d(`bird`,e)),g;function _(e){let t=Math.round(e/nO);t!==g&&(g=t,QD(t*nO).forEach((e,t)=>{h[t]?.setAttribute(`points`,iO(e,`bird`,o))}))}function v(){s.refreshTexts(),m.hidden=ue()===`en`}v(),fe(v);let y,b=0,x=0;function S(){let t=e.domElement;if(y!==void 0&&t.clientWidth===b&&t.clientHeight===x)return y;b=t.clientWidth,x=t.clientHeight;let n=OD(b,x);c.dataset.compact=String(ED(b,x));for(let e of SD){let t=n[e],{style:r}=l[e];r.left=`${t.x}px`,r.top=`${t.y}px`,r.width=`${t.width}px`,r.height=`${t.height}px`}return y=n,n}let C=AD,w=0;return{frame(e,t,n,r){C=jD(C,n,r);let{opacity:i}=C;if(i!==w){let e=i>0;e!==w>0&&(c.dataset.visible=String(e),c.setAttribute(`aria-hidden`,String(!e))),c.style.opacity=i.toFixed(3),w=i}i<=0?a.render(e,t,y??S(),0):(_(t.steerRad),a.render(e,t,S(),i))},reset(){C=AD}}}var oO=[{action:`steerLeft`,control:`wheel`,anchor:`left`},{action:`steerRight`,control:`wheel`,anchor:`right`},{action:`brake`,control:`brake`,anchor:`center`},{action:`throttle`,control:`gas`,anchor:`center`},{action:`gearDrive`,control:`gearDrive`,anchor:`center`},{action:`gearReverse`,control:`gearReverse`,anchor:`center`},{action:`pause`,control:`pause`,anchor:`center`},{action:`restart`,control:`restart`,anchor:`center`},{action:`toggleCamera`,control:`camera`,anchor:`center`}];function sO(e,t){return e[t][0]??``}var cO=4;function lO(e,t){let n=e.y+cO;switch(t){case`left`:return{x:e.x,y:e.y,anchor:t};case`right`:return{x:e.x+e.width,y:e.y,anchor:t};case`center`:return{x:e.x+e.width/2,y:n,anchor:t}}}var uO=[`wheel`,`brake`,`gas`,`gearDrive`,`gearReverse`,`pause`,`restart`,`camera`],dO={marginPx:16,gapPx:12,wheelFraction:.42,wheelMinPx:96,wheelMaxPx:210,singleRowMinWheelPx:120,gasWidthFraction:.5,brakeWidthFraction:.62,pedalMaxHeightPx:170,smallWidthPx:60,smallHeightPx:48,centerGroupCount:3,stackedRowCount:5};function fO(e,t,n){return Math.min(Math.max(e,t),n)}function pO(e,t){let n=OD(e,t),r=Math.max(n.bird.y+n.bird.height,n.rear.y+n.rear.height,n.mirrorLeft.y+n.mirrorLeft.height,n.mirrorRight.y+n.mirrorRight.height)+dO.gapPx,i=t-dO.marginPx,a=Math.max(i-r,1),o=fO(Math.min(e,t)*dO.wheelFraction,dO.wheelMinPx,dO.wheelMaxPx),s=dO.smallHeightPx,c=1+dO.brakeWidthFraction+dO.gasWidthFraction,l=dO.centerGroupCount*dO.smallWidthPx+(dO.centerGroupCount-1)*dO.gapPx,u=2*dO.marginPx+l+dO.smallWidthPx+4*dO.gapPx,d=Math.floor(Math.min(o,a,(e-u)/c)),f=d<dO.singleRowMinWheelPx,p=Math.max(f?Math.floor(Math.min(o,a-s-dO.gapPx,(e-2*dO.marginPx-2*dO.gapPx)/c)):d,1),m=Math.round(p*dO.gasWidthFraction),h=Math.round(p*dO.brakeWidthFraction),g=Math.min(p,dO.pedalMaxHeightPx),_=i-g,v=e-dO.marginPx-m,y=v-dO.gapPx-h,b={x:dO.marginPx,y:i-p,width:p,height:p},x={x:y,y:_,width:h,height:g},S={x:v,y:_,width:m,height:g};if(f){let t=Math.min(dO.smallWidthPx,Math.floor((e-2*dO.marginPx-dO.stackedRowCount*dO.gapPx)/dO.stackedRowCount)),n=i-p-dO.gapPx-s,r=e-dO.marginPx-t,a=e=>dO.marginPx+e*(t+dO.gapPx);return{wheel:b,brake:x,gas:S,gearDrive:{x:r-dO.gapPx-t,y:n,width:t,height:s},gearReverse:{x:r,y:n,width:t,height:s},pause:{x:a(0),y:n,width:t,height:s},restart:{x:a(1),y:n,width:t,height:s},camera:{x:a(2),y:n,width:t,height:s}}}let C=dO.smallWidthPx,w=y-dO.gapPx-C,T=Math.floor((g-dO.gapPx)/2),E=b.x+b.width+dO.gapPx,D=w-dO.gapPx,O=Math.round(fO(e/2-l/2,E,D-l)),k=i-s,A=e=>O+e*(C+dO.gapPx);return{wheel:b,brake:x,gas:S,gearDrive:{x:w,y:_,width:C,height:T},gearReverse:{x:w,y:i-T,width:C,height:T},pause:{x:A(0),y:k,width:C,height:s},restart:{x:A(1),y:k,width:C,height:s},camera:{x:A(2),y:k,width:C,height:s}}}var mO={wheel:{id:`touch-wheel`,className:`touch-wheel`,label:`touch.wheel`},brake:{id:`touch-brake`,className:`touch-pedal touch-brake`,label:`touch.brake`},gas:{id:`touch-gas`,className:`touch-pedal touch-gas`,label:`touch.gas`},gearDrive:{id:`touch-gear-drive`,className:`touch-button touch-gear`,label:`touch.gearDrive`},gearReverse:{id:`touch-gear-reverse`,className:`touch-button touch-gear`,label:`touch.gearReverse`},pause:{id:`touch-pause`,className:`touch-button`,label:`touch.pause`},restart:{id:`touch-restart`,className:`touch-button`,label:`touch.restart`},camera:{id:`touch-camera`,className:`touch-button`,label:`touch.camera`}},hO=.5,gO=10,_O=[`wheel`,`brake`,`gas`],vO=5,yO={driveInput:e=>z(Te,e),consumeShift:()=>null,update:()=>void 0,listening:()=>!1,refreshKeys:()=>void 0};function bO(e,t,n,r){if(!ye(t))return e.dataset.touch=`off`,e.dataset.keys=`on`,yO;e.dataset.touch=`on`;let i=be(window.matchMedia(`(pointer: coarse)`).matches);e.dataset.keys=i?`on`:`off`;let a=VE(),o=document.createElement(`div`);o.id=`touch-controls`,o.className=`touch`,o.hidden=!0,e.prepend(o),o.addEventListener(`contextmenu`,e=>{e.preventDefault()});let s={};for(let e of uO){let t=mO[e],n=e===`wheel`?a.element(`div`,t.className,o):a.plainButton(t.id,t.className,o);n.id=t.id,s[e]=n}s.wheel.setAttribute(`role`,`slider`);let c=a.element(`div`,`touch-wheel-rim`,s.wheel);a.element(`span`,`touch-wheel-mark`,c),a.element(`span`,`touch-wheel-hub`,c),a.translatedElement(`span`,`touch-label`,s.brake,`touch.brake`),a.translatedElement(`span`,`touch-label`,s.gas,`touch.gas`),a.element(`span`,`touch-gear-letter`,s.gearDrive).textContent=`D`,a.translatedElement(`span`,`touch-gear-name`,s.gearDrive,`hud.gearForward`),a.element(`span`,`touch-gear-letter`,s.gearReverse).textContent=`R`,a.translatedElement(`span`,`touch-gear-name`,s.gearReverse,`hud.gearReverse`),a.translatedElement(`span`,`touch-label`,s.pause,`touch.pause`),a.translatedElement(`span`,`touch-label`,s.restart,`touch.restart`),a.translatedElement(`span`,`touch-label`,s.camera,`touch.camera`);let l=RE(r,()=>void 0,()=>{m()}),u=[];if(i)for(let e of oO){let t=a.plainButton(`touch-key-${e.action}`,`touch-key`,o);t.dataset.action=e.action,t.dataset.anchor=e.anchor,t.dataset.size=_O.includes(e.control)?`large`:`small`,t.addEventListener(`click`,()=>{l.listen(e.action,0)}),u.push({...e,button:t})}let d=a.element(`div`,`hud-panel touch-key-message`,o);d.id=`touch-key-message`,d.setAttribute(`role`,`status`),d.hidden=!0;let f,p=0;function m(){let e=r.current(),t=l.listening(),n=l.message();for(let{action:n,button:r}of u){let i=sO(e,n),a=t?.action===n,o=F(NE[n]);r.textContent=a?`…`:FE(i),r.dataset.listening=String(a),r.dataset.code=i,r.title=`${o}: ${F(`controls.rebind`)}`,r.setAttribute(`aria-label`,`${o}: ${FE(i)}`)}if(n!==f&&(f=n,p=0),t!==void 0){let e=LE(F(`touch.rebindPrompt`),{action:F(NE[t.action])});d.textContent=t.action===`pause`?e:`${e}${F(`touch.rebindCancel`)}`,d.dataset.kind=`listening`}else d.textContent=n?.text()??``,d.dataset.kind=n===void 0?`none`:n.warning?`warning`:`info`;d.hidden=t===void 0&&n===void 0}o.addEventListener(`pointerdown`,e=>{let t=e.target;l.listening()!==void 0&&!(t instanceof Element&&t.closest(`.touch-key`)!==null)&&(l.reset(),m())},{capture:!0});function h(){a.refreshTexts();for(let e of uO)s[e].setAttribute(`aria-label`,F(mO[e].label));m()}h(),fe(h);let g=0,_,v={dx:0,dy:0},y=1,b=0;function x(e){let t=s.wheel.getBoundingClientRect();return y=Math.max(t.width/2,1),{dx:e.clientX-(t.left+t.width/2),dy:e.clientY-(t.top+t.height/2)}}function S(e,t){try{e.setPointerCapture(t)}catch{}}s.wheel.addEventListener(`pointerdown`,e=>{e.preventDefault(),_===void 0&&(_=e.pointerId,v=x(e),S(s.wheel,e.pointerId),s.wheel.dataset.held=`true`)}),s.wheel.addEventListener(`pointermove`,e=>{if(e.pointerId!==_)return;e.preventDefault();let t=x(e);g=L(g,v,t,y),v=t});function C(e){e.pointerId===_&&(_=void 0,s.wheel.dataset.held=`false`)}s.wheel.addEventListener(`pointerup`,C),s.wheel.addEventListener(`pointercancel`,C),s.wheel.addEventListener(`lostpointercapture`,C);function w(){let e=Math.round(Pe(g)/hO);if(e===b)return;b=e;let t=e*hO;c.style.transform=`rotate(${t}deg)`,s.wheel.setAttribute(`aria-valuenow`,t.toFixed(0))}function T(e){let t=new Set;function n(){e.dataset.pressed=String(t.size>0)}e.addEventListener(`pointerdown`,r=>{r.preventDefault(),t.add(r.pointerId),S(e,r.pointerId),n()});let r=e=>{t.delete(e.pointerId),n()};return e.addEventListener(`pointerup`,r),e.addEventListener(`pointercancel`,r),e.addEventListener(`lostpointercapture`,r),n(),{pressed:()=>t.size>0,clear:()=>{t.clear(),n()}}}let E=T(s.brake),D=T(s.gas),O=null;function k(e,t){e.addEventListener(`pointerdown`,e=>{e.preventDefault(),t()})}k(s.gearDrive,()=>{O=`forward`}),k(s.gearReverse,()=>{O=`reverse`}),k(s.pause,n.pause),k(s.restart,n.restart),k(s.camera,n.camera);let A=!1,j=0,ee=0,M;function N(){let t=e.clientWidth,n=e.clientHeight;if(t===j&&n===ee)return;j=t,ee=n;let r=pO(t,n);for(let e of uO){let t=r[e],{style:n}=s[e];n.left=`${t.x}px`,n.top=`${t.y}px`,n.width=`${t.width}px`,n.height=`${t.height}px`}for(let{control:e,anchor:t,button:n}of u){let i=lO(r[e],t);n.style.left=`${i.x}px`,n.style.top=`${i.y}px`}e.style.setProperty(`--touch-clear-bottom`,`${n-r.pause.y+gO}px`)}function P(){_=void 0,g=0,s.wheel.dataset.held=`false`,E.clear(),D.clear(),O=null,l.reset(),m()}return{driveInput(e){return z(A?{wheelAngleRad:g,gas:D.pressed(),brake:E.pressed()}:Te,e)},consumeShift(){let e=O;return O=null,e},update(e,t){let n=e.driving;n!==A&&(A=n,o.hidden=!n,n||P()),n?(N(),_===void 0&&(g=we(g,t)),w(),e.gearbox.gear!==M&&(M=e.gearbox.gear,s.gearDrive.dataset.active=String(M===`forward`),s.gearReverse.dataset.active=String(M===`reverse`)),f!==void 0&&l.listening()===void 0&&(p+=t,p>vO&&l.change(r.current(),void 0))):w()},listening:()=>l.listening()!==void 0,refreshKeys:m}}function xO(e){let t=e=>{e.preventDefault()};for(let n of[`gesturestart`,`gesturechange`,`gestureend`])e.addEventListener(n,t);e.addEventListener(`touchmove`,e=>{let t=e.target;t instanceof Element&&t.closest(`.level-select, .controls-panel`)!==null||e.cancelable&&e.preventDefault()},{passive:!1})}var SO=1,CO={throttle:0,steer:0,handbrake:!1};function wO(){try{return window.localStorage}catch{return}}function TO(e){let t=Gn(window.location.search,e,ue());window.location.assign(`${window.location.pathname}${t}`)}function EO(e,t,n){let r=window.location.search,i=ST(e,t,n.layout.spot,n.layout.startState,n,hn(r,n.weather),!Wn(r));return document.documentElement.dataset.surfaces=Eg(e).join(` `),i}function DO({renderer:e,quality:t,pipeline:n},r){let{layout:o}=r,s=document.querySelector(`#hud`);if(s===null)throw Error(`找不到 #hud`);let u=EO(e,t,r),d=wO(),f=C(d),p=ve(window,()=>f),m=!1,h=!1,g=Dr(r.id),_={current:()=>f,apply:e=>{f=e,w(d,e),v.refreshBindings(),S.refreshKeys()},captureNextKey:p.captureNextKey,hold:()=>{(E.status===`ready`||E.status===`driving`)&&y(!0)}},v=_D(s,{restart:()=>{m=!0},levelSelect:()=>{TO(void 0)},nextLevel:g===void 0?void 0:()=>{TO(g)}},()=>{y(!1)},_);function y(e){h=e,v.setPaused(e)}let b=OT(l(window.location.search,d),o.startState);v.showCameraView(b.view());function x(){let e=a(b.view());b.setView(e),c(d,e),v.showCameraView(e)}let S=bO(s,Xn(window.location.search),{pause:()=>{(E.status===`ready`||E.status===`driving`)&&y(!0)},restart:()=>{m=!0},camera:x},_),T=Jn(window.location.search)?void 0:aO(e,t,s,u.scene,u.drawAssistViews),E=Ur(o),D=eD,O=E.vehicle,k=0,A,j=null;window.__parkingGame=Object.freeze({levelId:r.id,snapshot:()=>qr(E),spotGlow:()=>u.spotGlow()});function ee(e){let t=A===void 0?0:Math.max(Fe(e-A),0);A=e,v.controlsOpen()&&(p.consumeRestart(),p.consumeToggleCamera(),p.consumeShift(),S.consumeShift(),p.consumePause()&&v.closeControls());let a=p.consumeRestart()||m;a&&(m&&p.consumeShift(),S.consumeShift(),m=!1,E=Wr(E),O=E.vehicle,k=0,b.snapTo(E.vehicle),y(!1),T?.reset());let o=E.status===`ready`||E.status===`driving`;p.consumePause()&&o&&y(!h);let s=p.consumeShift(),c=S.consumeShift();D=rD(D,{restarted:a,shift:s??c,canShift:o&&!h}),p.consumeToggleCamera()&&x();let l=h||S.listening(),f=l?0:t,g=M(k,f);k=g.accumulatorSeconds;let _=l?CO:B(p.driveInput(),S.driveInput(D)),C=aD(_,D);for(let e=0;e<g.steps;e+=1)O=E.vehicle,E=Kr(E,C);D=iD(D,E.status,E.vehicle.speedMps,_.throttle);let{result:w}=E;w!==null&&w!==j&&(j=w,r.world!==0&&Tn(d,e=>Ni(e,r.id,{stars:w.stars,timeS:At(w.timeSteps)})));let N=mt(O,E.vehicle,g.alpha);u.update(N,f),u.setInteriorView(b.view()===`cockpit`),u.setHoodView(b.view()===`hood`);let P=_x(C,E.vehicle.speedMps);u.setLights(D.manual&&D.gear===`reverse`?{...P,reversing:!0}:P),b.update(N,E.vehicle.speedMps,t),u.fadeOccluders(b.camera.position,N,i(b.view()),t),u.updateSpotGlow(E.parked,t),n.render(u.scene,b.camera),v.update(E,D),S.update({driving:(E.status===`ready`||E.status===`driving`)&&!h&&!v.controlsOpen(),gearbox:D},t),T?.frame(u.scene,N,{reverseGear:D.gear===`reverse`,speedMps:E.vehicle.speedMps,running:E.status===`ready`||E.status===`driving`},t),requestAnimationFrame(ee)}requestAnimationFrame(ee)}function OO({renderer:e,quality:t,pipeline:n},r,i,a){let{spot:o,startState:s}=r.layout,c=r.id===pr.id?Math.min(Math.round(a*60),Zn):0,l=ki(r,a)??tr(s,c),u=EO(e,t,r);u.update(l);let d=r_(i,l.x,l.z,o),f=()=>{n.render(u.scene,d)};f(),window.addEventListener(`resize`,f),n.ready.then(()=>{f(),document.body.dataset.shotReady=`true`})}function kO({renderer:e,quality:t,pipeline:n}){let r=wr(SO)[0]??pr,{spot:i,startState:a}=r.layout,o=EO(e,t,r);o.update(a);let s=r_(`spot_low`,a.x,a.z,i),c=()=>{n.render(o.scene,s)};c(),window.addEventListener(`resize`,c),n.ready.then(c),xD(document.body,vD(Er(SO),Cn(wO()),Un(window.location.search)),TO)}var AO=document.querySelector(`#game-canvas`);if(AO===null)throw Error(`找不到 #game-canvas`);xO(document);function jO(){document.documentElement.lang=ue()}de(le(window.location.search,navigator.language,Cn(wO()).settings.locale)),jO(),fe(()=>{jO(),Tn(wO(),e=>Dn(e,ue()))});var MO=bw(window.location.search,CE());document.documentElement.dataset.quality=MO.settings.level,document.documentElement.dataset.qualitySource=MO.source;var NO=wE(AO,MO.settings);function PO(e){let t=Or(Hn(window.location.search));t.kind===`unknown`?TE(`level-notice`,F(`level.unknown`),Sr):(document.documentElement.dataset.level=t.level.id,e(t.level))}var FO=Vn(window.location.search);switch(FO.kind){case`show`:ME(NO,FO.id);break;case`cam`:PO(e=>{OO(NO,e,FO.preset,FO.timeSeconds)});break;case`bench`:PO(e=>{wT(NO,e)});break;case`game`:Hn(window.location.search)===void 0?kO(NO):PO(e=>{DO(NO,e)})}