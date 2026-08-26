// inventory.test.js
// Jest port of the brief's 3 console tests, run against the refactored processInventoryOrder.
const { processInventoryOrder } = require('./inventory');

describe('processInventoryOrder (refactored inventory fulfilment)', () => {
  test('fulfils in-stock items, deducts inventory, accumulates total', () => {
    const requestedItems = [
      { id: 'item1', price: 10 },
      { id: 'item2', price: 20 },
      { id: 'item3', price: 30 }
    ];
    const inventory = [
      { id: 'item1', quantity: 5 },
      { id: 'item2', quantity: 3 },
      { id: 'item3', quantity: 1 }
    ];
    const result = processInventoryOrder(requestedItems, inventory, 2);

    expect(result.fulfilledItems).toHaveLength(2);
    expect(result.totalCost).toBe(60);
    expect(inventory[0].quantity).toBe(3);
    expect(inventory[1].quantity).toBe(1);
    expect(inventory[2].quantity).toBe(1);
  });

  test('skips items with insufficient stock (no fulfilment, no deduction)', () => {
    const requestedItems = [{ id: 'item1', price: 10 }];
    const inventory = [{ id: 'item1', quantity: 1 }];
    const result = processInventoryOrder(requestedItems, inventory, 2);

    expect(result.fulfilledItems).toHaveLength(0);
    expect(result.totalCost).toBe(0);
    expect(inventory[0].quantity).toBe(1); // unchanged
  });

  test('fulfils found items and logs missing ones', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const requestedItems = [
      { id: 'item1', price: 10 },
      { id: 'itemNonExistent', price: 20 }
    ];
    const inventory = [{ id: 'item1', quantity: 5 }];
    const result = processInventoryOrder(requestedItems, inventory, 1);

    expect(result.fulfilledItems).toHaveLength(1);
    expect(result.totalCost).toBe(10);
    expect(logSpy).toHaveBeenCalledWith('Item itemNonExistent not available');
    logSpy.mockRestore();
  });
});
