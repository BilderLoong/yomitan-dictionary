import { expect, test } from "bun:test";

import {
  closeDependencies,
  type DependencyEdge,
} from "../../src/level1/closeDependencies";

test("closes transitively, deduplicates cycles, and retains reasons", () => {
  const edges: readonly DependencyEdge[] = [
    { fromRowId: 1, toRowId: 2, target: "o'" },
    { fromRowId: 2, toRowId: 3, target: "oh" },
    { fromRowId: 3, toRowId: 2, target: "o'" },
  ];
  const result = closeDependencies({
    rootRowIds: [1],
    availableRowIds: [1, 2, 3],
    edges,
  });

  expect(result).toEqual({
    ok: true,
    value: {
      rootRowIds: [1],
      dependencyRowIds: [2, 3],
      reasons: edges,
    },
  });
});

test("fails when a canonical owner is unavailable", () => {
  const result = closeDependencies({
    rootRowIds: [1],
    availableRowIds: [1],
    edges: [{ fromRowId: 1, toRowId: 9, target: "oh" }],
  });

  expect(result).toEqual({
    ok: false,
    error: { kind: "missing-dependency", target: "oh" },
  });
});
