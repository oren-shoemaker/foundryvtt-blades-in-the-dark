// base non-db data for the system

export const GEAR_PROPERTIES = {
    "alchemical": {
        "label": "UTCF.Gear.Properties.Alchemical.Label",
        "tooltip": "UTCF.Gear.Properties.Alchemical.Tooltip"
    },
    "consumable": {
        "label": "UTCF.Gear.Properties.Consumable.Label",
        "tooltip": "UTCF.Gear.Properties.Consumable.Tooltip"
    },
    "corrupted": {
        "label": "UTCF.Gear.Properties.Corrupted.Label",
        "tooltip": "UTCF.Gear.Properties.Corrupted.Tooltip"
    },
    "magical": {
        "label": "UTCF.Gear.Properties.Magical.Label",
        "tooltip": "UTCF.Gear.Properties.Magical.Tooltip"
    },
    "mechanical": {
        "label": "UTCF.Gear.Properties.Mechanical.Label",
        "tooltip": "UTCF.Gear.Properties.Mechanical.Tooltip"
    },
    "special_armor": {
        "label": "UTCF.Gear.Properties.SpecialArmor.Label",
        "tooltip": "UTCF.Gear.Properties.SpecialArmor.Tooltip"
    }
};

export const LOAD_LEVELS = {
    "UTCF.Load.Light":"UTCF.Load.Light", 
    "UTCF.Load.Normal":"UTCF.Load.Normal", 
    "UTCF.Load.Heavy":"UTCF.Load.Heavy"
};

export const ACTION_POSITIONS = {
    "desperate": {
        "label": "UTCF.Action.Position.Desperate.Label",
        "ordinal": 0,
        "result": {
            "fail": "UTCF.Action.Position.Desperate.Result.Fail",
            "partial_success": "UTCF.Action.Position.Desperate.Result.PartialSuccess",
            "success": "UTCF.Action.Position.Result.Success.Description",
            "crit": "UTCF.Action.Position.Result.Crit.Description"
        }
    },
    "risky": {
        "label": "UTCF.Action.Position.Risky.Label",
        "ordinal": 1,
        "result": {
            "fail": "UTCF.Action.Position.Risky.Result.Fail",
            "partial_success": "UTCF.Action.Position.Risky.Result.PartialSuccess",
            "success": "UTCF.Action.Position.Result.Success.Description",
            "crit": "UTCF.Action.Position.Result.Crit.Description"
        }
    },
    "controlled": {
        "label": "UTCF.Action.Position.Controlled.Label",
        "ordinal": 2,
        "result": {
            "fail": "UTCF.Action.Position.Controlled.Result.Fail",
            "partial_success": "UTCF.Action.Position.Controlled.Result.PartialSuccess",
            "success": "UTCF.Action.Position.Result.Success.Description",
            "crit": "UTCF.Action.Position.Result.Crit.Description"
        }
    }
};

export const ACTION_EFFECTS = [
    {
        "effect": "zero",
        "label": "UTCF.Action.Effect.Zero",
        "ordinal": 0
    },
    {
        "effect": "limited",
        "label": "UTCF.Action.Effect.Limited",
        "ordinal": 2
    },
    {
        "effect": "standard",
        "label": "UTCF.Action.Effect.Standard",
        "ordinal": 3
    },
    {
        "effect": "great",
        "label": "UTCF.Action.Effect.Great",
        "ordinal": 4
    },
    {
        "effect": "extreme",
        "label": "UTCF.Action.Effect.Extreme",
        "ordinal": 6
    }
];

export const ENGAGMENT_MODIFIERS = [
    {
        "label": "UTCF.Engagement.Modifier.BoldDaring",
        "checkbox_name": "bold_daring",
        "value": 1
    },
    {
        "label": "UTCF.Engagement.Modifier.Complex",
        "checkbox_name": "complex",
        "value": -1
    },
    {
        "label": "UTCF.Engagement.Modifier.Weakness",
        "checkbox_name": "weakness",
        "value": 1
    },
    {
        "label": "UTCF.Engagement.Modifier.Strength",
        "checkbox_name": "strength",
        "value": -1
    },
    {
        "label": "UTCF.Engagement.Modifier.Aid",
        "checkbox_name": "aid",
        "value": 1
    },
    {
        "label": "UTCF.Engagement.Modifier.Interference",
        "checkbox_name": "interference",
        "value": -1
    }
]