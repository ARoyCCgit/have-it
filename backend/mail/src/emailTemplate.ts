/**
 * Professional HTML Email Template Generator for Have-it
 * Engineered for 100% email client compatibility (Gmail, Apple Mail, Outlook, Yahoo)
 * Features:
 * - Real Have-it Logo from Cloudinary CDN
 * - High-contrast "Have-it" typography that never blends into dark/light mode backgrounds
 * - Single-line compact OTP code box with one-tap select-all for copying
 * - One-click auto-verify button that pre-fills the OTP in Have-it
 */
export const getOtpEmailHtml = (
  otp: string | number,
  recipientEmail: string,
  frontendUrl?: string
): string => {
  const rawOtp = String(otp).trim();
  const formattedOtp = rawOtp.split("").join(" ");
  const baseAppUrl = (frontendUrl || process.env.FRONTEND_URL || "https://have-it-super-app.vercel.app").replace(/\/$/, "");
  const copyUrl = `${baseAppUrl}/verify?email=${encodeURIComponent(recipientEmail)}&otp=${encodeURIComponent(rawOtp)}&copied=1`;
  const logoUrl = "https://res.cloudinary.com/deolniqzk/image/upload/v1788779349/haveit_app_logo.png";
  const copyIconUrl = "https://res.cloudinary.com/deolniqzk/image/upload/v1788780730/haveit/haveit_copy_icon.png";

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Your Have-it Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Outer Wrapper Table -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);">
          
          <!-- Card Header with Real Have-it Logo -->
          <tr>
            <td align="center" style="padding: 30px 20px 20px 20px; background-color: #ffffff; border-bottom: 1px solid #f1f5f9;">
              <!-- Real Have-it Logo -->
              <img src="${logoUrl}" width="54" height="54" alt="Have-it" style="display: block; margin: 0 auto 10px auto; border-radius: 14px; border: 1.5px solid #03cafc;" />
              
              <!-- Brand Title (High contrast, never disappears) -->
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 24px; font-weight: 800; line-height: 28px; text-align: center; margin: 0;">
                <span style="color: #0f172a !important; font-weight: 800;">Have</span><span style="color: #0284c7 !important; font-weight: 800;">-it</span>
              </div>
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-top: 4px; text-align: center;">
                Messenger &amp; Social Network
              </div>
            </td>
          </tr>

          <!-- Card Content Body -->
          <tr>
            <td style="padding: 28px 24px 20px 24px; text-align: center; background-color: #ffffff;">
              <h2 style="margin: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 700; color: #0f172a;">
                Verification Code
              </h2>
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.5; color: #475569;">
                Use this single-use code to sign in to your account.
              </p>

              <!-- Compact 16px OTP Box with Copy Icon (Not bulky) -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                <tr>
                  <td style="padding: 8px 14px; vertical-align: middle;">
                    <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 16px; font-weight: 700; letter-spacing: 4px; color: #0f172a; user-select: all; -webkit-user-select: all; display: inline-block;">
                      ${formattedOtp}
                    </span>
                  </td>
                  <td style="padding: 6px 10px 6px 0; vertical-align: middle;">
                    <a href="${copyUrl}" target="_blank" title="Copy code" style="display: inline-block; text-decoration: none; padding: 4px 6px; background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; vertical-align: middle;">
                      <img src="${copyIconUrl}" width="16" height="16" alt="Copy" style="display: block; width: 16px; height: 16px; border: 0;" />
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Copy Instruction -->
              <div style="margin-top: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; color: #64748b;">
                Click the copy icon or tap the code to copy
              </div>

              <!-- Expiry & Security Notice -->
              <div style="margin-top: 22px; padding: 12px 14px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; text-align: left;">
                <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; line-height: 1.5; color: #64748b;">
                  ⏱️ <strong>Valid for 5 minutes.</strong> Never share this code with anyone. If you didn't request this login, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>

          <!-- Card Footer -->
          <tr>
            <td align="center" style="padding: 18px 20px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; color: #94a3b8;">
                Sent to <strong>${recipientEmail}</strong>
              </p>
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; color: #94a3b8;">
                &copy; 2026 Have-it. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};
