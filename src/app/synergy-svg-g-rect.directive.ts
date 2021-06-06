import { AfterViewInit, Directive, ElementRef, Input, OnChanges, Renderer2, SimpleChanges } from "@angular/core";
import { BooleanInput } from "./util";

@Directive ({
  selector: "g[sSvgGRect]"
})
export class SynergySvgGRectDirective implements OnChanges, AfterViewInit {

  constructor (
    private elementRef: ElementRef<HTMLElement>,
    private renderer: Renderer2
  ) { }

  @Input ("sSvgGRect") @BooleanInput () sSvgGRect: boolean = false;
  @Input ("sSvgGRectClass") cssClass: string | null = null;

  @Input ("sSvgGRectPaddingLeft") paddingLeft = 10;
  private paddingRight = 10;
  private paddingTop = 10;
  private paddingBottom = 10;

  private rect: SVGRectElement | null = null;
  private afterViewInit = false;

  ngOnChanges (changes: SimpleChanges) {
    if (this.afterViewInit) {
      if (changes.sSvgGRect) {
        if (this.sSvgGRect) {
          this.drawRect ();
        } else {
          this.removeRect ();
        } // if - else
      } // if
    } // if
  } // ngOnChanges

  ngAfterViewInit () {
    this.afterViewInit = true;
    if (this.sSvgGRect) {
      this.drawRect ();
    } // if
  } // ngAfterViewInit

  private drawRect () {
    const el = this.elementRef.nativeElement;
    const box: { x: number; y: number; width: number; height: number } = (el as any).getBBox ();
    const rect = document.createElementNS ("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute ("width", this.paddingLeft + box.width + this.paddingRight + "");
    rect.setAttribute ("height", this.paddingBottom + box.height + this.paddingTop + "");
    rect.setAttribute ("x", box.x - this.paddingLeft + "");
    rect.setAttribute ("y", box.y - this.paddingTop + "");
    if (this.cssClass) { rect.classList.add (this.cssClass); }
    this.renderer.insertBefore (el, rect, el.firstChild);
    this.rect = rect;
  } // drawRect

  private removeRect () {
    this.renderer.removeChild (this.elementRef.nativeElement, this.rect);
    this.rect = null;
  } // removeRect

} // SynergySvgGRectDirective
