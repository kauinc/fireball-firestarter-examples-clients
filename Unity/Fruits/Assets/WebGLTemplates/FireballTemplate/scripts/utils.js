function AddLink(rel, href) {
    var head = document.getElementsByTagName('head')[0];
    var link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    head.appendChild(link);
}

function AddScript(src) {
    const script = document.createElement("script");
    script.src = src;
    document.body.appendChild(script);
}

function AddImage(elementId, src) {
    var elem = document.createElement("img");
    elem.src = src;
    document.getElementById(elementId).appendChild(elem);
}

function UpdateGameWindowSize() {
    var windowWidth = GetWindowWidth();
    var windowHeight = GetWindowHeght();

    container.style.height = windowHeight + 'px';
    container.style.width = windowWidth + 'px';
    window.scroll(0, 0);
}

function GetWindowWidth() {
    return window.innerWidth > document.documentElement.clientWidth ? window.innerWidth : document.documentElement.clientWidth;
}

function GetWindowHeght() {
    return window.innerHeight > document.documentElement.clientHeight ? window.innerHeight : document.documentElement.clientHeight;
}

function isLandscape() {
    return Math.abs(window.orientation) === 90;
}

function iOS() {
    return ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(navigator.platform)
        // iPad on iOS 13 detection
        || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
}
function isMobile() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

if (isMobile() || iOS()) {
    container.className = "unity-mobile";
    config.devicePixelRatio = 2;
}
