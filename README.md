# 🌐 Filius Web

Simulateur de réseau éducatif pour l'enseignement des protocoles TCP/IP.

**Fork web du logiciel [Filius](https://www.lernsoftware-filius.de/)** développé par l'Université de Siegen (Allemagne).

## ✨ Fonctionnalités

- **Interface unifiée** : Conception et simulation simultanées (pas de basculement de mode)
- **Composants réseau** : PC, Serveur, Switch, Routeur, Modem avec NAT
- **Services** : Serveur Web, DNS, DHCP
- **Applications** : Terminal, Navigateur, Explorateur de fichiers, Éditeur
- **Commandes** : ping, traceroute, ipconfig, nslookup, dhcp, arp, netstat, curl...
- **Visualisation** : Animation des paquets réseau en temps réel
- **Annotations** : Textes et rectangles pour documenter vos schémas
- **Multi-sélection** : Ctrl+glisser pour sélectionner plusieurs appareils
- **Sauvegarde** : Export/Import au format JSON

## 📁 Structure des fichiers

```
filius-web/
├── index.html              # Page HTML principale
├── css/
│   └── styles.css          # Tous les styles CSS
└── js/
    ├── constants.js        # Configuration (appareils, apps, couleurs...)
    ├── utils.js            # Fonctions utilitaires (IP, MAC, fichiers...)
    ├── context.js          # Contexte React partagé
    ├── App.js              # Composant principal + logique réseau
    ├── components/
    │   ├── Header.js       # Barre d'en-tête
    │   ├── ComponentPanel.js   # Panneau gauche (composants)
    │   ├── Canvas.js       # Zone de travail
    │   ├── DeviceNode.js   # Représentation d'un appareil
    │   ├── PropertiesPanel.js  # Panneau droit (propriétés)
    │   ├── LogConsole.js   # Console de logs
    │   ├── ContextMenu.js  # Menu clic-droit
    │   └── AppWindow.js    # Fenêtre d'application
    ├── apps/
    │   ├── Terminal.js     # Application Terminal
    │   ├── CommandLine.js  # Logique des commandes
    │   ├── Browser.js      # Application Navigateur
    │   ├── Explorer.js     # Application Explorateur
    │   ├── TextEditor.js   # Application Éditeur
    │   ├── WebServer.js    # Application Serveur Web
    │   ├── DNSServer.js    # Application Serveur DNS
    │   └── DHCPServer.js   # Application Serveur DHCP
    └── modals/
        └── HelpModal.js    # Fenêtre d'aide
```

## 🚀 Lancer le projet

### Option simple (Python)
```bash
cd filius-web
python3 -m http.server 8080
# Ouvrir http://localhost:8080
```

### Option Node.js
```bash
npx serve .
```

### Option PHP
```bash
php -S localhost:8080
```

## 🖱️ Raccourcis et interactions

| Action | Raccourci |
|--------|-----------|
| Zoom | Molette souris |
| Déplacer la vue | Clic gauche sur zone vide + glisser |
| Ouvrir Terminal | Double-clic sur PC/Serveur |
| Supprimer | Touche Suppr |
| Multi-sélection | Ctrl + glisser |
| Ajouter/Retirer de la sélection | Ctrl + clic |
| Mode câblage | Bouton 🔌 ou clic sur 🔗 d'un appareil |
| Quitter un mode | Clic droit |

## 🔧 Personnalisation

### Ajouter un nouvel appareil

Dans `js/constants.js` :
```javascript
const DEVICE_TYPES = {
    // ... appareils existants
    IMPRIMANTE: {
        name: 'Imprimante',
        icon: '🖨️',
        color: '#ff6b6b',
        hasIP: true,
        canRunApps: false
    }
};
```

### Ajouter une commande terminal

Dans `js/apps/CommandLine.js`, dans le `switch(command)` :
```javascript
case 'macommande':
    print('Résultat de ma commande');
    break;
```

### Modifier les couleurs

Dans `css/styles.css` :
```css
:root {
    --bg-dark: #1a1a2e;        /* Fond principal */
    --accent-blue: #4361ee;    /* Couleur d'accentuation */
    /* ... */
}
```

## 📚 Fonctionnalités NAT

Le modem supporte la redirection NAT pour les protocoles :
- **TCP** : Accès aux serveurs web depuis l'extérieur
- **UDP** : Accès aux serveurs DNS depuis l'extérieur  
- **ICMP** : Réponse aux ping depuis l'extérieur

Configuration via le panneau de propriétés du modem.

## 🎯 Cas d'usage pédagogiques

1. **Réseau local simple** : PC + Switch + Serveur Web
2. **Résolution DNS** : Ajouter un serveur DNS et configurer les clients
3. **Attribution DHCP** : Serveur DHCP + clients en mode automatique
4. **Routage inter-réseaux** : Routeur connectant deux sous-réseaux
5. **Accès Internet simulé** : Modems avec NAT pour connecter des réseaux distants

## 📝 Licence

Projet éducatif open source.

## 🙏 Crédits

- **Filius original** : [Université de Siegen](https://www.lernsoftware-filius.de/)
- **DIVA informatique** : Conseils et retours
- **Max** : Développement de la version web
