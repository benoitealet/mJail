import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {MailListComponent} from "./mail-list/mail-list.component";

const routes: Routes = [
  {path: '', component: MailListComponent},
  {path: ':name', component: MailListComponent},
  {path: '**', component: MailListComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {useHash: true})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
