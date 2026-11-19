'use strict';const test=require('node:test'),assert=require('node:assert/strict');const {range}=require('../js/chart.js');
test('Межі містять дані тесту стійкості',()=>{const [a,b]=range([1,-3,9,-27,81,-243]);assert.ok(a<-243&&b>81);});
test('Стала функція має ненульовий діапазон',()=>{const [a,b]=range([3,3]);assert.ok(a<3&&b>3);});
test('Логарифмічна шкала пропускає нуль',()=>{const [a,b]=range([0,1e-6,1e-2],true);assert.ok(a>-10&&a<-6&&b>-2);});
test('Порожні та нечислові дані',()=>assert.ok(range([NaN,Infinity]).every(Number.isFinite)));
test('Довга історія не переповнює стек',()=>{const [a,b]=range(Array.from({length:200002},(_,i)=>i));assert.ok(a<0&&b>200001);});
