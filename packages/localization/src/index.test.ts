import { describe, expect, it } from "vitest";
import { getLayoutDirection, getTranslation } from "./index.js";

describe("localization", () => {
  it("returns Arabic translations and RTL layout direction", () => {
    const t = getTranslation("ar");
    expect(t.appName).toBe("بطولة هاب");
    expect(getLayoutDirection("ar")).toBe("rtl");
  });

  it("returns French translations and LTR layout direction", () => {
    const t = getTranslation("fr");
    expect(t.appName).toBe("BotolaHub");
    expect(getLayoutDirection("fr")).toBe("ltr");
  });

  it("returns English translations by default", () => {
    const t = getTranslation("en");
    expect(t.appName).toBe("BotolaHub");
    expect(getLayoutDirection("en")).toBe("ltr");
  });
});
