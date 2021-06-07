import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, TemplateRef, TrackByFunction, ViewChild } from "@angular/core";
import * as d3 from "d3";
import { HierarchyPointNode } from "d3";
import { BooleanInput, entitiesToNodes } from "../util";

/**
 * Il nodo interno gestito dalla gerarchia.
 * @template E Il tipo di dato passato da fuori.
 */
export interface SHierarchyNode<E> {
  id: string | number;
  data: E;
  parentId: string | number | null;
  label: string | null;
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
  type: "globalLeafSort";
  newGlobalSortedLeafs: E[];
} // SHierarchyLeafSortEvent

export type SHierarchyChangeEvent<E> = SHierarchyLeafSortEvent<E>;

export interface SHierarchyConfig<E> {
  getId: (params: { data: E }) => string | number;
  getLabel?: (params: { data: E }) => string;
  getParentId: (params: { data: E }) => string | number | null;
  hasGlobalLeafSort?: (params: { data: E }) => boolean;
  globalLeafSort?: (params: { dataA: E; dataB: E }) => number;
  getNodeClass?: (params: { data: E }) => string | string[];
  getEdgeClass?: (params: { data: E }) => string | string[];
} // SHierarchyConfig

export interface SHierarchyNodeTemplateContext<E> {
  node: SHierarchyNode<E>;
} // SHierarchyNodeTemplateContext

