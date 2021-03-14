// TODO: Create IndexCard class and pass in to IndexCardsLayer Class


class IndexCardsLayer extends PlaceablesLayer {
    static get layerOptions() {
        return mergeObject(super.layerOptions, {
            zIndex: 10, //TODO: Work out what the z index should be
            controllableObjects: true,
            objectClass: Drawing, // TODO: Make this IndexCard when that is done
            rotatableObjects: true,
            sheetClass: TileConfig // TODO: Make a IndexCard Config
        });
    }
};

Hooks.once("init", function() {
    console.log("This code runs once the Foundry VTT software begins it's initialization workflow.");
    game.settings.register('IndexCardsLayer', 'indexCardsTest', {
        name: "Index Cards",
        hint: "Hint here",
        scope: "world",
        config: true,
        type: Number,
        range: {
            min: 0,
            max: 100,
            step: 10
        },
        default: 50,
        onChange: () => {}
    });
});


Hooks.on("init", function() {
    console.log("This code runs once the Foundry VTT software begins it's initialization workflow.");
});

Hooks.once('canvasInit', () => {
    // Add SimplefogLayer to canvas
    // indexCardsLayer = new PlaceablesLayer();
    const layerct = canvas.stage.children.length;
    canvas.indexCards = canvas.stage.addChildAt(new IndexCardsLayer(), layerct);
    console.log(IndexCardsLayer);
    canvas.indexCards.draw();
});

Hooks.on('canvasInit', () => {

    let theLayers = Canvas.layers;
    theLayers.indexCards = IndexCardsLayer;

    Object.defineProperty(Canvas, 'layers', {
        get: function() {
            return theLayers
        }
    })
});


Hooks.on('getSceneControlButtons', (controls) => {
    if (game.user.isGM) {
        if (canvas != null) {
            controls.push({
                name: 'indexCards',
                title: 'Index Cards',
                icon: 'fas fa-cloud',
                layer: 'IndexCards',
                tools: [{
                        name: 'simplefogtoggle',
                        title: 'test',
                        icon: 'fas fa-eye',
                        onClick: () => {
                            canvas.indexCards.toggle();
                            canvas.sight.refresh();
                        },
                        active: true,
                        toggle: true,
                    },
                    {
                        name: 'brush',
                        title: 'Brush',
                        icon: 'fas fa-paint-brush',
                    },
                ],
                activeTool: 'brush',
            });
        }
    }
});


Hooks.once('ready', () => {

    //ooks.on('sightRefresh', sightLayerUpdate);
    canvas.sight.refresh();
});