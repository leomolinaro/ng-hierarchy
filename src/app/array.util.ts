export type Key = string | number;

export function isEmpty<T> (array: T[]): boolean {
  return !isNotEmpty (array);
} // isEmpty

export function isNotEmpty<T> (array: T[]): boolean {
  return (array && array.length) ? true : false;
} // isNotEmpty

export function sortComparatorByKey (key: string): (val1: object, val2: object) => number {
  return (val1: { [key: string]: any }, val2: { [key: string]: any }) => {
    return val1[key] < val2[key] ? -1 : val1[key] === val2[key] ? 0 : 1;
  };
} // sortComparatorByKey
/**
 * Trasla un array in modo che il primo elemento diventi quello in posizione firstIndex.
 * @param firstIndex L'indice dell'elemento che diventerà il primo nel nuovo array.
 * @param array L'array da traslare.
 * @return Un nuovo array traslato rispetto al precedente.
 * @template T Il tipo di elemento contenuto nell'array.
 */
export function translate<T> (firstIndex: number, array: T[]): T[] {
  const toReturn: T[] = [];
  for (let i = firstIndex; i < array.length; i++) { toReturn.push (array[i]); }
  for (let i = 0; i < firstIndex; i++) { toReturn.push (array[i]); }
  return toReturn;
} // translate


export function toMap<K extends Key, T, V = T> (array: T[], keyGetter: (e: T) => Key, valueGetter?: (e: T, index: number) => V) {
  const map: { [key: string]: V } = { };
  array?.forEach ((e, index) => map[keyGetter (e)] = (valueGetter ? valueGetter (e, index) : e) as V);
  return map;
} // toMap

export function safeArray<T> (array: T[]): T[] {
  return array || [];
} // safeArray

export function mapToDistinct<T, V extends string | number> (array: T[], valueGetter: (e: T) => V): V[] {
  const toReturn: V[] = [];
  const set: { [key: string]: boolean } = { };
  array.forEach (e => {
    const value = valueGetter (e);
    if (!set[value]) {
      set[value] = true;
      toReturn.push (value);
    } // if
  });
  return toReturn;
} // mapToDistinct

export function flattify<T> (arrays: T[][]): T[] {
  return ([] as T[]).concat.apply ([] as T[], arrays);
} // flattify
