<p align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/git-branch.svg" width="80" height="80" alt="Runbook Flow Logo" />
</p>

<h1 align="center">Runbook Flow</h1>

<p align="center">
  <strong>Transform complex runbooks into interactive decision flowcharts</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#demo">Demo</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#export-options">Export</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Claude-AI-orange?style=flat-square" alt="Claude AI" />
  <img src="https://img.shields.io/badge/React_Flow-11-purple?style=flat-square" alt="React Flow" />
</p>

---

## The Problem

Support teams often struggle with complex runbooks that contain:
- 🔀 Too many conditional branches ("if this, then that")
- 🤔 Mixed decision-making and execution steps
- 📚 Overlapping procedures across multiple documents
- ⏱️ Long time-to-resolution due to navigation confusion

**Result:** Support engineers waste time figuring out *which* procedure to follow instead of *executing* the right one.

## The Solution

**Runbook Flow** uses AI to decompose complex runbooks into:

1. **🔀 Decision Flowchart** — Scoping questions that guide support engineers to the right procedure
2. **📋 Simplified Runbooks** — Pure execution checklists with zero conditional logic

> *"All reasoning goes into the flowchart. All execution goes into the runbooks."*

---

## Features

### 🤖 AI-Powered Analysis
Drop in your markdown runbook and Claude AI will:
- Identify all decision points and branch logic
- Extract individual procedures into standalone runbooks
- Generate scoping questions with source references
- Create a navigable flowchart structure

### 🔍 Source References
Every question in the flowchart includes:
- **Exact quote** from your original documentation
- **Section reference** showing where it came from
- **AI reasoning** explaining why this question matters

*No more wondering "where did this question come from?"*

### 🎯 Guided Navigation Mode
- Start at the beginning, answer questions, follow the path
- Current path highlighted with animated edges
- Expand/collapse branches as needed
- Perfect for training new team members

### 📊 Clear End States
Every path leads to a clear outcome:
- ✅ **Resolved** — Issue fixed, user unblocked
- 🔺 **Escalate** — Needs engineering/L2 support
- ⏱️ **Manual** — Requires manual intervention
- 🚫 **Blocked** — Cannot proceed, external dependency

### 🔄 Iterative Refinement
- **Regenerate nodes** with feedback to improve questions
- **Delete nodes** that don't fit your workflow
- **Re-analyze** to generate a fresh flowchart
- **Save/load projects** to continue later

### 📤 Export & Share
Multiple export formats for different needs:

| Format | Use Case |
|--------|----------|
| **Interactive HTML** | Single-file app you can email to anyone |
| **Mermaid Live** | Edit diagram in browser, share URL |
| **PNG/SVG** | Embed in wikis, Confluence, Notion |
| **Markdown** | All runbooks as documentation |
| **JSON** | Integrate with other tools |

---

## Demo

```
┌─────────────────┐
│   📄 Paste      │
│   Runbook MD    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  🤖 Claude AI   │
│   Analyzes      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│                                         │
│  🟣 Start                               │
│     │                                   │
│     ▼                                   │
│  🟢 Is user a Provider or Patient? ──┐  │
│     │                               │  │
│    Patient                      Provider│
│     │                               │  │
│     ▼                               ▼  │
│  🟢 Can access        🔵 Provider      │
│     settings? ───┐       Verification  │
│     │           │        [Click to     │
│    Yes          No        view steps]  │
│     │           │                      │
│     ▼           ▼                      │
│  🔵 Self-    🔺 Escalate               │
│     Reset       to Eng                 │
│                                         │
└─────────────────────────────────────────┘
```

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/runbook-flow.git
cd runbook-flow
npm install
```

### 2. Configure API Keys

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your keys:

```env
# Required - Get from https://console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-...

# Optional - Get from https://aistudio.google.com
GOOGLE_AI_API_KEY=...
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## How It Works

### Input: Complex Runbook

```markdown
# Account Issues Runbook

## Step 1: Identify the User
- Search by email in Atlas
- If multiple accounts found, go to Step 2
- If single account, go to Step 3

## Step 2: Handle Duplicates
If provider wants email from patient account:
  1. Change email on patient account
  2. Send new provider invite
If provider created patient account by mistake:
  1. Verify account is empty
  2. Deactivate patient account
...
```

### Output: Decision Flowchart + Simple Runbooks

**Flowchart:**
```
Start → "Multiple accounts?" → Yes → "Provider wants patient email?" → Yes → [Change Patient Email]
                            → No  → [Standard Account Lookup]
```

**Runbook: Change Patient Email**
```
Prerequisites: Atlas access

Steps:
1. Open patient account in Atlas
2. Navigate to Account Settings
3. Change email to temporary value
4. Save changes
5. Send new provider invite to freed email

✅ Done
```

---

## Export Options

### Interactive HTML (Recommended for Sharing)

Export a **single `.html` file** that anyone can open in a browser:
- No installation required
- Works offline
- Click nodes to view runbook details
- Full styling preserved

Perfect for emailing to team members or embedding in internal tools.

### Mermaid Live

Opens your flowchart in [mermaid.live](https://mermaid.live) where you can:
- Edit the diagram visually
- Share via URL
- Export to various formats

### Static Exports

- **PNG** — High-res image for documentation
- **SVG** — Scalable vector for wikis
- **Mermaid Code** — `.mmd` file for version control
- **Markdown** — All runbooks as `.md` documentation
- **JSON** — Full data for integrations

---

## Tech Stack

- **[Next.js 15](https://nextjs.org)** — React framework with App Router
- **[React Flow](https://reactflow.dev)** — Interactive flowchart rendering
- **[Claude AI](https://anthropic.com)** — Runbook analysis and decomposition
- **[Tailwind CSS](https://tailwindcss.com)** — Styling
- **[TypeScript](https://typescriptlang.org)** — Type safety

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/          # Main analysis endpoint
│   │   ├── analyze-stream/   # Streaming progress
│   │   └── regenerate-node/  # Regenerate individual nodes
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AnalysisProgress.tsx  # Progress indicator
│   ├── ExportMenu.tsx        # Export dropdown
│   ├── Flowchart.tsx         # React Flow wrapper
│   ├── FlowchartNode.tsx     # Custom node components
│   ├── MarkdownInput.tsx     # Input form
│   └── RunbookViewer.tsx     # Runbook detail panel
├── lib/
│   ├── anthropic.ts          # Claude API integration
│   ├── export-interactive.ts # HTML/Mermaid export
│   └── gemini.ts             # Optional image generation
└── types/
    └── schema.ts             # TypeScript definitions
```

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ Yes | Claude API key for analysis |
| `GOOGLE_AI_API_KEY` | ❌ No | Gemini API key for image generation |

### Customization

The AI prompts can be customized in `src/lib/anthropic.ts`:
- `ANALYSIS_SYSTEM_PROMPT` — How Claude analyzes runbooks
- `OUTPUT_FORMAT` — JSON schema for generated flowcharts

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  <sub>Built with ❤️ for support teams everywhere</sub>
</p>
