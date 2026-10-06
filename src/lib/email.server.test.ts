import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isEmailConfigured, sendEmail } from "./email.server";

describe("sendEmail", () => {
  const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockClear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("n'envoie rien tant que l'envoi n'est pas configuré", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(isEmailConfigured()).toBe(false);
    expect(await sendEmail({ to: ["a@x.fr"], subject: "s", text: "t" })).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envoie via Resend avec l'expéditeur et l'adresse de réponse", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "NOVA <no-reply@nova-serenity.fr>");
    await sendEmail({ to: ["accueil@x.fr"], replyTo: "paul@x.fr", subject: "Badge", text: "Perdu" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer re_test");
    expect(JSON.parse(String(init.body))).toEqual({
      from: "NOVA <no-reply@nova-serenity.fr>", to: ["accueil@x.fr"], subject: "Badge", text: "Perdu", reply_to: "paul@x.fr",
    });
  });

  it("découpe une longue liste d'inscrits en lots en copie cachée, sans doublon", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "no-reply@nova-serenity.fr");
    const bcc = Array.from({ length: 120 }, (_, i) => `p${i}@x.fr`).concat("p0@x.fr");
    const served = await sendEmail({ bcc, subject: "Annulation", text: "…" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const sizes = fetchMock.mock.calls.map((c) => JSON.parse(String((c as unknown as [string, RequestInit])[1].body)).bcc.length);
    expect(sizes).toEqual([49, 49, 22]);
    expect(served).toBe(120);
  });

  it("signale un échec d'envoi", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "no-reply@nova-serenity.fr");
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 422 }));
    await expect(sendEmail({ to: ["a@x.fr"], subject: "s", text: "t" })).rejects.toThrow("422");
  });
});
