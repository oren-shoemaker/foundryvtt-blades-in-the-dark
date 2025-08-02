export function open_item(event,sheet) {
    const element = $(event.currentTarget).parents(".item-card");
    const item = sheet.object.items.get(element.data("itemId"));
    item.sheet.render(true);
};

export async function delete_item(event,sheet) {
    const element = $(event.currentTarget).parents(".item-card");

    sheet.handle_item_delete(element);

    await sheet.object.deleteEmbeddedDocuments("Item", [element.data("itemId")]);
    element.slideUp(200, () => sheet.render(false));
}

export async function open_item_from_item(event) {
    const id = $(event.currentTarget).parents(".item-card").data("itemId");
    const items = await Promise.all(game.packs
    .filter(p => p.documentName === "Item")
    .map(async p => p.getDocuments()))
    .then(arr => arr
        .flat()
        .filter(doc => doc._id === id));
    
    if(items.length === 1) {
    items[0].sheet.render(true);
    } else {
    throw new Error(`item ID ${id} is non-unique!`)
    }
}

export function open_actor(event) {
    const id = $(event.currentTarget).parents(".actor-card").data("actorId");
    const actor = game.actors.get(id);
    if(actor) {
        actor.sheet.render(true);
    }
}

export async function delete_actor(event,sheet) {
    const element = $(event.currentTarget).parents(".actor-card");

    sheet.handle_actor_delete(element);
    element.slideUp(200, () => sheet.render(false));
}