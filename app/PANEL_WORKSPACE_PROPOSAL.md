# Multi-Panel Workspace: Architectural Proposal

## Executive Summary

Transform Context UI from a single-view-at-a-time application into a tiling
window manager-style workspace where any view can be opened as a panel, multiple
panels coexist side-by-side, and the layout is fully serializable and
persistent. The mental model shifts from "navigate to a page" to "open a view
in a panel slot."

The existing codebase is well-positioned for this change. It already has
resizable drawers, a grid card system with drag-to-resize/reorder, a clean view
registry, and settings persistence via REST API. The main work is replacing the
single `<Routes>` block with a panel-aware layout engine and giving each panel
its own route-rendering context.

---

## Part 1: Audit Findings

### Routing

- **Library:** `react-router-dom` v7.1.0
- **Route definitions:** Two sources:
  1. `src/views/registry.ts` -- array of `ViewEntry` objects with `path`,
     `label`, `icon`, and lazy-loaded `component`
  2. `src/App.tsx` lines 214-228 -- maps registry views into `<Route>` elements
     plus hardcoded detail routes (`/projects/:projectId`, etc.)
- **Route restoration:** `<RestoreRoute />` fetches the last-visited path from
  `/api/settings` on cold start and navigates there with `replace: true`
- **Navigation history:** Custom `useNavHistory` hook persists a stack of
  visited paths to the engine API

### App Shell Layout

```
+-------------------------------------------------------------+
| AppHeader (fixed, 64px)                                     |
+------+----------+-------------------+-----------------------+
| Nav  | Activity | Main Content      | Terminal              |
| 72px | Drawer   | (flex: 1)         | Drawer                |
|      | (left)   | <Routes />        | (right, resizable)    |
|      |          |                   |                       |
|      | Events   |                   |                       |
|      | Drawer   |                   |                       |
|      | (left)   |                   |                       |
+------+----------+-------------------+-----------------------+
| FABs (Media, Proposals, Terminal Actions, Tunnel Auth)      |
+-------------------------------------------------------------+
```

- **NavDrawer:** 72px permanent sidebar (temporary overlay on mobile)
- **Main content:** Single `<Box component="main">` with `<Suspense>` +
  `<Routes>` rendering one view at a time
- **Drawers:** Activity and Event Monitor on the left, Terminal on the right -- all
  use `<ResizableDrawer>` with drag-to-resize handles
- **Terminal drawer** can expand to fill the full content area (hides main)

### Navigation Patterns

- `useNavigate()` for programmatic navigation
- `useLocation()` for reading current path
- `useSearchParams()` for tab state in Workspace view
- No `<Link>` components found in navigation -- all imperative
- `useNavHistory()` tracks a stack for back-button behavior

### Existing Drawer/Panel/Modal Components

| Component | Type | Position | Resizable |
|-----------|------|----------|-----------|
| `ResizableDrawer` | Shell wrapper | Left or right | Yes (drag handle) |
| `TerminalDrawer` | Feature drawer | Right | Yes (via ResizableDrawer) |
| `ActivityDrawer` | Feature drawer | Left | Yes (via ResizableDrawer) |
| `EventMonitorDrawer` | Feature drawer | Left | Yes (via ResizableDrawer) |
| `ResizableGrid` | Card layout | Inline | Yes (corner grips, reorder) |
| Various modals | Dialog overlays | Center | No |

### State Management

- **Pure React Context API** -- no external state library (no Zustand, Redux,
  Jotai)
- Contexts: `PhoenixSocketContext`, `AuthContext`, `ColorModeContext`, `ProjectContext`,
  `ActiveProjectContext`, `TunnelAuthContext`, `BrandingContext`
- All persistent state goes through `/api/settings` REST calls
- Local component state via `useState` + `useRef`

### CSS Approach

- **MUI `sx` prop + Emotion** (`@emotion/react`, `@emotion/styled`)
- No Tailwind, no CSS modules, no styled-components
- Theme defined in `src/lib/theme.ts` with dynamic branding support

### Electron Integration

- Not a direct Electron renderer -- communicates via REST API proxy
  (`/api/*` -> `127.0.0.1:19470`) and Event Monitor WebSocket (`ws://127.0.0.1:9001`)
- `BrowserFrame` component detects Electron via user agent and uses
  `<webview>` element when available, `<iframe>` otherwise
