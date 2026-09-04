/**
 * A stand-in for a Mongoose query builder.
 *
 * Services call things like
 *
 *     Product.find(filter).populate('brand').select('...').sort().lean()
 *
 * and there is no way to predict which links of that chain each service uses.
 * So rather than stubbing per service — which would mean guessing, and would
 * silently stop covering an endpoint the day somebody adds a `.hint()` — this
 * returns a proxy that answers *any* method by returning itself, and resolves
 * to the payload when awaited.
 *
 * That matters for a leak guard specifically. Stubbing the service layer
 * tests the stub: the test author decides what the service returns, so the
 * serialiser can be bypassed entirely and the suite still passes. Poisoning
 * the database layer means the real service, the real serialiser and the real
 * response envelope all run, exactly as they do in production.
 */

/** Chainable, thenable, and iterable — enough to satisfy any query shape. */
export function queryStub(payload: unknown): unknown {
  const target = function noop(): void {
    /* callable, in case a service invokes the query directly */
  };

  return new Proxy(target, {
    get(_t, prop) {
      // Awaiting the chain resolves to the payload.
      if (prop === 'then') {
        return (resolve: (value: unknown) => unknown) => resolve(payload);
      }
      if (prop === 'catch' || prop === 'finally') {
        return () => queryStub(payload);
      }
      // `exec()` is the explicit form of the same thing.
      if (prop === 'exec') {
        return () => Promise.resolve(payload);
      }
      // Some services spread or iterate a result directly.
      if (prop === Symbol.iterator && Array.isArray(payload)) {
        return payload[Symbol.iterator].bind(payload);
      }
      if (prop === 'length' && Array.isArray(payload)) return payload.length;
      if (prop === 'map' && Array.isArray(payload)) return payload.map.bind(payload);

      // Anything else is a chain link: `.populate()`, `.lean()`, `.sort()`…
      return () => queryStub(payload);
    },
    apply() {
      return queryStub(payload);
    },
  });
}

/**
 * Replace every read static on a model with one that yields `doc`.
 *
 * Each method gets the shape its callers actually expect, which the first
 * version of this helper got wrong: handing the same array to `aggregate` as
 * to `find` fed the faceting pipeline a product document where it expected
 * `[{ _id, count }]`, and the endpoint 500'd. A leak sweep that 500s proves
 * nothing — worse, it *looks* like a caught leak. So:
 *
 *   - `find`      → `[doc]`, the list case
 *   - `findOne`   → `doc`, the detail case
 *   - `aggregate` → `[]`, because pipeline output is shaped by the pipeline,
 *                   not by the collection, and no serialiser runs on it
 *   - `distinct`  → `[]`, same reasoning
 *
 * Writes are untouched; this is for GET sweeps.
 */
export function stubModelReads(model: Record<string, unknown>, doc: unknown): void {
  model.find = jest.fn(() => queryStub([doc]));
  model.findOne = jest.fn(() => queryStub(doc));
  model.findById = jest.fn(() => queryStub(doc));

  // Shaped by the pipeline, not the collection — an empty result is the only
  // honest stub, and it keeps aggregation-backed endpoints returning 200.
  model.aggregate = jest.fn(() => queryStub([]));
  model.distinct = jest.fn(() => queryStub([]));

  model.countDocuments = jest.fn(() => queryStub(1));
  model.estimatedDocumentCount = jest.fn(() => queryStub(1));
}
