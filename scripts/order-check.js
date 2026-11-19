// Відношення для РК4 перевіряється на уточненій сітці, а не лише при великому h.
'use strict';
const O=require('../js/ode.js'),assert=require('node:assert/strict');
const s=new O.CauchySolver(O.registry.get('rk4'));
const a=s.solve(O.VARIANT,40,{record:false}),b=s.solve(O.VARIANT,80,{record:false});
const ratio=a.maxError/b.maxError;
console.log(JSON.stringify({method:'rk4',n:[40,80],ratio,p:Math.log2(ratio),expected:16},null,2));
assert.ok(ratio>14&&ratio<18,'Порядок РК4 не відповідає очікуваному');
console.log('RK4 order check: PASS');
