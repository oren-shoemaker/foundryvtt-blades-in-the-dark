
import { BladesSheet } from "./blades-sheet.js";
import { BladesActiveEffect } from "./blades-active-effect.js";
import { LOAD_LEVELS } from "./base-system-data.js";

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
      width: 710,
      height: 920,
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
    sheetData.items.forEach(i => {loadout += (i.type === "gear") && (i.system.equipped) ? parseInt(i.system.load) : 0});

    //Sanity Check
    if (loadout < 0) {
      loadout = 0;
    }
    if (loadout > 10) {
      loadout = 10;
    }

    sheetData.system.loadout = loadout;

    let max_load = 0;
    switch(sheetData.system.selected_load_level) {
      case "UTCF.Load.Light":
        max_load = 3;
        break;
      case "UTCF.Load.Normal":
        max_load = 5;
        break;
      case "UTCF.Load.Heavy":
        max_load = 6;
        break;
      default:
        max_load = 0;
        break;
    }


    //look for My Back Unbroken ability
    sheetData.items.forEach(i => {
      if (i.type === "ability" && i.system.shortname === "MBUB") {
        max_load += 2;
      }
    });

    sheetData.system.max_load = max_load;

    sheetData.system.load_levels = LOAD_LEVELS;

    sheetData.system.description = await foundry.applications.ux.TextEditor.implementation.enrichHTML(sheetData.system.description, {secrets: sheetData.owner, async: true});

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

    // manage active effects
    html.find(".effect-control").click(ev => BladesActiveEffect.onManageActiveEffect(ev, this.actor));
    html.find(".ability-add-popup").click(this._onAbilityAddClick.bind(this));
    html.find(".company-add-popup").click(ev => this._joinCompany(this.actor));

    html.find('.gear-equipped').change(ev => {
      const item_id = $(ev.currentTarget).parents(".item-card").data("itemId");
      const item = this.actor.items.get(item_id);
      const checked = $(ev.currentTarget)[0].checked;

      if(checked) {
        item.update({"system.equipped": true});
        if(item.system.special_armor) {
          this.object.update({"system.armor-uses.special": 1})
        }
      } else {
        item.update({"system.equipped": false});
        if(item.system.special_armor) {
          this.object.update({"system.armor-uses.special": 0})
        }
      }
    });

    html.find('.use-armor').change(async ev => {
      const item_name = $(ev.currentTarget).data("itemName");
      const checked = $(ev.currentTarget)[0].checked;
      const gear = await game.packs.filter(p => p.title === "Gear")[0].getDocuments();
      const base_item = gear.find(i => i.name === item_name);

      if(checked) {
        await Item.create([base_item], {parent: this.document});
        this.actor.items.find(i => i.name === item_name).update({"system.equipped": true});
      } else {
        const actor_item = this.actor.items.find(i => i.name === item_name);
        if(actor_item)
          await this.actor.deleteEmbeddedDocuments("Item", [actor_item._id]);
      }
    });

    html.find('.spell-stress-cost').click(ev => {
      const spell_id = $(ev.currentTarget).parents(".item-card").data("itemId");
      const stress_cost = this.actor.items.get(spell_id).system.stress;
      const new_stress = Number(this.object.system.stress.value) + stress_cost;
      const stress_to_set = new_stress < this.object.system.stress.max ? new_stress : this.object.system.stress.max;
      this.object.update({"system.stress.value": [stress_to_set]})
    });
  }

  /* -------------------------------------------- */
  
  async _onAbilityAddClick(event) {
    event.preventDefault();
    const class_shortname = $(event.currentTarget).data("classShortname");
    let items = await BladesHelpers.getAllAbilitiesByClass(class_shortname, game);
    this._onItemAddClickRender(event, items, "ability");
  }

  async _joinCompany(actor) {
    let html = `<div class="until-the-curtain-falls"><div class="items-to-add">`;

    let companies = game.actors.filter(a => a.type === "company");

    companies.forEach(e => {
      html += `<input id="select-item-${e._id}" type="radio" name="select_items" value="${e._id}">`;
      html += `<label class="flex-horizontal-spaced" for="select-item-${e._id}">`;
      html += `${e.name}`;
      html += `</label>`;
    });

    html += `</div></div>`;

    let dialog = new Dialog({
      title: `${game.i18n.localize('UTCF.Company.Add')}`,
      content: html,
      buttons: {
        one: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize('Join'),
          callback: async (html) => {
            let element = $(html).find(".items-to-add").find("input:checked");
            let id = $(element).val();
            actor.update({"system.company_id": id})
          }
        },
        two: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize('Cancel'),
          callback: () => false
        }
      },
      default: "two"
    }, {});

    dialog.render(true);
  }

 /** @override */
  handle_item_delete(element) {
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
  }

  /** @override */
  handle_actor_delete(element) {
    switch(element.data("actorType")) {
      case "company":
        this.object.update({"system.company_id": ""});
        break;
    }
  }
}

