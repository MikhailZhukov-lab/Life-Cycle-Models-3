'use strict';
const fs=require('node:fs'),path=require('node:path'),O=require('../js/ode.js');
const out=path.join(__dirname,'../results');fs.mkdirSync(out,{recursive:true});
const metrics=[],runs={},orders=[],stability=[],lotka=[];
for(const n of [5,10,20,40,80]){
 runs[n]={};
 for(const method of O.registry.list()){
  const solver=new O.CauchySolver(method);const solve=()=>solver.solve(O.VARIANT,n,{record:false});
  for(let i=0;i<30;i++)solve();const times=[];let result;
  for(let i=0;i<9;i++){const start=performance.now();for(let j=0;j<200;j++)result=solve();times.push((performance.now()-start)/200);}
  times.sort((a,b)=>a-b);runs[n][method.id]=result;
  metrics.push({n,h:result.h,method:method.id,maxError:result.maxError,endError:result.endError,timeMs:times[4]});
 }
}
for(const [coarse,fine]of [[5,10],[10,20],[20,40],[40,80]])for(const m of O.registry.list()){
 const a=runs[coarse][m.id],b=runs[fine][m.id];orders.push({method:m.id,coarse,fine,max:O.orderRatio(a.maxError,b.maxError),end:O.orderRatio(a.endError,b.endError)});
}
for(const n of [5,10,20]){const r=new O.CauchySolver(O.registry.get('euler')).solve(O.STABILITY,n);stability.push({n,h:r.h,q:1-20*r.h,end:r.ys.at(-1),maxError:r.maxError,...r});}
for(const n of [150,300,600,1200]){const r=new O.CauchySolver(O.registry.get('rk4')).solve(O.LOTKA,n,{record:false});const initial=O.invariant(O.LOTKA.y0),drift=Math.max(...r.ys.map(y=>Math.abs(O.invariant(y)-initial)));lotka.push({n,h:r.h,drift,relativeDrift:drift/Math.abs(initial),xs:r.xs,ys:r.ys});}
// Навмисна мутація для негативного тесту: h замість h/2 лише у y2, y3.
class MutantRK4 extends O.OdeMethod{
 constructor(){super('mutant','РК4 з помилкою',1,'#b33');}
 step(f,x,y,h){const k1=f(x,y),k2=f(x+h/2,y+h*k1),k3=f(x+h/2,y+h*k2),k4=f(x+h,y+h*k3);return {y:y+h*(k1+2*k2+2*k3+k4)/6,stages:[]};}
}
const critical=[5,10,20,40,80].map(n=>{const bad=new O.CauchySolver(new MutantRK4()).solve(O.VARIANT,n,{record:false});return {n,correct:runs[n].rk4.maxError,mutant:bad.maxError};});
for(let i=1;i<critical.length;i++){critical[i].correctRatio=critical[i-1].correct/critical[i].correct;critical[i].mutantRatio=critical[i-1].mutant/critical[i].mutant;}
for(const [name,data]of Object.entries({metrics,runs,orders,stability,lotka,critical,environment:{node:process.version,platform:process.platform,warmup:30,batches:9,batchSize:200}}))fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(data,null,2));
for(const n of [5,10,20])fs.writeFileSync(path.join(out,`variant_n${n}.csv`),O.toCSV(Object.values(runs[n]),O.VARIANT));
console.table(metrics.filter(r=>r.n<=20));console.table(orders.filter(r=>r.fine<=20).map(r=>({method:r.method,from:r.coarse,to:r.fine,ratio:r.max.ratio,p:r.max.p})));
console.table(critical);console.log('Lotka drift:',lotka.map(r=>({n:r.n,drift:r.drift})));
