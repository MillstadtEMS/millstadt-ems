import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

// ── Gmail API client (same pattern as CAD system) ─────────────────────────
function getGmailClient() {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_USER } = process.env;
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    throw new Error("Gmail OAuth credentials not set in environment.");
  }
  const auth = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
  return { gmail: google.gmail({ version: "v1", auth }), sender: GMAIL_USER || "millstadtcad@gmail.com" };
}

// ── Build raw MIME message ─────────────────────────────────────────────────
function buildRawMime(opts: {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  html: string;
  attachments: { filename: string; content: Buffer; mimeType: string }[];
}): string {
  const b = `----=_Part_${Date.now()}`;
  const lines: string[] = [
    `MIME-Version: 1.0`,
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Reply-To: ${opts.replyTo}`,
    `Subject: =?UTF-8?B?${Buffer.from(opts.subject).toString("base64")}?=`,
    `Content-Type: multipart/mixed; boundary="${b}"`,
    ``,
    `--${b}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(opts.html, "utf-8").toString("base64"),
    ``,
  ];

  for (const att of opts.attachments) {
    lines.push(
      `--${b}`,
      `Content-Type: ${att.mimeType || "application/octet-stream"}`,
      `Content-Disposition: attachment; filename="${att.filename}"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      att.content.toString("base64"),
      ``,
    );
  }

  lines.push(`--${b}--`);
  // Gmail API needs base64url (no +, /, or =)
  return Buffer.from(lines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ── HTML email template ───────────────────────────────────────────────────
function buildHtml(fields: Record<string, string>): string {
  const fullName = [fields.first_name, fields.middle_name, fields.last_name].filter(Boolean).join(" ");

  const section = (title: string, rows: [string, string][]) => `
    <tr><td colspan="2" style="padding:20px 30px 6px;background:#040d1a;">
      <span style="color:#f0b429;font-size:11px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">${title}</span>
      <div style="height:1px;background:#1e3a6e;margin-top:8px;"></div>
    </td></tr>
    ${rows.map(([label, value]) => `
    <tr>
      <td style="padding:8px 30px 8px 30px;color:#94a3b8;font-size:13px;width:200px;vertical-align:top;">${label}</td>
      <td style="padding:8px 30px 8px 0;color:#e2e8f0;font-size:13px;vertical-align:top;font-weight:600;">${value || "—"}</td>
    </tr>`).join("")}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#020912;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#020912;padding:40px 0;">
<tr><td align="center">
<table width="700" cellpadding="0" cellspacing="0" style="background:#071428;border:1px solid #1e3a6e;border-radius:12px;overflow:hidden;max-width:700px;">
  <tr><td colspan="2" style="background:#040d1a;padding:32px 30px;border-bottom:2px solid #f0b429;">
    <div style="font-size:11px;color:#f0b429;font-weight:900;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px;">Millstadt Ambulance Service</div>
    <div style="font-size:28px;color:#ffffff;font-weight:900;margin-bottom:4px;">Employment Application</div>
    <div style="font-size:16px;color:#94a3b8;">${fullName} — ${fields.position || "Position Not Specified"}</div>
    <div style="font-size:12px;color:#64748b;margin-top:6px;">Submitted: ${new Date().toLocaleString("en-US",{timeZone:"America/Chicago",dateStyle:"full",timeStyle:"short"})}</div>
  </td></tr>
  <table width="700" cellpadding="0" cellspacing="0">
  ${section("Position Applied For",[["Position",fields.position],["Employment Type",fields.employment_type],["Days Available",fields.days_available],["Hours Available",fields.hours_available],["Preferred Shift",fields.preferred_shift]])}
  ${section("Personal Information",[["First Name",fields.first_name],["Middle Name",fields.middle_name],["Last Name",fields.last_name],["Date of Birth",fields.dob],["SSN",fields.ssn_last4],["Phone",fields.phone],["Email",fields.email],["Address",[fields.address,fields.city_state_zip].filter(Boolean).join(", ")],["Driver's License",`${fields.dl_state||""} #${fields.dl_number||""} Exp: ${fields.dl_expiry||""}`]])}
  ${section("Eligibility & Background",[["Authorized to Work in U.S.",fields.authorized_us],["Felony Conviction",fields.felony],["Excluded from Medicare/Medicaid",fields.excluded_medicare],["License Suspended/Revoked",fields.license_suspended],["Explanation",fields.background_explain],["Consents",fields.consents]])}
  ${section("Education",[["High School",`${fields.hs_name||""} — ${fields.hs_grad||""}`],["College",`${fields.college_name||""} | ${fields.college_degree||""} in ${fields.college_field||""} | ${fields.college_grad||""}`],["EMS Program",`${fields.ems_program||""} | ${fields.ems_cert||""} | ${fields.ems_complete||""}`]])}
  ${section("Licensure",[["Primary License",`${fields.primary_license_type||""} — ${fields.primary_license_state||""} #${fields.primary_license_number||""} Exp: ${fields.primary_license_expiry||""}`],["Additional License",`${fields.add_license_type||""} — ${fields.add_license_state||""} #${fields.add_license_number||""} Exp: ${fields.add_license_expiry||""}`],["NREMT",`${fields.nremt_level||""} #${fields.nremt_number||""} Exp: ${fields.nremt_expiry||""}`],["DEA",`#${fields.dea_number||""} Exp: ${fields.dea_expiry||""}`]])}
  <tr><td colspan="2" style="padding:20px 30px 6px;background:#040d1a;"><span style="color:#f0b429;font-size:11px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">Certifications</span><div style="height:1px;background:#1e3a6e;margin-top:8px;"></div></td></tr>
  <tr><td colspan="2" style="padding:8px 30px 16px;color:#e2e8f0;font-size:13px;white-space:pre-line;">${fields.additional_certs||"—"}</td></tr>
  <tr><td colspan="2" style="padding:20px 30px 6px;background:#040d1a;"><span style="color:#f0b429;font-size:11px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">Work History</span><div style="height:1px;background:#1e3a6e;margin-top:8px;"></div></td></tr>
  <tr><td colspan="2" style="padding:8px 30px 16px;color:#e2e8f0;font-size:13px;white-space:pre-line;">${fields.work_history||"—"}</td></tr>
  ${section("EMS Experience & Skills",[["Years EMS",fields.years_ems],["Years ALS",fields.years_als],["Years Critical Care",fields.years_cc],["Skills",fields.skills]])}
  ${section("Driving History",[["Valid Driver's License",fields.valid_dl],["CDL",fields.cdl],["Accidents (5 yrs)",fields.accidents],["Traffic Violations (5 yrs)",fields.violations],["License Suspension (5 yrs)",fields.dl_suspension],["Explanation",fields.driving_explain]])}
  ${section("Availability",[["Willing to Work",fields.availability]])}
  <tr><td colspan="2" style="padding:20px 30px 6px;background:#040d1a;"><span style="color:#f0b429;font-size:11px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">Professional References</span><div style="height:1px;background:#1e3a6e;margin-top:8px;"></div></td></tr>
  <tr><td colspan="2" style="padding:8px 30px 16px;color:#e2e8f0;font-size:13px;white-space:pre-line;">${fields.references||"—"}</td></tr>
  ${section("Additional Information",[["Why Millstadt EMS?",fields.why_millstadt],["High-Acuity Call",fields.high_acuity],["Teamwork Example",fields.teamwork]])}
  <tr><td colspan="2" style="padding:24px 30px;background:#040d1a;border-top:1px solid #1e3a6e;">
    <div style="color:#64748b;font-size:12px;">Applicant certified all information is true and complete.</div>
    <div style="color:#64748b;font-size:11px;margin-top:4px;">Millstadt Ambulance Service — Employment Application System</div>
  </td></tr>
  </table>
</table>
</td></tr>
</table>
</body></html>`;
}

// ── Route handler ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fields: Record<string, string> = {};
    const attachments: { filename: string; content: Buffer; mimeType: string }[] = [];

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        if (value.size > 0) {
          const bytes = await value.arrayBuffer();
          attachments.push({ filename: value.name, content: Buffer.from(bytes), mimeType: value.type || "application/octet-stream" });
        }
      } else {
        fields[key] = fields[key] ? `${fields[key]}, ${value}` : value;
      }
    }

    const { gmail, sender } = getGmailClient();
    const fullName = [fields.first_name, fields.middle_name, fields.last_name].filter(Boolean).join(" ") || "Applicant";

    const raw = buildRawMime({
      from: `"Millstadt EMS Careers" <${sender}>`,
      to: "millstadtems@gmail.com",
      replyTo: fields.email || sender,
      subject: `Employment Application — ${fullName} — ${fields.position || "Position Not Specified"}`,
      html: buildHtml(fields),
      attachments,
    });

    await gmail.users.messages.send({ userId: "me", requestBody: { raw } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Application submit error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    let friendly = "Failed to send your application. Please try again.";
    if (msg.includes("credentials") || msg.includes("OAuth") || msg.includes("not set")) {
      friendly = "Email system is not configured on this server. Please email your application directly to millstadtems@gmail.com.";
    } else if (msg.includes("insufficientPermissions") || msg.includes("scope")) {
      friendly = "Email permission error. Please contact the site administrator or email millstadtems@gmail.com directly.";
    }
    return NextResponse.json({ success: false, error: friendly }, { status: 500 });
  }
}
