class f {
  constructor(t, e) {
    Object.assign(this, t), this._fullMeta = e;
  }
  /** For a Choice column, returns the background color of a given option
   * @param {string} ref - The option on which get the background color 
   * @returns color as HTML format #FFFFFF
   */
  getColor(t) {
    return this.widgetOptions.choiceOptions?.[t]?.fillColor;
  }
  /** For a Choice column, returns the text color of a given option
  * @param {string} ref - The option on which get the text color 
  * @returns color as HTML format #000000
  */
  getTextColor(t) {
    return this.widgetOptions.choiceOptions?.[t]?.textColor;
  }
  /** Check if the column is a formula column AND a formula is defined */
  getIsFormula() {
    return this.isFormula && this.formula?.trim();
  }
  async getChoices() {
    const t = this.type.split(":");
    if (t[0] === "Ref" || t[0] === "RefList") {
      const e = await grist.docApi.fetchTable(t[1]), s = await this.getMeta(this.visibleCol);
      return e[s.colId];
    } else if (t[0] === "Choice")
      return this.widgetOptions?.choices;
    return null;
  }
  // async getRefMeta() {
  //     const t = this.type.split(':');
  //     if (t[0] === 'RefList' || t[0] === 'Ref') {
  //         return [t[1], await this.getMeta(this.visibleCol)];
  //     }
  //     return null;
  // }
  /** Parse a given value based on column meta data. Replace values, whatever the encoding is, by their content.
   * @param {*} value - Any value provided by Grist
   * @returns Decoded value
   */
  async parse(t, e = null, s = null) {
    const n = this.type.split(":");
    if (n[0] === "RefList") {
      if (t && t.length > 0 && (t[0] === "L" && (t = t.splice(0, 1)), t.length > 0 && typeof t[0] == "number")) {
        const a = e ?? await grist.docApi.fetchTable(n[1]), r = s ?? await this.getMeta(this.visibleCol);
        return t.map((o) => a?.id?.indexOf(o)).map((o) => a[r.colId][o]);
      }
    } else if (n[0] === "Ref") {
      if (Array.isArray(t))
        if (t[2] > 0)
          if (this.visibleCol > 0) {
            const a = e ?? await grist.docApi.fetchTable(t[1]), r = s ?? await this.getMeta(this.visibleCol), l = a?.id?.indexOf(t[2]);
            return await this.parse(a[r.colId][l]);
          } else return t[2];
        else return;
      else if (typeof t == "object")
        if (t.rowId > 0)
          if (this.visibleCol > 0) {
            const a = e ?? await grist.docApi.fetchTable(t.tableId), r = s ?? await this.getMeta(this.visibleCol), l = a?.id?.indexOf(t.rowId);
            return await this.parse(a[r.colId][l]);
          } else return t.rowId;
        else return;
    }
    return t;
  }
  /** Parse a given value ID based on column meta data. Replace references, whatever the encoding is, by their ID. 
   * @param {*} value - Any value provided by Grist, but only Ref and Reflist are treated
   * @returns Reference id(s)
  */
  async parseId(t, e = null, s = null) {
    const n = this.type.split(":");
    if (n[0] === "RefList") {
      if (t && t.length > 0 && (t[0] === "L" && (t = t.splice(0, 1)), t.length > 0 && typeof t[0] != "number")) {
        const a = e ?? await grist.docApi.fetchTable(n[1]), r = s ?? await this.getMeta(this.visibleCol);
        return t.map((o) => a[r.colId]?.indexOf(o)).map((o) => a.id[o]);
      }
    } else if (n[0] === "Ref") {
      if (Array.isArray(t))
        return t[2];
      if (typeof t == "object")
        return t.rowId;
      {
        const a = e ?? await grist.docApi.fetchTable(n[1]), r = s ?? await this.getMeta(this.visibleCol), l = a[r.colId].indexOf(t);
        return a.id[l];
      }
    }
    return t;
  }
  /** Encode a given value to be compatible by Grist 
   * @param {*} value - Any value that need to be encoded before being sent to Grist
   * @returns Encoded value
  */
  async encode(t, e = null, s = null) {
    if (t == null) return t;
    const n = this.type.split(":");
    if (n[0] === "RefList") {
      if (Array.isArray(t) && t.length > 0 && typeof t[0] != "number") {
        const a = e ?? await grist.docApi.fetchTable(n[1]), r = s ?? await this.getMeta(this.visibleCol);
        return t.map((o) => a[r.colId]?.indexOf(o)).map((o) => a.id[o]);
      }
    } else if (n[0] === "Ref" && typeof t[0] != "number") {
      const a = e ?? await grist.docApi.fetchTable(n[1]), r = s ?? await this.getMeta(this.visibleCol), l = a[r.colId].indexOf(t);
      return a.id[l];
    }
    return t;
  }
  /** Get current column meta data */
  async getMeta(t) {
    return this._fullMeta.then(
      (e) => e.col.find((s) => s.id === t)
    );
  }
}
class d {
  /** Fetch columns meta data for all tables */
  static async fetchMetas() {
    const t = await grist.docApi.fetchTable("_grist_Tables_column"), e = Object.keys(t), n = t.parentId.map((l, o) => o).map((l) => {
      let o = Object.fromEntries(e.map((c) => [c, t[c][l]]));
      return o.widgetOptions = d.safeParse(o.widgetOptions), o;
    }), a = await grist.docApi.fetchTable("_grist_Tables"), r = Object.fromEntries(a.tableId.map((l, o) => [l, a.id[o]]));
    return { col: n, tab: r };
  }
  static getTableMeta(t, e) {
    return t.col.filter((s) => s.parentId === t.tab[e]);
  }
  constructor() {
    this._tableId = null, this._colIds = null, this._metaPromise = null, this._colPromise = null, this._col = null, this._accessLevel = "", this.loaded = !1, grist.on("message", (t) => {
      t.settings && this._accessLevel !== t.settings.accessLevel && (this._accessLevel = t.settings.accessLevel, this.fetchColumns()), t.tableId && t.mappingsChange && (this._tableId = t.tableId, this.fetchColumns());
    });
  }
  fetchColumns() {
    this._accessLevel === "full" && (this._col = null, this._metaPromise = d.fetchMetas(this._tableId), this._colPromise = new Promise((t) => {
      this._metaPromise.then((e) => t(d.getTableMeta(e, this._tableId)));
    }));
  }
  mapColumns(t, e) {
    return t;
  }
  async getTypes() {
    return this._colPromise.then(
      (t) => Object.fromEntries(t.map((e) => [e.colId, e?.type]))
    );
  }
  async getColType(t) {
    return this._colPromise.then(
      (e) => e.find((s) => s.colId === t)?.type
    );
  }
  async getOptions() {
    return this._colPromise.then(
      (t) => Object.fromEntries(t.map((e) => [e.colId, e?.widgetOptions]))
    );
  }
  async getColOption(t) {
    return this._colPromise.then(
      (e) => e.find((s) => s.colId === t)?.widgetOptions
    );
  }
  async IsFormula() {
    return this._colPromise.then(
      (t) => Object.fromEntries(t.map((e) => [e.colId, e?.isFormula && (e?.formula?.length ?? 0) !== 0]))
    );
  }
  async IsColFormula(t) {
    return this._colPromise.then(
      (e) => {
        const s = e.find((n) => n.colId === t);
        return s?.isFormula && (s?.formula?.length ?? 0) !== 0;
      }
    );
  }
  async getColor(t, e) {
    return this.getColOption(t)?.choiceOptions?.[e]?.fillColor;
  }
  /** Get current table columns meta data
   * @returns Object with each entries as column Id
   */
  async getMeta() {
    return this._col || (this._col = this._colPromise.then(
      (t) => Object.fromEntries(t.map((e) => [e.colId, new f(e, this._metaPromise.then((s) => s))]))
    )), this._col;
  }
  /** Get given column meta data
   * @param {string} colId - Column Grist id
   */
  async getColMeta(t) {
    return this._colPromise.then(
      (e) => {
        const s = e.find((n) => n.colId === t);
        return s ? new f(s, this._metaPromise.value) : null;
      }
    );
  }
  // async getRawColMeta(colId) {
  //     return this._colPromise.then(
  //         types => { 
  //             return types.find(t => t.colId === colId);
  //           }
  //     );
  // }
  isLoaded() {
    return this._colPromise ? this._colPromise?.state !== "pending" : !1;
  }
  static safeParse(t) {
    try {
      return JSON.parse(t);
    } catch {
      return null;
    }
  }
}
class h {
  constructor() {
    const t = new URLSearchParams(window.location.search);
    this.cultureFull = t.has("culture") ? t.get("culture") : "en-US", this.culture = this.cultureFull.split("-")[0], this.currency = t.has("currency") ? t.get("currency") : "USD", this.timeZone = t.has("timeZone") ? t.get("timeZone") : "", this._gristloaded = !1, this._optloaded = !1, this._ismapped = !1, this.initDone = !1, this.urlSDK = "https://varamil.github.io/grist-widget/widgetSDK", grist.on("message", async (e) => {
      e.fromReady && (this._gristloaded = e.fromReady);
    });
  }
  //==========================================================================================
  // Commons
  //==========================================================================================
  static async sleep(t) {
    return new Promise((e) => setTimeout(e, t));
  }
  triggerEvent(t, e) {
    this.events["on" + t] && this.events["on" + t].apply(this, e);
  }
  /** Returns true is not undefined and not nul */
  is(t) {
    return t != null;
  }
  /** Provide a Promise that resolved when the full widget configuration and grist are loaded */
  async isLoaded() {
    return new Promise(async (t, e) => {
      try {
        if (this.meta) {
          for (; !this.meta.isLoaded(); )
            await h.sleep(50);
          this.col = grist.mapColumnNames(await this.meta.getMeta());
        }
        if (this.opt)
          for (; !this._optloaded; )
            await h.sleep(50);
        for (; !this._gristloaded; )
          await h.sleep(50);
        t(!0);
      } catch (s) {
        e(s);
      }
    });
  }
  /**  */
  async isInit() {
    return this.initDone && await this.isLoaded() ? new Promise((t) => t(!0)) : new Promise(async (t, e) => {
      try {
        for (await this.isLoaded(); !this.initDone; )
          await h.sleep(50);
        t(!0);
      } catch (s) {
        e(s);
      }
    });
  }
  async isMapped() {
    return !this.meta || this._ismapped ? new Promise((t) => t(!0)) : new Promise(async (t, e) => {
      try {
        for (; !this._ismapped; )
          await h.sleep(50);
        t(!0);
      } catch (s) {
        e(s);
      }
    });
  }
  /** Manage the parsing of a reference or a list into an Array */
  async getLookUpData(t) {
    if (!t) return [];
    if (Array.isArray(t))
      return t.sort();
    if (t.trim())
      if (t.startsWith("$")) {
        t = t.substring(1);
        let e = t.split(".");
        if (e.length === 1) {
          let s = await grist.docApi.fetchTable(e[0]), n = Object.keys(s || {}).filter((a) => a !== "id" && a !== "manualSort");
          return n.length > 0 ? [""].concat(s[n[0]].filter((a) => a.length > 0).sort()) : [];
        } else if (e.length > 1) {
          let s = await grist.docApi.fetchTable(e[0]);
          return s = s[e[1]], s ? [""].concat(s.filter((n) => n.length > 0).sort()) : [];
        } else
          return [t];
      } else
        return [""].concat(t.split(";").filter((e) => e.length > 0).sort());
    else return [];
  }
  /** Function that mimics basic GNU/Linux grep command;
   * @param  {String} multiLineString      The multiline string
   * @param  {String} patternToSearch      The RegEx pattern to search for
   * @return {Array}                       An Array containing all the matching row(s) for patternToSearch in multiLineString
   */
  grep(t, e) {
    var s = new RegExp(e, "img");
    return t.match(s);
  }
  /** Checks if a file exist on server side
   * @param {string} url - absolute or relative url
   */
  urlExists(t) {
    if (!t) return !1;
    var e = new XMLHttpRequest();
    return e.open("HEAD", t, !1), e.send(), e.status != 404;
  }
  /** Assign sources properties to the target only if they are defined (i.e. if(value) is true) */
  assignDefined(t, ...e) {
    if (t)
      for (const s of e)
        for (const [n, a] of Object.entries(s))
          a && (t[n] = a);
    return t;
  }
  /** Check if an object has defined properties (i.e. null, undefined, ''... are ignored) */
  isObjectEmpty(t) {
    for (let e in t)
      if (t.hasOwnProperty(e) && e) return !1;
    return !0;
  }
  //==========================================================================================
  // Localization
  //==========================================================================================
  /** Load translation data
   * @param {Array<string>} files - List of files that use the translation. Use relative path to the main script
   * @param {string} [lang='en'] - Default language used to write keys
   * @param {string|Object} [json=null] - Path to the json file to be loaded, or the i18n object directly
   * @returns function to use for translation
   */
  async loadTranslations(t = [], e = "en", s = null) {
    if (this.translatedFiles = t, this.translatedFiles.push(this.urlSDK + "/min/widgetSDK.umd.js"), !s || typeof s == "string") {
      if (s = s || "i18n/" + this.culture + ".json", e !== this.culture && this.urlExists(s)) {
        let n = await fetch(s);
        if (n.ok) {
          const a = await n.text();
          this.I18N = JSON.parse(a);
        }
      }
    } else typeof s == "object" ? this.I18N = s : console.error("Loading translation error");
    if (e !== this.culture && this.urlExists(this.urlSDK + "/i18n/" + this.culture + ".json")) {
      let n = await fetch(this.urlSDK + "/i18n/" + this.culture + ".json");
      if (n.ok) {
        const a = await n.text();
        this.assignDefined(this.I18N, JSON.parse(a));
      }
    }
    return this.I18N || (this.I18N = {}), this.t.bind(this);
  }
  /** Provide translated text 
   * @param {string} text - Original text
   * @param {object} [args=null] - Dynamic text to replace 
  */
  t(t, e = null) {
    let s = t.replaceAll(`
`, "\\n").replaceAll("  ", " ");
    return s = this.I18N[s] || t, e && Object.entries(e).forEach(([n, a]) => {
      s = s.replaceAll("%" + n, a);
    }), s.replaceAll("\\n", `
`);
  }
  /** Load listed files and look for translation function 
   * @param {Array<string>} files - List of files to load and analyze
   * @param {string} [f='t'] - The translation function name used
  */
  async extractTranslations(t, e = "t") {
    let s = {};
    return await Promise.all(t.map(async (n) => {
      let a = await fetch(n);
      if (a.ok) {
        a = await a.text();
        let r;
        ["'", '"', "`"].forEach((l) => {
          r = this.grep(a, `(?<=[^a-zA-Z0-9_]${e}[(])${l}(.*?)(?<!\\\\)${l}(?=[),])`), r && (r = r.map((o) => [o.replace(/^['"`]|['"`]$/g, ""), ""]), s = { ...s, ...Object.fromEntries(r) });
        });
      }
    })), this._parameters && this._parameters.forEach((n) => s = { ...s, ...this.getOptionStrings(n) }), this.I18Ngrist && (s = { ...s, ...this.I18Ngrist }), s;
  }
  /** Get all options strings (for translation purpose)
   * @param {Object} opt - Option to get strings 
   */
  getOptionStrings(t) {
    let e = {};
    return t && (t.title && (e[t.title] = ""), t.subtitle && (e[t.subtitle] = ""), t.description && (e[t.description] = ""), t.group && (e[t.group] = ""), t.template && (Array.isArray(t.template) ? t.template.forEach((s) => e = { ...e, ...this.getOptionStrings(s) }) : e = { ...e, ...this.getOptionStrings(t.template) })), e;
  }
  saveTranslations() {
  }
  //==========================================================================================
  // Columns Meta Data
  //==========================================================================================
  /** Initialize column meta data fetcher */
  initMetaData() {
    return this.meta = new d(), this.meta;
  }
  /** Save mappings and map records
   * @param {*} records - raw records provided by grist.onRecords
   * @param {*} mappings - mappings provided by grist.onRecords
   * @returns mapped records
   */
  async mapData(t, e, s = !1) {
    return this.dataMapped = s, new Promise(async (n) => {
      if (this.map = e, await this.mapOptions(), this.meta && s) {
        let a = grist.mapColumnNames(t);
        Array.isArray(a) ? await Promise.all(Object.entries(this.col).map(([r, l]) => new Promise(async (o) => {
          l && (Array.isArray(l) ? await Promise.all(l.map(async (c) => {
            await this.#a(a, r, c);
          })) : await this.#a(a, r, l)), o(!0);
        }))) : await Promise.all(Object.entries(this.col).map(async ([r, l]) => {
          l && (Array.isArray(l) ? await Promise.all(l.map(async (o) => {
            await this.#n(a, r, o);
          })) : await this.#n(a, r, l));
        })), this._ismapped = !0, n(a);
      }
      this._ismapped = !0, n(grist.mapColumnNames(t, e));
    });
  }
  async #a(t, e, s) {
    const n = s.type.split(":");
    if ((n[0] === "RefList" || n[0] === "Ref") && s.visibleCol > 0) {
      fetch[n[1]] || (fetch[n[1]] = await grist.docApi.fetchTable(n[1]));
      const a = await s.getMeta(s.visibleCol);
      t = t.map(async (r) => (r[e] = await s.parse(r[e], fetch[n[1]], a), r[e + "_id"] = await s.parseId(r[e], fetch[n[1]], a), r));
    } else
      t = t.map(async (a) => (a[e] = await s.parse(a[e]), a));
    t = await Promise.all(t);
  }
  async #n(t, e, s) {
    const n = s.type.split(":");
    if ((n[0] === "RefList" || n[0] === "Ref") && s.visibleCol > 0) {
      fetch[n[1]] || (fetch[n[1]] = await grist.docApi.fetchTable(n[1]));
      const a = await s.getMeta(s.visibleCol);
      t[e + "_id"] = t[e].map(async (r) => await s.parseId(r, fetch[n[1]], a)), t[e] = t[e].map(async (r) => await s.parse(r, fetch[n[1]], a)), t[e + "_id"] = await Promise.all(t[e + "_id"]);
    } else
      t[e] = t[e].map(async (a) => await s.parse(a));
    t[e] = await Promise.all(t[e]);
  }
  /** Encode data to prepare them before sending to Grist. Manage properly references 
   * @param {*} rec - Array of data (object) or record ({id: 0, fields:{data}})
   * @returns same object but with data properly encoded
  */
  async encodeData(t) {
    return new Promise(async (e) => {
      if (this.meta) {
        let s = {};
        if (Array.isArray(t))
          await Promise.all(Object.entries(this.col).map(([n, a]) => new Promise(async (r) => {
            if (a) {
              const l = a.type.split(":");
              if ((l[0] === "RefList" || l[0] === "Ref") && a.visibleCol > 0) {
                s[l[1]] || (s[l[1]] = await grist.docApi.fetchTable(l[1]));
                const o = await a.getMeta(a.visibleCol);
                t = t.map(async (c) => (c.fields && (this.is(c.fields[n]) ? c.fields[n] = await a.encode(c.fields[n], s[l[1]], o) : this.is(c[n]) && (c[n] = await a.encode(c[n], s[l[1]], o))), c));
              } else
                t = t.map(async (o) => (o.fields && (this.is(o.fields[n]) ? o.fields[n] = await a.encode(o.fields[n]) : this.is(o[n]) && (o[n] = await a.encode(o[n]))), o));
              t = await Promise.all(t);
            }
            r(!0);
          })));
        else {
          let n = t.fields ?? t;
          await Promise.all(Object.entries(this.col).map(async ([a, r]) => {
            if (r && this.is(n[a])) {
              const l = r.type.split(":");
              if ((l[0] === "RefList" || l[0] === "Ref") && r.visibleCol > 0) {
                s[l[1]] || (s[l[1]] = await grist.docApi.fetchTable(l[1]));
                const o = await r.getMeta(r.visibleCol);
                n[a] = await r.encode(n[a], s[l[1]], o);
              } else
                n[a] = await r.encode(n[a]);
            }
          })), t.fields && (t.fields = n), e(t);
        }
      }
      e(t);
    });
  }
  //==========================================================================================
  // Settings
  //==========================================================================================
  /** Initialize Options management 
   * @param {(object|[object])} para - Options configuration object
   * @param {(string|HTMLElement)} [configID='#config-view'] 
   * @param {(string|HTMLElement)} [mainViewID='#main-view'] 
   * @param {object} [events={}] 
  */
  configureOptions(t, e = "#config-view", s = "#main-view", n = {}) {
    if (typeof e == "string") {
      let a = document.querySelector(e);
      if (!a)
        throw new ReferenceError(
          `CSS selector "${e}" could not be found in DOM`
        );
      e = a;
    }
    if (e instanceof HTMLElement)
      this._config = e;
    else
      throw new TypeError(
        "Widget Config only supports usage of a string CSS selector or HTML DOM element element for the 'configID' parameter"
      );
    if (typeof s == "string") {
      let a = document.querySelector(s);
      if (!a)
        throw new ReferenceError(
          `CSS selector "${s}" could not be found in DOM`
        );
      s = a;
    }
    if (s instanceof HTMLElement ? this._mainview = s : this._mainview = null, !t)
      throw new TypeError(
        "Parameters argument for Widget Config is not defined "
      );
    Array.isArray(t) || (t = [t]), this._parameters = t, this.#c(), this.#r(), this._config.classList.contains("grist-config") || this._config.classList.add("grist-config"), this.events = n, grist.onOptions((function(a, r) {
      this.loadOptions(a);
    }).bind(this)), grist.on("message", async (a) => {
      !this._optloaded && a.fromReady && this.loadOptions(await grist.widgetApi.getOptions());
    });
  }
  /** Provide a simple setting option 
   * @param {string} id - Unique id to identify the option, use only alpha numeric caracters
   * @param {*} defValue - Default value to assign to the option
   * @param {string} title - Main string used to present the option to the user
   * @param {string} [subtitle=undefined] - Short description for the option
   * @param {string} [group=''] - Group name to attach the option
  */
  static newItem(t, e, s, n = void 0, a = "", r = {}) {
    return { id: t, default: e, title: s, subtitle: n, group: a, ...r };
  }
  /** Define handler for options changed trigger */
  onOptChange(t) {
    typeof t == "function" && (this.events.onChange = t);
  }
  /** Define handler for options loaded trigger */
  onOptLoad(t) {
    typeof t == "function" && (this.events.onLoad = t);
  }
  #c() {
    this._parameters.forEach((t) => {
      this.is(t.template) ? Array.isArray(t.template) ? (t.type = "templateform", t.collapse = !0, t.inbloc = !0, t.default = {}, t.template.forEach((e) => {
        this.#i(e), t.default[e.id] = e.default;
      })) : (t.type = "template", t.collapse = !0, t.inbloc = !0, this.#i(t.template), t.default = t.template.default) : this.#i(t);
    });
  }
  #i(t) {
    this.is(t.type) || (t.columnId ? t.type = "dropdown" : typeof t.default == "boolean" ? t.type = "boolean" : typeof t.default == "number" ? t.type = this.is(t.values) ? "dropdown" : "number" : typeof t.default == "object" ? t.type = "object" : t.type = this.is(t.values) ? "dropdown" : "string"), t.inbloc = t.type === "longstring" || t.type === "object" || t.type === "template" || t.type === "templateform", t.collapse = this.is(t.description) && t.description.trim().length > 0 || t.inbloc;
  }
  /** Load options from Grist into the object
   * @param {object} options - Grist object provided by grist.onOptions or grist.widgetApi.getOptions()
   */
  async loadOptions(t) {
    this._optloaded = !1;
    try {
      t = t || {};
      const e = t.options || {};
      this._parameters.forEach((s) => {
        this.opt[s.id] = e[s.id] ?? (s.type === "template" || s.type === "templateform" ? [] : s.default);
      }), this.I18N && (this.I18Nuser = t.localization || {}, this.assignDefined(this.I18N, this.I18Nuser)), this.triggerEvent("OptLoad", [this.opt]);
    } catch (e) {
      console.error("Error occurs on loading options:", e);
    }
    this._optloaded = !0;
  }
  async mapOptions() {
    this._parameters && (await this.isLoaded(), this.valuesList = {}, this._parameters.forEach(async (t) => {
      let e;
      if (t.columnId ? (e = await (await this.col[t.columnId])?.getChoices(), !e && t.type !== "template" && t.type !== "templateform" && (e = await this.getLookUpData(this.opt[t.id]))) : t.values && (e = Array.isArray(t.values) ? t.values : await this.getLookUpData(t.values)), this.valuesList[t.id] = e && e.length > 0 ? e : void 0, t.type === "template" || t.type === "templateform")
        if (e) {
          const s = this.opt[t.id].length;
          this.opt[t.id].length = e.length, s < e.length && this.opt[t.id].fill(t.type === "template" ? t.default : { ...t.default }, s);
        } else
          this.opt[t.id] = [];
    }), await Promise.all(this._parameters));
  }
  /** Called when configuration modification is applied */
  async saveOptions() {
    try {
      this._parameters.forEach((e) => {
        const s = this._config.querySelector("#" + e.id);
        s && (this.opt[e.id] = this.#s(e, s, this.opt[e.id]));
      }), await grist.widgetApi.setOption("options", this.opt);
      const t = this.getUserTranslations();
      this.isObjectEmpty(t) || (this.I18Nuser = t, this.assignDefined(this.I18N, t), await grist.widgetApi.setOption("localization", t)), this.showConfig(!1), this.triggerEvent("OptChange", [this.opt]);
    } catch (t) {
      console.error("Error occurs on saving options:", t);
    }
  }
  #r() {
    this.opt = {}, this._parameters.forEach((t) => {
      this.opt[t.id] = t.type === "template" || t.type === "templateform" ? [] : t.default;
    });
  }
  /** Reset all options to default values */
  async resetOptions() {
    this.#r(), await this.mapOptions(), await grist.widgetApi.setOption("options", this.opt), await grist.widgetApi.setOption("localization", {}), this.showConfig(!1), this.triggerEvent("OptChange", [this.opt]);
  }
  /** Manage the display of the config form */
  async showConfig(t = !0) {
    if (t) {
      await this.isMapped(), this._mainview && (this._mainview.style = "display: none"), this._config.style = "";
      let e = `<div class="config-header"><button id="apply-button" class="config-button">${this.t("Apply")}</button><button id="close-button" class="config-button">${this.t("Close")}</button></div>`;
      Object.entries(this.#h(this._parameters, "group")).forEach(([s, n]) => {
        e += `<div class="config-section"><div class="config-section-title">${this.t(s)}</div>`, n.forEach((a) => {
          e += this.#t(a, this.opt[a.id], -1, a.id);
        }), e += "</div>";
      }), this.I18N && (e += `<div class="config-section"><div class="config-section-title">${this.t("Localization")}</div>`, e += `<div class="config-row"><div class="config-row-header"><div class="config-title"><div class="collapse"></div>${this.t("Extract strings")}</div>`, e += `<div class="config-subtitle">${this.t("Click on the button to parse widget files and list all strings to translate.")}</div>`, e += `<div class="config-value"><button id="extract-loc" class="config-button dyn">${this.t("Extract")}</button></div></div> `, e += '<div class="bloc" style="max-height: 0px;"><div id="config-loc">', e += this.#o(), e += "</div></div></div></div>"), this._config.innerHTML = e + `<div class="config-header"><button id="reset-button" class="config-button">${this.t("Reset")}</button></div>`, this._config.querySelectorAll("div.config-switch")?.forEach((s) => {
        s.addEventListener("click", (function(n) {
          this.toggleswitch(n);
        }).bind(this));
      }), this._config.querySelectorAll("div.collapse")?.forEach((s) => {
        s.parentElement.parentElement.addEventListener("click", (function(n) {
          this.togglecollapse(n);
        }).bind(this));
      }), this._config.querySelectorAll("#add-button")?.forEach((s) => {
        s.addEventListener("click", (function(n) {
          this.addItem(n);
        }).bind(this));
      }), this._config.querySelector("#apply-button")?.addEventListener("click", (function() {
        this.saveOptions();
      }).bind(this)), this._config.querySelector("#close-button")?.addEventListener("click", (function() {
        this.showConfig(!1);
      }).bind(this)), this._config.querySelector("#reset-button")?.addEventListener("click", (function() {
        this.resetOptions();
      }).bind(this)), this._config.querySelector("#extract-loc")?.addEventListener("click", (function() {
        this.extractLocStrings();
      }).bind(this)), this._config.querySelector("#export-loc")?.addEventListener("click", (function() {
        this.exportLocStrings();
      }).bind(this)), setTimeout(() => {
        document.querySelectorAll(".auto-expand").forEach((n) => {
          n.style.height = "", n.style.height = n.scrollHeight + "px";
        });
      }, 0);
    } else
      this._mainview && (this._mainview.style = ""), this._config.style = "display: none";
  }
  #h = function(t, e) {
    return t.reduce(function(s, n) {
      return (s[n[e]] ??= []).push(n), s;
    }, {});
  };
  #t(t, e, s = -1, n = "") {
    let a = "";
    if (!t.hidden) {
      const r = s >= 0 ? this.valuesList[t.id] ? this.valuesList[t.id][s] : this.t(t.title) + " #" + (s + 1) : this.t(t.title);
      a += '<div class="config-row"><div class="config-row-header"><div class="config-title', a += `${t.collapse ? '"><div class="collapse"></div>' : ' nocollapse">'}${r}</div>`, a += `<div class="config-subtitle">${this.t(t.subtitle)}</div>`, a += (t.inbloc ? "" : `<div class="config-value">${this.#l(t, e, s, n)}</div>`) + (s >= 0 ? '<div class="delete"></div>' : "") + "</div>", t.collapse && (a += '<div class="bloc" style="max-height: 0px;">' + (this.is(t.description) ? `<div class="details">${this.t(t.description).replaceAll(`
`, "<br>").replaceAll("\\n", "<br>")}</div>` : ""), t.type === "template" ? (a += `<div id="${t.id}" class="config-dyn">`, e?.forEach((l, o) => {
        a += this.#t(t.template, l, o, n + "_" + o);
      }), a += "</div>", a += this.valuesList[t.id] ? "" : `<div class="config-header"><button id="add-button" data-id="${t.id}" class="config-button dyn">+</button></div>`) : t.type === "templateform" ? (a += `<div id="${t.id}" class="config-dyn">`, e?.forEach((l, o) => {
        l && (a += `<div class="config-section"><div class="config-section-title">${this.valuesList[t.id][o]}</div>`, Object.entries(l).forEach(([c, u]) => {
          a += this.#t(t.template.find((p) => p.id === c), u, -1, n + "_" + o + "_" + c);
        }), a += "</div>");
      }), a += "</div>", a += this.valuesList[t.id] ? "" : `<div class="config-header"><button id="add-button" data-id="${t.id}" class="config-button dyn">+</button></div>`) : t.inbloc && (a += this.#l(t, e, s, n)), a += `${t.type !== "templateform" ? '<div class="bloc-bottom">' : ""}</div></div>`), a += "</div>";
    }
    return a;
  }
  #l(t, e, s = -1, n = "") {
    const a = this.#d(t, e), r = `id="${n}" ${s >= 0 ? `data-idx="${s}" ` : ""}`;
    switch (t.type) {
      //TODO add : button, 
      case "boolean":
        return `<div ${r}class="config-switch switch_transition ${a ? "switch_on" : ""}">
<div class="switch_slider"></div><div class="switch_circle"></div></div>`;
      case "number":
        return `<input ${r}type="number" class="config-input" value="${a}">`;
      case "longstring":
        return `<textarea ${r}class="config-textarea auto-expand" oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px'">${a}</textarea>`;
      case "object":
        return `<textarea ${r}class="config-textarea auto-expand" oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px'">${JSON.stringify(a, null, 2)}</textarea>`;
      case "dropdown":
        if (this.valuesList[t.id]) {
          let l = `<select ${r}class="field-select">`;
          return this.valuesList[t.id].forEach((o) => {
            l += `<option value="${o}" ${o === a ? "selected" : ""}>${o}</option>`;
          }), l + "</select>";
        }
      //else default                
      default:
        return `<input ${r}class="config-input" value="${a}">`;
    }
  }
  #s(t, e, s) {
    switch (t.type) {
      case "boolean":
        return this.#e(t, e.classList?.contains("switch_on"));
      case "number":
        return this.#e(t, parseFloat(e.value));
      case "object":
        return this.#e(t, JSON.parse(e.value));
      case "template":
        var n = [];
        return s.forEach((a, r) => {
          let l = e.querySelector("#" + e.id + "_" + r);
          l ? n.push(this.#s(t.template, l)) : n.push(void 0);
        }), n;
      case "templateform":
        return s.forEach((a, r) => {
          Object.keys(a).forEach((l) => {
            let o = e.querySelector("#" + e.id + "_" + r + "_" + l);
            o ? a[l] = this.#s(t.template.find((c) => c.id === l), o) : a[l] = void 0;
          });
        }), s;
      default:
        return this.#e(t, e.value);
    }
  }
  #o() {
    let t = "", e = this.I18Nuser ? Object.entries(this.I18Nuser) : [];
    return e = e.length > 0 ? e : Object.entries(this.I18N), e.length > 0 ? (e.sort(), e.forEach(([s, n]) => {
      t += `<div class="config-row"><div class="config-row-header"><div class="config-vo">${s.replaceAll(`
`, "\\n")}</div>`, t += `<div class="config-value large"><input class="config-input" value="${n.replaceAll(`
`, "\\n").replaceAll('"', "&quot;")}" data-key="${s.replaceAll(`
`, "\\n").replaceAll('"', "&quot;")}"></div></div></div>`;
    }), t += `<div class="config-header"><button id="export-loc" class="config-button dyn">${this.t("Export")}</button></div>`) : t += `<div class="details">${this.t("No string to translate, please extract them before.")}</div>`, t;
  }
  getValueListOption(t, e) {
    return this.opt[t][this.valuesList[t].indexOf(e)];
  }
  #e(t, e) {
    return this.is(t.parse) ? t.parse(e) : e;
  }
  #d(t, e) {
    return this.is(t.format) ? t.format(e) : e;
  }
  toggleswitch(t) {
    t.currentTarget.classList.contains("switch_on") ? t.currentTarget.classList.remove("switch_on") : t.currentTarget.classList.add("switch_on");
  }
  togglecollapse(t) {
    if (t.target.getAttribute("id")) return;
    const e = t.currentTarget, s = e.parentElement.querySelector("div.bloc");
    e.classList.contains("open") ? (e.classList.remove("open"), s.style = "max-height: 0px;") : (e.classList.add("open"), s.style = "max-height: unset;");
  }
  addItem(t) {
    const e = t.currentTarget, s = e.parentElement.parentElement.querySelector("div.config-dyn"), n = e.getAttribute("data-id"), a = this._parameters.find((r) => r.id === n);
    if (a.type === "template") {
      const r = document.createElement("div");
      r.innerHTML = this.#t(a.template, a.default, this.opt[a.id].length, a.id + "_" + (this.opt[a.id].length + 1)), s.appendChild(r), s.querySelector("div.collapse:last-of-type")?.parentElement.parentElement.addEventListener("click", (function(l) {
        this.togglecollapse(l);
      }).bind(this)), this.opt[a.id].push(a.default);
    } else if (a.type === "templateform") {
      const r = document.createElement("div");
      let l = `<div class="config-section"><div class="config-section-title">${this.t(a.title) + " #" + (this.opt[a.id].length + 1)}</div>`;
      Object.entries(a.template).forEach(([o, c]) => {
        l += this.#t(c, a.default[o], -1, n + "_" + i + "_" + o);
      }), r.innerHTML = l + "</div>", s.appendChild(r), r.querySelectorAll("div.collapse")?.forEach((o) => {
        o.parentElement.parentElement.addEventListener("click", (function(c) {
          this.togglecollapse(c);
        }).bind(this));
      }), this.opt[a.id].push(a.default);
    }
  }
  /** Find string in the scripts and generate a form for the user to let translate them */
  async extractLocStrings() {
    this.I18Nuser = this.assignDefined(await this.extractTranslations(this.translatedFiles), this.I18Nuser);
    const t = this._config.querySelector("#config-loc");
    t && (t.innerHTML = this.#o(), this._config.querySelector("#export-loc")?.addEventListener("click", (function() {
      this.exportLocStrings();
    }).bind(this)));
  }
  /** Get user translation from the options form */
  getUserTranslations() {
    let t = {};
    const e = this._config.querySelector("#config-loc");
    return e && e.querySelectorAll("input.config-input")?.forEach((s) => {
      t[s.getAttribute("data-key")] = s.value.replaceAll("\\n", `
`).replaceAll("&quot;", '"');
    }), t;
  }
  /** Export to clipboard user translation */
  exportLocStrings() {
    const t = this.getUserTranslations();
    this.isObjectEmpty(t) ? alert(this.t("No new translation found.")) : navigator.clipboard.writeText(JSON.stringify(t, null, 2)).then(() => {
      alert(this.t(`Your translation has been copied to the clipboard, share it with the widget creator throw the Grist forum or his Github.
Thanks a lot for your time !`));
    });
  }
  //==========================================================================================
  // Grist helper
  //==========================================================================================
  /** Encapsulate grist.ready to ensure correct initialization and translation
   * @param {Object} config - Usual object provided to grist.read
   */
  ready(t) {
    t && (t.columns && (this.I18Ngrist = {}, t.columns.map((e) => (e.title && (this.I18Ngrist[e.title] = "", e.title = this.t(e.title)), e.description && (this.I18Ngrist[e.description] = "", e.description = this.t(e.description)), e))), t.onEditOptions && (this.onEditOptionsUser = t.onEditOptions), t.onEditOptions = this.onEditOptions.bind(this)), grist.ready(t);
  }
  async onEditOptions() {
    await this.showConfig(), this.onEditOptionsUser && await this.onEditOptionsUser.apply();
  }
  /** Format record data for interaction with grist
   * @param {number} id - id of the record. Automatically parsed as integer
   * @param {object} data - Object with prop as column id and value
   */
  formatRecord(t, e) {
    return { id: parseInt(t), fields: e };
  }
  /** Update the current Grist table with given data 
   * @param {object|[object]} rec - Object with prop as column id and value as new value
   * @returns the answer of the update or null
  */
  async updateRecords(t, e) {
    return e = e ?? this.dataMapped, this.table || (this.table = grist.getTable()), e && (t = await this.encodeData(t)), t = Array.isArray(t) ? t.map((s) => this.mapColumnNamesBack(s)) : this.mapColumnNamesBack(t), await this.table?.update(t);
  }
  async createRecords(t, e) {
    return e = e ?? this.dataMapped, this.table || (this.table = grist.getTable()), e && (t = await this.encodeData(t)), t = Array.isArray(t) ? t.map((s) => this.mapColumnNamesBack(s)) : this.mapColumnNamesBack(t), await this.table?.create(t);
  }
  async destroyRecords(t) {
    return this.table || (this.table = grist.getTable()), Array.isArray(t) ? await this.table?.destroy(t.map((e) => parseInt(e))) : await this.table?.destroy(t);
  }
  /** Maps back properly records columns to be compatible with Grist */
  mapColumnNamesBack(t) {
    return t.fields = Object.fromEntries(Object.entries(t.fields).map((e) => [this.map[e[0]] ?? e[0], e[1]])), t;
  }
  /** Encapsulate grist.OnRecords to ensure the correct timing between the options and mapping loading 
   * and the execution of the main function
   * @param {function} main - Function to call when loading is ended. 
   * @param {Object} args - Grist object option for grist.onRecords
   */
  onRecords(t, e) {
    grist.onRecords(async (s, n) => {
      this._ismapped = !1, await this.isInit(), t(await this.mapData(s, n, e.mapRef));
    }, e);
  }
  /** Encapsulate grist.OnRecord to ensure the correct timing between the options and mapping loading 
   * and the execution of the main function
   * @param {function} main - Function to call when loading is ended. 
   * @param {Object} args - Grist object option for grist.onRecord
   */
  onRecord(t, e) {
    grist.onRecord(async (s, n) => {
      this._ismapped = !1, await this.isInit(), t(await this.mapData(s, n, e.mapRef));
    }, e);
  }
  async fetchSelectedRecord(t) {
    let e = await grist.fetchSelectedRecord(t);
    return grist.mapColumnNames(e);
  }
}
export {
  h as default
};
