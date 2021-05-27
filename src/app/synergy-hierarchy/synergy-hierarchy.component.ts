import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from "@angular/core";
import * as d3 from "d3";
import { HierarchyPointNode } from "d3";
import { BooleanInput, entitiesToNodes } from "../util";

export interface SHierarchyNode<E> {
  id: string | number;
  data: E;
  parentId: string | number | null;
  label: string;
  edgePath: string | null;
  point: HierarchyPointNode<SHierarchyNode<E>>;
  cssClasses: string[];
  selected: boolean;
} // SHierarchyNode

export interface SHierarchySelectionChangeEvent<E> {
  selectedElements: E[];
  selectedNodes: SHierarchyNode<E>[];
} // SHierarchySelectionChangeEvent

export interface SHierarchyChangeEvent<E> {

} // SHierarchyChangeEvent

export interface SHierarchyConfig<E> {
  getId: (entity: E) => string | number;
  getLabel: (entity: E) => string;
  getParentId: (entity: E) => string | number | null;
  leafSort?: (entityA: E, entityB: E) => number;
  getClass?: (entity: E) => string | string[];
} // SHierarchyConfig

@Component ({
  selector: "synergy-hierarchy",
  templateUrl: "./synergy-hierarchy.component.html",
  styleUrls: ["./synergy-hierarchy.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SynergyHierarchyComponent<E> implements OnChanges {

  constructor () { }

  @Input () entities!: E[];
  @Input () config!: SHierarchyConfig<E>;
  @Input () mode: "tree" | "cluster" = "tree";
  @Input () width = 500;
  @Input () height = 500;
  @Input () @BooleanInput () leafSorting = false;
  @Input () selection: "none" | "single" | "multiple" = "none";

  @Output () selectionChange = new EventEmitter<SHierarchySelectionChangeEvent<E>> ();
  @Output () sChange = new EventEmitter<SHierarchyChangeEvent<E>> ();

  @ViewChild ("svg") svg!: ElementRef<SVGElement>;
  
  private nodeIds: (string | number)[] = [];
  private nodesMap: Record<string, SHierarchyNode<E>> = { };

  edges!: SHierarchyNode<E>[];
  nodes!: SHierarchyNode<E>[];

  ngOnChanges (changes: SimpleChanges) {
    let doRedraw = false;
    if (changes.entities) {
      doRedraw = true;
      const { map, ids } = entitiesToNodes (
        this.entities, this.nodesMap,
        e => this.config.getId (e), n => n.data, e => this.entityToNode (e)
      );
      this.nodesMap = map;
      this.nodeIds = ids;
    } // if
    if (changes.mode) { doRedraw = true; }
    if (doRedraw) { this.redrawHierarchy (); }
  } // ngOnChanges

  private redrawHierarchy () {
    const hierarchy = this.mode === "tree" ? d3.tree<SHierarchyNode<E>> () : d3.cluster<SHierarchyNode<E>> ();
    hierarchy.size ([this.height, this.width - 160])
    .separation (() => 1);

    const stratify = d3.stratify<SHierarchyNode<E>> ()
    .parentId (node => node.parentId ? (node.parentId + "") : null);

    const root = stratify (this.nodeIds.map (id => this.nodesMap[id]));
    // .sort ((a, b) => (a.height - b.height) || a.id!.localeCompare (b.id!));
      
    const rootPoint = hierarchy (root);
    
    if (this.config.leafSort) {
      const leaves = rootPoint.leaves ();
      this.applyLeafSort (leaves);
    } // if
    
    const descendantPoints = rootPoint.descendants ().slice (1);
    this.nodes = [];
    this.edges = [];

    this.initNode (rootPoint);
    
    descendantPoints.forEach ((point) => {
      this.initNode (point);
      this.initEdge (point);
    });

  } // redrawHierarchy

  private initNode (point: HierarchyPointNode<SHierarchyNode<E>>) {
    const node = point.data;
    node.point = point;
    this.initNodeCssClasses (node);
    this.nodes.push (node);
  } // initNode

  private initEdge (point: HierarchyPointNode<SHierarchyNode<E>>) {
    const node = point.data;
    node.edgePath = this.pointToEdgePath (point);
    this.edges.push (node);
  } // initEdge

  private initNodeCssClasses (node: SHierarchyNode<E>) {
    node.cssClasses = [node.point.children ? "is-internal" : "is-leaf"];
    if (this.config.getClass) {
      const configClasses = this.config.getClass (node.data);
      if (configClasses) {
        if (typeof configClasses === "string") {
          node.cssClasses.push (configClasses);
        } else {
          configClasses.forEach (cl => node.cssClasses.push (cl));
        } // if - else
      } // if
    } // if
  } // initNodeCssClasses

  private applyLeafSort (leaves: HierarchyPointNode<SHierarchyNode<E>>[]) {
    const copy = [...leaves];
    const xs = leaves.map (l => l.x);
    copy.sort ((a, b) => this.config.leafSort! (a.data.data, b.data.data));
    copy.forEach ((c, index) => c.x = xs[index]);
  } // applyLeafSort

  private pointToEdgePath (point: HierarchyPointNode<SHierarchyNode<E>>) {
    return `M${point.y},${point.x} C${(point.parent!.y + 100)},${point.x} ${(point.parent!.y + 100)},${point.parent!.x} ${point.parent!.y},${point.parent!.x}`;
  } // nodeToEdgePath

  private entityToNode (entity: E): SHierarchyNode<E> {
    return {
      id: this.config.getId (entity),
      data: entity,
      label: this.config.getLabel (entity),
      parentId: this.config.getParentId (entity),
      cssClasses: null as any,
      edgePath: null,
      point: null as any,
      selected: false
    };
  } // entityToNode

  onNodeClick (node: SHierarchyNode<E>) {
    if (this.selection !== "none") {
      if (node.selected) {
        node.selected = false;
        const clIndex = node.cssClasses.findIndex (cl => cl === "is-selected");
        if (clIndex >= 0) { node.cssClasses.splice (clIndex, 1); }
      } else {
        if (this.selection === "single") {
          this.nodes.forEach (n => {
            if (n.selected) {
              n.selected = false;
              const clIndex = n.cssClasses.findIndex (cl => cl === "is-selected");
              if (clIndex >= 0) { n.cssClasses.splice (clIndex, 1); }
            } // if
          });
        } // if
        node.selected = true;
        node.cssClasses.push ("is-selected");
      } // if - else
      const selectedNodes = this.nodes.filter (n => n.selected);
      this.selectionChange.emit ({
        selectedElements: selectedNodes.map (n => n.data),
        selectedNodes: selectedNodes
      });
    } // if
  } // onNodeClick

  private selectedNode: SHierarchyNode<E> | null = null;
  private selectedElement: any = null;
  private offset: any = null;

  startDrag (event: any, node: SHierarchyNode<E>) {
    if (event.target.classList.contains ("s-hierarchy-drag-handle")) {
      console.log ("event.target", event);
      this.selectedElement = event.target;
      this.selectedNode = node;
      this.offset = this.getMousePosition (event);
      // this.offset.x -= parseFloat (this.selectedElement.getAttributeNS (null, "x"));
      console.log ("this.selectedElement.getAttributeNS (null, )", this.selectedElement.getAttributeNS (null, "y"));
      this.offset.y -= parseFloat (this.selectedElement.getAttributeNS (null, "y"));
    } // if
  } // startDrag

  drag (event: any) {
    if (this.selectedNode) {

      event.preventDefault ();
      const coord = this.getMousePosition (event);
      // this.selectedElement.setAttributeNS (null, "x", coord.x - this.offset.x);
      // this.selectedElement.setAttributeNS (null, "y", coord.y - this.offset.y);

      this.selectedNode.point.x = coord.y/* - this.offset.y */;
      this.selectedNode.edgePath = this.pointToEdgePath (this.selectedNode.point);

      // event.preventDefault ();
      // const x = parseFloat (this.selectedElement.getAttributeNS (null, "x"));
      // this.selectedElement.setAttributeNS (null, "x", x + 0.1);
    } // if
  } // drag

  endDrag (event: any) {
    this.selectedElement = null;
    this.selectedNode = null;
  } // endDrag

  private getMousePosition (event: any) {
    const CTM = (this.svg.nativeElement as any).getScreenCTM ();
    return {
      x: (event.clientX - CTM.e) / CTM.a,
      y: (event.clientY - CTM.f) / CTM.d
    };
  }

} // SynergyHierarchyComponent
