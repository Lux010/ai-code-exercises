# Exercise — Code Readability Challenge (Example 1: Cryptic Variable Names, JavaScript)

**Selected sample:** Example 1 — the `p(i, a, q)` inventory-fulfilment function.
**Steps followed:** understand original (ran tests) → apply Code Readability Improvement prompt
→ refactor → re-run tests.

## 1. Understand the original + run unit tests

Saved the brief's code as `inventory_original.js` (with its `runTests()`) and ran it:

```
Running tests for inventory processing function...
Item itemNonExistent not available
All tests PASSED
```

**What the function actually does:** it processes a list of *requested items* against an
*inventory*. For each requested item it looks the item up in inventory; if found with enough
stock it deducts `q` units from inventory, pushes the item into the results, and adds
`price × q` to a running total. Items not found are logged as "not available". Returns
`{ s: fulfilledItems, t: totalCost }`.

## 2. Apply the Code Readability Improvement prompt

> "I want to make this code more readable. Identify unreadable names, suggest better ones, and
> note any structural issues. [p(i,a,q) code]. Language: JavaScript, camelCase."

**AI's suggested renames (simulated):**
| Original | Meaning | Renamed to |
|----------|---------|------------|
| `p` | process order | `processInventoryOrder` |
| `i` | requested items | `requestedItems` |
| `a` | inventory | `inventory` |
| `q` | quantity requested | `requestedQuantity` |
| `r` | results | `fulfilledItems` |
| `t` | total | `totalCost` |
| `j` / `c` | request loop index / item | `requestIndex` / `requestedItem` |
| `f` | found flag | `foundInInventory` |
| `k` / `a[k]` | inventory loop index / item | `inventoryIndex` / `inventoryItem` |
| return keys `s` / `t` | results / total | `fulfilledItems` / `totalCost` |

The AI also suggested hoisting the stock check and cost calc into named helpers, and adding a
JSDoc describing parameters/returns.

## 3. Implement the improvements

`inventory.js` (refactored, plus `inventory_helpers.js` for the two named helpers). Key excerpt:

```javascript
function processInventoryOrder(requestedItems, inventory, requestedQuantity) {
  const fulfilledItems = [];
  let totalCost = 0;

  for (let requestIndex = 0; requestIndex < requestedItems.length; requestIndex++) {
    const requestedItem = requestedItems[requestIndex];
    let foundInInventory = false;

    for (let inventoryIndex = 0; inventoryIndex < inventory.length; inventoryIndex++) {
      const inventoryItem = inventory[inventoryIndex];
      if (requestedItem.id === inventoryItem.id) {
        foundInInventory = true;
        if (hasSufficientStock(inventoryItem, requestedQuantity)) {
          fulfilledItems.push(requestedItem);
          totalCost += calculateTotalCost(requestedItem, requestedQuantity);
          inventoryItem.quantity -= requestedQuantity;
        }
        break;
      }
    }
    if (!foundInInventory) console.log(`Item ${requestedItem.id} not available`);
  }
  return { fulfilledItems, totalCost };
}
```

## 4. Verify functionality

Port the 3 brief tests to `inventory.test.js` (Jest) against the refactored function:

```
processInventoryOrder (refactored inventory fulfilment)
  √ fulfils in-stock items, deducts inventory, accumulates total
  √ skips items with insufficient stock (no fulfilment, no deduction)
  √ fulfils found items and logs missing ones
Tests: 3 passed, 3 total
```

Behaviour preserved (same fulfil/deduct/log semantics). **Caveat I noted:** renaming the return
keys `s`/`t` → `fulfilledItems`/`totalCost` is a *public-shape* change — in real code I'd update
all callers + tests (which I did here by rewriting the tests with the new keys).

---

## Reflection Questions

**Q1. How much easier is the code to understand now?**
Enormously. `p(i, a, q)` forced the reader to reverse-engineer intent from single letters;
`processInventoryOrder(requestedItems, inventory, requestedQuantity)` states the purpose in the
signature. A new dev can grasp it in seconds instead of minutes.

**Q2. What readability issues did the AI catch that I missed?**
The *compound* nature of the inner `if (a[k].q >= q)` — I'd have just renamed it, but the AI
prompt pushed me to extract `hasSufficientStock(...)` so the *condition's meaning* is named, not
just the variables. Also naming the return keys, which I'd initially overlooked.

**Q3. What readability issues did the AI miss that I noticed?**
The **silent skip on insufficient stock** (when `f` is true but quantity is too low, nothing is
logged and the item is quietly dropped). That's a *semantics* gap, not a naming one — a future
maintainer would assume "found = handled". A clarity improvement would be an explicit
`else`/log branch or comment noting insufficient stock is intentionally skipped. The AI focused
on names, not on this behavioural ambiguity.

**Q4. Which readability improvements had the biggest impact?**
The **function and parameter names**. That single change converts the code from "cryptic puzzle"
to "self-documenting". The extracted helpers were nice-to-have; the names did the heavy lifting.

**Q5. How did the improved names change your understanding of the code's purpose?**
Once `a` became `inventory` and the return became `{ fulfilledItems, totalCost }`, it was clear
this is an **order-fulfilment / stock-deduction** routine (mutating inventory as a side effect),
not just a "calculation". The names revealed the *side effect* (inventory mutation) that the
original `p` hid.

**Q6. What readability patterns can you apply to your future code?**
- Never use single-letter names for non-trivial scopes; name by *role*.
- Name boolean flags by the question they answer (`foundInInventory`, not `f`).
- Name return-object keys by what they hold.
- Extract non-obvious conditions into named helpers (`hasSufficientStock`).
- Add JSDoc for any public function: purpose + param/return meaning.

**Q7. Explaining to a teammate (hypothetical):**
> "This used to be `p(i,a,q)` — impossible to read. I renamed it `processInventoryOrder`; `i` is
> the list of things the customer wants, `a` is our stock, `q` is how many of each they want. It
> loops the requests, finds each in stock, and if we have enough it deducts `q` and adds the cost
> to `totalCost`. I also pulled the 'enough stock?' check into `hasSufficientStock` so the `if`
> reads like English. Tests still pass — I just updated the test keys to the new return names."

*(The same approach applies to Examples 2–4: Example 2 needs JSDoc on the financial calculator,
Example 3 needs algorithm comments on the selection sort, Example 4 needs reformatting + helper
extraction for the discount logic.)*
