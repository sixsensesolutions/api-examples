/**
 * Retrieve audit log for compliance reporting
 * Requires Pro tier or above
 *
 * Get your API key at sixsensesolutions.net
 */

const API_KEY = process.env.SIX_SENSE_API_KEY;

async function getAuditLog(startDate, endDate, options = {}) {
  const { eventType, limit = 100 } = options;

  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    limit,
  });

  if (eventType) params.append('event_type', eventType);

  const response = await fetch(
    `https://api.sixsensesolutions.net/v1/audit-log?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API error: ${error.error} - ${error.message}`);
  }

  const data = await response.json();

  console.log(`Retrieved ${data.count} audit events`);
  console.log(`Date range: ${data.start_date} to ${data.end_date}`);
  console.log(`API key: ${data.api_key_id}`);

  data.events.forEach(event => {
    console.log(`${event.created_at} | ${event.event_type} | entropy: ${event.result.entropy_bits} bits | profile: ${event.result.compliance_profile}`);
  });

  return data;
}

// Retrieve all events for April 2026
getAuditLog('2026-04-01', '2026-04-30').catch(console.error);

// Retrieve only generate events
// getAuditLog('2026-04-01', '2026-04-30', { eventType: 'generate' }).catch(console.error);
