import {Pipe, PipeTransform, Inject} from '@angular/core';
import {DOCUMENT} from '@angular/platform-browser';
import * as $ from 'jquery';

@Pipe({
    name: 'mailFilter',
    pure: true
})
export class MailFilterPipe implements PipeTransform {
    private server: string;

    constructor(@Inject(DOCUMENT) private document) {
        this.server = '//' + document.location.hostname + ':' + document.location.port;
    }

    transform(html: string, mail: any): string {
        let $html = $('<div>' + html + '</div>');

        $html.find('img[src^=cid]').each((i,e) => {
            try {
                let $e = $(e);
                let src = $e.attr('src');

                src = this.server + '/getAttachment/' + mail.id + '/' + src.split(':')[1]

                $e.attr('src', src);
            } catch(e) {
                console.warn(e);
            }
        });

        $html.find('a').attr('target', '_blank');


        return $html.html();
    }
}
