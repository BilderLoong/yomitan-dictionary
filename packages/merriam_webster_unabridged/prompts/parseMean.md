# Convert html to yomitan dicionary format

## Requirements

I want to convert a mdx dictionary to a yomitan dictionary format. For now there is  a `<mean>` tag which contains the information of definitions and example sentences. I want to convert those information to a yomitan definition. 

- You should only extract the definitions and example sentences from the `<mean>` tag.
- The converted result should be `detailed definition` (mentioned by yomitan termbank schema) by using `structuredContent`.
- The `structuredContent` should represent the information by using some nested `ol`.
- I want you implement functions that takes the xml string of the `<mean>` by using cheerio converts definition and examples into the required `structuredContent` format.


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

## Yomitan dictionary schema

```json
jk
{
    "$id": "dictionaryTermBankV3",
    "$schema": "http://json-schema.org/draft-07/schema#",
    "definitions": {
        "structuredContent": {
            "oneOf": [
                {
                    "type": "string",
                    "description": "Represents a text node."
                },
                {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/structuredContent",
                        "description": "An array of child content."
                    }
                },
                {
                    "type": "object",
                    "oneOf": [
                        {
                            "type": "object",
                            "description": "Empty tags.",
                            "required": [
                                "tag"
                            ],
                            "additionalProperties": false,
                            "properties": {
                                "tag": {
                                    "type": "string",
                                    "const": "br"
                                },
                                "data": {
                                    "$ref": "#/definitions/structuredContentData"
                                }
                            }
                        },
                        {
                            "type": "object",
                            "description": "Generic container tags.",
                            "required": [
                                "tag"
                            ],
                            "additionalProperties": false,
                            "properties": {
                                "tag": {
                                    "type": "string",
                                    "enum": ["ruby", "rt", "rp", "table", "thead", "tbody", "tfoot", "tr"]
                                },
                                "content": {
                                    "$ref": "#/definitions/structuredContent"
                                },
                                "data": {
                                    "$ref": "#/definitions/structuredContentData"
                                },
                                "lang": {
                                    "type": "string",
                                    "description": "Defines the language of an element in the format defined by RFC 5646."
                                }
                            }
                        },
                        {
                            "type": "object",
                            "description": "Table tags.",
                            "required": [
                                "tag"
                            ],
                            "additionalProperties": false,
                            "properties": {
                                "tag": {
                                    "type": "string",
                                    "enum": ["td", "th"]
                                },
                                "content": {
                                    "$ref": "#/definitions/structuredContent"
                                },
                                "data": {
                                    "$ref": "#/definitions/structuredContentData"
                                },
                                "colSpan": {
                                    "type": "integer",
                                    "minimum": 1
                                },
                                "rowSpan": {
                                    "type": "integer",
                                    "minimum": 1
                                },
                                "style": {
                                    "$ref": "#/definitions/structuredContentStyle"
                                },
                                "lang": {
                                    "type": "string",
                                    "description": "Defines the language of an element in the format defined by RFC 5646."
                                }
                            }
                        },
                        {
                            "type": "object",
                            "description": "Container tags supporting configurable styles.",
                            "required": [
                                "tag"
                            ],
                            "additionalProperties": false,
                            "properties": {
                                "tag": {
                                    "type": "string",
                                    "enum": ["span", "div", "ol", "ul", "li", "details", "summary"]
                                },
                                "content": {
                                    "$ref": "#/definitions/structuredContent"
                                },
                                "data": {
                                    "$ref": "#/definitions/structuredContentData"
                                },
                                "style": {
                                    "$ref": "#/definitions/structuredContentStyle"
                                },
                                "title": {
                                    "type": "string",
                                    "description": "Hover text for the element."
                                },
                                "open": {
                                    "type": "boolean",
                                    "description": "Whether or not the details element is open by default."
                                },
                                "lang": {
                                    "type": "string",
                                    "description": "Defines the language of an element in the format defined by RFC 5646."
                                }
                            }
                        },
                        {
                            "type": "object",
                            "description": "Image tag.",
                            "required": [
                                "tag",
                                "path"
                            ],
                            "additionalProperties": false,
                            "properties": {
                                "tag": {
                                    "type": "string",
                                    "const": "img"
                                },
                                "data": {
                                    "$ref": "#/definitions/structuredContentData"
                                },
                                "path": {
                                    "type": "string",
                                    "description": "Path to the image file in the archive."
                                },
                                "width": {
                                    "type": "number",
                                    "description": "Preferred width of the image.",
                                    "minimum": 0
                                },
                                "height": {
                                    "type": "number",
                                    "description": "Preferred height of the image.",
                                    "minimum": 0
                                },
                                "title": {
                                    "type": "string",
                                    "description": "Hover text for the image."
                                },
                                "alt": {
                                    "type": "string",
                                    "description": "Alt text for the image."
                                },
                                "description": {
                                    "type": "string",
                                    "description": "Description of the image."
                                },
                                "pixelated": {
                                    "type": "boolean",
                                    "description": "Whether or not the image should appear pixelated at sizes larger than the image's native resolution.",
                                    "default": false
                                },
                                "imageRendering": {
                                    "type": "string",
                                    "description": "Controls how the image is rendered. The value of this field supersedes the pixelated field.",
                                    "enum": ["auto", "pixelated", "crisp-edges"],
                                    "default": "auto"
                                },
                                "appearance": {
                                    "type": "string",
                                    "description": "Controls the appearance of the image. The \"monochrome\" value will mask the opaque parts of the image using the current text color.",
                                    "enum": ["auto", "monochrome"],
                                    "default": "auto"
                                },
                                "background": {
                                    "type": "boolean",
                                    "description": "Whether or not a background color is displayed behind the image.",
                                    "default": true
                                },
                                "collapsed": {
                                    "type": "boolean",
                                    "description": "Whether or not the image is collapsed by default.",
                                    "default": false
                                },
                                "collapsible": {
                                    "type": "boolean",
                                    "description": "Whether or not the image can be collapsed.",
                                    "default": false
                                },
                                "verticalAlign": {
                                    "type": "string",
                                    "description": "The vertical alignment of the image.",
                                    "enum": ["baseline", "sub", "super", "text-top", "text-bottom", "middle", "top", "bottom"]
                                },
                                "border": {
                                    "type": "string",
                                    "description": "Shorthand for border width, style, and color."
                                },
                                "borderRadius": {
                                    "type": "string",
                                    "description": "Roundness of the corners of the image's outer border edge."
                                },
                                "sizeUnits": {
                                    "type": "string",
                                    "description": "The units for the width and height.",
                                    "enum": ["px", "em"]
                                }
                            }
                        },
                        {
                            "type": "object",
                            "description": "Link tag.",
                            "required": [
                                "tag",
                                "href"
                            ],
                            "additionalProperties": false,
                            "properties": {
                                "tag": {
                                    "type": "string",
                                    "const": "a"
                                },
                                "content": {
                                    "$ref": "#/definitions/structuredContent"
                                },
                                "href": {
                                    "type": "string",
                                    "description": "The URL for the link. URLs starting with a ? are treated as internal links to other dictionary content.",
                                    "pattern": "^(?:https?:|\\?)[\\w\\W]*"
                                },
                                "lang": {
                                    "type": "string",
                                    "description": "Defines the language of an element in the format defined by RFC 5646."
                                }
                            }
                        }
                    ]
                }
            ]
        },
        "structuredContentData": {
            "type": "object",
            "description": "Generic data attributes that should be added to the element.",
            "additionalProperties": {
                "type": "string"
            }
        },
        "structuredContentStyle": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "fontStyle": {
                    "type": "string",
                    "enum": ["normal", "italic"],
                    "default": "normal"
                },
                "fontWeight": {
                    "type": "string",
                    "enum": ["normal", "bold"],
                    "default": "normal"
                },
                "fontSize": {
                    "type": "string",
                    "default": "medium"
                },
                "color": {
                    "type": "string"
                },
                "background": {
                    "type": "string"
                },
                "backgroundColor": {
                    "type": "string"
                },
                "textDecorationLine": {
                    "oneOf": [
                        {
                            "type": "string",
                            "enum": ["none", "underline", "overline", "line-through"],
                            "default": "none"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string",
                                "enum": ["underline", "overline", "line-through"],
                                "default": "none"
                            }
                        }
                    ]
                },
                "textDecorationStyle": {
                    "type": "string",
                    "enum": ["solid", "double", "dotted", "dashed", "wavy"],
                    "default": "solid"
                },
                "textDecorationColor": {
                    "type": "string"
                },
                "borderColor": {
                    "type": "string"
                },
                "borderStyle": {
                    "type": "string"
                },
                "borderRadius": {
                    "type": "string"
                },
                "borderWidth": {
                    "type": "string"
                },
                "clipPath": {
                    "type": "string"
                },
                "verticalAlign": {
                    "type": "string",
                    "enum": ["baseline", "sub", "super", "text-top", "text-bottom", "middle", "top", "bottom"],
                    "default": "baseline"
                },
                "textAlign": {
                    "type": "string",
                    "enum": ["start", "end", "left", "right", "center", "justify", "justify-all", "match-parent"],
                    "default": "start"
                },
                "textEmphasis": {
                    "type": "string"
                },
                "textShadow": {
                    "type": "string"
                },
                "margin": {
                    "type": "string"
                },
                "marginTop": {
                    "type": ["number", "string"],
                    "default": 0
                },
                "marginLeft": {
                    "type": ["number", "string"],
                    "default": 0
                },
                "marginRight": {
                    "type": ["number", "string"],
                    "default": 0
                },
                "marginBottom": {
                    "type": ["number", "string"],
                    "default": 0
                },
                "padding": {
                    "type": "string"
                },
                "paddingTop": {
                    "type": "string"
                },
                "paddingLeft": {
                    "type": "string"
                },
                "paddingRight": {
                    "type": "string"
                },
                "paddingBottom": {
                    "type": "string"
                },
                "wordBreak": {
                    "type": "string",
                    "enum": ["normal", "break-all", "keep-all"],
                    "default": "normal"
                },
                "whiteSpace": {
                    "type": "string",
                    "default": "normal"
                },
                "cursor": {
                    "type": "string",
                    "default": "auto"
                },
                "listStyleType": {
                    "type": "string",
                    "default": "disc"
                }
            }
        }
    },
    "type": "array",
    "description": "Data file containing term information.",
    "items": {
        "type": "array",
        "description": "Information about a single term.",
        "minItems": 8,
        "maxItems": 8,
        "additionalItems": false,
        "items": [
            {
                "type": "string",
                "description": "The text for the term."
            },
            {
                "type": "string",
                "description": "Reading of the term, or an empty string if the reading is the same as the term."
            },
            {
                "type": ["string", "null"],
                "description": "String of space-separated tags for the definition. An empty string is treated as no tags."
            },
            {
                "type": "string",
                "description": "String of space-separated rule identifiers for the definition which is used to validate deinflection. An empty string should be used for words which aren't inflected."
            },
            {
                "type": "number",
                "description": "Score used to determine popularity. Negative values are more rare and positive values are more frequent. This score is also used to sort search results."
            },
            {
                "type": "array",
                "description": "Array of definitions for the term.",
                "items": {
                    "oneOf": [
                        {
                            "type": "string",
                            "description": "Single definition for the term."
                        },
                        {
                            "type": "object",
                            "description": "Single detailed definition for the term.",
                            "required": [
                                "type"
                            ],
                            "properties": {
                                "type": {
                                    "type": "string",
                                    "description": "The type of the data for this definition.",
                                    "enum": ["text", "image", "structured-content"]
                                }
                            },
                            "oneOf": [
                                {
                                    "required": [
                                        "type",
                                        "text"
                                    ],
                                    "additionalProperties": false,
                                    "properties": {
                                        "type": {
                                            "type": "string",
                                            "const": "text"
                                        },
                                        "text": {
                                            "type": "string",
                                            "description": "Single definition for the term."
                                        }
                                    }
                                },
                                {
                                    "required": [
                                        "type",
                                        "content"
                                    ],
                                    "additionalProperties": false,
                                    "properties": {
                                        "type": {
                                            "type": "string",
                                            "const": "structured-content"
                                        },
                                        "content": {
                                            "$ref": "#/definitions/structuredContent",
                                            "description": "Single definition for the term using a structured content object."
                                        }
                                    }
                                },
                                {
                                    "required": [
                                        "type",
                                        "path"
                                    ],
                                    "additionalProperties": false,
                                    "properties": {
                                        "type": {
                                            "type": "string",
                                            "const": "image"
                                        },
                                        "path": {
                                            "type": "string",
                                            "description": "Path to the image file in the archive."
                                        },
                                        "width": {
                                            "type": "integer",
                                            "description": "Preferred width of the image.",
                                            "minimum": 1
                                        },
                                        "height": {
                                            "type": "integer",
                                            "description": "Preferred height of the image.",
                                            "minimum": 1
                                        },
                                        "title": {
                                            "type": "string",
                                            "description": "Hover text for the image."
                                        },
                                        "alt": {
                                            "type": "string",
                                            "description": "Alt text for the image."
                                        },
                                        "description": {
                                            "type": "string",
                                            "description": "Description of the image."
                                        },
                                        "pixelated": {
                                            "type": "boolean",
                                            "description": "Whether or not the image should appear pixelated at sizes larger than the image's native resolution.",
                                            "default": false
                                        },
                                        "imageRendering": {
                                            "type": "string",
                                            "description": "Controls how the image is rendered. The value of this field supersedes the pixelated field.",
                                            "enum": ["auto", "pixelated", "crisp-edges"],
                                            "default": "auto"
                                        },
                                        "appearance": {
                                            "type": "string",
                                            "description": "Controls the appearance of the image. The \"monochrome\" value will mask the opaque parts of the image using the current text color.",
                                            "enum": ["auto", "monochrome"],
                                            "default": "auto"
                                        },
                                        "background": {
                                            "type": "boolean",
                                            "description": "Whether or not a background color is displayed behind the image.",
                                            "default": true
                                        },
                                        "collapsed": {
                                            "type": "boolean",
                                            "description": "Whether or not the image is collapsed by default.",
                                            "default": false
                                        },
                                        "collapsible": {
                                            "type": "boolean",
                                            "description": "Whether or not the image can be collapsed.",
                                            "default": true
                                        }
                                    }
                                }
                            ]
                        },
                        {
                            "type": "array",
                            "description": "Deinflection of the term to an uninflected term.",
                            "minItems": 2,
                            "maxItems": 2,
                            "items": [
                                {
                                    "type": "string",
                                    "description": "The uninflected term."
                                },
                                {
                                    "type": "array",
                                    "description": "A chain of inflection rules that produced the inflected term",
                                    "items": {
                                        "type": "string",
                                        "description": "A single inflection rule."
                                    }
                                }
                            ]
                        }
                    ]
                }
            },
            {
                "type": "integer",
                "description": "Sequence number for the term. Terms with the same sequence number can be shown together when the \"resultOutputMode\" option is set to \"merge\"."
            },
            {
                "type": "string",
                "description": "String of space-separated tags for the term. An empty string is treated as no tags."
            }
        ]
    }
}
```

