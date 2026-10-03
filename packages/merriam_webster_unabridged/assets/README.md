# Source data

[source-data-manifest.json](source-data-manifest.json) records filenames,
Hugging Face locations, and SHA-256 checksums for the retained source files.

| File | Purpose |
| --- | --- |
| `MWU.db` | SQLite source used to build the dictionary. |
| `Merriam-Webster-Unabridged-2024-MDX.7z` | Original MDX and resource containers, CSS, JavaScript, and cover image. |

Requires Bun, uv, Python 3.10 or later, and rtk. Run these commands from
`packages/merriam_webster_unabridged/` in the main checkout.

## Database

```bash
rtk proxy bun run source:download
```

This downloads `assets/MWU.db` and verifies its checksum.
Worktrees share the main checkout's database.

## Original archive

```bash
rtk proxy uvx --from huggingface_hub==1.27.0 --with 'httpx[socks]' \
  hf buckets cp \
  hf://buckets/Birudo/yomitan-dict-source-data/source/Merriam-Webster-Unabridged-2024-MDX.7z \
  assets/Merriam-Webster-Unabridged-2024-MDX.7z

rtk proxy shasum -a 256 assets/Merriam-Webster-Unabridged-2024-MDX.7z
```

Compare the printed checksum with `artifacts.originalMdxArchive.sha256` in
the manifest before extraction.

Downloaded and extracted data are ignored by Git. Keep the manifest and
this README in Git.