@Component ({
  selector: "synergy-hierarchy",
  templateUrl: "./synergy-hierarchy.component.svg",
  styleUrls: ["./synergy-hierarchy.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SynergyHierarchyComponent<E> implements OnChanges {

  constructor (
    private el: ElementRef<HTMLElement>,
    private cd: ChangeDetectorRef
  ) { }

  @Input () entities!: E[];
  @Input () config!: SHierarchyConfig<E>;
  @Input () mode: "tree" | "cluster" = "tree";
  @Input () @BooleanInput () globalLeafSorting = false;
  @Input () selection: "none" | "single" | "multiple" = "none";
  @Input () nodeTemplate: TemplateRef<SHierarchyNodeTemplateContext<E>> | null = null;

  @Output () selectionChange = new EventEmitter<SHierarchySelectionChangeEvent<E>> ();
  @Output () sChange = new EventEmitter<SHierarchyChangeEvent<E>> ();

  @ViewChild ("svg") svg!: ElementRef<SVGElement>;
  @ViewChild ("gContent") gContent!: ElementRef<SVGGElement>;

  private nodeIds: (string | number)[] = [];
  private nodesMap: Record<string, SHierarchyNode<E>> = { };

  edges!: SHierarchyNode<E>[];
  nodes!: SHierarchyNode<E>[];
  private globalSortedLeafNodes: SHierarchyNode<E>[] | null = null;

  private hierarchy!: d3.TreeLayout<SHierarchyNode<E>>;
  private stratify!: d3.StratifyOperator<SHierarchyNode<E>>;

  private dragging: {
    selectedNode: SHierarchyNode<E>;
    originalPointX: number;
    originalEdgePath: string;
  } | null = null;

  width = 100;
  height = 100;
  translateX = 0;
  scaleX = 1;

  resizeOnChanges = true;
  createHierarchyNodeWrapper = false;
  hierarchyNodeWrapperPaddingLeft = 10;

  nodeTrackBy: TrackByFunction<SHierarchyNode<E>> = (index, node) => node.id;
  edgeTrackBy: TrackByFunction<SHierarchyNode<E>> = (index, node) => node.id;

  //////////////////////////////////////////////////////////////////////////////////////////
  ///// ANGULAR LIFECYCLES /////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////

  ngOnChanges (changes: SimpleChanges) {
    let doReconfig = false;
    let doRedraw = false;
    if (changes.config) { doReconfig = true; }
    if (changes.entities) { doRedraw = true; }
    if (changes.mode) { doReconfig = true; this.resizeOnChanges = true; }
    if (doReconfig) { doRedraw = true; }
    if (doReconfig) { this.reconfig (); }
    if (doRedraw) {
      this.redraw ();
      if (this.resizeOnChanges) {
        setTimeout (() => this.resize ());
        this.resizeOnChanges = false;
      } // if
    } // if
  } // ngOnChanges

  //////////////////////////////////////////////////////////////////////////////////////////
  ///// RECONFIG ///////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////

  private reconfig () {
    if (this.config.hasGlobalLeafSort && this.mode !== "cluster") { throw new Error ("'hasGlobalLeafSort' non applicabile a modalità diverse da 'cluster'."); }

    const parentElement = this.el.nativeElement.parentElement;
    this.height = parentElement!.clientHeight;
    this.width = parentElement!.clientWidth;

    const hierarchy = this.mode === "tree" ? d3.tree<SHierarchyNode<E>> () : d3.cluster<SHierarchyNode<E>> ();
    hierarchy.size ([this.height, this.getResizedWidth ()])
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
      e => this.config.getId ({ data: e }), n => n.data, e => this.entityToNode (e)
    );
    this.nodesMap = map;
    this.nodeIds = ids;

    const root = this.stratify (this.nodeIds.map (id => this.nodesMap[id]));

    const rootPoint = this.hierarchy (root);
    const descendantPoints = rootPoint.descendants ().slice (1);
    const leaves = rootPoint.leaves ();

    this.globalSortedLeafNodes = this.applyGlobalLeafSort (leaves);

    const nodes: SHierarchyNode<E>[] = [];
    const edges: SHierarchyNode<E>[] = [];

    const rootNode = this.initNode (rootPoint);
    nodes.push (rootNode);

    descendantPoints.forEach ((point) => {
      const descendantNode = this.initNode (point);
      nodes.push (descendantNode);
      const edge = this.initEdge (point);
      edges.push (edge);
    });

    this.nodes = nodes;
    this.edges = edges;
  } // redraw

  private initNode (point: HierarchyPointNode<SHierarchyNode<E>>) {
    const node = point.data;
    node.point = point;
    node.hasChildren = !!node.point.children;
    node.nodeCssClasses = this.getNodeCssClasses (node);
    return node;
  } // initNode

  private initEdge (point: HierarchyPointNode<SHierarchyNode<E>>) {
    const node = point.data;
    node.edgePath = this.pointToEdgePath (point);
    node.edgeCssClasses = this.getEdgeCssClasses (node);
    return node;
  } // initEdge

  private getNodeCssClasses (node: SHierarchyNode<E>) {
    const nodeCssClasses = [node.point.children ? "is-internal" : "is-leaf"];
    if (this.config.getNodeClass) {
      const configClasses = this.config.getNodeClass ({ data: node.data });
      if (configClasses) {
        if (typeof configClasses === "string") {
          nodeCssClasses.push (configClasses);
        } else {
          configClasses.forEach (cl => nodeCssClasses.push (cl));
        } // if - else
      } // if
    } // if
    if (this.selection) { nodeCssClasses.push ("is-selectable"); }
    return nodeCssClasses;
  } // getNodeCssClasses

  private getEdgeCssClasses (node: SHierarchyNode<E>) {
    const edgeCssClasses = [];
    if (this.config.getEdgeClass) {
      const configClasses = this.config.getEdgeClass ({ data: node.data });
      if (configClasses) {
        if (typeof configClasses === "string") {
          edgeCssClasses.push (configClasses);
        } else {
          configClasses.forEach (cl => edgeCssClasses.push (cl));
        } // if - else
      } // if
    } // if
    return edgeCssClasses;
  } // getEdgeCssClasses

  private applyGlobalLeafSort (leafPoints: HierarchyPointNode<SHierarchyNode<E>>[]) {
    if (this.config.hasGlobalLeafSort) {
      const globalSortedLeafPoints = leafPoints.filter (l => this.config.hasGlobalLeafSort! ({ data: l.data.data }));
      const coordXs = globalSortedLeafPoints.map (l => l.x);
      globalSortedLeafPoints.sort ((a, b) => this.config.globalLeafSort! ({ dataA: a.data.data, dataB: b.data.data }));
      const globalSortedLeafNodes = globalSortedLeafPoints.map ((c, index) => {
        c.x = coordXs[index];
        return c.data;
      });
      return globalSortedLeafNodes;
    } else {
      return null;
    } // if - else
  } // applyGlobalLeafSort

  private pointToEdgePath (point: HierarchyPointNode<SHierarchyNode<E>>) {
    return `M${point.y},${point.x} C${(point.parent!.y + 100)},${point.x} ${(point.parent!.y + 100)},${point.parent!.x} ${point.parent!.y},${point.parent!.x}`;
  } // nodeToEdgePath

  private entityToNode (entity: E): SHierarchyNode<E> {
    const params = { data: entity };
    return {
      id: this.config.getId (params),
      data: entity,
      label: this.config.getLabel ? this.config.getLabel (params) : null,
      parentId: this.config.getParentId (params),
      hasChildren: false,
      nodeCssClasses: null as any,
      edgeCssClasses: null as any,
      edgePath: null,
      point: null as any,
      selected: false
    };
  } // entityToNode

  private resize () {
    const box: { x: number; y: number; width: number; height: number } = (this.gContent.nativeElement as any).getBBox ();
    this.translateX = -1 * box.x + this.hierarchyNodeWrapperPaddingLeft;
    this.scaleX = this.width / (box.width - box.x) - 0.05;
    this.nodes.forEach (node => {
      node.point.y *= this.scaleX;
    });
    this.edges.forEach (edge => {
      edge.edgePath = this.pointToEdgePath (edge.point);
    });
    this.hierarchy.size ([this.height, this.getResizedWidth ()]);
    this.createHierarchyNodeWrapper = !!this.selection;
    this.cd.markForCheck ();
  } // resize

  private getResizedWidth () {
    return this.width * this.scaleX;
  } // getResizedWidth

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

  private isDragHandle (element: HTMLElement): boolean {
    if (element.classList.contains ("s-hierarchy-drag-handle")) { return true; }
    if (element.parentElement) {
      return this.isDragHandle (element.parentElement);
    } else {
      return false;
    } // if - else
  } // isDragHandle

  onStartDrag (event: any, node: SHierarchyNode<E>) {
    if (this.globalLeafSorting && this.isDragHandle (event.target)) {
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

  onEndDrag (event: Event) {
    if (this.dragging) {
      const node = this.dragging.selectedNode;
      node.nodeCssClasses.shift ();
      node.edgeCssClasses.shift ();
      this.cd.detectChanges (); // senza di questo resta la classe css is-dragging su edgeCssClasses
      const newGlobalSortedLeafNodes = [...this.globalSortedLeafNodes!];
      const leafIndex = newGlobalSortedLeafNodes.findIndex (leafNode => node === leafNode);
      newGlobalSortedLeafNodes.splice (leafIndex, 1);
      const newLeafIndex = newGlobalSortedLeafNodes.findIndex (leafNode => node.point.x < leafNode.point.x);
      if (newLeafIndex >= 0) {
        newGlobalSortedLeafNodes.splice (newLeafIndex, 0, node);
      } else {
        newGlobalSortedLeafNodes.push (node);
      } // if - else
      node.point.x = this.dragging.originalPointX;
      node.edgePath = this.dragging.originalEdgePath;
      this.dragging = null;
      const newGlobalSortedLeafs = newGlobalSortedLeafNodes.map (n => n.data);
      this.sChange.next ({
        type: "globalLeafSort",
        newGlobalSortedLeafs
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
