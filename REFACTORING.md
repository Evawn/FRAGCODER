# Frontend Refactoring Plan: Shader Compilation & Rendering

## Executive Summary

This document outlines the current architecture of shader compilation and rendering in the Shader Playground frontend, identifies architectural issues, and proposes a simplified architecture with clearer data flow.

---

## Current Architecture

### Component Hierarchy

```
App
└── EditorPage (page-level orchestrator)
    ├── ShaderPlayer (left panel - rendering)
    │   └── useWebGLRenderer (hook - compilation + rendering logic)
    │       └── WebGLRenderer (utility class - WebGL operations)
    └── ShaderEditor (right panel - editing)
        └── CodeMirrorEditor (code editor with error decorations)
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          EditorPage                              │
│  - Manages: tabs state, compilation trigger counter             │
│  - Receives: compilation results via callback                    │
└─────────────────────────────────────────────────────────────────┘
        │                                              │
        │ tabs, compileTrigger                         │ tabs, errors
        │ onCompilationResult callback                 │ onCompile callback
        ↓                                              ↓
┌──────────────────────────┐              ┌───────────────────────────┐
│     ShaderPlayer         │              │     ShaderEditor          │
│  - Receives shader tabs  │              │  - Manages editor state   │
│  - Passes to hook        │              │  - Collects code changes  │
│  - Displays canvas       │              │  - Sends tabs UP          │
└──────────────────────────┘              └───────────────────────────┘
        │                                              │
        │ tabs, compileTrigger                         │
        │ onCompilationResult                          │
        ↓                                              │
┌──────────────────────────┐                          │
│   useWebGLRenderer       │                          │
│  - COMPILES shaders ◄────┼──────────────────────────┘
│  - RENDERS to canvas     │        UP: code changes
│  - Calls callback UP     │
└──────────────────────────┘
        │
        │ compileShader()
        ↓
┌──────────────────────────┐
│    WebGLRenderer         │
│  - WebGL operations      │
│  - Shader preprocessing  │
│  - Multi-pass rendering  │
└──────────────────────────┘
```

### Current Data Flow (Problems Highlighted)

1. **User edits code** in `CodeMirrorEditor`
2. **Code changes flow UP** from `ShaderEditor` → `EditorPage` (via `onCompile` callback)
3. `EditorPage` stores tabs and increments `compileTrigger`
4. **Compilation trigger flows DOWN** to `ShaderPlayer` → `useWebGLRenderer`
5. `useWebGLRenderer` **performs compilation** (business logic in child component!)
6. **Compilation results flow UP** via `onCompilationResult` callback to `EditorPage`
7. `EditorPage` stores errors
8. **Errors flow DOWN** to `ShaderEditor` → `CodeMirrorEditor`

**Problem**: Information flows up and down multiple times, creating a "yo-yo" effect.

---

## Problems with Current Architecture

### 1. Business Logic in Child Components

**Issue**: `useWebGLRenderer` (inside `ShaderPlayer`) performs shader compilation.

