/* ============================================
   FILIUS WEB - APPLICATION SERVEUR WEB
   Configuration et contrôle du serveur HTTP
   ============================================ */

function WebServerApp({ device }) {
    const { updateDevice, addLog, devices, connections } = useNetwork();

    const service = device.services?.webserver || { running: false, port: 80, rootDir: '/var/www' };

    // Trouver le modem du réseau local pour obtenir l'IP publique
    const findLocalModem = () => {
        // Parcourir les connexions pour trouver un modem accessible
        const visited = new Set();
        const queue = [device.id];
        
        while (queue.length > 0) {
            const currentId = queue.shift();
            if (visited.has(currentId)) continue;
            visited.add(currentId);
            
            const currentDevice = devices.find(d => d.id === currentId);
            if (currentDevice?.type === 'MODEM' && currentDevice.publicIP) {
                return currentDevice;
            }
            
            // Ajouter les voisins
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
    };

    const localModem = findLocalModem();

    const toggleServer = () => {
        const newServices = {
            ...device.services,
            webserver: {
                ...service,
                running: !service.running
            }
        };
        updateDevice(device.id, { services: newServices });
        addLog(
            `Serveur Web ${!service.running ? 'démarré' : 'arrêté'} sur ${device.name}:${service.port}`,
            !service.running ? 'success' : 'warning'
        );
    };

    const updatePort = (port) => {
        const newServices = {
            ...device.services,
            webserver: { ...service, port: parseInt(port) || 80 }
        };
        updateDevice(device.id, { services: newServices });
    };

    return (
        <div className="server-app">
            {/* Statut */}
            <div className={`server-status ${service.running ? 'running' : ''}`}>
                <div className="server-status-info">
                    <span className={`status-dot ${service.running ? 'online' : 'offline'}`} />
                    <div>
                        <div className="server-status-name">
                            Serveur Web HTTP <span style={{ color: '#f0883e' }}>Port {service.port}</span>
                        </div>
                        <div className="server-status-detail">
                            {service.running ? `Actif` : 'Arrêté'}
                        </div>
                    </div>
                </div>
                <button
                    className={`server-toggle-btn ${service.running ? 'stop' : 'start'}`}
                    onClick={toggleServer}
                >
                    {service.running ? '⏹️ Arrêter' : '▶️ Démarrer'}
                </button>
            </div>

            {/* Configuration */}
            <div className="server-config">
                <div className="server-config-title">Configuration</div>
                
                <div className="properties-field">
                    <label className="properties-field-label">Port d'écoute</label>
                    <input
                        type="number"
                        className="properties-field-input mono"
                        value={service.port}
                        onChange={(e) => updatePort(e.target.value)}
                        disabled={service.running}
                        style={{ width: '100px' }}
                    />
                </div>

                <div className="properties-field">
                    <label className="properties-field-label">Répertoire racine</label>
                    <div className="properties-field-input mono" style={{
                        background: 'var(--bg-dark)',
                        color: 'var(--text-dim)'
                    }}>
                        {service.rootDir}
                    </div>
                </div>
            </div>

            {/* Info d'accès avec IP publique */}
            {service.running && localModem && (
                <div style={{
                    padding: '16px',
                    background: 'rgba(63, 185, 80, 0.1)',
                    borderRadius: '8px',
                    border: '1px solid var(--accent-green)'
                }}>
                    <div style={{ fontSize: '13px', color: 'var(--accent-green)', marginBottom: '8px' }}>
                        🌐 Serveur accessible à :
                    </div>
                    <div className="font-mono" style={{ fontSize: '14px', color: '#f0883e' }}>
                        http://{localModem.publicIP}/
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '8px' }}>
                        (IP locale : {device.ip}:{service.port})
                    </div>
                </div>
            )}

            {service.running && !localModem && (
                <div style={{
                    padding: '16px',
                    background: 'rgba(63, 185, 80, 0.1)',
                    borderRadius: '8px',
                    border: '1px solid var(--accent-green)'
                }}>
                    <div style={{ fontSize: '13px', color: 'var(--accent-green)', marginBottom: '8px' }}>
                        🌐 Serveur accessible localement :
                    </div>
                    <div className="font-mono" style={{ fontSize: '14px' }}>
                        http://{device.ip}:{service.port}/
                    </div>
                </div>
            )}

            {/* Avertissement redirection de ports */}
            {localModem && (
                <div style={{
                    padding: '12px',
                    background: 'rgba(210, 153, 34, 0.15)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--accent-yellow)',
                    marginTop: '10px'
                }}>
                    ⚠️ <strong>Pensez à activer la redirection TCP</strong> sur le modem ({localModem.name}) pour que le serveur soit accessible depuis Internet.
                </div>
            )}

            {/* Aide */}
            <div style={{
                padding: '12px',
                background: 'rgba(88, 166, 255, 0.1)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--accent-blue)',
                marginTop: '10px'
            }}>
                💡 Modifiez les fichiers dans <code>/var/www</code> avec l'éditeur de texte
            </div>
        </div>
    );
}
