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

interface DependencyClosureState {
  readonly pendingRowIds: readonly number[];
  readonly visitedRowIds: readonly number[];
  readonly dependencyRowIds: readonly number[];
  readonly reasons: readonly DependencyEdge[];
}

const uniqueRowIds = (rowIds: readonly number[]): readonly number[] => [
  ...new Set(rowIds),
];

const followDependency = (
  availableRowIds: readonly number[],
  state: DependencyClosureState,
  edge: DependencyEdge,
): Result<DependencyClosureState, MissingDependencyError> => {
  if (!availableRowIds.includes(edge.toRowId)) {
    return {
      ok: false,
      error: { kind: "missing-dependency", target: edge.target },
    };
  }

  const stateWithReason: DependencyClosureState = {
    ...state,
    reasons: [...state.reasons, edge],
  };
  if (state.visitedRowIds.includes(edge.toRowId)) {
    return { ok: true, value: stateWithReason };
  }

  return {
    ok: true,
    value: {
      ...stateWithReason,
      pendingRowIds: [...state.pendingRowIds, edge.toRowId],
      visitedRowIds: [...state.visitedRowIds, edge.toRowId],
      dependencyRowIds: [...state.dependencyRowIds, edge.toRowId],
    },
  };
};

const followDependencies = (
  availableRowIds: readonly number[],
  state: DependencyClosureState,
  edges: readonly DependencyEdge[],
): Result<DependencyClosureState, MissingDependencyError> =>
  edges.reduce<Result<DependencyClosureState, MissingDependencyError>>(
    (
      result: Result<DependencyClosureState, MissingDependencyError>,
      edge: DependencyEdge,
    ): Result<DependencyClosureState, MissingDependencyError> =>
      result.ok
        ? followDependency(availableRowIds, result.value, edge)
        : result,
    { ok: true, value: state },
  );

const closePendingRows = (
  input: DependencyClosureInput,
  state: DependencyClosureState,
): Result<DependencyClosureState, MissingDependencyError> => {
  const currentRowId = state.pendingRowIds[0];
  if (currentRowId === undefined) return { ok: true, value: state };

  const result = followDependencies(
    input.availableRowIds,
    { ...state, pendingRowIds: state.pendingRowIds.slice(1) },
    input.edges.filter(
      (edge: DependencyEdge): boolean => edge.fromRowId === currentRowId,
    ),
  );
  return result.ok ? closePendingRows(input, result.value) : result;
};

export const closeDependencies = (
  input: DependencyClosureInput,
): Result<DependencyClosure, MissingDependencyError> => {
  const rootTraversalIds = uniqueRowIds(input.rootRowIds);
  const result = closePendingRows(input, {
    pendingRowIds: rootTraversalIds,
    visitedRowIds: rootTraversalIds,
    dependencyRowIds: [],
    reasons: [],
  });
  if (!result.ok) return result;

  return {
    ok: true,
    value: {
      rootRowIds: [...input.rootRowIds],
      dependencyRowIds: result.value.dependencyRowIds,
      reasons: result.value.reasons,
    },
  };
};
