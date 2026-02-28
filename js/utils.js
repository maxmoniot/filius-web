/* ============================================
   FILIUS WEB - UTILITAIRES
   Fonctions utilitaires pour l'application
   ============================================ */

// Génère un identifiant unique
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Migre un appareil d'une ancienne version vers le format actuel
function migrateDevice(device, existingDevices = []) {
    const migrated = { ...device };
    
    // S'assurer que l'appareil a un ID
    if (!migrated.id) {
        migrated.id = generateId();
    }
    
    // S'assurer que l'appareil a une MAC
    if (!migrated.mac) {
        migrated.mac = generateMAC();
    }
    
    // Normaliser le type (ancienne version pouvait avoir des types différents)
    if (migrated.type) {
        migrated.type = migrated.type.toUpperCase();
    }
    
    // Gérer les anciens noms de propriétés
    if (migrated.passerelle !== undefined && migrated.gateway === undefined) {
        migrated.gateway = migrated.passerelle;
        delete migrated.passerelle;
    }
    if (migrated.masque !== undefined && migrated.mask === undefined) {
        migrated.mask = migrated.masque;
        delete migrated.masque;
    }
    
    // Valeurs par défaut pour les propriétés manquantes
    if (migrated.gateway === undefined) migrated.gateway = '';
    if (migrated.dns === undefined) migrated.dns = '';
    if (migrated.mask === undefined) migrated.mask = '255.255.255.0';
    if (migrated.dhcpEnabled === undefined) migrated.dhcpEnabled = false;
    if (migrated.interfaces === undefined) migrated.interfaces = [];
    if (migrated.arpTable === undefined) migrated.arpTable = {};
    if (migrated.routingTable === undefined) migrated.routingTable = [];
    
    // Services et filesystem par défaut
    if (!migrated.services) {
        migrated.services = createDefaultServices();
    }
    if (!migrated.filesystem) {
        migrated.filesystem = createDefaultFilesystem();
    }
    
    // Pour les modems, s'assurer qu'ils ont une IP publique
    if (migrated.type === 'MODEM') {
        if (!migrated.publicIP) {
            migrated.publicIP = generatePublicIP(existingDevices);
        }
        if (!migrated.natConfig) {
            migrated.natConfig = {
                tcp: { enabled: false, targetIP: '192.168.0.' },
                udp: { enabled: false, targetIP: '192.168.0.' },
                icmp: { enabled: false, targetIP: '192.168.0.' }
            };
        }
        if (migrated.modemActive === undefined) {
            migrated.modemActive = false;
        }
    }
    
    return migrated;
}

// Migre un projet complet d'une ancienne version
function migrateProject(project) {
    const migrated = {
        version: '2.0',
        name: project.name || project.projectName || 'Projet importé',
        savedAt: project.savedAt || new Date().toISOString(),
        devices: [],
        connections: project.connections || [],
        annotations: project.annotations || { texts: [], rects: [] }
    };
    
    // Migrer chaque appareil
    const devices = project.devices || [];
    devices.forEach(device => {
        const migratedDevice = migrateDevice(device, migrated.devices);
        migrated.devices.push(migratedDevice);
    });
    
    // S'assurer que les connexions ont des IDs
    migrated.connections = migrated.connections.map(conn => ({
        ...conn,
        id: conn.id || generateId()
    }));
    
    return migrated;
}

// Génère une adresse MAC aléatoire
function generateMAC() {
    const hex = '0123456789ABCDEF';
    let mac = '';
    for (let i = 0; i < 6; i++) {
        mac += hex[Math.floor(Math.random() * 16)] + hex[Math.floor(Math.random() * 16)];
        if (i < 5) mac += ':';
    }
    return mac;
}

// Génère une IP publique aléatoire (évite les plages privées)
// Utilise des plages réalistes : 80.x.x.x, 90.x.x.x, 185.x.x.x, 203.x.x.x
function generatePublicIP(existingDevices = []) {
    const publicPrefixes = [80, 90, 91, 185, 203, 217];
    const usedIPs = new Set();
    
    // Collecter toutes les IPs déjà utilisées
    existingDevices.forEach(d => {
        if (d.ip) usedIPs.add(d.ip);
        if (d.publicIP) usedIPs.add(d.publicIP);
        if (d.interfaces) {
            d.interfaces.forEach(i => {
                if (i.ip) usedIPs.add(i.ip);
            });
        }
    });
    
    // Générer une IP unique
    let attempts = 0;
    while (attempts < 100) {
        const prefix = publicPrefixes[Math.floor(Math.random() * publicPrefixes.length)];
        const b = Math.floor(Math.random() * 256);
        const c = Math.floor(Math.random() * 256);
        const d = Math.floor(Math.random() * 254) + 1; // Éviter .0 et .255
        const ip = `${prefix}.${b}.${c}.${d}`;
        
        if (!usedIPs.has(ip)) {
            return ip;
        }
        attempts++;
    }
    
    // Fallback si vraiment pas de chance
    return `203.0.113.${Math.floor(Math.random() * 254) + 1}`;
}

