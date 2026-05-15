# SLUGS CLI

Terminal control center for autonomous trading agents.

## Quick Start

### Install

Once published to npm:

```bash
npm install -g @slugs/cli
slugs
```

For local development:

```bash
cd packages/cli
npm install
npm link
slugs
```

If `slugs` is not found after `npm link`, make sure npm's global bin is on your `PATH`:

```bash
export PATH="$HOME/.npm-global/bin:$PATH"
```

### Develop

```bash
cd packages/cli
npm install

# Initialize a project
npm run dev -- init --name my-project

# Create an agent
npm run dev -- agent create meme-hunter --purpose "Meme coin scanner"

# List agents
npm run dev -- agent list

# Chat with an agent (interactive TTY)
npm run dev -- agent chat meme-hunter

# Run paper trading simulation
npm run dev -- agent run meme-hunter

# Check status
npm run dev -- status
```

## Commands

| Command | Description |
|---------|-------------|
| `slugs init` | Initialize a new SLUGS project |
| `slugs agent create <name>` | Create a new trading agent |
| `slugs agent list` | List all agents |
| `slugs agent chat <name>` | Chat with an agent (interactive) |
| `slugs agent run <name>` | Run agent in paper trading mode |
| `slugs status` | Show project status |

## Project Structure

```
.
├── slugs.json       # Project config
├── agents/          # Agent definitions (.md)
├── skills/          # Skill marketplace
├── memory/          # Activity logs (.log)
└── .env             # Environment variables
```

## Build

```bash
npm run build
```

## Publish

```bash
npm login
npm publish --access public
```

Users can then install it globally:

```bash
npm install -g @slugs/cli
slugs
```

## Architecture

- **ES modules** (`"type": "module"`)
- **TypeScript** strict mode
- **Commander.js** for CLI routing
- **Inquirer** for interactive prompts
- **Chalk** for colored output
- **Ora** for spinners
- **Boxen** for header boxes

## Future Roadmap

- OpenRouter AI integration
- Cloud agent deployment
- Solana wallet connection
- Skills marketplace
- Agent memory persistence
- Mobile app sync
