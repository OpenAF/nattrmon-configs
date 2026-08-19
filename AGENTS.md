# Repository Guidelines

## Project Structure & Module Organization

This repository packages reusable nAttrMon configuration families. Each family (for example, `K8s/`, `RAID/`, `S3/`, `ES/`, `Pinot/`, and `Presto/`) keeps custom JavaScript input constructors in `objects/`, with a matching YAML description in `objects.meta/`. Runnable configuration examples live in `inputs/`; inactive templates live in `inputs.disabled/`. Family-specific assets belong in `objects.assets/`. Keep package contents synchronized with the `files` and `filesHash` entries in `.package.yaml`.

`OBJECTS-METADATA.md` defines the metadata schema. `utils/createConfig.yaml` creates a baseline nAttrMon configuration and copies selected family files.

## Build, Test, and Development Commands

OpenAF and nAttrMon are required locally. There is no standalone test runner in this repository.

- `ojob utils/createConfig.yaml path=/tmp/nattrmon-config`: create an empty local configuration; add `bases=K8s` (or another family) to copy a base configuration.
- `ojob -e 'oPack("genpack . --exclude .github")'`: generate the oPack using the same operation as CI.
- `git diff --check`: catch whitespace errors before committing.

When changing a constructor, validate it in an nAttrMon runtime with the relevant input configuration and required service credentials. Do not enable files under `inputs.disabled/` merely for testing.

## Coding Style & Naming Conventions

Use the existing OpenAF JavaScript style: four-space indentation, `camelCase` parameters, and constructor names such as `nInput_S3Buckets`. Keep constructors in files named exactly after the constructor (`objects/nInput_S3Buckets.js`). Use two-space YAML indentation and quote only values that YAML could misinterpret.

Every custom constructor needs a matching `objects.meta/nInput_*.yaml` file. Keep its `constructor`, arguments, defaults, and types aligned with implementation. Link a disabled example when one exists. Use placeholders and `secret: true` for credentials; never commit real endpoints, tokens, passwords, or keys.

## Testing Guidelines

Treat the supplied YAML examples as integration fixtures. Verify modified inputs against a safe target service and check metadata through `nattrmon.getObjectsMeta()` and `nattrmon.getObjectsMetaIssues()`. Test both required and optional arguments, including connection failure behavior.

## Commit & Pull Request Guidelines

Recent history uses short imperative subjects, often scoped, such as `K8s/nInput_K8SClusterMetrics: Refactor ...` and `chore(ci): update GitHub Actions ...`. Keep commits focused by configuration family. PRs should explain the monitored behavior, list changed constructors/configuration examples/metadata, link related issues, and include validation details. Update `.package.yaml` whenever package contents change; CI generates the package and refreshes the version badge on `main`.
