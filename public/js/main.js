// uncomment line below to register offline cache service worker 
// navigator.serviceWorker.register('../serviceworker.js');

if (typeof fin !== 'undefined') {
    init();
} else {
    document.querySelector('#of-version').innerText =
        'The fin API is not available - you are probably running in a browser.';
}
const SYSTEM_CHANNELS = [
    {
        id: 'red',
        visualIdentity: {
            name: 'Red',
            color: '#FF0000',
            glyph: 'https://openfin.co/favicon.ico'
        }
    },
    {
        id: 'orange',
        visualIdentity: {
            name: 'Orange',
            color: '#FF8000',
            glyph: 'https://openfin.co/favicon.ico'
        }
    },
    {
        id: 'yellow',
        visualIdentity: {
            name: 'Yellow',
            color: '#FFFF00',
            glyph: 'https://openfin.co/favicon.ico'
        }
    },
    {
        id: 'green',
        visualIdentity: {
            name: 'Green',
            color: '#00FF00',
            glyph: 'https://openfin.co/favicon.ico'
        }
    },
    {
        id: 'blue',
        visualIdentity: {
            name: 'Blue',
            color: '#0000FF',
            glyph: 'https://openfin.co/favicon.ico'
        }
    },
    {
        id: 'purple',
        visualIdentity: {
            name: 'Purple',
            color: '#FF00FF',
            glyph: 'https://openfin.co/favicon.ico'
        }
    }
];
//once the DOM has loaded and the OpenFin API is ready
async function init() {
    //get a reference to the current Application.
    const app = await fin.Application.getCurrent();
    const win = await fin.Window.getCurrent();

    const ofVersion = document.querySelector('#of-version');
    ofVersion.innerText = await fin.System.getVersion();

    //Only launch new windows from the main window.
    if (win.identity.name === app.identity.uuid) {
        //subscribing to the run-requested events will allow us to react to secondary launches, clicking on the icon once the Application is running for example.
        //for this app we will  launch a child window the first the user clicks on the desktop.
        app.once('run-requested', async () => {
            await fin.Window.create({
                name: 'childWindow',
                url: location.href,
                defaultWidth: 320,
                defaultHeight: 320,
                autoShow: true
            });
        });
    }
}
