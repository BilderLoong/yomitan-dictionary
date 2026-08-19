# Public dictionary release channel

Public full-database releases use an immutable calendar release revision of
`YYYY.MM.DD` with an optional numeric `.N` same-day sequence. The revision is
identical to a manually created Git tag whose commit belongs to `master`.

A release build publishes a stable-named dictionary ZIP, update index, and
checksums through GitHub Releases. It keeps the provenance-bearing build
report inside the release job for verification. Only public full-database
archives announce updates, using the stable latest-release asset URLs; selected
and development archives do not. Failed or bad public releases are followed by
a newer release tag instead of moving or reusing an old tag.
