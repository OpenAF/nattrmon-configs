# Object metadata

Each configuration family provides declarative object documentation in an `objects.meta/` directory next to its `objects/` directory. nAttrMon reads this metadata without evaluating or instantiating the corresponding object, so configuration editors and documentation tools can discover custom inputs safely.

There is one YAML file per constructor. It follows the nAttrMon object-metadata format and declares `kind`, `constructor`, `title`, `description`, linked disabled-config `examples`, and argument `name`, `type`, `description`, and `example`.

For example:

```yaml
kind: input
constructor: nInput_Example
title: Example input
description: Collects example data.
examples:
  - Example/inputs.disabled/01.example.yaml
arguments:
  - name: endpoint
    type: string
    required: true
    description: Endpoint to query.
    example: https://service.example/api
```

Use `secret: true` and placeholders for passwords, tokens, private keys, and credential maps. Metadata documents configuration; it does not replace runtime validation in the constructor.

Optional argument fields are `required`, `default`, `secret`, `unit`, `enum`, `deprecated`, `visibleWhen`, and `query`. `query` maps a path relative to the argument value to a query dialect understood by nAttrMon's configuration engine. Use `jmespath` for `$path` expressions, `dotpath` for `ow.obj.getPath`/`$$().get` paths, and `nlinq`, `nlinqText`, or `nlinqAny` for nLinq expressions. Quote YAML keys containing brackets, such as `"[].selector"`.

`utils/createConfig.yaml` creates an `objects.meta/` directory and copies a base family's metadata along with its objects. Therefore, when a family such as `S3` or `Presto` is used as a base configuration, its metadata lands in the target config root and is discovered by nAttrMon's `getObjectsMeta()` API. A local metadata entry overrides a package entry with the same constructor.

From an OpenAF console or another object, query the resulting registry with:

```javascript
nattrmon.getObjectsMeta()                         // all known objects
nattrmon.getObjectsMeta("input")                  // inputs only
nattrmon.getObjectsMeta("input", "nInput_S3Buckets")
nattrmon.getObjectsMetaIssues()                    // invalid/unreadable metadata files
```

The catalog covers every custom object in ES, K8s, Pinot, Presto, RAID, S3, and nAttrMon. Add or update the matching metadata file whenever an object's configuration arguments change, and link a runnable disabled configuration under `examples` whenever one exists.
