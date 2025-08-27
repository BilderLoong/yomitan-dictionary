# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Yomitan dictionary project that processes Merriam-Webster Unabridged dictionary data and converts it to Yomitan-compatible format. The project consists of multiple packages:

- `merriam_webster_unabridged`: Main dictionary parser and builder
- `dictionary-splitter`: Utility for zipping folders (currently minimal implementation)
- `playground`: Development and testing playground

## Development Commands

### Build Commands
```bash
# Build Merriam-Webster dictionary (from merriam_webster_unabridged package)
bun run src/index.ts --limit 5000 --additional-words-list-file tests/testWords.txt

# Build with custom options
bun run src/index.ts --limit 10000
```

### Test Commands
```bash
# Run unit tests
bun test

# Debug unit tests with VS Code
bun test --inspect-wait=/vscode

# Test dictionary import
bun run tests/import_dict.ts "build/Merriam Webster Unabridged.zip"
```

### Utility Commands
```bash
# Unzip built dictionary for inspection
7z x "build/Merriam Webster Unabridged.zip" -o"build/Merriam Webster Unabridged"

# Format JSON files in build directory
npx prettier -w --ignore-path=../../.gitignore "build/Merriam Webster Unabridged" *.json
```

## Key Dependencies

- **yomichan-dict-builder**: Core dictionary building library
- **cheerio**: HTML parsing for MDX dictionary content
- **commander**: CLI argument parsing
- **playwright**: Browser automation for testing
- **bun**: JavaScript runtime (primary development environment)

## Architecture

The main dictionary processing workflow:
1. MDX dictionary files are converted to SQLite format using pyglossary
2. HTML content is parsed using cheerio to extract structured data
3. Dictionary entries are built using yomichan-dict-builder
4. Final dictionary is packaged as a ZIP file for Yomitan extension

## File Structure

- `packages/merriam_webster_unabridged/src/`: Main source code
  - `index.ts`: CLI entry point and dictionary builder
  - `parser.ts`: MDX HTML parsing logic
  - `db.ts`: SQLite database operations
- `packages/merriam_webster_unabridged/tests/`: Test files
  - Unit tests use bun:test framework
- `packages/merriam_webster_unabridged/assets/`: Dictionary source files
  - MDX format dictionary files and resources

## Development Notes

- The project uses Bun as the primary runtime
- Dictionary building processes large datasets (use --limit for development)
- MDX HTML parsing is complex due to nested definition structures
- Tests include both unit tests and integration tests with actual dictionary data


## Code requirements

### Programming paradigm

-   Using functional style programming as much as possible.
    -   Constrain side effects as much as possible in every part of the code base.
        -   **Isolate and explicitly manage unavoidable side effects (e.g., I/O, date/time, random number generation). Consider techniques like passing effectful computations as values (e.g., thunks, I/O monads if applicable) or confining them to specific, well-defined parts of the system.**

    -   **Pure Functions:**
        -   Functions should be deterministic: given the same input, they always return the same output.
        -   Functions should have no side effects (no mutation of external state, no I/O, no calling non-pure functions unless explicitly managed).
        -   Acknowledge that side effects (I/O, DOM manipulation, API calls, logging to console/file, generating random numbers, getting current time) are necessary for any useful application.
        -   Push side effects to the "edges" of your system or manage them through controlled mechanisms (e.g., returning descriptions of effects to be executed by a separate handler, or using constructs like IO Monads in languages that support them).
        -   Keep the core logic pure.

    -   Utilize **higher-order** functions (functions that take other functions as arguments or return them as results).
        -   **Favor function composition: Combine smaller, focused functions to build more complex ones. Aim for a pipeline style where data flows through a series of transformations.**
        -   **Employ currying and partial application where it enhances readability and reusability by creating specialized functions from more general ones.**
        -   Examples: `map`, `filter`, `reduce`, `sort` (with a custom comparator function), `flatMap`, `forEach` (use with caution, often implies side effects).
       -   Utilize functions that take other functions as arguments or return functions as results.

    -   **Function Composition:**
        -   Combine two or more functions to produce a new function or perform a computation. E.g., `h(x) = f(g(x))`.
        -   This promotes creating small, focused functions that can be pieced together.

    -   **Immutability:**
        -   Data structures, once created, should not be altered.
        -   Operations that "modify" data should return a new instance with the changes, leaving the original untouched.
        -   This greatly simplifies reasoning about state and reduces side effects.

    -   Favor **declarative over imperative style**: Describe *what* the program should accomplish rather than *how* it should accomplish it (e.g., using `map`, `filter`, `reduce` instead of explicit loops).
    -   Prefer recursion over explicit loops where it enhances clarity and maintains purity (avoiding mutable loop counters).
        -   **Be mindful of stack overflow potential with deep recursion; use tail call optimization if supported by the language/environment, or convert to an iterative process if necessary while still maintaining functional principles (e.g., using a reducer).**

    -   Strive for referential transparency: A function call with the same inputs should always produce the same output and have no other observable effect.

    -   Utilize Algebraic Data Types (ADTs) to model your domain accurately and handle states/cases explicitly (e.g., `Option`/`Maybe` for optional values, `Result`/`Either` for operations that can fail).

    -   Leverage **pattern matching** (if available in the language) for elegant and safe deconstruction of ADTs and other data structures.

    -   Consider data-last function signatures (e.g., `(data, fn)` or `fn(data)`) to improve composability, especially with currying.
    -   (Optional) Expression-Oriented Programming: Prefer expressions that evaluate to a value over statements that perform actions. For example, using a ternary operator or pattern matching instead of if-else statements where appropriate.
