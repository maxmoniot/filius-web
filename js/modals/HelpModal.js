/* ============================================
   FILIUS WEB - MODALE D'AIDE
   Documentation intégrée à l'application
   ============================================ */

function HelpModal({ onClose }) {
    const [activeTab, setActiveTab] = React.useState('general');

    const tabs = [
        { id: 'general', label: '🎯 Général' },
        { id: 'usage', label: '🖱️ Utilisation' },
        { id: 'commands', label: '💻 Commandes' }
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal animate-scaleIn"
                style={{ width: '800px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="modal-header">
                    <h2 className="modal-title">
                        <span>❓</span> Aide - Filius Web
                    </h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {/* Tabs */}
                <div className="modal-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`modal-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Contenu */}
                <div className="modal-content" style={{ flex: 1, overflow: 'auto' }}>
                    {activeTab === 'general' && <HelpGeneral />}
                    {activeTab === 'usage' && <HelpUsage />}
                    {activeTab === 'commands' && <HelpCommands />}
                </div>
            </div>
        </div>
    );
}

function HelpGeneral() {
    return (
        <div style={{ lineHeight: '1.8' }}>
            <h3 style={{ color: 'var(--accent-blue)', marginBottom: '16px' }}>
                Qu'est-ce que Filius Web ?
            </h3>
            <p style={{ color: 'var(--text-dim)', marginBottom: '20px' }}>
                Filius Web est un simulateur de réseau éducatif permettant de créer des topologies
                réseau virtuelles et de comprendre le fonctionnement des protocoles TCP/IP.
                Idéal pour l'apprentissage en classe.
            </p>

            <h3 style={{ color: 'var(--accent-blue)', marginBottom: '16px' }}>
                Composants disponibles
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {Object.entries(DEVICE_TYPES).map(([key, type]) => (
                    <div key={key} style={{
                        padding: '12px',
                        background: 'var(--bg-card)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <span style={{ fontSize: '24px' }}>{type.icon}</span>
                        <div>
                            <div style={{ fontWeight: 500 }}>{type.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                                {type.canRunApps ? 'Peut exécuter des applications' :
                                    type.isRouter ? 'Connecte différents réseaux' : 'Équipement réseau'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <h3 style={{ color: 'var(--accent-blue)', marginTop: '24px', marginBottom: '16px' }}>
                💾 Sauvegarde des projets
            </h3>
            <p style={{ color: 'var(--text-dim)' }}>
                Vos projets sont sauvegardés au format JSON. Utilisez <strong>Sauvegarder</strong> pour
                télécharger votre réseau et <strong>Ouvrir</strong> pour le recharger plus tard.
            </p>
        </div>
    );
}

function HelpUsage() {
    return (
        <div style={{ lineHeight: '1.8' }}>
            <h3 style={{ color: 'var(--accent-blue)', marginBottom: '16px' }}>Interface unifiée</h3>
            <p style={{ color: 'var(--text-dim)', marginBottom: '16px' }}>
                Filius Web combine conception et simulation dans une interface unique.
                Vous pouvez modifier votre réseau et tester les connexions simultanément.
            </p>
            
            <h3 style={{ color: 'var(--accent-yellow)', marginTop: '24px', marginBottom: '16px' }}>🔨 Construire le réseau</h3>
            <ul style={{ color: 'var(--text-dim)', paddingLeft: '20px' }}>
                <li style={{ marginBottom: '12px' }}>
                    <strong>Ajouter un composant :</strong> Cliquez sur un élément dans le panneau de gauche ou glissez-déposez
                </li>
                <li style={{ marginBottom: '12px' }}>
                    <strong>Déplacer :</strong> Glissez les appareils sur le canvas
                </li>
                <li style={{ marginBottom: '12px' }}>
                    <strong>Connecter :</strong> Cliquez sur le bouton 🔗 d'un appareil, puis sur un autre appareil
                </li>
                <li style={{ marginBottom: '12px' }}>
                    <strong>Configurer :</strong> Sélectionnez un appareil pour modifier ses propriétés IP dans le panneau de droite
                </li>
                <li style={{ marginBottom: '12px' }}>
                    <strong>Supprimer :</strong> Clic droit → Supprimer, ou touche Suppr
                </li>
                <li style={{ marginBottom: '12px' }}>
                    <strong>Multi-sélection :</strong> Ctrl + glisser pour sélectionner plusieurs appareils, Ctrl + clic pour ajouter/retirer
                </li>
                <li>
                    <strong>Annotations :</strong> Ajoutez du texte ou des rectangles via les boutons T et ⬜
                </li>
            </ul>

            <h3 style={{ color: 'var(--accent-green)', marginTop: '24px', marginBottom: '16px' }}>▶️ Tester le réseau</h3>
            <ul style={{ color: 'var(--text-dim)', paddingLeft: '20px' }}>
                <li style={{ marginBottom: '12px' }}>
                    <strong>Ouvrir une application :</strong> Double-cliquez sur un PC ou serveur
                </li>
                <li style={{ marginBottom: '12px' }}>
                    <strong>Terminal :</strong> Exécutez des commandes réseau (ping, ipconfig...)
                </li>
                <li style={{ marginBottom: '12px' }}>
                    <strong>Navigateur :</strong> Accédez aux serveurs web du réseau
                </li>
                <li style={{ marginBottom: '12px' }}>
                    <strong>Serveurs :</strong> Configurez et démarrez les services (Web, DNS, DHCP)
                </li>
                <li>
                    <strong>Console :</strong> Consultez les logs des événements réseau en bas de l'écran
                </li>
            </ul>
            
            <h3 style={{ color: 'var(--accent-cyan)', marginTop: '24px', marginBottom: '16px' }}>🖱️ Navigation</h3>
            <ul style={{ color: 'var(--text-dim)', paddingLeft: '20px' }}>
                <li style={{ marginBottom: '12px' }}>
                    <strong>Zoom :</strong> Molette de la souris
                </li>
                <li style={{ marginBottom: '12px' }}>
                    <strong>Déplacer la vue :</strong> Clic gauche sur zone vide + glisser, ou clic molette
                </li>
                <li>
                    <strong>Sauvegarder :</strong> Utilisez le bouton Sauvegarder pour télécharger votre projet (fichier JSON)
                </li>
            </ul>

            <div style={{
                marginTop: '24px',
                padding: '16px',
                background: 'rgba(210, 153, 34, 0.1)',
                borderRadius: '8px',
                borderLeft: '4px solid var(--accent-yellow)'
            }}>
                <strong>💡 Conseil :</strong> Planifiez votre réseau avant de commencer.
                Dessinez un schéma sur papier avec les adresses IP.
            </div>
        </div>
    );
}

function HelpCommands() {
    const commands = [
        ['ping <ip>', 'Teste la connectivité vers une adresse IP'],
        ['traceroute <ip>', 'Affiche le chemin vers une destination'],
        ['ipconfig', 'Affiche la configuration réseau'],
        ['arp -a', 'Affiche la table ARP (IP ↔ MAC)'],
        ['nslookup <nom>', 'Résout un nom de domaine via DNS'],
        ['dhcp', 'Demande une IP au serveur DHCP'],
        ['netstat', 'Liste les connexions actives'],
        ['hostname', 'Affiche le nom de la machine'],
        ['ls [chemin]', 'Liste le contenu d\'un répertoire'],
        ['cat <fichier>', 'Affiche le contenu d\'un fichier'],
        ['curl <url>', 'Effectue une requête HTTP'],
        ['clear', 'Efface l\'écran du terminal']
    ];

    return (
        <div>
            <h3 style={{ color: 'var(--accent-cyan)', marginBottom: '16px' }}>Commandes Terminal</h3>
            <div style={{
                background: '#0d1117',
                borderRadius: '8px',
                padding: '16px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '13px'
            }}>
                {commands.map(([cmd, desc], i) => (
                    <div key={i} style={{ marginBottom: '10px', display: 'flex' }}>
                        <span style={{ color: 'var(--accent-cyan)', width: '180px', flexShrink: 0 }}>{cmd}</span>
                        <span style={{ color: 'var(--text-dim)' }}>{desc}</span>
                    </div>
                ))}
            </div>

            <div style={{
                marginTop: '20px',
                padding: '12px',
                background: 'rgba(57, 197, 207, 0.1)',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--accent-cyan)'
            }}>
                💡 Utilisez les flèches ↑↓ pour naviguer dans l'historique des commandes
            </div>
        </div>
    );
}
