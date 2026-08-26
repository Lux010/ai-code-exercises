// shipping.test.js
const { calculateShippingCost } = require('./shipping');
const { calculateShippingCost: original } = require('./shipping_original');
const { createShippingStrategy } = require('./shipping');

const packages = {
  normal: { weight: 5, length: 10, width: 10, height: 10 },     // volume 1000
  lightAndBulky: { weight: 1, length: 20, width: 20, height: 20 } // volume 8000
};

const methods = ['standard', 'express', 'overnight'];
const countries = ['USA', 'Canada', 'Mexico', 'France', 'Japan'];

describe('Behavior preservation (refactored vs original)', () => {
  test.each(methods.flatMap(m => countries.flatMap(c =>
    [['normal', m, c], ['lightAndBulky', m, c]].map(([p, mm, cc]) => [p, mm, cc])
  )))('method=%s country=%s package=%s', (pkgName, method, country) => {
    const pkg = packages[pkgName];
    expect(calculateShippingCost(pkg, country, method)).toBe(original(pkg, country, method));
  });
});

describe('Published example outputs', () => {
  test('standard / USA / weight 5 => "12.50"', () => {
    expect(calculateShippingCost({ weight: 5, length: 10, width: 10, height: 10 }, 'USA', 'standard')).toBe('12.50');
  });
  test('express / Canada / weight 5 => "27.50"', () => {
    expect(calculateShippingCost({ weight: 5, length: 10, width: 10, height: 10 }, 'Canada', 'express')).toBe('27.50');
  });
  test('overnight to Mexico returns the unsupported message', () => {
    expect(calculateShippingCost({ weight: 5, length: 10, width: 10, height: 10 }, 'Mexico', 'overnight'))
      .toBe('Overnight shipping not available for this destination');
  });
});

describe('Strategy pattern behavior', () => {
  test('surcharge: standard light+bulky adds +5.00', () => {
    // 1 * 2.5 (USA) + 5.0 surcharge = 7.5
    expect(calculateShippingCost(packages.lightAndBulky, 'USA', 'standard')).toBe('7.50');
  });
  test('surcharge: express bulky adds +15.00', () => {
    // 1 * 4.5 (USA) + 15.0 = 19.5
    expect(calculateShippingCost(packages.lightAndBulky, 'USA', 'express')).toBe('19.50');
  });
  test('international default rate applies (France via standard)', () => {
    // 5 * 4.5 = 22.50
    expect(calculateShippingCost(packages.normal, 'France', 'standard')).toBe('22.50');
  });
  test('unknown shipping method throws', () => {
    expect(() => createShippingStrategy('drone')).toThrow(/Unknown shipping method/);
  });
});
