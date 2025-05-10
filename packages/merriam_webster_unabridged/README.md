# Merriam-Webster Unabridged Dictionary Parser

This package processes Merriam-Webster Unabridged dictionary data and converts it to Yomitan-compatible dictionary format.

## Features

- Parses MDX dictionary HTML content into structured format
- Extracts term, reading, and definitions from HTML
- Supports example sentences and part of speech data
- Progress reporting during dictionary construction

## Usage

### Setup

```bash
# Install dependencies
pnpm install
```

### Building the Dictionary

```bash
# Run the build process
bun src/index.ts
```

### Using the MDX Parser

The package includes functionality to parse Merriam-Webster MDX HTML format into structured data:

```typescript
// Import the parser
import { parseMdxDictionaryHtml } from './path/to/parser';

// Parse MDX HTML content
const result = parseMdxDictionaryHtml(htmlContent);
// Result contains: { term, reading, definitions }
```

### Creating Dictionary Entries

```typescript
// Parse the MDX HTML and create a dictionary entry
const entryData = createDictionaryEntryFromMdx(htmlContent);

// Add to dictionary
await dictionary.addTerm(entryData);
```

## Testing the Parser

To test the MDX parser with a sample entry, uncomment the test function call at the end of `index.ts`:

```typescript
// Uncomment to run the test
await testMdxParsing();
```

## Schema

The dictionary adheres to the Yomitan dictionary schema for structured content, ensuring compatibility with the Yomitan extension.

## Database Structure

The database contains word records with the following structure:

```typescript
interface WordRecord {
  id: number;
  w: string; // word text
  m: string; // meaning/content - can be MDX HTML format
}
```

## License

See the project's LICENSE file for details. 