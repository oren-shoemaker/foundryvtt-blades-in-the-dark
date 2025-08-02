/**
 * Extend the basic ItemSheet
 * @extends {ItemSheet}
 */
import {prepareActiveEffectCategories} from "./effects.js";
import { BladesActiveEffect } from "./blades-active-effect.js";
import { open_item_from_item } from "./utcf-item-card-helpers.js";

export class BladesItemSheet extends ItemSheet {

  /** @override */
	static get defaultOptions() {

	  return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ["until-the-curtain-falls", "sheet", "item"],
			width: 560,
			height: 560,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}]
		});
  }

  /* -------------------------------------------- */

  /** @override */
  get template() {
    const path = "systems/until-the-curtain-falls/templates/items";
    let simple_item_types = ["background", "homeland", "vice", "crew_reputation", "lifestyle","charter","company_ability","company_upgrade"];
    let template_name = `${this.item.type}`;

    if (simple_item_types.indexOf(this.item.type) >= 0) {
      template_name = "simple";
    }

    return `${path}/${template_name}.html`;
  }

  /* -------------------------------------------- */

  /** @override */
	activateListeners(html) {
    super.activateListeners(html);

    // Open item from item card
    html.find('.item-openable').click(async ev => open_item_from_item(ev));

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    html.find(".effect-control").click(ev => {
      if ( this.item.isOwned ) return ui.notifications.warn(game.i18n.localize("UTCF.EffectWarning"))
      BladesActiveEffect.onManageActiveEffect(ev, this.item)
    });

    html.find('.gear-property').change(ev => {
      const checked = $(ev.currentTarget)[0].checked;
      let properties = this.object.system.properties;
      const prop = $(ev.currentTarget).data("property");
        if(checked) {
          if(!properties.includes(prop))
          properties.push(prop);
        } else {
          properties = properties.filter(p => p !== prop);
        }
      this.object.update({"system.properties": properties});
    })
  }

  /* -------------------------------------------- */

  /** @override */
  async getData(options) {
    const superData = super.getData( options );
    const sheetData = superData.data;

    sheetData.isGM = game.user.isGM;
    sheetData.owner = superData.owner;
    sheetData.editable = superData.editable;

    // Prepare Active Effects
    sheetData.effects = prepareActiveEffectCategories(this.document.effects);

    sheetData.system.description = await foundry.applications.ux.TextEditor.implementation.enrichHTML(sheetData.system.description, {secrets: sheetData.owner, async: true});

    if(sheetData.type === "class") {
      const abilities = await game.packs.filter(p => p.title === "Abilities")[0].getDocuments();
      const class_abilities = abilities.filter(a => a.system.classes.includes(sheetData.system.shortname));
      sheetData.system.abilities = class_abilities.map(a => {
        let ability = a.toObject();
        // clean out ability -> class refs to avoid a reference loop
        ability.system.classes = [];
        return ability;
      });
    }

    if(sheetData.type === "ability"){
      const classes = await game.packs.filter(p => p.title === "Classes")[0].getDocuments();
      const ability_classes = classes.filter(c => sheetData.system.classes.includes(c.system.shortname));
      sheetData.system.classes = ability_classes.map(c => {
        let cls = c.toObject();
        // clean out class -> ability refs to avoid a reference loop
        cls.system.abilities = [];
        return cls;
      });
    }

    // need to localize rarity options
    if(sheetData.type === "gear"){
      for(const opt in sheetData.system.rarity_options) {
        sheetData.system.rarity_options[opt] = game.i18n.localize(sheetData.system.rarity_options[opt]);
      }
    }

    return sheetData;
  }
}
