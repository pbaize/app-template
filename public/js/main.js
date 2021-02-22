// uncomment line below to register offline cache service worker 
// navigator.serviceWorker.register('../serviceworker.js');
const average = (array) => array.reduce((a, b) => a + b) / array.length;

if (typeof fin !== 'undefined') {
    init();
} else {
    document.querySelector('#of-version').innerText =
        'The fin API is not available - you are probably running in a browser.';
}


async function pMapSerial(arr, f) {
    return await arr.reduce(async (p, ...args) => ([...(await p), await f(...args)]), Promise.resolve([]));
}

//once the DOM has loaded and the OpenFin API is ready
async function init() {
    await fin.Platform.init();
    const times = await pMapSerial(Array(100).fill(), openWindow);
    const mean = average(times);
    document.querySelector('#perf').innerText = mean;
    const wins = await fin.Application.getCurrentSync().getChildWindows()
    wins.forEach(w => w.close(true))
}

async function openWindow() {
    let x = performance.now();
    await fin.Platform.getCurrentSync().createView({ url: 'about:blank' });
    return performance.now() - x
}