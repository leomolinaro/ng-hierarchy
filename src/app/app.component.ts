import { ChangeDetectionStrategy, Component } from "@angular/core";
import { SHierarchyChangeEvent, SHierarchyConfig } from "./synergy-hierarchy/synergy-hierarchy.component";

interface SQueryTable {
  id: string;
  type: "table";
  label: string;
  parentTable: string | null;
} // SQueryTable

interface SQueryColumn {
  id: string;
  type: "column";
  label: string;
  table: string;
  sort: number;
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
    getId: e => e.id,
    getLabel: e => e.label,
    getParentId: e => {
      switch (e.type) {
        case "table": return e.parentTable;
        case "column": return e.table;
      } // switch
    }, // getParentId
    leafSort: (a, b) => {
      if (a.type === "column") {
        if (b.type === "column") {
          return a.sort - b.sort;
        } else {
          return 1;
        } // if - else
      } else if (b.type === "column") {
        return -1;
      } else {
        return 0;
      } // if - else
    }
  };

  queryNodes: SQueryNode[] = [
    { id: "account", type: "table", label: "Account", parentTable: null },
    { id: "zone", type: "table", label: "Zone", parentTable: "account" },
    { id: "assignee", type: "table", label: "Assegnatario", parentTable: "account" },
    { id: "resourceType", type: "table", label: "Tipo risorsa", parentTable: "assignee" },
    { id: "accountName", type: "column", sort: 1, label: "Ragione sociale", table: "account" },
    { id: "accountIban", type: "column", sort: 3, label: "IBAN", table: "account" },
    { id: "dZone", type: "column", sort: 5, label: "Descrizione zona", table: "zone" },
    { id: "cResource", type: "column", sort: 2, label: "Codice risorsa", table: "assignee" },
    { id: "dResource", type: "column", sort: 4, label: "Descrizione risorsa", table: "assignee" },
    { id: "dResourceType", type: "column", sort: 6, label: "Descrizione tipo risorsa", table: "resourceType" },
  ];

  onQueryNodesChange (event: SHierarchyChangeEvent<SQueryNode>) {
    if (event.type === "leafSort") {
      const newQueryNodes = this.queryNodes.filter (qn => qn.type !== "column");
      event.newLeafs.forEach ((column, index) => {
        if (column.type === "column") {
          column.sort = index + 1;
          newQueryNodes.push (column);
        } // if
        this.queryNodes = newQueryNodes;
      });
    } // if
  } // onQueryNodesChange

}
