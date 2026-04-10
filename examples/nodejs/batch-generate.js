/**
 * Generate multiple credentials in a single API call
 * Useful for seeding test environments or bulk provisioning
 */

const API_KEY = process.env.SIX_SENSE_API_KEY;

async function generateBatch(quantity = 10, compliance = 'NIST') {
  const response = await fetch('https://api.sixsensesolutions.net/v1/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      length: 20,
      quantity,
      compliance,
      options: {
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
        exclude_ambiguous: true
      }
    })
  });

  const { passwords, meta } = await response.json();

  console.log(`Generated ${passwords.length} credentials`);
  console.log(`Compliance profile: ${meta.compliance_profile}`);
  console.log(`Entropy per credential: ${meta.entropy_bits} bits`);
  console.log(`Calls remaining this month: ${meta.calls_remaining}`);

  return { passwords, meta };
}

generateBatch(10, 'NIST').catch(console.error);
