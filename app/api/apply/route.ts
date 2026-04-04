import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Collect all text fields
    const fields: Record<string, string> = {};
    const attachments: { filename: string; content: Buffer }[] = [];

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        if (value.size > 0) {
          const bytes = await value.arrayBuffer();
          attachments.push({
            filename: value.name,
            content: Buffer.from(bytes),
          });
        }
      } else {
        if (fields[key]) {
          fields[key] += `, ${value}`;
        } else {
          fields[key] = value;
        }
      }
    }

    const body = `
MILLSTADT AMBULANCE SERVICE — EMPLOYMENT APPLICATION
=====================================================

POSITION APPLIED FOR
--------------------
Position: ${fields.position || "Not specified"}
Employment Type: ${fields.employment_type || "Not specified"}
Days Available: ${fields.days_available || ""}
Hours Available: ${fields.hours_available || ""}
Preferred Shift: ${fields.preferred_shift || ""}

PERSONAL INFORMATION
--------------------
Full Legal Name: ${fields.full_name || ""}
Preferred Name: ${fields.preferred_name || ""}
Date of Birth: ${fields.dob || ""}
Phone: ${fields.phone || ""}
Email: ${fields.email || ""}
Address: ${fields.address || ""}, ${fields.city_state_zip || ""}
Driver's License: ${fields.dl_state || ""} #${fields.dl_number || ""} Exp: ${fields.dl_expiry || ""}
SSN: ${fields.ssn_last4 || ""}

ELIGIBILITY & BACKGROUND
-------------------------
Authorized to work in U.S.: ${fields.authorized_us || ""}
Felony conviction: ${fields.felony || ""} ${fields.felony_explain ? "— " + fields.felony_explain : ""}
Excluded from Medicare/Medicaid: ${fields.excluded_medicare || ""}
License suspended/revoked: ${fields.license_suspended || ""} ${fields.license_suspended_explain ? "— " + fields.license_suspended_explain : ""}
Consents: Background Check: ${fields.consent_background || ""} | Drug Screen: ${fields.consent_drug || ""} | Driving Record: ${fields.consent_driving || ""}

EDUCATION
---------
High School: ${fields.hs_name || ""} — Graduated: ${fields.hs_grad || ""}
College/University: ${fields.college_name || ""} | Degree: ${fields.college_degree || ""} | Field: ${fields.college_field || ""} | Graduated: ${fields.college_grad || ""}
EMS Training Program: ${fields.ems_program || ""} | Cert Earned: ${fields.ems_cert || ""} | Completed: ${fields.ems_complete || ""}

PRIMARY LICENSE
---------------
License Type: ${fields.primary_license_type || ""}
State: ${fields.primary_license_state || ""}
License #: ${fields.primary_license_number || ""}
Expiration: ${fields.primary_license_expiry || ""}

ADDITIONAL LICENSE
------------------
Type: ${fields.add_license_type || ""}
State: ${fields.add_license_state || ""}
Number: ${fields.add_license_number || ""}
Expiration: ${fields.add_license_expiry || ""}

NREMT
-----
Level: ${fields.nremt_level || ""}
Number: ${fields.nremt_number || ""}
Expiration: ${fields.nremt_expiry || ""}

DEA (if applicable)
-------------------
DEA Number: ${fields.dea_number || ""}
Expiration: ${fields.dea_expiry || ""}

CERTIFICATIONS
--------------
BLS: #${fields.bls_number || ""} Exp: ${fields.bls_expiry || ""}
ACLS: #${fields.acls_number || ""} Exp: ${fields.acls_expiry || ""}
PALS: #${fields.pals_number || ""} Exp: ${fields.pals_expiry || ""}
ITLS/PHTLS: #${fields.itls_number || ""} Exp: ${fields.itls_expiry || ""}
NRP: #${fields.nrp_number || ""} Exp: ${fields.nrp_expiry || ""}
FP-C / CCP-C: #${fields.ccp_number || ""} Exp: ${fields.ccp_expiry || ""}
CPI / De-escalation: #${fields.cpi_number || ""} Exp: ${fields.cpi_expiry || ""}
HazMat: #${fields.hazmat_number || ""} Exp: ${fields.hazmat_expiry || ""}
FEMA/NIMS: #${fields.fema_number || ""} Exp: ${fields.fema_expiry || ""}
Additional Certs: ${fields.additional_certs || ""}

WORK HISTORY
------------
${fields.work_history || ""}

EMS EXPERIENCE & SKILLS
------------------------
Years of EMS Experience: ${fields.years_ems || ""}
Years of ALS Experience: ${fields.years_als || ""}
Years of Critical Care Experience: ${fields.years_cc || ""}
Skills: ${fields.skills || ""}

DRIVING HISTORY
---------------
Valid Driver's License: ${fields.valid_dl || ""}
CDL: ${fields.cdl || ""}
Accidents (5 yrs): ${fields.accidents || ""}
Traffic Violations (5 yrs): ${fields.violations || ""}
License Suspension (5 yrs): ${fields.dl_suspension || ""}
Explanation: ${fields.driving_explain || ""}

PROFESSIONAL REFERENCES
-----------------------
${fields.references || ""}

AVAILABILITY (I Am Willing To Work)
------------------------------------
${fields.availability || ""}

ADDITIONAL INFORMATION
-----------------------
Why do you want to work for Millstadt EMS?
${fields.why_millstadt || ""}

Describe a high-acuity patient you managed:
${fields.high_acuity || ""}

Describe a time you worked as part of a team:
${fields.teamwork || ""}

CERTIFICATION
-------------
Applicant certifies all information is true and complete.

=====================================================
Attachments: ${attachments.length} file(s) attached
`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Millstadt EMS Careers" <${process.env.SMTP_USER}>`,
      to: "millstadtems@gmail.com",
      replyTo: fields.email || "",
      subject: `Employment Application — ${fields.full_name || "Applicant"} — ${fields.position || "Position Not Specified"}`,
      text: body,
      attachments: attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Application submit error:", err);
    return NextResponse.json({ success: false, error: "Failed to send application." }, { status: 500 });
  }
}
