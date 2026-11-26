import { describe, expect, it } from "vitest";
import { getEurRate, parseEurRate } from "@/lib/currency";

// Compatibilité (ISO 25010 – 6.3) : l'application coexiste avec une API externe
// et reste fonctionnelle quand celle-ci échoue.
const respond = (body: unknown, ok = true) => (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

describe("API de change TND → EUR", () => {
  it("lit le taux EUR d'une réponse valide", async () => {
    await expect(getEurRate(respond({ result: "success", rates: { EUR: 0.2931 } }))).resolves.toEqual({ rate: 0.2931, source: "open.er-api.com" });
  });

  it("renvoie « indisponible » si l'API répond en erreur", async () => {
    await expect(getEurRate(respond({}, false))).resolves.toEqual({ rate: null, source: "indisponible" });
  });

  it("renvoie « indisponible » si le réseau échoue, sans planter", async () => {
    const failing = (async () => { throw new Error("network down"); }) as unknown as typeof fetch;
    await expect(getEurRate(failing)).resolves.toEqual({ rate: null, source: "indisponible" });
  });

  it("refuse une réponse mal formée", () => {
    expect(parseEurRate({ result: "error" })).toBeNull();
    expect(parseEurRate({ result: "success", rates: { EUR: "0.29" } })).toBeNull();
    expect(parseEurRate({ result: "success", rates: { EUR: -1 } })).toBeNull();
    expect(parseEurRate(null)).toBeNull();
  });
});
