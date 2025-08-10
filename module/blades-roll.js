import { ACTION_POSITIONS } from "./base-system-data.js";

/**
 * Roll Dice.
 * @param {int} dice_amount
 * @param {string} attribute_name
 * @param {string} position
 * @param {string} effect
 */
export async function bladesRoll(dice_amount, attribute_name = "", position = "risky", effect = "standard", note = "", current_stress, current_crew_tier) {

  // ChatMessage.getSpeaker(controlledToken)
  let zeromode = false;

  if ( dice_amount < 0 ) { dice_amount = 0; }
  if ( dice_amount === 0 ) { zeromode = true; dice_amount = 2; }

  let r = new Roll( `${dice_amount}d6`, {} );

  // show 3d Dice so Nice if enabled
  r.evaluate();
  await showChatRollMessage(r, zeromode, attribute_name, position, effect, note, current_stress, current_crew_tier);
}

export async function actionRoll(action_label,num_dice, position, effect) {
  let zero_mode = (num_dice <= 0);
  let roll = await utcfRoll(num_dice);
  let roll_result = zero_mode ? getLowRollResult(roll) : getHighRollResult(roll);

  let position_label = getLabelForPosition(position);
  let action_result = getActionResult(roll_result);
  let action_result_description = ACTION_POSITIONS[position].result[action_result];
  let effect_label = getLabelForEffect(computeFinalEffect(effect, roll_result));

  let messageData = {
    speaker: ChatMessage.getSpeaker(),
    content: await renderTemplate(
      "systems/until-the-curtain-falls/templates/chat/action-roll-2.html",
      {
        action_label: action_label, 
        position_label: position_label, 
        effect_label: effect_label, 
        action_result: action_result,
        action_result_description: action_result_description, 
        rolls: (roll.terms)[0].results.map(a => a.result).sort(),
        zero_mode: zero_mode
      }),
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    roll: roll
  };

  CONFIG.ChatMessage.documentClass.create(messageData, {});
}

function getLabelForEffect(effect) {
  switch (effect) {
    case 0:
      return "UTCF.Action.Effect.Zero";
    case 1:
      return "UTCF.Action.Effect.Limited";
    case 3:
      return "UTCF.Action.Effect.Great";
    case 4:
      return "UTCF.Action.Effect.Extreme";
    case 2:
    default:
      return "UTCF.Action.Effect.Standard";
  }
}

function getLabelForPosition(position) {
  switch (position) {
    case 'controlled':
      return "UTCF.Action.Position.Controlled.Label";
    case 'desperate':
      return "UTCF.Action.Position.Desperate.Label";
    case 'risky':
    default:
      return "UTCF.Action.Position.Risky.Label";
  }
}

function getActionResult(roll_result) {
  let result_type = '';
  switch(roll_result) {
    case 4:
    case 5:
      result_type = 'partial_success';
      break;
    case 6:
      result_type = 'success';
      break;
    case 7:
      result_type = 'crit';
      break;
    case 1:
    case 2:
    case 3:
    default:
      result_type = 'fail';
      break;
  }

  return result_type;
}

async function utcfRoll(num_dice) {

  if ( num_dice < 0 ) { num_dice = 0; }
  if ( num_dice === 0 ) { num_dice = 2; }

  let r = new Roll( `${num_dice}d6`, {} );

  return await r.evaluate();
}

function getLowRollResult(roll) {
  let results = (roll.terms)[0].results.map(a => a.result).sort();

  return results[0];
}

function getHighRollResult(roll) {
  let results = (roll.terms)[0].results.map(a => a.result).sort();

  // not sure how this would happen, but just in case...
  if(results.length === 0) {
    return 1;
  }
  
  // use 7 as the return value for a crit
  if(results.filter(i => i === 6).length > 1) {
    return 7; 
  }

  // otherwise return highest value
  return results.reverse()[0];
}

function computeFinalEffect(effect, roll_result) {
  let final_effect = effect;

  if(roll_result === 7)
    final_effect++;

  final_effect = Math.max(0, Math.min(4, final_effect));

  return final_effect;
}

/**
 * Shows Chat message.
 *
 * @param {Roll} r
 * @param {Boolean} zeromode
 * @param {String} attribute_name
 * @param {string} position
 * @param {string} effect
 */
