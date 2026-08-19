# Automate public MWU dictionary releases

**Status:** completed

## Problem Statement

The dictionary maintainer can build a full Merriam-Webster Unabridged archive
locally, but the repository does not have one repeatable public release path.
The source database is too large for Git, the current dictionary revision is
hard-coded as development metadata, and GitHub does not yet know how to
download the verified source database, build public release assets, validate
them, or publish them. A manual build can therefore drift from its release tag,
source-data contract, update index, or published checksums.

## Solution

Add one explicit release build that accepts a release revision and converter
commit, downloads only the database identified by the versioned source-data
contract, and produces a stable set of verified release assets. The release
revision is an immutable calendar value that is identical to the release tag
and the dictionary revision. Only this full-database public dictionary release
announces updates.

Add a GitHub Actions workflow that starts when a calendar-shaped tag is pushed,
confirms that the tagged commit belongs to `master`, installs the repository
toolchain from its version sources, downloads and verifies the source database,
runs the release build and release verification, and publishes a GitHub Release
only after every gate succeeds.

## User Stories

1. As a dictionary maintainer, I want to create one calendar release tag, so
   that the tag is the authority for the public dictionary revision.
2. As a dictionary maintainer, I want the release revision to use
   `YYYY.MM.DD`, so that releases sort and read like calendar versions.
3. As a dictionary maintainer, I want an optional positive `.N` sequence, so
   that I can publish more than one release on the same day.
4. As a dictionary maintainer, I want invalid calendar dates rejected, so that
   a value such as `2026.02.30` cannot become a public revision.
5. As a dictionary maintainer, I want release validation independent of runner
   time and timezone, so that an old or future calendar tag can be rebuilt
   deterministically.
6. As a dictionary maintainer, I want the release tag text and dictionary
   revision to be identical, so that users and maintainers see one version.
7. As a dictionary maintainer, I want the tagged converter commit to belong to
   `master`, so that an unmerged feature commit cannot become a public release.
8. As a dictionary maintainer, I want release tags to remain immutable, so that
   one published revision always identifies the same converter commit.
9. As a dictionary maintainer, I want a bad release corrected by a newer tag,
   so that rollback history remains auditable.
10. As a dictionary maintainer, I want the source database excluded from Git,
    so that normal clones remain small.
11. As a dictionary maintainer, I want the release build to download only
    `MWU.db`, so that the original MDX archive is not transferred when it is not
    needed for conversion.
12. As a dictionary maintainer, I want the source database selected by the
    source-data contract, so that the workflow uses the intended source-data
    revision.
13. As a dictionary maintainer, I want the downloaded database verified by
    SHA-256 before use, so that corrupt or changed source data cannot produce a
    release.
14. As a dictionary maintainer, I want the raw database excluded from Actions
    caches and ordinary artifacts, so that the release system does not create
    uncontrolled source copies.
15. As a dictionary maintainer, I want the public release build to always use
    the full database, so that a selected-word archive cannot be published as
    the update archive.
16. As a Yomitan user, I want the public dictionary title to remain
    `Merriam Webster Unabridged`, so that an update matches my installed
    dictionary.
17. As a Yomitan user, I want the public dictionary to announce that it is
    updatable, so that Yomitan can check its update index.
18. As a Yomitan user, I want the update index to identify the same release
    revision as the installed archive, so that update comparison is correct.
19. As a Yomitan user, I want stable latest-release URLs, so that an installed
    dictionary does not need a new URL for every release.
20. As a Yomitan user, I want the update index and update archive URLs to point
    to the GitHub Release assets, so that Yomitan can fetch the next release.
21. As a Yomitan user, I want selected and development archives to remain
    non-updatable, so that local builds do not enter the public update channel.
22. As a dictionary maintainer, I want the standalone update index to equal the
    `index.json` inside the update archive, so that the update offer and
    downloaded dictionary cannot disagree.
23. As a dictionary maintainer, I want stable release asset names, so that
    latest-release URLs do not change across revisions.
24. As a dictionary maintainer, I want SHA-256 checksums for each data-bearing
    release asset, so that downloads can be verified independently.
25. As a dictionary maintainer, I want release provenance to include the
    release revision, converter commit, source-data revision, and database
    checksum, so that a public build can be reproduced and audited.
26. As a dictionary maintainer, I want the existing build totals and findings
    preserved in the public build report, so that release quality remains
    visible.
27. As a dictionary maintainer, I want a release verification command, so that
    the same asset contract is checked locally and in GitHub Actions.
