import { ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild } from "@angular/core";
import * as d3 from "d3";
import { HierarchyPointNode } from "d3";
import { entitiesToNodes } from "../util";

export interface SHierarchyNode<E> {
  id: string | number;
  data: E;
  parentId: string | number | null;
  label: string;
  edgePath: string | null;
  point: HierarchyPointNode<SHierarchyNode<E>>;
} // SHierarchyNode

export interface SHierarchyConfig<E> {
  getId: (entity: E) => string | number;
  getLabel: (entity: E) => string;
  getParentId: (entity: E) => string | number | null;
  leafSort?: (entityA: E, entityB: E) => number;
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
      
    const pointRoot = hierarchy (root);
    const pointDescendants = pointRoot.descendants ().slice (1);

    this.nodes = [];
    this.edges = [];

    const rootNode = pointRoot.data;
    rootNode.point = pointRoot;
    this.nodes.push (rootNode);
    
    pointDescendants.forEach ((point) => {
      const node = point.data;
      node.edgePath = this.pointToEdgePath (point);
      node.point = point;
      this.nodes.push (node);
      this.edges.push (node);
    });

  } // redrawHierarchy

  private pointToEdgePath (point: HierarchyPointNode<SHierarchyNode<E>>) {
    return `M${point.y},${point.x} C${(point.parent!.y + 100)},${point.x} ${(point.parent!.y + 100)},${point.parent!.x} ${point.parent!.y},${point.parent!.x}`
  } // nodeToEdgePath

  private entityToNode (entity: E): SHierarchyNode<E> {
    return {
      id: this.config.getId (entity),
      data: entity,
      label: this.config.getLabel (entity),
      parentId: this.config.getParentId (entity),
      edgePath: null,
      point: null as any
    };
  } // entityToNode

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
