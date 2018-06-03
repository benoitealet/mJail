import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'exclude',
    pure: false
})
export class ExcludePipe implements PipeTransform {
    transform(items: any[], attribute: any, filter: string): any {
        if (!items || !attribute) { 
            return [];
        }
        return items.filter(item => !((item[attribute] === filter) || (!filter && !item[attribute])));
            
    }
}