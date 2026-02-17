# Dispatch Subject

## Overview

The Dispatch Subject is a singleton RxJS-based communication channel for dispatching general-purpose events throughout the application. It uses a standard `Subject` without buffering, making it ideal for fire-and-forget event notifications.

## Class Structure

```javascript
class DispatchSubject {
  #subject;  // Private Subject
}
```

## Methods

### constructor()

Creates a new `DispatchSubject` instance with a standard `Subject`.

**Behavior:**
- Initializes a private `Subject` with no initial value
- No replay functionality - subscribers only receive events emitted after subscription

### getObservable()

Returns an Observable from the subject for subscribing to dispatch events.

**Returns:** `Observable` - Observable stream of dispatch events

**Usage:**
```javascript
import { dispatchSubjectGet } from './rxjs/DispatchSubject.js';

dispatchSubjectGet().getObservable().subscribe(event => {
  console.log('Event dispatched:', event);
});
```

### next(e)

Dispatches an event to all current subscribers.

**Parameters:**
- `e` - The event object to dispatch

**Usage:**
```javascript
import { dispatchSubjectGet } from './rxjs/DispatchSubject.js';

dispatchSubjectGet().next({
  type: 'histogram-selected',
  histogramId: 'histo1',
  timestamp: Date.now()
});
```

## Singleton Pattern

The module exports a singleton accessor function:

```javascript
export const dispatchSubjectGet = () => {
  if (!dispatchSubject) dispatchSubject = new DispatchSubject();
  return dispatchSubject;
};
```

**Benefits:**
- Ensures only one instance exists throughout the application
- Provides global access to the event dispatch system
- Lightweight event bus for application-wide events

## Use Cases

1. **Global Event Bus:**
   - Dispatch application-level events
   - Notify multiple components of state changes
   - Implement loosely coupled component communication

2. **Action Notifications:**
   - User interaction events
   - System state changes
   - Async operation completions

3. **Cross-Component Communication:**
   - Components that don't have direct relationships
   - Broadcasting events to multiple listeners
   - Decoupling event producers from consumers

4. **Command Pattern:**
   - Dispatch commands to be executed by handlers
   - Implement undo/redo functionality
   - Queue and process actions

## Subject Type: Subject

**Characteristics:**
- **No Initial Value:** Unlike BehaviorSubject, has no initial state
- **No Replay:** New subscribers don't receive past events
- **Hot Observable:** Events are missed if not subscribed at emit time
- **Use Case:** Perfect for fire-and-forget event notifications

**Important:** Subscribers must be subscribed **before** events are emitted to receive them.

## Example Event Structures

While the implementation is flexible, consider standardizing event structure:

```javascript
// Basic event
{
  type: 'event-name',
  payload: { /* event data */ }
}

// Action event
{
  type: 'action',
  action: 'update-histogram',
  target: 'histogram1',
  data: { /* action data */ }
}

// Lifecycle event
{
  type: 'lifecycle',
  phase: 'mounted',
  component: 'histogram-visualizer'
}
```

## Data Flow Example

```javascript
import { dispatchSubjectGet } from './rxjs/DispatchSubject.js';

// Component A: Subscribe to events (must subscribe first!)
const subscription = dispatchSubjectGet().getObservable().subscribe({
  next: (event) => {
    console.log('Event received:', event);
    if (event.type === 'histogram-updated') {
      refreshHistogramDisplay(event.histogramId);
    }
  },
  error: (err) => console.error('Dispatch error:', err)
});

// Component B: Dispatch events
function onHistogramUpdate(histogramId) {
  dispatchSubjectGet().next({
    type: 'histogram-updated',
    histogramId: histogramId,
    timestamp: Date.now()
  });
}

// Later: cleanup
subscription.unsubscribe();
```

## Filtering Events

Use RxJS operators to filter specific event types:

```javascript
import { dispatchSubjectGet } from './rxjs/DispatchSubject.js';
import { filter } from 'rxjs/operators';

// Only receive histogram events
const histogramEvents$ = dispatchSubjectGet()
  .getObservable()
  .pipe(
    filter(event => event.type?.startsWith('histogram-'))
  );

histogramEvents$.subscribe(event => {
  console.log('Histogram event:', event);
});
```

## Comparison with Other Subjects

| Feature | DispatchSubject | BehaviorSubject | ReplaySubject |
|---------|----------------|-----------------|---------------|
| Initial Value | ❌ None | ✅ Required | ❌ None |
| Replay | ❌ No | ✅ Current only | ✅ Buffer size |
| Use Case | Events | State | Recent state |

## Dependencies

- RxJS library (`Subject`)

## Related Components

- [Function Subject](function-subject.md)
- [State Subject](state-subject.md)
- [Config Subject](config-subject.md)

## Best Practices

1. **Subscribe early:** Subscribe before events are emitted to avoid missing them
2. **Always use singleton accessor:** Use `dispatchSubjectGet()`
3. **Standardize event structure:** Define consistent event shapes
4. **Use type field:** Include a `type` field for event identification
5. **Unsubscribe:** Always clean up subscriptions to prevent memory leaks
6. **Error handling:** Include error handlers in subscriptions
7. **Consider alternatives:** For state management, consider BehaviorSubject or StateSubject

## Example: Event-Driven Architecture

```javascript
import { dispatchSubjectGet } from './rxjs/DispatchSubject.js';
import { filter } from 'rxjs/operators';

// Define event types
const EventTypes = {
  HISTOGRAM_SELECTED: 'histogram-selected',
  HISTOGRAM_UPDATED: 'histogram-updated',
  USER_INTERACTION: 'user-interaction',
  ERROR_OCCURRED: 'error-occurred'
};

// Event dispatcher utility
class EventDispatcher {
  static dispatch(type, payload) {
    dispatchSubjectGet().next({
      type,
      payload,
      timestamp: Date.now()
    });
  }
}

// Event listener utility
class EventListener {
  static listen(eventType, handler) {
    return dispatchSubjectGet()
      .getObservable()
      .pipe(filter(event => event.type === eventType))
      .subscribe(handler);
  }
}

// Usage
const subscription = EventListener.listen(
  EventTypes.HISTOGRAM_SELECTED,
  (event) => {
    console.log('Histogram selected:', event.payload);
  }
);

// Dispatch events
EventDispatcher.dispatch(EventTypes.HISTOGRAM_SELECTED, {
  histogramId: 'histo1',
  source: 'user-click'
});

// Cleanup
subscription.unsubscribe();
```
## Source code:
[View this component on Gitlab](https://gitlab.com/ndmspc/ndmvr-core/-/blob/main/src/rxjs/DispatchSubject.js?ref_type=heads)
