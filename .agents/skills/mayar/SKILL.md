---
name: mayar
display_name: Mayar CLI
version: "0.1.9"
description: >
  Interact with the Mayar payment platform (invoices, products, payments,
  customers, transactions, webhooks, QR codes) from any AI agent or shell.
  Zero dependencies — Node.js 18+ only.
author: Mayar bot
license: MIT
homepage: https://github.com/mayarid/mayar-cli
repository: https://github.com/mayarid/mayar-cli.git
tags:
  - payments
  - invoices
  - mayar
  - indonesia
  - cli
  - tool
runtime: node>=18
install_command: npx -y mayar@latest
invoke_prefix: npx -y mayar@latest
env:
  MAYAR_API_KEY:
    description: Mayar API key. Obtain from web.mayar.id → Integration → API Key.
    required: true
    secret: true
  MAYAR_API_URL:
    description: Override API base URL. Defaults to https://api.mayar.id.
    required: false
    default: https://api.mayar.id
auth:
  type: bearer
  resolution_order:
    - flag: --api-key
    - env: MAYAR_API_KEY
    - file: ~/.config/mayar/config.json
capabilities:
  - invoices
  - products
  - payments
  - customers
  - transactions
  - reviews
  - webhooks
  - qrcode
  - balance
  - whoami
---

# Mayar CLI — Agent Skill

This document describes how AI agents (Claude Code, OpenClaw, and others) should install, authenticate, and use the `mayar` CLI tool.

## Quick start for agents

```bash
# Always use the latest version — no install step required
npx -y mayar@latest whoami
```

## Authentication flow

**Step 1 — detect active user**

Run `whoami` to check if a valid API key is already configured:

```bash
npx -y mayar@latest whoami --json
```

Successful output contains `"valid": true` and the merchant's `name`, `email`, and `accountId`. If the key is valid, proceed directly to the requested task.

**Step 2 — handle missing or invalid key**

If `whoami` exits non-zero or returns `"valid": false`, the agent MUST stop and ask the user for their API key using one of the following options:

> **Option A — environment variable (recommended for non-interactive agents):**
>
> Ask the user to set:
> ```bash
> export MAYAR_API_KEY=<their_key>
> ```
> Then re-run the original command.

> **Option B — one-time flag (single command):**
>
> Ask the user to provide the key and pass it as:
> ```bash
> npx -y mayar@latest --api-key <their_key> <command>
> ```

> **Option C — non-interactive save:**
>
> Ask the user to run:
> ```bash
> npx -y mayar@latest api-key <their_key>
> ```

---

## Detailed Commands & Capabilities Reference

Use the global `--json` flag on any command to receive machine-readable outputs instead of formatted CLI tables.

### Setup & Configurations
- **`init`**: Run first-time setup (interactive, masked input).
- **`api-key <key>`**: Save API key non-interactively.
- **`config show`**: Show config path and masked API key.
- **`config reset`**: Remove the saved API key.

### Account Overview
- **`whoami`**: Show merchant identity details decoded from the JWT token and verify the key.
- **`balance`**: Retrieve current account balance information.

### Invoices Management (`invoice`)
- **`invoice list [--page N --pageSize N]`**: List invoices with pagination.
- **`invoice get <id>`**: Retrieve detailed information about a specific invoice.
- **`invoice close <id>`**: Close an open invoice.
- **`invoice reopen <id>`**: Reopen a closed invoice.
- **`invoice create --data <json|@file.json>`**: Create a new invoice using inline JSON or a path to a JSON file.

### Product Catalog (`product`)
- **`product list [--page N --pageSize N]`**: List all products.
- **`product search <keyword>`**: Search products by keyword.
- **`product type <ebook|course|membership|saas|event|webinar|...>`**: Filter products by type.
- **`product get <id>`**: Retrieve a specific product's details.
- **`product close <id>`**: Close a product link/listing.
- **`product reopen <id>`**: Reopen a closed product link/listing.

### Single Payment Requests (`payment`)
- **`payment list`**: List payment links.
- **`payment get <id>`**: Get details of a single payment request.
- **`payment close <id>`**: Close a payment request.
- **`payment reopen <id>`**: Reopen a payment request.
- **`payment create --data <json|@file.json>`**: Create a single payment request using inline JSON or a path to a JSON file.

### Customer Directory (`customer`)
- **`customer list [--page N --pageSize N]`**: List customers.
- **`customer create --data <json|@file.json>`**: Create a new customer record.
- **`customer search <email>`**: Look up a customer profile by email address.
- **`customer update <fromEmail> <toEmail>`**: Update a customer's email address.
- **`customer magic-link <email>`**: Send a magic login link to the customer's portal via email.

### Transactions Log (`tx`)
- **`tx list [--page N --pageSize N]`**: View paid transactions.
- **`tx unpaid [--page N --pageSize N]`**: View unpaid/pending transactions.
- **`tx daily`**: Retrieve today's transaction volume and count summaries.

### Reviews (`review`)
- **`review list [--page N --pageSize N]`**: View customer reviews.

### Dynamic QR Code (`qrcode`)
- **`qrcode <amount>`**: Generate a dynamic QR code for the specified amount.

### Webhook Integrations (`webhook`)
- **`webhook register <url>`**: Register a new webhook endpoint.
- **`webhook test <url>`**: Send a test ping to the specified webhook URL.
- **`webhook history [--page N --pageSize N]`**: View log history of webhook deliveries.

---

## Global Flags
- **`--json`**: Output raw JSON instead of tables.
- **`--api-key <key>`**: Overrides env and configuration file.
- **`--page N`**: Pagination page index (default: `1`).
- **`--pageSize N`**: Pagination page size (default: `10`).
- **`-h, --help`**: Display help.
- **`-v, --version`**: Display version.
