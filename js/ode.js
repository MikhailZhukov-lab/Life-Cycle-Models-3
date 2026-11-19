/* Стратегії працюють зі скаляром або вектором. Жодних бібліотечних солверів. */
(function(root,factory){const expr=typeof module==='object'&&module.exports?require('./expr.js'):root.OdeExpr;const api=factory(expr);if(typeof module==='object'&&module.exports)module.exports=api;else root.Ode=api;})(globalThis,function(Expr){
  'use strict';
  const clone=y=>Array.isArray(y)?[...y]:y;
  const finite=y=>Array.isArray(y)?y.length>0&&y.length<=20&&y.every(v=>typeof v==='number'&&Number.isFinite(v)):typeof y==='number'&&Number.isFinite(y);
  const combine=(y,h,terms)=>Array.isArray(y)?y.map((v,i)=>v+h*terms.reduce((s,[a,k])=>s+a*k[i],0)):y+h*terms.reduce((s,[a,k])=>s+a*k,0);
  class OdeMethod {
    constructor(id,name,order,color){Object.assign(this,{id,name,order,color});}
    step(){throw new Error('Стратегія повинна реалізувати step().');}
  }
  class EulerMethod extends OdeMethod {
    constructor(){super('euler','Ейлер',1,'#b5573b');}
    step(f,x,y,h){const k=f(x,y);return {y:combine(y,h,[[1,k]]),stages:[{x,y:clone(y),k:clone(k)}]};}
  }
  class HeunMethod extends OdeMethod {
    constructor(){super('heun','Хойн',2,'#b88728');}
    step(f,x,y,h){const k1=f(x,y),pred=combine(y,h,[[1,k1]]),k2=f(x+h,pred);return {y:combine(y,h,[[.5,k1],[.5,k2]]),stages:[{x,y:clone(y),k:clone(k1)},{x:x+h,y:pred,k:clone(k2)}]};}
  }
  class RK4Method extends OdeMethod {
    constructor(){super('rk4','РК4',4,'#20765e');}
    step(f,x,y,h){
      const k1=f(x,y);
      const y2=combine(y,h/2,[[1,k1]]),k2=f(x+h/2,y2);
      const y3=combine(y,h/2,[[1,k2]]),k3=f(x+h/2,y3);
      const y4=combine(y,h,[[1,k3]]),k4=f(x+h,y4);
      return {y:combine(y,h/6,[[1,k1],[2,k2],[2,k3],[1,k4]]),stages:[{x,y:clone(y),k:clone(k1)},{x:x+h/2,y:y2,k:clone(k2)},{x:x+h/2,y:y3,k:clone(k3)},{x:x+h,y:y4,k:clone(k4)}]};
    }
  }
  class MethodRegistry {
    constructor(){this.methods=new Map();}
    register(method){if(!method||typeof method.step!=='function'||!method.id||this.methods.has(method.id))throw new Error('Некоректна або повторна стратегія.');this.methods.set(method.id,method);return this;}
    get(id){if(!this.methods.has(id))throw new Error('Невідомий метод.');return this.methods.get(id);}
    list(){return [...this.methods.values()];}
  }
  const registry=new MethodRegistry();[new EulerMethod(),new HeunMethod(),new RK4Method()].forEach(m=>registry.register(m));
  class CauchySolver {
    constructor(strategy){this.setStrategy(strategy);}
    setStrategy(strategy){if(!strategy||typeof strategy.step!=='function')throw new Error('Потрібна стратегія step().');this.strategy=strategy;return this;}
    solve(problem,n,{record=true}={}){
      const {f,x0,y0,xEnd,exact}=problem;
      if(typeof f!=='function'||![x0,xEnd].every(Number.isFinite)||xEnd===x0||!finite(y0)||!Number.isSafeInteger(n)||n<1||n>10000)throw new Error('Перевірте умови: скінченні числа, xEnd ≠ x0, ціле n від 1 до 10000.');
      const h=(xEnd-x0)/n;if(!Number.isFinite(h)||h===0)throw new Error('Крок не можна подати скінченним ненульовим числом.');
      const vector=Array.isArray(y0),dim=vector?y0.length:1;
      const checked=(x,y)=>{const k=f(x,clone(y));if(!finite(k)||Array.isArray(k)!==vector||(vector&&k.length!==dim))throw new Error('Права частина має некоректне значення або розмірність.');return k;};
      let y=clone(y0);const xs=[x0],ys=[clone(y)],stages=[];
      for(let i=0;i<n;i++){
        const x=x0+i*h,nextX=i===n-1?xEnd:x0+(i+1)*h;
        if(nextX===x)throw new Error('Крок менший за точність координат.');
        const step=this.strategy.step(checked,x,y,h);
        if(!finite(step.y)||Array.isArray(step.y)!==vector||(vector&&step.y.length!==dim))throw new Error(`Переповнення або некоректний результат на кроці ${i+1}.`);
        y=clone(step.y);xs.push(nextX);ys.push(clone(y));if(record)stages.push(step.stages||[]);
      }
      const errors=exact&&!vector?xs.map((x,i)=>{const value=exact(x);if(!Number.isFinite(value))throw new Error('Точний розв’язок не скінченний.');return Math.abs(value-ys[i]);}):null;
      return {method:this.strategy.id,n,h,xs,ys,stages,errors,maxError:errors?Math.max(...errors):null,endError:errors?errors.at(-1):null};
    }
  }
  const VARIANT={name:'Варіант 2',expression:'-2*y',exactExpression:'3*exp(-2*x)',f:(x,y)=>-2*y,exact:x=>3*Math.exp(-2*x),x0:0,y0:3,xEnd:2};
  const STABILITY={name:'Тест стійкості',expression:'-20*y',exactExpression:'exp(-20*x)',f:(x,y)=>-20*y,exact:x=>Math.exp(-20*x),x0:0,y0:1,xEnd:1};
  const LOTKA={name:'Лотка–Вольтерра',x0:0,xEnd:30,y0:[10,5],f:(t,[u,v])=>[u-.1*u*v,.075*u*v-1.5*v]};
  const invariant=([u,v])=>.075*u-1.5*Math.log(u)+.1*v-Math.log(v);
  function compileProblem(spec){
    const {expression,x0,y0,xEnd,exactExpression}=spec;
    if(![x0,y0,xEnd].every(v=>typeof v==='number'&&Number.isFinite(v))||x0===xEnd)throw new Error('Початкові умови та інтервал мають бути скінченними, інтервал ненульовим.');
    const f=Expr.compile(expression),exact=exactExpression?.trim()?Expr.compile(exactExpression,['x']):null;
    f(x0,y0);
    if(exact&&Math.abs(exact(x0)-y0)>1e-9*Math.max(1,Math.abs(y0)))throw new Error('Точний розв’язок не задовольняє початкову умову.');
    return {name:'Власна задача',expression,exactExpression,f,exact,x0,y0,xEnd};
  }
  function runAll(problem,n,{record=true}={}){return registry.list().map(method=>{const s=new CauchySolver(method),start=performance.now(),r=s.solve(problem,n,{record});r.timeMs=performance.now()-start;return r;});}
  function orderRatio(coarse,fine){if(!(coarse>0&&fine>0))return {ratio:null,p:null};const ratio=coarse/fine;return {ratio,p:Math.log2(ratio)};}
  function toCSV(results,problem){
    const fields=['i','x',...(problem.exact?['Точний']:[]),...results.flatMap(r=>[registry.get(r.method).name,...(r.errors?['Похибка '+registry.get(r.method).name]:[])])];
    const rows=[fields];for(let i=0;i<results[0].xs.length;i++){const x=results[0].xs[i];rows.push([i,x,...(problem.exact?[problem.exact(x)]:[]),...results.flatMap(r=>[r.ys[i],...(r.errors?[r.errors[i]]:[])])]);}
    const quote=v=>'"'+String(v).replace(/"/g,'""')+'"';return '\uFEFF'+rows.map(row=>row.map(quote).join(';')).join('\r\n');
  }
  return {OdeMethod,EulerMethod,HeunMethod,RK4Method,MethodRegistry,registry,CauchySolver,VARIANT,STABILITY,LOTKA,invariant,compileProblem,runAll,orderRatio,toCSV};
});
