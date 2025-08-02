
import { BladesSheet } from "./blades-sheet.js";

/**
 * @extends {BladesSheet}
 */
export class UTCFCompanySheet extends BladesSheet {

  /** @override */
	static get defaultOptions() {
	  return foundry.utils.mergeObject(super.defaultOptions, {
  	  classes: ["until-the-curtain-falls", "sheet", "actor", "company"],
  	  template: "systems/until-the-curtain-falls/templates/company-sheet.html",
      width: 940,
      height: 1020,
      tabs: [{navSelector: ".tabs", contentSelector: ".tab-content", initial: "abilities"}]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options) {
    const superData = super.getData( options );
    const sheetData = superData.data;
    sheetData.owner = superData.owner;
    sheetData.editable = superData.editable;
    sheetData.isGM = game.user.isGM;

    const corruption = Number(sheetData.system.corruption);
    if (corruption >= 0 && corruption < 6) {
      sheetData.system.corruption_severity = '0';
    } else if (corruption >= 6 && corruption < 12) {
      sheetData.system.corruption_severity = 'I';
    } else if (corruption >= 12 && corruption < 18) {
      sheetData.system.corruption_severity = 'II';
    } else if (corruption >= 18 && corruption < 24) {
      sheetData.system.corruption_severity = 'III';
    } else if (corruption >= 24) {
      sheetData.system.corruption_severity = 'IV';
    }

    return sheetData;
  }

  /* -------------------------------------------- */

  /** @override */
	activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add a new Cohort
    html.find('.add-item').click(ev => {
      BladesHelpers._addOwnedItem(ev, this.actor);
    });

    // Cohort Block Harm handler
    html.find('.cohort-block-harm input[type="radio"]').change( async ev => {
      const element = $(ev.currentTarget).parents(".item");

      let item_id = element.data("itemId")
      let harm_id = $(ev.currentTarget).val();

      await this.actor.updateEmbeddedDocuments('Item', [{
        _id: item_id,
        "system.harm": [harm_id]}]);
      this.render(false);
    });
  }
}
