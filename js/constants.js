/* ============================================
   FILIUS WEB - CONSTANTES
   Modifiez ce fichier pour personnaliser les appareils et applications
   ============================================ */

// Types d'appareils disponibles
const DEVICE_TYPES = {
    PC: {
        name: 'Ordinateur',
        icon: '💻',
        image: 'img/pc.png',
        color: '#58a6ff',
        hasIP: true,
        canRunApps: true,
        defaultApps: ['commandline', 'terminal', 'browser', 'explorer', 'texteditor']
    },
    LAPTOP: {
        name: 'Portable',
        icon: '💻',
        image: 'img/laptop.png',
        color: '#39c5cf',
        hasIP: true,
        canRunApps: true,
        defaultApps: ['commandline', 'terminal', 'browser', 'explorer', 'texteditor']
    },
    SERVER: {
        name: 'Serveur',
        icon: '🗄️',
        image: 'img/server.png',
        color: '#a371f7',
        hasIP: true,
        canRunApps: true,
        defaultApps: ['commandline', 'terminal', 'explorer', 'texteditor'],
        serverApps: ['webserver', 'dnsserver', 'dhcpserver']
    },
    SWITCH: {
        name: 'Switch',
        icon: '🔀',
        image: 'img/switch.png',
        color: '#d29922',
        hasIP: false,
        canRunApps: false,
        ports: 8
    },
    ROUTER: {
        name: 'Routeur',
        icon: '🔀',
        image: 'img/router.png',
        color: '#3fb950',
        hasIP: true,
        canRunApps: false,
        isRouter: true,
        interfaces: 2
    },
    MODEM: {
        name: 'Modem',
        icon: '📶',
        image: 'img/modem.png',
        color: '#f85149',
        hasIP: false,
        canRunApps: false,
        isModem: true,
        canActivate: true
    }
};

// Types d'applications
const APP_TYPES = {
    commandline: {
        name: 'Ligne de commande',
        icon: '⌨️',
        width: 650,
        height: 480,
        component: 'CommandLineApp'
    },
    terminal: {
        name: 'Terminal',
        icon: '💻',
        width: 650,
        height: 450,
        component: 'TerminalApp'
    },
    browser: {
        name: 'Navigateur Web',
        icon: '🌐',
        width: 800,
        height: 600,
        component: 'BrowserApp'
    },
    explorer: {
        name: 'Explorateur',
        icon: '📁',
        width: 600,
        height: 450,
        component: 'ExplorerApp'
    },
    texteditor: {
        name: 'Éditeur de texte',
        icon: '📝',
        width: 650,
        height: 500,
        component: 'TextEditorApp'
    },
    webserver: {
        name: 'Serveur Web',
        icon: '🌍',
        width: 500,
        height: 520,
        component: 'WebServerApp'
    },
    dnsserver: {
        name: 'Serveur DNS',
        icon: '📖',
        width: 550,
        height: 580,
        component: 'DNSServerApp'
    },
    dhcpserver: {
        name: 'Serveur DHCP',
        icon: '🔢',
        width: 550,
        height: 450,
        component: 'DHCPServerApp'
    }
};

// Catégories pour le panneau de composants
const COMPONENT_CATEGORIES = [
    {
        name: 'Terminaux',
        items: [
            { type: 'PC', tooltip: 'Ordinateur de bureau' },
            { type: 'LAPTOP', tooltip: 'Ordinateur portable' },
            { type: 'SERVER', tooltip: 'Serveur (Web, DNS, DHCP...)' }
        ]
    },
    {
        name: 'Réseau',
        items: [
            { type: 'SWITCH', tooltip: 'Commutateur réseau' },
            { type: 'ROUTER', tooltip: 'Routeur inter-réseaux' },
            { type: 'MODEM', tooltip: 'Modem (connexion sans fil entre modems actifs)' }
        ]
    }
];

// Couleurs des paquets par protocole
const PACKET_COLORS = {
    ICMP: '#3fb950',
    HTTP: '#58a6ff',
    DNS: '#a371f7',
    DHCP: '#d29922',
    ARP: '#db6d28',
    TCP: '#39c5cf'
};

// Configuration par défaut du réseau
const DEFAULT_NETWORK_CONFIG = {
    baseIP: '192.168.0.',
    startHost: 1,
    defaultMask: '255.255.255.0',
    defaultGateway: '',
    defaultDNS: ''
};

// Système de fichiers par défaut pour les appareils
const DEFAULT_FILESYSTEM = {
    '/': { type: 'dir', children: ['home', 'var', 'etc'] },
    '/home': { type: 'dir', children: ['user'] },
    '/home/user': { type: 'dir', children: ['documents'] },
    '/home/user/documents': { type: 'dir', children: [] },
    '/var': { type: 'dir', children: ['www', 'log'] },
    '/var/www': { type: 'dir', children: ['index.html'] },
    '/var/www/index.html': {
        type: 'file',
        content: `<!DOCTYPE html>
<html>
<head>
    <title>Bienvenue</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        h1 { color: #333; }
        .info { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <h1>🌐 Bienvenue sur ce serveur web</h1>
    <div class="info">
        <p>Ce serveur fonctionne avec <strong>Filius Web</strong>.</p>
        <p>Vous pouvez modifier cette page dans l'éditeur de fichiers.</p>
    </div>
</body>
</html>`
    },
    '/var/log': { type: 'dir', children: [] },
    '/etc': { type: 'dir', children: ['hosts', 'resolv.conf'] },
    '/etc/hosts': { type: 'file', content: '127.0.0.1 localhost\n' },
    '/etc/resolv.conf': { type: 'file', content: '' }
};

// Configuration des services par défaut
const DEFAULT_SERVICES = {
    webserver: { running: false, port: 80, rootDir: '/var/www' },
    dnsserver: { running: false, port: 53, records: [] },
    dhcpserver: {
        running: false,
        poolStart: '192.168.0.100',
        poolEnd: '192.168.0.200',
        leases: []
    }
};