// Vérifie si une IP est publique (non privée)
function isPublicIP(ip) {
    if (!ip) return false;
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return false;
    
    // Plages privées : 10.x.x.x, 172.16-31.x.x, 192.168.x.x
    if (parts[0] === 10) return false;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
    if (parts[0] === 192 && parts[1] === 168) return false;
    if (parts[0] === 127) return false; // Loopback
    
    return true;
}

// Convertit une IP en entier
function ipToInt(ip) {
    if (!ip) return 0;
    const parts = ip.split('.').map(Number);
    return ((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + parts[3];
}

// Convertit un entier en IP
function intToIp(int) {
    return [
        (int >>> 24) & 255,
        (int >>> 16) & 255,
        (int >>> 8) & 255,
        int & 255
    ].join('.');
}

// Vérifie si une chaîne est une IP valide
function isValidIP(ip) {
    if (!ip) return false;
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(p => {
        const n = parseInt(p, 10);
        return !isNaN(n) && n >= 0 && n <= 255;
    });
}

// Calcule l'adresse réseau
function getNetworkAddress(ip, mask) {
    if (!ip || !mask) return null;
    const ipInt = ipToInt(ip);
    const maskInt = ipToInt(mask);
    return intToIp((ipInt & maskInt) >>> 0);
}

// Calcule l'adresse de broadcast
function getBroadcastAddress(ip, mask) {
    if (!ip || !mask) return null;
    const ipInt = ipToInt(ip);
    const maskInt = ipToInt(mask);
    const invMask = (~maskInt) >>> 0;
    return intToIp(((ipInt & maskInt) | invMask) >>> 0);
}

// Vérifie si deux IPs sont sur le même réseau
function isSameNetwork(ip1, ip2, mask) {
    if (!ip1 || !ip2 || !mask) return false;
    return getNetworkAddress(ip1, mask) === getNetworkAddress(ip2, mask);
}

// Trouve un appareil par son IP (y compris les interfaces de routeur)
function findDeviceByIPAddress(devices, ip, connections) {
    if (!ip) return null;
    
    // Collect all matches
    const matches = [];
    for (const dev of devices) {
        // Check main IP
        if (dev.ip === ip) {
            matches.push({ device: dev, interface: null });
        }
        // Check router interfaces
        if (dev.interfaces) {
            for (const iface of dev.interfaces) {
                if (iface.ip === ip) {
                    matches.push({ device: dev, interface: iface });
                }
            }
        }
    }
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0];
    // Prefer connected device
    if (connections) {
        const connected = matches.find(m => connections.some(c => c.from === m.device.id || c.to === m.device.id));
        if (connected) return connected;
    }
    return matches[0];
}

// Vérifie si un paquet peut être routé de sourceDevice vers destDevice
// Prend en compte les règles de routage IP (pas juste la connectivité physique)
function canRoutePacket(devices, connections, sourceDevice, destDevice) {
    if (!sourceDevice || !destDevice) {
        return { canRoute: false, reason: 'Appareil introuvable' };
    }
    if (!sourceDevice.ip) {
        return { canRoute: false, reason: `${sourceDevice.name} n'a pas d'adresse IP` };
    }
    if (!destDevice.ip) {
        return { canRoute: false, reason: `${destDevice.name} n'a pas d'adresse IP` };
    }
    
    const sourceMask = sourceDevice.mask || '255.255.255.0';
    const destMask = destDevice.mask || '255.255.255.0';
    
    // Même réseau ? Vérifier qu'il n'y a pas de routeur sur le chemin
    if (isSameNetwork(sourceDevice.ip, destDevice.ip, sourceMask)) {
        // Trouver le chemin physique
        const path = findPath(devices, connections, sourceDevice.id, destDevice.id);
        if (!path) {
            return { canRoute: false, reason: 'Pas de connexion physique' };
        }
        
        // Vérifier qu'aucun routeur n'est sur le chemin (sauf aux extrémités)
        for (let i = 1; i < path.length - 1; i++) {
            const intermediateDevice = devices.find(d => d.id === path[i]);
            if (intermediateDevice?.type === 'ROUTER') {
                return { 
                    canRoute: false, 
                    reason: `Routeur ${intermediateDevice.name} sur le chemin - passerelles requises` 
                };
            }
        }
        
        return { canRoute: true, directConnection: true };
    }
    
    // Réseaux différents : besoin d'un routeur
    // 1. La source doit avoir une passerelle configurée
    if (!sourceDevice.gateway || sourceDevice.gateway.trim() === '') {
        return { canRoute: false, reason: `Passerelle non configurée sur ${sourceDevice.name}` };
    }
    
    // 2. La passerelle doit être sur le même réseau que la source
    if (!isSameNetwork(sourceDevice.ip, sourceDevice.gateway, sourceMask)) {
        return { 
            canRoute: false, 
            reason: `Passerelle ${sourceDevice.gateway} n'est pas sur le même réseau que ${sourceDevice.name} (${sourceDevice.ip})` 
        };
    }
    
    // 3. Trouver l'appareil qui a l'IP de la passerelle
    const gatewayResult = findDeviceByIPAddress(devices, sourceDevice.gateway, connections);
    
    if (!gatewayResult) {
        return { canRoute: false, reason: `Passerelle ${sourceDevice.gateway} introuvable sur le réseau` };
    }
    
    const gatewayDevice = gatewayResult.device;
    
    // 4. La passerelle doit être un routeur
    if (gatewayDevice.type !== 'ROUTER') {
        return { canRoute: false, reason: `${gatewayDevice.name} (${sourceDevice.gateway}) n'est pas un routeur` };
    }
    
    // 5. Le routeur doit avoir une interface sur le réseau de destination
    const destNetworkAddr = getNetworkAddress(destDevice.ip, destMask);
    let hasRouteToDestination = false;
    let matchingInterface = null;
    
    for (const iface of gatewayDevice.interfaces || []) {
        const ifaceMask = iface.mask || '255.255.255.0';
        const ifaceNetworkAddr = getNetworkAddress(iface.ip, ifaceMask);
        const destNetworkWithIfaceMask = getNetworkAddress(destDevice.ip, ifaceMask);
        
        if (ifaceNetworkAddr === destNetworkWithIfaceMask) {
            hasRouteToDestination = true;
            matchingInterface = iface;
            break;
        }
    }
    
    if (!hasRouteToDestination) {
        return { 
            canRoute: false, 
            reason: `Le routeur ${gatewayDevice.name} n'a pas de route vers le réseau ${destNetworkAddr}` 
        };
    }
    
    // 6. Vérifier que la cible a une passerelle configurée pour le retour
    if (!destDevice.gateway || destDevice.gateway.trim() === '') {
        return { 
            canRoute: false, 
            reason: `Passerelle non configurée sur ${destDevice.name} (réponse impossible)` 
        };
    }
    
    // 7. La passerelle de la cible doit être sur le même réseau que la cible
    if (!isSameNetwork(destDevice.ip, destDevice.gateway, destMask)) {
        return { 
            canRoute: false, 
            reason: `Passerelle ${destDevice.gateway} de ${destDevice.name} n'est pas sur son réseau` 
        };
    }
    
    // 8. La passerelle de la cible doit être une interface du routeur
    const targetGatewayValid = gatewayDevice.interfaces?.some(iface => iface.ip === destDevice.gateway);
    if (!targetGatewayValid) {
        return { 
            canRoute: false, 
            reason: `Passerelle ${destDevice.gateway} de ${destDevice.name} ne correspond pas au routeur` 
        };
    }
    
    return { canRoute: true, router: gatewayDevice, routerInterface: matchingInterface, directConnection: false };
}

// Formate un timestamp pour l'affichage
function formatTimestamp() {
    return new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

// Clone profond d'un objet
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Crée un système de fichiers par défaut
function createDefaultFilesystem() {
    return deepClone(DEFAULT_FILESYSTEM);
}

// Crée les services par défaut
function createDefaultServices() {
    return deepClone(DEFAULT_SERVICES);
}

// Crée un nouvel appareil avec les valeurs par défaut
function createDevice(type, existingDevices, x, y) {
    const deviceType = DEVICE_TYPES[type];
    const count = existingDevices.filter(d => d.type === type).length;

    // Position par défaut au centre du canvas virtuel (5000x5000)
    // Si non spécifiée, placer autour de (2500, 2000) avec un peu d'aléatoire
    const posX = (x !== undefined) ? x : 2350 + Math.random() * 300;
    const posY = (y !== undefined) ? y : 1850 + Math.random() * 300;

    const device = {
        id: generateId(),
        type,
        name: `${deviceType.name} ${count}`,
        x: posX,
        y: posY,
        mac: generateMAC(),
        // IP par défaut 192.168.0.1 pour tous les appareils avec IP (sauf routeur qui n'en a pas directement)
        ip: deviceType.hasIP && !deviceType.isRouter ? '192.168.0.1' : null,
        mask: '255.255.255.0',
        // Passerelle et DNS vides par défaut
        gateway: '',
        dns: '',
        dhcpEnabled: false,
        modemActive: deviceType.isModem ? false : undefined,
        // Le routeur commence sans interfaces, elles seront créées dynamiquement selon les câbles
        interfaces: [],
        services: createDefaultServices(),
        filesystem: createDefaultFilesystem(),
        arpTable: {},
        routingTable: []
    };

    // Les modems ont une IP publique et une configuration NAT simplifiée
    if (deviceType.isModem) {
        device.publicIP = generatePublicIP(existingDevices);
        // Configuration NAT simplifiée : protocoles + IP de redirection
        device.natConfig = {
            tcp: { enabled: false, targetIP: '192.168.0.' },
            udp: { enabled: false, targetIP: '192.168.0.' },
            icmp: { enabled: false, targetIP: '192.168.0.' }
        };
    }

    return device;
}

// Exporte un projet en JSON
function exportProject(projectName, devices, connections) {
    return {
        version: '2.0',
        name: projectName,
        savedAt: new Date().toISOString(),
        devices: devices.map(d => ({
            ...d,
            arpTable: {} // Nettoyer les données temporaires
        })),
        connections
    };
}

// Vérifie si un appareil peut envoyer des paquets vers Internet
// Retourne { canReach: true, modem } ou { canReach: false, reason }
function canReachInternet(devices, connections, sourceDevice) {
    if (!sourceDevice) {
        return { canReach: false, reason: 'Appareil introuvable' };
    }
    if (!sourceDevice.ip) {
        return { canReach: false, reason: `${sourceDevice.name} n'a pas d'adresse IP` };
    }
    
    const sourceMask = sourceDevice.mask || '255.255.255.0';
    
    // Trouver le modem local via BFS physique
    const visited = new Set();
    const queue = [{ id: sourceDevice.id, path: [sourceDevice.id] }];
    let foundModem = null;
    let pathToModem = [];
    
    while (queue.length > 0 && !foundModem) {
        const { id: currentId, path } = queue.shift();
        if (visited.has(currentId)) continue;
        visited.add(currentId);
        
        const current = devices.find(d => d.id === currentId);
        if (current?.type === 'MODEM' && current.publicIP) {
            foundModem = current;
            pathToModem = path;
            break;
        }
        
        connections.forEach(conn => {
            let neighborId = null;
            if (conn.from === currentId) neighborId = conn.to;
            else if (conn.to === currentId) neighborId = conn.from;
            
            if (neighborId && !visited.has(neighborId)) {
                queue.push({ id: neighborId, path: [...path, neighborId] });
            }
        });
    }
    
    if (!foundModem) {
        return { canReach: false, reason: 'Pas de connexion à Internet (aucun modem trouvé)' };
    }
    
    // Vérifier si on a besoin d'une passerelle pour atteindre le modem
    // On regarde si le chemin physique contient un routeur
    let firstRouter = null;
    for (const nodeId of pathToModem) {
        const node = devices.find(d => d.id === nodeId);
        if (node?.type === 'ROUTER') {
            firstRouter = node;
            break;
        }
    }
    
    // Si pas de routeur sur le chemin, on est directement connecté au modem (via switch)
    // Dans ce cas, pas besoin de passerelle
    if (!firstRouter) {
        return { canReach: true, modem: foundModem };
    }
    
    // Il y a un routeur sur le chemin → on doit vérifier la configuration de routage
    // La source doit avoir une passerelle configurée vers ce routeur
    
    if (!sourceDevice.gateway || sourceDevice.gateway.trim() === '') {
        return { 
            canReach: false, 
            reason: `Passerelle non configurée sur ${sourceDevice.name}` 
        };
    }
    
    // Vérifier que la passerelle est sur le même réseau que la source
    if (!isSameNetwork(sourceDevice.ip, sourceDevice.gateway, sourceMask)) {
        return { 
            canReach: false, 
            reason: `Passerelle ${sourceDevice.gateway} n'est pas sur le même réseau que ${sourceDevice.name}` 
        };
    }
    
    // Vérifier que la passerelle existe (correspond à une interface du routeur)
    const gatewayResult = findDeviceByIPAddress(devices, sourceDevice.gateway, connections);
    
    if (!gatewayResult) {
        return { 
            canReach: false, 
            reason: `Passerelle ${sourceDevice.gateway} introuvable sur le réseau` 
        };
    }
    
    // Vérifier que l'appareil qui a cette IP est bien un routeur
    if (gatewayResult.device.type !== 'ROUTER') {
        return { 
            canReach: false, 
            reason: `${gatewayResult.device.name} (${sourceDevice.gateway}) n'est pas un routeur` 
        };
    }
    
    return { canReach: true, modem: foundModem, router: gatewayResult.device };
}

// Télécharge un fichier
function downloadFile(content, filename, mimeType = 'application/json') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Lit un fichier uploadé
function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Erreur de lecture'));
        reader.readAsText(file);
    });
}
