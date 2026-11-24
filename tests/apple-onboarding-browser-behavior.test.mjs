/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.PUBLIC.DEVICE_BRIDGE.APPLE_ONBOARDING.BEHAVIOR_TEST
TAG: LEEWAY.BRIDGE.APPLE_SAME_PAGE_ONBOARDING_EXECUTION_V1
5WH:
WHAT = Execute original Apple browser onboarding controls with synthetic DOM on iPhone/iPad/Mac.
WHY = A source link assertion alone cannot prove that a button stays on LeeWay rather than opening GitHub.
WHO = Creator-authorized outside contributor (NOT Agent Lee/Veritas) and original Bridge source tests.
WHERE = tests/apple-onboarding-browser-behavior.test.mjs.
WHEN = 2026-11-24.
HOW = VM isolates browser hints and captures local status output; no real Apple device/session/installation.
LICENSE = Preserve original repo terms.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../docs/onboarding.js',import.meta.url),'utf8');
class NodeStub{
 constructor(){this.value='';this.textContent='';this.hidden=true;this.nodes=[];this.callbacks=new Map();}
 addEventListener(name,cb){this.callbacks.set(name,cb);}
 trigger(name){const cb=this.callbacks.get(name);assert.equal(typeof cb,'function');cb({preventDefault(){}});}
 replaceChildren(){this.nodes=[];}
 append(node){this.nodes.push(node);}
 scrollIntoView(){}
}
function appleBrowser({ua,width=390,height=844,touch=0,standalone=false}){
 const names=['dbSetupForm','dbSetupAccount','dbSetupDevice','dbSetupResult','dbDetectedDevice',
  'dbAppleSetup','dbAppleSetupInstructions','dbAppleHomeInstall','dbAppleBridgeStatus'];
 const nodes=Object.fromEntries(names.map(x=>[x,new NodeStub()]));
 const radio={checked:false};
 const form=nodes.dbSetupForm;
 form.querySelector=()=>radio;
 form.querySelectorAll=()=>[];
 const doc={getElementById:id=>nodes[id]??null,createElement:()=>new NodeStub()};
 const root={
  document:doc,navigator:{userAgent:ua,maxTouchPoints:touch,standalone},
  screen:{width,height},matchMedia:()=>({matches:standalone})
 };
 vm.runInNewContext(source,{globalThis:root}, {timeout:2000});
 const instructions=()=>nodes.dbAppleSetupInstructions.nodes.map(n=>n.textContent).join(' ');
 return {nodes,instructions};
}
test('Safari iPhone opens same-page Home Screen steps, not GitHub or unsigned IPA',()=>{
 const view=appleBrowser({ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'});
 assert.equal(view.nodes.dbSetupDevice.value,'apple-phone');
 assert.equal(view.nodes.dbAppleSetup.hidden,false);
 view.nodes.dbAppleHomeInstall.trigger('click');
 assert.match(view.instructions(),/Safari Share/);
 assert.match(view.instructions(),/Add to Home Screen/);
 assert.doesNotMatch(view.instructions(),/github\.com|unsigned\.ipa|codespaces/i);
 view.nodes.dbAppleBridgeStatus.trigger('click');
 assert.match(view.instructions(),/signed Apple installer|signed release/i);
 assert.doesNotMatch(view.instructions(),/github\.com\/releases/i);
});
test('iPad opens Apple route, changing to Android hides it',()=>{
 const view=appleBrowser({ua:'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1',width:834,height:1194});
 assert.equal(view.nodes.dbSetupDevice.value,'apple-tablet');
 assert.equal(view.nodes.dbAppleSetup.hidden,false);
 view.nodes.dbSetupDevice.value='android-phone';
 view.nodes.dbSetupDevice.trigger('change');
 assert.equal(view.nodes.dbAppleSetup.hidden,true);
});
test('macOS Apple web-app instructions are local, signed native remains separate',()=>{
 const view=appleBrowser({ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',width:1280,height:800});
 assert.equal(view.nodes.dbSetupDevice.value,'apple-desktop');
 view.nodes.dbAppleHomeInstall.trigger('click');
 assert.match(view.instructions(),/Add to Dock/);
 assert.doesNotMatch(view.instructions(),/github\.com|unsigned IPA release/i);
});
test('installed Safari web app is explicitly browser-only, not native Device Bridge',()=>{
 const view=appleBrowser({ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Mobile Safari/604.1',standalone:true});
 view.nodes.dbAppleHomeInstall.trigger('click');
 assert.match(view.instructions(),/web app is already open/);
 assert.match(view.instructions(),/does not mean the native Apple companion/);
});
