/* ============================================
   FILIUS WEB - APPLICATION NAVIGATEUR
   Navigateur web pour accéder aux serveurs HTTP
   ============================================ */

function BrowserApp({ device }) {
    const { httpRequest } = useNetwork();

    const [url, setUrl] = React.useState('http://');
    const [content, setContent] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [history, setHistory] = React.useState([]);
    const [historyIndex, setHistoryIndex] = React.useState(-1);

    // Navigation vers une URL
    const navigate = async (targetUrl) => {
        if (!targetUrl || targetUrl === 'http://' || targetUrl === 'https://') return;

        const fullUrl = targetUrl.startsWith('http') ? targetUrl : `http://${targetUrl}`;
        setUrl(fullUrl);
        setLoading(true);
        setContent(null);

        const response = await httpRequest(device, fullUrl);

        setLoading(false);
        setHistory(prev => [...prev.slice(0, historyIndex + 1), fullUrl]);
        setHistoryIndex(prev => prev + 1);

        if (response.success) {
            setContent({
                html: response.content,
                status: response.status
            });
        } else {
            setContent({
                error: true,
                message: response.error || 'Impossible de charger la page',
                status: response.status
            });
        }
    };

    const goBack = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setUrl(history[newIndex]);
            navigate(history[newIndex]);
        }
    };

    const goForward = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setUrl(history[newIndex]);
            navigate(history[newIndex]);
        }
    };

    const goHome = () => {
        setUrl('http://');
        setContent(null);
    };

    const refresh = () => navigate(url);

    return (
        <div className="browser">
            {/* Barre de navigation */}
            <div className="browser-toolbar">
                <button
                    className="browser-btn"
                    onClick={goBack}
                    disabled={historyIndex <= 0}
                >
                    ◀
                </button>
                <button
                    className="browser-btn"
                    onClick={goForward}
                    disabled={historyIndex >= history.length - 1}
                >
                    ▶
                </button>
                <button className="browser-btn" onClick={refresh}>
                    🔄
                </button>
                <button className="browser-btn" onClick={goHome}>
                    🏠
                </button>

                <div className="browser-url-bar">
                    <span className="browser-url-icon">🔒</span>
                    <input
                        className="browser-url-input"
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && navigate(url)}
                        placeholder="Entrez une URL..."
                    />
                </div>

                <button className="browser-go-btn" onClick={() => navigate(url)}>
                    Aller
                </button>
            </div>

            {/* Contenu */}
            <div className="browser-content">
                {loading && (
                    <div className="browser-loading">
                        <div className="browser-loading-icon animate-spin">🌐</div>
                        <div style={{ marginTop: '16px' }}>Chargement...</div>
                    </div>
                )}

                {!loading && !content && (
                    <div className="browser-empty">
                        <div className="browser-empty-icon">🌍</div>
                        <div style={{ fontSize: '20px', fontWeight: 500, marginBottom: '8px', color: '#333' }}>
                            Navigateur Web Filius
                        </div>
                        <div style={{ color: '#888' }}>
                            Entrez une URL pour naviguer
                        </div>
                        <div style={{
                            marginTop: '24px',
                            padding: '12px 20px',
                            background: '#f5f5f5',
                            borderRadius: '8px',
                            fontSize: '14px',
                            color: '#666'
                        }}>
                            💡 Essayez: http://192.168.0.x ou http://nom-serveur
                        </div>
                    </div>
                )}

                {!loading && content && (
                    content.error ? (
                        <div className="browser-error">
                            <div className="browser-error-icon">😵</div>
                            <div style={{ fontSize: '24px', color: '#333', marginBottom: '8px' }}>
                                Impossible d'accéder à ce site
                            </div>
                            <div style={{ color: '#666', textAlign: 'center' }}>
                                {content.message}
                            </div>
                            {content.status > 0 && (
                                <div style={{
                                    marginTop: '16px',
                                    padding: '8px 16px',
                                    background: '#fee',
                                    borderRadius: '4px',
                                    color: '#c00'
                                }}>
                                    Code HTTP: {content.status}
                                </div>
                            )}
                        </div>
                    ) : (
                        <iframe
                            srcDoc={content.html}
                            style={{
                                width: '100%',
                                height: '100%',
                                border: 'none'
                            }}
                            sandbox="allow-same-origin"
                            title="Page web"
                        />
                    )
                )}
            </div>

            {/* Barre de statut */}
            <div className="browser-statusbar">
                <span>{loading ? 'Chargement...' : content?.status ? `HTTP ${content.status}` : 'Prêt'}</span>
                <span>IP: {device.ip}</span>
            </div>
        </div>
    );
}
