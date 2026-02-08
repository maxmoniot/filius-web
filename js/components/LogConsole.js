/* ============================================
   FILIUS WEB - CONSOLE DE LOGS
   Affiche les événements réseau en temps réel
   ============================================ */

function LogConsole({ logs, onClear }) {
    const containerRef = React.useRef(null);
    const [autoScroll, setAutoScroll] = React.useState(true);
    const [filter, setFilter] = React.useState('all');
    const [collapsed, setCollapsed] = React.useState(true); // Repliée par défaut

    // Auto-scroll vers le bas
    React.useEffect(() => {
        if (autoScroll && containerRef.current && !collapsed) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [logs, autoScroll, collapsed]);

    // Filtrage des logs
    const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.type === filter);

    // Nombre de logs non lus (pour afficher un badge quand replié)
    const unreadCount = logs.length;

    return (
        <div className={`log-console ${collapsed ? 'collapsed' : ''}`}>
            {/* Barre d'outils */}
            <div 
                className="log-console-header"
                onClick={() => collapsed && setCollapsed(false)}
                style={{ cursor: collapsed ? 'pointer' : 'default' }}
            >
                {/* Bouton replier/déplier */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setCollapsed(!collapsed);
                    }}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        padding: '4px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.2s'
                    }}
                    title={collapsed ? 'Déplier la console' : 'Replier la console'}
                >
                    <span style={{ 
                        transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                        display: 'inline-block',
                        transition: 'transform 0.2s'
                    }}>
                        ▲
                    </span>
                </button>

                <span className="log-console-title">
                    📟 Console
                    {collapsed && unreadCount > 0 && (
                        <span style={{
                            marginLeft: '8px',
                            background: 'var(--accent-blue)',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontSize: '10px',
                            fontWeight: '600'
                        }}>
                            {unreadCount}
                        </span>
                    )}
                </span>

                {!collapsed && (
                    <>
                        <div className="flex gap-1">
                            {['all', 'command', 'packet', 'error'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    style={{
                                        padding: '4px 8px',
                                        background: filter === f ? 'var(--bg-card)' : 'transparent',
                                        border: 'none',
                                        borderRadius: '4px',
                                        color: filter === f ? 'var(--text)' : 'var(--text-dim)',
                                        fontSize: '11px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {f === 'all' ? 'Tout' : f === 'command' ? 'Commandes' : f === 'packet' ? 'Paquets' : 'Erreurs'}
                                </button>
                            ))}
                        </div>

                        <div style={{ flex: 1 }} />

                        <label className="flex items-center gap-1 text-sm text-dim">
                            <input
                                type="checkbox"
                                checked={autoScroll}
                                onChange={(e) => setAutoScroll(e.target.checked)}
                            />
                            Auto-scroll
                        </label>

                        <button className="log-console-clear-btn" onClick={onClear}>
                            Effacer
                        </button>
                    </>
                )}

                {collapsed && <div style={{ flex: 1 }} />}
            </div>

            {/* Contenu - caché quand replié */}
            {!collapsed && (
                <div ref={containerRef} className="log-console-content">
                    {filteredLogs.map(log => (
                        <div key={log.id} className={`log-entry ${log.type}`}>
                            <span className="log-entry-time">[{log.timestamp}]</span> {log.message}
                        </div>
                    ))}
                    {filteredLogs.length === 0 && (
                        <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            En attente d'activité...
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
