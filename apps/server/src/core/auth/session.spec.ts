import { parseSessionToken } from "./session.js";

describe("parseSessionToken", () => {
  it("lit le cookie Better Auth en développement (sans préfixe)", () => {
    expect(parseSessionToken({ cookie: "better-auth.session_token=abc123.sig" })).toBe("abc123");
  });

  it("lit le cookie préfixé par Better Auth en HTTPS (__Secure-)", () => {
    const headers = { cookie: "__Secure-better-auth.session_token=abc123.sig" };
    expect(parseSessionToken(headers)).toBe("abc123");
  });

  it("trouve le cookie même entouré d'autres cookies et URL-encodé", () => {
    const headers = {
      cookie: "theme=dark; __Secure-better-auth.session_token=abc%2B123.sig",
    };
    expect(parseSessionToken(headers)).toBe("abc+123");
  });

  it("accepte un jeton Bearer en priorité", () => {
    const headers = {
      cookie: "better-auth.session_token=cookie",
      authorization: "Bearer header",
    };
    expect(parseSessionToken(headers)).toBe("header");
  });

  it("renvoie undefined sans cookie de session", () => {
    expect(parseSessionToken({ cookie: "theme=dark" })).toBeUndefined();
    expect(parseSessionToken({})).toBeUndefined();
  });
});
