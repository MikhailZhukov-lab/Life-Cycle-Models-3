/* Необов'язкова перевірка: встановлений Chrome та npm install --no-save playwright. */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const root=path.join(__dirname,'..'),out=path.join(root,'results');
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1040},deviceScaleFactor:1.5}),checks=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const check=async(name,fn)=>{await fn();checks.push({name,status:'OK'});};
  await page.goto(pathToFileURL(path.join(root,'index.html')).href);await page.waitForFunction(()=>window.odeApp?.lotka);
  await check('Пряме відкриття та шість основних графіків',async()=>assert.equal(await page.locator('#gallery canvas').count(),6));
  await page.screenshot({path:path.join(out,'gui.png')});
  for(const n of [5,10,20])for(const type of ['solution','errors'])await page.locator(`#${type}-${n}`).screenshot({path:path.join(out,`${type}_${n}.png`)});
  for(const n of [5,10,20])await page.locator(`#stability-${n}`).screenshot({path:path.join(out,`stability_${n}.png`)});
  await page.locator('#phase').screenshot({path:path.join(out,'lotka_phase.png')});await page.locator('#populations').screenshot({path:path.join(out,'lotka_time.png')});
  for(const scenario of ['variant','stability'])for(const n of ['5','10','20'])for(const method of ['euler','heun','rk4']){
   await check(`${scenario}, n=${n}, ${method}: перемикання та крок`,async()=>{
    await page.selectOption('#scenario',scenario);await page.selectOption('#size',n);await page.selectOption('#method',method);await page.click('#step');
    assert.deepEqual(await page.evaluate(()=>[odeApp.state.n,odeApp.state.frame,odeApp.state.method]),[Number(n),1,method]);
    const count=await page.locator('#stages tr').count();assert.equal(count,method==='euler'?1:method==='heun'?2:4);
   });
  }
  await page.selectOption('#scenario','variant');await page.selectOption('#size','5');await page.selectOption('#method','rk4');await page.click('#step');
  await page.locator('#animation').screenshot({path:path.join(out,'rk4_stages.png')});
  await check('Автомасштаб містить проміжні стадії',async()=>assert.ok(await page.evaluate(()=>{const b=odeApp.charts.animated.bounds;return odeApp.results.find(r=>r.method==='rk4').stages[0].every(s=>s.x>=b.xmin&&s.x<=b.xmax&&s.y>=b.ymin&&s.y<=b.ymax);}))); 
  await check('Відтворення і пауза',async()=>{await page.selectOption('#speed','100');await page.click('#play');await page.waitForFunction(()=>odeApp.state.frame>=3);await page.click('#play');assert.equal(await page.evaluate(()=>odeApp.state.playing),false);});
  await check('Повзунок і повернення на початок',async()=>{await page.locator('#progress').evaluate(el=>{el.value='2';el.dispatchEvent(new Event('input'));});assert.equal(await page.evaluate(()=>odeApp.state.frame),2);await page.click('#start');assert.equal(await page.evaluate(()=>odeApp.state.frame),0);});
  await page.selectOption('#size','20');await page.check('#log');await page.locator('#errors').screenshot({path:path.join(out,'errors_log.png')});
  await check('Log-похибка має скінченні межі',async()=>assert.ok(await page.evaluate(()=>Object.values(odeApp.charts.errors.bounds).every(v=>typeof v!=='number'||Number.isFinite(v)))));
  await page.locator('#custom summary').click();
  await check('Власна задача без еталона',async()=>{await page.fill('#expression','x+y');await page.fill('#exact','');await page.fill('#y0','1');await page.fill('#end','1');await page.fill('#custom-n','10');await page.click('#apply');assert.equal(await page.evaluate(()=>odeApp.problem.name),'Власна задача');assert.equal(await page.evaluate(()=>odeApp.results[0].maxError),null);});
  await check('Помилковий вираз зберігає поточну задачу',async()=>{await page.fill('#expression','x; globalThis.alert(1)');await page.click('#apply');assert.equal(await page.locator('#status').getAttribute('class'),'error');assert.equal(await page.evaluate(()=>odeApp.problem.expression),'x+y');});
  await page.locator('#custom').screenshot({path:path.join(out,'custom_input.png')});
  await check('Порожнє числове поле відхиляється',async()=>{await page.fill('#expression','y');await page.fill('#x0','');await page.click('#apply');assert.ok((await page.locator('#status').innerText()).includes('Заповніть'));});
  await check('Невірна початкова умова еталона',async()=>{await page.fill('#x0','0');await page.fill('#exact','2*exp(x)');await page.click('#apply');assert.ok((await page.locator('#status').innerText()).includes('початкову умову'));});
  await page.click('#reset');
  await check('Експорт CSV',async()=>{const wait=page.waitForEvent('download');await page.click('#export');const file=await wait;assert.equal(file.suggestedFilename(),'ode_results.csv');const filename=await file.path();const csv=fs.readFileSync(filename,'utf8');assert.equal(csv.charCodeAt(0),0xfeff);assert.ok(csv.includes('РК4'));});
  await check('Лотка–Вольтерра: зміна сітки',async()=>{await page.selectOption('#lotka-n','300');assert.equal(await page.evaluate(()=>odeApp.lotka.n),300);assert.ok((await page.locator('#invariant').innerText()).includes('max'));});
  await check('Експорт Лотки–Вольтерри',async()=>{const wait=page.waitForEvent('download');await page.click('#lotka-export');assert.equal((await wait).suggestedFilename(),'lotka_volterra.csv');});
  await check('Реєстрація нового методу без зміни інтерфейсу',async()=>{
   await page.evaluate(()=>{class Midpoint extends Ode.OdeMethod{constructor(){super('midpoint','Середня точка',2,'#555');}step(f,x,y,h){return{y:y+h*f(x+h/2,y+h*f(x,y)/2),stages:[]};}}Ode.registry.register(new Midpoint());odeApp.refreshMethods();odeApp.recalculate();});
   await page.selectOption('#method','midpoint');await page.click('#step');assert.equal(await page.evaluate(()=>odeApp.state.method),'midpoint');assert.equal(await page.locator('#metrics tr').count(),4);
  });
  await page.reload();await page.waitForFunction(()=>window.odeApp?.lotka);
  await check('Мобільна ширина 390 px',async()=>{await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));});
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'mobile.png')});
  assert.deepEqual(errors,[]);const result={browser:await browser.version(),checks,errors};fs.writeFileSync(path.join(out,'browser_checks.json'),JSON.stringify(result,null,2));console.log(`${checks.length} browser checks passed; 0 JavaScript errors.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
