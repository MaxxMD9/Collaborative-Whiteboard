import { useEffect, useRef, useState } from "react";
import SettingsPanel from "../components/SettingsPanel.jsx";
import "./WhiteboardPage.css";

import "katex/dist/katex.min.css";
import katex from "katex";
import { useAuth } from "../context/AuthContext";

import { getSocket } from "../socket";
import InviteModal from "../components/InviteModal";
import { useLocation } from "react-router-dom";

// Routing
import { Link, useNavigate } from "react-router-dom";


function WhiteboardPage() {
  const { logout } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();

  /* CANVAS VARIABLES */
  const boardAreaRef = useRef(null);
  const canvasRef = useRef(null);
  const currentStrokeRef = useRef(null);
  const isDrawingRef = useRef(false);
  
  /* UNDO / REDO / HISTORY VARIABLES */
  const redoStackRef = useRef([]);
  const objectsRef = useRef([]);
  const strokesRef = useRef([]);
  const historyRef = useRef([]);
  
  /* TOOL VARIABLES */
  const [tool, setTool]                     = useState("pencil");
  const [color, setColor]                   = useState("#111827");
  const [size, setSize]                     = useState(5);
  const [status, setStatus]                 = useState("Ready");
  const [strokeCount, setStrokeCount]       = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cursorPreview, setCursorPreview]   = useState(null);

  /* CAMERA / PANNING VARIABLES */
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const isMoveKeyHeldRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef({ x: 0, y: 0 });
  const [cameraVersion, setCameraVersion] = useState(0);

  /* BRUSH VARIABLE */
  const [brushHardness, setBrushHardness] = useState(60);

  /* SHAPE VARIABLES*/
  const activeShapeRef = useRef(null);
  const [shapeType, setShapeType] = useState("rectangle");
  const [shapeFillMode, setShapeFillMode] = useState("hollow");
  const [shapeOpacity, setShapeOpacity] = useState("1");

  /* FILL VARIABLES */
  const [fillTolerance, setFillTolerance] = useState(20);
  const [selectedObjectId, setSelectedObjectId] = useState(null);

  const selectedObjectRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  /* TEXTBOX VARIABLES */
  const movingTextBoxIdRef = useRef(null);
  const textBoxDragOffsetRef = useRef({ x: 0, y: 0 });
  const [selectedTextBoxId, setSelectedTextBoxId] = useState(null);
  const [textInput, setTextInput] = useState(null);
  const [textBoxes, setTextBoxes] = useState([]);
  const [textFont, setTextFont] = useState("Arial");
  const [textSize, setTextSize] = useState(20);
  
  /* COLOR PANEL VARIABLES */
  const colorRef = useRef(color);
  const colorInputRef = useRef(null);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  /* EQUATIONS VARIABLES */
  const equationInputRef = useRef(null);
  const [equations, setEquations] = useState([]);
  const [equationInput, setEquationInput] = useState(null);
  const [selectedEquationId, setSelectedEquationId] = useState(null);
  const movingEquationIdRef = useRef(null);
  const equationDragOffsetRef = useRef({ x: 0, y: 0 });
  const equationDraftRef = useRef("");
  const equationSaveLockRef = useRef(false);

  /* IMAGE VARIABLES */
  const imageInputRef = useRef(null);
  const movingImageIdRef = useRef(null);
  const imageDragOffsetRef = useRef({ x: 0, y: 0 });
  const [images, setImages] = useState([]);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const resizingImageIdRef = useRef(null);
  const imageResizeStartRef = useRef(null);

  /* SETTINGS */
  const [settings, setSettings] = useState({
    canvasBackground: "#ffffff",
    defaultTool: "Pencil",
    defaultBrushSize: 5,
    gridEnabled: false,
    gridSize: 25,
    liveSyncEnabled: false,                                           /* ENABLE SYNC AT A LATER DATE */
    roomName: location.state?.roomName || "Main Room",
    showStatus: true
  });
  
  /* ACCOUNT BUTTON VARIABLE */
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const [isInviteOpen, setIsInviteOpen] = useState(false);

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
      return hexToRgba(color, brushHardness / 100);
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
  function hexToRgbArray(hex) {
    const cleanHex = hex.replace("#", "");
    return [ parseInt(cleanHex.substring(0, 2), 16), parseInt(cleanHex.substring(2, 4), 16), parseInt(cleanHex.substring(4, 6), 16), 255 ];
  }
  function hexToRgba(hex, alpha) {
    const [r, g, b] = hexToRgbArray(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Apply visual properties to a stroke
  function applyStrokeStyle(ctx, stroke) {
    if (stroke.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0, 0, 0, 1)";
      ctx.fillStyle = "rgba(0, 0, 0, 1)";
    } 
    else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
    }

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
    ctx.save();
    applyStrokeStyle(ctx, stroke);
    ctx.beginPath();
    ctx.arc(point.x, point.y, stroke.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Renders a full stroke path using all stored points in the stroke
  function drawFullStroke(ctx, stroke) {
    if (stroke.kind === "shape") {
      drawShape(ctx, stroke);
      return;
    }

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
    ctx.save();
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
    ctx.restore();
  }

  // Helper function that decides what kind of object we're drawing. It routes the object to the correct renderer
  function drawBoardObject(ctx, object) {
    if (object.type === "shape") {
      drawShape(ctx, object);
      return;
    }
    if (object.type === "text") {
      drawTextObject(ctx, object);
    }
  }
  // Actually renders text
  function drawTextObject(ctx, object) {
    ctx.save();
    ctx.fillStyle = object.color;
    ctx.font = `${object.fontSize}px Arial`;
    ctx.textBaseline = "top";

    const lines = object.text.split("\n");

    lines.forEach((line, index) => {
      ctx.fillText(line, object.x, object.y + index * object.fontSize * 1.25);
    });
    ctx.restore();
  }

  // Actually renders shape
  function drawShape(ctx, shape) {
    const x = Math.min(shape.start.x, shape.end.x);
    const y = Math.min(shape.start.y, shape.end.y);
    const width = Math.abs(shape.end.x - shape.start.x);
    const height = Math.abs(shape.end.y - shape.start.y);
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    ctx.save();
    ctx.strokeStyle = getColorWithOpacity(shape.color, shape.opacity);
    ctx.fillStyle = getColorWithOpacity(shape.color, shape.opacity);
    ctx.lineWidth = shape.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    if (shape.shapeType === "rectangle") {
      ctx.rect(x, y, width, height);
    }
    if (shape.shapeType === "circle") {
      if (shape.isShiftLocked) {
        const radius = Math.min(width, height) / 2;
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      } else {
        ctx.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
      }
    }

    if (shape.shapeType === "triangle") {
      ctx.moveTo(centerX, y);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
    }

    if (shape.shapeType === "line") {
      ctx.moveTo(shape.start.x, shape.start.y);
      ctx.lineTo(shape.end.x, shape.end.y);
    }

    if (shape.shapeType !== "line" && shape.fillMode === "solid") {
      ctx.fill();
    }

    ctx.stroke();

    ctx.stroke();
    ctx.restore();
  }

  // Retrieve 2D rendering from canvas element
  function getCanvasContext() {
    return canvasRef.current.getContext("2d");
  }

  function ensureFillImage(fill) {
    if (!fill || !fill.snapshot) return null;
    if (fill.cachedImage) return fill.cachedImage;

    const image = new Image();
    image.onload = () => redrawBoard();
    image.src = fill.snapshot;
    fill.cachedImage = image;
    return image;
  }

  function getColorWithOpacity(hex, opacity) {
    return hexToRgba(hex, Number(opacity));
  }

  function createShape(startPoint, endPoint) {
    return {
      id: crypto.randomUUID(),
      type: "shape",
      shapeType,
      fillMode: shapeFillMode,
      opacity: Number(shapeOpacity),
      color,
      size,
      isShiftLocked: false,
      start: startPoint,
      end: endPoint,
      createdAt: Date.now()
    };
  }

  // Shift control for shapes
  function getShiftLockedShapeEnd(start, current) {
    const dx = current.x - start.x;
    const dy = current.y - start.y;

    if (shapeType === "rectangle" || shapeType === "circle") {
      const side = Math.min(Math.abs(dx), Math.abs(dy));

      return {
        x: start.x + Math.sign(dx || 1) * side,
        y: start.y + Math.sign(dy || 1) * side
      };
    }

    if (shapeType === "line") {
      const angle = Math.atan2(dy, dx);
      const snapStep = Math.PI / 4;
      const snappedAngle = Math.round(angle / snapStep) * snapStep;
      const length = Math.sqrt(dx * dx + dy * dy);

      return {
        x: start.x + Math.cos(snappedAngle) * length,
        y: start.y + Math.sin(snappedAngle) * length
      };
    }

    if (shapeType === "triangle") {
      const width = Math.abs(dx);
      const height = width * Math.sqrt(3) / 2;

      return {
        x: current.x,
        y: start.y + Math.sign(dy || 1) * height
      };
    }

    return current;
  }

  function createTextObject(point, text) {
    return {
      id: crypto.randomUUID(),
      type: "text",
      text,
      x: point.x,
      y: point.y,
      color,
      fontSize: size * 4,
      createdAt: Date.now()
    };
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

    for (const item of historyRef.current) {
      if (item.kind === "stroke") {
        drawFullStroke(ctx, item.value);
      }
      if (item.kind === "fill") {
        const fillImage = ensureFillImage(item.value);

        if (item.kind === "fill") {
          const fillImage = ensureFillImage(item.value);

          if (fillImage && fillImage.complete) {
            ctx.drawImage(fillImage, -camera.x / camera.zoom, -camera.y / camera.zoom);
          }
        }
      }
    }
    if (currentStrokeRef.current) {
      drawFullStroke(ctx, currentStrokeRef.current);
    }
    if (activeShapeRef.current) {
      drawShape(ctx, activeShapeRef.current);
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
    setCameraVersion(version => version + 1);
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
    if (!isPanningRef.current) return;
    const currentPoint = getScreenPosition(event);
    const lastPoint = lastPanPointRef.current;
    cameraRef.current.x += currentPoint.x - lastPoint.x;
    cameraRef.current.y += currentPoint.y - lastPoint.y;
    lastPanPointRef.current = currentPoint;

    redrawBoard();
    setCameraVersion(version => version + 1);
  }

  function getObjectBounds(object) {
    if (object.type === "shape") {
      const x = Math.min(object.start.x, object.end.x);
      const y = Math.min(object.start.y, object.end.y);
      const width = Math.abs(object.end.x - object.start.x);
      const height = Math.abs(object.end.y - object.start.y);
      return { x, y, width, height };
    }
    if (object.type === "text") {
      return { x: object.x, y: object.y, width: object.text.length * object.fontSize * 0.55,height: object.fontSize };
    }

    return null;
  }

  function isPointInsideObject(point, object) {
    const bounds = getObjectBounds(object);
    if (!bounds) return false;
    if (object.type === "shape" && object.shapeType === "circle") {
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      const radius = Math.max(bounds.width, bounds.height) / 2;
      const dx = point.x - centerX;
      const dy = point.y - centerY;
      return dx * dx + dy * dy <= radius * radius;
    }
    return ( point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height );
  }

  function getObjectAtPoint(point) {
    for (let i = objectsRef.current.length - 1; i >= 0; i--) {
      const object = objectsRef.current[i];
      if (isPointInsideObject(point, object)) {
        return object;
      }
    }
    return null;
  }

  function updateSelectedObject(updater) {
    if (!selectedObjectId) return false;
    const object = objectsRef.current.find(item => item.id === selectedObjectId);
    if (!object) return false;
    updater(object);
    redrawBoard();
    return true;
  }

  function drawSelectionOutline(ctx, object) {
    const bounds = getObjectBounds(object);
    if (!bounds) return;
    ctx.save();
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(bounds.x - 6, bounds.y - 6, bounds.width + 12, bounds.height + 12);
    ctx.restore();
  }

  function saveEquationInput(rawValue) {
    if (!equationInput || equationSaveLockRef.current) return;
    equationSaveLockRef.current = true;
    const latex = rawValue.trim();
    if (latex !== "") {
      const newEquation = {
        id: equationInput.id,
        x: equationInput.x,
        y: equationInput.y,
        latex,
        color: equationInput.color,
        fontSize: equationInput.fontSize
      };
      setEquations(previous => equationInput.editingExisting ? previous.map(item => item.id === equationInput.id ? newEquation : item ) : [...previous, newEquation] );
      setSelectedEquationId(newEquation.id);
      historyRef.current.push({ kind: "equation", value: newEquation });
      redoStackRef.current = [];
      if (equationInput.editingExisting) {
        getSocket()?.emit("equation:update", newEquation);
      } else {
        getSocket()?.emit("equation:create", newEquation);
      }
    }
    setEquationInput(null);
    requestAnimationFrame(() => { equationSaveLockRef.current = false; });
  }

  function editEquation(equation) {
    setEquationInput({
      id: equation.id,
      x: equation.x,
      y: equation.y,
      value: equation.latex,
      color: equation.color,
      fontSize: equation.fontSize,
      editingExisting: true
    });

    equationDraftRef.current = equation.latex;
    setSelectedEquationId(null);
  }

  // Begin drawing action regardless of tool input
  function startDrawing(event) {
    if (event.button === 2) {
      isPanningRef.current = true;
      lastPanPointRef.current = getScreenPosition(event);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (event.button !== undefined && event.button !== 0) { 
      return;
    }
    const point = getPointerPosition(event);
    const screenPoint = getScreenPosition(event);

    setSelectedEquationId(null);

    if (tool === "text") {
      const newTextBox = { id: crypto.randomUUID(), x: point.x, y: point.y, screenX: screenPoint.x, screenY: screenPoint.y, value: "", color, fontSize: textSize, fontFamily: textFont };
      setTextBoxes(previous => [...previous, newTextBox]);
      setSelectedTextBoxId(newTextBox.id);
      setSelectedObjectId(null);
      setStatus("Textbox created");
      historyRef.current.push({ kind: "textbox", value: newTextBox});
      redoStackRef.current = [];
      getSocket()?.emit("textbox:create", newTextBox);
      return;
    }

    if (tool === "equation") {
      equationDraftRef.current = "";
      setEquationInput({
        id: crypto.randomUUID(),
        x: point.x,
        y: point.y,
        value: "",
        color,
        fontSize: size * 4
      });
      setStatus("Typing equation. Press Escape or click away to place it.");
      return;
    }

    if (tool === "fill") {
      redrawBoard();
      requestAnimationFrame(() => { floodFill(screenPoint.x, screenPoint.y); });
      return;
    }

    if (tool === "shape") {
      isDrawingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      activeShapeRef.current = createShape(point, point);
      setSelectedObjectId(null);
      selectedObjectRef.current = null;
      redrawBoard();
      return;
    }
    const clickedObject = getObjectAtPoint(point);

    /* MOVE TOOL */
    if (tool === "move" && clickedObject) {
      setSelectedObjectId(clickedObject.id);
      selectedObjectRef.current = clickedObject;
      const bounds = getObjectBounds(clickedObject);
      dragOffsetRef.current = { x: point.x - bounds.x, y: point.y - bounds.y };
      event.currentTarget.setPointerCapture(event.pointerId);
      isPanningRef.current = false;
      isDrawingRef.current = false;
      return;
    }
    if (tool === "move" && !clickedObject) {
      setSelectedObjectId(null);
      setSelectedTextBoxId(null);
      setSelectedEquationId(null);
      setSelectedEquationId(null);
      selectedObjectRef.current = null;
      redrawBoard();
      return;
    }
    setSelectedObjectId(null);
    selectedObjectRef.current = null;
    isDrawingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const stroke = createStroke(point);
    currentStrokeRef.current = stroke;
    redrawBoard();
  }

  // Resize the textbox for better quality
  function resizeTextArea(textarea) {
    if (!textarea) return;
    const fontSize = parseFloat(window.getComputedStyle(textarea).fontSize);
    const lines = textarea.value.split("\n");
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.font = `${fontSize}px Arial`;
    const widestLine = Math.max( 1, ...lines.map(line => ctx.measureText(line || " ").width) );
    textarea.style.width = `${widestLine + 18}px`;
    textarea.style.height = `${lines.length * fontSize * 1.25 + 12}px`;
  }

  // Update drawing stroke / camera movement while cursor is moving
  function continueDrawing(event) {
    if (isPanningRef.current) {
      panCanvas(event);
      return;
    }
    const previewTools = ["pencil", "brush", "eraser"];
    if (previewTools.includes(tool)) {
      const screenPoint = getScreenPosition(event);
      setCursorPreview({ x: screenPoint.x, y: screenPoint.y, size: getToolSize() * cameraRef.current.zoom });
    }
    if (movingTextBoxIdRef.current && event.buttons === 1) {
      const point = getPointerPosition(event);
      setTextBoxes(previous => previous.map(textBox => textBox.id === movingTextBoxIdRef.current ? { ...textBox, x: point.x - textBoxDragOffsetRef.current.x, y: point.y - textBoxDragOffsetRef.current.y } : textBox ) );
      return;
    }
    if (movingEquationIdRef.current && event.buttons === 1) {
      const point = getPointerPosition(event);
      setEquations(previous => previous.map(equation => equation.id === movingEquationIdRef.current ? { ...equation, x: point.x - equationDragOffsetRef.current.x, y: point.y - equationDragOffsetRef.current.y } : equation ) )
      return;
    }
    if (selectedObjectRef.current && event.buttons === 1) {
      const point = getPointerPosition(event);
      const object = selectedObjectRef.current;
      if (object.type === "text") {
        object.x = point.x - dragOffsetRef.current.x;
        object.y = point.y - dragOffsetRef.current.y;
      }
      if (object.type === "shape") {
        const oldX = object.start.x;
        const oldY = object.start.y;
        const dx = point.x - dragOffsetRef.current.x - oldX;
        const dy = point.y - dragOffsetRef.current.y - oldY;
        object.start.x += dx;
        object.start.y += dy;
        object.end.x += dx;
        object.end.y += dy;
      }
      redrawBoard();
      return;
    }
    if (!isDrawingRef.current) {
      return;
    }
    if (tool === "shape" && activeShapeRef.current) {
      const currentPoint = getPointerPosition(event);

      activeShapeRef.current.end = event.shiftKey
        ? getShiftLockedShapeEnd(activeShapeRef.current.start, currentPoint)
        : currentPoint;

      activeShapeRef.current.isShiftLocked = event.shiftKey;

      redrawBoard();
      return;
    }
    if (!currentStrokeRef.current) {
      return;
    }
    const point = getPointerPosition(event);
    currentStrokeRef.current.points.push(point);
    redrawBoard();
  }

  // Renders the equation using katex
  function renderEquationPreview(latex) {
    const html = katex.renderToString(latex, { displayMode: true, throwOnError: false, errorColor: "#cc0000" });
    return ( <div dangerouslySetInnerHTML={{ __html: html }} /> );
  }

  // Determine what passes with the tolerance
  function colorsMatch(a, b, tolerance) {
    return (
      Math.abs(a[0] - b[0]) <= tolerance &&
      Math.abs(a[1] - b[1]) <= tolerance &&
      Math.abs(a[2] - b[2]) <= tolerance &&
      Math.abs(a[3] - b[3]) <= tolerance
    );
  }

  // Fills an area using the paint bucket
  function floodFill(screenX, screenY) {
    const canvas = canvasRef.current;
    const ctx = getCanvasContext();
    const pixelRatio = window.devicePixelRatio || 1;
    const x = Math.floor(screenX * pixelRatio);
    const y = Math.floor(screenY * pixelRatio);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const startIndex = (y * canvas.width + x) * 4;
    const targetColor = [ data[startIndex], data[startIndex + 1], data[startIndex + 2], data[startIndex + 3] ];
    const fillColor = hexToRgbArray(colorRef.current);
    const tolerance = Number(fillTolerance);
    if (colorsMatch(targetColor, fillColor, tolerance)) {
      return;
    }
    const stack = [[x, y]];
    const visited = new Uint8Array(canvas.width * canvas.height);
    while (stack.length > 0) {
      const [currentX, currentY] = stack.pop();
      if ( currentX < 0 || currentY < 0 || currentX >= canvas.width || currentY >= canvas.height ) {
        continue;
      }
      const pixelIndex = currentY * canvas.width + currentX;
      if (visited[pixelIndex]) {
        continue;
      };
      visited[pixelIndex] = 1;
      const index = pixelIndex * 4;
      const currentColor = [ data[index], data[index + 1], data[index + 2], data[index + 3] ];
      if (!colorsMatch(currentColor, targetColor, tolerance)) {
        continue;
      }
      data[index] = fillColor[0];
      data[index + 1] = fillColor[1];
      data[index + 2] = fillColor[2];
      data[index + 3] = fillColor[3];
      stack.push([currentX + 1, currentY]);
      stack.push([currentX - 1, currentY]);
      stack.push([currentX, currentY + 1]);
      stack.push([currentX, currentY - 1]);
    }
    ctx.putImageData(imageData, 0, 0);

    // Capture the canvas state as base64 AFTER the flood fill
    const camera = cameraRef.current;
    const snapshot = canvasRef.current.toDataURL("image/png");
    const newFill = {
      id: crypto.randomUUID(),
      snapshot,                        // base64 PNG — used for local replay
      snapshotCamera: { ...camera },   // camera state at time of fill
      color: colorRef.current,
      createdAt: Date.now()
    };
    // Pre-cache as an Image element for synchronous drawing in redrawBoard
    const cachedImage = new Image();
    cachedImage.onload = () => redrawBoard();
    cachedImage.src = snapshot;
    newFill.cachedImage = cachedImage;

    historyRef.current.push({ kind: "fill", value: newFill });
    redoStackRef.current = [];
    getSocket()?.emit("fill:create", {
      id: newFill.id,
      snapshot: newFill.snapshot,
      color: newFill.color,
      createdAt: newFill.createdAt
    });
    setStatus("Fill complete");
  }

  // Finishes current stroke / camera movement while cursor is movement
  /* THIS NEEDS TO BE UPDATED AT A LATER DATE -------------------------------------------------------------------------------------------------------------- */
  function stopDrawing() {
    selectedObjectRef.current = null;
    if (isPanningRef.current) {
      isPanningRef.current = false;
      setStatus("Move complete");
      return;
    }

    if (!isDrawingRef.current) return;

    if (tool === "shape" && activeShapeRef.current) {
      const finishedShape = activeShapeRef.current;
      const shapeStroke = {
        ...finishedShape,
        kind: "shape"
      };
      strokesRef.current.push(shapeStroke);
      historyRef.current.push({ kind: "stroke", value: shapeStroke });
      activeShapeRef.current = null;
      redoStackRef.current = [];
      isDrawingRef.current = false;
      redrawBoard();
      getSocket()?.emit("shape:create", finishedShape);
      setStatus(`${shapeType} placed`);
      return;
    }
    isDrawingRef.current = false;
    if (!currentStrokeRef.current) return;
    const finishedStroke = currentStrokeRef.current;
    strokesRef.current.push(finishedStroke);
    historyRef.current.push({ kind: "stroke", value: finishedStroke });
    redoStackRef.current = [];
    currentStrokeRef.current = null;
    setStrokeCount(strokesRef.current.length);
    getSocket()?.emit("stroke:create", finishedStroke);
    setStatus(`${strokesRef.current.length} stroke${strokesRef.current.length === 1 ? "" : "s"} on board`);
  }

  // Ctrl + Z
  /* THIS NEEDS TO BE UPDATED AT A LATER DATE -------------------------------------------------------------------------------------------------------------- */
  function undoStroke() {
    if (historyRef.current.length === 0) return;
    const item = historyRef.current.pop();
    redoStackRef.current.push(item);

    if (item.kind === "stroke") {
      strokesRef.current = strokesRef.current.filter(stroke => stroke.id !== item.value.id);
      setStrokeCount(strokesRef.current.length);
    }

    if (item.kind === "object") {
      objectsRef.current = objectsRef.current.filter(object => object.id !== item.value.id);
      setSelectedObjectId(null);
    }

    if (item.kind === "textbox") {
      setTextBoxes(previous => previous.filter(textBox => textBox.id !== item.value.id));
      setSelectedTextBoxId(null);
    }

    if (item.kind === "equation") {
      setEquations(previous => previous.filter(equation => equation.id !== item.value.id));
      setSelectedEquationId(null);
    }

    if (item.kind === "image") {
      setImages(previous => previous.filter(image => image.id !== item.value.id));
      setSelectedImageId(null);
    }

    if (item.kind === "fill") {
      if (item.value.restored) {
        // This is a server-restored fill — put it back, can't undo it
        historyRef.current.push(item);
        redoStackRef.current.pop(); // don't add to redo
        setStatus("Cannot undo a fill from a previous session");
        return;
      }
      // Session fill — already popped, redrawBoard handles it
    }

    redrawBoard();
    setStatus("Undo complete");
    if (item.kind === "stroke") {
      getSocket()?.emit("stroke:undo");
    }
  }

  // Ctrl + Y
  /* THIS NEEDS TO BE UPDATED AT A LATER DATE -------------------------------------------------------------------------------------------------------------- */
  function redoStroke() {
    if (redoStackRef.current.length === 0) return;

    const item = redoStackRef.current.pop();
    historyRef.current.push(item);

    if (item.kind === "stroke") {
      strokesRef.current.push(item.value);
      setStrokeCount(strokesRef.current.length);
    }
    if (item.kind === "object") {
      objectsRef.current.push(item.value);
    }
    if (item.kind === "textbox") {
      setTextBoxes(previous => [...previous, item.value]);
    }
    if (item.kind === "equation") {
      setEquations(previous => [...previous, item.value]);
    }
    if (item.kind === "image") {
      setImages(previous => [...previous, item.value]);
    }
    if (item.kind === "fill") {
      // fill is already pushed back to historyRef — redrawBoard replays correctly
    }
    redrawBoard();
    setStatus("Redo complete");
    // Future sync point:
      // socket.emit("stroke:undo");
  }

  // NUKE EVERYTHING
  /* THIS NEEDS TO BE UPDATED AT A LATER DATE -------------------------------------------------------------------------------------------------------------- */
  function clearBoard() {
    strokesRef.current = [];
    objectsRef.current = [];
    historyRef.current = [];
    redoStackRef.current = [];
    activeShapeRef.current = null;
    setTextBoxes([]);
    setEquations([]);
    setImages([]);
    redrawBoard();
    setStrokeCount(0);
    setStatus("Board cleared");
    getSocket()?.emit("board:clear");
  }

  // 
  function selectTool(nextTool) {
    setTool(nextTool);
    setSelectedImageId(null);
    setSelectedTextBoxId(null);
    setSelectedEquationId(null);
    setEquationInput(null);
    setStatus(`${nextTool.charAt(0).toUpperCase() + nextTool.slice(1)} selected`);
  }

  // Handle uploading images
  function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Src = e.target.result;

      const newImage = {
        id: crypto.randomUUID(),
        src: base64Src,
        x: 100,
        y: 100,
        width: 240,
        height: 160,
        createdAt: Date.now()
      };

      setImages(previous => [...previous, newImage]);
      historyRef.current.push({ kind: "image", value: newImage });
      redoStackRef.current = [];
      setSelectedImageId(newImage.id);
      setTool("move");
      setStatus("Image added");
      getSocket()?.emit("image:create", newImage);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  // Change colors
  function handleColorChange(event) {
    const nextColor = event.target.value;
    colorRef.current = nextColor;
    setColor(nextColor);

    if (tool === "move" && selectedTextBoxId) {
      setTextBoxes(previous =>
        previous.map(textBox =>
          textBox.id === selectedTextBoxId
            ? { ...textBox, color: nextColor }
            : textBox
        )
      );
      setStatus("Textbox color changed");
      return;
    }

    if (tool === "move" && selectedEquationId) {
      setEquations(previous =>
        previous.map(equation =>
          equation.id === selectedEquationId
            ? { ...equation, color: nextColor }
            : equation
        )
      );
      setStatus("Equation color changed");
      return;
    }

    setStatus("Color changed");
  }

  // Resize canvas to fit screen, adds resize listener for browser window resizing
  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => { window.removeEventListener("resize", resizeCanvas); };
  }, []);

  // Redraw whiteboard if grid size settings, background color, grid visibility, or selected objects change
  useEffect(() => {
    redrawBoard();
  }, [settings.canvasBackground, settings.gridEnabled, settings.gridSize, selectedObjectId]);

  useEffect(() => {
    if (!equationInput) return;

    requestAnimationFrame(() => {
      equationInputRef.current?.focus();
      equationInputRef.current?.select();
    });
  }, [equationInput?.id]);

  // Join the socket room when the whiteboard loads
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit("room:join", settings.roomName);

    // Load existing board state from server when joining
    socket.on("board:state", ({ strokes, shapes, textBoxes, equations, images, fills }) => {
      const safeStrokes   = strokes    || [];
      const safeShapes    = shapes     || [];
      const safeTextBoxes = textBoxes  || [];
      const safeEquations = equations  || [];
      const safeImages    = images     || [];
      // Deduplicate fills by id in case of duplicate saves
      const seenFillIds = new Set();
      const safeFills = (fills || []).filter(f => {
        if (seenFillIds.has(f.id)) return false;
        seenFillIds.add(f.id);
        return true;
      });

      strokesRef.current = safeStrokes;
      redoStackRef.current = [];

      // Rebuild history sorted by createdAt so elements render in the correct order
      const allItems = [
        ...safeStrokes.map(s => ({ kind: "stroke",   value: s,                                              t: s.createdAt || 0 })),
        ...safeShapes.map(s  => ({ kind: "stroke",   value: { ...s, kind: "shape" },                       t: s.createdAt || 0 })),
        ...safeTextBoxes.map(t => ({ kind: "textbox", value: t,                                             t: t.createdAt || 0 })),
        ...safeEquations.map(e => ({ kind: "equation", value: e,                                            t: e.createdAt || 0 })),
        ...safeImages.map(i  => ({ kind: "image",    value: i,                                              t: i.createdAt || 0 })),
        ...safeFills
          .filter(f => f.snapshot)
          .map(f => ({ kind: "fill", value: { ...f, restored: true }, t: f.createdAt || 0 })),
      ];
      allItems.sort((a, b) => a.t - b.t);
      historyRef.current = allItems.map(({ kind, value }) => ({ kind, value }));

      // Restored fills are in history but marked so undo skips them
      // They render correctly but can't be undone (no pixel data available)

      objectsRef.current = safeShapes.map(s => ({ ...s, kind: "shape" }));

      setTextBoxes(safeTextBoxes);
      setEquations(safeEquations);
      setImages(safeImages);
      setStrokeCount(safeStrokes.length);
      requestAnimationFrame(() => redrawBoard());
    });

    // Receive strokes from other users
    socket.on("stroke:create", (stroke) => {
      strokesRef.current.push(stroke);
      historyRef.current.push({ kind: "stroke", value: stroke });
      setStrokeCount(strokesRef.current.length);
      redrawBoard();
    });

    // Receive shapes from other users
    socket.on("shape:create", (shape) => {
      const shapeStroke = { ...shape, kind: "shape" };
      strokesRef.current.push(shapeStroke);
      historyRef.current.push({ kind: "stroke", value: shapeStroke });
      redrawBoard();
    });

    // Receive textboxes from other users
    socket.on("textbox:create", (textBox) => {
      setTextBoxes(prev => [...prev, textBox]);
      historyRef.current.push({ kind: "textbox", value: textBox });
    });

    // Receive textbox updates from other users
    socket.on("textbox:update", (textBox) => {
      setTextBoxes(prev => prev.map(t => t.id === textBox.id ? textBox : t));
    });

    // Receive equations from other users
    socket.on("equation:create", (equation) => {
      setEquations(prev => [...prev, equation]);
      historyRef.current.push({ kind: "equation", value: equation });
    });

    // Receive equation updates from other users
    socket.on("equation:update", (equation) => {
      setEquations(prev => prev.map(e => e.id === equation.id ? equation : e));
    });

    // Receive fills from other users. Only replay fills that include a saved snapshot.
    socket.on("fill:create", (fill) => {
      if (!fill?.snapshot) return;
      historyRef.current.push({ kind: "fill", value: fill });
      redrawBoard();
    });

    // Receive images from other users
    socket.on("image:create", (image) => {
      setImages(prev => [...prev, image]);
      historyRef.current.push({ kind: "image", value: image });
    });

    // Receive image updates from other users
    socket.on("image:update", (image) => {
      setImages(prev => prev.map(i => i.id === image.id ? image : i));
    });

    // Board was cleared by someone
    socket.on("board:cleared", () => {
      strokesRef.current = [];
      objectsRef.current = [];
      historyRef.current = [];
      redoStackRef.current = [];
      setTextBoxes([]);
      setEquations([]);
      setImages([]);
      setStrokeCount(0);
      redrawBoard();
      setStatus("Board cleared by another user");
    });

    return () => {
      socket.off("board:state");
      socket.off("stroke:create");
      socket.off("shape:create");
      socket.off("textbox:create");
      socket.off("textbox:update");
      socket.off("equation:create");
      socket.off("equation:update");
      socket.off("fill:create");
      socket.off("image:create");
      socket.off("image:update");
      socket.off("board:cleared");
    };
  }, [settings.roomName]);

  // Register keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event) {
      const targetTag = event.target.tagName.toLowerCase();
      const isTyping =
        targetTag === "input" ||
        targetTag === "textarea" ||
        targetTag === "select";

      const key = event.key.toLowerCase();

      if ((key === "delete" || key === "backspace") && tool === "move") {
        // Delete selected textbox
        if (selectedTextBoxId) {
          setTextBoxes(previous =>
            previous.filter(textBox => textBox.id !== selectedTextBoxId)
          );
          setSelectedTextBoxId(null);
          setStatus("Textbox deleted");
          return;
        }

        // Delete selected equation
        if (selectedEquationId) {
          setEquations(previous =>
            previous.filter(equation => equation.id !== selectedEquationId)
          );
          setSelectedEquationId(null);
          setStatus("Equation deleted");
          return;
        }

        if (selectedImageId) {
          setImages(previous =>
            previous.filter(image => image.id !== selectedImageId)
          );
          setSelectedImageId(null);
          setStatus("Image deleted");
          return;
        }
      }

      if (isTyping) {
        return;
      }

      if (equationInput) {
        return;
      }

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
      if (key === "m") selectTool("move");
      if (key === "e") selectTool("eraser");
      if (key === "b") selectTool("brush");
      if (key === "p") selectTool("pencil");
      if (key === "t") selectTool("text");
      if (key === "s") selectTool("shape");
      if (key === "f") selectTool("fill");
      if (key === "escape") {
        setSelectedObjectId(null);
        setSelectedTextBoxId(null);
        selectedObjectRef.current = null;
        setStatus("Selection cleared");
        redrawBoard();
        return;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [tool, color, size, settings, selectedTextBoxId, selectedEquationId, selectedImageId, equationInput]);

  return (
    <main className="app">
      <header className="top-header">
        <Link to="/lobby" className="brand" style={{ color: "#ffffff", textDecoration: "none" }}>Whiteboard</Link>

        <nav className="toolbar" aria-label="Whiteboard tools">
          
          <button
          className={`tool-button image-tool-button ${tool === "move" ? "active" : ""}`}
          type="button"
          onClick={() => selectTool("move")}
          title="Move (M)"
          aria-label="Move">
          <img src="/assets/move.png" alt="" />
          <span>Move</span>
          </button>

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

          {tool === "brush" && (
            <label className="control-group">
              Hardness
              <input
                type="range"
                min="10"
                max="100"
                value={brushHardness}
                onChange={event => setBrushHardness(Number(event.target.value))}
              />
              <span className="size-value">{brushHardness}%</span>
            </label>
          )}
          <button
            className={`tool-button image-tool-button ${tool === "eraser" ? "active" : ""}`}
            type="button"
            onClick={() => selectTool("eraser")}
            title="Eraser (E)"
            aria-label="Eraser">
            <img src="/assets/eraser.png" alt="" />
            <span>Eraser</span>
          </button>

          <button
            className={`tool-button image-tool-button ${tool === "text" ? "active" : ""}`}
            type="button"
            onClick={() => selectTool("text")}
            title="Text (T)"
            aria-label="Text">
            <img src="/assets/text.png" alt="" />
            <span>Text</span>
          </button>

          <button
            className={`tool-button image-tool-button ${tool === "equation" ? "active" : ""}`}
            type="button"
            onClick={() => selectTool("equation")}
            title="Equation"
            aria-label="Equation">
            <img src="/assets/sigma.png" alt="" />
            <span>Equation</span>
          </button>

          <button
            className={`tool-button image-tool-button ${tool === "shape" ? "active" : ""}`}
            type="button"
            onClick={() => selectTool("shape")}
            title="Shape (S)"
            aria-label="Shape">
            <img src="/assets/shape.png" alt="" />
            <span>Shape</span>
          </button>
          {tool === "shape" && (
            <div className="tool-options-group">
              <select value={shapeType} onChange={event => setShapeType(event.target.value)}>
                <option value="rectangle">▭ Rectangle</option>
                <option value="circle">◯ Ellipse / Circle</option>
                <option value="triangle">△ Triangle</option>
                <option value="line">╱ Line</option>
              </select>
              <select value={shapeFillMode} onChange={event => setShapeFillMode(event.target.value)}>
                <option value="hollow">Hollow</option>
                <option value="solid">Solid</option>
              </select>
              <select value={shapeOpacity} onChange={event => setShapeOpacity(event.target.value)}>
                  <option value="1">100%</option>
                <option value="0.75">75%</option>
                <option value="0.5">50%</option>
                <option value="0.25">25%</option>
              </select>
            </div>
          )}

          <button
            className={`tool-button image-tool-button ${tool === "fill" ? "active" : ""}`}
            type="button"
            onClick={() => selectTool("fill")}
            title="Fill (F)"
            aria-label="Fill">
            <img src="/assets/fill.png" alt="" />
            <span>Fill</span>
          </button>
          {tool === "fill" && (
            <label className="control-group">
              Tolerance
              <input
                type="range"
                min="0"
                max="100"
                value={fillTolerance}
                onChange={event => setFillTolerance(Number(event.target.value))}/>
              <span className="size-value">{fillTolerance}%</span>
            </label>
          )}

          <button
            className="tool-button image-tool-button"
            type="button"
            onClick={() => imageInputRef.current.click()}
            title="Add Image"
            aria-label="Add Image"
          >
            <img src="/assets/image.png" alt="" />
            <span>Image</span>
          </button>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />

          <button
            className="tool-button image-tool-button"
            type="button"
            onClick={undoStroke}
            title="Undo (Ctrl + Z)"
            aria-label="Undo">
            <img src="/assets/undo.png" alt="" />
            <span>Undo</span>
          </button>

          <button
            className="tool-button image-tool-button"
            type="button"
            onClick={redoStroke}
            title="Redo (Ctrl + Y)"
            aria-label="Redo">
            <img src="/assets/redo.png" alt="" />
            <span>Redo</span>
          </button>

          <button className="tool-button danger" type="button" onClick={clearBoard}>
            Clear
          </button>

          <div className="toolbar-right-controls">
            <label className="control-group">
              Color
              <button
                type="button"
                className="color-preview-button"
                style={{ backgroundColor: color }}
                onClick={() => {
                  if (isColorPickerOpen) {
                    colorInputRef.current.blur();
                    setIsColorPickerOpen(false);
                    return;
                  }
                  setIsColorPickerOpen(true);
                  colorInputRef.current.click();
                }}
              />
              <input
                ref={colorInputRef}
                type="color"
                value={color}
                className="hidden-color-input"
                onChange={handleColorChange}
                onBlur={() => setIsColorPickerOpen(false)}
              />
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
          </div>
        </nav>

        <button
          className="tool-button"
          type="button"
          onClick={() => setIsInviteOpen(true)}>
          Invite
        </button>

        <button
          className="settings-button"
          type="button"
          aria-label="Open settings"
          onClick={() => setIsSettingsOpen(true)}>
          ⚙
        </button>

        <div className="account-menu-wrapper">
          <button
            className="account-button"
            type="button"
            aria-label="Open account menu"
            onClick={() => setIsAccountMenuOpen(previous => !previous)}>
            <img src="/assets/account.png" alt="" />
          </button>
          {isAccountMenuOpen && (
            <div className="account-dropdown">
              <Link to="/whiteboard" className="account-dropdown-link">
                My Account
              </Link>
              <button
                className="account-dropdown-link"
                onClick={() => { logout(); navigate("/"); }}
              >
                Sign Out
            </button>
            </div>
          )}
        </div>
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

        {cursorPreview && ["pencil", "brush", "eraser"].includes(tool) && (
          <div
            className="cursor-size-preview"
            style={{
              left: `${cursorPreview.x}px`,
              top: `${cursorPreview.y}px`,
              width: `${cursorPreview.size}px`,
              height: `${cursorPreview.size}px`
            }}
          />
        )}

        <div
          className="overlay-layer"
          style={{
            transform: `translate(${cameraRef.current.x}px, ${cameraRef.current.y}px) scale(${cameraRef.current.zoom})`
          }}
        >
          {images.map(image => (
            <div
            key={image.id}
            className={`whiteboard-image-wrapper ${
              selectedImageId === image.id ? "selected" : ""
            } ${tool === "move" ? "image-move-enabled" : "image-move-disabled"}`}
            style={{
              left: `${image.x}px`,
              top: `${image.y}px`,
              width: `${image.width}px`,
              height: `${image.height}px`
            }}
            onPointerDown={event => {
              event.stopPropagation();

              setSelectedImageId(image.id);
              setSelectedTextBoxId(null);
              setSelectedEquationId(null);

              if (tool === "move") {
                const point = getPointerPosition(event);

                movingImageIdRef.current = image.id;

                imageDragOffsetRef.current = {
                  x: point.x - image.x,
                  y: point.y - image.y
                };

                event.currentTarget.setPointerCapture(event.pointerId);
              }
            }}
            onPointerMove={event => {
              if (!movingImageIdRef.current || tool !== "move") return;

              const point = getPointerPosition(event);

              setImages(previous =>
                previous.map(item =>
                  item.id === movingImageIdRef.current
                    ? {
                        ...item,
                        x: point.x - imageDragOffsetRef.current.x,
                        y: point.y - imageDragOffsetRef.current.y
                      }
                    : item
                )
              );
            }}
            onPointerUp={() => {
              if (movingImageIdRef.current) {
                const moved = images.find(i => i.id === movingImageIdRef.current);
                if (moved) getSocket()?.emit("image:update", moved);
              }
              movingImageIdRef.current = null;
            }}
            onPointerCancel={() => {
              movingImageIdRef.current = null;
            }}
          >
              <img
                src={image.src}
                className="whiteboard-image"
                draggable={false}
              />

              {selectedImageId === image.id && tool === "move" && (
                <div
                  className="image-resize-handle"
                  onPointerDown={event => {
                    event.stopPropagation();
                    resizingImageIdRef.current = image.id;
                    imageResizeStartRef.current = {
                      startX: event.clientX,
                      startY: event.clientY,
                      width: image.width,
                      height: image.height
                    };
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={event => {
                    if (resizingImageIdRef.current !== image.id) return;

                    const start = imageResizeStartRef.current;
                    const dx = (event.clientX - start.startX) / cameraRef.current.zoom;
                    const dy = (event.clientY - start.startY) / cameraRef.current.zoom;

                    setImages(previous =>
                      previous.map(item =>
                        item.id === image.id
                          ? {
                              ...item,
                              width: Math.max(40, start.width + dx),
                              height: Math.max(40, start.height + dy)
                            }
                          : item
                      )
                    );
                  }}
                  onPointerUp={() => {
                    if (resizingImageIdRef.current) {
                      const resized = images.find(i => i.id === resizingImageIdRef.current);
                      if (resized) getSocket()?.emit("image:update", resized);
                    }
                    resizingImageIdRef.current = null;
                    imageResizeStartRef.current = null;
                  }}
                />
              )}
            </div>
          ))}

          {textBoxes.map(textBox => {
          cameraVersion;
          const isSelected = selectedTextBoxId === textBox.id;
          return (
            <textarea
              key={textBox.id}
              className={`permanent-textbox ${isSelected ? "selected" : ""} ${tool === "move" ? "move-mode" : ""}`}
              style={{
                left: `${textBox.x}px`,
                top: `${textBox.y}px`,
                color: textBox.color,
                fontSize: `${textBox.fontSize}px`,
                fontFamily: textBox.fontFamily
              }}
              value={textBox.value}
              readOnly={tool === "move"}
              ref={textarea => {
                if (textarea && isSelected) {
                  requestAnimationFrame(() => {
                    textarea.focus();
                    resizeTextArea(textarea);
                  });
                }
              }}
              onPointerDown={event => {
                event.stopPropagation();
                setSelectedTextBoxId(textBox.id);
                setSelectedObjectId(null);
                if (tool === "move") {
                  const point = getPointerPosition(event);
                  movingTextBoxIdRef.current = textBox.id;
                  textBoxDragOffsetRef.current = {
                    x: point.x - textBox.x,
                    y: point.y - textBox.y
                  };
                  event.currentTarget.setPointerCapture(event.pointerId);
                }
              }}
              onPointerMove={event => {
                if (!movingTextBoxIdRef.current || tool !== "move") 
                {
                  return;
                }
                const point = screenToWorld({
                  x: event.clientX - canvasRef.current.getBoundingClientRect().left,
                  y: event.clientY - canvasRef.current.getBoundingClientRect().top
                });
                setTextBoxes(previous => previous.map(textBox => textBox.id === movingTextBoxIdRef.current ? {...textBox, x: point.x - textBoxDragOffsetRef.current.x, y: point.y - textBoxDragOffsetRef.current.y} : textBox ) );
              }}
              onPointerUp={() => { movingTextBoxIdRef.current = null; }}
              onPointerCancel={() => { movingTextBoxIdRef.current = null; }}
              onChange={event => {
                const textarea = event.target;
                const nextValue = textarea.value;
                setTextBoxes(previous => previous.map(item => item.id === textBox.id ? { ...item, value: nextValue } : item));
                resizeTextArea(textarea);
                const updated = { ...textBox, value: nextValue };
                getSocket()?.emit("textbox:update", updated);
              }}
              onKeyDown={event => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.currentTarget.blur();
                  setSelectedTextBoxId(null);
                }
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.blur();
                  setSelectedTextBoxId(null);
                }
              }}
              onBlur={() => {
                const isEmpty = textBox.value.trim() === "";
                if (isEmpty) {
                  setTextBoxes(previous => previous.filter(item => item.id !== textBox.id));
                  if (selectedTextBoxId === textBox.id) {
                    setSelectedTextBoxId(null);
                  }
                }
              }}
            />
          );
        })}

          {equations.map(equation => {
          cameraVersion;

          return (
            <div
              key={equation.id}
              className={`equation-box ${
                selectedEquationId === equation.id ? "selected" : ""
              } ${tool === "move" ? "move-mode" : ""}`}
              style={{
                left: `${equation.x}px`,
                top: `${equation.y}px`,
                color: equation.color,
                fontSize: `${equation.fontSize}px`
              }}
              onPointerDown={event => {
                event.stopPropagation();

                setSelectedEquationId(equation.id);
                setSelectedTextBoxId(null);
                setSelectedObjectId(null);

                if (tool === "move") {
                  const point = getPointerPosition(event);

                  movingEquationIdRef.current = equation.id;

                  equationDragOffsetRef.current = {
                    x: point.x - equation.x,
                    y: point.y - equation.y
                  };

                  event.currentTarget.setPointerCapture(event.pointerId);
                }
              }}
              onDoubleClick={event => {
                event.stopPropagation();
                editEquation(equation);
              }}
              onPointerMove={event => {
                if (!movingEquationIdRef.current || tool !== "move") {
                  return;
                }
                const point = screenToWorld({
                  x: event.clientX - canvasRef.current.getBoundingClientRect().left,
                  y: event.clientY - canvasRef.current.getBoundingClientRect().top
                });
                setEquations(previous =>
                  previous.map(equation =>
                    equation.id === movingEquationIdRef.current
                      ? {
                          ...equation,
                          x: point.x - equationDragOffsetRef.current.x,
                          y: point.y - equationDragOffsetRef.current.y
                        }
                      : equation
                  )
                );
              }}
              onPointerUp={() => {
                movingEquationIdRef.current = null;
                setSelectedEquationId(equation.id);
              }}
              onPointerCancel={() => {
                movingEquationIdRef.current = null;
              }}
              
            >
              {renderEquationPreview(equation.latex)}
            </div>
          );
        })}

        {equationInput && (
          <div
            className="equation-input-box"
            style={{
              left: `${equationInput.x}px`,
              top: `${equationInput.y}px`
            }}
            onPointerDown={event => event.stopPropagation()}
          >
            <input
              ref={equationInputRef}
              className="equation-live-input"
              value={equationInput.value}
              placeholder="Type LaTeX, e.g. x^2 + y^2 = r^2"
              onMouseDown={event => {
                event.stopPropagation();
              }}
              onPointerDown={event => {
                event.stopPropagation();
              }}
              onClick={event => {
                event.stopPropagation();
                event.currentTarget.focus();
              }}
              onChange={event => {
                const nextValue = event.target.value;
                equationDraftRef.current = nextValue;

                setEquationInput(previous => ({
                  ...previous,
                  value: nextValue
                }));
              }}
              onKeyDown={event => {
                event.stopPropagation();

                if (event.key === "Enter") {
                  event.preventDefault();
                  saveEquationInput(equationInputRef.current.value);
                  setSelectedEquationId(null);
                }

                if (event.key === "Escape") {
                  event.preventDefault();

                  setSelectedEquationId(null);
                  setEquationInput(null);
                }
              }}
              onBlur={undefined}
            />

            <button
              type="button"
              className="equation-save-button"
              onMouseDown={event => event.preventDefault()}
              onClick={() => {
                saveEquationInput(equationInputRef.current.value);
                setSelectedEquationId(null);
              }}
            >
              Save Equation
            </button>

            <div className="equation-preview">
              {equationInput.value.trim() ? (
                <div className="equation-preview-content">
                  {renderEquationPreview(equationInput.value)}
                </div>
              ) : (
                <span className="equation-placeholder">
                  Preview appears here
                </span>
              )}
            </div>
          </div>
        )}
        </div>

        {settings.showStatus && ( <div className="status"> {status} · {strokeCount} total </div> )}
      </section>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingChange={handleSettingChange}
        onClearWhiteboard={() => { clearBoard(); setIsSettingsOpen(false); }}
      />

      {isInviteOpen && (
        <InviteModal
          roomName={settings.roomName}
          onClose={() => setIsInviteOpen(false)}
        />
      )}
    </main>
  );
}

export default WhiteboardPage;
