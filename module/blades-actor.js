import { bladesRoll } from "./blades-roll.js";
import { BladesHelpers } from "./blades-helpers.js";
import { Mutex } from "./mutex.js";

/**
 * Extend the basic Actor
 * @extends {Actor}
 */
export class BladesActor extends Actor {
  mutex = new Mutex();

  /** @override */
  static async create(data, options={}) {

    data.prototypeToken = data.prototypeToken || {};

    // For Crew and Character set the Token to sync with charsheet.
    switch (data.type) {
      case 'character':
      case 'crew':
      case '\uD83D\uDD5B clock':
        data.prototypeToken.actorLink = true;
        break;
    }

    return super.create(data, options);
  }

  /** @override */
  getRollData() {
    const rollData = super.getRollData();

    rollData.dice_amount = this.getAttributeDiceToThrow();

    return rollData;
  }

  //** @override */
  async prepareData(){

    switch(this.type) {
      case 'character': {
        // set total attribute values
        let actor_attributes = this.system.attributes;
        const classes = await BladesHelpers.getAllItemsByType("class", game);
        const class_base_attributes = classes.find(cls => cls.system.shortname === this.system.playbook)?.system?.base_skills;

        if(actor_attributes) {
          for(const a in actor_attributes) {
            for(const s in actor_attributes[a].skills) {
              let base_value = 0;
              if(class_base_attributes) {
                base_value = class_base_attributes[s]?.value;
              }
              actor_attributes[a].skills[s].base_value = base_value;
              actor_attributes[a].skills[s].value = Math.min(actor_attributes[a].skills[s].max, base_value + actor_attributes[a].skills[s].assigned_value);
            }
          }
        }

        this.update({"system.attributes": actor_attributes});

        // update overencumbrance threshold for My Back Unbroken
        let encumbered_threshold = 7;

        if(this.items.some(i => i.type === 'ability' && i.system.shortname === 'MBUB')) {
          encumbered_threshold += 2;
        }

        if(encumbered_threshold != this.system.encumbered_threshold) {
          this.update({"system.encumbered_threshold": encumbered_threshold});
        }

        // update max stress for Veterans of Psychic Wars
        let max_stress = this.system.stress.max_default;
        if(this.system.company_id) {
          const company = BladesHelpers.getActorById(this.system.company_id, game);
          const has_vopw = company.items.filter(i => i.type === "company_ability").some(i => i.name === 'Veterans of Psychic Wars');
          if(has_vopw) max_stress++;
        }

        if(max_stress != this.system.stress.max) {
          this.update({"system.stress.max": max_stress});
        }
      
        // sync gear linked to abilities
        const actor_ability_shortnames = this.items.filter(i => i.type === "ability").map(i => i.system.shortname);
        const linked_actor_gear = this.items.filter(i => i.type === "gear" && i.system.linked_ability);
        const linked_actor_gear_names = linked_actor_gear.map(i => i.name);

        const linked_gear_to_add = (await BladesHelpers.getAllItemsByType("gear", game)).filter(g => 
          g.system.linked_ability && 
          actor_ability_shortnames && 
          actor_ability_shortnames.includes(g.system.linked_ability) &&
          !linked_actor_gear_names.includes(g.name)
        );


        const linked_gear_to_remove = linked_actor_gear.filter(g => !actor_ability_shortnames.includes(g.system.linked_ability)).map(g => g._id);

        if(linked_gear_to_add) {
          await Item.create(linked_gear_to_add, {parent: this})
        }

        if(linked_gear_to_remove) {
          await this.deleteEmbeddedDocuments("Item", linked_gear_to_remove);
        }
        
        break;
      };
      case 'company': {
        // set invested coin based on investments item
        const invested_coin = this.items.find(i => i.type === "investments")?.system.invested_coin;
        if(this.system.invested_coin !== invested_coin){
          this.update({"system.coins.invested": invested_coin});
        }
        
        // set lifestyle based on invested coin
        // need to wrap this in a mutex, otherwise repeated re-rendering causes race conditions
        // ...which probably means this should be re-architected...
        const unlock = await this.mutex.lock();

        try {
          const current_lifestyles = this.items.filter(i => i.type === "lifestyle");
          let lifestyle_name = '';

          if(invested_coin <=10) {
            lifestyle_name = 'Threadbare';
          } else if (invested_coin > 10 && invested_coin <= 30) {
            lifestyle_name = 'Comfortable';
          } else if (invested_coin > 30 && invested_coin <= 60) {
            lifestyle_name = 'Fancy';
          } else if (invested_coin > 60) {
            lifestyle_name = 'Lavish';
          }

          if(!current_lifestyles.some(item => item.name === lifestyle_name)) {
            const lifestyles_to_add = (await BladesHelpers.getAllItemsByType("lifestyle", game)).filter(i => i.name === lifestyle_name);

            if(lifestyles_to_add) {
              await Item.create(lifestyles_to_add, {parent: this});
            }
          }
          
          let lifestyles_to_remove = current_lifestyles.filter(item => item.name !== lifestyle_name).map(i => i._id);  

          if(lifestyles_to_remove) {
            await this.deleteEmbeddedDocuments("Item", lifestyles_to_remove);
          }
        } finally {
          await unlock();
        }

        break;
      };
    }


  }