- No `ipcRenderer`, no preload scripts

### Existing Resize Primitives

- `ResizableDrawer`: Horizontal drag handle using raw `mousemove`/`mouseup`
  document listeners -- a solid pattern to extend for panel dividers
- `ResizableGrid`: CSS Grid with drag-to-resize cards (column/row span) and
  drag-to-reorder -- inspiration for panel tiling
- No external drag/resize library in use

---

## Part 2: Architecture Design

### Core Concepts

**Panel:** A rectangular region of the workspace that renders a view. Each
panel has a route (e.g., `/ai`), an ID, and sizing metadata.

**Split:** A container that divides space between two children (panels or
nested splits) along a horizontal or vertical axis. Splits are recursive --
a child of a split can itself be a split.

**Layout Tree:** The entire workspace layout is a binary tree of splits and
panels. The tree is serializable to JSON and restorable from it.

**Panel Router:** Each panel gets its own `<MemoryRouter>` so it can render
any route independently. Global providers (theme, auth, Event Monitor) wrap all panels;
route-specific state is isolated per panel.

### Layout Model

The layout is a recursive binary tree:

```
                    Split(horizontal)
                   /                  \
            Panel("/ai")         Split(vertical)
              60%               /              \
                         Panel("/workspace")  Panel("/settings")
                              50%                   50%
```

Rendered as:

```
+------+---------------------------+
| Nav  |  Chat (Panel 1)  | Wksp  |
| 72px |                  |----------|
|      |                  | Settings |
|      |                  |          |
+------+---------------------------+
```

Each split stores:
- `direction`: "horizontal" (left/right) or "vertical" (top/bottom)
- `ratio`: 0.0-1.0, the fraction of space given to the first child
- `children`: exactly two, each a `Panel` or `Split`

### Data Model

```typescript
type PanelId = string;    // nanoid

interface PanelNode {
  type: "panel";
  id: PanelId;
  route: string;          // e.g., "/ai", "/projects/abc123"
  title?: string;         // override; derived from route by default
}

interface SplitNode {
  type: "split";
  id: string;
  direction: "horizontal" | "vertical";
  ratio: number;          // 0.0 - 1.0
  children: [LayoutNode, LayoutNode];
}

type LayoutNode = PanelNode | SplitNode;

interface WorkspaceLayout {
  root: LayoutNode;
  focusedPanelId: PanelId | null;
}
```

### Panel Lifecycle API

```typescript
interface PanelManager {
  // Open a new panel adjacent to the focused (or specified) panel
  openPanel(route: string, position: "left" | "right" | "top" | "bottom", relativeTo?: PanelId): PanelId;

  // Close and remove a panel; its sibling absorbs its space
  closePanel(panelId: PanelId): void;

  // Set keyboard/mouse focus to a panel
  focusPanel(panelId: PanelId): void;

  // Move a panel to a new position relative to another panel
  movePanel(panelId: PanelId, position: "left" | "right" | "top" | "bottom", relativeTo: PanelId): void;

  // Programmatic resize
  resizePanel(panelId: PanelId, ratio: number): void;

  // Navigate within a panel (change its route)
  navigatePanel(panelId: PanelId, route: string): void;

  // Serialize/restore
  getLayout(): WorkspaceLayout;
  setLayout(layout: WorkspaceLayout): void;
}
```

### How Splits Work

**Opening a panel:** To open Chat to the right of Workspace:

1. Find the `PanelNode` for Workspace
2. Replace it with a new `SplitNode`:
   ```
   { type: "split", direction: "horizontal", ratio: 0.5,
     children: [workspacePanel, newChatPanel] }
   ```
3. The layout tree updates, React re-renders

**Closing a panel:** When a panel is closed, its parent split is replaced
by the surviving sibling. If the surviving sibling is a split, it just moves
up a level. This keeps the tree minimal.

**Resizing:** Dragging a divider changes the `ratio` of the parent split.
The divider component calls `resizePanel()` which updates the ratio in state.

### URL/Route Rendering in Panels

**Recommendation: `<MemoryRouter>` per panel.**

Each panel wraps its content in a `<MemoryRouter>` with the panel's route as
the initial entry. This gives each panel:
- Independent navigation history (back/forward within the panel)
- No URL bar pollution (the browser URL bar reflects the focused panel only)
- Full React component rendering (no iframe overhead or isolation issues)

