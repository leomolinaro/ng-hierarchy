export function entitiesToNodes<E, N> (
  entities: E[],
  oldMap: Record<string | number, N>,
  getEntityId: (entity: E) => string | number,
  getNodeEntity: (node: N) => E,
  entityToNode: (entity: E) => N
): ({ ids: (string | number)[]; map: Record<string | number, N> }) {

  const map: Record<string | number, N> = { };
  const ids: (string | number)[] = [];

  entities.forEach (entity => {
    const id = getEntityId (entity);
    ids.push (id);
    const oldNode = oldMap[id];
    if (oldNode) {
      delete oldMap[id];
      const oldEntity = getNodeEntity (oldNode);
      if (oldEntity === entity) {
        map[id] = oldNode;
      } else {
        const newNode = entityToNode (entity);
        map[id] = newNode;
      } // if - else
    } else {
      const newNode = entityToNode (entity);
      map[id] = newNode;
    } // if - else
  });

  return { map, ids };
} // entitiesToNodes

function rawBooleanSymbol (propName: string) { return Symbol (`__${propName}Raw`); }

export function BooleanInput () {
  return <K extends string> (componentProt: Record<K, boolean>, inputKey: K) => {
    const rawBooleanKey = rawBooleanSymbol (inputKey);
    Object.defineProperty (componentProt, inputKey, {
      get: function () { return this[rawBooleanKey]; },
      set: function (value: any) {
        this[rawBooleanKey] = (value != null && `${ value }` !== "false");
      }
    });
  };
} // BooleanInput