28. As a dictionary maintainer, I want malformed, missing, oversized, or
    inconsistent release assets to fail verification, so that GitHub never
    publishes an incomplete release.
29. As a dictionary maintainer, I want a second workflow run for the same tag
    to cancel the older run, so that only the newest attempt continues.
30. As a dictionary maintainer, I want releases for different tags to use
    separate concurrency groups, so that one revision does not cancel another
    revision.
31. As a dictionary maintainer, I want the workflow to read the Bun version
    from the repository package metadata, so that the workflow does not
    duplicate the runtime version.
32. As a dictionary maintainer, I want `uv` to select Python from the
    downloader script metadata, so that the workflow does not duplicate the
    Python requirement.
33. As a repository owner, I want the workflow to have read-only permissions
    until the publication job needs release write access, so that its token has
    the minimum useful authority.
34. As a dictionary maintainer, I want generated GitHub release notes plus
    release provenance, so that users can see changes and maintainers can audit
    the build.
35. As a dictionary maintainer, I want a failed build or failed verification to
    stop before publication, so that a broken release is not visible as latest.
36. As a dictionary maintainer, I want a successful publication to become the
    latest stable GitHub Release, so that the stable update URLs resolve to it.
37. As a dictionary maintainer, I want the first public archive tested through
    Yomitan's update behavior before I create its release tag, so that the
    update channel is proven with the host application.

## Implementation Decisions

- A release revision has the exact form `YYYY.MM.DD` with an optional positive
  integer `.N` sequence. Month and day are zero-padded. The date must exist in
  the Gregorian calendar. A sequence must not be zero or have leading zeroes.
- Date validation uses only the supplied release revision. It does not compare
  the value with the runner clock or timezone.
- The release revision is supplied explicitly to the release command. The
  converter commit is also supplied explicitly and must be a full Git commit
  SHA for release provenance.
- A release build is a dedicated full-database operation. It does not accept a
  selected-word list and does not add release behavior to selected or
  development builds.
- Dictionary-index construction has one shared source of metadata for both the
  archive index and the standalone update index. The two serialized index
  objects must be equal.
- The stable dictionary title is `Merriam Webster Unabridged`.
- The public dictionary index sets `isUpdatable` to true. Its stable index URL
  is the GitHub latest-release URL for
  `Merriam-Webster-Unabridged.index.json`, and its stable download URL is the
  GitHub latest-release URL for `Merriam-Webster-Unabridged.zip`.
- Public release metadata is present only in a release build. Existing selected
  and development archives remain outside the public update channel.
- A release build produces these public release assets with stable names:
  `Merriam-Webster-Unabridged.zip`,
  `Merriam-Webster-Unabridged.index.json`, `SHA256SUMS`, and
  `build-report.json`.
- `SHA256SUMS` uses the conventional lowercase SHA-256 format with two spaces
  between each digest and filename. It covers the update archive, update
  index, and public build report; it does not list itself.
- The public build report preserves the normal full-build report and adds
  release provenance containing the release revision, release tag, converter
  commit, source-data revision, source database filename, and source database
  SHA-256.
- Provenance notes are generated from the same release inputs and
  source-data contract as the public build report. It is used during
  publication but is not a public release asset.
- Release assembly writes into a dedicated generated release directory. It
  does not replace the existing development build directory contract.
- The release verifier reads only generated release files and ZIP content. It
  verifies required filenames, revision equality, stable title, update flags,
  stable URLs, internal and standalone index equality, checksum correctness,
  provenance consistency, absence of build errors, and the GitHub per-asset
  size limit.
- The source downloader remains the only source-acquisition implementation.
  The workflow runs its tests, then uses it to download and verify only the
  database from the public Hugging Face bucket.
- The raw source database is never committed, cached, or uploaded as an
  Actions artifact.
- The workflow starts on a pushed tag whose text starts with `20`. The release
  command performs the complete calendar validation.
- The workflow fetches `master` and uses Git ancestry to require the tagged
  commit to be reachable from `master`. Branch and tag event filters are not
  treated as an AND condition.
- Workflow concurrency is grouped by the complete Git ref and uses
  `cancel-in-progress: true`.
- The workflow uses one GitHub-hosted Ubuntu job. This keeps the database and
  generated archive on one runner and avoids transferring them through Actions
  artifacts.
- The job timeout is 90 minutes. The current measured full build is about 14
  minutes, leaving time for the database download, verification, dependency
  install, and publication.
