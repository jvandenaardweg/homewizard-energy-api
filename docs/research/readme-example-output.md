# Showing the result of a README example

## Question

How do well-known libraries show what a code example returns, instead of a bare `console.log`? And which of those patterns fit the README of this library, whose snippets now end in lines like ``console.log(`${measurement.power_w} W`)``?

## Summary

- The large API SDKs mostly don't show output. stripe-node, openai-node, aws-sdk-js-v3 and octokit.js print one field and leave the shape to their API reference and types. Where they do show a value, it's a short trailing comment on one line.
- Result comments (`//=>`, `// =>`, `// Prints:`) are the habit of utility libraries and the Node.js docs, and they're used for scalars and short values. lodash, ramda, date-fns, got, zod and Node's own API docs do this.
- A separate output block after the snippet appears in MQTT.js (`output:` and a `sh` block), the node-hue-api docs (a `json` block with the result's structure), and the HomeWizard docs themselves (titled Request and Response blocks).
- The closest prior art, python-homewizard-energy and tplink-smarthome-api, shows no output at all: they print and link to the API docs.
- No surveyed library puts a sample response in a `<details>` block. openai-node uses `<details>` only to fold an explanation.

For this README: trailing comments for scalars, one short commented response object for `getMeasurement()`, a `// Prints:` block for the WebSocket loop, and a link to the upstream example for the full response. The values come from the HomeWizard docs, which `src/mocks/data/v2.ts` already copies.

## Sources read

READMEs as fetched from the linked branch on 2026-11-17: [stripe-node](https://github.com/stripe/stripe-node/blob/master/README.md), [openai-node](https://github.com/openai/openai-node/blob/master/README.md), [octokit.js](https://github.com/octokit/octokit.js/blob/main/README.md), [aws-sdk-js-v3](https://github.com/aws/aws-sdk-js-v3/blob/main/README.md), [axios](https://github.com/axios/axios/blob/v1.x/README.md), [got](https://github.com/sindresorhus/got/blob/main/readme.md), [undici](https://github.com/nodejs/undici/blob/main/README.md), [node-hue-api](https://github.com/peter-murray/node-hue-api/blob/typescript/README.md) (and its [`docs/discovery.md`](https://github.com/peter-murray/node-hue-api/blob/typescript/docs/discovery.md)), [tplink-smarthome-api](https://github.com/plasticrake/tplink-smarthome-api/blob/master/README.md), [MQTT.js](https://github.com/mqttjs/MQTT.js/blob/main/README.md), [aioshelly](https://github.com/home-assistant-libs/aioshelly/blob/main/README.md), [python-homewizard-energy](https://github.com/homewizard/python-homewizard-energy/blob/main/README.md), [date-fns](https://github.com/date-fns/date-fns/blob/main/README.md) and [zod](https://github.com/colinhacks/zod/blob/main/packages/zod/README.md). For lodash and ramda, the examples come from the JSDoc in their source, which generates their docs sites: [lodash 4.17.21 `lodash.js`](https://github.com/lodash/lodash/blob/4.17.21/lodash.js#L6895-L6898) and [ramda `source/add.js`](https://github.com/ramda/ramda/blob/master/source/add.js). Node.js: [`doc/api/buffer.md`](https://github.com/nodejs/node/blob/main/doc/api/buffer.md) and [`doc/api/util.md`](https://github.com/nodejs/node/blob/main/doc/api/util.md). HomeWizard: the `docs/` folder of [homewizard/api-documentation](https://github.com/homewizard/api-documentation/tree/main/docs).

Not checked: Homebridge plugins and zigbee-herdsman.

## Patterns

### 1. Print one field, link to the reference

The call ends in a `console.log` of one field, and the shape lives elsewhere.

- stripe-node's first example ends in `console.log(customer.id);` ([Usage](https://github.com/stripe/stripe-node/blob/master/README.md#usage)).
- openai-node ends in `console.log(response.output_text);` and says the full API is in its `api.md` file ([Usage](https://github.com/openai/openai-node/blob/master/README.md#usage)).
- aws-sdk-js-v3 ends its DynamoDB example in `console.log(results.TableNames.join("\n"));` and shows no result ([README](https://github.com/aws/aws-sdk-js-v3/blob/main/README.md)).
- octokit.js puts a link above the call, `// Compare: https://docs.github.com/en/rest/reference/users#…`, so the response is one click away ([Usage](https://github.com/octokit/octokit.js/blob/main/README.md#usage)).
- python-homewizard-energy does `print(measurement.energy_import_kwh)` and points to the HomeWizard docs for details ([README](https://github.com/homewizard/python-homewizard-energy/blob/main/README.md#example)). tplink-smarthome-api logs with `device.getSysInfo().then(console.log)` and links its API docs ([Examples](https://github.com/plasticrake/tplink-smarthome-api/blob/master/README.md#examples)). aioshelly `pprint`s the status and says names follow the Shelly API ([README](https://github.com/home-assistant-libs/aioshelly/blob/main/README.md)).

Works well when the reference is good and the response is large or changes per API version. It gets in the way when a reader wants to know what a number looks like without opening another site. That's the current state of this README.

### 2. Trailing result comment on the same line

- openai-node: `console.log(err.status); // 400` and `console.log(response._request_id); // req_123` ([Handling errors](https://github.com/openai/openai-node/blob/master/README.md#handling-errors), [Request IDs](https://github.com/openai/openai-node/blob/master/README.md#request-ids)).
- undici: `console.log(process.versions.undici); // e.g., "5.28.4"` ([Built-in Fetch](https://github.com/nodejs/undici/blob/main/README.md#built-in-fetch-nodejs-v18)).
- axios: `console.log(headers.toJSON()); // [Object: null prototype] { foo: '1' }` ([README](https://github.com/axios/axios/blob/v1.x/README.md)).
- ramda's JSDoc: `R.add(2, 3);       //=>  5` ([`add.js`](https://github.com/ramda/ramda/blob/master/source/add.js)).

Works well for scalars and short strings. It's cheap to keep current and survives type-checking. undici's `// e.g.` style marks a value as a sample, which suits a meter reading that changes every second.

### 3. Result comment on the next line

- date-fns: `format(new Date(2014, 1, 11), "yyyy-MM-dd");` then `//=> '2014-02-11'`, and a multi-line `//=> [` array below `dates.sort(compareAsc)` ([README](https://github.com/date-fns/date-fns/blob/main/README.md)).
- got: `console.log(data);` then `//=> {"hello": "world"}` ([JSON mode](https://github.com/sindresorhus/got/blob/main/readme.md#json-mode)).
- zod: `Player.parse(…)` then `// => returns { username: "billie", xp: 100 }` ([Parsing data](https://github.com/colinhacks/zod/blob/main/packages/zod/README.md#parsing-data)).
- lodash's JSDoc, which builds lodash.com/docs: `_.chunk(['a', 'b', 'c', 'd'], 2);` then `// => [['a', 'b'], ['c', 'd']]` ([`lodash.js`](https://github.com/lodash/lodash/blob/4.17.21/lodash.js#L6895-L6898)).
- Node.js docs use `// Prints:`, and for a loop a `// Prints:` header with indented lines below it: `// Prints:`, `//   foo`, `//   bar` ([`util.md`, `mimeParams.keys()`](https://github.com/nodejs/node/blob/main/doc/api/util.md#mimeparamskeys)).

Works well for short objects and for loops, where Node's multi-line `// Prints:` shows several pushed values. It stays inside the snippet, so it's safe in a type-checked block. It gets in the way past roughly 10 lines, when the comment outgrows the code.

### 4. Commented response object or shape

- axios writes a commented object below `console.log(axios.formToJSON(form));`, starting with `// {` ([Converting FormData to JSON](https://github.com/axios/axios/blob/v1.x/README.md#converting-formdata-to-json)).
- octokit.js lists the fields an error carries: `// error.response; // { url, status, headers, data }` ([Request error handling](https://github.com/octokit/octokit.js/blob/main/README.md#request-error-handling)).
- zod shows the type instead of a value: `result.data; // { username: string; xp: number }` ([Handling errors](https://github.com/colinhacks/zod/blob/main/packages/zod/README.md#handling-errors)).
- This README already does it in the v1 "Data polling" and "Discovery (API v1)" examples, and in the v2 discovery loop.

Works well for showing names and typical values once. The comment isn't type-checked, so a renamed field goes stale quietly, and a 40-field P1 response is too long for it.

### 5. Separate output or schema block after the snippet

- MQTT.js follows its example with the word `output:` and a `sh` block holding `Hello mqtt` ([Example](https://github.com/mqttjs/MQTT.js/blob/main/README.md#example)).
- node-hue-api says the results will be an array of bridges "with the following structure", then gives a `json` block ([`docs/discovery.md`](https://github.com/peter-murray/node-hue-api/blob/typescript/docs/discovery.md#n-upnp-search)).
- axios has a whole "Response schema" section: a `js` block with a comment on each field, before the usage example ([Response schema](https://github.com/axios/axios/blob/v1.x/README.md#response-schema)).

Works well for a large response, because a `json` block is outside the extracted `typescript` blocks and can hold the full object. It splits the example in two, and it duplicates what the upstream docs and `src/types.ts` already say. A bare object literal pasted into a `typescript` block instead would break the README type-check that extracts those blocks. That check isn't in `package.json`, so this research didn't verify how it's wired.

### 7. Console or protocol transcript

No surveyed library README uses a REPL or console transcript for a result. Only the HomeWizard docs do: the `→` WebSocket block and the `dns-sd` terminal session (see below). It fits a protocol exchange, where the reader needs to see what goes over the wire, more than a typed client call.

### 6. Collapsible `<details>` sample

Not found in any surveyed README as a way to show output. openai-node uses `<details>` with "More explanation" to fold a text section ([Requirements](https://github.com/openai/openai-node/blob/master/README.md#requirements)). It would hide a long response, but it adds HTML to the Markdown for a value the reader then has to click to see.

## HomeWizard prior art

- **Upstream docs.** Each endpoint has a parameter table, then an "Examples" section with a `curl` block titled "Request" and an `http` block titled "Response" holding the full JSON. There's one per device: `HWE-P1` minimal, `HWE-P1` full, `HWE-KWH1`, `HWE-KWH3` and `HWE-BAT` ([`v2/measurement.mdx`](https://github.com/homewizard/api-documentation/blob/main/docs/v2/measurement.mdx), rendered at [api-documentation.homewizard.com/docs/v2/measurement](https://api-documentation.homewizard.com/docs/v2/measurement)). Errors follow the same pairing, for example a 401 with `"error": "user:unauthorized"` ([`v2/error-handling.mdx`](https://github.com/homewizard/api-documentation/blob/main/docs/v2/error-handling.mdx)).
- **WebSocket.** A transcript in one `json` block titled "Example": the message sent, then each push prefixed with `→` ([`v2/websocket.mdx`](https://github.com/homewizard/api-documentation/blob/main/docs/v2/websocket.mdx)).
- **Discovery.** A TXT record table and a `dns-sd` terminal transcript, without TXT values for `_homewizard._tcp` ([`discovery.mdx`](https://github.com/homewizard/api-documentation/blob/main/docs/discovery.mdx)). The identifier `appliance/p1dongle/5c2fafaabbcc` that this README uses comes from [`v2/authorization.mdx`](https://github.com/homewizard/api-documentation/blob/main/docs/v2/authorization.mdx).
- **python-homewizard-energy** prints a field and shows no output (pattern 1).
- **Values to reuse.** `mockV2P1MeterMeasurement` in `src/mocks/data/v2.ts` matches the upstream `HWE-P1` full example field for field (`power_w: -543`, `energy_import_kwh: 13779.338`, gas `2569.646` m3). The fixture is typed as `P1MeterMeasurement`, so a renamed field fails the type-check there, which makes it the safe place to copy README values from. The upstream minimal example has a trailing comma after `"power_l1_w": -676`, so it isn't valid JSON as written.
- **One mismatch.** The v1 "Data polling" sample values (`19055.287`, `'ISKRA 2M550T-1012'`) don't appear in the upstream [`v1/measurement.mdx`](https://github.com/homewizard/api-documentation/blob/main/docs/v1/measurement.mdx), whose example uses `"ISKRA  2M550T-101"` and `active_power_w: -543`.

## Recommendation for this README

Match the pattern to the size of the result, and take every value from the upstream examples:

| Snippet                            | Pattern                                                                                      |
| ---------------------------------- | -------------------------------------------------------------------------------------------- |
| Quick start                        | Trailing comment (2): `// -543 W`                                                            |
| Using a device, `getMeasurement()` | Short commented object (4), ending in `// ...`, plus a link to the full upstream example (1) |
| WebSocket `stream()` loop          | Node-style `// Prints:` block (3) with two pushed values                                     |
| Discovery                          | Keep the current one-line comment (4); its identifier is already upstream                    |
| Errors                             | octokit-style field comments (4) in the `catch`, with the upstream 401                       |

Don't add a `json` output block or `<details>` for the measurement. The upstream page already has the full response per device, and `P1MeterMeasurement` in `src/types.ts` documents every field in the editor. A link to both does that job without a second copy to keep current. Since the upstream sample is `-543`, say once near the first example why it's negative. Upstream defines `power_w` as the sum of the phases, and each phase as negative when exporting, so a negative total means the home feeds back more than it uses.

Quick start, before and after:

```typescript
const measurement = await p1.getMeasurement();
console.log(`${measurement.power_w} W`);
```

```typescript
const measurement = await p1.getMeasurement();
console.log(`${measurement.power_w} W`); // e.g. -543 W: negative is net feed-in
```

Using a device and the WebSocket, after:

```typescript
const measurement = await p1.getMeasurement();
// {
//   energy_import_kwh: 13779.338,
//   energy_export_kwh: 0,
//   power_w: -543,
//   power_l1_w: -676,
//   external: [{ type: 'gas_meter', value: 2569.646, unit: 'm3', ... }],
//   ...
// }

for await (const measurement of socket.stream('measurement')) {
  console.log(measurement.power_w);
}
// Prints a line for each push:
//   -543
//   -678
```

Both values are upstream: `-543` from the full `HWE-P1` example and `-678` from the minimal one. Below the object, link the [upstream P1 meter example](https://api-documentation.homewizard.com/docs/v2/measurement#hwe-p1-full) and the type, in a sentence such as "The fields depend on the device and the smart meter: see the full example and `P1MeterMeasurement`."

Errors, after:

```typescript
try {
  await p1.getMeasurement();
} catch (error) {
  if (error instanceof HomeWizardError && error.code === 'user:unauthorized') {
    // error.kind; // 'response'
    // error.statusCode; // 401
    // The token was deleted, pair again
  }
}
```

Separately, replace the v1 "Data polling" sample with the upstream v1 example values.
