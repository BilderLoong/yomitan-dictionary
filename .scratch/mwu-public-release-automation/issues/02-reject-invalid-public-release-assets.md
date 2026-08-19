# 02 — Reject invalid public release assets

**What to build:** A dictionary maintainer can run one verification command
against generated release files before publication. The command confirms that
the release asset contract is complete and internally consistent, and it
returns failure for a release that GitHub or Yomitan must not receive.

**Blocked by:** 01 — Build public release assets

**Status:** completed

- [x] Verification requires the three stable public release asset names
- [x] Verification confirms that the archive index and standalone update index
      contain equal data
- [x] Verification confirms the expected release revision, stable title,
      updatable flag, and stable GitHub latest-release URLs
- [x] Verification confirms every checksum against current file bytes
- [x] Verification confirms that release provenance agrees with the expected
      revision, archive metadata, converter commit, and source-data contract
- [x] Verification requires the expected converter commit and rejects a build
      report with selected roots
- [x] Verification fails when the internal build report contains build errors
- [x] Verification fails when a required asset is absent or malformed
- [x] Verification fails when one asset is at or above GitHub's 2 GiB per-asset
      limit because the external-hosting fallback is deferred
- [x] Focused tests corrupt or remove each externally visible contract item and
      prove that verification returns a useful failure
- [x] Verification succeeds against an unmodified temporary release produced
      by Ticket 01
