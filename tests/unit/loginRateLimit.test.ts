import { describe, expect, it } from "vitest";
import { LOGIN_WINDOW_MS, MAX_LOGIN_FAILURES, createLoginRateLimiter } from "@/lib/loginRateLimit";

// Sécurité (ISO 25010 – 6.6, OWASP A07) : blocage après des échecs de connexion répétés.
describe("Limitation des tentatives de connexion", () => {
  it("bloque après exactement 5 échecs, pas avant", () => {
    const limiter = createLoginRateLimiter(() => 0);
    for (let i = 1; i < MAX_LOGIN_FAILURES; i += 1) {
      limiter.recordFailure("owner@test.local");
      expect(limiter.isBlocked("owner@test.local")).toBe(false);
    }
    limiter.recordFailure("owner@test.local");
    expect(limiter.isBlocked("owner@test.local")).toBe(true);
  });

  it("une connexion réussie remet le compteur à zéro", () => {
    const limiter = createLoginRateLimiter(() => 0);
    for (let i = 0; i < 4; i += 1) limiter.recordFailure("owner@test.local");
    limiter.reset("owner@test.local");
    limiter.recordFailure("owner@test.local");
    expect(limiter.isBlocked("owner@test.local")).toBe(false);
  });

  it("le blocage se lève après 15 minutes", () => {
    let clock = 0;
    const limiter = createLoginRateLimiter(() => clock);
    for (let i = 0; i < MAX_LOGIN_FAILURES; i += 1) limiter.recordFailure("owner@test.local");
    expect(limiter.isBlocked("owner@test.local")).toBe(true);
    clock = LOGIN_WINDOW_MS + 1;
    expect(limiter.isBlocked("owner@test.local")).toBe(false);
  });

  it("chaque email a son propre compteur", () => {
    const limiter = createLoginRateLimiter(() => 0);
    for (let i = 0; i < MAX_LOGIN_FAILURES; i += 1) limiter.recordFailure("a@test.local");
    expect(limiter.isBlocked("a@test.local")).toBe(true);
    expect(limiter.isBlocked("b@test.local")).toBe(false);
  });
});