The browser's actual URL is synced to the **focused panel's** current route.
When focus changes, the URL bar updates. This is a one-way sync: the URL bar
reflects the focused panel, but panels drive their own routing.

```
Browser URL bar: /ai  (reflects focused panel)

Panel 1: MemoryRouter at /workspace   (unfocused)
Panel 2: MemoryRouter at /ai          (focused -- synced to URL bar)
Panel 3: MemoryRouter at /settings    (unfocused)
```

**Why not iframes/webviews?** The app uses shared React contexts extensively
(PhoenixSocketProvider, AuthProvider, ThemeProvider, ActiveProjectProvider). Iframes
would require duplicating all of these per panel, multiplying Event Monitor connections
and breaking shared state. MemoryRouter gives isolation where needed (routing)
and sharing where needed (everything else).

### State Isolation Strategy

**Shared across all panels (via React Context):**
- Theme / branding / color mode
- Event Monitor connection and subscriptions
- Auth state
- Active project

**Isolated per panel:**
- Route / location (via MemoryRouter)
- Scroll position
- Component-local state (useState inside views)
- URL search params

**Conflict prevention:** Two panels rendering the same route (e.g., two
`/ai` panels) work fine because each has its own MemoryRouter and component
tree. They share Event Monitor subscriptions (which is correct -- both see the same
real-time data) but have independent local state.

The one risk is views that write to global settings (e.g., terminal drawer
state). These should use the `PanelId` as a namespace in settings keys.

### Panel Manager UI

**Per-panel toolbar (32px, inside each panel):**
```
+---------------------------------------------------+
| [=] Chat                    [Split v] [Split >] X |
+---------------------------------------------------+
|                                                   |
|              Panel Content                        |
|                                                   |
+---------------------------------------------------+
```

- `[=]` -- Drag handle for moving the panel
- Title -- Derived from the view registry label, or route path as fallback
- `[Split v]` -- Split this panel vertically (add a panel below)
- `[Split >]` -- Split this panel horizontally (add a panel to the right)
- `X` -- Close this panel

**Split dividers (5px, between panels):**
```
Panel A  |  Panel B
         ^
    drag handle (5px, cursor: col-resize)
```

Dividers use the same pattern as `ResizableDrawer`: `onMouseDown` registers
document-level `mousemove`/`mouseup` listeners that update the split ratio.

**Panel launcher (command palette):**
- Triggered by keyboard shortcut (Cmd+Shift+P) or toolbar button
- Shows all registered views from `registry.ts`
- Selecting a view opens it in a new panel (position: right of focused)
- Also shows recently-opened routes for quick access

### Persistence

Layout state serializes to JSON:

```json
{
  "root": {
    "type": "split",
    "id": "s1",
    "direction": "horizontal",
    "ratio": 0.5,
    "children": [
      { "type": "panel", "id": "p1", "route": "/ai" },
      { "type": "panel", "id": "p2", "route": "/workspace" }
    ]
  },
  "focusedPanelId": "p1"
}
```

Stored via the existing `/api/settings` mechanism under key
`"workspace.layout"`. Restored on cold start instead of the current
`<RestoreRoute>` mechanism.

---

## Part 3: Key Technical Decisions

### Decision 1: Build the split-pane engine from scratch

**Choice:** Custom implementation, not a library like `react-mosaic` or
`react-split-pane`.

**Rationale:**
- The codebase already has hand-rolled resize logic in `ResizableDrawer` and
  `ResizableGrid` using the same `mousemove`/`mouseup` pattern. The team
  clearly prefers owning this code.
- `react-mosaic` is powerful but opinionated about styling (CSS classes, not
  MUI sx) and adds a heavy dependency.
- `react-split-pane` is unmaintained (last publish 2020).
- The recursive split tree model is ~200 lines of logic. The renderer is
  another ~150. This is well within the team's demonstrated capability.

### Decision 2: MemoryRouter per panel, not BrowserRouter

**Choice:** Each panel gets a `<MemoryRouter>`.

**Rationale:**
- Only one browser URL exists. Multiple panels cannot each own it.
- MemoryRouter gives each panel independent navigation without URL conflicts.
- The focused panel's route is synced to the browser URL for bookmarkability
  and back-button behavior.

### Decision 3: React Context for panel state, not Zustand

**Choice:** A single `PanelContext` using React Context + `useReducer`.

