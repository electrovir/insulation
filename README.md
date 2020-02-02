# Insulation

Prevent unwanted imports between TS projects.

# Usage

Accessible from within npm scripts.

```sh
insulate -d dirThatContainsProjects [-f pathToInsulationFile] [-s] [-c]
```

-   `-d dirThatContainsProjects`: required, path to the directory which contains the projects to check. Only checks the immediate children of this directory.
-   `-f pathToInsulationFile`: optional, the file which defines the allowed dependencies. This defaults to `.insulation.json` within the passed -d directory. See the [Insulation File](#insulation-file) section below for more details.
-   `-s`: silent, optional, makes the script silent so it doesn't log anything. Read script exit values to determine success.
-   `-c`: compile, optional, instructs Insulation to compile each project it checks. Do not use this if the typescript compile process is already part of your pipeline. This will handle all the project compilation but will make Insulation much slower.

Example:

```sh
insulate -d ./src -c
```

A useful place to run this command would be in a pre-commit, pre-push, pre-merge, or pre-publish hook that runs tests or linters, etc.

See the [test dir](./test) in the repo for a couple example usages.

# Project Requirements

All TS projects that Insulation will check must have a `.tsconfig` (which is what makes it a TS project in the first place) with `outDir` defined in `compilerOptions` as well as `rootDir`. `outDir` can be any folder name desired. `rootDir` must be the same across all projects and must contain all projects. It is recommended that `rootDir` simply be the same as the directory you pass to `-d`.

# Insulation File

The Insulation file must be of JSON format. The top level must be an object with properties names being the project names and their associated values being an array of allowed project names (strings). If, when checking the imports, a project is found which is not defined as a property in the Insulation file, it is assumed that that project is not allowed to have _any_ imports.

The default file used for this is `.insulation.json` within the passed `-d` directory.

See the structure outlined below:

```json
{
    "projectName": ["allowedImport1", "allowedImport2"],
    "projectName2": ["allowedImport3", "allowedImport4"]
}
```

In the following example, projects `back-end` and `front-end` are allowed to import from `common` but not from each other (or anything else). Also note that because `common` is not defined, it is not allowed to import from any projects.

Example:

```json
{
    "back-end": ["common"],
    "front-end": ["common"]
}
```
