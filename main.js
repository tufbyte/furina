/* ===============================
   main.js - Chat UI Orchestration
   =============================== */

document.addEventListener('DOMContentLoaded', () => {

  // DOM Elements
  const chatLog = document.getElementById('chatLog');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const fetchBtn = document.getElementById('fetchBtn');
  const paraphraseInput = document.getElementById('paraphraseInput');
  const chatStatus = document.getElementById('chatStatus');

  // State
  let paraphrase = paraphraseInput ? paraphraseInput.value.trim() : 'furina';
  let messages = []; // decrypted messages array

  // ===============================
  // Render messages to chatLog
  // ===============================
  function renderMessages() {
    chatLog.innerHTML = '';
    if (!messages.length) {
      const p = document.createElement('p');
      p.classList.add('chat-placeholder');
      p.textContent = 'No messages yet.';
      chatLog.appendChild(p);
      return;
    }

    messages.forEach(msg => {
      const p = document.createElement('p');
      p.classList.add('chat-message');
      p.classList.add(msg.sender === 'me' ? 'sender' : 'receiver');
      p.textContent = `[${msg.meta.ts ? new Date(msg.meta.ts).toLocaleTimeString() : ''}] ${msg.text}`;
      chatLog.appendChild(p);
    });

    chatLog.scrollTop = chatLog.scrollHeight;
  }

  // ===============================
  // Add a new message to local state
  // ===============================
  function addMessage(text, sender='me') {
    const timestamp = new Date().toISOString();
    messages.push({
      text,
      sender,
      meta: { ts: timestamp }
    });
    renderMessages();
  }

  // ===============================
  // Handle sending a message
  // ===============================
  async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    try {
      // Encrypt using crypto.js
      const encrypted = await encryptMessageEnvelope(text, paraphrase, 'me');

      // Send encrypted payload via api.js
      await sendEncryptedMessage(encrypted);

      // Add to local state and clear input
      addMessage(text, 'me');
      messageInput.value = '';
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message.');
    }
  }

  // ===============================
  // Handle fetching messages
  // ===============================
  async function fetchMessages() {
    try {
      const rawMessages = await fetchEncryptedMessages(); // from api.js
      const decryptedMsgs = [];

      for (const envB64 of rawMessages) {
        const result = await decryptMessageEnvelope(envB64, paraphrase);
        if (result) {
          decryptedMsgs.push({
            text: result.text,
            sender: result.meta.sender || 'other',
            meta: result.meta
          });
        }
      }

      messages = decryptedMsgs;
      renderMessages();
    } catch (err) {
      console.error('Error fetching messages:', err);
      alert('Failed to fetch messages. Check paraphrase.');
    }
  }

  // ===============================
  // Event Listeners
  // ===============================
  sendBtn.addEventListener('click', sendMessage);
  fetchBtn.addEventListener('click', fetchMessages);

  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  if (paraphraseInput) {
    paraphraseInput.addEventListener('change', () => {
      paraphrase = paraphraseInput.value.trim();
      fetchMessages();
    });
  }

  // ===============================
  // Initial setup
  // ===============================
  async function init() {
    chatStatus.textContent = 'Online';
    await fetchMessages();
  }

  init();

});
