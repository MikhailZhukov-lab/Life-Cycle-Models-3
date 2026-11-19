/* Рекурсивний спуск: арифметика без виконання JavaScript-коду з вводу. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OdeExpr=api;})(globalThis,function(){
  'use strict';
  const FUNCTIONS=new Map(Object.entries({sin:Math.sin,cos:Math.cos,tan:Math.tan,exp:Math.exp,ln:Math.log,log:Math.log,sqrt:Math.sqrt,abs:Math.abs,atan:Math.atan,asin:Math.asin,acos:Math.acos}));
  function compile(text,variables=['x','y']) {
    if(typeof text!=='string'||!text.trim()||text.length>400)throw new Error('Вираз має містити від 1 до 400 символів.');
    const tokens=[];let pos=0;
    while(pos<text.length){
      const tail=text.slice(pos);if(/^\s/.test(tail)){pos++;continue;}
      const number=tail.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
      const name=tail.match(/^[a-zA-Z_][a-zA-Z_0-9]*/);
      if(number){tokens.push({kind:'number',value:Number(number[0]),pos});pos+=number[0].length;}
      else if(name){tokens.push({kind:'name',value:name[0],pos});pos+=name[0].length;}
      else if('+-*/^()'.includes(text[pos])){tokens.push({kind:text[pos],pos});pos++;}
      else throw new Error(`Недозволений символ у позиції ${pos+1}.`);
    }
    tokens.push({kind:'end',pos:text.length});let i=0,depth=0;
    const take=k=>{if(tokens[i].kind!==k)throw new Error(`Очікується «${k}», позиція ${tokens[i].pos+1}.`);return tokens[i++];};
    const binary=(op,a,b)=>env=>{const x=a(env),y=b(env);switch(op){case '+':return x+y;case '-':return x-y;case '*':return x*y;case '/':return x/y;case '^':return x**y;}};
    function sum(){let a=product();while(['+','-'].includes(tokens[i].kind)){const op=tokens[i++].kind;a=binary(op,a,product());}return a;}
    function product(){let a=unary();while(['*','/'].includes(tokens[i].kind)){const op=tokens[i++].kind;a=binary(op,a,unary());}return a;}
    function unary(){
      if(++depth>80)throw new Error('Надто глибока вкладеність виразу.');
      let a;if(tokens[i].kind==='-'){i++;const b=unary();a=env=>-b(env);}else if(tokens[i].kind==='+'){i++;a=unary();}else a=power();
      depth--;return a;
    }
    function power(){let a=primary();if(tokens[i].kind==='^'){i++;a=binary('^',a,unary());}return a;}
    function primary(){
      const t=tokens[i];
      if(t.kind==='number'){i++;return()=>t.value;}
      if(t.kind==='('){i++;const a=sum();take(')');return a;}
      if(t.kind==='name'){
        i++;if(t.value==='pi')return()=>Math.PI;if(t.value==='e')return()=>Math.E;
        const idx=variables.indexOf(t.value);if(idx>=0)return env=>env[idx];
        if(FUNCTIONS.has(t.value)){take('(');const a=sum();take(')');const fn=FUNCTIONS.get(t.value);return env=>fn(a(env));}
        throw new Error(`Невідоме ім’я «${t.value}», позиція ${t.pos+1}.`);
      }
      throw new Error(`Очікується число, змінна або дужка, позиція ${t.pos+1}.`);
    }
    const fn=sum();take('end');
    return(...values)=>{const result=fn(values);if(!Number.isFinite(result))throw new Error('Вираз дав нескінченне або невизначене значення.');return result;};
  }
  return {compile};
});
