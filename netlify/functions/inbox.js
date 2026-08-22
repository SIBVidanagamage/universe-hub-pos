const { ImapFlow } = require('imapflow');
const simpleParser = require('mailparser').simpleParser;

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: 'universehubmobiles@gmail.com',
      pass: 'vdexkmwwlbeqwojc'
    },
    logger: false
  });

  try {
    await client.connect();
    
    let lock = await client.getMailboxLock('INBOX');
    try {
      const messages = [];
      const count = client.mailbox.exists;
      if (count === 0) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([])
        };
      }
      
      const seq = Math.max(1, count - 19) + ':*';
      
      for await (let msg of client.fetch(seq, { envelope: true, source: true })) {
        const parsed = await simpleParser(msg.source);
        messages.push({
          id: msg.uid,
          subject: parsed.subject,
          from: parsed.from?.text,
          date: parsed.date,
          snippet: parsed.text?.substring(0, 100) + '...',
          text: parsed.text,
          html: parsed.html
        });
      }
      
      messages.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messages)
      };
      
    } finally {
      lock.release();
    }
  } catch (error) {
    console.error("IMAP Error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: 'Failed to fetch inbox' })
    };
  } finally {
    try {
      await client.logout();
    } catch (e) {
      console.error("Logout Error:", e);
    }
  }
};
