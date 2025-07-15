import * as PIXI from 'pixi.js';

/**
 * Carga un spritesheet JSON + PNG usando PIXI.Loader y devuelve el objeto spritesheet.
 * @param {string} name nombre del recurso (p.ej. "idle", "izquierda", "derecha").
 * @returns {Promise<PIXI.Spritesheet>}
 */
export function loadSpritesheet(name) {
  return new Promise((resolve, reject) => {
    const loader = new PIXI.Loader();
    loader.add(name, `/assets/${name}.json`);
    loader.load((_, resources) => {
      const sheet = resources[name]?.spritesheet;
      if (sheet) {
        resolve(sheet);
      } else {
        reject(new Error(`No se encontró spritesheet para "${name}"`));
      }
    });
  });
}