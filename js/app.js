'use strict';
(()=>{
 const O=window.Ode,{Chart}=window.OdeCharts,$=id=>document.getElementById(id);
 const fmt=v=>v===null||v===undefined||!Number.isFinite(v)?'—':v===0?'0':Math.abs(v)<.0001||Math.abs(v)>=1e5?v.toExponential(4):Number(v.toPrecision(7)).toString();
 class Application{
  constructor(){
   this.state={custom:null,n:5,method:'rk4',frame:0,playing:false};
   this.charts=Object.fromEntries(['solution','errors','animated','phase','populations'].map(id=>[id,new Chart($(id))]));
   this.gallery=[];this.stabilityCharts=[];this.refreshMethods();
   $('controls').addEventListener('submit',e=>{e.preventDefault();this.recalculate();});
   for(const id of ['scenario','size'])$(id).addEventListener('change',()=>{this.state.custom=null;this.recalculate();});
   $('method').addEventListener('change',()=>{this.state.method=$('method').value;this.pause();this.seek(0);});
   $('reset').addEventListener('click',()=>{this.state.custom=null;$('scenario').value='variant';this.recalculate();});
   $('apply').addEventListener('click',()=>this.apply());$('log').addEventListener('change',()=>this.drawMain());
   $('play').addEventListener('click',()=>{if(this.state.frame>=this.state.n)this.seek(0);this.state.playing=!this.state.playing;this.playerLabel();});
   $('step').addEventListener('click',()=>{this.pause();this.seek(this.state.frame+1);});$('start').addEventListener('click',()=>{this.pause();this.seek(0);});
   $('progress').addEventListener('input',()=>{this.pause();this.seek(Number($('progress').value));});
   $('export').addEventListener('click',()=>this.download('ode_results.csv',O.toCSV(this.results,this.problem)));
   $('lotka-n').addEventListener('change',()=>this.runLotka());
   $('lotka-export').addEventListener('click',()=>this.download('lotka_volterra.csv','\uFEFFt;Жертви;Хижаки\r\n'+this.lotka.xs.map((t,i)=>[t,...this.lotka.ys[i]].join(';')).join('\r\n')));
   window.addEventListener('resize',()=>this.redraw());
   this.recalculate();this.buildGallery();this.buildStability();this.runLotka();
   let last=0;const tick=now=>{if(this.state.playing&&now-last>=Number($('speed').value)){last=now;this.seek(this.state.frame+1);if(this.state.frame>=this.state.n)this.pause();}requestAnimationFrame(tick);};requestAnimationFrame(tick);
  }
  refreshMethods(){const selected=this.state.method;$('method').replaceChildren();for(const m of O.registry.list()){const o=document.createElement('option');o.value=m.id;o.textContent=m.name;$('method').append(o);}$('method').value=selected;}
  message(text,error=false){$('status').textContent=text;$('status').className=error?'error':'';}
  apply(){try{
   const values=['x0','y0','end','custom-n'].map(id=>{if(!$(id).value.trim())throw new Error('Заповніть усі числові поля.');return Number($(id).value);});
   const problem=O.compileProblem({expression:$('expression').value,exactExpression:$('exact').value,x0:values[0],y0:values[1],xEnd:values[2]});
   this.recalculate({problem,n:values[3]});
  }catch(e){this.message(e.message,true);}}
  recalculate(custom=null){try{
   const spec=custom||this.state.custom;const problem=spec?spec.problem:$('scenario').value==='stability'?O.STABILITY:O.VARIANT;
   const n=spec?spec.n:Number($('size').value);const results=O.runAll(problem,n);
   // Перевірити і дискретизацію точної кривої до зміни поточного стану.
   this.exactSeries(problem,problem.xEnd);
   this.pause();this.problem=problem;this.results=results;this.state.n=n;this.state.custom=spec;
   this.message(`${problem.name} · n = ${n}, h = ${fmt(results[0].h)} · ${problem.exact?'еталон задано':'точний розв’язок не задано'}`);
   $('size-label').textContent=`n = ${n}`;$('progress').max=n;
   for(const [id,v]of Object.entries({expression:problem.expression,exact:problem.exactExpression||'',x0:problem.x0,y0:problem.y0,end:problem.xEnd,'custom-n':n}))$(id).value=v;
   this.renderTables();this.drawMain();this.seek(0);
  }catch(e){this.message(e.message,true);}}
  exactSeries(problem,end){
   if(!problem.exact)return [];
   const points=Array.from({length:241},(_,i)=>{const x=problem.x0+(end-problem.x0)*i/240,y=problem.exact(x);if(!Number.isFinite(y))throw new Error('Точна крива має нескінченне значення.');return [x,y];});
   return [{name:'Точний',color:'#26312b',points,width:2.1}];
  }
  solutionSeries(results,problem){return [...this.exactSeries(problem,problem.xEnd),...results.map(r=>{const m=O.registry.get(r.method);return{name:m.name,color:m.color,points:r.xs.map((x,i)=>[x,r.ys[i]]),markers:r.n<=80?2.6:0,dash:r.method==='rk4'?[5,3]:[]};})];}
  errorSeries(results){return results.filter(r=>r.errors).map(r=>{const m=O.registry.get(r.method);return{name:m.name,color:m.color,points:r.xs.map((x,i)=>[x,r.errors[i]]),markers:r.n<=80?2.3:0};});}
  drawMain(){this.charts.solution.draw(this.solutionSeries(this.results,this.problem));this.charts.errors.draw(this.errorSeries(this.results),{log:$('log').checked,yLabel:'|Δy|'});}
  row(target,values,header=false){const row=document.createElement('tr');for(const value of values){const c=document.createElement(header?'th':'td');c.textContent=value;row.append(c);}target.append(row);}
  renderTables(){
   $('metrics').replaceChildren();for(const r of this.results)this.row($('metrics'),[O.registry.get(r.method).name,r.n,fmt(r.h),fmt(r.maxError),fmt(r.endError),r.timeMs.toFixed(4)]);
   $('nodes-head').replaceChildren();$('nodes').replaceChildren();this.row($('nodes-head'),['i','x','Точний',...this.results.map(r=>O.registry.get(r.method).name)],true);
   const indices=Array.from({length:Math.min(this.state.n+1,201)},(_,i)=>i);if(this.state.n>200)indices.push(this.state.n);
   for(const i of indices){const x=this.results[0].xs[i];this.row($('nodes'),[i,fmt(x),this.problem.exact?fmt(this.problem.exact(x)):'—',...this.results.map(r=>fmt(r.ys[i]))]);}
   $('nodes-note').textContent=this.state.n>200?'Показано перші 201 вузол і кінцевий. CSV містить усі вузли.':'Показано всі вузли сітки.';
  }
  pause(){this.state.playing=false;this.playerLabel();}
  playerLabel(){$('play').textContent=this.state.playing?'Пауза':'Відтворити';}
  seek(frame){this.state.frame=Math.max(0,Math.min(frame,this.state.n));$('progress').value=this.state.frame;this.drawAnimation();}
  drawAnimation(){
   const r=this.results.find(r=>r.method===this.state.method),m=O.registry.get(this.state.method),k=this.state.frame;
   if(!r)return;$('animation-title').textContent=`Побудова: ${m.name}`;$('frame').textContent=`${k} / ${r.n}`;
   $('step-label').textContent=`x = ${fmt(r.xs[k])}; y = ${fmt(r.ys[k])}`+(r.errors?`; |Δ| = ${fmt(r.errors[k])}`:'');
   const series=[...this.exactSeries(this.problem,r.xs[k]),{name:m.name,color:m.color,points:r.xs.slice(0,k+1).map((x,i)=>[x,r.ys[i]]),markers:3}];
   $('stages').replaceChildren();
   if(k>0){const colors=['#734da4','#8e6bba','#a45d89','#376fa5'];for(const [i,s]of r.stages[k-1].entries()){
    this.row($('stages'),[`k${i+1}`,fmt(s.x),fmt(s.y),fmt(s.k)]);
    const length=r.h*.1;series.push({name:`k${i+1}`,legend:false,color:colors[i%4],points:[[s.x-length,s.y-length*s.k],[s.x+length,s.y+length*s.k]],width:2});
    series.push({name:'stage',legend:false,color:colors[i%4],points:[[s.x,s.y]],markers:4});
   }}else this.row($('stages'),['Початкова умова',fmt(this.problem.x0),fmt(this.problem.y0),'—']);
   this.charts.animated.draw(series);
  }
  buildGallery(){
   this.galleryRuns={};for(const n of [5,10,20]){const results=O.runAll(O.VARIANT,n);this.galleryRuns[n]=results;
    for(const type of ['solution','errors']){const card=document.createElement('article');card.className='panel';const head=document.createElement('div');head.className='panel-heading';head.innerHTML=`<h2>${type==='solution'?'Розв’язок':'Похибка'} · n = ${n}</h2>`;const canvas=document.createElement('canvas');canvas.id=`${type}-${n}`;card.append(head,canvas);$('gallery').append(card);this.gallery.push({type,results,chart:new Chart(canvas)});}
   }
   for(const [a,b]of [[5,10],[10,20]])for(const m of O.registry.list()){const coarse=this.galleryRuns[a].find(r=>r.method===m.id),fine=this.galleryRuns[b].find(r=>r.method===m.id),ratio=O.orderRatio(coarse.maxError,fine.maxError);this.row($('orders'),[m.name,`${a} → ${b}`,fmt(ratio.ratio),fmt(ratio.p),2**m.order]);}
   this.drawGallery();
  }
  drawGallery(){for(const g of this.gallery)g.chart.draw(g.type==='solution'?this.solutionSeries(g.results,O.VARIANT):this.errorSeries(g.results),g.type==='errors'?{yLabel:'|Δy|'}:{});}
  buildStability(){for(const n of [5,10,20]){const r=new O.CauchySolver(O.registry.get('euler')).solve(O.STABILITY,n),q=1-20*r.h;this.row($('stability-table'),[n,fmt(r.h),fmt(q),fmt(r.ys.at(-1)),n===5?'Зростання амплітуди':n===10?'Незатухаючі коливання':'Стійке затухання']);const card=document.createElement('article'),title=document.createElement('h3'),canvas=document.createElement('canvas');title.textContent=`n = ${n} · q = ${q}`;canvas.id=`stability-${n}`;card.append(title,canvas);$('stability-charts').append(card);this.stabilityCharts.push({r,chart:new Chart(canvas)});}this.drawStability();}
  drawStability(){for(const g of this.stabilityCharts)g.chart.draw(this.solutionSeries([g.r],O.STABILITY));}
  runLotka(){this.lotka=new O.CauchySolver(O.registry.get('rk4')).solve(O.LOTKA,Number($('lotka-n').value),{record:false});const initial=O.invariant(O.LOTKA.y0),drift=Math.max(...this.lotka.ys.map(y=>Math.abs(O.invariant(y)-initial)));$('invariant').textContent=`h = ${fmt(this.lotka.h)} · max |V(t) − V(0)| = ${fmt(drift)}`;this.drawLotka();}
  drawLotka(){const r=this.lotka;this.charts.phase.draw([{name:'Траєкторія',color:'#20765e',points:r.ys},{name:'Початок',color:'#b5573b',points:[r.ys[0]],markers:4}],{xLabel:'Жертви u',yLabel:'Хижаки v'});this.charts.populations.draw([{name:'Жертви u',color:'#20765e',points:r.xs.map((t,i)=>[t,r.ys[i][0]])},{name:'Хижаки v',color:'#b5573b',points:r.xs.map((t,i)=>[t,r.ys[i][1]])}],{xLabel:'t',yLabel:'Чисельність'});}
  redraw(){if(!this.results)return;this.drawMain();this.drawAnimation();this.drawGallery();this.drawStability();if(this.lotka)this.drawLotka();}
  download(name,text){const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 }
 window.odeApp=new Application();
})();
