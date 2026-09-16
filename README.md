# Bilfunn

Bilfunn is a lightweight front-end prototype for a Norwegian vehicle ownership and information platform. The app is intentionally built with plain JavaScript and no external dependencies, making it easy to run locally and easy to adapt for a future backend.

## Included features

- Vehicle registration plate search
- Simulated vehicle report gated behind a paywall
- Checkout flow with simulated payment approval and decline states
- Customer account page and cancellation flow
- Pricing, FAQ, legal and content pages
- Admin console with demo data and time controls

## Run it

Option 1: open `index.html` directly in a browser.

Option 2: serve the project locally:

```bash
python3 -m http.server 8000
```

Then browse to http://localhost:8000.

## Build and validation

```bash
./scripts/build.sh
./scripts/check.sh
```

The build script reconstructs `index.html` from the split source files in `src/`.

## Demo notes

- Payment card `4242 4242 4242 4242` succeeds
- Payment card `4000 0000 0000 0002` fails
- Vipps numbers beginning with `4` or `9` are accepted; `40000000` fails
- Admin login code is `1234`

## Project status

This is a prototype designed for evaluation and iteration. It is not connected to production services or real personal data.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
