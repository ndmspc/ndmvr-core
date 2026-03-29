# Histogram Subject

## Overview

The Histogram Subject is a sophisticated singleton RxJS-based communication channel for managing histogram data streams. Unlike other subjects, it maintains **separate ReplaySubject streams for each histogram ID**, allowing components to subscribe to specific histograms. It also handles automatic parsing of histogram data from various sources (files, URLs, JSON objects).

## Class Structure

```javascript
class HistogramSubject {
  #subjects = new Map();  // id → ReplaySubject(1)
}
```

## Architecture

**Key Innovation:** Instead of one global subject, this maintains a Map of subjects:
- **Key:** Histogram ID (string)
- **Value:** `ReplaySubject(1)` for that specific histogram

This allows:
- Per-histogram subscriptions
- Independent histogram state management
- Efficient updates to specific histograms

## Methods

### getStream(id)

Gets or creates an Observable stream for a specific histogram ID.

**Parameters:**
- `id` (string) - The unique histogram identifier

**Returns:** `Observable` - Stream of histogram updates for this specific ID

**Behavior:**
- Creates a new `ReplaySubject(1)` if ID doesn't exist
- Returns existing subject's observable if ID exists
- Each histogram has its own independent stream

**Usage:**
```javascript
import { histogramSubjectGet } from './rxjs/HistogramSubject.js';

// Subscribe to specific histogram
histogramSubjectGet().getStream('histogram1').subscribe(histo => {
  console.log('Histogram 1 updated:', histo);
});

// Different histogram, different stream
histogramSubjectGet().getStream('histogram2').subscribe(histo => {
  console.log('Histogram 2 updated:', histo);
});
```

### async next(e)

Processes and broadcasts histogram data to the appropriate stream.

**Parameters:**
- `e` (object) - Histogram event object

**Event Object Structure:**
```javascript
{
  id: 'histogram-id',  // Required
  obj: string | object,  // Histogram data (URL, file path, or JSON object)
  opts: {  // Optional
    render: 'jsroot' | 'custom',
    config: { /* histogram config */ }
  }
}
```

**Behavior:**
1. **Validation:** Throws error if `id` is missing
2. **Data Preprocessing:**
   - If `obj` is string: Parses as file using `FileHandler.parseFile()`
   - If `obj` is object: Parses as JSON using `JsonHandler.parseJson()`
   - Otherwise: Throws "Unsupported data type" error
3. **Config Parsing:** Parses `opts.config` if present
4. **Stream Creation:** Creates subject for ID if not exists
5. **Broadcasting:** Emits processed data to ID-specific stream

**Usage:**
```javascript
import { histogramSubjectGet } from './rxjs/HistogramSubject.js';

// Load from file
await histogramSubjectGet().next({
  id: 'histogram1',
  obj: '/path/to/histogram.root'
});

// Load from URL
await histogramSubjectGet().next({
  id: 'histogram2',
  obj: 'https://example.com/data.root'
});

// Load from JSON object
await histogramSubjectGet().next({
  id: 'histogram3',
  obj: {
    fName: 'MyHistogram',
    fXaxis: { /* ... */ },
    fYaxis: { /* ... */ }
  },
  opts: {
    render: 'jsroot',
    config: {
      color: 0xff0000
    }
  }
});
```

## Singleton Pattern

```javascript
export const histogramSubjectGet = () => {
  if (!histogramSubject) histogramSubject = new HistogramSubject();
  return histogramSubject;
};
```

## Data Flow

```
1. External code calls histogramSubjectGet().next({...})
2. HistogramSubject validates and preprocesses data
3. Data is parsed (file/URL/JSON)
4. Config is parsed if present
5. Subject for specific ID is obtained/created
6. Processed data is emitted to ID-specific stream
7. Subscribed components receive update
```

## Supported Data Sources

### 1. File Path (String)
```javascript
await histogramSubjectGet().next({
  id: 'histo1',
  obj: './data/histogram.root'
});
```
**Processing:** `FileHandler.parseFile()`

### 2. URL (String)
```javascript
await histogramSubjectGet().next({
  id: 'histo1',
  obj: 'https://root.cern/files/histogram.root'
});
```
**Processing:** `FileHandler.parseFile()` (handles URLs)

