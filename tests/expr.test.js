'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {compile}=require('../js/expr.js');
for(const [expr,value] of [['2+3*4',14],['(2+3)*4',20],['2^3^2',512],['-2^2',-4],['2^-2',.25],['3e-2+1',1.03],['sin(pi/2)',1],['ln(exp(2))',2],['sqrt(9)+abs(-2)',5]]) {
  test('Вираз '+expr,()=>assert.ok(Math.abs(compile(expr,[])()-value)<1e-12));
}
test('Змінні x, y',()=>assert.equal(compile('x-2*y')(1,3),-5));
for(const expr of ['', '2y', 'x+', 'unknown(x)', 'globalThis.alert(1)', 'x; process.exit()', 'constructor(1)', '(x', 'sin()', '1/0']) {
  test('Відхилення '+JSON.stringify(expr),()=>assert.throws(()=>compile(expr)(1,2)));
}
test('Немає y в точній функції',()=>assert.throws(()=>compile('y+x',['x'])));
test('Надмірна вкладеність',()=>assert.throws(()=>compile('('.repeat(100)+'1'+')'.repeat(100))));
