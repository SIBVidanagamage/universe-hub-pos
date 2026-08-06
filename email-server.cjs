const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Load environment variables directly or manually specify
// Using the ones from your .env
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: 'universehubmobiles@gmail.com',
    pass: 'vdexkmwwlbeqwojc', // This is the App Password from your .env
  },
});

app.post('/api/send-email', async (req, res) => {
  const { to, bcc, subject, html, image, imageFileName } = req.body;
  // Don't log the whole body if it contains a large base64 image!
  console.log("Received email request, subject:", subject, "hasImage:", !!image);

  if ((!to && !bcc) || !subject || !html) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const mailOptions = {
      from: '"Universe Hub" <universehubmobiles@gmail.com>',
      to: to || 'universehubmobiles@gmail.com', // fallback to self if only BCC is provided
      bcc: bcc, // for bulk emails
      subject: subject,
      html: html,
      attachments: []
    };

    if (image) {
      // image is a base64 string like "data:image/jpeg;base64,/9j/4AAQSk..."
      // We need to extract just the base64 part
      const base64Data = image.split(',')[1];
      mailOptions.attachments.push({
        filename: imageFileName || 'promotion-image.jpg',
        content: base64Data,
        encoding: 'base64',
        cid: 'promo-image' // same cid value as in the html img src
      });
    }

    const info = await transporter.sendMail(mailOptions);

    console.log('Message sent: %s', info.messageId);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

app.get('/api/inbox', async (req, res) => {
  const { ImapFlow } = require('imapflow');
  const simpleParser = require('mailparser').simpleParser;

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: 'universehubmobiles@gmail.com',
      pass: 'vdexkmwwlbeqwojc'
    },
    logger: false // Disable logging to keep console clean
  });

  try {
    await client.connect();
    
    // Select mailbox
    let lock = await client.getMailboxLock('INBOX');
    try {
      const messages = [];
      // Fetch latest 20 emails
      // seq: '1:*' or '-20:*' (last 20 messages)
      const count = client.mailbox.exists;
      if (count === 0) {
        return res.json([]);
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
      
      // Sort newest first
      messages.sort((a, b) => new Date(b.date) - new Date(a.date));
      res.json(messages);
      
    } finally {
      lock.release();
    }
    
    await client.logout();
  } catch (error) {
    console.error("IMAP Error:", error);
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Email server running on http://localhost:${PORT}`);
});
