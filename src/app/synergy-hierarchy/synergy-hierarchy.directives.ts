import { Directive, ElementRef, Input, OnChanges, OnInit, Renderer2, SimpleChanges } from "@angular/core";
import { BooleanInput } from "../util";

@Directive ({
  selector: "[sHierarchyDragHandle]"
})
export class SynergyHierarchyDragHandleDirective implements OnChanges {

  constructor (
    private elementRef: ElementRef,
    private renderer: Renderer2
  ) { }

  @Input ("sHierarchyDragHandle") @BooleanInput () dragHandle = false;

  ngOnChanges (changes: SimpleChanges) {
    if (changes.dragHandle) {
      if (this.dragHandle) {
        this.renderer.addClass (this.elementRef.nativeElement, "s-hierarchy-drag-handle");
      } else {
        this.renderer.removeClass (this.elementRef.nativeElement, "s-hierarchy-drag-handle");
      } // if - else
    } // if
  } // ngOnChanges

} // SynergyHierarchyDragHandleDirective

@Directive ({
  selector: "[sHierarchyLabel]"
})
export class SynergyHierarchyLabelDirective implements OnInit {

  constructor (
    private elementRef: ElementRef,
    private renderer: Renderer2
  ) { }

  ngOnInit () {
    this.renderer.addClass (this.elementRef.nativeElement, "s-hierarchy-label");
  } // ngOnChanges

} // SynergyHierarchyLabelDirective
