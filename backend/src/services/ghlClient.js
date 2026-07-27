import { config } from '../config.js';

export async function fetchGhlContacts({ apiKey, locationId }) {
  const contacts = [];
  let page = 1;
  const limit = 100;

  while (true) {
    const url = new URL('/v3/contacts', config.ghlApiBaseUrl);
    url.searchParams.set('locationId', locationId);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('page', String(page));

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: config.ghlApiVersion,
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GHL contacts request failed (${response.status}): ${body}`);
    }

    const data = await response.json();
    const pageContacts = data.contacts || data.data || data.items || [];
    contacts.push(...pageContacts);

    const total = data.total || data.meta?.total;
    const hasMore = data.hasMore || data.meta?.hasMore || (total ? contacts.length < total : pageContacts.length === limit);
    if (!hasMore || pageContacts.length === 0) {
      break;
    }

    page += 1;
  }

  return contacts;
}
