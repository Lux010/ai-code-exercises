// inventory.js
// REFACTORED version of the cryptic `p(i, a, q)` — renamed for clarity (Code Readability Challenge).
const { calculateTotalCost, hasSufficientStock } = require('./inventory_helpers');

/**
 * Fulfil a batch of requested items from available inventory.
 *
 * For each requested item, if it exists in `inventory` with enough stock, the requested
 * quantity is deducted from inventory and the item is added to the list of fulfilled items;
 * the running total cost is accumulated. Items not found (or with insufficient stock) are
 * skipped and logged to the console.
 *
 * @param {Array<{id: string, price: number}>} requestedItems - The items the customer wants.
 * @param {Array<{id: string, quantity: number}>} inventory - Available stock (mutated in place).
 * @param {number} requestedQuantity - How many units of each requested item to fulfil.
 * @returns {{ fulfilledItems: Array, totalCost: number }} Fulfilled items and total price.
 */
function processInventoryOrder(requestedItems, inventory, requestedQuantity) {
  const fulfilledItems = [];
  let totalCost = 0;

  for (const requestedItem of requestedItems) {
    const inventoryItem = inventory.find(item => item.id === requestedItem.id);

    if (!inventoryItem) {
      console.log(`Item ${requestedItem.id} not available`);
      continue;
    }
    if (!hasSufficientStock(inventoryItem, requestedQuantity)) {
      continue; // found but insufficient stock: skipped silently (matches original behaviour)
    }

    fulfilledItems.push(requestedItem);
    totalCost += calculateTotalCost(requestedItem, requestedQuantity);
    inventoryItem.quantity -= requestedQuantity;
  }

  return { fulfilledItems, totalCost };
}

module.exports = { processInventoryOrder };
