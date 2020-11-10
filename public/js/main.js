// uncomment line below to register offline cache service worker 
// navigator.serviceWorker.register('../serviceworker.js');
const average = (array) => array.reduce((a, b) => a + b) / array.length;

if (typeof fin !== 'undefined') {
    init();
} else {
    document.querySelector('#of-version').innerText =
        'The fin API is not available - you are probably running in a browser.';
}


//once the DOM has loaded and the OpenFin API is ready
async function init() {
    const times = Array(100).fill().map(openWindow);
    const mean = average(times);
    document.querySelector('#perf').innerText = mean;
    const wins = await fin.Application.getCurrentSync().getChildWindows()
    wins.forEach(w => w.close(true))
}

function openWindow() {
    let x = performance.now();
    window.open()
    return performance.now() - x
}