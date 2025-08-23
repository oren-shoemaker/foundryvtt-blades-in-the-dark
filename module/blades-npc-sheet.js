
import { BladesSheet } from "./blades-sheet.js";

/**
 * @extends {BladesSheet}
 */
export class BladesNPCSheet extends BladesSheet {

  /** @override */
	static get defaultOptions() {
	  return foundry.utils.mergeObject(super.defaultOptions, {
  	  classes: ["until-the-curtain-falls", "sheet", "actor"],
  	  template: "systems/until-the-curtain-falls/templates/npc-sheet.html",
      width: 400,
      height: 'auto',
      tabs: [{navSelector: ".tabs", contentSelector: ".tab-content"}]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  async getData(options) {
    const superData = super.getData( options );
    const sheetData = superData.data;

    sheetData.isGM = game.user.isGM;
    sheetData.owner = superData.owner;
    sheetData.editable = superData.editable;

    sheetData.system.description = await foundry.applications.ux.TextEditor.implementation.enrichHTML(sheetData.system.description, {secrets: sheetData.owner, async: true});
    sheetData.system.notes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(sheetData.system.notes, {secrets: sheetData.owner, async: true});

    return sheetData;
  }
}