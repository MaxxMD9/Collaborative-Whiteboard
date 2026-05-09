
import { useEffect, useRef, useState } from "react";
import SettingsPanel from "./components/SettingsPanel.jsx";

function App() {
  /* CANVAS VARIABLES */
  const boardAreaRef = useRef(null);
  const canvasRef = useRef(null);
  const currentStrokeRef = useRef(null);
  const isDrawingRef = useRef(false);
  const redoStackRef = useRef([]);
  const strokesRef = useRef([]);
  
  /* TOOL VARIABLES */
  const [tool, setTool]                     = useState("pencil");
  const [color, setColor]                   = useState("#111827");
  const [size, setSize]                     = useState(5);
  const [status, setStatus]                 = useState("Ready");
  const [strokeCount, setStrokeCount]       = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  /* CAMERA / PANNING VARIABLES */
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const isMoveKeyHeldRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef({ x: 0, y: 0 });

  /* SETTINGS */
  const [settings, setSettings] = useState({
    canvasBackground: "#ffffff",
    defaultTool: "Pencil",
    defaultBrushSize: 5,
    gridEnabled: false,
    gridSize: 25,
    liveSyncEnabled: false,                                           /* ENABLE SYNC AT A LATER DATE */
    roomName: "Main Room",
    showStatus: true
  });

  // Update a setting while preserving the rest
  function handleSettingChange(key, value) {
    setSettings(previousSettings => ({...previousSettings, [key]: value}));
  }

  // Convert mouse position in browser window to coordinates relative to canvas
  function getScreenPosition(event) {
    const rect = canvasRef.current.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top};
  }

  // Transform canvas coordinates to whiteboard coordinates using camera offset and zoom
  function screenToWorld(screenPoint) {
    const camera = cameraRef.current;

    return {
      x: (screenPoint.x - camera.x) / camera.zoom,
      y: (screenPoint.y - camera.y) / camera.zoom};
  }

  // Convert cursor position to world-space coordinates, accounts for pan and zoom
  function getPointerPosition(event) {
    return screenToWorld(getScreenPosition(event));
  }

  // Determine drawing color based on selection, transparency will be added later in the form of Hardness
  function getToolColor() {
    if (tool === "eraser") {
      return settings.canvasBackground;
    }
    if (tool === "brush") {
      return hexToRgba(color, 0.35);
    }
    return color;
  }

  // Get stroke size, tools should scale differently
  function getToolSize() {
    if (tool === "eraser") return size * 3;
    if (tool === "brush") return size * 1.5;
    return size;
  }

  // Starting point for a drawing action
  function createStroke(point) {
    return {
      id: crypto.randomUUID(),
      tool,
      color: getToolColor(),
      baseColor: color,
      size: getToolSize(),
      points: [point],
      createdAt: Date.now()
    };
  }

  // Hex -> RGBA with transparency
  function hexToRgba(hex, alpha) {
    const cleanHex = hex.replace("#", "");
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Apply visual properties to a stroke
  function applyStrokeStyle(ctx, stroke) {
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
  }

  // Renders background grid on Canvas (think of it like graphing paper). Enable this through "Grid Enabled" in settings.
  function drawGrid(ctx, width, height) {
    if (!settings.gridEnabled) {
      return;
    }
    const gridSize = Number(settings.gridSize) || 25;
    ctx.save();
    ctx.strokeStyle = "#eeeeee";
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Effectively a single click. Draw a circle on the canvas
  function drawDot(ctx, stroke, point) {
    applyStrokeStyle(ctx, stroke);
    ctx.beginPath();
    ctx.arc(point.x, point.y, stroke.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Renders a full stroke path using all stored points in the stroke
  function drawFullStroke(ctx, stroke) {
    const points = stroke.points;
    if (points.length === 1) {
      drawDot(ctx, stroke, points[0]);
      return;
    }

    /* Helper function to draw only the newest segment between the two most recent points in a stroke.
       In other words, when you move your mouse while drawing, keep connecting the points you've drawn over.*/
    function drawLatestSegment(ctx, stroke) {
      const points = stroke.points;
      if (points.length < 2) {
        return;
      }
      const previous = points[points.length - 2];
      const current = points[points.length - 1];

      applyStrokeStyle(ctx, stroke);
      ctx.beginPath();
      ctx.moveTo(previous.x, previous.y);
      ctx.lineTo(current.x, current.y);
      ctx.stroke();
    }
    applyStrokeStyle(ctx, stroke);

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }

    const lastPoint = points[points.length - 1];
    ctx.lineTo(lastPoint.x, lastPoint.y);
    ctx.stroke();
  }

  // Retrieve 2D rendering from canvas element
  function getCanvasContext() {
    return canvasRef.current.getContext("2d");
  }

  // Clears and redraws the entire whiteboard (CLEAR button)
  function redrawBoard() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = getCanvasContext();
    const rect = canvas.getBoundingClientRect();
    const camera = cameraRef.current;
    // Blow everything up
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    // Fill with background color
    ctx.save();
    ctx.fillStyle = settings.canvasBackground;
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.restore();

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    drawGrid(ctx, rect.width / camera.zoom, rect.height / camera.zoom);

    for (const stroke of strokesRef.current) {
      drawFullStroke(ctx, stroke);
    }

    if (currentStrokeRef.current) {
      drawFullStroke(ctx, currentStrokeRef.current);
    }

    ctx.restore();
  }

  // Handle mouse scrolling to zoom in and out
  function handleWheel(event) {
    event.preventDefault();

    const camera = cameraRef.current;
    const screenPoint = getScreenPosition(event);
    const worldPointBeforeZoom = screenToWorld(screenPoint);

    const zoomSpeed = 0.0015;
    const zoomFactor = Math.exp(-event.deltaY * zoomSpeed);
    const nextZoom = Math.min(5, Math.max(0.2, camera.zoom * zoomFactor));

    camera.zoom = nextZoom;
    camera.x = screenPoint.x - worldPointBeforeZoom.x * camera.zoom;
    camera.y = screenPoint.y - worldPointBeforeZoom.y * camera.zoom;

    setStatus(`Zoom: ${Math.round(camera.zoom * 100)}%`);
    redrawBoard();
  }

  // Resize canvas to match device's pixel ratio and preserve rendering scale
  function resizeCanvas() {
    const canvas = canvasRef.current;
    const boardArea = boardAreaRef.current;
    if (!canvas || !boardArea) {
      return;
    }

    const ctx = canvas.getContext("2d");
    const pixelRatio = window.devicePixelRatio || 1;
    const rect = boardArea.getBoundingClientRect();

    canvas.width = rect.width * pixelRatio;
    canvas.height = rect.height * pixelRatio;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    redrawBoard();
  }

  // Move canvas around based on cursor movement
    function panCanvas(event) {
    if (!isPanningRef.current) {
      return;
    }

    const currentPoint = getScreenPosition(event);
    const lastPoint = lastPanPointRef.current;

    cameraRef.current.x += currentPoint.x - lastPoint.x;
    cameraRef.current.y += currentPoint.y - lastPoint.y;
    lastPanPointRef.current = currentPoint;
    redrawBoard();
  }

  // Begin drawing action regardless of tool input
  function startDrawing(event) {
    if (event.button === 2 || tool === "move") {
      isPanningRef.current = true;
      lastPanPointRef.current = getScreenPosition(event);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (event.button !== undefined && event.button !== 0) return;

    isDrawingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);

    const point = getPointerPosition(event);
    const stroke = createStroke(point);

    currentStrokeRef.current = stroke;
    redrawBoard();
  }

  // Update drawing stroke / camera movement while cursor is moving
  function continueDrawing(event) {
    if (isPanningRef.current) {
      panCanvas(event);
      return;
    }
    if (!isDrawingRef.current || !currentStrokeRef.current) {
      return;
    }
    const point = getPointerPosition(event);
    currentStrokeRef.current.points.push(point);
    redrawBoard();
  }

  // Finishes current stroke / camera movement while cursor is movement
  /* THIS NEEDS TO BE UPDATED AT A LATER DATE -------------------------------------------------------------------------------------------------------------- */
  function stopDrawing() {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      setStatus("Move complete");
      return;
    }

    if (!isDrawingRef.current || !currentStrokeRef.current) {
      return;
    }

    isDrawingRef.current = false;

    const finishedStroke = currentStrokeRef.current;
    strokesRef.current.push(finishedStroke);
    redoStackRef.current = [];
    currentStrokeRef.current = null;

    setStrokeCount(strokesRef.current.length);
    setStatus(`${strokesRef.current.length} stroke${strokesRef.current.length === 1 ? "" : "s"} on board`);

    // Future sync point:
    // socket.emit("stroke:create", finishedStroke);
  }

  // Ctrl + Z
  /* THIS NEEDS TO BE UPDATED AT A LATER DATE -------------------------------------------------------------------------------------------------------------- */
  function undoStroke() {
    if (strokesRef.current.length === 0) return;

    const removedStroke = strokesRef.current.pop();
    redoStackRef.current.push(removedStroke);
    redrawBoard();
    setStrokeCount(strokesRef.current.length);
    setStatus("Undo complete");

    // Future sync point:
    // socket.emit("stroke:undo");
  }

  // Ctrl + Y
  /* THIS NEEDS TO BE UPDATED AT A LATER DATE -------------------------------------------------------------------------------------------------------------- */
  function redoStroke() {
    if (redoStackRef.current.length === 0) return;

    const restoredStroke = redoStackRef.current.pop();
    strokesRef.current.push(restoredStroke);
    redrawBoard();
    setStrokeCount(strokesRef.current.length);
    setStatus("Redo complete");

    // Future sync point:
    // socket.emit("stroke:redo");
  }

  // NUKE EVERYTHING
  /* THIS NEEDS TO BE UPDATED AT A LATER DATE -------------------------------------------------------------------------------------------------------------- */
  function clearBoard() {
    strokesRef.current = [];
    redoStackRef.current = [];
    redrawBoard();
    setStrokeCount(0);
    setStatus("Board cleared");

    // Future sync point:
    // socket.emit("board:clear");
  }

  // 
  function selectTool(nextTool) {
    setTool(nextTool);
    setStatus(`${nextTool.charAt(0).toUpperCase() + nextTool.slice(1)} selected`);
  }

  // Change colors 
  function handleColorChange(event) {
    setColor(event.target.value);
    selectTool("pencil");
  }

  // Resize canvas to fit screen, adds resize listener for browser window resizing
  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => { window.removeEventListener("resize", resizeCanvas); };
  }, []);

  // Redraw whiteboard if grid size settings, background color, or grid visibility change
  useEffect(() => {
    redrawBoard();},
    [settings.canvasBackground, settings.gridEnabled, settings.gridSize]);

  // Register keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event) {
      const targetTag = event.target.tagName.toLowerCase();
      const isTyping =
        targetTag === "input" ||
        targetTag === "textarea" ||
        targetTag === "select";

      if (isTyping) {
        return;
      }
      const key = event.key.toLowerCase();
      if (event.ctrlKey && key === "z") {
        event.preventDefault();
        undoStroke();
        return;
      }
      if (event.ctrlKey && key === "y") {
        event.preventDefault();
        redoStroke();
        return;
      }
      if (key === "m") {
        selectTool("move");
      }
      if (key === "e") {
        selectTool("eraser");
      }
      if (key === "b") {
        selectTool("brush");
      }
      if (key === "p") {
        selectTool("pencil");
      } 
  }

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}, [tool, color, size, settings]);

  return (
    <main className="app">
      <header className="top-header">
        <div className="brand">Whiteboard</div>

        <nav className="toolbar" aria-label="Whiteboard tools">
          <button
           className={`tool-button image-tool-button ${tool === "pencil" ? "active" : ""}`}
           type="button"
           onClick={() => selectTool("pencil")}
           title="Pencil (P)"
           aria-label="Pencil">
           <img src="/assets/pencil.png" alt="" />
           <span>Pencil</span>
          </button>

          <button
           className={`tool-button image-tool-button ${tool === "brush" ? "active" : ""}`}
           type="button"
           onClick={() => selectTool("brush")}
           title="Brush (B)"
           aria-label="Brush">
           <img src="/assets/brush.png" alt="" />
           <span>Brush</span>
          </button>

          <button
           className={`tool-button image-tool-button ${tool === "eraser" ? "active" : ""}`}
           type="button"
           onClick={() => selectTool("eraser")}
           title="Eraser (E)"
           aria-label="Eraser">
           <img src="/assets/eraser.png" alt="" />
           <span>Eraser</span>
          </button>

          <button className="tool-button" type="button" onClick={undoStroke} title="Undo (Ctrl + Z)">
            Undo
          </button>

          <button className="tool-button" type="button" onClick={redoStroke} title="Redo (Ctrl + Y)">
            Redo
          </button>

          <button className="tool-button danger" type="button" onClick={clearBoard}>
            Clear
          </button>

          <label className="control-group">
            Color
            <input type="color" value={color} onChange={handleColorChange} />
          </label>

          <label className="control-group">
            Size
            <input
              type="range"
              min="1"
              max="40"
              value={size}
              onChange={event => setSize(Number(event.target.value))}
            />
            <span className="size-value">{size}px</span>
          </label>
        </nav>

        <button
          className="settings-button"
          type="button"
          aria-label="Open settings"
          onClick={() => setIsSettingsOpen(true)}
        >
          ⚙
        </button>
      </header>

      <section ref={boardAreaRef} className="board-area">
        <canvas
          ref={canvasRef}
          id="board"
          className={`tool-cursor-${tool}`}
          onPointerDown={startDrawing}
          onPointerMove={continueDrawing}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onPointerLeave={stopDrawing}
          onWheel={handleWheel}
          onContextMenu={event => event.preventDefault()}
        />

        {settings.showStatus && (
          <div className="status">
            {status} · {strokeCount} total
          </div>
        )}
      </section>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingChange={handleSettingChange}
      />
    </main>
  );
}

export default App;