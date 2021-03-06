import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';

import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';

import {MailListComponent} from './mail-list/mail-list.component';
import {MailViewComponent} from './mail-view/mail-view.component';

import {FilterPipe} from './shared/pipe/filter.pipe';
import {ExcludePipe} from './shared/pipe/exclude.pipe';
import {SizeConvertPipe} from './shared/pipe/sizeConvert.pipe';
import {MailFilterPipe} from './shared/pipe/mailFilter.pipe';
import {SafePipe} from './shared/pipe/safe.pipe';

@NgModule({
    declarations: [
        AppComponent,
        FilterPipe,
        ExcludePipe,
        SizeConvertPipe,
        MailFilterPipe,
        MailListComponent,
        MailViewComponent,
        SafePipe
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        FontAwesomeModule,
        NgbModule
    ],
    exports: [
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {}
