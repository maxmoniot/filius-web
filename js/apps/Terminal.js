/* ============================================
   FILIUS WEB - APPLICATION TERMINAL
   Émulateur de terminal avec commandes réseau
   ============================================ */

function TerminalApp({ device }) {
    const { ping, traceroute, httpRequest, requestDHCP, addLog, devices, connections } = useNetwork();

    const [history, setHistory] = React.useState([
        { type: 'system', text: `Filius Terminal - ${device.name}` },
        { type: 'system', text: 'Tapez "help" pour la liste des commandes.' },
        { type: 'prompt' }
    ]);
    const [input, setInput] = React.useState('');
    const [cmdHistory, setCmdHistory] = React.useState([]);
    const [historyIndex, setHistoryIndex] = React.useState(-1);
    const [isProcessing, setIsProcessing] = React.useState(false);

    const containerRef = React.useRef(null);
    const inputRef = React.useRef(null);

    // Auto-scroll
    React.useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [history]);

    // Ajoute des lignes à la sortie
    const addOutput = React.useCallback((lines) => {
        setHistory(prev => [
            ...prev.slice(0, -1),
            ...lines.map(l => typeof l === 'string' ? { type: 'output', text: l } : l),
            { type: 'prompt' }
        ]);
    }, []);

    // Exécute une commande
    const executeCommand = React.useCallback(async (cmd) => {
        const trimmed = cmd.trim();
        if (!trimmed) {
            setHistory(prev => [...prev.slice(0, -1), { type: 'prompt' }]);
            return;
        }

        // Ajouter la commande à l'historique
        setHistory(prev => [
            ...prev.slice(0, -1),
            { type: 'command', text: trimmed }
        ]);

        setCmdHistory(prev => [...prev, trimmed]);
        setHistoryIndex(-1);

        const parts = trimmed.split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        setIsProcessing(true);

        try {
            switch (command) {
                case 'help':
                    addOutput([
                        { type: 'info', text: '═══════════════════════════════════════' },
                        { type: 'info', text: '  COMMANDES DISPONIBLES' },
                        { type: 'info', text: '═══════════════════════════════════════' },
                        { type: 'output', text: '  ping <ip>         Test de connectivité' },
                        { type: 'output', text: '  traceroute <ip>   Trace la route' },
                        { type: 'output', text: '  ipconfig          Configuration IP' },
                        { type: 'output', text: '  arp -a            Table ARP' },
                        { type: 'output', text: '  nslookup <host>   Résolution DNS' },
                        { type: 'output', text: '  dhcp              Obtenir IP via DHCP' },
                        { type: 'output', text: '  netstat           Connexions actives' },
                        { type: 'output', text: '  hostname          Nom de la machine' },
                        { type: 'output', text: '  whoami            Utilisateur actuel' },
                        { type: 'output', text: '  date              Date et heure' },
                        { type: 'output', text: '  clear             Effacer l\'écran' },
                        { type: 'output', text: '  cat <file>        Afficher un fichier' },
                        { type: 'output', text: '  ls [path]         Lister les fichiers' },
                        { type: 'output', text: '  curl <url>        Requête HTTP' },
                        { type: 'info', text: '═══════════════════════════════════════' }
                    ]);
                    break;

                case 'ping':
                    if (!args[0]) {
                        addOutput([{ type: 'error', text: 'Usage: ping <adresse_ip>' }]);
                    } else {
                        addOutput([{ type: 'info', text: `Envoi de requêtes ping vers ${args[0]}...` }]);
                        await ping(device, args[0], 4);
                        setHistory(prev => [...prev, { type: 'prompt' }]);
                    }
                    break;

                case 'traceroute':
                case 'tracert':
                    if (!args[0]) {
                        addOutput([{ type: 'error', text: 'Usage: traceroute <adresse_ip>' }]);
                    } else {
                        await traceroute(device, args[0]);
                        setHistory(prev => [...prev, { type: 'prompt' }]);
                    }
                    break;

                case 'ipconfig':
                case 'ifconfig':
                    addOutput([
                        { type: 'info', text: `Configuration IP de ${device.name}` },
                        { type: 'info', text: '─────────────────────────────────' },
                        { type: 'output', text: `   Adresse MAC . . . . . : ${device.mac}` },
                        { type: 'output', text: `   Adresse IPv4. . . . . : ${device.ip || 'Non configurée'}` },
                        { type: 'output', text: `   Masque de sous-réseau : ${device.mask || 'Non configuré'}` },
                        { type: 'output', text: `   Passerelle par défaut : ${device.gateway || 'Non configurée'}` },
                        { type: 'output', text: `   Serveur DNS . . . . . : ${device.dns || 'Non configuré'}` },
                        { type: 'output', text: `   DHCP activé . . . . . : ${device.dhcpEnabled ? 'Oui' : 'Non'}` }
                    ]);
                    break;

                case 'arp':
                    const arpEntries = Object.entries(device.arpTable || {});
                    addOutput([
                        { type: 'info', text: 'Table ARP:' },
                        { type: 'output', text: '  Adresse IP          Adresse MAC           Type' },
                        ...(arpEntries.length > 0
                            ? arpEntries.map(([ip, mac]) => ({
                                type: 'output',
                                text: `  ${ip.padEnd(18)} ${mac}     dynamique`
                            }))
                            : [{ type: 'output', text: '  (table vide)' }])
                    ]);
                    break;

                case 'hostname':
                    addOutput([{ type: 'output', text: device.name }]);
                    break;

                case 'whoami':
                    addOutput([{ type: 'output', text: 'user' }]);
                    break;

                case 'date':
                    addOutput([{ type: 'output', text: new Date().toLocaleString('fr-FR') }]);
                    break;

                case 'clear':
                case 'cls':
                    setHistory([{ type: 'prompt' }]);
                    break;

                case 'dhcp':
                    addOutput([{ type: 'info', text: 'Recherche d\'un serveur DHCP...' }]);
                    const result = await requestDHCP(device);
                    if (result.success) {
                        addOutput([{ type: 'success', text: `Adresse IP obtenue: ${result.ip}` }]);
                    } else {
                        addOutput([{ type: 'error', text: 'Échec de la requête DHCP' }]);
                    }
                    break;

                case 'nslookup':
                    if (!args[0]) {
                        addOutput([{ type: 'error', text: 'Usage: nslookup <hostname>' }]);
                    } else {
                        const dnsMatches = devices.filter(d => d.ip === device.dns);
                        const dnsServer = dnsMatches.length > 1
                            ? (dnsMatches.find(d => connections.some(c => c.from === d.id || c.to === d.id)) || dnsMatches[0])
                            : dnsMatches[0] || null;
                        addOutput([
                            { type: 'output', text: `Serveur:  ${dnsServer?.name || 'inconnu'}` },
                            { type: 'output', text: `Address:  ${device.dns || 'non configuré'}` },
                            { type: 'output', text: '' }
                        ]);

                        if (dnsServer?.services?.dnsserver?.running) {
                            const record = dnsServer.services.dnsserver.records.find(
                                r => r.name === args[0] || r.name === args[0] + '.'
                            );
                            if (record) {
                                addOutput([
                                    { type: 'success', text: `Nom:    ${record.name}` },
                                    { type: 'success', text: `Address: ${record.ip}` }
                                ]);
                            } else {
                                addOutput([{ type: 'error', text: `*** Impossible de trouver ${args[0]}` }]);
                            }
                        } else {
                            addOutput([{ type: 'error', text: '*** Serveur DNS non disponible' }]);
                        }
                    }
                    break;

                case 'netstat':
                    addOutput([
                        { type: 'info', text: 'Connexions actives:' },
                        { type: 'output', text: '  Proto  Adresse locale     Adresse distante    État' },
                        { type: 'output', text: '  (aucune connexion active)' }
                    ]);
                    break;

                case 'ls':
                case 'dir':
                    const path = args[0] || '/home/user';
                    const dir = device.filesystem[path];
                    if (dir && dir.type === 'dir') {
                        addOutput([
                            { type: 'info', text: `Contenu de ${path}:` },
                            ...dir.children.map(name => {
                                const childPath = path === '/' ? `/${name}` : `${path}/${name}`;
                                const child = device.filesystem[childPath];
                                const isDir = child?.type === 'dir';
                                return {
                                    type: 'output',
                                    text: `  ${isDir ? '📁' : '📄'} ${name}${isDir ? '/' : ''}`
                                };
                            })
                        ]);
                    } else {
                        addOutput([{ type: 'error', text: `ls: ${path}: Aucun fichier ou dossier de ce type` }]);
                    }
                    break;

                case 'cat':
                    if (!args[0]) {
                        addOutput([{ type: 'error', text: 'Usage: cat <fichier>' }]);
                    } else {
                        const file = device.filesystem[args[0]];
                        if (file && file.type === 'file') {
                            addOutput(file.content.split('\n').map(line => ({ type: 'output', text: line })));
                        } else {
                            addOutput([{ type: 'error', text: `cat: ${args[0]}: Aucun fichier ou dossier de ce type` }]);
                        }
                    }
                    break;

                case 'curl':
                case 'wget':
                    if (!args[0]) {
                        addOutput([{ type: 'error', text: `Usage: ${command} <url>` }]);
                    } else {
                        const url = args[0].startsWith('http') ? args[0] : `http://${args[0]}`;
                        addOutput([{ type: 'info', text: `Connexion à ${url}...` }]);
                        const response = await httpRequest(device, url);
                        if (response.success) {
                            addOutput([
                                { type: 'success', text: `HTTP ${response.status}` },
                                ...response.content.substring(0, 500).split('\n').map(l => ({ type: 'output', text: l }))
                            ]);
                        } else {
                            addOutput([{ type: 'error', text: `Erreur: ${response.error}` }]);
                        }
                    }
                    break;

                default:
                    addOutput([{ type: 'error', text: `${command}: commande introuvable` }]);
            }
        } catch (err) {
            addOutput([{ type: 'error', text: `Erreur: ${err.message}` }]);
        }

        setIsProcessing(false);
    }, [device, ping, traceroute, httpRequest, requestDHCP, addOutput, devices, connections]);

    // Gestion du clavier
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
            const commands = ['ping', 'traceroute', 'ipconfig', 'arp', 'nslookup', 'dhcp', 'netstat', 'hostname', 'clear', 'ls', 'cat', 'curl', 'help'];
            const match = commands.find(c => c.startsWith(input.toLowerCase()));
            if (match) setInput(match);
        }
    };

    return (
        <div
            ref={containerRef}
            className="terminal"
            onClick={() => inputRef.current?.focus()}
        >
            {history.map((line, i) => (
                <div key={i} className={`terminal-line terminal-${line.type}`}>
                    {line.type === 'prompt' ? (
                        <div className="terminal-prompt">
                            <span className="terminal-prompt-user">{device.name}</span>
                            <span className="terminal-prompt-at">@</span>
                            <span className="terminal-prompt-host">{device.ip || 'localhost'}</span>
                            <span className="terminal-prompt-path">:~$ </span>
                            <input
                                ref={inputRef}
                                className="terminal-input"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isProcessing}
                                autoFocus
                            />
                            {isProcessing && <span className="animate-pulse">⏳</span>}
                        </div>
                    ) : line.type === 'command' ? (
                        <>
                            <span className="terminal-prompt-user">{device.name}</span>
                            <span className="terminal-prompt-at">@</span>
                            <span className="terminal-prompt-host">{device.ip || 'localhost'}</span>
                            <span className="terminal-prompt-path">:~$ </span>
                            <span className="terminal-output">{line.text}</span>
                        </>
                    ) : line.text}
                </div>
            ))}
        </div>
    );
}
