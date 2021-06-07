import { ChangeDetectionStrategy, Component } from "@angular/core";
import { toMap } from "./array.util";
import { SHierarchyChangeEvent, SHierarchyConfig } from "./synergy-hierarchy/synergy-hierarchy.component";

interface SQueryTable {
  id: string;
  type: "table";
  subType: "root" | "decode" | "dependant";
  tableName: string;
  tableDescription: string;
  parentTable: string | null;
  tableSort: number;
} // SQueryTable

interface SQueryColumn {
  id: string;
  type: "column";
  columnName: string;
  columnDescription: string;
  table: string;
  columnSort: number;
} // SQueryColumn

type SQueryNode = SQueryTable | SQueryColumn;

@Component ({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {

  hierarchyConfig: SHierarchyConfig<SQueryNode> = {
    getId: params => params.data.id,
    // getLabel: e => e.label,
    getParentId: params => {
      switch (params.data.type) {
        case "table": return params.data.parentTable;
        case "column": return params.data.table;
      } // switch
    }, // getParentId
    hasGlobalLeafSort: (params) => {
      return params.data.type === "column";
    },
    globalLeafSort: (params) => {
      const columnA = params.dataA as SQueryColumn;
      const columnB = params.dataB as SQueryColumn;
      return columnA.columnSort - columnB.columnSort;
    }
  };

  queryNodes: SQueryNode[] = [
    { id: "account", type: "table", subType: "root", tableSort: 1, tableName: "SfmAcc", tableDescription: "Account", parentTable: null },
    { id: "accountName", type: "column", columnSort: 1, columnName: "RagSoc", columnDescription: "Ragione sociale", table: "account" },
    { id: "accountIban", type: "column", columnSort: 2, columnName: "Ibn", columnDescription: "IBAN", table: "account" },
    { id: "address", type: "table", subType: "dependant", tableSort: 4, tableName: "SfmAccAdd", tableDescription: "Indirizzo account", parentTable: "account" },
    { id: "addressCity", type: "column", columnSort: 3, columnName: "AddCit", columnDescription: "Città", table: "address" },
    { id: "zone", type: "table", subType: "decode", tableSort: 4, tableName: "AngZon", tableDescription: "Zone", parentTable: "account" },
    { id: "dZone", type: "column", columnSort: 6, columnName: "ZonDsc", columnDescription: "Descrizione zona", table: "zone" },
    { id: "assignee", type: "table", subType: "decode", tableSort: 2, tableName: "AngRes", tableDescription: "Assegnatario", parentTable: "account" },
    { id: "cResource", type: "column", columnSort: 4, columnName: "ResCod", columnDescription: "Codice risorsa", table: "assignee" },
    { id: "dResource", type: "column", columnSort: 5, columnName: "ResDsc", columnDescription: "Descrizione risorsa", table: "assignee" },
    { id: "resourceType", type: "table", subType: "decode", tableSort: 3, tableName: "AngReTyp", tableDescription: "Tipo risorsa", parentTable: "assignee" },
    { id: "dResourceType", type: "column", columnSort: 7, columnName: "TypDsc", columnDescription: "Descrizione tipo risorsa", table: "resourceType" },
  ];

  onQueryNodesChange (event: SHierarchyChangeEvent<SQueryNode>) {
    if (event.type === "globalLeafSort") {
      const leafSortMap = toMap (event.newGlobalSortedLeafs, l => l.id, (l, index) => (index + 1));

      const newQueryNodes = this.queryNodes.map (qn => {
        const leafSort = leafSortMap[qn.id];
        if (leafSort && qn.type === "column") {
          qn = { ...qn, columnSort: leafSort };
        } // if
        return qn;
      });
      this.queryNodes = newQueryNodes;
    } // if
  } // onQueryNodesChange

}
