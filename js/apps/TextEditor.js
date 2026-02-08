/* ============================================
   FILIUS WEB - APPLICATION ÉDITEUR DE TEXTE
   Éditeur pour modifier les fichiers virtuels
   ============================================ */

function TextEditorApp({ device }) {
    const { updateDevice, addLog } = useNetwork();

    const [currentFile, setCurrentFile] = React.useState(null);
    const [content, setContent] = React.useState('');
    const [modified, setModified] = React.useState(false);
    const [showFileDialog, setShowFileDialog] = React.useState(false);

    const openFile = (path) => {
        const file = device.filesystem[path];
        if (file?.type === 'file') {
            setCurrentFile(path);
            setContent(file.content);
            setModified(false);
        }
        setShowFileDialog(false);
    };

    const saveFile = () => {
        if (!currentFile) return;

        const newFilesystem = {
            ...device.filesystem,
            [currentFile]: {
                ...device.filesystem[currentFile],
                content
            }
        };

        updateDevice(device.id, { filesystem: newFilesystem });
        setModified(false);
        addLog(`Fichier sauvegardé: ${currentFile}`, 'success');
    };

    const newFile = () => {
        const fileName = prompt('Nom du nouveau fichier:', 'nouveau.txt');
        if (fileName) {
            const path = `/home/user/documents/${fileName}`;
            const parentPath = '/home/user/documents';

            const newFilesystem = {
                ...device.filesystem,
                [path]: { type: 'file', content: '' }
            };

            // Ajouter au dossier parent
            if (newFilesystem[parentPath]) {
                newFilesystem[parentPath] = {
                    ...newFilesystem[parentPath],
                    children: [...newFilesystem[parentPath].children, fileName]
                };
            }

            updateDevice(device.id, { filesystem: newFilesystem });
            setCurrentFile(path);
            setContent('');
            setModified(false);
        }
    };

    const getFileList = () => {
        const files = [];
        const walk = (path) => {
            const item = device.filesystem[path];
            if (item?.type === 'file') {
                files.push(path);
            } else if (item?.type === 'dir') {
                item.children?.forEach(child => {
                    walk(path === '/' ? `/${child}` : `${path}/${child}`);
                });
            }
        };
        walk('/');
        return files;
    };

    return (
        <div className="texteditor">
            {/* Barre d'outils */}
            <div className="texteditor-toolbar">
                <button className="texteditor-btn" onClick={newFile}>
                    📄 Nouveau
                </button>
                <button className="texteditor-btn" onClick={() => setShowFileDialog(true)}>
                    📂 Ouvrir
                </button>
                <button
                    className={`texteditor-btn ${modified ? 'save' : ''}`}
                    onClick={saveFile}
                    disabled={!currentFile}
                >
                    💾 Sauvegarder
                </button>
                <div style={{ flex: 1 }} />
                <span className="texteditor-filename">
                    {currentFile || 'Aucun fichier'}
                    {modified && ' •'}
                </span>
            </div>

            {/* Zone d'édition */}
            <textarea
                className="texteditor-content"
                value={content}
                onChange={(e) => {
                    setContent(e.target.value);
                    setModified(true);
                }}
                placeholder={currentFile ? 'Commencez à écrire...' : 'Ouvrez ou créez un fichier pour commencer'}
                disabled={!currentFile}
            />

            {/* Barre de statut */}
            <div className="texteditor-statusbar">
                <span>{content.split('\n').length} lignes</span>
                <span>{content.length} caractères</span>
            </div>

            {/* Dialogue de sélection de fichier */}
            {showFileDialog && (
                <div
                    className="modal-overlay"
                    onClick={() => setShowFileDialog(false)}
                >
                    <div
                        className="modal"
                        style={{ width: '350px', maxHeight: '400px' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h3 className="modal-title">Ouvrir un fichier</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowFileDialog(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-content" style={{ maxHeight: '300px', overflow: 'auto' }}>
                            <div className="flex flex-col gap-1">
                                {getFileList().map(path => (
                                    <button
                                        key={path}
                                        onClick={() => openFile(path)}
                                        style={{
                                            padding: '10px 12px',
                                            background: 'var(--bg-card)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '6px',
                                            color: 'var(--text)',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            fontFamily: 'JetBrains Mono',
                                            fontSize: '12px'
                                        }}
                                    >
                                        📄 {path}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