async function showChatRollMessage(r, zeromode, attribute_name = "", position = "", effect = "", note = "", current_stress, current_crew_tier) {

  let speaker = ChatMessage.getSpeaker();
  let rolls = (r.terms)[0].results;
  let attribute_label = BladesHelpers.getRollLabel(attribute_name);

  // Retrieve Roll status.
  let roll_status = getBladesRollStatus(rolls, zeromode);

  let result;
  if (BladesHelpers.isAttributeAction(attribute_name)) {
    let position_localize = '';
    switch (position) {
      case 'controlled':
        position_localize = 'UTCF.PositionControlled'
        break;
      case 'desperate':
        position_localize = 'UTCF.PositionDesperate'
        break;
      case 'risky':
      default:
        position_localize = 'UTCF.PositionRisky'
    }

    let effect_localize = '';
    switch (effect) {
      case 'limited':
        effect_localize = 'UTCF.EffectLimited'
        break;
      case 'great':
        effect_localize = 'UTCF.EffectGreat'
        break;
      case 'standard':
      default:
        effect_localize = 'UTCF.EffectStandard'
    }

    result = await renderTemplate("systems/until-the-curtain-falls/templates/chat/action-roll.html", {rolls: rolls, roll_status: roll_status, attribute_label: attribute_label, position: position, position_localize: position_localize, effect: effect, effect_localize: effect_localize, note: note});
  }
  // Check for Resistance roll
  else if (BladesHelpers.isAttributeAttribute(attribute_name)) {
    let stress = getBladesRollStress(rolls, zeromode);

    result = await renderTemplate("systems/until-the-curtain-falls/templates/chat/resistance-roll.html", {rolls: rolls, roll_status: roll_status, attribute_label: attribute_label, stress: stress, note: note});
  }
  // Check for Indugle Vice roll
  else if (attribute_name == 'UTCF.Vice') {
    let clear_stress = getBladesRollVice(rolls, zeromode);

    if (current_stress - clear_stress >= 0) {
      roll_status = "success";
    } else {
      roll_status = "failure";
      clear_stress = current_stress;
    }

    result = await renderTemplate("systems/until-the-curtain-falls/templates/chat/vice-roll.html", {rolls: rolls, roll_status: roll_status, attribute_label: attribute_label, clear_stress: clear_stress, note: note});
  }
  // Check for Gather Information roll
  else if (attribute_name == 'UTCF.GatherInformation') {
    result = await renderTemplate("systems/until-the-curtain-falls/templates/chat/gather-info-roll.html", {rolls: rolls, roll_status: roll_status, attribute_label: attribute_label, note: note});
  }
  // Check for Engagement roll
  else if (attribute_name == 'UTCF.Engagement') {
    result = await renderTemplate("systems/until-the-curtain-falls/templates/chat/engagement-roll.html", {rolls: rolls, roll_status: roll_status, attribute_label: attribute_label, note: note});
  }
  // Check for Asset roll
  else if (attribute_name == 'UTCF.AcquireAsset') {
    let tier_quality = Number(current_crew_tier);
    let status = String(roll_status);
    switch (status) {
      case "critical-success":
        tier_quality = tier_quality + 2;
        break;
      case "success":
        tier_quality = tier_quality + 1;
        break;
      case "failure":
        if (tier_quality > 0){
          tier_quality = tier_quality - 1;
        }
        break;
      default:
        break;
    }

    result = await renderTemplate("systems/until-the-curtain-falls/templates/chat/asset-roll.html", {rolls: rolls, roll_status: roll_status, attribute_label: attribute_label, tier_quality: tier_quality, note: note});
  }
  // Fortune roll if not specified
  else {
    result = await renderTemplate("systems/until-the-curtain-falls/templates/chat/fortune-roll.html", {rolls: rolls, roll_status: roll_status, attribute_label: "UTCF.Fortune", note: note});
  }

  let messageData = {
    speaker: speaker,
    content: result,
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    roll: r
  }

  CONFIG.ChatMessage.documentClass.create(messageData, {})
}

/**
 * Get status of the Roll.
 *  - failure
 *  - partial-success
 *  - success
 *  - critical-success
 * @param {Array} rolls
 * @param {Boolean} zeromode
 */
export function getBladesRollStatus(rolls, zeromode = false) {

  // Sort roll values from lowest to highest.
  let sorted_rolls = rolls.map(i => i.result).sort();

  let roll_status = "failure"

  if (sorted_rolls[0] === 6 && zeromode) {
    roll_status = "success";
  }
  else {
    let use_die;
    let prev_use_die = false;

    if (zeromode) {
      use_die = sorted_rolls[0];
    }
    else {
      use_die = sorted_rolls[sorted_rolls.length - 1];

      if (sorted_rolls.length - 2 >= 0) {
        prev_use_die = sorted_rolls[sorted_rolls.length - 2]
      }
    }

    // 1,2,3 = failure
    if (use_die <= 3) {
      roll_status = "failure";
    }
    // if 6 - check the prev highest one.
    else if (use_die === 6) {
      // 6,6 - critical success
      if (prev_use_die && prev_use_die === 6) {
        roll_status = "critical-success";
      }
      // 6 - success
      else {
        roll_status = "success";
      }
    }
    // else (4,5) = partial success
    else {
      roll_status = "partial-success";
    }

  }

  return roll_status;

}
/**
 * Get stress of the Roll.
 * @param {Array} rolls
 * @param {Boolean} zeromode
 */
