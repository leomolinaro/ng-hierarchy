import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { AppComponent } from "./app.component";
import { SynergyHierarchyComponent } from "./synergy-hierarchy/synergy-hierarchy.component";
import { SynergyHierarchyDragHandleDirective, SynergyHierarchyLabelDirective } from "./synergy-hierarchy/synergy-hierarchy.directives";
import { SynergySvgGRectDirective } from "./synergy-svg-g-rect.directive";

@NgModule ({
  declarations: [
    AppComponent,
    SynergyHierarchyComponent,
    SynergyHierarchyDragHandleDirective,
    SynergyHierarchyLabelDirective,
    SynergySvgGRectDirective,
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