## Examples

```what
<mean show="0" style="display: block;"><div class="page-content">  <div class="well content-body definition-body"><div class="wordclick" data-word-click="enabled"> <div class="left-content col-xl-12"> <div class="row entry-header"> <div class="col-12"> <h1 class="hword" id="hw1"> <sup>1</sup> what</h1>  <span class="fl">pronoun</span> <span class="prs"> <span class="first-slash">\</span><span class="pr"> ¦(h)wät</span> <a class="play-pron hw-play-pron" data-lang="en_us" href="gdau://6fd48b02c39532c98c1abc1f88d5d7ff/w/what0002.mp3" onclick="return false;"><span class="audio-icon"></span></a><span class="addPunct">, </span><span class="pr"> ¦(h)wət</span> <span class="last-slash">\</span> </span> </div></div> <div class="section" data-id="definition"> <div class="def-wrapper"> <div class="vg"> <div class="sb has-subnum has-num has-let"> <span class="sb-0"> <div class="pseq no-subnum"> <div class="sense has-sn has-subnum"> <span class="sn sense-1 a (1)"><span class="num">1</span> <span class="letter">a</span> <span class="sub-num">(1)</span></span> <span class="dt"><span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used in direct or indirect questions as an interrogative pronoun expressing inquiry about the identity of an object or matter<span class="vis" hidden=""> <span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span> is this</span>&gt;</span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span> did you say</span>&gt;</span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span> are those things on the table</span>&gt;</span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span> happened after that</span>&gt;</span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;tell me <span class="mw_t_wi">what</span> you are looking for&gt;</span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;I wonder <span class="mw_t_wi">what</span> his motives were&gt;</span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;he knows <span class="mw_t_wi">what</span> he should do&gt;</span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;he knows <span class="mw_t_wi">what</span> to do&gt;</span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;he's looking for something, but I don't know <span class="mw_t_wi">what</span>&gt;</span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t has-aq sents sents-block">&lt;the controversy … centers largely on … who advocated <span class="mw_t_wi">what</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="source hidden"> — <em class="mw_t_it">Christian Science Monitor</em></span></span>&gt;</span></span></span></span></span><span class="un"><span class="mdash">—</span><span class="unText">often used by itself especially to ask for repetition of an utterance not properly heard or understood or to indicate that the speaker has heard someone addressing him or her and is ready to listen to whatever that person wishes to say</span></span><span class="un"><span class="mdash">—</span><span class="unText">often used in connection with another word or words to ask for repetition of the particular part of an utterance that has not been properly heard or understood<span class="vis" hidden=""> <span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;found <span class="mw_t_wi">what</span>&gt;</span></span></span></span></span></span> </span></span></span></span></div> <div class="sense has-sn has-subnum"> <span class="sn sense-(2)"><span class="sub-num">(2)</span></span> <span class="dt"><strong class="mw_t_bc">: </strong>a person or thing of how much value or consequence <span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used in rhetorical questions<span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span> is man, that thou art mindful of him</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="source hidden"> — Psalms 8:4 (Authorized Version)</span></span>&gt;</span></span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span>'s Hecuba to him, … that he should weep for her</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Shakespeare</span></span>&gt;</span></span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span> is home without a mother</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Septimus Winner</span></span>&gt;</span></span></span></span></span></span></span> </span></span></div> </div> </span> <span class="sb-1"> <div class="pseq no-subnum"> <div class="sense has-sn has-subnum"> <span class="sn sense-b (1)"><span class="letter">b</span> <span class="sub-num">(1)</span></span> <span class="sl">archaic </span>  <span class="dt"><strong class="mw_t_bc">: </strong><a href="gdlookup://localhost/who?gdanchor=hw1" class="mw_t_sx"> <sup>1</sup><span class="text-uppercase">who</span></a> <span class="text-lowercase">1</span> <span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used predicatively in direct or indirect questions as an interrogative pronoun expressing inquiry about the identity of a person<span class="vis" hidden=""> <span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t has-aq sents sents-block">&lt;is it but thought so? <span class="mw_t_wi">what</span> are they that think it<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Shakespeare</span></span>&gt;</span></span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t has-aq sents sents-block">&lt;lo <span class="mw_t_wi">what</span> is he … is it not Lancelot<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Alfred Tennyson</span></span>&gt;</span></span></span></span></span></span></span> </span></span></div> <div class="sense has-sn has-subnum"> <span class="sn sense-(2)"><span class="sub-num">(2)</span></span> <span class="dt"><span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used predicatively in direct or indirect questions as an interrogative pronoun expressing inquiry about the character, occupation, position, or role of a person<span class="vis" hidden=""> <span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span> do you think I am, a fool</span>&gt;</span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;ask him <span class="mw_t_wi">what</span> he wants to be when he grows up&gt;</span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;you are the villain and she is the heroine, but <span class="mw_t_wi">what</span> is he&gt;</span></span></span></span></span></span> </span></span></div> </div> </span> <span class="sb-2"> <div class="sense has-sn"> <span class="sn sense-c"><span class="letter">c</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>how much <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t has-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span> do people generally tip</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Richard Joseph</span></span>&gt;</span></span></span><span class="ex-sent-group" hidden=""> <span class="ex-sent t has-aq sents sents-block">&lt;to know <span class="mw_t_wi">what</span> of any great man survives<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Irwin Edman</span></span>&gt;</span></span></span></span> </div> </span> <span class="sb-3"> <div class="pseq no-subnum"> <div class="sense has-sn has-subnum"> <span class="sn sense-d (1)"><span class="letter">d</span> <span class="sub-num">(1)</span></span> <span class="dt"><span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used as an exclamation expressing surprise or excitement and frequently introducing a question<span class="vis" hidden=""> <span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span>, no breakfast</span>&gt;</span></span></span></span></span></span> </span></span></div> <div class="sense has-sn has-subnum"> <span class="sn sense-(2)"><span class="sub-num">(2)</span></span> <span class="sl">chiefly dialectal </span>  <span class="dt"><span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used to call someone or to engage someone's attention in order to say something to that person<span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span>, Diggory? You are having a lonely walk</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Thomas Hardy</span></span>&gt;</span></span></span></span></span><span class="un"><span class="mdash">—</span><span class="unText">often followed by <em class="mw_t_it">ho</em><span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span>, ho! slave</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Shakespeare</span></span>&gt;</span></span></span></span></span></span></span> </span></span></span></span></div> </div> </span> <span class="sb-4"> <div class="sense has-sn"> <span class="sn sense-e"><span class="letter">e</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>one or ones of what sort <span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used predicatively<span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span> is she, that all our swains commend her</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Shakespeare</span></span>&gt;</span></span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">&lt;you know <span class="mw_t_wi">what</span> he is about anything disagreeable—how he simply ignores its existence<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Richard Bagot</span></span>&gt;</span></span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">&lt;you know not <span class="mw_t_wi">what</span> temptation is<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Robert Browning</span></span>&gt;</span></span></span></span></span></span></span> </span></span></div> </span> <span class="sb-5"> <div class="sense has-sn"> <span class="sn sense-f"><span class="letter">f</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>how noteworthy a thing <span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used interjectionally<span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span> has God wrought</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="source hidden"> — Numbers 23:23 (Revised Standard Version)</span></span>&gt;</span></span></span></span></span></span></span> </span></span></div> </span> <span class="sb-6"> <div class="sense has-sn"> <span class="sn sense-g"><span class="letter">g</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong><a href="gdlookup://localhost/something" class="mw_t_sx"><span class="text-uppercase">something</span></a> <span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used in a few more or less fixed expressions directing attention to a suggestion or statement that the speaker is about to make<span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">&lt;I'll tell you <span class="mw_t_wi">what</span>&gt;</span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">&lt;tell you <span class="mw_t_wi">what</span>&gt;</span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">&lt;do you know <span class="mw_t_wi">what</span>&gt;</span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">&lt;know <span class="mw_t_wi">what</span>&gt;</span></span></span></span></span></span> </span></span></div> </span> <span class="sb-7"> <div class="sense has-sn"> <span class="sn sense-h"><span class="letter">h</span> </span> <span class="dt"><span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used after <em class="mw_t_it">or</em> at the end of a question to express inquiry about the possibilities not included in the immediately preceding word or series of words<span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">&lt;is it a freak, or <span class="mw_t_wi">what</span>&gt;</span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">&lt;is it a reptile, an amphibian, or <span class="mw_t_wi">what</span>&gt;</span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">&lt;is it raining, or snowing, or <span class="mw_t_wi">what</span>&gt;</span></span></span></span></span></span> </span></span></div> </span> <span class="sb-8"> <div class="sense has-sn"> <span class="sn sense-i"><span class="letter">i</span> </span> <span class="sl">chiefly British </span>  <span class="dt"><span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used especially at the end of an utterance as a tag that is essentially meaningless but has the appearance of inviting agreement or disagreement with the statement just made<span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">&lt;a clever play, <span class="mw_t_wi">what</span>&gt;</span></span></span></span></span></span> </span></span></div> </span> </div> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-2"><span class="num">2</span> </span> <span class="sl">chiefly substandard </span>  <span class="dt"><span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used as a function word to introduce a restrictive or nonrestrictive relative clause and to serve as a substitute within that clause for the substantive modified by that clause<span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;the guy <span class="mw_t_wi">what</span> says 'taint so<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="source hidden"> — <em class="mw_t_it">American Songbag</em></span></span>&gt;</span></span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">&lt;the newspaper placard, <span class="mw_t_wi">what</span> had kicked itself loose from one corner<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Richard Llewellyn</span></span>&gt;</span></span></span></span></span></span> <span class="dx-jump"> — compare <a href="gdlookup://localhost/that?gdanchor=hw4" class="mw_t_dxt"> <sup>4</sup><span class="text-uppercase">that</span></a> <span class="text-lowercase">1</span>, <a href="gdlookup://localhost/which?gdanchor=hw2" class="mw_t_dxt"> <sup>2</sup><span class="text-uppercase">which</span></a> <span class="text-lowercase">3</span>, <a href="gdlookup://localhost/who?gdanchor=hw1" class="mw_t_dxt"> <sup>1</sup><span class="text-uppercase">who</span></a> <span class="text-lowercase">3</span></span></span> </span></span></div> </span> </div> <div class="sb has-num has-let"> <span class="sb-0"> <div class="sense has-sn"> <span class="sn sense-3 a"><span class="num">3</span> <span class="letter">a</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>that which <strong class="mw_t_bc">: </strong>those which <strong class="mw_t_bc">: </strong>those things that <strong class="mw_t_bc">: </strong>those who or whom <strong class="mw_t_bc">: </strong>the one or ones that <span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;the wind was … blowing in a direction opposite to <span class="mw_t_wi">what</span> would carry the sparks to the lumber<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — W. L. Moore †1927</span></span>&gt;</span></span></span><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">&lt;any imposts or duties on imports or exports, except <span class="mw_t_wi">what</span> may be absolutely necessary for executing its inspection laws<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="source hidden"> — <em class="mw_t_it">U.S. Constitution</em></span></span>&gt;</span></span></span><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">&lt;attributed it to the folly of <span class="mw_t_wi">what</span> he conceived to be irresponsible demagogues<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Robert White</span></span>&gt;</span></span></span><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">&lt;has no income but <span class="mw_t_wi">what</span> he gets from his writings&gt;</span></span><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">&lt;have no children but <span class="mw_t_wi">what</span> you see here&gt;</span></span><span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">sometimes used parenthetically or at the beginning of a sentence in reference to a clause or phrase that is yet to come or is not yet complete<span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;but, <span class="mw_t_wi">what</span> more amazed him, his wife had willingly accompanied their flight<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — John Dryden</span></span>&gt;</span></span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">&lt;the number of summonses jumped … at a rate of close to 200,000 a year. <span class="mw_t_wi">What'</span> s more, the magistrates … give stiffened fines<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — G. S. Perry</span></span>&gt;</span></span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">&lt;he brought also, <span class="mw_t_wi">what</span> is rarer than depth of moralism, an art finely rounded<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Carl Van Doren</span></span>&gt;</span></span></span></span></span></span> <span class="dx-jump"> — compare <a href="gdlookup://localhost/which?gdanchor=hw2" class="mw_t_dxt"> <sup>2</sup><span class="text-uppercase">which</span></a> <span class="text-lowercase">3</span></span></span> </span></span></div> </span> <span class="sb-1"> <div class="sense has-sn"> <span class="sn sense-b"><span class="letter">b</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>as much as <strong class="mw_t_bc">: </strong>as many as <span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;the individual soul … must struggle alone, with <span class="mw_t_wi">what</span> of courage it can command<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Bertrand Russell</span></span>&gt;</span></span></span><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">&lt;there are 34 candidates on the squad, nearly triple <span class="mw_t_wi">what</span> reported for competition three years ago<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="source hidden"> — <em class="mw_t_it">Springfield (Massachusetts) Union</em></span></span>&gt;</span></span></span></span> </div> </span> <span class="sb-2"> <div class="sense has-sn"> <span class="sn sense-c"><span class="letter">c</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>the kind that <strong class="mw_t_bc">: </strong>the same as <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">&lt;the speech was very much <span class="mw_t_wi">what</span> everyone expected&gt;</span></span><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">&lt;a sleepy little town that is just <span class="mw_t_wi">what</span> it was forty years ago&gt;</span></span> <strong class="mw_t_bc">: </strong>equal to that which <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">&lt;countries whose economic strength is not <span class="mw_t_wi">what</span> it was&gt;</span></span></span> </div> </span> </div> <div class="sb has-num has-let"> <span class="sb-0"> <div class="sense has-sn"> <span class="sn sense-4 a"><span class="num">4</span> <span class="letter">a</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong><a href="gdlookup://localhost/whatever?gdanchor=hw1" class="mw_t_sx"> <sup>1</sup><span class="text-uppercase">whatever</span></a> <span class="text-lowercase">1a</span> <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">&lt;come <span class="mw_t_wi">what</span> may&gt;</span></span><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">&lt;say <span class="mw_t_wi">what</span> you will&gt;</span></span></span> </div> </span> <span class="sb-1"> <div class="sense has-sn"> <span class="sn sense-b"><span class="letter">b</span> </span> <span class="sl">obsolete </span>  <span class="dt"><strong class="mw_t_bc">: </strong><a href="gdlookup://localhost/whoever" class="mw_t_sx"><span class="text-uppercase">whoever</span></a> <span class="text-lowercase">1</span> <span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span> in the world he is that names me traitor, villain-like he lies</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Shakespeare</span></span>&gt;</span></span></span></span> </div> </span> </div> </div> </div> <div class="dro"> <span id="no-matter-what-anchor" class="drp">no matter what</span> <div class="vg" hidden=""> <div class="sb no-sn"> <span class="sb-0"> <div class="sense no-subnum"> <span class="dt"><strong class="mw_t_bc">: </strong>regardless of anything else <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">&lt;wait there till I come back, <span class="mw_t_wi">no matter what</span>&gt;</span></span></span> </div> </span> </div> </div> <span id="what-about-anchor" class="drp">what about</span> <div class="vg" hidden=""> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-1"><span class="num">1</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>what is to be said about <strong class="mw_t_bc">: </strong>what is the situation with respect to <span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what about</span> a house, and schools for the children</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — J. G. Gilkey</span></span>&gt;</span></span></span></span> </div> </span> </div> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-2"><span class="num">2</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>how about <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what about</span> coming with us</span>&gt;</span></span><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what about</span> doing it yourself</span>&gt;</span></span></span> </div> </span> </div> </div> <span id="what-an-if-anchor" class="drp">what an if<span class="vr"><span class="vl"> or </span><span id="what-and-if-anchor" class="va">what and if</span></span></span>  <div class="vg" hidden="">  <div class="sls"> <span class="sl">archaic </span> </div>  <div class="sb no-sn"> <span class="sb-0"> <div class="sense no-subnum"> <span class="dt"><strong class="mw_t_bc">: </strong>what if</span> </div> </span> </div> </div> <span id="what-else-anchor" class="drp">what else</span> <div class="vg" hidden=""> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-1"><span class="num">1</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>anything else <strong class="mw_t_bc">: </strong>unspecified other things <span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;with promise of his sister, and <span class="mw_t_wi">what else</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Shakespeare</span></span>&gt;</span></span></span></span> </div> </span> </div> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-2"><span class="num">2</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong><a href="gdlookup://localhost/certainly" class="mw_t_sx"><span class="text-uppercase">certainly</span></a> <strong class="mw_t_bc">: </strong>yes indeed <span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used after a statement to emphasize it or by itself as an emphatic affirmative reply to a question</span></span></span></span> </div> </span> </div> </div> <span id="what-for-anchor" class="drp">what for</span> <div class="vg" hidden=""> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-1"><span class="num">1</span> </span> <span class="sl">chiefly dialectal </span>  <span class="dt"><strong class="mw_t_bc">: </strong>what kind of <span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used either inseparably or with a verb and its subject between <em class="mw_t_it">what</em> and <em class="mw_t_it">for</em><span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span> is he <span class="mw_t_wi">for</span> a fool</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Shakespeare</span></span>&gt;</span></span></span></span></span><span class="un"><span class="mdash">—</span><span class="unText">used with an immediately following object of <em class="mw_t_it">for</em> usually consisting of a singular count noun with indefinite article<span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what for</span> an apple is that</span>&gt;</span></span></span></span> <span class="unText">, a plural count noun with no article<span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what for</span> horses are those</span>&gt;</span></span></span></span> <span class="unText">, or a mass noun with no article<span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what for</span> tobacco are you smoking</span>&gt;</span></span></span></span></span></span> </span></span></span></span></span></span></div> </span> </div> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-2"><span class="num">2</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>for what purpose <strong class="mw_t_bc">: </strong>for what reason <strong class="mw_t_bc">: </strong><a href="gdlookup://localhost/why" class="mw_t_sx"><span class="text-uppercase">why</span></a> <span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">usually used with the other words of a question between <em class="mw_t_it">what</em> and <em class="mw_t_it">for</em><span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span> did you do that <span class="mw_t_wi">for</span></span>&gt;</span></span></span></span> <span class="unText"> except when used alone</span></span><span class="un"><span class="mdash">—</span><span class="unText">used inseparably at the beginning of a question in some dialects<span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what for</span> did you do that</span>&gt;</span></span></span></span></span></span> </span></span></span></div> </span> </div> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-3"><span class="num">3</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>punishment especially by blows or by a sharp reprimand <span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;puts his little boy across his knee and gives him <span class="mw_t_wi">what for</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Rebecca West</span></span>&gt;</span></span></span><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">&lt;gave him <span class="mw_t_wi">what for</span> in violent Spanish<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="source hidden"> — <em class="mw_t_it">New Yorker</em></span></span>&gt;</span></span></span><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">&lt;Mama certainly gave Papa the <span class="mw_t_wi">what for</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Marquis James</span></span>&gt;</span></span></span> <strong class="mw_t_bc">: </strong>rough treatment inflicted especially on an offender <span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;went away to give the … generals <span class="mw_t_wi">what for</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — J. T. Winterich</span></span>&gt;</span></span></span> <strong class="mw_t_bc">: </strong>severe pain <span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;my corn's a-giving me <span class="mw_t_wi">what for</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — A. E. Coppard</span></span>&gt;</span></span></span></span> </div> </span> </div> </div> <span id="what-have-you-anchor" class="drp">what have you</span> <div class="vg" hidden=""> <div class="sb no-sn"> <span class="sb-0"> <div class="sense no-subnum"> <span class="dt"><strong class="mw_t_bc">: </strong><a href="gdlookup://localhost/whatnot" class="mw_t_sx"><span class="text-uppercase">whatnot</span></a> <span class="text-lowercase">1a</span> <span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;novels, plays, short stories, travelogues, and <span class="mw_t_wi">what have you</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Haldeen Braddy</span></span>&gt;</span></span></span><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">&lt;sell it, broadcast it, set it to music, or <span class="mw_t_wi">what have you</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Margaret Nicholson</span></span>&gt;</span></span></span><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">&lt;barbarous or medieval or <span class="mw_t_wi">what have you</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — S. M. Kuhn</span></span>&gt;</span></span></span></span> </div> </span> </div> </div> <span id="what-if-anchor" class="drp">what if</span> <div class="vg" hidden=""> <div class="sb no-sn"> <span class="sb-0"> <div class="sense no-subnum"> <span class="dt"><strong class="mw_t_bc">: </strong>what will or would be the result if <span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what if</span> it be a poison</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Shakespeare</span></span>&gt;</span></span></span> <strong class="mw_t_bc">: </strong>what does it matter if <span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">&lt;he won't object, and anyway, <span class="mw_t_wi">what if</span> he does&gt;</span></span></span> </div> </span> </div> </div> <span id="what-it-takes-anchor" class="drp">what it takes</span> <div class="vg" hidden=""> <div class="sb no-sn"> <span class="sb-0"> <div class="sense no-subnum"> <span class="dt"><strong class="mw_t_bc">: </strong>the ability, qualities, or resources needed for success or for the attainment of a particular goal <span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;he certainly has more of <span class="mw_t_wi">what it takes</span> than anybody else of his generation<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Edmund Wilson</span></span>&gt;</span></span></span><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">&lt;those who have <span class="mw_t_wi">what it takes</span> to solve the problems in an environment<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — W. J. Reilly</span></span>&gt;</span></span></span></span> </div> </span> </div> </div> <span id="what-of-anchor" class="drp">what of</span> <div class="vg" hidden=""> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-1"><span class="num">1</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>what is to be said about <strong class="mw_t_bc">: </strong>what is the situation with respect to <span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;watchman, <span class="mw_t_wi">what of</span> the night<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="source hidden"> — Isaiah 21:11 (Revised Standard Version)</span></span>&gt;</span></span></span></span> </div> </span> </div> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-2"><span class="num">2</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>what importance can be assigned to <span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;all this is so; but <span class="mw_t_wi">what of</span> this, my lord<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Shakespeare</span></span>&gt;</span></span></span></span> </div> </span> </div> </div> <span id="what-s-o-clock-anchor" class="drp">what's o'clock</span> <div class="vg" hidden="">  <div class="sls"> <span class="sl">British </span> </div>  <div class="sb no-sn"> <span class="sb-0"> <div class="sense no-subnum"> <span class="dt"><strong class="mw_t_bc">: </strong>what time is it <strong class="mw_t_bc">: </strong>what time it is</span> </div> </span> </div> </div> <span id="what-s-what-anchor" class="drp">what's what<span class="vr"><span class="vl"> or </span><span id="what-is-what-anchor" class="va">what is what</span></span></span>  <span class="vr"><span class="vl"> or </span><span id="what-was-what-anchor" class="va">what was what</span></span> <div class="vg" hidden=""> <div class="sb no-sn"> <span class="sb-0"> <div class="sense no-subnum"> <span class="dt"><strong class="mw_t_bc">: </strong>the true state of things <span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;exploration of <span class="mw_t_wi">what's what</span> with the American businessman<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="source hidden"> — <em class="mw_t_it">advertisement</em></span></span>&gt;</span></span></span><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">&lt;all the … millionaire paper-mill women knew <span class="mw_t_wi">what was what</span> when it came to fashion<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Edna Ferber</span></span>&gt;</span></span></span></span> </div> </span> </div> </div> <span id="what-s-with-anchor" class="drp">what's with</span> <div class="vg" hidden="">  <div class="sls"> <span class="sl">slang </span> </div>  <div class="sb no-sn"> <span class="sb-0"> <div class="sense no-subnum"> <span class="dt"><strong class="mw_t_bc">: </strong>what is the reason for <strong class="mw_t_bc">: </strong>what is wrong with</span> </div> </span> </div> </div> <span id="what-though-anchor" class="drp">what though</span> <div class="vg" hidden=""> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-1"><span class="num">1</span> </span> <span class="sl">obsolete </span>  <span class="dt"><strong class="mw_t_bc">: </strong>what does that matter <span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;I keep but three men and a boy … but <span class="mw_t_wi">what though?</span> yet I live like a poor gentleman born<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Shakespeare</span></span>&gt;</span></span></span></span> </div> </span> </div> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-2"><span class="num">2</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>what does or would it matter if <strong class="mw_t_bc">: </strong>even granting or supposing that <span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what though</span> the rose have prickles, yet 'tis plucked</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Shakespeare</span></span>&gt;</span></span></span><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what though</span> the field be lost? all is not lost</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — John Milton</span></span>&gt;</span></span></span></span> </div> </span> </div> </div> </div> <div class="def-accordion-sections"> <div class="section custom-accordion" data-id="origin"> <h2 class="toggle"><span class="text">Origin of WHAT</span><span class="toggle-icon">[+]</span></h2> <div class="section-content etymology" hidden=""> <div class="sub-well"> <p><span class="et">Middle English, from Old English <em class="mw_t_it">hwæt</em>, neuter of <em class="mw_t_it">hwā</em> who; akin to Old High German <em class="mw_t_it">hwaz</em>, neuter interrogative pronoun, Old Norse <em class="mw_t_it">hwat</em>, Gothic <em class="mw_t_it">hwa</em> — more at <a href="gdlookup://localhost/who" class="mw_t_mat">who</a></span></p> <p>First Known Use: before 12th century (sense 1a(1))</p> </div> </div></div> </div> </div> </div> </div></div> </div></mean>

```word
<mean show="0" style="display: block;"><div class="page-content">  <div class="well content-body definition-body"><div class="wordclick" data-word-click="enabled"> <div class="left-content col-xl-12"> <div class="row entry-header"> <div class="col-12"> <h1 class="hword" id="hw1"> <sup>1</sup> word</h1>  <span class="fl">noun</span><span class="lbs">, <span class="lb">often attributive</span></span> <span class="prs"> <span class="first-slash">\</span><span class="pr"> ˈwərd</span> <a class="play-pron hw-play-pron" data-lang="en_us" href="gdau://6fd48b02c39532c98c1abc1f88d5d7ff/w/word0001.mp3" onclick="return false;"><span class="audio-icon"></span></a> <span class="last-slash">\</span> </span> </div></div> <div class="row headword-row"> <div class="col"> <span class="vg-ins"> <em>inflected form(s): </em> <span class="il plural"> plural </span><span class="ix">-s</span> </span> </div> </div> <div class="section" data-id="definition"> <div class="def-wrapper"> <div class="vg"> <div class="sb has-num has-let has-subnum"> <span class="sb-0"> <div class="sense has-sn"> <span class="sn sense-1 a"><span class="num">1</span> <span class="letter">a</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>something that is said <strong class="mw_t_bc">: </strong><a href="gdlookup://localhost/utterance" class="mw_t_sx"><span class="text-uppercase">utterance</span></a>, <a href="gdlookup://localhost/statement" class="mw_t_sx"><span class="text-uppercase">statement</span></a> <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t has-aq sents sents-block">&lt;my father loved you; he said he did, and with his deed did crown his <span class="mw_t_wi">word</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Shakespeare</span></span>&gt;</span></span></span><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;not a <span class="mw_t_wi">word</span> about his plans&gt;</span></span><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;said a <span class="mw_t_wi">word</span> to his employer on behalf of a friend who was looking for work&gt;</span></span></span> </div> </span> <span class="sb-1"> <span class="sen has-sn"> <span class="sn sense-b"><span class="letter">b</span> </span> <span class="if">words</span><span class="spl plural"> plural</span> </span> </span> <span class="sb-2"> <div class="pseq no-subnum"> <div class="sense has-sn has-subnum"> <span class="sn sense-(1)"><span class="sub-num">(1)</span></span> <span class="dt"><strong class="mw_t_bc">: </strong><a href="gdlookup://localhost/talk" class="mw_t_sx"><span class="text-uppercase">talk</span></a>, <a href="gdlookup://localhost/discourse" class="mw_t_sx"><span class="text-uppercase">discourse</span></a>, <a href="gdlookup://localhost/speech" class="mw_t_sx"><span class="text-uppercase">speech</span></a>, <a href="gdlookup://localhost/language" class="mw_t_sx"><span class="text-uppercase">language</span></a> <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;putting one's feelings into <span class="mw_t_wi">words</span>&gt;</span></span><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;wonderful beyond <span class="mw_t_wi">words</span>&gt;</span></span></span> </div> <div class="sense has-sn has-subnum"> <span class="sn sense-(2)"><span class="sub-num">(2)</span></span> <span class="dt"><strong class="mw_t_bc">: </strong>the text of a vocal musical composition <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;trivial <span class="mw_t_wi">words</span> set to splendid music&gt;</span></span></span> </div> </div> </span> <span class="sb-3"> <div class="pseq no-subnum"> <div class="sense has-sn has-subnum"> <span class="sn sense-c (1)"><span class="letter">c</span> <span class="sub-num">(1)</span></span> <span class="dt"><strong class="mw_t_bc">: </strong>a short conversation <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;would like to have a <span class="mw_t_wi">word</span> with you&gt;</span></span></span> </div> <div class="sense has-sn has-subnum"> <span class="sn sense-(2)"><span class="sub-num">(2)</span></span> <span class="dt"><strong class="mw_t_bc">: </strong>a short remark <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;a <span class="mw_t_wi">word</span> of advice&gt;</span></span></span> </div> </div> </span> </div> <div class="sb has-subnum has-num has-let"> <span class="sb-0"> <div class="pseq no-subnum"> <div class="sense has-sn has-subnum"> <span class="sn sense-2 a (1)"><span class="num">2</span> <span class="letter">a</span> <span class="sub-num">(1)</span></span> <span class="dt"><strong class="mw_t_bc">: </strong>a speech sound or series of speech sounds that symbolizes and communicates a meaning without being divisible into smaller units capable of independent use <strong class="mw_t_bc">: </strong>linguistic form that is a minimum free form <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;the order of the <span class="mw_t_wi">words</span> in a phrase&gt;</span></span><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;the meaning of a <span class="mw_t_wi">word</span>&gt;</span></span></span> </div> <div class="sense has-sn has-subnum"> <span class="sn sense-(2)"><span class="sub-num">(2)</span></span> <span class="dt"><strong class="mw_t_bc">: </strong>the entire set of linguistic forms produced by combining a single base with various inflectional elements (as affixes) without change in the part of speech <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;<span class="mw_t_sp"><em class="mw_t_it">man, man's, men</em>, and <em class="mw_t_it">men's</em> are different forms of one <span class="mw_t_wi">word</span></span>&gt;</span></span> <span class="dx-jump"> — see <a href="gdlookup://localhost/paradigm" class="mw_t_dxt"><span class="text-uppercase">paradigm</span></a></span></span> </div> </div> </span> <span class="sb-1"> <div class="sense has-sn"> <span class="sn sense-b"><span class="letter">b</span> </span> <span class="dt hasSdSense"><strong class="mw_t_bc">: </strong>a written or printed character or combination of characters representing a spoken word</span> <span class="sdsense"> <span class="sd">especially</span> <strong class="mw_t_bc">: </strong>any segment of written or printed discourse ordinarily appearing between spaces or between a space and a punctuation mark <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;average number of <span class="mw_t_wi">words</span> to a line&gt; </span></span></span> </div> </span> <span class="sb-2"> <div class="sense has-sn"> <span class="sn sense-c"><span class="letter">c</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong><a href="gdlookup://localhost/code group" class="mw_t_sx"><span class="text-uppercase">code group</span></a></span> </div> </span> <span class="sb-3"> <div class="sense has-sn"> <span class="sn sense-d"><span class="letter">d</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>a combination of electrical or magnetic impulses conveying a quantum of information in communication and computer work</span> </div> </span> </div> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-3"><span class="num">3</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong><a href="gdlookup://localhost/order" class="mw_t_sx"><span class="text-uppercase">order</span></a>, <a href="gdlookup://localhost/command" class="mw_t_sx"><span class="text-uppercase">command</span></a>, <a href="gdlookup://localhost/instruction" class="mw_t_sx"><span class="text-uppercase">instruction</span></a> <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;don't move till I give the <span class="mw_t_wi">word</span>&gt;</span></span><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;his <span class="mw_t_wi">word</span> is law&gt;</span></span></span> </div> </span> </div> <div class="sb has-num has-let"> <span class="sb-0"> <span class="sen has-num-only"> <span class="sn sense-4"><span class="num">4</span> </span> <span class="vr"><span class="vl"> or </span><span id="Word-of-God-anchor" class="va">Word of God</span></span> </span> </span> <span class="sb-1"> <div class="sense has-sn"> <span class="sn sense-a"><span class="letter">a</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>the divine Wisdom manifest in the creation, government, and redemption of the world and often identified with the second person of the Trinity <strong class="mw_t_bc">: </strong><a href="gdlookup://localhost/logos" class="mw_t_sx"><span class="text-uppercase">logos</span></a> <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t has-aq sents sents-block">&lt;Christ is the <span class="mw_t_wi">Word</span> become flesh<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — J. A. Mackay</span></span>&gt;</span></span></span></span> </div> </span> <span class="sb-2"> <div class="sense has-sn"> <span class="sn sense-b"><span class="letter">b</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong><a href="gdlookup://localhost/gospel" class="mw_t_sx"><span class="text-uppercase">gospel</span></a> <span class="text-lowercase">1</span> <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t has-aq sents sents-block">&lt;preach the <span class="mw_t_wi">Word</span> in the mountains of eastern Tennessee<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — H. L. Mencken</span></span>&gt;</span></span></span></span> </div> </span> <span class="sb-3"> <div class="sense has-sn"> <span class="sn sense-c"><span class="letter">c</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>the expressed or manifested mind and will of God <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t has-aq sents sents-block">&lt;God's <span class="mw_t_wi">Word</span> was one of the most general terms used by Israel for revelation<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — G. E. Wright</span></span>&gt;</span></span></span></span> </div> </span> <span class="sb-4"> <div class="sense has-sn"> <span class="sn sense-d"><span class="letter">d</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>a holy book <strong class="mw_t_bc">: </strong>a canon or collection of sacred scriptures <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t has-aq sents sents-block">&lt;will be readings from the <span class="mw_t_wi">Words of God</span>—the Torah, the Bible, the Koran<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Edris Rice-Wray</span></span>&gt;</span></span></span></span> </div> </span> </div> <div class="sb has-num has-let"> <span class="sb-0"> <div class="sense has-sn"> <span class="sn sense-5 a"><span class="num">5</span> <span class="letter">a</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong><a href="gdlookup://localhost/news" class="mw_t_sx"><span class="text-uppercase">news</span></a>, <a href="gdlookup://localhost/report" class="mw_t_sx"><span class="text-uppercase">report</span></a>, <a href="gdlookup://localhost/account" class="mw_t_sx"><span class="text-uppercase">account</span></a>, <a href="gdlookup://localhost/message" class="mw_t_sx"><span class="text-uppercase">message</span></a>, <a href="gdlookup://localhost/information" class="mw_t_sx"><span class="text-uppercase">information</span></a> <span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used in the singular and often with no article<span class="vis" hidden=""> <span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t has-aq sents sents-block">&lt;brought <span class="mw_t_wi">word</span> that a financial backer of the expedition … had died<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="source hidden"> — <em class="mw_t_it">American Guide Series: Maine</em></span></span>&gt;</span></span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t has-aq sents sents-block">&lt;sent <span class="mw_t_wi">word</span> … that he planned to attend<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="source hidden"> — <em class="mw_t_it">New York Times</em></span></span>&gt;</span></span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;in Washington when the <span class="mw_t_wi">word</span> came of a great defeat at Bull Run&gt;</span></span></span></span></span></span> </span></span></div> </span> <span class="sb-1"> <div class="sense has-sn"> <span class="sn sense-b"><span class="letter">b</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>common talk or report <strong class="mw_t_bc">: </strong><a href="gdlookup://localhost/rumor" class="mw_t_sx"><span class="text-uppercase">rumor</span></a> <span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used in the singular and often with no article<span class="vis" hidden=""> <span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t has-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">word</span> of the prowess of the twelve-year-old got about</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="source hidden"> — <em class="mw_t_it">Current Biography</em></span></span>&gt;</span></span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t has-aq sents sents-block">&lt;the <span class="mw_t_wi">word</span> has gone about that there will be no prosecution<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Tom Fitzsimmons</span></span>&gt;</span></span></span></span></span></span></span> </span></span></div> </span> </div> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-6"><span class="num">6</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>the act of speaking or of making verbal communication of any kind <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;loyal in <span class="mw_t_wi">word</span> and deed&gt;</span></span> <strong class="mw_t_bc">: </strong>product of such an act <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;what people learn from the written <span class="mw_t_wi">word</span>&gt;</span></span></span> </div> </span> </div> <div class="sb has-num has-let"> <span class="sb-0"> <div class="sense has-sn"> <span class="sn sense-7 a"><span class="num">7</span> <span class="letter">a</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong><a href="gdlookup://localhost/saying" class="mw_t_sx"><span class="text-uppercase">saying</span></a>, <a href="gdlookup://localhost/proverb" class="mw_t_sx"><span class="text-uppercase">proverb</span></a>, <a href="gdlookup://localhost/maxim" class="mw_t_sx"><span class="text-uppercase">maxim</span></a></span> </div> </span> <span class="sb-1"> <div class="sense has-sn"> <span class="sn sense-b"><span class="letter">b</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>a motto especially in heraldry</span> </div> </span> </div> <div class="sb has-subnum has-num has-let"> <span class="sb-0"> <div class="pseq no-subnum"> <div class="sense has-sn has-subnum"> <span class="sn sense-8 a (1)"><span class="num">8</span> <span class="letter">a</span> <span class="sub-num">(1)</span></span> <span class="dt"><strong class="mw_t_bc">: </strong><a href="gdlookup://localhost/promise" class="mw_t_sx"><span class="text-uppercase">promise</span></a> <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;I give you my <span class="mw_t_wi">word</span>&gt;</span></span><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;kept her <span class="mw_t_wi">word</span>&gt;</span></span><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;as good as his <span class="mw_t_wi">word</span>&gt;</span></span></span> </div> <div class="sense has-sn has-subnum"> <span class="sn sense-(2)"><span class="sub-num">(2)</span></span> <span class="dt"><strong class="mw_t_bc">: </strong>the honor involved in the keeping of a promise <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;pledged himself on his <span class="mw_t_wi">word</span> to be present&gt;</span></span></span> </div> </div> </span> <span class="sb-1"> <div class="sense has-sn"> <span class="sn sense-b"><span class="letter">b</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>an assertion implying the authority or truthfulness of the person making it <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;not that I doubt your <span class="mw_t_wi">word</span>&gt;</span></span><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;take my <span class="mw_t_wi">word</span> for it&gt;</span></span><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;has the doctor's <span class="mw_t_wi">word</span> for it that no operation is needed&gt;</span></span></span> </div> </span> </div> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-9"><span class="num">9</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>a quarrelsome utterance or conversation <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;one <span class="mw_t_wi">word</span> led to another&gt;</span></span><span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">usually used in plural<span class="vis" hidden=""> <span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;some <span class="mw_t_wi">words</span> between him and his father&gt;</span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;he and his friend had <span class="mw_t_wi">words</span> and parted&gt;</span></span></span></span> <span class="unText"> and sometimes with an adjective modifier<span class="vis" hidden=""> <span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;some hard <span class="mw_t_wi">words</span> passed between them&gt;</span></span></span></span></span></span> </span></span></span></div> </span> </div> <div class="sb has-num has-let"> <span class="sb-0"> <div class="sense has-sn"> <span class="sn sense-10 a"><span class="num">10</span> <span class="letter">a</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>a verbal signal <strong class="mw_t_bc">: </strong><a href="gdlookup://localhost/password" class="mw_t_sx"><span class="text-uppercase">password</span></a>, <a href="gdlookup://localhost/watchword" class="mw_t_sx"><span class="text-uppercase">watchword</span></a></span> </div> </span> <span class="sb-1"> <div class="sense has-sn"> <span class="sn sense-b"><span class="letter">b</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>the most appropriate term to indicate what kind of action is required or prevalent <span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used in the predicate after <em class="mw_t_it">the</em><span class="vis" hidden=""> <span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;in dealing with difficult children, patience is the <span class="mw_t_wi">word</span>&gt;</span></span></span></span></span></span> </span></span></div> </span> <span class="sb-2"> <div class="sense has-sn"> <span class="sn sense-c"><span class="letter">c</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>the most appropriate term to express the idea intended <span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used in the predicate after <em class="mw_t_it">the</em><span class="vis" hidden=""> <span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;mediocre is not the <span class="mw_t_wi">word</span> for his performance; it was incredibly bad&gt;</span></span></span></span></span></span> </span></span></div> </span> </div> </div> </div> <div class="dro"> <span id="at-a-word-anchor" class="drp">at a word</span> <span class="fl">adverb</span> <div class="vg" hidden=""> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-1"><span class="num">1</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>at a single word of command, request, or suggestion</span> </div> </span> </div> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-2"><span class="num">2</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>in short <strong class="mw_t_bc">: </strong>to sum up <strong class="mw_t_bc">: </strong><a href="gdlookup://localhost/concisely" class="mw_t_sx"><span class="text-uppercase">concisely</span></a></span> </div> </span> </div> </div> <span id="good-word-anchor" class="drp">good word</span> <div class="vg" hidden=""> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-1"><span class="num">1</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>a favorable statement <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;say a <span class="mw_t_wi">good word</span> for him&gt;</span></span></span> </div> </span> </div> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-2"><span class="num">2</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>good news <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;spreading the <span class="mw_t_wi">good word</span>&gt;</span></span><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;hello, there; what's the <span class="mw_t_wi">good word</span>&gt;</span></span></span> </div> </span> </div> </div> <span id="in-a-word-anchor" class="drp">in a word<span class="vr"><span class="vl"> or less commonly </span><span id="in-one-word-anchor" class="va">in one word</span></span></span>  <div class="vg" hidden=""> <div class="sb no-sn"> <span class="sb-0"> <div class="sense no-subnum"> <span class="dt"><strong class="mw_t_bc">: </strong>in short <strong class="mw_t_bc">: </strong>to sum up</span> </div> </span> </div> </div> <span id="in-so-many-words-anchor" class="drp">in so many words</span> <div class="vg" hidden=""> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-1"><span class="num">1</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>in exactly those terms <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;implied that such actions were criminal but did not say so <span class="mw_t_wi">in so many words</span>&gt;</span></span></span> </div> </span> </div> <div class="sb has-num"> <span class="sb-0"> <div class="sense has-num-only"> <span class="sn sense-2"><span class="num">2</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>in plain forthright language <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t has-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">in so many words,</span> she wasn't fit to be seen</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Jean Stafford</span></span>&gt;</span></span></span></span> </div> </span> </div> </div> <span id="my-word-anchor" class="drp">my word</span> <div class="vg" hidden=""> <div class="sb no-sn"> <span class="sb-0"> <div class="sense no-subnum"> <span class="dt"><span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used to express surprise<span class="vis" hidden=""> <span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">my word,</span> what a nasty look she gave you</span>&gt;</span></span></span></span></span></span> </span></span></div> </span> </div> </div> <span id="of-few-words-anchor" class="drp">of few words</span> <div class="vg" hidden=""> <div class="sb no-sn"> <span class="sb-0"> <div class="sense no-subnum"> <span class="dt"><strong class="mw_t_bc">: </strong>not inclined to say more than necessary <strong class="mw_t_bc">: </strong><a href="gdlookup://localhost/laconic" class="mw_t_sx"><span class="text-uppercase">laconic</span></a> <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;a man <span class="mw_t_wi">of few words</span>&gt;</span></span></span> </div> </span> </div> </div> <span id="of-many-words-anchor" class="drp">of many words</span> <div class="vg" hidden=""> <div class="sb no-sn"> <span class="sb-0"> <div class="sense no-subnum"> <span class="dt"><strong class="mw_t_bc">: </strong><a href="gdlookup://localhost/talkative" class="mw_t_sx"><span class="text-uppercase">talkative</span></a>, <a href="gdlookup://localhost/verbose" class="mw_t_sx"><span class="text-uppercase">verbose</span></a></span> </div> </span> </div> </div> <span id="of-one-s-word-anchor" class="drp">of one's word</span> <div class="vg" hidden=""> <div class="sb no-sn"> <span class="sb-0"> <div class="sense no-subnum"> <span class="dt"><strong class="mw_t_bc">: </strong>that can be relied on to keep a promise <span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used only after <em class="mw_t_it">man</em> or <em class="mw_t_it">woman</em><span class="vis" hidden=""> <span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;a man <span class="mw_t_wi">of his word</span>&gt;</span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;a woman <span class="mw_t_wi">of her word</span>&gt;</span></span></span></span></span></span> </span></span></div> </span> </div> </div> <span id="upon-my-word-anchor" class="drp">upon my word<span class="vr"><span class="vl"> or less commonly </span><span id="on-my-word-anchor" class="va">on my word</span></span></span>  <div class="vg" hidden=""> <div class="sb no-sn"> <span class="sb-0"> <div class="sense no-subnum"> <span class="dt"><strong class="mw_t_bc">: </strong>with my assurance <strong class="mw_t_bc">: </strong><a href="gdlookup://localhost/assuredly" class="mw_t_sx"><span class="text-uppercase">assuredly</span></a>, <a href="gdlookup://localhost/indeed" class="mw_t_sx"><span class="text-uppercase">indeed</span></a> <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">upon my word,</span> I never heard of such a thing</span>&gt;</span></span></span> </div> </span> </div> </div> <span id="words-of-one-syllable-anchor" class="drp">words of one syllable</span> <div class="vg" hidden=""> <div class="sb no-sn"> <span class="sb-0"> <div class="sense no-subnum"> <span class="dt"><strong class="mw_t_bc">: </strong>plain forthright language <span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;he has had a bit too much; in <span class="mw_t_wi">words of one syllable,</span> he is drunk&gt;</span></span></span> </div> </span> </div> </div> </div> <div class="def-accordion-sections"> <div class="section custom-accordion" data-id="origin"> <h2 class="toggle"><span class="text">Origin of WORD</span><span class="toggle-icon">[+]</span></h2> <div class="section-content etymology" hidden=""> <div class="sub-well"> <p><span class="et">Middle English, from Old English; akin to Old High German <em class="mw_t_it">wort</em> word, Old Norse <em class="mw_t_it">orth</em>, Gothic <em class="mw_t_it">waurd</em>, Latin <em class="mw_t_it">verbum</em> word, Greek <em class="mw_t_it">eirein</em> to say, <em class="mw_t_it">rhēma</em> word, <em class="mw_t_it">rhētōr</em> orator, Lithuanian <em class="mw_t_it">vardas</em> name</span></p> <p>First Known Use: before 12th century (sense 1a)</p> </div> </div></div> <div class="section custom-accordion related-to" data-id="related-to">	<h2 class="toggle"><span class="text">Related to WORD </span><span class="toggle-icon">[+]</span></h2>	<div class="section-content" hidden="">	<div class="sub-well"> <div id="synonym-discussion-anchor" class="widget syns_discussion syns-module-anchor"> <div class="syn synonym-discussion"> <p class="syn"> <strong>Synonym Discussion</strong> <a href="gdlookup://localhost/word" class="mw_t_sc">word</a>, <a href="gdlookup://localhost/vocable" class="mw_t_sc">vocable</a> and <a href="gdlookup://localhost/term" class="mw_t_sc">term</a> can mean any letter or combination of letters or any sound or combination of sounds capable of being pronounced and expressing an idea that is by tradition or common consent associated with the letters or the sounds. <a href="gdlookup://localhost/word" class="mw_t_sc">word</a> applies to a letter or combination of letters or a sound or a combination of sounds that forms an indivisible whole constituting one of the ultimate units of a language; <a href="gdlookup://localhost/vocable" class="mw_t_sc">vocable</a> throws emphasis upon a word as pronounced or spelled rather than as a unit of meaning <span class="ex-sent t has-aq sents sents-inline"> &lt;a flat denial of poetic possibilities, in the case of any <em class="mw_t_it">vocable</em>, is liable to disastrous refutation <span class="ex-sent aq has-aq sents" style="margin-left: 0px;"> <span class="aq"> <span class="auth hidden"> — J. L. Lowes</span></span>&gt; </span></span>  <span class="ex-sent t has-aq sents sents-inline"> &lt;accustomed to songs in which the words are often merely convenient <em class="mw_t_it">vocables</em> with the melody usually more important than the text <span class="ex-sent aq has-aq sents" style="margin-left: 0px;"> <span class="aq"> <span class="auth hidden"> — Evelyn H. Scholl</span></span>&gt; </span></span>  <a href="gdlookup://localhost/term" class="mw_t_sc">term</a> applies both to words and to phrases that express a whole idea and form one of the units of expression in a language, applying especially to units with a more or less precise technical use or meaning <span class="ex-sent t has-aq sents sents-inline"> &lt;the <em class="mw_t_it">term</em> communism is used today to describe both a political philosophy and its translation into reality <span class="ex-sent aq has-aq sents" style="margin-left: 0px;"> <span class="aq"> <span class="auth hidden"> — H. W. Gatzke</span></span>&gt; </span></span>  <span class="ex-sent t has-aq sents sents-inline"> &lt;<span class="mw_t_sp">"the most important woman in Finland" is a <em class="mw_t_it">term</em> which has been applied</span> <span class="ex-sent aq has-aq sents" style="margin-left: 0px;"> <span class="aq"> <span class="source hidden"> — <em class="mw_t_it">Current Biography</em></span></span>&gt; </span></span>  <span class="ex-sent t no-aq sents sents-inline"> &lt;all professions are likely to develop innumerable <em class="mw_t_it">terms</em> that constitute an almost private jargon&gt; </span> </p> </div> </div> </div>	</div></div> </div> </div> </div> </div></div> </div></mean>
```