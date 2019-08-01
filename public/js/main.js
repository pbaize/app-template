//register service worker
// navigator.serviceWorker.register('../serviceworker.js');

var config = {
    settings: {
        hasHeaders: true,
        constrainDragToContainer: false,
        reorderEnabled: true,
        selectionEnabled: false,
        popoutWholeStack: false,
        blockedPopoutsThrowError: false,
        closePopoutsOnUnload: false,
        showPopoutIcon: true,
        showMaximiseIcon: true,
        showCloseIcon: true
    },
    dimensions: {
        borderWidth: 0,
        minItemHeight: 10,
        minItemWidth: 10,
        headerHeight: 20,
        dragProxyWidth: 300,
        dragProxyHeight: 200
    },
    content: [{
        type: 'stack',
        content: []
    }]
};

if (typeof fin !== 'undefined') {
    init()
}
var myLayout;
let maximized = false;
//once the DOM has loaded and the OpenFin API is ready
async function init() {

    const app = await fin.Application.getCurrent();
    const win = await fin.Window.getCurrent();
    const size = await win.getBounds();
    await win.updateOptions({
        frame: false
    })

    myLayout = new GoldenLayout(config);
    window.myLayout = myLayout

    myLayout.registerComponent('browserView', function (container, state) {
        const elementId = `bv-container-${state.identity.name}`
        const element = $(`<div class="bv-container" id="${elementId}"></div>`);
        // Append it to the DOM
        container.getElement().append(element);
    });

    myLayout.on('stackCreated', function (stack) {

        /*
         * Accessing the DOM element that contains the popout, maximise and * close icon
         */
        stack.header.controlsContainer.find('.lm_popout').first().off('click')
        stack.header.controlsContainer.find('.lm_popout').first().click((e) => {
            if (stack.parent.isRoot && stack.contentItems.length === 1) {
                e.stopPropagation();
                return;
            }
            const view = stack.getActiveContentItem().container.getState().identity
            fin.InterApplicationBus.send({uuid:'*'}, 'tearout', {views: [view]})
            stack.getActiveContentItem().remove()
        });
        stack.header.controlsContainer.find('.lm_maximise').first().click((e) => {
            const view = fin.BrowserView.wrapSync(stack.getActiveContentItem().container.getState().identity)
            view.hide().then(() => view.show())
            maximized ? win.restore() : win.maximize()
            maximized = !maximized
        });
    });

    //Incomplete closing code
    // myLayout.on('itemDestroyed', (e) => {
    //     switch (e.type) {
    //         case 'component':
    //             // const view = fin.BrowserView.wrapSync(e.container.getState().identity)
    //             // view.destroy();
    //             break;
    //         case 'stack':
    //         default:
    //             if (myLayout.root.contentItems.length === 1) {
    //                 console.log('closing')
    //                 win.close().catch(console.error);
    //             }
    //             console.log(myLayout.root.contentItems.length)
    //             break;
    //     }
    // })
    myLayout.init();

    await fin.InterApplicationBus.subscribe({ uuid: '*' }, 'tab-added', async ({ ids, active }) => {
        const newViews = ids.map(id => fin.BrowserView.wrapSync(id));
        newViews.map(addBrowserView)
    })
    fin.InterApplicationBus.send({uuid: win.identity.uuid, name: win.identity.uuid}, 'up') 
    await fin.InterApplicationBus.subscribe({ uuid: '*' }, 'should-tab-to', async (id) => {
        const views = myLayout.root.getItemsByFilter((item) => item.isComponent).map(item => fin.BrowserView.wrapSync(item.config.componentState.identity))
        await fin.InterApplicationBus.send(id, 'tab-added', { ids: views.map(v => v.identity) });
        Promise.all(views.map(async (view, i) => {
            await view.attach(id);
        }))
        await win.close();
    })
    const secondView = await fin.BrowserView.create({...win.identity, name: win.identity.name+'view', url: 'https://baize.dev', target: win.identity})
    addBrowserView(secondView)
}
function addBrowserView(view) {
    setInterval(async () => {
        const { title } = await view.getInfo();
        const [item] = myLayout.root.getItemsById(view.identity.name)
        if (item) item.setTitle(title)
    }, 500);
    const elementId = `bv-container-${view.identity.name}`
    var newItemConfig = {
        type: 'component',
        id: view.identity.name,
        componentName: 'browserView',
        componentState: { identity: view.identity }
    };
    myLayout.root.contentItems[0].addChild(newItemConfig)
    const ro = new ResizeObserver(entries => {
        for (let entry of entries) {
            const cr = entry.contentRect;
            console.log('Element:', entry.target);
            console.log(`Element size: ${cr.width}px x ${cr.height}px`);
            console.log(`Element padding: ${cr.top}px ; ${cr.left}px`);
            var rect = entry.target.getBoundingClientRect();
            console.log(rect.top, rect.right, rect.bottom, rect.left);
            view.setBounds({
                height: Math.ceil(cr.height),
                width: Math.ceil(cr.width),
                y: Math.ceil(rect.top),
                x: Math.ceil(rect.left),
            }).catch(console.error).then(() => console.log('did it'));
        }
    });
    const bvContainer = document.getElementById(elementId);
    ro.observe(bvContainer);
}
var mainWindow = fin.desktop.Window.getCurrent();
// Add css and HTML for the top bar.

let backgroundColor = "#1C1C31";
let textColor = "#FFFFFF";

