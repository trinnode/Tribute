# Tribute - Programmable Patronage on Bitcoin

> "While Lightning handles payments, Tribute handles relationships."

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Run tests
pnpm test

# Build all packages
pnpm build
```

## Project Structure

```
tribute/
├── apps/
│   ├── extension/       # Browser Extension (Plasmo + React)
│   └── web/             # Creator Dashboard (Next.js)
├── packages/
│   ├── contracts/       # Clarity Smart Contracts
│   ├── sdk/             # TypeScript SDK
│   └── ui/              # Shared UI Components
└── docs/                # Documentation
```

## Development

See [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) for the full technical roadmap.

## Documentation

- [Yellow Paper](./TributeYellowPaper.md) - Product vision and specifications

## License

MIT

---