**Location**: [useWebGLRenderer.ts:78-170](frontend/src/hooks/useWebGLRenderer.ts#L78-L170)

```typescript
// Compile shader when tabs change, compile trigger changes, or renderer becomes ready
useEffect(() => {
  // ... compilation logic here
  try {
    renderer.compileShader(tabs);
    onCompilationResult(true, [], compilationTime);
  } catch (err) {
    // ... error handling
    onCompilationResult(false, allErrors, compilationTime);
  }
}, [tabs, compileTrigger, onCompilationResult, isRendererReady]);
```

**Why it's problematic**:
- Compilation is a **business logic operation** that should be at the top level
- Child component controls when compilation happens (via useEffect)
- Parent can only influence compilation via props, not directly invoke it

### 2. Up-and-Down Data Flow

**Issue**: Data flows both directions multiple times.

**Path 1 - Code UP**:
- `CodeMirrorEditor` → `ShaderEditor` (via `onChange`)
- `ShaderEditor` → `EditorPage` (via `onCompile` with all tabs)

**Path 2 - Trigger DOWN**:
- `EditorPage` → `ShaderPlayer` (via `compileTrigger` counter)
- `ShaderPlayer` → `useWebGLRenderer` (via `compileTrigger` prop)

**Path 3 - Results UP**:
- `useWebGLRenderer` → `ShaderPlayer` (via `onCompilationResult` callback)
- `ShaderPlayer` → `EditorPage` (via `onCompilationResult` callback)

**Path 4 - Errors DOWN**:
- `EditorPage` → `ShaderEditor` (via `compilationErrors` prop)
- `ShaderEditor` → `CodeMirrorEditor` (via `errors` prop)

### 3. Unclear Separation of Concerns

**Current responsibilities**:

- **EditorPage**: Orchestration + state storage (tabs, errors, compilation status)
- **ShaderEditor**: Editor UI + tab management + code collection
- **ShaderPlayer**: Display + passes data through to hook
- **useWebGLRenderer**: **Compilation** + rendering + WebGL management

**Problem**: Compilation logic is buried in a child component's hook, making it:
- Hard to understand the full compilation flow
- Difficult to test compilation in isolation
- Confusing where the "source of truth" is

### 4. Tight Coupling

**Issue**: Components are tightly coupled through:
- Callback props (`onCompilationResult`, `onCompile`)
- Counter-based triggers (`compileTrigger`)
- Prop drilling (passing data through intermediate components)

**Example**: `ShaderPlayer` doesn't care about compilation results, but must pass `onCompilationResult` callback to `useWebGLRenderer`.

---

## Proposed Architecture

### New Component Hierarchy

```
App
└── EditorPage (orchestrator + business logic)
    ├── useWebGLRenderer (moved to EditorPage level)
    │   └── WebGLRenderer (WebGL utility)
    ├── ShaderPlayer (pure presentational - canvas + controls)
    └── ShaderEditor (pure presentational - editor + UI)
        └── CodeMirrorEditor (code editor)
```

### New Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          EditorPage                              │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  useWebGLRenderer (compilation + rendering)            │     │
│  │    - compileShader(tabs) → errors                      │     │
│  │    - WebGLRenderer instance                            │     │
│  │    - Canvas ref                                        │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                   │
│  State Management:                                               │
│    - tabs (code for all shader passes)                           │
│    - compilationErrors                                           │
│    - compilationSuccess                                          │
│    - isPlaying                                                   │
│                                                                   │
│  Business Logic:                                                 │
│    - handleCompile() - triggers compilation                      │
│    - handleCodeChange() - updates tabs state                     │
│    - handlePlayPause() - controls playback                       │
└─────────────────────────────────────────────────────────────────┘
        │                                              │
        │ canvasRef, controls                          │ code, errors
        │ (display only)                               │ (display only)
        ↓                                              ↓
┌──────────────────────────┐              ┌───────────────────────────┐
│     ShaderPlayer         │              │     ShaderEditor          │
│  PRESENTATIONAL ONLY     │              │  PRESENTATIONAL ONLY      │
│  - Displays canvas       │              │  - Displays editor        │
│  - Play/pause button     │              │  - Tab UI                 │
│  - Stats display         │              │  - Error decorations      │
│  - Receives canvasRef    │              │  - onChange callbacks     │
└──────────────────────────┘              └───────────────────────────┘
                                                      │
                                                      ↓
                                          ┌───────────────────────────┐
                                          │   CodeMirrorEditor        │
                                          │  - Code editing           │
                                          │  - Error decorations      │
                                          └───────────────────────────┘
```

### Key Changes

#### 1. Move Compilation to EditorPage

**Before**: `useWebGLRenderer` (in ShaderPlayer) handles compilation

**After**: `EditorPage` directly uses `useWebGLRenderer` and controls compilation

```typescript
// EditorPage.tsx - NEW PATTERN
function EditorPage() {
  const [tabs, setTabs] = useState<TabShaderData[]>([...]);
  const [errors, setErrors] = useState<CompilationError[]>([]);
  const [compilationSuccess, setCompilationSuccess] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  // Hook now lives at EditorPage level
  const {
    canvasRef,
    compileShader,
    reset,
    uTime,
    fps,
    resolution
  } = useWebGLRenderer({
    isPlaying,
    // No more callbacks needed!
  });

  // Direct compilation control
  const handleCompile = useCallback(() => {
    try {
      const result = compileShader(tabs);
      setCompilationSuccess(true);
      setErrors([]);
    } catch (err) {
      setCompilationSuccess(false);
      setErrors(parseErrors(err));
    }
  }, [tabs, compileShader]);

  // Handle code changes from editor
  const handleCodeChange = useCallback((newCode: string, tabId: string) => {
    setTabs(prev => prev.map(tab =>
      tab.id === tabId ? { ...tab, code: newCode } : tab
    ));
  }, []);

  return (
    <ResizablePanelGroup>
      <ResizablePanel>
        <ShaderPlayer
          canvasRef={canvasRef}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onReset={reset}
          uTime={uTime}
          fps={fps}
          resolution={resolution}
        />
      </ResizablePanel>

      <ResizablePanel>
        <ShaderEditor
          tabs={tabs}
          onCodeChange={handleCodeChange}
          onCompile={handleCompile}
          errors={errors}
          compilationSuccess={compilationSuccess}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
```

#### 2. Simplify ShaderPlayer (Pure Presentation)

**Before**: ShaderPlayer passes props through to useWebGLRenderer

**After**: ShaderPlayer only displays the canvas and controls

```typescript
// ShaderPlayer.tsx - NEW PATTERN
interface ShaderPlayerProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isPlaying: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  uTime: number;
  fps: number;
  resolution: { width: number; height: number };
}

export default function ShaderPlayer({
  canvasRef,
  isPlaying,
  onPlayPause,
  onReset,
  uTime,
  fps,
  resolution
}: ShaderPlayerProps) {
  return (
    <div>
      <canvas ref={canvasRef} />
      <div>
        <button onClick={onPlayPause}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button onClick={onReset}>Reset</button>
        <span>{uTime.toFixed(2)}s</span>
        <span>{fps.toFixed(1)} fps</span>
        <span>{resolution.width} × {resolution.height}</span>
      </div>
    </div>
  );
}
```

#### 3. Simplify ShaderEditor (Pure Presentation)

**Before**: ShaderEditor manages tabs internally and sends all tabs up via callback

**After**: ShaderEditor receives tabs as props and sends changes up

```typescript
// ShaderEditor.tsx - NEW PATTERN
interface ShaderEditorProps {
  tabs: TabShaderData[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onCodeChange: (newCode: string, tabId: string) => void;
  onCompile: () => void;
  errors: CompilationError[];
  compilationSuccess: boolean;
}

export default function ShaderEditor({
  tabs,
  activeTabId,
  onTabChange,
  onCodeChange,
  onCompile,
  errors,
  compilationSuccess
}: ShaderEditorProps) {
  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeTabErrors = errors.filter(e =>
    !e.passName || e.passName === activeTab?.name
  );

  return (
    <div>
      <Tabs value={activeTabId} onValueChange={onTabChange}>
        {tabs.map(tab => (
          <TabButton key={tab.id} value={tab.id}>
            {tab.name}
          </TabButton>
        ))}
      </Tabs>

      <CodeMirrorEditor
        value={activeTab?.code || ''}
        onChange={(newCode) => onCodeChange(newCode, activeTabId)}
        onCompile={onCompile}
        errors={activeTabErrors}
        compilationSuccess={compilationSuccess}
      />
    </div>
  );
}
```

#### 4. Refactor useWebGLRenderer (Return Imperative API)

**Before**: Hook automatically compiles on prop changes and uses callbacks

**After**: Hook provides imperative API for parent to control

```typescript
// useWebGLRenderer.ts - NEW PATTERN
interface UseWebGLRendererProps {
  isPlaying: boolean;
}

interface UseWebGLRendererReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  compileShader: (tabs: TabShaderData[]) => void; // Imperative!
  reset: () => void;
  uTime: number;
  fps: number;
  resolution: { width: number; height: number };
}

export function useWebGLRenderer({
  isPlaying
}: UseWebGLRendererProps): UseWebGLRendererReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const [uTime, setUTime] = useState(0);
  const [fps, setFps] = useState(0);
  const [resolution, setResolution] = useState({ width: 0, height: 0 });

  // Initialize renderer once
  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new WebGLRenderer();
    renderer.initialize(canvasRef.current);
    rendererRef.current = renderer;
    return () => renderer.dispose();
  }, []);

  // Control playback
  useEffect(() => {
    if (!rendererRef.current) return;
    if (isPlaying) {
      rendererRef.current.start();
    } else {
      rendererRef.current.stop();
    }
  }, [isPlaying]);

  // Imperative compilation function (NO automatic effect!)
  const compileShader = useCallback((tabs: TabShaderData[]) => {
    if (!rendererRef.current) {
      throw new Error('Renderer not initialized');
    }

    // This will throw on error - parent handles it
    rendererRef.current.compileShader(tabs);
  }, []);

  const reset = useCallback(() => {
    rendererRef.current?.resetTime();
  }, []);

  // Update stats
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (rendererRef.current) {
        setUTime(rendererRef.current.getCurrentTime());
        setFps(rendererRef.current.getFrameRate());
        // ... update resolution
      }
    }, 16);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return {
    canvasRef,
    compileShader, // Parent calls this directly!
    reset,
    uTime,
    fps,
    resolution
  };
}
```

---

## Benefits of New Architecture

### 1. Top-Down Data Flow Only

- Data flows in one direction: **EditorPage → Children**
- No more callbacks passing data back up
- Easier to trace and understand

### 2. Clear Separation of Concerns

| Component | Responsibility |
|-----------|---------------|
| **EditorPage** | Business logic, state management, orchestration |
| **ShaderPlayer** | Display canvas and controls |
| **ShaderEditor** | Display editor and tabs |
| **CodeMirrorEditor** | Text editing with decorations |
| **useWebGLRenderer** | WebGL operations (imperative API) |

### 3. Testability

- Business logic centralized in `EditorPage` (easy to test)
- Presentational components are pure functions (easy to test)
- `useWebGLRenderer` provides imperative API (easy to mock)

### 4. Maintainability

- Single source of truth for all state (`EditorPage`)
- No prop drilling through intermediate components
- Clear responsibility boundaries

### 5. Flexibility

- Easy to add new features (just modify EditorPage)
- Easy to reuse presentational components
- Easy to swap out implementations (e.g., different editor)

---

## Implementation Plan

### Phase 1: Refactor useWebGLRenderer

**Files to modify**:
- `frontend/src/hooks/useWebGLRenderer.ts`

**Changes**:
1. Remove `tabs`, `compileTrigger`, `onCompilationResult` props
2. Remove automatic compilation useEffect
3. Return `compileShader` function instead of automatic behavior
4. Keep only playback control and stats tracking

**Estimated effort**: 1-2 hours

### Phase 2: Refactor EditorPage

**Files to modify**:
- `frontend/src/pages/EditorPage.tsx`

**Changes**:
1. Move `useWebGLRenderer` to EditorPage level
2. Create `handleCompile` function that calls `compileShader` directly
3. Create `handleCodeChange` function to update tabs state
4. Remove `compileTrigger` counter mechanism
5. Pass only necessary props to children (no callbacks for results)

**Estimated effort**: 2-3 hours

### Phase 3: Simplify ShaderPlayer

**Files to modify**:
- `frontend/src/components/ShaderPlayer.tsx`

**Changes**:
1. Remove `useWebGLRenderer` import and usage
2. Accept `canvasRef` as prop
3. Remove `onCompilationResult` callback
4. Accept display values (uTime, fps, resolution) as props
5. Simplify to pure presentational component

**Estimated effort**: 1-2 hours

### Phase 4: Simplify ShaderEditor

**Files to modify**:
- `frontend/src/components/editor/ShaderEditor.tsx`

**Changes**:
1. Accept `tabs` as prop instead of managing internally
2. Replace internal tab state with `activeTabId` prop
3. Change `onCompile` to not include tabs (parent already has them)
4. Simplify to pure presentational component

**Estimated effort**: 2-3 hours

### Phase 5: Testing & Refinement

**Activities**:
1. Test compilation flow end-to-end
2. Test error handling and display
3. Test playback controls
4. Test tab switching
5. Verify no regressions in existing features

**Estimated effort**: 2-3 hours

---

## Migration Strategy

### Option A: Big Bang (Recommended for this project)

**Approach**: Implement all changes in one coordinated effort

**Pros**:
- Faster overall
- No temporary inconsistent state
- Cleaner git history

**Cons**:
- Higher risk if something breaks
- Can't merge partially

**Recommended**: Yes, because the components are tightly coupled anyway.

### Option B: Incremental

**Approach**: Make changes component by component with temporary compatibility layers

**Pros**:
- Lower risk
- Can merge incrementally
- Easier to review

**Cons**:
- More complex
- Temporary code needed
- Slower overall

**Recommended**: No, because the coupling makes this difficult.

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking existing features | Medium | High | Thorough testing after each phase |
| Introducing new bugs | Medium | Medium | Focus on pure functions, reduce side effects |
| State synchronization issues | Low | Medium | Single source of truth in EditorPage |
| Performance degradation | Low | Low | useCallback/useMemo where appropriate |

---

## Success Criteria

1. ✅ All compilation logic is in `EditorPage`
2. ✅ `ShaderPlayer` and `ShaderEditor` are pure presentational components
3. ✅ No more up-and-down data flow (top-down only)
4. ✅ `useWebGLRenderer` provides imperative API
5. ✅ All existing features work without regressions
6. ✅ Code is easier to understand and maintain

---

## Conclusion

The proposed refactoring will significantly improve the architecture by:
- Moving business logic to the top level
- Simplifying data flow to top-down only
- Creating clear separation of concerns
- Improving testability and maintainability

The effort is estimated at **8-13 hours** total, with the benefit of much cleaner, more maintainable code.
