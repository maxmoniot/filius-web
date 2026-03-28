/* ============================================
   FILIUS WEB - CANVAS
   Zone de travail principale avec les appareils et connexions
   Supporte zoom (molette) et pan (clic-drag)
   (Mode unifié : édition et simulation simultanées)
   ============================================ */

const Canvas = React.forwardRef(function Canvas({
    devices,
    connections,
    packets,
    selectedDevice,
    setSelectedDevice,
    selectedDevices,
    setSelectedDevices,
    selectedAnnotations,
    setSelectedAnnotations,
    selectedConnection,
    setSelectedConnection,
    connecting,
    wireMode,
    setWireMode,
    selectedInterface,
    scale,
    setScale,
    offset,
    setOffset,
    annotations,
    setAnnotations,
    textMode,
    setTextMode,
    rectMode,
    setRectMode,
    selectedAnnotation,
    setSelectedAnnotation,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onStartConnection,
    onCompleteConnection,
    onContextMenu,
    onOpenApp,
    onDropDevice,
    onAnnotationMultiDrag
}, ref) {
    const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });
    
    // État pour le pan
    const [isPanning, setIsPanning] = React.useState(false);
    const [panStart, setPanStart] = React.useState({ x: 0, y: 0 });
    const [panButton, setPanButton] = React.useState(null);
    
    // État pour le dessin de rectangle
    const [drawingRect, setDrawingRect] = React.useState(null);
    
    // État pour le dragging d'annotations
    const [draggingAnnotation, setDraggingAnnotation] = React.useState(null);
    
    // État pour le redimensionnement des rectangles
    const [resizingRect, setResizingRect] = React.useState(null);
    
    // État pour la sélection multiple (Ctrl+drag)
    const [selectionRect, setSelectionRect] = React.useState(null);
    const justFinishedSelection = React.useRef(false);

    // Référence au conteneur interne
    const innerRef = React.useRef(null);

    // Récupère les modems avec IP publique (= sur Internet)
    const activeModems = devices.filter(d => d.type === 'MODEM' && d.publicIP);

    // Génère les connexions virtuelles entre modems sur Internet
    const modemConnections = React.useMemo(() => {
        const conns = [];
        for (let i = 0; i < activeModems.length; i++) {
            for (let j = i + 1; j < activeModems.length; j++) {
                conns.push({
                    id: `modem-${activeModems[i].id}-${activeModems[j].id}`,
                    from: activeModems[i].id,
                    to: activeModems[j].id,
                    isVirtual: true
                });
            }
        }
        return conns;
    }, [activeModems]);

    // Détermine les connexions associées à chaque interface du routeur
    const getRouterInterfaceConnections = React.useCallback((routerId) => {
        const routerConns = connections.filter(c => c.from === routerId || c.to === routerId);
        return routerConns;
    }, [connections]);

    // Vérifie si une connexion est liée à l'interface sélectionnée
    const isConnectionHighlighted = React.useCallback((conn) => {
        if (!selectedInterface) return false;
        
        const { deviceId, interfaceIndex } = selectedInterface;
        const device = devices.find(d => d.id === deviceId);
        
        if (!device || device.type !== 'ROUTER') return false;
        
        const routerConns = getRouterInterfaceConnections(deviceId);
        const connIndex = routerConns.findIndex(c => c.id === conn.id);
        
        return connIndex === interfaceIndex;
    }, [selectedInterface, devices, getRouterInterfaceConnections]);

    // Obtient la position d'un appareil par son ID
    const getDevicePosition = React.useCallback((id) => {
        const device = devices.find(d => d.id === id);
        return device ? { x: device.x, y: device.y } : { x: 0, y: 0 };
    }, [devices]);

    // Convertit les coordonnées écran en coordonnées canvas
    const screenToCanvas = React.useCallback((screenX, screenY) => {
        if (!ref.current) return { x: screenX, y: screenY };
        const rect = ref.current.getBoundingClientRect();
        return {
            x: (screenX - rect.left - offset.x) / scale,
            y: (screenY - rect.top - offset.y) / scale
        };
    }, [scale, offset, ref]);

    // Gère le zoom avec la molette
    const handleWheel = React.useCallback((e) => {
        e.preventDefault();
        
        const rect = ref.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.min(Math.max(scale * delta, 0.25), 3);
        
        const scaleChange = newScale / scale;
        const newOffsetX = mouseX - (mouseX - offset.x) * scaleChange;
        const newOffsetY = mouseY - (mouseY - offset.y) * scaleChange;
        
        setScale(newScale);
        setOffset({ x: newOffsetX, y: newOffsetY });
    }, [scale, offset, ref]);

    // Gère le mouvement de la souris
    const handleMouseMoveCanvas = React.useCallback((e) => {
        // Pan en cours
        if (isPanning) {
            const dx = e.clientX - panStart.x;
            const dy = e.clientY - panStart.y;
            setOffset(prev => ({
                x: prev.x + dx,
                y: prev.y + dy
            }));
            setPanStart({ x: e.clientX, y: e.clientY });
            return;
        }
        
        // Dragging d'annotation en cours
        if (draggingAnnotation && ref.current) {
            const canvasCoords = screenToCanvas(e.clientX, e.clientY);
            const newX = canvasCoords.x - draggingAnnotation.offsetX;
            const newY = canvasCoords.y - draggingAnnotation.offsetY;
            
            if (draggingAnnotation.type === 'text') {
                setAnnotations(prev => ({
                    ...prev,
                    texts: prev.texts.map(t => 
                        t.id === draggingAnnotation.id 
                            ? { ...t, x: newX, y: newY }
                            : t
                    )
                }));
            } else if (draggingAnnotation.type === 'rect') {
                setAnnotations(prev => ({
                    ...prev,
                    rects: prev.rects.map(r => 
                        r.id === draggingAnnotation.id 
                            ? { ...r, x: newX, y: newY }
                            : r
                    )
                }));
            }
            return;
        }
        
        // Redimensionnement de rectangle en cours
        if (resizingRect && ref.current) {
            const canvasCoords = screenToCanvas(e.clientX, e.clientY);
            const { id, handle, startX, startY, startWidth, startHeight, startRectX, startRectY } = resizingRect;
            
            const dx = canvasCoords.x - startX;
            const dy = canvasCoords.y - startY;
            
            let newX = startRectX;
            let newY = startRectY;
            let newWidth = startWidth;
            let newHeight = startHeight;
            
            // Selon la poignée utilisée, calculer les nouvelles dimensions
            if (handle.includes('w')) {
                newX = startRectX + dx;
                newWidth = startWidth - dx;
            }
            if (handle.includes('e')) {
                newWidth = startWidth + dx;
            }
            if (handle.includes('n')) {
                newY = startRectY + dy;
                newHeight = startHeight - dy;
            }
            if (handle.includes('s')) {
                newHeight = startHeight + dy;
            }
            
            // Dimensions minimales
            const minSize = 20;
            if (newWidth < minSize) {
                if (handle.includes('w')) {
                    newX = startRectX + startWidth - minSize;
                }
                newWidth = minSize;
            }
            if (newHeight < minSize) {
                if (handle.includes('n')) {
                    newY = startRectY + startHeight - minSize;
                }
                newHeight = minSize;
            }
            
            setAnnotations(prev => ({
                ...prev,
                rects: prev.rects.map(r => 
                    r.id === id 
                        ? { ...r, x: newX, y: newY, width: newWidth, height: newHeight }
                        : r
                )
            }));
            return;
        }

        // Sinon, comportement normal
        onMouseMove(e);
        
        if (connecting && ref.current) {
            const canvasCoords = screenToCanvas(e.clientX, e.clientY);
            setMousePos(canvasCoords);
        }
        
        // Dessin de rectangle en cours
        if (drawingRect && ref.current) {
            const canvasCoords = screenToCanvas(e.clientX, e.clientY);
            setDrawingRect(prev => ({
                ...prev,
                currentX: canvasCoords.x,
                currentY: canvasCoords.y
            }));
        }
        
        // Sélection multiple en cours (Ctrl+drag)
        if (selectionRect && ref.current) {
            const canvasCoords = screenToCanvas(e.clientX, e.clientY);
            setSelectionRect(prev => ({
                ...prev,
                currentX: canvasCoords.x,
                currentY: canvasCoords.y
            }));
        }
    }, [isPanning, panStart, onMouseMove, connecting, ref, screenToCanvas, drawingRect, draggingAnnotation, resizingRect, setAnnotations, selectionRect]);

    // Gère le mousedown sur le canvas
    const handleCanvasMouseDown = (e) => {
        // Clic molette = pan de n'importe où
        if (e.button === 1) {
            e.preventDefault();
            setIsPanning(true);
            setPanStart({ x: e.clientX, y: e.clientY });
            setPanButton(1);
            return;
        }

        // Mode rectangle - démarrer le dessin
        if (rectMode && e.button === 0) {
            const canvasCoords = screenToCanvas(e.clientX, e.clientY);
            setDrawingRect({
                startX: canvasCoords.x,
                startY: canvasCoords.y,
                currentX: canvasCoords.x,
                currentY: canvasCoords.y
            });
            return;
        }

        // Mode texte - ajouter du texte
        if (textMode && e.button === 0) {
            const canvasCoords = screenToCanvas(e.clientX, e.clientY);
            const text = prompt('Entrez le texte :');
            if (text && text.trim()) {
                const newText = {
                    id: 'text-' + Date.now(),
                    x: canvasCoords.x,
                    y: canvasCoords.y,
                    content: text.trim(),
                    color: '#ffffff',
                    fontSize: 14
                };
                setAnnotations(prev => ({
                    ...prev,
                    texts: [...prev.texts, newText]
                }));
            }
            setTextMode(false);
            return;
        }
        
        // Vérifier si on clique sur un appareil ou une annotation texte
        const isOnDevice = e.target.closest('.device-node');
        const isOnAnnotationText = e.target.closest('.annotation-text');
        
        // Ctrl (ou Cmd sur Mac) + clic gauche sur zone vide = démarrer sélection rectangle
        if (e.button === 0 && (e.ctrlKey || e.metaKey) && !isOnDevice && !isOnAnnotationText) {
            e.preventDefault();
            const canvasCoords = screenToCanvas(e.clientX, e.clientY);
            setSelectionRect({
                startX: canvasCoords.x,
                startY: canvasCoords.y,
                currentX: canvasCoords.x,
                currentY: canvasCoords.y
            });
            return;
        }

        // Clic gauche sur zone vide = pan (sauf si Ctrl est enfoncé)
        if (e.button === 0 && !isOnDevice && !isOnAnnotationText && !e.ctrlKey && !e.metaKey) {
            if (!wireMode && !connecting && !textMode && !rectMode) {
                setIsPanning(true);
                setPanStart({ x: e.clientX, y: e.clientY });
                setPanButton(0);
            }
        }
    };

    // Gère le mouseup
    const handleCanvasMouseUp = (e) => {
        // Fin du dragging d'annotation
        if (draggingAnnotation) {
            setDraggingAnnotation(null);
            return;
        }
        
        // Fin du redimensionnement de rectangle
        if (resizingRect) {
            setResizingRect(null);
            return;
        }
        
        // Fin de la sélection rectangle (Ctrl+drag)
        if (selectionRect) {
            const x1 = Math.min(selectionRect.startX, selectionRect.currentX);
            const y1 = Math.min(selectionRect.startY, selectionRect.currentY);
            const x2 = Math.max(selectionRect.startX, selectionRect.currentX);
            const y2 = Math.max(selectionRect.startY, selectionRect.currentY);
            
            // Ne sélectionner que si le rectangle a une taille significative
            const width = x2 - x1;
            const height = y2 - y1;
            
            if (width > 5 || height > 5) {
                // Sélectionner tous les appareils qui touchent ou sont dans le rectangle
                const selectedDevicesList = devices.filter(device => {
                    const deviceX = device.x;
                    const deviceY = device.y;
                    const deviceRadius = 40;
                    
                    const deviceLeft = deviceX - deviceRadius;
                    const deviceRight = deviceX + deviceRadius;
                    const deviceTop = deviceY - deviceRadius;
                    const deviceBottom = deviceY + deviceRadius;
                    
                    return deviceRight >= x1 && deviceLeft <= x2 && 
                           deviceBottom >= y1 && deviceTop <= y2;
                });
                
                // Sélectionner les textes dans le rectangle
                const selectedTextIds = annotations.texts.filter(text => {
                    // Approximation : le texte est un point
                    return text.x >= x1 && text.x <= x2 && text.y >= y1 && text.y <= y2;
                }).map(t => t.id);
                
                // Sélectionner les rectangles d'annotation dans le rectangle
                const selectedRectIds = annotations.rects.filter(rect => {
                    // Un rectangle est sélectionné s'il touche le rectangle de sélection
                    const rectLeft = rect.x;
                    const rectRight = rect.x + rect.width;
                    const rectTop = rect.y;
                    const rectBottom = rect.y + rect.height;
                    
                    return rectRight >= x1 && rectLeft <= x2 && 
                           rectBottom >= y1 && rectTop <= y2;
                }).map(r => r.id);
                
                // Mettre à jour les sélections
                if (selectedDevicesList.length > 0 || selectedTextIds.length > 0 || selectedRectIds.length > 0) {
                    setSelectedDevices(selectedDevicesList.map(d => d.id));
                    setSelectedAnnotations({ texts: selectedTextIds, rects: selectedRectIds });
                    if (selectedDevicesList.length > 0) {
                        setSelectedDevice(selectedDevicesList[0].id);
                    } else {
                        setSelectedDevice(null);
                    }
                    setSelectedConnection(null);
                    setSelectedAnnotation(null);
                }
                justFinishedSelection.current = true;
            }
            
            setSelectionRect(null);
            // Reset le flag après un court délai
            setTimeout(() => { justFinishedSelection.current = false; }, 100);
            return;
        }
        
        // Fin du dessin de rectangle
        if (drawingRect) {
            const x = Math.min(drawingRect.startX, drawingRect.currentX);
            const y = Math.min(drawingRect.startY, drawingRect.currentY);
            const width = Math.abs(drawingRect.currentX - drawingRect.startX);
            const height = Math.abs(drawingRect.currentY - drawingRect.startY);
            
            if (width > 10 && height > 10) {
                const newRect = {
                    id: 'rect-' + Date.now(),
                    x,
                    y,
                    width,
                    height,
                    color: 'rgba(88, 166, 255, 0.15)',
                    borderColor: 'rgba(88, 166, 255, 0.5)',
                    zIndex: 0
                };
                setAnnotations(prev => ({
                    ...prev,
                    rects: [...prev.rects, newRect]
                }));
            }
            setDrawingRect(null);
            setRectMode(false);
            return;
        }
        
        if (isPanning) {
            setIsPanning(false);
            setPanButton(null);
            return;
        }
        onMouseUp(e);
    };

    // Clic sur le canvas (désélection)
    const handleCanvasClick = (e) => {
        if (isPanning || drawingRect || selectionRect || justFinishedSelection.current) return;
        
        const isOnDevice = e.target.closest('.device-node');
        const isOnAnnotationText = e.target.closest('.annotation-text');
        
        // Ne désélectionner que si on clique sur une zone vide sans Ctrl
        if (!isOnDevice && !isOnAnnotationText && !e.ctrlKey && !e.metaKey) {
            setSelectedDevice(null);
            setSelectedDevices([]);
            setSelectedAnnotations({ texts: [], rects: [] });
            setSelectedConnection(null);
            setSelectedAnnotation(null);
            if (connecting) onCompleteConnection(null);
        }
    };

    // Clic droit sur le canvas - désactive les modes
    const handleCanvasContextMenu = (e) => {
        e.preventDefault();
        if (wireMode) {
            setWireMode(false);
            if (connecting) onCompleteConnection(null);
            return;
        }
        if (textMode) {
            setTextMode(false);
            return;
        }
        if (rectMode) {
            setRectMode(false);
            setDrawingRect(null);
            return;
        }
    };

    // Gestion du drag over
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    // Gestion du drop
    const handleDrop = (e) => {
        e.preventDefault();
        const deviceType = e.dataTransfer.getData('deviceType');
        if (deviceType && onDropDevice) {
            const canvasCoords = screenToCanvas(e.clientX, e.clientY);
            onDropDevice(deviceType, canvasCoords.x, canvasCoords.y);
        }
    };

    // Gère le clic sur un appareil
    const handleDeviceClick = (device, e) => {
        if (textMode || rectMode) return;
        
        if (wireMode) {
            if (connecting) {
                onCompleteConnection(device.id);
            } else {
                setMousePos({ x: device.x, y: device.y });
                onStartConnection(device.id);
            }
        } else if (connecting) {
            onCompleteConnection(device.id);
        } else {
            // Ctrl/Cmd+clic = toggle dans la multi-sélection
            if (e && (e.ctrlKey || e.metaKey)) {
                if (selectedDevices.includes(device.id)) {
                    // Retirer de la sélection
                    const newSelection = selectedDevices.filter(id => id !== device.id);
                    setSelectedDevices(newSelection);
                    if (selectedDevice === device.id) {
                        setSelectedDevice(newSelection.length > 0 ? newSelection[0] : null);
                    }
                } else {
                    // Ajouter à la sélection
                    setSelectedDevices([...selectedDevices, device.id]);
                    if (!selectedDevice) {
                        setSelectedDevice(device.id);
                    }
                }
            } else {
                // Clic normal sur un appareil déjà dans la multi-sélection : ne pas changer
                // (pour permettre le drag de groupe)
                if (selectedDevices.includes(device.id) && selectedDevices.length > 1) {
                    // Juste mettre à jour le selectedDevice principal pour les propriétés
                    setSelectedDevice(device.id);
                } else {
                    // Clic normal = sélection simple
                    setSelectedDevice(device.id);
                    setSelectedDevices([device.id]);
                    setSelectedConnection(null);
                    setSelectedAnnotation(null);
                }
            }
        }
    };

    // Reset du zoom
    const resetZoom = () => {
        setScale(1);
        setOffset({ x: 0, y: 0 });
    };

    // Empêcher le menu contextuel sur clic molette
    React.useEffect(() => {
        const handlePreventMiddleClick = (e) => {
            if (e.button === 1) {
                e.preventDefault();
            }
        };
        
        const canvas = ref.current;
        if (canvas) {
            canvas.addEventListener('mousedown', handlePreventMiddleClick);
            canvas.addEventListener('auxclick', (e) => e.preventDefault());
        }
        
        return () => {
            if (canvas) {
                canvas.removeEventListener('mousedown', handlePreventMiddleClick);
            }
        };
    }, [ref]);

    // Curseur dynamique
    const getCursor = () => {
        if (isPanning || drawingRect || draggingAnnotation) return 'grabbing';
        if (wireMode) return 'crosshair';
        if (textMode) return 'text';
        if (rectMode) return 'crosshair';
        return 'default';
    };

    return (
        <div
            ref={ref}
            className={`canvas ${wireMode ? 'wire-mode' : ''}`}
            onMouseMove={handleMouseMoveCanvas}
            onMouseDown={handleCanvasMouseDown}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onClick={handleCanvasClick}
            onContextMenu={handleCanvasContextMenu}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onWheel={handleWheel}
            style={{ cursor: getCursor(), overflow: 'hidden' }}
        >
            {/* Indicateur de zoom */}
            {scale !== 1 && (
                <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span>🔍 {Math.round(scale * 100)}%</span>
                    <button
                        onClick={resetZoom}
                        style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px'
                        }}
                    >
                        Reset
                    </button>
                </div>
            )}

            {/* Indicateur mode câblage */}
            {wireMode && (
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(63, 185, 80, 0.9)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '500',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}>
                    🔌 Mode câblage actif
                    {connecting ? ' - Cliquez sur le 2ème appareil' : ' - Cliquez sur un appareil'}
                    <span style={{ opacity: 0.7, fontSize: '11px', marginLeft: '8px' }}>(clic droit pour quitter)</span>
                </div>
            )}

            {/* Indicateur mode texte */}
            {textMode && (
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(88, 166, 255, 0.9)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '500',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}>
                    📝 Mode texte - Cliquez pour ajouter du texte
                    <span style={{ opacity: 0.7, fontSize: '11px', marginLeft: '8px' }}>(clic droit pour quitter)</span>
                </div>
            )}

            {/* Indicateur mode rectangle */}
            {rectMode && (
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(210, 153, 34, 0.9)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '500',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}>
                    ⬜ Mode rectangle - Cliquez et glissez pour dessiner
                    <span style={{ opacity: 0.7, fontSize: '11px', marginLeft: '8px' }}>(clic droit pour quitter)</span>
                </div>
            )}

            {/* Conteneur interne avec transformations */}
            <div 
                className="canvas-inner"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '5000px',
                    height: '5000px',
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                    transformOrigin: '0 0'
                }}
            >
                {/* SVG pour les connexions et paquets */}
                <svg className="canvas-svg" style={{ position: 'absolute', top: 0, left: 0, width: '5000px', height: '5000px', overflow: 'visible' }}>
                    <defs>
                        <filter id="glow" filterUnits="userSpaceOnUse" x="-50" y="-50" width="5100" height="5100">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        <filter id="glowGreen" filterUnits="userSpaceOnUse" x="-50" y="-50" width="5100" height="5100">
                            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Rectangles d'annotation (en arrière-plan, triés par zIndex) */}
                    {[...annotations.rects]
                        .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
                        .map(rect => {
                        const isSelected = selectedAnnotation?.type === 'rect' && selectedAnnotation?.id === rect.id;
                        const isMultiSelected = selectedAnnotations.rects.includes(rect.id);
                        const showSelected = isSelected || isMultiSelected;
                        const showHandles = isSelected && !isMultiSelected;
                        
                        // Positions des poignées de redimensionnement
                        const handleSize = 8;
                        const handles = showHandles ? [
                            { id: 'nw', x: rect.x - handleSize/2, y: rect.y - handleSize/2, cursor: 'nwse-resize' },
                            { id: 'n', x: rect.x + rect.width/2 - handleSize/2, y: rect.y - handleSize/2, cursor: 'ns-resize' },
                            { id: 'ne', x: rect.x + rect.width - handleSize/2, y: rect.y - handleSize/2, cursor: 'nesw-resize' },
                            { id: 'e', x: rect.x + rect.width - handleSize/2, y: rect.y + rect.height/2 - handleSize/2, cursor: 'ew-resize' },
                            { id: 'se', x: rect.x + rect.width - handleSize/2, y: rect.y + rect.height - handleSize/2, cursor: 'nwse-resize' },
                            { id: 's', x: rect.x + rect.width/2 - handleSize/2, y: rect.y + rect.height - handleSize/2, cursor: 'ns-resize' },
                            { id: 'sw', x: rect.x - handleSize/2, y: rect.y + rect.height - handleSize/2, cursor: 'nesw-resize' },
                            { id: 'w', x: rect.x - handleSize/2, y: rect.y + rect.height/2 - handleSize/2, cursor: 'ew-resize' },
                        ] : [];
                        
                        return (
                            <g key={rect.id}>
                                <rect
                                    x={rect.x}
                                    y={rect.y}
                                    width={rect.width}
                                    height={rect.height}
                                    fill={rect.color}
                                    stroke={showSelected ? '#58a6ff' : rect.borderColor}
                                    strokeWidth={showSelected ? 3 : 2}
                                    rx="8"
                                    ry="8"
                                    style={{ 
                                        pointerEvents: (textMode || rectMode) ? 'none' : 'auto', 
                                        cursor: showSelected ? 'move' : 'pointer' 
                                    }}
                                    onClick={(e) => {
                                        if (textMode || rectMode) return;
                                        e.stopPropagation();
                                        
                                        // Ctrl+clic = toggle dans la multi-sélection
                                        if (e.ctrlKey || e.metaKey) {
                                            if (isMultiSelected) {
                                                // Désélectionner ce rectangle
                                                setSelectedAnnotations(prev => ({
                                                    ...prev,
                                                    rects: prev.rects.filter(id => id !== rect.id)
                                                }));
                                            } else {
                                                // Ajouter à la sélection
                                                setSelectedAnnotations(prev => ({
                                                    ...prev,
                                                    rects: [...prev.rects, rect.id]
                                                }));
                                            }
                                            setSelectedAnnotation(null);
                                            return;
                                        }
                                        
                                        // Clic simple sans Ctrl
                                        if (!isMultiSelected) {
                                            setSelectedAnnotation({ type: 'rect', id: rect.id });
                                            setSelectedDevice(null);
                                            setSelectedDevices([]);
                                            setSelectedAnnotations({ texts: [], rects: [] });
                                            setSelectedConnection(null);
                                        }
                                    }}
                                    onMouseDown={(e) => {
                                        if (textMode || rectMode) return;
                                        if (e.button !== 0) return;
                                        e.stopPropagation();
                                        
                                        // Si fait partie d'une multi-sélection, déclencher le multi-drag
                                        const hasMultiSelection = selectedDevices.length > 0 || 
                                            selectedAnnotations.texts.length > 0 || 
                                            selectedAnnotations.rects.length > 1 ||
                                            (selectedAnnotations.rects.length === 1 && (selectedDevices.length > 0 || selectedAnnotations.texts.length > 0));
                                        
                                        if (isMultiSelected && hasMultiSelection && onAnnotationMultiDrag) {
                                            const canvasCoords = screenToCanvas(e.clientX, e.clientY);
                                            onAnnotationMultiDrag(e, canvasCoords);
                                            return;
                                        }
                                        
                                        if (!isSelected && !isMultiSelected) {
                                            setSelectedAnnotation({ type: 'rect', id: rect.id });
                                            setSelectedDevice(null);
                                            setSelectedDevices([]);
                                            setSelectedAnnotations({ texts: [], rects: [] });
                                            setSelectedConnection(null);
                                        }
                                        
                                        const canvasCoords = screenToCanvas(e.clientX, e.clientY);
                                        setDraggingAnnotation({
                                            type: 'rect',
                                            id: rect.id,
                                            offsetX: canvasCoords.x - rect.x,
                                            offsetY: canvasCoords.y - rect.y
                                        });
                                    }}
                                    onContextMenu={(e) => {
                                        if (textMode || rectMode) return;
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onContextMenu(e, 'rect', rect);
                                    }}
                                />
                                {/* Poignées de redimensionnement */}
                                {handles.map(handle => (
                                    <rect
                                        key={handle.id}
                                        x={handle.x}
                                        y={handle.y}
                                        width={handleSize}
                                        height={handleSize}
                                        fill="#58a6ff"
                                        stroke="#fff"
                                        strokeWidth="1"
                                        rx="2"
                                        ry="2"
                                        style={{ cursor: handle.cursor, pointerEvents: 'auto' }}
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            if (e.button !== 0) return;
                                            const canvasCoords = screenToCanvas(e.clientX, e.clientY);
                                            setResizingRect({
                                                id: rect.id,
                                                handle: handle.id,
                                                startX: canvasCoords.x,
                                                startY: canvasCoords.y,
                                                startWidth: rect.width,
                                                startHeight: rect.height,
                                                startRectX: rect.x,
                                                startRectY: rect.y
                                            });
                                        }}
                                    />
                                ))}
                            </g>
                        );
                    })}

                    {/* Rectangle en cours de dessin */}
                    {drawingRect && (
                        <rect
                            x={Math.min(drawingRect.startX, drawingRect.currentX)}
                            y={Math.min(drawingRect.startY, drawingRect.currentY)}
                            width={Math.abs(drawingRect.currentX - drawingRect.startX)}
                            height={Math.abs(drawingRect.currentY - drawingRect.startY)}
                            fill="rgba(88, 166, 255, 0.15)"
                            stroke="rgba(88, 166, 255, 0.8)"
                            strokeWidth="2"
                            strokeDasharray="8,4"
                            rx="8"
                            ry="8"
                        />
                    )}
                    
                    {/* Rectangle de sélection multiple (Ctrl+drag) */}
                    {selectionRect && (
                        <rect
                            x={Math.min(selectionRect.startX, selectionRect.currentX)}
                            y={Math.min(selectionRect.startY, selectionRect.currentY)}
                            width={Math.abs(selectionRect.currentX - selectionRect.startX)}
                            height={Math.abs(selectionRect.currentY - selectionRect.startY)}
                            fill="rgba(63, 185, 80, 0.15)"
                            stroke="rgba(63, 185, 80, 0.8)"
                            strokeWidth="2"
                            strokeDasharray="6,3"
                            rx="4"
                            ry="4"
                        />
                    )}

                    {/* Connexions virtuelles entre modems actifs - pas de ligne visible, 
                        la connexion Internet est indiquée par la pastille verte sur chaque modem */}

                    {/* Connexions câblées */}
                    {connections.map(conn => {
                        const from = getDevicePosition(conn.from);
                        const to = getDevicePosition(conn.to);
                        const isSelected = selectedConnection === conn.id;
                        const isHighlighted = isConnectionHighlighted(conn);

                        let strokeColor = '#4a5568';
                        let strokeWidth = 3;
                        let filter = 'none';

                        if (isHighlighted) {
                            strokeColor = '#3fb950';
                            strokeWidth = 5;
                            filter = 'url(#glowGreen)';
                        } else if (isSelected) {
                            strokeColor = '#3fb950';
                            strokeWidth = 4;
                            filter = 'url(#glowGreen)';
                        }

                        return (
                            <g key={conn.id} style={{ pointerEvents: (textMode || rectMode) ? 'none' : 'auto' }}>
                                <line
                                    x1={from.x} y1={from.y}
                                    x2={to.x} y2={to.y}
                                    stroke="transparent"
                                    strokeWidth="20"
                                    style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (textMode || rectMode) return;
                                        setSelectedConnection(conn.id);
                                        setSelectedDevice(null);
                                        setSelectedDevices([]);
                                        setSelectedAnnotation(null);
                                        setSelectedAnnotations({ texts: [], rects: [] });
                                    }}
                                    onContextMenu={(e) => {
                                        e.stopPropagation();
                                        if (wireMode) {
                                            e.preventDefault();
                                            setWireMode(false);
                                        } else {
                                            onContextMenu(e, 'connection', conn);
                                        }
                                    }}
                                />
                                <line
                                    x1={from.x} y1={from.y}
                                    x2={to.x} y2={to.y}
                                    stroke={strokeColor}
                                    strokeWidth={strokeWidth}
                                    strokeLinecap="round"
                                    filter={filter}
                                />
                            </g>
                        );
                    })}

                    {/* Ligne de connexion en cours */}
                    {connecting && (
                        <line
                            x1={getDevicePosition(connecting).x}
                            y1={getDevicePosition(connecting).y}
                            x2={mousePos.x}
                            y2={mousePos.y}
                            stroke="var(--accent-green)"
                            strokeWidth="3"
                            strokeDasharray="8,4"
                        />
                    )}

                    {/* Paquets animés - Balle verte */}
                    {packets.map(packet => {
                        if (packet.currentIndex >= packet.path.length - 1) return null;

                        const from = getDevicePosition(packet.path[packet.currentIndex]);
                        const to = getDevicePosition(packet.path[packet.currentIndex + 1]);
                        const progress = packet.progress / 100;

                        const x = from.x + (to.x - from.x) * progress;
                        const y = from.y + (to.y - from.y) * progress;

                        return (
                            <g key={packet.id}>
                                <circle
                                    cx={x} cy={y} r="6"
                                    fill="#3fb950"
                                    stroke="white"
                                    strokeWidth="2"
                                />
                            </g>
                        );
                    })}
                </svg>

                {/* Appareils */}
                {devices.map(device => (
                    <DeviceNode
                        key={device.id}
                        device={device}
                        isSelected={selectedDevice === device.id || selectedDevices.includes(device.id)}
                        isConnecting={connecting === device.id}
                        isConnectTarget={connecting && connecting !== device.id}
                        wireMode={wireMode}
                        onClick={(e) => handleDeviceClick(device, e)}
                        onDoubleClick={() => {
                            // Double-clic ouvre le terminal (si l'appareil peut exécuter des apps)
                            if (DEVICE_TYPES[device.type].canRunApps) {
                                onOpenApp(device.id, 'commandline');
                            }
                        }}
                        onMouseDown={(e) => !wireMode && !isPanning && !textMode && !rectMode && onMouseDown(e, device)}
                        onContextMenu={(e) => {
                            if (wireMode) {
                                e.preventDefault();
                                setWireMode(false);
                            } else if (textMode) {
                                e.preventDefault();
                                setTextMode(false);
                            } else if (rectMode) {
                                e.preventDefault();
                                setRectMode(false);
                            } else {
                                onContextMenu(e, 'device', device);
                            }
                        }}
                        onConnect={() => {
                            setMousePos({ x: device.x, y: device.y });
                            onStartConnection(device.id);
                        }}
                        style={{ pointerEvents: (textMode || rectMode) ? 'none' : 'auto' }}
                    />
                ))}

                {/* Textes d'annotation (au premier plan) */}
                {annotations.texts.map(text => {
                    const isSelected = selectedAnnotation?.type === 'text' && selectedAnnotation?.id === text.id;
                    const isMultiSelected = selectedAnnotations.texts.includes(text.id);
                    const showSelected = isSelected || isMultiSelected;
                    return (
                        <div
                            key={text.id}
                            className="annotation-text"
                            style={{
                                position: 'absolute',
                                left: text.x,
                                top: text.y,
                                color: text.color || '#ffffff',
                                fontSize: (text.fontSize || 14) + 'px',
                                fontWeight: '500',
                                padding: '4px 8px',
                                background: showSelected ? 'rgba(88, 166, 255, 0.3)' : 'rgba(0, 0, 0, 0.5)',
                                borderRadius: '4px',
                                border: showSelected ? '2px solid #58a6ff' : '1px solid transparent',
                                cursor: showSelected ? 'move' : 'pointer',
                                userSelect: 'none',
                                whiteSpace: 'nowrap',
                                zIndex: 1000,
                                pointerEvents: (textMode || rectMode) ? 'none' : 'auto'
                            }}
                            onClick={(e) => {
                                if (textMode || rectMode) return;
                                e.stopPropagation();
                                
                                // Ctrl+clic = toggle dans la multi-sélection
                                if (e.ctrlKey || e.metaKey) {
                                    if (isMultiSelected) {
                                        // Désélectionner ce texte
                                        setSelectedAnnotations(prev => ({
                                            ...prev,
                                            texts: prev.texts.filter(id => id !== text.id)
                                        }));
                                    } else {
                                        // Ajouter à la sélection
                                        setSelectedAnnotations(prev => ({
                                            ...prev,
                                            texts: [...prev.texts, text.id]
                                        }));
                                    }
                                    setSelectedAnnotation(null);
                                    return;
                                }
                                
                                // Clic simple sans Ctrl
                                if (!isMultiSelected) {
                                    setSelectedAnnotation({ type: 'text', id: text.id });
                                    setSelectedDevice(null);
                                    setSelectedDevices([]);
                                    setSelectedAnnotations({ texts: [], rects: [] });
                                    setSelectedConnection(null);
                                }
                            }}
                            onMouseDown={(e) => {
                                if (textMode || rectMode) return;
                                if (e.button !== 0) return;
                                e.stopPropagation();
                                
                                // Si fait partie d'une multi-sélection, déclencher le multi-drag
                                const hasMultiSelection = selectedDevices.length > 0 || 
                                    selectedAnnotations.rects.length > 0 || 
                                    selectedAnnotations.texts.length > 1 ||
                                    (selectedAnnotations.texts.length === 1 && (selectedDevices.length > 0 || selectedAnnotations.rects.length > 0));
                                
                                if (isMultiSelected && hasMultiSelection && onAnnotationMultiDrag) {
                                    const canvasCoords = screenToCanvas(e.clientX, e.clientY);
                                    onAnnotationMultiDrag(e, canvasCoords);
                                    return;
                                }
                                
                                if (!isSelected && !isMultiSelected) {
                                    setSelectedAnnotation({ type: 'text', id: text.id });
                                    setSelectedDevice(null);
                                    setSelectedDevices([]);
                                    setSelectedAnnotations({ texts: [], rects: [] });
                                    setSelectedConnection(null);
                                }
                                
                                const canvasCoords = screenToCanvas(e.clientX, e.clientY);
                                setDraggingAnnotation({
                                    type: 'text',
                                    id: text.id,
                                    offsetX: canvasCoords.x - text.x,
                                    offsetY: canvasCoords.y - text.y
                                });
                            }}
                        >
                            {text.content}
                        </div>
                    );
                })}
            </div>

            {/* Message si vide */}
            {devices.length === 0 && (
                <div className="canvas-empty">
                    <div className="canvas-empty-icon">🖧</div>
                    <div className="canvas-empty-title">Commencez votre réseau</div>
                    <div className="canvas-empty-subtitle">
                        Glissez-déposez des composants depuis le panneau de gauche
                    </div>
                </div>
            )}
        </div>
    );
});
