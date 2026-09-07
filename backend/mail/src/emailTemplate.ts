/**
 * Professional HTML Email Template Generator for Have-it
 * Engineered for 100% email client compatibility (Gmail, Apple Mail, Outlook, Yahoo)
 */
export const getOtpEmailHtml = (otp: string | number, recipientEmail: string): string => {
  const formattedOtp = String(otp).split("").join(" ");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Have-it Verification Code</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b141a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e9edef;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #0b141a;
      padding: 40px 10px;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background-color: #111b21;
      border: 1px solid #1f2c34;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(135deg, #182730 0%, #111b21 100%);
      padding: 35px 25px 25px 25px;
      text-align: center;
      border-bottom: 1px solid #202c33;
    }
    .logo-badge {
      display: inline-block;
      width: 56px;
      height: 56px;
      line-height: 56px;
      border-radius: 16px;
      background: linear-gradient(135deg, #03cafc 0%, #0077b6 100%);
      color: #0b141a;
      font-size: 28px;
      font-weight: 900;
      margin-bottom: 15px;
      box-shadow: 0 4px 18px rgba(3, 202, 252, 0.4);
      text-align: center;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      margin: 0;
    }
    .brand-accent {
      color: #03cafc;
    }
    .brand-subtitle {
      font-size: 12px;
      color: #8696a0;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-top: 5px;
      font-weight: 600;
    }
    .content {
      padding: 35px 30px;
      text-align: center;
    }
    .headline {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 12px 0;
    }
    .subtext {
      font-size: 14px;
      line-height: 1.6;
      color: #aebac1;
      margin: 0 0 28px 0;
    }
    .otp-box {
      background: linear-gradient(180deg, #182730 0%, #111b21 100%);
      border: 2px dashed #03cafc;
      border-radius: 16px;
      padding: 22px 15px;
      margin: 0 auto 25px auto;
      max-width: 320px;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #03cafc;
      margin: 0;
      text-align: center;
      padding-left: 10px;
    }
    .otp-caption {
      font-size: 11px;
      color: #8696a0;
      margin-top: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .timer-pill {
      display: inline-block;
      background-color: #202c33;
      border: 1px solid #2a3942;
      color: #ffb703;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 20px;
      margin-bottom: 25px;
    }
    .notice-card {
      background-color: #182229;
      border-radius: 12px;
      padding: 16px;
      border-left: 4px solid #03cafc;
      text-align: left;
      margin-top: 20px;
    }
    .notice-text {
      font-size: 12px;
      line-height: 1.6;
      color: #8696a0;
      margin: 0;
    }
    .notice-strong {
      color: #e9edef;
      font-weight: 600;
    }
    .footer {
      background-color: #0b141a;
      padding: 25px 20px;
      text-align: center;
      border-top: 1px solid #1f2c34;
      font-size: 11px;
      color: #667781;
      line-height: 1.6;
    }
    .footer a {
      color: #03cafc;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <table role="presentation" class="wrapper" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <div class="container">
          <!-- Brand Header -->
          <div class="header">
            <div class="logo-badge">H</div>
            <h1 class="brand-title">Have<span class="brand-accent">-it</span></h1>
            <div class="brand-subtitle">Messenger & Social Network</div>
          </div>

          <!-- Main Body Content -->
          <div class="content">
            <h2 class="headline">Verification Code</h2>
            <p class="subtext">
              Use the single-use 6-digit verification code below to log in or confirm your identity on Have-it.
            </p>

            <!-- OTP Highlight Box -->
            <div class="otp-box">
              <div class="otp-code">${formattedOtp}</div>
              <div class="otp-caption">One-Time Password</div>
            </div>

            <!-- Expiry Reminder -->
            <div>
              <span class="timer-pill">⏱️ Code expires in 5 minutes</span>
            </div>

            <!-- Security Advisory -->
            <div class="notice-card">
              <p class="notice-text">
                <span class="notice-strong">🔒 Security Notice:</span> Never share this code with anyone. Have-it staff will never ask you for your verification code or password.
                If you did not make this request, you can safely ignore this email.
              </p>
            </div>
          </div>

          <!-- Professional Footer -->
          <div class="footer">
            <p style="margin: 0 0 6px 0;">This email was sent to <strong>${recipientEmail}</strong></p>
            <p style="margin: 0 0 6px 0;">Have-it — End-to-End Real-Time Messenger & Social Network</p>
            <p style="margin: 0;">© 2026 Have-it. All rights reserved. • Automated security notification</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};
