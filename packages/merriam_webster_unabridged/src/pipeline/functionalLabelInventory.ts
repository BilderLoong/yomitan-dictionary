import {
  type FunctionalLabelResolution,
  normalizeFunctionalLabel,
  resolveFunctionalLabel,
} from "../conversion/functionalLabels";
import type { CanonicalEntryPlan } from "../level1/types";

export type FunctionalLabelOwnerKind = CanonicalEntryPlan["kind"];

export interface FunctionalLabelObservation {
  readonly rowId: number;
  readonly rowKey: string;
  readonly term: string;
  readonly kind: FunctionalLabelOwnerKind;
  readonly rawLabel: string;
}

export interface FunctionalLabelInventoryRow {
  readonly normalizedLabel: string;
  readonly count: number;
  readonly ownerKinds: Readonly<Record<FunctionalLabelOwnerKind, number>>;
  readonly sample: {
    readonly rowId: number;
    readonly rowKey: string;
    readonly term: string;
  };
  readonly status: "fixed" | "unmapped";
  readonly tags: readonly string[];
}

export interface FunctionalLabelInventory {
  readonly labels: readonly FunctionalLabelInventoryRow[];
  readonly labelCount: number;
  readonly unmappedLabels: readonly string[];
}

const normalizedObservations = (
  observations: readonly FunctionalLabelObservation[],
): readonly FunctionalLabelObservation[] =>
  observations
    .map(
      (
        observation: FunctionalLabelObservation,
      ): FunctionalLabelObservation => ({
        ...observation,
        rawLabel: normalizeFunctionalLabel(observation.rawLabel),
      }),
    )
    .filter(
      ({ rawLabel }: FunctionalLabelObservation): boolean =>
        rawLabel.length > 0,
    );

const compareObservations = (
  left: FunctionalLabelObservation,
  right: FunctionalLabelObservation,
): number =>
  left.rowId - right.rowId ||
  left.term.localeCompare(right.term) ||
  left.rowKey.localeCompare(right.rowKey) ||
  left.kind.localeCompare(right.kind);

type NonEmptyFunctionalLabelObservations = readonly [
  FunctionalLabelObservation,
  ...FunctionalLabelObservation[],
];

const hasObservations = (
  observations: readonly FunctionalLabelObservation[] | undefined,
): observations is NonEmptyFunctionalLabelObservations =>
  observations !== undefined && observations.length > 0;

const firstObservation = (
  observations: NonEmptyFunctionalLabelObservations,
): FunctionalLabelObservation =>
  observations.reduce(
    (
      first: FunctionalLabelObservation,
      candidate: FunctionalLabelObservation,
    ): FunctionalLabelObservation =>
      compareObservations(candidate, first) < 0 ? candidate : first,
    observations[0],
  );

const ownerKindCounts = (
  observations: readonly FunctionalLabelObservation[],
): Readonly<Record<FunctionalLabelOwnerKind, number>> => {
  const countFor = (kind: FunctionalLabelOwnerKind): number =>
    observations.filter(
      (observation: FunctionalLabelObservation): boolean =>
        observation.kind === kind,
    ).length;
  return {
    "main-canonical-entry": countFor("main-canonical-entry"),
    "alternative-spelling-canonical-entry": countFor(
      "alternative-spelling-canonical-entry",
    ),
    "drp-phrase-canonical-entry": countFor("drp-phrase-canonical-entry"),
  };
};

const inventoryRow = (
  normalizedLabel: string,
  observations: NonEmptyFunctionalLabelObservations,
): FunctionalLabelInventoryRow => {
  const sample = firstObservation(observations);
  const resolution: FunctionalLabelResolution =
    resolveFunctionalLabel(normalizedLabel);

  return {
    normalizedLabel,
    count: observations.length,
    ownerKinds: ownerKindCounts(observations),
    sample: {
      rowId: sample.rowId,
      rowKey: sample.rowKey,
      term: sample.term,
    },
    status: resolution.kind === "fixed" ? "fixed" : "unmapped",
    tags: resolution.tags,
  };
};

export const buildFunctionalLabelInventory = (
  observations: readonly FunctionalLabelObservation[],
): FunctionalLabelInventory => {
  const normalized = normalizedObservations(observations);
  const labels = Object.entries(
    Object.groupBy(
      normalized,
      ({ rawLabel }: FunctionalLabelObservation): string => rawLabel,
    ),
  )
    .flatMap(
      ([
        normalizedLabel,
        groupedObservations,
      ]): readonly FunctionalLabelInventoryRow[] =>
        hasObservations(groupedObservations)
          ? [inventoryRow(normalizedLabel, groupedObservations)]
          : [],
    )
    .toSorted(
      (
        left: FunctionalLabelInventoryRow,
        right: FunctionalLabelInventoryRow,
      ): number => left.normalizedLabel.localeCompare(right.normalizedLabel),
    );
  return {
    labels,
    labelCount: labels.length,
    unmappedLabels: labels
      .filter(
        ({ status }: FunctionalLabelInventoryRow): boolean =>
          status === "unmapped",
      )
      .map(
        ({ normalizedLabel }: FunctionalLabelInventoryRow): string =>
          normalizedLabel,
      ),
  };
};
