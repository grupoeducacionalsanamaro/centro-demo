// Punto de entrada único para que las páginas lean el contenido del centro.
import data from '../data/centro.json';
import { crearCentro } from './centro.js';

export const C = crearCentro(data);
export { formatoPeso, MESES, DIAS } from './centro.js';
