process.env.BUN_TEST_ENABLE_CONSOLE = "1";

import { expect, it, describe } from "bun:test";
import { db, queryGivenWordRows } from "../src/db";
describe("db test", () => {
  it("should load given word xml", () => {
    const rows = queryGivenWordRows(["what", "word"], db);

    expect(rows.length).toBe(2);

    expect(rows[0].w).toBe("what");
    expect(rows[0].m).toBeDefined();

    expect(rows[1].w).toBe("word");
    expect(rows[1].m).toBeDefined();
  });
});
