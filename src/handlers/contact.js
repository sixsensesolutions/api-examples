const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const sesClient = new SESClient({});
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildResponse(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

function parseBody(event) {
  if (!event || typeof event.body !== "string") {
    throw new Error("INVALID_BODY");
  }
  return JSON.parse(event.body);
}

function stripHtml(input) {
  return String(input || "").replace(/<[^>]*>/g, "");
}

function normalizeRequired(input) {
  return stripHtml(input).trim();
}

function normalizeOptional(input) {
  const value = stripHtml(input).trim();
  return value || "Not specified";
}

function extractEmailDomain(email) {
  const parts = String(email || "").split("@");
  return parts.length === 2 ? parts[1].toLowerCase() : "invalid";
}

async function handler(event) {
  let body;
  try {
    body = parseBody(event);
  } catch (error) {
    return buildResponse(400, {
      error: "INVALID_BODY",
      message: "Request body must be valid JSON.",
    });
  }

  const name = normalizeRequired(body.name);
  const email = normalizeRequired(body.email).toLowerCase();
  const company = normalizeRequired(body.company);
  const role = normalizeOptional(body.role);
  const subject = normalizeOptional(body.subject);
  const message = normalizeRequired(body.message);

  if (!name) {
    return buildResponse(400, { error: "INVALID_NAME", message: "Name is required." });
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    return buildResponse(400, { error: "INVALID_EMAIL", message: "Email is required and must be valid." });
  }
  if (!company) {
    return buildResponse(400, { error: "INVALID_COMPANY", message: "Company is required." });
  }
  if (!message || message.length < 10) {
    return buildResponse(400, { error: "INVALID_MESSAGE", message: "Message must be at least 10 characters." });
  }

  const toEmail = process.env.SES_TO_EMAIL || "hello@sixsensesolutions.net";
  const fromEmail = process.env.SES_FROM_EMAIL || "hello@sixsensesolutions.net";
  const textBody =
    "New inquiry from sixsensesolutions.net/contact/\n\n" +
    `Name: ${name}\n` +
    `Email: ${email}\n` +
    `Company: ${company}\n` +
    `Role: ${role}\n` +
    `Subject: ${subject}\n\n` +
    "Message:\n" +
    `${message}\n\n` +
    "---\n" +
    "Submitted via sixsensesolutions.net contact form";

  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: fromEmail,
        Destination: { ToAddresses: [toEmail] },
        ReplyToAddresses: [email],
        Message: {
          Subject: { Data: `[Six Sense Inquiry] ${subject} - ${company}`, Charset: "UTF-8" },
          Body: { Text: { Data: textBody, Charset: "UTF-8" } },
        },
      })
    );

    console.info("contact_submit", {
      timestamp: new Date().toISOString(),
      email_domain: extractEmailDomain(email),
      company,
      subject,
      success: true,
    });

    return buildResponse(200, {
      success: true,
      message: "Thank you. We will respond within one business day.",
    });
  } catch (error) {
    console.info("contact_submit", {
      timestamp: new Date().toISOString(),
      email_domain: extractEmailDomain(email),
      company,
      subject,
      success: false,
    });

    return buildResponse(500, {
      error: "SERVER_ERROR",
      message: "Something went wrong. Please email us directly at hello@sixsensesolutions.net",
    });
  }
}

module.exports = {
  handler,
};
