// 🧪 lib/catalogPurge.ts-এর নতুন পিউর যুক্তির টেস্ট (ডাটাবেজ/নেটওয়ার্ক ছাড়া): npx tsx scripts/test-catalog-purge.ts
import assert from 'node:assert/strict';
import { mergeEffects, orderStructureChanged, stockOrderCrossings, parsePurgeBody } from '../lib/catalogPurge';
const rows = [
  { id: 1, cat: 'a', cats: ['a'], stock: 5 },
  { id: 2, cat: 'a', cats: ['a'], stock: 0 },
  { id: 3, cat: 'b', cats: null, stock: 2 },
];
// ৫→৪ পেরোয়নি; ২: ০→৩ পেরিয়েছে; ৩: ২→০ পেরিয়েছে; ৯: before-তে নেই → পেরিয়েছে ধরা
let out = stockOrderCrossings(rows, [{ id: 1, stock: 4 }, { id: 2, stock: 3 }, { id: 3, stock: 0 }, { id: 9, stock: 1 }], ['1', '2', '3', '9']);
assert.deepEqual(out.map((c) => c.productId), ['2', '3', '9']);
assert.ok(out.every((c) => c.changeType === 'stockorder'));
assert.equal(stockOrderCrossings(null, [{ id: 1, stock: 4 }], ['1']).length, 1);   // before নেই → নিরাপদে পেরিয়েছে
assert.equal(stockOrderCrossings(rows, [{ id: 1, stock: 4 }], ['2']).length, 0);   // চাওয়া হয়নি এমন আইডি বাদ
// কাঠামো
assert.equal(orderStructureChanged(rows, rows.map((r) => ({ ...r, stock: 99 }))), false);   // শুধু স্টক বদল = কাঠামো একই
assert.equal(orderStructureChanged(rows, [...rows].reverse()), true);
assert.equal(orderStructureChanged(rows, rows.slice(1)), true);
assert.equal(orderStructureChanged(rows, [{ ...rows[0], cats: ['a', 'z'] }, rows[1], rows[2]]), true);
assert.equal(orderStructureChanged(null, rows), true);
// মার্জ
let e = mergeEffects([{ productId: '1', changeType: 'stockorder' }]);
assert.deepEqual(e.tags.sort(), ['list', 'live']);
assert.equal(e.listing, true); assert.equal(e.selfIds.length, 0); assert.equal(e.needsNeighbours, false);
e = mergeEffects([{ productId: '1', changeType: 'stock' }]);
assert.deepEqual(e.tags, ['live']); assert.equal(e.listing, false);
e = mergeEffects([{ productId: '1', changeType: 'price' }]);
assert.ok(!e.tags.includes('prodrows')); assert.deepEqual(e.selfIds, ['1']);
// বডি-পার্সার নতুন টাইপ নেয়
assert.equal(parsePurgeBody({ productId: 5, changeType: 'stockorder' })?.[0].changeType, 'stockorder');
assert.equal(parsePurgeBody({ productId: 5, changeType: 'bogus' }), null);
console.log('✅ catalogPurge নতুন যুক্তি পাস');
