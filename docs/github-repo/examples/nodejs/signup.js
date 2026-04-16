/**
 * Sign up for a free Six Sense Solutions API key
 * 300 calls per month, no credit card required
 */

async function signup(name, email) {
  const response = await fetch('https://api.sixsensesolutions.net/v1/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Signup error: ${data.error} - ${data.message}`);
  }

  console.log('API key generated successfully');
  console.log(`Tier: ${data.tier}`);
  console.log(`Monthly limit: ${data.monthly_limit} calls`);
  console.log(`Docs: ${data.docs_url}`);
  console.log('Save your API key securely. It is shown once.');
  console.log(`API Key: ${data.api_key}`);

  return data;
}

signup('Your Name', 'your@email.com').catch(console.error);
