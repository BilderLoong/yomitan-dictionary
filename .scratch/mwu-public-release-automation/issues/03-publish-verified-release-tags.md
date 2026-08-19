# 03 — Publish verified release tags

**What to build:** Pushing a calendar-shaped release tag starts one GitHub
Actions job that proves the tag belongs to `master`, obtains the verified source
database, builds and verifies the public dictionary release, and publishes the
four stable assets as the latest GitHub Release only after every gate passes.

**Blocked by:** 02 — Reject invalid public release assets

**Status:** completed

- [x] The workflow starts for pushed tags beginning with `20` and normal pushes
      to `master` do not start the release workflow
- [x] The tagged commit must be reachable from `master` before source download
      or build begins
- [x] The workflow checks out the event commit explicitly and confirms that the
      remote release tag still identifies that commit before publication
- [x] The workflow has read-only contents permission by default and write
      permission only for the release job
- [x] Concurrency is grouped by the complete Git ref and uses
      `cancel-in-progress: true`
- [x] One GitHub-hosted Ubuntu job has a 90-minute timeout and keeps the source
      database and generated release files on the same runner
- [x] Bun reads its version from repository package metadata instead of a
      duplicated workflow runtime value
- [x] uv does not force a Python version and uses the downloader's script
      metadata when it runs
- [x] Root and dictionary-package dependencies are installed with frozen
      lockfiles
- [x] Source-data tests run before the workflow downloads and verifies only
      `MWU.db`
- [x] The raw source database is not stored in Git, an Actions cache, or an
      ordinary Actions artifact
- [x] The release build receives the tag as its release revision and the tagged
      commit as its converter commit
- [x] Release verification completes before publication
- [x] GitHub CLI verifies the tag, generates change notes, adds release
      provenance, uploads exactly the four stable public release assets, and
      marks the result as the latest stable release
- [x] A failed ancestry, source, build, verification, or upload gate prevents
      successful publication
- [x] Workflow syntax and local non-publication checks pass without creating or
      pushing a tag