**Rationale:**
- The codebase uses pure React Context everywhere. Introducing Zustand or
  Jotai for one feature adds cognitive overhead.
- The layout tree is a single object that changes infrequently (panel
  open/close/resize). `useReducer` handles this well.
- If performance becomes an issue (unlikely -- layout changes are rare),
  the context can be split into `LayoutContext` (tree structure) and
  `FocusContext` (focused panel ID) to minimize re-renders.

### Decision 4: Absorb existing drawers into the panel system

**Choice:** Terminal, Activity, and Event Monitor drawers become regular panels in
v2/v3, not immediately.

**Rationale:**
- These drawers work well today and have complex internal state (terminal
  sessions, Event Monitor subscriptions).
- Trying to convert them on day one adds risk. Better to build the panel
  system alongside the existing drawers, then migrate them when the system
  is proven.
- In v2, "open terminal as a panel" becomes an option alongside the existing
  drawer.

### Decision 5: No drag-and-drop library

**Choice:** Build drag-to-move with the same raw mouse event pattern.

**Rationale:**
- Consistent with existing code (`ResizableGrid` already does drag-to-reorder)
- `@dnd-kit` or `react-beautiful-dnd` are overkill for moving panels between
  split slots
- Panel drag-to-rearrange can be deferred to v2; v1 only needs divider drag
  for resizing

---

## Part 4: Recommended Tech Choices

| Concern | Choice | Notes |
|---------|--------|-------|
| Split-pane engine | Custom (recursive tree) | ~350 lines total |
| Panel IDs | `crypto.randomUUID()` | Built-in, no nanoid needed |
| Panel routing | `react-router-dom` MemoryRouter | Already a dependency |
| State management | React Context + useReducer | Consistent with codebase |
| Divider drag | Raw mouse events | Matches ResizableDrawer pattern |
| Panel toolbar | MUI Box + IconButton | Matches existing UI |
| Command palette | MUI Autocomplete + Dialog | Quick to build |
| Persistence | `/api/settings` REST | Existing pattern |
| Keyboard shortcuts | `useEffect` + `keydown` | No library needed |

**No new dependencies required for v1.**

---

## Part 5: Phased Implementation Plan

### Phase 1 -- Foundation (prove the pattern)

**Goal:** Replace the single main content area with a panel-aware layout that
supports opening any view in a right-side panel.

**Scope:**
1. Create `src/components/panels/` directory:
   - `types.ts` -- LayoutNode, PanelNode, SplitNode types
   - `context.tsx` -- PanelContext with useReducer (open, close, resize,
     focus, navigate actions)
   - `tree.ts` -- Pure functions for tree manipulation (insertPanel,
     removePanel, findPanel, updateRatio)
   - `SplitContainer.tsx` -- Renders a SplitNode: two children with a
     divider between them
   - `PanelShell.tsx` -- Renders a PanelNode: toolbar + MemoryRouter +
     view content
   - `PanelToolbar.tsx` -- Title, close button, split buttons
   - `Divider.tsx` -- Draggable resize handle between split children
   - `WorkspaceRoot.tsx` -- Recursive renderer: given a LayoutNode, renders
     either SplitContainer or PanelShell

2. Modify `src/App.tsx`:
   - Wrap main content area with `<PanelProvider>`
   - Replace `<Routes>` block with `<WorkspaceRoot>`
   - Default layout: single panel rendering the restored route

3. Add "Open in panel" affordance:
   - Right-click context menu or button in NavDrawer to open a view as a
     side panel instead of navigating

4. Persistence:
   - Save layout to `/api/settings` on every change (debounced)
   - Restore layout on cold start

**Estimated complexity:** Medium. ~600 lines of new code across 8 files.
Touches App.tsx and NavDrawer.tsx.

### Phase 2 -- Full Tiling

**Goal:** Arbitrary panel positions, nested splits, drag-to-rearrange.

**Scope:**
1. Panel positions: "left", "right", "top", "bottom" relative to any panel
2. Nested splits (split a panel that is already in a split)
3. Drag panel toolbar to move a panel to a different position
4. Drop zones: visual indicators when dragging a panel over another panel's
   edges (top/bottom/left/right/center quadrants)
5. Absorb existing drawers:
   - Terminal can be opened as a right panel or bottom panel
   - Activity/Event Monitor can be opened as left panels
   - Preserve the drawer UX as an option for users who prefer it

