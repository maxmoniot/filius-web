/* ============================================
   FILIUS WEB - APPLICATION SERVEUR DNS
   Configuration et gestion des enregistrements DNS
   ============================================ */

function DNSServerApp({ device }) {
    const { updateDevice, addLog, devices, connections } = useNetwork();

    const service = device.services?.dnsserver || { running: false, port: 53, records: [] };
    const [newName, setNewName] = React.useState('');
    const [newIP, setNewIP] = React.useState('');

    // Trouver le modem du réseau local pour obtenir l'IP publique
    const findLocalModem = () => {
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
            dnsserver: { ...service, running: !service.running }
        };
        updateDevice(device.id, { services: newServices });
        addLog(
            `Serveur DNS ${!service.running ? 'démarré' : 'arrêté'} sur ${device.name}`,
            !service.running ? 'success' : 'warning'
        );
    };

    const addRecord = () => {
        if (!newName || !newIP) return;

        const newRecords = [...service.records, { name: newName, ip: newIP, type: 'A' }];
        const newServices = {
            ...device.services,
            dnsserver: { ...service, records: newRecords }
        };
        updateDevice(device.id, { services: newServices });
        setNewName('');
        setNewIP('');
        addLog(`DNS: Ajout de ${newName} → ${newIP}`, 'success');
    };

    const removeRecord = (index) => {
        const newRecords = service.records.filter((_, i) => i !== index);
        const newServices = {
            ...device.services,
            dnsserver: { ...service, records: newRecords }
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
                            Serveur DNS <span style={{ color: '#f0883e' }}>Port 53</span>
                        </div>
                        <div className="server-status-detail">
                            {service.records.length} enregistrement(s)
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

            {/* Avertissement redirection de ports */}
            {localModem && (
                <div style={{
                    padding: '12px',
                    background: 'rgba(210, 153, 34, 0.15)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--accent-yellow)',
                    marginBottom: '10px'
                }}>
                    ⚠️ <strong>Pensez à activer la redirection UDP</strong> sur le modem ({localModem.name}) pour que le serveur DNS soit accessible depuis Internet.
                </div>
            )}

            {/* Ajout d'enregistrement */}
            <div className="server-config">
                <div className="server-config-title">Ajouter un enregistrement</div>
                
                {/* Indication IP publique */}
                <div style={{
                    padding: '10px',
                    background: 'rgba(240, 136, 62, 0.1)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#f0883e',
                    marginBottom: '10px'
                }}>
                    💡 <strong>Important :</strong> L'adresse IP doit pointer vers l'<strong>IP publique du modem</strong> du serveur cible, pas vers son IP privée.
                    {localModem && (
                        <span> Exemple : <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '3px' }}>{localModem.publicIP}</code></span>
                    )}
                </div>

                <div className="flex gap-2" style={{ alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label className="properties-field-label">Nom d'hôte</label>
                        <input
                            type="text"
                            className="properties-field-input"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="www.exemple.fr"
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label className="properties-field-label">Adresse IP (publique)</label>
                        <input
                            type="text"
                            className="properties-field-input mono"
                            value={newIP}
                            onChange={(e) => setNewIP(e.target.value)}
                            placeholder="80.x.x.x"
                            style={{ color: '#f0883e' }}
                        />
                    </div>
                    <button
                        className="browser-go-btn"
                        onClick={addRecord}
                        style={{ padding: '8px 16px' }}
                    >
                        + Ajouter
                    </button>
                </div>
            </div>

            {/* Liste des enregistrements */}
            <div className="server-config" style={{ marginBottom: '10px' }}>
                <div className="server-config-title">Enregistrements DNS</div>
                <table className="server-table">
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Type</th>
                            <th>Adresse IP</th>
                            <th style={{ width: '50px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {service.records.map((record, i) => (
                            <tr key={i}>
                                <td className="font-mono">{record.name}</td>
                                <td style={{ color: 'var(--accent-cyan)' }}>{record.type}</td>
                                <td className="font-mono" style={{ color: '#f0883e' }}>{record.ip}</td>
                                <td>
                                    <button
                                        onClick={() => removeRecord(i)}
                                        style={{
                                            padding: '4px 8px',
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--accent-red)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {service.records.length === 0 && (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px' }}>
                                    Aucun enregistrement DNS
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Note d'aide */}
            <div style={{
                padding: '10px',
                background: 'rgba(88, 166, 255, 0.1)',
                borderRadius: '6px',
                fontSize: '11px',
                color: 'var(--accent-blue)'
            }}>
                💡 <strong>Configuration client :</strong> Les ordinateurs doivent avoir l'adresse du serveur DNS ({device.ip}) dans leur champ "Serveur DNS".
            </div>
        </div>
    );
}
