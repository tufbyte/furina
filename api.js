/* api.js - trigger workflow only; client has no token */

const GITHUB_OWNER = 'YOUR_GITHUB_USERNAME';  // replace with your username
const GITHUB_REPO = 'furina-chat';
const WORKFLOW_EVENT_TYPE = 'update-messages';

async function sendEncryptedMessage(encryptedBlob) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`;

  const payload = {
    event_type: WORKFLOW_EVENT_TYPE,
    client_payload: { encrypted: encryptedBlob }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 204 || res.status === 202) {
      console.log('Message dispatched — workflow will append it.');
    } else {
      const text = await res.text();
      console.error('Dispatch failed:', text);
      throw new Error('Repository dispatch failed.');
    }
  } catch (err) {
    console.error('Error sending encrypted message:', err);
    throw err;
  }
}

// fetchEncryptedMessages stays the same
async function fetchEncryptedMessages() {
  const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/messages.json`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch messages.json');
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

window.sendEncryptedMessage = sendEncryptedMessage;
window.fetchEncryptedMessages = fetchEncryptedMessages;
