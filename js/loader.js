/**
 * LOADER CONTROLLER - PROFESSIONAL EDITION
 * Minimalist, snappy, and reliable.
 */

(function () {
    // Configuration
    const CONFIG = {
        minLoadTime: 5000, // Increased to 5s minimum as requested
        maxLoadTime: 7000, // Adjusted max time to 7s
        fadeOutDuration: 400 // Matches CSS transition
    };

    const startTime = Date.now();
    let isLoaded = false;

    // Helper: Initialize Theme for Loader immediately
    // This prevents a "flash of wrong theme" if possible
    function initLoaderTheme() {
        try {
            const savedTheme = localStorage.getItem('theme') || 'light';
            // We apply it to the main document element as the CSS relies on [data-theme]
            document.documentElement.setAttribute('data-theme', savedTheme);
        } catch (e) {
            console.warn('Could not access localStorage for theme preference');
        }
    }

    // Initialize
    initLoaderTheme();

    // CHECK SESSION: If already loaded, hide immediately and skip
    if (sessionStorage.getItem('bizHubFirstLoadDone')) {
        const style = document.createElement('style');
        style.textContent = '#appLoader { display: none !important; }';
        document.head.appendChild(style);

        const existingLoader = document.getElementById('appLoader');
        if (existingLoader) existingLoader.style.display = 'none';

        return;
    }

    const loaderHTML = `
    <div id="appLoader" class="app-loader">
        <div class="loader-bg-anim">
            <div class="loader-blob blob-1"></div>
            <div class="loader-blob blob-2"></div>
            <div class="loader-blob blob-3"></div>
        </div>
        <div class="loader-scatter">
            <img src="images/loader/avadh_1.jpg" class="scatter-item item-1" alt="Avadh Feature 1">
            <img src="images/loader/avadh_2.jpg" class="scatter-item item-2" alt="Avadh Feature 2">
            <img src="images/loader/avadh_3.jpg" class="scatter-item item-3" alt="Avadh Feature 3">
            <img src="images/loader/avadh_4.jpg" class="scatter-item item-4" alt="Avadh Feature 4">
            <img src="images/loader/avadh_5.jpg" class="scatter-item item-5" alt="Avadh Feature 5">
        </div>
        <div class="loader-content">
            <div class="loader-logo-pulse"><img src="images/logo.jpg" class="logo-img" style="width: 80px; height: 80px;"></div>
            <div class="loader-brand">Avadh BizHub</div>
            <div class="loader-dots">
                <span></span><span></span><span></span>
            </div>
        </div>
    </div>
    `;

    // Initialize Loader
    function initLoader() {
        // Check if loader already exists (static HTML)
        let loader = document.getElementById('appLoader');

        if (!loader) {
            // Inject if missing (fallback)
            document.body.insertAdjacentHTML('afterbegin', loaderHTML);
            loader = document.getElementById('appLoader');
        } else {
            // If static loader exists, ensure scatter elements are present
            if (!loader.querySelector('.loader-scatter')) {
                const scatterHTML = `
                <div class="loader-scatter">
                    <img src="images/loader/avadh_1.jpg" class="scatter-item item-1" alt="Avadh Feature 1">
                    <img src="images/loader/avadh_2.jpg" class="scatter-item item-2" alt="Avadh Feature 2">
                    <img src="images/loader/avadh_3.jpg" class="scatter-item item-3" alt="Avadh Feature 3">
                    <img src="images/loader/avadh_4.jpg" class="scatter-item item-4" alt="Avadh Feature 4">
                    <img src="images/loader/avadh_5.jpg" class="scatter-item item-5" alt="Avadh Feature 5">
                </div>`;
                loader.insertAdjacentHTML('afterbegin', scatterHTML);
            }
        }

        // Inject Many Triangles (Dynamic Background)
        if (!loader.querySelector('.loader-bg-triangles')) {
            const trianglesDiv = document.createElement('div');
            trianglesDiv.className = 'loader-bg-triangles';
            let trianglesHTML = '';

            // Create 25 random triangles
            for (let i = 0; i < 25; i++) {
                const top = Math.random() * 100;
                const left = Math.random() * 100;
                const size = 30 + Math.random() * 50; // Bigger sizing
                const delay = -1 * Math.random() * 20;
                const duration = 12 + Math.random() * 20;
                const rotate = Math.random() * 360;
                // Varied opacity and colors (Indigo, Violet, Blue, Pink)
                const r = [99, 139, 59, 236][Math.floor(Math.random() * 4)];
                const g = [102, 92, 130, 72][Math.floor(Math.random() * 4)];
                const b = [241, 246, 246, 153][Math.floor(Math.random() * 4)];
                const alpha = 0.05 + Math.random() * 0.15; // 0.05 to 0.2 opacity

                trianglesHTML += `
                 <div class="loader-triangle" style="
                     position: absolute;
                     top: ${top}%;
                     left: ${left}%;
                     width: 0;
                     height: 0;
                     border-style: solid;
                     border-width: 0 ${size / 2}px ${size}px ${size / 2}px;
                     border-color: transparent transparent rgba(${r}, ${g}, ${b}, ${alpha}) transparent;
                     animation: floatTriangle ${duration}s infinite linear;
                     animation-delay: ${delay}s;
                     transform: rotate(${rotate}deg);
                     z-index: 0;
                 "></div>`;
            }
            trianglesDiv.innerHTML = trianglesHTML;
            // Insert before scatter (which is z-index 1)
            const scatter = loader.querySelector('.loader-scatter');
            if (scatter) {
                loader.insertBefore(trianglesDiv, scatter);
            } else {
                loader.appendChild(trianglesDiv);
            }
        }

        // Expose global hide function for other scripts
        window.hideLoader = hideLoader;

        // Calculate load time
        const loadTime = Math.random() * (CONFIG.maxLoadTime - CONFIG.minLoadTime) + CONFIG.minLoadTime;

        // Hide loader after calculated time
        setTimeout(() => {
            hideLoader();
            sessionStorage.setItem('bizHubFirstLoadDone', 'true');
        }, loadTime);
    }

    function hideLoader() {
        const loader = document.getElementById('appLoader');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.visibility = 'hidden';
            setTimeout(() => {
                // Optional: remove from DOM if desired
            }, CONFIG.fadeOutDuration); // Match CSS transition
        }
    }

    // Public API
    window.BizHubLoader = {
        hide: hideLoader,
        show: () => {
            const loader = document.getElementById('appLoader');
            if (loader) {
                loader.style.visibility = 'visible';
                loader.style.opacity = '1';
            }
        },
        // Simplified status update (optional use)
        setStatus: function (text) {
            const el = document.querySelector('.loader-status');
            if (el) el.textContent = text;
        }
    };

    // Event listener removed to enforce minimum load time logic in initLoader()

    // Fallback: If window.load doesn't fire (rare) or takes too long
    setTimeout(() => {
        if (!isLoaded) {
            console.log('Loader timeout fallback triggered');
            window.BizHubLoader.hide();
        }
    }, CONFIG.maxLoadTime);

    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLoader);
    } else {
        initLoader();
    }

})();
