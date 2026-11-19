'use strict';const test=require('node:test'),assert=require('node:assert/strict'),O=require('../js/ode.js');
test('Тест порядку відрізняє мутацію h замість h/2',()=>{
 const bad={step(f,x,y,h){const k1=f(x,y),k2=f(x+h/2,y+h*k1),k3=f(x+h/2,y+h*k2),k4=f(x+h,y+h*k3);return {y:y+h*(k1+2*k2+2*k3+k4)/6,stages:[]};}};
 const s=new O.CauchySolver(bad),ratio=s.solve(O.VARIANT,40).maxError/s.solve(O.VARIANT,80).maxError;
 assert.throws(()=>assert.ok(ratio>14&&ratio<18));assert.ok(ratio>1.8&&ratio<2.2);
});
