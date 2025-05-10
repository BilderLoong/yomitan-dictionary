# Merriam-Webster Unabridged Dictionary Parser

This package processes Merriam-Webster Unabridged dictionary data and converts it to Yomitan-compatible dictionary format.

## Origin data

Origin data is download from [Merriam Webster's Unabridged 2024 modified 04.05.2025 (MDX).7z](https://cloud.freemdict.com/index.php/s/pgKcDcbSDTCzXCs/download?path=%2FENGLISH%2FEng-Eng%2FMerriam-Webster%27s%20Dictionaries%2FMerriam-Webster%E2%80%99s%20Unabridged&files=Merriam%20Webster%27s%20Unabridged%202024%20modified%2004.05.2025%20(MDX).7z) which is located at [Merriam-Webster’s Unabridged - ファイル - FreeMdict Cloud](https://cloud.freemdict.com/index.php/s/pgKcDcbSDTCzXCs?path=%2FENGLISH%2FEng-Eng%2FMerriam-Webster%27s%20Dictionaries%2FMerriam-Webster%E2%80%99s%20Unabridged).
The MDX files are then processed to a sqlite database format for easier access and manipulation by using [ilius/pyglossary: A tool for converting dictionary files aka glossaries. Mainly to help use our offline glossaries in any Open Source dictionary we like on any modern operating system / device.](https://github.com/ilius/pyglossary).

If the golden dict can't load downloaded MDX dictionary make sure the current user has write and read permissions for those files.

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