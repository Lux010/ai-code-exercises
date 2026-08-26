// inventory_helpers.js
// Small, named helpers extracted during the readability refactor (clarity over cleverness).

/** True when the inventory item has at least `requestedQuantity` units in stock. */
function hasSufficientStock(inventoryItem, requestedQuantity) {
  return inventoryItem.quantity >= requestedQuantity;
}

/** Total price for `requestedQuantity` units of `requestedItem`. */
function calculateTotalCost(requestedItem, requestedQuantity) {
  return requestedItem.price * requestedQuantity;
}

module.exports = { hasSufficientStock, calculateTotalCost };
