/**
 * A simple and flexible system for world-building using an arbitrary collection of character and item attributes
 * Author: Atropos
 * Software License: GNU GPLv3
 */

// Import Modules
import { registerSystemSettings } from "./settings.js";
import { preloadHandlebarsTemplates } from "./blades-templates.js";
import { bladesRoll, simpleRollPopup } from "./blades-roll.js";
import { BladesHelpers } from "./blades-helpers.js";
import { BladesActor } from "./blades-actor.js";
import { BladesItem } from "./blades-item.js";
import { BladesItemSheet } from "./blades-item-sheet.js";
import { BladesActorSheet } from "./blades-actor-sheet.js";
import { BladesActiveEffect } from "./blades-active-effect.js";
import { BladesCrewSheet } from "./blades-crew-sheet.js";
import { BladesClockSheet } from "./blades-clock-sheet.js";
import { BladesNPCSheet } from "./blades-npc-sheet.js";
import { BladesFactionSheet } from "./blades-faction-sheet.js";
import * as migrations from "./migration.js";
import { GEAR_PROPERTIES } from "./base-system-data.js";

window.BladesHelpers = BladesHelpers;

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */
Hooks.once("init", async function() {
  console.log(`Initializing Until the Curtain Falls system`);

  game.blades = {
    dice: bladesRoll
  };
  game.system.bladesClocks = {
    sizes: [ 4, 6, 8 ]
  };

  CONFIG.Item.documentClass = BladesItem;
  CONFIG.Actor.documentClass = BladesActor;
  CONFIG.ActiveEffect.documentClass = BladesActiveEffect;

  // Register System Settings
  registerSystemSettings();

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("blades", BladesActorSheet, { types: ["character"], makeDefault: true });
  Actors.registerSheet("blades", BladesCrewSheet, { types: ["crew"], makeDefault: true });
  Actors.registerSheet("blades", BladesFactionSheet, { types: ["factions"], makeDefault: true });
  Actors.registerSheet("blades", BladesClockSheet, { types: ["\uD83D\uDD5B clock"], makeDefault: true });
  Actors.registerSheet("blades", BladesNPCSheet, { types: ["npc"], makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("blades", BladesItemSheet, {makeDefault: true});
  await preloadHandlebarsTemplates();

  Actors.registeredSheets.forEach(element => console.log(element.Actor.name));


  // Is the value Turf side.
  Handlebars.registerHelper('is_turf_side', function(value, options) {
    if (["left", "right", "top", "bottom"].includes(value)) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  });

  // Multiboxes.
  Handlebars.registerHelper('multiboxes', function(selected, options) {

    let html = options.fn(this);

    // Fix for single non-array values.
    if ( !Array.isArray(selected) ) {
      selected = [selected];
    }

    if (typeof selected !== 'undefined') {
      selected.forEach(selected_value => {
        if (selected_value !== false) {
          let escapedValue = RegExp.escape(Handlebars.escapeExpression(selected_value));
          let rgx = new RegExp(' value=\"' + escapedValue + '\"');
          let oldHtml = html;
          html = html.replace(rgx, "$& checked");
          while( ( oldHtml === html ) && ( escapedValue >= 0 ) ){
            escapedValue--;
            rgx = new RegExp(' value=\"' + escapedValue + '\"');
            html = html.replace(rgx, "$& checked");
          }
        }
      });
    }

    return html;
  });
  
  // Trauma Counter
  Handlebars.registerHelper('traumacounter', function(selected, options) {

    let html = options.fn(this);

    var count = 0;
    for (const trauma in selected) {
      if (selected[trauma] === true) {
        count++;
      }
    }

    if (count > 4) count = 4;

    const rgx = new RegExp(' value=\"' + count + '\"');
    return html.replace(rgx, "$& checked");

  });

  // NotEquals handlebar.
  Handlebars.registerHelper('noteq', (a, b, options) => {
    return (a !== b) ? options.fn(this) : '';
  });

  // ReputationTurf handlebar.
  Handlebars.registerHelper('repturf', (turfs_amount, options) => {
    let html = options.fn(this);
    var turfs_amount_int = parseInt(turfs_amount);

    // Can't be more than 6.
    if (turfs_amount_int > 6) {
      turfs_amount_int = 6;
    }

    for (let i = 13 - turfs_amount_int; i <= 12; i++) {
      const rgx = new RegExp(' value=\"' + i + '\"');
      html = html.replace(rgx, "$& disabled");
    }
    return html;
  });

  Handlebars.registerHelper('crew_vault_coins', (max_coins, options) => {

    let html = options.fn(this);
    for (let i = 1; i <= max_coins; i++) {

      html += "<input type=\"radio\" id=\"crew-coins-vault-" + i + "\" data-dType=\"Number\" name=\"system.vault.value\" value=\"" + i + "\"><label for=\"crew-coins-vault-" + i + "\"></label>";
    }

    return html;
  });

  Handlebars.registerHelper('crew_experience', (_id, options) => {

    let html = options.fn(this);
    for (let i = 1; i <= 10; i++) {

      html += `<input type="radio" id="crew-${_id}-experience-${i}" data-dType="Number" name="system.experience" value="${i}" dtype="Radio"><label for="crew-${_id}-experience-${i}"></label>`;
    }

    return html;
  });

  // Enrich the HTML replace /n with <br>
  Handlebars.registerHelper('html', (options) => {

    let text = options.hash['text'].replace(/\n/g, "<br />");

    return new Handlebars.SafeString(text);
  });

  // "N Times" loop for handlebars.
  //  Block is executed N times starting from n=1.
  //
  // Usage:
  // {{#times_from_1 10}}
  //   <span>{{this}}</span>
  // {{/times_from_1}}
  Handlebars.registerHelper('times_from_1', function(n, block) {

    var accum = '';
    for (var i = 1; i <= n; ++i) {
      accum += block.fn(i);
    }
    return accum;
  });

  // "N Times" loop for handlebars.
  //  Block is executed N times starting from n=0.
  //
  // Usage:
  // {{#times_from_0 10}}
  //   <span>{{this}}</span>
  // {{/times_from_0}}
  Handlebars.registerHelper('times_from_0', function(n, block) {

    var accum = '';
    for (var i = 0; i <= n; ++i) {
      accum += block.fn(i);
    }
    return accum;
  });

  Handlebars.registerHelper('trauma_descriptions',function(count){
    var accum = '<tbody>';
    const context = this;

    // this is vile. refactor later, or not.
    for(var i = 1; i <= 6; ++i){
      var stringified_iter = '';
      switch(i) {
        case 1:
          stringified_iter = 'one';
          break;
        case 2:
          stringified_iter = 'two';
          break;
        case 3:
          stringified_iter = 'three';
          break;
        case 4:
          stringified_iter = 'four';
          break;
        case 5:
          stringified_iter = 'five';
          break;
      }
      const traumaValue = context.system?.trauma?.traumas?.[stringified_iter] || '';
      if(i % 2 === 1) {
        accum += '<tr>'
      }
      accum += '<td colspan="10">'
      if(i < Number(count)+1) {
        accum += `<input type="text" id="character-${context._id}-mental-trauma-${i}" name="system.trauma.traumas.${stringified_iter}" value="${traumaValue}">`
      }
      accum += '</td>'
      // add the box for physical trauma
      if(i === 2) {
        accum += '<td rowspan="3" class="td-fill-black"></td><td colspan="10">'
        if(Number(context.system?.physical_trauma?.value) > 0) {
          const physical_trauma = context.system?.physical_trauma?.traumas?.one;
          accum += `<input type="text" id="character-${context._id}-physical-trauma" name="system.physical_trauma.traumas.one" value="${physical_trauma}">`
        }
        accum += '</td>'
      }
      if(i % 2 === 0) {
        accum +='</tr>'
      }
    }
    
    accum +='</tbody>'

    return new Handlebars.SafeString(accum);
  })

  // Concat helper
  // https://gist.github.com/adg29/f312d6fab93652944a8a1026142491b1
  // Usage: (concat 'first 'second')
  Handlebars.registerHelper('concat', function() {
    var outStr = '';
    for(var arg in arguments){
        if(typeof arguments[arg]!='object'){
            outStr += arguments[arg];
        }
    }
    return outStr;
  });

  Handlebars.registerHelper('subtract', function(x, y) {
    return x - y;
  });


  /**
   * @inheritDoc
   * Takes label from Selected option instead of just plain value.
   */

  Handlebars.registerHelper('selectOptionsWithLabel', function(choices, options) {

    const localize = options.hash['localize'] ?? false;
    let selected = options.hash['selected'] ?? null;
    let blank = options.hash['blank'] || null;
    selected = selected instanceof Array ? selected.map(String) : [String(selected)];

    // Create an option
    const option = (key, object) => {
      if ( localize ) object.label = game.i18n.localize(object.label);
      let isSelected = selected.includes(key);
      html += `<option value="${key}" ${isSelected ? "selected" : ""}>${object.label}</option>`
    };

    // Create the options
    let html = "";
    if ( blank ) option("", blank);
    Object.entries(choices).forEach(e => option(...e));

    return new Handlebars.SafeString(html);
  });


  /**
   * Create appropriate Blades clock
   */

  Handlebars.registerHelper('blades-clock', function(parameter_name, type, current_value, uniq_id) {

    let html = '';

    if (current_value === null || current_value === 'null') {
      current_value = 0;
    }

    if (parseInt(current_value) > parseInt(type)) {
      current_value = type;
    }

    // Label for 0
    html += `<label class="clock-zero-label" for="clock-0-${uniq_id}}"><i class="fab fa-creative-commons-zero nullifier"></i></label>`;
    html += `<div id="blades-clock-${uniq_id}" class="blades-clock clock-${type} clock-${type}-${current_value}" style="background-image:url('systems/until-the-curtain-falls/styles/assets/progressclocks-svg/Progress Clock ${type}-${current_value}.svg');">`;

    let zero_checked = (parseInt(current_value) === 0) ? 'checked' : '';
    html += `<input type="radio" value="0" id="clock-0-${uniq_id}}" data-dType="String" name="${parameter_name}" ${zero_checked}>`;

    for (let i = 1; i <= parseInt(type); i++) {
      let checked = (parseInt(current_value) === i) ? 'checked' : '';
      html += `
        <input type="radio" value="${i}" id="clock-${i}-${uniq_id}" data-dType="String" name="${parameter_name}" ${checked}>
        <label for="clock-${i}-${uniq_id}"></label>
      `;
    }

    html += `</div>`;
    return html;
  });

  Handlebars.registerHelper('list-class-abilities', function() {
    const context = this;
    let html = '<ul class="item-list-padded-bounded">'
    context.system.abilities.forEach(ability => {
      html += `<li class="item-list-item" data-item-id=${ability._id}>`;
      html += `<b class="label-stripe-gray">${ability.name}</b>`;
      html += `${ability.system.description}`;
      html += '</li>';
    });
    html += '</ul>';
    return new Handlebars.SafeString(html);
  });

  Handlebars.registerHelper('list-ability-classes', function() {
    const context = this;
    let html = '<ul class="item-list-padded-bounded">'
    context.system.classes.forEach(c => {
      html += `<li class="item-list-item" data-item-id=${c._id}>`;
      html += `<b class="label-stripe-gray">${c.name}</b>`;
      html += '</li>';
    });
    html += '</ul>';
    return new Handlebars.SafeString(html);
  });

  Handlebars.registerHelper('ifItemsContainsItemWithType', function(type, options) {
    const items = this.items;
    if (items && items.length > 0) {
      const item = items.find(i => i.type === type);
      if(item) {
        return options.fn(item);
      }
    }

    return options.inverse(this);
  });

  Handlebars.registerHelper('contains', function(list, value) {
    if (list && typeof list.includes === 'function') {
      return list.includes(value);
    }
  });

  Handlebars.registerHelper('gear-property-checkboxes', function(gear_properties) {
    let html = '';
    for(const [propname, prop] of Object.entries(GEAR_PROPERTIES)) {
      html+=`<label><input class="gear-property" name="${propname}" type="checkbox" data-property="${propname}"`
      if(gear_properties.includes(propname)) {
        html+=' checked';
      }
      html+=`>${game.i18n.localize(prop.label)}</label>`;
    }

    return new Handlebars.SafeString(html);
  });

  Handlebars.registerHelper('gear-equipped-box', function(item){
    const checked_style = item.system.equipped ? "fa-solid" : "fa-regular";

    let html = '<label><input class="gear-equipped" type="checkbox" ';
    if(item.system.equipped) {
      html+=' checked';
    }
    html+='><div class="gear-equip">'
    // 0-load items should still render a box
    if(item.system.load === 0) {
      html+=`<i class="fa-square ${checked_style}"></i>`
    } else {
      for(let i = 0; i < item.system.load; i++) {
        html+=`<i class="fa-square ${checked_style}"></i>`
        if(i < item.system.load - 1) {
          html+=`<i class="fa-solid fa-minus"></i>`
        }
      }
    }

    html+='</div></label>'
    
    return new Handlebars.SafeString(html);
  })

  // helper to render an item "card"
  // left widget is type-specific (i.e. load/equip checkbox for gear, stress cost for spells)
  Handlebars.registerHelper('item-card',function(item, options) {
    const opt_hash = options.hash;
    const opt_keys = Object.keys(opt_hash);

    const show_left_widget = opt_keys.includes("show_left_widget") ? opt_hash.show_left_widget : true;
    const show_delete_widget = opt_keys.includes("show_delete_widget") ? opt_hash.show_delete_widget : true;
    const show_post_widget = opt_keys.includes("show_post_widget") ? opt_hash.show_post_widget : true;
    const show_description = opt_keys.includes("show_description") ? opt_hash.show_description : true;

    

    // outer container
    let html = `<div class="item-card flex-vertical" data-item-id="${item._id}" data-item-type="${item.type}">`;

    // header
    html += '<div class="item-header gray-label-small-left">';
    if(show_left_widget) {
      switch(item.type) {
        case 'gear':
          const checked_style = item.system.equipped ? "fa-solid" : "fa-regular";

          html += '<label class="gear-equip-widget"><input class="gear-equipped" type="checkbox" ';
          
          if(item.system.equipped) {
            html+=' checked';
          }

          html+='><div class="gear-equip item-control">'

          // 0-load items should still render a box for tracking purposes
          if(item.system.load === 0) {
            html+=`<i class="fa-square ${checked_style} fa-xs"></i>`
          } else {
            for(let i = 0; i < item.system.load; i++) {
              html+=`<i class="fa-square ${checked_style} fa-xs"></i>`
              if(i < item.system.load - 1) {
                html+=`<i class="fa-solid fa-minus fa-xs"></i>`
              }
            }
          }

          html+='</div></label>'
          break;
        case 'spell': 
          html += '<div class="spell-stress-widget"><a class="item-control spell-stress-cost">';
          
          for(let i=0; i<Number(item.system.stress); i++) {
            html+='<label class="item-control"></label>'; // no content, just need an empty label to render the icon correctly
          }

          html +='</a></div>';
          break;
      }
    }
    html+=`<label class="item-name item-openable">${item.name}</label>`
    if(show_delete_widget) {
      html += `<a class="item-control item-delete" title="${game.i18n.localize("UTCF.TitleDeleteItem")}"><i class="fas fa-trash"></i></a>`;
    }
    if(show_post_widget) {
      html += `<a class="item-control item-post" title="${game.i18n.localize("UTCF.TitlePostItem")}"><i class="fas fa-comment"></i></a>`;
    }
    html += '</div>';

    // description
    if(show_description) {
      html += `<div class="item-description item-openable">${item.system.description}</div>`
    }

    // close outer container
    html += '</div>'
    
    return new Handlebars.SafeString(html);
  });

  Handlebars.registerHelper('gt',function(x, y) {
    if(Number(x) && Number(y)) {
      return Number(x) > Number(y);
    }
    return x > y;
  });

  Handlebars.registerHelper('gte',function(x,y){
    if(Number(x) && Number(y)) {
      return Number(x) >= Number(y);
    }
    return x >= y;
  })

  Handlebars.registerHelper('lt',function(x, y) {
    if(Number(x) && Number(y)) {
      return Number(x) < Number(y);
    }
    return x < y;
  });

});

/**
 * Once the entire VTT framework is initialized, check to see if we should perform a data migration
 */
Hooks.once("ready", function() {

  // Determine whether a system migration is required
  const currentVersion = game.settings.get("bitd", "systemMigrationVersion");
  const NEEDS_MIGRATION_VERSION = 2.15;

  let needMigration = (currentVersion < NEEDS_MIGRATION_VERSION) || (currentVersion === null);

  // Perform the migration
  if ( needMigration && game.user.isGM ) {
    migrations.migrateWorld();
  }
});

/*
 * Hooks
 */

// getSceneControlButtons
Hooks.on("renderSceneControls", async (app, html) => {
  let dice_roller = $('<li class="scene-control" title="Dice Roll"><i class="fas fa-dice"></i></li>');
  dice_roller.click( async function() {
    await simpleRollPopup();
  });
  html.children().first().append( dice_roller );

});
