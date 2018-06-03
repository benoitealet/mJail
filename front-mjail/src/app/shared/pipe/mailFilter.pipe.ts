import {Pipe, PipeTransform} from '@angular/core';
import * as $ from 'jquery';

@Pipe({
    name: 'mailFilter',
    pure: true
})
export class MailFilterPipe implements PipeTransform {
    transform(html: string, mail: any): string {
        let $html = $('<div>' + html + '</div>');
        
        $html.find('img[src^=cid]').each((i,e) => {
            try {
                let $e = $(e);
                let src = $e.attr('src');

                src = 'http://labcms:8080/getAttachment/' + mail._id + '/' + src.split(':')[1]

                $e.attr('src', src);
            } catch(e) {
                console.warn(e);
            }
        });
        
        $html.find('a').attr('target', '_blank');
        
                
        return $html.html();
    }
}