'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const O=require('../js/ode.js');
for(const [method,expected] of [['euler',1.1],['heun',1.105],['rk4',1.1051708333333332]]) {
  test('Один крок '+method,()=>assert.ok(Math.abs(O.registry.get(method).step((x,y)=>y,0,1,.1).y-expected)<1e-14));
}
for(const n of [5,10,20]) for(const method of ['euler','heun','rk4']) {
  test(`Варіант: ${method}, n=${n}`,()=>{
    const r=new O.CauchySolver(O.registry.get(method)).solve(O.VARIANT,n);
    assert.equal(r.xs.length,n+1);assert.equal(r.xs.at(-1),2);assert.equal(r.ys[0],3);
    assert.ok(r.ys.every(Number.isFinite));assert.ok(r.maxError>0);
  });
}
test('Аналітичний еталон',()=>{
  assert.equal(O.VARIANT.exact(0),3);
  for(const x of [0,.4,1,2])assert.equal(O.VARIANT.f(x,O.VARIANT.exact(x)),-6*Math.exp(-2*x));
});
for(const [method,p] of [['euler',1],['heun',2],['rk4',4]]) {
  test('Порядок '+method,()=>{
    const s=new O.CauchySolver(O.registry.get(method));const ratio=s.solve(O.VARIANT,40).maxError/s.solve(O.VARIANT,80).maxError;
    assert.ok(Math.abs(Math.log2(ratio)-p)<.18,`ratio=${ratio}`);
  });
}
for(const [n,end,q] of [[5,-243,-3],[10,1,-1],[20,0,0]]) {
  test('Стійкість n='+n,()=>{
    const r=new O.CauchySolver(O.registry.get('euler')).solve(O.STABILITY,n);
    assert.ok(Math.abs(r.ys.at(-1)-end)<1e-10);assert.equal(1-20*r.h,q);
    assert.ok(r.ys.every((v,i)=>Math.abs(v-q**i)<1e-10));
  });
}
test('Стратегія без зміни солвера',()=>{
  class Midpoint extends O.OdeMethod {constructor(){super('mid','Середня точка',2,'#333');}step(f,x,y,h){return {y:y+h*f(x+h/2,y+h*f(x,y)/2),stages:[]};}}
  const reg=new O.MethodRegistry();reg.register(new Midpoint());
  assert.equal(reg.list().length,1);assert.ok(new O.CauchySolver(reg.get('mid')).solve(O.VARIANT,20).maxError<.02);
  assert.throws(()=>reg.register(new Midpoint()));assert.throws(()=>reg.get('missing'));
});
test('РК4 стадії мають правильні середні точки',()=>{
  const r=O.registry.get('rk4').step((x,y)=>y,0,1,.2);
  assert.deepEqual(r.stages.map(v=>v.x),[0,.1,.1,.2]);assert.deepEqual(r.stages.map(v=>v.k),[1,1.1,1.11,1.222]);
});
test('РК4 на кубічному розв’язку',()=>{
  const r=new O.CauchySolver(O.registry.get('rk4')).solve({f:x=>3*x*x,x0:0,y0:0,xEnd:1,exact:x=>x**3},5);
  assert.ok(r.maxError<1e-14);
});
test('Рух назад по інтервалу',()=>{
  const r=new O.CauchySolver(O.registry.get('rk4')).solve({f:()=>1,x0:2,y0:2,xEnd:0,exact:x=>x},10);
  assert.ok(r.maxError<1e-14);assert.equal(r.xs.at(-1),0);
});
test('Некоректні n та інтервал',()=>{
  const s=new O.CauchySolver(O.registry.get('euler'));
  for(const n of [0,-1,1.2,NaN,10001])assert.throws(()=>s.solve(O.VARIANT,n));
  assert.throws(()=>s.solve({...O.VARIANT,xEnd:0},5));
});
test('Переповнення та розмірність',()=>{
  const s=new O.CauchySolver(O.registry.get('rk4'));
  assert.throws(()=>s.solve({...O.VARIANT,f:()=>Infinity},5));
  assert.throws(()=>s.solve({f:()=>[1],x0:0,y0:[1,2],xEnd:1},5));
});
test('Власна задача та відсутній еталон',()=>{
  const p=O.compileProblem({expression:'x+y',x0:0,y0:1,xEnd:1,exactExpression:''});
  const r=new O.CauchySolver(O.registry.get('rk4')).solve(p,10);assert.equal(r.maxError,null);
  assert.throws(()=>O.compileProblem({expression:'y',x0:0,y0:2,xEnd:1,exactExpression:'exp(x)'}));
});
test('Векторний РК4, рівновага та копії',()=>{
  const y=[20,10];const p={...O.LOTKA,y0:y};const r=new O.CauchySolver(O.registry.get('rk4')).solve(p,100);
  assert.deepEqual(y,[20,10]);assert.deepEqual(r.ys.at(-1),[20,10]);assert.notStrictEqual(r.ys[0],y);
});
test('Лотка–Вольтерра: додатність та інваріант',()=>{
  const s=new O.CauchySolver(O.registry.get('rk4'));const r=s.solve(O.LOTKA,600);
  assert.ok(r.ys.every(y=>y.every(v=>v>0)));
  const drift=Math.max(...r.ys.map(y=>Math.abs(O.invariant(y)-O.invariant(O.LOTKA.y0))));assert.ok(drift<1e-5,`drift=${drift}`);
});
test('CSV: BOM, рядки та назви методів',()=>{
  const study=O.runAll(O.VARIANT,5);const csv=O.toCSV(study,O.VARIANT);
  assert.equal(csv.charCodeAt(0),0xfeff);assert.equal(csv.trim().split('\n').length,7);assert.ok(csv.includes('РК4'));
});
test('Нульова похибка не утворює хибний порядок',()=>{
  assert.equal(O.orderRatio(0,0).ratio,null);assert.equal(O.orderRatio(1,0).p,null);
});
