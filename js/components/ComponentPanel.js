/* ============================================
   FILIUS WEB - PANNEAU COMPOSANTS
   Panneau latéral gauche avec les composants à ajouter (drag & drop)
   (Mode unifié : tout est toujours disponible)
   ============================================ */

function ComponentPanel({ addDevice, startComponentDrag, wireMode, setWireMode, textMode, setTextMode, rectMode, setRectMode }) {

    return (
        <aside className="component-panel">
            {/* Bouton Câblage */}
            <div style={{ marginBottom: '16px' }}>
                <button
                    onClick={() => setWireMode(!wireMode)}
                    title={wireMode ? "Désactiver le mode câblage (ou clic droit)" : "Activer le mode câblage"}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px 16px',
                        background: wireMode ? 'rgba(63, 185, 80, 0.2)' : 'var(--bg-card)',
                        border: wireMode ? '2px solid var(--accent-green)' : '1px solid var(--border)',
                        borderRadius: '8px',
                        color: wireMode ? 'var(--accent-green)' : 'var(--text)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: wireMode ? '600' : '500',
                        transition: 'none'
                    }}
                >
                    <span style={{ fontSize: '18px' }}>🔌</span>
                    <span>Câblage</span>
                    {wireMode && <span className="status-dot online" />}
                </button>
            </div>

            {COMPONENT_CATEGORIES.map(cat => (
                <div key={cat.name} className="component-category">
                    <h3>{cat.name}</h3>
                    <div>
                        {cat.items.map(({ type, tooltip }) => {
                            const deviceType = DEVICE_TYPES[type];
                            return (
                                <button
                                    key={type}
                                    className="component-btn"
                                    onClick={() => addDevice(type)}
                                    onMouseDown={(e) => {
                                        // Clic gauche uniquement - préparer le drag potentiel
                                        if (e.button === 0 && startComponentDrag) {
                                            startComponentDrag(type, e);
                                        }
                                    }}
                                    title={tooltip + " (cliquez ou glissez)"}
                                >
                                    <span className="component-btn-icon">
                                        {deviceType.image ? (
                                            <img 
                                                src={deviceType.image} 
                                                alt={deviceType.name}
                                                style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                                                draggable={false}
                                            />
                                        ) : (
                                            deviceType.icon
                                        )}
                                    </span>
                                    <span className="component-btn-label">{deviceType.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* Section Organisation */}
            <div className="component-category">
                <h3>Organisation</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {/* Bouton Texte */}
                    <button
                        onClick={() => {
                            setTextMode(!textMode);
                            setRectMode(false);
                        }}
                        className={`organization-btn ${textMode ? 'active' : ''}`}
                        title="Ajouter du texte (cliquez sur le canvas)"
                    >
                        <span style={{ fontSize: '16px' }}>📝</span>
                        <span>Texte</span>
                        {textMode && <span className="status-dot online" />}
                    </button>

                    {/* Bouton Rectangle */}
                    <button
                        onClick={() => {
                            setRectMode(!rectMode);
                            setTextMode(false);
                        }}
                        className={`organization-btn ${rectMode ? 'active' : ''}`}
                        title="Dessiner un rectangle (cliquez et glissez)"
                    >
                        <span style={{ fontSize: '16px' }}>⬜</span>
                        <span>Rectangle</span>
                        {rectMode && <span className="status-dot online" />}
                    </button>
                </div>
            </div>

            {/* Aide contextuelle */}
            <div className="component-panel-help design">
                💡 <strong>Aide</strong><br />
                • Cliquez ou glissez pour ajouter<br />
                • 🔌 Câblage pour connecter<br />
                • Double-clic pour ouvrir les apps<br />
                • Clic droit pour les options
            </div>
        </aside>
    );
}
