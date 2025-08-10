import { actionRoll, bladesRoll } from "./blades-roll.js";
import { BladesHelpers } from "./blades-helpers.js";
import { Mutex } from "./mutex.js";
import { ACTION_EFFECTS, ACTION_POSITIONS } from "./base-system-data.js";

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

    rollData.dice_amount = this.getDicePool();

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
              let assigned_value = Number(actor_attributes[a].skills[s].assigned_value);
              let base_value = 0;
              if(class_base_attributes) {
                base_value = Number(class_base_attributes[s]?.value);
              }
              actor_attributes[a].skills[s].base_value = base_value;
              actor_attributes[a].skills[s].value = Math.min(actor_attributes[a].skills[s].max, base_value + assigned_value);
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
  getDicePool() {
    // Calculate Dice to throw.
    let die_pools = {};
    die_pools['UTCF.Vice'] = 4;

    for (var attribute_name in this.system.attributes) {
      die_pools[attribute_name] = 0;
      for (var skill_name in this.system.attributes[attribute_name].skills) {
        die_pools[skill_name] = Number(this.system.attributes[attribute_name].skills[skill_name].value)

        // We add a +1d for every skill higher than 0.
        if (die_pools[skill_name] > 0) {
          die_pools[attribute_name]++;
        }
      }
      // Vice dice roll uses lowest attribute dice amount
      if (die_pools[attribute_name] < die_pools['UTCF.Vice'] ) {
        die_pools['UTCF.Vice'] = die_pools[attribute_name];
      }
    }

    return die_pools;
  }

  /* -------------------------------------------- */

  rollActionDialog(action_name) {
    let action_label = BladesHelpers.getRollLabel(action_name);

    let html = `
      <h2>${game.i18n.localize('UTCF.Roll.Label')} ${game.i18n.localize(action_label)}</h2>
      <form>`;

    // position
    html += `
            <div class="form-group">
              <label>${game.i18n.localize('UTCF.Action.Position.Label')}:</label>
              <select id="pos" name="pos">`

    for(const [position, value] of Object.entries(ACTION_POSITIONS)) {
      html += `
                <option value="${position}">${game.i18n.localize(value.label)}</option>`
    }
    
    html+=`
                </select>
            </div>`
    
    // effect
    html += `
            <div class="form-group">
              <label>${game.i18n.localize('UTCF.Action.Effect.BaseLabel')}:</label>
              <select id="fx" name="fx">`

    ACTION_EFFECTS.filter(e => !['zero','extreme'].includes(e.effect) ).forEach(effect => {
      html += `
                <option value="${effect.ordinal}">${game.i18n.localize(effect.label)}</option>`
    })
    
    html+=`
                </select>
            </div>`


    if(this.reducedEffectFromHarm()) {
      html += `
            <label class="label-red">${game.i18n.localize("UTCF.Action.Effect.ReducedFromHarm")}</label>`
    }

    // base die pool
    html += `
            <label>${game.i18n.localize("UTCF.Roll.DicePool.Label")}: ${this.getDicePool()[action_name]}${game.i18n.localize("UTCF.Roll.DicePool.ActionDots")}`
            
    if(this.reducedDiceFromHarm()) {
      html += ` ${game.i18n.localize("UTCF.Roll.DicePool.ReducedFromHarm")}`;
    }
    
    html += `
            </label>`;

    // bonus dice
    html += `<div class="form-group">
              <label>${game.i18n.localize("UTCF.Action.Assisted")}</label>
              <input type="checkbox" id="assisted" name="assisted" value="assisted">
            </div>`

    html += `<div class="form-group">
               <label>${game.i18n.localize("UTCF.Action.PushYourself")}</label>
               <input type="checkbox" id="push" name="push" value="push">
             </div>`
    
    if(this.hasPushSpecialArmor()) {
      html += `
             <div class="form-group">
               <label>${game.i18n.localize("UTCF.Action.PushYourselfSpecialArmor")}</label>
               <input type="checkbox" id="push_armor" name="push_armor" value="push_armor">
             </div>`
    }

    html += `<div class="form-group">
               <label>${game.i18n.localize("UTCF.Action.DarkBargain")}</label>
               <input type="checkbox" id="bargain" name="bargain" value="bargain">
             </div>`

    html += `<div class="form-group">
               <label>${game.i18n.localize("UTCF.Roll.ExtraDiceMod")}</label>
               <input type="number" id="extradice" name="extradice" value=0>
             </div>`

    html += `
      </form>`;

    new foundry.applications.api.DialogV2({
      window: {
        contentClasses: ["until-the-curtain-falls", "roll-dialog-window"],
        title: `${game.i18n.localize('UTCF.Roll.Label')} ${game.i18n.localize(action_label)}`
      },
      content: html,
      buttons: [
        {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize('UTCF.Roll.Label'),
          action: 'roll',
          callback: async (event, button, dialog) => {
            let position = button.form.elements.pos.value;

            let effect = Number(button.form.elements.fx.value);
            if(this.reducedEffectFromHarm()) effect--;
            effect = effect < 0 ? 0 : effect;

            let dice = this.getDicePool()[action_name];
            let assisted = button.form.elements.assisted.checked;
            if(assisted) dice++;
            let push = button.form.elements.push.checked;
            let bargain = button.form.elements.bargain.checked;
            let push_armor = button.form.elements.push_armor.checked;
            if(push || bargain || push_armor) dice++;
            if(this.reducedDiceFromHarm()) dice--;
            let extra_dice_mod = Number(button.form.elements.extradice.value);
            dice += extra_dice_mod;
            dice = dice < 0 ? 0 : dice;

            if(push) {
              let stress = Number(this.system.stress.value)+2;
              await this.update({"system.stress.value": stress});
            }

            if(push_armor) {
              await this.consumeSpecialArmor();
            }

            await actionRoll(action_label,dice,position,effect);
          }
        },
        {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize('Close'),
          action: 'close',
          default: true,
          callback: () => false
        }
      ]
    }).render({force: true});
  }

  reducedEffectFromHarm(){
    return this.system.harm.light.one || this.system.harm.light.two;
  }

  reducedDiceFromHarm(){
    return this.system.harm.medium.one || this.system.harm.medium.two;
  }

  hasPushSpecialArmor(){
    const ability_shortnames = ['CSPL','IMCR','MSUN','NCCM','TAAB'];
    return this.items.some(item => ability_shortnames.includes(item.system.shortname)) && !this.system['armor-uses'].special;
  }

  async consumeSpecialArmor(){
    const ability_shortnames = ['CSPL','IMCR','MSUN','NCCM','TAAB'];
    this.items
      .filter(item => item.system.linked_ability && ability_shortnames.includes(item.system.linked_ability))
      .forEach(async item => {
        await item.update({"system.equipped": true});
  });
    await this.update({"system.armor-uses.special": 1});
  }

  /* -------------------------------------------- */

  rollAttributePopup(attribute_name) {

    let attribute_label = BladesHelpers.getRollLabel(attribute_name);

    let html = `
        <h2>${game.i18n.localize('UTCF.Roll.Label')} ${game.i18n.localize(attribute_label)}</h2>
        <form>
          <div class="form-group">
            <label>${game.i18n.localize('UTCF.Modifier')}:</label>
            <select id="mod" name="mod">
              ${this.createListOfDiceMods(-3,+3,0)}
            </select>
          </div>`;
    if (BladesHelpers.isAttributeAction(attribute_name)) {
      html += `
            <div class="form-group">
              <label>${game.i18n.localize('UTCF.Action.Position.Label')}:</label>
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
        html += `
            <input  id="pos" name="pos" type="hidden" value="">
            <input id="fx" name="fx" type="hidden" value="">`;
    }
    html += `
        <div className="form-group">
          <label>${game.i18n.localize('UTCF.Notes')}:</label>
          <input id="note" name="note" type="text" value="">
        </div><br/>
        </form>
      `;

    let dialog = new foundry.applications.api.DialogV2({
      window: {
        contentClasses: ["until-the-curtain-falls", "dialog-window"],
        title: `${game.i18n.localize('UTCF.Roll.Label')} ${game.i18n.localize(attribute_label)}`
      },
      content: html,
      buttons: [
        {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize('UTCF.Roll.Label'),
          action: 'roll',
          callback: async (event, button, dialog) => {
            let modifier = parseInt(button.form.elements.mod.value);
            let position = button.form.elements.pos.value;
            let effect = button.form.elements.fx.value;
            let note = button.form.elements.note.value;

            await this.rollAttribute(attribute_name, modifier, position, effect, note);
          }
        },
        {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize('Close'),
          action: 'close',
          callback: () => false
        }
      ]
    }, {});

    dialog.render(true);

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