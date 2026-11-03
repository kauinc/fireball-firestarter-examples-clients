var scrollController = {

    mouseY: 0,
    height: 0,
    dragged: false,
    isFullScreen: false,
    resizeTimeout: null,

    initialize: function () {
        window.addEventListener('resize', this.onResize.bind(this));
        window.addEventListener("scroll", this.onScroll.bind(this), { passive: false });
        window.addEventListener("mousewheel", this.onScroll.bind(this), { passive: false });
        window.addEventListener("DOMMouseScroll", this.onScroll.bind(this), { passive: false });
        window.addEventListener('touchstart', this.onTouchStart.bind(this));
        window.addEventListener('touchend', this.onTouchEnd.bind(this));
        window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });

        this.onExitFullScreen();
    },

    onTouchStart: function (event) {
        this.dragged = true;
        this.mouseY = event.touches ? event.touches[0].clientY : event.clientY;
    },

    onTouchEnd: function () {
        this.dragged = false;
    },

    onTouchMove: function (event) {
        if (this.dragged) {
            var mouseY = event.touches ? event.touches[0].clientY : event.clientY;
            var scrollDelta = mouseY - this.mouseY;
            this.mouseY = mouseY;
            if (scrollDelta > 0 && this.scrollTop() > 50 && this.scrollTop() < 400) {
                event.preventDefault();
            }
        }
    },

    onScroll: function () {
        if (!this.mouseY && this.scrollTop() > 0) {
            setTimeout(function () {
                window.scrollTo(0, 0);
            }, 100);
        }
    },

    onResize: function () {
        if (this.height !== this.windowHeight()) {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(function () {
                if (scrollController.windowHeight() < scrollController.height) {
                    scrollController.onExitFullScreen();
                }
                else {
                    scrollController.onEnterFullScreen();
                }
                scrollController.height = scrollController.windowHeight();
            }, 100);
        }
    },

    scrollTop: function () {
        return document.documentElement.scrollTop || window.pageYOffset;
    },

    windowHeight: function () {
        return window.innerHeight > document.documentElement.clientHeight ? window.innerHeight : document.documentElement.clientHeight;
    },

    onEnterFullScreen: function () {
        console.log('[Scroll] onEnterFullScreen');
        this.isFullScreen = true;
        if (this.isMobile()) {
            document.body.style.overflowY = "hidden";
        }
    },

    onExitFullScreen: function () {
        console.log('[Scroll] onExitFullScreen');
        this.isFullScreen = false;
        if (this.isMobile()) {
            document.body.style.overflowY = "scroll";
            window.scrollTo(0, 0);
        }
    },

    isMobile: function () {
        return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
            // iOS simulators
            || ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(navigator.platform)
            // iPad on iOS 13 detection
            || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
    }
}
scrollController.initialize();