import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendMissedCheckInAlert({
  employeeName,
  employeeEmail,
  managerEmail,
  date,
}: {
  employeeName: string;
  employeeEmail?: string | null;
  managerEmail: string;
  date: string;
}) {
  const subject = `⚠️ Missed Check-In: ${employeeName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #e53e3e;">Missed Check-In Alert</h2>
      <p><strong>${employeeName}</strong> was scheduled to work today (${date}) but has not checked in.</p>
      <p>Please follow up with them.</p>
      <br/>
      <p style="color: #666; font-size: 12px;">— Attendance System</p>
    </div>
  `;

  // Notify manager
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: managerEmail,
    subject,
    html,
  });

  // Notify employee if they have email
  if (employeeEmail) {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: employeeEmail,
      subject: `⚠️ You missed your check-in for ${date}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #e53e3e;">Missed Check-In</h2>
          <p>Hi ${employeeName},</p>
          <p>You were scheduled to work on <strong>${date}</strong> but no check-in was recorded.</p>
          <p>If this is an error, please contact your manager.</p>
        </div>
      `,
    });
  }
}
