# n8n-nodes-extractor

[![npm version](https://img.shields.io/npm/v/n8n-nodes-easybits-extractor.svg)](https://www.npmjs.com/package/n8n-nodes-easybits-extractor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

n8n community node that sends documents to the [Easybits Extractor](https://extractor.easybits.tech) API for structured data extraction.

Replace complex OCR setups, fragile Regex logic, and heavy cloud consoles (like AWS Textract) with a single node that guarantees strictly typed JSON output.

## What it does

Here is the standard flow:
1. Create a pipeline: Define your extraction schema for free at [extractor.easybits.tech](https://extractor.easybits.tech).
2. Pass the file: Use this node in n8n to send your document. It accepts PDF, JPG, or PNG files, either as standard n8n Binary Files or base64 Data URLs.
3. Get structured data back: The node returns a strictly typed JSON object containing the exact key-value pairs you defined, ready to be used in your downstream n8n nodes.

## Installation

Follow the [n8n community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

The package name is: `n8n-nodes-easybits-extractor`

## What can you build with this node?
This node is designed for high-stakes, production-grade document automation:
**Accounting & Order Processing:** Automate the extraction of key data points from order and invoice documents for inventory management and accounting.
**Digital Document Archiving:** Automate the extraction and classification of relevant information for structured storage in public administration Document Management Systems (DMS).
**Claims Processing for Insurers:** Automate FNOL (First Notice of Loss) capture and extract structured data from messy claims documents.
**Medical Reports:** Extract critical findings from medical reports and handwritten doctor prescriptions.

## Supported file formats

**JPEG**, **PNG**, and **PDF** — other file types will be rejected with a clear error message.

## Configuration

| Parameter          | Description                                                              |
| ------------------ | ------------------------------------------------------------------------ |
| **Pipeline ID**    | The ID of your extraction pipeline, obtained from Easybits Extractor     |
| **API Key**        | Your API key from the Easybits Extractor dashboard (stored as a secret)  |
| **Input Type**     | How files are provided: **Binary Files** (default), **Data URLs**, or **Auto (Both)** |
| **Data URL Field** | JSON field name containing base64 Data URL(s). Shown when Input Type is Data URLs or Auto. Default: `dataUrl` |

### Input types

- **Binary Files** — reads binary attachments from input items (e.g. from Read Binary File, HTTP Request, or email trigger nodes). This is the default and matches the original behavior.
- **Data URLs** — reads pre-encoded base64 Data URLs from a JSON field on each item. Useful when you already have Data URLs from a previous API response or a Set node.
- **Auto (Both)** — collects both binary attachments and Data URLs from the same items. Handy when mixing sources.

## How it works

1. Collects files from all input items (as binary attachments, Data URLs, or both — depending on Input Type)
2. Converts binary files to base64 Data URLs; passes Data URLs through as-is
3. POSTs them all to `https://extractor.easybits.tech/api/pipelines/{pipelineId}` with Bearer auth
4. Returns the extraction result as a single JSON output item

## usage

### Extract data from a single file

Use **Read Binary File** to load a document, then connect it to easybits Extractor.

```
[Read Binary File] → [easybits Extractor]
```

Extractor settings:
- **Input Type**: Binary Files
- **Pipeline ID**: your pipeline ID
- **API Key**: your API key

### Extract data from multiple files

Any node that outputs multiple items with binary attachments works — for example, reading files from disk in a loop, or an email trigger that has several attachments.

```
[Read Binary Files (loop)] → [easybits Extractor]
```

All binary attachments across all input items are collected and sent in a single API call.

### Extract from an HTTP-downloaded file

Use **HTTP Request** with "Response Format" set to **File** to download a PDF or image, then pass it directly to the extractor.

```
[HTTP Request (download file)] → [easybits Extractor]
```

### Pass a base64 Data URL from a previous step

If you already have a base64 Data URL (e.g. from another API response), use the **Data URLs** input type.

```
[HTTP Request / Set node] → [easybits Extractor]
```

Extractor settings:
- **Input Type**: Data URLs
- **Data URL Field**: `dataUrl` (or whatever field contains the Data URL in your JSON)

The JSON item should look like:

```json
{
  "dataUrl": "data:image/png;base64,iVBORw0KGgo..."
}
```

The field can also contain an **array** of Data URLs:

```json
{
  "dataUrl": [
    "data:image/jpeg;base64,/9j/4AAQ...",
    "data:image/jpeg;base64,JVBERi0..."
  ]
}
```

### Read a Data URL from a nested JSON field

If the Data URL is nested inside the JSON structure, use dot notation in the **Data URL Field** parameter.

For this JSON:

```json
{
  "response": {
    "attachments": [
      { "url": "data:image/png;base64,iVBORw0KGgo..." }
    ]
  }
}
```

Set **Data URL Field** to `response.attachments.0.url`.

### Mix binary files and Data URLs

Use **Auto (Both)** to collect from both sources at once.

```
[Read Binary File] ──┐
                      ├──→ [Merge] → [easybits Extractor]
[HTTP Request (JSON)] ┘
```

Extractor settings:
- **Input Type**: Auto (Both)
- **Data URL Field**: the field name for items that carry Data URLs

Binary attachments are converted to Data URLs automatically; JSON Data URLs are passed through as-is. Everything is sent in one API call.

## Compatibility

Requires n8n v0.187 or later (community node support).

## Resources

- [Easybits Extractor documentation](https://extractor.easybits.tech/documentation)
- [n8n community nodes docs](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE)
