/**
 * Extend the basic ItemSheet
 * @extends {ItemSheet}
 */
import {onManageActiveEffect, prepareActiveEffectCategories} from "./effects.js";
import { BladesActiveEffect } from "./blades-active-effect.js";

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
    let simple_item_types = ["background", "heritage", "vice", "crew_reputation"];
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

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    html.find(".effect-control").click(ev => {
      if ( this.item.isOwned ) return ui.notifications.warn(game.i18n.localize("UTCF.EffectWarning"))
      BladesActiveEffect.onManageActiveEffect(ev, this.item)
    });

    html.find('.item-list-item').click(async ev => {
      const id = $(ev.currentTarget).data("itemId");
      const items = await Promise.all(game.packs
        .filter(p => p.documentName === "Item")
        .map(async p => p.getDocuments()))
        .then(arr => arr
          .flat()
          .filter(doc => doc._id === id));
      
      if(items.length === 1) {
        items[0].sheet.render(true);
      } else {
        console.log(items);
        throw new Error(`item ID ${id} is non-unique!`)
      }
    });
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

    sheetData.system.description = await TextEditor.enrichHTML(sheetData.system.description, {secrets: sheetData.owner, async: true});

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
      console.log(ability_classes);
      sheetData.system.classes = ability_classes.map(c => {
        let cls = c.toObject();
        // clean out class -> ability refs to avoid a reference loop
        cls.system.abilities = [];
        return cls;
      });

    }

    console.log(sheetData);

    return sheetData;
  }
}
