import { sendSms } from "@/lib/sms";
import { sendEmployeeEmail } from "@/lib/lounge/employee-email";
import {
  getFinancialsHubConfig,
  isAllowedFinancialsTestRecipient,
} from "./config";
import {
  catalog,
  recordAdminNotificationResult,
  recordRequesterNotificationResult,
  signedAgreementForRequest,
} from "./dev-store";
import {
  accuracyReportAgreement,
  recordAccuracyAdminNotificationResult,
} from "./accuracy-store";
import type { AccuracyReportRecord } from "./accuracy-types";
import type { AccessRequestRecord } from "./types";

type NotificationResult = {
  emailSent: boolean;
  smsSent: boolean;
  emailRecipients: string[];
  smsNumber: string;
};

type NotificationContext = {
  ipAddress: string;
  userAgent: string;
};

export async function notifyFinancialsHubAdmins(
  request: AccessRequestRecord,
  context: NotificationContext,
): Promise<NotificationResult> {
  const config = getFinancialsHubConfig();
  const emailRecipients = config.adminEmails;
  const smsNumber = config.adminSmsNumber;
  const notificationBody = buildAdminNotificationBody(request);
  const smsBody = buildAdminSmsBody(request);

  let emailSent = false;
  if (config.testDeliveryEnabled && emailRecipients.length > 0 && gmailConfigured()) {
    try {
      const agreement = signedAgreementForRequest(request.id);
      await sendEmployeeEmail({
        to: emailRecipients,
        subject: `[Millstadt EMS] New information request ${request.id}`,
        kicker: "Information Request Hub",
        headline: "New Information Request Submitted",
        meta: `${request.id} | ${request.flags.length ? "Flagged for extra attention" : "Ready for admin review"}`,
        bodyText: notificationBody,
        attachments: agreement
          ? [
              {
                filename: agreement.filename,
                contentType: "application/pdf",
                content: agreement.pdf,
              },
            ]
          : undefined,
      });
      emailSent = true;
    } catch (error) {
      console.error(
        "[financials hub] admin email notification failed",
        error instanceof Error ? error.name : "UnknownError",
      );
    }
  }

  let smsSent = false;
  if (smsNumber) {
    smsSent = await sendSms(smsBody, smsNumber);
  }

  const result = { emailSent, smsSent, emailRecipients, smsNumber };
  recordAdminNotificationResult(request, result, context);
  return result;
}

export async function notifyRequesterSignedAgreement(
  request: AccessRequestRecord,
  context: NotificationContext,
) {
  const config = getFinancialsHubConfig();
  const recipientAllowed = isAllowedFinancialsTestRecipient(request.verifiedEmail, config);
  let emailSent = false;

  if (
    request.signedCopyRequested &&
    recipientAllowed &&
    config.testDeliveryEnabled &&
    gmailConfigured()
  ) {
    try {
      const agreement = signedAgreementForRequest(request.id);
      if (agreement) {
        await sendEmployeeEmail({
          to: request.verifiedEmail,
          subject: `[Millstadt EMS] Signed information request ${request.id}`,
          kicker: "Information Request Hub",
          headline: "Your Signed Request Copy",
          meta: `${request.id} | Submitted ${request.submittedAtUtc}`,
          bodyText: [
            `Hello ${request.fullLegalName},`,
            "",
            "Your signed information-access request was received and is awaiting administrative review.",
            "This copy confirms submission only. It does not grant access to a restricted document.",
            "",
            `Request ID: ${request.id}`,
            `Status: ${request.status}`,
            "",
            "Your signed request PDF is attached for your records.",
          ].join("\n"),
          attachments: [
            {
              filename: agreement.filename,
              contentType: "application/pdf",
              content: agreement.pdf,
            },
          ],
        });
        emailSent = true;
      }
    } catch (error) {
      console.error(
        "[financials hub] requester signed-copy email failed",
        error instanceof Error ? error.name : "UnknownError",
      );
    }
  }

  recordRequesterNotificationResult(
    request,
    { notificationType: "signed_copy", emailSent, recipientAllowed },
    context,
  );
  return { emailSent, recipientAllowed };
}

