import { ACTION_POSITIONS } from "./base-system-data.js";

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
    case 2:
      return "UTCF.Action.Effect.Limited";
    case 4:
    case 5:
      return "UTCF.Action.Effect.Great";
    case 6:
      return "UTCF.Action.Effect.Extrene";
    case 3:
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

export async function resistanceRoll(attribute_label,num_dice) {
  let zero_mode = (num_dice <= 0);
  let roll = await utcfRoll(num_dice);
  let roll_result = zero_mode ? getLowRollResult(roll) : getHighRollResult(roll);

  let resistance_result = getResistanceResult(roll_result);
  let resistance_result_description = getResistanceResultDescription(roll_result);
  let stress_change = 6-roll_result;

  let messageData = {
    speaker: ChatMessage.getSpeaker(),
    content: await renderTemplate(
      "systems/until-the-curtain-falls/templates/chat/resistance-roll-2.html",
      {
        attribute_label: attribute_label,
        resistance_result: resistance_result,
        resistance_result_description: resistance_result_description,
        stress: stress_change,
        rolls: (roll.terms)[0].results.map(a => a.result).sort(),
        zero_mode: zero_mode
      }),
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    roll: roll
  };

  CONFIG.ChatMessage.documentClass.create(messageData, {});

  return stress_change;
}

function getResistanceResult(roll_result) {
  if(roll_result === 7) {
    return "crit"
  } else {
    return "success"
  }
} 

function getResistanceResultDescription(roll_result) {
  if(roll_result === 7) {
    return "UTCF.Resistance.Result.Crit"
  } else {
    return "UTCF.Resistance.Result.Normal"
  }
}

export async function engagementRoll(num_dice) {
  let zero_mode = (num_dice <= 0);
  let roll = await utcfRoll(num_dice);
  let roll_result = zero_mode ? getLowRollResult(roll) : getHighRollResult(roll);

  let [engagement_result, engagement_result_description] = getEngagementResult(roll_result);

  let messageData = {
    speaker: ChatMessage.getSpeaker(),
    content: await renderTemplate(
      "systems/until-the-curtain-falls/templates/chat/engagement-roll-2.html",
      {
        engagement_result: engagement_result,
        engagement_result_description: engagement_result_description,
        rolls: (roll.terms)[0].results.map(a => a.result).sort(),
        zero_mode: zero_mode
      }),
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    roll: roll
  };

  CONFIG.ChatMessage.documentClass.create(messageData, {});
}

function getEngagementResult(roll_result) {
  let result = getActionResult(roll_result);
  let result_description = (function(result){
    switch(result) {
    case "crit":
      return "UTCF.Engagement.Result.Crit";
    case "success":
      return "UTCF.Engagement.Result.Success";
    case "partial_success":
      return "UTCF.Engagement.Result.PartialSuccess";
    case "fail":
    default:
      return "UTCF.Engagement.Result.Fail";
  }})(result);
  return [result, result_description];
}

export async function fortuneRoll(num_dice) {
  let zero_mode = (num_dice <= 0);
  let roll = await utcfRoll(num_dice);
  let roll_result = zero_mode ? getLowRollResult(roll) : getHighRollResult(roll);

  let [result, result_description] = getFortuneResult(roll_result);

  let messageData = {
    speaker: ChatMessage.getSpeaker(),
    content: await renderTemplate(
      "systems/until-the-curtain-falls/templates/chat/fortune-roll-2.html",
      {
        result: result,
        result_description: result_description,
        rolls: (roll.terms)[0].results.map(a => a.result).sort(),
        zero_mode: zero_mode
      }),
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    roll: roll
  };

  CONFIG.ChatMessage.documentClass.create(messageData, {});
}

function getFortuneResult(roll_result) {
  let result = getActionResult(roll_result);
  let result_description = (function(result){
    switch(result) {
    case "crit":
      return "UTCF.Fortune.Crit";
    case "success":
      return "UTCF.Fortune.Success";
    case "partial_success":
      return "UTCF.Fortune.PartialSuccess";
    case "fail":
    default:
      return "UTCF.Fortune.Fail";
  }})(result);
  return [result, result_description];
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
