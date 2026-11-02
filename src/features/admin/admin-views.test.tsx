import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
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
const markBackupNeeded = vi.hoisted(() => vi.fn(async () => ({ ok: true })));
vi.mock("./backup-actions", () => ({
  markBackupNeeded,
  assignVolunteer: vi.fn(),
}));
vi.mock("./refresh-while-sending", () => ({
  RefreshWhileSending: () => <i>live-refresh</i>,
}));

const none = { total: 0, sent: 0 };
const overview = (patch: Partial<Overview>): Overview => ({
  phase: "collect",
  participants: 10,
  children: 0,
  exitRequests: 0,
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
const drawn = defaultSettings({ drawnAt: new Date("2026-12-07T10:00:00Z") });
/** Pins "today" (Madrid) for the date-aware mailing windows. */
function today(day: string) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${day}T12:00:00+01:00`));
}

describe("OverviewView per phase", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("collect: counts, check link and the draw button", async () => {
    const out = await html(
      await OverviewView({ overview: overview({}), settings }),
    );
    expect(out).toContain("admin.overview.collectTitle");
    expect(out).toContain("admin.overview.check");
    expect(out).toContain("run-draw");
  });

  it("waiting: draw mail status with resend, no buttons duplicating the tabs", async () => {
    today("2026-12-10");
    const out = await html(
      await OverviewView({
        overview: overview({ phase: "waiting" }),
        settings: drawn,
      }),
    );
    expect(out).toContain("admin.overview.drawnTitle");
    expect(out).toContain("admin.overview.sentOf");
    expect(out).toContain("resend:draw");
    // «Участники» and «Нужен запасной Санта» are the tabs above; no copies.
    expect(out).not.toContain("admin.overview.participantsLink");
    expect(out).not.toContain("admin.overview.backupLink");
  });

  it("waiting: says how many are children and why there are fewer emails", async () => {
    today("2026-12-10");
    const out = await html(
      await OverviewView({
        overview: overview({
          phase: "waiting",
          participants: 4,
          children: 2,
          broadcasts: {
            draw: { total: 2, sent: 2 },
            "gifts-open": none,
            reminder: none,
            reveal: none,
          },
        }),
        settings: drawn,
      }),
    );
    expect(out).toContain("admin.overview.childrenOf");
    expect(out).toContain("admin.overview.mailPerAccount");
  });

  it("waiting without children: no children note, no fewer-emails note", async () => {
    today("2026-12-10");
    const out = await html(
      await OverviewView({
        overview: overview({
          phase: "waiting",
          broadcasts: {
            draw: { total: 10, sent: 10 },
            "gifts-open": none,
            reminder: none,
            reveal: none,
          },
        }),
        settings: drawn,
      }),
    );
    expect(out).not.toContain("admin.overview.childrenOf");
    expect(out).not.toContain("admin.overview.mailPerAccount");
  });

  it("right after the draw: shows «sending» and refreshes instead of offering «Дослать»", async () => {
    today("2026-12-07");
    const justDrawn = defaultSettings({
      drawnAt: new Date(Date.now() - 60_000),
    });
    const out = await html(
      await OverviewView({
        overview: overview({ phase: "waiting" }),
        settings: justDrawn,
      }),
    );
    expect(out).toContain("admin.overview.sending");
    expect(out).toContain("live-refresh");
    expect(out).not.toContain("resend:draw");
  });

  it("gifts: gifts marked, waiting for backup, the 25 and 29 Dec mailings", async () => {
    today("2026-12-30");
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
        settings: drawn,
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

  it("gifts before the reminder window: no reminder block and no «Дослать» for it", async () => {
    today("2026-12-26");
    const out = await html(
      await OverviewView({
        overview: overview({
          phase: "gifts",
          broadcasts: {
            draw: none,
            "gifts-open": { total: 5, sent: 2 },
            reminder: { total: 5, sent: 0 },
            reveal: none,
          },
        }),
        settings: drawn,
      }),
    );
    expect(out).toContain("resend:gifts-open");
    expect(out).not.toContain("admin.overview.reminderMail");
    expect(out).not.toContain("resend:reminder");
  });

  it("reveal: backup counts, reveal mail, reminder and the purge note", async () => {
    today("2027-01-02");
    const out = await html(
      await OverviewView({
        overview: overview({
          phase: "reveal",
          backupNeeded: 2,
          backupOrganized: 1,
        }),
        settings: drawn,
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
    exitRequestedAt: null,
    exitComment: null,
    inChain: false,
    backupRequested: false,
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

  it("marks a «Не могу участвовать» request with its comment", () => {
    render(
      <ParticipantsTable
        rows={[
          {
            ...rows[0]!,
            exitRequestedAt: new Date("2026-12-10T10:00:00Z"),
            exitComment: "Away",
          },
        ]}
        phase="waiting"
      />,
    );
    expect(screen.getByText("admin.participants.exitRequested")).toBeTruthy();
    expect(screen.getByText("admin.participants.exitComment")).toBeTruthy();
  });

  it("after the draw a drawn person can be put on «Помощь» by hand", async () => {
    render(
      <ParticipantsTable
        rows={[{ ...rows[0]!, inChain: true }]}
        phase="later"
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "admin.participants.needsBackup" }),
    );
    expect(markBackupNeeded).toHaveBeenCalledWith(rows[0]!.id);
    expect(
      await screen.findByText("admin.participants.backupAdded"),
    ).toBeTruthy();
  });

  it("offers nothing from 25 December", () => {
    render(<ParticipantsTable rows={rows} phase="later" />);
    expect(screen.queryByText("admin.participants.remove")).toBeNull();
    expect(screen.queryByText("admin.participants.withdraw")).toBeNull();
  });
});
