export default class DrawingConfig extends FormApplication {
    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
        id: "index-card-config",
      classes: ["sheet"],
      template: "templates/index-card-config.html",
      width: 480,
      height: 360,
      configureDefault: false,
      tabs: [{navSelector: ".tabs", contentSelector: "form", initial: "position"}]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get title() {
    const title = this.options.configureDefault ? "DRAWING.ConfigDefaultTitle" : "DRAWING.ConfigTitle";
    return game.i18n.localize(title);
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options) {
    const author = game.users.get(this.object.data.author);

    // Submit text
    let submit;
    if ( this.options.configureDefault ) submit = "DRAWING.SubmitDefault";
    else submit = this.options.preview ? "DRAWING.SubmitCreate" : "DRAWING.SubmitUpdate";

    // Return data
    return {
      author: author ? author.name : "",
      isDefault: this.options.configureDefault,
      fillTypes: this.constructor._getFillTypes(),
      fontFamilies: CONFIG.fontFamilies.reduce((obj, f) => {
        obj[f] = f;
        return obj;
      }, {}),
      object: duplicate(this.object.data),
      options: this.options,
      submitText: submit
    }
  }

  /* -------------------------------------------- */

  /**
   * Get the names and labels of fill type choices which can be applied
   * @return {Object}
   * @private
   */
  static _getFillTypes() {
    return Object.entries(CONST.DRAWING_FILL_TYPES).reduce((obj, v) => {
      obj[v[1]] = `DRAWING.FillType${v[0].titleCase()}`;
      return obj;
    }, {});
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    if ( !this.object.owner ) throw new Error("You do not have the ability to configure this Drawing object.");

    // Configure the default Drawing settings
    if ( this.options.configureDefault ) {
      await Drawing.create(mergeObject(formData, {
        type: DRAWING_TYPES.RECTANGLE,
        author: game.user._id,
        x: 1000,
        y: 1000
      }), {temporary: true}); // This is to ensure the default data is valid
      return game.settings.set("core", DrawingsLayer.DEFAULT_CONFIG_SETTING, formData);
    }

    // Create or update a Drawing
    if ( this.object.id ) {
      formData["id"] = this.object.id;
      return this.object.update(formData);
    }
    return this.object.constructor.create(formData);
  }

  /* -------------------------------------------- */

  /** @override */
  async close(options) {
    await super.close(options);
    if ( this.preview ) {
      this.preview.removeChildren();
      this.preview = null;
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @override */
    activateListeners(html) {
      super.activateListeners(html);
    html.find('button[name="resetDefault"]').click(this._onResetDefaults.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Reset the user Drawing configuration settings to their default values
   * @param event
   * @private
   */
  _onResetDefaults(event) {
    event.preventDefault();
      game.settings.set("core", DrawingsLayer.DEFAULT_CONFIG_SETTING, {});
      this.object.data = canvas.drawings._getNewDrawingData({});
    this.render();
  }
}