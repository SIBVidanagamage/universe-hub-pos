const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'universehubmobiles@gmail.com',
    pass: 'vdexkmwwlbeqwojc',
  },
});

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const { to, bcc, subject, html, image, imageFileName } = body;

    console.log("Received email request, subject:", subject, "hasImage:", !!image);

    if ((!to && !bcc) || !subject || !html) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const mailOptions = {
      from: '"Universe Hub" <universehubmobiles@gmail.com>',
      to: to || 'universehubmobiles@gmail.com',
      bcc: bcc,
      subject: subject,
      html: html,
      attachments: []
    };

    if (image) {
      const base64Data = image.split(',')[1];
      mailOptions.attachments.push({
        filename: imageFileName || 'promotion-image.jpg',
        content: base64Data,
        encoding: 'base64',
        cid: 'promo-image'
      });
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, messageId: info.messageId })
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: 'Failed to send email' })
    };
  }
};
