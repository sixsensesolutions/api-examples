"""
Generate NIST-compliant credentials using the Six Sense API

Get your free API key at sixsensesolutions.net
"""

import os
import requests

API_KEY = os.environ.get('SIX_SENSE_API_KEY')
BASE_URL = 'https://api.sixsensesolutions.net'


def generate_nist_credential(length=20, quantity=1):
    response = requests.post(
        f'{BASE_URL}/v1/generate',
        headers={
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json'
        },
        json={
            'length': length,
            'quantity': quantity,
            'compliance': 'NIST',
            'options': {
                'uppercase': True,
                'lowercase': True,
                'numbers': True,
                'symbols': True,
                'exclude_ambiguous': True
            }
        },
        timeout=15
    )

    response.raise_for_status()
    data = response.json()

    meta = data['meta']
    print('Compliance documentation:')
    print(f"  Length: {meta['length']}")
    print(f"  Entropy: {meta['entropy_bits']} bits")
    print(f"  Profile: {meta['compliance_profile']}")
    print(f"  Generated at: {meta['generated_at']}")
    print(f"  Calls remaining: {meta['calls_remaining']}")

    return data['passwords'], meta


if __name__ == '__main__':
    passwords, meta = generate_nist_credential()
