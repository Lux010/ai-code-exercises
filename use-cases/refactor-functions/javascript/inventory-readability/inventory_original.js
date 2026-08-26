// inventory_original.js
// ORIGINAL (cryptic) version from the exercise brief. Run with: node inventory_original.js
function p(i, a, q) {
  let r = [];
  let t = 0;

  for (let j = 0; j < i.length; j++) {
    let c = i[j];
    let f = false;

    for (let k = 0; k < a.length; k++) {
      if (c.id === a[k].id) {
        f = true;
        if (a[k].q >= q) {
          r.push(c);
          t += c.p * q;
          a[k].q -= q;
        }
        break;
      }
    }

    if (!f) {
      console.log("Item " + c.id + " not available");
    }
  }

  return {
    s: r,
    t: t
  };
}

// Unit tests for the inventory processing function
function runTests() {
  console.log("Running tests for inventory processing function...");

  let testCase1 = () => {
    const requestedItems = [
      { id: "item1", p: 10 },
      { id: "item2", p: 20 },
      { id: "item3", p: 30 }
    ];
    const inventory = [
      { id: "item1", q: 5 },
      { id: "item2", q: 3 },
      { id: "item3", q: 1 }
    ];
    const quantityRequested = 2;
    const inventoryCopy = JSON.parse(JSON.stringify(inventory));
    const result = p(requestedItems, inventory, quantityRequested);
    let success = true;
    if (result.s.length !== 2) { console.error(`FAILED: Expected 2 successful items, got ${result.s.length}`); success = false; }
    if (result.t !== 60) { console.error(`FAILED: Expected total 60, got ${result.t}`); success = false; }
    if (inventory[0].q !== 3 || inventory[1].q !== 1 || inventory[2].q !== 1) { console.error(`FAILED: Inventory not updated correctly`); success = false; }
    return success;
  };

  let testCase2 = () => {
    const requestedItems = [{ id: "item1", p: 10 }];
    const inventory = [{ id: "item1", q: 1 }];
    const quantityRequested = 2;
    const result = p(requestedItems, inventory, quantityRequested);
    let success = true;
    if (result.s.length !== 0) { console.error(`FAILED: Expected 0 successful items, got ${result.s.length}`); success = false; }
    if (result.t !== 0) { console.error(`FAILED: Expected total 0, got ${result.t}`); success = false; }
    return success;
  };

  let testCase3 = () => {
    const requestedItems = [{ id: "item1", p: 10 }, { id: "itemNonExistent", p: 20 }];
    const inventory = [{ id: "item1", q: 5 }];
    const quantityRequested = 1;
    const result = p(requestedItems, inventory, quantityRequested);
    let success = true;
    if (result.s.length !== 1) { console.error(`FAILED: Expected 1 successful item, got ${result.s.length}`); success = false; }
    if (result.t !== 10) { console.error(`FAILED: Expected total 10, got ${result.t}`); success = false; }
    return success;
  };

  const test1Result = testCase1();
  const test2Result = testCase2();
  const test3Result = testCase3();
  if (test1Result && test2Result && test3Result) console.log("All tests PASSED");
  else console.log("Some tests FAILED");
}

runTests();
