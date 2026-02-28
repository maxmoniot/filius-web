/* ============================================
   FILIUS WEB - LIGNE DE COMMANDE
   Application style Filius avec réseau réaliste
   ============================================ */

function CommandLineApp({ device }) {
    const { devices, connections, sendPacket, updateDevice, findDeviceByIP } = useNetwork();

    // Logo ASCII correct comme dans Filius
    const asciiLogo = [
        '          sSSs   .S    S.    .S          S.      sSSs',
        '         d%%SP  .SS    SS.  .SS         .SS.    d%%SP',
        '        d%S\'    S%S    S%S  S%S         S%S%S  d%S\'',
        '        S%S     S%S    S%S  S%S         S%S    S%S',
        '        S&S     S&S    S&S  S&S         S&S    S&S',
        '        S&S_Ss  S&S    S&S  S&S         S&S    Y&Ss',
        '        S&S~SP  S&S    S&S  S&S         S&S    `S&&S',
        '        S&S     S&S    S&S  S&S         S&S      `S*S',
        '        S*b     S*b    d*S  S*b         d*S       l*S',
        '        S*S     S*S.  .S*S  S*S.       .S*S      .S*P',
        '        S*S     S*S   SSSbs S*S   SSSbs_sdSSS  sSS*S',
        '        S*S     S*S    YSSP S*S    YSSP~YSSY    YSS\'',
        '        SP      SP          SP',
        '        Y       Y           Y'
    ];

    const welcomeMessage = [
        '',
        ...asciiLogo,
        '',
        '================================================================================',
        'Utilise la commande \'help\' pour afficher la liste des commandes disponibles',
        'ou utilise \'help <commande>\' pour plus d\'information a la commande.',
        '================================================================================',
        ''
    ];

    const [lines, setLines] = React.useState([...welcomeMessage]);
    const [input, setInput] = React.useState('');
    const [historyIndex, setHistoryIndex] = React.useState(-1);
    const [isProcessing, setIsProcessing] = React.useState(false);

    // Historique persistant stocké dans le device
    const cmdHistory = device.commandHistory || [];

    const containerRef = React.useRef(null);
    const inputRef = React.useRef(null);

    // Scroll automatique à chaque nouvelle ligne
    React.useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [lines]);

    // Focus sur l'input au chargement
    React.useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // Refocus sur l'input après exécution d'une commande
    React.useEffect(() => {
        if (!isProcessing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isProcessing]);

    const print = React.useCallback((...newLines) => {
        setLines(prev => [...prev, ...newLines]);
    }, []);

    // Sauvegarder l'historique dans le device
    const saveHistory = React.useCallback((newHistory) => {
        if (updateDevice) {
            updateDevice(device.id, { commandHistory: newHistory });
        }
    }, [device.id, updateDevice]);

    // ============ UTILITAIRES RÉSEAU ============

    const ipToInt = (ip) => {
        if (!ip) return 0;
        const parts = ip.split('.').map(Number);
        return ((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + parts[3];
    };

    const getNetworkAddress = (ip, mask) => {
        if (!ip || !mask) return null;
        const ipInt = ipToInt(ip);
        const maskInt = ipToInt(mask);
        return (ipInt & maskInt) >>> 0;
    };

    const isSameNetwork = (ip1, ip2, mask) => {
        if (!ip1 || !ip2 || !mask) return false;
        return getNetworkAddress(ip1, mask) === getNetworkAddress(ip2, mask);
    };


    const findPhysicalPath = (fromId, toId, visited = new Set()) => {
        if (fromId === toId) return [fromId];
        visited.add(fromId);

        let neighbors = connections
            .filter(c => c.from === fromId || c.to === fromId)
            .map(c => c.from === fromId ? c.to : c.from)
            .filter(id => !visited.has(id));

        const currentDevice = devices.find(d => d.id === fromId);
        // Les modems avec IP publique peuvent communiquer entre eux via Internet
        if (currentDevice?.type === 'MODEM' && currentDevice.publicIP) {
            const activeModems = devices.filter(d => 
                d.type === 'MODEM' && d.publicIP && d.id !== fromId && !visited.has(d.id)
            );
            neighbors = [...new Set([...neighbors, ...activeModems.map(m => m.id)])];
        }

        for (const neighbor of neighbors) {
            const path = findPhysicalPath(neighbor, toId, new Set(visited));
            if (path) return [fromId, ...path];
        }
        return null;
    };

    const checkNetworkConnectivity = (sourceDevice, targetIP) => {
        if (!sourceDevice.ip) {
            return { reachable: false, error: 'Interface source non configuree.' };
        }

        const sourceMask = sourceDevice.mask || '255.255.255.0';
        
        const targetDevice = findDeviceByIP(targetIP);
        if (!targetDevice) {
            return { reachable: false, error: 'Hote de destination inaccessible.' };
        }

        if (targetDevice.id === sourceDevice.id) {
            return { reachable: true, target: targetDevice, path: [sourceDevice.id], isLocal: true };
        }

        const sameNet = isSameNetwork(sourceDevice.ip, targetIP, sourceMask);

        if (sameNet) {
            // Même réseau : vérifier que le chemin ne traverse pas de routeur
            // (les routeurs ne font pas de forwarding L2, seulement L3)
            const path = findPhysicalPath(sourceDevice.id, targetDevice.id);
            if (!path) {
                return { reachable: false, error: 'Hote de destination inaccessible (pas de route).' };
            }
            
            // Vérifier qu'aucun routeur n'est sur le chemin (sauf aux extrémités)
            for (let i = 1; i < path.length - 1; i++) {
                const intermediateDevice = devices.find(d => d.id === path[i]);
                if (intermediateDevice?.type === 'ROUTER') {
                    // Un routeur est sur le chemin - il faut des passerelles configurées
                    // même si les IPs sont sur le même réseau logique
                    return { reachable: false, error: 'Hote de destination inaccessible (routeur sur le chemin sans configuration).' };
                }
            }
            
            return { reachable: true, target: targetDevice, path };
        }

        // Réseaux différents : vérification stricte des passerelles
        
        // 1. La source doit avoir une passerelle configurée
        if (!sourceDevice.gateway || sourceDevice.gateway.trim() === '') {
            return { reachable: false, error: 'Reseau de destination inaccessible (pas de passerelle configuree).' };
        }

        // 2. La passerelle doit être sur le même réseau que la source
        if (!isSameNetwork(sourceDevice.ip, sourceDevice.gateway, sourceMask)) {
            return { reachable: false, error: `Passerelle ${sourceDevice.gateway} inaccessible (pas sur le meme reseau que ${sourceDevice.ip}).` };
        }

        // 3. La passerelle doit exister sur le réseau
        const gatewayDevice = findDeviceByIP(sourceDevice.gateway);
        if (!gatewayDevice) {
            return { reachable: false, error: `Passerelle ${sourceDevice.gateway} introuvable sur le reseau.` };
        }

        // 4. La passerelle doit être un routeur
        if (gatewayDevice.type !== 'ROUTER') {
            return { reachable: false, error: `Passerelle ${sourceDevice.gateway} n'est pas un routeur.` };
        }

        // 5. Vérifier la connexion physique vers la passerelle
        const pathToGateway = findPhysicalPath(sourceDevice.id, gatewayDevice.id);
        if (!pathToGateway) {
            return { reachable: false, error: 'Passerelle inaccessible (pas de connexion physique).' };
        }

        // 6. Le routeur doit avoir une interface sur le réseau de destination
        let routerCanReach = false;
        let routerInterface = null;
        const targetMask = targetDevice.mask || '255.255.255.0';
        
        if (gatewayDevice.interfaces) {
            for (const iface of gatewayDevice.interfaces) {
                if (iface.ip && isSameNetwork(iface.ip, targetIP, iface.mask || targetMask)) {
                    routerCanReach = true;
                    routerInterface = iface;
                    break;
                }
            }
        }

        if (!routerCanReach) {
            return { reachable: false, error: 'Reseau de destination inaccessible (routeur n\'a pas d\'interface sur ce reseau).' };
        }

        // 7. Vérifier la connexion physique du routeur vers la cible
        const pathFromGateway = findPhysicalPath(gatewayDevice.id, targetDevice.id);
        if (!pathFromGateway) {
            return { reachable: false, error: 'Hote de destination inaccessible (pas de route depuis le routeur).' };
        }

        // 8. La cible doit avoir une passerelle configurée pour le retour
        if (!targetDevice.gateway || targetDevice.gateway.trim() === '') {
            return { reachable: false, error: 'Delai d\'attente depasse (pas de passerelle configuree sur la cible pour la reponse).' };
        }

        // 9. La passerelle de la cible doit être sur le même réseau que la cible
        if (!isSameNetwork(targetDevice.ip, targetDevice.gateway, targetMask)) {
            return { reachable: false, error: `Delai d\'attente depasse (passerelle ${targetDevice.gateway} de la cible pas sur son reseau).` };
        }

        // 10. La passerelle de la cible doit être une interface du routeur
        const targetGatewayValid = gatewayDevice.interfaces?.some(iface => iface.ip === targetDevice.gateway);
        if (!targetGatewayValid) {
            return { reachable: false, error: `Delai d\'attente depasse (passerelle ${targetDevice.gateway} de la cible ne correspond pas au routeur).` };
        }

        const fullPath = [...pathToGateway];
        for (let i = 1; i < pathFromGateway.length; i++) {
            fullPath.push(pathFromGateway[i]);
        }

        return { reachable: true, target: targetDevice, path: fullPath, viaGateway: gatewayDevice };
    };

    // ============ COMMANDES ============

    const executeCommand = React.useCallback(async (cmd) => {
        const trimmed = cmd.trim();
        print('/> ' + trimmed);
        
        if (!trimmed) return;

        // Ajouter à l'historique persistant
        const newHistory = [...cmdHistory, trimmed];
        saveHistory(newHistory);
        setHistoryIndex(-1);

        const parts = trimmed.split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        setIsProcessing(true);

        try {
            switch (command) {
                case 'help':
                    if (args[0]) {
                        showHelpFor(args[0]);
                    } else {
                        print(
                            '',
                            'Commandes disponibles:',
                            '',
                            '  ping <ip>         Teste la connectivite reseau',
                            '  traceroute <ip>   Trace la route vers une destination',
                            '  ipconfig          Affiche la configuration IP',
                            '  arp               Affiche la table ARP',
                            '  nslookup <host>   Resolution DNS',
                            '  hostname          Affiche le nom de l\'ordinateur',
                            '  clear             Efface l\'ecran',
                            '',
                            'Utilise \'help <commande>\' pour plus d\'informations.',
                            ''
                        );
                    }
                    break;

                case 'ping':
                    if (!args[0]) {
                        print('Utilisation: ping <adresse_ip>', '');
                    } else {
                        await executePing(args[0]);
                    }
                    break;

                case 'traceroute':
                case 'tracert':
                    if (!args[0]) {
                        print('Utilisation: traceroute <adresse_ip>', '');
                    } else {
                        await executeTraceroute(args[0]);
                    }
                    break;

                case 'ipconfig':
                case 'ifconfig':
                    executeIpconfig();
                    break;

                case 'arp':
                    executeArp();
                    break;

                case 'hostname':
                    print(device.name, '');
                    break;

                case 'clear':
                case 'cls':
                    setLines([...welcomeMessage]);
                    break;

                case 'nslookup':
                    if (!args[0]) {
                        print('Utilisation: nslookup <hostname>', '');
                    } else {
                        executeNslookup(args[0]);
                    }
                    break;

                default:
                    print(
                        `Commande '${command}' inconnue.`,
                        'Utilise \'help\' pour afficher la liste des commandes.',
                        ''
                    );
            }
        } catch (err) {
            print(`Erreur: ${err.message}`, '');
        }

        setIsProcessing(false);
    }, [device, devices, connections, print, welcomeMessage, cmdHistory, saveHistory]);

    const showHelpFor = (cmd) => {
        const helpTexts = {
            ping: [
                '',
                'ping <adresse_ip>',
                '',
                'Envoie des paquets ICMP Echo Request a l\'adresse specifiee',
                'pour tester la connectivite reseau.',
                '',
                'Le ping verifie:',
                '- La configuration IP de la source',
                '- L\'existence de la destination',
                '- Le routage via passerelle si necessaire',
                '- La connexion physique du reseau',
                '',
                'Exemple: ping 192.168.0.1',
                ''
            ],
            traceroute: [
                '',
                'traceroute <adresse_ip>',
                '',
                'Affiche le chemin parcouru par les paquets pour atteindre',
                'la destination specifiee.',
                '',
                'Exemple: traceroute 192.168.0.1',
                ''
            ],
            ipconfig: [
                '',
                'ipconfig',
                '',
                'Affiche la configuration IP de l\'interface reseau.',
                ''
            ],
            arp: [
                '',
                'arp',
                '',
                'Affiche la table ARP (correspondance IP / MAC).',
                ''
            ]
        };

        if (helpTexts[cmd]) {
            print(...helpTexts[cmd]);
        } else {
            print(`Pas d'aide disponible pour '${cmd}'.`, '');
        }
    };

    const executePing = async (targetIP) => {
        print('', `PING ${targetIP} (${targetIP})`);

        // Vérifier si c'est une IP publique d'un modem (NAT)
        const targetModem = devices.find(d => d.publicIP === targetIP && d.type === 'MODEM');
        
        if (targetModem) {
            // C'est une IP publique de modem - vérifier la config ICMP
            const icmpConfig = targetModem.natConfig?.icmp;
            
            // VERIFICATION DU ROUTAGE VERS INTERNET
            // Avant de pinguer une IP publique, vérifier que la source peut atteindre Internet
            const internetAccess = canReachInternet(devices, connections, device);
            if (!internetAccess.canReach) {
                for (let i = 1; i <= 4; i++) {
                    await new Promise(r => setTimeout(r, 800));
                    print(`Request timeout for icmp_seq ${i}`);
                }
                print('', internetAccess.reason, '');
                print(`--- ${targetIP} Statistiques des paquets ---`, '4 paquets transmis, 0 paquets recus, 100% paquets perdus', '');
                return;
            }
            
            const sourceModem = internetAccess.modem;
            
            if (!sourceModem) {
                // Afficher les timeouts un par un
                for (let i = 1; i <= 4; i++) {
                    await new Promise(r => setTimeout(r, 800));
                    print(`Request timeout for icmp_seq ${i}`);
                }
                print('', 'Reseau de destination inaccessible (pas de modem local).', '');
                print(`--- ${targetIP} Statistiques des paquets ---`, '4 paquets transmis, 0 paquets recus, 100% paquets perdus', '');
                return;
            }
            
            if (sourceModem.id === targetModem.id) {
                // Ping vers son propre modem - toujours OK
                for (let i = 1; i <= 4; i++) {
                    await new Promise(r => setTimeout(r, 100));
                    const time = Math.floor(1 + Math.random() * 5);
                    print(`From ${targetIP}: icmp_seq=${i} ttl=64 time=${time}ms`);
                }
                print('', `--- ${targetIP} Statistiques des paquets ---`, '4 paquets transmis, 4 paquets recus, 0% paquets perdus', '');
                return;
            }
            
            // Ping vers un autre modem via Internet
            if (!icmpConfig?.enabled) {
                // Afficher les timeouts un par un
                for (let i = 1; i <= 4; i++) {
                    await new Promise(r => setTimeout(r, 800));
                    print(`Request timeout for icmp_seq ${i}`);
                }
                print('', 'Delai d\'attente depasse (ICMP non redirige sur le modem distant).', '');
                print(`--- ${targetIP} Statistiques des paquets ---`, '4 paquets transmis, 0 paquets recus, 100% paquets perdus', '');
                return;
            }
            
            // ICMP activé - trouver l'appareil cible sur le réseau local du modem distant
            const findInternalDevice = (modem, targetInternalIP) => {
                const visited = new Set();
                const queue = [modem.id];
                while (queue.length > 0) {
                    const currentId = queue.shift();
                    if (visited.has(currentId)) continue;
                    visited.add(currentId);
                    const current = devices.find(d => d.id === currentId);
                    if (current?.ip === targetInternalIP && current.id !== modem.id) {
                        return current;
                    }
                    connections.forEach(conn => {
                        let neighborId = null;
                        if (conn.from === currentId) neighborId = conn.to;
                        else if (conn.to === currentId) neighborId = conn.from;
                        if (neighborId && !visited.has(neighborId)) {
                            const neighbor = devices.find(d => d.id === neighborId);
                            // Ne pas traverser d'autres modems
                            if (neighbor && (neighbor.type !== 'MODEM' || neighbor.id === modem.id)) {
                                queue.push(neighborId);
                            }
                        }
                    });
                }
                return null;
            };
            
            const internalTarget = findInternalDevice(targetModem, icmpConfig.targetIP);
            
            if (!internalTarget) {
                // Afficher les timeouts un par un
                for (let i = 1; i <= 4; i++) {
                    await new Promise(r => setTimeout(r, 800));
                    print(`Request timeout for icmp_seq ${i}`);
                }
                print('', `Delai d\'attente depasse (appareil ${icmpConfig.targetIP} introuvable derriere le modem).`, '');
                print(`--- ${targetIP} Statistiques des paquets ---`, '4 paquets transmis, 0 paquets recus, 100% paquets perdus', '');
                return;
            }
            
            // Ping via NAT réussi !
            for (let i = 1; i <= 4; i++) {
                if (sendPacket) {
                    await new Promise(resolve => {
                        sendPacket(device.id, sourceModem.id, 'ICMP', { seq: i, type: 'request' }, () => {
                            sendPacket(sourceModem.id, targetModem.id, 'ICMP', { seq: i, type: 'request', internet: true }, () => {
                                sendPacket(targetModem.id, internalTarget.id, 'ICMP', { seq: i, type: 'request', nat: true }, () => {
                                    sendPacket(internalTarget.id, targetModem.id, 'ICMP', { seq: i, type: 'reply', nat: true }, () => {
                                        sendPacket(targetModem.id, sourceModem.id, 'ICMP', { seq: i, type: 'reply', internet: true }, () => {
                                            sendPacket(sourceModem.id, device.id, 'ICMP', { seq: i, type: 'reply' }, resolve);
                                        });
                                    });
                                });
                            });
                        });
                    });
                } else {
                    await new Promise(r => setTimeout(r, 400));
                }
                
                const time = Math.floor(30 + Math.random() * 80);
                print(`From ${targetIP} (NAT -> ${icmpConfig.targetIP}): icmp_seq=${i} ttl=56 time=${time}ms`);
                await new Promise(r => setTimeout(r, 200));
            }
            
            print('', `--- ${targetIP} Statistiques des paquets ---`, '4 paquets transmis, 4 paquets recus, 0% paquets perdus', '');
            return;
        }

        // Logique normale pour les IP privées
        const connectivity = checkNetworkConnectivity(device, targetIP);

        if (!connectivity.reachable) {
            // Afficher les timeouts un par un
            for (let i = 1; i <= 4; i++) {
                await new Promise(r => setTimeout(r, 800));
                print(`Request timeout for icmp_seq ${i}`);
            }
            print('', connectivity.error, '');
            print(
                `--- ${targetIP} Statistiques des paquets ---`,
                '4 paquets transmis, 0 paquets recus, 100% paquets perdus',
                ''
            );
            return;
        }

        if (connectivity.isLocal) {
            for (let i = 1; i <= 4; i++) {
                await new Promise(r => setTimeout(r, 100));
                print(`From ${targetIP}: icmp_seq=${i} ttl=64 time=0ms`);
            }
            print(
                '',
                `--- ${targetIP} Statistiques des paquets ---`,
                '4 paquets transmis, 4 paquets recus, 0% paquets perdus',
                ''
            );
            return;
        }

        let received = 0;
        const path = connectivity.path;
        const target = connectivity.target;
        
        for (let i = 1; i <= 4; i++) {
            if (sendPacket && path.length >= 2) {
                await new Promise(resolve => {
                    sendPacket(device.id, target.id, 'ICMP', { seq: i, type: 'request' }, () => {
                        setTimeout(() => {
                            sendPacket(target.id, device.id, 'ICMP', { seq: i, type: 'reply' }, () => {
                                resolve();
                            });
                        }, 50);
                    });
                });
            } else {
                await new Promise(r => setTimeout(r, 300));
            }

            const time = Math.floor(50 + Math.random() * 150 + (path.length - 1) * 30);
            print(`From ${targetIP}: icmp_seq=${i} ttl=${64 - path.length + 1} time=${time}ms`);
            received++;

            await new Promise(r => setTimeout(r, 200));
        }

        const lost = 4 - received;
        const lostPercent = Math.round((lost / 4) * 100);

        print(
            '',
            `--- ${targetIP} Statistiques des paquets ---`,
            `4 paquets transmis, ${received} paquets recus, ${lostPercent}% paquets perdus`,
            ''
        );
    };

    const executeTraceroute = async (targetIP) => {
        print('', `traceroute to ${targetIP}, 30 hops max`);

        const connectivity = checkNetworkConnectivity(device, targetIP);

        if (!connectivity.reachable) {
            print('', connectivity.error, '');
            return;
        }

        if (connectivity.isLocal) {
            print(' 1  localhost (127.0.0.1)  0 ms');
            print('', 'Trace complete.', '');
            return;
        }

        const path = connectivity.path;

        for (let i = 0; i < path.length; i++) {
            await new Promise(r => setTimeout(r, 200));
            const hopDevice = devices.find(d => d.id === path[i]);
            const time = Math.floor(5 + Math.random() * 30 + i * 10);
            
            let hopIP = hopDevice?.ip || '???';
            if (hopDevice?.interfaces && i > 0) {
                const prevDevice = devices.find(d => d.id === path[i-1]);
                for (const iface of hopDevice.interfaces) {
                    if (prevDevice?.ip && isSameNetwork(iface.ip, prevDevice.ip, iface.mask || '255.255.255.0')) {
                        hopIP = iface.ip;
                        break;
                    }
                }
            }

            print(` ${i + 1}  ${hopIP}  ${time} ms`);
        }

        print('', 'Trace complete.', '');
    };

    const executeIpconfig = () => {
        print(
            '',
            'eth0:',
            `   Adresse MAC . . . . . : ${device.mac}`,
            `   Adresse IP. . . . . . : ${device.ip || 'Non configuree'}`,
            `   Masque. . . . . . . . : ${device.mask || 'Non configure'}`,
            `   Passerelle. . . . . . : ${device.gateway || 'Non configuree'}`,
            `   Serveur DNS . . . . . : ${device.dns || 'Non configure'}`,
            ''
        );
    };

    const executeArp = () => {
        const arpEntries = Object.entries(device.arpTable || {});
        
        print(
            '',
            'Table ARP:',
            'Adresse IP          Adresse MAC'
        );

        if (arpEntries.length === 0) {
            print('(table vide)');
        } else {
            arpEntries.forEach(([ip, mac]) => {
                print(`${ip.padEnd(20)}${mac}`);
            });
        }
        print('');
    };

    const executeNslookup = (hostname) => {
        // Chercher le serveur DNS - peut être local ou via NAT
        let dnsServer = findDeviceByIP(device.dns);
        let dnsViaModem = null;
        
        // Chercher aussi par IP publique (modem)
        if (!dnsServer && device.dns) {
            dnsServer = devices.find(d => d.publicIP === device.dns && d.type === 'MODEM');
        }
        
        // Si c'est un modem sans DNS, suivre la redirection NAT UDP
        if (dnsServer && dnsServer.type === 'MODEM' && !dnsServer.services?.dnsserver?.running) {
            const modem = dnsServer;
            if (modem.natConfig?.udp?.enabled && modem.natConfig.udp.targetIP) {
                // Trouver l'appareil interne via BFS
                const visited = new Set();
                const queue = [modem.id];
                dnsServer = null; // Reset pour chercher l'appareil interne
                
                while (queue.length > 0 && !dnsServer) {
                    const currentId = queue.shift();
                    if (visited.has(currentId)) continue;
                    visited.add(currentId);
                    const current = devices.find(d => d.id === currentId);
                    if (current?.ip === modem.natConfig.udp.targetIP && current.id !== modem.id) {
                        dnsServer = current;
                        dnsViaModem = modem;
                        break;
                    }
                    connections.forEach(conn => {
                        let neighborId = null;
                        if (conn.from === currentId) neighborId = conn.to;
                        else if (conn.to === currentId) neighborId = conn.from;
                        if (neighborId && !visited.has(neighborId)) {
                            const neighbor = devices.find(d => d.id === neighborId);
                            if (neighbor && (neighbor.type !== 'MODEM' || neighbor.id === modem.id)) {
                                queue.push(neighborId);
                            }
                        }
                    });
                }
            }
        }
        
        print(
            '',
            `Serveur: ${dnsServer?.name || 'inconnu'}${dnsViaModem ? ` (via ${dnsViaModem.publicIP})` : ''}`,
            `Address: ${dnsServer?.ip || device.dns || 'non configure'}`,
            ''
        );

        if (!device.dns) {
            print('Erreur: serveur DNS non configure', '');
            return;
        }

        if (!dnsServer) {
            print('Erreur: serveur DNS inaccessible', '');
            return;
        }

        if (dnsServer?.services?.dnsserver?.running) {
            const record = dnsServer.services.dnsserver.records.find(
                r => r.name === hostname
            );
            if (record) {
                print(
                    `Nom:     ${record.name}`,
                    `Address: ${record.ip}`,
                    ''
                );
            } else {
                print(`Erreur: ${hostname} non trouve`, '');
            }
        } else {
            print('Erreur: serveur DNS non disponible', '');
        }
    };

    const handleKeyDown = (e) => {
        if (isProcessing) return;

        if (e.key === 'Enter') {
            executeCommand(input);
            setInput('');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (cmdHistory.length > 0) {
                const newIndex = historyIndex < cmdHistory.length - 1 ? historyIndex + 1 : historyIndex;
                setHistoryIndex(newIndex);
                setInput(cmdHistory[cmdHistory.length - 1 - newIndex] || '');
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInput(cmdHistory[cmdHistory.length - 1 - newIndex] || '');
            } else {
                setHistoryIndex(-1);
                setInput('');
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const commands = ['ping', 'traceroute', 'ipconfig', 'arp', 'nslookup', 'hostname', 'clear', 'help'];
            const match = commands.find(c => c.startsWith(input.toLowerCase()));
            if (match) setInput(match);
        }
    };

    return (
        <div className="cmdline">
            <div
                ref={containerRef}
                className="cmdline-content"
                onClick={() => inputRef.current?.focus()}
            >
                {lines.map((line, i) => (
                    <div key={i} className="cmdline-line">{line}</div>
                ))}
                <div className="cmdline-input-line">
                    <span className="cmdline-prompt">/&gt;&nbsp;</span>
                    <input
                        ref={inputRef}
                        className="cmdline-input"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isProcessing}
                        autoFocus
                        spellCheck={false}
                    />
                </div>
            </div>
            <div className="cmdline-statusbar">
                🏠 Ecran d'accueil
            </div>
        </div>
    );
}