export function getBladesRollStress(rolls, zeromode = false) {

  var stress = 6;

  // Sort roll values from lowest to highest.
  let sorted_rolls = rolls.map(i => i.result).sort();

  let roll_status = "failure"

  if (sorted_rolls[0] === 6 && zeromode) {
    stress = -1;
  }
  else {
    let use_die;
    let prev_use_die = false;

    if (zeromode) {
      use_die = sorted_rolls[0];
    }
    else {
      use_die = sorted_rolls[sorted_rolls.length - 1];

      if (sorted_rolls.length - 2 >= 0) {
        prev_use_die = sorted_rolls[sorted_rolls.length - 2]
      }
    }

    if (use_die === 6 && prev_use_die && prev_use_die === 6) {
      stress = -1;
    } else {
      stress = 6 - use_die;
    }

  }

  return stress;

}

/**
 * Get stress cleared with a Vice Roll.
 * @param {Array} rolls
 * @param {Boolean} zeromode
 */
export function getBladesRollVice(rolls, zeromode = false) {
  // Sort roll values from lowest to highest.
  let sorted_rolls = rolls.map(i => i.result).sort();
  let use_die;

  if (zeromode) {
    use_die = sorted_rolls[0];
  }
  else {
    use_die = sorted_rolls[sorted_rolls.length - 1];
  }

  return use_die;

}


/**
 * Call a Roll popup.
 */
export async function simpleRollPopup() {
  let dialog = new foundry.applications.api.DialogV2({
      window: {
        contentClasses: ["until-the-curtain-falls", "dialog-window"],
        title: `Simple Roll`
      },
      content: `
        <h2>${game.i18n.localize("UTCF.RollSomeDice")}</h2>
        <p>${game.i18n.localize("UTCF.RollTokenDescription")}</p>
        <form>
          <div class="form-group">
            <label>${game.i18n.localize("UTCF.RollNumberOfDice")}:</label>
            <select id="qty" name="qty">
              ${Array(11).fill().map((item, i) => `<option value="${i}">${i}d</option>`).join('')}
            </select>
          </div>
          <fieldset class="form-group" style="display:block;justify-content:space-between;">
            <legend>Roll Types</legend>
            <div class="radio-group" >
              <label>
                <input type="radio" id="fortune" name="rollSelection" checked=true> ${game.i18n.localize("UTCF.Fortune")}
              </label>
            </div>
            <div class="radio-group">
              <label>
                <input type="radio" id="gatherInfo" name="rollSelection"> ${game.i18n.localize("UTCF.GatherInformation")}
              </label>
            </div>
            <div class="radio-group">
              <label>
                <input type="radio" id="engagement" name="rollSelection"> ${game.i18n.localize("UTCF.Engagement")}
              </label>
            </div>
            <div class="radio-group" style="display:flex;flex-direction:row;justify-content:space-between;">
              <label><input type="radio" id="indulgeVice" name="rollSelection"> ${game.i18n.localize("UTCF.IndulgeVice")}</label>
              <span style="width:200px">
                <label>${game.i18n.localize('UTCF.Stress')}:</label>
                <select style="width:100px;float:right" id="stress" name="stress">
                  ${Array(11).fill().map((item, i) => `<option value="${i}">${i}</option>`).join('')}
                </select>
              </span>
            </div>
            <div class="radio-group" style="display:flex;flex-direction:row;justify-content:space-between;">
              <label><input type="radio" id="acqurieAsset" name="rollSelection"> ${game.i18n.localize("UTCF.AcquireAsset")}</label>
              <span style="width:200px">
                <label>${game.i18n.localize('UTCF.CrewTier')}:</label>
                <select style="width:100px;float:right" id="tier" name="tier">
                  ${Array(5).fill().map((item, i) => `<option value="${i}">${i}</option>`).join('')}
                </select>
              </span>
            </div>
          </fieldset>
          <div className="form-group">
            <label>${game.i18n.localize('UTCF.Notes')}:</label>
            <input id="note" name="note" type="text" value="">
          </div><br/>
        </form>
      `,
      buttons: [
        {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize('UTCF.Roll.Label'),
          action: 'roll',
          callback: async (html) => {
            let diceQty = Number(html.find('[name="qty"]')[0].value);
            let stress = html.find('[name="stress"]')[0].value;
            let tier = html.find('[name="tier"]')[0].value;
            let note = html.find('[name="note"]')[0].value;

            let input = html.find("input");
            for (let i = 0; i < input.length; i++){
              if (input[i].checked) {
                switch (input[i].id) {
                  case 'gatherInfo':
                    await bladesRoll(diceQty,"UTCF.GatherInformation","","",note,"");
                    break;
                  case 'engagement':
                    await bladesRoll(diceQty,"UTCF.Engagement","","",note,"");
                    break;
                  case 'indulgeVice':
                    await bladesRoll(diceQty,"UTCF.Vice","","",note,stress);
                    break;
                  case 'acqurieAsset':
                    await bladesRoll(diceQty,"UTCF.AcquireAsset","","",note,"",tier);
                    break;

                  default:
                    await bladesRoll(diceQty,"","","",note,"");
                    break;
                }
                break;
              }
            }
          },
        },
        {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize('Cancel'),
          action: 'cancel',
          callback: () => false
        }
      ]
    }, {});

    dialog.render(true);
}
