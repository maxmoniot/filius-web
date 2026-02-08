/* ============================================
   FILIUS WEB - MENU CONTEXTUEL
   Menu clic-droit pour les appareils et connexions
   (Mode unifié : toutes les options toujours disponibles)
   ============================================ */

function ContextMenu({ x, y, type, data, onClose, onDelete, onDuplicate, onSendToBack, onOpenApp }) {
    const menuRef = React.useRef(null);

    // Ajuster la position pour ne pas sortir de l'écran
    React.useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                menuRef.current.style.left = `${window.innerWidth - rect.width - 10}px`;
            }
            if (rect.bottom > window.innerHeight) {
                menuRef.current.style.top = `${window.innerHeight - rect.height - 10}px`;
            }
        }
    }, []);

    return (
        <div
            ref={menuRef}
            className="context-menu animate-scaleIn"
            style={{ left: x, top: y }}
            onClick={(e) => e.stopPropagation()}
        >
            {type === 'device' && (
                <>
                    {/* Options d'applications (si l'appareil peut exécuter des apps) */}
                    {DEVICE_TYPES[data.type]?.canRunApps && (
                        <>
                            <ContextMenuItem
                                icon="💻"
                                label="Ouvrir Terminal"
                                onClick={() => { onOpenApp(data.id, 'terminal'); onClose(); }}
                            />
                            <ContextMenuItem
                                icon="🌐"
                                label="Ouvrir Navigateur"
                                onClick={() => { onOpenApp(data.id, 'browser'); onClose(); }}
                            />
                            <ContextMenuItem
                                icon="📁"
                                label="Ouvrir Explorateur"
                                onClick={() => { onOpenApp(data.id, 'explorer'); onClose(); }}
                            />
                            <div className="context-menu-separator" />
                        </>
                    )}

                    {/* Options d'édition */}
                    <ContextMenuItem
                        icon="📋"
                        label="Dupliquer"
                        onClick={() => { onDuplicate?.(); onClose(); }}
                    />
                    <div className="context-menu-separator" />
                    <ContextMenuItem
                        icon="🗑️"
                        label="Supprimer"
                        danger
                        onClick={() => { onDelete?.(); onClose(); }}
                    />
                </>
            )}

            {type === 'connection' && (
                <ContextMenuItem
                    icon="🗑️"
                    label="Supprimer la connexion"
                    danger
                    onClick={() => { onDelete?.(); onClose(); }}
                />
            )}
            
            {type === 'rect' && (
                <>
                    <ContextMenuItem
                        icon="⬇️"
                        label="Envoyer à l'arrière-plan"
                        onClick={() => { onSendToBack?.(); onClose(); }}
                    />
                    <div className="context-menu-separator" />
                    <ContextMenuItem
                        icon="🗑️"
                        label="Supprimer le rectangle"
                        danger
                        onClick={() => { onDelete?.(); onClose(); }}
                    />
                </>
            )}
        </div>
    );
}

function ContextMenuItem({ icon, label, onClick, danger = false }) {
    return (
        <div
            className={`context-menu-item ${danger ? 'danger' : ''}`}
            onClick={onClick}
        >
            <span>{icon}</span> {label}
        </div>
    );
}