-   **NO OOP stuff.**
    -   **No Classes or `this` keyword (in the OOP sense):** Avoid defining behavior within class structures where `this` refers to an instance.
    -   **No Inheritance (class-based):** Do not use class inheritance for code reuse or polymorphism. Favor composition and passing functions.
    -   **No Encapsulation (in the OOP sense of bundling data with methods that operate on that data, often with private state):** Data and functions that operate on that data are generally separate. Data structures are typically plain and functions transform them.
    -   **Focus on Data Transformation:** Think of programs as pipelines of functions transforming data from one form to another.

### Code standard

-   **KEEP CODE simple and concise.**
    -   **Single Responsibility Principle (for functions):** Each function should do one thing and do it well.
    -   **Avoid Premature Optimization:** Write clear code first; optimize only when and where necessary, backed by profiling.
    -   **YAGNI (You Ain't Gonna Need It):** Don't add functionality until it's truly required.
    -   **DRY (Don't Repeat Yourself):** Abstract common logic into reusable functions.
-   **Add necessary comment, no more no less.**
    -   **Explain *why*, not *what*:** Code should be self-documenting for *what* it does. Comments should explain complex logic, non-obvious decisions, or the reasoning behind a particular approach.
    -   **Docstrings/API Documentation:** For public functions or modules, use standard documentation formats (e.g., JSDoc, Python Docstrings) to describe purpose, parameters, return values, and any exceptions/errors.
    -   **Avoid commented-out code:** Use version control for history.
-   **Clear typing code no matter the programming language is dynamic or static.**
    -   **Explicit Type Annotations:**
        -   For **statically-typed languages** (TypeScript, Java, C#, Go, Rust, Haskell): Use the language's type system to its full extent.
        -   For **dynamically-typed languages** (Python, JavaScript, Ruby):
            -   Use type hints (Python), JSDoc (JavaScript), or other annotation systems (e.g., Sorbet for Ruby).
            -   These improve readability, help static analysis tools, and catch errors earlier.
    -   **Specificity over Generality (for types):**
        -   Avoid `any`, `object`, `interface{}` (Go), `Object` (Java) unless absolutely necessary and well-justified.
        -   Define specific interfaces, types, or data structures (e.g., `type User = { id: string; name: string; }` instead of `object`).
        -   For collections, specify the type of elements (e.g., `List<string>`, `Array<User>`, `Map<string, number>`).
    -   **Function Signatures:** Clearly type all function parameters and return values.
    -   **Data Structures:** If dealing with complex data structures, define their shape explicitly (e.g., using `type` or `interface` in TS, `dataclasses` or `TypedDict` in Python).
-   **Naming Conventions:**
    -   Use clear, descriptive, and consistent names for variables, functions, and types.
    -   Follow language-specific conventions (e.g., `camelCase` for functions/variables and `PascalCase` for types in JavaScript/TypeScript; `snake_case` for functions/variables and `PascalCase` for classes/types in Python).
-   **Formatting and Linting:**
    -   Use an automated formatter (e.g., Prettier, Black, gofmt) to ensure consistent code style.
    -   Use a linter (e.g., ESLint, Pylint, RuboCop) to catch potential errors and enforce style rules.
    -   Establish and follow rules for indentation, spacing, line length, etc.
-   **Modularity and File Structure:**
    -   Organize code into logical modules/files with clear responsibilities.
    -   Minimize dependencies between modules.
    -   Strive for high cohesion within modules and low coupling between them.
-   **Error Handling:**
    -   Use explicit error handling mechanisms appropriate for functional programming (e.g., `Result` types, `Either` monads, returning error values alongside results) rather than relying solely on exceptions for expected error conditions.
    -   Avoid swallowing errors; propagate them or handle them appropriately.
-   **Testing:**
    -   Write unit tests for pure functions, which are inherently easy to test.
    -   Strive for good test coverage, especially for core logic.
-   **Readability:**
    -   Prioritize making code easy to read and understand by other developers (and your future self). This is an overarching goal that many of the above points contribute to.
-   **Consistency:**
    -   Whatever patterns, conventions, or styles are chosen, apply them consistently across the entire codebase.
