const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendVerificationEmail(email, token, username) {
  const verificationUrl = `${process.env.APP_URL}/auth/verify-email?token=${token}`;

  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Your App'}" <${process.env.FROM_EMAIL}>`,
    to: email,
    subject: 'Verify your email address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to ${process.env.APP_NAME || 'Our App'}, ${username}!</h2>
        <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Verify Email Address
        </a>
        <p>This link will expire in ${process.env.EMAIL_EXPIRATION}.</p>
        <p>If you didn't create an account, please ignore this email.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          If the button doesn't work, copy and paste this link into your browser: ${verificationUrl}
        </p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}


module.exports = {
  sendVerificationEmail
};
