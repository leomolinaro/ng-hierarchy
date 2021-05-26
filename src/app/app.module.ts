import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { AppComponent } from "./app.component";
import { SynergyHierarchyComponent } from "./synergy-hierarchy/synergy-hierarchy.component";

@NgModule ({
  declarations: [
    AppComponent,
    SynergyHierarchyComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
