const nodemailer = require('nodemailer');

// Configure the transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use your email service (Gmail, Outlook, etc.)
  auth: {
    user: 'rushikeshsobale@gmail.com',   // Your email
    pass: ''     // Your email password or app password
  }
});

// Function to send a verification email
const sendVerificationEmail = async (email, verificationCode) => {
  const mailOptions = {
    from: 'your_email@gmail.com',
    to: email,
    subject: 'Email Verification Code',
    text: `Your verification code is: ${verificationCode}`,
    html: `<p>Your verification code is: <strong>${verificationCode}</strong></p>`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send verification email');
  }
};

module.exports = sendVerificationEmail;
