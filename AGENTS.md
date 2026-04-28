<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Git Policy

**Never commit or push code without explicit user approval.** Always show what you intend to commit and ask before running `git commit` or `git push`.

# Workflow Commands

Available scripts for this project, run via `bun`:

- `bun run raincode` — Run the raincode screensaver
- `bun dev` — Start the Next.js development server
- `bun run build` — Create a production build
- `bun start` — Serve the production build
- `bun check` — Check code for linting and formatting issues
- `bun fix` — Auto-fix linting and formatting issues
- `bun typecheck` — Run TypeScript type checking
- `bun run doctor` — Diagnose the Ultracite/Biome setup

Note: `build` and `doctor` need `bun run` since they conflict with built-in bun commands.

In general, default to using Bun instead of Node.js.

# shadcn Guidelines

This project uses shadcn components.

To add a new component, use `pnpm dlx shadcn@latest add <component>`. Example:

```bash
bunx --bun shadcn@latest add button
```

To search for available components in the shadcn registry, use:

```bash
bunx --bun shadcn@latest search @shadcn
```

You can optionally provide a `-q` parameter with a search query:

```bash
bunx --bun shadcn@latest search @shadcn -q "button"
```

# AI SDK Guidelines

This project uses the AI SDK in its latest version. It is critical to consider the version number, so that you don't apply outdated or unsupported patterns.

## Never import `gateway` or `createGateway`

The AI Gateway is the default global provider, so you can access models using a simple string.

**BAD:**

```ts
import { generateText } from 'ai';
import { gateway } from '@ai-sdk/gateway';

const { text } = await generateText({
  model: gateway('anthropic/claude-sonnet-4.5'),
  prompt: 'What is love?',
});
```

**GOOD:**

```ts
import { generateText } from 'ai';

const { text } = await generateText({
  model: 'anthropic/claude-sonnet-4.5',
  prompt: 'What is love?',
});
```

# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**

- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**

- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `bun fix` before committing to ensure compliance.

## Readme and Plan File

When we make functional changes update the README.md and .plan files to accurately reflect the current state of the project.

# Screenshots

When taking screenshots of terminal apps on this system:

1. **Use iTerm** (the app is named `iTerm`, not `iTerm2`).
2. **Never include the OS window frame** (title bar, traffic lights) — it leaks session names and command text.
3. **All Bash commands that open apps or use osascript must use `dangerouslyDisableSandbox: true`.**

### Full working process

```bash
# 1. Launch iTerm if not already running (requires dangerouslyDisableSandbox: true)
open -a "iTerm" && sleep 2

# 2. Open a new window, run the program, capture the window ID
WIN_ID=$(osascript <<'APPLESCRIPT'
tell application "iTerm"
  set w to (create window with default profile)
  tell current session of w
    write text "bun run raincode --no-ai"
  end tell
  delay 4
  return id of w
end tell
APPLESCRIPT
)

# 3. Capture the specific window (no shadow)
screencapture -l$WIN_ID -x $TMPDIR/shot.png

# 4. Crop title bar — on retina (2x) displays the title bar is 76 physical px
H=$(sips -g pixelHeight $TMPDIR/shot.png | awk '{print $2}')
W=$(sips -g pixelWidth $TMPDIR/shot.png | awk '{print $2}')
sips --cropToHeightWidth $((H - 76)) $W $TMPDIR/shot.png --out $TMPDIR/shot_cropped.png
```

Use the specific window ID returned from `create window` — do **not** use `id of front window`, as a different window may be in front.
