import './App.css';
import { useCallback, useState, useRef, useEffect } from 'react';

const defaultScale = 1.0
const scaleMultiplier = 0.8;
const width = 500
const height = 500
const numberOfElements = 25000
const colors = [
  "blue",
  "green",
  "black",
  "gray",
  "cyan",
]



function debounce(func, timeout = 100) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

const getRandomColor = () => {
  return colors[Math.floor(Math.random() * colors.length)]
}

function guidGenerator() {
  var S4 = function() {
     return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  };
  return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}

const getRandomUpTo = (to) => {
  return Math.floor(Math.random() * to)
}

const generateItem = (width, height) => {
  return {
    color: getRandomColor(),
    fn: 'arc',
    fnArgs: [getRandomUpTo(width), getRandomUpTo(height), getRandomUpTo(20), 0, 2 * Math.PI],
    id: guidGenerator(),
  }
}

const initialItems = new Array(numberOfElements).fill(0).map(() => generateItem(width, height))

const Canvas = () => {
  const divRef = useRef(null)
  const canvasRef = useRef(null)

  // Vars
  const [elementsToDraw, setElementsToDraw] = useState(numberOfElements)
  const [mouseDown, setMouseDown] = useState(false)

  // Info
  const [lastClicked, setLastClicked] = useState(null)
  const [drawTime, setDrawTime] = useState(0)
  const [resizeDrawTime, setResizeDrawTime] = useState(0)

  const [drawProps, setDrawProps] = useState({
    scaleCanvas: defaultScale,
    translatePos: { x: 0, y: 0 },
    startDragOffset: {},
    items: initialItems,
    currentCoords: null,
  })

  const { scaleCanvas, translatePos, startDragOffset, items, currentCoords } = drawProps

  const widthCanvas = canvasRef?.current?.width || width
  const heightCanvas = canvasRef?.current?.height || height

  const drawRandom = useCallback(() => {
    const toDraw = [];
    for (let i = 0; i < elementsToDraw; i++) {
      toDraw.push(generateItem(widthCanvas, heightCanvas))
    }

    setDrawProps({
      ...drawProps,
      scaleCanvas: 1.0,
      translatePos: { x: 0, y: 0 },
      startDragOffset: {},
      items: toDraw
    })
  }, [drawProps, elementsToDraw, heightCanvas, widthCanvas])

  const onClickCanvas = useCallback((e) => {
    const x = e.screenX
    const y = e.screenY
    setLastClicked({ x, y })
  }, [])

  const onMouseMoveCanvas = useCallback((e) => {
    const x = e.clientX
    const y = e.clientY

    const toChange = {
      currentCoords: { x, y }
    }

    if (mouseDown) {
      toChange.translatePos = {
        x: x - startDragOffset?.x ?? 0,
        y: y - startDragOffset?.y ?? 0
      }
    }
    setDrawProps({
      ...drawProps,
      ...toChange,
    })
  }, [drawProps, mouseDown, startDragOffset?.x, startDragOffset?.y])

  const onMouseDown = useCallback((e) => {
    setDrawProps({
      ...drawProps,
      startDragOffset: {
        x: e.clientX - translatePos.x,
        y: e.clientY - translatePos.y
      }
    })
    setMouseDown(true)
  }, [drawProps, translatePos.x, translatePos.y])

  const onMouseUp = useCallback((e) => {
    setMouseDown(false)
  }, [])

  const onPlus = useCallback(() => {
    setDrawProps({
      ...drawProps,
      scaleCanvas: scaleCanvas / scaleMultiplier
    })
  }, [drawProps, scaleCanvas])

  const onMinus = useCallback(() => {
    setDrawProps({
      ...drawProps,
      scaleCanvas: scaleCanvas * scaleMultiplier
    })
  }, [drawProps, scaleCanvas])

  const onWheel = useCallback((e) => {
    e.deltaY > 0 ? onMinus() : onPlus()
  }, [onMinus, onPlus])

  useEffect(() => {
    const node = divRef.current

    const onResize = debounce(() => {
      const t1 = performance.now()

      const ctx = canvasRef.current.getContext('2d')
      const snapshot = canvasRef.current.toDataURL()

      ctx.canvas.width = node.clientWidth;
      ctx.canvas.height = node.clientHeight;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      (() => {
        var img = new Image();
        img.src = snapshot;
        img.onload = function () {
          ctx.drawImage(img, 0, 0);
        };
      })()

      const t2 = performance.now()
      setResizeDrawTime(t2 - t1)
    })

    const observer = new ResizeObserver(onResize)
    observer.observe(node)

    return () => node && observer.unobserve(node)
  }, [])

  useEffect(() => {
    const t1 = performance.now()

    const ctx = canvasRef.current.getContext("2d");

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    ctx.save()

    ctx.translate(translatePos.x, translatePos.y);
    ctx.scale(scaleCanvas, scaleCanvas);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      ctx.beginPath();
      ctx.fillStyle = item.color;
      ctx[item.fn](...item.fnArgs)
      ctx.fill();
    }

    const t2 = performance.now()
    setDrawTime(t2 - t1)

    ctx.restore();
  }, [items, scaleCanvas, translatePos])

  return <div>
    <div style={{ margin: '10px auto', display: 'flex', justifyContent: 'center', flexDirection: 'column', width: '500px' }}>
      Elements: <input type="number" value={elementsToDraw} onChange={(e) => setElementsToDraw(e.target.value)} />
      <button onClick={drawRandom}>Draw random items</button>
      <div>
        <div>
          Width: {widthCanvas}{" "}
          Height: {heightCanvas}{" "}
        </div>
        <hr />
        <div>
          Scale: {scaleCanvas}{" "}
          Scale multiplier: {scaleMultiplier}
        </div>
        <hr />
        <div>
          Number of pixels: {widthCanvas * heightCanvas}
        </div>
        <hr />
        <div>
          Draw time: {(drawTime).toFixed(2)} ms{" "}
          {drawTime ?
            (<span>{Math.floor((1000 / drawTime) * items.length)} draws/second</span>)
            : null
          }
        </div>
        <div>
          Resize Draw time: {(resizeDrawTime).toFixed(2)} ms{" "}
        </div>
        <hr />
        <div>
          Last clicked: {lastClicked ? `x: ${lastClicked.x} y: ${lastClicked.y}` : "None"}{" "}
          <hr />
          Last Move: x: {currentCoords?.x} y: {currentCoords?.y}
        </div>
      </div>
      <hr />
      <div>
        <button onClick={onPlus}>+ ZOOM IN</button>
        <button onClick={onMinus}>- ZOOM OUT</button>
      </div>
      <hr />
      Memory used: {(window.performance.memory.usedJSHeapSize / 8 / 1024 / 1024).toFixed(2)} MB
    </div>
    <div ref={divRef} style={{ margin: '0 auto', border: '1px solid gray', width: widthCanvas, height: heightCanvas, resize: "both", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ cursor: "grab" }} width={width} height={height} onClick={onClickCanvas} onMouseMove={onMouseMoveCanvas} onMouseDown={onMouseDown} onMouseUp={onMouseUp} onWheel={onWheel} />
    </div>
  </div>
}

function App() {
  return (
    <Canvas />
  );
}

export default App;
