/* ============================================
   FILIUS WEB - COMPOSANT HEADER
   Barre d'en-tête avec logo, fichiers
   (Mode unifié : plus de bouton Conception/Simulation)
   ============================================ */

function Header({ projectName, setProjectName, networkSpeed, setNetworkSpeed, onNew, onSave, onLoad, onHelp, onUndo, onRedo, canUndo, canRedo }) {
    const [editingName, setEditingName] = React.useState(false);
    const [showSupport, setShowSupport] = React.useState(false);

    return (
        <header className="header">
            {/* Logo et nom du projet */}
            <div className="header-logo">
                <div className="header-logo-icon">🌐</div>
                <div>
                    <div className="header-title">Filius Web</div>
                    {editingName ? (
                        <input
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            onBlur={() => setEditingName(false)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
                            autoFocus
                            style={{
                                background: 'var(--bg-input)',
                                border: '1px solid var(--accent-blue)',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                color: 'var(--text)',
                                fontSize: '12px',
                                width: '150px'
                            }}
                        />
                    ) : (
                        <div
                            className="header-project-name"
                            onClick={() => setEditingName(true)}
                            title="Cliquer pour renommer"
                        >
                            {projectName}
                        </div>
                    )}
                </div>
            </div>

            {/* Boutons fichier */}
            <div className="flex gap-1">
                <HeaderButton icon="📄" label="Nouveau" onClick={onNew} />
                <HeaderButton icon="📂" label="Ouvrir" onClick={onLoad} />
                <HeaderButton icon="💾" label="Sauvegarder" onClick={onSave} />
            </div>

            <div className="header-separator" />
            
            {/* Boutons Annuler/Répéter */}
            <div className="flex gap-1">
                <button
                    className="header-btn"
                    onClick={onUndo}
                    disabled={!canUndo}
                    title="Annuler (Ctrl+Z)"
                    style={{ opacity: canUndo ? 1 : 0.4, cursor: canUndo ? 'pointer' : 'not-allowed' }}
                >
                    <span>↩️</span>
                    <span>Annuler</span>
                </button>
                <button
                    className="header-btn"
                    onClick={onRedo}
                    disabled={!canRedo}
                    title="Répéter (Ctrl+Y)"
                    style={{ opacity: canRedo ? 1 : 0.4, cursor: canRedo ? 'pointer' : 'not-allowed' }}
                >
                    <span>↪️</span>
                    <span>Répéter</span>
                </button>
            </div>

            <div className="header-separator" />

            {/* Vitesse réseau (toujours visible) */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-dim">⚡ Vitesse réseau:</span>
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={networkSpeed}
                    onChange={(e) => setNetworkSpeed(Number(e.target.value))}
                    style={{ width: '80px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '12px', color: 'var(--accent-cyan)', width: '30px' }}>
                    x{networkSpeed}
                </span>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Bouton Soutenir */}
            <button
                className="header-btn support"
                onClick={() => setShowSupport(true)}
                title="Soutenir ce projet"
                style={{
                    color: '#ff6b8a',
                    position: 'relative'
                }}
            >
                <span style={{ fontSize: '18px' }}>❤️</span>
            </button>

            {/* Aide */}
            <HeaderButton icon="❓" label="Aide" onClick={onHelp} primary />

            {/* Popup de soutien */}
            {showSupport && (
                <div 
                    className="support-overlay"
                    onClick={() => setShowSupport(false)}
                >
                    <div 
                        className="support-popup"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            className="support-close"
                            onClick={() => setShowSupport(false)}
                        >
                            ✕
                        </button>
                        <div className="support-heart">❤️</div>
                        <h2 className="support-title">Soutenir ce projet</h2>
                        <p className="support-text">
                            Application créée par <strong>Max</strong>.
                        </p>
                        <p className="support-text">
                            Si cette application vous plaît, vous pouvez soutenir mon travail ici :
                        </p>
                        <a 
                            href="https://fr.tipeee.com/maxtechno/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="support-link"
                        >
                            🎁 fr.tipeee.com/maxtechno
                        </a>
                        <div style={{
                            marginTop: '16px',
                            paddingTop: '16px',
                            borderTop: '1px solid var(--border)'
                        }}>
                            <h3 style={{
                                fontSize: '14px',
                                color: 'var(--text)',
                                marginBottom: '12px'
                            }}>Remerciements</h3>
                            <p style={{
                                fontSize: '12px',
                                color: 'var(--text-dim)',
                                margin: '0 0 10px 0'
                            }}>
                                Ce projet est un fork web du logiciel <strong>Filius</strong>, développé par l'Université de Siegen (Allemagne).
                            </p>
                            <a 
                                href="https://www.lernsoftware-filius.de/" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-block',
                                    fontSize: '12px',
                                    color: 'var(--accent-blue)',
                                    textDecoration: 'none',
                                    marginBottom: '12px'
                                }}
                            >
                                🌐 www.lernsoftware-filius.de
                            </a>
                            <p style={{
                                fontSize: '12px',
                                color: 'var(--text-dim)',
                                margin: 0
                            }}>
                                Merci à <strong>DIVA informatique</strong> pour ses précieux conseils et à <strong>Gaëtan</strong> pour tous les tests
                            </p>
                        </div>
                        <p className="support-thanks">Merci ! 🙏</p>
                    </div>
                </div>
            )}
        </header>
    );
}

function HeaderButton({ icon, label, onClick, primary = false }) {
    return (
        <button
            className={`header-btn ${primary ? 'primary' : ''}`}
            onClick={onClick}
        >
            <span>{icon}</span>
            <span>{label}</span>
        </button>
    );
}
