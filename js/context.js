/* ============================================
   FILIUS WEB - CONTEXTE REACT
   Contexte global pour partager l'état entre composants
   ============================================ */

const NetworkContext = React.createContext(null);

// Hook personnalisé pour utiliser le contexte
function useNetwork() {
    const context = React.useContext(NetworkContext);
    if (!context) {
        throw new Error('useNetwork doit être utilisé dans NetworkContext.Provider');
    }
    return context;
}
