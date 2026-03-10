import { buildPathOption, getBasePath, getLeafPath, normalizePath } from "@core/public";

describe("pathSemantic", () => {
  test("base and leaf path work", () => {
    expect(normalizePath(" 闪念 / 事件 ")).toBe("闪念/事件");
    expect(getBasePath("闪念/事件")).toBe("闪念");
    expect(getLeafPath("闪念/事件")).toBe("事件");
  });

  test("buildPathOption returns label/value pair", () => {
    expect(buildPathOption("闪念/思考")).toEqual({ label: "思考", value: "闪念/思考" });
  });
});