  /* -------------------------------------------- */
  /**
   * Calculate Attribute Dice to throw.
   */
  getAttributeDiceToThrow() {

    // Calculate Dice to throw.
    let dice_amount = {};
    dice_amount['UTCF.Vice'] = 4;

    for (var attribute_name in this.system.attributes) {
      dice_amount[attribute_name] = 0;
      for (var skill_name in this.system.attributes[attribute_name].skills) {
        dice_amount[skill_name] = parseInt(this.system.attributes[attribute_name].skills[skill_name]['value'][0])

        // We add a +1d for every skill higher than 0.
        if (dice_amount[skill_name] > 0) {
          dice_amount[attribute_name]++;
        }
      }
      // Vice dice roll uses lowest attribute dice amount
      if (dice_amount[attribute_name] < dice_amount['UTCF.Vice'] ) {
        dice_amount['UTCF.Vice'] = dice_amount[attribute_name];
      }
    }

    return dice_amount;
  }

  /* -------------------------------------------- */

  rollAttributePopup(attribute_name) {

    // const roll = new Roll("1d20 + @abilities.wis.mod", actor.getRollData());
    let attribute_label = BladesHelpers.getRollLabel(attribute_name);

    let content = `
        <h2>${game.i18n.localize('UTCF.Roll')} ${game.i18n.localize(attribute_label)}</h2>
        <form>
          <div class="form-group">
            <label>${game.i18n.localize('UTCF.Modifier')}:</label>
            <select id="mod" name="mod">
              ${this.createListOfDiceMods(-3,+3,0)}
            </select>
          </div>`;
    if (BladesHelpers.isAttributeAction(attribute_name)) {
      content += `
            <div class="form-group">
              <label>${game.i18n.localize('UTCF.Position')}:</label>
              <select id="pos" name="pos">
                <option value="controlled">${game.i18n.localize('UTCF.PositionControlled')}</option>
                <option value="risky" selected>${game.i18n.localize('UTCF.PositionRisky')}</option>
                <option value="desperate">${game.i18n.localize('UTCF.PositionDesperate')}</option>
              </select>
            </div>
            <div class="form-group">
              <label>${game.i18n.localize('UTCF.Effect')}:</label>
              <select id="fx" name="fx">
                <option value="limited">${game.i18n.localize('UTCF.EffectLimited')}</option>
                <option value="standard" selected>${game.i18n.localize('UTCF.EffectStandard')}</option>
                <option value="great">${game.i18n.localize('UTCF.EffectGreat')}</option>
              </select>
            </div>`;
    } else {
        content += `
            <input  id="pos" name="pos" type="hidden" value="">
            <input id="fx" name="fx" type="hidden" value="">`;
    }
    content += `
        <div className="form-group">
          <label>${game.i18n.localize('UTCF.Notes')}:</label>
          <input id="note" name="note" type="text" value="">
        </div><br/>
        </form>
      `;

    new Dialog({
      title: `${game.i18n.localize('UTCF.Roll')} ${game.i18n.localize(attribute_label)}`,
      content: content,
      buttons: {
        yes: {
          icon: "<i class='fas fa-check'></i>",
          label: game.i18n.localize('UTCF.Roll'),
          callback: async (html) => {
            let modifier = parseInt(html.find('[name="mod"]')[0].value);
            let position = html.find('[name="pos"]')[0].value;
            let effect = html.find('[name="fx"]')[0].value;
            let note = html.find('[name="note"]')[0].value;
            await this.rollAttribute(attribute_name, modifier, position, effect, note);
          }
        },
        no: {
          icon: "<i class='fas fa-times'></i>",
          label: game.i18n.localize('Close'),
        },
      },
      default: "yes",
    }).render(true);

  }

  /* -------------------------------------------- */

  async rollAttribute(attribute_name = "", additional_dice_amount = 0, position, effect, note) {

    let dice_amount = 0;
    if (attribute_name !== "") {
      let roll_data = this.getRollData();
      dice_amount += roll_data.dice_amount[attribute_name];
    }
    else {
      dice_amount = 1;
    }
    dice_amount += additional_dice_amount;

    await bladesRoll(dice_amount, attribute_name, position, effect, note, this.system.stress.value);
  }

  /* -------------------------------------------- */

  /**
   * Create <options> for available actions
   *  which can be performed.
   */
  createListOfActions() {

    let text, attribute, skill;
    let attributes = this.system.attributes;

    for ( attribute in attributes ) {

      const skills = attributes[attribute].skills;

      text += `<optgroup label="${attribute} Actions">`;
      text += `<option value="${attribute}">${attribute} (Resist)</option>`;

      for ( skill in skills ) {
        text += `<option value="${skill}">${skill}</option>`;
      }

      text += `</optgroup>`;

    }

    return text;

  }

  /* -------------------------------------------- */

  /**
   * Creates <options> modifiers for dice roll.
   *
   * @param {int} rs
   *  Min die modifier
   * @param {int} re
   *  Max die modifier
   * @param {int} s
   *  Selected die
   */
  createListOfDiceMods(rs, re, s) {

    var text = ``;
    var i = 0;

    if ( s == "" ) {
      s = 0;
    }

    for ( i  = rs; i <= re; i++ ) {
      var plus = "";
      if ( i >= 0 ) { plus = "+" };
      text += `<option value="${i}"`;
      if ( i == s ) {
        text += ` selected`;
      }

      text += `>${plus}${i}d</option>`;
    }

    return text;

  }

  /* -------------------------------------------- */

}