- The workflow installs both root and dictionary-package dependencies with
  frozen lockfiles because the current dictionary package uses dependencies
  owned by both package scopes.
- The Bun setup action reads the Bun version from the root `packageManager`
  field. The workflow does not repeat the Bun version.
- The uv setup action does not force a Python version. `uv run` respects the
  Python requirement in the downloader's PEP 723 script metadata and can
  install a compatible Python when needed.
- GitHub action references keep required major-version refs. Runtime-version
  deduplication does not remove the `@ref` that GitHub requires for an action.
- The workflow has read-only repository contents permission by default. The
  release job receives contents write permission for GitHub Release creation.
- GitHub CLI verifies that the tag exists, generates change notes, prepends
  release provenance, uploads exactly the four public release assets, and marks
  the publication as the latest stable release.
- Draft releases and prereleases are not part of the public update channel.
- The workflow file must exist in the commit identified by the release tag.
- `minimumYomitanVersion` remains omitted until a stable compatibility version
  has been verified.
- Before the first public tag is created, the maintainer performs one
  controlled Yomitan update test from an older release revision to the new
  update index and update archive. This is a first-release operational gate,
  not a new compatibility promise in dictionary metadata.

## Testing Decisions

- A good test observes public command results, generated files, serialized
  dictionary metadata, ZIP content, or GitHub workflow behavior. Tests do not
  assert private helper calls or internal call order.
- The primary automated seam is the release-build operation with a temporary
  full source database and temporary output directory. This seam exercises
  full conversion, archive creation, public metadata, standalone index,
  provenance, checksums, and release-asset assembly without the production
  database cost.
- The release command parser has focused boundary tests for a valid base
  revision, a valid same-day sequence, impossible dates, missing zero padding,
  zero or padded sequences, missing arguments, and malformed commit SHAs.
- The release verifier runs against the assets produced by the primary seam.
  Tests then corrupt or remove one externally visible item at a time to prove
  that revision, index, URL, checksum, provenance, error-count, file-presence,
  and size failures are reported.
- The internal archive index and standalone update index are parsed and
  compared as data. Byte formatting differences do not hide semantic equality,
  and any data difference fails verification.
- Existing full-mode integration tests remain the prior art for building a
  complete temporary source database. Existing archive tests remain the prior
  art for reading ZIP JSON and validating serialized behavior.
- Existing source-data tests remain the contract for manifest validation,
  checksum verification, main-checkout download behavior, and worktree link
  behavior.
- Development-build tests prove that selected and normal full builds do not
  gain public update metadata.
- Workflow syntax is checked locally. Its shell ancestry gate is kept small and
  uses the documented Git command directly.
- A production release verification run uses the real verified `MWU.db`, runs
  the release build with a non-published test revision and converter commit,
  and verifies all generated assets. It does not create or push a Git tag and
  does not publish a GitHub Release.
- Before the first real release tag, a controlled Yomitan update test confirms
  that Yomitan detects the newer release revision, reads the update index,
  downloads the update archive, and imports the same stable dictionary title.

## Out of Scope

- Storing `MWU.db` or the original MDX archive in Git, Git LFS, Actions caches,
  or ordinary Actions artifacts.
- Publishing the raw source database or original MDX archive as GitHub Release
  assets.
- Downloading the original MDX archive during a release build.
- Publishing selected-word or development archives through the public update
  channel.
- Moving, reusing, deleting, or rewriting a published release tag as a rollback
  mechanism.
- Automatically creating release tags from ordinary pushes to `master`.
- Automatically releasing every code change without an explicit release tag.
- Adding draft or prerelease channels.
- Adding a `minimumYomitanVersion` before compatibility has been established.
- Adding a Hugging Face fallback for an update archive larger than GitHub's
  per-asset limit. This decision remains deferred.
- Adding a self-hosted or larger GitHub runner before the hosted-runner path is
  measured and shown to be insufficient.
- Automating the first-release Yomitan browser update test in GitHub Actions.

## Further Notes

- The current full archive is approximately 48.1 MB, which is below GitHub's
  2 GiB per-asset limit. The large operational cost is the verified source
  database download, not the public update archive.
- The source database and original MDX archive have confirmed public
  redistribution permission from the user.
- The public source-data bucket is owned by `Birudo`; the repository release
  URLs are owned by `BilderLoong/yomitan-dictionary`.
- A release workflow is an execution mechanism, not the release policy. The
  release revision, public dictionary release, update index, update archive,
  release provenance, and rollback release contracts remain defined by the
  project glossary and release-channel ADR.
