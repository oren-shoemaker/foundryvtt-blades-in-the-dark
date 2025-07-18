
import { BladesSheet } from "./blades-sheet.js";
import { BladesActiveEffect } from "./blades-active-effect.js";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {BladesSheet}
 */
export class BladesActorSheet extends BladesSheet {

  /** @override */
	static get defaultOptions() {
	  return foundry.utils.mergeObject(super.defaultOptions, {
  	  classes: ["until-the-curtain-falls", "sheet", "actor", "pc"],
  	  template: "systems/until-the-curtain-falls/templates/actor-sheet.html",
      width: 700,
      height: 970,
      tabs: [{navSelector: ".tabs", contentSelector: ".tab-content", initial: "abilities"}]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  async getData(options) {
    const superData = super.getData( options );
    const sheetData = superData.data;
    sheetData.owner = superData.owner;
    sheetData.editable = superData.editable;
    sheetData.isGM = game.user.isGM;

    // Prepare active effects
    sheetData.effects = BladesActiveEffect.prepareActiveEffectCategories(this.actor.effects);

    // Calculate Load
    let loadout = 0;
    sheetData.items.forEach(i => {loadout += (i.type === "item") ? parseInt(i.system.load) : 0});

    //Sanity Check
    if (loadout < 0) {
      loadout = 0;
    }
    if (loadout > 10) {
      loadout = 10;
    }

    sheetData.system.loadout = loadout;

    // Encumbrance Levels
    let load_level=["UTCF.Light","UTCF.Light","UTCF.Light","UTCF.Light","UTCF.Normal","UTCF.Normal","UTCF.Heavy","UTCF.Encumbered",
			"UTCF.Encumbered","UTCF.Encumbered","UTCF.OverMax"];
    let mule_level=["UTCF.Light","UTCF.Light","UTCF.Light","UTCF.Light","UTCF.Light","UTCF.Light","UTCF.Normal","UTCF.Normal",
			"UTCF.Heavy","UTCF.Encumbered","UTCF.OverMax"];
    let mule_present=0;


    //look for Mule ability
    // @todo - fix translation.
    sheetData.items.forEach(i => {
      if (i.type === "ability" && i.name === "(C) Mule") {
        mule_present = 1;
      }
    });

    //set encumbrance level
    if (mule_present) {
      sheetData.system.load_level=mule_level[loadout];
    } else {
      sheetData.system.load_level=load_level[loadout];
    }

    sheetData.system.load_levels = {"UTCF.Light":"UTCF.Light", "UTCF.Normal":"UTCF.Normal", "UTCF.Heavy":"UTCF.Heavy"};

    sheetData.system.description = await TextEditor.enrichHTML(sheetData.system.description, {secrets: sheetData.owner, async: true});

    // need to re-sync skill data from underlying object as some fields are not directly represented on the sheet
    // maybe a better way to hold "hidden" variable values?
    const actorSystemData = this.actor.system;
    for(const attr in actorSystemData.attributes) {
      for(const sk in actorSystemData.attributes[attr].skills) {
        sheetData.system.attributes[attr].skills[sk].base_value = actorSystemData.attributes[attr].skills[sk].base_value;
      }
    }

    // catch unmigrated actor data and sync hidden skill data from underlying object
    for( const a in sheetData.system.attributes ) {
      for( const s in sheetData.system.attributes[a].skills ) {
        if( sheetData.system.attributes[a].skills[s].max === undefined ){
          sheetData.system.attributes[a].skills[s].max = 4;
        }
      }
    }

    return sheetData;
  }

  /* -------------------------------------------- */

  /** @override */
	activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Open Actor Sheet Item
    html.find('.item-openable').click(ev => {
      const element = $(ev.currentTarget).parents(".item-block");
      const item = this.actor.items.get(element.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Actor Sheet Item
    html.find('.item-delete').click( async ev => {
      const element = $(ev.currentTarget).parents(".item-block");

      switch(element.data("itemType")) {
        case "class":
          this.object.update({"system.playbook": ""});
          break;
        case "homeland":
          this.object.update({"system.homeland": ""});
          break;
        case "background":
          this.object.update({"system.background": ""});
          break;
      }

      await this.actor.deleteEmbeddedDocuments("Item", [element.data("itemId")]);
      element.slideUp(200, () => this.render(false));
    });

    // manage active effects
    html.find(".effect-control").click(ev => BladesActiveEffect.onManageActiveEffect(ev, this.actor));
    html.find(".ability-add-popup").click(this._onAbilityAddClick.bind(this));
  }

  /* -------------------------------------------- */
  
  async _onAbilityAddClick(event) {
    event.preventDefault();
    const class_shortname = $(event.currentTarget).data("classShortname");
    let items = await BladesHelpers.getAllAbilitiesByClass(class_shortname, game);
    this._onItemAddClickRender(event, items, "ability");
  }

  async _onSkillBoxClick(event) {
    event.preventDefault();
    console.log("clicky");
  }

}
