# Source-data ownership

The main checkout owns the verified `MWU.db` source database. A worktree only
links to that file after verifying it against the worktree's source-data
contract. The Python downloader uses `uv` and the pinned
`huggingface_hub==1.27.0` library so source download does not require a global
installation or the Hugging Face CLI.

## Consequences

- `assets/MWU.db` is downloaded only by the main checkout. A worktree never
  keeps a second database copy.
- The current worktree manifest decides whether the main database is valid.
- A checksum mismatch requires explicit `--replace`; an existing worktree
  database is preserved instead of being deleted automatically.
