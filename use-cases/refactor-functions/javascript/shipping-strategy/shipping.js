// shipping.js
// REFACTORED with the Strategy pattern (Design Pattern Implementation Challenge).
//
// The original nested `if/else` on (shippingMethod x destinationCountry) is a classic
// candidate for Strategy: each shipping method becomes a strategy object that knows its own
// per-country rate table and surcharge rule. Adding a method or country is now a data edit,
// not a new branch.

/** Per-method rate tables. `default` covers any country not explicitly listed. */
const METHOD_RATES = {
  standard: { USA: 2.5, Canada: 3.5, Mexico: 4.0, default: 4.5 },
  express: { USA: 4.5, Canada: 5.5, Mexico: 6.0, default: 7.5 },
  overnight: { USA: 9.5, Canada: 12.5 } // no `default` => unsupported countries return a message
};

/** Surcharge rule per method; returns 0 when not applicable. */
function getSurcharge(method, { weight, length, width, height }) {
  const volume = length * width * height;
  if (method === 'standard') {
    return (weight < 2 && volume > 1000) ? 5.0 : 0;
  }
  if (method === 'express') {
    return (volume > 5000) ? 15.0 : 0;
  }
  return 0;
}

/** Factory for a shipping-method strategy. */
function createShippingStrategy(method) {
  const rates = METHOD_RATES[method];
  if (!rates) {
    throw new Error(`Unknown shipping method: ${method}`);
  }

  return {
    /** @returns {number|string} numeric cost, or an unsupported-destination message. */
    calculate(packageDetails, destinationCountry) {
      const explicit = rates[destinationCountry];

      if (explicit === undefined) {
        if ('default' in rates) {
          // International / other country covered by the default rate.
          return packageDetails.weight * rates.default + getSurcharge(method, packageDetails);
        }
        // Method does not serve this country (e.g. overnight outside USA/Canada).
        return 'Overnight shipping not available for this destination';
      }

      return packageDetails.weight * explicit + getSurcharge(method, packageDetails);
    }
  };
}

/**
 * Calculate the shipping cost for a package.
 *
 * @param {{weight:number,length:number,width:number,height:number}} packageDetails
 * @param {string} destinationCountry
 * @param {'standard'|'express'|'overnight'} shippingMethod
 * @returns {string} Cost formatted to 2 decimals, or an unsupported-destination message.
 */
function calculateShippingCost(packageDetails, destinationCountry, shippingMethod) {
  const strategy = createShippingStrategy(shippingMethod);
  const result = strategy.calculate(packageDetails, destinationCountry);
  return typeof result === 'string' ? result : result.toFixed(2);
}

module.exports = { calculateShippingCost, createShippingStrategy, METHOD_RATES };
