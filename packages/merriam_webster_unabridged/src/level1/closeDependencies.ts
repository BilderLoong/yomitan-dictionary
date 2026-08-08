import type { Result } from "../shared/result";

export interface DependencyEdge {
  readonly fromRowId: number;
  readonly toRowId: number;
  readonly target: string;
}

export interface DependencyClosure {
  readonly rootRowIds: readonly number[];
  readonly dependencyRowIds: readonly number[];
  readonly reasons: readonly DependencyEdge[];
}

export type MissingDependencyError = {
  readonly kind: "missing-dependency";
  readonly target: string;
};

interface DependencyClosureInput {
  readonly rootRowIds: readonly number[];
  readonly availableRowIds: readonly number[];
  readonly edges: readonly DependencyEdge[];
}

const uniqueRowIds = (rowIds: readonly number[]): readonly number[] => [
  ...new Set(rowIds),
];

type FollowResult =
  | { readonly ok: true; readonly isNewRow: boolean }
  | { readonly ok: false; readonly error: MissingDependencyError };

const followDependency = (
  availableRowIds: ReadonlySet<number>,
  visitedRowIds: ReadonlySet<number>,
  edge: DependencyEdge,
): FollowResult => {
  if (!availableRowIds.has(edge.toRowId)) {
    return {
      ok: false,
      error: { kind: "missing-dependency", target: edge.target },
    };
  }
  return {
    ok: true,
    isNewRow: !visitedRowIds.has(edge.toRowId),
  };
};

export const closeDependencies = (
  input: DependencyClosureInput,
): Result<DependencyClosure, MissingDependencyError> => {
  const availableRowIds = new Set(input.availableRowIds);
  const rootTraversalIds = uniqueRowIds(input.rootRowIds);
  const visitedRowIds = new Set(rootTraversalIds);
  const dependencyRowIds: number[] = [];
  const reasons: DependencyEdge[] = [];
  const edgesByFromRowId = new Map<number, readonly DependencyEdge[]>();
  for (const edge of input.edges) {
    const existing = edgesByFromRowId.get(edge.fromRowId);
    edgesByFromRowId.set(
      edge.fromRowId,
      existing === undefined ? [edge] : [...existing, edge],
    );
  }

  const pendingRowIds = [...rootTraversalIds];
  let cursor = 0;
  while (cursor < pendingRowIds.length) {
    const currentRowId = pendingRowIds[cursor];
    cursor += 1;
    if (currentRowId === undefined) continue;

    const edges = edgesByFromRowId.get(currentRowId) ?? [];
    for (const edge of edges) {
      const result = followDependency(availableRowIds, visitedRowIds, edge);
      if (!result.ok) return result;
      reasons.push(edge);
      if (!result.isNewRow) continue;
      visitedRowIds.add(edge.toRowId);
      dependencyRowIds.push(edge.toRowId);
      pendingRowIds.push(edge.toRowId);
    }
  }

  return {
    ok: true,
    value: {
      rootRowIds: [...input.rootRowIds],
      dependencyRowIds,
      reasons,
    },
  };
};