**Estimated complexity:** Medium-high. ~400 lines of new code. Drag-to-move
is the hardest part.

### Phase 3 -- Polish

**Goal:** Production-quality UX and power-user features.

**Scope:**
1. **Command palette:** Cmd+Shift+P opens a searchable list of all views;
   selecting one opens it in a new panel
2. **Panel history:** Back/forward navigation within each panel's
   MemoryRouter. Toolbar shows back/forward buttons.
3. **Keyboard shortcuts:**
   - `Cmd+\` -- Split focused panel right
   - `Cmd+-` -- Split focused panel down
   - `Cmd+W` -- Close focused panel
   - `Cmd+Shift+[/]` -- Focus previous/next panel
   - `Cmd+1/2/3` -- Focus panel by index
4. **Layout presets:** Save/restore named layouts ("coding", "monitoring",
   "review")
5. **Panel animations:** Smooth transitions on open/close/resize using CSS
   transitions
6. **Max/restore:** Double-click panel toolbar to maximize it (temporarily
   hide all other panels), double-click again to restore

**Estimated complexity:** Medium. ~500 lines. Mostly independent features.

---

## Part 6: Code Sketches

### Layout Tree Types (`src/components/panels/types.ts`)

```typescript
export type PanelId = string;

export interface PanelNode {
  type: "panel";
  id: PanelId;
  route: string;
  title?: string;
}

export interface SplitNode {
  type: "split";
  id: string;
  direction: "horizontal" | "vertical";
  ratio: number;
  children: [LayoutNode, LayoutNode];
}

export type LayoutNode = PanelNode | SplitNode;

export interface WorkspaceLayout {
  root: LayoutNode;
  focusedPanelId: PanelId | null;
}
```

### Tree Manipulation (`src/components/panels/tree.ts`)

```typescript
import type { LayoutNode, PanelNode, SplitNode, PanelId } from "./types";

export function findPanel(node: LayoutNode, id: PanelId): PanelNode | null {
  if (node.type === "panel") return node.id === id ? node : null;
  return findPanel(node.children[0], id) ?? findPanel(node.children[1], id);
}

export function findParentSplit(
  node: LayoutNode,
  targetId: string,
  parent?: SplitNode,
): { parent: SplitNode; index: 0 | 1 } | null {
  if (node.type === "panel") {
    return node.id === targetId && parent
      ? { parent, index: parent.children[0] === node ? 0 : 1 }
      : null;
  }
  if (node.id === targetId && parent) {
    return { parent, index: parent.children[0] === node ? 0 : 1 };
  }
  return (
    findParentSplit(node.children[0], targetId, node) ??
    findParentSplit(node.children[1], targetId, node)
  );
}

/** Replace a node in the tree by ID. Returns a new tree (immutable). */
export function replaceNode(
  root: LayoutNode,
  targetId: string,
  replacement: LayoutNode,
): LayoutNode {
  if (root.type === "panel") {
    return root.id === targetId ? replacement : root;
  }
  if (root.id === targetId) return replacement;
  return {
    ...root,
    children: [
      replaceNode(root.children[0], targetId, replacement),
      replaceNode(root.children[1], targetId, replacement),
    ],
  };
}

/** Insert a new panel adjacent to an existing panel. */
export function insertPanel(
  root: LayoutNode,
  relativeTo: PanelId,
  newPanel: PanelNode,
  position: "left" | "right" | "top" | "bottom",
): LayoutNode {
  const direction =
    position === "left" || position === "right" ? "horizontal" : "vertical";
  const first = position === "left" || position === "top";

  const target = findPanel(root, relativeTo);
  if (!target) return root;

  const split: SplitNode = {
    type: "split",
    id: crypto.randomUUID(),
    direction,
    ratio: 0.5,
    children: first ? [newPanel, target] : [target, newPanel],
  };

  return replaceNode(root, relativeTo, split);
}

/** Remove a panel; its sibling absorbs the space. */
export function removePanel(
  root: LayoutNode,
  panelId: PanelId,
): LayoutNode | null {
  if (root.type === "panel") {
    return root.id === panelId ? null : root;
  }
  const result = findParentSplit(root, panelId);
  if (!result) return root;
  // If removing from root split, return the sibling
  if (root.id === result.parent.id) {
    return result.parent.children[result.index === 0 ? 1 : 0];
  }
  // Replace parent split with the surviving sibling
  const survivor = result.parent.children[result.index === 0 ? 1 : 0];
  return replaceNode(root, result.parent.id, survivor);
}

