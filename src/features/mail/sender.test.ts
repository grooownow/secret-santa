import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  env: {
    NODE_ENV: "test" as string,
    GMAIL_USER: undefined as string | undefined,
    GMAIL_APP_PASSWORD: undefined as string | undefined,
    E2E_MAIL_OUTBOX: undefined as string | undefined,
  },
  info: vi.fn(),
  createTransport: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock("@/lib/env", () => ({ env: mocks.env }));
vi.mock("@/lib/logger", () => ({
  logger: { info: mocks.info, error: vi.fn() },
}));
vi.mock("@/db/client", () => ({ getDb: () => ({}) }));
vi.mock("nodemailer", () => ({ createTransport: mocks.createTransport }));

import { sendMail, setMailTransportForTests } from "./sender";

const message = { to: "a@b.dev", subject: "S", text: "T", html: "<p>T</p>" };

afterEach(() => {
  setMailTransportForTests(null);
  Object.assign(mocks.env, {
    NODE_ENV: "test",
    GMAIL_USER: undefined,
    GMAIL_APP_PASSWORD: undefined,
    E2E_MAIL_OUTBOX: undefined,
  });
  vi.clearAllMocks();
});

describe("sendMail", () => {
  it("uses the test transport when one is installed", async () => {
    const transport = vi.fn().mockResolvedValue(undefined);
    setMailTransportForTests(transport);
    await sendMail(message);
    expect(transport).toHaveBeenCalledWith(message);
  });

  it("logs instead of sending without credentials outside production", async () => {
    await sendMail(message);
    expect(mocks.info).toHaveBeenCalledTimes(1);
    expect(mocks.createTransport).not.toHaveBeenCalled();
  });

  it("appends to the e2e outbox file instead of sending", async () => {
    const file = join(await mkdtemp(join(tmpdir(), "outbox-")), "mail.jsonl");
    mocks.env.E2E_MAIL_OUTBOX = file;
    mocks.env.NODE_ENV = "production";
    await sendMail(message);
    await sendMail({ ...message, to: "c@d.dev" });
    const lines = (await readFile(file, "utf8")).trim().split("\n");
    expect(lines.map((l) => JSON.parse(l).to)).toEqual(["a@b.dev", "c@d.dev"]);
    expect(mocks.createTransport).not.toHaveBeenCalled();
  });

  it("refuses to run without credentials in production", async () => {
    mocks.env.NODE_ENV = "production";
    await expect(sendMail(message)).rejects.toThrow(/GMAIL_USER/);
  });

  it("sends through Gmail without a connection pool when configured", async () => {
    mocks.env.GMAIL_USER = "santa@gmail.com";
    mocks.env.GMAIL_APP_PASSWORD = "app-pass";
    mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail });
    await sendMail(message);
    const options = mocks.createTransport.mock.calls[0]?.[0];
    expect(options).toMatchObject({
      service: "gmail",
      auth: { user: "santa@gmail.com", pass: "app-pass" },
    });
    expect(options).not.toHaveProperty("pool");
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "a@b.dev", subject: "S" }),
    );
  });
});
