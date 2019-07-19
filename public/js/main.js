//register service worker
// navigator.serviceWorker.register('../serviceworker.js');

var config = {
    content: [{
        type: 'stack',
        content: []
    }]
};

if (typeof fin !== 'undefined') {
    init()
}
var myLayout;
const views = [];
window.views = views;
//once the DOM has loaded and the OpenFin API is ready
async function init() {

    // Add event listeners to the top bar icons
    document.getElementsByClassName("openfin-top-bar-minimize")[0].addEventListener('click', function () {
        fin.desktop.Window.getCurrent().minimize();
    });

    document.getElementsByClassName("openfin-top-bar-close-x")[0].addEventListener('click', function () {
        fin.desktop.Window.getCurrent().close();
    });

    var maximized = false;

    document.getElementsByClassName("openfin-top-bar-maximize")[0].addEventListener('click', function (e) {
        if (maximized === false) {
            fin.desktop.Window.getCurrent().maximize();
            e.srcElement.src = "https://cdn.openfin.co/demos/whiteboard/apps/shared/libs/top-bar/top-bar-images/restore.svg"
            maximized = true;
        } else {
            fin.desktop.Window.getCurrent().restore();
            e.srcElement.src = "https://cdn.openfin.co/demos/whiteboard/apps/shared/libs/top-bar/top-bar-images/maximize.svg"
            maximized = false;
        }
    });
    let url;
    try {
        const res = await fetch('url.json');
        const body = await res.json();
        console.log(body);
        if (body.url) url = body.url;
    } catch (error) {
        console.error(error);
        url = 'https://bing.com';
    }
    //get a reference to the current Application.
    const app = await fin.Application.getCurrent();
    const win = await fin.Window.getCurrent();
    const size = await win.getBounds();
    await win.updateOptions({
        frame: false
    })
    // app.on('run-requested', () => location.reload());

    // const view = await fin.BrowserView.create({
    //       uuid: win.identity.uuid,
    //       name: 'view',
    //       url:'https://www.duckduckgo.com',
    //       backgroundColor: '#fff',
    //       autoResize: { width: false, height: false },
    //       bounds: {
    //             x: 5,
    //             y: 35,
    //             width: size.width - 10,
    //             height: size.height - 40
    //       },
    //       target: win.identity
    // });

    // window.bv = view;



    myLayout = new GoldenLayout(config);
    window.myLayout = myLayout

    myLayout.registerComponent('browserView', function (container, state) {
        const elementId = `bv-container-${state.name}`
        const element = $(`<div class="bv-container" id="${elementId}"></div>`);
        // Append it to the DOM
        container.getElement().append(element);
    });
    myLayout.init();

    // const obs = addBrowserView(view)

    // obs()
    // const view2 = await fin.BrowserView.create({
    //     uuid: win.identity.uuid,
    //     name: 'view2',
    //     url: 'https://www.bing.com',
    //     backgroundColor: '#fff',
    //     autoResize: { width: false, height: false },
    //     bounds: {
    //         x: 5,
    //         y: 35,
    //         width: size.width - 10,
    //         height: size.height - 40
    //     },
    //     target: win.identity
    // });
    // const obs2 = addBrowserView(view2);
    // obs2()




    await fin.InterApplicationBus.subscribe({ uuid: '*' }, 'tab-added', async ({ ids, active }) => {
        // console.log(ids)
        const newViews = ids.map(id => fin.BrowserView.wrapSync(id));
        views.push(...newViews)
        // console.log(newViews)
        // const oldCount = views.length;
        // window.views.push(...newViews);
        // activeView = oldCount + active;
        newViews.map(addBrowserView).map(f => f())
    })
    fin.InterApplicationBus.send({uuid: win.identity.uuid, name: win.identity.uuid}, 'up') 
    await fin.InterApplicationBus.subscribe({ uuid: '*' }, 'should-tab-to', async (id) => {
        fin.InterApplicationBus.send(id, 'tab-added', { ids: views.map(v => v.identity) });
        // let curView;
        Promise.all(views.map(async (view, i) => {
            // if (i === activeView) {
            //     curView = view;
            //     await view.hide();
            // }
            await view.attach(id);
        }))
        // await curView.hide();
        // await curView.show();
        await win.close();
    })
}
function addBrowserView(view) {
    // setInterval(async () => {
    //     const { title } = await view.getInfo();
    //     const titleSpan = document.querySelector('.openfin-top-bar-title');
    //     titleSpan.innerHTML = title;
    // }, 500);
    const elementId = `bv-container-${view.identity.name}`
    var newItemConfig = {
        type: 'component',
        componentName: 'browserView',
        componentState: { name: view.identity.name }
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
            // height
            // width
            // top
            // left
            // right
            // bottom
            view.setBounds({
                height: Math.floor(cr.height),
                width: Math.floor(cr.width),
                y: Math.floor(rect.top),
                x: Math.floor(rect.left),
                right: Math.floor(rect.right),
                bottom: Math.floor(rect.bottom)
            }).catch(console.error).then(() => console.log('did it'));
        }
    });
    return () => {
        const bvContainer = document.getElementById(elementId);
        ro.observe(bvContainer);
    }
}
var mainWindow = fin.desktop.Window.getCurrent();

// Add css and HTML for the top bar.

let backgroundColor = "#1C1C31";
let textColor = "#FFFFFF";

