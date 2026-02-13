/**
 * Éléa-Auto : Protocole d'automation pour Filius Web
 * 
 * Ajouter dans index.html : <script src="elea-auto-filius.js"></script>
 * 
 * Utilisé par Puppeteer pour :
 * - Exécuter des actions dans l'application
 * - Récupérer les zones d'intérêt pour les captures d'écran
 * - Afficher un pointeur rose pour guider l'élève
 */

(function() {
    'use strict';

    // =========================================================================
    // OVERLAY : Pointeur rose + surbrillance
    // =========================================================================

    let overlayContainer = null;
    let pointerEl = null;
    let highlightEl = null;

    function ensureOverlay() {
        if (overlayContainer) return;
        overlayContainer = document.createElement('div');
        overlayContainer.id = 'elea-auto-overlay';
        Object.assign(overlayContainer.style, {
            position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
            pointerEvents: 'none', zIndex: '999999'
        });
        document.body.appendChild(overlayContainer);

        // Style animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes elea-bounce {
                0%, 100% { transform: translate(-15%, -85%) scale(1); }
                50% { transform: translate(-15%, -95%) scale(1.08); }
            }
            @keyframes elea-pulse {
                0%, 100% { opacity: 0.35; }
                50% { opacity: 0.55; }
            }
            #elea-pointer {
                position: absolute;
                width: 64px; height: 64px;
                animation: elea-bounce 1s ease-in-out infinite;
                filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4));
                transition: left 0.3s ease, top 0.3s ease;
                display: none;
            }
            #elea-highlight {
                position: absolute;
                border: 3px dashed #ff4da6;
                border-radius: 8px;
                background: rgba(255, 77, 166, 0.12);
                animation: elea-pulse 1.5s ease-in-out infinite;
                transition: all 0.3s ease;
                display: none;
            }
        `;
        document.head.appendChild(style);

        // Pointeur : flèche rose SVG
        pointerEl = document.createElement('div');
        pointerEl.id = 'elea-pointer';
        pointerEl.innerHTML = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#ff69b4"/>
                    <stop offset="100%" stop-color="#ff1493"/>
                </linearGradient>
            </defs>
            <path d="M8 4 L8 52 L20 40 L32 58 L40 54 L28 36 L44 36 Z" 
                  fill="url(#pg)" stroke="#c0106a" stroke-width="2.5" stroke-linejoin="round"/>
        </svg>`;
        overlayContainer.appendChild(pointerEl);

        // Zone de surbrillance
        highlightEl = document.createElement('div');
        highlightEl.id = 'elea-highlight';
        overlayContainer.appendChild(highlightEl);
    }

    /**
     * Affiche le pointeur rose à une position écran (px)
     */
    function showPointer(x, y) {
        ensureOverlay();
        pointerEl.style.display = 'block';
        pointerEl.style.left = x + 'px';
        pointerEl.style.top = y + 'px';
    }

    /**
     * Affiche le pointeur sur un élément cible (string ou {x,y,width,height})
     */
    function showPointerOn(target) {
        const b = getBounds(target);
        if (!b) return;
        // Pointer au centre-haut de la zone
        showPointer(b.x + b.width / 2, b.y + 4);
    }

    /**
     * Affiche la surbrillance autour d'une zone
     */
    function showHighlight(target, padding) {
        padding = padding || 8;
        const b = (typeof target === 'string') ? getBounds(target) : target;
        if (!b) return;
        ensureOverlay();
        highlightEl.style.display = 'block';
        highlightEl.style.left = (b.x - padding) + 'px';
        highlightEl.style.top = (b.y - padding) + 'px';
        highlightEl.style.width = (b.width + padding * 2) + 'px';
        highlightEl.style.height = (b.height + padding * 2) + 'px';
    }

    /**
     * Masque tout l'overlay
     */
    function hideOverlay() {
        if (pointerEl) pointerEl.style.display = 'none';
        if (highlightEl) highlightEl.style.display = 'none';
    }

    // =========================================================================
    // SCREENSHOT : Zones de capture pour Puppeteer
    // =========================================================================

    /**
     * Retourne {x, y, width, height} d'un élément cible pour Puppeteer screenshot clip.
     * 
     * Cibles Filius (exemples) :
     *   "device:0"          → 1er appareil
     *   "device:PC-1"       → appareil par nom
     *   "device:0:ip"       → champ IP du 1er appareil (dans le panneau)
     *   "panel:properties"  → panneau de droite
     *   "panel:components"  → panneau de gauche
     *   "toolbar"           → barre d'outils
     *   "toolbar:add-pc"    → bouton ajouter PC
     *   "canvas"            → zone de travail
     *   "connection:0"      → 1ère connexion (câble)
     *   "window:0"          → 1ère fenêtre d'application ouverte
     *   "dialog"            → boîte de dialogue active
     */
    function getBounds(target) {
        if (typeof target === 'object' && target.x !== undefined) return target;

        const parts = target.split(':');
        const type = parts[0];
        const id = parts[1];
        const sub = parts[2];

        let el = null;

        switch (type) {
            case 'device': {
                const nodes = document.querySelectorAll('.device-node');
                if (!nodes.length) return null;
                // Par index ou par nom
                if (/^\d+$/.test(id)) {
                    el = nodes[parseInt(id)];
                } else {
                    el = Array.from(nodes).find(n => {
                        const label = n.querySelector('.device-label, .device-name');
                        return label && label.textContent.trim().includes(id);
                    });
                }
                if (!el) return null;
                // Sous-élément dans le panneau propriétés
                if (sub) {
                    // Cliquer d'abord sur le device pour ouvrir ses props
                    const propEl = findPropertyField(sub);
                    if (propEl) return rectOf(propEl);
                }
                return rectOf(el);
            }

            case 'panel': {
                if (id === 'properties' || id === 'right') {
                    el = document.querySelector('.properties-panel, .panel-right, [class*="properties"]');
                } else if (id === 'components' || id === 'left') {
                    el = document.querySelector('.component-panel, .panel-left, [class*="component"]');
                }
                return el ? rectOf(el) : null;
            }

            case 'toolbar': {
                if (!id) {
                    el = document.querySelector('.header, .toolbar, header');
                } else {
                    // Chercher un bouton par son texte ou classe
                    el = findButtonByText(id) || document.querySelector(`[data-action="${id}"], .btn-${id}`);
                }
                return el ? rectOf(el) : null;
            }

            case 'canvas': {
                el = document.querySelector('.canvas, .workspace, .canvas-area, [class*="canvas"]');
                return el ? rectOf(el) : null;
            }

            case 'connection': {
                const lines = document.querySelectorAll('.canvas-svg line, .canvas-svg path');
                const idx = parseInt(id) || 0;
                if (lines[idx]) {
                    const bbox = lines[idx].getBoundingClientRect();
                    return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
                }
                return null;
            }

            case 'window': {
                const wins = document.querySelectorAll('.app-window, .floating-window, [class*="window"]');
                const idx = parseInt(id) || 0;
                el = wins[idx];
                return el ? rectOf(el) : null;
            }

            case 'dialog': {
                el = document.querySelector('.modal.active, .dialog, [class*="modal"][class*="active"]');
                return el ? rectOf(el) : null;
            }

            case 'button': {
                el = findButtonByText(id);
                return el ? rectOf(el) : null;
            }

            case 'input': {
                el = findInputByLabel(id);
                return el ? rectOf(el) : null;
            }

            default:
                // Essayer comme sélecteur CSS
                el = document.querySelector(target);
                return el ? rectOf(el) : null;
        }
    }

    /**
     * Zone élargie pour capture (zoom sur l'action + contexte)
     */
    function getScreenshotRegion(target, padding) {
        padding = padding || 40;
        const b = getBounds(target);
        if (!b) return null;
        return {
            x: Math.max(0, b.x - padding),
            y: Math.max(0, b.y - padding),
            width: b.width + padding * 2,
            height: b.height + padding * 2
        };
    }

    // =========================================================================
    // ACTIONS : Commandes pour manipuler Filius
    // =========================================================================

    /**
     * Les commandes ci-dessous appellent les fonctions React internes.
     * Elles retournent true/false pour le succès.
     * 
     * L'accès aux states React se fait via les éléments DOM et les événements.
     */

    function clickElement(selector) {
        const el = (typeof selector === 'string') ? document.querySelector(selector) : selector;
        if (!el) return false;
        el.click();
        return true;
    }

    function typeInInput(selector, value) {
        const el = (typeof selector === 'string') ? document.querySelector(selector) : selector;
        if (!el) return false;
        // Simuler la saisie React
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value'
        ).set;
        nativeInputValueSetter.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    }

    // --- Actions spécifiques Filius ---

    function addDevice(type) {
        // Cliquer sur le bouton d'ajout dans le panneau composants
        const btn = findButtonByText(type) || findButtonByIcon(type);
        if (btn) { btn.click(); return true; }
        return false;
    }

    function selectDevice(indexOrName) {
        const nodes = document.querySelectorAll('.device-node');
        let el;
        if (typeof indexOrName === 'number') {
            el = nodes[indexOrName];
        } else {
            el = Array.from(nodes).find(n => {
                const label = n.querySelector('.device-label, .device-name');
                return label && label.textContent.includes(indexOrName);
            });
        }
        if (el) { el.click(); return true; }
        return false;
    }

    function setProperty(fieldLabel, value) {
        const input = findInputByLabel(fieldLabel);
        if (input) return typeInInput(input, value);
        return false;
    }

    function startConnection(deviceIndex) {
        selectDevice(deviceIndex);
        // Chercher le bouton "Connecter" dans le panneau
        const btn = findButtonByText('connecter') || findButtonByText('câble') || findButtonByText('relier');
        if (btn) { btn.click(); return true; }
        return false;
    }

    function openApp(deviceIndex, appName) {
        selectDevice(deviceIndex);
        // Double-cliquer ou chercher l'app dans le panneau
        const nodes = document.querySelectorAll('.device-node');
        const el = nodes[deviceIndex];
        if (el) {
            el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
            return true;
        }
        return false;
    }

    function typeCommand(windowIndex, command) {
        const wins = document.querySelectorAll('.app-window, .floating-window');
        const win = wins[windowIndex || 0];
        if (!win) return false;
        const input = win.querySelector('input[type="text"], .terminal-input, input');
        if (input) {
            typeInInput(input, command);
            // Simuler Entrée
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
            input.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, bubbles: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true }));
            return true;
        }
        return false;
    }

    // =========================================================================
    // UTILITAIRES
    // =========================================================================

    function rectOf(el) {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
    }

    function findButtonByText(text) {
        if (!text) return null;
        const lower = text.toLowerCase();
        const buttons = document.querySelectorAll('button, [role="button"], .btn, a.action');
        return Array.from(buttons).find(b => b.textContent.toLowerCase().includes(lower));
    }

    function findButtonByIcon(type) {
        const map = { 'pc': '💻', 'server': '🖥', 'switch': '🔀', 'router': '🌐', 'modem': '📡' };
        const icon = map[type.toLowerCase()];
        if (!icon) return null;
        const buttons = document.querySelectorAll('button, [role="button"], .component-item');
        return Array.from(buttons).find(b => b.textContent.includes(icon));
    }

    function findPropertyField(fieldName) {
        const lower = fieldName.toLowerCase();
        const labels = document.querySelectorAll('label, .prop-label, .field-label, span');
        for (const lbl of labels) {
            if (lbl.textContent.toLowerCase().includes(lower)) {
                // Chercher l'input frère/voisin
                const input = lbl.parentElement.querySelector('input, select, textarea');
                if (input) return input;
                const next = lbl.nextElementSibling;
                if (next && (next.tagName === 'INPUT' || next.tagName === 'SELECT')) return next;
            }
        }
        return null;
    }

    function findInputByLabel(labelText) {
        return findPropertyField(labelText);
    }

    // =========================================================================
    // EXPORT : window.eleaAuto
    // =========================================================================

    window.eleaAuto = {
        app: 'filius',

        // --- Overlay ---
        showPointer: showPointer,
        showPointerOn: showPointerOn,
        showHighlight: showHighlight,
        hideOverlay: hideOverlay,

        // --- Capture ---
        getBounds: getBounds,
        getScreenshotRegion: getScreenshotRegion,

        // --- Actions ---
        addDevice: addDevice,
        selectDevice: selectDevice,
        setProperty: setProperty,
        startConnection: startConnection,
        openApp: openApp,
        typeCommand: typeCommand,
        click: clickElement,
        type: typeInInput,

        // --- Raccourcis pour le JSON ---
        exec: function(cmd, args) {
            args = args || {};
            switch (cmd) {
                case 'addDevice':       return addDevice(args.type);
                case 'selectDevice':    return selectDevice(args.index ?? args.name);
                case 'setProperty':     return setProperty(args.field, args.value);
                case 'setIP':           return setProperty('ip', args.ip);
                case 'setMask':         return setProperty('masque', args.mask);
                case 'setGateway':      return setProperty('passerelle', args.gateway);
                case 'setDNS':          return setProperty('dns', args.dns);
                case 'setName':         return setProperty('nom', args.name);
                case 'connect':         return startConnection(args.from);
                case 'openApp':         return openApp(args.device, args.app);
                case 'typeCommand':     return typeCommand(args.window, args.command);
                case 'click':           return clickElement(args.selector);
                case 'type':            return typeInInput(args.selector, args.value);
                default:
                    console.warn('[eleaAuto] Commande inconnue:', cmd);
                    return false;
            }
        }
    };

    console.log('✅ [eleaAuto] Filius Web - protocole d\'automation chargé');
})();