export async function notifyRequesterAccessDecision(
  request: AccessRequestRecord,
  context: NotificationContext,
) {
  const config = getFinancialsHubConfig();
  const recipientAllowed = isAllowedFinancialsTestRecipient(request.verifiedEmail, config);
  let emailSent = false;

  if (recipientAllowed && config.testDeliveryEnabled && gmailConfigured()) {
    try {
      await sendEmployeeEmail({
        to: request.verifiedEmail,
        subject: `[Millstadt EMS] Information request ${request.id}: ${request.status}`,
        kicker: "Information Request Hub",
        headline: decisionHeadline(request.status),
        meta: `${request.id} | ${request.status}`,
        bodyText: buildRequesterDecisionBody(request),
      });
      emailSent = true;
    } catch (error) {
      console.error(
        "[financials hub] requester decision email failed",
        error instanceof Error ? error.name : "UnknownError",
      );
    }
  }

  recordRequesterNotificationResult(
    request,
    { notificationType: "decision", emailSent, recipientAllowed },
    context,
  );
  return { emailSent, recipientAllowed };
}

export async function notifyAccuracyReportAdmins(
  report: AccuracyReportRecord,
): Promise<NotificationResult> {
  const config = getFinancialsHubConfig();
  const emailRecipients = config.adminEmails;
  let emailSent = false;

  if (config.testDeliveryEnabled && emailRecipients.length > 0 && gmailConfigured()) {
    try {
      const agreement = accuracyReportAgreement(report.id);
      await sendEmployeeEmail({
        to: emailRecipients,
        subject: `[Millstadt EMS] Accuracy report ${report.id}`,
        kicker: "Financial Information",
        headline: "Accuracy or Document-Integrity Report Received",
        meta: `${report.id} | ${report.flags.length ? "Flagged for extra attention" : "Ready for admin review"}`,
        bodyText: buildAccuracyNotificationBody(report),
        attachments: [
          {
            filename: agreement.filename,
            contentType: "application/pdf",
            content: agreement.pdf,
          },
        ],
      });
      emailSent = true;
    } catch (error) {
      console.error(
        "[financials hub] accuracy report notification failed",
        error instanceof Error ? error.name : "UnknownError",
      );
    }
  }

  recordAccuracyAdminNotificationResult(report.id, { emailSent, emailRecipients });

  return {
    emailSent,
    smsSent: false,
    emailRecipients,
    smsNumber: "",
  };
}

function buildAdminNotificationBody(request: AccessRequestRecord) {
  const docs = docsForRequest(request).join("\n");
  const risk = request.flags.length
    ? `HIGH PROBABILITY OF FAKE OR INCOMPLETE SUBMISSION\n${request.flags.map((flag) => `- ${flag}`).join("\n")}`
    : "No automated fake-submission flags were detected.";

  return [
    "A new information request has been submitted to millstadtems.org.",
    "",
    `Request ID: ${request.id}`,
    `Request Type: ${labelRequestKind(request.requestKind)}`,
    `Status: ${request.status}`,
    `Submitted UTC: ${request.submittedAtUtc}`,
    `Applicant: ${request.fullLegalName}`,
    `Email: ${request.verifiedEmail}`,
    `Address: ${request.mailingAddress}${request.addressLine2 ? `, ${request.addressLine2}` : ""}, ${request.city}, ${request.state} ${request.postalCode}`,
    "",
    "Requested document(s):",
    docs || "No currently posted catalog document selected.",
    "",
    risk,
    "",
    request.agreementFilename
      ? `Signed agreement attached: ${request.agreementFilename}`
      : "Signed agreement attachment was not available.",
    "",
    "If this listed-document access request only needs an approve/deny decision, reply to the SMS with:",
    `YES ${request.id} to approve`,
    `NO ${request.id} to deny`,
    "",
    "Production remains Coming Soon. This notification is generated by the development-only synthetic request workflow unless the feature is separately enabled by an authorized administrator.",
  ].join("\n");
}

function buildAdminSmsBody(request: AccessRequestRecord) {
  const docs = docsForRequest(request)
    .map((line) => line.replace(/\s+/g, " "))
    .join("; ");
  const risk = request.flags.length
    ? `HIGH FAKE/INCOMPLETE RISK: ${request.flags.join(" ")}`
    : "No automated fake-submission flags.";

  return [
    "New information request submitted to millstadtems.org.",
    `ID ${request.id}.`,
    `Type: ${labelRequestKind(request.requestKind)}.`,
    risk,
    `Name: ${request.fullLegalName}.`,
    `Email: ${request.verifiedEmail}.`,
    `Docs: ${docs || "no listed document selected"}.`,
    `Reply YES ${request.id} to approve selected listed document(s) or NO ${request.id} to deny.`,
  ].join(" ");
}

