/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function() {

  // Define template paths to load
  const templatePaths = [

    // Actor Sheet Partials
    "systems/until-the-curtain-falls/templates/parts/coins.html",
    "systems/until-the-curtain-falls/templates/parts/attributes.html",
    "systems/until-the-curtain-falls/templates/parts/turf-list.html",
    "systems/until-the-curtain-falls/templates/parts/cohort-block.html",
    "systems/until-the-curtain-falls/templates/parts/factions.html",
    "systems/until-the-curtain-falls/templates/parts/active-effects.html",
  ];

  // Load the template parts
  return loadTemplates(templatePaths);
};
