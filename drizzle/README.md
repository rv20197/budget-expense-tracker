# Stale directory — do not use

This directory is a legacy artifact from an earlier project configuration when
`drizzle.config.ts` wrote migrations here. The config now targets
`src/db/migrations/` as the authoritative migration output directory.

The two SQL files here (`0000_brown_enchantress.sql`, `0001_new_magik.sql`) are
byte-for-byte copies of the same files in `src/db/migrations/`. This directory
and its contents can be safely deleted once the team confirms they are not used
by any CI or deployment pipeline.
