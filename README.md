# Insulation

Prevent unwanted imports between TS or JS folders.

# Usage

```sh
insulate -d directoryToCheck [-f pathToInsulationFile] [-s]
```

-   `-d directoryToCheck`: required, path to the directory which contains the folders to check. Only checks paths that are explicitly declared in the config.
-   `-f pathToInsulationFile`: optional, the file which defines the allowed dependencies. This defaults to `.insulation.json` within the passed -d directory. See the [Insulation File](#insulation-file) section below for more details on formatting.
-   `-s`: silent, optional, makes the script silent so it doesn't log anything. Read script exit values to determine success.

Example:

```sh
insulate -d ./src
```

A useful place to run this command would be in a pre-commit, pre-push, pre-merge, or pre-publish hook that runs tests or linters, etc.

See the [test dir](https://github.com/electrovir/insulation/tree/master/test/test-imports) in the github repo for a couple example usages.

# Insulation File

The Insulation file must be a JSON file. The structure follows that specified below. If a `dirPath` is in the `imports` object that doesn't exist, the config is considered invalid and the command will error. Any other configuration not matching the structure below will also result in errors.

## Config structure

```typescript
{
    imports: {
        [dirPath: string]: {
            allow?: string[];
            block?: string[];
        };
    };
    excludes?: string[];
};
```

-   **`allow`:** is a list of paths that the given `dirPath` can import from. If this is an empty array, `dirPath` isn't allowed to import from anything except itself. If this property is not defined, every import is allowed unless blocked by the `block` property.

-   **`block`:** is a list of paths to explicitly block the given `dirPath` from importing. Any of these paths can be a child of an allowed path and it'll work just as you'd expect (allowing the parent path but blocking the child path). If this array is empty or this property is not defined, nothing is blocked. `block` takes precedence over `allow`. This means that if the same path is both blocked and allowed, it will be considered a block and the Insulation check will fail if imports occur from it.

-   **`excludes`:** is an optional property that can be used to ignore any sub-directory names contained within any of the `dirPaths`, full paths, or regex strings. This automatically includes `node_modules` and `bower_components` so that they are both ignored.

Both `allow` and `block` paths are relative to `directoryToCheck` passed into the cli command.

## Simple example:

`a` can only import from `b`. `b` can import from anything _except_ `a`.

```json
{
    "imports": {
        "a": {
            "allow": ["b"]
        },
        "b": {
            "block": ["a"]
        }
    }
}
```

## Real life example config file

In the following example, folders `back-end` and `front-end` are allowed to import from `common` but not from each other (or anything else for that matter). Also note that because `common`'s `allow` property is an empty array, it is not allowed to import from anything.

```json
{
    "imports": {
        "back-end": {
            "allow": ["common"]
        },
        "front-end": {
            "allow": ["common"]
        },
        "common": {
            "allow": []
        }
    }
}
```
