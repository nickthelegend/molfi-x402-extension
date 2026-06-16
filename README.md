# Molfi VS Code Extension

VS Code sidebar companion that uses an ephemeral funded wallet stored in SecretStorage to pay for chat completions via x402.

## Quickstart

1. **Install dependencies**:
   ```bash
   pnpm install
   ```
2. **Build and package**:
   ```bash
   pnpm run compile
   pnpm run package # Produces the .vsix file
   ```
3. **Sideload to VS Code**:
   Use the extensions panel: *Install from VSIX...* and select the generated file.

## Acceptance Checklist

- [ ] Command `Molfi: Connect Wallet` generates or imports a Fuji wallet.
- [ ] Wallet balances can be checked, showing faucet links if empty.
- [ ] Selection right-click menu command "Molfi: Explain selection" successfully queries backend.
- [ ] Performs automated x402-fetch signing loop without manual prompt popups.
- [ ] Renders complete Snowtrace transaction hash link in the message response.