/** Update the ratio of a split node. */
export function updateRatio(
  root: LayoutNode,
  splitId: string,
  ratio: number,
): LayoutNode {
  if (root.type === "panel") return root;
  if (root.id === splitId) return { ...root, ratio: Math.max(0.1, Math.min(0.9, ratio)) };
  return {
    ...root,
    children: [
      updateRatio(root.children[0], splitId, ratio),
      updateRatio(root.children[1], splitId, ratio),
    ],
  };
}

/** Collect all panel IDs in the tree. */
export function allPanelIds(node: LayoutNode): PanelId[] {
  if (node.type === "panel") return [node.id];
  return [...allPanelIds(node.children[0]), ...allPanelIds(node.children[1])];
}
```

### Panel Context (`src/components/panels/context.tsx`)

```typescript
import { createContext, useContext, useReducer, useCallback, type ReactNode } from "react";
import type { WorkspaceLayout, PanelNode, PanelId } from "./types";
import { insertPanel, removePanel, updateRatio, allPanelIds, findPanel } from "./tree";

type Action =
  | { type: "OPEN_PANEL"; route: string; position: "left" | "right" | "top" | "bottom"; relativeTo?: PanelId }
  | { type: "CLOSE_PANEL"; panelId: PanelId }
  | { type: "FOCUS_PANEL"; panelId: PanelId }
  | { type: "RESIZE"; splitId: string; ratio: number }
  | { type: "NAVIGATE_PANEL"; panelId: PanelId; route: string }
  | { type: "SET_LAYOUT"; layout: WorkspaceLayout };

function reducer(state: WorkspaceLayout, action: Action): WorkspaceLayout {
  switch (action.type) {
    case "OPEN_PANEL": {
      const newPanel: PanelNode = {
        type: "panel",
        id: crypto.randomUUID(),
        route: action.route,
      };
      const relativeTo = action.relativeTo ?? state.focusedPanelId ?? allPanelIds(state.root)[0];
      if (!relativeTo) return state;
      return {
        root: insertPanel(state.root, relativeTo, newPanel, action.position),
        focusedPanelId: newPanel.id,
      };
    }
    case "CLOSE_PANEL": {
      const newRoot = removePanel(state.root, action.panelId);
      if (!newRoot) return state; // Cannot remove last panel
      const ids = allPanelIds(newRoot);
      return {
        root: newRoot,
        focusedPanelId: ids.includes(state.focusedPanelId ?? "")
          ? state.focusedPanelId
          : ids[0] ?? null,
      };
    }
    case "FOCUS_PANEL":
      return { ...state, focusedPanelId: action.panelId };
    case "RESIZE":
      return { ...state, root: updateRatio(state.root, action.splitId, action.ratio) };
    case "NAVIGATE_PANEL": {
      const panel = findPanel(state.root, action.panelId);
      if (!panel) return state;
      // Immutable update: replace the panel with a new route
      const updated: PanelNode = { ...panel, route: action.route };
      const { replaceNode } = require("./tree");
      return { ...state, root: replaceNode(state.root, action.panelId, updated) };
    }
    case "SET_LAYOUT":
      return action.layout;
    default:
      return state;
  }
}

interface PanelContextValue {
  layout: WorkspaceLayout;
  dispatch: React.Dispatch<Action>;
  openPanel: (route: string, position?: "left" | "right" | "top" | "bottom") => void;
  closePanel: (panelId: PanelId) => void;
  focusPanel: (panelId: PanelId) => void;
}

const PanelCtx = createContext<PanelContextValue | null>(null);

export function PanelProvider({ initialLayout, children }: { initialLayout: WorkspaceLayout; children: ReactNode }) {
  const [layout, dispatch] = useReducer(reducer, initialLayout);

  const openPanel = useCallback(
    (route: string, position: "left" | "right" | "top" | "bottom" = "right") =>
      dispatch({ type: "OPEN_PANEL", route, position }),
    [],
  );
  const closePanel = useCallback(
    (panelId: PanelId) => dispatch({ type: "CLOSE_PANEL", panelId }),
    [],
  );
  const focusPanel = useCallback(
    (panelId: PanelId) => dispatch({ type: "FOCUS_PANEL", panelId }),
    [],
  );

  return (
    <PanelCtx.Provider value={{ layout, dispatch, openPanel, closePanel, focusPanel }}>
      {children}
    </PanelCtx.Provider>
  );
}

