const fs = require("fs");
const path = require("path");

const mockSend = jest.fn();

jest.mock("@aws-sdk/client-ses", () => {
  return {
    SESClient: function SESClient() {
      return { send: mockSend };
    },
    SendEmailCommand: function SendEmailCommand(input) {
      this.input = input;
    },
  };
});

describe("contact handler", () => {
  beforeEach(() => {
    jest.resetModules();
    mockSend.mockReset();
    process.env.SES_FROM_EMAIL = "hello@sixsensesolutions.net";
    process.env.SES_TO_EMAIL = "hello@sixsensesolutions.net";
  });

  test("valid submission returns 200", async () => {
    mockSend.mockResolvedValueOnce({ MessageId: "message-id-1" });
    const { handler } = require("../../src/handlers/contact");

    const response = await handler({
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        company: "Test Corp",
        role: "Developer",
        subject: "Technical Question",
        message: "This is a test message from the contact form.",
      }),
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      success: true,
      message: "Thank you. We will respond within one business day.",
    });
  });

  test("missing name returns 400 INVALID_NAME", async () => {
    const { handler } = require("../../src/handlers/contact");
    const response = await handler({
      body: JSON.stringify({
        email: "test@example.com",
        company: "Test Corp",
        message: "This is a valid message.",
      }),
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe("INVALID_NAME");
  });

  test("missing email returns 400 INVALID_EMAIL", async () => {
    const { handler } = require("../../src/handlers/contact");
    const response = await handler({
      body: JSON.stringify({
        name: "Test User",
        company: "Test Corp",
        message: "This is a valid message.",
      }),
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe("INVALID_EMAIL");
  });

  test("missing company returns 400 INVALID_COMPANY", async () => {
    const { handler } = require("../../src/handlers/contact");
    const response = await handler({
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        message: "This is a valid message.",
      }),
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe("INVALID_COMPANY");
  });

  test("message under 10 chars returns 400 INVALID_MESSAGE", async () => {
    const { handler } = require("../../src/handlers/contact");
    const response = await handler({
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        company: "Test Corp",
        message: "too short",
      }),
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe("INVALID_MESSAGE");
  });

  test("SES sendEmail called with correct to, from, reply-to", async () => {
    mockSend.mockResolvedValueOnce({ MessageId: "message-id-2" });
    const { handler } = require("../../src/handlers/contact");

    await handler({
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        company: "Test Corp",
        role: "",
        subject: "",
        message: "This is a test message from the contact form.",
      }),
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.input.Source).toBe("hello@sixsensesolutions.net");
    expect(command.input.Destination.ToAddresses).toEqual(["hello@sixsensesolutions.net"]);
    expect(command.input.ReplyToAddresses).toEqual(["test@example.com"]);
    expect(command.input.Message.Subject.Data).toContain("[Six Sense Inquiry] Not specified - Test Corp");
  });

  test("full message body never appears in logs", async () => {
    mockSend.mockResolvedValueOnce({ MessageId: "message-id-3" });
    const logSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    const { handler } = require("../../src/handlers/contact");
    const fullMessage = "This is a sensitive full inquiry message content.";

    await handler({
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        company: "Test Corp",
        role: "Developer",
        subject: "Technical Question",
        message: fullMessage,
      }),
    });

    const logs = logSpy.mock.calls.flat().join(" ");
    expect(logs.includes(fullMessage)).toBe(false);
    logSpy.mockRestore();
  });

  test("Math.random never used", () => {
    const handlerPath = path.resolve(__dirname, "../../src/handlers/contact.js");
    const content = fs.readFileSync(handlerPath, "utf8");
    expect(content.includes("Math.random")).toBe(false);
  });
});
