/* ============================================
   FILIUS WEB - FENÊTRE D'APPLICATION
   Container pour les applications (terminal, navigateur, etc.)
   ============================================ */

function AppWindow({ window: win, zIndex, onClose, onFocus, onUpdate }) {
    const { devices } = useNetwork();
    const device = devices.find(d => d.id === win.deviceId);

    const [position, setPosition] = React.useState({ x: win.x, y: win.y });
    const [size, setSize] = React.useState({ width: win.width, height: win.height });
    const [dragging, setDragging] = React.useState(false);
    const [resizing, setResizing] = React.useState(false);
    const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });

    // Générer le titre avec l'IP pour la ligne de commande
    const getWindowTitle = () => {
        if (win.appType === 'commandline' && device) {
            return `${device.name} - ${device.ip || 'Sans IP'}`;
        }
        return win.title;
    };

    // Début du drag de la fenêtre
    const handleMouseDown = (e) => {
        if (e.target.closest('.window-content') || e.target.closest('.resize-handle')) return;
        onFocus();
        setDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    // Début du redimensionnement
    const handleResizeStart = (e) => {
        e.stopPropagation();
        onFocus();
        setResizing(true);
        setDragOffset({
            x: e.clientX,
            y: e.clientY,
            width: size.width,
            height: size.height
        });
    };

    // Référence au contenu de la fenêtre pour refocus après drag
    const contentRef = React.useRef(null);

    // Gestion du mouvement
    React.useEffect(() => {
        if (!dragging && !resizing) return;

        const handleMove = (e) => {
            if (dragging) {
                setPosition({
                    x: Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 100)),
                    y: Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 100))
                });
            }
            if (resizing) {
                setSize({
                    width: Math.max(300, dragOffset.width + (e.clientX - dragOffset.x)),
                    height: Math.max(200, dragOffset.height + (e.clientY - dragOffset.y))
                });
            }
        };

        const handleUp = () => {
            const wasDragging = dragging;
            setDragging(false);
            setResizing(false);
            
            // Refocus dans la fenêtre après le drag
            if (wasDragging && contentRef.current) {
                // Chercher un input dans le contenu et le focuser
                setTimeout(() => {
                    const input = contentRef.current.querySelector('input:not([disabled]), textarea:not([disabled])');
                    if (input) {
                        input.focus();
                    }
                }, 10);
            }
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
        };
    }, [dragging, resizing, dragOffset]);

    if (!device) return null;

    // Sélection du composant d'application
    const AppComponent = {
        commandline: CommandLineApp,
        terminal: TerminalApp,
        browser: BrowserApp,
        explorer: ExplorerApp,
        texteditor: TextEditorApp,
        webserver: WebServerApp,
        dnsserver: DNSServerApp,
        dhcpserver: DHCPServerApp
    }[win.appType];

    return (
        <div
            className="app-window animate-scaleIn"
            onMouseDown={(e) => {
                // Ne pas déclencher onFocus si on clique sur le bouton fermer
                if (!e.target.closest('.app-window-close')) {
                    onFocus();
                }
            }}
            style={{
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
                zIndex
            }}
        >
            {/* Barre de titre */}
            <div className="app-window-header" onMouseDown={handleMouseDown}>
                <div className="app-window-title">
                    <span className="app-window-title-icon">{win.icon}</span>
                    <span className="app-window-title-text">{getWindowTitle()}</span>
                </div>
                <button
                    className="app-window-close"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        e.preventDefault();
                        onClose(); 
                    }}
                />
            </div>

            {/* Contenu */}
            <div ref={contentRef} className="app-window-content window-content">
                {AppComponent && <AppComponent device={device} />}
            </div>

            {/* Poignée de redimensionnement */}
            <div
                className="app-window-resize resize-handle"
                onMouseDown={handleResizeStart}
            />
        </div>
    );
}
