import test from 'node:test';import assert from 'node:assert/strict';
import {formatTextbook} from '../app/server/textbook-format.js';
import {mathErrors} from '../app/server/ai.js';
test('教材公式跨行、断开的命令及公式编号可排版，量词与不等号不变',()=>{
 const original='定义：对任意 $x\\in\nD$，有\n$$\\f\nrac{1}{2}\\leqslant x，\\tag{1.1}$$';
 const formatted=formatTextbook(original);assert.deepEqual(mathErrors(formatted),[]);assert.ok(formatted.includes('\\frac{1}{2}\\leqslant x'));assert.ok(formatted.includes('对任意'));assert.ok(original.includes('\\f\nrac'));assert.ok(!formatted.includes('对存在'));
});
test('未识别的断行命令仍标出问题，不能猜测改成另一条公式',()=>{assert.ok(mathErrors(formatTextbook('$\\unrecog\nnized{x}$')).length);});
