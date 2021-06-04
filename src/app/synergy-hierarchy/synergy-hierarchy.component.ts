import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, TemplateRef, ViewChild } from "@angular/core";
import * as d3 from "d3";
import { HierarchyPointNode } from "d3";
import { BooleanInput, entitiesToNodes } from "../util";

export interface SHierarchyNode<E> {
  id: string | number;
  data: E;
  parentId: string | number | null;
  label: string;
  hasChildren: boolean;
  edgePath: string | null;
  point: HierarchyPointNode<SHierarchyNode<E>>;
  nodeCssClasses: string[];
  edgeCssClasses: string[];
  selected: boolean;
} // SHierarchyNode

export interface SHierarchySelectionChangeEvent<E> {
  selectedElements: E[];
  selectedNodes: SHierarchyNode<E>[];
} // SHierarchySelectionChangeEvent

export interface SHierarchyLeafSortEvent<E> {
  type: "leafSort";
  newLeafs: E[];
} // SHierarchyLeafSortEvent

export type SHierarchyChangeEvent<E> = SHierarchyLeafSortEvent<E>;

export interface SHierarchyConfig<E> {
  getId: (entity: E) => string | number;
  getLabel: (entity: E) => string;
  getParentId: (entity: E) => string | number | null;
  leafSort?: (entityA: E, entityB: E) => number;
  getClass?: (entity: E) => string | string[];
} // SHierarchyConfig

export interface SHierarchyNodeTemplateContext<E> {
  node: SHierarchyNode<E>;
} // SHierarchyNodeTemplateContext

