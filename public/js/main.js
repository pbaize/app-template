// uncomment line below to register offline cache service worker 
// navigator.serviceWorker.register('../serviceworker.js');

if (typeof fin !== 'undefined') {
    init();
} else {
    document.querySelector('#of-version').innerText =
        'The fin API is not available - you are probably running in a browser.';
}
//once the DOM has loaded and the OpenFin API is ready
async function init() {
    //get a reference to the current Application.
    const app = await fin.Application.getCurrent();
    const win = await fin.Window.getCurrent();
    const uuid = win.identity.uuid
    await win.showDeveloperTools();
    const ofVersion = document.querySelector('#of-version');
    ofVersion.innerText = await fin.System.getVersion();

    //Only launch new windows from the main window.
    if (win.identity.name === app.identity.uuid) {
        //subscribing to the run-requested events will allow us to react to secondary launches, clicking on the icon once the Application is running for example.
        //for this app we will  launch a child window the first the user clicks on the desktop.
        const agent = await window.fdc3.Agent.create('test')
        agent
        console.log('in Main window')
        await agent.registerIntentResolver((intent,context,target,identity) => {
            console.log('intent received', intent, context, identity)
            if (identity.name === '1') {
               agent.sendIntentToClient({uuid, name: '2'}, intent, context)
            } else {
                agent.sendIntentToClient({ uuid, name: '1' }, intent, context)
            }     
        })
        agent.onIntentListenerAdded(console.log)
        await fin.Window.create({url: location.href,name: '1', uuid})
        await fin.Window.create({url: location.href,name: '2', uuid})
    } else {
        console.log('in', win.identity.name)
        fdc3.addIntentListener('test', console.log)
        setTimeout(() => {
            fdc3.raiseIntent('test', 'hello from ' + win.identity.name);
        }, 5000)
    }
}
