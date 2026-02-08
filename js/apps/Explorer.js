/* ============================================
   FILIUS WEB - APPLICATION EXPLORATEUR
   Explorateur de fichiers virtuel
   ============================================ */

function ExplorerApp({ device }) {
    const [currentPath, setCurrentPath] = React.useState('/home/user');
    const [selectedFile, setSelectedFile] = React.useState(null);

    const getCurrentDir = () => device.filesystem[currentPath];

    const navigate = (path) => {
        if (device.filesystem[path]?.type === 'dir') {
            setCurrentPath(path);
            setSelectedFile(null);
        }
    };

    const goUp = () => {
        const parts = currentPath.split('/').filter(Boolean);
        if (parts.length > 0) {
            parts.pop();
            navigate('/' + parts.join('/') || '/');
        }
    };

    const openItem = (name) => {
        const fullPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
        const item = device.filesystem[fullPath];

        if (item?.type === 'dir') {
            navigate(fullPath);
        } else if (item?.type === 'file') {
            setSelectedFile({ path: fullPath, name, ...item });
        }
    };

    const dir = getCurrentDir();

    return (
        <div className="explorer">
            {/* Barre de navigation */}
            <div className="explorer-toolbar">
                <button
                    className="browser-btn"
                    onClick={goUp}
                    disabled={currentPath === '/'}
                >
                    ⬆️
                </button>
                <button
                    className="browser-btn"
                    onClick={() => navigate('/home/user')}
                >
                    🏠
                </button>
                <div className="explorer-path">{currentPath}</div>
            </div>

            {/* Contenu */}
            <div className="explorer-content">
                {/* Liste des fichiers */}
                <div className="explorer-files">
                    {dir?.children?.length > 0 ? (
                        <div className="explorer-grid">
                            {dir.children.map(name => {
                                const fullPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
                                const item = device.filesystem[fullPath];
                                const isDir = item?.type === 'dir';
                                const isSelected = selectedFile?.path === fullPath;

                                return (
                                    <div
                                        key={name}
                                        className={`explorer-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => setSelectedFile({ path: fullPath, name, ...item })}
                                        onDoubleClick={() => openItem(name)}
                                    >
                                        <div className="explorer-item-icon">
                                            {isDir ? '📁' : name.endsWith('.html') ? '🌐' : '📄'}
                                        </div>
                                        <div className="explorer-item-name">{name}</div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: 'var(--text-dim)'
                        }}>
                            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                            <div>Dossier vide</div>
                        </div>
                    )}
                </div>

                {/* Panneau de détails */}
                {selectedFile && (
                    <div className="explorer-details">
                        <div style={{ fontSize: '40px', textAlign: 'center', marginBottom: '12px' }}>
                            {selectedFile.type === 'dir' ? '📁' : '📄'}
                        </div>
                        <div style={{
                            fontWeight: 500,
                            textAlign: 'center',
                            marginBottom: '16px',
                            wordBreak: 'break-word',
                            fontSize: '13px'
                        }}>
                            {selectedFile.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                            <div style={{ marginBottom: '8px' }}>
                                <strong>Type:</strong> {selectedFile.type === 'dir' ? 'Dossier' : 'Fichier'}
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                                <strong>Chemin:</strong><br />
                                <span className="font-mono" style={{ fontSize: '10px' }}>{selectedFile.path}</span>
                            </div>
                            {selectedFile.content && (
                                <div>
                                    <strong>Taille:</strong> {selectedFile.content.length} octets
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
