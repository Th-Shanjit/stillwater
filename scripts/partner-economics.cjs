const fs = require('node:fs');

function integer(value, name, min, max) {
  if (
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new Error('Invalid ' + name);
  }

  return value;
}

function calculateEconomics(input) {
  if (!input || typeof input !== 'object' ||
      Array.isArray(input)) {
    throw new Error('Scenario must be an object.');
  }

  const fields = [
    'currency',
    'paidUnits',
    'refundedUnits',
    'unitPriceMinor',
    'distributionFeeBps',
    'creatorShareBps',
    'fixedCostsMinor',
  ];

  if (
    Object.keys(input).some(
      key => !fields.includes(key)
    )
  ) {
    throw new Error(
      'Unexpected scenario field. No personal information is accepted.'
    );
  }

  if (!/^[A-Z]{3}$/.test(input.currency || '')) {
    throw new Error('Invalid currency identifier.');
  }

  const units = integer(
    input.paidUnits,
    'paid units',
    0, 100000
  );

  const refunded = integer(
    input.refundedUnits,
    'refunded units',
    0, units
  );

  const price = integer(
    input.unitPriceMinor,
    'unit price',
    0, 1000000
  );

  const feeRate = integer(
    input.distributionFeeBps,
    'distribution fee basis points',
    0, 10000
  );

  const royaltyRate = integer(
    input.creatorShareBps,
    'creator share basis points',
    0, 10000
  );

  const costs = integer(
    input.fixedCostsMinor,
    'fixed costs',
    0, 1000000000000
  );

  const grossSales = units * price;
  const refundedSales = refunded * price;
  const retainedSales = grossSales - refundedSales;

  const distributionFees = Math.round(
    retainedSales * feeRate / 10000
  );

  const netReceipts =
    retainedSales - distributionFees;

  const creatorShare = Math.round(
    netReceipts * royaltyRate / 10000
  );

  const stillwaterContribution =
    netReceipts - creatorShare - costs;

  return {
    status: 'illustrative_scenario_only',
    currency: input.currency,

    paidUnits: units,
    refundedUnits: refunded,

    grossSalesMinor: grossSales,
    refundedSalesMinor: refundedSales,
    retainedSalesMinor: retainedSales,

    distributionFeesMinor: distributionFees,
    netReceiptsMinor: netReceipts,

    creatorShareMinor: creatorShare,
    fixedCostsMinor: costs,

    contributionBeforeTaxMinor:
      stillwaterContribution,
  };
}

module.exports = { calculateEconomics };

if (require.main === module) {
  try {
    const source = process.argv[2];

    if (!source) {
      throw new Error(
        'Usage: node scripts/partner-economics.cjs scenario.json'
      );
    }

    if (fs.statSync(source).size > 65536) {
      throw new Error('Scenario file too large.');
    }

    const input = JSON.parse(
      fs.readFileSync(source, 'utf8')
    );

    const result = calculateEconomics(input);

    console.log(JSON.stringify(result, null, 2));

    console.log(
      'Planning estimate only. Not a payment or royalty ledger.'
    );

  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
