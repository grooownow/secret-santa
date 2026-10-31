import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderServerToHtml as html } from "../../../test/render-server";
import { defaultSettings } from "@/lib/game-phase";
import { OverviewView } from "./overview";
import type { Overview } from "./queries";
import { ParticipantsTable } from "./participants-table";

vi.mock("next-intl/server", () => ({
  getTranslations: async (ns: string) => (key: string) => `${ns}.${key}`,
  getLocale: async () => "en",
}));
vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));
vi.mock("@/features/draw", () => ({
  RunDrawForm: () => <div>run-draw</div>,
}));
vi.mock("./resend-broadcast-form", () => ({
  ResendBroadcastForm: ({ event }: { event: string }) => (
    <button>resend:{event}</button>
  ),
}));
vi.mock("./withdraw-action", () => ({ withdrawAction: vi.fn() }));

const none = { total: 0, sent: 0 };
const overview = (patch: Partial<Overview>): Overview => ({
  phase: "collect",
  participants: 10,
  excluded: 2,
  giftsMarked: 4,
  broadcasts: {
    draw: { total: 10, sent: 7 },
    "gifts-open": none,
    reminder: none,
    reveal: none,
  },
  backupNeeded: 0,
  backupOrganized: 0,
  ...patch,
});
const settings = defaultSettings();

describe("OverviewView per phase", () => {
  it("collect: counts, check link and the draw button", async () => {
    const out = await html(
      await OverviewView({ overview: overview({}), settings }),
    );
    expect(out).toContain("admin.overview.collectTitle");
    expect(out).toContain("admin.overview.check");
    expect(out).toContain("run-draw");
  });

  it("waiting: draw mail status with resend, links to participants and backup", async () => {
    const out = await html(
      await OverviewView({
        overview: overview({ phase: "waiting" }),
        settings,
      }),
    );
    expect(out).toContain("admin.overview.drawnTitle");
    expect(out).toContain("admin.overview.sentOf");
    expect(out).toContain("resend:draw");
    expect(out).toContain("/admin/participants");
    expect(out).toContain("/admin/backup");
  });

  it("gifts: gifts marked, waiting for backup, the 25 and 29 Dec mailings", async () => {
    const out = await html(
      await OverviewView({
        overview: overview({
          phase: "gifts",
          backupNeeded: 3,
          broadcasts: {
            draw: none,
            "gifts-open": { total: 5, sent: 2 },
            reminder: { total: 5, sent: 5 },
            reveal: none,
          },
        }),
        settings,
      }),
    );
    expect(out).toContain("admin.overview.giftsTitle");
    expect(out).toContain("admin.overview.giftsMarked");
    expect(out).toContain("admin.overview.waitingBackup");
    expect(out).toContain("admin.overview.helpTitle");
    expect(out).toContain("admin.overview.giftsOpenMail");
    expect(out).toContain("admin.overview.reminderMail");
    // Only the unfinished gifts-open mailing offers "Дослать".
    expect(out).toContain("resend:gifts-open");
    expect(out).not.toContain("resend:reminder");
    expect(out).not.toContain("admin.overview.drawMail");
  });

  it("reveal: backup counts, reveal mail, reminder and the purge note", async () => {
    const out = await html(
      await OverviewView({
        overview: overview({
          phase: "reveal",
          backupNeeded: 2,
          backupOrganized: 1,
        }),
        settings,
      }),
    );
    expect(out).toContain("admin.overview.revealTitle");
    expect(out).toContain("admin.overview.backupNeeded");
    expect(out).toContain("admin.overview.backupOrganized");
    expect(out).toContain("admin.overview.revealMail");
    expect(out).toContain("admin.overview.reminderMail");
    expect(out).toContain("admin.overview.purgeNote");
  });
});

const rows = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Anna",
    kind: "adult" as const,
    building: "K",
    apartment: "24",
    verified: true,
  },
];

describe("ParticipantsTable", () => {
  it("participants table offers delete in collect", () => {
    render(<ParticipantsTable rows={rows} phase="collect" />);
    expect(screen.getByText("admin.participants.remove")).toBeTruthy();
    expect(screen.queryByText("admin.participants.withdraw")).toBeNull();
  });

  it("offers withdrawal, as a link to the confirm page, while waiting", () => {
    render(<ParticipantsTable rows={rows} phase="waiting" />);
    const link = screen.getByText("admin.participants.withdraw");
    expect(link.getAttribute("href")).toBe(
      "/admin/participants/11111111-1111-4111-8111-111111111111/withdraw",
    );
    expect(screen.queryByText("admin.participants.remove")).toBeNull();
  });

  it("offers nothing from 25 December", () => {
    render(<ParticipantsTable rows={rows} phase="later" />);
    expect(screen.queryByText("admin.participants.remove")).toBeNull();
    expect(screen.queryByText("admin.participants.withdraw")).toBeNull();
  });
});
