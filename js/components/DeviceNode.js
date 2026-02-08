/* ============================================
   FILIUS WEB - NOEUD D'APPAREIL
   Représentation visuelle d'un appareil sur le canvas
   (Mode unifié : tout est toujours disponible)
   ============================================ */

function DeviceNode({
    device,
    isSelected,
    isConnecting,
    isConnectTarget,
    wireMode,
    onClick,
    onDoubleClick,
    onMouseDown,
    onContextMenu,
    onConnect,
    style: externalStyle
}) {
    const deviceType = DEVICE_TYPES[device.type];
    const hasActiveService = device.services && Object.values(device.services).some(s => s.running);
    const isModemActive = device.type === 'MODEM' && device.publicIP;

    // En mode câblage, tous les appareils sont des cibles potentielles
    const isWireTarget = wireMode;

    // Style dynamique basé sur la couleur de l'appareil
    const iconStyle = {
        background: isSelected ? `${deviceType.color}20` : 
            isWireTarget ? 'rgba(63, 185, 80, 0.1)' : 'transparent',
        borderColor: isSelected ? deviceType.color :
            isConnecting ? 'var(--accent-green)' :
                (isConnectTarget || isWireTarget) ? 'var(--accent-green)' : 
                    isModemActive ? '#3fb950' : 'var(--border)',
        boxShadow: isSelected ? `0 0 20px ${deviceType.color}40` :
            isConnecting ? '0 0 20px rgba(63, 185, 80, 0.5)' :
                (isConnectTarget || isWireTarget) ? '0 0 15px rgba(63, 185, 80, 0.3)' : 
                    isModemActive ? '0 0 15px rgba(63, 185, 80, 0.4)' : 'none',
        transform: isWireTarget ? 'scale(1.05)' : 'scale(1)',
        transition: 'all 0.2s ease'
    };

    // Curseur : grab pour déplacer, pointer en câblage
    const cursorStyle = wireMode ? 'pointer' : 'grab';

    return (
        <div
            className={`device-node ${isSelected ? 'selected' : ''} ${isWireTarget ? 'wire-target' : ''}`}
            style={{
                left: device.x - 35,
                top: device.y - 35,
                cursor: cursorStyle,
                ...externalStyle
            }}
            onClick={(e) => onClick(e)}
            onDoubleClick={onDoubleClick}
            onMouseDown={onMouseDown}
            onContextMenu={onContextMenu}
        >
            {/* Indicateur de service actif */}
            {hasActiveService && (
                <div className="device-node-service-indicator" />
            )}

            {/* Indicateur modem actif */}
            {isModemActive && (
                <div style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    width: '20px',
                    height: '20px',
                    background: '#3fb950',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    boxShadow: '0 0 10px rgba(63, 185, 80, 0.5)',
                    animation: 'pulse 2s infinite'
                }}>
                    📡
                </div>
            )}

            {/* Indicateur de connexion en cours */}
            {isConnecting && (
                <div style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--accent-green)',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '10px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                }}>
                    Source
                </div>
            )}

            {/* Icône de l'appareil */}
            <div className="device-node-icon" style={iconStyle}>
                {deviceType.image ? (
                    <img 
                        src={deviceType.image} 
                        alt={deviceType.name}
                        style={{ 
                            width: '52px', 
                            height: '52px', 
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                        }}
                        draggable={false}
                    />
                ) : (
                    deviceType.icon
                )}
            </div>

            {/* Nom */}
            <div className="device-node-name">{device.name}</div>

            {/* IP (pour appareils normaux) */}
            {device.ip && !device.publicIP && (
                <div className="device-node-ip">{device.ip}</div>
            )}
            
            {/* Passerelle */}
            {device.gateway && !device.publicIP && (
                <div style={{
                    fontSize: '10px',
                    color: '#3fb950',
                    fontFamily: 'JetBrains Mono, monospace',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '2px'
                }}>
                    <span>P:</span><span>{device.gateway}</span>
                </div>
            )}

            {/* IP Publique (pour modems) */}
            {device.publicIP && (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                        fontSize: '9px',
                        color: '#f0883e',
                        marginBottom: '1px'
                    }}>
                        IP publique
                    </div>
                    <div style={{ 
                        color: '#f0883e',
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono, monospace'
                    }}>
                        {device.publicIP}
                    </div>
                </div>
            )}

            {/* Bouton de connexion (seulement si pas en mode câblage) */}
            {!wireMode && (
                <button
                    className={`device-node-connect-btn ${isConnecting ? 'connecting' : ''}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onConnect();
                    }}
                    title="Connecter"
                >
                    🔗
                </button>
            )}
        </div>
    );
}
