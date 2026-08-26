// shipping_original.js
// ORIGINAL (nested-conditionals) version from the exercise brief. Exported for equivalence tests.
function calculateShippingCost(packageDetails, destinationCountry, shippingMethod) {
  const { weight, length, width, height } = packageDetails;
  let cost = 0;

  if (shippingMethod === 'standard') {
    if (destinationCountry === 'USA') {
      cost = weight * 2.5;
    } else if (destinationCountry === 'Canada') {
      cost = weight * 3.5;
    } else if (destinationCountry === 'Mexico') {
      cost = weight * 4.0;
    } else {
      cost = weight * 4.5;
    }
    if (weight < 2 && (length * width * height) > 1000) {
      cost += 5.0;
    }
  } else if (shippingMethod === 'express') {
    if (destinationCountry === 'USA') {
      cost = weight * 4.5;
    } else if (destinationCountry === 'Canada') {
      cost = weight * 5.5;
    } else if (destinationCountry === 'Mexico') {
      cost = weight * 6.0;
    } else {
      cost = weight * 7.5;
    }
    if ((length * width * height) > 5000) {
      cost += 15.0;
    }
  } else if (shippingMethod === 'overnight') {
    if (destinationCountry === 'USA') {
      cost = weight * 9.5;
    } else if (destinationCountry === 'Canada') {
      cost = weight * 12.5;
    } else {
      return "Overnight shipping not available for this destination";
    }
  }

  return cost.toFixed(2);
}

module.exports = { calculateShippingCost };
