/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */

import { delete_item, open_item,open_actor, delete_actor } from "./utcf-item-card-helpers.js";

export class BladesSheet extends ActorSheet {

  /* -------------------------------------------- */

  /** @override */
	activateListeners(html) {
    super.activateListeners(html);
    html.find(".item-add-popup").click(this._onItemAddClick.bind(this));
    html.find(".update-box").click(this._onUpdateBoxClick.bind(this));

    // Open item from item card
    html.find('.item-openable').click(ev => {
      open_item(ev,this);
    });

    // delete item from item card
    html.find('.item-delete').click( async ev => {
      delete_item(ev,this);
    });

    // Open actor from actor card
    html.find('.actor-openable').click(ev => {
      open_actor(ev);
    })

    // delete actor from actor card
    html.find('.actor-delete').click( async ev => {
      delete_actor(ev, this);
    });

    // Post item to chat from item card
    html.find(".item-post").click(ev => {
      const element = $(ev.currentTarget).parents(".item-card");
      const item = this.object.items.get(element.data("itemId"));
      item.sendToChat();
    });

    html.find(".item-create-popup").click(this._onItemCreateClick.bind(this));

    // This is a workaround until is being fixed in FoundryVTT.
    if ( this.options.submitOnChange ) {
      html.on("change", "textarea", this._onChangeInput.bind(this));  // Use delegated listener on the form
    }

    html.find(".roll-die-attribute").click(ev => {
      ev.preventDefault();
      const attribute_name = $(ev.currentTarget).data("rollAttribute");
      this.actor.rollResistanceDialog(attribute_name);
    });

    html.find(".roll-die-action").click(ev => {
      ev.preventDefault();
      const action_name = $(ev.currentTarget).data("rollAction");
      this.actor.rollActionDialog(action_name);
    })
  }

  /* -------------------------------------------- */
  async _onItemAddClick(event) {
    event.preventDefault();
    const item_type = $(event.currentTarget).data("itemType");
    let items = await BladesHelpers.getAllItemsByType(item_type, game);
    this._onItemAddClickRender(event,items, item_type);
  }

  async _onItemAddClickRender(event, items, item_type) {
    event.preventDefault();
    const distinct = $(event.currentTarget).data("distinct")
    let input_type = "checkbox";

    if (typeof distinct !== "undefined") {
      input_type = "radio";
    }

    let html = `<div class="items-to-add flex-vertical">`;

    items.forEach(e => {
      if(!e.system.add_list_ignore) {
        html += `<input id="select-item-${e._id}" type="${input_type}" name="select_items" value="${e._id}">`;
        html += `<label class="flex-horizontal-spaced" for="select-item-${e._id}">`;
        html += `${game.i18n.localize(e.name)} <i class="fas fa-question-circle" data-tooltip-direction="RIGHT" data-tooltip="${foundry.utils.escapeHTML(e.system.description)}"></i>`;
        html += `</label>`;
      }
    });

    html += `</div>`;

    let dialog = new foundry.applications.api.DialogV2({
      window: {
        contentClasses: ["until-the-curtain-falls", "dialog-window"],
        title: `${game.i18n.localize('Add')} ${item_type}`
      },
      content: html,
      buttons: [
        {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize('Add'),
          action: 'add',
          callback: async (event, button, dialog) => {
            var items = button.form.elements.select_items;
            await this.addItemsToSheet(item_type, items);
          }
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


  async _onItemCreateClick(event) {
    event.preventDefault();
    const item_type = $(event.currentTarget).data("itemType");

    let item = await Item.create({name: `New ${item_type}`, type: item_type}, {parent: this.document});

    item.render();
  }
  /* -------------------------------------------- */

  async addItemsToSheet(item_type, select_items) {
    let items = await BladesHelpers.getAllItemsByType(item_type, game);
    let items_to_add = [];

    select_items.forEach(item =>{
      if(item.checked)
        items_to_add.push(items.find(e => e._id === item.value));
    });

    if (items_to_add) {
      switch(item_type) {
        case "class":
          let c = items_to_add[0];
          this.object.update({"system.playbook": c.system.shortname});
          break;
        case "homeland":
          let h = items_to_add[0];
          this.object.update({"system.homeland": h.name});
          break;
        case "background": 
          let bg = items_to_add[0];
          this.object.update({"system.background": bg.name});
          break;
      }
    }

    await Item.create(items_to_add, {parent: this.document});
  }
  /* -------------------------------------------- */

  /**
   * Roll an Attribute die.
   * @param {*} event
   */
  async _onRollAttributeDieClick(event) {

    const attribute_name = $(event.currentTarget).data("rollAttribute");
    this.actor.rollAttributePopup(attribute_name);

  }

  /* -------------------------------------------- */

  async _onUpdateBoxClick(event) {
    event.preventDefault();
    const item_id = $(event.currentTarget).data("item");
    var update_value = $(event.currentTarget).data("value");
      const update_type = $(event.currentTarget).data("utype");
      if ( update_value === undefined) {
      update_value = document.getElementById('fac-' + update_type + '-' + item_id).value;
    };
    var update;
    if ( update_type === "status" ) {
      update = {_id: item_id, system:{status:{value: update_value}}};
    }
    else if (update_type == "hold") {
      update = {_id: item_id, system:{hold:{value: update_value}}};
    } else {
      console.log("update attempted for type undefined in blades-sheet.js onUpdateBoxClick function");
      return;
    };

    await this.actor.updateEmbeddedDocuments("Item", [update]);


    }

  /* -------------------------------------------- */

  handle_item_delete(element) {
    // no-op
  }

  handle_actor_delete(element) {
    // no-op
  }

}