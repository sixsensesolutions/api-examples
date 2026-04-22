/**
 * Six Sense Solutions — Node.js SDK
 */

const https = require('https');

class SixSenseClient {
  constructor(apiKey, options = {}) {
    if (!apiKey || !apiKey.startsWith('sss_')) {
      throw new Error('Invalid API key. Keys start with sss_free_, sss_pro_, or sss_biz_');
    }
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl || 'api.sixsensesolutions.net';
  }

  _request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        path,
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 400) {
              const err = new Error(parsed.message || `HTTP ${res.statusCode}`);
              err.statusCode = res.statusCode;
              err.code = parsed.error || 'UNKNOWN_ERROR';
              err.response = parsed;
              reject(err);
            } else {
              resolve(parsed);
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timed out (10s)'));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  async generate(params = {}) {
    return this._request('POST', '/v1/generate', {
      length: params.length || 20,
      quantity: params.quantity || 1,
      compliance: params.compliance || 'NIST',
      options: {
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
        exclude_ambiguous: true,
        ...params.options,
      },
    });
  }

  async validate(password, compliance = 'SOC2') {
    if (!password) throw new Error('Password is required');
    return this._request('POST', '/v1/validate', { credential: password, compliance });
  }

  async breachCheck(password) {
    if (!password) throw new Error('Password is required');
    return this._request('POST', '/v1/breach-check', { credential: password });
  }

  async logEvent(params) {
    if (!params.credential_id) throw new Error('credential_id is required');
    if (!params.event_type) throw new Error('event_type is required');
    return this._request('POST', '/v1/credential/event', {
      credential_id: params.credential_id,
      event_type: params.event_type,
      actor: params.actor || 'system',
      environment: params.environment || 'production',
      metadata: params.metadata || {},
    });
  }

  async auditLog(startDate, endDate) {
    if (!startDate || !endDate) throw new Error('startDate and endDate are required');
    return this._request('GET', `/v1/audit-log?start_date=${startDate}&end_date=${endDate}`);
  }
}

module.exports = SixSenseClient;
