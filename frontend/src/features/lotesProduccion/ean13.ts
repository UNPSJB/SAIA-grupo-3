const CODIGOS_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const CODIGOS_G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const CODIGOS_R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
const PARIDADES = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

export interface BarraEan13 {
  inicio: number;
  ancho: number;
  guarda: boolean;
}

export const MODULOS_EAN13 = 95;

export function esEan13(codigo: string): boolean {
  return /^[0-9]{13}$/.test(codigo);
}

export function barrasEan13(codigo: string): BarraEan13[] {
  if (!esEan13(codigo)) return [];
  const digitos = codigo.split('').map(Number);
  const paridad = PARIDADES[digitos[0]];
  const segmentos: [string, boolean][] = [['101', true]];
  for (let posicion = 1; posicion <= 6; posicion++) {
    const tabla = paridad[posicion - 1] === 'L' ? CODIGOS_L : CODIGOS_G;
    segmentos.push([tabla[digitos[posicion]], false]);
  }
  segmentos.push(['01010', true]);
  for (let posicion = 7; posicion <= 12; posicion++) {
    segmentos.push([CODIGOS_R[digitos[posicion]], false]);
  }
  segmentos.push(['101', true]);

  const barras: BarraEan13[] = [];
  let modulo = 0;
  for (const [bits, guarda] of segmentos) {
    for (const bit of bits) {
      const ultima = barras[barras.length - 1];
      if (bit === '1') {
        if (ultima && ultima.inicio + ultima.ancho === modulo && ultima.guarda === guarda) {
          ultima.ancho += 1;
        } else {
          barras.push({ inicio: modulo, ancho: 1, guarda });
        }
      }
      modulo += 1;
    }
  }
  return barras;
}
