---
name: Bug report
about: Report something that doesn't work as expected
title: ''
labels: ''
assignees: ''
---

**Describe the bug**
A clear and concise description of what the bug is.

**To reproduce**
The code you ran, as small as possible:

```ts
import { P1MeterApi } from 'homewizard-energy-api';

const p1Meter = new P1MeterApi('http://192.168.1.x');

const data = await p1Meter.getData();
```

**Expected behavior**
What you expected to happen.

**Actual behavior**
What happened instead. Include the full error message and stack trace, or the response you got back. Remove anything private, such as serial numbers, Wi-Fi names or IP addresses you don't want to share.

**Environment**

- Device and product type: [e.g. P1 meter, `HWE-P1`]
- Device firmware version: [the `firmware_version` from `getBasicInformation()`, e.g. `4.19`]
- `homewizard-energy-api` version: [e.g. 1.6.1]
- Node.js version: [output of `node --version`]
- OS: [e.g. macOS 15, Raspberry Pi OS, Docker on Linux]

**Additional context**
Anything else that might help, such as whether the problem started after a firmware or library update.
