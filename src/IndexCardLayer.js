import IndexCard from "./IndexCard";

export default class IndexCardLayer extends PlaceablesLayer {
 
    /** @override */
    static get layerOptions() {
      return mergeObject(super.layerOptions, {
        canDragCreate: true,
        canDelete: true,
        controllableObjects: true,
        rotatableObjects: true,
        objectClass: IndexCard,
        sheetClass: DrawingConfig,
        zIndex: 20
      });
    }
  
    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */
  
    /**
     * Use an adaptive precision depending on the size of the grid
     * @type {number}
     */
    get gridPrecision() {
      let size = canvas.dimensions.size;
      if ( size >= 128 ) return 16;
      else if ( size >= 64 ) return 8;
      else if ( size >= 32 ) return 4;
      else if ( size >= 16 ) return 2;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    get hud() {
      return canvas.hud.drawing;
    }
  
    /* -------------------------------------------- */
    /*  Methods                                     */
    /* -------------------------------------------- */
  
    /**
     * Render a configuration sheet to configure the default Drawing settings
     */
    configureDefault() {
      const defaults = this._getNewDrawingData({});
      let d = new Drawing(defaults);
      new DrawingConfig(d, {configureDefault: true}).render(true);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Override the deactivation behavior of this layer.
     * Placeables on this layer remain visible even when the layer is inactive.
     */
    deactivate() {
      super.deactivate();
      if (this.objects) this.objects.visible = true;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Get initial data for a new drawing.
     * Start with some global defaults, apply user default config, then apply mandatory overrides per tool.
     * @param {Object} origin     The initial coordinate
     * @return {Object}           The new drawing data
     * @private
     */
    _getNewDrawingData(origin) {
      const tool = game.activeTool;
  
      // Update with User Defaults
      const saved = game.settings.get("core", this.constructor.DEFAULT_CONFIG_SETTING);
      const defaults = mergeObject(CONST.DRAWING_DEFAULT_VALUES, saved, {inplace: false});
  
      // Optional client overrides
      const data = mergeObject(defaults, {
        fillColor: game.user.color,
        strokeColor: game.user.color,
        fontFamily: CONFIG.defaultFontFamily
      }, {overwrite: false});
  
      // Mandatory additions
      data.x = origin.x;
      data.y = origin.y;
      data.author = game.user._id;
  
      // Tool-based settings
      switch ( tool ) {
        case "rect":
          data.type = CONST.DRAWING_TYPES.RECTANGLE;
          break;
        case "ellipse":
          data.type = CONST.DRAWING_TYPES.ELLIPSE;
          break;
        case "polygon":
          data.type = CONST.DRAWING_TYPES.POLYGON;
          data.points = [[0, 0]];
          break;
        case "freehand":
          data.type = CONST.DRAWING_TYPES.FREEHAND;
          data.points = [[0, 0]];
          data.bezierFactor = saved.bezierFactor ?? 0.5;
          break;
        case "text":
          data.type = CONST.DRAWING_TYPES.TEXT;
          data.fillColor = "#FFFFFF";
          data.fillAlpha = 0.10;
          data.strokeColor = "#FFFFFF";
          data.text = data.text || "New Text";
      }
      return data;
    }
  
    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */
  
    /** @override */
    _onClickLeft(event) {
      const {preview, createState, originalEvent} = event.data;
  
      // Continue polygon point placement
      if ( createState >= 1 && preview.isPolygon ) {
        let point = event.data.destination;
        if ( !originalEvent.shiftKey ) point = canvas.grid.getSnappedPosition(point.x, point.y, this.gridPrecision);
        preview._addPoint(point, false);
        preview._chain = true; // Note that we are now in chain mode
        return preview.refresh();
      }
  
      // Standard left-click handling
      super._onClickLeft(event);
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    _onClickLeft2(event) {
      const {createState, preview} = event.data;
  
      // Conclude polygon placement with double-click
      if ( createState >= 1 && preview.isPolygon ) {
        event.data.createState = 2;
        return this._onDragLeftDrop(event);
      }
  
      // Standard double-click handling
      super._onClickLeft2(event);
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    _onDragLeftStart(event) {
      super._onDragLeftStart(event);
      const data = this._getNewDrawingData(event.data.origin);
      const drawing = new Drawing(data);
      event.data.preview = this.preview.addChild(drawing);
      drawing.draw();
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    _onDragLeftMove(event) {
      const {preview, createState} = event.data;
      if ( !preview ) return;
      if ( preview.parent === null ) { // In theory this should never happen, but rarely does
        this.preview.addChild(preview);
      }
      if (createState >= 1 ) {
        preview._onMouseDraw(event);
        if ( preview.data.type !== CONST.DRAWING_TYPES.POLYGON ) event.data.createState = 2;
      }
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handling of mouse-up events which conclude a new object creation after dragging
     * @private
     */
    _onDragLeftDrop(event) {
      const { createState, destination, origin, preview } = event.data;
  
      // Successful drawing completion
      if ( createState === 2 ) {
        const distance = Math.hypot(destination.x - origin.x, destination.y - origin.y);
        const minDistance = distance >= (canvas.dimensions.size / this.gridPrecision);
        const completePolygon = preview.isPolygon && (preview.data.points.length > 2);
  
        // Create a completed drawing
        if ( minDistance || completePolygon ) {
          event.data.createState = 0;
          const data = preview.data;
  
          // Set default text values
          if (data.type === CONST.DRAWING_TYPES.TEXT) {
            data.fillColor = null;
            data.fillAlpha = 0;
            data.strokeColor = null;
            data.strokeWidth = 0;
          }
  
          // Adjust the final data
          const createData = Drawing.normalizeShape(data);
  
          // Create the object
          preview._chain = false;
          preview.constructor.create(createData).then(d => {
            d._creating = true;
            d._pendingText = "";
            if ( data.type !== CONST.DRAWING_TYPES.FREEHAND ) d.control({isNew: true});
          });
        }
  
        // Cancel the preview
        return this._onDragLeftCancel(event);
      }
  
      // In-progress polygon
      if ( (createState === 1) && preview.isPolygon ) {
        event.data.originalEvent.preventDefault();
        if ( preview._chain ) return;
        return this._onClickLeft(event);
      }
  
      // Incomplete drawing
      return this._onDragLeftCancel(event);
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    _onDragLeftCancel(event) {
      const preview = this.preview.children?.[0] || null;
      if ( preview?._chain ) {
        preview._removePoint();
        preview.refresh();
        if (preview.data.points.length) return event.preventDefault();
      }
      super._onDragLeftCancel(event);
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    _onClickRight(event) {
      const preview = this.preview.children?.[0] || null;
      if ( preview ) return canvas.mouseInteractionManager._dragRight = false;
      super._onClickRight(event);
    }
  }
  