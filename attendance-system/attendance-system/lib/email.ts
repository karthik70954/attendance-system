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

export async function sendScheduleEmail({
  employeeName,
  employeeEmail,
  monthName,
  days,
}: {
  employeeName: string;
  employeeEmail: string;
  monthName: string;
  days: { date: Date | string; shiftType: string; dayType: string; startTime: string; notes?: string | null }[];
}) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const rows = days.map(d => {
    const dt = new Date(d.date);
    const dayName = dayNames[dt.getUTCDay()];
    const dateStr = `${dayName}, ${dt.getUTCDate()}`;
    const shift = d.shiftType === 'INSTORE' ? '🏪 Instore' : '🚗 Instore + Driving';
    const dayType = d.dayType === 'FULL' ? 'Full Day' : 'Half Day';
    return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 12px; font-weight: 600;">${dateStr}</td>
        <td style="padding: 8px 12px;">${d.startTime}</td>
        <td style="padding: 8px 12px;">${shift}</td>
        <td style="padding: 8px 12px;">${dayType}</td>
        <td style="padding: 8px 12px; color: #666; font-size: 12px;">${d.notes || ''}</td>
      </tr>
    `;
  }).join('');

  const subject = `📅 Your Work Schedule for ${monthName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 700px;">
      <h2 style="color: #2563eb;">📅 Work Schedule — ${monthName}</h2>
      <p>Hi <strong>${employeeName}</strong>,</p>
      <p>Here is your work schedule for <strong>${monthName}</strong>. You are scheduled for <strong>${days.length} day(s)</strong>.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <thead>
          <tr style="background: #2563eb; color: white;">
            <th style="padding: 10px 12px; text-align: left;">Date</th>
            <th style="padding: 10px 12px; text-align: left;">Start</th>
            <th style="padding: 10px 12px; text-align: left;">Shift</th>
            <th style="padding: 10px 12px; text-align: left;">Day Type</th>
            <th style="padding: 10px 12px; text-align: left;">Notes</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <p style="color: #666; font-size: 13px;">If you have any questions or need changes, please contact your manager.</p>
      <br/>
      <p style="color: #999; font-size: 12px;">— Attendance System</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: employeeEmail,
    subject,
    html,
  });
}
