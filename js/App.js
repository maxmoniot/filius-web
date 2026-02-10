/* ============================================
   FILIUS WEB - APPLICATION PRINCIPALE
   Composant racine avec la logique réseau
   (Mode unifié : édition et simulation simultanées)
   ============================================ */

function FiliusWeb() {
    // ========== ÉTATS ==========
    const [devices, setDevices] = React.useState([]);
    const [connections, setConnections] = React.useState([]);
    const [selectedDevice, setSelectedDevice] = React.useState(null);
    const [selectedDevices, setSelectedDevices] = React.useState([]); // Multi-sélection appareils
    const [selectedAnnotations, setSelectedAnnotations] = React.useState({ texts: [], rects: [] }); // Multi-sélection annotations
    const [selectedConnection, setSelectedConnection] = React.useState(null);
    const [connecting, setConnecting] = React.useState(null);
    const [dragging, setDragging] = React.useState(null);
    const [packets, setPackets] = React.useState([]);
    const [logs, setLogs] = React.useState([]);
    const [openWindows, setOpenWindows] = React.useState([]);
    const [contextMenu, setContextMenu] = React.useState(null);
    const [showHelp, setShowHelp] = React.useState(false);
    const [projectName, setProjectName] = React.useState('Nouveau projet');
    const [networkSpeed, setNetworkSpeed] = React.useState(10);
    const [wireMode, setWireMode] = React.useState(false);
    const [selectedInterface, setSelectedInterface] = React.useState(null);
    
    // Zoom et pan du canvas
    const [canvasScale, setCanvasScale] = React.useState(1);
    // Offset initial pour centrer la vue sur le milieu du canvas virtuel (2500, 2500)
    const [canvasOffset, setCanvasOffset] = React.useState({ x: -2000, y: -1500 });
    
    // Annotations (textes et rectangles)
    const [annotations, setAnnotations] = React.useState({ texts: [], rects: [] });
    const [textMode, setTextMode] = React.useState(false);
    const [rectMode, setRectMode] = React.useState(false);
    const [selectedAnnotation, setSelectedAnnotation] = React.useState(null);
    
    // Drag depuis le panneau de composants (système custom plus réactif)
    const [componentDrag, setComponentDrag] = React.useState(null);
    
    // Historique pour undo/redo (max 50 états)
    const [history, setHistory] = React.useState([]);
    const [historyIndex, setHistoryIndex] = React.useState(-1);
    const isUndoRedo = React.useRef(false);
    const MAX_HISTORY = 50;

    const canvasRef = React.useRef(null);
    const fileInputRef = React.useRef(null);
    
    // ========== ÉCRAN DE CHARGEMENT ==========
    React.useEffect(() => {
        // Cacher l'écran de chargement quand l'app est prête
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            // Supprimer complètement après l'animation
            setTimeout(() => {
                loadingScreen.remove();
            }, 500);
        }
    }, []);
    
    // ========== GESTION DU MODE CÂBLAGE ==========
    // Quand on quitte le mode câblage, annuler la connexion en cours
    React.useEffect(() => {
        if (!wireMode && connecting) {
            setConnecting(null);
        }
    }, [wireMode]);
    
    // ========== GESTION DE L'HISTORIQUE ==========
    // Sauvegarder l'état actuel dans l'historique
    const saveToHistory = React.useCallback(() => {
        if (isUndoRedo.current) {
            isUndoRedo.current = false;
            return;
        }
        
        const currentState = {
            devices: deepClone(devices),
            connections: deepClone(connections),
            annotations: deepClone(annotations)
        };
        
        setHistory(prev => {
            // Supprimer les états après l'index actuel (si on a fait des undo)
            const newHistory = prev.slice(0, historyIndex + 1);
            // Ajouter le nouvel état
            newHistory.push(currentState);
            // Limiter la taille
            if (newHistory.length > MAX_HISTORY) {
                newHistory.shift();
                return newHistory;
            }
            return newHistory;
        });
        setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
    }, [devices, connections, annotations, historyIndex]);
    
    // Sauvegarder après chaque modification significative
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (devices.length > 0 || connections.length > 0 || annotations.texts.length > 0 || annotations.rects.length > 0) {
                saveToHistory();
            }
        }, 500); // Debounce de 500ms
        return () => clearTimeout(timer);
    }, [devices, connections, annotations]);
    
    // Annuler (Undo)
    const undo = React.useCallback(() => {
        if (historyIndex > 0) {
            isUndoRedo.current = true;
            const prevState = history[historyIndex - 1];
            setDevices(prevState.devices);
            setConnections(prevState.connections);
            setAnnotations(prevState.annotations);
            setHistoryIndex(prev => prev - 1);
            addLog('Action annulée', 'info');
        }
    }, [history, historyIndex]);
    
    // Répéter (Redo)
    const redo = React.useCallback(() => {
        if (historyIndex < history.length - 1) {
            isUndoRedo.current = true;
            const nextState = history[historyIndex + 1];
            setDevices(nextState.devices);
            setConnections(nextState.connections);
            setAnnotations(nextState.annotations);
            setHistoryIndex(prev => prev + 1);
            addLog('Action répétée', 'info');
        }
    }, [history, historyIndex]);
    
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    // ========== RACCOURCIS CLAVIER ==========
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            // Ne pas traiter si on est dans un champ de texte
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Ctrl+Z = Annuler
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
                return;
            }
            
            // Ctrl+Y ou Ctrl+Shift+Z = Répéter
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey) || (e.key === 'Z' && e.shiftKey))) {
                e.preventDefault();
                redo();
                return;
            }
            
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Supprimer les annotations multi-sélectionnées
                if (selectedAnnotations.texts.length > 0 || selectedAnnotations.rects.length > 0) {
                    setAnnotations(prev => ({
                        texts: prev.texts.filter(t => !selectedAnnotations.texts.includes(t.id)),
                        rects: prev.rects.filter(r => !selectedAnnotations.rects.includes(r.id))
                    }));
                    setSelectedAnnotations({ texts: [], rects: [] });
                }
                
                // Supprimer l'annotation sélectionnée (simple)
                if (selectedAnnotation) {
                    setAnnotations(prev => ({
                        texts: selectedAnnotation.type === 'text' 
                            ? prev.texts.filter(t => t.id !== selectedAnnotation.id)
                            : prev.texts,
                        rects: selectedAnnotation.type === 'rect'
                            ? prev.rects.filter(r => r.id !== selectedAnnotation.id)
                            : prev.rects
                    }));
                    setSelectedAnnotation(null);
                    addLog('Annotation supprimée', 'warning');
                    e.preventDefault();
                    return;
                }
                
                // Supprimer les appareils multi-sélectionnés
                if (selectedDevices.length > 0) {
                    const deviceNames = selectedDevices.map(id => {
                        const d = devices.find(dev => dev.id === id);
                        return d?.name || id;
                    });
                    setConnections(prev => prev.filter(c => 
                        !selectedDevices.includes(c.from) && !selectedDevices.includes(c.to)
                    ));
                    setDevices(prev => prev.filter(d => !selectedDevices.includes(d.id)));
                    setSelectedDevices([]);
                    setSelectedAnnotations({ texts: [], rects: [] });
                    setSelectedDevice(null);
                    addLog(`Suppression: ${deviceNames.join(', ')}`, 'warning');
                    e.preventDefault();
                    return;
                }
                
                // Supprimer l'appareil sélectionné (simple)
                if (selectedDevice) {
                    const device = devices.find(d => d.id === selectedDevice);
                    setConnections(prev => prev.filter(c => c.from !== selectedDevice && c.to !== selectedDevice));
                    setDevices(prev => prev.filter(d => d.id !== selectedDevice));
                    setSelectedDevice(null);
                    if (device) {
                        addLog(`Suppression: ${device.name}`, 'warning');
                    }
                    e.preventDefault();
                    return;
                }
                
                // Supprimer la connexion sélectionnée
                if (selectedConnection) {
                    setConnections(prev => prev.filter(c => c.id !== selectedConnection));
                    setSelectedConnection(null);
                    addLog('Connexion supprimée', 'warning');
                    e.preventDefault();
                }
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedDevice, selectedDevices, selectedAnnotations, selectedConnection, selectedAnnotation, devices, addLog, undo, redo]);

    // Gestion du drag personnalisé depuis le panneau de composants
    React.useEffect(() => {
        if (!componentDrag) return;
        
        const handleMouseMove = (e) => {
            const dx = Math.abs(e.clientX - componentDrag.startX);
            const dy = Math.abs(e.clientY - componentDrag.startY);
            // Activer le mode drag seulement si on a bougé de plus de 5 pixels
            if (dx > 5 || dy > 5) {
                setComponentDrag(prev => prev ? { ...prev, x: e.clientX, y: e.clientY, isDragging: true } : null);
            }
        };
        
        const handleMouseUp = (e) => {
            if (componentDrag && componentDrag.isDragging && canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                // Vérifier si on est au-dessus du canvas
                if (e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    // Calculer la position dans le canvas
                    const canvasX = (e.clientX - rect.left - canvasOffset.x) / canvasScale;
                    const canvasY = (e.clientY - rect.top - canvasOffset.y) / canvasScale;
                    addDeviceAtPosition(componentDrag.type, canvasX, canvasY);
                }
            }
            setComponentDrag(null);
        };
        
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [componentDrag, canvasOffset, canvasScale, addDeviceAtPosition]);

    // Fonction pour démarrer le drag depuis le panneau
    const startComponentDrag = React.useCallback((type, e) => {
        e.preventDefault();
        setComponentDrag({
            type,
            startX: e.clientX,
            startY: e.clientY,
            x: e.clientX,
            y: e.clientY,
            isDragging: false
        });
    }, []);

    // ========== LOGGING ==========
    const addLog = React.useCallback((message, type = 'info') => {
        setLogs(prev => [
            ...prev.slice(-150),
            {
                id: generateId(),
                timestamp: formatTimestamp(),
                message,
                type
            }
        ]);
    }, []);

    // ========== GESTION DES APPAREILS ==========
    const addDevice = React.useCallback((type) => {
        const newDevice = createDevice(type, devices);
        setDevices(prev => [...prev, newDevice]);
        addLog(`Ajout: ${newDevice.name}`, 'success');
    }, [devices, addLog]);

    const addDeviceAtPosition = React.useCallback((type, x, y) => {
        const newDevice = createDevice(type, devices, x, y);
        setDevices(prev => [...prev, newDevice]);
        addLog(`Ajout: ${newDevice.name}`, 'success');
    }, [devices, addLog]);

    // Réinitialiser l'interface sélectionnée quand on change de device
    React.useEffect(() => {
        setSelectedInterface(null);
    }, [selectedDevice]);

    const updateDevice = React.useCallback((id, updates) => {
        setDevices(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    }, []);

    const deleteDevice = React.useCallback((id) => {
        const device = devices.find(d => d.id === id);
        setOpenWindows(prev => prev.filter(w => w.deviceId !== id));
        setConnections(prev => prev.filter(c => c.from !== id && c.to !== id));
        setDevices(prev => prev.filter(d => d.id !== id));
        setSelectedDevice(null);
        if (device) addLog(`Suppression: ${device.name}`, 'warning');
    }, [devices, addLog]);

    const duplicateDevice = React.useCallback((id) => {
        const device = devices.find(d => d.id === id);
        if (!device) return;

        const newId = generateId();
        const newDevice = {
            ...deepClone(device),
            id: newId,
            name: `${device.name} (copie)`,
            x: device.x + 50,
            y: device.y + 50,
            mac: generateMAC(),
            ip: device.ip ? incrementIP(device.ip) : null
        };
        
        // Si c'est un modem, générer une nouvelle IP publique unique
        if (device.type === 'MODEM' && device.publicIP) {
            newDevice.publicIP = generatePublicIP([...devices, newDevice]);
        }
        
        setDevices(prev => [...prev, newDevice]);
        
        // Sélectionner le nouvel appareil
        setSelectedDevice(newId);
        setSelectedDevices([newId]);
        setSelectedAnnotations({ texts: [], rects: [] });
        
        addLog(`Duplication: ${newDevice.name}`, 'success');
    }, [devices, addLog]);
    
    // Dupliquer tous les éléments sélectionnés
    const duplicateSelection = React.useCallback(() => {
        const newDevices = [];
        const newDeviceIds = [];
        const deviceIdMap = {}; // Pour mapper ancien ID -> nouveau ID pour les connexions
        
        // Liste de tous les appareils pour vérifier les IPs uniques
        let allDevicesForIPCheck = [...devices];
        
        // Dupliquer les appareils sélectionnés
        selectedDevices.forEach((id, index) => {
            const device = devices.find(d => d.id === id);
            if (!device) return;
            
            const newId = generateId();
            deviceIdMap[id] = newId;
            newDeviceIds.push(newId);
            
            const newDevice = {
                ...deepClone(device),
                id: newId,
                name: `${device.name} (copie)`,
                x: device.x + 50,
                y: device.y + 50,
                mac: generateMAC(),
                ip: device.ip ? incrementIP(device.ip) : null
            };
            
            // Si c'est un modem, générer une nouvelle IP publique unique
            if (device.type === 'MODEM' && device.publicIP) {
                newDevice.publicIP = generatePublicIP(allDevicesForIPCheck);
                // Ajouter le nouveau modem à la liste pour éviter les doublons
                allDevicesForIPCheck = [...allDevicesForIPCheck, newDevice];
            }
            
            newDevices.push(newDevice);
        });
        
        // Collecter les IDs des nouvelles annotations
        const newTextIds = [];
        const newRectIds = [];
        
        if (newDevices.length > 0) {
            setDevices(prev => [...prev, ...newDevices]);
            
            // Dupliquer les connexions entre les appareils dupliqués
            const newConnections = [];
            connections.forEach(conn => {
                if (deviceIdMap[conn.from] && deviceIdMap[conn.to]) {
                    newConnections.push({
                        id: generateId(),
                        from: deviceIdMap[conn.from],
                        to: deviceIdMap[conn.to]
                    });
                }
            });
            
            if (newConnections.length > 0) {
                setConnections(prev => [...prev, ...newConnections]);
            }
            
            addLog(`Duplication: ${newDevices.length} appareil(s)`, 'success');
        }
        
        // Dupliquer les textes sélectionnés
        if (selectedAnnotations.texts.length > 0) {
            const newTexts = selectedAnnotations.texts.map(textId => {
                const text = annotations.texts.find(t => t.id === textId);
                if (!text) return null;
                const newTextId = 'text-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                newTextIds.push(newTextId);
                return {
                    ...text,
                    id: newTextId,
                    x: text.x + 50,
                    y: text.y + 50
                };
            }).filter(Boolean);
            
            if (newTexts.length > 0) {
                setAnnotations(prev => ({
                    ...prev,
                    texts: [...prev.texts, ...newTexts]
                }));
            }
        }
        
        // Dupliquer les rectangles sélectionnés
        if (selectedAnnotations.rects.length > 0) {
            const newRects = selectedAnnotations.rects.map(rectId => {
                const rect = annotations.rects.find(r => r.id === rectId);
                if (!rect) return null;
                const newRectId = 'rect-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                newRectIds.push(newRectId);
                return {
                    ...rect,
                    id: newRectId,
                    x: rect.x + 50,
                    y: rect.y + 50
                };
            }).filter(Boolean);
            
            if (newRects.length > 0) {
                setAnnotations(prev => ({
                    ...prev,
                    rects: [...prev.rects, ...newRects]
                }));
            }
        }
        
        // Sélectionner les nouveaux éléments dupliqués
        if (newDeviceIds.length > 0) {
            setSelectedDevice(newDeviceIds[0]);
            setSelectedDevices(newDeviceIds);
        } else {
            setSelectedDevice(null);
            setSelectedDevices([]);
        }
        setSelectedAnnotations({ texts: newTextIds, rects: newRectIds });
        setSelectedAnnotation(null);
        
    }, [selectedDevices, selectedAnnotations, devices, connections, annotations, addLog]);

    // ========== GESTION DES CONNEXIONS ==========
    const startConnection = React.useCallback((deviceId) => {
        setConnecting(deviceId);
    }, []);

    const completeConnection = React.useCallback((deviceId) => {
        // Si deviceId est null ou undefined, c'est une annulation
        if (!deviceId) {
            setConnecting(null);
            return;
        }
        
        // Si pas de connexion en cours ou clic sur le même appareil
        if (!connecting || connecting === deviceId) {
            setConnecting(null);
            return;
        }

        const fromDevice = devices.find(d => d.id === connecting);
        const toDevice = devices.find(d => d.id === deviceId);

        // Empêcher la connexion câble entre deux modems
        if (fromDevice?.type === 'MODEM' && toDevice?.type === 'MODEM') {
            addLog('❌ Impossible de connecter deux modems par câble', 'error');
            addLog('💡 Les modems communiquent via Internet (activez la connexion Internet)', 'info');
            setConnecting(null);
            return;
        }

        const exists = connections.some(c =>
            (c.from === connecting && c.to === deviceId) ||
            (c.from === deviceId && c.to === connecting)
        );

        if (!exists) {
            setConnections(prev => [...prev, {
                id: generateId(),
                from: connecting,
                to: deviceId
            }]);
            addLog(`Connexion: ${fromDevice?.name} ↔ ${toDevice?.name}`, 'success');
        }
        setConnecting(null);
    }, [connecting, connections, devices, addLog]);

    const deleteConnection = React.useCallback((connId) => {
        setConnections(prev => prev.filter(c => c.id !== connId));
        setSelectedConnection(null);
        addLog('Connexion supprimée', 'warning');
    }, [addLog]);

    // ========== RÉSEAU - RECHERCHE DE CHEMIN ==========
    const getActiveModems = React.useCallback(() => {
        // Tous les modems avec une IP publique sont considérés comme "sur Internet"
        return devices.filter(d => d.type === 'MODEM' && d.publicIP);
    }, [devices]);

    const findPath = React.useCallback((fromId, toId, visited = new Set()) => {
        if (fromId === toId) return [fromId];
        visited.add(fromId);

        let neighbors = connections
            .filter(c => c.from === fromId || c.to === fromId)
            .map(c => c.from === fromId ? c.to : c.from)
            .filter(id => !visited.has(id));

        const currentDevice = devices.find(d => d.id === fromId);
        // Les modems avec IP publique peuvent communiquer entre eux via Internet
        if (currentDevice?.type === 'MODEM' && currentDevice.publicIP) {
            const activeModems = getActiveModems();
            const modemNeighbors = activeModems
                .filter(m => m.id !== fromId && !visited.has(m.id))
                .map(m => m.id);
            neighbors = [...new Set([...neighbors, ...modemNeighbors])];
        }

        for (const neighbor of neighbors) {
            const path = findPath(neighbor, toId, new Set(visited));
            if (path) return [fromId, ...path];
        }
        return null;
    }, [connections, devices, getActiveModems]);

    const findDeviceByIP = React.useCallback((ip) => {
        // Chercher par IP privée
        let device = devices.find(d => d.ip === ip);
        if (device) return device;

        // Chercher dans les interfaces des routeurs
        for (const dev of devices) {
            if (dev.interfaces?.some(i => i.ip === ip)) return dev;
        }

        // Chercher par IP publique (modems)
        device = devices.find(d => d.publicIP === ip);
        if (device) return device;

        return null;
    }, [devices]);

    // Vérifie la configuration NAT d'un modem pour un protocole donné
    // Retourne { modem, enabled, targetIP, internalDevice } ou null
    const getNatConfig = React.useCallback((publicIP, protocol) => {
        // protocol: 'tcp', 'udp', 'icmp'
        const modem = devices.find(d => d.publicIP === publicIP && d.type === 'MODEM');
        if (!modem) return null;

        const config = modem.natConfig?.[protocol];
        if (!config) {
            return { modem, enabled: false, targetIP: null, internalDevice: null };
        }

        // Trouver l'appareil sur le réseau LOCAL du modem (sans passer par Internet)
        let internalDevice = null;
        if (config.enabled && config.targetIP) {
            // BFS depuis le modem pour trouver l'appareil avec l'IP cible
            // sans traverser d'autres modems
            const visited = new Set();
            const queue = [modem.id];
            
            while (queue.length > 0 && !internalDevice) {
                const currentId = queue.shift();
                if (visited.has(currentId)) continue;
                visited.add(currentId);
                
                const currentDevice = devices.find(d => d.id === currentId);
                
                // Si c'est l'appareil recherché
                if (currentDevice?.ip === config.targetIP && currentDevice.id !== modem.id) {
                    internalDevice = currentDevice;
                    break;
                }
                
                // Ajouter les voisins (sauf autres modems pour rester sur le réseau local)
                connections.forEach(conn => {
                    let neighborId = null;
                    if (conn.from === currentId) neighborId = conn.to;
                    else if (conn.to === currentId) neighborId = conn.from;
                    
                    if (neighborId && !visited.has(neighborId)) {
                        const neighbor = devices.find(d => d.id === neighborId);
                        // Ne pas traverser d'autres modems (rester sur le réseau local)
                        if (neighbor && (neighbor.type !== 'MODEM' || neighbor.id === modem.id)) {
                            queue.push(neighborId);
                        }
                    }
                });
            }
        }

        return {
            modem,
            enabled: config.enabled,
            targetIP: config.targetIP,
            internalDevice
        };
    }, [devices, connections]);

    // ========== RÉSEAU - ENVOI DE PAQUETS ==========
    const sendPacket = React.useCallback((fromId, toId, protocol, data, onComplete) => {
        const path = findPath(fromId, toId);
        if (!path || path.length < 2) return null;

        const packet = {
            id: generateId(),
            protocol,
            data,
            path,
            currentIndex: 0,
            progress: 0,
            onComplete
        };

        setPackets(prev => [...prev, packet]);

        const from = devices.find(d => d.id === fromId);
        const to = devices.find(d => d.id === toId);
        addLog(`${protocol} ${from?.ip || from?.name} → ${to?.ip || to?.name}`, 'packet');

        return packet;
    }, [findPath, devices, addLog]);

    // Animation des paquets (toujours active)
    React.useEffect(() => {
        if (packets.length === 0) return;

        const speed = 3 + networkSpeed * 3; // Vitesse augmentée de 50%
        const interval = setInterval(() => {
            setPackets(prev => prev.map(packet => {
                const newProgress = packet.progress + speed;

                if (newProgress >= 100) {
                    if (packet.currentIndex < packet.path.length - 2) {
                        return { ...packet, currentIndex: packet.currentIndex + 1, progress: 0 };
                    }
                    if (packet.onComplete) setTimeout(packet.onComplete, 50);
                    return null;
                }
                return { ...packet, progress: newProgress };
            }).filter(Boolean));
        }, 30);

        return () => clearInterval(interval);
    }, [packets.length, networkSpeed]);

    // ========== COMMANDES RÉSEAU ==========
    
    // Helper : Vérifie si le chemin passe par Internet (entre deux modems différents)
    const doesPathCrossInternet = React.useCallback((fromDeviceId, toDeviceId) => {
        const path = findPath(fromDeviceId, toDeviceId);
        if (!path) return { crosses: false, path: null };
        
        // Compter les modems traversés (avec IP publique = sur Internet)
        let modemCount = 0;
        let firstModem = null;
        let lastModem = null;
        
        for (const nodeId of path) {
            const node = devices.find(d => d.id === nodeId);
            if (node?.type === 'MODEM' && node.publicIP) {
                modemCount++;
                if (!firstModem) firstModem = node;
                lastModem = node;
            }
        }
        
        // Si on traverse 2 modems ou plus, on passe par Internet
        return { 
            crosses: modemCount >= 2, 
            path, 
            sourceModem: firstModem, 
            destModem: lastModem 
        };
    }, [findPath, devices]);

    // Helper : Trouve le modem local d'un appareil
    const findDeviceModem = React.useCallback((deviceId) => {
        const visited = new Set();
        const queue = [deviceId];
        
        while (queue.length > 0) {
            const currentId = queue.shift();
            if (visited.has(currentId)) continue;
            visited.add(currentId);
            
            const currentDevice = devices.find(d => d.id === currentId);
            if (currentDevice?.type === 'MODEM' && currentDevice.publicIP) {
                return currentDevice;
            }
            
            connections.forEach(conn => {
                if (conn.from === currentId && !visited.has(conn.to)) {
                    queue.push(conn.to);
                }
                if (conn.to === currentId && !visited.has(conn.from)) {
                    queue.push(conn.from);
                }
            });
        }
        return null;
    }, [devices, connections]);

    const ping = React.useCallback(async (fromDevice, targetIP, count = 4) => {
        addLog(`PING ${targetIP}`, 'command');

        // Vérifier si c'est une IP publique de modem
        const natConfig = getNatConfig(targetIP, 'icmp');
        
        if (natConfig && natConfig.modem) {
            // C'est une IP publique de modem
            const targetModem = natConfig.modem;
            
            // VERIFICATION DU ROUTAGE VERS INTERNET
            // Avant de pinguer une IP publique, vérifier que la source peut atteindre Internet
            const internetAccess = canReachInternet(devices, connections, fromDevice);
            if (!internetAccess.canReach) {
                addLog(`Routage impossible: ${internetAccess.reason}`, 'error');
                return { success: false };
            }
            
            // Vérifier si on peut atteindre ce modem
            const pathInfo = doesPathCrossInternet(fromDevice.id, targetModem.id);
            
            if (!pathInfo.path) {
                addLog('Hôte de destination inaccessible', 'error');
                return { success: false };
            }
            
            // Si on passe par Internet et que ICMP est activé avec une cible
            if (pathInfo.crosses && natConfig.enabled && natConfig.internalDevice) {
                // Ping redirigé vers l'appareil interne via NAT
                const internalTarget = natConfig.internalDevice;
                
                for (let i = 0; i < count; i++) {
                    await new Promise(resolve => {
                        sendPacket(fromDevice.id, targetModem.id, 'ICMP', { type: 'echo-request' }, () => {
                            sendPacket(targetModem.id, internalTarget.id, 'ICMP', { type: 'echo-request', nat: true }, () => {
                                sendPacket(internalTarget.id, targetModem.id, 'ICMP', { type: 'echo-reply', nat: true }, () => {
                                    sendPacket(targetModem.id, fromDevice.id, 'ICMP', { type: 'echo-reply' }, resolve);
                                });
                            });
                        });
                    });
                    const time = Math.floor(20 + Math.random() * 50);
                    addLog(`Réponse de ${targetIP} (NAT → ${natConfig.targetIP}): temps=${time}ms`, 'success');
                    await new Promise(r => setTimeout(r, 300));
                }
                return { success: true, avgTime: 35 };
            }
            
            if (pathInfo.crosses) {
                // Pas de redirection ICMP, le modem ne répond pas aux pings depuis Internet
                addLog('Délai d\'attente dépassé (ICMP non redirigé)', 'error');
                return { success: false };
            }
            
            // On est sur le réseau local du modem, ping direct OK
            for (let i = 0; i < count; i++) {
                await new Promise(resolve => {
                    sendPacket(fromDevice.id, targetModem.id, 'ICMP', { type: 'echo-request' }, () => {
                        sendPacket(targetModem.id, fromDevice.id, 'ICMP', { type: 'echo-reply' }, resolve);
                    });
                });
                const time = Math.floor(1 + Math.random() * 10);
                addLog(`Réponse de ${targetIP}: temps=${time}ms`, 'success');
                await new Promise(r => setTimeout(r, 300));
            }
            return { success: true, avgTime: 5 };
        }

        // C'est une IP privée
        const target = findDeviceByIP(targetIP);
        if (!target) {
            addLog('Hôte de destination inaccessible', 'error');
            return { success: false };
        }

        // VERIFICATION DU ROUTAGE IP EN PREMIER
        // Vérifier si la source peut atteindre la destination au niveau IP
        const routingResult = canRoutePacket(devices, connections, fromDevice, target);
        if (!routingResult.canRoute) {
            addLog(`Routage impossible: ${routingResult.reason}`, 'error');
            return { success: false };
        }

        // Vérifier si le chemin passe par Internet
        const pathInfo = doesPathCrossInternet(fromDevice.id, target.id);
        
        if (!pathInfo.path) {
            addLog('Réseau de destination inaccessible', 'error');
            return { success: false };
        }

        // Si on passe par Internet vers une IP privée → BLOQUÉ par NAT
        if (pathInfo.crosses) {
            addLog(`Hôte ${targetIP} inaccessible - IP privée derrière NAT`, 'error');
            addLog(`💡 Utilisez l'IP publique du modem avec ICMP activé`, 'info');
            return { success: false };
        }

        // Ping local (même réseau, pas d'Internet)
        return new Promise(resolve => {
            let received = 0;
            const sendPing = (seq) => {
                if (seq > count) {
                    addLog(`${count} paquets transmis, ${received} reçus`, received === count ? 'success' : 'warning');
                    resolve({ success: received > 0, received, sent: count });
                    return;
                }

                sendPacket(fromDevice.id, target.id, 'ICMP', { seq }, () => {
                    setTimeout(() => {
                        sendPacket(target.id, fromDevice.id, 'ICMP', { seq, reply: true }, () => {
                            received++;
                            const time = Math.floor(10 + Math.random() * 50);
                            addLog(`Réponse de ${targetIP}: seq=${seq} temps=${time}ms TTL=64`, 'success');
                            setTimeout(() => sendPing(seq + 1), 400);
                        });
                    }, 100);
                });
            };
            sendPing(1);
        });
    }, [addLog, findDeviceByIP, findPath, sendPacket, getNatConfig, devices, doesPathCrossInternet]);

    const traceroute = React.useCallback(async (fromDevice, targetIP) => {
        addLog(`TRACEROUTE vers ${targetIP}`, 'command');

        const target = findDeviceByIP(targetIP);
        if (!target) {
            addLog('Hôte inaccessible', 'error');
            return { success: false };
        }

        // Vérifier le routage IP en premier
        const routingResult = canRoutePacket(devices, connections, fromDevice, target);
        if (!routingResult.canRoute) {
            addLog(`Routage impossible: ${routingResult.reason}`, 'error');
            return { success: false };
        }

        const path = findPath(fromDevice.id, target.id);
        if (!path) {
            addLog('Réseau inaccessible', 'error');
            return { success: false };
        }

        for (let i = 1; i < path.length; i++) {
            const hop = devices.find(d => d.id === path[i]);
            const time = Math.floor(5 + Math.random() * 30);
            addLog(`  ${i}  ${hop?.ip || hop?.name}  ${time}ms`, 'info');
            await new Promise(r => setTimeout(r, 300));
        }

        addLog('Traceroute terminé', 'success');
        return { success: true, hops: path.length - 1 };
    }, [addLog, findDeviceByIP, findPath, devices, connections]);

    const httpRequest = React.useCallback(async (fromDevice, url) => {
        const match = url.match(/^https?:\/\/([^:\/]+)(?::(\d+))?(\/.*)?$/);
        if (!match) return { success: false, error: 'URL invalide' };

        const hostname = match[1];
        const port = parseInt(match[2]) || 80;
        const urlPath = match[3] || '/';

        addLog(`HTTP GET ${url}`, 'command');

        if (!fromDevice.ip) {
            addLog('Interface source non configurée', 'error');
            return { success: false, error: 'Interface source non configurée' };
        }

        // Résolution DNS si nécessaire
        let targetIP = hostname;
        if (!isValidIP(hostname)) {
            // Chercher le serveur DNS - peut être local ou via NAT
            let dnsServer = findDeviceByIP(fromDevice.dns);
            
            // Si trouvé mais c'est un modem (pas de DNS dessus), suivre la redirection NAT
            if (dnsServer && dnsServer.type === 'MODEM' && !dnsServer.services?.dnsserver?.running) {
                const dnsNatConfig = getNatConfig(fromDevice.dns, 'udp');
                if (dnsNatConfig?.enabled && dnsNatConfig.internalDevice) {
                    addLog(`DNS via NAT: ${fromDevice.dns} → ${dnsNatConfig.internalDevice.ip}`, 'info');
                    dnsServer = dnsNatConfig.internalDevice;
                } else {
                    addLog('Serveur DNS non disponible (UDP non redirigé)', 'error');
                    return { success: false, error: 'Serveur DNS non disponible (UDP non redirigé sur le modem)' };
                }
            }
            
            // Si pas trouvé, vérifier si c'est une IP publique de modem (DNS via NAT)
            if (!dnsServer && fromDevice.dns) {
                const dnsNatConfig = getNatConfig(fromDevice.dns, 'udp');
                if (dnsNatConfig?.modem && dnsNatConfig.enabled && dnsNatConfig.internalDevice) {
                    dnsServer = dnsNatConfig.internalDevice;
                    addLog(`DNS via NAT: ${fromDevice.dns} → ${dnsServer.ip}`, 'info');
                }
            }
            
            if (dnsServer?.services?.dnsserver?.running) {
                const record = dnsServer.services.dnsserver.records.find(r => r.name === hostname);
                if (record) {
                    targetIP = record.ip;
                    addLog(`DNS: ${hostname} → ${targetIP}`, 'info');
                } else {
                    addLog(`DNS: ${hostname} non trouvé`, 'error');
                    return { success: false, error: 'DNS: Hôte non trouvé' };
                }
            } else {
                addLog('Serveur DNS non disponible', 'error');
                return { success: false, error: 'Serveur DNS non disponible' };
            }
        }

        // Vérifier si c'est une IP publique d'un modem (NAT) - HTTP utilise TCP
        const natConfig = getNatConfig(targetIP, 'tcp');
        let actualTarget = null;
        let targetModem = null;

        if (natConfig && natConfig.modem) {
            // C'est une IP publique de modem
            targetModem = natConfig.modem;
            
            // VERIFICATION DU ROUTAGE VERS INTERNET
            // Avant d'accéder à une IP publique, vérifier que la source peut atteindre Internet
            const internetAccess = canReachInternet(devices, connections, fromDevice);
            if (!internetAccess.canReach) {
                addLog(`Routage impossible: ${internetAccess.reason}`, 'error');
                return { success: false, error: internetAccess.reason };
            }
            
            if (!natConfig.enabled) {
                // TCP non activé sur ce modem
                addLog(`NAT: TCP non redirigé sur ${targetModem.name}`, 'error');
                return { 
                    success: false, 
                    error: `Connexion refusée - TCP non activé sur le modem`,
                    status: 0 
                };
            }

            // TCP activé, vérifier la cible
            if (!natConfig.internalDevice) {
                addLog(`NAT: Appareil ${natConfig.targetIP} introuvable`, 'error');
                return { success: false, error: 'Appareil interne introuvable' };
            }

            addLog(`NAT: ${targetIP} (TCP) → ${natConfig.targetIP}`, 'info');
            actualTarget = natConfig.internalDevice;
        } else {
            // Pas une IP publique, chercher directement l'appareil
            actualTarget = findDeviceByIP(targetIP);
            
            if (!actualTarget) {
                addLog('Hôte de destination introuvable', 'error');
                return { success: false, error: 'Hôte de destination introuvable' };
            }

            // VERIFICATION DU ROUTAGE IP EN PREMIER
            // Vérifier si la source peut atteindre la destination au niveau IP
            // (passerelle correcte, routeur avec interfaces sur les deux réseaux, etc.)
            const routingResult = canRoutePacket(devices, connections, fromDevice, actualTarget);
            if (!routingResult.canRoute) {
                addLog(`Routage impossible: ${routingResult.reason}`, 'error');
                return { success: false, error: routingResult.reason };
            }

            // Vérifier si le chemin passe par Internet (NAT)
            const pathInfo = doesPathCrossInternet(fromDevice.id, actualTarget.id);
            
            if (pathInfo.crosses) {
                // On essaie d'accéder à une IP privée via Internet → BLOQUÉ
                addLog(`Serveur ${targetIP} inaccessible - IP privée derrière NAT`, 'error');
                addLog(`💡 Utilisez l'IP publique du modem avec TCP activé`, 'info');
                return { success: false, error: 'IP privée inaccessible depuis Internet' };
            }
        }

        // Vérifier le chemin physique
        const networkPath = targetModem 
            ? findPath(fromDevice.id, targetModem.id)
            : findPath(fromDevice.id, actualTarget.id);
            
        if (!networkPath || networkPath.length < 2) {
            addLog('Pas de route vers l\'hôte', 'error');
            return { success: false, error: 'Pas de route vers l\'hôte' };
        }

        // Si on passe par un modem, vérifier aussi le chemin modem → serveur interne
        if (targetModem) {
            const internalPath = findPath(targetModem.id, actualTarget.id);
            if (!internalPath || internalPath.length < 2) {
                addLog('Serveur interne non joignable depuis le modem', 'error');
                return { success: false, error: 'Serveur interne non joignable depuis le modem' };
            }
        }

        // Vérifier que le serveur web tourne
        if (!actualTarget.services?.webserver?.running) {
            addLog(`Connexion refusée (port ${port} fermé)`, 'error');
            return { success: false, error: 'Connexion refusée', status: 0 };
        }

        return new Promise(resolve => {
            // Envoyer le paquet au modem ou directement au serveur
            const firstHopTarget = targetModem || actualTarget;
            
            sendPacket(fromDevice.id, firstHopTarget.id, 'HTTP', { method: 'GET', path: urlPath }, () => {
                // Si NAT, simuler le transfert interne
                if (targetModem && targetModem.id !== actualTarget.id) {
                    setTimeout(() => {
                        sendPacket(targetModem.id, actualTarget.id, 'HTTP', { method: 'GET', path: urlPath, nat: true }, () => {
                            processHttpResponse();
                        });
                    }, 100);
                } else {
                    processHttpResponse();
                }
            });

            function processHttpResponse() {
                const filePath = '/var/www' + (urlPath === '/' ? '/index.html' : urlPath);
                const file = actualTarget.filesystem[filePath];

                setTimeout(() => {
                    if (file?.type === 'file') {
                        // Réponse via NAT si applicable
                        if (targetModem && targetModem.id !== actualTarget.id) {
                            sendPacket(actualTarget.id, targetModem.id, 'HTTP', { status: 200, nat: true }, () => {
                                sendPacket(targetModem.id, fromDevice.id, 'HTTP', { status: 200 }, () => {
                                    addLog(`HTTP 200 OK`, 'success');
                                    resolve({ success: true, status: 200, content: file.content });
                                });
                            });
                        } else {
                            sendPacket(actualTarget.id, fromDevice.id, 'HTTP', { status: 200 }, () => {
                                addLog(`HTTP 200 OK`, 'success');
                                resolve({ success: true, status: 200, content: file.content });
                            });
                        }
                    } else {
                        const errorResponse = () => {
                            addLog(`HTTP 404 Not Found`, 'error');
                            resolve({
                                success: false,
                                status: 404,
                                content: '<html><body><h1>404 Not Found</h1></body></html>'
                            });
                        };

                        if (targetModem && targetModem.id !== actualTarget.id) {
                            sendPacket(actualTarget.id, targetModem.id, 'HTTP', { status: 404, nat: true }, () => {
                                sendPacket(targetModem.id, fromDevice.id, 'HTTP', { status: 404 }, errorResponse);
                            });
                        } else {
                            sendPacket(actualTarget.id, fromDevice.id, 'HTTP', { status: 404 }, errorResponse);
                        }
                    }
                }, 200);
            }
        });
    }, [addLog, findDeviceByIP, getNatConfig, sendPacket, findPath, doesPathCrossInternet]);

    const requestDHCP = React.useCallback(async (device) => {
        addLog('DHCP Discover', 'command');

        const connectedIds = connections
            .filter(c => c.from === device.id || c.to === device.id)
            .map(c => c.from === device.id ? c.to : c.from);

        let dhcpServer = null;
        for (const id of connectedIds) {
            const d = devices.find(dev => dev.id === id);
            if (d?.services?.dhcpserver?.running) {
                dhcpServer = d;
                break;
            }
            if (DEVICE_TYPES[d?.type]?.name === 'Switch') {
                const further = connections
                    .filter(c => c.from === id || c.to === id)
                    .map(c => c.from === id ? c.to : c.from);
                for (const fid of further) {
                    const fd = devices.find(dev => dev.id === fid);
                    if (fd?.services?.dhcpserver?.running) {
                        dhcpServer = fd;
                        break;
                    }
                }
            }
        }

        if (!dhcpServer) {
            addLog('Aucun serveur DHCP trouvé', 'error');
            return { success: false };
        }

        const dhcp = dhcpServer.services.dhcpserver;
        const start = ipToInt(dhcp.poolStart);
        const end = ipToInt(dhcp.poolEnd);

        const usedIPs = new Set([
            ...devices.map(d => d.ip),
            ...dhcp.leases.map(l => l.ip)
        ].filter(Boolean));

        let newIP = null;
        for (let i = start; i <= end; i++) {
            const ip = intToIp(i);
            if (!usedIPs.has(ip)) {
                newIP = ip;
                break;
            }
        }

        if (!newIP) {
            addLog('Pool DHCP épuisé', 'error');
            return { success: false };
        }

        return new Promise(resolve => {
            sendPacket(device.id, dhcpServer.id, 'DHCP', { type: 'discover' }, () => {
                setTimeout(() => {
                    sendPacket(dhcpServer.id, device.id, 'DHCP', { type: 'offer', ip: newIP }, () => {
                        updateDevice(device.id, {
                            ip: newIP,
                            mask: '255.255.255.0',
                            gateway: dhcpServer.interfaces?.[0]?.ip || dhcpServer.ip,
                            dns: dhcpServer.ip,
                            dhcpEnabled: true
                        });

                        const newLease = {
                            ip: newIP,
                            mac: device.mac,
                            hostname: device.name
                        };
                        updateDevice(dhcpServer.id, {
                            services: {
                                ...dhcpServer.services,
                                dhcpserver: {
                                    ...dhcp,
                                    leases: [...dhcp.leases, newLease]
                                }
                            }
                        });

                        addLog(`DHCP: ${device.name} → ${newIP}`, 'success');
                        resolve({ success: true, ip: newIP });
                    });
                }, 300);
            });
        });
    }, [connections, devices, sendPacket, updateDevice, addLog]);

    // ========== GESTION DES APPLICATIONS ==========
    const openApp = React.useCallback((deviceId, appType) => {
        const device = devices.find(d => d.id === deviceId);
        if (!device) return;

        const existing = openWindows.find(w => w.deviceId === deviceId && w.appType === appType);
        if (existing) {
            setOpenWindows(prev => [...prev.filter(w => w.id !== existing.id), existing]);
            return;
        }

        const appConfig = APP_TYPES[appType];
        setOpenWindows(prev => [...prev, {
            id: generateId(),
            deviceId,
            deviceName: device.name,
            appType,
            title: `${appConfig.name} - ${device.name}`,
            icon: appConfig.icon,
            x: 150 + prev.length * 30,
            y: 80 + prev.length * 30,
            width: appConfig.width,
            height: appConfig.height
        }]);
    }, [devices, openWindows]);

    const closeWindow = React.useCallback((windowId) => {
        setOpenWindows(prev => prev.filter(w => w.id !== windowId));
    }, []);

    const focusWindow = React.useCallback((windowId) => {
        setOpenWindows(prev => {
            const win = prev.find(w => w.id === windowId);
            return win ? [...prev.filter(w => w.id !== windowId), win] : prev;
        });
    }, []);

    // ========== DRAG & DROP ==========
    const handleMouseDown = React.useCallback((e, device) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseCanvasX = (e.clientX - rect.left - canvasOffset.x) / canvasScale;
        const mouseCanvasY = (e.clientY - rect.top - canvasOffset.y) / canvasScale;
        
        // Si l'appareil fait partie de la multi-sélection, déplacer tous les éléments sélectionnés
        if (selectedDevices.includes(device.id) && (selectedDevices.length > 1 || selectedAnnotations.texts.length > 0 || selectedAnnotations.rects.length > 0)) {
            // Stocker les positions initiales de tous les appareils sélectionnés
            const initialPositions = {};
            selectedDevices.forEach(id => {
                const d = devices.find(dev => dev.id === id);
                if (d) {
                    initialPositions[id] = { x: d.x, y: d.y };
                }
            });
            
            // Stocker les positions initiales des textes sélectionnés
            const initialTextPositions = {};
            selectedAnnotations.texts.forEach(id => {
                const t = annotations.texts.find(text => text.id === id);
                if (t) {
                    initialTextPositions[id] = { x: t.x, y: t.y };
                }
            });
            
            // Stocker les positions initiales des rectangles sélectionnés
            const initialRectPositions = {};
            selectedAnnotations.rects.forEach(id => {
                const r = annotations.rects.find(rect => rect.id === id);
                if (r) {
                    initialRectPositions[id] = { x: r.x, y: r.y };
                }
            });
            
            setDragging({
                id: device.id,
                offsetX: mouseCanvasX - device.x,
                offsetY: mouseCanvasY - device.y,
                multiSelect: true,
                initialPositions,
                initialTextPositions,
                initialRectPositions,
                startX: mouseCanvasX,
                startY: mouseCanvasY
            });
        } else {
            setDragging({
                id: device.id,
                offsetX: mouseCanvasX - device.x,
                offsetY: mouseCanvasY - device.y
            });
        }
    }, [canvasScale, canvasOffset, selectedDevices, selectedAnnotations, devices, annotations]);

    const handleMouseMove = React.useCallback((e) => {
        if (!dragging || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseCanvasX = (e.clientX - rect.left - canvasOffset.x) / canvasScale;
        const mouseCanvasY = (e.clientY - rect.top - canvasOffset.y) / canvasScale;
        
        if (dragging.multiSelect) {
            // Déplacer tous les appareils sélectionnés
            const deltaX = mouseCanvasX - dragging.startX;
            const deltaY = mouseCanvasY - dragging.startY;
            
            setDevices(prev => prev.map(d => {
                if (dragging.initialPositions[d.id]) {
                    return {
                        ...d,
                        x: Math.max(40, dragging.initialPositions[d.id].x + deltaX),
                        y: Math.max(40, dragging.initialPositions[d.id].y + deltaY)
                    };
                }
                return d;
            }));
            
            // Déplacer aussi les annotations sélectionnées
            if (dragging.initialTextPositions || dragging.initialRectPositions) {
                setAnnotations(prev => ({
                    texts: prev.texts.map(t => {
                        if (dragging.initialTextPositions && dragging.initialTextPositions[t.id]) {
                            return {
                                ...t,
                                x: dragging.initialTextPositions[t.id].x + deltaX,
                                y: dragging.initialTextPositions[t.id].y + deltaY
                            };
                        }
                        return t;
                    }),
                    rects: prev.rects.map(r => {
                        if (dragging.initialRectPositions && dragging.initialRectPositions[r.id]) {
                            return {
                                ...r,
                                x: dragging.initialRectPositions[r.id].x + deltaX,
                                y: dragging.initialRectPositions[r.id].y + deltaY
                            };
                        }
                        return r;
                    })
                }));
            }
        } else {
            const newX = mouseCanvasX - dragging.offsetX;
            const newY = mouseCanvasY - dragging.offsetY;
            updateDevice(dragging.id, {
                x: Math.max(40, newX),
                y: Math.max(40, newY)
            });
        }
    }, [dragging, updateDevice, canvasScale, canvasOffset, setDevices, setAnnotations]);

    const handleMouseUp = React.useCallback(() => {
        setDragging(null);
    }, []);
    
    // Handler pour le déplacement groupé déclenché depuis une annotation
    const handleAnnotationMultiDrag = React.useCallback((e, canvasCoords) => {
        // Stocker les positions initiales de tous les appareils sélectionnés
        const initialPositions = {};
        selectedDevices.forEach(id => {
            const d = devices.find(dev => dev.id === id);
            if (d) {
                initialPositions[id] = { x: d.x, y: d.y };
            }
        });
        
        // Stocker les positions initiales des textes sélectionnés
        const initialTextPositions = {};
        selectedAnnotations.texts.forEach(id => {
            const t = annotations.texts.find(text => text.id === id);
            if (t) {
                initialTextPositions[id] = { x: t.x, y: t.y };
            }
        });
        
        // Stocker les positions initiales des rectangles sélectionnés
        const initialRectPositions = {};
        selectedAnnotations.rects.forEach(id => {
            const r = annotations.rects.find(rect => rect.id === id);
            if (r) {
                initialRectPositions[id] = { x: r.x, y: r.y };
            }
        });
        
        setDragging({
            id: 'multi-annotation',
            multiSelect: true,
            initialPositions,
            initialTextPositions,
            initialRectPositions,
            startX: canvasCoords.x,
            startY: canvasCoords.y
        });
    }, [selectedDevices, selectedAnnotations, devices, annotations]);

    // ========== MENU CONTEXTUEL ==========
    const handleContextMenu = React.useCallback((e, type, data) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, type, data });
    }, []);

    React.useEffect(() => {
        const handler = () => setContextMenu(null);
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, []);

    // ========== SAUVEGARDE / CHARGEMENT ==========
    const saveProject = React.useCallback(() => {
        const project = {
            ...exportProject(projectName, devices, connections),
            annotations: annotations
        };
        const json = JSON.stringify(project, null, 2);
        downloadFile(json, `${projectName.replace(/[^a-z0-9]/gi, '_')}.filius.json`);
        addLog(`Projet sauvegardé: ${projectName}`, 'success');
    }, [projectName, devices, connections, annotations, addLog]);

    const loadProject = React.useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const content = await readFile(file);
            const rawProject = JSON.parse(content);
            
            // Migrer le projet vers le format actuel
            const project = migrateProject(rawProject);

            setDevices(project.devices || []);
            setConnections(project.connections || []);
            setProjectName(project.name || 'Projet importé');
            setAnnotations(project.annotations || { texts: [], rects: [] });
            setSelectedDevice(null);
            setSelectedDevices([]);
            setSelectedAnnotations({ texts: [], rects: [] });
            setSelectedConnection(null);
            setSelectedAnnotation(null);
            setOpenWindows([]);
            setPackets([]);
            // Réinitialiser le zoom et l'offset pour centrer sur les appareils
            if (project.devices && project.devices.length > 0) {
                // Calculer le centre des appareils
                const avgX = project.devices.reduce((sum, d) => sum + (d.x || 0), 0) / project.devices.length;
                const avgY = project.devices.reduce((sum, d) => sum + (d.y || 0), 0) / project.devices.length;
                // Centrer la vue sur les appareils
                setCanvasOffset({ x: -avgX + 500, y: -avgY + 300 });
            }
            setCanvasScale(1);
            // Réinitialiser l'historique
            setHistory([]);
            setHistoryIndex(-1);

            addLog(`Projet chargé: ${project.name}`, 'success');
        } catch (err) {
            console.error('Erreur de chargement:', err);
            addLog(`Erreur de chargement: ${err.message || 'Format de fichier invalide'}`, 'error');
        }

        e.target.value = '';
    }, [addLog]);

    const newProject = React.useCallback(() => {
        if (devices.length > 0 && !confirm('Créer un nouveau projet ? Les modifications non sauvegardées seront perdues.')) {
            return;
        }
        setDevices([]);
        setConnections([]);
        setProjectName('Nouveau projet');
        setAnnotations({ texts: [], rects: [] });
        setSelectedDevice(null);
        setSelectedDevices([]);
        setSelectedAnnotations({ texts: [], rects: [] });
        setSelectedConnection(null);
        setSelectedAnnotation(null);
        setOpenWindows([]);
        setPackets([]);
        setLogs([]);
        setCanvasScale(1);
        setCanvasOffset({ x: 0, y: 0 });
        // Réinitialiser l'historique
        setHistory([]);
        setHistoryIndex(-1);
    }, [devices.length]);

    // ========== CONTEXTE ==========
    const contextValue = React.useMemo(() => ({
        devices,
        connections,
        addLog,
        updateDevice,
        findDeviceByIP,
        findPath,
        sendPacket,
        ping,
        traceroute,
        httpRequest,
        requestDHCP,
        openApp
    }), [
        devices, connections, addLog, updateDevice,
        findDeviceByIP, findPath, sendPacket,
        ping, traceroute, httpRequest, requestDHCP, openApp
    ]);

    // ========== RENDU ==========
    return (
        <NetworkContext.Provider value={contextValue}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
                {/* En-tête */}
                <Header
                    projectName={projectName}
                    setProjectName={setProjectName}
                    networkSpeed={networkSpeed}
                    setNetworkSpeed={setNetworkSpeed}
                    onNew={newProject}
                    onSave={saveProject}
                    onLoad={() => fileInputRef.current?.click()}
                    onHelp={() => setShowHelp(true)}
                    onUndo={undo}
                    onRedo={redo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                />

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={loadProject}
                    style={{ display: 'none' }}
                />

                {/* Corps principal */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Panneau composants */}
                    <ComponentPanel 
                        addDevice={addDevice}
                        startComponentDrag={startComponentDrag}
                        wireMode={wireMode}
                        setWireMode={setWireMode}
                        textMode={textMode}
                        setTextMode={setTextMode}
                        rectMode={rectMode}
                        setRectMode={setRectMode}
                    />

                    {/* Zone centrale */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {/* Canvas */}
                        <Canvas
                            ref={canvasRef}
                            devices={devices}
                            connections={connections}
                            packets={packets}
                            selectedDevice={selectedDevice}
                            setSelectedDevice={setSelectedDevice}
                            selectedDevices={selectedDevices}
                            setSelectedDevices={setSelectedDevices}
                            selectedAnnotations={selectedAnnotations}
                            setSelectedAnnotations={setSelectedAnnotations}
                            selectedConnection={selectedConnection}
                            setSelectedConnection={setSelectedConnection}
                            connecting={connecting}
                            wireMode={wireMode}
                            setWireMode={setWireMode}
                            selectedInterface={selectedInterface}
                            scale={canvasScale}
                            setScale={setCanvasScale}
                            offset={canvasOffset}
                            setOffset={setCanvasOffset}
                            annotations={annotations}
                            setAnnotations={setAnnotations}
                            textMode={textMode}
                            setTextMode={setTextMode}
                            rectMode={rectMode}
                            setRectMode={setRectMode}
                            selectedAnnotation={selectedAnnotation}
                            setSelectedAnnotation={setSelectedAnnotation}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onStartConnection={startConnection}
                            onCompleteConnection={completeConnection}
                            onContextMenu={handleContextMenu}
                            onOpenApp={openApp}
                            onDropDevice={addDeviceAtPosition}
                            onAnnotationMultiDrag={handleAnnotationMultiDrag}
                        />

                        {/* Console */}
                        <LogConsole logs={logs} onClear={() => setLogs([])} />
                    </div>

                    {/* Panneau propriétés */}
                    <PropertiesPanel
                        device={selectedDevice ? devices.find(d => d.id === selectedDevice) : null}
                        selectedDevices={selectedDevices}
                        selectedDeviceObjects={selectedDevices.map(id => devices.find(d => d.id === id)).filter(Boolean)}
                        connection={selectedConnection ? connections.find(c => c.id === selectedConnection) : null}
                        devices={devices}
                        connections={connections}
                        updateDevice={updateDevice}
                        updateMultipleDevices={(ids, updates) => {
                            setDevices(prev => prev.map(d => 
                                ids.includes(d.id) ? { ...d, ...updates } : d
                            ));
                        }}
                        deleteDevice={deleteDevice}
                        deleteMultipleDevices={(ids) => {
                            setConnections(prev => prev.filter(c => 
                                !ids.includes(c.from) && !ids.includes(c.to)
                            ));
                            setDevices(prev => prev.filter(d => !ids.includes(d.id)));
                            setSelectedDevices([]);
                            setSelectedDevice(null);
                        }}
                        duplicateDevice={duplicateDevice}
                        deleteConnection={deleteConnection}
                        openApp={openApp}
                        selectedInterface={selectedInterface}
                        setSelectedInterface={setSelectedInterface}
                    />
                </div>

                {/* Fenêtres d'applications */}
                {openWindows.map((win, i) => (
                    <AppWindow
                        key={win.id}
                        window={win}
                        zIndex={100 + i}
                        onClose={() => closeWindow(win.id)}
                        onFocus={() => focusWindow(win.id)}
                    />
                ))}

                {/* Menu contextuel */}
                {contextMenu && (
                    <ContextMenu
                        {...contextMenu}
                        selectedDevices={selectedDevices}
                        selectedAnnotations={selectedAnnotations}
                        onClose={() => setContextMenu(null)}
                        onDelete={
                            contextMenu.type === 'device' ? () => deleteDevice(contextMenu.data.id) :
                            contextMenu.type === 'connection' ? () => deleteConnection(contextMenu.data.id) :
                            contextMenu.type === 'rect' ? () => {
                                setAnnotations(prev => ({
                                    ...prev,
                                    rects: prev.rects.filter(r => r.id !== contextMenu.data.id)
                                }));
                                setSelectedAnnotation(null);
                            } :
                            null
                        }
                        onDuplicate={
                            contextMenu.type === 'device' ? () => {
                                // Si plusieurs éléments sont sélectionnés, dupliquer tout
                                const hasMultiSelection = selectedDevices.length > 1 || 
                                    selectedAnnotations.texts.length > 0 || 
                                    selectedAnnotations.rects.length > 0;
                                if (hasMultiSelection && selectedDevices.includes(contextMenu.data.id)) {
                                    duplicateSelection();
                                } else {
                                    duplicateDevice(contextMenu.data.id);
                                }
                            } : null
                        }
                        onDuplicateSelection={duplicateSelection}
                        onSendToBack={
                            contextMenu.type === 'rect' ? () => {
                                // Trouver le zIndex minimum et mettre ce rect en dessous
                                const minZ = Math.min(...annotations.rects.map(r => r.zIndex || 0));
                                setAnnotations(prev => ({
                                    ...prev,
                                    rects: prev.rects.map(r => 
                                        r.id === contextMenu.data.id 
                                            ? { ...r, zIndex: minZ - 1 }
                                            : r
                                    )
                                }));
                            } : null
                        }
                        onOpenApp={openApp}
                    />
                )}

                {/* Modale d'aide */}
                {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
                
                {/* Élément fantôme pour le drag depuis le panneau de composants */}
                {componentDrag && componentDrag.isDragging && (
                    <div style={{
                        position: 'fixed',
                        left: componentDrag.x - 35,
                        top: componentDrag.y - 35,
                        width: '70px',
                        height: '70px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(30, 41, 59, 0.9)',
                        border: '2px solid var(--accent-blue)',
                        borderRadius: '12px',
                        pointerEvents: 'none',
                        zIndex: 10000,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                    }}>
                        {DEVICE_TYPES[componentDrag.type]?.image ? (
                            <img 
                                src={DEVICE_TYPES[componentDrag.type].image} 
                                alt=""
                                style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                            />
                        ) : (
                            <span style={{ fontSize: '32px' }}>{DEVICE_TYPES[componentDrag.type]?.icon}</span>
                        )}
                        <span style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
                            {DEVICE_TYPES[componentDrag.type]?.name}
                        </span>
                    </div>
                )}
            </div>
        </NetworkContext.Provider>
    );
}

// Fonction utilitaire pour incrémenter une IP
function incrementIP(ip) {
    const parts = ip.split('.').map(Number);
    parts[3] = (parts[3] + 1) % 256;
    return parts.join('.');
}

// ========== RENDU RACINE ==========
ReactDOM.render(<FiliusWeb />, document.getElementById('root'));
