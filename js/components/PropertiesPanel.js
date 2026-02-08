/* ============================================
   FILIUS WEB - PANNEAU PROPRIÉTÉS
   Panneau latéral droit avec les propriétés de l'élément sélectionné
   (Mode unifié : propriétés toujours éditables + applications toujours visibles)
   ============================================ */

function PropertiesPanel({ 
    device, 
    selectedDevices, 
    selectedDeviceObjects,
    connection, 
    devices, 
    connections, 
    updateDevice, 
    updateMultipleDevices,
    deleteDevice, 
    deleteMultipleDevices,
    duplicateDevice, 
    deleteConnection, 
    openApp, 
    selectedInterface, 
    setSelectedInterface 
}) {
    // Affichage pour une connexion sélectionnée
    if (connection) {
        const fromDevice = devices.find(d => d.id === connection.from);
        const toDevice = devices.find(d => d.id === connection.to);

        return (
            <aside className="properties-panel animate-fadeIn">
                <h3 style={{ fontSize: '14px', marginBottom: '16px' }}>🔗 Connexion</h3>

                <div style={{
                    background: 'var(--bg-card)',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '16px'
                }}>
                    <div className="flex items-center gap-2 mb-2">
                        <span>{DEVICE_TYPES[fromDevice?.type]?.icon}</span>
                        <span style={{ fontSize: '13px' }}>{fromDevice?.name}</span>
                    </div>
                    <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>↕️</div>
                    <div className="flex items-center gap-2 mt-2">
                        <span>{DEVICE_TYPES[toDevice?.type]?.icon}</span>
                        <span style={{ fontSize: '13px' }}>{toDevice?.name}</span>
                    </div>
                </div>

                <button
                    className="properties-delete-btn"
                    onClick={() => deleteConnection(connection.id)}
                >
                    🗑️ Supprimer la connexion
                </button>
            </aside>
        );
    }
    
    // Multi-sélection
    if (selectedDevices && selectedDevices.length > 1 && selectedDeviceObjects && selectedDeviceObjects.length > 1) {
        // Vérifier si tous les appareils sont du même type
        const types = [...new Set(selectedDeviceObjects.map(d => d.type))];
        const allSameType = types.length === 1;
        
        if (!allSameType) {
            // Types différents : afficher seulement le compteur
            return (
                <aside className="properties-panel animate-fadeIn">
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{ 
                            fontSize: '48px', 
                            marginBottom: '16px',
                            background: 'var(--bg-card)',
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px'
                        }}>
                            📦
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                            {selectedDeviceObjects.length} éléments sélectionnés
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '24px' }}>
                            Types différents : sélectionnez des éléments du même type pour modifier leurs propriétés
                        </div>
                        
                        {/* Liste des types sélectionnés */}
                        <div style={{ 
                            background: 'var(--bg-card)', 
                            borderRadius: '8px', 
                            padding: '12px',
                            marginBottom: '16px',
                            textAlign: 'left'
                        }}>
                            {types.map(type => {
                                const count = selectedDeviceObjects.filter(d => d.type === type).length;
                                const deviceType = DEVICE_TYPES[type];
                                return (
                                    <div key={type} style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '8px',
                                        padding: '4px 0'
                                    }}>
                                        <span>{deviceType.icon}</span>
                                        <span style={{ flex: 1, fontSize: '13px' }}>{deviceType.name}</span>
                                        <span style={{ 
                                            fontSize: '12px', 
                                            color: 'var(--text-dim)',
                                            background: 'var(--bg-input)',
                                            padding: '2px 8px',
                                            borderRadius: '10px'
                                        }}>×{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <button
                            className="properties-delete-btn"
                            onClick={() => deleteMultipleDevices(selectedDevices)}
                        >
                            🗑️ Supprimer les {selectedDeviceObjects.length} éléments
                        </button>
                    </div>
                </aside>
            );
        }
        
        // Même type : afficher les propriétés éditables
        const deviceType = DEVICE_TYPES[types[0]];
        
        // Calculer les valeurs communes ou différentes
        const getCommonValue = (prop) => {
            const values = selectedDeviceObjects.map(d => d[prop] || '');
            const uniqueValues = [...new Set(values)];
            if (uniqueValues.length === 1) {
                return { value: uniqueValues[0], isDifferent: false };
            }
            return { value: '', isDifferent: true, placeholder: '(valeurs différentes)' };
        };
        
        const ipProp = getCommonValue('ip');
        const maskProp = getCommonValue('mask');
        const gatewayProp = getCommonValue('gateway');
        const dnsProp = getCommonValue('dns');
        
        return (
            <aside className="properties-panel animate-fadeIn">
                {/* En-tête */}
                <div className="properties-header">
                    <div
                        className="properties-header-icon"
                        style={{
                            background: `${deviceType.color}20`,
                            border: `2px solid ${deviceType.color}`
                        }}
                    >
                        {deviceType.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ 
                            fontSize: '14px', 
                            fontWeight: '600',
                            color: 'var(--text)'
                        }}>
                            {selectedDeviceObjects.length} {deviceType.name}s sélectionnés
                        </div>
                        <div className="properties-header-type">Modification groupée</div>
                    </div>
                </div>
                
                {/* Propriétés éditables */}
                {deviceType.hasIP && (
                    <div className="properties-section">
                        <h4 className="properties-section-title">Configuration IP</h4>
                        
                        <MultiSelectPropertyField
                            label="Adresse IP"
                            value={ipProp.value}
                            isDifferent={ipProp.isDifferent}
                            placeholder={ipProp.placeholder}
                            onChange={(v) => updateMultipleDevices(selectedDevices, { ip: v })}
                            mono
                        />
                        <MultiSelectPropertyField
                            label="Masque"
                            value={maskProp.value}
                            isDifferent={maskProp.isDifferent}
                            placeholder={maskProp.placeholder}
                            onChange={(v) => updateMultipleDevices(selectedDevices, { mask: v })}
                            mono
                        />
                        <MultiSelectPropertyField
                            label="Passerelle"
                            value={gatewayProp.value}
                            isDifferent={gatewayProp.isDifferent}
                            placeholder={gatewayProp.placeholder}
                            onChange={(v) => updateMultipleDevices(selectedDevices, { gateway: v })}
                            mono
                        />
                        <MultiSelectPropertyField
                            label="Serveur DNS"
                            value={dnsProp.value}
                            isDifferent={dnsProp.isDifferent}
                            placeholder={dnsProp.placeholder}
                            onChange={(v) => updateMultipleDevices(selectedDevices, { dns: v })}
                            mono
                        />
                    </div>
                )}
                
                {/* Actions */}
                <div style={{
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border)'
                }}>
                    <button
                        className="properties-delete-btn"
                        onClick={() => deleteMultipleDevices(selectedDevices)}
                    >
                        🗑️ Supprimer les {selectedDeviceObjects.length} éléments
                    </button>
                </div>
            </aside>
        );
    }

    // Affichage par défaut (rien de sélectionné)
    if (!device) {
        return (
            <aside className="properties-panel properties-empty">
                <div className="properties-empty-icon">📋</div>
                <div>Sélectionnez un élément</div>
                <div className="text-sm mt-2">pour voir ses propriétés</div>
            </aside>
        );
    }

    const deviceType = DEVICE_TYPES[device.type];

    // Compte les modems actifs (autres que celui-ci)
    const activeModems = devices.filter(d => d.type === 'MODEM' && d.publicIP && d.id !== device.id);

    // Connexions du routeur (pour générer les interfaces dynamiquement)
    const routerConnections = connections.filter(c => c.from === device.id || c.to === device.id);

    // Pour le routeur : synchroniser les interfaces avec le nombre de câbles
    React.useEffect(() => {
        if (device.type === 'ROUTER') {
            const numConnections = routerConnections.length;
            const currentInterfaces = device.interfaces || [];
            
            if (currentInterfaces.length !== numConnections) {
                const newInterfaces = [];
                for (let i = 0; i < numConnections; i++) {
                    if (currentInterfaces[i]) {
                        newInterfaces.push(currentInterfaces[i]);
                    } else {
                        newInterfaces.push({
                            id: `eth${i}`,
                            ip: `192.168.${i}.1`,
                            mask: '255.255.255.0',
                            mac: generateMAC()
                        });
                    }
                }
                updateDevice(device.id, { interfaces: newInterfaces });
            }
        }
    }, [routerConnections.length, device.type, device.id]);

    // Gestion du clic sur une interface
    const handleInterfaceClick = (interfaceIndex) => {
        if (selectedInterface?.deviceId === device.id && selectedInterface?.interfaceIndex === interfaceIndex) {
            setSelectedInterface(null);
        } else {
            setSelectedInterface({ deviceId: device.id, interfaceIndex });
        }
    };

    // Gestion du focus sur un champ IP d'interface (colore le câble)
    const handleInterfaceFocus = (interfaceIndex) => {
        setSelectedInterface({ deviceId: device.id, interfaceIndex });
    };

    return (
        <aside className="properties-panel animate-fadeIn">
            {/* En-tête */}
            <div className="properties-header">
                <div
                    className="properties-header-icon"
                    style={{
                        background: `${deviceType.color}20`,
                        border: `2px solid ${deviceType.color}`
                    }}
                >
                    {deviceType.icon}
                </div>
                <div style={{ flex: 1 }}>
                    <input
                        type="text"
                        className="properties-header-name"
                        value={device.name}
                        onChange={(e) => updateDevice(device.id, { name: e.target.value })}
                    />
                    <div className="properties-header-type">{deviceType.name}</div>
                </div>
            </div>

            {/* Contrôle Modem */}
            {deviceType.isModem && (
                <div className="properties-section">
                    <h4 className="properties-section-title">Connexion Internet</h4>
                    
                    {/* IP Publique */}
                    <div style={{
                        padding: '12px',
                        background: 'rgba(240, 136, 62, 0.1)',
                        borderRadius: '6px',
                        border: '1px solid rgba(240, 136, 62, 0.3)'
                    }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                            🌐 IP Publique
                        </div>
                        <div style={{ 
                            fontFamily: 'JetBrains Mono, monospace', 
                            fontSize: '16px', 
                            color: '#f0883e',
                            fontWeight: '600'
                        }}>
                            {device.publicIP || 'Non attribuée'}
                        </div>
                    </div>

                    {activeModems.length > 0 && (
                        <div style={{
                            marginTop: '10px',
                            padding: '10px',
                            background: 'rgba(63, 185, 80, 0.1)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: 'var(--accent-green)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <span className="status-dot online" />
                            Connecté à Internet ({activeModems.length + 1} modem(s) sur le réseau)
                        </div>
                    )}

                    {activeModems.length === 0 && (
                        <div style={{
                            marginTop: '10px',
                            padding: '10px',
                            background: 'rgba(210, 153, 34, 0.1)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: 'var(--accent-yellow)'
                        }}>
                            ⚠️ Seul modem sur le réseau (ajoutez d'autres modems pour simuler Internet)
                        </div>
                    )}
                </div>
            )}

            {/* Configuration NAT simplifiée - Modems uniquement */}
            {deviceType.isModem && (
                <div className="properties-section">
                    <h4 className="properties-section-title">
                        🔀 Redirection de ports (NAT)
                    </h4>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '12px' }}>
                        Redirige le trafic entrant vers une machine locale
                    </div>

                    {/* TCP */}
                    <NatProtocolConfig
                        label="TCP"
                        description="HTTP, HTTPS, FTP..."
                        color="var(--accent-cyan)"
                        enabled={device.natConfig?.tcp?.enabled || false}
                        targetIP={device.natConfig?.tcp?.targetIP || '192.168.0.'}
                        onToggle={(enabled) => {
                            const newConfig = { ...device.natConfig };
                            newConfig.tcp = { ...newConfig.tcp, enabled };
                            updateDevice(device.id, { natConfig: newConfig });
                        }}
                        onIPChange={(targetIP) => {
                            const newConfig = { ...device.natConfig };
                            newConfig.tcp = { ...newConfig.tcp, targetIP };
                            updateDevice(device.id, { natConfig: newConfig });
                        }}
                    />

                    {/* UDP */}
                    <NatProtocolConfig
                        label="UDP"
                        description="DNS, DHCP..."
                        color="var(--accent-green)"
                        enabled={device.natConfig?.udp?.enabled || false}
                        targetIP={device.natConfig?.udp?.targetIP || '192.168.0.'}
                        onToggle={(enabled) => {
                            const newConfig = { ...device.natConfig };
                            newConfig.udp = { ...newConfig.udp, enabled };
                            updateDevice(device.id, { natConfig: newConfig });
                        }}
                        onIPChange={(targetIP) => {
                            const newConfig = { ...device.natConfig };
                            newConfig.udp = { ...newConfig.udp, targetIP };
                            updateDevice(device.id, { natConfig: newConfig });
                        }}
                    />

                    {/* ICMP */}
                    <NatProtocolConfig
                        label="ICMP"
                        description="Ping"
                        color="var(--accent-yellow)"
                        enabled={device.natConfig?.icmp?.enabled || false}
                        targetIP={device.natConfig?.icmp?.targetIP || '192.168.0.'}
                        onToggle={(enabled) => {
                            const newConfig = { ...device.natConfig };
                            newConfig.icmp = { ...newConfig.icmp, enabled };
                            updateDevice(device.id, { natConfig: newConfig });
                        }}
                        onIPChange={(targetIP) => {
                            const newConfig = { ...device.natConfig };
                            newConfig.icmp = { ...newConfig.icmp, targetIP };
                            updateDevice(device.id, { natConfig: newConfig });
                        }}
                    />

                    {/* Avertissement si rien n'est activé */}
                    {!device.natConfig?.tcp?.enabled && !device.natConfig?.udp?.enabled && !device.natConfig?.icmp?.enabled && (
                        <div style={{
                            padding: '12px',
                            background: 'rgba(248, 81, 73, 0.1)',
                            borderRadius: '6px',
                            fontSize: '11px',
                            color: '#f85149',
                            textAlign: 'center',
                            marginTop: '8px'
                        }}>
                            ⚠️ Sans redirection, les serveurs derrière ce modem sont inaccessibles depuis Internet
                        </div>
                    )}
                </div>
            )}

            {/* Configuration réseau - pas pour les modems */}
            {!deviceType.isModem && (
            <div className="properties-section">
                <h4 className="properties-section-title">Configuration réseau</h4>

                <PropertyField
                    label="Adresse MAC"
                    value={device.mac}
                    disabled={true}
                    mono
                />

                {deviceType.hasIP && !deviceType.isRouter && (
                    <>
                        <PropertyField
                            label="Adresse IP"
                            value={device.ip || ''}
                            onChange={(v) => updateDevice(device.id, { ip: v })}
                            disabled={device.dhcpEnabled}
                            mono
                            placeholder="192.168.0.1"
                        />
                        <PropertyField
                            label="Masque"
                            value={device.mask || ''}
                            onChange={(v) => updateDevice(device.id, { mask: v })}
                            disabled={device.dhcpEnabled}
                            mono
                            placeholder="255.255.255.0"
                        />
                        <PropertyField
                            label="Passerelle"
                            value={device.gateway || ''}
                            onChange={(v) => updateDevice(device.id, { gateway: v })}
                            disabled={device.dhcpEnabled}
                            mono
                            placeholder=""
                        />
                        <PropertyField
                            label="DNS"
                            value={device.dns || ''}
                            onChange={(v) => updateDevice(device.id, { dns: v })}
                            disabled={device.dhcpEnabled}
                            mono
                            placeholder=""
                        />
                    </>
                )}

                {/* Interfaces pour les routeurs - dynamiques selon les câbles */}
                {deviceType.isRouter && (
                    <div className="mt-2">
                        <div className="properties-section-title">
                            Interfaces
                            {routerConnections.length === 0 && (
                                <span style={{ 
                                    fontSize: '10px', 
                                    color: 'var(--text-dim)', 
                                    fontWeight: 'normal',
                                    marginLeft: '8px'
                                }}>
                                    (connectez des câbles)
                                </span>
                            )}
                        </div>
                        
                        {routerConnections.length === 0 ? (
                            <div style={{
                                padding: '16px',
                                background: 'var(--bg-card)',
                                borderRadius: '6px',
                                textAlign: 'center',
                                color: 'var(--text-dim)',
                                fontSize: '12px'
                            }}>
                                Aucun câble connecté.<br/>
                                Les interfaces apparaîtront automatiquement.
                            </div>
                        ) : (
                            device.interfaces?.map((iface, i) => {
                                const isSelected = selectedInterface?.deviceId === device.id && selectedInterface?.interfaceIndex === i;
                                const connectedConn = routerConnections[i];
                                const connectedDevice = connectedConn 
                                    ? devices.find(d => d.id === (connectedConn.from === device.id ? connectedConn.to : connectedConn.from))
                                    : null;
                                
                                // Vérifier si connecté à un modem
                                const isConnectedToModem = connectedDevice?.type === 'MODEM';
                                const modemPublicIP = isConnectedToModem ? connectedDevice.publicIP : null;

                                return (
                                    <div 
                                        key={i} 
                                        onClick={() => handleInterfaceClick(i)}
                                        style={{
                                            background: isSelected ? 'rgba(63, 185, 80, 0.15)' : 'var(--bg-card)',
                                            padding: '10px 12px',
                                            borderRadius: '6px',
                                            marginBottom: '6px',
                                            fontSize: '12px',
                                            border: isSelected ? '2px solid var(--accent-green)' : '1px solid var(--border)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div className="flex justify-between mb-2" style={{ alignItems: 'center' }}>
                                            <span className="font-mono" style={{ 
                                                color: isConnectedToModem ? '#f0883e' : (isSelected ? 'var(--accent-green)' : 'var(--accent-cyan)'),
                                                fontWeight: '600'
                                            }}>
                                                {iface.id}
                                            </span>
                                            {connectedDevice ? (
                                                <span style={{ 
                                                    fontSize: '10px', 
                                                    color: isConnectedToModem ? '#f0883e' : (isSelected ? 'var(--accent-green)' : 'var(--text-dim)'),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    → {connectedDevice.name}
                                                    {isConnectedToModem && ' 🌐'}
                                                    {isSelected && !isConnectedToModem && <span>✓</span>}
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                                                    Non connecté
                                                </span>
                                            )}
                                        </div>
                                        
                                        {/* Si connecté à un modem, afficher l'IP publique en lecture seule */}
                                        {isConnectedToModem ? (
                                            <>
                                                <div style={{ 
                                                    fontSize: '9px', 
                                                    color: '#f0883e', 
                                                    marginBottom: '2px' 
                                                }}>
                                                    IP publique (via modem)
                                                </div>
                                                <input
                                                    type="text"
                                                    value={modemPublicIP || 'Non attribuée'}
                                                    disabled={true}
                                                    className="properties-field-input mono"
                                                    style={{ 
                                                        padding: '4px 6px', 
                                                        fontSize: '12px',
                                                        color: '#f0883e',
                                                        background: 'rgba(240, 136, 62, 0.1)',
                                                        borderColor: 'rgba(240, 136, 62, 0.3)',
                                                        cursor: 'not-allowed'
                                                    }}
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <input
                                                    type="text"
                                                    value={iface.ip}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onFocus={() => handleInterfaceFocus(i)}
                                                    onChange={(e) => {
                                                        const newInterfaces = [...device.interfaces];
                                                        newInterfaces[i] = { ...iface, ip: e.target.value };
                                                        updateDevice(device.id, { interfaces: newInterfaces });
                                                    }}
                                                    className="properties-field-input mono"
                                                    style={{ 
                                                        padding: '4px 6px', 
                                                        fontSize: '12px',
                                                        borderColor: isSelected ? 'var(--accent-green)' : undefined
                                                    }}
                                                    placeholder="192.168.0.1"
                                                />
                                                <input
                                                    type="text"
                                                    value={iface.mask || '255.255.255.0'}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onFocus={() => handleInterfaceFocus(i)}
                                                    onChange={(e) => {
                                                        const newInterfaces = [...device.interfaces];
                                                        newInterfaces[i] = { ...iface, mask: e.target.value };
                                                        updateDevice(device.id, { interfaces: newInterfaces });
                                                    }}
                                                    className="properties-field-input mono"
                                                    style={{ 
                                                        padding: '4px 6px', 
                                                        fontSize: '11px',
                                                        marginTop: '4px',
                                                        borderColor: isSelected ? 'var(--accent-green)' : undefined,
                                                        color: 'var(--text-dim)'
                                                    }}
                                                    placeholder="255.255.255.0"
                                                />
                                            </>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
            )}

            {/* Applications (toujours visibles pour les appareils compatibles) */}
            {deviceType.canRunApps && (
                <div className="properties-section">
                    <h4 className="properties-section-title">Applications</h4>
                    <div className="flex" style={{ flexWrap: 'wrap', gap: '6px' }}>
                        {deviceType.defaultApps?.map(appType => {
                            const app = APP_TYPES[appType];
                            return (
                                <AppButton
                                    key={appType}
                                    icon={app.icon}
                                    label={app.name}
                                    onClick={() => openApp(device.id, appType)}
                                />
                            );
                        })}
                    </div>

                    {deviceType.serverApps && (
                        <>
                            <div className="properties-section-title mt-4">Services serveur</div>
                            <div className="flex" style={{ flexWrap: 'wrap', gap: '6px' }}>
                                {deviceType.serverApps.map(appType => {
                                    const app = APP_TYPES[appType];
                                    const isRunning = device.services?.[appType]?.running;
                                    return (
                                        <AppButton
                                            key={appType}
                                            icon={app.icon}
                                            label={app.name}
                                            onClick={() => openApp(device.id, appType)}
                                            running={isRunning}
                                        />
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Actions (toujours visibles) */}
            <div className="flex gap-2" style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border)'
            }}>
                <button
                    onClick={() => duplicateDevice(device.id)}
                    style={{
                        flex: 1,
                        padding: '10px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        color: 'var(--text)',
                        cursor: 'pointer',
                        fontSize: '13px'
                    }}
                >
                    📋 Dupliquer
                </button>
                <button
                    className="properties-delete-btn"
                    style={{ flex: 1, marginTop: 0 }}
                    onClick={() => deleteDevice(device.id)}
                >
                    🗑️ Supprimer
                </button>
            </div>
        </aside>
    );
}

// Champ de propriété
function PropertyField({ label, value, onChange, disabled, mono, placeholder }) {
    return (
        <div className="properties-field">
            <label className="properties-field-label">{label}</label>
            <input
                type="text"
                className={`properties-field-input ${mono ? 'mono' : ''}`}
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                disabled={disabled}
                placeholder={placeholder}
            />
        </div>
    );
}

// Champ de propriété pour multi-sélection (grisé si valeurs différentes)
function MultiSelectPropertyField({ label, value, onChange, isDifferent, mono, placeholder }) {
    return (
        <div className="properties-field">
            <label className="properties-field-label">{label}</label>
            <input
                type="text"
                className={`properties-field-input ${mono ? 'mono' : ''}`}
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                disabled={isDifferent}
                placeholder={isDifferent ? placeholder : ''}
                style={isDifferent ? {
                    background: 'var(--bg-card)',
                    color: 'var(--text-dim)',
                    fontStyle: 'italic',
                    cursor: 'not-allowed'
                } : {}}
            />
            {isDifferent && (
                <div style={{ 
                    fontSize: '10px', 
                    color: 'var(--text-dim)', 
                    marginTop: '2px',
                    fontStyle: 'italic'
                }}>
                    Valeurs différentes - non modifiable
                </div>
            )}
        </div>
    );
}

// Bouton d'application
function AppButton({ icon, label, onClick, running = false }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '6px 10px',
                background: running ? 'rgba(63, 185, 80, 0.15)' : 'var(--bg-card)',
                border: `1px solid ${running ? 'var(--accent-green)' : 'var(--border)'}`,
                borderRadius: '6px',
                color: running ? 'var(--accent-green)' : 'var(--text)',
                cursor: 'pointer',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
            }}
        >
            <span>{icon}</span>
            <span>{label}</span>
            {running && <span className="status-dot online" style={{ marginLeft: '4px' }} />}
        </button>
    );
}

// Configuration d'un protocole NAT (TCP, UDP, ICMP)
function NatProtocolConfig({ label, description, color, enabled, targetIP, onToggle, onIPChange }) {
    return (
        <div style={{
            padding: '10px',
            background: enabled ? 'rgba(63, 185, 80, 0.1)' : 'var(--bg-card)',
            borderRadius: '6px',
            marginBottom: '8px',
            border: enabled ? '1px solid var(--accent-green)' : '1px solid var(--border)',
            transition: 'all 0.2s'
        }}>
            {/* Ligne 1 : Checkbox + Label + Description */}
            <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
            }}>
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => onToggle(e.target.checked)}
                    style={{ 
                        width: '16px', 
                        height: '16px',
                        cursor: 'pointer',
                        accentColor: 'var(--accent-green)'
                    }}
                />
                <span style={{ 
                    fontWeight: '600', 
                    color: enabled ? color : 'var(--text-dim)',
                    fontSize: '13px'
                }}>
                    {label}
                </span>
                <span style={{ 
                    fontSize: '11px', 
                    color: 'var(--text-dim)'
                }}>
                    ({description})
                </span>
            </label>

            {/* Lignes 2 et 3 : Texte + IP (visibles seulement si activé) */}
            {enabled && (
                <div style={{ marginLeft: '24px', marginTop: '8px' }}>
                    {/* Ligne 2 : Texte */}
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                        → Rediriger vers :
                    </div>
                    {/* Ligne 3 : Input IP */}
                    <input
                        type="text"
                        value={targetIP}
                        onChange={(e) => onIPChange(e.target.value)}
                        placeholder="192.168.0.10"
                        style={{
                            width: '140px',
                            padding: '6px 8px',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            color: 'var(--text)',
                            fontSize: '12px',
                            fontFamily: 'JetBrains Mono, monospace'
                        }}
                    />
                </div>
            )}
        </div>
    );
}
