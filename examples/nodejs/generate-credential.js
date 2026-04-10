/**
 * Generate NIST-compliant credentials using the Six Sense API
 * 
 * Get your free API key at sixsensesolutions.net
 */

const API_KEY = process.env.SIX_SENSE_API_KEY;
const BASE_URL = 'https://api.sixsensesolutions.net';

async function generateNISTCredential() {
  const response = await fetch(`${BASE_URL}/v1/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      length: 20,
      quantity: 1,
      compliance: 'NIST',
      options: {
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
        exclude_ambiguous: true
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API error: ${error.error} - ${error.message}`);
  }

  const { passwords, meta } = await response.json();

  console.log('Generated credential (store securely, not logged here)');
  console.log('Compliance documentation:');
  console.log(`  Length: ${meta.length}`);
  console.log(`  Entropy: ${meta.entropy_bits} bits`);
  console.log(`  Profile: ${meta.compliance_profile}`);
  console.log(`  Generated at: ${meta.generated_at}`);
  console.log(`  Calls remaining: ${meta.calls_remaining}`);

  return { credential: passwords[0], meta };
}

generateNISTCredential().catch(console.error);