function buildAccuracyNotificationBody(report: AccuracyReportRecord) {
  return [
    "A new accuracy or document-integrity report has been submitted to millstadtems.org.",
    "",
    `Report reference: ${report.id}`,
    `Status: ${report.status}`,
    `Submitted UTC: ${report.submittedAtUtc}`,
    `Reporter: ${report.reporterName}`,
    `Email: ${report.reporterEmail}`,
    `Telephone: ${report.reporterTelephone || "Not provided"}`,
    "",
    `Document: ${report.documentTitle}`,
    `Document ID: ${report.documentId}`,
    `Document version: ${report.documentVersion}`,
    `Location: ${report.pageOrSection}`,
    `Category: ${report.category}`,
    `Source URL: ${report.sourceUrl}`,
    "",
    "Specific concern:",
    report.description,
    "",
    `Supporting source: ${report.supportingSource || "Not provided"}`,
    report.upload
      ? `Protected supporting upload: ${report.upload.originalFilename} (${report.upload.size} bytes; available only in admin review)`
      : "Protected supporting upload: None",
    "",
    report.flags.length
      ? `FLAGGED FOR EXTRA ATTENTION\n${report.flags.map((flag) => `- ${flag}`).join("\n")}`
      : "No automated placeholder-submission flags were detected.",
    "",
    `Signed report attached: ${report.agreementFilename}`,
    "The report and any supporting upload are private administrative-review records and are not published automatically.",
  ].join("\n");
}

function buildRequesterDecisionBody(request: AccessRequestRecord) {
  const lines = [
    `Hello ${request.fullLegalName},`,
    "",
    `Millstadt EMS has updated information request ${request.id}.`,
    `Decision: ${request.status}`,
  ];

  if (request.status === "approved") {
    const approvedDocuments = docsForRequest(request).filter((line) =>
      request.approvedDocIds.some((documentId) => line.startsWith(`${documentId} -`)),
    );
    lines.push(
      `Access expires: ${request.expirationAtUtc ?? "See the request status displayed in the hub."}`,
      "",
      "Approved document(s):",
      ...approvedDocuments,
      "",
      "Return to the Financial Information page in the same browser and refresh Request status to open the controlled viewer.",
    );
  } else if (request.status === "denied") {
    lines.push("Access was not approved for this request.");
  } else if (request.status === "revoked") {
    lines.push("Previously approved access has been revoked and the controlled viewer is no longer available.");
  } else if (request.status === "expired") {
    lines.push("The approval period has ended and the controlled viewer is no longer available.");
  }

  if (request.reviewReason) lines.push("", `Administrative note: ${request.reviewReason}`);
  lines.push("", "This message concerns only the request ID and document versions shown above.");
  return lines.join("\n");
}

function decisionHeadline(status: AccessRequestRecord["status"]) {
  switch (status) {
    case "approved":
      return "Your Document Request Was Approved";
    case "denied":
      return "Your Document Request Was Not Approved";
    case "revoked":
      return "Document Access Was Revoked";
    case "expired":
      return "Document Access Has Expired";
    default:
      return "Your Document Request Was Updated";
  }
}

function docsForRequest(request: AccessRequestRecord) {
  const byId = new Map(catalog().map((doc) => [doc.id, doc]));
  return request.selectedDocIds.map((documentId) => {
    const doc = byId.get(documentId);
    return doc
      ? `${doc.id} - ${doc.title} (${doc.category}, v${doc.version}, ${doc.pageCount} pages)`
      : `${documentId} - Unknown synthetic document`;
  });
}

function gmailConfigured() {
  return Boolean(
    process.env.GMAIL_CLIENT_ID &&
      process.env.GMAIL_CLIENT_SECRET &&
      process.env.GMAIL_REFRESH_TOKEN,
  );
}

function labelRequestKind(kind: AccessRequestRecord["requestKind"]) {
  switch (kind) {
    case "published_document_access":
      return "Listed document access";
    case "new_information_request":
      return "Legacy information request";
    case "mixed":
      return "Legacy mixed request";
  }
}
