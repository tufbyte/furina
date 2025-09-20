/* ===============================
   api.js - GitHub API Helpers (No Client PAT Needed)
   =============================== */

/*
  Assumes:
  - A GitHub workflow listens for repository_dispatch events
  - Workflow uses repo secret to commit messages.json
  - Client only triggers dispatch; no token in browser
*/

const GITHUB_OWNER = 'tufbyte';  // replace with your username
const GITHUB_REPO  = 'furina';           // replace with repo name
const WORKFLOW_EVENT_TYPE = 'update-messages'; // repo_dispatch event name

// -------------- fetch raw encrypted messages --------------
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

// -------------- send encrypted message via repository_dispatch --------------
async function sendEncryptedMessage(encryptedBlob) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`;

  // We send the event without a token; GitHub workflow should allow public dispatch
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
      console.log('Message dispatched successfully.');
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

// ---------------- Export functions ----------------
window.fetchEncryptedMessages = fetchEncryptedMessages;
window.sendEncryptedMessage = sendEncryptedMessage;