@Component ({
  selector: "synergy-hierarchy",
  templateUrl: "./synergy-hierarchy.component.html",
  styleUrls: ["./synergy-hierarchy.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SynergyHierarchyComponent<E> implements OnChanges {

  constructor (
    private cd: ChangeDetectorRef
  ) { }

  @Input () entities!: E[];
  @Input () config!: SHierarchyConfig<E>;
  @Input () mode: "tree" | "cluster" = "tree";
  @Input () width = 500;
  @Input () height = 500;
  @Input () @BooleanInput () leafSorting = false;
  @Input () selection: "none" | "single" | "multiple" = "none";
  @Input () nodeTemplate: TemplateRef<SHierarchyNodeTemplateContext<E>> | null = null;

  @Output () selectionChange = new EventEmitter<SHierarchySelectionChangeEvent<E>> ();
  @Output () sChange = new EventEmitter<SHierarchyChangeEvent<E>> ();

  @ViewChild ("svg") svg!: ElementRef<SVGElement>;

  private nodeIds: (string | number)[] = [];
  private nodesMap: Record<string, SHierarchyNode<E>> = { };

  edges!: SHierarchyNode<E>[];
  nodes!: SHierarchyNode<E>[];
  private leafNodes!: SHierarchyNode<E>[];

  private hierarchy!: d3.TreeLayout<SHierarchyNode<E>>;
  private stratify!: d3.StratifyOperator<SHierarchyNode<E>>;

  private dragging: {
    selectedNode: SHierarchyNode<E>;
    originalPointX: number;
    originalEdgePath: string;
  } | null = null;

  //////////////////////////////////////////////////////////////////////////////////////////
  ///// ANGULAR LIFECYCLES /////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////

  ngOnChanges (changes: SimpleChanges) {
    let doReconfig = false;
    let doRedraw = false;
    if (changes.config) { doReconfig = true; }
    if (changes.entities) { doRedraw = true; }
    if (changes.mode || changes.width || changes.height) { doReconfig = true; }
    if (doReconfig) { doRedraw = true; }
    if (doReconfig) { this.reconfig (); }
    if (doRedraw) { this.redraw (); }
  } // ngOnChanges

  //////////////////////////////////////////////////////////////////////////////////////////
  ///// RECONFIG ///////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////

  private reconfig () {
    const hierarchy = this.mode === "tree" ? d3.tree<SHierarchyNode<E>> () : d3.cluster<SHierarchyNode<E>> ();
    hierarchy.size ([this.height, this.width - 160])
    .separation (() => 1);
    this.hierarchy = hierarchy;

    const stratify = d3.stratify<SHierarchyNode<E>> ()
    .parentId (node => node.parentId ? (node.parentId + "") : null);
    this.stratify = stratify;
  } // reconfig

  //////////////////////////////////////////////////////////////////////////////////////////
  ///// REDRAW /////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////

  private redraw () {
    const { map, ids } = entitiesToNodes (
      this.entities, this.nodesMap,
      e => this.config.getId (e), n => n.data, e => this.entityToNode (e)
    );
    this.nodesMap = map;
    this.nodeIds = ids;

    const root = this.stratify (this.nodeIds.map (id => this.nodesMap[id]));
    // .sort ((a, b) => (a.height - b.height) || a.id!.localeCompare (b.id!));

    const rootPoint = this.hierarchy (root);
    this.nodes = [];
    this.edges = [];

    const leaves = rootPoint.leaves ();
    this.leafNodes = this.applyLeafSort (leaves);

    const descendantPoints = rootPoint.descendants ().slice (1);

    this.initNode (rootPoint);

    descendantPoints.forEach ((point) => {
      this.initNode (point);
      this.initEdge (point);
    });
  } // redraw

  private initNode (point: HierarchyPointNode<SHierarchyNode<E>>) {
    const node = point.data;
    node.point = point;
    node.hasChildren = !!node.point.children;
    this.initNodeCssClasses (node);
    this.nodes.push (node);
  } // initNode

  private initEdge (point: HierarchyPointNode<SHierarchyNode<E>>) {
    const node = point.data;
    node.edgePath = this.pointToEdgePath (point);
    node.edgeCssClasses = [];
    this.edges.push (node);
  } // initEdge

  private initNodeCssClasses (node: SHierarchyNode<E>) {
    node.nodeCssClasses = [node.point.children ? "is-internal" : "is-leaf"];
    if (this.config.getClass) {
      const configClasses = this.config.getClass (node.data);
      if (configClasses) {
        if (typeof configClasses === "string") {
          node.nodeCssClasses.push (configClasses);
        } else {
          configClasses.forEach (cl => node.nodeCssClasses.push (cl));
        } // if - else
      } // if
    } // if
  } // initNodeCssClasses

  private applyLeafSort (leafPoints: HierarchyPointNode<SHierarchyNode<E>>[]) {
    if (this.config.leafSort) {
      leafPoints = [...leafPoints];
      const coordXs = leafPoints.map (l => l.x);
      leafPoints.sort ((a, b) => this.config.leafSort! (a.data.data, b.data.data));
      const leafNodes = leafPoints.map ((c, index) => {
        c.x = coordXs[index];
        return c.data;
      });
      return leafNodes;
    } else {
      return leafPoints.map (p => p.data);
    } // if - else
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
      hasChildren: false,
      nodeCssClasses: null as any,
      edgeCssClasses: null as any,
      edgePath: null,
      point: null as any,
      selected: false
    };
  } // entityToNode

  //////////////////////////////////////////////////////////////////////////////////////////
  ///// ACTIONS ////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////

  onNodeClick (node: SHierarchyNode<E>) {
    if (this.selection !== "none") {
      if (node.selected) {
        node.selected = false;
        const clIndex = node.nodeCssClasses.findIndex (cl => cl === "is-selected");
        if (clIndex >= 0) { node.nodeCssClasses.splice (clIndex, 1); }
      } else {
        if (this.selection === "single") {
          this.nodes.forEach (n => {
            if (n.selected) {
              n.selected = false;
              const clIndex = n.nodeCssClasses.findIndex (cl => cl === "is-selected");
              if (clIndex >= 0) { n.nodeCssClasses.splice (clIndex, 1); }
            } // if
          });
        } // if
        node.selected = true;
        node.nodeCssClasses.push ("is-selected");
      } // if - else
      const selectedNodes = this.nodes.filter (n => n.selected);
      this.selectionChange.emit ({
        selectedElements: selectedNodes.map (n => n.data),
        selectedNodes: selectedNodes
      });
    } // if
  } // onNodeClick

  onStartDrag (event: any, node: SHierarchyNode<E>) {
    if (event.target.classList.contains ("s-hierarchy-drag-handle")) {
      node.nodeCssClasses.push ("is-dragging");
      node.edgeCssClasses.push ("is-dragging");
      this.dragging = {
        selectedNode: node,
        originalPointX: node.point.x,
        originalEdgePath: node.edgePath!
      };
    } // if
  } // onStartDrag

  onDrag (event: any) {
    if (this.dragging) {
      event.preventDefault ();
      const coord = this.getMousePosition (event);
      const node = this.dragging.selectedNode;
      node.point.x = coord.y;
      node.edgePath = this.pointToEdgePath (node.point);
    } // if
  } // onDrag

  onEndDrag (event: any) {
    if (this.dragging) {
      const node = this.dragging.selectedNode;
      node.nodeCssClasses.shift ();
      node.edgeCssClasses.shift ();
      this.cd.detectChanges (); // senza di questo resta la classe css is-dragging su edgeCssClasses
      const newLeafNodes = [...this.leafNodes];
      const leafIndex = newLeafNodes.findIndex (leafNode => node === leafNode);
      newLeafNodes.splice (leafIndex, 1);
      const newLeafIndex = newLeafNodes.findIndex (leafNode => node.point.x < leafNode.point.x);
      if (newLeafIndex >= 0) {
        newLeafNodes.splice (newLeafIndex, 0, node);
      } else {
        newLeafNodes.push (node);
      } // if - else
      node.point.x = this.dragging.originalPointX;
      node.edgePath = this.dragging.originalEdgePath;
      this.dragging = null;
      const newLeafs = newLeafNodes.map (n => n.data);
      this.sChange.next ({
        type: "leafSort",
        newLeafs
      });
    } // if
  } // onEndDrag

  private getMousePosition (event: any) {
    const CTM = (this.svg.nativeElement as any).getScreenCTM ();
    return {
      x: (event.clientX - CTM.e) / CTM.a,
      y: (event.clientY - CTM.f) / CTM.d
    };
  } // getMousePosition

} // SynergyHierarchyComponent