export function usePanels(): PanelContextValue {
  const ctx = useContext(PanelCtx);
  if (!ctx) throw new Error("usePanels must be used within PanelProvider");
  return ctx;
}
```

### Workspace Root Renderer (`src/components/panels/WorkspaceRoot.tsx`)

```typescript
import { Box } from "@mui/material";
import type { LayoutNode } from "./types";
import { usePanels } from "./context";
import { PanelShell } from "./PanelShell";
import { Divider } from "./Divider";

function LayoutRenderer({ node }: { node: LayoutNode }) {
  const { dispatch } = usePanels();

  if (node.type === "panel") {
    return <PanelShell panel={node} />;
  }

  const { direction, ratio, children, id: splitId } = node;
  const isHorizontal = direction === "horizontal";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isHorizontal ? "row" : "column",
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <Box sx={{ flex: `0 0 ${ratio * 100}%`, minWidth: 0, minHeight: 0, display: "flex", overflow: "hidden" }}>
        <LayoutRenderer node={children[0]} />
      </Box>
      <Divider
        direction={isHorizontal ? "vertical" : "horizontal"}
        onDrag={(delta, totalSize) => {
          const newRatio = ratio + delta / totalSize;
          dispatch({ type: "RESIZE", splitId, ratio: newRatio });
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", overflow: "hidden" }}>
        <LayoutRenderer node={children[1]} />
      </Box>
    </Box>
  );
}

export function WorkspaceRoot() {
  const { layout } = usePanels();
  return (
    <Box sx={{ display: "flex", flex: 1, minWidth: 0, minHeight: 0, overflow: "hidden" }}>
      <LayoutRenderer node={layout.root} />
    </Box>
  );
}
```

### Panel Shell with MemoryRouter (`src/components/panels/PanelShell.tsx`)

```typescript
import { Suspense, lazy, useMemo } from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import type { PanelNode } from "./types";
import { PanelToolbar } from "./PanelToolbar";
import { usePanels } from "./context";
import { views } from "../../views/registry";
import { ErrorBoundary } from "../ErrorBoundary";

// Lazy-load detail views
const ProjectDashboard = lazy(() => import("../../views/ProjectDashboard"));
// ... other detail views

function PanelFallback() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
      <CircularProgress size={24} />
    </Box>
  );
}

export function PanelShell({ panel }: { panel: PanelNode }) {
  const { layout, focusPanel } = usePanels();
  const isFocused = layout.focusedPanelId === panel.id;

  // Derive title from view registry
  const title = useMemo(() => {
    if (panel.title) return panel.title;
    const view = views.find((v) => panel.route.startsWith(v.path.replace("/*", "")));
    return view?.label ?? panel.route;
  }, [panel.title, panel.route]);

  return (
    <Box
      onClick={() => focusPanel(panel.id)}
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        outline: isFocused ? 2 : 0,
        outlineColor: "primary.main",
        outlineOffset: -2,
      }}
    >
      <PanelToolbar panelId={panel.id} title={title} />
      <Box sx={{ flex: 1, overflow: "auto", px: 2, pb: 2 }}>
        <MemoryRouter initialEntries={[panel.route]}>
          <Suspense fallback={<PanelFallback />}>
            <Routes>
              {views.map((v) => (
                <Route
                  key={v.path}
                  path={v.path}
                  element={<ErrorBoundary label={v.label}><v.component /></ErrorBoundary>}
                />
              ))}
              <Route path="/projects/:projectId" element={<ErrorBoundary label="Project"><ProjectDashboard /></ErrorBoundary>} />
              {/* Additional detail routes */}
            </Routes>
          </Suspense>
        </MemoryRouter>
      </Box>
    </Box>
  );
}
```

### Divider (`src/components/panels/Divider.tsx`)

```typescript
import { useCallback, useRef } from "react";
import { Box } from "@mui/material";

interface Props {
  direction: "horizontal" | "vertical";
  onDrag: (delta: number, totalSize: number) => void;
}

