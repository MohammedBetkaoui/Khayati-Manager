# Khayati Manager backup format

## Scope

This module implements backup creation and validation only. It does not expose
an HTTP endpoint, Electron IPC, a React interface, or any restore operation.

## KMB container

A `.kmb` file is a gzip-compressed tar stream. The extension deliberately hides
that technical detail from end users. Version 1 contains:

```text
manifest.json
database/khayati.sqlite
assets/workshop-logo.<ext>   (only when configured and readable)
assets/workshop-stamp.<ext>  (only when configured and readable)
```

Generated PDFs, bundled fonts/icons, application builds, logs, and temporary
files are never included. General settings and workshop settings already live
inside SQLite, so they are not duplicated into a second `settings.json` source
of truth. Embedded `data:image/...` logo/stamp values are already protected by
the SQLite snapshot.

## Creation guarantees

1. `better-sqlite3.backup()` creates a coherent snapshot of the active DB.
2. The snapshot is reopened read-only, checked with `PRAGMA quick_check`, and
   verified against `CURRENT_SCHEMA_VERSION` and the TypeORM baseline.
3. Every database/asset file receives its own SHA-256 and byte size.
4. Packaging streams files through tar and gzip instead of loading the database
   into memory.
5. The staged archive is extracted and fully validated in a separate temporary
   directory.
6. The archive is streamed to a unique `.partial-*` file at the destination,
   compared by SHA-256, and atomically renamed to the requested `.kmb` name.
7. The final destination archive is extracted, checksummed, and its SQLite
   snapshot is opened again.
8. Temporary workspaces and incomplete destination files are removed on success
   and failure.

The service never overwrites an existing `.kmb` file and serializes backup
creation so two operations cannot run concurrently in the same process.

## Assets and warnings

Only the two non-reconstructible local assets currently referenced by the data
model are collected: `workshop_settings.logoPath` and `stampPath`. Missing,
remote, non-file, or unreadable paths do not invalidate the database backup;
they generate a structured manifest warning without exposing an absolute source
path. The manifest maps each included asset back to its database field so a
future restore can relocate it on another PC.

## Manifest

The manifest records the KMB format version, application version, schema and
SQLite versions, creation time, database metadata, asset mappings, per-file
checksums, non-blocking warnings, and table row counts used only for a future
restore preview. It contains no customer names, phone numbers, salaries, debt
amounts, or other business records.

`encryption.mode` is explicitly `NONE` in format version 1. This makes future
encryption evolution explicit without introducing a machine-bound key that
could make a backup impossible to open on a new computer.

## Developer command

From `backend`:

```powershell
npm run backup:create -- "C:\Backups\KhayatiManager_Backup_2026-08-30_15-30.kmb"
```

The destination directory must already exist and be writable. Existing files
are intentionally refused.

## Secure restore

Restore never runs migrations or integrity checks against the active database.
The selected KMB is first preflighted without writing files, a normal KMB safety
backup is stored in `SafetyBackups`, and only then is the strict allow-listed
archive extracted into a unique `restore-*` workspace. Absolute paths, Windows
drive paths, traversal segments, links, duplicate entries, unexpected files,
size mismatches, and checksum mismatches are refused.

The extracted SQLite database is copied, checked with `integrity_check` and
`foreign_key_check`, migrated in isolation when its schema is older, and checked
again against the centralized critical-table list. Workshop logo/stamp files are
copied under the destination computer's `userData/assets/workshop` directory and
their paths are rewritten only in the temporary database.

After every check succeeds, the migrated database is staged beside the active
database. TypeORM is closed, the active file is renamed, and the staged file is
atomically activated. A failed activation immediately restores the previous
file; a failed final validation also rolls back before TypeORM is reopened. The
pre-restore KMB is never deleted automatically.
