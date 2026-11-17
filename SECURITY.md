# Security Policy

## Supported versions

Security fixes go into the latest release line only. Update to the newest `3.x` release to get them.

| Version | Supported          |
| ------- | ------------------ |
| 3.x     | :white_check_mark: |
| < 3.0   | :x:                |

The API v1 client (`homewizard-energy-api/v1`) is part of the `3.x` package and gets security fixes too, for as long as HomeWizard keeps the API v1 on its devices.

## Reporting a vulnerability

Please don't open a public issue for a security problem. Report it privately through GitHub instead:

1. Go to the [Security tab](https://github.com/jvandenaardweg/homewizard-energy-api/security) of this repository.
2. Click **Report a vulnerability**.
3. Describe the problem, the affected version, and how to reproduce it. A minimal script or a failing test helps a lot.

Remove anything private from the report, such as API tokens, serial numbers or Wi-Fi names.

### What to expect

- You'll get a reply within 7 days to confirm the report was received.
- Once the problem is confirmed, the fix is worked on in a private security advisory, and you'll hear about progress at least every 14 days.
- When a fix is released, the advisory is published with a CVE where one applies, and you're credited unless you'd rather not be.
- If the report is declined, for example because it's out of scope or not reproducible, you'll get an explanation of why.

## Scope

In scope are problems in this library, such as:

- Leaking the API token, for example in logs or error messages
- Skipping or weakening the TLS certificate checks of the API v2 (the HomeWizard CA, or the Common Name against the device's `identifier`)
- Trusting mDNS discovery results in a way that lets another device on the network impersonate a paired device
- Vulnerabilities in the runtime dependencies (`undici`, `multicast-dns`) that this library exposes

Out of scope:

- Vulnerabilities in the HomeWizard devices, their firmware or the HomeWizard app. Report those to [HomeWizard](https://www.homewizard.com) directly.
- The API v1 using plain HTTP without authentication. That's how HomeWizard designed the API v1; use the API v2 for an authenticated, encrypted connection.
- Problems that only occur with `insecure: true`, which turns off the certificate checks on purpose.