### 3. JSON Object
```javascript
await histogramSubjectGet().next({
  id: 'histo1',
  obj: {
    _typename: 'TH3F',
    fXaxis: { fNbins: 10, /* ... */ },
    // ... ROOT object properties
  }
});
```
**Processing:** `JsonHandler.parseJson()`

## Stream Isolation

Each histogram has its own independent stream:

```javascript
// Component A subscribes to histogram1
histogramSubjectGet().getStream('histogram1').subscribe(h => {
  console.log('H1:', h);  // Only receives histogram1 updates
});

// Component B subscribes to histogram2
histogramSubjectGet().getStream('histogram2').subscribe(h => {
  console.log('H2:', h);  // Only receives histogram2 updates
});

// Updates are isolated
await histogramSubjectGet().next({
  id: 'histogram1',
  obj: data1  // Only Component A receives this
});

await histogramSubjectGet().next({
  id: 'histogram2',
  obj: data2  // Only Component B receives this
});
```

## Complete Example

```javascript
import { histogramSubjectGet } from './rxjs/HistogramSubject.js';

// Histogram component implementation
class HistogramComponent {
  constructor(elementId) {
    this.id = elementId;
    this.subscription = null;
  }

  init() {
    // Subscribe to this specific histogram's stream
    this.subscription = histogramSubjectGet()
      .getStream(this.id)
      .subscribe({
        next: (histo) => {
          console.log(`Histogram ${this.id} received data:`, histo);
          this.render(histo.obj, histo.opts);
        },
        error: (err) => {
          console.error(`Histogram ${this.id} error:`, err);
        }
      });
  }

  render(histogramObj, options) {
    // Render based on options
    if (options?.render === 'jsroot') {
      this.renderJSROOT(histogramObj);
    } else {
      this.renderCustom(histogramObj, options);
    }
  }

  cleanup() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}

// Usage: Create multiple histogram components
const histo1 = new HistogramComponent('histogram1');
const histo2 = new HistogramComponent('histogram2');

histo1.init();
histo2.init();

// Load data for each histogram
await histogramSubjectGet().next({
  id: 'histogram1',
  obj: '/data/experiment1.root',
  opts: { render: 'jsroot' }
});

await histogramSubjectGet().next({
  id: 'histogram2',
  obj: {
    _typename: 'TH3F',
    fXaxis: { /* ... */ }
  },
  opts: {
    render: 'custom',
    config: { color: 0x00ff00 }
  }
});

// Update specific histogram
await histogramSubjectGet().next({
  id: 'histogram1',
  obj: '/data/experiment1_updated.root'
});

// Cleanup
histo1.cleanup();
histo2.cleanup();
```

## Error Handling

```javascript
try {
  await histogramSubjectGet().next({
    id: 'histogram1',
    obj: invalidData
  });
} catch (error) {
  if (error.message === 'Missing id in event') {
    console.error('Histogram ID is required');
  } else if (error.message === 'Unsupported data type') {
    console.error('obj must be string or object');
  } else {
    console.error('Failed to process histogram:', error);
  }
}
```

## Subject Type: Map of ReplaySubject(1)

**Characteristics:**
- **Per-ID Subjects:** Each histogram ID gets its own `ReplaySubject(1)`
- **Buffer Size:** 1 per histogram (stores last emitted value)
- **Replay Behavior:** New subscribers immediately receive last histogram data
- **Isolation:** Updates to one histogram don't affect others

## Dependencies

- RxJS library (`ReplaySubject`)
- `FileHandler` from `../service/FileHandler.js`
- `JsonHandler` from `../service/JsonHandler.js`
- `parseConfig` from `../utils/baseUtil.js`

## Related Components

- [Histogram JSROOT](../visualization/histogram-jsroot.md)
- [THnPainter](../visualization/thnpainter.md)
- [Config Subject](config-subject.md)

## Best Practices

1. **Always provide ID:** The `id` field is required
2. **Use async/await:** `next()` is asynchronous due to file parsing
3. **Error handling:** Wrap `next()` calls in try-catch
4. **Subscribe per ID:** Use `getStream(id)` for specific histograms
5. **Cleanup subscriptions:** Always unsubscribe when done
6. **Stream isolation:** Take advantage of per-histogram streams
7. **Config merging:** Use `opts.config` for histogram-specific settings

## Source code:
[View this component on Gitlab](https://gitlab.com/ndmspc/ndmvr-core/-/blob/main/src/rxjs/HistogramSubject.js?ref_type=heads)
