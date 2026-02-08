/* ============================================
   FILIUS WEB - APPLICATION SERVEUR DHCP
   Configuration et gestion des baux DHCP
   ============================================ */

function DHCPServerApp({ device }) {
    const { updateDevice, addLog } = useNetwork();

    const service = device.services?.dhcpserver || {
        running: false,
        poolStart: '192.168.0.100',
        poolEnd: '192.168.0.200',
        leases: []
    };

    const toggleServer = () => {
        const newServices = {
            ...device.services,
            dhcpserver: { ...service, running: !service.running }
        };
        updateDevice(device.id, { services: newServices });
        addLog(
            `Serveur DHCP ${!service.running ? 'démarré' : 'arrêté'} sur ${device.name}`,
            !service.running ? 'success' : 'warning'
        );
    };

    const updatePool = (field, value) => {
        const newServices = {
            ...device.services,
            dhcpserver: { ...service, [field]: value }
        };
        updateDevice(device.id, { services: newServices });
    };

    const clearLeases = () => {
        const newServices = {
            ...device.services,
            dhcpserver: { ...service, leases: [] }
        };
        updateDevice(device.id, { services: newServices });
        addLog('DHCP: Baux effacés', 'warning');
    };

    return (
        <div className="server-app">
            {/* Statut */}
            <div className={`server-status ${service.running ? 'running' : ''}`}>
                <div className="server-status-info">
                    <span className={`status-dot ${service.running ? 'online' : 'offline'}`} />
                    <div>
                        <div className="server-status-name">
                            Serveur DHCP <span style={{ color: '#f0883e' }}>Port 67-68</span>
                        </div>
                        <div className="server-status-detail">
                            {service.leases.length} bail(s) actif(s)
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

            {/* Note : DHCP est local uniquement */}
            <div style={{
                padding: '10px',
                background: 'rgba(88, 166, 255, 0.1)',
                borderRadius: '6px',
                fontSize: '11px',
                color: 'var(--accent-blue)',
                marginBottom: '10px'
            }}>
                ℹ️ Le DHCP fonctionne uniquement sur le <strong>réseau local</strong>. Pas besoin de redirection de port.
            </div>

            {/* Configuration du pool */}
            <div className="server-config">
                <div className="server-config-title">Plage d'adresses IP</div>
                <div className="flex gap-3 items-center">
                    <div style={{ flex: 1 }}>
                        <label className="properties-field-label">Début</label>
                        <input
                            type="text"
                            className="properties-field-input mono"
                            value={service.poolStart}
                            onChange={(e) => updatePool('poolStart', e.target.value)}
                            disabled={service.running}
                        />
                    </div>
                    <span style={{ color: 'var(--text-dim)', marginTop: '20px' }}>→</span>
                    <div style={{ flex: 1 }}>
                        <label className="properties-field-label">Fin</label>
                        <input
                            type="text"
                            className="properties-field-input mono"
                            value={service.poolEnd}
                            onChange={(e) => updatePool('poolEnd', e.target.value)}
                            disabled={service.running}
                        />
                    </div>
                </div>
            </div>

            {/* Baux actifs */}
            <div className="server-config" style={{ flex: 1, overflow: 'auto' }}>
                <div className="flex justify-between items-center mb-2">
                    <div className="server-config-title" style={{ margin: 0 }}>Baux DHCP</div>
                    {service.leases.length > 0 && (
                        <button
                            onClick={clearLeases}
                            style={{
                                padding: '4px 8px',
                                background: 'transparent',
                                border: '1px solid var(--accent-red)',
                                borderRadius: '4px',
                                color: 'var(--accent-red)',
                                fontSize: '11px',
                                cursor: 'pointer'
                            }}
                        >
                            Effacer tout
                        </button>
                    )}
                </div>

                {service.leases.length > 0 ? (
                    <table className="server-table">
                        <thead>
                            <tr>
                                <th>IP</th>
                                <th>MAC</th>
                                <th>Hôte</th>
                            </tr>
                        </thead>
                        <tbody>
                            {service.leases.map((lease, i) => (
                                <tr key={i}>
                                    <td className="font-mono" style={{ color: 'var(--accent-cyan)' }}>
                                        {lease.ip}
                                    </td>
                                    <td className="font-mono" style={{ fontSize: '11px' }}>
                                        {lease.mac}
                                    </td>
                                    <td>{lease.hostname}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div style={{
                        padding: '30px',
                        textAlign: 'center',
                        color: 'var(--text-dim)',
                        background: 'var(--bg-card)',
                        borderRadius: '8px'
                    }}>
                        Aucun bail actif
                    </div>
                )}
            </div>

            {/* Aide */}
            <div style={{
                padding: '12px',
                background: 'rgba(88, 166, 255, 0.1)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--accent-blue)'
            }}>
                💡 Les clients peuvent obtenir une IP avec la commande <code>dhcp</code> dans le terminal
            </div>
        </div>
    );
}