export function Divider({ direction, onDrag }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const isVertical = direction === "vertical";

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startPos = isVertical ? e.clientX : e.clientY;
      const parent = ref.current?.parentElement;
      if (!parent) return;
      const totalSize = isVertical ? parent.clientWidth : parent.clientHeight;

      const onMove = (ev: MouseEvent) => {
        const currentPos = isVertical ? ev.clientX : ev.clientY;
        onDrag(currentPos - startPos, totalSize);
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = isVertical ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [isVertical, onDrag],
  );

  return (
    <Box
      ref={ref}
      onMouseDown={handleMouseDown}
      sx={{
        flexShrink: 0,
        [isVertical ? "width" : "height"]: 5,
        cursor: isVertical ? "col-resize" : "row-resize",
        "&:hover, &:active": { bgcolor: "primary.main", opacity: 0.5 },
        transition: "background-color 0.15s",
      }}
    />
  );
}
```

---

## Part 7: Migration Path from Current Architecture

The panel system replaces the main content area **only**. Here is what
changes and what stays:

| Component | Change |
|-----------|--------|
| `App.tsx` AppLayout | Replace `<Box component="main"><Routes>...</Routes></Box>` with `<PanelProvider><WorkspaceRoot /></PanelProvider>` |
| `NavDrawer` | Add right-click / long-press "Open in panel" option. Regular click still navigates the focused panel. |
| `AppHeader` | Back button operates on the focused panel's MemoryRouter |
| `TerminalDrawer` | Unchanged in v1. In v2, optionally openable as a panel |
| `ActivityDrawer` | Unchanged in v1 |
| `EventMonitorDrawer` | Unchanged in v1 |
| `RestoreRoute` | Replaced by layout restoration from settings |
| `views/registry.ts` | Unchanged -- panels use the same registry to resolve routes to components |
| `useNavHistory` | Scoped to the focused panel in v1 |

The key insight: **the panel system is additive**. It replaces one `<Box>` in
the layout with a richer container. Everything outside that box (header, nav,
drawers, FABs) is unchanged.

---

## Part 8: Open Questions and Risks

### Open Questions

1. **Detail routes with URL params:** Routes like `/projects/:projectId`
   need the param extracted from the MemoryRouter, not the browser URL.
   Existing views using `useParams()` will work because they read from the
   nearest Router context (which is the panel's MemoryRouter). Verify this
   assumption early.

2. **Views that call `useNavigate()`:** Some views navigate programmatically
   (e.g., clicking a project card navigates to `/projects/:id`). With
   MemoryRouter, this navigation stays within the panel. Is that always
   desired? Should some navigations open a new panel instead? Need a
   convention: `navigate()` stays in panel, `openPanel()` opens a new one.

3. **Terminal drawer coexistence:** The terminal drawer currently hides the
   main content when expanded. With panels, expanding a terminal panel should
   only maximize that panel, not hide siblings. This needs redesign in v2.

4. **Mobile:** On mobile, the tiling layout should collapse to a single
   panel with a tab bar for switching. The panel system should detect mobile
   and render a simplified view.

5. **URL bar sync:** When the user refreshes the page, only the focused
   panel's route is in the URL. The full layout is restored from settings.
   If settings are lost, only the focused panel's route survives. Acceptable?

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| MemoryRouter breaks views that assume BrowserRouter | Medium | Audit all `useLocation`, `useSearchParams`, `useNavigate` usage. Most work fine with MemoryRouter. Test early. |
| Performance with many panels open | Low | React lazy loading already in use. Each panel only mounts when visible. Event Monitor subscriptions are shared. |
| Layout tree gets corrupted | Low | Validate tree on restore. If invalid, fall back to single-panel default layout. |
| ResizableDrawer conflicts with panel dividers | Low | They operate in separate DOM regions. No overlap. |
| Scope creep into v1 | High | v1 is strictly: open panel right, close panel, resize, persist. No drag-to-move, no nested splits beyond one level. |

---

## Summary

This proposal transforms Context UI from a page-navigation app into a tiling
workspace with zero new dependencies. The recursive split-tree model is
elegant, serializable, and maps naturally onto flexbox. MemoryRouter per panel
gives routing isolation without the cost of iframes. The existing
ResizableDrawer pattern provides a proven resize mechanism to extend.

Phase 1 is achievable in ~600 lines across 8 files and delivers the core
value: open any view side-by-side with any other view. The existing drawers
continue to work unchanged, and the migration path is non-destructive.
