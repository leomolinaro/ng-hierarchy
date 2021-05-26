import { ChangeDetectionStrategy, Component } from "@angular/core";
import { SHierarchyConfig } from "./synergy-hierarchy/synergy-hierarchy.component";

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
    } // getParentId
  };

  queryNodes: SQueryNode[] = [
    { id: "account", type: "table", label: "Account", parentTable: null },
    { id: "zone", type: "table", label: "Zone", parentTable: "account" },
    { id: "assignee", type: "table", label: "Assegnatario", parentTable: "account" },
    { id: "resourceType", type: "table", label: "Tipo risorsa", parentTable: "assignee" },
    { id: "accountName", type: "column", label: "Ragione sociale", table: "account" },
    { id: "accountIban", type: "column", label: "IBAN", table: "account" },
    { id: "dZone", type: "column", label: "Descrizione zona", table: "zone" },
    { id: "cResource", type: "column", label: "Codice risorsa", table: "assignee" },
    { id: "dResource", type: "column", label: "Descrizione risorsa", table: "assignee" },
    { id: "dResourceType", type: "column", label: "Descrizione tipo risorsa", table: "assignee" },
  ];

}
